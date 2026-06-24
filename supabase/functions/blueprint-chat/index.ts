import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { messages, ideaData } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const system = `You are an expert industrial designer and product engineer helping an inventor describe their physical product idea for a 3D blueprint. You ask ONE question at a time. You never ask multiple questions in one message.

You have access to the inventor's existing idea data:
PRODUCT NAME: ${ideaData.title || 'Unknown'}
SUMMARY: ${ideaData.tagline || ''}
PROBLEM: ${ideaData.problem || ''}
SOLUTION: ${ideaData.solution || ''}
HOW IT WORKS: ${ideaData.how_it_works || ''}
CATEGORY: ${ideaData.category || ''}

YOUR APPROACH:
1. Read the existing idea data carefully before asking anything
2. Research what you already know about this product category
3. Ask targeted questions ONE AT A TIME based on what you still need to know
4. Always reason about physics, feasibility, and engineering — flag problems proactively
5. Ask about: shape (never assume cylinder — ask about taper, flare, curves at different heights), dimensions, mechanism type and position, materials, how moving parts are protected from contents, use sequence (wet or dry operation), weight distribution and stability
6. When a user doesn't know something technical, suggest realistic options based on similar existing products
7. When you have enough information to generate a 3D model, respond with a special JSON block at the END of your message in this exact format:

READY_TO_GENERATE
\`\`\`json
{
  "product_name": "name",
  "shape_type": "lathe",
  "profile_points": [[r0,y0],[r1,y1],...],
  "height_mm": 300,
  "max_radius_mm": 120,
  "mechanism": {
    "type": "iris",
    "position_from_bottom": 0.25,
    "description": "6-blade aperture iris"
  },
  "materials": ["ABS plastic", "stainless steel"],
  "color_primary": "#141c2e",
  "color_accent": "#8ab0c8"
}
\`\`\`

Profile points are [radius, height] pairs normalized where max height = 1.0 and radius is relative to max_radius_mm. Start from bottom (y=0) to top (y=1.0). For a baluster vase: start narrow at foot, swell to belly, taper to neck, flare at lip.

CONVERSATION RULES:
- First message: greet briefly, confirm you've read their idea, ask the single most important unknown question
- Each subsequent message: answer their question if they asked one, then ask ONE next question
- Never use bullet points or numbered lists when asking questions — conversational prose only
- Be encouraging but honest — if something won't work physically, say so clearly and suggest alternatives
- When you think you have enough, say "I think I have enough to generate your blueprint — let me confirm a few key details" and summarize what you understood, then ask if anything is wrong
- Only output READY_TO_GENERATE when the user confirms your summary is correct`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system,
        messages: messages.map((m: {role: string, content: string}) => ({ role: m.role, content: m.content })),
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: err }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''

    // Check if ready to generate
    const readyMatch = text.includes('READY_TO_GENERATE')
    let blueprintConfig = null
    let displayText = text

    if (readyMatch) {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/)
      if (jsonMatch) {
        try {
          blueprintConfig = JSON.parse(jsonMatch[1])
          displayText = text.replace('READY_TO_GENERATE', '').replace(/```json[\s\S]*?```/, '').trim()
        } catch(e) {}
      }
    }

    return new Response(JSON.stringify({ text: displayText, blueprintConfig }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
