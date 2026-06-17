import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { buildDefaultSlides, ScaledSlide, Thumbnail, SLIDE_NAMES, SLIDE_W, SLIDE_H, SlideContent } from '../components/DeckSlides'
import BusinessModelSection, { parseBMValue, extractBMChips, serializeBMValue } from '../components/BusinessModelSection'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import NavBar from '../components/NavBar'

const SLIDES_COUNT = 12
const NAVY = '#0e0e1f'

const DECK_CSS = `
  @media (max-width: 767px) {
    .pb-desktop-only { display: none !important; }
    .pb-view-list .pb-editor-only { display: none !important; }
    .pb-view-editor .pb-list-only { display: none !important; }
  }
  @media (min-width: 768px) {
    .pb-mobile-only { display: none !important; }
  }
`

function getSlideExcerpt(slide) {
  const raw = slide.tagline || slide.headline || slide.description
    || slide.bullets?.[0]
    || slide.steps?.[0]?.title
    || (slide.metrics?.[0] ? `${slide.metrics[0].value} ${slide.metrics[0].label}` : '')
    || slide.subtitle || ''
  return raw ? raw.slice(0, 64) + (raw.length > 64 ? '…' : '') : ''
}

export default function DeckBuilder({ session }) {
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
  const { ideaId } = useParams()
  const navigate = useNavigate()
  const [idea, setIdea] = useState(null)
  const [slides, setSlides] = useState(null)
  const [deckId, setDeckId] = useState(null)
  const [shareToken, setShareToken] = useState(null)
  const [isPublic, setIsPublic] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [noDeck, setNoDeck] = useState(false)
  const [current, setCurrent] = useState(0)
  const [presenting, setPresenting] = useState(false)
  const [shareModal, setShareModal] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingProgress, setSavingProgress] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [mobileView, setMobileView] = useState('list')
  const [bmValue, setBmValue] = useState(null)
  const saveTimer = useRef(null)
  const touchStart = useRef(null)
  const slideRenderRef = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: ideaData } = await supabase.from('ideas').select('*').eq('id', ideaId).single()
      setIdea(ideaData)
      setBmValue(parseBMValue(ideaData?.business_model))

      const userId = session?.user?.id
      const ownerCheck = userId && ideaData?.user_id === userId

      if (!ownerCheck) {
        const { data: publicDeck } = await supabase
          .from('pitch_decks')
          .select('share_token, is_public')
          .eq('idea_id', ideaId)
          .eq('is_public', true)
          .single()
        if (publicDeck?.share_token) {
          navigate(`/deck/view/${publicDeck.share_token}`, { replace: true })
        } else {
          setNoDeck(true)
          setLoading(false)
        }
        return
      }

      setIsOwner(true)
      const presenterName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Founder'
      const ownerEmail = session?.user?.email || ''

      const { data: deckData } = await supabase
        .from('pitch_decks')
        .select('*')
        .eq('idea_id', ideaId)
        .eq('user_id', userId)
        .single()

      if (deckData) {
        setDeckId(deckData.id)
        setSlides(deckData.slides?.length ? deckData.slides : buildDefaultSlides(ideaData, presenterName, ownerEmail))
        setShareToken(deckData.share_token)
        setIsPublic(deckData.is_public)
      } else {
        const defaults = buildDefaultSlides(ideaData, presenterName, ownerEmail)
        setSlides(defaults)
        const newToken = crypto.randomUUID()
        const { data: created } = await supabase.from('pitch_decks').insert({
          idea_id: ideaId,
          user_id: userId,
          slides: defaults,
          is_public: false,
          share_token: newToken,
        }).select().single()
        if (created) {
          setDeckId(created.id)
          setShareToken(created.share_token || newToken)
        } else {
          setShareToken(newToken)
        }
      }
      setLoading(false)
    }
    load()
  }, [ideaId, session?.user?.id])

  function updateSlide(index, updates) {
    setSlides(prev => {
      const next = prev.map((s, i) => i === index ? { ...s, ...updates } : s)
      scheduleSave(next)
      return next
    })
  }

  function scheduleSave(updatedSlides) {
    clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      if (deckId) {
        await supabase.from('pitch_decks').update({ slides: updatedSlides }).eq('id', deckId)
      }
      setSaving(false)
    }, 1000)
  }

  useEffect(() => {
    if (!presenting) return
    function handleKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCurrent(c => Math.min(SLIDES_COUNT - 1, c + 1))
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setCurrent(c => Math.max(0, c - 1))
      if (e.key === 'Escape') setPresenting(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [presenting])

  async function saveProgress() {
    if (!deckId || !slides) return
    setSavingProgress(true)
    clearTimeout(saveTimer.current)
    const businessModel = bmValue ? serializeBMValue(bmValue) : (() => {
      const bizSlide = slides.find(s => s.type === 'business')
      const deckFreeTierChips = bizSlide?.freeTierChips || []
      const deckPaidTierChips = bizSlide?.paidTierChips || []
      return [...deckFreeTierChips.map(f => `Free: ${f}`), ...deckPaidTierChips.map(p => `Paid: ${p}`)].join('\n')
    })()
    const advSlide = slides.find(s => s.type === 'advantage')
    const deckWeHaveChips = advSlide?.weHaveChips || []
    const deckOthersDontChips = advSlide?.othersDontChips || []
    const competitiveAdvantage = [
      ...deckWeHaveChips.map(f => `We: ${f}`),
      ...deckOthersDontChips.map(f => `They: ${f}`),
    ].join('\n')
    await supabase.from('pitch_decks').update({ slides }).eq('id', deckId)
    const marketSlide = slides.find(s => s.type === 'market')
    const deckTargetMarketChips = marketSlide?.tags || []
    const targetAudience = deckTargetMarketChips.join(', ')
    const ideaUpdates = {}
    if (businessModel) ideaUpdates.business_model = businessModel
    if (competitiveAdvantage) ideaUpdates.competitive_advantage = competitiveAdvantage
    if (targetAudience) ideaUpdates.target_audience = targetAudience
    if (Object.keys(ideaUpdates).length) await supabase.from('ideas').update(ideaUpdates).eq('id', ideaId)
    setSavingProgress(false)
  }

  async function handleShare() {
    setShareModal(true)
    if (!isPublic && deckId) {
      await supabase.from('pitch_decks').update({ is_public: true }).eq('id', deckId)
      setIsPublic(true)
    }
  }

  function copyShareLink() {
    navigator.clipboard.writeText(`${window.location.origin}/deck/view/${shareToken}`)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 2000)
  }

  async function handlePDF() {
    if (!slides || !slideRenderRef.current) return
    if (isMobile && /CriOS/i.test(navigator.userAgent)) {
      window.location.href = 'x-safari-' + window.location.href
      return
    }
    setGeneratingPDF(true)

    if (isMobile) {
      try {
        const container = slideRenderRef.current
        container.style.cssText = 'position:fixed;left:0;top:0;z-index:-999;opacity:0;pointer-events:none;visibility:visible;'
        await new Promise(r => setTimeout(r, 500))
        const elements = container.querySelectorAll('.deck-slide-render')
        const files = []
        for (let i = 0; i < elements.length; i++) {
          const canvas = await html2canvas(elements[i], {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            width: SLIDE_W,
            height: SLIDE_H,
            backgroundColor: '#0e0e1f',
            logging: false,
          })
          const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92))
          files.push(new File([blob], `slide-${i + 1}.jpg`, { type: 'image/jpeg' }))
        }
        container.style.cssText = 'position:fixed;left:-9999px;top:0;pointer-events:none;z-index:-1;opacity:0;visibility:hidden;'
        const shareData = { files, title: idea?.title || 'Deck' }
        if (navigator.canShare(shareData)) await navigator.share(shareData)
      } catch (e) {
        console.error('Mobile share error:', e)
        if (slideRenderRef.current) {
          slideRenderRef.current.style.cssText = 'position:fixed;left:-9999px;top:0;pointer-events:none;z-index:-1;opacity:0;visibility:hidden;'
        }
      }
      setGeneratingPDF(false)
      return
    }

    try {
      // Move container on-screen but invisible so browsers fully paint the slides
      const container = slideRenderRef.current
      container.style.cssText = 'position: fixed; left: 0; top: 0; z-index: -999; opacity: 0; pointer-events: none; visibility: visible;'

      // Wait for paint
      await new Promise(r => setTimeout(r, 500))

      const elements = container.querySelectorAll('.deck-slide-render')
      console.log('[DeckPDF] slide elements found:', elements.length)

      const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [SLIDE_W, SLIDE_H] })

      for (let i = 0; i < elements.length; i++) {
        if (i > 0) doc.addPage([SLIDE_W, SLIDE_H], 'landscape')
        const canvas = await html2canvas(elements[i], {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          width: SLIDE_W,
          height: SLIDE_H,
          backgroundColor: '#0e0e1f',
          logging: false,
        })
        const imgData = canvas.toDataURL('image/jpeg', 0.92)
        doc.addImage(imgData, 'JPEG', 0, 0, SLIDE_W, SLIDE_H)
      }

      // Restore hidden state
      container.style.cssText = 'position: fixed; left: -9999px; top: 0; pointer-events: none; z-index: -1; opacity: 0; visibility: hidden;'

      const slug = (idea?.title || 'deck').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      doc.save(`${slug}-deck.pdf`)
    } catch (e) {
      console.error('PDF error:', e)
      if (slideRenderRef.current) {
        slideRenderRef.current.style.cssText = 'position: fixed; left: -9999px; top: 0; pointer-events: none; z-index: -1; opacity: 0; visibility: hidden;'
      }
    }
    setGeneratingPDF(false)
  }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e1f' }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  if (noDeck) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0e0e1f', gap: 16 }}>
      <div style={{ fontSize: 40 }}>🔒</div>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif" }}>This deck hasn't been published yet.</p>
      <a href="/" style={{ fontSize: 13, color: '#7b9ff7', fontFamily: "'DM Sans', sans-serif" }}>← Go to eurekAIdea</a>
    </div>
  )

  if (!slides) return null

  const isFirst = current === 0
  const isLast = current === slides.length - 1

  return (
    <div className={`pb-view-${mobileView}`} style={{ background: '#12121f' }}>
      <style>{DECK_CSS}</style>

      {/* ── DESKTOP FULL LAYOUT (hidden on mobile) ─────────────────────────── */}
      <div className="pb-desktop-only" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ background: NAVY, borderBottom: '0.5px solid rgba(255,255,255,0.07)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, zIndex: 10 }}>
          <NavBar
            session={session}
            leftContent={
              <button onClick={() => navigate(`/idea/${ideaId}`)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: '4px 0' }}>← Back</button>
            }
            rightExtra={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Deck Builder — {SLIDE_NAMES[current]}</span>
                {saving && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>Saving…</span>}
                <button onClick={handlePDF} disabled={generatingPDF} style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '7px 14px', fontSize: 13, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', opacity: generatingPDF ? 0.5 : 1 }}>{generatingPDF ? 'Generating PDF…' : '↓ PDF'}</button>
                <button onClick={() => setPresenting(true)} style={{ background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '7px 16px', fontSize: 13, color: '#fff', cursor: 'pointer' }}>▶ Present</button>
                <button onClick={saveProgress} disabled={savingProgress} style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.18)', borderRadius: 7, padding: '7px 16px', fontSize: 13, color: 'rgba(255,255,255,0.55)', cursor: savingProgress ? 'not-allowed' : 'pointer', opacity: savingProgress ? 0.6 : 1 }}>{savingProgress ? 'Saving...' : '💾 Save Progress'}</button>
                <button onClick={handleShare} style={{ background: 'rgba(123,159,247,0.15)', border: '0.5px solid rgba(123,159,247,0.3)', borderRadius: 7, padding: '7px 16px', fontSize: 13, color: '#7b9ff7', cursor: 'pointer' }}>Share Deck</button>
              </div>
            }
          />
        </div>

        {/* Body: sidebar + slide */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Sidebar */}
          <div style={{ width: 204, background: '#0a0a18', borderRight: '0.5px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '12px 10px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1 }}>
              {slides.map((slide, i) => (
                <Thumbnail key={i} slide={slide} slideNum={i + 1} selected={current === i} onClick={() => setCurrent(i)} />
              ))}
            </div>
            <div style={{ marginTop: 14, padding: '14px 12px', background: 'rgba(123,159,247,0.06)', border: '0.5px solid rgba(123,159,247,0.14)', borderRadius: 10, flexShrink: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'rgba(255,255,255,0.22)', marginBottom: 10 }}>Deck Builder</div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.42)', marginBottom: 5 }}>Free</div>
                {['View & present slides', 'Basic PDF download', 'Share public link'].map((f, i) => (
                  <div key={i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginBottom: 3, display: 'flex', gap: 5, alignItems: 'center' }}>
                    <span style={{ color: '#4caf78', fontSize: 9 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#7b9ff7', marginBottom: 5 }}>Pro ✦</div>
                {['Inline slide editing', 'NDA-gated sharing', 'Viewer access log', 'Custom branding'].map((f, i) => (
                  <div key={i} style={{ fontSize: 10, color: 'rgba(123,159,247,0.55)', marginBottom: 3, display: 'flex', gap: 5, alignItems: 'center' }}>
                    <span style={{ fontSize: 9 }}>✦</span>{f}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main slide */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1a1a2e', overflow: slides[current]?.type === 'business' ? 'auto' : 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 36px', minHeight: slides[current]?.type === 'business' ? 'auto' : '100%' }}>
              <div style={{ width: '100%', maxWidth: 900 }}>
                <ScaledSlide
                  slide={slides[current]}
                  slideNum={current + 1}
                  onUpdate={updates => updateSlide(current, updates)}
                  containerStyle={{ boxShadow: '0 8px 50px rgba(0,0,0,0.55)', borderRadius: 8 }}
                />
              </div>
            </div>
            {slides[current]?.type === 'business' && isOwner && (
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '24px 36px 36px', background: '#131320' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7b9ff7', marginBottom: 16 }}>Business Model Details</p>
                <BusinessModelSection
                  value={bmValue}
                  onChange={v => {
                    setBmValue(v)
                    const { free, paid } = extractBMChips(v)
                    updateSlide(current, { freeTierChips: free, paidTierChips: paid })
                  }}
                  theme="dark"
                />
              </div>
            )}
            {idea?.origin_story && (
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '24px 36px', background: '#131320' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7b9ff7', marginBottom: 12 }}>Origin Story</p>
                <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>{idea.origin_story}</p>
              </div>
            )}
            {idea?.team && (() => { try { const t = typeof idea.team === 'string' ? JSON.parse(idea.team) : idea.team; if (!t?.name) return null; return (
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '24px 36px', background: '#131320' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7b9ff7', marginBottom: 12 }}>The Team</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#7b9ff7,#9b7ff7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff' }}>{(t.name||'?')[0].toUpperCase()}</div>
                  <div><div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{t.name}</div><div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t.role}</div></div>
                </div>
                {t.bio && <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.6)' }}>{t.bio}</p>}
              </div>
            )} catch { return null } })()}
            {idea?.customer_validation && (() => { try { const cv = typeof idea.customer_validation === 'string' ? JSON.parse(idea.customer_validation) : idea.customer_validation; if (!cv) return null; return (
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '24px 36px', background: '#131320' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7b9ff7', marginBottom: 12 }}>Customer Validation</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                  {[{l:'Waitlist',v:cv.waitlist},{l:'Interviews',v:cv.interviews},{l:'Pilots',v:cv.pilots},{l:'Stage',v:cv.stage}].filter(s=>s.v).map((s,i)=>(
                    <div key={i} style={{ background: 'rgba(123,159,247,0.08)', borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{s.v}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )} catch { return null } })()}
            {idea?.traction && (() => { try { const tr = typeof idea.traction === 'string' ? JSON.parse(idea.traction) : idea.traction; if (!tr?.milestones?.length) return null; return (
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '24px 36px', background: '#131320' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7b9ff7', marginBottom: 12 }}>Traction & Milestones</p>
                {tr.milestones.slice(0,5).map((m,i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: m.status==='done'?'#22c55e':m.status==='in-progress'?'#7b9ff7':'#555', flexShrink: 0, marginTop: 3 }} />
                    <div><div style={{ fontSize: 13, color: '#fff' }}>{m.label}</div>{m.date&&<div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{m.date}</div>}</div>
                  </div>
                ))}
              </div>
            )} catch { return null } })()}
            {idea?.competitive_landscape && (() => { try { const cl = typeof idea.competitive_landscape === 'string' ? JSON.parse(idea.competitive_landscape) : idea.competitive_landscape; if (!cl?.format) return null; const competitors = cl[cl.format]?.competitors || []; if (!competitors.length) return null; return (
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '24px 36px', background: '#131320' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7b9ff7', marginBottom: 16 }}>Competitive Landscape</p>
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '1rem', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                  {cl.format === 'table' && cl.table?.competitors?.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '6px 10px', borderBottom: '1px solid rgba(123,159,247,0.3)', color: '#7b9ff7', fontWeight: 600, fontSize: 10 }}>Competitor</th>
                            {(cl.table.columns || []).map((col, i) => <th key={i} style={{ padding: '6px 10px', borderBottom: '1px solid rgba(123,159,247,0.3)', color: '#7b9ff7', fontWeight: 600, fontSize: 10, textAlign: 'center' }}>{col}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ background: 'rgba(123,159,247,0.1)', borderLeft: '3px solid #7b9ff7' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 600, color: '#7b9ff7', fontSize: 12 }}>{idea.title || 'Your idea'}</td>
                            {(cl.table.columns || []).map((_, i) => <td key={i} style={{ textAlign: 'center', padding: '6px 10px', color: '#22c55e', fontSize: 14 }}>✓</td>)}
                          </tr>
                          {cl.table.competitors.map((c, i) => (
                            <tr key={i} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                              <td style={{ padding: '6px 10px', color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{c.name}</td>
                              {(c.checks || []).map((checked, j) => <td key={j} style={{ textAlign: 'center', padding: '6px 10px', color: checked ? '#22c55e' : 'rgba(255,255,255,0.2)', fontSize: checked ? 14 : 12 }}>{checked ? '✓' : '—'}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {cl.format === 'matrix' && cl.matrix?.competitors?.length > 0 && (
                    <div style={{ position: 'relative', width: '100%', paddingBottom: '60%', background: 'rgba(123,159,247,0.04)', borderRadius: 8 }}>
                      <div style={{ position: 'absolute', inset: 0 }}>
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                        <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{cl.matrix.axis_x?.label} →</div>
                        <div style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: 10, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>↑ {cl.matrix.axis_y?.label}</div>
                        {cl.matrix.competitors.map((c, i) => (
                          <div key={i} style={{ position: 'absolute', left: `${c.x * 100}%`, top: `${(1 - c.y) * 100}%`, transform: 'translate(-50%,-50%)', zIndex: 2 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.6)' }} />
                            <div style={{ position: 'absolute', left: 14, top: -4, fontSize: 10, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>{c.name}</div>
                          </div>
                        ))}
                        {cl.matrix.self && (
                          <div style={{ position: 'absolute', left: `${cl.matrix.self.x * 100}%`, top: `${(1 - cl.matrix.self.y) * 100}%`, transform: 'translate(-50%,-50%)', zIndex: 3 }}>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#7b9ff7', border: '2px solid rgba(255,255,255,0.6)', boxShadow: '0 0 8px rgba(123,159,247,0.6)' }} />
                            <div style={{ position: 'absolute', left: 18, top: -5, fontSize: 10, color: '#7b9ff7', fontWeight: 600, whiteSpace: 'nowrap' }}>{idea.title || 'Your idea'}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {cl.format === 'gap' && cl.gap?.competitors?.length > 0 && (() => {
                    const stages = cl.gap.stages || ['Raw idea', 'Protected & pitched', 'Validated', 'Patent-ready']
                    const gapStart = cl.gap.gap_start ?? 1
                    const gapEnd = cl.gap.gap_end ?? 2
                    const pct = i => `${(i / (stages.length - 1)) * 100}%`
                    const competitorsByStage = stages.map((_, i) => (cl.gap.competitors || []).filter(c => c.stage === i))
                    return (
                      <div style={{ padding: '1rem 0.5rem 2rem' }}>
                        <div style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, margin: '2rem 0 0' }}>
                          <div style={{ position: 'absolute', left: pct(gapStart), width: `calc(${pct(gapEnd)} - ${pct(gapStart)})`, height: '100%', background: 'rgba(123,159,247,0.4)', borderRadius: 2 }} />
                          {stages.map((s, i) => {
                            const inGap = i >= gapStart && i <= gapEnd
                            return (
                              <div key={i} style={{ position: 'absolute', left: pct(i), transform: 'translateX(-50%)', top: -8 }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: inGap ? '#7b9ff7' : 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', margin: '0 auto' }} />
                                <div style={{ fontSize: 10, color: inGap ? '#7b9ff7' : 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 8, whiteSpace: 'nowrap', fontWeight: inGap ? 600 : 400 }}>{s}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, marginTop: 6 }}>
                                  {(competitorsByStage[i] || []).map((c, j) => (
                                    <div key={j} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '2px 6px', fontSize: 10, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{c.name}</div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                          <div style={{ position: 'absolute', left: `calc((${pct(gapStart)} + ${pct(gapEnd)}) / 2)`, transform: 'translateX(-50%)', top: -32, fontSize: 11, color: '#7b9ff7', fontWeight: 600, whiteSpace: 'nowrap', background: 'rgba(14,14,31,0.9)', padding: '2px 8px', borderRadius: 5, border: '1px solid rgba(123,159,247,0.3)' }}>{idea.title || 'Your idea'}</div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )} catch { return null } })()}
          </div>
        </div>
      </div>

      {/* ── MOBILE LIST HEADER (list view only) ─────────────────────────────── */}
      <div className="pb-mobile-only pb-list-only" style={{ background: NAVY, padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>Build Pitch Deck</span>
          <button
            onClick={() => navigate(`/idea/${ideaId}`)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', padding: '0 4px' }}
          >← Back</button>
        </div>
        {saving && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>Saving…</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => { window.location.href = 'x-safari-' + window.location.href }} style={{ width: '100%', minHeight: 44, background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 14, color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontWeight: 500 }}>
            {generatingPDF ? 'Generating PDF…' : navigator.canShare ? '⬇ Save to Photos' : '↓ Download PDF'}
          </button>
          <button onClick={() => setPresenting(true)} style={{ width: '100%', minHeight: 44, background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 14, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
            ▶ Present
          </button>
          <button onClick={saveProgress} disabled={savingProgress} style={{ width: '100%', minHeight: 44, background: 'none', border: '0.5px solid rgba(255,255,255,0.18)', borderRadius: 8, fontSize: 14, color: 'rgba(255,255,255,0.55)', cursor: savingProgress ? 'not-allowed' : 'pointer', opacity: savingProgress ? 0.6 : 1 }}>
            {savingProgress ? 'Saving...' : '💾 Save Progress'}
          </button>
          <button onClick={handleShare} style={{ width: '100%', minHeight: 44, background: 'rgba(123,159,247,0.15)', border: '0.5px solid rgba(123,159,247,0.3)', borderRadius: 8, fontSize: 14, color: '#7b9ff7', cursor: 'pointer', fontWeight: 500 }}>
            Share Deck
          </button>
        </div>
      </div>

      {/* ── MOBILE SLIDE LIST (list view only) ──────────────────────────────── */}
      <div className="pb-mobile-only pb-list-only" style={{ padding: '1rem 1.25rem 2rem', minHeight: '50vh' }}>
        {slides.map((slide, i) => (
          <div
            key={i}
            onClick={() => { setCurrent(i); setMobileView('editor') }}
            style={{ background: '#1a1a2e', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '0.75rem', cursor: 'pointer', width: '100%' }}
          >
            {/* Header row: badge + title + arrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(123,159,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#7b9ff7', flexShrink: 0 }}>
                {i + 1}
              </div>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#fff' }}>{SLIDE_NAMES[i]}</span>
              <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>›</span>
            </div>
            {/* Thumbnail: 16:9 box containing a scaled-down real slide */}
            <div style={{ width: '100%', paddingBottom: '56.25%', position: 'relative', overflow: 'hidden', borderRadius: 6, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <ScaledSlide
                  slide={slide}
                  slideNum={i + 1}
                  containerStyle={{ borderRadius: 0 }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── MOBILE EDITOR HEADER (editor view only) ─────────────────────────── */}
      <div className="pb-mobile-only pb-editor-only" style={{ background: NAVY, padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: 8, minHeight: 56, position: 'sticky', top: 0, zIndex: 10 }}>
        <button
          onClick={() => setMobileView('list')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 4px' }}
        >← Back</button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#fff' }}>
          {SLIDE_NAMES[current]} — {current + 1} of {slides.length}
        </span>
        <div style={{ width: 56, flexShrink: 0 }} />
      </div>

      {/* ── MOBILE EDITOR SLIDE (editor view only) ──────────────────────────── */}
      <div className="pb-mobile-only pb-editor-only" style={{ padding: '1.25rem 1rem 96px', background: '#1a1a2e', minHeight: 'calc(100vh - 56px)' }}>
        <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
          <ScaledSlide
            slide={slides[current]}
            slideNum={current + 1}
            onUpdate={updates => updateSlide(current, updates)}
            containerStyle={{ boxShadow: '0 8px 50px rgba(0,0,0,0.55)', borderRadius: 8 }}
          />
        </div>
        {slides[current]?.type === 'business' && isOwner && (
          <div style={{ marginTop: 24, background: '#131320', borderRadius: 12, padding: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7b9ff7', marginBottom: 14 }}>Business Model Details</p>
            <BusinessModelSection
              value={bmValue}
              onChange={v => {
                setBmValue(v)
                const { free, paid } = extractBMChips(v)
                updateSlide(current, { freeTierChips: free, paidTierChips: paid })
              }}
              theme="dark"
            />
          </div>
        )}
        {idea?.origin_story && (
          <div style={{ marginTop: 16, background: '#131320', borderRadius: 12, padding: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7b9ff7', marginBottom: 10 }}>Origin Story</p>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>{idea.origin_story}</p>
          </div>
        )}
        {idea?.team && (() => { try { const t = typeof idea.team === 'string' ? JSON.parse(idea.team) : idea.team; if (!t?.name) return null; return (
          <div style={{ marginTop: 16, background: '#131320', borderRadius: 12, padding: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7b9ff7', marginBottom: 10 }}>The Team</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7b9ff7,#9b7ff7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>{(t.name||'?')[0].toUpperCase()}</div>
              <div><div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{t.name}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{t.role}</div></div>
            </div>
            {t.bio && <p style={{ fontSize: 12, lineHeight: 1.8, color: 'rgba(255,255,255,0.6)' }}>{t.bio}</p>}
          </div>
        )} catch { return null } })()}
        {idea?.customer_validation && (() => { try { const cv = typeof idea.customer_validation === 'string' ? JSON.parse(idea.customer_validation) : idea.customer_validation; if (!cv) return null; return (
          <div style={{ marginTop: 16, background: '#131320', borderRadius: 12, padding: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7b9ff7', marginBottom: 10 }}>Customer Validation</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[{l:'Waitlist',v:cv.waitlist},{l:'Interviews',v:cv.interviews},{l:'Pilots',v:cv.pilots},{l:'Stage',v:cv.stage}].filter(s=>s.v).map((s,i)=>(
                <div key={i} style={{ background: 'rgba(123,159,247,0.08)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        )} catch { return null } })()}
        {idea?.traction && (() => { try { const tr = typeof idea.traction === 'string' ? JSON.parse(idea.traction) : idea.traction; if (!tr?.milestones?.length) return null; return (
          <div style={{ marginTop: 16, background: '#131320', borderRadius: 12, padding: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7b9ff7', marginBottom: 10 }}>Traction & Milestones</p>
            {tr.milestones.slice(0,5).map((m,i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.status==='done'?'#22c55e':m.status==='in-progress'?'#7b9ff7':'#555', flexShrink: 0, marginTop: 3 }} />
                <div><div style={{ fontSize: 12, color: '#fff' }}>{m.label}</div>{m.date&&<div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{m.date}</div>}</div>
              </div>
            ))}
          </div>
        )} catch { return null } })()}
        {idea?.competitive_landscape && (() => { try { const cl = typeof idea.competitive_landscape === 'string' ? JSON.parse(idea.competitive_landscape) : idea.competitive_landscape; if (!cl?.format) return null; const competitors = cl[cl.format]?.competitors || []; if (!competitors.length) return null; return (
          <div style={{ marginTop: 16, background: '#131320', borderRadius: 12, padding: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7b9ff7', marginBottom: 12 }}>Competitive Landscape</p>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.75rem', border: '0.5px solid rgba(255,255,255,0.06)' }}>
              {cl.format === 'table' && cl.table?.competitors?.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                    <thead><tr><th style={{ textAlign: 'left', padding: '5px 8px', borderBottom: '1px solid rgba(123,159,247,0.3)', color: '#7b9ff7', fontWeight: 600, fontSize: 9 }}>Competitor</th>{(cl.table.columns || []).map((col, i) => <th key={i} style={{ padding: '5px 8px', borderBottom: '1px solid rgba(123,159,247,0.3)', color: '#7b9ff7', fontWeight: 600, fontSize: 9, textAlign: 'center' }}>{col}</th>)}</tr></thead>
                    <tbody>
                      <tr style={{ background: 'rgba(123,159,247,0.1)', borderLeft: '2px solid #7b9ff7' }}><td style={{ padding: '5px 8px', fontWeight: 600, color: '#7b9ff7', fontSize: 11 }}>{idea.title || 'Your idea'}</td>{(cl.table.columns || []).map((_, i) => <td key={i} style={{ textAlign: 'center', padding: '5px 8px', color: '#22c55e', fontSize: 13 }}>✓</td>)}</tr>
                      {cl.table.competitors.map((c, i) => <tr key={i} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}><td style={{ padding: '5px 8px', color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{c.name}</td>{(c.checks || []).map((checked, j) => <td key={j} style={{ textAlign: 'center', padding: '5px 8px', color: checked ? '#22c55e' : 'rgba(255,255,255,0.2)', fontSize: checked ? 13 : 11 }}>{checked ? '✓' : '—'}</td>)}</tr>)}
                    </tbody>
                  </table>
                </div>
              )}
              {cl.format === 'matrix' && cl.matrix?.competitors?.length > 0 && (
                <div style={{ position: 'relative', width: '100%', paddingBottom: '60%', background: 'rgba(123,159,247,0.04)', borderRadius: 6 }}>
                  <div style={{ position: 'absolute', inset: 0 }}>
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    {cl.matrix.competitors.map((c, i) => <div key={i} style={{ position: 'absolute', left: `${c.x * 100}%`, top: `${(1 - c.y) * 100}%`, transform: 'translate(-50%,-50%)' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} /><div style={{ position: 'absolute', left: 12, top: -3, fontSize: 9, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>{c.name}</div></div>)}
                    {cl.matrix.self && <div style={{ position: 'absolute', left: `${cl.matrix.self.x * 100}%`, top: `${(1 - cl.matrix.self.y) * 100}%`, transform: 'translate(-50%,-50%)' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: '#7b9ff7', boxShadow: '0 0 6px rgba(123,159,247,0.6)' }} /><div style={{ position: 'absolute', left: 16, top: -4, fontSize: 9, color: '#7b9ff7', fontWeight: 600, whiteSpace: 'nowrap' }}>{idea.title || 'Your idea'}</div></div>}
                  </div>
                </div>
              )}
              {cl.format === 'gap' && cl.gap?.competitors?.length > 0 && (() => {
                const stages = cl.gap.stages || ['Raw idea','Protected & pitched','Validated','Patent-ready']
                const gapStart = cl.gap.gap_start ?? 1
                const gapEnd = cl.gap.gap_end ?? 2
                const pct = i => `${(i / (stages.length - 1)) * 100}%`
                const competitorsByStage = stages.map((_, i) => (cl.gap.competitors || []).filter(c => c.stage === i))
                return (
                  <div style={{ padding: '1rem 0 1.5rem' }}>
                    <div style={{ position: 'relative', height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, margin: '1.5rem 0 0' }}>
                      <div style={{ position: 'absolute', left: pct(gapStart), width: `calc(${pct(gapEnd)} - ${pct(gapStart)})`, height: '100%', background: 'rgba(123,159,247,0.4)', borderRadius: 2 }} />
                      {stages.map((s, i) => {
                        const inGap = i >= gapStart && i <= gapEnd
                        return (
                          <div key={i} style={{ position: 'absolute', left: pct(i), transform: 'translateX(-50%)', top: -7 }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: inGap ? '#7b9ff7' : 'rgba(255,255,255,0.2)', margin: '0 auto' }} />
                            <div style={{ fontSize: 9, color: inGap ? '#7b9ff7' : 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 6, whiteSpace: 'nowrap' }}>{s}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginTop: 4 }}>
                              {(competitorsByStage[i] || []).map((c, j) => <div key={j} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 3, padding: '1px 5px', fontSize: 9, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>{c.name}</div>)}
                            </div>
                          </div>
                        )
                      })}
                      <div style={{ position: 'absolute', left: `calc((${pct(gapStart)} + ${pct(gapEnd)}) / 2)`, transform: 'translateX(-50%)', top: -26, fontSize: 10, color: '#7b9ff7', fontWeight: 600, whiteSpace: 'nowrap' }}>{idea.title || 'Your idea'}</div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )} catch { return null } })()}
      </div>

      {/* ── MOBILE BOTTOM NAV (editor view only, fixed) ─────────────────────── */}
      <div className="pb-mobile-only pb-editor-only" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0e0e1f', borderTop: '0.5px solid rgba(255,255,255,0.1)', padding: '0.75rem 1.25rem', display: 'flex', gap: 12 }}>
        <button
          onClick={() => setCurrent(c => c - 1)}
          disabled={isFirst}
          style={{ flex: 1, minHeight: 44, background: isFirst ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.1)', color: isFirst ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.8)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 14, cursor: isFirst ? 'default' : 'pointer' }}
        >← Previous</button>
        <button
          onClick={() => setCurrent(c => c + 1)}
          disabled={isLast}
          style={{ flex: 1, minHeight: 44, background: isLast ? 'rgba(255,255,255,0.04)' : 'rgba(123,159,247,0.2)', color: isLast ? 'rgba(255,255,255,0.25)' : '#7b9ff7', border: `0.5px solid ${isLast ? 'rgba(255,255,255,0.1)' : 'rgba(123,159,247,0.3)'}`, borderRadius: 8, fontSize: 14, cursor: isLast ? 'default' : 'pointer' }}
        >Next →</button>
      </div>

      {/* ── PRESENT MODE (shared, position fixed) ───────────────────────────── */}
      {presenting && (
        <div
          style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onTouchStart={e => { touchStart.current = e.touches[0].clientX }}
          onTouchEnd={e => {
            if (touchStart.current === null) return
            const diff = touchStart.current - e.changedTouches[0].clientX
            if (Math.abs(diff) > 50) setCurrent(c => diff > 0 ? Math.min(SLIDES_COUNT - 1, c + 1) : Math.max(0, c - 1))
            touchStart.current = null
          }}
        >
          <button onClick={() => setPresenting(false)} style={{ position: 'absolute', top: 16, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '6px 12px', color: '#fff', fontSize: 13, cursor: 'pointer', zIndex: 10 }}>
            ✕ Esc
          </button>
          {current > 0 && (
            <button onClick={() => setCurrent(c => c - 1)} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '14px 18px', color: 'rgba(255,255,255,0.65)', fontSize: 22, cursor: 'pointer' }}>‹</button>
          )}
          {current < SLIDES_COUNT - 1 && (
            <button onClick={() => setCurrent(c => c + 1)} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '14px 18px', color: 'rgba(255,255,255,0.65)', fontSize: 22, cursor: 'pointer' }}>›</button>
          )}
          <div style={{ width: '90vw', maxWidth: '90vw' }}>
            <ScaledSlide slide={slides[current]} slideNum={current + 1} containerStyle={{ boxShadow: '0 12px 60px rgba(0,0,0,0.7)', borderRadius: 8 }} />
          </div>
          <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>
            {current + 1} / {SLIDES_COUNT}
          </div>
          <div style={{ position: 'absolute', bottom: 14, right: 20, fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>
            eurekAIdea · myeurekaidea.com
          </div>
        </div>
      )}

      {/* ── HIDDEN FULL-RES SLIDES for PDF capture ──────────────────────────── */}
      <div
        ref={slideRenderRef}
        style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1, opacity: 0, visibility: 'hidden' }}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="deck-slide-render"
            style={{ width: SLIDE_W, height: SLIDE_H, overflow: 'hidden', flexShrink: 0 }}
          >
            <SlideContent slide={slide} slideNum={i + 1} />
          </div>
        ))}
      </div>

      {/* ── SHARE MODAL (shared, position fixed) ────────────────────────────── */}
      {shareModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: NAVY }}>Share Deck</h3>
              <button onClick={() => setShareModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#888', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: '#888', marginBottom: '1.25rem', lineHeight: 1.65 }}>
              Anyone with this link can view your deck in presentation mode — no login required.
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#f5f5f5', borderRadius: 8, padding: '10px 14px', marginBottom: '1rem' }}>
              <code style={{ flex: 1, fontSize: 12, color: '#444', wordBreak: 'break-all', lineHeight: 1.5 }}>
                {window.location.origin}/deck/view/{shareToken}
              </code>
              <button onClick={copyShareLink} style={{ background: shareCopied ? '#EAF3DE' : NAVY, color: shareCopied ? '#3B6D11' : '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 500, flexShrink: 0, cursor: 'pointer' }}>
                {shareCopied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#aaa' }}>This link is now public. Anyone who has it can view this deck.</p>
          </div>
        </div>
      )}
    </div>
  )
}
