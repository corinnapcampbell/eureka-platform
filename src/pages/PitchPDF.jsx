import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const NAVY = '#0e0e1f'
const BLUE = '#7b9ff7'
const PURP = '#9b7ff7'
const PINK = '#e07b9f'
const GRAD = 'linear-gradient(90deg, #7b9ff7, #9b7ff7)'
const PW   = 794
const PH   = 1123

// ─── Helpers ─────────────────────────────────────────────────────────────────

function splitToSteps(text, max = 5) {
  if (!text) return []
  const numMatches = [...text.matchAll(/(?:^|\n)\s*(?:\d+[.)]\s*|Step\s+\d+[:.\s]+)([^\n]+)/gi)]
  if (numMatches.length >= 2) return numMatches.map(m => m[1].trim()).filter(Boolean).slice(0, max)
  let parts = text.split(/\n+/).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(l => l.length > 4)
  if (parts.length >= 2) return parts.slice(0, max)
  parts = text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 10)
  if (parts.length >= 2) return parts.slice(0, max)
  return text.trim() ? [text.trim()] : []
}

function splitLines(text, max = 5) {
  if (!text) return []
  let parts = text.split(/\n+/).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(l => l.length > 3)
  if (parts.length < 2) parts = text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 8)
  return parts.slice(0, max)
}

function parseBizTiers(text) {
  if (!text) return { free: 'Core features, free to get started', paid: 'Advanced features and premium access' }
  const freeM = text.match(/free[:\s-]+([^\n]+)/i)
  const paidM = text.match(/paid[:\s-]+([^\n]+)|premium[:\s-]+([^\n]+)|pro[:\s-]+([^\n]+)/i)
  const lines = splitLines(text, 4)
  return {
    free: freeM?.[1]?.trim() || lines[0] || text.slice(0, 130),
    paid: paidM?.[1]?.trim() || paidM?.[2]?.trim() || lines[1] || 'Advanced features and priority support',
  }
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

function parseTags(val) {
  if (!val) return []
  if (Array.isArray(val)) return val.slice(0, 7)
  return val.split(/[,\n]+/).map(t => t.replace(/^[-•*\d.)\s]+/, '').trim()).filter(t => t.length > 0 && t.length < 40).slice(0, 7)
}

function fmtDate(str) {
  try { return new Date(str).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
  catch { return '' }
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

const AccentBar = () => <div style={{ height: 4, background: GRAD, flexShrink: 0 }} />

function Logo({ onDark = true, size = 15 }) {
  return (
    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 300, fontSize: size }}>
      <span style={{ color: onDark ? 'rgba(255,255,255,0.88)' : '#1a1a2e' }}>Eurek</span>
      <span style={{ color: BLUE }}>AI</span>
      <span style={{ color: onDark ? 'rgba(255,255,255,0.88)' : '#1a1a2e' }}>dea</span>
    </span>
  )
}

