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
