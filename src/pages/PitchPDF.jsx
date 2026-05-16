import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY  = '#0e0e1f'
const BLUE  = '#7b9ff7'
const PURP  = '#9b7ff7'
const GRAD  = 'linear-gradient(90deg, #7b9ff7, #9b7ff7)'
const PW    = 794
const PH    = 1123

// ─── Helpers ─────────────────────────────────────────────────────────────────
function splitLines(text, max = 4) {
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
  if (nums.length >= 2) {
    return nums.slice(0, 3).map((v, i) => ({ value: v.trim(), label: LABELS[i] || LABELS[2] }))
  }
  const firstNum = nums[0]
  if (firstNum) return [
    { value: firstNum, label: 'Market Opportunity' },
    { value: '—', label: 'Serviceable Market' },
    { value: '—', label: 'Initial Target' },
  ]
  return [
    { value: text.slice(0, 28), label: 'Market Opportunity' },
    { value: '—', label: 'Serviceable Market' },
    { value: '—', label: 'Initial Target' },
  ]
}

function parseBizTiers(text) {
  if (!text) return {
    free: 'Core features, free to get started',
    paid: 'Advanced features and premium access',
  }
  const freeMatch = text.match(/free[:\s]+([^\n]+)/i)
  const paidMatch = text.match(/paid[:\s]+([^\n]+)|premium[:\s]+([^\n]+)|pro[:\s]+([^\n]+)/i)
  const lines = splitLines(text, 4)
  return {
    free:  freeMatch?.[1]?.trim()  || lines[0] || text.slice(0, 130),
    paid:  paidMatch?.[1]?.trim()  || paidMatch?.[2]?.trim() || lines[1] || 'Advanced features and priority support',
  }
}

function parseTags(val) {
  if (!val) return []
  if (Array.isArray(val)) return val.slice(0, 6)
  return val.split(/[,\n]+/).map(t => t.replace(/^[-•*\d.)\s]+/, '').trim()).filter(t => t.length > 0 && t.length < 40).slice(0, 6)
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────
const AccentBar = () => (
  <div style={{ height: 4, background: GRAD, flexShrink: 0 }} />
)

function Logo({ dark = false, size = 16 }) {
  const base = dark ? '#2c2c4a' : 'rgba(255,255,255,0.85)'
  return (
    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 300, fontSize: size, letterSpacing: 0 }}>
      <span style={{ color: base }}>Eurek</span>
      <span style={{ color: BLUE }}>AI</span>
      <span style={{ color: base }}>dea</span>
    </span>
  )
}

