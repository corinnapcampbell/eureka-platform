import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { answers } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const prompt = `You are a technical blueprint illustrator. Create a detailed SVG technical blueprint of a physical product.

PRODUCT NAME: ${answers.product_name || 'Unnamed'}
SUMMARY: ${answers.product_summary}
PRIMARY SHAPE: ${answers.primary_shape}
SECONDARY FEATURES: ${(answers.secondary_shapes || []).join(', ')}
SIZE: ${answers.size_ref} — ${answers.size_custom}
PROPORTIONS: ${answers.proportions}
EXTERIOR NOTES: ${answers.silhouette_notes}
PARTS: ${(answers.parts_named || []).filter(Boolean).join(', ')}
INTERNAL PARTS: ${answers.internal_desc}
SYMMETRY: ${answers.symmetry}
INTERIOR: ${answers.interior_view}
MECHANISM TYPE: ${answers.mechanism_type}
HOW IT WORKS: ${answers.mechanism_plain}
TRIGGER: ${answers.trigger}
MOVING PARTS: ${answers.moving_parts}
ENERGY SOURCE: ${answers.energy_source}
INTERNAL LAYOUT: ${answers.internal_layout}
USER INTERACTION: ${(answers.interaction_primary || []).join(', ')}
GRIP: ${answers.grip_style}
USE STEPS: ${(answers.use_steps || []).filter(Boolean).join(' → ')}
OUTER MATERIALS: ${(answers.materials_outer || []).join(', ')}
INNER MATERIALS: ${answers.materials_inner}
SURFACE FINISH: ${(answers.finish || []).join(', ')}
COLOR INTENT: ${answers.color_intent}
WEIGHT FEEL: ${answers.weight_feel}
PROBLEM SOLVED: ${answers.problem_solved}
SIMILAR TO: ${answers.existing_similar}
DIFFERENTIATOR: ${answers.differentiator}
EMOTIONAL INTENT: ${answers.emotional_intent}

BLUEPRINT REQUIREMENTS — follow exactly:
- Output ONLY the raw SVG element. No explanation, no markdown, no backticks.
- Start with <svg and end with </svg>
- viewBox="0 0 800 580" width="800" height="580"
- Background: <rect width="800" height="580" fill="#0d1b3e"/>
- Subtle grid: horizontal and vertical lines every 40px, stroke="#1a2d5a" stroke-width="0.5"
- MAIN FRONT VIEW (x=60 to x=480, full height minus title block): detailed orthographic line drawing of the product. Primary lines stroke="#7eb8f7" stroke-width="1.5". Detail lines stroke="#4a8fd4" stroke-width="0.8". Hidden/internal: stroke="#3a7ab8" stroke-width="0.8" stroke-dasharray="4,3"
- CROSS-SECTION VIEW (x=500 to x=760, y=30 to y=280): smaller side or cross-section view. Label "SECTION A-A" font-family="monospace" font-size="10" fill="#a8d4f5"
- ANNOTATIONS: 8-12 annotation groups. Each group has: a dashed leader line stroke="#5a9fd8" stroke-width="0.7" stroke-dasharray="3,3", a small circle at the product end r="3" fill="#7eb8f7", and a text label font-family="monospace" font-size="11" fill="#c8dff8". Each annotation group must have data-type="annotation" attribute on its enclosing <g> element.
- DIMENSION LINES: at least 4, with arrows and estimated measurements. stroke="#4a8fd4" stroke-width="0.7", text font-family="monospace" font-size="10" fill="#7eb8f7"
- TITLE BLOCK (y=480 to y=580): rect stroke="#4a8fd4" fill="none". Product name 18px, "TECHNICAL BLUEPRINT", "eurekAIdea" fill="#9b7ff7", "SHEET 1 OF 3", "SCALE 1:2", "DWG No: EVA-001" all font-family="monospace" fill="#a8d4f5"`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      return new Response(JSON.stringify({ error: errBody }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const data = await response.json()
    let svg = data.content?.[0]?.text || ''
    svg = svg.replace(/```svg|```xml|```/gi, '').trim()
    const start = svg.indexOf('<svg')
    if (start > 0) svg = svg.slice(start)
    const end = svg.lastIndexOf('</svg>')
    if (end > -1) svg = svg.slice(0, end + 6)

    return new Response(JSON.stringify({ svg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
