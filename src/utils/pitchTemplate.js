import { escH } from './businessModel.js'

// Shared Pitch PDF template. Half-letter pages (440 x 680 px = 5.5 x 8.5 in).
// Every visible section is a "band". Bands alternate dark / light and are packed
// onto pages by MEASURING their real rendered height. Nothing is invented:
// a section with no author content produces no band at all.

const e = (s) => escH(s == null ? '' : String(s))

// Sections in the order a pitch is told. Each inner list is one chapter:
// a chapter always starts on a new page and its sections stay together.
const CHAPTERS = [
  ['problem', 'solution'],                          // why this matters, and the answer
  ['how_it_works'],                                 // what it looks like in use (the product image lives here)
  ['target_market', 'market_size'],                 // who it is for
  ['competitive_landscape'],                        // the field
  ['competitive_advantage', 'customer_validation'], // why it wins, and early proof
  ['business_model', 'revenue_details'],            // how it makes money
  ['revenue_projections'],
  ['traction'],                                     // progress so far
  ['team'],                                         // who is behind it
  ['origin_story'],                                 // why they started
  ['risks'],                                        // what could go wrong
  ['next_steps'],                                   // the road ahead
]

const SECTION_LABELS = {
  problem: 'Problem', solution: 'Solution', how_it_works: 'How It Works', target_market: 'Target Market',
  market_size: 'Market Size', competitive_landscape: 'Competitive Landscape', competitive_advantage: 'Competitive Advantage',
  business_model: 'Business Model', revenue_details: 'Revenue Details', revenue_projections: 'Revenue Projections',
  traction: 'Traction & Milestones', customer_validation: 'Customer Validation', team: 'Team', origin_story: 'Origin Story',
  next_steps: 'Next Steps', risks: 'Risks & Challenges',
}

export const PITCH_SECTIONS = CHAPTERS.flatMap((keys, chapter) => keys.map(key => ({ key, label: SECTION_LABELS[key], chapter })))

// Character limits, sized so each chapter fills one page without spilling. The pitch form uses the same numbers.
export const PITCH_LIMITS = {
  title: 60, tagline: 110,
  problem: 340, solution: 340, competitive_advantage: 340, origin_story: 900, market_size: 110,
  how_it_works: { items: 4, chars: 95 }, target_market: { items: 3, chars: 100 },
  next_steps: { items: 5, chars: 95 }, risks: { items: 5, chars: 95 },
  team: { members: 20, bio: 220, bioUpTo: 3 }, traction: { items: 8 },
}

const BAND_LABEL = {
  problem: 'THE PROBLEM', solution: 'THE SOLUTION', how_it_works: 'HOW IT WORKS',
  market_size: 'MARKET SIZE', target_market: 'TARGET MARKET', business_model: 'BUSINESS MODEL',
  competitive_advantage: 'COMPETITIVE ADVANTAGE', risks: 'RISKS & CHALLENGES', next_steps: 'NEXT STEPS',
  team: 'THE TEAM', origin_story: 'ORIGIN STORY', customer_validation: 'CUSTOMER VALIDATION',
  traction: 'TRACTION & MILESTONES', revenue_details: 'REVENUE DETAILS',
  competitive_landscape: 'COMPETITIVE LANDSCAPE', revenue_projections: 'REVENUE PROJECTIONS',
}

const PAGE_W = 440
const PAGE_H = 680
const BAND_PAD = 22   // top and bottom padding of a band
const GAP = 12        // gap between blocks inside a band
const HERO_H = 190    // product image height
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Outfit:wght@300;400&display=swap'

// html2canvas: hardcoded colors only, no CSS variables.
const PAL = {
  dark:  { bg: '#0e0e1f', text: '#ffffff', body: 'rgba(255,255,255,0.86)', muted: 'rgba(255,255,255,0.62)', accent: '#a9bcf9', rule: 'rgba(255,255,255,0.14)', bar: '#8b8ff7', solidBg: '#ffffff', solidText: '#0e0e1f', solidMuted: '#5f5e5a', logoAI: '#9b9ff7', imgBg: 'rgba(255,255,255,0.08)' },
  light: { bg: '#ffffff', text: '#0e0e1f', body: '#2c2c2a', muted: '#5f5e5a', accent: '#5a5fd6', rule: 'rgba(44,44,42,0.12)', bar: '#0e0e1f', solidBg: '#0e0e1f', solidText: '#ffffff', solidMuted: 'rgba(255,255,255,0.62)', logoAI: '#5a5fd6', imgBg: '#e9ebf5' },
}

const CSS = `
  @import url('${FONT_HREF}');
  #pdf-preview .pdf-wrap { display:flex; flex-direction:column; gap:12px; width:${PAGE_W}px; margin:0 auto; }
  #pdf-preview .page { width:${PAGE_W}px; height:${PAGE_H}px; box-sizing:border-box; overflow:hidden; display:flex; flex-direction:column; background:#ffffff; font-family:'DM Sans',sans-serif; }
  #pdf-preview .page * { box-sizing:border-box; font-family:inherit; }
  #pdf-preview .band { padding:${BAND_PAD}px 28px; display:flex; flex-direction:column; flex-shrink:0; }
  #pdf-preview .band-blocks { display:flex; flex-direction:column; gap:${GAP}px; }
  #pdf-preview .pt-logo { font-family:'Outfit',sans-serif; font-weight:300; }
`

