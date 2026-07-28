// ots-anchor — submits an idea's frozen blockchain_hash to 3 OpenTimestamps
// calendar servers and stores the pending proof on the ideas row.
// Idempotent: if ots_content_hash is already set the call is a no-op.

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
    const { data: idea, error: ideaError } = await userClient
      .from('ideas')
      .select('blockchain_hash, ots_content_hash, title')
      .eq('id', idea_id)
      .single()

    if (ideaError || !idea) {
      return new Response(JSON.stringify({ error: 'Idea not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Idempotent — never overwrite a frozen anchor.
    if (idea.ots_content_hash) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: 'already anchored' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const hashHex = idea.blockchain_hash
    if (!hashHex || !/^[0-9a-f]{64}$/.test(hashHex)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing blockchain_hash' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
      .from('ideas')
      .update({
        ots_proof: proofResults,
        ots_status: succeededCount > 0 ? 'pending' : 'failed',
        ots_content_hash: hashHex,       // frozen — never overwritten after this point
        ots_submitted_at: new Date().toISOString(),
        ots_retry_count: 0,
      })
      .eq('id', idea_id)

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
