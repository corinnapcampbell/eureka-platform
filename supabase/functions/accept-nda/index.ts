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

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/idea_access_log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        idea_id,
        viewer_email,
        viewer_name: viewer_name ?? null,
        ip_address,
        nda_accepted: true,
        viewed_at: new Date().toISOString(),
        last_viewed: new Date().toISOString(),
        view_count: 1,
      }),
    })

    if (!insertRes.ok) {
      const text = await insertRes.text()
      console.error('[accept-nda] insert failed:', insertRes.status, text)
      return new Response(JSON.stringify({ error: 'Could not record NDA acceptance' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    console.log(`[accept-nda] recorded ${viewer_email} from ${ip_address ?? 'unknown IP'}`)
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('[accept-nda] error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
