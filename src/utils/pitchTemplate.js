import { escH } from './businessModel.js'

const e = escH

export const PITCH_SECTIONS = [
  { key: 'problem',               label: 'Problem' },
  { key: 'solution',              label: 'Solution' },
  { key: 'how_it_works',          label: 'How It Works' },
  { key: 'market_size',           label: 'Market Size' },
  { key: 'target_market',         label: 'Target Market' },
  { key: 'business_model',        label: 'Business Model' },
  { key: 'competitive_advantage', label: 'Competitive Advantage' },
  { key: 'risks',                 label: 'Risks & Challenges' },
  { key: 'next_steps',            label: 'Next Steps' },
  { key: 'team',                  label: 'Team' },
  { key: 'origin_story',          label: 'Origin Story' },
  { key: 'customer_validation',   label: 'Customer Validation' },
  { key: 'traction',              label: 'Traction & Milestones' },
  { key: 'revenue_details',       label: 'Revenue Details' },
  { key: 'competitive_landscape', label: 'Competitive Landscape' },
  { key: 'revenue_projections',   label: 'Revenue Projections' },
]

function logoDark(size) {
  return `<span style="font-family:'Outfit',sans-serif;font-weight:300;font-size:${size}px">Eurek<span style="color:#9b9ff7">AI</span>dea</span>`
}
function logoLight(size) {
  return `<span style="font-family:'Outfit',sans-serif;font-weight:300;font-size:${size}px;color:#0e0e1f">Eurek<span style="color:#5a5fd6">AI</span>dea</span>`
}
const footerLight = `<div style="display:flex;justify-content:space-between;padding:14px 28px 18px;font-size:10px;letter-spacing:1px;color:#5f5e5a;flex-shrink:0"><div>CONFIDENTIAL</div><div>myeurekaidea.com</div></div>`
const footerDarkInner = `<div style="display:flex;justify-content:space-between;padding:0 0 18px;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,0.62);flex-shrink:0"><div>CONFIDENTIAL</div><div>myeurekaidea.com</div></div>`

function navDark(title) {
  return `<div style="display:flex;justify-content:space-between;align-items:center">${logoDark(16)}<div style="font-size:11px;color:rgba(255,255,255,0.62)">${e(title)}</div></div>`
}
function navLight(title) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:24px 28px 0;flex-shrink:0">${logoLight(16)}<div style="font-size:11px;color:#5f5e5a">${e(title)}</div></div>`
}
function labelDark(num, text) {
  return `<div style="font-size:11px;font-weight:600;letter-spacing:2px;color:#a9bcf9">${num} &nbsp; ${text}</div>`
}
function labelLight(num, text) {
  return `<div style="font-size:11px;font-weight:600;letter-spacing:2px;color:#5a5fd6">${num} &nbsp; ${text}</div>`
}
function divLight() { return `<div style="height:1px;background:rgba(44,44,42,0.12)"></div>` }
function divDark()  { return `<div style="height:1px;background:rgba(255,255,255,0.14)"></div>` }

function splitToItems(text) {
  const lines = (text || '').split('\n').map(s => s.trim()).filter(Boolean)
  if (lines.length >= 2) return lines
  const sentences = (text || '').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
  if (sentences.length >= 2) return sentences
  return text?.trim() ? [text.trim()] : []
}

