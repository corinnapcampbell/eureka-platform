// ots-anchor — submits an idea's content hash to 3 OpenTimestamps calendar servers
// and stores the pending proof on the matching idea_content_versions row.
// One anchor per content version; enforces a 24h cooldown per idea.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CALENDARS = [
  'https://alice.btc.calendar.opentimestamps.org',
  'https://bob.btc.calendar.opentimestamps.org',
  'https://finney.calendar.eternitywall.com',
]

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    const { idea_id } = await req.json()

    // Read idea using caller's JWT so RLS enforces ownership.
    const userClient = createClient(supabaseUrl, serviceKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tierClient = createClient(supabaseUrl, serviceKey)
    const { data: subRow } = await tierClient
      .from('user_subscriptions')
      .select('tier')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!['pro', 'protection'].includes(subRow?.tier ?? '')) {
      return new Response(JSON.stringify({ error: 'Bitcoin anchoring requires a Pro subscription' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: idea, error: ideaError } = await userClient
      .from('ideas')
      .select('blockchain_hash, ots_content_hash, title')
      .eq('id', idea_id)
      .eq('user_id', user.id)
      .single()

    if (ideaError || !idea) {
      return new Response(JSON.stringify({ error: 'Idea not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const hashHex = idea.blockchain_hash
    if (!hashHex || !/^[0-9a-f]{64}$/.test(hashHex)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing blockchain_hash' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Anchor attaches to the version row matching current content, not the idea row.
    const { data: version } = await tierClient
      .from('idea_content_versions')
      .select('id, ots_status')
      .eq('idea_id', idea_id)
      .eq('content_hash', hashHex)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!version) {
      return new Response(JSON.stringify({ error: 'No version row for current content' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (version.ots_status) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'this version already anchored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // 24h cooldown across all versions of this idea.
    const { data: recent } = await tierClient
      .from('idea_content_versions')
      .select('ots_submitted_at')
      .eq('idea_id', idea_id)
      .not('ots_submitted_at', 'is', null)
      .order('ots_submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recent?.ots_submitted_at) {
      const hoursSince = (Date.now() - new Date(recent.ots_submitted_at).getTime()) / 36e5
      if (hoursSince < 24) {
        return new Response(
          JSON.stringify({ error: 'cooldown', retry_after_hours: Math.ceil(24 - hoursSince) }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }

    // Decode hex → bytes for the calendar POST body.
    const hashBytes = new Uint8Array(32)
    for (let i = 0; i < 32; i++) {
      hashBytes[i] = parseInt(hashHex.slice(i * 2, i * 2 + 2), 16)
    }

    // Submit to each calendar server (POST /digest).
    const proofResults: Record<string, unknown>[] = []
    for (const cal of CALENDARS) {
      try {
        const res = await fetch(`${cal}/digest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: hashBytes,
        })
        if (res.ok) {
          const proofBytes = new Uint8Array(await res.arrayBuffer())
          proofResults.push({
            calendar: cal,
            status: 200,
            proof_base64: btoa(String.fromCharCode(...proofBytes)),
            proof_bytes_length: proofBytes.length,
          })
          console.log(`[ots-anchor] ${cal} ✓ — ${proofBytes.length} proof bytes`)
        } else {
          const text = await res.text()
          proofResults.push({ calendar: cal, status: res.status, error: text })
          console.warn(`[ots-anchor] ${cal} ✗ — ${res.status}: ${text}`)
        }
      } catch (err) {
        proofResults.push({ calendar: cal, error: (err as Error).message })
        console.warn(`[ots-anchor] ${cal} ✗ — ${(err as Error).message}`)
      }
    }

    const succeededCount = proofResults.filter((r) => r.status === 200).length

    // Write results with service role to bypass RLS.
    const serviceClient = createClient(supabaseUrl, serviceKey)
    const { error: updateError } = await serviceClient
      .from('idea_content_versions')
      .update({
        ots_proof: proofResults,
        ots_status: succeededCount > 0 ? 'pending' : 'failed',
        ots_submitted_at: new Date().toISOString(),
        ots_retry_count: 0,
      })
      .eq('id', version.id)

    if (updateError) throw updateError

    console.log(`[ots-anchor] idea ${idea_id} — ${succeededCount}/3 calendars succeeded`)

    return new Response(
      JSON.stringify({ ok: true, calendars_succeeded: succeededCount, total: CALENDARS.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[ots-anchor] error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
