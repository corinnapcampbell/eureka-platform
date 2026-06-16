import { useState, useEffect, useRef } from 'react'
import { parseBMValue, extractBMChips } from './BusinessModelSection'

export const SLIDE_W = 960
export const SLIDE_H = 540
const NAVY = '#0e0e1f'
const GRAD = 'linear-gradient(90deg, #7b9ff7, #9b7ff7)'

export const SLIDE_NAMES = ['Cover', 'Problem', 'Solution', 'Market', 'Business Model', 'Revenue Projections', 'Advantage', 'Competitive Landscape', 'Team', 'Traction', 'Roadmap', 'Closing']

// ─── Helpers for dynamic slide generation ────────────────────────────────────
function fmtDate(str) {
  try { return new Date(str).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
  catch { return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
}

function firstSentence(text) {
  if (!text) return ''
  const m = text.match(/^[^.!?\n]+[.!?]/)
  return m ? m[0].trim() : (text.split('\n')[0] || '').trim()
}

function toLines(text, max) {
  if (!text) return []
  let parts = text.split(/\n+/).map(l => l.replace(/^[-•*\d.)]+\s*/, '').trim()).filter(l => l.length > 4)
  if (parts.length < 2) parts = text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 8)
  return parts.slice(0, max)
}

function bulletsFrom(text, fallback, max = 4) {
  const lines = toLines(text, max)
  if (!lines.length) return fallback.slice(0, max)
  const out = [...lines]
  let fi = 0
  while (out.length < max && fi < fallback.length) { out.push(fallback[fi++]) }
  return out.slice(0, max)
}

function featuresFrom(howItWorks) {
  const ICONS = ['⚡', '🔒', '✨', '🚀']
  const steps = toLines(howItWorks, 4)
  if (steps.length >= 2) {
    return steps.slice(0, 4).map((s, i) => ({ icon: ICONS[i] || '◆', label: s.length > 44 ? s.slice(0, 44) + '…' : s }))
  }
  return [
    { icon: '💡', label: 'Core Innovation' },
    { icon: '⚡', label: 'Built for Speed' },
    { icon: '🔒', label: 'Secure by Default' },
    { icon: '🚀', label: 'Ready to Scale' },
  ]
}

function metricsFrom(text) {
  const nums = text ? (text.match(/\$[\d.,]+[BMKbmk]?\+?/g) || []) : []
  const LABELS = ['Total Addressable Market', 'Serviceable Market', 'Initial Target Market']
  if (nums.length >= 3) return nums.slice(0, 3).map((v, i) => ({ value: v, label: LABELS[i] }))
  if (nums.length > 0) return [{ value: nums[0], label: 'Market Opportunity' }, { value: '—', label: 'Serviceable Market' }, { value: '—', label: 'Initial Target' }]
  return [{ value: '—', label: 'Total Addressable Market' }, { value: '—', label: 'Serviceable Market' }, { value: '—', label: 'Initial Target' }]
}

function roadmapFrom(lookingFor) {
  const steps = toLines(lookingFor, 4)
  if (steps.length >= 2) {
    return steps.slice(0, 4).map((s, i) => ({
      num: String(i + 1).padStart(2, '0'),
      title: s.length > 38 ? s.slice(0, 38) + '…' : s,
      description: '',
    }))
  }
  return [
    { num: '01', title: 'MVP Launch', description: 'Core product to early adopters' },
    { num: '02', title: 'Market Validation', description: 'Feedback loops and rapid iteration' },
    { num: '03', title: 'Scale & Grow', description: 'Expand users and geographies' },
    { num: '04', title: 'Strategic Partnerships', description: 'Distribution and alliances' },
  ]
}

