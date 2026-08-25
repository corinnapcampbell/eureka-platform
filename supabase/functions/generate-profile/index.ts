import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
  const supabaseAuth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.json()
    const { title, problem, solution, target_audience, market_size } = body

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY secret' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a professional startup analyst. Write a concise 3-paragraph executive summary for this idea. Return only the summary, no headers.\n\nTitle: ${title}\nAudience: ${target_audience}\nProblem: ${problem}\nSolution: ${solution}\nMarket: ${market_size}`
        }]
      })
    })

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text()
      console.error(`[generate-profile] anthropic ${anthropicRes.status}: ${detail}`)
      return new Response(JSON.stringify({ error: `Anthropic API returned ${anthropicRes.status}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const data = await anthropicRes.json()
    const text = data.content?.[0]?.text ?? ''

    return new Response(JSON.stringify({ profile: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ profile: '', error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})