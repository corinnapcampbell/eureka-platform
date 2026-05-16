import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY = '#0e0e1f'
const BLUE = '#7b9ff7'
const PURP = '#9b7ff7'
const PINK = '#e07b9f'
const GRAD = 'linear-gradient(90deg, #7b9ff7, #9b7ff7)'
const PW   = 794
const PH   = 1123

// ─── Data helpers ─────────────────────────────────────────────────────────────

// Splits text into discrete steps — handles "1. text", "Step N:", newlines, sentences
function splitToSteps(text, max = 4) {
  if (!text) return []
  // Numbered list pattern: "1. ", "1) ", "Step 1:", etc.
  const numMatches = [...text.matchAll(/(?:^|\n)\s*(?:\d+[.)]\s*|Step\s+\d+[:.\s]+)([^\n]+)/gi)]
  if (numMatches.length >= 2) {
    return numMatches.map(m => m[1].trim()).filter(Boolean).slice(0, max)
  }
  // Newline-separated
  let parts = text.split(/\n+/).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(l => l.length > 4)
  if (parts.length >= 2) return parts.slice(0, max)
  // Sentence-separated
  parts = text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 10)
  if (parts.length >= 2) return parts.slice(0, max)
  // Fall back to whole text as one step
  return text.trim() ? [text.trim()] : []
}

function splitLines(text, max = 5) {
  if (!text) return []
  let parts = text.split(/\n+/).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(l => l.length > 3)
  if (parts.length < 2) {
    parts = text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 8)
  }
  return parts.slice(0, max)
}

function parseMetrics(text) {
  if (!text) return [
    { value: '—', label: 'Total Addressable Market' },
    { value: '—', label: 'Serviceable Market' },
    { value: '—', label: 'Initial Target' },
  ]
  const nums = text.match(/\$[\d.,]+\s*[BMKbmkTt+%]*/g) || []
  const LABELS = ['Total Addressable Market', 'Serviceable Market', 'Initial Target']
  if (nums.length >= 2) return nums.slice(0, 3).map((v, i) => ({ value: v.trim(), label: LABELS[i] || LABELS[2] }))
  if (nums.length === 1) return [
    { value: nums[0], label: 'Market Opportunity' },
    { value: '—', label: 'Serviceable Market' },
    { value: '—', label: 'Initial Target' },
  ]
  return [
    { value: text.slice(0, 28) || '—', label: 'Market Opportunity' },
    { value: '—', label: 'Serviceable Market' },
    { value: '—', label: 'Initial Target' },
  ]
}

function parseBizTiers(text) {
  if (!text) return { free: 'Core features, free to get started', paid: 'Advanced features and premium access' }
  const freeM = text.match(/free[:\s-]+([^\n]+)/i)
  const paidM = text.match(/paid[:\s-]+([^\n]+)|premium[:\s-]+([^\n]+)|pro[:\s-]+([^\n]+)/i)
  const lines  = splitLines(text, 4)
  return {
    free: freeM?.[1]?.trim()  || lines[0] || text.slice(0, 130),
    paid: paidM?.[1]?.trim()  || paidM?.[2]?.trim() || lines[1] || 'Advanced features and priority support',
  }
}

function parseTags(val) {
  if (!val) return []
  if (Array.isArray(val)) return val.slice(0, 7)
  return val.split(/[,\n]+/).map(t => t.replace(/^[-•*\d.)\s]+/, '').trim()).filter(t => t.length > 0 && t.length < 40).slice(0, 7)
}

function fmtDate(str) {
  try { return new Date(str).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
  catch { return '' }
}

// ─── Dynamic page list ─────────────────────────────────────────────────────────
function buildPageList(data) {
  const pages = [
    { type: 'cover' },
    { type: 'problem-solution' },
    { type: 'market-business' },
    { type: 'advantage-risks' },
    { type: 'roadmap' },
  ]
  // Extra sections — appear if the field exists and is non-empty
  const extras = [
    { key: 'traction',        icon: '📊', label: 'Traction & Validation' },
    { key: 'team',            icon: '👥', label: 'Team' },
    { key: 'additional_info', icon: '📋', label: 'Additional Information' },
  ]
  for (const e of extras) {
    if (data[e.key]?.trim()) pages.push({ type: 'extra', ...e })
  }
  pages.push({ type: 'closing' })
  return pages
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
const AccentBar = () => (
  <div style={{ height: 4, background: GRAD, flexShrink: 0 }} />
)

function Logo({ dark = false, size = 15 }) {
  const base = dark ? '#1e1e38' : 'rgba(255,255,255,0.88)'
  return (
    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 300, fontSize: size, letterSpacing: 0 }}>
      <span style={{ color: base }}>Eurek</span>
      <span style={{ color: BLUE }}>AI</span>
      <span style={{ color: base }}>dea</span>
    </span>
  )
}

