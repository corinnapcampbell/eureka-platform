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

    const prompt = `You are an expert industrial design illustrator and mechanical engineer creating a technical blueprint SVG. Your job is to interpret a product description and produce an accurate, detailed engineering drawing — even filling in plausible engineering details the inventor hasn't specified.

PRODUCT DESCRIPTION:
Name: ${answers.product_name || 'Unnamed'}
Summary: ${answers.product_summary}
Primary shape: ${answers.primary_shape}
Secondary features: ${(answers.secondary_shapes || []).join(', ')}
Size: ${answers.size_ref} — ${answers.size_custom}
Proportions: ${answers.proportions}
Exterior notes: ${answers.silhouette_notes}
Parts: ${(answers.parts_named || []).filter(Boolean).join(', ')}
Internal parts: ${answers.internal_desc}
Interior type: ${answers.interior_view}
Symmetry: ${answers.symmetry}
Mechanism type: ${answers.mechanism_type}
How it works: ${answers.mechanism_plain}
What moves: ${answers.moving_parts}
Trigger: ${answers.trigger}
Energy source: ${answers.energy_source}
Internal layout: ${answers.internal_layout}
Interaction: ${(answers.interaction_primary || []).join(', ')}
Use steps: ${(answers.use_steps || []).filter(Boolean).join(' → ')}
Outer materials: ${(answers.materials_outer || []).join(', ')}
Inner materials: ${answers.materials_inner}
Weight feel: ${answers.weight_feel}
Similar to: ${answers.existing_similar}
What makes it different: ${answers.differentiator}

STEP 1 — REASON BEFORE DRAWING (do this mentally, do not output it):
- What is the true shape of this product? Do not default to a plain cylinder. Infer the actual silhouette from the description. A vase has a wider mouth than body. A bottle tapers. A box has corners. Match the shape to the product type.
- Where is the weight? A mechanism in the base means the base is heavier and wider for stability.
- What internal components must exist for the mechanism to work, even if not explicitly described? Infer them (blade, shaft, gear, seal, spring, etc.) and draw them as dashed internal lines.
- What would a cross-section slice vertically through the center reveal? Draw that in the SECTION A-A view with all layers visible.
- What are the 8-10 most important features to annotate?

STEP 2 — DRAW THE SVG:
Output ONLY a raw SVG element. No explanation, no markdown, no backticks. Start with <svg and end with </svg>.

TECHNICAL REQUIREMENTS:
- viewBox="0 0 800 580" width="800" height="580"
- Background: <rect width="800" height="580" fill="#0d1b3e"/>
- Grid: lines every 40px, stroke="#1a2d5a" stroke-width="0.5" opacity="0.7"

MAIN FRONT VIEW (x=80 to x=460, y=20 to y=460):
- Draw the ACTUAL silhouette of the product — not a generic shape. If it is a vase: wider elliptical opening at top, slightly curved or tapered body, distinct heavier base section that is wider than the body for stability, grip ring at very bottom.
- Outer walls: stroke="#7eb8f7" stroke-width="1.8"
- Wall thickness shown as double lines: stroke="#7eb8f7" stroke-width="0.8"
- Distinct sections separated by visible dividing lines where materials or components change
- Internal components shown as dashed lines INSIDE the product outline: stroke="#3a7ab8" stroke-width="1" stroke-dasharray="5,3"
- For ANY rotating mechanism: draw the blade as a horizontal dashed line near the base, draw the central shaft as a vertical dashed centerline, draw the sealed chamber boundary
- Water fill line if applicable: stroke="#4a8fd4" stroke-width="0.8" stroke-dasharray="6,2" opacity="0.7"
- Centerline: stroke="#2a5a8a" stroke-width="0.5" stroke-dasharray="8,4"

SECTION A-A — CROSS SECTION VIEW (x=500 to x=770, y=20 to y=320):
- This is NOT an outline — it is a vertical slice through the center showing ALL internal layers
- Draw hatching on solid material walls (diagonal lines at 45°, 4px spacing): stroke="#2a4a7a" stroke-width="0.4"
- Show: outer wall cross-section (hatched), inner hollow cavity, any internal components at their correct vertical positions (blade at bottom, shaft through center, perforated plate above blade, water chamber above that)
- All internal components clearly drawn as solid lines: stroke="#7eb8f7" stroke-width="1.2"
- Label: "SECTION A–A" font-family="monospace" font-size="10" fill="#a8d4f5"
- Cutting plane line on main view showing where section is taken: stroke="#a8d4f5" stroke-width="0.6" stroke-dasharray="10,3,2,3"

ANNOTATIONS (MANDATORY — embed directly in SVG, 8 to 10 total):
- Each annotation: dashed leader line stroke="#5a9fd8" stroke-width="0.7" stroke-dasharray="3,3", dot at product end circle r="2.5" fill="#7eb8f7", text label font-family="monospace" font-size="11" fill="#c8dff8"
- Annotate every distinct visible feature: opening, body section, material transition, mechanism area, grip, base, internal components visible through dashed lines
- Place labels clearly outside the product outline, alternating left and right sides
- Each annotation <g> must have data-type="annotation"

DIMENSION LINES (5 minimum):
- Overall height with measurement, overall width at widest point, base height, wall thickness, any key internal measurement
- Arrows at both ends, stroke="#4a8fd4" stroke-width="0.7"
- Text font-family="monospace" font-size="10" fill="#7eb8f7"
- Place on left side and bottom of main view

TITLE BLOCK (y=465 to y=580, x=0 to x=800):
- Background rect fill="#07102a" stroke="#4a8fd4" stroke-width="0.8"
- Vertical dividers creating 4 columns
- Col 1 (x=10): product name font-size="16" font-weight="bold" fill="#c8dff8" font-family="monospace", below it: summary truncated to 60 chars font-size="9" fill="#7eb8f7" font-family="monospace"
- Col 2 (x=220): "eurekAIdea" font-size="13" fill="#9b7ff7" font-family="monospace", "TECHNICAL BLUEPRINT" font-size="9" fill="#7eb8f7" font-family="monospace"
- Col 3 (x=440): "SHEET 1 OF 3" font-size="9", "FRONT VIEW + SECTION" font-size="9", "SCALE 1:2" font-size="9" — all fill="#7eb8f7" font-family="monospace"
- Col 4 (x=620): "DWG: EVA-001" font-size="9", "REV: A" font-size="9", "2026" font-size="9" — all fill="#7eb8f7" font-family="monospace"`

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
