import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    null

  try {
    const body = await req.json()
    const { action, token } = body

    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (action === 'cover') {
      const { data: work, error } = await supabase
        .from('works')
        .select('title, description, cover_url, code_required, nda_required')
        .eq('share_token', token)
        .single()
      if (error || !work) {
        return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify(work), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'check') {
      const { code } = body
      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: work } = await supabase
        .from('works')
        .select('id')
        .eq('share_token', token)
        .single()
      if (!work) {
        return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const { count: totalCount } = await supabase
        .from('work_access_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('work_id', work.id)
        .gte('attempted_at', since)

      const ipCountRes = ip
        ? await supabase
            .from('work_access_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('work_id', work.id)
            .eq('ip_address', ip)
            .gte('attempted_at', since)
        : { count: 0 }

      if ((ipCountRes.count ?? 0) >= 5 || (totalCount ?? 0) >= 30) {
        return new Response(JSON.stringify({ error: 'locked' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: codeRow } = await supabase
        .from('work_access_codes')
        .select('id, max_uses, uses_count')
        .eq('work_id', work.id)
        .ilike('code', code)
        .eq('active', true)
        .maybeSingle()

      if (!codeRow || (codeRow.max_uses !== null && codeRow.uses_count >= codeRow.max_uses)) {
        await supabase.from('work_access_attempts').insert({ work_id: work.id, ip_address: ip, attempted_at: new Date().toISOString() })
        return new Response(JSON.stringify({ error: 'invalid_code' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'open') {
      const { code, name, email, nda_agreed } = body

      const { data: work, error: workError } = await supabase
        .from('works')
        .select('id, user_id, title, description, cover_url, code_required, nda_required, allow_download')
        .eq('share_token', token)
        .single()
      if (workError || !work) {
        return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (work.nda_required && (!name?.trim() || !email || !nda_agreed)) {
        return new Response(JSON.stringify({ error: 'nda_required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let codeId = null
      let codeLabel = null

      if (work.code_required) {
        if (!code) {
          return new Response(JSON.stringify({ error: 'code_required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
        const { count: totalCount } = await supabase
          .from('work_access_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('work_id', work.id)
          .gte('attempted_at', since)

        const ipCountRes = ip
          ? await supabase
              .from('work_access_attempts')
              .select('id', { count: 'exact', head: true })
              .eq('work_id', work.id)
              .eq('ip_address', ip)
              .gte('attempted_at', since)
          : { count: 0 }

        if ((ipCountRes.count ?? 0) >= 5 || (totalCount ?? 0) >= 30) {
          return new Response(JSON.stringify({ error: 'locked' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { data: redeemed, error: redeemError } = await supabase.rpc('redeem_work_code', { p_work_id: work.id, p_code: code })
        if (redeemError || !redeemed || redeemed.length === 0) {
          await supabase.from('work_access_attempts').insert({ work_id: work.id, ip_address: ip, attempted_at: new Date().toISOString() })
          return new Response(JSON.stringify({ error: 'invalid_code' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        codeId = redeemed[0].code_id
        codeLabel = redeemed[0].code_label
      }

      const { data: fileRows } = await supabase
        .from('work_files')
        .select('id, name, caption, mime_type, size_bytes, storage_path')
        .eq('work_id', work.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      const files: { id: string; name: string; caption: string | null; mime_type: string; size_bytes: number; url: string | null }[] = []
      if (fileRows && fileRows.length > 0) {
        const paths = fileRows.map((f: { storage_path: string }) => f.storage_path)
        const { data: signed } = await supabase.storage.from('work-assets').createSignedUrls(paths, 3600)
        const urlMap: Record<string, string> = {}
        if (signed) signed.forEach(({ path, signedUrl }: { path: string; signedUrl: string }) => { if (signedUrl) urlMap[path] = signedUrl })
        for (const f of fileRows) {
          files.push({ id: f.id, name: f.name, caption: f.caption, mime_type: f.mime_type, size_bytes: f.size_bytes, url: urlMap[f.storage_path] ?? null })
        }
      }

      const now = new Date().toISOString()
      const { data: logRow } = await supabase.from('work_access_log').insert({
        work_id: work.id,
        owner_id: work.user_id,
        work_title: work.title,
        viewer_name: name ?? null,
        viewer_email: email ?? null,
        ip_address: ip,
        code_id: codeId,
        code_label: codeLabel,
        nda_accepted: !!work.nda_required,
        opened_at: now,
      }).select('id').single()

      const sessionToken = crypto.randomUUID()
      await supabase.from('work_sessions').insert({
        token: sessionToken,
        work_id: work.id,
        log_id: logRow?.id ?? null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

      await supabase.from('notifications').insert({
        user_id: work.user_id,
        type: 'work_opened',
        title: 'Someone opened your work',
        message: `${name || email || 'Someone'} opened "${work.title}"`,
      })

      return new Response(JSON.stringify({
        session: sessionToken,
        work: { title: work.title, description: work.description, cover_url: work.cover_url, allow_download: work.allow_download },
        files,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'refresh') {
      const { session: sessionToken } = body
      if (!sessionToken) {
        return new Response(JSON.stringify({ error: 'Missing session' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: work } = await supabase
        .from('works')
        .select('id, title, description, cover_url, allow_download')
        .eq('share_token', token)
        .single()
      if (!work) {
        return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: sess } = await supabase
        .from('work_sessions')
        .select('token, expires_at')
        .eq('work_id', work.id)
        .eq('token', sessionToken)
        .single()
      if (!sess || new Date(sess.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'session_expired' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: fileRows } = await supabase
        .from('work_files')
        .select('id, name, caption, mime_type, size_bytes, storage_path')
        .eq('work_id', work.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      const files: { id: string; name: string; caption: string | null; mime_type: string; size_bytes: number; url: string | null }[] = []
      if (fileRows && fileRows.length > 0) {
        const paths = fileRows.map((f: { storage_path: string }) => f.storage_path)
        const { data: signed } = await supabase.storage.from('work-assets').createSignedUrls(paths, 3600)
        const urlMap: Record<string, string> = {}
        if (signed) signed.forEach(({ path, signedUrl }: { path: string; signedUrl: string }) => { if (signedUrl) urlMap[path] = signedUrl })
        for (const f of fileRows) {
          files.push({ id: f.id, name: f.name, caption: f.caption, mime_type: f.mime_type, size_bytes: f.size_bytes, url: urlMap[f.storage_path] ?? null })
        }
      }

      return new Response(JSON.stringify({
        work: { title: work.title, description: work.description, cover_url: work.cover_url, allow_download: work.allow_download },
        files,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('[work-access] error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