function SLabel({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 13 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: PURP, fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </span>
    </div>
  )
}

// Each step gets its own circle — this is the fix for the single-circle bug
function StepCircle({ num }) {
  return (
    <div style={{ width: 26, height: 26, minWidth: 26, borderRadius: '50%', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
      {num}
    </div>
  )
}

// ─── White page wrapper ────────────────────────────────────────────────────────
function WhitePage({ pageNum, totalPages, children }) {
  return (
    <div className="pitch-page" style={{ width: PW, height: PH, background: '#fff', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
      <AccentBar />
      {/* Page header */}
      <div style={{ padding: '15px 48px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
        <Logo dark size={13} />
        <span style={{ fontSize: 9, color: '#c8c8c8', letterSpacing: 0.3 }}>eurekAIdea Confidential Pitch</span>
      </div>
      {/* Content */}
      <div style={{ flex: 1, padding: '24px 48px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </div>
      {/* Footer */}
      <div style={{ padding: '9px 48px', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: '#bbb', fontFamily: "'DM Sans', sans-serif" }}>
          Protected &amp; Presented by eurekAIdea · myeurekaidea.com
        </span>
        <span style={{ fontSize: 9, color: '#bbb', fontFamily: "'DM Sans', sans-serif" }}>
          Confidential · {pageNum} / {totalPages}
        </span>
      </div>
      <AccentBar />
    </div>
  )
}

// ─── Dark page wrapper ─────────────────────────────────────────────────────────
function DarkPage({ pageNum, totalPages, children }) {
  return (
    <div className="pitch-page" style={{ width: PW, height: PH, background: NAVY, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box', position: 'relative' }}>
      <AccentBar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
      <div style={{ padding: '0 48px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, zIndex: 2, position: 'relative' }}>
        <Logo size={13} />
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', letterSpacing: 0.3, fontFamily: "'DM Sans', sans-serif" }}>
          Confidential · {pageNum} / {totalPages}
        </span>
      </div>
      <AccentBar />
    </div>
  )
}

// ─── Page 1: Cover ─────────────────────────────────────────────────────────────
function CoverPage({ d, pageNum, totalPages }) {
  return (
    <DarkPage pageNum={pageNum} totalPages={totalPages}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -110, right: -110, width: 420, height: 420, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.1)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: -44, right: -44, width: 260, height: 260, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.07)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 60, left: -80, width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.07)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header row */}
      <div style={{ padding: '24px 48px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
        <Logo size={18} />
        <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.28)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '4px 10px' }}>
          CONFIDENTIAL
        </div>
      </div>

      {/* Category pills */}
      {d.categories?.length > 0 && (
        <div style={{ padding: '0 48px 22px', display: 'flex', gap: 8, flexWrap: 'wrap', zIndex: 1 }}>
          {d.categories.map((cat, i) => (
            <span key={i} style={{ fontSize: 10, background: 'rgba(123,159,247,0.18)', color: BLUE, borderRadius: 20, padding: '4px 13px', border: '0.5px solid rgba(123,159,247,0.3)' }}>
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <div style={{ padding: '0 48px 13px', zIndex: 1 }}>
        <div style={{ fontSize: 38, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: -0.5 }}>{d.title}</div>
      </div>

      {/* Tagline */}
      <div style={{ padding: '0 48px 26px', zIndex: 1 }}>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 590 }}>{d.tagline}</div>
      </div>

      {/* Divider */}
      <div style={{ margin: '0 48px 26px', height: 0.5, background: 'rgba(255,255,255,0.08)', zIndex: 1 }} />

      {/* Meta grid 2×2 */}
      <div style={{ padding: '0 48px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 56px', zIndex: 1 }}>
        {[
          { label: 'Submitted By', value: d.presenterName },
          { label: 'Date',         value: d.dateStr },
          { label: 'Market Size',  value: d.market_size_short || d.market_size },
          { label: 'Looking For',  value: d.looking_for_short },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.27)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7 }}>{label}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.66)', fontWeight: 500, lineHeight: 1.45 }}>
              {String(value || '—').slice(0, 80)}
            </div>
          </div>
        ))}
      </div>

      {/* Blockchain hash */}
      {d.blockchain_hash && (
        <div style={{ padding: '0 48px', zIndex: 1 }}>
          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.13)', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
            ⬡ {d.blockchain_hash}
          </div>
        </div>
      )}

      {/* flex spacer pushes footer down */}
      <div style={{ flex: 1 }} />
    </DarkPage>
  )
}

// ─── Page 2: Problem + Solution + How It Works ────────────────────────────────
function ProblemSolutionPage({ d, pageNum, totalPages }) {
  const steps = splitToSteps(d.how_it_works, 4)

  return (
    <WhitePage pageNum={pageNum} totalPages={totalPages}>
      {/* Problem */}
      <SLabel icon="⚡" label="The Problem" />
      <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.8, marginBottom: 22, maxHeight: 115, overflow: 'hidden' }}>
        {d.problem}
      </div>

      {/* Solution highlight box */}
      <div style={{ background: 'linear-gradient(135deg, rgba(123,159,247,0.06), rgba(155,127,247,0.06))', border: '0.5px solid rgba(123,159,247,0.17)', borderRadius: 12, padding: '20px 24px', marginBottom: 22 }}>
        <SLabel icon="💡" label="The Solution" />
        <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.8, maxHeight: 108, overflow: 'hidden' }}>
          {d.solution}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 0.5, background: 'rgba(0,0,0,0.07)', marginBottom: 22 }} />

      {/* How It Works — each step gets its own individual StepCircle */}
      <SLabel icon="⚙️" label="How It Works" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {(steps.length > 0 ? steps : ['See full idea description']).map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <StepCircle num={i + 1} />
            <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.7, flex: 1, paddingTop: 3 }}>{step}</div>
          </div>
        ))}
      </div>
    </WhitePage>
  )
}

