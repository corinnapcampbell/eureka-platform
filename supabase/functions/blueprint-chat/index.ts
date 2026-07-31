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
    p_user_id: user.id, p_action_type: 'blueprint_chat', p_target_key: String(targetKey)
  })
  if (!usageCheck?.allowed) {
    return new Response(JSON.stringify({ error: 'usage_limit', reason: usageCheck?.reason }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const aiRemaining = usageCheck?.remaining ?? null
  try {
    const { messages, ideaData } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const system = `You are an expert industrial designer and product engineer helping an inventor describe their physical product idea for a design sketch. You ask ONE question at a time. You never ask multiple questions in one message.

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
7. When you have enough information to generate a sketch prompt, respond with a special JSON block at the END of your message in this exact format:

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
- When you think you have enough, say "I think I have enough to generate your sketch prompt — let me confirm a few key details" and summarize what you understood, then ask if anything is wrong
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
    let sketchPrompt = null
    let displayText = text

    if (readyMatch) {
      displayText = text.replace('READY_TO_GENERATE', '').replace(/```json[\s\S]*?```/, '').trim()

      // Gate: free users get one sketch per idea
      const serviceClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data: subRow } = await serviceClient.from('user_subscriptions').select('tier').eq('user_id', user.id).maybeSingle()
      const userIsPro = subRow?.tier === 'pro'
      if ((ideaData?.sketch_generation_count ?? 0) >= 1 && !userIsPro) {
        displayText = "You've used your free sketch generation for this idea. Upgrade to Pro to generate unlimited sketches."
        return new Response(JSON.stringify({ text: displayText, sketchPrompt: null }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-AI-Remaining': String(aiRemaining ?? '') },
        })
      }

      const sketchSystem = `You are generating a prompt for an external AI image generator (ChatGPT/GPT Image) that will produce a hand-drawn graphite pencil exploded-view industrial design sketch, in a fixed house style, for a physical product idea. You are given a structured product description extracted from a user interview (shape, mechanism if any, dimensions, materials, use sequence, decorative details). Output ONLY the final image-generation prompt text — no preamble, no explanation.

The prompt you generate must always include, in this order:

1. This fixed style block, verbatim, never altered:
"Create a single-page hand-drawn graphite pencil industrial design sketch in exploded-view style, on a plain white background — like a real page torn from a product designer's sketchbook, not a clean digital illustration. Style: loose sketchy pencil linework, visible un-erased construction guidelines (center lines, ellipse cross-axes), directional cross-hatching and parallel hatch strokes for shading (heavier on shadowed undersides), monochrome graphite only, no color, no digital smoothing."

2. A one-paragraph subject description of the product, in plain language matching what the user described.

If the product has a mechanism, you must clearly explain in plain language how it physically operates — what moves, in what direction, what triggers the motion, and what the at-rest vs actuated states look like — before describing the panels. Do not just name the mechanism type; describe its behavior.

3. Exactly 5 numbered panels, chosen based on what this specific product needs — do NOT force a fixed template:
   - Always include one panel: the fully assembled product in 3/4 view.
   - If the product has an internal moving mechanism: include a mechanism cutaway/exploded panel.
   - If the product has no mechanism: substitute a structural/proportional panel (conceptual exploded view of component relationships, or a side-profile technical view showing scale/proportion/load path) — never fabricate a mechanism that doesn't exist.
   - Include one panel showing the single most complex, novel, or highest-risk detail alone/exploded.
   - Include one detail close-up of the most delicate or noteworthy small feature.
   - Include one additional panel supporting whichever aspect of the product most needs visual explanation.

4. A closing constraints line: "Proportions realistic for a [product category] (approximate real-world scale). No frame, no background elements, no text labels. Pure pencil on white paper, same hand-drawn sketchbook aesthetic throughout all five panels."

Do not invent product details not present in the input. If a detail needed for a panel is missing, describe that panel more generically rather than fabricating specifics.`

      const sketchRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: sketchSystem,
          messages: [
            ...messages.map((m: {role: string, content: string}) => ({ role: m.role, content: m.content })),
            { role: 'user', content: 'Generate the image-generation prompt for this product based on everything we discussed.' },
          ],
        }),
      })
      if (sketchRes.ok) {
        const sketchData = await sketchRes.json()
        sketchPrompt = sketchData.content?.[0]?.text || null
      }
    }

    return new Response(JSON.stringify({ text: displayText, sketchPrompt }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-AI-Remaining': String(aiRemaining ?? '') },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
