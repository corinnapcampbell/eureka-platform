import jsPDF from 'jspdf'

// ── Shared helpers (also used by UI components) ────────────────────────────

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

// ── Main PDF export ────────────────────────────────────────────────────────

export function generateIdeaPDF(idea, { userEmail = '' } = {}) {
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const W = 210, H = 297, ml = 18, contentW = W - ml * 2

  const NAVY  = [14, 14, 31]
  const ACC1  = [123, 159, 247]
  const ACC2  = [155, 127, 247]
  const DARK  = [44, 44, 42]
  const GRAY  = [136, 135, 128]
  const LGRAY = [150, 150, 160]
  const WHITE = [255, 255, 255]

  // Deduplicate all array / split fields up front
  const categories = dedupeArray(idea?.category || [])
  const lookingFor = dedupeArray(
    (idea?.terms || '').split(',').map(s => s.trim()).filter(Boolean)
  )
  const audTags = dedupeArray(
    (idea?.target_audience || '').split(/,|;/).map(s => s.trim()).filter(Boolean)
  )

  const dateStr = idea?.created_at
    ? new Date(idea.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  // ── Helpers ────────────────────────────────────────────────────
  const lh = (fs, factor = 1.55) => fs * 0.352778 * factor
  const fill   = c => doc.setFillColor(...c)
  const stroke = c => doc.setDrawColor(...c)
  const ink    = c => doc.setTextColor(...c)
  const f      = (style, size) => { doc.setFont('helvetica', style); doc.setFontSize(size) }

  function brandBars() {
    fill(ACC1); doc.rect(0, 0, W, 3, 'F')
    fill(ACC2); doc.rect(0, H - 3, W, 3, 'F')
  }

  function pageFooter(n, total) {
    f('normal', 8); ink(LGRAY)
    doc.text(`EurekAIdea · Confidential · ${dateStr}`, ml, H - 6)
    doc.text(`${n} / ${total}`, W - ml, H - 6, { align: 'right' })
  }

  function logoDark(x, y, size = 11) {
    f('bold', size)
    ink(DARK); doc.text('Eurek', x, y)
    const ew = doc.getTextWidth('Eurek')
    ink(ACC1); doc.text('AI', x + ew, y)
    const aw = doc.getTextWidth('AI')
    ink(DARK); doc.text('dea', x + ew + aw, y)
  }

  function sectionLabel(y, text, color = ACC2) {
    f('bold', 8); ink(color)
    doc.text(text.toUpperCase(), ml, y)
    return y + 5
  }

  function dividerLine(y) {
    stroke([210, 210, 220]); doc.setLineWidth(0.25)
    doc.line(ml, y, W - ml, y)
    return y + 7
  }

  // ═══════════════════════════════════════════════════════════
  // PAGE 1 — COVER
  // ═══════════════════════════════════════════════════════════
  fill(NAVY); doc.rect(0, 0, W, H, 'F')
  fill(ACC1); doc.rect(0, 0, W, 3, 'F')
  fill(ACC2); doc.rect(0, H - 3, W, 3, 'F')

  // Logo (white version)
  f('bold', 14); ink(WHITE); doc.text('Eurek', ml, 15)
  const ew0 = doc.getTextWidth('Eurek')
  ink(ACC1); doc.text('AI', ml + ew0, 15)
  const aw0 = doc.getTextWidth('AI')
  ink(WHITE); doc.text('dea', ml + ew0 + aw0, 15)

  // CONFIDENTIAL badge top right
  f('normal', 7)
  const cbTW = doc.getTextWidth('CONFIDENTIAL')
  const cbW = cbTW + 6, cbH = 5.5, cbX = W - ml - cbW, cbY = 10
  fill(NAVY); stroke(ACC1); doc.setLineWidth(0.3)
  doc.roundedRect(cbX, cbY, cbW, cbH, 1.5, 1.5, 'FD')
  ink(ACC1); doc.text('CONFIDENTIAL', cbX + 3, cbY + 3.9)

  // Category chips
  let cx = ml
  f('normal', 7.5)
  categories.forEach(cat => {
    const tw = doc.getTextWidth(cat), cw = tw + 8
    fill([22, 26, 52]); stroke(ACC1); doc.setLineWidth(0.25)
    doc.roundedRect(cx, 23, cw, 6, 1.5, 1.5, 'FD')
    ink(ACC1); doc.text(cat, cx + 4, 27.5)
    cx += cw + 3
    if (cx > W - ml - 30) cx = ml
  })

  // Title
  f('bold', 26); ink(WHITE)
  const titleLines = doc.splitTextToSize(idea?.title || 'Untitled Idea', contentW - 20)
  const titleY = 108, titleLH = lh(26, 1.3)
  titleLines.slice(0, 3).forEach((line, i) => {
    doc.text(line, W / 2, titleY + i * titleLH, { align: 'center' })
  })

  // Tagline
  const afterTitleY = titleY + Math.min(titleLines.length, 3) * titleLH + 7
  const tagline = (idea?.tagline || '').trim()
  if (tagline) {
    f('normal', 13); ink([136, 136, 180])
    doc.splitTextToSize(tagline, contentW - 30).slice(0, 2).forEach((line, i) => {
      doc.text(line, W / 2, afterTitleY + i * lh(13, 1.4), { align: 'center' })
    })
  }

  // Gradient divider line
  stroke(ACC1); doc.setLineWidth(0.5); doc.line(ml + 25, 188, W / 2, 188)
  stroke(ACC2); doc.line(W / 2, 188, W - ml - 25, 188)

  // 2×2 metadata grid
  const mcW = (contentW - 8) / 2
  const meta = [
    { label: 'Submitted by', value: userEmail || '—' },
    { label: 'Date',         value: dateStr },
    { label: 'Market Size',  value: (idea?.market_size || '—').slice(0, 40) },
    { label: 'Looking For',  value: lookingFor.join(', ') || '—' },
  ]
  meta.forEach((item, i) => {
    const col = i % 2, row = Math.floor(i / 2)
    const mx = ml + col * (mcW + 8), my = 198 + row * 20
    f('normal', 7.5); ink([80, 80, 110])
    doc.text(item.label.toUpperCase(), mx, my)
    f('bold', 10); ink(WHITE)
    doc.splitTextToSize(item.value, mcW - 4).slice(0, 2).forEach((line, li) => {
      doc.text(line, mx, my + 5.5 + li * 4.8)
    })
  })

  // Blockchain hash
  if (idea?.blockchain_hash) {
    f('normal', 6.5); ink([35, 35, 55])
    doc.splitTextToSize(`Hash: ${idea.blockchain_hash}`, contentW).slice(0, 3).forEach((line, i) => {
      doc.text(line, ml, 260 + i * 4)
    })
  }

  // Faint CONFIDENTIAL stamp bottom right
  f('bold', 8); ink([28, 28, 48])
  doc.text('CONFIDENTIAL', W - ml, H - 9, { align: 'right' })

  // ═══════════════════════════════════════════════════════════
  // PAGE 2 — Problem, Solution & How It Works
  // ═══════════════════════════════════════════════════════════
  doc.addPage(); brandBars()
  logoDark(ml, 13)
  f('normal', 8); ink(LGRAY); doc.text('2 / 4', W - ml, 13, { align: 'right' })

  let y2 = 22
  fill(ACC2); doc.ellipse(ml + 2, y2 - 1.5, 2.2, 2.2, 'F')
  y2 = sectionLabel(y2, 'The Problem', ACC2)

  f('normal', 11); ink(DARK)
  const probLines = doc.splitTextToSize((idea?.problem || '—').trim(), contentW)
  probLines.slice(0, 6).forEach(line => { doc.text(line, ml, y2); y2 += lh(11) })
  y2 += 5

  // Solution highlight box
  const solLines = doc.splitTextToSize((idea?.solution || '—').trim(), contentW - 10).slice(0, 6)
  const solH = solLines.length * lh(11) + 16
  fill([240, 240, 255]); doc.rect(ml, y2, contentW, solH, 'F')
  fill(ACC1); doc.rect(ml, y2, 3, solH, 'F')
  f('bold', 8); ink(ACC1); doc.text('THE SOLUTION', ml + 7, y2 + 6.5)
  f('normal', 11); ink(DARK)
  solLines.forEach((line, i) => { doc.text(line, ml + 7, y2 + 13 + i * lh(11)) })
  y2 += solH + 8

  y2 = dividerLine(y2)
  y2 = sectionLabel(y2, 'How It Works', ACC1); y2 += 2

  const defaultHIW = [
    'Submit your idea to the EurekAIdea vault',
    'A blockchain timestamp is created automatically',
    'Build your investor pitch in the Pitch Builder',
    'Share securely via NDA-gated link',
  ]
  const hiwSteps = (idea?.how_it_works || '').trim()
    ? idea.how_it_works.split('\n').filter(s => s.trim()).slice(0, 4)
    : defaultHIW

  hiwSteps.forEach((step, i) => {
    fill(i % 2 === 0 ? ACC1 : ACC2); doc.ellipse(ml + 3.5, y2 - 1.5, 3.5, 3.5, 'F')
    f('bold', 8.5); ink(WHITE); doc.text(String(i + 1), ml + 3.5, y2 + 1, { align: 'center' })
    f('normal', 10.5); ink(DARK)
    const sLines = doc.splitTextToSize(step.replace(/^\d+[\.\)]\s*/, '').trim(), contentW - 14).slice(0, 2)
    sLines.forEach((line, li) => { doc.text(line, ml + 11, y2 + li * lh(10.5)) })
    y2 += Math.max(sLines.length * lh(10.5), 9) + 3
  })

  pageFooter(2, 4)

  // ═══════════════════════════════════════════════════════════
  // PAGE 3 — Market, Business Model & Competitive Advantage
  // ═══════════════════════════════════════════════════════════
  doc.addPage(); brandBars()
  logoDark(ml, 13)
  f('normal', 8); ink(LGRAY); doc.text('3 / 4', W - ml, 13, { align: 'right' })

  let y3 = 22
  y3 = sectionLabel(y3, 'Market Size', ACC2)
  const msText = (idea?.market_size || '').trim()
  if (msText) {
    f('normal', 11); ink(DARK)
    doc.splitTextToSize(msText, contentW).slice(0, 2).forEach(line => { doc.text(line, ml, y3); y3 += lh(11) })
  }
  y3 += 4

  // 3 metric boxes
  const mbW = (contentW - 8) / 3
  ;[
    { value: '$180B+', label: 'Global IP Market' },
    { value: '$100B+', label: 'Creator Economy' },
    { value: '$1B+',   label: 'Estimated TAM' },
  ].forEach((m, i) => {
    const bx = ml + i * (mbW + 4)
    fill([243, 246, 252]); doc.roundedRect(bx, y3, mbW, 20, 2, 2, 'F')
    f('bold', 14); ink(ACC1); doc.text(m.value, bx + mbW / 2, y3 + 11, { align: 'center' })
    f('normal', 7.5); ink(GRAY); doc.text(m.label, bx + mbW / 2, y3 + 17, { align: 'center' })
  })
  y3 += 24

  // Audience tags (deduplicated)
  if (audTags.length > 0) {
    f('normal', 7.5); let tx = ml
    audTags.slice(0, 5).forEach(tag => {
      const tw = doc.getTextWidth(tag) + 8
      fill([235, 240, 247]); doc.roundedRect(tx, y3, tw, 6, 1.5, 1.5, 'F')
      ink([59, 82, 115]); doc.text(tag, tx + 4, y3 + 4.2)
      tx += tw + 3
    })
    y3 += 10
  }

  y3 = dividerLine(y3)
  y3 = sectionLabel(y3, 'Business Model', ACC2); y3 += 2

  const bmSrc  = (idea?.business_model || '—').trim()
  const bmAll  = bmSrc.split('\n').filter(s => s.trim())
  const mid    = Math.max(1, Math.ceil(bmAll.length / 2))
  const hbW    = (contentW - 5) / 2
  const bm1L   = doc.splitTextToSize(bmAll.slice(0, mid).join(' '), hbW - 8).slice(0, 4)
  const bm2L   = doc.splitTextToSize((bmAll.slice(mid).join(' ') || bmSrc), hbW - 8).slice(0, 4)
  const bmBoxH = Math.max(bm1L.length, bm2L.length) * lh(9) + 16

  fill([248, 248, 255]); doc.roundedRect(ml, y3, hbW, bmBoxH, 2, 2, 'F')
  f('bold', 8); ink(ACC1); doc.text('FREE TIER', ml + 4, y3 + 6)
  f('normal', 9); ink(DARK)
  bm1L.forEach((line, i) => { doc.text(line, ml + 4, y3 + 12.5 + i * lh(9)) })

  const bx2 = ml + hbW + 5
  fill([242, 242, 255]); doc.roundedRect(bx2, y3, hbW, bmBoxH, 2, 2, 'F')
  stroke(ACC2); doc.setLineWidth(0.5); doc.roundedRect(bx2, y3, hbW, bmBoxH, 2, 2, 'S')
  f('bold', 8); ink(ACC2); doc.text('PAID TIER', bx2 + 4, y3 + 6)
  f('normal', 9); ink(DARK)
  bm2L.forEach((line, i) => { doc.text(line, bx2 + 4, y3 + 12.5 + i * lh(9)) })

  y3 += bmBoxH + 8
  y3 = dividerLine(y3)
  y3 = sectionLabel(y3, 'Competitive Advantage', ACC1)

  const advText = (idea?.competitive_advantage || '').trim() ||
    'eurekAIdea is the only end-to-end platform combining blockchain IP timestamping, AI-powered pitch generation, NDA-gated sharing, and professional pitch deck export — in one seamless workflow for founders and creators.'
  f('normal', 11); ink(DARK)
  doc.splitTextToSize(advText, contentW).slice(0, 6).forEach(line => {
    if (y3 < H - 24) { doc.text(line, ml, y3); y3 += lh(11) }
  })

  pageFooter(3, 4)

  // ═══════════════════════════════════════════════════════════
  // PAGE 4 — Risks, Next Steps & Closing
  // ═══════════════════════════════════════════════════════════
  doc.addPage(); brandBars()
  logoDark(ml, 13)
  f('normal', 8); ink(LGRAY); doc.text('4 / 4', W - ml, 13, { align: 'right' })

  let y4 = 22
  y4 = sectionLabel(y4, 'Risks & Challenges', ACC2); y4 += 2

  const riskItems = (idea?.risks || '').trim()
    ? (idea.risks).split('\n').filter(s => s.trim()).slice(0, 5)
    : ['—']
  riskItems.forEach((risk, i) => {
    fill(i % 2 === 0 ? ACC2 : ACC1); doc.ellipse(ml + 1.5, y4 - 1, 1.5, 1.5, 'F')
    f('normal', 10.5); ink(DARK)
    const rls = doc.splitTextToSize(risk.replace(/^[-•*]\s*/, '').trim(), contentW - 8).slice(0, 3)
    rls.forEach((line, li) => { doc.text(line, ml + 6, y4 + li * lh(10.5)) })
    y4 += Math.max(rls.length * lh(10.5), 7) + 3
  })

  y4 += 4; y4 = dividerLine(y4)
  y4 = sectionLabel(y4, 'Next Steps', ACC1); y4 += 2

  const defaultNS = [
    { title: 'Validate',     desc: 'Conduct customer discovery and validate the core problem with real users' },
    { title: 'Build MVP',    desc: 'Develop a minimum viable product within 3 months' },
    { title: 'Beta Launch',  desc: 'Onboard first 50 beta users and gather structured feedback' },
    { title: 'Scale',        desc: 'Launch publicly and iterate based on real user insights' },
  ]
  const nsItems = (idea?.next_steps || '').trim()
    ? idea.next_steps.split('\n').filter(s => s.trim()).slice(0, 4).map((s, i) => ({
        title: `Step ${i + 1}`, desc: s.replace(/^\d+[\.\)]\s*/, '').trim(),
      }))
    : defaultNS

  nsItems.forEach((item, i) => {
    fill(i % 2 === 0 ? ACC1 : ACC2); doc.ellipse(ml + 4, y4 - 2, 4, 4, 'F')
    f('bold', 8); ink(WHITE); doc.text(String(i + 1), ml + 4, y4 + 0.8, { align: 'center' })
    f('bold', 10.5); ink(DARK); doc.text(item.title, ml + 12, y4 - 0.5)
    f('normal', 9.5); ink(GRAY)
    const dLines = doc.splitTextToSize(item.desc, contentW - 14).slice(0, 2)
    dLines.forEach((line, li) => { doc.text(line, ml + 12, y4 + 5 + li * lh(9.5)) })
    y4 += Math.max(dLines.length * lh(9.5), 9) + 9
  })

  // Closing section (fixed at bottom of page)
  const closingH = 52, closingY = H - 3 - closingH
  fill(NAVY); doc.rect(0, closingY, W, closingH, 'F')

  const cly = closingY + 18
  f('bold', 18)
  const ew2 = doc.getTextWidth('Eurek'), aw2 = doc.getTextWidth('AI'), dw2 = doc.getTextWidth('dea')
  const lx = (W - ew2 - aw2 - dw2) / 2
  ink(WHITE); doc.text('Eurek', lx, cly)
  ink(ACC1);  doc.text('AI', lx + ew2, cly)
  ink(WHITE); doc.text('dea', lx + ew2 + aw2, cly)

  f('normal', 9); ink([140, 140, 180])
  doc.text('Protected & Presented by eurekAIdea', W / 2, cly + 9, { align: 'center' })
  f('normal', 8); ink(ACC1)
  doc.text('myeurekaidea.com', W / 2, cly + 17, { align: 'center' })

  fill(ACC1); doc.rect(ml + 40, cly + 24, (contentW - 80) / 2, 0.5, 'F')
  fill(ACC2); doc.rect(ml + 40 + (contentW - 80) / 2, cly + 24, (contentW - 80) / 2, 0.5, 'F')

  // Footer above closing section
  f('normal', 8); ink(LGRAY)
  doc.text(`EurekAIdea · Confidential · ${dateStr}`, ml, closingY - 5)
  doc.text('4 / 4', W - ml, closingY - 5, { align: 'right' })

  // Save
  const slug = (idea?.title || 'idea').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  doc.save(`${slug}-eurekAIdea-pitch.pdf`)
}
