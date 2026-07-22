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
    p_user_id: user.id, p_action_type: 'generate_pitch_section', p_target_key: String(targetKey)
  })
  if (!usageCheck?.allowed) {
    return new Response(JSON.stringify({ error: 'usage_limit', reason: usageCheck?.reason }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const aiRemaining = usageCheck?.remaining ?? null

  try {
    const { section_name, existing_sections = {}, idea_context = {} } = await req.json()
    if (!section_name) return new Response(JSON.stringify({ error: 'section_name is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const sectionLabels = {
      tagline: 'Tagline', problem: 'Problem', solution: 'Solution',
      how_it_works: 'How It Works', target_audience: 'Target Market', market_size: 'Market Size',
      business_model: 'Business Model', competitive_advantage: 'Competitive Advantage',
      risks: 'Risks & Challenges', next_steps: 'Next Steps'
    }

    const filledSections = Object.entries(existing_sections)
      .filter(([key, value]) => value?.trim() && key !== section_name)
      .map(([key, value]) => `${sectionLabels[key] || key}: ${value.trim()}`)
      .join('\n\n')

    const sectionLabel = sectionLabels[section_name] || section_name
    const prompt = `You are helping an entrepreneur refine their startup pitch. Suggest content for the "${sectionLabel}" section.
IDEA TITLE: ${idea_context.title || '(not provided)'}
WHAT THE FOUNDER HAS WRITTEN SO FAR:\n${filledSections || '(No other sections completed yet)'}
Write a suggestion that fits naturally with what they have already written. Do not invent facts not implied by their existing text. Be specific, professional, and concise.
Return only the suggestion text — no preamble, no explanation, no quotation marks.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5-20250929', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('Anthropic error:', detail)
      return new Response(JSON.stringify({ error: 'Anthropic API error' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const data = await response.json()
    const suggestion = data.content?.[0]?.text?.trim() || ''
    return new Response(JSON.stringify({ suggestion }), { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-AI-Remaining': String(aiRemaining ?? '') } })

  } catch (err) {
    console.error('generate-pitch-section error:', err)
    return new Response(JSON.stringify({ error: 'Failed to generate suggestion' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
