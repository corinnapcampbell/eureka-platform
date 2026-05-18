import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { ScaledSlide } from '../components/DeckSlides'
import jsPDF from 'jspdf'

const SLIDES_COUNT = 8

export default function DeckViewer() {
  const { shareToken } = useParams()
  const navigate = useNavigate()
  const [authSession, setAuthSession] = useState(null)
  const [slides, setSlides] = useState(null)
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [ideaTitle, setIdeaTitle] = useState('')
  const touchStart = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setAuthSession(session))
  }, [])

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('pitch_decks')
        .select('slides, is_public, ideas(title)')
        .eq('share_token', shareToken)
        .single()

      if (!data || !data.is_public || !data.slides?.length) {
        setNotFound(true)
      } else {
        setSlides(data.slides)
        setIdeaTitle(data.ideas?.title || data.slides[0]?.title || 'deck')
      }
      setLoading(false)
    }
    load()
  }, [shareToken])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setCurrent(c => Math.min(SLIDES_COUNT - 1, c + 1))
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setCurrent(c => Math.max(0, c - 1))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  function downloadDeckPDF() {
    if (!slides) return
    setGeneratingPDF(true)
    try {
      const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: [297, 167] })
      const W = 297, H = 167, ml = 16
      const navy = [14, 14, 31], accent = [123, 159, 247]
      slides.forEach((slide, idx) => {
        if (idx > 0) doc.addPage()
        const dark = slide.type === 'cover' || slide.type === 'roadmap' || slide.type === 'closing'
        if (dark) { doc.setFillColor(...navy); doc.rect(0, 0, W, H, 'F') }
        doc.setDrawColor(...accent); doc.setLineWidth(0.8)
        doc.line(0, 1.5, W, 1.5); doc.line(0, H - 1.5, W, H - 1.5)
        const tc = dark ? [255, 255, 255] : navy
        const mc = dark ? [120, 120, 150] : [100, 100, 110]
        let y = 24
        if (slide.type === 'cover') {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...tc)
          doc.text(slide.title || '', W / 2, 72, { align: 'center', maxWidth: W - 60 })
          doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...mc)
          doc.text(slide.tagline || '', W / 2, 88, { align: 'center', maxWidth: W - 80 })
        } else {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...accent)
          doc.text(slide.sectionLabel || '', ml, y); y += 8
          doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...tc)
          const tLines = doc.splitTextToSize(slide.headline || slide.title || '', W - ml * 2)
          doc.text(tLines, ml, y); y += tLines.length * 6 + 6
          doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...mc)
          if (slide.bullets?.length) slide.bullets.forEach((b, i) => {
            const ls = doc.splitTextToSize(`${i + 1}. ${b}`, W - ml * 2)
            doc.text(ls, ml, y); y += ls.length * 5 + 3
          })
          if (slide.description) {
            const ls = doc.splitTextToSize(slide.description, W - ml * 2)
            doc.text(ls, ml, y); y += ls.length * 5 + 4
          }
          if (slide.type === 'closing') {
            doc.setTextColor(...accent)
            if (slide.email) { doc.text(slide.email, W / 2, y, { align: 'center' }); y += 8 }
            if (slide.website) doc.text(slide.website, W / 2, y, { align: 'center' })
          }
        }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 120, 130)
        doc.text('Presented via EurekAIdea', W / 2, H - 6, { align: 'center' })
        doc.text(`${idx + 1} / ${slides.length}`, W - ml, H - 6, { align: 'right' })
      })
      const slug = ideaTitle.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '') || 'deck'
      doc.save(`${slug}-deck.pdf`)
    } catch (e) {
      console.error('PDF error:', e)
    }
    setGeneratingPDF(false)
  }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <div className="spinner" style={{ width: 28, height: 28, borderTopColor: '#7b9ff7' }} />
    </div>
  )

  if (notFound) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0e0e1f', gap: 16 }}>
      <div style={{ fontSize: 40 }}>🔒</div>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif" }}>This deck is not available.</p>
      <a href="/" style={{ fontSize: 13, color: '#7b9ff7', fontFamily: "'DM Sans', sans-serif" }}>← Go to eurekAIdea</a>
    </div>
  )

  const slideCount = slides?.length || SLIDES_COUNT

  return (
    <div
      style={{ width: '100vw', height: '100vh', background: '#0e0e1f', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}
      onTouchStart={e => { touchStart.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchStart.current === null) return
        const diff = touchStart.current - e.changedTouches[0].clientX
        if (Math.abs(diff) > 50) setCurrent(c => diff > 0 ? Math.min(slideCount - 1, c + 1) : Math.max(0, c - 1))
        touchStart.current = null
      }}
    >
      {authSession && (
        <a href="/dashboard" style={{ position: 'absolute', top: 14, right: 16, zIndex: 100, background: 'rgba(123,159,247,0.12)', border: '0.5px solid rgba(123,159,247,0.3)', borderRadius: 7, padding: '6px 14px', fontSize: 12, color: '#7b9ff7', textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>My Dashboard →</a>
      )}
      {current > 0 && (
        <button
          onClick={() => setCurrent(c => c - 1)}
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '14px 18px', color: 'rgba(255,255,255,0.6)', fontSize: 22, cursor: 'pointer', zIndex: 10 }}
        >‹</button>
      )}
      {current < slideCount - 1 && (
        <button
          onClick={() => setCurrent(c => c + 1)}
          style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '14px 18px', color: 'rgba(255,255,255,0.6)', fontSize: 22, cursor: 'pointer', zIndex: 10 }}
        >›</button>
      )}

      <div style={{
        width: 'min(100vw, calc(100vh * 960 / 540))',
        flex: '0 0 auto',
      }}>
        {slides && (
          <ScaledSlide
            slide={slides[current]}
            slideNum={current + 1}
            containerStyle={{ boxShadow: '0 12px 60px rgba(0,0,0,0.7)', borderRadius: 8 }}
          />
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, fontFamily: "'DM Sans', sans-serif" }}>
        {current + 1} / {slideCount}
      </div>
      <div style={{ position: 'absolute', bottom: 14, right: 20, fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Sans', sans-serif" }}>
        Presented via EurekAIdea · myeurekaidea.com
      </div>
    </div>
  )
}