// ─── Page 3: Market Size + Target Market + Business Model ─────────────────────
function MarketBusinessPage({ d, pageNum, totalPages }) {
  const metrics = parseMetrics(d.market_size)
  const tiers   = parseBizTiers(d.business_model)
  const tags    = parseTags(d.target_audience || d.categories)

  return (
    <WhitePage pageNum={pageNum} totalPages={totalPages}>
      {/* Market Size */}
      <SLabel icon="📈" label="Market Size" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ background: 'rgba(123,159,247,0.06)', border: '0.5px solid rgba(123,159,247,0.12)', borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 5, lineHeight: 1.1 }}>{m.value}</div>
            <div style={{ fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Target Market chips */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 22 }}>
          <span style={{ fontSize: 14, marginRight: 2 }}>🎯</span>
          {tags.map((t, i) => (
            <span key={i} style={{ fontSize: 11, background: 'rgba(123,159,247,0.08)', color: '#555', borderRadius: 20, padding: '4px 12px', border: '0.5px solid rgba(123,159,247,0.16)' }}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 0.5, background: 'rgba(0,0,0,0.07)', marginBottom: 22 }} />

      {/* Business Model */}
      <SLabel icon="💰" label="Business Model" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Free Tier — blue top border */}
        <div style={{ border: '0.5px solid rgba(0,0,0,0.09)', borderTop: `3px solid ${BLUE}`, borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: BLUE, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 9 }}>Free Tier</div>
          <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7, maxHeight: 78, overflow: 'hidden' }}>{tiers.free}</div>
        </div>
        {/* Paid Tier — purple top border */}
        <div style={{ border: '0.5px solid rgba(0,0,0,0.09)', borderTop: `3px solid ${PURP}`, borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: PURP, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 9 }}>Paid Tier ✦</div>
          <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7, maxHeight: 78, overflow: 'hidden' }}>{tiers.paid}</div>
        </div>
      </div>
    </WhitePage>
  )
}

