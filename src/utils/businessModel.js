export function escH(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function bmBullet(items) {
  return items.length ? items.map(item => `· ${escH(item)}`).join('<br>') : ''
}

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

export function parseBMValue(raw) {
  if (!raw) return null
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) return raw
  try {
    const p = JSON.parse(String(raw))
    if (p && typeof p === 'object' && !Array.isArray(p) && p.models) return p
  } catch {}
  const lines = String(raw).split('\n').map(s => s.trim()).filter(Boolean)
  const freeLines = lines.filter(l => /^free:/i.test(l)).map(l => l.replace(/^free:\s*/i, ''))
  const paidLines = lines.filter(l => /^paid:/i.test(l)).map(l => l.replace(/^paid:\s*/i, ''))
  if (freeLines.length || paidLines.length) {
    return { models: ['Freemium / SaaS'], freemium: { freeTier: freeLines.join('\n'), paidPrice: '', paidFeatures: paidLines.join('\n'), paidLimits: '' } }
  }
  if (lines.length) {
    return { models: ['Other'], other: { name: 'Business Model', cards: [{ title: 'Details', items: lines }] } }
  }
  return null
}

export function buildBMHtml(bmValue) {
  if (!bmValue?.models?.length) return null
  const parts = []
  for (const type of bmValue.models) {
    const key = BM_TYPE_KEY[type] || type.toLowerCase().replace(/[^a-z]/g, '')
    const data = bmValue[key] || {}
    const titleText = type === 'Other' ? (data.name || 'Custom Model') : type
    let inner = ''
    switch (type) {
      case 'Freemium / SaaS': {
        const freeItems = (data.freeTier || '').split('\n').map(s => s.trim()).filter(Boolean)
        const paidItems = [
          ...(data.paidPrice ? [data.paidPrice] : []),
          ...(data.paidFeatures || '').split('\n').map(s => s.trim()).filter(Boolean),
        ]
        inner = `<div class="twocards"><div class="card bl"><div class="cicon">🆓</div><div class="clabel">FREE TIER</div><div class="ctext">${bmBullet(freeItems)}</div></div><div class="card pu"><div class="cicon">⭐</div><div class="clabel">PAID TIER</div><div class="ctext">${bmBullet(paidItems)}</div></div></div>`
        break
      }
      case 'Subscription': {
        const tiers = (data.tiers || []).filter(t => t.name || t.price || t.features)
        if (tiers.length) inner = `<div class="twocards">${tiers.map(t => `<div class="card bl"><div class="clabel">${escH(t.name || 'Tier')}</div><div class="cicon" style="font-size:13px;font-weight:600;color:#7b9ff7;margin-bottom:4px">${escH(t.price || '')}</div><div class="ctext">${bmBullet((t.features || '').split('\n').map(s => s.trim()).filter(Boolean))}</div></div>`).join('')}</div>`
        break
      }
      case 'Marketplace': {
        const buyerItems = (data.buyers || '').split('\n').map(s => s.trim()).filter(Boolean)
        const sellerItems = [
          ...(data.sellers || '').split('\n').map(s => s.trim()).filter(Boolean),
          ...(data.commission ? [`Commission: ${data.commission}`] : []),
        ]
        inner = `<div class="twocards"><div class="card bl"><div class="cicon">🛍️</div><div class="clabel">BUYERS</div><div class="ctext">${bmBullet(buyerItems)}</div></div><div class="card pu"><div class="cicon">🏪</div><div class="clabel">SELLERS</div><div class="ctext">${bmBullet(sellerItems)}</div></div></div>`
        break
      }
      case 'One-time Purchase': {
        const items = [
          ...(data.price ? [`Price: ${data.price}`] : []),
          ...(data.included || '').split('\n').map(s => s.trim()).filter(Boolean),
          ...(data.upsells ? [`Upsells: ${data.upsells}`] : []),
        ]
        inner = `<div class="stext">${bmBullet(items)}</div>`
        break
      }
      case 'Advertising': {
        const items = [
          ...(data.revenue ? [`Revenue: ${data.revenue}`] : []),
          ...(data.formats || '').split('\n').map(s => s.trim()).filter(Boolean),
          ...(data.audience ? [`Audience: ${data.audience}`] : []),
        ]
        inner = `<div class="stext">${bmBullet(items)}</div>`
        break
      }
      case 'Licensing': {
        const items = [
          ...(data.royalties ? [`Royalties: ${data.royalties}`] : []),
          ...(data.licensees || '').split('\n').map(s => s.trim()).filter(Boolean),
          ...(data.exclusivity ? [data.exclusivity] : []),
        ]
        inner = `<div class="stext">${bmBullet(items)}</div>`
        break
      }
      case 'Transaction Fees': {
        const items = [
          ...(data.fee ? [`Fee: ${data.fee}`] : []),
          ...(data.whoPays ? [data.whoPays] : []),
          ...(data.flow || '').split('\n').map(s => s.trim()).filter(Boolean),
        ]
        inner = `<div class="stext">${bmBullet(items)}</div>`
        break
      }
      case 'Hardware + Software': {
        const items = [
          ...(data.hardwarePrice ? [`Hardware: ${data.hardwarePrice}`] : []),
          ...(data.softwarePrice ? [`Software: ${data.softwarePrice}`] : []),
          ...(data.recurring || '').split('\n').map(s => s.trim()).filter(Boolean),
        ]
        inner = `<div class="stext">${bmBullet(items)}</div>`
        break
      }
      case 'Other': {
        const cards = (data.cards || []).filter(c => c.title || (c.items || []).some(i => i?.trim()))
        if (cards.length) inner = `<div class="twocards">${cards.map(card => `<div class="card bl"><div class="clabel">${escH(card.title || '')}</div><div class="ctext">${bmBullet((card.items || []).map(s => (s || '').trim()).filter(Boolean))}</div></div>`).join('')}</div>`
        break
      }
    }
    if (inner) {
      parts.push(`<div style="break-inside:avoid;page-break-inside:avoid;break-after:auto"><h3 class="bm-model-title">${escH(titleText)}</h3>${inner}</div>`)
    }
  }
  return parts.length ? `<div style="break-before:auto">${parts.join('<div style="height:6px"></div>')}</div>` : null
}