export function buildDefaultSlides(idea, presenterName = '', ownerEmail = '') {
  const t = idea?.title || 'Untitled Idea'
  const tagline = idea?.tagline || firstSentence(idea?.description) || ''
  const cats = idea?.category?.length ? idea.category : []

  const prob = idea?.problem || ''
  const soln = idea?.solution || idea?.description || ''
  const how  = idea?.how_it_works || ''
  const mkt  = idea?.market_size || ''
  const biz  = idea?.business_model || ''
  const adv  = idea?.competitive_advantage || ''
  const lf   = idea?.looking_for || ''

  const bizLines = toLines(biz, 4)
  const bmParsed = parseBMValue(biz)
  const { free: _bizFree, paid: _bizPaid } = extractBMChips(bmParsed)
  const bizFreeChips = _bizFree.length
    ? _bizFree
    : biz.split('\n').map(l => l.trim()).filter(l => /^free:/i.test(l)).map(l => l.replace(/^free:\s*/i, '').trim()).filter(Boolean)
  const bizPaidChips = _bizPaid.length
    ? _bizPaid
    : biz.split('\n').map(l => l.trim()).filter(l => /^paid:/i.test(l)).map(l => l.replace(/^paid:\s*/i, '').trim()).filter(Boolean)
  const mktNum   = (mkt.match(/\$[\d.,]+[BMKbmk]?\+?/) || [''])[0]

  return [
    {
      type: 'cover',
      title: t,
      tagline,
      presenter: presenterName || 'Founder',
      date: fmtDate(idea?.created_at),
      stage: idea?.stage || 'Pre-Seed',
      marketSize: mktNum,
      categories: cats,
      hash: idea?.blockchain_hash || '',
    },
    {
      type: 'problem',
      sectionLabel: 'THE PROBLEM',
      title: firstSentence(prob) || 'A critical gap in the market that needs solving.',
      bullets: bulletsFrom(prob, [
        'A critical problem with no reliable solution today',
        'Existing options are too expensive, complex, or fragmented',
        'Target users are underserved by current tools',
        'The gap widens as demand grows',
      ]),
    },
    {
      type: 'solution',
      sectionLabel: 'THE SOLUTION',
      title: firstSentence(soln) || `${t} solves this problem.`,
      description: soln,
      features: featuresFrom(how),
    },
    {
      type: 'market',
      sectionLabel: 'MARKET OPPORTUNITY',
      headline: mktNum ? `A ${mktNum} market opportunity.` : 'A large, fast-growing market with no dominant player.',
      metrics: metricsFrom(mkt),
      description: mkt || 'Rapidly growing market at the intersection of key technology trends.',
      tags: (() => {
        const aud = (idea?.target_audience || '').split(/,\s*/).map(s => s.trim()).filter(Boolean)
        return aud.length ? aud : (cats.length ? cats : ['Founders', 'Investors', 'Enterprises'])
      })(),
    },
    {
      type: 'business',
      sectionLabel: 'BUSINESS MODEL',
      title: 'Scalable revenue model designed for growth.',
      freeTierChips: (() => { try { const bm = parseBMValue(idea?.business_model); const { free } = extractBMChips(bm); return free } catch { return [] } })(),
      paidTierChips: (() => { try { const bm = parseBMValue(idea?.business_model); const { paid } = extractBMChips(bm); return paid } catch { return [] } })(),
      note: bizLines.slice(2).join(' ') || 'Revenue scales with adoption and market growth.',
    },
    {
      type: 'revenue',
      sectionLabel: 'REVENUE PROJECTIONS',
      paidPrice: (() => {
        try {
          const rp = typeof idea?.revenue_projections === 'string' ? JSON.parse(idea.revenue_projections) : idea?.revenue_projections
          if (rp?.paidPriceOverride) return rp.paidPriceOverride
          const bm = parseBMValue(idea?.business_model)
          const allModels = bm?.models || []
          for (const model of allModels) {
            const data = bm?.[model.toLowerCase().replace(/\s*\/\s*/g, '_').replace(/\s+/g, '_').replace(/[^a-z_]/g, '')]
            if (data?.paidPrice) return data.paidPrice
          }
          return '$12'
        } catch { return '$12' }
      })(),
      startingUsers: (() => { try { const rp = typeof idea?.revenue_projections === 'string' ? JSON.parse(idea.revenue_projections) : idea?.revenue_projections; return rp?.startingUsers || 100 } catch { return 100 } })(),
      monthlyGrowthRate: (() => { try { const rp = typeof idea?.revenue_projections === 'string' ? JSON.parse(idea.revenue_projections) : idea?.revenue_projections; return rp?.monthlyGrowthRate || 10 } catch { return 10 } })(),
      conversionRate: (() => { try { const rp = typeof idea?.revenue_projections === 'string' ? JSON.parse(idea.revenue_projections) : idea?.revenue_projections; return rp?.conversionRate || 5 } catch { return 5 } })(),
      aiGenerated: false,
      whoPays: idea?.who_pays || '',
      revenueStreams: idea?.revenue_streams || '',
      pricingPower: idea?.pricing_power || '',
      revenuePotential: idea?.revenue_potential || '',
      businessStage: idea?.business_stage || '',
    },
    {
      type: 'advantage',
      sectionLabel: 'COMPETITIVE ADVANTAGE',
      weHaveChips: (() => {
        const we = adv.split('\n').map(l => l.trim()).filter(l => /^we:/i.test(l)).map(l => l.replace(/^we:\s*/i, '').trim()).filter(Boolean)
        return we.length ? we : bulletsFrom(adv, [
          'Unique approach no competitor has tried',
          'Proprietary technology or process',
          'Network effects drive compounding growth',
          'First-mover advantage in key segments',
        ])
      })(),
      othersDontChips: (() => {
        const they = adv.split('\n').map(l => l.trim()).filter(l => /^they:/i.test(l)).map(l => l.replace(/^they:\s*/i, '').trim()).filter(Boolean)
        return they.length ? they : []
      })(),
      quote: firstSentence(adv) || `${t} is uniquely positioned to lead this market.`,
    },
    {
      type: 'competitive',
      sectionLabel: 'COMPETITIVE LANDSCAPE',
      format: (() => { try { const cl = typeof idea?.competitive_landscape === 'string' ? JSON.parse(idea.competitive_landscape) : idea?.competitive_landscape; return cl?.format || 'table' } catch { return 'table' } })(),
      competitiveLandscape: idea?.competitive_landscape || null,
      ideaTitle: idea?.title || '',
    },
    {
      type: 'team',
      sectionLabel: 'THE TEAM',
      members: (() => { try { const t = typeof idea?.team === 'string' ? JSON.parse(idea.team) : idea?.team; if (!t?.name) return []; return [{ name: t.name || '', role: t.role || '', bio: t.bio || '' }] } catch { return [] } })(),
    },
    {
      type: 'traction',
      sectionLabel: 'TRACTION & MILESTONES',
      milestones: (() => { try { const tr = typeof idea?.traction === 'string' ? JSON.parse(idea.traction) : idea?.traction; return (tr?.milestones || []).slice(0, 6).map(m => ({ label: m.label || '', date: m.date || '', status: m.status || 'upcoming' })) } catch { return [] } })(),
    },
    {
      type: 'roadmap',
      sectionLabel: 'ROADMAP',
      title: "What's Next",
      steps: roadmapFrom(lf),
    },
    {
      type: 'closing',
      title: `Let's build the future of ${cats[0] || 'innovation'} together.`,
      subtitle: tagline || firstSentence(soln) || 'Ready to partner on the next big thing?',
      email: ownerEmail,
      website: 'myeurekaidea.com',
    },
  ]
}

// ─── Inline-editable text span ────────────────────────────────────────────────
export function ET({ value, onChange, multiline, style }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { if (!editing) setDraft(value) }, [value, editing])

  function activate(e) {
    if (!onChange) return
    e.stopPropagation()
    setDraft(value)
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    if (draft !== value) onChange(draft)
  }

  if (editing) {
    const Tag = multiline ? 'textarea' : 'input'
    return (
      <Tag
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
          if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit() }
        }}
        style={{
          background: 'rgba(123,159,247,0.18)',
          border: '1.5px solid #7b9ff7',
          borderRadius: 4,
          outline: 'none',
          width: '100%',
          resize: multiline ? 'vertical' : 'none',
          fontFamily: 'inherit',
          color: 'inherit',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          lineHeight: 'inherit',
          padding: '2px 6px',
          ...style,
        }}
      />
    )
  }

  return (
    <span
      onClick={onChange ? activate : undefined}
      title={onChange ? 'Click to edit' : undefined}
      style={{
        cursor: onChange ? 'text' : 'default',
        display: 'inline-block',
        minWidth: 20,
        borderBottom: onChange ? '1px dashed rgba(123,159,247,0.5)' : 'none',
        ...style,
      }}
    >
      {value || (onChange ? <em style={{ opacity: 0.3, fontStyle: 'normal' }}>click to edit</em> : '')}
    </span>
  )
}

