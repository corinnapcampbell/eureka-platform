import jsPDF from 'jspdf'

// ── Shared helpers (also used by UI components) ──────────────────────────────

export function dedupeArray(arr) {
  if (!Array.isArray(arr)) return []
  const seen = new Set()
  return arr.filter(item => {
    const key = String(item).toLowerCase().trim()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function hasMultipleSteps(text) {
  if (!text?.trim()) return false
  const t = text.trim()
  const lines = t.split('\n').filter(s => s.trim())
  if (lines.length > 1) return true
  if (/^\d+[\.\)]/m.test(t)) return true
  if (/^[-•*]/m.test(t)) return true
  const sentences = t.split(/\.\s+/).filter(s => s.trim().length > 10)
  return sentences.length >= 3
}

// ── PDF export ───────────────────────────────────────────────────────────────
// Template: 4-page A4 portrait
//   Page 1 — Dark navy cover
//   Page 2 — Problem + Solution (side-by-side) + How It Works
//   Page 3 — Market Size + Metrics + Target Audience + Business Model
//   Page 4 — Competitive Advantage (We Have / They Don't) + Risks + Next Steps + Closing

export function generateIdeaPDF(idea, { userEmail = '', returnBlob = false } = {}) {
  const doc  = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const W    = 210, H = 297
  const ml   = 16, mr = 16            // left/right margin
  const cW   = W - ml - mr            // 178mm content width
  const colW = (cW - 5) / 2           // ~86.5mm per side-by-side column

  // ── Palette ────────────────────────────────────────────────────────────────
  const NAVY   = [14, 14, 31]
  const ACC1   = [123, 159, 247]       // blue
  const ACC2   = [155, 127, 247]       // purple
  const GREEN  = [72, 180, 120]
  const RED    = [200, 80, 80]
  const PINK   = [224, 123, 159]
  const DARK   = [32, 32, 30]
  const GRAY   = [130, 128, 120]
  const LGRAY  = [158, 155, 152]
  const WHITE  = [255, 255, 255]
  const MUTED  = [158, 158, 185]       // white text at ~45% on dark bg
  const CARD   = [246, 246, 244]       // default card bg
  const CARD_B = [242, 244, 252]       // blue-tinted card bg

  // ── Preprocessed fields ────────────────────────────────────────────────────
  const categories = dedupeArray(idea?.category || [])
  const lookingFor = dedupeArray(
    (idea?.terms || '').split(/,\s*/).map(s => s.trim()).filter(Boolean)
  )
  const audTags = dedupeArray(
    (idea?.target_audience || '').split(/[,;]/).map(s => s.trim()).filter(Boolean)
  )
  const dateStr = idea?.created_at
    ? new Date(idea.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // ── Core draw helpers ──────────────────────────────────────────────────────
  const lh   = (fs, fac = 1.65) => fs * 0.352778 * fac
  const fill   = c => doc.setFillColor(...c)
  const stroke = c => doc.setDrawColor(...c)
  const ink    = c => doc.setTextColor(...c)
  const font   = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size) }
  const rlw    = () => doc.setLineWidth(0.25)

  function gradientBar(y, h = 4) {
    const steps = 44
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      doc.setFillColor(
        Math.round(ACC1[0] + t * (ACC2[0] - ACC1[0])),
        Math.round(ACC1[1] + t * (ACC2[1] - ACC1[1])),
        Math.round(ACC1[2] + t * (ACC2[2] - ACC1[2]))
      )
      doc.rect((W / steps) * i, y, W / steps + 0.5, h, 'F')
    }
    rlw()
  }

  function gradientRule(x1, x2, y, lw = 0.5) {
    const steps = 24, span = x2 - x1
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      doc.setDrawColor(
        Math.round(ACC1[0] + t * (ACC2[0] - ACC1[0])),
        Math.round(ACC1[1] + t * (ACC2[1] - ACC1[1])),
        Math.round(ACC1[2] + t * (ACC2[2] - ACC1[2]))
      )
      doc.setLineWidth(lw)
      const sx = x1 + (span / steps) * i
      doc.line(sx, y, sx + span / steps + 0.5, y)
    }
    rlw()
  }

  function logoDark(x, y, size = 10) {
    font('bold', size)
    ink(DARK); doc.text('Eurek', x, y)
    const ew = doc.getTextWidth('Eurek')
    ink(ACC1); doc.text('AI', x + ew, y)
    const aw = doc.getTextWidth('AI')
    ink(DARK); doc.text('dea', x + ew + aw, y)
  }

  function logoWhite(x, y, size = 14) {
    font('bold', size)
    ink(WHITE); doc.text('Eurek', x, y)
    const ew = doc.getTextWidth('Eurek')
    ink(ACC1); doc.text('AI', x + ew, y)
    const aw = doc.getTextWidth('AI')
    ink(WHITE); doc.text('dea', x + ew + aw, y)
  }

  // Page header: logo left, page number centred, thin rule below
  function pageHeader(num) {
    logoDark(ml, 14)
    font('normal', 8.5); ink(LGRAY)
    doc.text(`${num} / 4`, W / 2, 14, { align: 'center' })
    stroke([218, 216, 212]); rlw()
    doc.line(ml, 17.5, W - mr, 17.5)
  }

  // Footer: left tagline + right "Confidential"
  function pageFooter(y = H - 7) {
    font('normal', 7.5); ink(LGRAY)
    doc.text('Protected & Presented by eurekAIdea · myeurekaidea.com', ml, y)
    doc.text('Confidential', W - mr, y, { align: 'right' })
  }

  // ── Card system ────────────────────────────────────────────────────────────
  // Cards: light bg, 2mm rounded corners, 2.5mm coloured left border,
  //        8pt bold uppercase label, 11pt body text.

  const CARD_PAD_V  = 8    // top/bottom padding inside card
  const CARD_PAD_H  = 8    // left padding (after left border)
  const CARD_LABEL  = 9    // height reserved for label row
  const BODY_FS     = 11   // body font size (pt)  ≈ 14.7px
  const BODY_LH     = () => lh(BODY_FS)

  // Calculate card height for a given body line array
  function cardH(lines) {
    return CARD_PAD_V + CARD_LABEL + lines.length * BODY_LH() + CARD_PAD_V
  }

  // Draw a card (card bg + left border + label + body lines)
  function drawCard(x, y, w, h, label, color, lines, bg = CARD) {
    fill(bg);   doc.roundedRect(x, y, w, h, 2, 2, 'F')
    fill(color); doc.roundedRect(x, y, 2.5, h, 1, 1, 'F')
    font('bold', 8); ink(color)
    doc.text(label.toUpperCase(), x + CARD_PAD_H, y + CARD_PAD_V + 1)
    font('normal', BODY_FS); ink(DARK)
    const bodyY = y + CARD_PAD_V + CARD_LABEL
    lines.forEach((ln, i) => doc.text(ln, x + CARD_PAD_H, bodyY + i * BODY_LH()))
  }

  // Draw a matched-height card pair side by side; returns the common height
  function cardPair(y, lLabel, lColor, lLines, lBg, rLabel, rColor, rLines, rBg) {
    const lH   = cardH(lLines)
    const rH   = cardH(rLines)
    const maxH = Math.max(lH, rH)
    drawCard(ml,           y, colW, maxH, lLabel, lColor, lLines, lBg)
    drawCard(ml + colW + 5, y, colW, maxH, rLabel, rColor, rLines, rBg)
    return maxH
  }

  // Numbered-step circle (gradient fill, white number)
  function stepCircle(cx, cy, r, num, idx) {
    fill(idx % 2 === 0 ? ACC1 : ACC2)
    doc.ellipse(cx, cy, r, r, 'F')
    font('bold', r > 3.5 ? 8 : 7); ink(WHITE)
    doc.text(String(num), cx, cy + r * 0.32, { align: 'center' })
  }

  // Bullet dot (coloured small circle)
  function dot(cx, cy, color) {
    fill(color)
    doc.ellipse(cx, cy, 1.6, 1.6, 'F')
  }

  // Split text to fit a width, strip leading markers, cap at maxLines
  function wrap(text, w, maxLines = 999) {
    return doc.splitTextToSize(
      text.replace(/^\d+[\.\)]\s*|^[-•*]\s*/, '').trim(), w
    ).slice(0, maxLines)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════════════════════════════════════
  fill(NAVY); doc.rect(0, 0, W, H, 'F')
  gradientBar(0, 4)
  gradientBar(H - 4, 4)

  // Logo (white) + CONFIDENTIAL badge
  logoWhite(ml, 16)
  font('normal', 7)
  const cbT  = 'CONFIDENTIAL'
  const cbTW = doc.getTextWidth(cbT)
  const cbW  = cbTW + 7, cbH = 5.5
  const cbX  = W - mr - cbW, cbY = 11.5
  doc.setFillColor(20, 24, 50); stroke(ACC1); doc.setLineWidth(0.3)
  doc.roundedRect(cbX, cbY, cbW, cbH, 1.5, 1.5, 'FD')
  ink(ACC1); doc.text(cbT, cbX + 3.5, cbY + 3.9)
  rlw()

  // Category chips
  font('normal', 7.5)
  let chipX = ml
  categories.forEach(cat => {
    const tw = doc.getTextWidth(cat), cw = tw + 8
    if (chipX + cw > W - mr) return
    doc.setFillColor(20, 24, 50); stroke(ACC1); doc.setLineWidth(0.2)
    doc.roundedRect(chipX, 25, cw, 6, 1.5, 1.5, 'FD')
    ink(ACC1); doc.text(cat, chipX + 4, 29.2)
    chipX += cw + 3
  })
  rlw()

  // Large title, centred
  font('bold', 22); ink(WHITE)
  const titleT  = (idea?.title || 'Untitled Idea').trim()
  const titleLs = doc.splitTextToSize(titleT, cW - 8)
  const titleY  = 100, titleLH = lh(22, 1.25)
  titleLs.slice(0, 3).forEach((ln, i) =>
    doc.text(ln, W / 2, titleY + i * titleLH, { align: 'center' })
  )

  // Tagline
  const tagline = (idea?.tagline || '').trim()
  let afterTitle = titleY + Math.min(titleLs.length, 3) * titleLH
  if (tagline) {
    afterTitle += 8
    font('normal', 13); ink(MUTED)
    const tLs = doc.splitTextToSize(tagline, cW - 28)
    tLs.slice(0, 2).forEach((ln, i) =>
      doc.text(ln, W / 2, afterTitle + i * lh(13, 1.4), { align: 'center' })
    )
    afterTitle += tLs.slice(0, 2).length * lh(13, 1.4)
  }

  // Gradient rule
  const ruleY = Math.max(afterTitle + 13, 155)
  gradientRule(ml + 22, W - mr - 22, ruleY)

  // 2×2 metadata grid
  const metaY = ruleY + 13
  const metaW = (cW - 8) / 2
  ;[
    { label: 'Submitted by', value: userEmail || '—' },
    { label: 'Date',         value: dateStr },
    { label: 'Market Size',  value: idea?.market_size || '—' },
    { label: 'Looking For',  value: lookingFor.join(', ') || '—' },
  ].forEach((m, i) => {
    const col = i % 2, row = Math.floor(i / 2)
    const mx = ml + col * (metaW + 8), my = metaY + row * 23
    font('normal', 7.5); ink([68, 68, 108])
    doc.text(m.label.toUpperCase(), mx, my)
    font('bold', 10.5); ink(WHITE)
    doc.splitTextToSize(String(m.value).slice(0, 80), metaW - 4)
      .slice(0, 2)
      .forEach((ln, li) => doc.text(ln, mx, my + 6.5 + li * lh(10.5, 1.3)))
  })

  // Blockchain hash footer (very small, very dark)
  if (idea?.blockchain_hash) {
    font('normal', 6); ink([26, 26, 52])
    doc.splitTextToSize(`Hash: ${idea.blockchain_hash}`, cW)
      .slice(0, 2)
      .forEach((ln, i) => doc.text(ln, ml, 257 + i * 4.5))
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Problem · Solution · How It Works
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  gradientBar(0, 4)
  pageHeader(2)

  let y2 = 21

  // Problem / Solution — side-by-side cards
  const probT = (idea?.problem || 'The specific pain point or gap this idea addresses.').trim()
  const solT  = (idea?.solution || 'The innovative approach that resolves the problem.').trim()
  const probL = wrap(probT, colW - CARD_PAD_H - 3, 9)
  const solL  = wrap(solT,  colW - CARD_PAD_H - 3, 9)
  const psH   = cardPair(y2,
    'Problem',  ACC2, probL, CARD,
    'Solution', ACC1, solL,  CARD_B
  )
  y2 += psH + 6

  // How It Works — custom card (numbered circles)
  const hiwT       = (idea?.how_it_works || '').trim()
  const defaultHIW = [
    'Submit your idea to the EurekAIdea vault',
    'Blockchain timestamp is created instantly and permanently',
    'Build your investor pitch using the AI Pitch Builder',
    'Share via NDA-gated link — all access is logged automatically',
  ]
  const isMulti  = hiwT && hasMultipleSteps(hiwT)
  const hiwSteps = isMulti
    ? hiwT.split('\n').filter(s => s.trim()).slice(0, 5)
    : hiwT ? null : defaultHIW

  // Compute card height
  const CR = 3.8                       // circle radius
  const CD = CR * 2                    // circle diameter
  const stepRowH = CD + 4.5           // height per step row

  let hiwCardH
  if (hiwSteps) {
    hiwCardH = CARD_PAD_V + CARD_LABEL + hiwSteps.length * stepRowH + CARD_PAD_V
  } else {
    const pLines = wrap(hiwT, cW - CARD_PAD_H - 3, 8)
    hiwCardH = cardH(pLines)
  }

  // Draw card shell
  fill(CARD); doc.roundedRect(ml, y2, cW, hiwCardH, 2, 2, 'F')
  fill(ACC1); doc.roundedRect(ml, y2, 2.5, hiwCardH, 1, 1, 'F')
  font('bold', 8); ink(ACC1)
  doc.text('HOW IT WORKS', ml + CARD_PAD_H, y2 + CARD_PAD_V + 1)

  let stepY = y2 + CARD_PAD_V + CARD_LABEL + CR
  if (hiwSteps) {
    hiwSteps.forEach((step, i) => {
      const clean = wrap(step, cW - CARD_PAD_H - CD - 6, 2)
      stepCircle(ml + CARD_PAD_H + CR, stepY, CR, i + 1, i)
      font('normal', BODY_FS); ink(DARK)
      const textX = ml + CARD_PAD_H + CD + 5
      const textY = stepY - (clean.length > 1 ? lh(BODY_FS) * 0.4 : 0)
      clean.forEach((ln, li) => doc.text(ln, textX, textY + li * BODY_LH()))
      stepY += stepRowH
    })
  } else if (hiwT) {
    font('normal', BODY_FS); ink(DARK)
    wrap(hiwT, cW - CARD_PAD_H - 3, 8).forEach(ln => {
      doc.text(ln, ml + CARD_PAD_H, stepY - CR)
      stepY += BODY_LH()
    })
  }

  y2 += hiwCardH + 6  // unused but keeps tracking consistent

  pageFooter()

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — Market Size · Target Audience · Business Model
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  gradientBar(0, 4)
  pageHeader(3)

  let y3 = 21

  // Market Size card (full width, optional)
  const msT = (idea?.market_size || '').trim()
  if (msT) {
    const msL = wrap(msT, cW - CARD_PAD_H - 3, 3)
    const msH = cardH(msL)
    drawCard(ml, y3, cW, msH, 'Market Size', ACC2, msL, CARD_B)
    y3 += msH + 5
  }

  // 3 metric boxes
  const mbW = (cW - 8) / 3
  ;[
    { val: '$180B+', lbl: 'Global IP Market' },
    { val: '$100B+', lbl: 'Creator Economy'  },
    { val: '$1B+',   lbl: 'Estimated TAM'    },
  ].forEach((m, i) => {
    const bx = ml + i * (mbW + 4)
    doc.setFillColor(243, 246, 252); stroke([218, 225, 244]); doc.setLineWidth(0.2)
    doc.roundedRect(bx, y3, mbW, 22, 2, 2, 'FD')
    font('bold', 15); ink(ACC1)
    doc.text(m.val, bx + mbW / 2, y3 + 12.5, { align: 'center' })
    font('normal', 7.5); ink(GRAY)
    doc.text(m.lbl, bx + mbW / 2, y3 + 19, { align: 'center' })
  })
  y3 += 26; rlw()

  // Target audience tags
  if (audTags.length > 0) {
    font('normal', 7.5)
    let tx = ml
    audTags.slice(0, 7).forEach(tag => {
      const tw = doc.getTextWidth(tag) + 10
      if (tx + tw > W - mr) { tx = ml; y3 += 9 }
      doc.setFillColor(234, 240, 248); stroke([198, 215, 238]); doc.setLineWidth(0.2)
      doc.roundedRect(tx, y3, tw, 6.5, 1.5, 1.5, 'FD')
      ink([55, 80, 118]); doc.text(tag, tx + 5, y3 + 4.6)
      tx += tw + 3
    })
    y3 += 11; rlw()
  }

  // Business Model — Free / Paid side-by-side
  const bmT = (idea?.business_model || '').trim()
  let bm1T, bm2T
  if (bmT) {
    const bmLs = bmT.split('\n').filter(s => s.trim())
    if (bmLs.length >= 2) {
      const mid = Math.ceil(bmLs.length / 2)
      bm1T = bmLs.slice(0, mid).join(' ')
      bm2T = bmLs.slice(mid).join(' ')
    } else {
      const words = bmT.split(' '), half = Math.ceil(words.length / 2)
      bm1T = words.slice(0, half).join(' ')
      bm2T = words.slice(half).join(' ') || bmT
    }
  } else {
    bm1T = 'Free tier: protect up to 3 ideas with blockchain timestamping and NDA-gated sharing.'
    bm2T = 'Pro at $19/mo: unlimited ideas, AI pitch builder, deck export, and priority support.'
  }

  const bm1L = wrap(bm1T, colW - CARD_PAD_H - 3, 6)
  const bm2L = wrap(bm2T, colW - CARD_PAD_H - 3, 6)
  const bmH  = cardPair(y3,
    'Free Tier',  ACC1, bm1L, [248, 249, 255],
    'Paid Tier',  ACC2, bm2L, [246, 244, 255]
  )
  y3 += bmH + 6

  pageFooter()

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — Competitive Advantage · Risks · Next Steps · Dark closing
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  gradientBar(0, 4)
  pageHeader(4)

  const closingH = 54
  const closingY = H - closingH        // dark section starts here
  const maxY4    = closingY - 12       // content must stay above this

  let y4 = 21

  // Competitive Advantage — "We Have" / "They Don't" side-by-side
  const advT = (idea?.competitive_advantage || '').trim()
  const advBullets = advT
    ? advT.split('\n').filter(s => s.trim()).slice(0, 6).map(s =>
        wrap(s, colW - CARD_PAD_H - 3, 2)
      ).flat()
    : [
        'Blockchain IP timestamping built in',
        'AI-powered investor pitch generation',
        'NDA-gated sharing with full access log',
        'Professional pitch deck export',
        'End-to-end founder workflow in one place',
      ]
  const theyDont = [
    'No blockchain proof-of-existence',
    'No AI pitch builder or generator',
    'No NDA-gated link access control',
    'No integrated pitch deck creation',
    'No unified founder-to-investor workflow',
  ]
  const weL  = advBullets.slice(0, 6)
  const tdL  = theyDont.map(s => wrap(s, colW - CARD_PAD_H - 3, 1)).flat().slice(0, 5)
  const advH = cardPair(y4,
    'We Have',    GREEN, weL, [245, 252, 248],
    "They Don't", RED,   tdL, [253, 246, 246]
  )
  y4 += advH + 6

  // Risks & Challenges — full-width card with bullet dots
  const riskT = (idea?.risks || '').trim()
  const riskItems = riskT
    ? riskT.split('\n').filter(s => s.trim()).slice(0, 5)
    : [
        'Market adoption may be slower than expected among early-stage founders',
        'IP law varies significantly across jurisdictions — consult local counsel',
        'Competition from existing idea management and pitch creation tools',
        'User trust around data privacy, permanence, and platform longevity',
      ]

  const dotR   = 1.6
  const dotGap = dotR * 2 + 3         // space from card left to text
  const dotCol  = ml + CARD_PAD_H + dotR
  const riskRowH = BODY_LH() + 2.5

  // Pre-compute wrapped risk lines
  const riskWrapped = riskItems.map(r => wrap(r, cW - CARD_PAD_H - dotGap - 2, 2))
  const riskBodyH   = riskWrapped.reduce((sum, ls) => sum + Math.max(ls.length, 1) * BODY_LH() + 2.5, 0)
  const riskCardH   = CARD_PAD_V + CARD_LABEL + riskBodyH + CARD_PAD_V

  if (y4 + riskCardH < maxY4) {
    fill(CARD); doc.roundedRect(ml, y4, cW, riskCardH, 2, 2, 'F')
    fill(PINK); doc.roundedRect(ml, y4, 2.5, riskCardH, 1, 1, 'F')
    font('bold', 8); ink(PINK)
    doc.text('RISKS & CHALLENGES', ml + CARD_PAD_H, y4 + CARD_PAD_V + 1)
    let ry = y4 + CARD_PAD_V + CARD_LABEL + dotR
    riskWrapped.forEach((lines, i) => {
      dot(dotCol, ry - 0.5, i % 2 === 0 ? PINK : ACC2)
      font('normal', BODY_FS); ink(DARK)
      lines.forEach((ln, li) =>
        doc.text(ln, ml + CARD_PAD_H + dotGap, ry - 1 + li * BODY_LH())
      )
      ry += Math.max(lines.length, 1) * BODY_LH() + 2.5
    })
    y4 += riskCardH + 6
  }

  // Next Steps — full-width card with numbered timeline circles
  const nsT = (idea?.next_steps || '').trim()
  const nsItems = nsT
    ? nsT.split('\n').filter(s => s.trim()).slice(0, 4).map((s, i) => ({
        title: `Step ${i + 1}`,
        desc:  s.replace(/^\d+[\.\)]\s*|^[-•*]\s*/, '').trim(),
      }))
    : [
        { title: 'Validate',    desc: 'Customer discovery to validate the core problem with real users' },
        { title: 'Build MVP',   desc: 'Develop a minimum viable product within 3 months' },
        { title: 'Beta Launch', desc: 'Onboard first 50 beta users and gather structured feedback' },
        { title: 'Scale',       desc: 'Launch publicly and iterate based on real user data' },
      ]

  const NSR      = 4.5                 // next-steps circle radius
  const NSD      = NSR * 2
  const nsRowH   = NSD + 6
  const nsCardH  = CARD_PAD_V + CARD_LABEL + nsItems.length * nsRowH + CARD_PAD_V

  if (y4 + nsCardH < maxY4) {
    fill(CARD); doc.roundedRect(ml, y4, cW, nsCardH, 2, 2, 'F')
    fill(ACC1); doc.roundedRect(ml, y4, 2.5, nsCardH, 1, 1, 'F')
    font('bold', 8); ink(ACC1)
    doc.text('NEXT STEPS', ml + CARD_PAD_H, y4 + CARD_PAD_V + 1)
    let ny = y4 + CARD_PAD_V + CARD_LABEL + NSR
    nsItems.forEach((item, i) => {
      stepCircle(ml + CARD_PAD_H + NSR, ny, NSR, i + 1, i)
      const textX = ml + CARD_PAD_H + NSD + 5
      font('bold', 10.5); ink(DARK)
      doc.text(item.title, textX, ny - 2)
      font('normal', 9.5); ink(GRAY)
      wrap(item.desc, cW - CARD_PAD_H - NSD - 8, 2).forEach((ln, li) =>
        doc.text(ln, textX, ny + 4 + li * lh(9.5))
      )
      ny += nsRowH
    })
    y4 += nsCardH + 6
  }

  // Footer sits just above closing section
  pageFooter(closingY - 5)

  // ── Dark navy closing section ──────────────────────────────────────────────
  fill(NAVY); doc.rect(0, closingY, W, closingH, 'F')

  const cly = closingY + 16
  font('bold', 17)
  const ew2 = doc.getTextWidth('Eurek')
  const aw2 = doc.getTextWidth('AI')
  const dw2 = doc.getTextWidth('dea')
  const lx  = (W - ew2 - aw2 - dw2) / 2
  ink(WHITE); doc.text('Eurek', lx, cly)
  ink(ACC1);  doc.text('AI', lx + ew2, cly)
  ink(WHITE); doc.text('dea', lx + ew2 + aw2, cly)

  font('normal', 8.5); ink([138, 138, 178])
  doc.text('Protected & Presented by eurekAIdea', W / 2, cly + 10, { align: 'center' })
  font('normal', 8); ink(ACC1)
  doc.text('myeurekaidea.com', W / 2, cly + 17.5, { align: 'center' })
  gradientRule(ml + 42, W - mr - 42, cly + 27)

  // Gradient bar at very bottom of page 4
  gradientBar(H - 4, 4)

  // ── Save / return ──────────────────────────────────────────────────────────
  const slug = (idea?.title || 'idea')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '') || 'idea'
  if (returnBlob) return doc.output('blob')
  doc.save(`${slug}-eurekAIdea-pitch.pdf`)
}