function _parseSteps(text) {
  if (!text?.trim()) return []
  const t = text.trim()
  const lines = t.split('\n').map(s => s.trim()).filter(Boolean)
  const numbered = lines.filter(s => /^\d+[\.\)]\s/.test(s)).map(s => s.replace(/^\d+[\.\)]\s*/, ''))
  if (numbered.length >= 2) return numbered
  if (lines.length >= 2) return lines
  const sentences = t.split(/\.\s+/).map(s => s.trim()).filter(s => s.length > 10)
  if (sentences.length >= 2) return sentences
  return [t]
}

export function buildSnapshotHTML(form, idea) {
  const cats = Array.isArray(idea.categories)
    ? idea.categories
    : typeof idea.categories === 'string'
    ? idea.categories.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const steps = _parseSteps(form.how_it_works)
  const audienceTags = (form.target_audience || '').split(',').map(s => s.trim()).filter(Boolean)
    .filter(t => !cats.some(c => c.toLowerCase() === t.toLowerCase()))
  const marketNums = (form.market_size || '').match(/\$[\d.]+[BMKbmk]+\+?/g) || []
  const bmValue = parseBMValue(form.business_model || '')
  const risks = (form.risks || '').split('\n').map(s => s.trim()).filter(Boolean)
  const nextSteps = (form.next_steps || '').split('\n').map(s => s.trim()).filter(Boolean)
  const dateStr = idea.created_at
    ? new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''
  const marketBoxes = marketNums.length >= 3
    ? [{ v: marketNums[0], l: 'Global Market' }, { v: marketNums[1], l: 'Serviceable' }, { v: marketNums[2], l: 'Target' }]
    : marketNums.length === 2
    ? [{ v: marketNums[0], l: 'Global Market' }, { v: marketNums[1], l: 'Serviceable' }, { v: '$1B+', l: 'TAM' }]
    : marketNums.length === 1
    ? [{ v: marketNums[0], l: 'Global Market' }, { v: '$100B+', l: 'Creator Economy' }, { v: '$1B+', l: 'TAM' }]
    : [{ v: '$180B+', l: 'Global IP Market' }, { v: '$100B+', l: 'Creator Economy' }, { v: '$1B+', l: 'TAM' }]

  const q = '#pdf-preview'
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=DM+Sans:wght@400;500;600&family=Inter:wght@300;400;500;600;700&display=swap');
    * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    ${q} .pdf-wrap{display:flex;flex-direction:column;gap:12px;width:375px;margin:0 auto}
    ${q} .page{width:375px;height:667px;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;display:flex;flex-direction:column;box-sizing:border-box}
    ${q} .abar{height:4px;background:linear-gradient(90deg,#7b9ff7,#9b7ff7);flex-shrink:0}
    ${q} .cover{background:#0e0e1f;flex:1;padding:28px 22px 22px;display:flex;flex-direction:column;justify-content:space-between}
    ${q} .logo{font-family:'Outfit',sans-serif;font-size:14px;font-weight:300;color:#fff}
    ${q} .cbadge{background:rgba(123,159,247,0.15);border:1px solid rgba(123,159,247,0.3);border-radius:20px;padding:3px 10px;font-size:8px;color:#7b9ff7;letter-spacing:2px;text-transform:uppercase}
    ${q} .cnav{display:flex;justify-content:space-between;align-items:center}
    ${q} .ccats{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}
    ${q} .cat{background:rgba(123,159,247,0.1);border:1px solid rgba(123,159,247,0.2);border-radius:4px;padding:3px 8px;font-size:9px;color:#7b9ff7}
    ${q} .cmid{display:flex;flex-direction:column;gap:10px}
    ${q} .ctitle{font-size:22px;font-weight:700;color:#fff;line-height:1.2}
    ${q} .ctagline{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.5}
    ${q} .cdiv{height:1px;background:linear-gradient(90deg,rgba(123,159,247,0.5),transparent)}
    ${q} .cmeta{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    ${q} .mlabel{font-size:8px;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
    ${q} .mval{font-size:12px;color:rgba(255,255,255,0.7);font-weight:500}
    ${q} .chash{font-size:7px;color:rgba(255,255,255,0.15);font-family:monospace;word-break:break-all;line-height:1.6}
    ${q} .cpage{background:#fff;flex:1;display:flex;flex-direction:column}
    ${q} .phead{padding:11px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;flex-shrink:0}
    ${q} .logod{font-family:'Outfit',sans-serif;font-size:12px;font-weight:300;color:#0e0e1f}
    ${q} .pnum{font-size:9px;color:#ccc}
    ${q} .pbody{padding:14px 18px;display:flex;flex-direction:column;gap:13px;flex:1;overflow:hidden}
    ${q} .shead{display:flex;align-items:center;gap:9px;flex-shrink:0}
    ${q} .sicon{width:32px;height:32px;border-radius:8px;background:rgba(123,159,247,0.1);border:1px solid rgba(123,159,247,0.15);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
    ${q} .slabel{font-size:9px;letter-spacing:2px;color:#9b7ff7;text-transform:uppercase;font-weight:600}
    ${q} .stext{font-size:12px;color:#333;line-height:1.7}
    ${q} .hlight{background:rgba(123,159,247,0.07);border:1px solid rgba(123,159,247,0.15);border-left:3px solid #7b9ff7;border-radius:0 8px 8px 0;padding:11px 13px;flex-shrink:0}
    ${q} .hlabel{font-size:8px;letter-spacing:2px;color:#7b9ff7;text-transform:uppercase;font-weight:600;margin-bottom:5px}
    ${q} .htext{font-size:12px;color:#333;line-height:1.7}
    ${q} .divider{height:1px;background:#f0f0f0;flex-shrink:0}
    ${q} .steps{display:flex;flex-direction:column;gap:9px}
    ${q} .step{display:flex;gap:9px;align-items:flex-start}
    ${q} .snum{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#7b9ff7,#9b7ff7);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
    ${q} .stxt{font-size:12px;color:#333;line-height:1.55;padding-top:2px}
    ${q} .bmet{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
    ${q} .bm{background:rgba(123,159,247,0.06);border:1px solid rgba(123,159,247,0.12);border-radius:8px;padding:12px 6px;text-align:center}
    ${q} .bmv{font-size:15px;font-weight:700;color:#0e0e1f;margin-bottom:3px}
    ${q} .bml{font-size:8px;color:#999;letter-spacing:0.5px;text-transform:uppercase}
    ${q} .tags{display:flex;gap:5px;flex-wrap:wrap}
    ${q} .tag{background:rgba(123,159,247,0.08);border:1px solid rgba(123,159,247,0.2);border-radius:20px;padding:3px 9px;font-size:10px;color:#7b9ff7}
    ${q} .twocards{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    ${q} .card{background:#f8f8fc;border-radius:8px;padding:11px;box-sizing:border-box}
    ${q} .card.bl{border-top:3px solid #7b9ff7}
    ${q} .card.pu{border-top:3px solid #9b7ff7}
    ${q} .cicon{font-size:18px;margin-bottom:5px}
    ${q} .clabel{font-size:8px;letter-spacing:2px;color:#9b7ff7;text-transform:uppercase;font-weight:600;margin-bottom:5px}
    ${q} .ctext{font-size:11px;color:#555;line-height:1.6}
    ${q} .risks{display:flex;flex-direction:column}
    ${q} .risk{display:flex;gap:9px;padding:9px 0;border-bottom:1px solid #f5f5f5}
    ${q} .risk:last-child{border-bottom:none}
    ${q} .rdot{width:7px;height:7px;border-radius:50%;background:#e07b9f;flex-shrink:0;margin-top:5px}
    ${q} .rtxt{font-size:12px;color:#444;line-height:1.6}
    ${q} .tl{display:flex;flex-direction:column;gap:13px}
    ${q} .tli{display:flex;gap:11px}
    ${q} .tldot{width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#7b9ff7,#9b7ff7);flex-shrink:0;margin-top:3px}
    ${q} .tltitle{font-size:12px;font-weight:600;color:#0e0e1f;margin-bottom:3px}
    ${q} .tltext{font-size:11px;color:#666;line-height:1.55}
    ${q} .pfooter{padding:8px 18px;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between;flex-shrink:0}
    ${q} .pf{font-size:8px;color:#ccc}
    ${q} .dfooter{background:#0e0e1f;padding:16px 18px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
    ${q} .dfbadge{background:rgba(123,159,247,0.1);border:1px solid rgba(123,159,247,0.2);border-radius:20px;padding:3px 10px;font-size:8px;color:#7b9ff7;letter-spacing:2px;text-transform:uppercase}
    ${q} .bm-model-title{font-family:'Outfit',sans-serif;font-weight:400;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#7b9ff7;margin:14px 0 8px 0;padding-bottom:5px;border-bottom:1px solid rgba(123,159,247,0.2)}
    ${q} .bm-model-title:first-child{margin-top:0}
  `
  const ph = (n) => `<div class="phead"><div class="logod"><svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 260 40" style="display:block"><defs><linearGradient id="aiGradLogo" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#7b9ff7"/><stop offset="100%" stop-color="#9b7ff7"/></linearGradient></defs><text font-family="Outfit, Helvetica, Arial, sans-serif" font-weight="300" font-size="32" y="32"><tspan fill="#0e0e1f">Eurek</tspan><tspan fill="url(#aiGradLogo)">AI</tspan><tspan fill="#0e0e1f">dea</tspan></text></svg></div><div class="pnum">Page ${n}</div></div>`
  const pf = `<div class="pfooter"><div class="pf">CONFIDENTIAL</div><div class="pf">myeurekaidea.com</div></div>`

  const cover = `<div class="page"><div class="abar"></div><div class="cover"><div><div class="cnav"><div class="logo"><svg xmlns="http://www.w3.org/2000/svg" height="28" viewBox="0 0 260 40" style="display:block"><defs><linearGradient id="aiGradLogo" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#7b9ff7"/><stop offset="100%" stop-color="#9b7ff7"/></linearGradient></defs><text font-family="Outfit, Helvetica, Arial, sans-serif" font-weight="300" font-size="32" y="32"><tspan fill="#ffffff">Eurek</tspan><tspan fill="url(#aiGradLogo)">AI</tspan><tspan fill="#ffffff">dea</tspan></text></svg></div><div class="cbadge">CONFIDENTIAL</div></div><div class="ccats">${cats.map(c=>`<div class="cat">${escH(c)}</div>`).join('')}</div></div><div class="cmid"><div class="ctitle">${escH(idea.title)}</div><div class="ctagline">${escH(form.tagline)}</div><div class="cdiv"></div><div class="cmeta"><div><div class="mlabel">DATE</div><div class="mval">${escH(dateStr)}</div></div><div><div class="mlabel">MARKET SIZE</div><div class="mval">${escH(marketBoxes[0].v)}</div></div><div><div class="mlabel">LOOKING FOR</div><div class="mval">${escH(idea.looking_for||'Investors')}</div></div><div><div class="mlabel">STATUS</div><div class="mval">Confidential</div></div></div></div>${idea.blockchain_hash?`<div class="chash">${escH(idea.blockchain_hash)}</div>`:''}</div></div>`

  const stepsHTML = steps.length===1
    ? `<div class="stext">${escH(steps[0])}</div>`
    : `<div class="steps">${steps.map((s,i)=>`<div class="step"><div class="snum">${i+1}</div><div class="stxt">${escH(s)}</div></div>`).join('')}</div>`
  const tagsHTML = audienceTags.length>0
    ? `<div class="tags">${audienceTags.map(t=>`<div class="tag">${escH(t)}</div>`).join('')}</div>`
    : `<div class="stext">${escH(form.target_audience)}</div>`
  const sH = (icon, label) => `<div class="shead"><div class="sicon">${icon}</div><div class="slabel">${label}</div></div>`

  const OVERHEAD = 60, LINE = 28
  const sectionHeight = (s) => {
    switch (s.type) {
      case 'problem': case 'solution': case 'competitive_advantage':
        return OVERHEAD + Math.ceil(s.text.length / 60) * LINE
      case 'how_it_works':
        return OVERHEAD + s.items.length * (LINE + 10)
      case 'target_market':
        return OVERHEAD + Math.ceil(s.items.length / 4) * (LINE + 8)
      case 'market_size':
        return OVERHEAD + 3 * LINE
      case 'business_model':
        return OVERHEAD + (s.bmValue?.models?.length || 1) * (LINE * 3 + 40)
      case 'risks': case 'next_steps':
        return OVERHEAD + s.items.length * (LINE + 8)
      default:
        return OVERHEAD + 2 * LINE
    }
  }

  const sections = [
    { type: 'problem', text: form.problem||'',
      html: `${sH('⚡','THE PROBLEM')}<div class="stext">${escH(form.problem)}</div>` },
    { type: 'solution', text: form.solution||'',
      html: `<div class="hlight"><div class="hlabel">💡 THE SOLUTION</div><div class="htext">${escH(form.solution)}</div></div>` },
    { type: 'how_it_works', items: steps,
      html: `${sH('⚙️','HOW IT WORKS')}${stepsHTML}` },
    { type: 'market_size',
      html: `${sH('📈','MARKET SIZE')}<div class="bmet">${marketBoxes.map(b=>`<div class="bm"><div class="bmv">${escH(b.v)}</div><div class="bml">${escH(b.l)}</div></div>`).join('')}</div><div class="stext" style="font-size:11px;color:#888;margin-top:2px">${escH(form.market_size)}</div>` },
    { type: 'target_market', items: audienceTags.length>0 ? audienceTags : [form.target_audience||''],
      html: `${sH('🎯','TARGET MARKET')}${tagsHTML}` },
    { type: 'business_model', bmValue: bmValue,
      html: `${sH('💰','BUSINESS MODEL')}${buildBMHtml(bmValue) || ''}` },
    { type: 'competitive_advantage', text: form.competitive_advantage||'',
      html: `${sH('🏆','COMPETITIVE ADVANTAGE')}<div class="stext">${escH(form.competitive_advantage)}</div>` },
    { type: 'risks', items: risks,
      html: `${sH('⚠️','RISKS &amp; CHALLENGES')}<div class="risks">${risks.map(r=>`<div class="risk"><div class="rdot"></div><div class="rtxt">${escH(r)}</div></div>`).join('')}</div>` },
    { type: 'next_steps', items: nextSteps,
      html: `${sH('🚀','NEXT STEPS')}<div class="tl">${nextSteps.map(s=>`<div class="tli"><div class="tldot"></div><div><div class="tltitle">${escH(s)}</div></div></div>`).join('')}</div>` },
  ].filter(s=>s.html)

  const PAGE_H = 557
  const buckets = []
  let cur = [], curH = 0
  for (const s of sections) {
    const h = sectionHeight(s)
    if (curH+h > PAGE_H && cur.length) { buckets.push(cur); cur=[]; curH=0 }
    cur.push(s.html); curH+=h
  }
  if (cur.length) buckets.push(cur)

  const darkFooter = `<div class="dfooter"><div class="logo"><svg xmlns="http://www.w3.org/2000/svg" height="28" viewBox="0 0 260 40" style="display:block"><defs><linearGradient id="aiGradLogo" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#7b9ff7"/><stop offset="100%" stop-color="#9b7ff7"/></linearGradient></defs><text font-family="Outfit, Helvetica, Arial, sans-serif" font-weight="300" font-size="32" y="32"><tspan fill="#ffffff">Eurek</tspan><tspan fill="url(#aiGradLogo)">AI</tspan><tspan fill="#ffffff">dea</tspan></text></svg></div><div class="dfbadge">myeurekaidea.com</div></div>`
  const contentPages = buckets.map((htmls, i) => {
    const foot = i===buckets.length-1 ? darkFooter : pf
    return `<div class="page"><div class="abar"></div><div class="cpage">${ph(i+2)}<div class="pbody">${htmls.join('<div class="divider"></div>')}</div>${foot}</div><div class="abar"></div></div>`
  }).join('')

  return `<style>${CSS}</style><div class="pdf-wrap">${cover}${contentPages}</div>`
}