// ─── Chip input for deck slide editors (module-level to prevent focus loss) ───
function DeckChipInput({ chips, onChipsChange, inputVal, setInputVal, placeholder, chipBg, chipBorder, chipText, inputColor }) {
  function add() {
    const v = inputVal.trim()
    if (v && !chips.includes(v)) onChipsChange([...chips, v])
    setInputVal('')
  }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: chips.length ? 6 : 0 }}>
        {chips.map((c, i) => (
          <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: chipBg, border: `1px solid ${chipBorder}`, borderRadius: 20, padding: '2px 8px 2px 10px', fontSize: 10.5 }}>
            <span style={{ color: chipText, lineHeight: 1.4 }}>{c}</span>
            <button
              onMouseDown={e => { e.preventDefault(); onChipsChange(chips.filter((_, j) => j !== i)) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: chipText, fontSize: 11, padding: 0, lineHeight: 1, opacity: 0.6 }}
            >×</button>
          </div>
        ))}
      </div>
      <input
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        placeholder={placeholder}
        style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 10.5, color: inputColor, width: '100%', opacity: 0.55 }}
      />
    </div>
  )
}

// ─── Shared slide decorations ─────────────────────────────────────────────────
function AccentBars() {
  return (
    <>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: GRAD, zIndex: 2 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: GRAD, zIndex: 2 }} />
    </>
  )
}

