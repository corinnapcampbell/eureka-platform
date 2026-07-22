import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'
import { generateIdeaPDF, dedupeArray } from '../utils/generatePDF'
import { parseBMValue, buildBMHtml, buildSnapshotHTML } from '../utils/businessModel'
import { ScaledSlide } from '../components/DeckSlides'
import AIScorecard from '../components/AIScorecard'
import CompetitiveLandscape from '../components/CompetitiveLandscape'
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

function TeaseExpander({ teaseText, targetAudience, category }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ textAlign: 'center', margin: '1.25rem 0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'rgba(123,159,247,0.12)',
          border: '0.5px solid rgba(123,159,247,0.35)',
          borderRadius: 50,
          padding: '8px 20px',
          fontSize: 13,
          color: '#7b9ff7',
          cursor: 'pointer',
          fontWeight: 500,
          letterSpacing: '0.2px',
        }}
      >
        {open ? '✦ Hide preview' : '✦ Discover what this idea is about'}
      </button>
      {open && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          borderRadius: 14,
          padding: '1.25rem 1.5rem',
          marginTop: '1rem',
          textAlign: 'left',
        }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, marginBottom: targetAudience || (category?.length > 0) ? 12 : 0 }}>
            {teaseText}
          </p>
          {targetAudience && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>Built for {targetAudience}</p>
          )}
          {category?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {category.map(c => (
                <span key={c} style={{ fontSize: 11, background: 'rgba(123,159,247,0.15)', color: '#7b9ff7', borderRadius: 50, padding: '3px 10px' }}>{c}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SharedIdea() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [authSession, setAuthSession] = useState(null)
  const [stage, setStage] = useState('loading')
  const [idea, setIdea] = useState(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [ndaAgreed, setNdaAgreed] = useState(false)
  const [ndaExpanded, setNdaExpanded] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [deckInfo, setDeckInfo] = useState(null)   // { share_token } if public deck exists
  const [creatorProfile, setCreatorProfile] = useState(null)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [downloadingSnapshotPDF, setDownloadingSnapshotPDF] = useState(false)
  const [viewingSnapshotPDF, setViewingSnapshotPDF] = useState(false)
  const [showMobilePDF, setShowMobilePDF] = useState(false)
  const [mobilePDFContent, setMobilePDFContent] = useState('')
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())
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
      const { data: ideaId, error } = await supabase
        .rpc('get_idea_id_by_token', { p_token: token })

      if (error) console.error('shared_links fetch error:', error.message, error.code)
      if (!ideaId) {
        setStage('error')
        return
      }
      const { data: freshIdea } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId)
        .single()
      const ideaToSet = freshIdea
      console.log('SHARED IDEA product_image_url:', ideaToSet?.product_image_url)
      setIdea(ideaToSet)
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/log-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ idea_id: ideaToSet.id }),
      }).catch(() => {})
      const { data: profile } = await supabase
        .from('public_profiles')
        .select('full_name, avatar_url, headline, is_public')
        .eq('user_id', ideaToSet.user_id)
        .eq('is_public', true)
        .maybeSingle()
      if (profile) setCreatorProfile(profile)
      if (ideaToSet.nda_required === false) {
        setStage('idea')
      } else {
        setStage('nda')
      }

      // Check whether the owner has published a public deck for this idea
      const { data: deck } = await supabase
        .from('pitch_decks')
        .select('share_token, is_public')
        .eq('idea_id', ideaId)
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
    if (!name.trim() || !email || !isValidEmail(email) || !ndaAgreed || accepting) return
    setAccepting(true)
    const now = new Date().toISOString()
    const { error: insertError } = await supabase
      .from('idea_access_log')
      .insert({
        idea_id: idea.id,
        viewer_email: email.trim(),
        viewer_name: name.trim(),
        ip_address: 'client-side',
        nda_accepted: true,
        viewed_at: now,
        last_viewed: now,
        view_count: 1,
      })
    if (insertError?.code === '23505') {
      await supabase.rpc('increment_idea_view', {
        p_idea_id: idea.id,
        p_email: email.trim(),
        p_time: now,
      })
    }
    setStage('idea')
    // Fire-and-forget confirmation emails — first visit only
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        idea_id: idea.id,
        user_id: idea.user_id,
        idea_title: idea.title,
        viewer_name: name.trim(),
        viewer_email: email.trim(),
        owner_email: idea.owner_email,
      }),
    }).catch(err => console.error('Email notification failed:', err))
    // Create notification for idea owner
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        idea_id: idea.id,
        type: 'idea_viewed',
        title: '👀 Your idea was viewed',
        message: `${name.trim()} (${email.trim()}) accepted the NDA and accessed "${idea.title}"`,
      }),
    }).catch(err => console.error('Notification creation failed:', err))
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
    const safeInner = inner.replace(/@import\s+url\([^)]+\);?/g, '')
    const container = document.createElement('div')
    container.id = 'pdf-preview'
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:375px;z-index:-9999'
    container.innerHTML = safeInner
    document.body.appendChild(container)
    try {
      const pages = container.querySelectorAll('.page')
      const pdf = new jsPDF({ unit: 'pt', format: [375, 667], orientation: 'portrait' })
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, logging: false, ignoreElements: (el) => el.offsetWidth === 0 || el.offsetHeight === 0 })
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
        </div>
          {idea.product_image_url && (
            <div style={{ marginBottom: '1.25rem', borderRadius: 14, overflow: 'hidden' }}>
              <img src={idea.product_image_url} alt="Product" style={{ width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block' }} />
            </div>
          )}

        {/* Blurred preview card */}
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '1.5rem', filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none', minHeight: 90 }}>
            {idea.problem ? idea.problem.slice(0, 110) + '...' : 'Protected content · Accept NDA to view the full idea details and pitch documents.'}
          </div>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.3px' }}>Content protected · accept NDA to reveal</span>
          </div>
        </div>

        {/* Tease expandable pill */}
        {(() => {
          const teaseText = idea.tease || null
          if (!teaseText) return null
          return (
            <TeaseExpander teaseText={teaseText} targetAudience={idea.target_audience} category={idea.category} />
          )
        })()}

        {/* NDA form card */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '1.75rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '0.5px solid rgba(44,44,42,0.08)', marginBottom: '1rem' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', margin: '0 0 1.25rem' }}>Sign NDA to view this idea</p>

          {/* Name field */}
          <input
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem', fontFamily: 'Outfit, sans-serif' }}
          />

          {/* Email field */}
          <input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && acceptNDA()}
            style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem', fontFamily: 'Outfit, sans-serif' }}
          />
          {email && !isValidEmail(email) && (
            <p style={{ color: '#e24b4a', fontSize: 12, margin: '-0.5rem 0 0.75rem' }}>Please enter a valid email address.</p>
          )}

          {/* NDA expandable */}
          <div style={{ marginBottom: '1rem', border: '0.5px solid rgba(44,44,42,0.12)', borderRadius: 10, overflow: 'hidden' }}>
            <div
              onClick={() => setNdaExpanded(v => !v)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', cursor: 'pointer', background: 'rgba(44,44,42,0.02)' }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: '#2c2c2a' }}>📄 View NDA contents</span>
              <span style={{ fontSize: 12, color: '#888', transition: 'transform 0.2s', display: 'inline-block', transform: ndaExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </div>
            {ndaExpanded && (
              <div style={{ padding: '1rem 1.25rem', borderTop: '0.5px solid rgba(44,44,42,0.08)', background: '#fafaf8' }}>
                <p style={{ fontSize: 12, color: '#555', lineHeight: 1.7, margin: '0 0 0.75rem' }}>By signing this NDA you agree to:</p>
                {[
                  'Hold all shared information in strict confidence',
                  'Not disclose any content to third parties without written consent',
                  'Use the information only to evaluate a potential business relationship',
                  'Not copy, reproduce, or distribute the content in any form',
                  'These obligations last for 5 years from the date of signing',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: '#7b9ff7', fontSize: 12, flexShrink: 0 }}>✓</span>
                    <span style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>{item}</span>
                  </div>
                ))}
                <a href="/legal/nda" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#7b9ff7', textDecoration: 'underline', display: 'inline-block', marginTop: '0.5rem' }}>Read full NDA →</a>
              </div>
            )}
          </div>

          {/* Agree checkbox */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '1.25rem', cursor: 'pointer' }}>
            <div
              onClick={() => setNdaAgreed(v => !v)}
              style={{
                width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
                background: ndaAgreed ? 'linear-gradient(135deg, #7b9ff7, #9b7ff7)' : '#fff',
                border: ndaAgreed ? 'none' : '1.5px solid rgba(44,44,42,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', cursor: 'pointer'
              }}
            >
              {ndaAgreed && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
              I have read and agree to the <a href="/legal/nda" target="_blank" rel="noopener noreferrer" style={{ color: '#7b9ff7', textDecoration: 'underline' }}>Non-Disclosure Agreement</a>. I understand my identity and access time will be logged and I am bound by its terms.
            </span>
          </label>

          {/* Submit button */}
          <button
            onClick={acceptNDA}
            disabled={!name.trim() || !email || !isValidEmail(email) || !ndaAgreed || accepting}
            style={{
              width: '100%', background: name.trim() && email && isValidEmail(email) && ndaAgreed
                ? 'linear-gradient(90deg, #7b9ff7, #9b7ff7)'
                : 'rgba(44,44,42,0.1)',
              border: 'none', borderRadius: 12, padding: '14px',
              fontSize: 15, fontWeight: 600,
              color: name.trim() && email && isValidEmail(email) && ndaAgreed ? '#fff' : 'rgba(44,44,42,0.3)',
              cursor: name.trim() && email && isValidEmail(email) && ndaAgreed ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s'
            }}
          >
            {accepting ? 'Logging access...' : '✍️ Sign & View Idea'}
          </button>
        </div>

        {/* Protection badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem', marginTop: '1.25rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(123,159,247,0.07)', border: '0.5px solid rgba(123,159,247,0.18)', borderRadius: 20, padding: '6px 16px' }}>
            <span style={{ fontSize: 12 }}>🔒</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>This idea is protected by eurekAIdea</span>
          </div>
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
          {creatorProfile && (
            <div
              onClick={() => navigate(`/inventor/${idea.user_id}`)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: '0.75rem', marginTop: '0.25rem' }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: creatorProfile.avatar_url ? 'none' : 'linear-gradient(135deg, #7b9ff7, #9b7ff7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
                overflow: 'hidden', border: '1.5px solid rgba(123,159,247,0.35)',
              }}>
                {creatorProfile.avatar_url
                  ? <img src={creatorProfile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (creatorProfile.full_name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                }
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.2 }}>{creatorProfile.full_name}</p>
                {creatorProfile.headline && (
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{creatorProfile.headline}</p>
                )}
              </div>
            </div>
          )}
          {idea.product_image_url && (
            <div style={{ marginTop: '1.25rem', marginBottom: '0.5rem', borderRadius: 14, overflow: 'hidden' }}>
              <img src={idea.product_image_url} alt="Product" style={{ width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block' }} />
            </div>
          )}
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

        <AIScorecard idea={idea} ideaId={idea.id} isPaid={false} readOnly={true} />

        {idea.sketch_image_url && (
          <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '0.5rem' }}>Product Sketch</div>
            <div style={{ background: '#0d1b3e', borderRadius: 12, padding: '1.5rem', overflow: 'auto' }}>
              <img src={idea.sketch_image_url} alt="Product Sketch" style={{ width: '100%', borderRadius: 8, display: 'block' }} />
            </div>
          </div>
        )}

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
          if (!bmVal?.models?.length) return null
          const TIER_COLORS = {
            'Free': '#22c55e', 'Free Tier': '#22c55e',
            'Protection Pack': '#7b9ff7', 'Score Insights': '#9b7ff7',
            'Pro': '#f59e0b', 'Paid': '#9b7ff7', 'Paid Tier': '#9b7ff7',
          }
          const getColor = (label) => {
            for (const [k, v] of Object.entries(TIER_COLORS)) {
              if (label?.toLowerCase().includes(k.toLowerCase())) return v
            }
            return '#7b9ff7'
          }
          const renderTiers = () => {
            const tiers = []
            for (const modelType of bmVal.models) {
              const BM_TYPE_KEY = {'Freemium / SaaS':'freemium','Marketplace':'marketplace','Subscription':'subscription','One-time Purchase':'oneTime','Advertising':'advertising','Licensing':'licensing','Transaction Fees':'transactionFees','Hardware + Software':'hardwareSoftware','Other':'other'}
              const key = BM_TYPE_KEY[modelType] || modelType.toLowerCase().replace(/[^a-z]/g,'')
              const data = bmVal[key] || bmVal[modelType] || {}
              if (modelType === 'Freemium / SaaS') {
                if (data.tiers?.length) {
                  const TIER_COLORS_MAP = { 'free': '#22c55e', 'protection': '#7b9ff7', 'score': '#9b7ff7', 'pro': '#f59e0b', 'paid': '#9b7ff7' }
                  data.tiers.forEach(tier => {
                    const colorKey = Object.keys(TIER_COLORS_MAP).find(k => tier.name?.toLowerCase().includes(k)) || 'paid'
                    const items = (tier.features||'').split('\n').map(s=>s.trim()).filter(Boolean)
                    if (items.length) tiers.push({ label: `${tier.name}${tier.price ? ` — ${tier.price}` : ''}`, items, color: TIER_COLORS_MAP[colorKey] })
                  })
                } else {
                  const freeItems = (data.freeTier||'').split('\n').map(s=>s.trim()).filter(Boolean)
                  const paidItems = (data.paidFeatures||'').split('\n').map(s=>s.trim()).filter(Boolean)
                  if (freeItems.length) tiers.push({ label: 'Free Tier', items: freeItems, color: '#22c55e' })
                  if (paidItems.length) tiers.push({ label: `Paid Tier${data.paidPrice ? ` — ${data.paidPrice}` : ''}`, items: paidItems, color: '#9b7ff7' })
                }
              } else if (modelType === 'Subscription' && data.tiers?.length) {
                data.tiers.forEach(t => {
                  const items = (t.features||'').split('\n').map(s=>s.trim()).filter(Boolean)
                  if (items.length) tiers.push({ label: `${t.name||'Tier'}${t.price ? ` — ${t.price}` : ''}`, items, color: getColor(t.name) })
                })
              } else if (data.cards?.length) {
                data.cards.forEach(c => {
                  const items = (c.items||[]).map(s=>s.trim()).filter(Boolean)
                  if (items.length) tiers.push({ label: c.title||modelType, items, color: getColor(c.title) })
                })
              } else {
                const entries = Object.entries(data).filter(([k,v])=>typeof v==='string'&&v&&k!=='name')
                if (entries.length) tiers.push({ label: data.name||modelType, items: entries.map(([k,v])=>v), color: getColor(modelType) })
              }
            }
            return tiers
          }
          const tiers = renderTiers()
          if (!tiers.length) return null
          const modelLabel = bmVal.models.join(' / ')
          return (
            <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '0.75rem' }}>Business Model</p>
              <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 500, color: '#7b9ff7', background: 'rgba(123,159,247,0.08)', border: '0.5px solid rgba(123,159,247,0.2)', borderRadius: 20, padding: '3px 12px', marginBottom: '1.25rem' }}>{modelLabel}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tiers.map((tier, i) => (
                  <div key={i} style={{ background: tier.color + '08', border: `0.5px solid ${tier.color}30`, borderRadius: 10, padding: '0.875rem 1rem', borderLeft: `3px solid ${tier.color}` }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: tier.color, marginBottom: 8 }}>{tier.label}</p>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                      {tier.items.map((item, j) => (
                        <li key={j} style={{ fontSize: 13, color: '#2c2c2a', lineHeight: 1.7, marginBottom: 2 }}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {(idea.who_pays || idea.revenue_streams || idea.pricing_power || idea.revenue_potential || idea.business_stage) && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1.25rem' }}>Revenue Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { key: 'who_pays', label: 'Who pays', icon: '👤' },
                { key: 'revenue_streams', label: 'Revenue streams', icon: '💰' },
                { key: 'pricing_power', label: 'Pricing power', icon: '⚡' },
                { key: 'revenue_potential', label: 'Revenue potential', icon: '📈' },
                { key: 'business_stage', label: 'Business stage', icon: '🎯' },
              ].filter(({ key }) => idea[key]).map(({ key, label, icon }) => (
                <div key={key} style={{ background: 'rgba(123,159,247,0.04)', border: '0.5px solid rgba(123,159,247,0.12)', borderRadius: 10, padding: '0.875rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 12 }}>{icon}</span>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7b9ff7', margin: 0 }}>{label}</p>
                  </div>
                  <p style={{ fontSize: 13, color: '#2c2c2a', lineHeight: 1.6, margin: 0 }}>{idea[key]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Revenue Projections */}
        {idea.revenue_projections && (() => {
          let rp = null
          try { rp = typeof idea.revenue_projections === 'string' ? JSON.parse(idea.revenue_projections) : idea.revenue_projections } catch {}
          if (!rp) return null
          const getPaidPrice = () => {
            if (rp?.paidPriceOverride) return rp.paidPriceOverride
            try {
              const bm = typeof idea.business_model === 'string' ? JSON.parse(idea.business_model) : idea.business_model
              const models = bm?.models || []
              for (const model of models) {
                const key = model.toLowerCase().replace(/\s*\/\s*/g, '_').replace(/\s+/g, '_').replace(/[^a-z_]/g, '')
                const data = bm?.[key]
                if (data?.paidPrice) return data.paidPrice
              }
            } catch {}
            return '$12'
          }
          const paidPrice = parseFloat((getPaidPrice() || '$12').replace(/[^0-9.]/g, '')) || 12
          const isOneTime = (() => {
            try {
              const bm = typeof idea.business_model === 'string' ? JSON.parse(idea.business_model) : idea.business_model
              return (bm?.models || []).includes('One-time Purchase')
            } catch { return false }
          })()
          const startingUsers = (rp?.startingUsers) || 100
          const monthlyGrowth = ((rp?.monthlyGrowthRate) || 10) / 100
          const convRate = ((rp?.conversionRate) || 5) / 100
          const scenarios = [
            { label: 'Conservative', multiplier: 0.5, color: '#888780' },
            { label: 'Moderate', multiplier: 1, color: '#7b9ff7' },
            { label: 'Optimistic', multiplier: 2, color: '#22c55e' },
          ]
          const calc = (months, mult) => {
            const units = startingUsers * Math.pow(1 + monthlyGrowth * mult, months)
            return isOneTime ? units * paidPrice : units * convRate * paidPrice
          }
          const fmt = n => n >= 1000000 ? '$' + (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? '$' + Math.round(n / 1000) + 'K' : '$' + Math.round(n)
          return (
            <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>Revenue Projections</p>
              <div style={{ fontSize: 12, color: '#888780', marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span>Starting users: <strong style={{ color: '#2c2c2a' }}>{startingUsers.toLocaleString()}</strong></span>
                <span>Monthly growth: <strong style={{ color: '#2c2c2a' }}>{(rp?.monthlyGrowthRate) || 10}%</strong></span>
                {!isOneTime && <span>Conversion: <strong style={{ color: '#2c2c2a' }}>{(rp?.conversionRate) || 5}%</strong></span>}
                <span>Price: <strong style={{ color: '#2c2c2a' }}>{getPaidPrice()}{isOneTime ? '' : '/mo'}</strong></span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {scenarios.map(sc => (
                  <div key={sc.label} style={{ background: sc.color + '0d', border: `0.5px solid ${sc.color}40`, borderRadius: 10, padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: sc.color, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>{sc.label}</div>
                    {[{ l: '6mo', m: 6 }, { l: '12mo', m: 12 }, { l: '24mo', m: 24 }].map(p => (
                      <div key={p.l} style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 10, color: '#b0b0a8', textTransform: 'uppercase' }}>{p.l} {isOneTime ? 'Revenue' : 'MRR'}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#2c2c2a' }}>{fmt(calc(p.m, sc.multiplier))}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: '#b0b0a8', fontStyle: 'italic', marginTop: 10 }}>Model assumptions only — actual results will vary.</p>
            </div>
          )
        })()}

        {/* Customer Validation */}
        {idea.customer_validation && (() => {
          let cvData = null
          try { cvData = idea.customer_validation ? JSON.parse(idea.customer_validation) : null } catch {}
          if (!cvData) return null
          return (
            <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>Customer Validation</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { label: 'Waitlist', value: cvData.waitlist || '0', suffix: '' },
                  { label: 'Interviews', value: cvData.interviews || '0', suffix: '' },
                  { label: 'Pilots', value: cvData.pilots || '0', suffix: '' },
                  { label: 'Stage', value: cvData.stage || '—', suffix: '' },
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'rgba(123,159,247,0.06)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                    <p style={{ fontSize: 22, fontWeight: 700, color: '#2c2c2a', margin: 0, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>{stat.value}</p>
                    <p style={{ fontSize: 10, color: '#888780', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Competitive Advantage */}
        {idea.competitive_advantage && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>Competitive Advantage</p>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{idea.competitive_advantage}</p>
          </div>
        )}

        {/* Competitive Landscape */}
        {idea.competitive_landscape && (
          <div style={{ marginBottom: '1.25rem' }}>
            <CompetitiveLandscape
              value={idea.competitive_landscape}
              isOwner={false}
              isPaid={false}
              ideaTitle={idea.title}
            />
          </div>
        )}

        {/* Risks & Challenges */}
        {idea.risks && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>Risks & Challenges</p>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {idea.risks.split('\n').filter(r => r.trim()).map((risk, i) => (
                <li key={i} style={{ fontSize: 14, color: '#2c2c2a', lineHeight: 1.75, marginBottom: 4 }}>{risk.replace(/^[-•*]\s*/, '')}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps */}
        {idea.next_steps && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>Next Steps</p>
            <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
              {idea.next_steps.split('\n').filter(s => s.trim()).map((step, i) => (
                <li key={i} style={{ fontSize: 14, color: '#2c2c2a', lineHeight: 1.75, marginBottom: 4 }}>{step.replace(/^[-•*]\s*/, '')}</li>
              ))}
            </ul>
          </div>
        )}

        {idea.support_files && idea.support_files.length > 0 && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888780', marginBottom: '1rem' }}>Support Files</p>
            {(() => {
              const imageFiles = idea.support_files.filter(f => f.type === 'image')
              const videoFiles = idea.support_files.filter(f => f.type === 'video_link')
              const docFiles = idea.support_files.filter(f => f.type === 'doc')
              return (
                <>
                  {imageFiles.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#aaa', marginBottom: 8 }}>Images</p>
                      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8 }}>
                        {imageFiles.map((f) => (
                          <div key={f.id} style={{ flexShrink: 0, width: 160, borderRadius: 10, overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.08)', background: '#fafafa' }}>
                            <a href={f.url} target="_blank" rel="noreferrer">
                              <img src={f.url} alt={f.name} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                            </a>
                            <div style={{ padding: '5px 8px' }}>
                              <p style={{ fontSize: 11, color: '#2c2c2a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {videoFiles.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#aaa', marginBottom: 8 }}>Videos</p>
                      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                        {videoFiles.map((f) => {
                          const embedUrl = f.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/').replace('vimeo.com/', 'player.vimeo.com/video/').replace('https://loom.com/share/', 'https://www.loom.com/embed/')
                          return (
                            <div key={f.id} style={{ flexShrink: 0, width: 280, borderRadius: 10, overflow: 'hidden', border: '0.5px solid rgba(0,0,0,0.08)', background: '#fafafa' }}>
                              <iframe src={embedUrl} style={{ width: '100%', height: 158, border: 'none', display: 'block' }} allowFullScreen />
                              <div style={{ padding: '5px 8px' }}>
                                <p style={{ fontSize: 11, color: '#2c2c2a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {docFiles.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#aaa', marginBottom: 8 }}>Documents</p>
                      {docFiles.map((f) => (
                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, padding: '0.65rem 0.85rem', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.07)', background: 'rgba(123,159,247,0.03)' }}>
                          <span style={{ fontSize: 16 }}>📄</span>
                          <p style={{ flex: 1, fontSize: 13, color: '#2c2c2a', fontWeight: 500, margin: 0 }}>{f.name}</p>
                          <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#7b9ff7', textDecoration: 'none' }}>Open ↗</a>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}

        {/* Team */}
        {idea.team && (() => {
          let teamData = null
          try { teamData = idea.team ? JSON.parse(idea.team) : null } catch {}
          if (!teamData) return null
          return (
            <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>The Team</p>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1rem' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#7b9ff7,#9b7ff7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>{(teamData.name || '?')[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#2c2c2a', margin: 0, fontFamily: "'Outfit', sans-serif" }}>{teamData.name}</p>
                    <p style={{ fontSize: 12, color: '#888780', margin: '2px 0 0', fontFamily: "'Outfit', sans-serif" }}>{teamData.role}</p>
                  </div>
                </div>
                {teamData.bio && <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a', marginBottom: teamData.origin ? '1rem' : 0 }}>{teamData.bio}</p>}
                {teamData.origin && (
                  <div style={{ borderLeft: '3px solid #7b9ff7', paddingLeft: 12, marginTop: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#7b9ff7', marginBottom: 4 }}>Origin Story</p>
                    <p style={{ fontSize: 13, lineHeight: 1.7, color: '#555', fontStyle: 'italic', margin: 0 }}>{teamData.origin}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Traction & Next Milestones */}
        {idea.traction && (() => {
          let trData = null
          try { trData = idea.traction ? JSON.parse(idea.traction) : null } catch {}
          if (!trData || !trData.milestones || trData.milestones.length === 0) return null
          return (
            <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>Traction & Next Milestones</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {trData.milestones.map((m, i) => {
                  const colors = { done: '#22c55e', 'in-progress': '#7b9ff7', upcoming: '#d1d5db' }
                  const color = colors[m.status] || '#d1d5db'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: i < trData.milestones.length - 1 ? 16 : 0, position: 'relative' }}>
                      {i < trData.milestones.length - 1 && <div style={{ position: 'absolute', left: 7, top: 16, width: 2, height: 'calc(100% - 8px)', background: '#f0f0ee' }} />}
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 3, zIndex: 1 }} />
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <p style={{ fontSize: 14, color: '#2c2c2a', margin: 0, lineHeight: 1.5 }}>{m.label}</p>
                        {m.date && <span style={{ fontSize: 11, color: '#888780', background: '#f5f5f3', borderRadius: 6, padding: '2px 8px', flexShrink: 0, marginLeft: 12 }}>{new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

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
                  </div>
                </div>
              )}

            </div>
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
