import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'
import { generateIdeaPDF, dedupeArray } from '../utils/generatePDF'
import { parseBMValue, buildBMHtml, buildSnapshotHTML } from '../utils/businessModel'
import { ScaledSlide } from '../components/DeckSlides'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

function splitHowItWorks(text) {
  if (!text?.trim()) return []
  const numMatches = [...text.matchAll(/(?:^|\n)\s*\d+[.)]\s*([^\n]+)/g)]
  if (numMatches.length >= 2) return numMatches.map(m => m[1].trim()).filter(Boolean)
  const lines = text.split(/\n+/).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(l => l.length > 4)
  if (lines.length >= 2) return lines
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 10)
  if (sentences.length >= 2) return sentences
  return [text.trim()]
}

export default function SharedIdea() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [authSession, setAuthSession] = useState(null)
  const [stage, setStage] = useState('loading')
  const [idea, setIdea] = useState(null)
  const [email, setEmail] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [deckInfo, setDeckInfo] = useState(null)   // { share_token } if public deck exists
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [downloadingSnapshotPDF, setDownloadingSnapshotPDF] = useState(false)
  const [viewingSnapshotPDF, setViewingSnapshotPDF] = useState(false)
  const [showMobilePDF, setShowMobilePDF] = useState(false)
  const [mobilePDFContent, setMobilePDFContent] = useState('')
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const [isLandscape, setIsLandscape] = useState(window.matchMedia('(orientation: landscape)').matches)
  const [showMobileDeck, setShowMobileDeck] = useState(false)
  const [mobileDeckSlides, setMobileDeckSlides] = useState(null)
  const [mobileDeckCurrent, setMobileDeckCurrent] = useState(0)
  const [showRotatePrompt, setShowRotatePrompt] = useState(true)
  const mobileDeckTouchStart = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setAuthSession(session))
  }, [])

  useEffect(() => {
    async function fetchLink() {
      const { data: link, error } = await supabase
        .from('shared_links')
        .select('*, ideas(*)')
        .eq('token', token)
        .maybeSingle()

      if (error) console.error('shared_links fetch error:', error.message, error.code)
      if (!link || !link.ideas) {
        setStage('error')
        return
      }
      setIdea(link.ideas)
      setStage('nda')

      // Check whether the owner has published a public deck for this idea
      const { data: deck } = await supabase
        .from('pitch_decks')
        .select('share_token, is_public')
        .eq('idea_id', link.ideas.id)
        .eq('is_public', true)
        .maybeSingle()
      if (deck?.share_token) setDeckInfo(deck)
    }
    fetchLink()
  }, [token])

  useEffect(() => {
    const update = () => {
      const landscape = window.innerWidth > window.innerHeight
      setIsLandscape(landscape)
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  async function openMobileDeck() {
    if (!deckInfo?.share_token) return
    if (mobileDeckSlides) {
      setShowMobileDeck(true)
      setMobileDeckCurrent(0)
      setShowRotatePrompt(true)
      return
    }
    const { data } = await supabase
      .from('pitch_decks')
      .select('slides')
      .eq('share_token', deckInfo.share_token)
      .single()
    if (data?.slides?.length) {
      setMobileDeckSlides(data.slides)
      setMobileDeckCurrent(0)
      setShowMobileDeck(true)
      setShowRotatePrompt(true)
    }
  }

  async function acceptNDA() {
    if (!email) return
    setAccepting(true)

    const { error: logError } = await supabase.from('idea_access_log').insert({
      idea_id: idea.id,
      viewer_email: email,
      ip_address: 'logged',
      nda_accepted: true,
      viewed_at: new Date().toISOString(),
    })
    if (logError) console.error('idea_access_log insert error:', logError.message, logError.code)

    setStage('idea')
    setAccepting(false)
  }

  function buildSnapshotForm(ideaData) {
    return {
      tagline:               ideaData.tagline               || '',
      problem:               ideaData.problem               || '',
      solution:              ideaData.solution              || '',
      how_it_works:          ideaData.how_it_works          || '',
      market_size:           ideaData.market_size           || '',
      target_audience:       ideaData.target_audience       || '',
      business_model:        ideaData.business_model        || '',
      competitive_advantage: ideaData.competitive_advantage || '',
      risks:                 ideaData.risks                 || '',
      next_steps:            ideaData.next_steps            || '',
      ...(ideaData.pdf_snapshot || {}),
    }
  }

  async function fetchFreshIdea() {
    const { data } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', idea.id)
      .single()
    console.log('FRESH IDEA DATA:', JSON.stringify(data, null, 2))
    if (data) setIdea(data)
    return data || idea
  }

  async function viewSnapshotPDF() {
    setViewingSnapshotPDF(true)
    const fresh = await fetchFreshIdea()
    const form = buildSnapshotForm(fresh)
    const inner = buildSnapshotHTML(form, fresh)
    const fullHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fresh.title} — Pitch PDF</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"></head><body style="margin:0;background:#f5f5f3;padding:20px 0;min-height:100vh"><div id="pdf-preview">${inner}</div></body></html>`
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      setMobilePDFContent(fullHTML)
      setShowMobilePDF(true)
    } else {
      const blob = new Blob([fullHTML], { type: 'text/html' })
      window.open(URL.createObjectURL(blob), '_blank')
    }
    setViewingSnapshotPDF(false)
  }

  async function downloadSnapshotPDF() {
    setDownloadingSnapshotPDF(true)
    const fresh = await fetchFreshIdea()
    const form = buildSnapshotForm(fresh)
    const inner = buildSnapshotHTML(form, fresh)
    const container = document.createElement('div')
    container.id = 'pdf-preview'
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:375px;z-index:-9999'
    container.innerHTML = inner
    document.body.appendChild(container)
    try {
      const pages = container.querySelectorAll('.page')
      const pdf = new jsPDF({ unit: 'pt', format: [375, 667], orientation: 'portrait' })
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, logging: false })
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        if (i > 0) pdf.addPage([375, 667], 'portrait')
        pdf.addImage(imgData, 'JPEG', 0, 0, 375, 667)
      }
      pdf.save(`${idea.title || 'pitch'}.pdf`)
    } catch (e) { console.error('Snapshot PDF download error:', e) }
    document.body.removeChild(container)
    setDownloadingSnapshotPDF(false)
  }

  function handleDownloadPDF() {
    setDownloadingPDF(true)
    try {
      generateIdeaPDF(idea)
    } catch (e) {
      console.error('PDF error:', e)
    }
    setDownloadingPDF(false)
  }

  if (stage === 'loading') return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e1f' }}>
      <div className="spinner" />
    </div>
  )

  if (stage === 'error') return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#0e0e1f', padding: '2rem', position: 'relative' }}>
      <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <Logo size={22} variant="dark" />
      </span>
      <span style={{ fontSize: 40, opacity: 0.25 }}>⬡</span>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff' }}>Link not found</h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>This link may have expired or been revoked.</p>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>Presented via eurekAIdea · myeurekaidea.com</p>
    </div>
  )

  // ─── PHASE 1: TEASER / NDA ───────────────────────────────────────────────
  if (stage === 'nda') return (
    <div style={{ minHeight: '100vh', background: '#0e0e1f', position: 'relative', overflow: 'hidden', width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
      {authSession && (
        <a href="/dashboard" style={{ position: 'fixed', top: 14, right: 16, zIndex: 999, background: 'rgba(123,159,247,0.12)', border: '0.5px solid rgba(123,159,247,0.3)', borderRadius: 7, padding: '6px 14px', fontSize: 12, color: '#7b9ff7', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>My Dashboard →</a>
      )}
      {/* Gradient accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' }} />

      {/* Geometric decorations */}
      <div style={{ position: 'absolute', top: -140, right: -140, width: 'min(420px, 90vw)', height: 'min(420px, 90vw)', borderRadius: '50%', border: '1px solid rgba(123,159,247,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -70, right: -70, width: 260, height: 260, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -100, width: 320, height: 320, borderRadius: '50%', border: '1px solid rgba(155,127,247,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -40, left: -40, width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(155,127,247,0.05)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '3.5rem 1.25rem 3rem', position: 'relative', width: '100%', boxSizing: 'border-box' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <Logo size={24} variant="dark" />
          </span>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(20px, 4.5vw, 42px)', color: '#fff', lineHeight: 1.15, marginBottom: '0.75rem', letterSpacing: '-0.5px', wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>
            {idea.title}
          </h1>
          {idea.target_audience && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>
              Built for {idea.target_audience}
            </p>
          )}
        </div>

        {/* Category chips — deduplicated */}
        {dedupeArray(idea.category || []).length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginBottom: '2rem' }}>
            {dedupeArray(idea.category || []).map(c => (
              <span key={c} style={{ fontSize: 11, background: 'rgba(123,159,247,0.1)', color: '#7b9ff7', borderRadius: 20, padding: '4px 12px', fontWeight: 500, border: '0.5px solid rgba(123,159,247,0.18)' }}>{c}</span>
            ))}
          </div>
        )}

        {/* Blurred preview card */}
        <div style={{ position: 'relative', marginBottom: '1.75rem', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '1.5rem', filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none', minHeight: 90 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(123,159,247,0.5)', marginBottom: 8 }}>The Problem</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
              {idea.problem ? idea.problem.slice(0, 110) + '...' : 'Protected content · Accept NDA to view the full idea details and pitch documents.'}
            </p>
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(14,14,31,0.2) 0%, rgba(14,14,31,0.88) 100%)', borderRadius: 14 }} />
          <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.3px' }}>Content protected · accept NDA to reveal</span>
          </div>
        </div>

        {/* Protection badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(123,159,247,0.07)', border: '0.5px solid rgba(123,159,247,0.18)', borderRadius: 20, padding: '6px 16px' }}>
            <span style={{ fontSize: 12 }}>🔒</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>This idea is protected by eurekAIdea</span>
          </div>
        </div>

        {/* NDA form card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: '1.75rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Your email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              onKeyDown={e => e.key === 'Enter' && email && !accepting && acceptNDA()}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '12px 14px', fontSize: 16, color: '#fff', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            onClick={acceptNDA}
            disabled={!email || accepting}
            style={{
              width: '100%',
              background: (!email || accepting) ? 'rgba(123,159,247,0.3)' : 'linear-gradient(90deg, #7b9ff7, #9b7ff7)',
              color: '#fff', border: 'none', borderRadius: 10, padding: '14px',
              fontSize: 15, fontWeight: 600,
              cursor: (!email || accepting) ? 'not-allowed' : 'pointer',
              letterSpacing: '0.2px',
            }}
          >
            {accepting ? 'Logging access...' : 'View Protected Idea — Accept NDA'}
          </button>

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 12, lineHeight: 1.65 }}>
            By proceeding you agree this content is confidential and proprietary.<br />
            Your identity and access time will be logged.
          </p>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>Presented via eurekAIdea · myeurekaidea.com</p>
        </div>
      </div>
    </div>
  )

  // ─── PHASE 2: FULL CONTENT ───────────────────────────────────────────────
  const date = new Date(idea.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const categories = dedupeArray(idea.category || [])
  const lookingFor = dedupeArray((idea.terms || '').split(', ').filter(Boolean))

  return (
    <>
    <div style={{ minHeight: '100vh', background: '#f5f5f3', width: '100%', minWidth: '100%', maxWidth: '100vw', overflowX: 'hidden', boxSizing: 'border-box', position: 'relative', fontSize: '16px' }}>
      {authSession && (
        <a href="/dashboard" style={{ position: 'fixed', top: 14, right: 16, zIndex: 999, background: 'rgba(123,159,247,0.08)', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 7, padding: '6px 14px', fontSize: 12, color: '#7b9ff7', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>My Dashboard →</a>
      )}
      {/* Gradient accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' }} />

      {/* Dark header */}
      <div style={{ background: '#0e0e1f', paddingBottom: '2.5rem', overflowX: 'hidden', boxSizing: 'border-box', width: '100%', position: 'relative' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '1.5rem 1.25rem 0', width: '100%', boxSizing: 'border-box' }}>

          {/* Nav row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: 8 }}>
            <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <Logo size={20} variant="dark" />
            </span>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(123,159,247,0.09)', border: '0.5px solid rgba(123,159,247,0.18)', borderRadius: 20, padding: '5px 13px' }}>
              <span style={{ fontSize: 11 }}>🔒</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>NDA accepted · access logged</span>
            </div>
          </div>

          {/* Categories + hash badge — deduplicated */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
            {categories.map(c => (
              <span key={c} style={{ fontSize: 11, background: 'rgba(123,159,247,0.1)', color: '#7b9ff7', borderRadius: 20, padding: '4px 12px', fontWeight: 500, border: '0.5px solid rgba(123,159,247,0.18)' }}>{c}</span>
            ))}
            {idea.blockchain_hash && (
              <span style={{ fontSize: 11, background: 'rgba(74,222,128,0.08)', color: '#4ade80', borderRadius: 20, padding: '4px 12px', fontWeight: 500, border: '0.5px solid rgba(74,222,128,0.18)' }}>⬡ Timestamped</span>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(20px, 4.5vw, 42px)', color: '#fff', lineHeight: 1.15, marginBottom: '0.5rem', letterSpacing: '-0.5px', wordBreak: 'break-word', overflowWrap: 'break-word', maxWidth: '100%' }}>
            {idea.title}
          </h1>
          {idea.target_audience && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', marginBottom: '0.5rem' }}>
              Built for {idea.target_audience}
            </p>
          )}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)' }}>Protected idea · submitted {date}</p>
        </div>
      </div>

      {/* White content area */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1.25rem 4rem', width: '100%', boxSizing: 'border-box' }}>

        {/* Card 1: Problem & Solution */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.25rem', width: '100%' }}>
          {idea.problem && (
            <div style={{ background: '#0e0e1f', borderRadius: 14, padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem' }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.35)' }}>The Problem</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.78)' }}>{idea.problem}</p>
            </div>
          )}

          {idea.solution && (
            <div style={{ background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', borderRadius: 15, padding: 1.5 }}>
              <div style={{ background: '#fff', borderRadius: 13, padding: '1.5rem', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: 16 }}>💡</span>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#9b7ff7' }}>The Solution</span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{idea.solution}</p>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Key Details — all arrays deduplicated */}
        {(idea.market_size || idea.terms || categories.length > 0) && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>Key Details</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {idea.market_size && (
                <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '8px 14px' }}>
                  <span style={{ fontSize: 11, color: '#888780' }}>Market · </span>
                  <span style={{ fontSize: 13, color: '#2c2c2a', fontWeight: 500 }}>{idea.market_size}</span>
                </div>
              )}
              {categories.map(c => (
                <div key={c} style={{ background: '#EBF0F7', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#3B5273', fontWeight: 500 }}>{c}</div>
              ))}
              {lookingFor.map(t => (
                <div key={t} style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#16a34a', fontWeight: 500 }}>Looking for: {t}</div>
              ))}
              {idea.asking_price && (
                <div style={{ background: '#fdf8f0', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#92400e', fontWeight: 500 }}>{idea.asking_price} · {idea.pricing_model}</div>
              )}
            </div>
          </div>
        )}

        {/* Card 3: How It Works */}
        {idea.how_it_works && (() => {
          const steps = splitHowItWorks(idea.how_it_works)
          return (
            <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>How It Works</p>
              {steps.length === 1
                ? <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{steps[0]}</p>
                : steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: '0.85rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                      <p style={{ fontSize: 14, lineHeight: 1.75, color: '#2c2c2a', paddingTop: 2 }}>{step}</p>
                    </div>
                  ))
              }
            </div>
          )
        })()}

        {/* Card 4: Business Model (conditional) */}
        {idea.business_model && (() => {
          const bmVal = parseBMValue(idea.business_model)
          const bmHtml = buildBMHtml(bmVal)
          if (!bmHtml) return null
          return (
            <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <style>{`
                .bm-investor .twocards{display:grid;grid-template-columns:1fr 1fr;gap:8px}
                .bm-investor .card{background:#f8f8fc;border-radius:8px;padding:11px;box-sizing:border-box}
                .bm-investor .card.bl{border-top:3px solid #7b9ff7}
                .bm-investor .card.pu{border-top:3px solid #9b7ff7}
                .bm-investor .cicon{font-size:18px;margin-bottom:5px}
                .bm-investor .clabel{font-size:8px;letter-spacing:2px;color:#9b7ff7;text-transform:uppercase;font-weight:600;margin-bottom:5px}
                .bm-investor .ctext{font-size:11px;color:#555;line-height:1.6}
                .bm-investor .stext{font-size:12px;color:#333;line-height:1.7}
                .bm-investor .bm-model-title{font-family:'Outfit',sans-serif;font-weight:400;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#7b9ff7;margin:14px 0 8px 0;padding-bottom:5px;border-bottom:1px solid rgba(123,159,247,0.2)}
                .bm-investor .bm-model-title:first-child{margin-top:0}
              `}</style>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '0.75rem' }}>Business Model</p>
              <div className="bm-investor" dangerouslySetInnerHTML={{ __html: bmHtml }} />
            </div>
          )
        })()}

        {/* Card 5: Pitch Documents — only shown when at least one is published */}
        {(idea.pdf_published || idea.deck_published) && (
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '0.85rem', paddingLeft: 2 }}>Pitch Documents</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>

              {idea.pdf_published && (
                <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: 22 }}>📄</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#2c2c2a' }}>Pitch PDF</p>
                      <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>Published ✓</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={viewSnapshotPDF}
                      disabled={viewingSnapshotPDF}
                      style={{ flex: 1, textAlign: 'center', background: 'rgba(123,159,247,0.07)', border: '0.5px solid rgba(123,159,247,0.22)', borderRadius: 7, padding: '7px 0', fontSize: 12, color: '#7b9ff7', cursor: viewingSnapshotPDF ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: viewingSnapshotPDF ? 0.6 : 1 }}
                    >
                      {viewingSnapshotPDF ? '…' : 'View'}
                    </button>
                    <button
                      onClick={downloadSnapshotPDF}
                      disabled={downloadingSnapshotPDF}
                      style={{ flex: 1, textAlign: 'center', background: 'rgba(123,159,247,0.13)', border: '0.5px solid rgba(123,159,247,0.22)', borderRadius: 7, padding: '7px 0', fontSize: 12, color: '#7b9ff7', cursor: downloadingSnapshotPDF ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: downloadingSnapshotPDF ? 0.6 : 1 }}
                    >
                      {downloadingSnapshotPDF ? '…' : '↓ Download'}
                    </button>
                  </div>
                </div>
              )}

              {idea.deck_published && (
                <div style={{ background: 'linear-gradient(135deg, rgba(123,159,247,0.04), rgba(155,127,247,0.04))', border: '0.5px solid rgba(123,159,247,0.22)', borderRadius: 14, padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: 22 }}>📊</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#2c2c2a' }}>Pitch Deck</p>
                      <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>Published ✓</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => window.open(`/deck/view/${deckInfo.share_token}`, '_blank')}
                      style={{ flex: 1, textAlign: 'center', background: 'rgba(123,159,247,0.07)', border: '0.5px solid rgba(123,159,247,0.22)', borderRadius: 7, padding: '7px 0', fontSize: 12, color: '#7b9ff7', cursor: 'pointer', fontWeight: 500 }}
                    >View</button>
                    {deckInfo && (
                      <a
                        href={`/deck/view/${deckInfo.share_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flex: 1, textAlign: 'center', background: 'rgba(123,159,247,0.13)', border: '0.5px solid rgba(123,159,247,0.22)', borderRadius: 7, padding: '7px 0', fontSize: 12, color: '#7b9ff7', textDecoration: 'none', fontWeight: 500 }}
                      >↓ Download</a>
                    )}
                  </div>
                </div>
              )}

            </div>
        </div>
        )}

        {/* Card 6: AI Executive Summary (collapsed) */}
        {idea.ai_profile && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, marginBottom: '1.25rem', overflow: 'hidden' }}>
            <button
              onClick={() => setSummaryExpanded(x => !x)}
              style={{ width: '100%', background: 'none', border: 'none', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888780' }}>AI Executive Summary</span>
              </div>
              <span style={{ fontSize: 12, color: '#7b9ff7', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 12 }}>
                {summaryExpanded ? 'Collapse ▲' : 'Read full summary ▼'}
              </span>
            </button>
            {summaryExpanded && (
              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                <p style={{ fontSize: 14, lineHeight: 1.85, color: '#2c2c2a', fontStyle: 'italic' }}>{idea.ai_profile}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ background: '#0e0e1f', borderRadius: 14, padding: '1.5rem 1.75rem', textAlign: 'center' }}>
          {idea.blockchain_hash && (
            <div style={{ marginBottom: '0.85rem' }}>
              <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.2)', marginBottom: 5 }}>Cryptographic fingerprint</p>
              <code style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', wordBreak: 'break-all', fontFamily: 'monospace' }}>{idea.blockchain_hash}</code>
            </div>
          )}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>🔒 Access logged · Confidential under NDA</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 6 }}>Presented via eurekAIdea · myeurekaidea.com</p>
        </div>
      </div>
    </div>

    {showMobilePDF && (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0e0e1f', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: "'DM Sans', sans-serif" }}>Pitch Document</span>
          <button
            onClick={() => setShowMobilePDF(false)}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, width: 32, height: 32, color: 'rgba(255,255,255,0.7)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
          >×</button>
        </div>
        <iframe
          srcDoc={mobilePDFContent}
          style={{ flex: 1, border: 'none', width: '100%' }}
          title="Pitch Document"
        />
      </div>
    )}

    {showMobileDeck && mobileDeckSlides && (
      <>
        <div
          className="deck-mobile-viewer"
          style={{
            position: isLandscape ? 'fixed' : 'relative',
            top: isLandscape ? 0 : 'auto',
            left: isLandscape ? 0 : 'auto',
            width: isLandscape ? '100vw' : '100%',
            height: isLandscape ? '100vh' : 'auto',
            zIndex: isLandscape ? 9999 : 'auto',
            background: '#0e0e1f',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}
          onTouchStart={e => { mobileDeckTouchStart.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (mobileDeckTouchStart.current === null) return
            const diff = mobileDeckTouchStart.current - e.changedTouches[0].clientX
            if (Math.abs(diff) > 50) setMobileDeckCurrent(c => diff > 0 ? Math.min(mobileDeckSlides.length - 1, c + 1) : Math.max(0, c - 1))
            mobileDeckTouchStart.current = null
          }}
        >
          <button
            onClick={() => setShowMobileDeck(false)}
            style={{ position: 'absolute', top: 12, right: 12, zIndex: 10002, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 32, height: 32, color: 'rgba(255,255,255,0.8)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
          >✕</button>

          <div className="deck-mobile-slide" style={{ width: isLandscape ? `min(100vw, calc(100vh * 1.7778))` : '100vw' }}>
            <ScaledSlide
              slide={mobileDeckSlides[mobileDeckCurrent]}
              slideNum={mobileDeckCurrent + 1}
              containerStyle={{ borderRadius: isLandscape ? 0 : 4 }}
            />
          </div>

          <div style={{ position: 'absolute', bottom: isLandscape ? 8 : 20, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
            {mobileDeckCurrent + 1} / {mobileDeckSlides.length}
          </div>

          {!isLandscape && showRotatePrompt && (
            <div
              onClick={() => setShowRotatePrompt(false)}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(14,14,31,0.92)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', zIndex: 10001 }}
            >
              <span style={{ fontSize: 18 }}>↻</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Sans', sans-serif" }}>Rotate for full screen experience</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>✕</span>
            </div>
          )}
        </div>
      </>
    )}
    </>
  )
}