// ---------- text helpers ----------

function lines(text) {
  return String(text || '').replace(/\\n/g, '\n').split('\n').map(s => s.trim()).filter(Boolean)
}

function stripMarker(s) {
  return s.replace(/^(\d+[.)]|[•\-*])\s*/, '').trim()
}

// Paragraphs, with any very long paragraph cut at sentence boundaries so a block is never taller than a page.
function paragraphs(text) {
  const out = []
  for (const para of lines(text)) {
    if (para.length <= 420) { out.push(para); continue }
    const sentences = para.split(/(?<=[.!?])\s+/)
    let cur = ''
    for (const s of sentences) {
      if (cur && (cur + ' ' + s).length > 420) { out.push(cur); cur = s }
      else cur = cur ? cur + ' ' + s : s
    }
    if (cur) out.push(cur)
  }
  return out
}

function parseJSON(v) {
  if (v && typeof v === 'object') return v
  if (typeof v !== 'string' || !v.trim()) return null
  try { return JSON.parse(v) } catch { return null }
}

// ---------- small building blocks (p = palette of the band) ----------

const para = (p, t, extra = '') => `<div style="font-size:14px;line-height:1.65;color:${p.body};${extra}">${e(t)}</div>`
const caption = (p, t) => `<div style="font-size:10px;letter-spacing:1px;color:${p.muted};text-transform:uppercase">${e(t)}</div>`
const ruled = (p, inner, first) => `<div style="${first ? '' : `border-top:1px solid ${p.rule};padding-top:${GAP}px;`}">${inner}</div>`

function kv(p, label, value, first) {
  return ruled(p, `<div style="display:flex;gap:14px;align-items:baseline">
    <div style="flex-shrink:0;width:112px;font-size:10px;letter-spacing:1px;color:${p.muted};text-transform:uppercase">${e(label)}</div>
    <div style="flex:1;min-width:0;font-size:14px;line-height:1.55;color:${p.body}">${lines(value).map(e).join('<br>')}</div>
  </div>`, first)
}

function figure(p, value, label, size = 26) {
  return `<div><div style="font-size:${size}px;font-weight:700;line-height:1.15;color:${p.text};overflow-wrap:anywhere">${e(value)}</div><div style="margin-top:4px">${caption(p, label)}</div></div>`
}

function columns(p, cols) {
  return `<div style="display:grid;grid-template-columns:repeat(${cols.length},minmax(0,1fr));gap:14px">${cols.join('')}</div>`
}

