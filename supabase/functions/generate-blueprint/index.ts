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

    const prompt = `You are an expert industrial designer creating a product blueprint in the style of a professional design sketch — like Apple patent drawings crossed with a Procreate industrial design sketch. The output is a single SVG combining a main 3/4-perspective product view with floating isolated component sketches connected by annotation lines. Think: watch exploded view, soap dispenser pump sketch, knife design sheet.

PRODUCT INFORMATION:
Name: ${answers.product_name || 'Unnamed'}
Summary: ${answers.product_summary}
Primary shape (hint only — do not follow literally): ${answers.primary_shape}
Secondary features: ${(answers.secondary_shapes || []).join(', ')}
Size: ${answers.size_ref} — ${answers.size_custom}
Proportions: ${answers.proportions}
Exterior notes: ${answers.silhouette_notes}
Parts: ${(answers.parts_named || []).filter(Boolean).join(', ')}
Internal parts: ${answers.internal_desc}
Interior: ${answers.interior_view}
Mechanism type: ${answers.mechanism_type}
How it works: ${answers.mechanism_plain}
What moves: ${answers.moving_parts}
Trigger: ${answers.trigger}
Energy source: ${answers.energy_source}
Internal layout: ${answers.internal_layout}
Materials outside: ${(answers.materials_outer || []).join(', ')}
Materials inside: ${answers.materials_inner}
Color intent: ${answers.color_intent}
Weight distribution: ${answers.weight_feel}
Similar to: ${answers.existing_similar}
Key differentiator: ${answers.differentiator}
Use steps: ${(answers.use_steps || []).filter(Boolean).join(' → ')}

STEP 1 — REASON BEFORE DRAWING (internal only, do not output):

SHAPE: Ignore the primary shape field as a literal instruction. Use ALL product information together to determine the true silhouette. A vase that holds water and flowers needs: wider elliptical opening at top, gently curved or slightly tapered body, distinctly wider and heavier base for stability, a clear visual separation between the body and the mechanism base. Never draw a uniform cylinder for a product that is clearly not one.

COLOR MODE: Check the color_intent field.
- If it contains specific colors (e.g. "clear plastic body, matte black base, chrome ring"): use muted desaturated versions of those colors as subtle fills on the main product view. Desaturate all colors by 60% so lines remain visible. Use: clear/frosted = very light blue-grey fill rgba, matte black = dark navy fill #1a2040, chrome = mid-grey stroke, plastic = slight warm grey tint. ALWAYS keep all structural lines, mechanism lines, and annotations in blueprint blue #7eb8f7 so they read clearly over any fill.
- If no specific colors mentioned: stay in pure blueprint mode — no fills, all lines in blueprint blue on dark navy background.

COMPONENTS: What are the 3-4 most important isolated components to draw separately? For a cutting mechanism vase: (1) the blade — draw it from above as a circle/disc shape showing the cutting edge profile and center shaft hole, (2) the shaft and coupling — side view showing how the outer twist connects to the inner shaft, (3) the base mechanism assembly — from below or exploded showing how the sealed chamber works, (4) the stem guide plate — top view showing the holes stems pass through. For other products, choose the most novel/functional components.

MOVEMENT: Which parts move? Each needs: curved arrows showing direction, motion arc lines, short text label like "TWIST →" or "BLADE ROTATES 360°".

ANNOTATIONS: 8-10 labels connecting the main view to the floating component sketches. Each annotation line goes FROM a point on the main product TO either a label or a component sketch.

STEP 2 — DRAW THE SVG:
Output ONLY raw SVG. Start with <svg and end with </svg>. No explanation, no markdown, no backticks.

CANVAS:
- viewBox="0 0 960 680" width="960" height="680"
- Background: <rect width="960" height="680" fill="#0a1628"/>
- Very subtle grid every 40px: stroke="#111f3a" stroke-width="0.5"

MAIN PRODUCT VIEW — center-left area (roughly x=120 to x=440, y=60 to y=530):
Draw the product in a slight 3/4 perspective view — not flat front, not fully isometric. Tilt it just enough to show depth and give it a sketched feel.
- Use ellipses at top and bottom openings to convey 3D depth
- Outer body lines: stroke="#7eb8f7" stroke-width="2" — confident, slightly varying weight like a hand sketch
- If color fills specified: apply muted fills UNDER the lines. Lines always on top.
- Show distinct sections clearly: body vs base vs opening vs grip ring
- Internal hidden components as dashed lines: stroke="#3a6a9a" stroke-width="1" stroke-dasharray="5,3"
- Centerline: stroke="#1a3a5a" stroke-width="0.7" stroke-dasharray="10,5"
- Water level line if applicable: stroke="#4a8fd4" stroke-width="1" stroke-dasharray="8,3" opacity="0.7"
- Movement indicators on moving parts: curved arrow paths stroke="#a8d4f5" stroke-width="1.5" fill="none" with arrowhead markers. For rotating base: curved arrow arc around the base exterior. For blade: rotational sweep inside the base section. Label with font-family="monospace" font-size="10" fill="#a8d4f5"
- Sketch construction lines (very faint): stroke="#0d2040" stroke-width="0.4" — suggests hand-drawn construction

FLOATING COMPONENT SKETCHES — positioned around the main view:
Draw 3-4 isolated component sketches floating in the remaining space. Position them:
- TOP RIGHT area (x=520 to x=780, y=50 to y=230): Component 1 — the most novel/functional component drawn enlarged and isolated. For a blade: top-view circle showing blade profile, cutting edge indicated, center hole for shaft. For other products: the key mechanism part.
- BOTTOM RIGHT area (x=520 to x=780, y=250 to y=430): Component 2 — second most important component. For shaft/coupling: side view showing how rotation transfers. For other products: the assembly or housing.
- TOP LEFT floating (x=30 to x=110, y=80 to y=220): Component 3 — small detail. For stem guide plate: top view grid of holes. For other products: a small cross-section or detail.
- BOTTOM LEFT floating (x=30 to x=110, y=300 to y=470): Component 4 — motion/mechanism detail. Show the mechanism in action — blade mid-rotation, spring compressed, gear engaged. Include motion arrows.

For each component sketch:
- Component name as header: font-family="monospace" font-size="10" fill="#c8dff8" font-weight="bold"
- Drawing lines: stroke="#7eb8f7" stroke-width="1.4" — same confident sketch quality
- If the component has color: apply the same muted fill logic as the main view
- 2-3 short annotation labels on the component itself: font-family="monospace" font-size="9" fill="#8ab8e8"
- Faint enclosing area suggestion (NOT a hard box): very light rect rx="4" fill="none" stroke="#1a2d4a" stroke-width="0.5"

CONNECTION LINES — from main product to component sketches:
For each component sketch, draw a thin line from the relevant point on the main product to the component sketch area.
- Line: stroke="#3a6a9a" stroke-width="0.8" stroke-dasharray="4,4"
- Small filled circle at the product end: r="2.5" fill="#5a9fd8"
- Small open circle at the component sketch end: r="2.5" fill="none" stroke="#5a9fd8" stroke-width="0.8"
- These connection lines show which part of the product each component sketch represents

MAIN ANNOTATIONS (8-10, on the main product view):
- Leader line from product feature outward: stroke="#4a7ab0" stroke-width="0.8" stroke-dasharray="3,3"
- Dot at product: circle r="2.5" fill="#6a9fd8"
- Label text: font-family="monospace" font-size="11" fill="#c8dff8"
- Alternate left and right sides to avoid crowding
- Each annotation <g> must have data-type="annotation"
- Label every visible feature: opening, body material zone, accent ring, mechanism base, grip ring, hidden blade (with dashed leader), shaft centerline, water level, etc.

DIMENSION INDICATORS (3-4, kept minimal and clean):
- Only the most important dimensions: overall height, widest point, base height
- Single-ended tick marks rather than full dimension lines — cleaner, more sketch-like
- stroke="#3a6a9a" stroke-width="0.7", text font-family="monospace" font-size="9" fill="#6a9fd8"
- Place on far left of main view only

TITLE BLOCK (y=570 to y=680, full width x=0 to x=960):
- Background: rect fill="#060e1e" stroke="#2a4a7a" stroke-width="0.8"
- Thin horizontal line at y=570: stroke="#2a4a7a" stroke-width="0.8"
- Vertical dividers at x=250, x=480, x=680
- Col 1 (x=15, y centered): product name font-size="18" fill="#c8dff8" font-family="monospace" font-weight="bold" — below it summary max 65 chars font-size="9" fill="#4a7ab0" font-family="monospace"
- Col 2 (x=265): "eurekAIdea" font-size="15" fill="#9b7ff7" font-family="monospace" — below it "DESIGN BLUEPRINT" font-size="9" fill="#4a7ab0" font-family="monospace"
- Col 3 (x=495): "SHEET 1 OF 3" font-size="9" fill="#4a7ab0" font-family="monospace" — "MAIN VIEW + COMPONENTS" font-size="9" fill="#4a7ab0" font-family="monospace" — "SCALE 1:2" font-size="9" fill="#4a7ab0" font-family="monospace"
- Col 4 (x=695): "DWG: EVA-001" font-size="9" fill="#4a7ab0" font-family="monospace" — "REV: C" font-size="9" fill="#4a7ab0" font-family="monospace" — "2026" font-size="9" fill="#4a7ab0" font-family="monospace"`

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