function PageHeader({ pageNum }) {
  return (
    <div style={{ padding: '18px 48px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
      <Logo dark size={14} />
      <span style={{ fontSize: 9, color: '#ccc', letterSpacing: 1, fontFamily: "'DM Sans', sans-serif" }}>
        {pageNum} / 4
      </span>
    </div>
  )
}

function PageFooter() {
  return (
    <div style={{ padding: '12px 48px', borderTop: '0.5px solid rgba(0,0,0,0.07)', fontSize: 9, color: '#ccc', display: 'flex', justifyContent: 'space-between', flexShrink: 0, fontFamily: "'DM Sans', sans-serif" }}>
      <span>Confidential — do not distribute without permission</span>
      <span>myeurekaidea.com</span>
    </div>
  )
}

function SLabel({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: PURP, fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </span>
    </div>
  )
}

// ─── Page 1: Cover ────────────────────────────────────────────────────────────
function CoverPage({ d }) {
  return (
    <div className="pitch-page" style={{ width: PW, height: PH, background: NAVY, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
      <AccentBar />

      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: -110, right: -110, width: 420, height: 420, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.1)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -44, right: -44, width: 260, height: 260, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 80, left: -90, width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.08)', pointerEvents: 'none' }} />

      {/* Header row */}
      <div style={{ padding: '26px 48px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <Logo size={18} />
        <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '4px 10px' }}>
          CONFIDENTIAL
        </div>
      </div>

      {/* Category pills */}
      {d.categories?.length > 0 && (
        <div style={{ padding: '0 48px 24px', display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          {d.categories.map((cat, i) => (
            <span key={i} style={{ fontSize: 10, background: 'rgba(123,159,247,0.18)', color: BLUE, borderRadius: 20, padding: '4px 13px', border: '0.5px solid rgba(123,159,247,0.3)' }}>
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <div style={{ padding: '0 48px 14px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 38, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: -0.5 }}>
          {d.title}
        </div>
      </div>

      {/* Tagline */}
      <div style={{ padding: '0 48px 28px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.46)', lineHeight: 1.6, maxWidth: 580 }}>
          {d.tagline}
        </div>
      </div>

      {/* Divider */}
      <div style={{ margin: '0 48px 28px', height: 0.5, background: 'rgba(255,255,255,0.08)', position: 'relative', zIndex: 1 }} />

      {/* 2×2 Meta grid */}
      <div style={{ padding: '0 48px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px 56px', position: 'relative', zIndex: 1 }}>
        {[
          { label: 'Submitted By', value: d.presenterName },
          { label: 'Date',         value: d.dateStr },
          { label: 'Market Size',  value: d.market_size_short || d.market_size },
          { label: 'Looking For',  value: d.looking_for_short },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.28)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7 }}>{label}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.68)', fontWeight: 500, lineHeight: 1.45 }}>
              {String(value || '—').slice(0, 80)}
            </div>
          </div>
        ))}
      </div>

      {/* Blockchain hash */}
      {d.blockchain_hash && (
        <div style={{ padding: '0 48px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.14)', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
            ⬡ {d.blockchain_hash}
          </div>
        </div>
      )}

      {/* Bottom accent bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: GRAD }} />
    </div>
  )
}

// ─── Page 2: Problem + Solution + How It Works ────────────────────────────────
function ProblemSolutionPage({ d }) {
  const steps = splitLines(d.how_it_works, 4)

  return (
    <div className="pitch-page" style={{ width: PW, height: PH, background: '#fff', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
      <AccentBar />
      <PageHeader pageNum={2} />

      <div style={{ flex: 1, padding: '32px 48px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Problem */}
        <SLabel icon="⚡" label="The Problem" />
        <div style={{ fontSize: 14, color: '#333', lineHeight: 1.8, marginBottom: 26, maxHeight: 126, overflow: 'hidden' }}>
          {d.problem}
        </div>

        {/* Solution highlight box */}
        <div style={{ background: 'linear-gradient(135deg, rgba(123,159,247,0.06), rgba(155,127,247,0.06))', border: '0.5px solid rgba(123,159,247,0.18)', borderRadius: 12, padding: '22px 26px', marginBottom: 26 }}>
          <SLabel icon="💡" label="The Solution" />
          <div style={{ fontSize: 14, color: '#333', lineHeight: 1.8, maxHeight: 112, overflow: 'hidden' }}>
            {d.solution}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 0.5, background: 'rgba(0,0,0,0.07)', marginBottom: 26 }} />

        {/* How It Works */}
        <SLabel icon="⚙️" label="How It Works" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(steps.length > 0
            ? steps
            : splitLines(d.how_it_works || 'See full idea for details', 1)
          ).map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.7, flex: 1, paddingTop: 3 }}>
                {step}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PageFooter />
    </div>
  )
}

// ─── Page 3: Market + Business Model + Competitive Advantage ──────────────────
function MarketBusinessPage({ d }) {
  const metrics = parseMetrics(d.market_size)
  const tiers   = parseBizTiers(d.business_model)
  const tags    = parseTags(d.target_audience || d.categories)

  return (
    <div className="pitch-page" style={{ width: PW, height: PH, background: '#fff', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
      <AccentBar />
      <PageHeader pageNum={3} />

      <div style={{ flex: 1, padding: '28px 48px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

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
            <span style={{ fontSize: 13, marginRight: 2 }}>🎯</span>
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 22 }}>
          <div style={{ border: '0.5px solid rgba(0,0,0,0.09)', borderTop: `3px solid ${BLUE}`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: BLUE, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 9 }}>Free Tier</div>
            <div style={{ fontSize: 12.5, color: '#444', lineHeight: 1.7, maxHeight: 72, overflow: 'hidden' }}>{tiers.free}</div>
          </div>
          <div style={{ border: '0.5px solid rgba(0,0,0,0.09)', borderTop: `3px solid ${PURP}`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: PURP, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 9 }}>Paid Tier ✦</div>
            <div style={{ fontSize: 12.5, color: '#444', lineHeight: 1.7, maxHeight: 72, overflow: 'hidden' }}>{tiers.paid}</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 0.5, background: 'rgba(0,0,0,0.07)', marginBottom: 22 }} />

        {/* Competitive Advantage */}
        <SLabel icon="🏆" label="Competitive Advantage" />
        <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.8, maxHeight: 110, overflow: 'hidden' }}>
          {d.competitive_advantage}
        </div>
      </div>

      <PageFooter />
    </div>
  )
}

// ─── Page 4: Risks + Next Steps ───────────────────────────────────────────────
function RisksNextStepsPage({ d }) {
  const risks = splitLines(d.risks, 4)
  const steps = splitLines(d.next_steps, 4)

  return (
    <div className="pitch-page" style={{ width: PW, height: PH, background: '#fff', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
      <AccentBar />
      <PageHeader pageNum={4} />

      <div style={{ flex: 1, padding: '36px 48px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Risks */}
        <SLabel icon="⚠️" label="Risks & Challenges" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 28 }}>
          {(risks.length > 0
            ? risks
            : [d.risks || 'Risk assessment in progress']
          ).map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#e07b9f', flexShrink: 0, marginTop: 7 }} />
              <div style={{ fontSize: 13.5, color: '#444', lineHeight: 1.7 }}>{r}</div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 0.5, background: 'rgba(0,0,0,0.07)', marginBottom: 28 }} />

        {/* Next Steps */}
        <SLabel icon="🚀" label="Next Steps" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 'auto' }}>
          {(steps.length > 0
            ? steps
            : [d.next_steps || 'Planning underway']
          ).map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                {i + 1}
              </div>
              <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.7, flex: 1, paddingTop: 3 }}>{step}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dark footer */}
      <div style={{ background: NAVY, padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo size={15} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: BLUE }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontFamily: "'DM Sans', sans-serif" }}>myeurekaidea.com</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PitchPDF({ session }) {
  const { ideaId } = useParams()
  const navigate   = useNavigate()
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [filling,    setFilling]    = useState(false)
  const [downloading, setDownloading] = useState(false)
  const pagesRef = useRef()

  useEffect(() => {
    async function load() {
      const { data: idea } = await supabase
        .from('ideas')
        .select('*, profiles(full_name)')
        .eq('id', ideaId)
        .single()

      if (!idea) { setLoading(false); return }

      const REQUIRED = ['tagline', 'problem', 'solution', 'how_it_works', 'market_size',
        'business_model', 'competitive_advantage', 'risks', 'next_steps']
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
      const mktShort = (merged.market_size || '').match(/\$[\d.,]+\s*[BMKbmkTt+]*/)?.[0] || ''

      setData({
        ...merged,
        categories:      Array.isArray(merged.category) ? merged.category : [],
        presenterName:   merged.profiles?.full_name
                           || session?.user?.user_metadata?.full_name
                           || session?.user?.email?.split('@')[0]
                           || '—',
        dateStr:         merged.created_at
                           ? new Date(merged.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                           : '',
        market_size_short: mktShort,
        looking_for_short: (merged.looking_for || '').split(/[\n.]/)[0]?.slice(0, 80) || '—',
      })
      setLoading(false)
    }
    load()
  }, [ideaId])

  async function downloadPDF() {
    if (!pagesRef.current) return
    setDownloading(true)
    try {
      await document.fonts.ready
      const pages = pagesRef.current.querySelectorAll('.pitch-page')
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })

      for (let i = 0; i < pages.length; i++) {
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
  }

  const isOwner = !!(session?.user?.id && data?.user_id === session.user.id)

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

      {/* Sticky nav bar */}
      <div style={{ background: NAVY, borderBottom: '0.5px solid rgba(255,255,255,0.07)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Logo size={16} />
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', fontFamily: "'DM Sans', sans-serif" }}>
            Pitch Preview
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {isOwner && (
            <button
              onClick={() => navigate(`/pitch-builder/${ideaId}`)}
              style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '7px 14px', fontSize: 12, color: 'rgba(255,255,255,0.58)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              ✎ Edit Pitch
            </button>
          )}
          <button
            onClick={downloadPDF}
            disabled={downloading}
            style={{ background: 'rgba(123,159,247,0.18)', border: `0.5px solid rgba(123,159,247,0.38)`, borderRadius: 7, padding: '7px 18px', fontSize: 13, color: BLUE, cursor: downloading ? 'default' : 'pointer', fontWeight: 500, opacity: downloading ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}
          >
            {downloading ? '⏳ Generating…' : '↓ Download PDF'}
          </button>
        </div>
      </div>

      {/* Pages container */}
      <div style={{ padding: '32px 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, overflowX: 'auto' }} ref={pagesRef}>
        <CoverPage            d={data} />
        <ProblemSolutionPage  d={data} />
        <MarketBusinessPage   d={data} />
        <RisksNextStepsPage   d={data} />
      </div>
    </div>
  )
}
