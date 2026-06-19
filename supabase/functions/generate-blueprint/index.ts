import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function callClaude(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic error: ${err}`)
  }
  const data = await response.json()
  return data.content?.[0]?.text || ''
}

function extractSVGContent(svg: string): string {
  // Remove opening and closing svg tags, return inner content only
  return svg
    .replace(/```svg|```xml|```/gi, '')
    .trim()
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { answers } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const productInfo = `
Name: ${answers.product_name || 'Unnamed'}
Summary: ${answers.product_summary}
Shape hint (use as starting point only — infer true shape from all info): ${answers.primary_shape}
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
Weight distribution: ${answers.weight_feel}
Similar to: ${answers.existing_similar}
What makes it unique: ${answers.differentiator}
How to use: ${(answers.use_steps || []).filter(Boolean).join(' → ')}`.trim()

    const colorLogic = `
COLOR RULES:
- Check the color_intent field carefully.
- If specific colors are mentioned (e.g. "matte black", "clear plastic", "chrome ring"): apply muted desaturated fills. Clear/frosted plastic = fill="#1e2f48" opacity="0.6". Matte black sections = fill="#141c2e". Chrome accent = no fill, stroke="#8ab0c8" stroke-width="2". Rubber = fill="#0f1a28".
- All structural lines, mechanism lines, dashed internal lines, and annotation lines ALWAYS use blueprint blue #7eb8f7 regardless of color fills. Lines must always be visible over fills.
- If no colors specified: no fills at all — pure line drawing in blueprint blue on dark navy.`.trim()

    // CALL 1: Main product view — left panel
    const mainViewPrompt = `You are an expert industrial designer. Draw the MAIN PRODUCT VIEW for a technical blueprint sheet. Output ONLY an SVG fragment — the content that goes INSIDE an svg tag. Do NOT include the opening <svg> or closing </svg> tags. No explanation, no markdown, no backticks. Just the raw SVG elements.

PRODUCT:
${productInfo}

${colorLogic}

SHAPE REASONING (do silently):
Do NOT follow the primary shape field literally. Combine ALL product information to determine the true silhouette. A vase that holds water and flowers needs: a wider elliptical opening at top (wider than the body), a gently curved or slightly tapered body that narrows slightly toward the middle, and a distinctly wider and heavier base section for stability that is wider than the body. The base housing the mechanism should be noticeably different from the body — more solid, wider, with a visible separation line. Never draw a uniform cylinder for a vase.

DRAWING AREA: x=60 to x=460, y=30 to y=540 within a 960x660 canvas.

Draw the product in a confident 3/4 perspective — slightly tilted to show depth, with ellipses at top and bottom openings. This is a design sketch feel, not rigid CAD.

ELEMENTS TO DRAW:
1. Product silhouette with correct shape — outer walls stroke="#7eb8f7" stroke-width="2.2"
2. Apply color fills if specified (UNDER lines)
3. Ellipses at all openings to convey 3D depth
4. Section transition lines where body meets base, where base meets grip ring
5. Internal hidden components as dashed lines inside the outline: stroke="#2a5888" stroke-width="1.1" stroke-dasharray="5,3" — draw the blade as a horizontal dashed ellipse near the bottom of the base section, draw the shaft as a vertical dashed centerline through the base
6. Water level line: stroke="#3a7ab8" stroke-width="0.9" stroke-dasharray="7,3"
7. Motion arrows on rotating parts: curved arc path with arrowhead, stroke="#a8d4f5" stroke-width="1.5" fill="none" — curved arrow around the base exterior showing TWIST direction, rotational sweep arc inside the base at blade level
8. Motion text labels: "TWIST TO ACTIVATE" and "BLADE ROTATES 360°" font-family="monospace" font-size="9" fill="#a8d4f5"
9. Centerline: stroke="#162840" stroke-width="0.6" stroke-dasharray="12,5"
10. Very faint construction lines: stroke="#0d1e32" stroke-width="0.4"

ANNOTATIONS (8 minimum, alternating left and right sides):
Leader: stroke="#3a6898" stroke-width="0.8" stroke-dasharray="3,3"
Dot at product: circle r="2.5" fill="#5a90c8"
Label: font-family="monospace" font-size="11" fill="#c8dff8"
Each annotation group must have data-type="annotation"
Label: stem opening, body material, water level, accent ring at section transition, mechanism housing, blade (dashed leader to hidden line), central shaft, rubber grip ring

DIMENSIONS (left side only, 3 max):
Tick marks with measurement, stroke="#2a5070" stroke-width="0.7"
font-family="monospace" font-size="9" fill="#5a8ab0"
Show: overall height (~320mm), base height (~110mm), mouth diameter (~95mm)`

    // CALL 2: Component sketches — right panel
    const componentsPrompt = `You are an expert industrial designer. Draw THREE COMPONENT DETAIL SKETCHES for a technical blueprint sheet. Output ONLY an SVG fragment — content that goes INSIDE an svg tag. Do NOT include the opening <svg> or closing </svg> tags. No explanation, no markdown, no backticks. Just the raw SVG elements.

PRODUCT:
${productInfo}

${colorLogic}

DRAWING AREA: x=500 to x=940, y=30 to y=560 within a 960x660 canvas.

Draw a thin vertical divider line first: <line x1="490" y1="25" x2="490" y2="565" stroke="#1a3050" stroke-width="0.8"/>

Draw exactly 3 component sketches stacked vertically. Each one is isolated, enlarged, and shows that component from its most informative angle. These are design sketch style — confident lines, not rigid CAD.

COMPONENT 1 — TOP AREA (x=510 to x=930, y=40 to y=200):
For a cutting blade mechanism: draw the BLADE DISC from a TOP-DOWN view.
Show it as a circular disc — outer circle stroke="#7eb8f7" stroke-width="1.8", inner mounting hub circle, 4 cutting blade arms extending from center to edge (like a fan/propeller shape) with sharpened leading edges indicated by thicker stroke on one side, center shaft hole as small circle.
Add rotational sweep arc with double-headed curved arrow showing 360° rotation.
Header at top: font-family="monospace" font-size="11" fill="#c8dff8" font-weight="bold" — "CUTTING BLADE — TOP VIEW"
Labels: "CUTTING EDGE", "SHAFT MOUNT", "BLADE ARM ×4" font-family="monospace" font-size="9" fill="#7aaad8"
Connection dot to left panel: circle r="3" fill="none" stroke="#3a6898" stroke-width="0.8" at x=510

COMPONENT 2 — MIDDLE AREA (x=510 to x=930, y=220 to y=390):
For a rotating shaft mechanism: draw the SHAFT AND COUPLING from a SIDE/CUTAWAY view.
Show: outer rotating base shell (rectangle outline), inner fixed shaft (vertical line through center), coupling between them (small gear or spline detail), blade attachment point at bottom of shaft, motion transfer arrow showing how outer twist becomes inner rotation.
Header: "DRIVE SHAFT — SIDE SECTION"
Labels: "ROTATING OUTER SHELL", "FIXED INNER SHAFT", "TORQUE COUPLING", "BLADE ATTACHMENT" font-family="monospace" font-size="9" fill="#7aaad8"
Horizontal divider above: <line x1="505" y1="215" x2="935" y2="215" stroke="#1a3050" stroke-width="0.5"/>
Connection dot: circle r="3" fill="none" stroke="#3a6898" stroke-width="0.8" at x=510

COMPONENT 3 — BOTTOM AREA (x=510 to x=930, y=410 to y=555):
For base mechanism: draw the BASE ASSEMBLY from a BELOW/UNDERSIDE view.
Show the circular base from underneath — outer grip ring as outer circle with ribbing texture (short radial lines around edge), sealed chamber boundary as inner circle, center shaft exit point as small circle at center, curved arrows showing twist direction around the grip ring.
Header: "BASE ASSEMBLY — UNDERSIDE VIEW"
Labels: "RIBBED GRIP RING", "SEALED MECHANISM CHAMBER", "SHAFT EXIT POINT" font-family="monospace" font-size="9" fill="#7aaad8"
Horizontal divider above: <line x1="505" y1="405" x2="935" y2="405" stroke="#1a3050" stroke-width="0.5"/>
Connection dot: circle r="3" fill="none" stroke="#3a6898" stroke-width="0.8" at x=510`

    // CALL 3: Title block
    const titleBlockPrompt = `You are a technical illustrator. Draw a TITLE BLOCK for a blueprint. Output ONLY SVG elements — content inside an svg tag, no opening/closing svg tags, no markdown, no backticks.

PRODUCT NAME: ${answers.product_name || 'Unnamed'}
SUMMARY: ${answers.product_summary?.slice(0, 65) || ''}

DRAWING AREA: x=0 to x=960, y=570 to y=660.

Draw:
1. Background rect: <rect x="0" y="570" width="960" height="90" fill="#060d1c"/>
2. Top border line: <line x1="0" y1="570" x2="960" y2="570" stroke="#1e3a5a" stroke-width="0.8"/>
3. Vertical dividers: <line x1="260" y1="570" x2="260" y2="660" stroke="#1e3a5a" stroke-width="0.5"/> and at x=490 and x=690
4. Col 1 x=15: product name font-size="17" fill="#c8dff8" font-family="monospace" font-weight="bold" at y=600, summary font-size="8" fill="#3a5a80" font-family="monospace" at y=622, "PHYSICAL PRODUCT BLUEPRINT" font-size="8" fill="#3a5a80" font-family="monospace" at y=638
5. Col 2 x=275: "eurekAIdea" font-size="14" fill="#9b7ff7" font-family="monospace" at y=600, "DESIGN BLUEPRINT" font-size="8" fill="#3a5a80" font-family="monospace" at y=622, "MAIN VIEW + COMPONENT DETAILS" font-size="8" fill="#3a5a80" font-family="monospace" at y=638
6. Col 3 x=505: "SHEET 1 OF 3" font-size="8" fill="#3a5a80" font-family="monospace" at y=600, "SCALE 1:2" font-size="8" fill="#3a5a80" font-family="monospace" at y=618, "REV: C" font-size="8" fill="#3a5a80" font-family="monospace" at y=636
7. Col 4 x=700: "DWG: EVA-001" font-size="8" fill="#3a5a80" font-family="monospace" at y=600, "© eurekAIdea 2026" font-size="8" fill="#3a5a80" font-family="monospace" at y=618`

    // Execute all three calls in parallel
    const [mainViewRaw, componentsRaw, titleBlockRaw] = await Promise.all([
      callClaude(apiKey, mainViewPrompt, 4000),
      callClaude(apiKey, componentsPrompt, 4000),
      callClaude(apiKey, titleBlockPrompt, 1000),
    ])

    const mainView = extractSVGContent(mainViewRaw)
    const components = extractSVGContent(componentsRaw)
    const titleBlock = extractSVGContent(titleBlockRaw)

    // Combine into single SVG
    const svg = `<svg viewBox="0 0 960 660" width="960" height="660" xmlns="http://www.w3.org/2000/svg">
  <rect width="960" height="660" fill="#0a1628"/>
  <!-- Grid -->
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f1e35" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="960" height="660" fill="url(#grid)"/>
  <!-- Main product view -->
  <g id="main-view">${mainView}</g>
  <!-- Component sketches -->
  <g id="components">${components}</g>
  <!-- Title block -->
  <g id="title-block">${titleBlock}</g>
</svg>`

    return new Response(JSON.stringify({ svg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
