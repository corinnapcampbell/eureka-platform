import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { sectionLabel, content } = await req.json()
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are a tough but fair investor evaluating a startup pitch. Identify weaknesses and ask hard questions. Be direct and specific. If content is genuinely strong and complete, say so honestly — do not force criticism where none is warranted.',
        messages: [{
          role: 'user',
          content: `Section: ${sectionLabel}\nContent: ${content}\n\nEvaluate this section of a startup pitch. Respond ONLY with valid JSON, no markdown backticks:\n{"strong":false,"strongNote":"","questions":["q1","q2"],"suggestion":"advice"}`
        }]
      })
    })
    const data = await response.json()
    const text = data.content?.[0]?.text ?? '{}'
    return new Response(text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