function bmSection(model, data, num, sectionTitle, isDark) {
  const borderColor = isDark ? '#8b8ff7' : '#0e0e1f'
  const subColor    = isDark ? 'rgba(255,255,255,0.62)' : '#5f5e5a'
  const chipColor   = isDark ? '#a9bcf9' : '#5f5e5a'
  const bodyColor   = isDark ? 'rgba(255,255,255,0.86)' : '#2c2c2a'
  const h2Color     = isDark ? '#ffffff' : '#0e0e1f'
  const divBorder   = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(44,44,42,0.12)'
  const modelTitle  = model === 'Other' ? (data.name || 'Custom Model') : model
  let inner = ''

  switch (model) {
    case 'Freemium / SaaS': {
      const freeItems = (data.freeTier || '').split('\n').map(s => s.trim()).filter(Boolean)
      const paidItems = (data.paidFeatures || '').split('\n').map(s => s.trim()).filter(Boolean)
      inner = `<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
        <div style="border-top:2px solid ${borderColor};padding-top:12px;display:flex;flex-direction:column;gap:8px">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${chipColor}">FREE TIER</div>
          <div style="font-size:24px;font-weight:700;color:${h2Color}">$0</div>
          ${freeItems.map(f => `<div style="font-size:13px;line-height:1.55;color:${bodyColor}">${e(f)}</div>`).join('')}
        </div>
        <div style="background:#0e0e1f;color:#ffffff;padding:14px;display:flex;flex-direction:column;gap:8px">
          <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:#a9bcf9">PAID TIER</div>
          <div style="font-size:24px;font-weight:700">${e(data.paidPrice || '')}</div>
          ${paidItems.map(f => `<div style="font-size:13px;line-height:1.55;color:rgba(255,255,255,0.86)">${e(f)}</div>`).join('')}
        </div>
      </div>`
      break
    }
    case 'Subscription': {
      const tiers = (data.tiers || []).filter(t => t.name || t.price || t.features)
      inner = `<div style="display:grid;grid-template-columns:repeat(${Math.min(tiers.length || 1, 3)},minmax(0,1fr));gap:14px">
        ${tiers.slice(0, 3).map(t => `
          <div style="border-top:2px solid ${borderColor};padding-top:12px;display:flex;flex-direction:column;gap:6px">
            <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${chipColor}">${e(t.name || 'Tier')}</div>
            <div style="font-size:20px;font-weight:700;color:${h2Color}">${e(t.price || '')}</div>
            ${(t.features || '').split('\n').filter(Boolean).map(f => `<div style="font-size:13px;line-height:1.5;color:${bodyColor}">${e(f.trim())}</div>`).join('')}
          </div>
        `).join('')}
      </div>`
      break
    }
    case 'Marketplace': {
      const buyerItems = (data.buyers || '').split('\n').map(s => s.trim()).filter(Boolean)
      const sellerItems = (data.sellers || '').split('\n').map(s => s.trim()).filter(Boolean)
      inner = `
        ${data.commission ? `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
          <span></span>
          <div style="text-align:right">
            <div style="font-size:24px;font-weight:700;color:${h2Color}">${e(data.commission)}</div>
            <div style="font-size:10px;letter-spacing:1px;color:${subColor}">COMMISSION</div>
          </div>
        </div>` : ''}
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
          <div style="border-top:2px solid ${borderColor};padding-top:12px;display:flex;flex-direction:column;gap:8px">
            <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${chipColor}">BUYERS</div>
            ${buyerItems.map(b => `<div style="font-size:13px;line-height:1.55;color:${bodyColor}">${e(b)}</div>`).join('')}
          </div>
          <div style="border-top:2px solid #5a5fd6;padding-top:12px;display:flex;flex-direction:column;gap:8px">
            <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${chipColor}">SELLERS</div>
            ${sellerItems.map(s => `<div style="font-size:13px;line-height:1.55;color:${bodyColor}">${e(s)}</div>`).join('')}
          </div>
        </div>`
      break
    }
    case 'One-time Purchase': {
      const includedItems = (data.included || '').split('\n').map(s => s.trim()).filter(Boolean)
      inner = `
        ${data.price ? `<div><div style="font-size:34px;font-weight:700;line-height:1.1;color:${h2Color}">${e(data.price)}</div><div style="font-size:10px;letter-spacing:1px;color:${subColor};margin-top:4px">ONE-TIME</div></div>` : ''}
        ${includedItems.length ? `<div style="display:flex;gap:14px;align-items:baseline;padding-top:12px;border-top:1px solid ${divBorder}"><div style="flex-shrink:0;width:96px;font-size:10px;letter-spacing:1px;color:${subColor}">INCLUDED</div><div style="font-size:14px;line-height:1.6;color:${bodyColor}">${includedItems.map(i => e(i)).join('<br>')}</div></div>` : ''}
        ${data.upsells ? `<div style="display:flex;gap:14px;align-items:baseline;padding-top:12px;border-top:1px solid ${divBorder}"><div style="flex-shrink:0;width:96px;font-size:10px;letter-spacing:1px;color:${subColor}">UPSELLS</div><div style="font-size:14px;line-height:1.6;color:${bodyColor}">${e(data.upsells)}</div></div>` : ''}`
      break
    }
    case 'Transaction Fees': {
      inner = `
        ${data.fee ? `<div><div style="font-size:34px;font-weight:700;line-height:1.1;color:${h2Color}">${e(data.fee)}</div><div style="font-size:10px;letter-spacing:1px;color:${subColor};margin-top:4px">PER TRANSACTION</div></div>` : ''}
        ${data.whoPays ? `<div style="display:flex;gap:14px;align-items:baseline;padding-top:12px;border-top:1px solid ${divBorder}"><div style="flex-shrink:0;width:96px;font-size:10px;letter-spacing:1px;color:${subColor}">WHO PAYS</div><div style="font-size:14px;line-height:1.5;color:${bodyColor}">${e(data.whoPays)}</div></div>` : ''}
        ${data.flow ? `<div style="display:flex;gap:14px;align-items:baseline;padding-top:12px;border-top:1px solid ${divBorder}"><div style="flex-shrink:0;width:96px;font-size:10px;letter-spacing:1px;color:${subColor}">MONEY FLOW</div><div style="font-size:14px;line-height:1.5;color:${bodyColor}">${e(data.flow)}</div></div>` : ''}`
      break
    }
    case 'Advertising': {
      const formats = (data.formats || '').split('\n').map(s => s.trim()).filter(Boolean)
      inner = `
        ${data.revenue ? `<div><div style="font-size:24px;font-weight:700;line-height:1.2;color:${h2Color}">${e(data.revenue)}</div><div style="font-size:10px;letter-spacing:1px;color:${subColor};margin-top:4px">HOW ADS ARE PRICED</div></div>` : ''}
        ${formats.length ? `<div style="display:flex;gap:14px;align-items:baseline;padding-top:12px;border-top:1px solid ${divBorder}"><div style="flex-shrink:0;width:96px;font-size:10px;letter-spacing:1px;color:${subColor}">FORMATS</div><div style="font-size:14px;line-height:1.6;color:${bodyColor}">${formats.map(f => e(f)).join('<br>')}</div></div>` : ''}
        ${data.audience ? `<div style="display:flex;gap:14px;align-items:baseline;padding-top:12px;border-top:1px solid ${divBorder}"><div style="flex-shrink:0;width:96px;font-size:10px;letter-spacing:1px;color:${subColor}">AUDIENCE</div><div style="font-size:14px;line-height:1.6;color:${bodyColor}">${e(data.audience)}</div></div>` : ''}`
      break
    }
    case 'Licensing': {
      const licensees = (data.licensees || '').split('\n').map(s => s.trim()).filter(Boolean)
      inner = `
        ${data.royalties ? `<div><div style="font-size:34px;font-weight:700;line-height:1.1;color:${h2Color}">${e(data.royalties)}</div><div style="font-size:10px;letter-spacing:1px;color:${subColor};margin-top:4px">ROYALTIES</div></div>` : ''}
        ${licensees.length ? `<div style="display:flex;gap:14px;align-items:baseline;padding-top:12px;border-top:1px solid ${divBorder}"><div style="flex-shrink:0;width:96px;font-size:10px;letter-spacing:1px;color:${subColor}">LICENSEES</div><div style="font-size:14px;line-height:1.6;color:${bodyColor}">${licensees.map(l => e(l)).join('<br>')}</div></div>` : ''}
        ${data.exclusivity ? `<div style="display:flex;gap:14px;align-items:baseline;padding-top:12px;border-top:1px solid ${divBorder}"><div style="flex-shrink:0;width:96px;font-size:10px;letter-spacing:1px;color:${subColor}">EXCLUSIVITY</div><div style="font-size:14px;line-height:1.6;color:${bodyColor}">${e(data.exclusivity)}</div></div>` : ''}`
      break
    }
    case 'Hardware + Software': {
      const recurring = (data.recurring || '').split('\n').map(s => s.trim()).filter(Boolean)
      inner = `
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
          ${data.hardwarePrice ? `<div style="border-top:2px solid ${borderColor};padding-top:12px"><div style="font-size:24px;font-weight:700;color:${h2Color}">${e(data.hardwarePrice)}</div><div style="font-size:10px;letter-spacing:1px;color:${subColor};margin-top:4px">HARDWARE</div></div>` : ''}
          ${data.softwarePrice ? `<div style="border-top:2px solid ${borderColor};padding-top:12px"><div style="font-size:24px;font-weight:700;color:${h2Color}">${e(data.softwarePrice)}</div><div style="font-size:10px;letter-spacing:1px;color:${subColor};margin-top:4px">SOFTWARE</div></div>` : ''}
        </div>
        ${recurring.length ? `<div style="display:flex;gap:14px;align-items:baseline;padding-top:12px;border-top:1px solid ${divBorder}"><div style="flex-shrink:0;width:96px;font-size:10px;letter-spacing:1px;color:${subColor}">RECURRING</div><div style="font-size:14px;line-height:1.6;color:${bodyColor}">${recurring.map(r => e(r)).join('<br>')}</div></div>` : ''}`
      break
    }
    default: {
      const cards = (data.cards || []).filter(c => c.title || (c.items || []).some(i => i?.trim()))
      const detailText = cards.length
        ? cards.map(c => [c.title, ...(c.items || []).filter(Boolean)].join('\n')).join('\n')
        : (data.details || '')
      inner = detailText ? `<div style="border-top:2px solid ${borderColor};padding-top:12px;display:flex;flex-direction:column;gap:10px"><div style="font-size:10px;font-weight:700;letter-spacing:1.5px;color:${chipColor}">DETAILS</div><div style="font-size:14px;line-height:1.65;color:${bodyColor}">${e(detailText)}</div></div>` : ''
    }
  }

  const labelFn = isDark ? labelDark : labelLight
  return `
    ${num ? labelFn(num, sectionTitle) : ''}
    <h2 style="margin:0;font-size:22px;font-weight:600;line-height:1.35;color:${h2Color}">${e(modelTitle)}</h2>
    ${inner}
  `
}