function SlideFooter({ slideNum, dark }) {
  const muted = dark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)'
  const textFill = dark ? '#ffffff' : '#0e0e1f'
  const gradId = `aiGradSlide${slideNum}${dark ? 'W' : 'D'}`
  return (
    <div style={{ position: 'absolute', bottom: 8, left: 28, right: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
      <svg xmlns="http://www.w3.org/2000/svg" height="14" width="91" viewBox="0 0 260 40" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7b9ff7" />
            <stop offset="100%" stopColor="#9b7ff7" />
          </linearGradient>
        </defs>
        <text fontFamily="Outfit, Helvetica, Arial, sans-serif" fontWeight="300" fontSize="32" y="32">
          <tspan fill={textFill}>Eurek</tspan>
          <tspan fill={`url(#${gradId})`}>AI</tspan>
          <tspan fill={textFill}>dea</tspan>
        </text>
      </svg>
      <span style={{ fontSize: 9, color: muted, letterSpacing: 0.3 }}>Confidential · {slideNum} / 8</span>
    </div>
  )
}

// ─── Slide renders (960×540) ──────────────────────────────────────────────────
function CoverSlide({ slide, slideNum, onUpdate }) {
  const u = onUpdate ? (f, v) => onUpdate({ [f]: v }) : null
  const updateCat = (i, v) => {
    if (!onUpdate) return
    const cats = [...slide.categories]; cats[i] = v; onUpdate({ categories: cats })
  }
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: NAVY, position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
      <AccentBars />
      <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.15)' }} />
      <div style={{ position: 'absolute', top: -30, right: -30, width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.1)' }} />
      <div style={{ position: 'absolute', bottom: 60, left: -60, width: 220, height: 220, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.1)' }} />
      <div style={{ position: 'absolute', bottom: 20, left: -20, width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.06)' }} />

      <div style={{ position: 'absolute', top: 18, left: 28 }}>
        <svg xmlns="http://www.w3.org/2000/svg" height="19" width="124" viewBox="0 0 260 40" style={{ display: 'block' }}>
          <defs>
            <linearGradient id={`aiGradSlide${slideNum}H`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7b9ff7" />
              <stop offset="100%" stopColor="#9b7ff7" />
            </linearGradient>
          </defs>
          <text fontFamily="Outfit, Helvetica, Arial, sans-serif" fontWeight="300" fontSize="32" y="32">
            <tspan fill="#ffffff">Eurek</tspan>
            <tspan fill={`url(#aiGradSlide${slideNum}H)`}>AI</tspan>
            <tspan fill="#ffffff">dea</tspan>
          </text>
        </svg>
      </div>
      <div style={{ position: 'absolute', top: 16, right: 28, fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.22)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '3px 8px' }}>
        CONFIDENTIAL
      </div>

      <div style={{ position: 'absolute', top: 58, left: 28, right: 28, display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {(slide.categories || []).map((cat, i) => (
          <span key={i} style={{ fontSize: 10, background: 'rgba(123,159,247,0.18)', color: '#7b9ff7', borderRadius: 20, padding: '3px 10px', border: '0.5px solid rgba(123,159,247,0.3)', display: 'inline-flex', alignItems: 'center' }}>
            <ET value={cat} onChange={u ? v => updateCat(i, v) : null} style={{ fontSize: 10 }} />
          </span>
        ))}
      </div>

      <div style={{ position: 'absolute', top: 100, left: 28, right: 160 }}>
        <div style={{ fontSize: 34, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 14 }}>
          <ET value={slide.title} onChange={u ? v => u('title', v) : null} multiline style={{ fontSize: 34, fontWeight: 700, color: '#fff' }} />
        </div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, marginBottom: 22 }}>
          <ET value={slide.tagline} onChange={u ? v => u('tagline', v) : null} style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)' }} />
        </div>
        <div style={{ height: 0.5, background: 'rgba(255,255,255,0.1)', marginBottom: 22, maxWidth: 520 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: '0 28px', width: 'fit-content' }}>
          {[
            { label: 'Presented by', field: 'presenter' },
            { label: 'Date', field: 'date' },
            { label: 'Stage', field: 'stage' },
            { label: 'Market Size', field: 'marketSize' },
          ].map(({ label, field }) => (
            <div key={field}>
              <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.28)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
                <ET value={slide[field]} onChange={u ? v => u(field, v) : null} style={{ fontSize: 13 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {slide.hash && (
        <div style={{ position: 'absolute', bottom: 28, left: 28, right: 28 }}>
          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.16)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            ⬡ {slide.hash}
          </div>
        </div>
      )}
      <SlideFooter slideNum={slideNum} dark />
    </div>
  )
}

function ProblemSlide({ slide, slideNum, onUpdate }) {
  const updateBullet = (i, v) => {
    if (!onUpdate) return
    const bullets = [...slide.bullets]; bullets[i] = v; onUpdate({ bullets })
  }
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: '#fff', position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
      <AccentBars />
      <div style={{ position: 'absolute', top: 0, left: 0, width: 310, bottom: 0, background: NAVY, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 32px', overflow: 'hidden' }}>
        <div style={{ fontSize: 8.5, color: '#7b9ff7', letterSpacing: 1.5, fontWeight: 600, marginBottom: 18, textTransform: 'uppercase' }}>{slide.sectionLabel}</div>
        <div style={{ fontSize: 30, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>
          {onUpdate
            ? <ET value={slide.title} onChange={v => onUpdate({ title: v })} multiline style={{ fontSize: 20, color: '#fff' }} />
            : slide.title}
        </div>
        <div style={{ position: 'absolute', bottom: -50, left: -50, width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.12)' }} />
        <div style={{ position: 'absolute', bottom: -15, left: -15, width: 110, height: 110, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.08)' }} />
      </div>
      <div style={{ position: 'absolute', top: 0, left: 310, right: 0, bottom: 0, padding: '44px 44px 44px 44px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {(slide.bullets || []).map((b, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-start' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
              {i + 1}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: '#2C2C2A', flex: 1 }}>
              {onUpdate ? <ET value={b} onChange={v => updateBullet(i, v)} multiline style={{ fontSize: 14, color: '#2C2C2A' }} /> : b}
            </div>
          </div>
        ))}
      </div>
      <SlideFooter slideNum={slideNum} />
    </div>
  )
}

function SolutionSlide({ slide, slideNum, onUpdate }) {
  const updateFeature = (i, label) => {
    if (!onUpdate) return
    const features = slide.features.map((f, fi) => fi === i ? { ...f, label } : f)
    onUpdate({ features })
  }
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: '#fff', position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
      <AccentBars />
      <div style={{ padding: '42px 52px 38px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 8.5, color: '#7b9ff7', letterSpacing: 1.5, fontWeight: 600, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
            <span>💡</span><span>{slide.sectionLabel}</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: NAVY, lineHeight: 1.3, marginBottom: 14 }}>
            {onUpdate ? <ET value={slide.title} onChange={v => onUpdate({ title: v })} multiline style={{ fontSize: 26, color: NAVY }} /> : slide.title}
          </div>
          <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7, maxWidth: 720 }}>
            {onUpdate ? <ET value={slide.description} onChange={v => onUpdate({ description: v })} multiline style={{ fontSize: 14, color: '#555' }} /> : slide.description}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 'auto' }}>
          {(slide.features || []).map((f, i) => (
            <div key={i} style={{ background: 'linear-gradient(135deg, rgba(123,159,247,0.07), rgba(155,127,247,0.07))', border: '0.5px solid rgba(123,159,247,0.18)', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: NAVY }}>
                {onUpdate ? <ET value={f.label} onChange={v => updateFeature(i, v)} style={{ fontSize: 12, color: NAVY }} /> : f.label}
              </div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter slideNum={slideNum} />
    </div>
  )
}

function MarketSlide({ slide, slideNum, onUpdate }) {
  const [tagInput, setTagInput] = useState('')
  const updateMetric = (i, field, val) => {
    if (!onUpdate) return
    const metrics = slide.metrics.map((m, mi) => mi === i ? { ...m, [field]: val } : m)
    onUpdate({ metrics })
  }
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: '#fff', position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
      <AccentBars />
      <div style={{ padding: '42px 52px 38px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 8.5, color: '#7b9ff7', letterSpacing: 1.5, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>{slide.sectionLabel}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: NAVY, lineHeight: 1.25, marginBottom: 22 }}>
          {onUpdate ? <ET value={slide.headline} onChange={v => onUpdate({ headline: v })} multiline style={{ fontSize: 28, color: NAVY }} /> : slide.headline}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 18 }}>
          {(slide.metrics || []).map((m, i) => (
            <div key={i} style={{ background: NAVY, borderRadius: 12, padding: '18px 22px' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: 6 }}>
                {onUpdate ? <ET value={m.value} onChange={v => updateMetric(i, 'value', v)} style={{ fontSize: 32, color: '#fff' }} /> : m.value}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {onUpdate ? <ET value={m.label} onChange={v => updateMetric(i, 'label', v)} style={{ fontSize: 10 }} /> : m.label}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 16 }}>
          {onUpdate ? <ET value={slide.description} onChange={v => onUpdate({ description: v })} multiline style={{ fontSize: 14, color: '#555' }} /> : slide.description}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {onUpdate ? (
            <DeckChipInput
              chips={slide.tags || []}
              onChipsChange={v => onUpdate({ tags: v })}
              inputVal={tagInput}
              setInputVal={setTagInput}
              placeholder="Add an audience, press Enter…"
              chipBg="rgba(155,127,247,0.1)"
              chipBorder="rgba(155,127,247,0.3)"
              chipText="#9b7ff7"
              inputColor="#555"
            />
          ) : (
            (slide.tags || []).map((t, i) => (
              <span key={i} style={{ fontSize: 11, background: 'rgba(123,159,247,0.1)', color: '#7b9ff7', borderRadius: 20, padding: '4px 13px', border: '0.5px solid rgba(123,159,247,0.22)' }}>
                {t}
              </span>
            ))
          )}
        </div>
      </div>
      <SlideFooter slideNum={slideNum} />
    </div>
  )
}

function BusinessSlide({ slide, slideNum, onUpdate }) {
  const u = onUpdate ? (f, v) => onUpdate({ [f]: v }) : null
  const freeChips = slide.freeTierChips || []
  const paidChips = slide.paidTierChips || []
  const [freeInput, setFreeInput] = useState('')
  const [paidInput, setPaidInput] = useState('')
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: NAVY, position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: GRAD }} />
      <div style={{ padding: '44px 56px 40px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 10, color: 'rgba(123,159,247,0.7)', letterSpacing: '3px', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>{slide.sectionLabel}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 28 }}>
          {u ? <ET value={slide.title} onChange={v => u('title', v)} multiline style={{ fontSize: 22, color: '#fff' }} /> : slide.title}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: 1, minHeight: 0 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 3, background: 'linear-gradient(90deg,#1db47c,#16a368)', flexShrink: 0 }} />
            <div style={{ padding: '20px 24px', flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1db47c', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: 'rgba(29,180,124,0.15)', borderRadius: 6, padding: '3px 10px' }}>FREE</span>
              </div>
              {u ? (
                <DeckChipInput chips={freeChips} onChipsChange={v => u('freeTierChips', v)} inputVal={freeInput} setInputVal={setFreeInput} placeholder="Add free feature…" chipBg="rgba(29,180,124,0.1)" chipBorder="rgba(29,180,124,0.3)" chipText="#1db47c" inputColor="rgba(255,255,255,0.4)" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {freeChips.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1db47c', flexShrink: 0, marginTop: 5 }} />
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ background: 'rgba(123,159,247,0.08)', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 3, background: GRAD, flexShrink: 0 }} />
            <div style={{ padding: '20px 24px', flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#7b9ff7', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: 'rgba(123,159,247,0.15)', borderRadius: 6, padding: '3px 10px' }}>PRO ✦</span>
              </div>
              {u ? (
                <DeckChipInput chips={paidChips} onChipsChange={v => u('paidTierChips', v)} inputVal={paidInput} setInputVal={setPaidInput} placeholder="Add pro feature…" chipBg="rgba(123,159,247,0.12)" chipBorder="rgba(123,159,247,0.35)" chipText="#7b9ff7" inputColor="rgba(255,255,255,0.4)" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {paidChips.map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7b9ff7', flexShrink: 0, marginTop: 5 }} />
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: 12, marginTop: 16 }}>
          {u ? <ET value={slide.note} onChange={v => u('note', v)} style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }} /> : slide.note}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: GRAD }} />
    </div>
  )
}

function AdvantageSlide({ slide, slideNum, onUpdate }) {
  const weHaveChips = slide.weHaveChips || slide.weHave || []
  const othersDontChips = slide.othersDontChips || slide.othersDont || []
  const [weInput, setWeInput] = useState('')
  const [theyInput, setTheyInput] = useState('')
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: '#fff', position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
      <AccentBars />
      <div style={{ padding: '36px 52px 38px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 8.5, color: '#7b9ff7', letterSpacing: 1.5, fontWeight: 600, textTransform: 'uppercase', marginBottom: 14 }}>{slide.sectionLabel}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#3B6D11', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, background: '#EAF3DE', borderRadius: 6, padding: '4px 10px', display: 'inline-block', alignSelf: 'flex-start' }}>
              ✓ We Have
            </div>
            {onUpdate ? (
              <DeckChipInput
                chips={weHaveChips}
                onChipsChange={v => onUpdate({ weHaveChips: v })}
                inputVal={weInput}
                setInputVal={setWeInput}
                placeholder="Add an advantage, press Enter…"
                chipBg="rgba(20,184,166,0.08)"
                chipBorder="rgba(20,184,166,0.35)"
                chipText="#0d9488"
                inputColor="#555"
              />
            ) : (
              weHaveChips.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 11, alignItems: 'flex-start' }}>
                  <span style={{ color: '#7b9ff7', fontSize: 13, marginTop: 1, flexShrink: 0 }}>◆</span>
                  <div style={{ fontSize: 13, color: '#333', lineHeight: 1.45 }}>{item}</div>
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#A32D2D', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, background: '#FDECEA', borderRadius: 6, padding: '4px 10px', display: 'inline-block', alignSelf: 'flex-start' }}>
              ✗ Others Don't
            </div>
            {onUpdate ? (
              <DeckChipInput
                chips={othersDontChips}
                onChipsChange={v => onUpdate({ othersDontChips: v })}
                inputVal={theyInput}
                setInputVal={setTheyInput}
                placeholder="What competitors lack, press Enter…"
                chipBg="rgba(220,38,38,0.07)"
                chipBorder="rgba(220,38,38,0.3)"
                chipText="#dc2626"
                inputColor="#888"
              />
            ) : (
              othersDontChips.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 11, alignItems: 'flex-start' }}>
                  <span style={{ color: '#ddd', fontSize: 13, marginTop: 1, flexShrink: 0 }}>◆</span>
                  <div style={{ fontSize: 13, color: '#888', lineHeight: 1.45 }}>{item}</div>
                </div>
              ))
            )}
          </div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, rgba(123,159,247,0.07), rgba(155,127,247,0.07))', border: '0.5px solid rgba(123,159,247,0.22)', borderRadius: 10, padding: '12px 18px', marginTop: 12 }}>
          <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic', lineHeight: 1.55 }}>
            "{onUpdate ? <ET value={slide.quote} onChange={v => onUpdate({ quote: v })} multiline style={{ fontSize: 12, color: '#555' }} /> : slide.quote}"
          </div>
        </div>
      </div>
      <SlideFooter slideNum={slideNum} />
    </div>
  )
}

