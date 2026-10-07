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

    const { data: linkRow } = await supabase
      .from('shared_links')
      .select('idea_id')
      .eq('token', token)
      .maybeSingle()
    if (!linkRow) {
      return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const idea_id: string = linkRow.idea_id

    async function codeIsOn(): Promise<boolean> {
      const { data } = await supabase
        .from('idea_access_settings')
        .select('code_required')
        .eq('idea_id', idea_id)
        .maybeSingle()
      return data?.code_required === true
    }

    const IDEA_ASSETS_MARKER = '/storage/v1/object/public/idea-assets/'
    async function signUrlsBatch(urls: (string | null | undefined)[]): Promise<Record<string, string>> {
      const toSign: string[] = []
      const originals: Record<string, string> = {}
      for (const url of urls) {
        if (!url) continue
        const idx = url.indexOf(IDEA_ASSETS_MARKER)
        if (idx === -1) continue
        const path = decodeURIComponent(url.slice(idx + IDEA_ASSETS_MARKER.length).split('?')[0])
        if (!path) continue
        toSign.push(path)
        originals[path] = url
      }
      if (toSign.length === 0) return {}
      const { data } = await supabase.storage.from('idea-assets').createSignedUrls(toSign, 3600)
      if (!data) return {}
      const map: Record<string, string> = {}
      for (const item of (data as Array<{ path: string; signedUrl: string }>)) {
        if (item.signedUrl && item.path && originals[item.path]) map[originals[item.path]] = item.signedUrl
      }
      return map
    }

    if (action === 'cover') {
      const { data: idea, error } = await supabase
        .from('ideas')
        .select('id, title, product_image_url, tease, target_audience, category, nda_required')
        .eq('id', idea_id)
        .single()
      if (error || !idea) {
        return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const code_required = await codeIsOn()
      const coverSigned = await signUrlsBatch([idea.product_image_url])
      return new Response(JSON.stringify({
        id: idea.id,
        title: idea.title,
        product_image_url: idea.product_image_url ? (coverSigned[idea.product_image_url] ?? null) : null,
        tease: idea.tease,
        target_audience: idea.target_audience,
        category: idea.category,
        nda_required: idea.nda_required !== false,
        code_required,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'check') {
      const { code } = body
      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
      const { count: totalCount } = await supabase
        .from('idea_access_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('idea_id', idea_id)
        .gte('attempted_at', since)

      const ipCountRes = ip
        ? await supabase
            .from('idea_access_attempts')
            .select('id', { count: 'exact', head: true })
            .eq('idea_id', idea_id)
            .eq('ip_address', ip)
            .gte('attempted_at', since)
        : { count: 0 }

      if ((ipCountRes.count ?? 0) >= 5 || (totalCount ?? 0) >= 30) {
        return new Response(JSON.stringify({ error: 'locked' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: codeCandidates } = await supabase
        .from('idea_access_codes')
        .select('id, code, max_uses, uses_count')
        .eq('idea_id', idea_id)
        .eq('active', true)
      const codeRow = (codeCandidates || []).find(r => r.code.trim().toLowerCase() === String(code).trim().toLowerCase()) ?? null

      if (!codeRow || (codeRow.max_uses !== null && codeRow.uses_count >= codeRow.max_uses)) {
        await supabase.from('idea_access_attempts').insert({ idea_id, ip_address: ip, attempted_at: new Date().toISOString() })
        return new Response(JSON.stringify({ error: 'invalid_code' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'open') {
      const { code, viewer_name, viewer_email, nda_agreed } = body

      const { data: idea } = await supabase
        .from('ideas')
        .select('id, user_id, nda_required')
        .eq('id', idea_id)
        .single()
      if (!idea) {
        return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const ndaOn = idea.nda_required !== false
      const codeOn = await codeIsOn()

      if (ndaOn && (!viewer_name?.trim() || !viewer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(viewer_email.trim()) || !nda_agreed)) {
        return new Response(JSON.stringify({ error: 'nda_required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      let codeId: string | null = null
      let codeLabel: string | null = null
      let usedCode = false

      if (codeOn) {
        if (!code) {
          return new Response(JSON.stringify({ error: 'code_required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
        const { count: totalCount } = await supabase
          .from('idea_access_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('idea_id', idea_id)
          .gte('attempted_at', since)

        const ipCountRes = ip
          ? await supabase
              .from('idea_access_attempts')
              .select('id', { count: 'exact', head: true })
              .eq('idea_id', idea_id)
              .eq('ip_address', ip)
              .gte('attempted_at', since)
          : { count: 0 }

        if ((ipCountRes.count ?? 0) >= 5 || (totalCount ?? 0) >= 30) {
          return new Response(JSON.stringify({ error: 'locked' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const { data: redeemed, error: redeemError } = await supabase.rpc('redeem_idea_code', { p_idea_id: idea_id, p_code: code })
        if (redeemError || !redeemed || redeemed.length === 0) {
          await supabase.from('idea_access_attempts').insert({ idea_id, ip_address: ip, attempted_at: new Date().toISOString() })
          return new Response(JSON.stringify({ error: 'invalid_code' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        codeId = redeemed[0].code_id
        codeLabel = redeemed[0].code_label
        usedCode = true
      }

      const now = new Date().toISOString()

      if (ndaOn) {
        const email = viewer_email.trim()
        const { data: existingRows } = await supabase
          .from('idea_access_log')
          .select('id, view_count')
          .eq('idea_id', idea_id)
          .eq('viewer_email', email)
        const existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null

        let logRow: { id: string } | null = null
        if (existing) {
          const updateData: Record<string, unknown> = { last_viewed: now, view_count: (existing.view_count ?? 1) + 1, ip_address: ip, nda_accepted: true }
          if (codeId) { updateData.code_id = codeId; updateData.code_label = codeLabel }
          const { data, error: logError } = await supabase
            .from('idea_access_log')
            .update(updateData)
            .eq('id', existing.id)
            .select('id')
            .single()
          if (logError || !data) {
            console.error('[idea-access] log update failed:', logError)
            return new Response(JSON.stringify({ error: 'log_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
          logRow = data
        } else {
          const insertData: Record<string, unknown> = { idea_id, viewer_email: email, viewer_name: viewer_name?.trim() ?? null, ip_address: ip, nda_accepted: true, viewed_at: now, last_viewed: now, view_count: 1 }
          if (codeId) { insertData.code_id = codeId; insertData.code_label = codeLabel }
          const { data, error: logError } = await supabase
            .from('idea_access_log')
            .insert(insertData)
            .select('id')
            .single()
          if (logError || !data) {
            console.error('[idea-access] log insert failed:', logError)
            return new Response(JSON.stringify({ error: 'log_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
          logRow = data
        }

        try {
          if (logRow?.id && ip) {
            const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
            await supabase
              .from('idea_views')
              .update({ superseded_by: logRow.id })
              .eq('idea_id', idea_id)
              .eq('ip_address', ip)
              .gte('viewed_at', since)
              .is('superseded_by', null)
          }
        } catch (err) {
          console.warn('[idea-access] supersede step failed:', (err as Error).message)
        }
      } else if (usedCode && codeId) {
        const { data: existingRows } = await supabase
          .from('idea_access_log')
          .select('id, view_count')
          .eq('idea_id', idea_id)
          .eq('code_id', codeId)
          .is('viewer_email', null)
        const existing = Array.isArray(existingRows) && existingRows.length > 0 ? existingRows[0] : null

        if (existing) {
          const { error: logError } = await supabase
            .from('idea_access_log')
            .update({ last_viewed: now, view_count: (existing.view_count ?? 1) + 1, ip_address: ip })
            .eq('id', existing.id)
          if (logError) {
            console.error('[idea-access] log update failed:', logError)
            return new Response(JSON.stringify({ error: 'log_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
        } else {
          const { error: logError } = await supabase
            .from('idea_access_log')
            .insert({ idea_id, code_id: codeId, code_label: codeLabel, ip_address: ip, nda_accepted: false, viewed_at: now, last_viewed: now, view_count: 1 })
          if (logError) {
            console.error('[idea-access] log insert failed:', logError)
            return new Response(JSON.stringify({ error: 'log_failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }
        }
      }

      const sessionToken = crypto.randomUUID()
      await supabase.from('idea_sessions').insert({
        token: sessionToken,
        idea_id,
        code_id: codeId,
        used_code: usedCode,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      const { data: freshIdea } = await supabase.rpc('get_shared_idea', { p_token: token })

      if (freshIdea && typeof freshIdea === 'object') {
        const fi = freshIdea as Record<string, unknown>
        const sf = Array.isArray(fi.support_files) ? fi.support_files as Array<Record<string, unknown>> : []
        const urlsToSign = [fi.product_image_url, fi.sketch_image_url, ...sf.filter(f => f.type !== 'video_link').map(f => f.url)] as (string | null | undefined)[]
        const signed = await signUrlsBatch(urlsToSign)
        if (fi.product_image_url) fi.product_image_url = signed[fi.product_image_url as string] ?? null
        if (fi.sketch_image_url) fi.sketch_image_url = signed[fi.sketch_image_url as string] ?? null
        for (const f of sf) { if (f.type !== 'video_link' && f.url) f.url = signed[f.url as string] ?? null }
      }

      return new Response(JSON.stringify({ session: sessionToken, idea: freshIdea }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (action === 'refresh') {
      const { session: sessionToken } = body
      if (!sessionToken) {
        return new Response(JSON.stringify({ error: 'Missing session' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: sess } = await supabase
        .from('idea_sessions')
        .select('token, expires_at, code_id, used_code')
        .eq('idea_id', idea_id)
        .eq('token', sessionToken)
        .single()
      if (!sess || new Date(sess.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'session_expired' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const codeOn = await codeIsOn()
      if (codeOn) {
        if (!sess.used_code || !sess.code_id) {
          return new Response(JSON.stringify({ error: 'session_expired' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        const { data: codeEntry } = await supabase
          .from('idea_access_codes')
          .select('active')
          .eq('id', sess.code_id)
          .single()
        if (!codeEntry || !codeEntry.active) {
          return new Response(JSON.stringify({ error: 'session_expired' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      const { data: freshIdea } = await supabase.rpc('get_shared_idea', { p_token: token })

      if (freshIdea && typeof freshIdea === 'object') {
        const fi = freshIdea as Record<string, unknown>
        const sf = Array.isArray(fi.support_files) ? fi.support_files as Array<Record<string, unknown>> : []
        const urlsToSign = [fi.product_image_url, fi.sketch_image_url, ...sf.filter(f => f.type !== 'video_link').map(f => f.url)] as (string | null | undefined)[]
        const signed = await signUrlsBatch(urlsToSign)
        if (fi.product_image_url) fi.product_image_url = signed[fi.product_image_url as string] ?? null
        if (fi.sketch_image_url) fi.sketch_image_url = signed[fi.sketch_image_url as string] ?? null
        for (const f of sf) { if (f.type !== 'video_link' && f.url) f.url = signed[f.url as string] ?? null }
      }

      return new Response(JSON.stringify({ idea: freshIdea }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('[idea-access] error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
