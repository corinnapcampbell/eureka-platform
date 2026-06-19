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

    const prompt = `You are an expert industrial designer creating a product design blueprint sheet in the style of professional industrial design sketches — like Apple patent drawings mixed with Procreate design sketches. Think of the watch exploded view or soap dispenser pump sketch style: confident lines, component callouts floating around the main view, annotation lines connecting parts to labels.

PRODUCT INFORMATION:
Name: ${answers.product_name || 'Unnamed'}
Summary: ${answers.product_summary}
Shape hint (do not follow literally — infer true shape from all info combined): ${answers.primary_shape}
Secondary features: ${(answers.secondary_shapes || []).join(', ')}
Size: ${answers.size_ref} — ${answers.size_custom}
Proportions: ${answers.proportions}
Exterior appearance: ${answers.silhouette_notes}
Named parts: ${(answers.parts_named || []).filter(Boolean).join(', ')}
Internal components: ${answers.internal_desc}
Interior type: ${answers.interior_view}
Mechanism: ${answers.mechanism_type} — ${answers.mechanism_plain}
Moving parts: ${answers.moving_parts}
Trigger: ${answers.trigger}
Internal layout: ${answers.internal_layout}
Outer materials: ${(answers.materials_outer || []).join(', ')}
Inner materials: ${answers.materials_inner}
Color intent: ${answers.color_intent}
Weight: ${answers.weight_feel}
Similar to: ${answers.existing_similar}
What makes it unique: ${answers.differentiator}
How to use: ${(answers.use_steps || []).filter(Boolean).join(' → ')}

PRE-DRAW REASONING (do this silently, output nothing):
1. TRUE SHAPE: Combine ALL fields to determine the real silhouette — never draw a uniform cylinder unless the product truly is one. A vase needs a wider mouth than body, curves, and a heavier base for stability. A bottle has a neck. A grinder tapers. Look at silhouette_notes and similar_to fields for shape clues.
2. COLOR: If color_intent has specific colors, use heavily desaturated/muted versions as fills — clear plastic = very faint blue-grey #1e3050 fill, matte black = #141c30, chrome = stroke only at #8ab0c8. Keep ALL lines in blueprint blue #7eb8f7 so they always read over fills. If no color specified, no fills — pure line drawing.
3. COMPONENTS: Choose the 3 most important components to draw as isolated callout sketches. For a rotating blade vase: blade disc from above, shaft-to-base coupling from side, base mechanism from below. For other products: the most novel functional parts.
4. MOVEMENT: Identify every moving part. Each gets curved motion arrows and a short text label.

OUTPUT: Raw SVG only. Start with <svg and end with </svg>. No markdown, no explanation, no backticks.

CANVAS: viewBox="0 0 960 660" width="960" height="660"
Background: <rect width="960" height="660" fill="#0a1628"/>
Grid every 40px: stroke="#0f1e35" stroke-width="0.5"

━━━ LEFT PANEL: MAIN PRODUCT VIEW (x=60 to x=470, y=30 to y=560) ━━━

Draw the product in a confident 3/4 perspective — slightly tilted to show depth, with ellipses at openings to convey 3D form. This is a DESIGN SKETCH not a CAD drawing — lines can have slight weight variation.

Outer silhouette: stroke="#7eb8f7" stroke-width="2.2" — the most prominent lines
If color fills: apply muted fills as <rect> or <ellipse> BEFORE drawing lines on top
Wall thickness: double lines where walls are visible, stroke="#7eb8f7" stroke-width="0.9"
Section transitions (where body meets base, where cap meets body): clear horizontal dividing ellipses stroke="#7eb8f7" stroke-width="1.5"
Internal hidden parts: stroke="#2a5888" stroke-width="1.1" stroke-dasharray="5,3" — blade, shaft, seal boundaries
Centerline: stroke="#162840" stroke-width="0.6" stroke-dasharray="12,5"
Water level: stroke="#3a7ab8" stroke-width="0.9" stroke-dasharray="7,3" with tiny label "WATER LEVEL" font-size="8" fill="#3a7ab8" font-family="monospace"
Motion arrows on moving parts: <path> with arrowhead marker, stroke="#a8d4f5" stroke-width="1.4" fill="none" — curved arc around rotating base, rotational sweep at blade level. Label: font-family="monospace" font-size="9" fill="#a8d4f5"
Construction guide lines (very faint): stroke="#0d1e32" stroke-width="0.4"

ANNOTATIONS on main view (8 labels minimum, alternating left/right):
Leader: stroke="#3a6898" stroke-width="0.8" stroke-dasharray="3,3"
Dot: circle r="2.5" fill="#5a90c8"
Text: font-family="monospace" font-size="11" fill="#c8dff8"
Each <g> needs data-type="annotation"
Label every visible feature — opening, body zone, material change, accent ring, mechanism housing, grip ring, blade (dashed leader to hidden line), shaft

Dimensions (left side only, 3 max — keep minimal):
Tick marks with measurement text, stroke="#2a5070" stroke-width="0.7"
font-family="monospace" font-size="9" fill="#5a8ab0"

━━━ RIGHT PANEL: COMPONENT SKETCHES (x=500 to x=940, y=30 to y=560) ━━━

Draw 3 isolated component sketches stacked vertically in this panel.
Thin vertical divider between panels: stroke="#1a3050" stroke-width="0.8" x1="490" y1="30" x2="490" y2="560"

COMPONENT 1 — top of right panel (x=510 to x=930, y=40 to y=210):
The most novel/functional component drawn enlarged and isolated.
For a blade mechanism: draw the blade disc from a TOP-DOWN view. Show it as a circle with cutting edges indicated (serrations or sharpened edge profile), center mounting hole, shaft attachment point. Show the rotational sweep arc around it with arrows. This is what physically cuts the stems.
For other products: the primary mechanism component from its most informative angle.
Header: component name in font-family="monospace" font-size="11" fill="#c8dff8" font-weight="bold"
Lines: stroke="#7eb8f7" stroke-width="1.5"
2-3 sub-labels: font-family="monospace" font-size="9" fill="#7aaad8"
Connection line to main view: stroke="#1e3a5a" stroke-width="0.8" stroke-dasharray="4,4" — from this component area to the relevant point on the main product

COMPONENT 2 — middle of right panel (x=510 to x=930, y=230 to y=390):
Second most important component.
For a blade vase: draw the shaft and coupling assembly from a SIDE VIEW. Show the outer rotating shell at bottom, the shaft rising through the center, how the twist motion of the outer shell transfers rotation to the shaft and blade. Include motion transfer arrow.
For other products: the assembly or housing cross-section.
Header: component name, same style as above
Lines: stroke="#7eb8f7" stroke-width="1.5"
2-3 sub-labels: font-family="monospace" font-size="9" fill="#7aaad8"
Connection line to main view: same dashed style

COMPONENT 3 — bottom of right panel (x=510 to x=930, y=410 to y=550):
Third component — show mechanism in use or from another angle.
For a blade vase: draw the base assembly from BELOW — the underside view showing the grip ring, the sealed chamber outline, the blade position indicator, the center shaft point. Show the twist direction with curved arrows.
For other products: the mechanism in action or an exploded detail.
Header: component name, same style
Lines: stroke="#7eb8f7" stroke-width="1.5"
2-3 sub-labels: font-family="monospace" font-size="9" fill="#7aaad8"
Connection line to main view: same dashed style

Horizontal dividers between components (faint): stroke="#1a3050" stroke-width="0.5" at y=225 and y=405

━━━ TITLE BLOCK (y=570 to y=660, x=0 to x=960) ━━━
Background: <rect y="570" width="960" height="90" fill="#060d1c"/>
Top border: <line y1="570" x1="0" x2="960" y2="570" stroke="#1e3a5a" stroke-width="0.8"/>
Vertical dividers: at x=260, x=490, x=690
Col 1 (x=15, y=595): product name font-size="17" fill="#c8dff8" font-family="monospace" font-weight="bold" — y=625: description 65 chars max font-size="8" fill="#3a5a80" font-family="monospace"
Col 2 (x=275, y=595): "eurekAIdea" font-size="14" fill="#9b7ff7" font-family="monospace" — y=618: "DESIGN BLUEPRINT" font-size="8" fill="#3a5a80" font-family="monospace" — y=638: "MAIN VIEW + COMPONENTS" font-size="8" fill="#3a5a80" font-family="monospace"
Col 3 (x=505, y=595): "SHEET 1 OF 3" font-size="8" fill="#3a5a80" font-family="monospace" — y=615: "SCALE 1:2" font-size="8" fill="#3a5a80" font-family="monospace" — y=635: "REV: C" font-size="8" fill="#3a5a80" font-family="monospace"
Col 4 (x=705, y=595): "DWG: EVA-001" font-size="8" fill="#3a5a80" font-family="monospace" — y=615: "© eurekAIdea 2026" font-size="8" fill="#3a5a80" font-family="monospace"`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
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