// ─── Page 4: Competitive Advantage + Risks & Challenges ──────────────────────
function AdvantageRisksPage({ d, pageNum, totalPages }) {
  const risks = splitLines(d.risks, 5)

  return (
    <WhitePage pageNum={pageNum} totalPages={totalPages}>
      {/* Competitive Advantage */}
      <SLabel icon="🏆" label="Competitive Advantage" />
      <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.8, marginBottom: 26, maxHeight: 180, overflow: 'hidden' }}>
        {d.competitive_advantage}
      </div>

      {/* Divider */}
      <div style={{ height: 0.5, background: 'rgba(0,0,0,0.07)', marginBottom: 24 }} />

      {/* Risks */}
      <SLabel icon="⚠️" label="Risks &amp; Challenges" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {(risks.length > 0 ? risks : [d.risks || 'Risk assessment in progress']).map((r, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 8, height: 8, minWidth: 8, borderRadius: '50%', background: PINK, marginTop: 7, flexShrink: 0 }} />
            <div style={{ fontSize: 13.5, color: '#444', lineHeight: 1.7 }}>{r}</div>
          </div>
        ))}
      </div>
    </WhitePage>
  )
}

// ─── Page 5: Next Steps / Roadmap ─────────────────────────────────────────────
function RoadmapPage({ d, pageNum, totalPages }) {
  const steps = splitToSteps(d.next_steps, 5)

  return (
    <WhitePage pageNum={pageNum} totalPages={totalPages}>
      <SLabel icon="🚀" label="Next Steps &amp; Roadmap" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {(steps.length > 0 ? steps : [d.next_steps || 'Planning underway']).map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <StepCircle num={i + 1} />
            <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.7, flex: 1, paddingTop: 3 }}>{step}</div>
          </div>
        ))}
      </div>
    </WhitePage>
  )
}

// ─── Extra pages (traction, team, additional_info, etc.) ──────────────────────
function ExtraPage({ d, pageNum, totalPages, icon, label, content }) {
  return (
    <WhitePage pageNum={pageNum} totalPages={totalPages}>
      <SLabel icon={icon} label={label} />
      <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.85 }}>
        {content}
      </div>
    </WhitePage>
  )
}

// ─── Closing page (dark navy) ─────────────────────────────────────────────────
function ClosingPage({ d, pageNum, totalPages }) {
  const cats = d.categories || []
  const closing = cats[0]
    ? `Let's build the future of ${cats[0]} together.`
    : "Let's build something extraordinary together."

  return (
    <DarkPage pageNum={pageNum} totalPages={totalPages}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -100, left: '50%', transform: 'translateX(-50%)', width: 440, height: 440, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.08)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)', width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.06)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 60, right: -80, width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.08)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Centered content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px', textAlign: 'center', zIndex: 1 }}>
        <div style={{ fontSize: 52, marginBottom: 22 }}>💡</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 14, maxWidth: 520 }}>
          {closing}
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, marginBottom: 28, maxWidth: 500 }}>
          {d.tagline}
        </div>
        <div style={{ height: 0.5, background: 'rgba(255,255,255,0.1)', width: 100, marginBottom: 24 }} />
        {d.email && (
          <>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Contact</div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.58)', marginBottom: 18 }}>{d.email}</div>
          </>
        )}
        <div style={{ fontSize: 12, background: 'rgba(123,159,247,0.15)', border: '0.5px solid rgba(123,159,247,0.3)', color: BLUE, borderRadius: 20, padding: '7px 22px' }}>
          myeurekaidea.com
        </div>
      </div>
    </DarkPage>
  )
}