function RoadmapSlide({ slide, slideNum, onUpdate }) {
  const updateStep = (i, field, val) => {
    if (!onUpdate) return
    const steps = slide.steps.map((s, si) => si === i ? { ...s, [field]: val } : s)
    onUpdate({ steps })
  }
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: NAVY, position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
      <AccentBars />
      <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.14)' }} />
      <div style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.1)' }} />
      <div style={{ padding: '40px 52px 38px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 8.5, color: '#7b9ff7', letterSpacing: 1.5, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>{slide.sectionLabel}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 24 }}>
          {onUpdate ? <ET value={slide.title} onChange={v => onUpdate({ title: v })} style={{ fontSize: 26, color: '#fff' }} /> : slide.title}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1 }}>
          {(slide.steps || []).map((step, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#7b9ff7', marginBottom: 8, fontFamily: "'DM Serif Display', serif" }}>
                {step.num}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6 }}>
                {onUpdate ? <ET value={step.title} onChange={v => updateStep(i, 'title', v)} style={{ fontSize: 14, color: '#fff' }} /> : step.title}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                {onUpdate ? <ET value={step.description} onChange={v => updateStep(i, 'description', v)} multiline style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }} /> : step.description}
              </div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter slideNum={slideNum} dark />
    </div>
  )
}

