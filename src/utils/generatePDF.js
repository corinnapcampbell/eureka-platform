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

export function generateIdeaPDF(idea, { userEmail = '' } = {}) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const W = 210, H = 297, ml = 18, mr = 18
  const contentW = W - ml - mr

  // Colors
  const NAVY  = [14, 14, 31]
  const ACC1  = [123, 159, 247]
  const ACC2  = [155, 127, 247]
  const DARK  = [44, 44, 42]
  const GRAY  = [136, 135, 128]
  const LGRAY = [150, 150, 160]
  const WHITE = [255, 255, 255]
  const MUTED = [160, 160, 185]  // approx rgba(255,255,255,0.45) on navy

  // Deduplicate all array/split fields up front
  const categories = dedupeArray(idea?.category || [])
  const lookingFor = dedupeArray(
    (idea?.terms || '').split(/,\s*/).map(s => s.trim()).filter(Boolean)
  )
  const audTags = dedupeArray(
    (idea?.target_audience || '').split(/,|;/).map(s => s.trim()).filter(Boolean)
  )

  const dateStr = idea?.created_at
    ? new Date(idea.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const lh  = (fs, factor = 1.6) => fs * 0.352778 * factor
  const fill   = c => doc.setFillColor(...c)
  const stroke = c => doc.setDrawColor(...c)
  const ink    = c => doc.setTextColor(...c)
  const f      = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size) }

  function gradientBar(y, h = 4) {
    const steps = 42
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      doc.setFillColor(
        Math.round(ACC1[0] + t * (ACC2[0] - ACC1[0])),
        Math.round(ACC1[1] + t * (ACC2[1] - ACC1[1])),
        Math.round(ACC1[2] + t * (ACC2[2] - ACC1[2]))
      )
      doc.rect((W / steps) * i, y, W / steps + 0.5, h, 'F')
    }
    doc.setLineWidth(0.25)
  }

  function gradientLine(x1, x2, y) {
    const steps = 24
    const lineW = x2 - x1
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      doc.setDrawColor(
        Math.round(ACC1[0] + t * (ACC2[0] - ACC1[0])),
        Math.round(ACC1[1] + t * (ACC2[1] - ACC1[1])),
        Math.round(ACC1[2] + t * (ACC2[2] - ACC1[2]))
      )
      doc.setLineWidth(0.5)
      const sx = x1 + (lineW / steps) * i
      doc.line(sx, y, sx + lineW / steps + 0.5, y)
    }
    doc.setLineWidth(0.25)
  }

  function pageBars() {
    gradientBar(0, 4)
    gradientBar(H - 4, 4)
  }

  function logoWhite(x, y, size = 14) {
    f('bold', size)
    ink(WHITE); doc.text('Eurek', x, y)
    const ew = doc.getTextWidth('Eurek')
    ink(ACC1); doc.text('AI', x + ew, y)
    const aw = doc.getTextWidth('AI')
    ink(WHITE); doc.text('dea', x + ew + aw, y)
  }

  function logoDark(x, y, size = 10) {
    f('bold', size)
    ink(DARK); doc.text('Eurek', x, y)
    const ew = doc.getTextWidth('Eurek')
    ink(ACC1); doc.text('AI', x + ew, y)
    const aw = doc.getTextWidth('AI')
    ink(DARK); doc.text('dea', x + ew + aw, y)
  }

  function pageHeader(num) {
    logoDark(ml, 14)
    f('normal', 8); ink(LGRAY)
    doc.text(`${num} / 4`, W - mr, 14, { align: 'right' })
  }

  function pageFooter() {
    f('normal', 7.5); ink(LGRAY)
    doc.text('Protected & Presented by eurekAIdea · myeurekaidea.com', ml, H - 8)
    doc.text('Confidential', W - mr, H - 8, { align: 'right' })
  }

  function sectionLabel(y, text) {
    f('bold', 8); ink(ACC2)
    doc.text(text.toUpperCase(), ml, y)
    return y + 5.5
  }

  function dividerLine(y) {
    stroke([210, 210, 220]); doc.setLineWidth(0.25)
    doc.line(ml, y, W - mr, y)
    return y + 8
  }

  function gradientCircle(cx, cy, r, num, idx) {
    fill(idx % 2 === 0 ? ACC1 : ACC2)
    doc.ellipse(cx, cy, r, r, 'F')
    f('bold', 7.5); ink(WHITE)
    doc.text(String(num), cx, cy + 1.1, { align: 'center' })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════════════════════════════════════
  fill(NAVY); doc.rect(0, 0, W, H, 'F')
  pageBars()

  // Logo — white, top left
  logoWhite(ml, 15.5)

  // CONFIDENTIAL badge — top right
  f('normal', 7)
  const cbText = 'CONFIDENTIAL'
  const cbTW = doc.getTextWidth(cbText)
  const cbW = cbTW + 7, cbH = 5.5, cbX = W - mr - cbW, cbY = 11
  doc.setFillColor(22, 26, 52); stroke(ACC1); doc.setLineWidth(0.3)
  doc.roundedRect(cbX, cbY, cbW, cbH, 1.5, 1.5, 'FD')
  ink(ACC1); doc.text(cbText, cbX + 3.5, cbY + 3.9)

  // Category chips
  f('normal', 7.5)
  let cx = ml
  categories.forEach(cat => {
    const tw = doc.getTextWidth(cat)
    const cw = tw + 8
    if (cx + cw > W - mr) return
    doc.setFillColor(22, 26, 52); stroke(ACC1); doc.setLineWidth(0.2)
    doc.roundedRect(cx, 24, cw, 6, 1.5, 1.5, 'FD')
    ink(ACC1); doc.text(cat, cx + 4, 28.2)
    cx += cw + 3
  })

  // Title — large, bold, white, centered
  f('bold', 22); ink(WHITE)
  const titleText  = (idea?.title || 'Untitled Idea').trim()
  const titleLines = doc.splitTextToSize(titleText, contentW - 8)
  const titleY     = 100
  const titleLH    = lh(22, 1.25)
  titleLines.slice(0, 3).forEach((line, i) => {
    doc.text(line, W / 2, titleY + i * titleLH, { align: 'center' })
  })

  // Tagline — muted, size 13
  const tagline = (idea?.tagline || '').trim()
  let afterTitleY = titleY + Math.min(titleLines.length, 3) * titleLH
  if (tagline) {
    afterTitleY += 8
    f('normal', 13); ink(MUTED)
    const tLines = doc.splitTextToSize(tagline, contentW - 30)
    tLines.slice(0, 2).forEach((line, i) => {
      doc.text(line, W / 2, afterTitleY + i * lh(13, 1.35), { align: 'center' })
    })
    afterTitleY += tLines.slice(0, 2).length * lh(13, 1.35)
  }

  // Gradient divider line
  const divY = Math.max(afterTitleY + 12, 155)
  gradientLine(ml + 25, W - mr - 25, divY)

  // 2×2 metadata grid
  const metaY = divY + 12
  const mcW = (contentW - 8) / 2
  const metaItems = [
    { label: 'Submitted by', value: userEmail || '—' },
    { label: 'Date',         value: dateStr },
    { label: 'Market Size',  value: (idea?.market_size || '—') },
    { label: 'Looking For',  value: lookingFor.join(', ') || '—' },
  ]
  metaItems.forEach((item, i) => {
    const col = i % 2, row = Math.floor(i / 2)
    const mx = ml + col * (mcW + 8)
    const my = metaY + row * 22
    f('normal', 7.5); ink([70, 70, 108])
    doc.text(item.label.toUpperCase(), mx, my)
    f('bold', 10.5); ink(WHITE)
    const vLines = doc.splitTextToSize(String(item.value).slice(0, 80), mcW - 4)
    vLines.slice(0, 2).forEach((line, li) => {
      doc.text(line, mx, my + 6 + li * lh(10.5, 1.3))
    })
  })

  // Blockchain hash — bottom, dark monospace
  if (idea?.blockchain_hash) {
    f('normal', 6); ink([28, 28, 50])
    const hashLines = doc.splitTextToSize(`Hash: ${idea.blockchain_hash}`, contentW)
    hashLines.slice(0, 2).forEach((line, i) => {
      doc.text(line, ml, 258 + i * 4.5)
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Problem · Solution · How It Works
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBars()
  pageHeader(2)

  let y2 = 24

  // THE PROBLEM
  y2 = sectionLabel(y2, 'The Problem')
  f('normal', 11); ink(DARK)
  const probText  = (idea?.problem || '—').trim()
  const probLines = doc.splitTextToSize(probText, contentW)
  probLines.slice(0, 7).forEach(line => { doc.text(line, ml, y2); y2 += lh(11) })
  y2 += 5

  // THE SOLUTION — highlight box
  const solText  = (idea?.solution || '—').trim()
  const solLines = doc.splitTextToSize(solText, contentW - 12).slice(0, 6)
  const solBoxH  = solLines.length * lh(11) + 19
  doc.setFillColor(240, 242, 255); doc.rect(ml, y2, contentW, solBoxH, 'F')
  fill(ACC1); doc.rect(ml, y2, 3, solBoxH, 'F')
  f('bold', 7.5); ink(ACC1); doc.text('THE SOLUTION', ml + 7, y2 + 7)
  f('normal', 11); ink(DARK)
  solLines.forEach((line, i) => { doc.text(line, ml + 7, y2 + 13.5 + i * lh(11)) })
  y2 += solBoxH + 9

  // HOW IT WORKS
  y2 = dividerLine(y2)
  y2 = sectionLabel(y2, 'How It Works')
  y2 += 3

  const hiwText = (idea?.how_it_works || '').trim()
  const defaultHIW = [
    'Submit your idea to the EurekAIdea vault',
    'A blockchain timestamp is created instantly and permanently',
    'Build your investor pitch using the AI Pitch Builder',
    'Share securely via NDA-gated link — all access is logged',
  ]

  const hiwSteps = (hiwText && hasMultipleSteps(hiwText))
    ? hiwText.split('\n').filter(s => s.trim()).slice(0, 4)
    : hiwText
      ? null
      : defaultHIW

  if (hiwSteps) {
    hiwSteps.forEach((step, i) => {
      const clean = step.replace(/^\d+[\.\)]\s*|^[-•*]\s*/, '').trim()
      gradientCircle(ml + 3.5, y2 - 1.2, 3.5, i + 1, i)
      f('normal', 10.5); ink(DARK)
      const sLines = doc.splitTextToSize(clean, contentW - 13).slice(0, 2)
      sLines.forEach((line, li) => { doc.text(line, ml + 10.5, y2 - 1 + li * lh(10.5)) })
      y2 += Math.max(sLines.length * lh(10.5), 9) + 4.5
    })
  } else if (hiwText) {
    f('normal', 11); ink(DARK)
    doc.splitTextToSize(hiwText, contentW).slice(0, 6).forEach(line => {
      doc.text(line, ml, y2); y2 += lh(11)
    })
  }

  pageFooter()

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 3 — Market · Business Model · Competitive Advantage
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBars()
  pageHeader(3)

  let y3 = 24

  // MARKET SIZE
  y3 = sectionLabel(y3, 'Market Size')
  const msText = (idea?.market_size || '').trim()
  if (msText) {
    f('normal', 11); ink(DARK)
    doc.splitTextToSize(msText, contentW).slice(0, 2).forEach(line => {
      doc.text(line, ml, y3); y3 += lh(11)
    })
    y3 += 3
  }

  // 3 metric boxes
  const mbW = (contentW - 8) / 3
  const metrics = [
    { value: '$180B+', label: 'Global IP Market' },
    { value: '$100B+', label: 'Creator Economy' },
    { value: '$1B+',   label: 'Estimated TAM' },
  ]
  metrics.forEach((m, i) => {
    const bx = ml + i * (mbW + 4)
    doc.setFillColor(243, 246, 252); stroke([220, 226, 242]); doc.setLineWidth(0.2)
    doc.roundedRect(bx, y3, mbW, 22, 2, 2, 'FD')
    f('bold', 14); ink(ACC1); doc.text(m.value, bx + mbW / 2, y3 + 12, { align: 'center' })
    f('normal', 7.5); ink(GRAY); doc.text(m.label, bx + mbW / 2, y3 + 18.5, { align: 'center' })
  })
  y3 += 26

  // Target audience tags
  if (audTags.length > 0) {
    f('normal', 7.5)
    let tx = ml
    audTags.slice(0, 6).forEach(tag => {
      const tw = doc.getTextWidth(tag) + 10
      if (tx + tw > W - mr) { tx = ml; y3 += 9 }
      doc.setFillColor(235, 240, 247); stroke([200, 215, 235]); doc.setLineWidth(0.2)
      doc.roundedRect(tx, y3, tw, 6.5, 1.5, 1.5, 'FD')
      ink([59, 82, 115]); doc.text(tag, tx + 5, y3 + 4.5)
      tx += tw + 3
    })
    y3 += 11
  }

  y3 = dividerLine(y3)

  // BUSINESS MODEL — two boxes
  y3 = sectionLabel(y3, 'Business Model')
  y3 += 2

  const bmText = (idea?.business_model || '').trim()
  const hbW = (contentW - 5) / 2
  let bm1Text, bm2Text

  if (bmText) {
    const bmLines = bmText.split('\n').filter(s => s.trim())
    if (bmLines.length >= 2) {
      const mid = Math.ceil(bmLines.length / 2)
      bm1Text = bmLines.slice(0, mid).join(' ')
      bm2Text = bmLines.slice(mid).join(' ')
    } else {
      const words = bmText.split(' ')
      const half = Math.ceil(words.length / 2)
      bm1Text = words.slice(0, half).join(' ')
      bm2Text = words.slice(half).join(' ') || bmText
    }
  } else {
    bm1Text = 'Free tier: submit and protect up to 3 ideas with blockchain timestamping.'
    bm2Text = 'Pro plan at $19/mo: unlimited ideas, AI pitch builder, NDA-gated sharing, and deck export.'
  }

  const bm1L   = doc.splitTextToSize(bm1Text, hbW - 8).slice(0, 4)
  const bm2L   = doc.splitTextToSize(bm2Text, hbW - 8).slice(0, 4)
  const bmBoxH = Math.max(bm1L.length, bm2L.length) * lh(9.5) + 17

  // Free tier box
  doc.setFillColor(248, 248, 255); stroke(ACC1); doc.setLineWidth(0.5)
  doc.roundedRect(ml, y3, hbW, bmBoxH, 2, 2, 'FD')
  f('bold', 7.5); ink(ACC1); doc.text('FREE TIER', ml + 5, y3 + 6.5)
  f('normal', 9.5); ink(DARK)
  bm1L.forEach((line, i) => { doc.text(line, ml + 5, y3 + 13 + i * lh(9.5)) })

  // Paid tier box
  const bx2 = ml + hbW + 5
  doc.setFillColor(244, 242, 255); stroke(ACC2); doc.setLineWidth(0.5)
  doc.roundedRect(bx2, y3, hbW, bmBoxH, 2, 2, 'FD')
  f('bold', 7.5); ink(ACC2); doc.text('PAID TIER', bx2 + 5, y3 + 6.5)
  f('normal', 9.5); ink(DARK)
  bm2L.forEach((line, i) => { doc.text(line, bx2 + 5, y3 + 13 + i * lh(9.5)) })

  y3 += bmBoxH + 8
  y3 = dividerLine(y3)

  // COMPETITIVE ADVANTAGE
  y3 = sectionLabel(y3, 'Competitive Advantage')
  const advText = (idea?.competitive_advantage || '').trim() ||
    'eurekAIdea is the only end-to-end platform combining blockchain IP timestamping, AI-powered pitch generation, NDA-gated sharing, and professional pitch deck export — in one seamless workflow for founders and creators.'
  f('normal', 11); ink(DARK)
  doc.splitTextToSize(advText, contentW).slice(0, 6).forEach(line => {
    if (y3 < H - 20) { doc.text(line, ml, y3); y3 += lh(11) }
  })

  pageFooter()

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 4 — Risks · Next Steps · Dark closing
  // ═══════════════════════════════════════════════════════════════════════════
  doc.addPage()
  pageBars()
  pageHeader(4)

  let y4 = 24

  // RISKS & CHALLENGES
  y4 = sectionLabel(y4, 'Risks & Challenges')
  y4 += 2

  const riskText  = (idea?.risks || '').trim()
  const riskItems = riskText
    ? riskText.split('\n').filter(s => s.trim()).slice(0, 5)
    : [
        'Market adoption may be slower than expected among early-stage founders',
        'IP law varies significantly across jurisdictions — consult local counsel',
        'Competition from existing idea management and pitch tools',
        'User trust around blockchain data permanence and data privacy',
      ]

  riskItems.forEach((risk, i) => {
    const clean = risk.replace(/^[-•*]\s*|\d+[\.\)]\s*/, '').trim()
    fill(i % 2 === 0 ? [224, 123, 159] : ACC2)
    doc.ellipse(ml + 1.8, y4 - 1.2, 1.8, 1.8, 'F')
    f('normal', 10.5); ink(DARK)
    const rLines = doc.splitTextToSize(clean, contentW - 9).slice(0, 3)
    rLines.forEach((line, li) => { doc.text(line, ml + 7, y4 - 1 + li * lh(10.5)) })
    y4 += Math.max(rLines.length * lh(10.5), 8) + 3.5
  })

  y4 += 4
  y4 = dividerLine(y4)

  // NEXT STEPS
  y4 = sectionLabel(y4, 'Next Steps')
  y4 += 3

  const nsText  = (idea?.next_steps || '').trim()
  const nsItems = nsText
    ? nsText.split('\n').filter(s => s.trim()).slice(0, 4).map((s, i) => ({
        title: `Step ${i + 1}`,
        desc:  s.replace(/^\d+[\.\)]\s*|^[-•*]\s*/, '').trim(),
      }))
    : [
        { title: 'Validate',    desc: 'Conduct customer discovery and validate the core problem with real users' },
        { title: 'Build MVP',   desc: 'Develop a minimum viable product within 3 months' },
        { title: 'Beta Launch', desc: 'Onboard first 50 beta users and gather structured feedback' },
        { title: 'Scale',       desc: 'Launch publicly and iterate based on real user data and insights' },
      ]

  const closingH = 55
  const closingY = H - 4 - closingH  // 238
  const maxY4    = closingY - 14

  nsItems.forEach((item, i) => {
    if (y4 >= maxY4) return
    gradientCircle(ml + 4.5, y4, 4.5, i + 1, i)
    f('bold', 10.5); ink(DARK); doc.text(item.title, ml + 13, y4 - 1.5)
    f('normal', 9.5); ink(GRAY)
    const dLines = doc.splitTextToSize(item.desc, contentW - 15).slice(0, 2)
    dLines.forEach((line, li) => { doc.text(line, ml + 13, y4 + 4.5 + li * lh(9.5)) })
    y4 += Math.max(dLines.length * lh(9.5) + 4.5, 12) + 8
  })

  // Footer — drawn above closing section
  f('normal', 7.5); ink(LGRAY)
  doc.text('Protected & Presented by eurekAIdea · myeurekaidea.com', ml, closingY - 5)
  doc.text('Confidential', W - mr, closingY - 5, { align: 'right' })

  // Dark navy closing section
  fill(NAVY); doc.rect(0, closingY, W, closingH, 'F')

  const cly = closingY + 17
  // Centered logo — white version
  f('bold', 17)
  const ew2 = doc.getTextWidth('Eurek')
  const aw2 = doc.getTextWidth('AI')
  const dw2 = doc.getTextWidth('dea')
  const lx  = (W - ew2 - aw2 - dw2) / 2
  ink(WHITE); doc.text('Eurek', lx, cly)
  ink(ACC1);  doc.text('AI', lx + ew2, cly)
  ink(WHITE); doc.text('dea', lx + ew2 + aw2, cly)

  f('normal', 8.5); ink([140, 140, 178])
  doc.text('Protected & Presented by eurekAIdea', W / 2, cly + 9, { align: 'center' })
  f('normal', 8); ink(ACC1)
  doc.text('myeurekaidea.com', W / 2, cly + 16.5, { align: 'center' })

  // Gradient accent line inside closing
  gradientLine(ml + 40, W - mr - 40, cly + 26)

  // Save
  const slug = (idea?.title || 'idea')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '') || 'idea'
  doc.save(`${slug}-eurekAIdea-pitch.pdf`)
}