function column(p, label, bigValue, items) {
  return `<div style="border-top:2px solid ${p.bar};padding-top:12px;display:flex;flex-direction:column;gap:7px">
    ${label ? `<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${p.muted};text-transform:uppercase">${e(label)}</div>` : ''}
    ${bigValue ? `<div style="font-size:20px;font-weight:700;line-height:1.2;color:${p.text};overflow-wrap:anywhere">${e(bigValue)}</div>` : ''}
    ${items.map(i => `<div style="font-size:13px;line-height:1.5;color:${p.body}">${e(i)}</div>`).join('')}
  </div>`
}

function numberedRow(p, n, text, first) {
  return ruled(p, `<div style="display:flex;gap:14px;align-items:flex-start">
    <div style="flex-shrink:0;width:26px;height:26px;border-radius:13px;background:${p.solidBg};color:${p.solidText};font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center">${n}</div>
    <div style="flex:1;min-width:0;font-size:14px;line-height:1.6;color:${p.body};padding-top:2px">${e(text)}</div>
  </div>`, first)
}

const CHECK = `<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 5"></path></svg>`

// ---------- sections: each returns an array of blocks, [] when the author gave no content ----------

function secProblem(c, p) { return paragraphs(c.form.problem).map(t => para(p, t)) }

function secSolution(c, p) {
  return paragraphs(c.form.solution).map(t => para(p, t))
}

function secHowItWorks(c, p) {
  const steps = lines(c.form.how_it_works).map(stripMarker).filter(Boolean)
  if (!steps.length) return []
  const hero = c.productImageUrl ? [`<div style="width:100%;height:${HERO_H}px;border-radius:10px;overflow:hidden;background:${p.imgBg}"><img src="${e(c.productImageUrl)}" crossorigin="anonymous" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></div>`] : []
  return hero.concat(steps.map((s, i) => ruled(p, `<div style="display:flex;gap:14px;align-items:baseline">
    <div style="flex-shrink:0;font-size:13px;font-weight:700;color:${p.accent}">${String(i + 1).padStart(2, '0')}</div>
    <div style="flex:1;min-width:0;font-size:14px;line-height:1.55;color:${p.body}">${e(s)}</div>
  </div>`, i === 0)))
}

export function marketAmounts(text) {
  return (String(text || '').match(/\$[\d.,]+\s?[BMKbmk]+\+?/g) || []).slice(0, 3)
}

function secMarketSize(c, p) {
  const blocks = []
  const amounts = marketAmounts(c.form.market_size)
  const names = ['Global Market', 'Serviceable', 'Target']
  if (amounts.length) blocks.push(columns(p, amounts.map((a, i) => `<div style="border-top:2px solid ${p.bar};padding-top:12px"><div style="font-size:24px;font-weight:700;color:${p.text}">${e(a)}</div><div style="margin-top:4px">${caption(p, names[i])}</div></div>`)))
  return blocks.concat(paragraphs(c.form.market_size).map(t => para(p, t)))
}

function secTargetMarket(c, p) {
  const items = Array.isArray(c.form.target_market_items) && c.form.target_market_items.length
    ? c.form.target_market_items.map(s => String(s).trim()).filter(Boolean)
    : lines(c.form.target_audience)
  return items.map((t, i) => ruled(p, para(p, t), i === 0))
}

function secAdvantage(c, p) { return paragraphs(c.form.competitive_advantage).map(t => para(p, t)) }

function secRisks(c, p) {
  return lines(c.form.risks).map(stripMarker).filter(Boolean).map((r, i) => ruled(p, `<div style="display:flex;gap:14px;align-items:flex-start">
    <div style="flex-shrink:0;width:8px;height:8px;margin-top:8px;background:${p.solidBg}"></div>
    <div style="flex:1;min-width:0;font-size:14px;line-height:1.6;color:${p.body}">${e(r)}</div>
  </div>`, i === 0))
}

function secNextSteps(c, p) {
  return lines(c.form.next_steps).map(stripMarker).filter(Boolean).map((s, i) => numberedRow(p, i + 1, s, i === 0))
}

function secTeam(c, p) {
  let members = Array.isArray(c.idea._pdf_team_members) ? c.idea._pdf_team_members : []
  members = members.filter(m => m && String(m.name || '').trim())
  if (!members.length) {
    const t = (c.idea._pdf_team && c.idea._pdf_team.name) ? c.idea._pdf_team : parseJSON(c.idea.team)
    if (t && String(t.name || '').trim()) members = [t]
  }
  // Up to 3 people: name, role and bio. Larger teams: a compact two-column roster of names and roles.
  if (members.length <= 3) {
    return members.map((m, i) => ruled(p, `<div style="display:flex;flex-direction:column;gap:6px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
        <div style="font-size:17px;font-weight:600;color:${p.text};overflow-wrap:anywhere">${e(m.name)}</div>
        ${m.role ? `<div style="flex-shrink:0;max-width:55%;font-size:10px;letter-spacing:1px;color:${p.muted};text-transform:uppercase;text-align:right">${e(m.role)}</div>` : ''}
      </div>
      ${m.bio ? para(p, m.bio) : ''}
    </div>`, i === 0))
  }
  const cell = (m) => `<div style="border-top:1px solid ${p.rule};padding-top:6px"><div style="font-size:14px;font-weight:600;line-height:1.3;color:${p.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(m.name)}</div><div style="font-size:11px;line-height:1.35;color:${p.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:15px">${e(m.role || '')}</div></div>`
  const row = (i) => `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px">${cell(members[i])}${members[i + 1] ? cell(members[i + 1]) : '<div></div>'}</div>`
  const blocks = []
  for (let i = 0; i < members.length; i += 4) blocks.push(`<div style="display:flex;flex-direction:column;gap:8px">${row(i)}${members[i + 2] ? row(i + 2) : ''}</div>`)
  return blocks
}

function secOrigin(c, p) {
  const text = c.idea._pdf_origin_story || c.idea.origin_story
  return paragraphs(text).map(t => para(p, t))
}

function secValidation(c, p) {
  const src = c.idea._pdf_customer_validation
  const cv = (src && (src.waitlist || src.interviews || src.pilots || src.stage)) ? src : parseJSON(c.idea.customer_validation)
  if (!cv) return []
  const stats = [['waitlist', 'Waitlist'], ['interviews', 'Interviews'], ['pilots', 'Pilots'], ['stage', 'Stage']]
    .filter(([k]) => cv[k] !== undefined && cv[k] !== null && String(cv[k]).trim())
  if (!stats.length) return []
  return [`<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 16px">${stats.map(([k, l]) => `<div style="border-top:2px solid ${p.bar};padding-top:12px">${figure(p, cv[k], l, k === 'stage' ? 17 : 24)}</div>`).join('')}</div>`]
}

function secTraction(c, p) {
  let ms = Array.isArray(c.idea._pdf_traction_milestones) && c.idea._pdf_traction_milestones.length ? c.idea._pdf_traction_milestones : null
  if (!ms) { const t = parseJSON(c.idea.traction); ms = t && Array.isArray(t.milestones) ? t.milestones : [] }
  ms = ms.filter(m => m && String(m.label || '').trim())
  return ms.map((m, i) => {
    const st = m.status === 'done' ? 'done' : m.status === 'in-progress' ? 'progress' : 'planned'
    const dot = st === 'done' ? `background:${p.solidBg}` : st === 'progress' ? `border:4px solid ${p.accent}` : `border:1.5px solid ${p.muted}`
    const tag = st === 'done'
      ? `<div style="font-size:10px;font-weight:700;letter-spacing:1px;color:${p.solidText};background:${p.solidBg};padding:4px 8px">DONE</div>`
      : st === 'progress'
      ? `<div style="font-size:10px;font-weight:700;letter-spacing:1px;color:${p.accent};border:1px solid ${p.accent};padding:3px 7px">IN PROGRESS</div>`
      : `<div style="font-size:10px;font-weight:700;letter-spacing:1px;color:${p.muted}">PLANNED</div>`
    return ruled(p, `<div style="display:flex;gap:14px;align-items:center">
      <div style="flex-shrink:0;width:14px;height:14px;border-radius:7px;${dot}"></div>
      <div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600;color:${p.text}">${e(m.label)}</div>${m.date ? `<div style="font-size:12px;color:${p.muted}">${e(m.date)}</div>` : ''}</div>
      <div style="flex-shrink:0">${tag}</div>
    </div>`, i === 0)
  })
}

function secRevenueDetails(c, p) {
  const rows = [['Who pays', c.idea.who_pays], ['Revenue streams', c.idea.revenue_streams], ['Pricing power', c.idea.pricing_power], ['Revenue potential', c.idea.revenue_potential], ['Business stage', c.idea.business_stage]]
    .filter(([, v]) => v && String(v).trim())
  return rows.map(([l, v], i) => kv(p, l, v, i === 0))
}

function secLandscape(c, p) {
  const cl = parseJSON(c.idea.competitive_landscape)
  if (!cl) return []
  const self = c.idea.title || 'Your idea'

  if (cl.format === 'table' && cl.table?.competitors?.length) {
    const cols = cl.table.columns || []
    const cell = `padding:14px 4px;display:flex;justify-content:center;align-items:center`
    const head = `<div></div>${cols.map(col => `<div style="padding:8px 4px;font-size:10px;font-weight:700;letter-spacing:0.5px;color:${p.muted};text-align:center;text-transform:uppercase;overflow-wrap:anywhere">${e(col)}</div>`).join('')}`
    const selfRow = `<div style="padding:14px 12px;background:${p.solidBg};color:${p.solidText};font-size:14px;font-weight:700;overflow-wrap:anywhere">${e(self)}</div>${cols.map(() => `<div style="${cell};background:${p.solidBg};color:${p.solidText}">${CHECK}</div>`).join('')}`
    const rows = cl.table.competitors.map(co => `<div style="padding:14px 12px 14px 0;font-size:14px;color:${p.body};border-bottom:1px solid ${p.rule};overflow-wrap:anywhere">${e(co.name)}</div>${cols.map((_, i) => `<div style="${cell};border-bottom:1px solid ${p.rule};color:${(co.checks || [])[i] ? p.text : p.muted};font-size:14px">${(co.checks || [])[i] ? CHECK : '–'}</div>`).join('')}`).join('')
    return [`<div style="display:grid;grid-template-columns:1.5fr repeat(${Math.max(cols.length, 1)},minmax(0,1fr));align-items:stretch">${head}${selfRow}${rows}</div>`]
  }

  if (cl.format === 'matrix' && cl.matrix?.competitors?.length) {
    const W = 384, H = 300
    const me = cl.matrix.self || { x: 0.8, y: 0.8 }
    const pos = (pt, r) => ({ left: Math.round(Math.min(Math.max(pt.x, 0), 1) * (W - 2 * r - 8) + 4), top: Math.round((1 - Math.min(Math.max(pt.y, 0), 1)) * (H - 2 * r - 8) + 4) })
    const dot = (pt, name, isSelf) => {
      const r = isSelf ? 10 : 6
      const { left, top } = pos(pt, r)
      const right = left > W * 0.55
      const label = right
        ? `<div style="position:absolute;right:${W - left + 6}px;top:${top + r - 9}px;font-size:12px;font-weight:${isSelf ? 700 : 400};color:${isSelf ? p.text : p.body};white-space:nowrap">${e(name)}</div>`
        : `<div style="position:absolute;left:${left + 2 * r + 6}px;top:${top + r - 9}px;font-size:12px;font-weight:${isSelf ? 700 : 400};color:${isSelf ? p.text : p.body};white-space:nowrap">${e(name)}</div>`
      return `<div style="position:absolute;left:${left}px;top:${top}px;width:${2 * r}px;height:${2 * r}px;border-radius:${r}px;background:${isSelf ? p.accent : p.muted}"></div>${label}`
    }
    return [`<div style="display:flex;flex-direction:column;gap:8px">
      <div style="font-size:11px;font-weight:600;letter-spacing:1px;color:${p.muted};text-transform:uppercase">${e(cl.matrix.axis_y?.label || '')} &uarr;</div>
      <div style="position:relative;width:${W}px;height:${H}px;border-left:1.5px solid ${p.text};border-bottom:1.5px solid ${p.text};overflow:hidden">
        <div style="position:absolute;left:0;top:${H / 2}px;width:${W}px;height:1px;background:${p.rule}"></div>
        <div style="position:absolute;left:${W / 2}px;top:0;width:1px;height:${H}px;background:${p.rule}"></div>
        ${cl.matrix.competitors.map(co => dot(co, co.name, false)).join('')}
        ${dot(me, self, true)}
      </div>
      <div style="font-size:11px;font-weight:600;letter-spacing:1px;color:${p.muted};text-align:right;text-transform:uppercase">${e(cl.matrix.axis_x?.label || '')} &rarr;</div>
    </div>`]
  }

  if (cl.format === 'gap' && cl.gap?.competitors?.length) {
    const stages = cl.gap.stages || []
    if (!stages.length) return []
    const gs = cl.gap.gap_start ?? 1, ge = cl.gap.gap_end ?? 2
    const stageRow = (i, inGap) => {
      const names = cl.gap.competitors.filter(co => co.stage === i).map(co => co.name)
      const fg = inGap ? p.solidText : p.text, mu = inGap ? p.solidMuted : p.muted
      return `<div style="display:flex;gap:14px;align-items:flex-start">
        <div style="flex-shrink:0;width:26px;height:26px;border-radius:13px;${inGap ? `background:${p.solidText};color:${p.solidBg}` : `border:1.5px solid ${p.muted};color:${p.body}`};font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center">${i + 1}</div>
        <div style="min-width:0"><div style="font-size:14px;font-weight:600;color:${fg}">${e(stages[i])}</div>${names.length ? `<div style="font-size:13px;color:${mu};margin-top:2px">${names.map(e).join(' &middot; ')}</div>` : ''}</div>
      </div>`
    }
    const before = [], inside = [], after = []
    stages.forEach((_, i) => (i < gs ? before : i > ge ? after : inside).push(i))
    return [`<div style="display:flex;flex-direction:column;gap:14px">
      ${before.map(i => stageRow(i, false)).join('')}
      <div style="background:${p.solidBg};padding:16px;display:flex;flex-direction:column;gap:14px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
          <div style="font-size:11px;font-weight:600;letter-spacing:2px;color:${p.solidMuted}">THE GAP</div>
          <div style="font-size:17px;font-weight:700;color:${p.solidText};text-align:right;overflow-wrap:anywhere">${e(self)}</div>
        </div>
        ${inside.map(i => stageRow(i, true)).join('')}
      </div>
      ${after.map(i => stageRow(i, false)).join('')}
    </div>`]
  }
  return []
}

function secProjections(c, p) {
  const rev = c.idea._pdf_revenue_projections
  if (!rev || !(rev.startingUsers || rev.monthlyGrowthRate || rev.conversionRate)) return []
  const bm = parseJSON(c.idea.business_model) || c.bmValue || null
  let bmPrice = null
  for (const model of (bm?.models || [])) {
    const key = model.toLowerCase().replace(/\s*\/\s*/g, '_').replace(/\s+/g, '_').replace(/[^a-z_]/g, '')
    if (bm?.[key]?.paidPrice) { bmPrice = bm[key].paidPrice; break }
  }
  const priceText = rev.paidPriceOverride || bmPrice
  const paidPrice = parseFloat(String(priceText || '').replace(/[^0-9.]/g, ''))
  if (!paidPrice) return []   // no price written by the author: no projection
  const isOneTime = (bm?.models || []).includes('One-time Purchase')
  const startingUsers = parseFloat(rev.startingUsers) || 100
  const growthPct = parseFloat(rev.monthlyGrowthRate) || 10
  const convPct = parseFloat(rev.conversionRate) || 5
  const calc = (months, mult) => {
    const units = startingUsers * Math.pow(1 + (growthPct / 100) * mult, months)
    return isOneTime ? units * paidPrice : units * (convPct / 100) * paidPrice
  }
  const fmt = n => n >= 1000000 ? '$' + (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? '$' + Math.round(n / 1000) + 'K' : '$' + Math.round(n)
  const sc = [['Conserv.', 0.5], ['Moderate', 1], ['Optimistic', 2]]
  const th = (t, hi) => `<div style="padding:10px 8px;font-size:10px;font-weight:700;letter-spacing:1px;text-align:right;text-transform:uppercase;${hi ? `background:${p.solidBg};color:${p.solidText}` : `color:${p.muted}`}">${t}</div>`
  const td = (t, hi) => `<div style="padding:13px 8px;font-size:18px;text-align:right;${hi ? `font-weight:700;background:${p.solidBg};color:${p.solidText}` : `font-weight:600;color:${p.text};border-top:1px solid ${p.rule}`}">${t}</div>`
  const table = `<div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr))">
    <div></div>${sc.map(([l], i) => th(l, i === 1)).join('')}
    ${[6, 12, 24].map(m => `<div style="padding:13px 0;font-size:13px;color:${p.body};border-top:1px solid ${p.rule}">${m} months</div>${sc.map(([, mult], i) => td(e(fmt(calc(m, mult))), i === 1)).join('')}`).join('')}
  </div>`
  const a = (l, v) => `<div style="font-size:13px;color:${p.body}">${l} <span style="font-weight:700;color:${p.text}">${e(v)}</span></div>`
  const assumptions = `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px;border-top:1px solid ${p.rule};padding-top:${GAP}px">
    ${a('Starting users', startingUsers)}${a('Monthly growth', growthPct + '%')}${isOneTime ? '' : a('Conversion', convPct + '%')}${a('Price', String(priceText) + (isOneTime || /\//.test(String(priceText)) ? '' : '/mo'))}
  </div>`
  return [
    `<div style="font-size:12px;font-weight:600;color:${p.muted}">${isOneTime ? 'Revenue' : 'Monthly recurring revenue'}</div>`,
    table, assumptions,
    `<div style="font-size:12px;font-style:italic;color:${p.muted}">Model assumptions only. Actual results will vary.</div>`,
  ]
}

// Business model: one band per selected model. Returns [{ title, build(p) }].
function businessModels(bmValue) {
  const out = []
  const L = (t) => lines(t)
  for (const type of (bmValue?.models || [])) {
    const KEY = { 'Freemium / SaaS': 'freemium', 'Marketplace': 'marketplace', 'Subscription': 'subscription', 'One-time Purchase': 'oneTime', 'Advertising': 'advertising', 'Licensing': 'licensing', 'Transaction Fees': 'transactionFees', 'Hardware + Software': 'hardwareSoftware', 'Other': 'other' }[type]
    const d = (KEY && bmValue[KEY]) || {}
    let title = type
    let build = null
    const rows = (p, big, list) => {
      const b = []
      if (big && big[0]) b.push(figure(p, big[0], big[1]))
      list.filter(([, v]) => v && String(v).trim()).forEach(([l, v], i) => b.push(kv(p, l, v, i === 0 && !b.length)))
      return b
    }
    if (type === 'Freemium / SaaS') {
      const free = L(d.freeTier), paid = L(d.paidFeatures)
      if (free.length || paid.length || d.paidPrice) build = (p) => [columns(p, [column(p, 'Free tier', '', free), column(p, 'Paid tier', d.paidPrice || '', paid)])]
    } else if (type === 'Subscription') {
      const tiers = (d.tiers || []).filter(t => t && (t.name || t.price || t.features))
      if (tiers.length) build = (p) => { const b = []; for (let i = 0; i < tiers.length; i += 3) b.push(columns(p, tiers.slice(i, i + 3).map(t => column(p, t.name || '', t.price || '', L(t.features))))); return b }
    } else if (type === 'Marketplace') {
      const buyers = L(d.buyers), sellers = L(d.sellers)
      if (buyers.length || sellers.length || d.commission) build = (p) => {
        const b = []
        if (d.commission) b.push(figure(p, d.commission, 'Commission'))
        if (buyers.length || sellers.length) b.push(columns(p, [column(p, 'Buyers', '', buyers), column(p, 'Sellers', '', sellers)]))
        return b
      }
    } else if (type === 'Transaction Fees') {
      if (d.fee || d.whoPays || d.flow) build = (p) => rows(p, [d.fee, 'Fee'], [['Who pays', d.whoPays], ['Money flow', d.flow]])
    } else if (type === 'One-time Purchase') {
      if (d.price || d.included || d.upsells) build = (p) => rows(p, [d.price, 'One-time price'], [['Included', d.included], ['Upsells', d.upsells]])
    } else if (type === 'Hardware + Software') {
      if (d.hardwarePrice || d.softwarePrice || d.recurring) build = (p) => {
        const b = []
        const figs = [[d.hardwarePrice, 'Hardware'], [d.softwarePrice, 'Software']].filter(([v]) => v)
        if (figs.length) b.push(columns(p, figs.map(([v, l]) => `<div style="border-top:2px solid ${p.bar};padding-top:12px">${figure(p, v, l, 22)}</div>`)))
        if (d.recurring) b.push(kv(p, 'Recurring', d.recurring, !b.length))
        return b
      }
    } else if (type === 'Advertising') {
      if (d.revenue || d.formats || d.audience) build = (p) => rows(p, [d.revenue, 'How ads are priced'], [['Formats', d.formats], ['Audience', d.audience]])
    } else if (type === 'Licensing') {
      if (d.royalties || d.licensees || d.exclusivity) build = (p) => rows(p, [d.royalties, 'Royalties'], [['Licensees', d.licensees], ['Exclusivity', d.exclusivity]])
    } else if (type === 'Other') {
      title = d.name || ''
      const cards = (d.cards || []).map(cd => ({ title: cd.title || '', items: (cd.items || []).map(s => String(s || '').trim()).filter(Boolean) })).filter(cd => cd.items.length)
      if (cards.length) build = (p) => {
        const b = []
        cards.forEach((cd, ci) => {
          cd.items.forEach((item, ii) => paragraphs(item).forEach((t, ti) => {
            const lead = ii === 0 && ti === 0
            b.push(`<div style="${lead && ci > 0 ? `border-top:1px solid ${p.rule};padding-top:${GAP}px;` : ''}">${lead && cd.title ? `<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${p.muted};text-transform:uppercase;margin-bottom:6px">${e(cd.title)}</div>` : ''}${para(p, t)}</div>`)
          }))
        })
        return b
      }
    }
    if (build) out.push({ title, build })
  }
  return out
}

const SIMPLE = {
  problem: secProblem, solution: secSolution, how_it_works: secHowItWorks, market_size: secMarketSize,
  target_market: secTargetMarket, competitive_advantage: secAdvantage, risks: secRisks, next_steps: secNextSteps,
  team: secTeam, origin_story: secOrigin, customer_validation: secValidation, traction: secTraction,
  revenue_details: secRevenueDetails, competitive_landscape: secLandscape, revenue_projections: secProjections,
}

// ---------- page furniture ----------

const logo = (p, size) => `<span class="pt-logo" style="font-size:${size}px;color:${p.text}">Eurek<span style="color:${p.logoAI}">AI</span>dea</span>`

function navHTML(p, title) {
  return `<div class="pt-nav" style="display:flex;justify-content:space-between;align-items:center;gap:16px;padding-bottom:20px">
    <div style="flex-shrink:0;line-height:20px">${logo(p, 16)}</div>
    <div style="font-size:11px;line-height:20px;color:${p.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0">${e(title)}</div>
  </div>`
}

function footHTML(p) {
  return `<div class="pt-foot" style="margin-top:auto;padding-top:16px;display:flex;justify-content:space-between;font-size:10px;line-height:14px;letter-spacing:1px;color:${p.muted}"><div>CONFIDENTIAL</div><div>myeurekaidea.com</div></div>`
}

function logoStripHTML() {
  const p = PAL.dark
  return `<div class="pt-strip" style="flex-shrink:0;background:${p.bg};border-top:1px solid ${p.rule};padding:18px 28px;display:flex;justify-content:space-between;align-items:center"><div style="line-height:26px">${logo(p, 20)}</div><div style="font-size:10px;letter-spacing:2px;color:${p.accent}">MYEUREKAIDEA.COM</div></div>`
}

function headBlock(p, label, headline, cont) {
  return `<div>
    ${label ? `<div style="font-size:11px;font-weight:600;letter-spacing:2px;color:${p.accent}">${e(label)}${cont ? ' (CONTINUED)' : ''}</div>` : ''}
    ${headline && !cont ? `<h2 style="margin:${label ? 10 : 0}px 0 0;font-size:22px;font-weight:600;line-height:1.3;color:${p.text};overflow-wrap:anywhere">${e(headline)}</h2>` : ''}
  </div>`
}

function coverHTML(c) {
  const p = PAL.dark
  const cats = Array.isArray(c.idea.category) ? c.idea.category : Array.isArray(c.idea.categories) ? c.idea.categories : []
  const date = c.idea.created_at ? new Date(c.idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
  const amount = marketAmounts(c.form.market_size)[0]
  const looking = c.idea.looking_for || c.idea.terms
  const cells = [['Date', date], ['Market size', amount], ['Looking for', looking], ['Status', 'Confidential']].filter(([, v]) => v && String(v).trim())
  return `<div class="page" style="background:${p.bg};color:${p.text};border-top:4px solid ${p.bar}">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:28px 28px 0">
      <div>${logo(p, 22)}</div>
      <div style="font-size:10px;letter-spacing:2px;color:${p.accent};border:1px solid rgba(123,159,247,0.5);border-radius:20px;padding:5px 12px">CONFIDENTIAL</div>
    </div>
    <div style="flex-grow:1;display:flex;flex-direction:column;justify-content:center;padding:0 28px;gap:18px">
      ${cats.length ? `<div style="font-size:11px;letter-spacing:1.5px;color:${p.accent};text-transform:uppercase">${cats.map(e).join(' &middot; ')}</div>` : ''}
      <h1 style="margin:0;font-size:32px;font-weight:700;line-height:1.2;overflow-wrap:anywhere">${e(c.idea.title)}</h1>
      ${String(c.form.tagline || '').trim() ? `<div style="font-size:15px;line-height:1.55;color:${p.body}">${e(c.form.tagline)}</div>` : ''}
      <div style="height:1px;background:rgba(255,255,255,0.22)"></div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
        ${cells.map(([l, v]) => `<div><div style="font-size:10px;letter-spacing:1.5px;color:${p.muted};text-transform:uppercase">${l}</div><div style="font-size:14px;font-weight:600;margin-top:3px;overflow-wrap:anywhere">${e(v)}</div></div>`).join('')}
      </div>
    </div>
    ${c.idea.blockchain_hash ? `<div style="padding:0 28px 24px;font-family:monospace;font-size:8px;line-height:1.5;color:${p.muted};word-break:break-all">${e(c.idea.blockchain_hash)}</div>` : '<div style="height:24px"></div>'}
  </div>`
}

// ---------- measuring and packing ----------

function ensureFonts() {
  if (typeof document === 'undefined') return Promise.resolve()
  if (!document.getElementById('pitch-template-fonts')) {
    const link = document.createElement('link')
    link.id = 'pitch-template-fonts'
    link.rel = 'stylesheet'
    link.href = FONT_HREF
    document.head.appendChild(link)
  }
  const wait = (async () => {
    try {
      await Promise.all(["400 14px 'DM Sans'", "600 22px 'DM Sans'", "700 26px 'DM Sans'", "italic 400 18px 'DM Sans'", "300 16px 'Outfit'"].map(f => document.fonts.load(f)))
      await document.fonts.ready
    } catch { /* fall back to system fonts */ }
  })()
  return Promise.race([wait, new Promise(r => setTimeout(r, 3500))])
}

function imageLoads(url) {
  return new Promise(resolve => {
    if (!url) return resolve(false)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const t = setTimeout(() => resolve(false), 5000)
    img.onload = () => { clearTimeout(t); resolve(true) }
    img.onerror = () => { clearTimeout(t); resolve(false) }
    img.src = url
  })
}

const bandHeight = (hs) => 2 * BAND_PAD + hs.reduce((a, b) => a + b, 0) + GAP * Math.max(hs.length - 1, 0)

export async function buildPitchHTML({ form = {}, idea = {}, userEmail, bmValue = null, headlines = {}, hidden = {}, productImageUrl = null }) {
  await ensureFonts()
  const imgOk = await imageLoads(productImageUrl)
  const c = { form, idea, userEmail, bmValue, productImageUrl: imgOk ? productImageUrl : null }
  const headlineOf = (key) => String(headlines?.[key] || '').trim().slice(0, PITCH_LIMITS.title)

  // 1. Collect bands in order. tone alternates over the bands that actually exist.
  const raw = []
  for (const { key, chapter } of PITCH_SECTIONS) {
    if (hidden?.[key]) continue
    if (key === 'business_model') {
      businessModels(bmValue).forEach((m, i) => raw.push({ key, chapter, label: i === 0 ? BAND_LABEL[key] : '', contLabel: BAND_LABEL[key], headline: m.title, build: m.build }))
    } else {
      raw.push({ key, chapter, label: BAND_LABEL[key], contLabel: BAND_LABEL[key], headline: headlineOf(key), build: (p) => SIMPLE[key](c, p) })
    }
  }
  const bands = []
  for (const r of raw) {
    const dark = bands.length % 2 === 0
    const p = dark ? PAL.dark : PAL.light
    const body = r.build(p).filter(Boolean)
    if (!body.length) continue      // empty section: nothing is shown
    bands.push({ ...r, dark, p, body, head: headBlock(p, r.label, r.headline, false), contHead: headBlock(p, r.contLabel, '', true) })
  }

  // 2. Measure every block at the real page width.
  const host = document.createElement('div')
  host.id = 'pdf-preview'
  host.style.cssText = `position:fixed;left:-99999px;top:0;width:${PAGE_W}px;visibility:hidden;pointer-events:none`
  host.innerHTML = `<style>${CSS.replace(/@import[^;]+;/, '')}</style><div class="page" style="height:auto;overflow:visible">
    <div class="band"><div data-m="nav">${navHTML(PAL.dark, idea.title || '')}</div><div data-m="foot" style="display:flex;flex-direction:column">${footHTML(PAL.dark)}</div></div>
    <div data-m="strip">${logoStripHTML()}</div>
    ${bands.map((b, i) => `<div class="band"><div class="band-blocks"><div data-m="h${i}">${b.head}</div><div data-m="c${i}">${b.contHead}</div>${b.body.map((blk, j) => `<div data-m="b${i}_${j}">${blk}</div>`).join('')}</div></div>`).join('')}
  </div>`
  document.body.appendChild(host)
  const H = (id) => Math.ceil(host.querySelector(`[data-m="${id}"]`).getBoundingClientRect().height)
  const NAV_H = H('nav'), FOOT_H = H('foot'), STRIP_H = H('strip')
  bands.forEach((b, i) => { b.hHead = H(`h${i}`); b.hCont = H(`c${i}`); b.hBody = b.body.map((_, j) => H(`b${i}_${j}`)) })
  document.body.removeChild(host)

  // 3. Pack. Text never shrinks. A band that does not fit moves whole to the next page.
  //    A band taller than a page is split between blocks with a "(continued)" label.
  //    A heading is never left alone: it always travels with at least one block.
  const AVAIL = PAGE_H - NAV_H - FOOT_H
  const continued = []
  const pages = []
  let cur = [], used = 0
  const close = () => { if (cur.length) { pages.push({ pieces: cur, used }); cur = []; used = 0 } }
  let chapter = null
  for (const b of bands) {
    if (chapter !== null && b.chapter !== chapter) close()
    chapter = b.chapter
    const full = bandHeight([b.hHead, ...b.hBody])
    if (used + full <= AVAIL) { cur.push({ band: b, blocks: [b.head, ...b.body] }); used += full; continue }
    if (full <= AVAIL) { close(); cur.push({ band: b, blocks: [b.head, ...b.body] }); used = full; continue }
    close()
    continued.push(PITCH_SECTIONS.find(s => s.key === b.key)?.label || b.key)
    let j = 0, first = true
    while (j < b.body.length) {
      const hs = [first ? b.hHead : b.hCont]
      const blocks = [first ? b.head : b.contHead]
      do { hs.push(b.hBody[j]); blocks.push(b.body[j]); j++ }
      while (j < b.body.length && bandHeight([...hs, b.hBody[j]]) <= AVAIL)
      cur.push({ band: b, blocks }); used = bandHeight(hs)
      if (j < b.body.length) close()
      first = false
    }
  }
  close()

  // 4. Render pages. First band carries the header, last band stretches and carries the footer.
  const lastIdx = pages.length - 1
  const pageHTML = pages.map((pg, pi) => {
    const strip = pi === lastIdx && (NAV_H + pg.used + STRIP_H <= PAGE_H)
    const inner = pg.pieces.map((pc, i) => {
      const p = pc.band.p
      const isFirst = i === 0, isLast = i === pg.pieces.length - 1
      const solo = pg.pieces.length === 1 && pg.used < AVAIL * 0.7
      return `<div class="band" style="background:${p.bg};flex-grow:1;">
        ${isFirst ? navHTML(p, idea.title || '') : ''}
        <div class="band-blocks" style="flex-grow:1;${solo ? 'justify-content:center;' : ''}">${pc.blocks.join('')}</div>
        ${isLast && !strip ? footHTML(p) : ''}
      </div>`
    }).join('')
    return `<div class="page">${inner}${strip ? logoStripHTML() : ''}</div>`
  }).join('')

  const html = `<style>${CSS}</style><div class="pdf-wrap">${coverHTML(c)}${pageHTML}</div>`
  return { html, continued }
}
