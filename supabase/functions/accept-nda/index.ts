const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const ip_address =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    null

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    const { token, viewer_email, viewer_name } = await req.json()

    if (!token || !viewer_email) {
      return new Response(JSON.stringify({ error: 'Missing token or email' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Resolve idea_id from the share token server-side. The client never picks it.
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_idea_id_by_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ p_token: token }),
    })
    const idea_id = await rpcRes.json()

    if (!idea_id || typeof idea_id !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid share link' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const now = new Date().toISOString()
    const restHeaders = {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    }

    // UNIQUE (idea_id, viewer_email): a returning viewer updates their existing
    // row instead of inserting a duplicate. viewed_at is the FIRST visit and is
    // never overwritten; last_viewed, view_count and ip_address are refreshed.
    const existingRes = await fetch(
      `${supabaseUrl}/rest/v1/idea_access_log?idea_id=eq.${idea_id}&viewer_email=eq.${encodeURIComponent(viewer_email)}&select=id,view_count`,
      { headers: restHeaders },
    )
    const existing = existingRes.ok ? await existingRes.json() : []

    let writeRes
    if (Array.isArray(existing) && existing.length > 0) {
      writeRes = await fetch(`${supabaseUrl}/rest/v1/idea_access_log?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        headers: { ...restHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({
          last_viewed: now,
          view_count: (existing[0].view_count ?? 1) + 1,
          ip_address,
          nda_accepted: true,
        }),
      })
    } else {
      writeRes = await fetch(`${supabaseUrl}/rest/v1/idea_access_log`, {
        method: 'POST',
        headers: { ...restHeaders, Prefer: 'return=representation' },
        body: JSON.stringify({
          idea_id,
          viewer_email,
          viewer_name: viewer_name ?? null,
          ip_address,
          nda_accepted: true,
          viewed_at: now,
          last_viewed: now,
          view_count: 1,
        }),
      })
    }

    if (!writeRes.ok) {
      const text = await writeRes.text()
      console.error('[accept-nda] write failed:', writeRes.status, text)
      return new Response(JSON.stringify({ error: 'Could not record NDA acceptance' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Link the page view that preceded this signature. Nothing is deleted —
    // the view stays on record, it just stops counting as a separate visitor.
    try {
      const written = await writeRes.json()
      const accessLogId = Array.isArray(written) ? written[0]?.id : written?.id
      if (accessLogId && ip_address) {
        const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
        await fetch(
          `${supabaseUrl}/rest/v1/idea_views?idea_id=eq.${idea_id}&ip_address=eq.${encodeURIComponent(ip_address)}&viewed_at=gte.${since}&superseded_by=is.null`,
          {
            method: 'PATCH',
            headers: { ...restHeaders, Prefer: 'return=minimal' },
            body: JSON.stringify({ superseded_by: accessLogId }),
          },
        )
      }
    } catch (err) {
      console.warn('[accept-nda] supersede step failed:', (err as Error).message)
    }

    console.log(`[accept-nda] recorded ${viewer_email} from ${ip_address ?? 'unknown IP'} (${Array.isArray(existing) && existing.length > 0 ? 'returning' : 'new'})`)
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[accept-nda] error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
