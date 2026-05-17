import { useState } from 'react'

// ─── Constants ───────────────────────────────────────────────────────────────

const MODEL_TYPES = [
  'Freemium / SaaS',
  'Marketplace',
  'Subscription',
  'One-time Purchase',
  'Advertising',
  'Licensing',
  'Transaction Fees',
  'Hardware + Software',
  'Other',
]

const TYPE_KEY = {
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

function typeToKey(t) { return TYPE_KEY[t] || t.toLowerCase().replace(/[^a-z]/g, '') }

function defaultFor(type) {
  switch (type) {
    case 'Freemium / SaaS':    return { freeTier: '', paidPrice: '', paidFeatures: '', paidLimits: '' }
    case 'Marketplace':        return { buyers: '', sellers: '', commission: '', feeStructure: '' }
    case 'Subscription':       return { tiers: [{ name: '', price: '', features: '' }] }
    case 'One-time Purchase':  return { price: '', included: '', upsells: '' }
    case 'Advertising':        return { audience: '', formats: '', revenue: '' }
    case 'Licensing':          return { licensees: '', royalties: '', exclusivity: '' }
    case 'Transaction Fees':   return { fee: '', whoPays: '', flow: '' }
    case 'Hardware + Software':return { hardwarePrice: '', softwarePrice: '', recurring: '' }
    case 'Other':              return { name: '', cards: [{ title: '', items: [''] }] }
    default:                   return {}
  }
}

// ─── Exported utilities ───────────────────────────────────────────────────────

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

export function extractBMChips(bmValue) {
  if (!bmValue) return { free: [], paid: [] }
  const { models = [], freemium, subscription, marketplace, oneTime, advertising, licensing, transactionFees, hardwareSoftware, other } = bmValue
  const free = [], paid = []

  if (models.includes('Freemium / SaaS') && freemium) {
    if (freemium.freeTier) free.push(...freemium.freeTier.split('\n').map(s => s.trim()).filter(Boolean))
    if (freemium.paidPrice) paid.push(freemium.paidPrice)
    if (freemium.paidFeatures) paid.push(...freemium.paidFeatures.split('\n').map(s => s.trim()).filter(Boolean))
  }
  if (models.includes('Subscription') && subscription?.tiers) {
    subscription.tiers.forEach(t => {
      const label = [t.name, t.price].filter(Boolean).join(' · ')
      if (label) paid.push(label)
      if (t.features) paid.push(...t.features.split('\n').map(s => s.trim()).filter(Boolean))
    })
  }
  if (models.includes('Marketplace') && marketplace) {
    if (marketplace.buyers) free.push(...marketplace.buyers.split('\n').map(s => s.trim()).filter(Boolean))
    if (marketplace.commission) paid.push(`Commission: ${marketplace.commission}`)
    if (marketplace.feeStructure) paid.push(...marketplace.feeStructure.split('\n').map(s => s.trim()).filter(Boolean))
  }
  if (models.includes('One-time Purchase') && oneTime) {
    if (oneTime.price) paid.push(`One-time: ${oneTime.price}`)
    if (oneTime.included) paid.push(...oneTime.included.split('\n').map(s => s.trim()).filter(Boolean))
    if (oneTime.upsells) paid.push(...oneTime.upsells.split('\n').map(s => s.trim()).filter(Boolean))
  }
  if (models.includes('Advertising') && advertising) {
    if (advertising.revenue) paid.push(advertising.revenue)
    if (advertising.formats) free.push(...advertising.formats.split('\n').map(s => s.trim()).filter(Boolean))
  }
  if (models.includes('Licensing') && licensing) {
    if (licensing.royalties) paid.push(`Royalties: ${licensing.royalties}`)
    if (licensing.licensees) free.push(...licensing.licensees.split('\n').map(s => s.trim()).filter(Boolean))
  }
  if (models.includes('Transaction Fees') && transactionFees) {
    if (transactionFees.fee) paid.push(`Fee: ${transactionFees.fee}`)
    if (transactionFees.whoPays) paid.push(transactionFees.whoPays)
  }
  if (models.includes('Hardware + Software') && hardwareSoftware) {
    if (hardwareSoftware.hardwarePrice) paid.push(`Hardware: ${hardwareSoftware.hardwarePrice}`)
    if (hardwareSoftware.softwarePrice) paid.push(`Software: ${hardwareSoftware.softwarePrice}`)
    if (hardwareSoftware.recurring) paid.push(...hardwareSoftware.recurring.split('\n').map(s => s.trim()).filter(Boolean))
  }
  if (models.includes('Other') && other) {
    const cards = other.cards || []
    cards.forEach(card => {
      if (card.title) free.push(card.title)
      card.items?.forEach(item => { if (item.trim()) free.push(item.trim()) })
    })
  }

  return { free, paid }
}

export function serializeBMValue(bmValue) {
  if (!bmValue) return ''
  return JSON.stringify(bmValue)
}

// ─── Theme tokens ─────────────────────────────────────────────────────────────

const T = {
  dark: {
    inputBg: 'rgba(255,255,255,0.05)', inputBorder: '0.5px solid rgba(255,255,255,0.12)',
    inputColor: '#e8e8e8',
    labelColor: 'rgba(255,255,255,0.4)',
    chipBg: 'rgba(255,255,255,0.04)', chipBorder: '0.5px solid rgba(255,255,255,0.12)',
    chipColor: 'rgba(255,255,255,0.6)',
    chipSelBg: 'rgba(123,159,247,0.14)', chipSelBorder: '1px solid #7b9ff7', chipSelColor: '#7b9ff7',
    cardBg: 'rgba(255,255,255,0.03)', cardBorder: '0.5px solid rgba(123,159,247,0.22)',
    innerBg: 'rgba(255,255,255,0.04)', innerBorder: '0.5px solid rgba(255,255,255,0.08)',
    mutedText: 'rgba(255,255,255,0.2)',
    removeColor: 'rgba(255,255,255,0.3)',
    addBorder: '0.5px dashed rgba(123,159,247,0.35)',
  },
  light: {
    inputBg: '#fff', inputBorder: '0.5px solid rgba(44,44,42,0.18)',
    inputColor: '#2c2c2a',
    labelColor: '#888780',
    chipBg: '#f5f5f3', chipBorder: '0.5px solid rgba(44,44,42,0.13)',
    chipColor: '#666',
    chipSelBg: 'rgba(123,159,247,0.1)', chipSelBorder: '1px solid #7b9ff7', chipSelColor: '#4a6fd4',
    cardBg: '#fafaf8', cardBorder: '0.5px solid rgba(123,159,247,0.28)',
    innerBg: '#f0f0ee', innerBorder: '0.5px solid rgba(44,44,42,0.1)',
    mutedText: '#ccc',
    removeColor: '#bbb',
    addBorder: '0.5px dashed rgba(123,159,247,0.4)',
  },
}

// ─── Low-level field primitives ───────────────────────────────────────────────

function inputStyle(t) {
  return {
    width: '100%', background: T[t].inputBg, border: T[t].inputBorder,
    borderRadius: 7, padding: '9px 12px', fontSize: 13, color: T[t].inputColor,
    fontFamily: "'Outfit', sans-serif", fontWeight: 300, outline: 'none',
    boxSizing: 'border-box',
  }
}
function textareaStyle(t) {
  return { ...inputStyle(t), resize: 'vertical', lineHeight: 1.6 }
}

function Lbl({ children, t }) {
  return <span style={{ fontSize: 11, color: T[t].labelColor, letterSpacing: 0.3, marginBottom: 5, display: 'block' }}>{children}</span>
}
function Fld({ label, t, children }) {
  return <div style={{ marginBottom: 12 }}><Lbl t={t}>{label}</Lbl>{children}</div>
}

// ─── Card shell ───────────────────────────────────────────────────────────────

function Shell({ title, onRemove, t, children }) {
  return (
    <div style={{ background: T[t].cardBg, border: T[t].cardBorder, borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#7b9ff7' }}>{title}</span>
        <button onClick={onRemove} style={{ background: 'none', border: T[t].inputBorder, borderRadius: 5, padding: '3px 8px', fontSize: 11, color: T[t].removeColor, cursor: 'pointer', fontFamily: 'inherit' }}>
          ✕ Remove
        </button>
      </div>
      {children}
    </div>
  )
}

// ─── Pre-built model cards ────────────────────────────────────────────────────

function FreemiumCard({ data, onChange, onRemove, t }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  return (
    <Shell title="Freemium / SaaS" onRemove={onRemove} t={t}>
      <Fld label="Free tier — what's included" t={t}>
        <textarea style={textareaStyle(t)} rows={3} value={data.freeTier || ''} onChange={e => u('freeTier', e.target.value)} placeholder="List features available for free" />
      </Fld>
      <Fld label="Paid tier — price point" t={t}>
        <input style={inputStyle(t)} value={data.paidPrice || ''} onChange={e => u('paidPrice', e.target.value)} placeholder="e.g. $9/mo, $99/yr" />
      </Fld>
      <Fld label="Paid tier — what's included" t={t}>
        <textarea style={textareaStyle(t)} rows={3} value={data.paidFeatures || ''} onChange={e => u('paidFeatures', e.target.value)} placeholder="List premium features" />
      </Fld>
      <Fld label="Paid tier — limits / caps" t={t}>
        <textarea style={textareaStyle(t)} rows={2} value={data.paidLimits || ''} onChange={e => u('paidLimits', e.target.value)} placeholder="e.g. up to 5 users, 10GB storage" />
      </Fld>
    </Shell>
  )
}

function MarketplaceCard({ data, onChange, onRemove, t }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  return (
    <Shell title="Marketplace" onRemove={onRemove} t={t}>
      <Fld label="Buyer side" t={t}>
        <textarea style={textareaStyle(t)} rows={2} value={data.buyers || ''} onChange={e => u('buyers', e.target.value)} placeholder="Who are your buyers and what do they get?" />
      </Fld>
      <Fld label="Seller side" t={t}>
        <textarea style={textareaStyle(t)} rows={2} value={data.sellers || ''} onChange={e => u('sellers', e.target.value)} placeholder="Who are your sellers and what do they offer?" />
      </Fld>
      <Fld label="Commission / take rate" t={t}>
        <input style={inputStyle(t)} value={data.commission || ''} onChange={e => u('commission', e.target.value)} placeholder="e.g. 15% per transaction" />
      </Fld>
      <Fld label="Fee structure" t={t}>
        <textarea style={textareaStyle(t)} rows={2} value={data.feeStructure || ''} onChange={e => u('feeStructure', e.target.value)} placeholder="Who pays? Buyer, seller, or both?" />
      </Fld>
    </Shell>
  )
}

function SubscriptionCard({ data, onChange, onRemove, t }) {
  const tiers = data.tiers?.length ? data.tiers : [{ name: '', price: '', features: '' }]
  function updTier(i, k, v) { onChange({ ...data, tiers: tiers.map((tier, idx) => idx === i ? { ...tier, [k]: v } : tier) }) }
  function addTier() { onChange({ ...data, tiers: [...tiers, { name: '', price: '', features: '' }] }) }
  function delTier(i) { if (tiers.length > 1) onChange({ ...data, tiers: tiers.filter((_, idx) => idx !== i) }) }
  return (
    <Shell title="Subscription" onRemove={onRemove} t={t}>
      {tiers.map((tier, i) => (
        <div key={i} style={{ background: T[t].innerBg, border: T[t].innerBorder, borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: T[t].labelColor }}>Tier {i + 1}</span>
            {tiers.length > 1 && (
              <button onClick={() => delTier(i)} style={{ background: 'none', border: 'none', color: T[t].removeColor, cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
            )}
          </div>
          <Fld label="Tier name" t={t}>
            <input style={inputStyle(t)} value={tier.name || ''} onChange={e => updTier(i, 'name', e.target.value)} placeholder="e.g. Basic, Pro, Enterprise" />
          </Fld>
          <Fld label="Price + billing cycle" t={t}>
            <input style={inputStyle(t)} value={tier.price || ''} onChange={e => updTier(i, 'price', e.target.value)} placeholder="e.g. $29/month or $290/year" />
          </Fld>
          <Fld label="What's included" t={t}>
            <textarea style={textareaStyle(t)} rows={3} value={tier.features || ''} onChange={e => updTier(i, 'features', e.target.value)} placeholder="List features per tier" />
          </Fld>
        </div>
      ))}
      <button onClick={addTier} style={{ width: '100%', background: 'none', border: T[t].addBorder, borderRadius: 7, padding: '8px', fontSize: 12, color: '#7b9ff7', cursor: 'pointer', fontFamily: 'inherit' }}>
        + Add another tier
      </button>
    </Shell>
  )
}

function OneTimeCard({ data, onChange, onRemove, t }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  return (
    <Shell title="One-time Purchase" onRemove={onRemove} t={t}>
      <Fld label="Price point" t={t}>
        <input style={inputStyle(t)} value={data.price || ''} onChange={e => u('price', e.target.value)} placeholder="e.g. $299 one-time" />
      </Fld>
      <Fld label="What's included" t={t}>
        <textarea style={textareaStyle(t)} rows={3} value={data.included || ''} onChange={e => u('included', e.target.value)} placeholder="What does the buyer get?" />
      </Fld>
      <Fld label="Upsells / add-ons" t={t}>
        <textarea style={textareaStyle(t)} rows={2} value={data.upsells || ''} onChange={e => u('upsells', e.target.value)} placeholder="Any optional extras or upgrades?" />
      </Fld>
    </Shell>
  )
}

function AdvertisingCard({ data, onChange, onRemove, t }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  return (
    <Shell title="Advertising" onRemove={onRemove} t={t}>
      <Fld label="Target audience" t={t}>
        <textarea style={textareaStyle(t)} rows={2} value={data.audience || ''} onChange={e => u('audience', e.target.value)} placeholder="Who sees the ads?" />
      </Fld>
      <Fld label="Ad formats" t={t}>
        <textarea style={textareaStyle(t)} rows={2} value={data.formats || ''} onChange={e => u('formats', e.target.value)} placeholder="e.g. banner, sponsored posts, video" />
      </Fld>
      <Fld label="Revenue model" t={t}>
        <input style={inputStyle(t)} value={data.revenue || ''} onChange={e => u('revenue', e.target.value)} placeholder="e.g. CPM, CPC, flat sponsorship fee" />
      </Fld>
    </Shell>
  )
}

function LicensingCard({ data, onChange, onRemove, t }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  return (
    <Shell title="Licensing" onRemove={onRemove} t={t}>
      <Fld label="Who you license to" t={t}>
        <textarea style={textareaStyle(t)} rows={2} value={data.licensees || ''} onChange={e => u('licensees', e.target.value)} placeholder="e.g. enterprises, other developers" />
      </Fld>
      <Fld label="Royalty / fee structure" t={t}>
        <input style={inputStyle(t)} value={data.royalties || ''} onChange={e => u('royalties', e.target.value)} placeholder="e.g. 10% of revenue, $X per seat" />
      </Fld>
      <Fld label="Exclusivity terms" t={t}>
        <textarea style={textareaStyle(t)} rows={2} value={data.exclusivity || ''} onChange={e => u('exclusivity', e.target.value)} placeholder="Exclusive or non-exclusive? Territory?" />
      </Fld>
    </Shell>
  )
}

function TransactionFeesCard({ data, onChange, onRemove, t }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  return (
    <Shell title="Transaction Fees" onRemove={onRemove} t={t}>
      <Fld label="Fee percentage or flat fee" t={t}>
        <input style={inputStyle(t)} value={data.fee || ''} onChange={e => u('fee', e.target.value)} placeholder="e.g. 2.9% + $0.30 per transaction" />
      </Fld>
      <Fld label="Who pays the fee" t={t}>
        <input style={inputStyle(t)} value={data.whoPays || ''} onChange={e => u('whoPays', e.target.value)} placeholder="Buyer, seller, or split?" />
      </Fld>
      <Fld label="Payment flow" t={t}>
        <textarea style={textareaStyle(t)} rows={2} value={data.flow || ''} onChange={e => u('flow', e.target.value)} placeholder="How does money move through your platform?" />
      </Fld>
    </Shell>
  )
}

function HardwareSoftwareCard({ data, onChange, onRemove, t }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  return (
    <Shell title="Hardware + Software" onRemove={onRemove} t={t}>
      <Fld label="Hardware price" t={t}>
        <input style={inputStyle(t)} value={data.hardwarePrice || ''} onChange={e => u('hardwarePrice', e.target.value)} placeholder="e.g. $199 one-time device cost" />
      </Fld>
      <Fld label="Software price" t={t}>
        <input style={inputStyle(t)} value={data.softwarePrice || ''} onChange={e => u('softwarePrice', e.target.value)} placeholder="e.g. $9/month subscription" />
      </Fld>
      <Fld label="Recurring component" t={t}>
        <textarea style={textareaStyle(t)} rows={2} value={data.recurring || ''} onChange={e => u('recurring', e.target.value)} placeholder="What keeps them paying? Updates, cloud sync?" />
      </Fld>
    </Shell>
  )
}

function OtherCard({ data, onChange, onRemove, t }) {
  const cards = data.cards?.length ? data.cards : [{ title: '', items: [''] }]

  function updCard(ci, k, v) { onChange({ ...data, cards: cards.map((c, i) => i === ci ? { ...c, [k]: v } : c) }) }
  function addCard() { onChange({ ...data, cards: [...cards, { title: '', items: [''] }] }) }
  function delCard(ci) { onChange({ ...data, cards: cards.filter((_, i) => i !== ci) }) }
  function updItem(ci, ii, v) {
    onChange({ ...data, cards: cards.map((c, i) => i !== ci ? c : { ...c, items: c.items.map((it, idx) => idx === ii ? v : it) }) })
  }
  function addItem(ci) {
    onChange({ ...data, cards: cards.map((c, i) => i !== ci ? c : { ...c, items: [...c.items, ''] }) })
  }
  function delItem(ci, ii) {
    onChange({ ...data, cards: cards.map((c, i) => i !== ci ? c : { ...c, items: c.items.filter((_, idx) => idx !== ii) }) })
  }

  return (
    <Shell title={data.name || 'Custom Model'} onRemove={onRemove} t={t}>
      <Fld label="Name your business model" t={t}>
        <input style={inputStyle(t)} value={data.name || ''} onChange={e => onChange({ ...data, name: e.target.value })} placeholder='e.g. "Grant Funding", "Franchise"' />
      </Fld>
      {cards.map((card, ci) => (
        <div key={ci} style={{ background: T[t].innerBg, border: T[t].innerBorder, borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: T[t].labelColor }}>List {ci + 1}</span>
            {cards.length > 1 && (
              <button onClick={() => delCard(ci)} style={{ background: 'none', border: 'none', color: T[t].removeColor, cursor: 'pointer', fontSize: 14, padding: 0 }}>✕</button>
            )}
          </div>
          <Fld label="Title" t={t}>
            <input style={inputStyle(t)} value={card.title || ''} onChange={e => updCard(ci, 'title', e.target.value)} placeholder="e.g. Grant Sources" />
          </Fld>
          <div style={{ marginBottom: 8 }}>
            {(card.items || []).map((item, ii) => (
              <div key={ii} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input
                  style={{ ...inputStyle(t), flex: 1 }}
                  value={item}
                  onChange={e => updItem(ci, ii, e.target.value)}
                  placeholder={`Item ${ii + 1}`}
                />
                {card.items.length > 1 && (
                  <button onClick={() => delItem(ci, ii)} style={{ background: 'none', border: 'none', color: T[t].removeColor, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={() => addItem(ci)} style={{ background: 'none', border: 'none', color: '#7b9ff7', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>+ Add item</button>
          </div>
        </div>
      ))}
      <button onClick={addCard} style={{ width: '100%', background: 'none', border: T[t].addBorder, borderRadius: 7, padding: 8, fontSize: 12, color: '#7b9ff7', cursor: 'pointer', fontFamily: 'inherit' }}>
        + Add another list card
      </button>
    </Shell>
  )
}

// ─── Card router ──────────────────────────────────────────────────────────────

function renderCard(type, data, onChange, onRemove, t) {
  const props = { data, onChange, onRemove, t }
  switch (type) {
    case 'Freemium / SaaS':    return <FreemiumCard key={type} {...props} />
    case 'Marketplace':        return <MarketplaceCard key={type} {...props} />
    case 'Subscription':       return <SubscriptionCard key={type} {...props} />
    case 'One-time Purchase':  return <OneTimeCard key={type} {...props} />
    case 'Advertising':        return <AdvertisingCard key={type} {...props} />
    case 'Licensing':          return <LicensingCard key={type} {...props} />
    case 'Transaction Fees':   return <TransactionFeesCard key={type} {...props} />
    case 'Hardware + Software':return <HardwareSoftwareCard key={type} {...props} />
    case 'Other':              return <OtherCard key={type} {...props} />
    default:                   return null
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BusinessModelSection({ value, onChange, theme = 'dark' }) {
  const t = theme === 'light' ? 'light' : 'dark'
  const val = value || {}
  const selected = val.models || []

  function toggleModel(type) {
    const key = typeToKey(type)
    if (selected.includes(type)) {
      const newVal = { ...val, models: selected.filter(m => m !== type) }
      delete newVal[key]
      onChange(newVal)
    } else {
      onChange({ ...val, models: [...selected, type], [key]: val[key] || defaultFor(type) })
    }
  }

  function updateModelData(type, data) {
    onChange({ ...val, [typeToKey(type)]: data })
  }

  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 300 }}>
      <p style={{ fontSize: 11, color: T[t].labelColor, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>
        Select your business model(s)
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
        {MODEL_TYPES.map(type => {
          const isSel = selected.includes(type)
          return (
            <button
              key={type}
              onClick={() => toggleModel(type)}
              style={{
                background: isSel ? T[t].chipSelBg : T[t].chipBg,
                border: isSel ? T[t].chipSelBorder : T[t].chipBorder,
                borderRadius: 20,
                padding: '6px 14px',
                fontSize: 12,
                color: isSel ? T[t].chipSelColor : T[t].chipColor,
                cursor: 'pointer',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: isSel ? 500 : 300,
                transition: 'all 0.12s',
              }}
            >
              {type}
            </button>
          )
        })}
      </div>

      {selected.length === 0 && (
        <p style={{ fontSize: 12, color: T[t].mutedText, fontStyle: 'italic', marginTop: 4 }}>
          Select one or more models above to add details
        </p>
      )}

      {selected.map(type =>
        renderCard(
          type,
          val[typeToKey(type)] || defaultFor(type),
          d => updateModelData(type, d),
          () => toggleModel(type),
          t,
        )
      )}
    </div>
  )
}
