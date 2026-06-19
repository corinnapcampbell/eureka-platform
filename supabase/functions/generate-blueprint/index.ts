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

    const prompt = `You are an expert industrial designer and technical illustrator. Your job is to create a clear, intuitive technical blueprint SVG that a non-engineer can understand at a glance. This is NOT a generic shape diagram — it must show the SPECIFIC product, how it looks, how it works, and what makes it unique.

PRODUCT INFORMATION:
Name: ${answers.product_name || 'Unnamed'}
Summary: ${answers.product_summary}
Shape hint (use as starting point only, not literally): ${answers.primary_shape}
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
Weight distribution: ${answers.weight_feel}
Similar to: ${answers.existing_similar}
Key differentiator: ${answers.differentiator}

BEFORE DRAWING — reason through these (do not output this reasoning):
1. SHAPE: The "primary shape" field is a rough hint only. Combine ALL product information to determine the true silhouette. A vase holds water and flowers — it needs a wider opening at top, slightly curved or tapered body, and a distinctly heavier/wider base for stability. A pepper grinder tapers at top. A bottle has a neck. Never draw a plain uniform cylinder when the product description implies otherwise.
2. WEIGHT AND PHYSICS: Where is the weight concentrated? The base of a vase with a heavy mechanism must be wider and visually heavier than the body. Show this in the proportions.
3. MECHANISM: What components must physically exist for this mechanism to work? Even if not described, infer them. A rotating blade needs: a blade element, a central shaft, a sealed chamber, a coupling between outer shell and shaft. Draw ALL of these.
4. MOVEMENT: Which parts move? Each moving part needs a curved arrow or motion indicator showing direction and range of movement. A rotating base gets a curved double-headed arrow around it. A blade gets a rotational sweep arc.
5. COMPONENT CALLOUTS: Pick the 2-3 most important or novel components. Each gets a small isolated detail drawing in the right panel showing that component alone, enlarged, with its own label. For a cutting mechanism: show the blade in isolation, show how it sits on the shaft, show the cut angle.
6. ANNOTATIONS: What are the 8-10 most important features to label? Every visible part, material transition, mechanism element, and functional feature needs a label.

OUTPUT ONLY raw SVG. Start with <svg and end with </svg>. No explanation, no markdown, no backticks.

SVG SPECIFICATION:
- viewBox="0 0 900 620" width="900" height="620"
- Background: <rect width="900" height="620" fill="#0d1b3e"/>
- Subtle grid every 40px: stroke="#1a2d5a" stroke-width="0.5" opacity="0.6"

MAIN FRONT VIEW (x=60 to x=480, y=20 to y=490):
Draw the actual product silhouette — NOT a generic shape. Use curves, varying widths, distinct sections wherever the product description implies them.
- Outer walls: stroke="#7eb8f7" stroke-width="2"
- Show wall thickness as double lines where relevant
- Distinct sections (body vs base vs cap) separated by clear horizontal dividing lines
- Different materials shown with different line weights
- Internal hidden components as dashed lines INSIDE the outline: stroke="#3a7ab8" stroke-width="1.2" stroke-dasharray="5,3"
- Centerline axis: stroke="#2a5a8a" stroke-width="0.6" stroke-dasharray="10,4"
- Water or fill level if applicable: stroke="#4a8fd4" stroke-width="1" stroke-dasharray="6,2" opacity="0.8"

MOVEMENT INDICATORS (mandatory for any moving part):
- Rotating parts: draw a curved arrow arc around the rotating element showing direction. Use a path with an arrowhead. stroke="#a8d4f5" stroke-width="1.2" fill="none"
- For blade rotation: show a sweep arc at the blade level inside the base section
- For twist activation: show curved arrows around the base exterior indicating twist direction
- Label movement arrows with short text like "TWIST TO ACTIVATE" or "BLADE ROTATES 360°" font-family="monospace" font-size="9" fill="#a8d4f5"

RIGHT PANEL — two sub-panels stacked (x=510 to x=870):

TOP: CROSS SECTION A–A (x=510 to x=870, y=20 to y=290):
This is a vertical slice through the center. It MUST show internal layers, not just an outline.
- Draw the outer wall cross-section with diagonal hatching (45° lines, 5px spacing) to indicate solid material: stroke="#2a5a8a" stroke-width="0.5"
- Show the hollow interior cavity clearly
- Draw every internal component at its correct vertical position:
  * If there is a blade: horizontal solid line near the bottom with a small circle at center for the shaft mount
  * If there is a shaft: vertical line through the center from blade up
  * If there is a sealed chamber: boundary lines with hatching showing the seal material
  * If there is a perforated plate or stem guide: show as a line with small gaps
  * If it holds liquid: show the water level as a dashed horizontal line
- All internal components: stroke="#7eb8f7" stroke-width="1.5"
- Label: "SECTION A–A" font-family="monospace" font-size="10" fill="#a8d4f5"
- Show cutting plane line on main view: stroke="#a8d4f5" stroke-width="0.8" stroke-dasharray="12,3,2,3"

BOTTOM: COMPONENT DETAIL PANELS (x=510 to x=870, y=300 to y=490):
Pick the 2 most important/novel components. Draw each one isolated and enlarged.
- Dividing line between the two panels
- Each panel: component name as header font-family="monospace" font-size="10" fill="#c8dff8", enlarged drawing of just that component, 2-3 short annotation labels
- For a blade mechanism: Panel 1 = blade element showing shape and mounting hole, Panel 2 = shaft and coupling assembly showing how rotation transfers
- For each component show it from the most informative angle (top view for a circular blade, side view for a shaft)
- Lines: stroke="#7eb8f7" stroke-width="1.2"
- Label panel area: "COMPONENT DETAILS" font-family="monospace" font-size="9" fill="#5a9fd8"

ANNOTATIONS ON MAIN VIEW (8-10, mandatory, embedded in SVG):
Every distinct feature must be labeled. Alternate left and right sides.
- Leader line: stroke="#5a9fd8" stroke-width="0.8" stroke-dasharray="4,3"
- Dot at product: circle r="3" fill="#7eb8f7"
- Label: font-family="monospace" font-size="11" fill="#c8dff8"
- Each annotation <g> must have data-type="annotation"
- Label every visible part, material zone, mechanism area, opening, grip, and any inferred internal component shown as dashed line

DIMENSION LINES (4 minimum, on left side and bottom):
- Overall height, overall width at widest point, base section height, any key internal measurement
- Double-ended arrows, stroke="#4a8fd4" stroke-width="0.8"
- Text: font-family="monospace" font-size="10" fill="#7eb8f7"

TITLE BLOCK (y=500 to y=620, full width):
- Background rect fill="#060f24" stroke="#4a8fd4" stroke-width="0.8"
- 4 vertical columns with dividers
- Col 1 (x=15): product name font-size="16" fill="#c8dff8" font-family="monospace" font-weight="bold", description font-size="9" fill="#5a9fd8" font-family="monospace" (max 70 chars)
- Col 2 (x=240): "eurekAIdea" font-size="14" fill="#9b7ff7" font-family="monospace", "TECHNICAL BLUEPRINT" font-size="9" fill="#7eb8f7" font-family="monospace"
- Col 3 (x=470): "SHEET 1 OF 3" font-size="9" fill="#7eb8f7" font-family="monospace", "FRONT VIEW + SECTION + DETAILS" font-size="9" fill="#7eb8f7" font-family="monospace", "SCALE 1:2" font-size="9" fill="#7eb8f7" font-family="monospace"
- Col 4 (x=660): "DWG: EVA-001" font-size="9" fill="#7eb8f7" font-family="monospace", "REV: B" font-size="9" fill="#7eb8f7" font-family="monospace", "2026" font-size="9" fill="#7eb8f7" font-family="monospace"`

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