export async function buildPitchHTML({ form, idea, userEmail, bmValue, headlines = {}, hidden = {}, productImageUrl = null }) {
  const pages = []
  const continued = []

  const title   = idea.title || ''
  const dateStr = idea.created_at
    ? new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const marketNums  = (form.market_size || '').match(/\$[\d.]+[BMKbmk]+\+?/g) || []
  const isHidden    = (key) => hidden[key] === true
  const hl          = (key, fallback) => headlines[key]?.trim() || fallback

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Outfit:wght@300;400&display=swap');
    #pdf-preview .pdf-wrap { display:flex; flex-direction:column; gap:16px; width:440px; margin:0 auto; }
    #pdf-preview .page { width:440px; height:680px; box-sizing:border-box; overflow:hidden; display:flex; flex-direction:column; font-family:'DM Sans',sans-serif; }
  `

  // ── Cover ─────────────────────────────────────────────────────────────────
  pages.push(`<div class="page" style="background:#0e0e1f;color:#ffffff;border-top:4px solid #8b8ff7">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:28px 28px 0">
      ${logoDark(22)}
      <div style="font-size:10px;letter-spacing:2px;color:#a9bcf9;border:1px solid rgba(123,159,247,0.5);border-radius:20px;padding:5px 12px">CONFIDENTIAL</div>
    </div>
    <div style="flex-grow:1;display:flex;flex-direction:column;justify-content:center;padding:0 28px;gap:18px">
      <h1 style="margin:0;font-size:32px;font-weight:700;line-height:1.2">${e(title)}</h1>
      ${form.tagline ? `<div style="font-size:15px;line-height:1.55;color:rgba(255,255,255,0.8)">${e(form.tagline)}</div>` : ''}
      <div style="height:1px;background:rgba(255,255,255,0.22)"></div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
        <div><div style="font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,0.62)">DATE</div><div style="font-size:14px;font-weight:600;margin-top:3px">${e(dateStr)}</div></div>
        <div><div style="font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,0.62)">MARKET SIZE</div><div style="font-size:14px;font-weight:600;margin-top:3px">${e(marketNums[0] || '—')}</div></div>
        <div><div style="font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,0.62)">LOOKING FOR</div><div style="font-size:14px;font-weight:600;margin-top:3px">${e(idea.looking_for || 'Investors')}</div></div>
        <div><div style="font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,0.62)">STATUS</div><div style="font-size:14px;font-weight:600;margin-top:3px">Confidential</div></div>
      </div>
    </div>
    <div style="padding:0 28px 24px;font-family:monospace;font-size:9px;color:rgba(255,255,255,0.62)">${e(idea.blockchain_hash || userEmail || '')}</div>
  </div>`)

  // ── Problem ───────────────────────────────────────────────────────────────
  if (!isHidden('problem') && (form.problem || '').trim()) {
    const items   = splitToItems(form.problem)
    const h2Text  = hl('problem', items[0] || '')
    const bodyTxt = items.length > 1 ? items.slice(1).join(' ') : ''
    const bullets = items.length >= 2 ? items : [form.problem.trim()]
    if (bullets.length > 3) continued.push('problem')
    pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
      <div style="background:#0e0e1f;color:#ffffff;padding:24px 28px 28px;display:flex;flex-direction:column;gap:24px;flex-shrink:0">
        ${navDark(title)}
        <div style="display:flex;flex-direction:column;gap:12px">
          ${labelDark('01', 'THE PROBLEM')}
          <h2 style="margin:0;font-size:22px;font-weight:600;line-height:1.35">${e(h2Text)}</h2>
          ${bodyTxt ? `<div style="font-size:14px;line-height:1.65;color:rgba(255,255,255,0.8)">${e(bodyTxt)}</div>` : ''}
        </div>
      </div>
      <div style="flex-grow:1;padding:26px 28px 0;display:flex;flex-direction:column;gap:18px;overflow:hidden">
        ${bullets.slice(0, 4).map((item, i) => `
          ${i > 0 ? divLight() : ''}
          <div style="display:flex;gap:14px;align-items:flex-start">
            <div style="flex-shrink:0;width:26px;height:26px;border-radius:13px;background:#0e0e1f;color:#ffffff;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center">${i + 1}</div>
            <div style="font-size:14px;line-height:1.65">${e(item)}</div>
          </div>`).join('')}
      </div>
      ${footerLight}
    </div>`)
  }

  // ── Solution + How It Works ───────────────────────────────────────────────
  const hasSol = !isHidden('solution') && (form.solution || '').trim()
  const hasHiw = !isHidden('how_it_works') && (form.how_it_works || '').trim()
  if (hasSol || hasHiw) {
    const solItems = splitToItems(form.solution || '')
    const solH2    = hl('solution', solItems[0] || '')
    const solBody  = solItems.length > 1 ? solItems.slice(1).join(' ') : ''
    const hiwSteps = (form.how_it_works || '')
      .split('\n').map(s => s.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean)
    pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
      ${navLight(title)}
      <div style="padding:22px 28px 22px;display:flex;flex-direction:column;gap:12px;flex-shrink:0">
        ${labelLight('02', 'THE SOLUTION')}
        <h2 style="margin:0;font-size:22px;font-weight:600;line-height:1.35;color:#0e0e1f">${e(solH2)}</h2>
        ${productImageUrl
          ? `<div style="width:100%;height:120px;border-radius:10px;overflow:hidden;flex-shrink:0"><img src="${productImageUrl}" style="width:100%;height:100%;object-fit:cover" /></div>`
          : `<div style="width:100%;height:120px;border-radius:10px;background:#e9ebf5;display:flex;align-items:center;justify-content:center;font-size:12px;color:#5f5e5a">Product</div>`}
        ${solBody ? `<div style="font-size:14px;line-height:1.65">${e(solBody)}</div>` : ''}
      </div>
      <div style="flex-grow:1;background:#0e0e1f;color:#ffffff;padding:22px 28px 0;display:flex;flex-direction:column;gap:12px;overflow:hidden">
        ${labelDark('03', 'HOW IT WORKS')}
        ${hiwSteps.slice(0, 4).map((step, i) => `
          ${i > 0 ? divDark() : ''}
          <div style="display:flex;gap:14px;align-items:baseline">
            <div style="flex-shrink:0;font-size:13px;font-weight:700;color:#a9bcf9">${String(i + 1).padStart(2, '0')}</div>
            <div style="font-size:14px;line-height:1.55;color:rgba(255,255,255,0.86)">${e(step)}</div>
          </div>`).join('')}
        <div style="flex-grow:1"></div>
        ${footerDarkInner}
      </div>
    </div>`)
  }

  // ── Market Size + Target Market ───────────────────────────────────────────
  const hasMkt = !isHidden('market_size') && marketNums.length > 0
  const hasTm  = !isHidden('target_market') && (form.target_audience || '').trim()
  if (hasMkt || hasTm) {
    const boxLabels = ['GLOBAL MARKET', 'SERVICEABLE', 'TAM']
    const mBoxes    = marketNums.slice(0, 3).map((v, i) => ({ v, l: boxLabels[i] || '' }))
    const tmLines   = (form.target_audience || '').split('\n').map(s => s.trim()).filter(Boolean)
    const tmSegs    = tmLines.length >= 2 ? tmLines : (form.target_audience || '').split(',').map(s => s.trim()).filter(Boolean)
    pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
      <div style="background:#0e0e1f;color:#ffffff;padding:24px 28px 24px;display:flex;flex-direction:column;gap:20px;flex-shrink:0">
        ${navDark(title)}
        ${hasMkt ? `
          ${labelDark('04', 'MARKET SIZE')}
          <div style="display:grid;grid-template-columns:repeat(${mBoxes.length},minmax(0,1fr));gap:14px">
            ${mBoxes.map(b => `<div style="border-top:2px solid #8b8ff7;padding-top:12px"><div style="font-size:26px;font-weight:700">${e(b.v)}</div><div style="font-size:10px;letter-spacing:1px;color:rgba(255,255,255,0.62);margin-top:4px">${e(b.l)}</div></div>`).join('')}
          </div>
          <div style="font-size:14px;color:rgba(255,255,255,0.8)">${e((form.market_size || '').split('\n').filter(l => !/\$[\d.]+[BMKbmk]/.test(l))[0] || '')}</div>
        ` : ''}
      </div>
      <div style="flex-grow:1;padding:24px 28px 0;display:flex;flex-direction:column;gap:14px;overflow:hidden">
        ${hasTm ? `
          ${labelLight('05', 'TARGET MARKET')}
          ${tmSegs.slice(0, 4).map((seg, i) => {
            const ci = seg.indexOf(':')
            const hasLabel = ci > 0 && ci < 22
            const lbl = hasLabel ? seg.slice(0, ci).trim() : (i === 0 ? 'Primary' : i === 1 ? 'Secondary' : 'Additional')
            const txt = hasLabel ? seg.slice(ci + 1).trim() : seg
            return `
              ${i > 0 ? divLight() : ''}
              <div style="display:flex;flex-direction:column;gap:4px">
                <div style="font-size:12px;font-weight:700;color:#0e0e1f">${e(lbl)}</div>
                <div style="font-size:14px;line-height:1.6">${e(txt)}</div>
              </div>`
          }).join('')}
        ` : ''}
      </div>
      ${footerLight}
    </div>`)
  }

  // ── Business Model ────────────────────────────────────────────────────────
  if (!isHidden('business_model') && bmValue?.models?.length) {
    const BM_TYPE_KEY = {
      'Freemium / SaaS':    'freemium',
      'Marketplace':        'marketplace',
      'Subscription':       'subscription',
      'One-time Purchase':  'oneTime',
      'Advertising':        'advertising',
      'Licensing':          'licensing',
      'Transaction Fees':   'transactionFees',
      'Hardware + Software':'hardwareSoftware',
      'Other':              'other',
    }
    const models = bmValue.models.filter(Boolean)
    for (let mi = 0; mi < models.length; mi += 2) {
      const m1  = models[mi]
      const m2  = models[mi + 1]
      const d1  = bmValue[BM_TYPE_KEY[m1] || m1.toLowerCase().replace(/[^a-z]/g, '')] || {}
      const lightContent = bmSection(m1, d1, '06', 'BUSINESS MODEL', false)
      if (m2) {
        const d2 = bmValue[BM_TYPE_KEY[m2] || m2.toLowerCase().replace(/[^a-z]/g, '')] || {}
        pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
          ${navLight(title)}
          <div style="padding:22px 28px 24px;display:flex;flex-direction:column;gap:14px;flex-shrink:0">${lightContent}</div>
          <div style="flex-grow:1;background:#0e0e1f;color:#ffffff;padding:24px 28px 0;display:flex;flex-direction:column;gap:14px;overflow:hidden">
            ${bmSection(m2, d2, '', '', true)}
            <div style="flex-grow:1"></div>
            ${footerDarkInner}
          </div>
        </div>`)
      } else {
        pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
          ${navLight(title)}
          <div style="flex-grow:1;padding:22px 28px 0;display:flex;flex-direction:column;gap:14px;overflow:hidden">${lightContent}</div>
          ${footerLight}
        </div>`)
      }
    }
  }

  // ── Competitive Advantage + Risks ─────────────────────────────────────────
  const hasAdv   = !isHidden('competitive_advantage') && (form.competitive_advantage || '').trim()
  const riskItems = (form.risks || '').split('\n').map(s => s.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean)
  const hasRisks  = !isHidden('risks') && riskItems.length > 0
  if (hasAdv || hasRisks) {
    const advItems = splitToItems(form.competitive_advantage || '')
    const advH2    = hl('competitive_advantage', advItems[0] || '')
    const advBody  = advItems.length > 1 ? advItems.slice(1).join(' ') : ''
    pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
      <div style="background:#0e0e1f;color:#ffffff;padding:24px 28px 28px;display:flex;flex-direction:column;gap:24px;flex-shrink:0">
        ${navDark(title)}
        ${hasAdv ? `<div style="display:flex;flex-direction:column;gap:12px">
          ${labelDark('07', 'COMPETITIVE ADVANTAGE')}
          <h2 style="margin:0;font-size:22px;font-weight:600;line-height:1.35">${e(advH2)}</h2>
          ${advBody ? `<div style="font-size:14px;line-height:1.65;color:rgba(255,255,255,0.8)">${e(advBody)}</div>` : ''}
        </div>` : ''}
      </div>
      <div style="flex-grow:1;padding:26px 28px 0;display:flex;flex-direction:column;gap:16px;overflow:hidden">
        ${hasRisks ? `
          ${labelLight('08', 'RISKS &amp; CHALLENGES')}
          ${riskItems.slice(0, 5).map((item, i) => `
            ${i > 0 ? divLight() : ''}
            <div style="display:flex;gap:14px;align-items:flex-start">
              <div style="flex-shrink:0;width:8px;height:8px;margin-top:8px;background:#0e0e1f"></div>
              <div style="font-size:14px;line-height:1.65">${e(item)}</div>
            </div>`).join('')}
        ` : ''}
      </div>
      ${footerLight}
    </div>`)
  }

  // ── Next Steps + Team ─────────────────────────────────────────────────────
  const nsItems  = (form.next_steps || '').split('\n').map(s => s.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean)
  const hasNs    = !isHidden('next_steps') && nsItems.length > 0
  const team     = idea._pdf_team || {}
  const hasTeam  = !isHidden('team') && !!team.name
  if (hasNs || hasTeam) {
    pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
      ${navLight(title)}
      <div style="padding:22px 28px 26px;display:flex;flex-direction:column;gap:16px;flex-shrink:0">
        ${hasNs ? `
          ${labelLight('09', 'NEXT STEPS')}
          ${nsItems.slice(0, 4).map((step, i) => `
            <div style="display:flex;gap:14px;align-items:flex-start">
              <div style="flex-shrink:0;width:26px;height:26px;border-radius:13px;background:#0e0e1f;color:#ffffff;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center">${i + 1}</div>
              <div style="font-size:14px;line-height:1.65;font-weight:600;color:#0e0e1f">${e(step)}</div>
            </div>`).join('')}
        ` : ''}
      </div>
      <div style="flex-grow:1;background:#0e0e1f;color:#ffffff;padding:24px 28px 0;display:flex;flex-direction:column;gap:16px;overflow:hidden">
        ${hasTeam ? `
          ${labelDark('10', 'THE TEAM')}
          <div style="display:flex;gap:14px;align-items:center">
            <div style="flex-shrink:0;width:52px;height:52px;border-radius:26px;background:#ffffff;color:#0e0e1f;font-size:22px;font-weight:700;display:flex;align-items:center;justify-content:center">${e((team.name || '?')[0].toUpperCase())}</div>
            <div>
              <div style="font-size:18px;font-weight:600">${e(team.name || '')}</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:2px">${e(team.role || '')}</div>
            </div>
          </div>
          ${team.bio ? `<div style="font-size:14px;line-height:1.65;color:rgba(255,255,255,0.86)">${e(team.bio)}</div>` : ''}
        ` : ''}
        <div style="flex-grow:1"></div>
        ${footerDarkInner}
      </div>
    </div>`)
  }

  // ── Origin Story + Customer Validation ───────────────────────────────────
  const originStory = idea._pdf_origin_story || idea.origin_story || ''
  const hasOrigin   = !isHidden('origin_story') && originStory.trim()
  const cv          = idea._pdf_customer_validation || {}
  const cvStats     = [
    cv.waitlist   ? { v: cv.waitlist,   l: 'WAITLIST'   } : null,
    cv.interviews ? { v: cv.interviews, l: 'INTERVIEWS' } : null,
    cv.pilots     ? { v: cv.pilots,     l: 'PILOTS'     } : null,
    cv.stage      ? { v: cv.stage,      l: 'STAGE'      } : null,
  ].filter(Boolean)
  const hasCv = !isHidden('customer_validation') && cvStats.length > 0
  if (hasOrigin || hasCv) {
    pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
      <div style="background:#0e0e1f;color:#ffffff;padding:24px 28px 32px;display:flex;flex-direction:column;gap:24px;flex-shrink:0">
        ${navDark(title)}
        ${hasOrigin ? `<div style="display:flex;flex-direction:column;gap:14px">
          ${labelDark('11', 'ORIGIN STORY')}
          <div style="font-size:19px;line-height:1.55;font-style:italic;color:#ffffff">${e(originStory)}</div>
        </div>` : ''}
      </div>
      <div style="flex-grow:1;padding:28px 28px 0;display:flex;flex-direction:column;gap:18px;overflow:hidden">
        ${hasCv ? `
          ${labelLight('12', 'CUSTOMER VALIDATION')}
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 16px">
            ${cvStats.map(s => `<div style="border-top:2px solid #0e0e1f;padding-top:12px"><div style="font-size:30px;font-weight:700;color:#0e0e1f">${e(String(s.v))}</div><div style="font-size:10px;letter-spacing:1px;color:#5f5e5a;margin-top:4px">${e(s.l)}</div></div>`).join('')}
          </div>
        ` : ''}
      </div>
      ${footerLight}
    </div>`)
  }

  // ── Traction + Revenue Details ────────────────────────────────────────────
  const milestones = idea._pdf_traction_milestones || []
  const hasTraction = !isHidden('traction') && milestones.length > 0
  const revRows = [
    { label: 'WHO PAYS',          val: idea.who_pays },
    { label: 'REVENUE STREAMS',   val: idea.revenue_streams },
    { label: 'PRICING POWER',     val: idea.pricing_power },
    { label: 'REVENUE POTENTIAL', val: idea.revenue_potential },
    { label: 'BUSINESS STAGE',    val: idea.business_stage },
  ].filter(r => r.val)
  const hasRevDetails = !isHidden('revenue_details') && revRows.length > 0
  if (hasTraction || hasRevDetails) {
    pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
      ${navLight(title)}
      <div style="padding:22px 28px 24px;display:flex;flex-direction:column;gap:14px;flex-shrink:0">
        ${hasTraction ? `
          ${labelLight('13', 'TRACTION &amp; MILESTONES')}
          ${milestones.slice(0, 5).map((m, i) => {
            const done = m.status === 'done'
            const prog = m.status === 'in-progress'
            const dot  = done ? 'width:14px;height:14px;border-radius:7px;background:#0e0e1f'
              : prog ? 'width:14px;height:14px;border-radius:7px;box-sizing:border-box;border:4px solid #5a5fd6'
              : 'width:14px;height:14px;border-radius:7px;box-sizing:border-box;border:1.5px solid #5f5e5a'
            const tag  = done ? 'font-size:10px;font-weight:700;letter-spacing:1px;color:#ffffff;background:#0e0e1f;padding:4px 8px'
              : prog ? 'font-size:10px;font-weight:700;letter-spacing:1px;color:#4045b8;border:1px solid #5a5fd6;padding:3px 7px'
              : 'font-size:10px;font-weight:700;letter-spacing:1px;color:#5f5e5a;padding:3px 0'
            return `
              ${i > 0 ? divLight() : ''}
              <div style="display:flex;gap:14px;align-items:center">
                <div style="flex-shrink:0;${dot}"></div>
                <div style="flex-grow:1">
                  <div style="font-size:14px;font-weight:600;color:#0e0e1f">${e(m.label || '')}</div>
                  ${m.date ? `<div style="font-size:12px;color:#5f5e5a">${e(m.date)}</div>` : ''}
                </div>
                <div style="${tag}">${done ? 'DONE' : prog ? 'IN PROGRESS' : 'PLANNED'}</div>
              </div>`
          }).join('')}
        ` : ''}
      </div>
      <div style="flex-grow:1;background:#0e0e1f;color:#ffffff;padding:22px 28px 0;display:flex;flex-direction:column;gap:10px;overflow:hidden">
        ${hasRevDetails ? `
          ${labelDark('14', 'REVENUE DETAILS')}
          ${revRows.map((r, i) => `<div style="display:flex;gap:14px;align-items:baseline;${i < revRows.length - 1 ? 'padding-bottom:9px;border-bottom:1px solid rgba(255,255,255,0.14)' : ''}"><div style="flex-shrink:0;width:118px;font-size:10px;letter-spacing:1px;color:rgba(255,255,255,0.62)">${e(r.label)}</div><div style="font-size:14px;line-height:1.5">${e(r.val)}</div></div>`).join('')}
        ` : ''}
        <div style="flex-grow:1"></div>
        ${footerDarkInner}
      </div>
    </div>`)
  }

  // ── Competitive Landscape ─────────────────────────────────────────────────
  if (!isHidden('competitive_landscape') && idea.competitive_landscape) {
    try {
      const cl = typeof idea.competitive_landscape === 'string'
        ? JSON.parse(idea.competitive_landscape)
        : idea.competitive_landscape
      if (cl) {
        if (cl.format === 'table' && cl.table?.competitors?.length) {
          const cols = cl.table.columns || []
          const comps = cl.table.competitors
          const check = `<svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3.2L13 5"></path></svg>`
          pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
            <div style="background:#0e0e1f;color:#ffffff;padding:24px 28px 26px;display:flex;flex-direction:column;gap:22px;flex-shrink:0">
              ${navDark(title)}
              <div style="display:flex;flex-direction:column;gap:12px">
                ${labelDark('15', 'COMPETITIVE LANDSCAPE')}
                <h2 style="margin:0;font-size:22px;font-weight:600;line-height:1.35">How ${e(title)} compares.</h2>
              </div>
            </div>
            <div style="flex-grow:1;padding:22px 28px 0;overflow:hidden">
              <div style="display:grid;grid-template-columns:1.5fr ${cols.map(() => '1fr').join(' ')}">
                <div style="padding:10px 0"></div>
                ${cols.map(c => `<div style="padding:10px 4px;font-size:10px;font-weight:700;letter-spacing:0.5px;color:#5f5e5a;text-align:center">${e(c)}</div>`).join('')}
                <div style="padding:16px 12px;background:#0e0e1f;color:#ffffff;font-size:14px;font-weight:700">${e(title)}</div>
                ${cols.map(() => `<div style="padding:16px 4px;background:#0e0e1f;color:#ffffff;display:flex;justify-content:center;align-items:center">${check}</div>`).join('')}
                ${comps.map(c => `
                  <div style="padding:16px 12px 16px 0;font-size:14px;border-bottom:1px solid rgba(44,44,42,0.12)">${e(c.name)}</div>
                  ${(c.checks || cols.map(() => false)).map(ch => `<div style="padding:16px 4px;${ch ? 'color:#0e0e1f' : 'color:#5f5e5a'};text-align:center;display:flex;justify-content:center;align-items:center;border-bottom:1px solid rgba(44,44,42,0.12)">${ch ? check : '–'}</div>`).join('')}
                `).join('')}
              </div>
            </div>
            ${footerLight}
          </div>`)
        }

        if (cl.format === 'matrix' && cl.matrix?.competitors?.length) {
          const W = 384, H = 320
          const self  = cl.matrix.self || { x: 0.75, y: 0.75 }
          const axisX = cl.matrix.axis_x?.label || 'X'
          const axisY = cl.matrix.axis_y?.label || 'Y'
          const px = (x) => Math.round(x * (W - 40) + 20)
          const py = (y) => Math.round((1 - y) * (H - 40) + 10)
          const selfPx = px(self.x), selfPy = py(self.y)
          const dots = cl.matrix.competitors.map(c => {
            const cx = px(c.x ?? 0.5), cy = py(c.y ?? 0.5)
            const lblLeft = cx > W * 0.6
            return `<div style="position:absolute;left:${cx - 6}px;top:${cy - 6}px;width:12px;height:12px;border-radius:6px;background:#5f5e5a"></div><div style="position:absolute;${lblLeft ? `right:${W - cx + 4}px` : `left:${cx + 16}px`};top:${cy - 8}px;font-size:12px;color:#2c2c2a">${e(c.name)}</div>`
          }).join('')
          pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
            <div style="background:#0e0e1f;color:#ffffff;padding:24px 28px 26px;display:flex;flex-direction:column;gap:22px;flex-shrink:0">
              ${navDark(title)}
              <div style="display:flex;flex-direction:column;gap:12px">
                ${labelDark('15', 'COMPETITIVE LANDSCAPE')}
                <h2 style="margin:0;font-size:22px;font-weight:600;line-height:1.35">Where ${e(title)} sits.</h2>
              </div>
            </div>
            <div style="flex-grow:1;padding:24px 28px 0;display:flex;flex-direction:column;gap:10px;overflow:hidden">
              <div style="font-size:11px;font-weight:600;letter-spacing:1px;color:#5f5e5a">${e(axisY)} ↑</div>
              <div style="position:relative;width:${W}px;height:${H}px;border-left:1.5px solid #0e0e1f;border-bottom:1.5px solid #0e0e1f">
                <div style="position:absolute;left:0;top:${H/2}px;width:${W}px;height:1px;background:rgba(44,44,42,0.12)"></div>
                <div style="position:absolute;left:${W/2}px;top:0;width:1px;height:${H}px;background:rgba(44,44,42,0.12)"></div>
                ${dots}
                <div style="position:absolute;left:${selfPx - 10}px;top:${selfPy - 10}px;width:20px;height:20px;border-radius:10px;background:#5a5fd6"></div>
                <div style="position:absolute;${selfPx > W/2 ? `right:${W - selfPx + 14}px` : `left:${selfPx + 14}px`};top:${selfPy - 10}px;font-size:13px;font-weight:700;color:#0e0e1f">${e(title)}</div>
              </div>
              <div style="font-size:11px;font-weight:600;letter-spacing:1px;color:#5f5e5a;text-align:right">${e(axisX)} →</div>
            </div>
            ${footerLight}
          </div>`)
        }

        if (cl.format === 'gap' && cl.gap?.stages?.length) {
          const stages   = cl.gap.stages
          const gapStart = cl.gap.gap_start ?? 1
          const gapEnd   = cl.gap.gap_end   ?? 2
          const byStage  = stages.map((_, i) => (cl.gap.competitors || []).filter(c => c.stage === i))
          const preStages  = stages.slice(0, gapStart)
          const gapStages  = stages.slice(gapStart, gapEnd + 1)
          const postStages = stages.slice(gapEnd + 1)
          pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
            ${navLight(title)}
            <div style="padding:22px 28px 20px;display:flex;flex-direction:column;gap:12px;flex-shrink:0">
              ${labelLight('15', 'COMPETITIVE LANDSCAPE')}
              <h2 style="margin:0;font-size:22px;font-weight:600;line-height:1.35;color:#0e0e1f">The gap ${e(title)} fills.</h2>
            </div>
            ${preStages.map((s, i) => `<div style="padding:0 28px 16px;display:flex;gap:14px;align-items:flex-start;flex-shrink:0">
              <div style="flex-shrink:0;width:26px;height:26px;border-radius:13px;box-sizing:border-box;border:1.5px solid #5f5e5a;color:#2c2c2a;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center">${i + 1}</div>
              <div><div style="font-size:14px;font-weight:600;color:#0e0e1f">${e(s)}</div>${byStage[i]?.length ? `<div style="font-size:13px;color:#5f5e5a;margin-top:2px">${byStage[i].map(c => e(c.name)).join(' · ')}</div>` : ''}</div>
            </div>`).join('')}
            <div style="background:#0e0e1f;color:#ffffff;padding:20px 28px;display:flex;flex-direction:column;gap:16px;flex-shrink:0">
              <div style="display:flex;justify-content:space-between;align-items:baseline">
                <div style="font-size:11px;font-weight:600;letter-spacing:2px;color:#a9bcf9">THE GAP</div>
                <div style="font-size:18px;font-weight:700">${e(title)}</div>
              </div>
              ${gapStages.map((s, i) => `<div style="display:flex;gap:14px;align-items:flex-start">
                <div style="flex-shrink:0;width:26px;height:26px;border-radius:13px;background:#ffffff;color:#0e0e1f;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center">${gapStart + i + 1}</div>
                <div><div style="font-size:14px;font-weight:600">${e(s)}</div><div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:2px">No one here</div></div>
              </div>`).join('')}
            </div>
            ${postStages.map((s, i) => {
              const ai = gapEnd + 1 + i
              return `<div style="flex-grow:1;padding:16px 28px 0;display:flex;gap:14px;align-items:flex-start;flex-shrink:0">
                <div style="flex-shrink:0;width:26px;height:26px;border-radius:13px;box-sizing:border-box;border:1.5px solid #5f5e5a;color:#2c2c2a;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center">${ai + 1}</div>
                <div><div style="font-size:14px;font-weight:600;color:#0e0e1f">${e(s)}</div>${byStage[ai]?.length ? `<div style="font-size:13px;color:#5f5e5a;margin-top:2px">${byStage[ai].map(c => e(c.name)).join(' · ')}</div>` : ''}</div>
              </div>`
            }).join('')}
            ${footerLight}
          </div>`)
        }
      }
    } catch (_) { /* skip if parse fails */ }
  }

  // ── Revenue Projections ───────────────────────────────────────────────────
  const rev = idea._pdf_revenue_projections || {}
  if (!isHidden('revenue_projections') && (rev.startingUsers || rev.monthlyGrowthRate || rev.conversionRate)) {
    try {
      const paidPrice = parseFloat(
        (rev.paidPriceOverride || (() => {
          try {
            const bm = typeof idea.business_model === 'string' ? JSON.parse(idea.business_model) : idea.business_model
            for (const model of (bm?.models || [])) {
              const key = model.toLowerCase().replace(/\s*\/\s*/g, '_').replace(/\s+/g, '_').replace(/[^a-z_]/g, '')
              const data = bm?.[key]
              if (data?.paidPrice) return data.paidPrice
            }
          } catch {}
          return '$12'
        })()).replace(/[^0-9.]/g, '')
      ) || 12
      const isOneTime = (() => {
        try {
          const bm = typeof idea.business_model === 'string' ? JSON.parse(idea.business_model) : idea.business_model
          return (bm?.models || []).includes('One-time Purchase')
        } catch { return false }
      })()
      const su     = parseFloat(rev.startingUsers)     || 100
      const mg     = (parseFloat(rev.monthlyGrowthRate) || 10) / 100
      const cr     = (parseFloat(rev.conversionRate)    || 5)  / 100
      const calc   = (months, mult) => {
        const units = su * Math.pow(1 + mg * mult, months)
        return isOneTime ? units * paidPrice : units * cr * paidPrice
      }
      const fmt = n => n >= 1000000 ? '$' + (n/1000000).toFixed(1) + 'M' : n >= 1000 ? '$' + Math.round(n/1000) + 'K' : '$' + Math.round(n)
      const scenarios = [
        { label: 'CONSERV.',  mult: 0.5, dark: false },
        { label: 'MODERATE',  mult: 1,   dark: true  },
        { label: 'OPTIMISTIC',mult: 2,   dark: false },
      ]
      const periods = [{ l: '6 months', m: 6 }, { l: '12 months', m: 12 }, { l: '24 months', m: 24 }]
      const headlineText = hl('revenue_projections', `${isOneTime ? 'Revenue' : 'Monthly recurring revenue'}, three scenarios.`)
      pages.push(`<div class="page" style="background:#ffffff;color:#2c2c2a">
        ${navLight(title)}
        <div style="flex-grow:1;padding:22px 28px 0;display:flex;flex-direction:column;gap:16px;overflow:hidden">
          ${labelLight('16', 'REVENUE PROJECTIONS')}
          <h2 style="margin:0;font-size:22px;font-weight:600;line-height:1.35;color:#0e0e1f">${e(headlineText)}</h2>
          <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0">
            <div style="padding:10px 0"></div>
            ${scenarios.map(sc => `<div style="padding:10px 8px;font-size:10px;font-weight:700;letter-spacing:1px;${sc.dark ? 'color:#ffffff;background:#0e0e1f' : 'color:#5f5e5a'};text-align:right">${sc.label}</div>`).join('')}
            ${periods.map(p => `
              <div style="padding:14px 0;font-size:13px;border-top:1px solid rgba(44,44,42,0.12)">${e(p.l)}</div>
              ${scenarios.map(sc => `<div style="padding:14px 8px;font-size:18px;font-weight:${sc.dark ? '700' : '600'};${sc.dark ? 'color:#ffffff;background:#0e0e1f;border-top:1px solid rgba(255,255,255,0.16)' : 'color:#0e0e1f;border-top:1px solid rgba(44,44,42,0.12)'};text-align:right">${e(fmt(calc(p.m, sc.mult)))}</div>`).join('')}
            `).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 16px;border-top:1px solid rgba(44,44,42,0.12);padding-top:14px">
            <div style="font-size:13px">Starting ${isOneTime ? 'sales' : 'users'} <span style="font-weight:700;color:#0e0e1f">${e(String(su))}</span></div>
            <div style="font-size:13px">Monthly growth <span style="font-weight:700;color:#0e0e1f">${e(String(rev.monthlyGrowthRate || 10))}%</span></div>
            ${!isOneTime ? `<div style="font-size:13px">Conversion <span style="font-weight:700;color:#0e0e1f">${e(String(rev.conversionRate || 5))}%</span></div>` : ''}
            <div style="font-size:13px">Price <span style="font-weight:700;color:#0e0e1f">${e(rev.paidPriceOverride || '$' + paidPrice)}${isOneTime ? '' : '/mo'}</span></div>
          </div>
          <div style="font-size:12px;font-style:italic;color:#5f5e5a">Model assumptions only. Actual results will vary.</div>
        </div>
        <div style="background:#0e0e1f;color:#ffffff;padding:22px 28px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
          ${logoDark(22)}
          <div style="font-size:10px;letter-spacing:2px;color:#a9bcf9">MYEUREKAIDEA.COM</div>
        </div>
      </div>`)
    } catch (_) { /* skip */ }
  }

  const html = `<style>${CSS}</style><div class="pdf-wrap">${pages.join('')}</div>`
  return { html, continued }
}
