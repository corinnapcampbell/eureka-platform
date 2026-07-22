import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'X-AI-Remaining',
}
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const body = await req.clone().json().catch(() => ({}))
  const targetKey = body.target_key || body.ideaId || body.idea?.id || 'unknown'
  const { data: usageCheck } = await supabaseAuth.rpc('check_ai_usage', {
    p_user_id: user.id, p_action_type: 'competitive_suggest', p_target_key: String(targetKey)
  })
  if (!usageCheck?.allowed) {
    return new Response(JSON.stringify({ error: 'usage_limit', reason: usageCheck?.reason }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const aiRemaining = usageCheck?.remaining ?? null
  try {
    const { prompt } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY secret' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: 'You are a startup analyst. Return only valid JSON. No markdown, no code fences, no explanation.',
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!response.ok) {
      const errBody = await response.text()
      console.error('Anthropic error:', errBody)
      return new Response(JSON.stringify({ error: errBody }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const data = await response.json()
    let text = data.content?.[0]?.text
    if (!text) {
      return new Response(JSON.stringify({ error: 'Empty response from Anthropic' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    return new Response(text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-AI-Remaining': String(aiRemaining ?? '') }
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