function ClosingSlide({ slide, slideNum, onUpdate }) {
  const u = onUpdate ? (f, v) => onUpdate({ [f]: v }) : null
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: NAVY, position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <AccentBars />
      <div style={{ position: 'absolute', top: -90, left: '50%', transform: 'translateX(-50%)', width: 420, height: 420, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.09)' }} />
      <div style={{ position: 'absolute', top: -45, left: '50%', transform: 'translateX(-50%)', width: 270, height: 270, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.07)' }} />
      <div style={{ position: 'absolute', bottom: -80, right: -80, width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.1)' }} />
      <div style={{ textAlign: 'center', padding: '0 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 38, marginBottom: 18 }}>💡</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 14 }}>
          {u ? <ET value={slide.title} onChange={v => u('title', v)} multiline style={{ fontSize: 26, color: '#fff', textAlign: 'center' }} /> : slide.title}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', lineHeight: 1.65, marginBottom: 22, maxWidth: 600, margin: '0 auto 22px' }}>
          {u ? <ET value={slide.subtitle} onChange={v => u('subtitle', v)} multiline style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)' }} /> : slide.subtitle}
        </div>
        <div style={{ height: 0.5, background: 'rgba(255,255,255,0.1)', margin: '0 auto 18px', width: 110 }} />
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 10 }}>
          {u ? <ET value={slide.email} onChange={v => u('email', v)} style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }} /> : slide.email}
        </div>
        <div style={{ display: 'inline-block', fontSize: 12, background: 'rgba(123,159,247,0.15)', border: '0.5px solid rgba(123,159,247,0.3)', color: '#7b9ff7', borderRadius: 20, padding: '5px 16px' }}>
          {u ? <ET value={slide.website} onChange={v => u('website', v)} style={{ fontSize: 12, color: '#7b9ff7' }} /> : slide.website}
        </div>
      </div>
      <SlideFooter slideNum={slideNum} dark />
    </div>
  )
}