function SLabel({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(123,159,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ fontSize: 10, letterSpacing: 2, color: PURP, textTransform: 'uppercase', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </span>
    </div>
  )
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function CoverPage({ d }) {
  return (
    <div className="page" style={{ width: PW, height: PH, background: NAVY, fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box', position: 'relative' }}>
      <div style={{ position: 'absolute', top: -120, right: -120, width: 420, height: 420, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.09)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -50, right: -50, width: 260, height: 260, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.06)', pointerEvents: 'none' }} />

      <AccentBar />

      <div style={{ padding: '24px 48px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <Logo size={18} onDark />
        <div style={{ fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.28)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 3, padding: '4px 10px' }}>
          CONFIDENTIAL
        </div>
      </div>

      {d.categories?.length > 0 && (
        <div style={{ padding: '0 48px 20px', display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          {d.categories.slice(0, 4).map((cat, i) => (
            <span key={i} style={{ fontSize: 10, background: 'rgba(123,159,247,0.18)', color: BLUE, borderRadius: 20, padding: '4px 13px', border: '0.5px solid rgba(123,159,247,0.3)' }}>
              {cat}
            </span>
          ))}
        </div>
      )}

      <div style={{ padding: '0 48px 14px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 38, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: -0.5, maxHeight: 140, overflow: 'hidden' }}>{d.title}</div>
      </div>

      <div style={{ padding: '0 48px 28px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6, maxWidth: 580, maxHeight: 80, overflow: 'hidden' }}>{d.tagline}</div>
      </div>

      <div style={{ margin: '0 48px 28px', height: 0.5, background: 'rgba(255,255,255,0.08)', position: 'relative', zIndex: 1 }} />

      <div style={{ padding: '0 48px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 56px', position: 'relative', zIndex: 1 }}>
        {[
          { label: 'Submitted By', value: d.presenterName },
          { label: 'Date',         value: d.dateStr },
          { label: 'Market Size',  value: d.market_size },
          { label: 'Looking For',  value: d.looking_for_short },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.27)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 7 }}>{label}</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.66)', fontWeight: 500, lineHeight: 1.45 }}>{String(value || '—').slice(0, 80)}</div>
          </div>
        ))}
      </div>

      {d.blockchain_hash && (
        <div style={{ padding: '0 48px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.13)', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.5 }}>
            ⬡ {d.blockchain_hash}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />
      <AccentBar />
    </div>
  )
}

function ProblemSolutionPage({ d }) {
  const steps = splitToSteps(d.how_it_works, 4)

  return (
    <div className="page" style={{ width: PW, height: PH, background: '#fff', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
      <AccentBar />
      <div style={{ padding: '14px 48px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
        <Logo onDark={false} size={13} />
        <span style={{ fontSize: 9, color: '#c8c8c8', letterSpacing: 0.3 }}>2 / 5</span>
      </div>
      <div style={{ flex: 1, padding: '24px 48px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <SLabel icon="⚡" label="The Problem" />
        <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.8, marginBottom: 20, maxHeight: 108, overflow: 'hidden' }}>{d.problem}</div>

        <div style={{ background: 'rgba(123,159,247,0.07)', borderLeft: '3px solid #7b9ff7', borderRadius: 8, padding: '18px 22px', marginBottom: 20 }}>
          <SLabel icon="💡" label="The Solution" />
          <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.8, maxHeight: 100, overflow: 'hidden' }}>{d.solution}</div>
        </div>

        <div style={{ height: 0.5, background: 'rgba(0,0,0,0.07)', marginBottom: 20 }} />

        <SLabel icon="⚙️" label="How It Works" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {(steps.length > 0 ? steps : [d.how_it_works || 'See full idea details']).map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
              <div style={{ width: 26, height: 26, minWidth: 26, borderRadius: '50%', background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{i + 1}</div>
              <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.7, flex: 1, paddingTop: 3 }}>{step}</div>
            </div>
          ))}
        </div>

      </div>
      <div style={{ padding: '9px 48px', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: '#bbb' }}>Protected &amp; Presented by eurekAIdea · myeurekaidea.com</span>
        <span style={{ fontSize: 9, color: '#bbb' }}>Confidential · 2 / 5</span>
      </div>
      <AccentBar />
    </div>
  )
}

function MarketBusinessPage({ d }) {
  const metrics = parseMetrics(d.market_size)
  const tiers   = parseBizTiers(d.business_model)
  const tags    = parseTags(d.target_audience || d.categories)

  return (
    <div className="page" style={{ width: PW, height: PH, background: '#fff', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
      <AccentBar />
      <div style={{ padding: '14px 48px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
        <Logo onDark={false} size={13} />
        <span style={{ fontSize: 9, color: '#c8c8c8', letterSpacing: 0.3 }}>3 / 5</span>
      </div>
      <div style={{ flex: 1, padding: '24px 48px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <SLabel icon="📈" label="Market Size" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
          {metrics.map((m, i) => (
            <div key={i} style={{ background: 'rgba(123,159,247,0.06)', border: '0.5px solid rgba(123,159,247,0.12)', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 5, lineHeight: 1.1 }}>{m.value}</div>
              <div style={{ fontSize: 9, color: '#999', textTransform: 'uppercase', letterSpacing: 0.8 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18 }}>
            <span style={{ fontSize: 14, marginRight: 2 }}>🎯</span>
            {tags.map((t, i) => (
              <span key={i} style={{ fontSize: 11, background: 'rgba(123,159,247,0.08)', color: '#555', borderRadius: 20, padding: '4px 12px', border: '0.5px solid rgba(123,159,247,0.16)' }}>{t}</span>
            ))}
          </div>
        )}

        <div style={{ height: 0.5, background: 'rgba(0,0,0,0.07)', marginBottom: 20 }} />

        <SLabel icon="💰" label="Business Model" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: '#f8f8fc', borderTop: `3px solid ${BLUE}`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: BLUE, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 9 }}>Free Tier</div>
            <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7, maxHeight: 78, overflow: 'hidden' }}>{tiers.free}</div>
          </div>
          <div style={{ background: '#f8f8fc', borderTop: `3px solid ${PURP}`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: PURP, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 9 }}>Paid Tier ✦</div>
            <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7, maxHeight: 78, overflow: 'hidden' }}>{tiers.paid}</div>
          </div>
        </div>

      </div>
      <div style={{ padding: '9px 48px', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: '#bbb' }}>Protected &amp; Presented by eurekAIdea · myeurekaidea.com</span>
        <span style={{ fontSize: 9, color: '#bbb' }}>Confidential · 3 / 5</span>
      </div>
      <AccentBar />
    </div>
  )
}

function AdvantageRisksPage({ d }) {
  const risks = splitLines(d.risks, 5)

  return (
    <div className="page" style={{ width: PW, height: PH, background: '#fff', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
      <AccentBar />
      <div style={{ padding: '14px 48px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
        <Logo onDark={false} size={13} />
        <span style={{ fontSize: 9, color: '#c8c8c8', letterSpacing: 0.3 }}>4 / 5</span>
      </div>
      <div style={{ flex: 1, padding: '24px 48px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <SLabel icon="🏆" label="Competitive Advantage" />
        <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.8, marginBottom: 24, maxHeight: 178, overflow: 'hidden' }}>{d.competitive_advantage}</div>

        <div style={{ height: 0.5, background: 'rgba(0,0,0,0.07)', marginBottom: 22 }} />

        <SLabel icon="⚠️" label="Risks & Challenges" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {(risks.length > 0 ? risks : [d.risks || 'Risk assessment in progress']).map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 8, height: 8, minWidth: 8, borderRadius: '50%', background: PINK, marginTop: 8, flexShrink: 0 }} />
              <div style={{ fontSize: 13.5, color: '#444', lineHeight: 1.7 }}>{r}</div>
            </div>
          ))}
        </div>

      </div>
      <div style={{ padding: '9px 48px', borderTop: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: '#bbb' }}>Protected &amp; Presented by eurekAIdea · myeurekaidea.com</span>
        <span style={{ fontSize: 9, color: '#bbb' }}>Confidential · 4 / 5</span>
      </div>
      <AccentBar />
    </div>
  )
}

function RoadmapPage({ d }) {
  const steps = splitToSteps(d.next_steps, 5)

  return (
    <div className="page" style={{ width: PW, height: PH, background: '#fff', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box' }}>
      <AccentBar />
      <div style={{ padding: '14px 48px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
        <Logo onDark={false} size={13} />
        <span style={{ fontSize: 9, color: '#c8c8c8', letterSpacing: 0.3 }}>5 / 5</span>
      </div>
      <div style={{ flex: 1, padding: '24px 48px 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <SLabel icon="🚀" label="Next Steps & Roadmap" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {(steps.length > 0 ? steps : [d.next_steps || 'Planning underway']).map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, marginTop: 2 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: GRAD }} />
                {i < (steps.length > 0 ? steps : [1]).length - 1 && (
                  <div style={{ width: 1, height: 22, background: 'rgba(123,159,247,0.2)', marginTop: 3 }} />
                )}
              </div>
              <div style={{ fontSize: 13.5, color: '#333', lineHeight: 1.7, flex: 1 }}>{step}</div>
            </div>
          ))}
        </div>

      </div>
      {/* Dark closing footer */}
      <div style={{ background: NAVY, padding: '18px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <Logo size={14} onDark />
        <div style={{ fontSize: 11, background: 'rgba(123,159,247,0.15)', border: '0.5px solid rgba(123,159,247,0.3)', color: BLUE, borderRadius: 20, padding: '5px 18px' }}>
          myeurekaidea.com
        </div>
      </div>
      <AccentBar />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PitchPDF({ session }) {
  const { ideaId }    = useParams()
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()
  const [data,         setData]        = useState(null)
  const [loading,      setLoading]     = useState(true)
  const [filling,      setFilling]     = useState(false)
  const [downloading,  setDownloading] = useState(false)
  const [dlProgress,   setDlProgress]  = useState(0)
  const [notPublished, setNotPublished] = useState(false)
  const pagesRef = useRef()

  const autoDownload = searchParams.get('download') === '1'

  useEffect(() => {
    if (data && autoDownload && !downloading) downloadPDF()
  }, [data])

  useEffect(() => {
    async function load() {
      const { data: idea } = await supabase
        .from('ideas')
        .select('*, profiles(full_name, email)')
        .eq('id', ideaId)
        .single()

      if (!idea) { setLoading(false); return }

      const isOwner = !!(session?.user?.id && session.user.id === idea.user_id)

      if (!isOwner && !idea.pdf_published) {
        setNotPublished(true)
        setLoading(false)
        return
      }

      let src = idea
      if (!isOwner && idea.pdf_snapshot) {
        src = { ...idea, ...idea.pdf_snapshot }
      }

      const REQUIRED = ['tagline', 'problem', 'solution', 'how_it_works', 'market_size', 'business_model', 'competitive_advantage', 'risks', 'next_steps']
      const missing  = REQUIRED.filter(f => !src[f]?.trim())
      let filled = {}
      if (missing.length > 0) {
        setFilling(true)
        try {
          const res = await fetch('/api/functions/fill-pitch-fields', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idea: src }),
          })
          if (res.ok) filled = (await res.json()).filled || {}
        } catch (e) {
          console.error('AI fill error:', e)
        }
        setFilling(false)
      }

      const merged = { ...src, ...filled }
      setData({
        ...merged,
        categories:        Array.isArray(merged.category) ? merged.category : [],
        presenterName:     merged.presenterName
                             || merged.profiles?.full_name
                             || session?.user?.user_metadata?.full_name
                             || session?.user?.email?.split('@')[0]
                             || '—',
        email:             merged.email || merged.profiles?.email || session?.user?.email || '',
        dateStr:           fmtDate(merged.created_at),
        looking_for_short: (merged.looking_for || merged.terms || '').split(/[\n.!?]/)[0]?.trim()?.slice(0, 80) || '—',
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
      const pages = pagesRef.current.querySelectorAll('.page')
      const doc   = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      for (let i = 0; i < pages.length; i++) {
        setDlProgress(Math.round(((i + 1) / pages.length) * 100))
        const canvas = await html2canvas(pages[i], {
          scale: 2, useCORS: true, allowTaint: true, logging: false,
          width: PW, height: PH, windowWidth: PW, windowHeight: PH,
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

  const isOwner = !!(session?.user?.id && data?.user_id === session.user.id)

  if (loading || filling) return (
    <div style={{ height: '100vh', background: NAVY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div className="spinner" style={{ width: 28, height: 28, borderTopColor: BLUE }} />
      <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
        {filling ? 'AI is filling in missing sections…' : 'Loading pitch…'}
      </p>
    </div>
  )

  if (notPublished) return (
    <div style={{ height: '100vh', background: NAVY, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '2rem', textAlign: 'center' }}>
      <div style={{ fontSize: 40, opacity: 0.3 }}>📄</div>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff', margin: 0 }}>Pitch not yet published</h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', maxWidth: 360, margin: 0 }}>The owner hasn't published this pitch document yet. Check back later.</p>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>Presented via eurekAIdea · myeurekaidea.com</p>
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
          <Logo size={16} onDark />
          <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.36)', fontFamily: "'DM Sans', sans-serif" }}>
            Pitch Preview · 5 pages
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
            style={{ background: 'rgba(123,159,247,0.18)', border: '0.5px solid rgba(123,159,247,0.36)', borderRadius: 7, padding: '7px 18px', fontSize: 13, color: BLUE, cursor: downloading ? 'default' : 'pointer', fontWeight: 500, opacity: downloading ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif", minWidth: 160 }}
          >
            {downloading ? `⏳ Rendering… ${dlProgress}%` : '↓ Download PDF (5pp)'}
          </button>
        </div>
      </div>

      {/* Pages — same HTML used for inline preview and PDF capture */}
      <div ref={pagesRef} style={{ padding: '32px 0 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, overflowX: 'auto' }}>
        <CoverPage d={data} />
        <ProblemSolutionPage d={data} />
        <MarketBusinessPage d={data} />
        <AdvantageRisksPage d={data} />
        <RoadmapPage d={data} />
      </div>
    </div>
  )
}
