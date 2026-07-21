import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  try {
    const { idea, field, currentValue } = await req.json()
    if (!idea?.title || !field) return new Response(JSON.stringify({ error: 'idea.title and field are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const instructions = {
      tagline:               'One punchy sentence (max 15 words) capturing the essence of the idea.',
      problem:               'Two or three sentences describing the core pain point this idea solves.',
      solution:              'Two or three sentences describing how the idea solves the problem.',
      how_it_works:          'Exactly 3 numbered steps, one per line, starting with "1. ", "2. ", "3. ".',
      market_size:           'One to two sentences including at least one dollar figure with B/M suffix.',
      target_audience:       'Comma-separated list of 3-5 specific audience segments.',
      business_model:        'Two lines: first starting with "Free: ...", second starting with "Paid: ...".',
      competitive_advantage: 'Two or three sentences on what makes this uniquely positioned to win.',
      risks:                 'Exactly 3 risks, one per line, each starting with the risk name followed by a colon.',
      next_steps:            'Exactly 3 action items, one per line, each starting with a verb.',
    }

    const contextLines = Object.entries(idea)
      .filter(([k, v]) => typeof v === 'string' && v.trim() && k !== field && k !== 'id' && k !== 'user_id')
      .map(([k, v]) => `${k}: ${v.slice(0, 300)}`)
      .join('\n\n')

    const prompt = `You are a startup pitch writer. Improve the "${field}" section of a pitch document.
IDEA TITLE: ${idea.title}
FULL IDEA CONTEXT:\n${contextLines || '(only the title is provided)'}
CURRENT VALUE:\n${currentValue?.trim() || '(empty)'}
INSTRUCTION: ${instructions[field] || 'Write 2-3 clear, professional sentences.'}
Return ONLY the improved text. No explanation, no label, no markdown, no surrounding quotes.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5-20250929', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('Anthropic error:', detail)
      return new Response(JSON.stringify({ error: 'AI API error' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const data = await response.json()
    const improved = data.content?.[0]?.text?.trim() || ''
    return new Response(JSON.stringify({ improved }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('improve-pitch-field error:', err)
    return new Response(JSON.stringify({ error: 'Failed to improve field' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