function RevenueSlide({ slide, onUpdate }) {
  const u = onUpdate ? (f, v) => onUpdate({ [f]: v }) : null
  const paidPrice = parseFloat(String(slide.paidPrice || '$12').replace(/[^0-9.]/g, '')) || 12
  const startingUsers = parseFloat(slide.startingUsers) || 100
  const monthlyGrowth = (parseFloat(slide.monthlyGrowthRate) || 10) / 100
  const convRate = (parseFloat(slide.conversionRate) || 5) / 100
  const scenarios = [
    { label: 'Conservative', multiplier: 0.5, color: '#888780', lightColor: 'rgba(136,135,128,0.15)' },
    { label: 'Moderate', multiplier: 1, color: '#7b9ff7', lightColor: 'rgba(123,159,247,0.15)' },
    { label: 'Optimistic', multiplier: 2, color: '#22c55e', lightColor: 'rgba(34,197,94,0.15)' },
  ]
  function calcRevenue(months, mult) {
    const users = startingUsers * Math.pow(1 + monthlyGrowth * mult, months)
    const paying = users * convRate
    const mrr = paying * paidPrice
    return mrr
  }
  function fmt(n) {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return '$' + Math.round(n / 1000) + 'K'
    return '$' + Math.round(n)
  }
  const hasQualitative = slide.whoPays || slide.revenueStreams || slide.pricingPower || slide.revenuePotential || slide.businessStage
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: NAVY, position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: GRAD }} />
      <div style={{ padding: '44px 56px 40px', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 10, color: 'rgba(123,159,247,0.7)', letterSpacing: '3px', fontWeight: 700, textTransform: 'uppercase', marginBottom: 10 }}>{slide.sectionLabel}</div>
        {hasQualitative && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Who pays', val: slide.whoPays },
              { label: 'Revenue streams', val: slide.revenueStreams },
              { label: 'Pricing power', val: slide.pricingPower },
              { label: 'Revenue potential', val: slide.revenuePotential },
              { label: 'Stage', val: slide.businessStage },
            ].filter(r => r.val).map((r, i) => (
              <div key={i} style={{ background: 'rgba(123,159,247,0.06)', border: '0.5px solid rgba(123,159,247,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(123,159,247,0.6)', marginBottom: 4 }}>{r.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{r.val}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 8, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <span>Starting users: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{u ? <ET value={String(slide.startingUsers ?? 100)} onChange={v => u('startingUsers', v)} style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }} /> : startingUsers.toLocaleString()}</strong></span>
          <span>Monthly growth: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{u ? <ET value={String(slide.monthlyGrowthRate ?? 10)} onChange={v => u('monthlyGrowthRate', v)} style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }} /> : (slide.monthlyGrowthRate || 10)}%</strong></span>
          <span>Free→paid conversion: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{u ? <ET value={String(slide.conversionRate ?? 5)} onChange={v => u('conversionRate', v)} style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }} /> : (slide.conversionRate || 5)}%</strong></span>
          <span>Paid price: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{u ? <ET value={slide.paidPrice || '$12'} onChange={v => u('paidPrice', v)} style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700 }} /> : (slide.paidPrice || '$12')}/mo</strong></span>
        </div>
        {u && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 16, fontStyle: 'italic' }}>Pulled from your idea page — edit here for this deck only.</div>}
        {!u && <div style={{ marginBottom: 16 }} />}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, flex: 1, minHeight: 0 }}>
          {scenarios.map(sc => (
            <div key={sc.label} style={{ background: sc.lightColor, border: `0.5px solid ${sc.color}40`, borderRadius: 16, padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: sc.color, letterSpacing: '2px', textTransform: 'uppercase' }}>{sc.label}</div>
              {[{ label: '6 months', months: 6 }, { label: '12 months', months: 12 }, { label: '24 months', months: 24 }].map(period => (
                <div key={period.label} style={{ borderTop: `0.5px solid ${sc.color}30`, paddingTop: 12 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>{period.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{fmt(calcRevenue(period.months, sc.multiplier))}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>MRR</div>
                  <div style={{ fontSize: 13, color: sc.color, marginTop: 2 }}>{fmt(calcRevenue(period.months, sc.multiplier) * 12)} ARR</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 14, fontStyle: 'italic' }}>Model assumptions only. Actual results will vary based on market conditions and execution.</div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: GRAD }} />
    </div>
  )
}

function CompetitiveSlide({ slide }) {
  const cl = (() => { try { return typeof slide.competitiveLandscape === 'string' ? JSON.parse(slide.competitiveLandscape) : slide.competitiveLandscape } catch { return null } })()
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: NAVY, display: 'flex', flexDirection: 'column', padding: '48px 56px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: GRAD }} />
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '3px', color: 'rgba(123,159,247,0.7)', textTransform: 'uppercase', marginBottom: 24 }}>{slide.sectionLabel}</div>
      {!cl && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16, marginTop: 40 }}>No competitive landscape data yet. Add it on your idea page.</div>}
      {cl?.format === 'table' && cl.table?.competitors?.length > 0 && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 14px', borderBottom: '1px solid rgba(123,159,247,0.4)', color: '#7b9ff7', fontWeight: 700, fontSize: 12 }}>Competitor</th>
                {(cl.table.columns || []).map((col, i) => <th key={i} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(123,159,247,0.4)', color: '#7b9ff7', fontWeight: 700, fontSize: 12, textAlign: 'center' }}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: 'rgba(123,159,247,0.15)', borderLeft: '3px solid #7b9ff7' }}>
                <td style={{ padding: '8px 14px', fontWeight: 700, color: '#7b9ff7', fontSize: 14 }}>{slide.ideaTitle || 'Your idea'}</td>
                {(cl.table.columns || []).map((_, i) => <td key={i} style={{ textAlign: 'center', padding: '8px 14px', color: '#22c55e', fontSize: 18 }}>✓</td>)}
              </tr>
              {cl.table.competitors.slice(0, 6).map((c, i) => (
                <tr key={i} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <td style={{ padding: '8px 14px', color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>{c.name}</td>
                  {(c.checks || []).map((checked, j) => <td key={j} style={{ textAlign: 'center', padding: '8px 14px', color: checked ? '#22c55e' : 'rgba(255,255,255,0.2)', fontSize: checked ? 18 : 14 }}>{checked ? '✓' : '—'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {cl?.format === 'matrix' && cl.matrix?.competitors?.length > 0 && (
        <div style={{ flex: 1, position: 'relative', background: 'rgba(123,159,247,0.04)', borderRadius: 12, border: '0.5px solid rgba(123,159,247,0.15)', margin: '0 0 8px' }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>{cl.matrix.axis_x?.label} →</div>
          <div style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: 12, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>↑ {cl.matrix.axis_y?.label}</div>
          {cl.matrix.competitors.map((c, i) => (
            <div key={i} style={{ position: 'absolute', left: `${c.x * 100}%`, top: `${(1 - c.y) * 100}%`, transform: 'translate(-50%,-50%)' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)' }} />
              <div style={{ position: 'absolute', ...(c.x > 0.55 ? { right: 16, left: 'auto' } : { left: 16 }), top: -5, fontSize: 12, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
            </div>
          ))}
          {cl.matrix.self && (
            <div style={{ position: 'absolute', left: `${cl.matrix.self.x * 100}%`, top: `${(1 - cl.matrix.self.y) * 100}%`, transform: 'translate(-50%,-50%)' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#7b9ff7', boxShadow: '0 0 12px rgba(123,159,247,0.6)', border: '2px solid rgba(255,255,255,0.6)' }} />
              <div style={{ position: 'absolute', ...(cl.matrix.self.x > 0.55 ? { right: 16, left: 'auto' } : { left: 16 }), top: -6, fontSize: 13, color: '#7b9ff7', fontWeight: 700, whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{slide.ideaTitle || 'Your idea'}</div>
            </div>
          )}
        </div>
      )}
      {cl?.format === 'gap' && cl.gap?.competitors?.length > 0 && (() => {
        const stages = cl.gap.stages || ['Raw idea', 'Protected & pitched', 'Validated', 'Patent-ready']
        const gapStart = cl.gap.gap_start ?? 1
        const gapEnd = cl.gap.gap_end ?? 2
        const pct = i => `${(i / (stages.length - 1)) * 100}%`
        const competitorsByStage = stages.map((_, i) => (cl.gap.competitors || []).filter(c => c.stage === i))
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 40px' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'inline-block', fontSize: 14, color: '#7b9ff7', fontWeight: 700, background: 'rgba(14,14,31,0.9)', padding: '6px 16px', borderRadius: 8, border: '1px solid rgba(123,159,247,0.4)', whiteSpace: 'nowrap' }}>{slide.ideaTitle || 'Your idea'}</div>
          </div>
          <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, margin: '80px 0 0' }}>
              <div style={{ position: 'absolute', left: pct(gapStart), width: `calc(${pct(gapEnd)} - ${pct(gapStart)})`, height: '100%', background: 'rgba(123,159,247,0.5)', borderRadius: 3 }} />
              {stages.map((s, i) => {
                const inGap = i >= gapStart && i <= gapEnd
                return (
                  <div key={i} style={{ position: 'absolute', left: pct(i), transform: 'translateX(-50%)', top: -12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: inGap ? '#7b9ff7' : 'rgba(255,255,255,0.15)', border: `2px solid ${inGap ? '#7b9ff7' : 'rgba(255,255,255,0.2)'}`, margin: '0 auto', boxShadow: inGap ? '0 0 16px rgba(123,159,247,0.5)' : 'none' }} />
                    <div style={{ fontSize: 13, color: inGap ? '#7b9ff7' : 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 12, fontWeight: inGap ? 700 : 400, whiteSpace: 'nowrap' }}>{s}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 8 }}>
                      {(competitorsByStage[i] || []).map((c, j) => (
                        <div key={j} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '3px 10px', fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', border: '0.5px solid rgba(255,255,255,0.1)' }}>{c.name}</div>
                      ))}
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: GRAD }} />
    </div>
  )
}

function TeamSlide({ slide, onUpdate }) {
  const members = slide.members || []
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: NAVY, display: 'flex', flexDirection: 'column', padding: '48px 56px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: GRAD }} />
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '3px', color: 'rgba(123,159,247,0.7)', textTransform: 'uppercase', marginBottom: 32 }}>{slide.sectionLabel}</div>
      {members.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>No team members added yet.</div>}
      <div style={{ display: 'grid', gridTemplateColumns: members.length > 2 ? 'repeat(3, 1fr)' : members.length === 2 ? 'repeat(2, 1fr)' : '1fr', gap: 32, flex: 1 }}>
        {members.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{(m.name || '?')[0].toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{m.name || 'Team member'}</div>
                <div style={{ fontSize: 14, color: 'rgba(123,159,247,0.8)', marginTop: 2 }}>{m.role || 'Role'}</div>
              </div>
            </div>
            {m.bio && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{m.bio}</div>}
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: GRAD }} />
    </div>
  )
}

function TractionSlide({ slide }) {
  const milestones = slide.milestones || []
  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, background: NAVY, display: 'flex', flexDirection: 'column', padding: '48px 56px', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: GRAD }} />
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '3px', color: 'rgba(123,159,247,0.7)', textTransform: 'uppercase', marginBottom: 32 }}>{slide.sectionLabel}</div>
      {milestones.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16 }}>No milestones added yet.</div>}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
        {milestones.slice(0, 7).map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: m.status === 'done' ? '#22c55e' : m.status === 'in-progress' ? '#7b9ff7' : 'rgba(255,255,255,0.2)', border: `2px solid ${m.status === 'done' ? '#22c55e' : m.status === 'in-progress' ? '#7b9ff7' : 'rgba(255,255,255,0.15)'}`, flexShrink: 0, marginTop: 3, boxShadow: m.status === 'done' ? '0 0 8px rgba(34,197,94,0.4)' : m.status === 'in-progress' ? '0 0 8px rgba(123,159,247,0.4)' : 'none' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, color: m.status === 'done' ? 'rgba(255,255,255,0.9)' : m.status === 'in-progress' ? '#7b9ff7' : 'rgba(255,255,255,0.45)', fontWeight: m.status === 'in-progress' ? 600 : 400, lineHeight: 1.4 }}>{m.label}</div>
              {m.date && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{m.date}</div>}
            </div>
            <div style={{ fontSize: 11, color: m.status === 'done' ? '#22c55e' : m.status === 'in-progress' ? '#7b9ff7' : 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0 }}>{m.status === 'done' ? '✓ Done' : m.status === 'in-progress' ? '→ Active' : '○ Upcoming'}</div>
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: GRAD }} />
    </div>
  )
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
export function SlideContent({ slide, slideNum, onUpdate }) {
  const props = { slide, slideNum, onUpdate }
  switch (slide?.type) {
    case 'cover':     return <CoverSlide     {...props} />
    case 'problem':   return <ProblemSlide   {...props} />
    case 'solution':  return <SolutionSlide  {...props} />
    case 'market':    return <MarketSlide    {...props} />
    case 'business':  return <BusinessSlide  {...props} />
    case 'advantage': return <AdvantageSlide {...props} />
    case 'roadmap':   return <RoadmapSlide   {...props} />
    case 'revenue': return <RevenueSlide slide={slide} onUpdate={onUpdate} />
    case 'competitive': return <CompetitiveSlide slide={slide} />
    case 'team': return <TeamSlide slide={slide} onUpdate={onUpdate} />
    case 'traction': return <TractionSlide slide={slide} />
    case 'closing':   return <ClosingSlide   {...props} />
    default: return null
  }
}

// ─── Responsive scaled slide container ───────────────────────────────────────
export function ScaledSlide({ slide, slideNum, onUpdate, containerStyle }) {
  const containerRef = useRef()
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      setScale(w / SLIDE_W)
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%', aspectRatio: `${SLIDE_W}/${SLIDE_H}`, position: 'relative', overflow: 'hidden', ...containerStyle }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <SlideContent slide={slide} slideNum={slideNum} onUpdate={onUpdate} />
      </div>
    </div>
  )
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────
const THUMB_W = 172
const THUMB_H = Math.round(THUMB_W * 9 / 16)
const THUMB_SCALE = THUMB_W / SLIDE_W

export function Thumbnail({ slide, slideNum, selected, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        padding: 4,
        borderRadius: 8,
        border: `2px solid ${selected ? '#7b9ff7' : 'transparent'}`,
        background: selected ? 'rgba(123,159,247,0.08)' : 'transparent',
        marginBottom: 6,
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ width: THUMB_W, height: THUMB_H, overflow: 'hidden', borderRadius: 4, position: 'relative', boxShadow: '0 1px 5px rgba(0,0,0,0.2)' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: SLIDE_W, height: SLIDE_H, transform: `scale(${THUMB_SCALE})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
          <SlideContent slide={slide} slideNum={slideNum} />
        </div>
      </div>
      <div style={{ fontSize: 10, textAlign: 'center', color: selected ? '#7b9ff7' : 'rgba(255,255,255,0.3)', marginTop: 4, fontWeight: selected ? 600 : 400 }}>
        {slideNum}
      </div>
    </div>
  )
}