// ─── Page renderer ────────────────────────────────────────────────────────────
function renderPage(page, idx, data, totalPages) {
  const pageNum = idx + 1
  const common  = { d: data, pageNum, totalPages, key: idx }
  switch (page.type) {
    case 'cover':            return <CoverPage            {...common} />
    case 'problem-solution': return <ProblemSolutionPage  {...common} />
    case 'market-business':  return <MarketBusinessPage   {...common} />
    case 'advantage-risks':  return <AdvantageRisksPage   {...common} />
    case 'roadmap':          return <RoadmapPage          {...common} />
    case 'extra':            return <ExtraPage            {...common} icon={page.icon} label={page.label} content={data[page.key]} />
    case 'closing':          return <ClosingPage          {...common} />
    default: return null
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PitchPDF({ session }) {
  const { ideaId }  = useParams()
  const navigate    = useNavigate()
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [filling,     setFilling]     = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [dlProgress,  setDlProgress]  = useState(0)
  const pagesRef = useRef()

  useEffect(() => {
    async function load() {
      const { data: idea } = await supabase
        .from('ideas')
        .select('*, profiles(full_name, email)')
        .eq('id', ideaId)
        .single()

      if (!idea) { setLoading(false); return }

      const REQUIRED = [
        'tagline', 'problem', 'solution', 'how_it_works', 'market_size',
        'business_model', 'competitive_advantage', 'risks', 'next_steps',
      ]
      const missing = REQUIRED.filter(f => !idea[f]?.trim())

      let filled = {}
      if (missing.length > 0) {
        setFilling(true)
        try {
          const res = await fetch('/api/functions/fill-pitch-fields', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea }),
          })
          if (res.ok) filled = (await res.json()).filled || {}
        } catch (e) {
          console.error('AI fill error:', e)
        }
        setFilling(false)
      }

      const merged = { ...idea, ...filled }
      const mktShort = (merged.market_size || '').match(/\$[\d.,]+\s*[BMKbmk+]*/)?.[0] || ''

      setData({
        ...merged,
        categories:        Array.isArray(merged.category) ? merged.category : [],
        presenterName:     merged.profiles?.full_name
                             || session?.user?.user_metadata?.full_name
                             || session?.user?.email?.split('@')[0]
                             || '—',
        email:             merged.profiles?.email || session?.user?.email || '',
        dateStr:           fmtDate(merged.created_at),
        market_size_short: mktShort,
        looking_for_short: (merged.looking_for || '').split(/[\n.!?]/)[0]?.trim()?.slice(0, 80) || '—',
      })
      setLoading(false)
    }
    load()
  }, [ideaId])

  async function downloadPDF() {
    if (!pagesRef.current) return
    setDownloading(true)
    setDlProgress(0)
    try {
      await document.fonts.ready
      const pages = pagesRef.current.querySelectorAll('.pitch-page')
      const doc   = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })

      for (let i = 0; i < pages.length; i++) {
        setDlProgress(Math.round(((i + 1) / pages.length) * 100))
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: PW,
          height: PH,
          windowWidth: PW,
          windowHeight: PH,
        })
        if (i > 0) doc.addPage()
        doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297)
      }

      const slug = (data?.title || 'pitch').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      doc.save(`${slug}-eurekAIdea-pitch.pdf`)
    } catch (e) {
      console.error('PDF error:', e)
    }
    setDownloading(false)
    setDlProgress(0)
  }

  const isOwner  = !!(session?.user?.id && data?.user_id === session.user.id)
  const pageList = data ? buildPageList(data) : []

  if (loading || filling) return (
    <div style={{ height: '100vh', background: NAVY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div className="spinner" style={{ width: 28, height: 28, borderTopColor: BLUE }} />
      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
        {filling ? 'AI is filling in missing sections…' : 'Loading pitch…'}
      </p>
    </div>
  )

  if (!data) return (
    <div style={{ height: '100vh', background: NAVY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Pitch not found.</p>
      <a href="/" style={{ color: BLUE, fontSize: 13 }}>← Go home</a>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#e9eaf0' }}>

      {/* Sticky nav */}
      <div style={{ background: NAVY, borderBottom: '0.5px solid rgba(255,255,255,0.07)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Logo size={16} />
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.36)', fontFamily: "'DM Sans', sans-serif" }}>
            Pitch Preview · {pageList.length} pages
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isOwner && (
            <button
              onClick={() => navigate(`/pitch-builder/${ideaId}`)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '7px 14px', fontSize: 12, color: 'rgba(255,255,255,0.56)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              ✎ Edit Pitch
            </button>
          )}
          <button
            onClick={downloadPDF}
            disabled={downloading}
            style={{ background: 'rgba(123,159,247,0.18)', border: '0.5px solid rgba(123,159,247,0.36)', borderRadius: 7, padding: '7px 18px', fontSize: 13, color: BLUE, cursor: downloading ? 'default' : 'pointer', fontWeight: 500, opacity: downloading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif", minWidth: 148 }}
          >
            {downloading
              ? `⏳ Rendering… ${dlProgress}%`
              : `↓ Download PDF (${pageList.length}pp)`}
          </button>
        </div>
      </div>

      {/* Pages — identical HTML used for both preview and PDF capture */}
      <div style={{ padding: '32px 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, overflowX: 'auto' }} ref={pagesRef}>
        {pageList.map((page, idx) => renderPage(page, idx, data, pageList.length))}
      </div>
    </div>
  )
}
