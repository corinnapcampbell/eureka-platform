import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { ScaledSlide } from '../components/DeckSlides'

const SLIDES_COUNT = 8

export default function DeckViewer() {
  const { shareToken } = useParams()
  const [slides, setSlides] = useState(null)
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const touchStart = useRef(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('pitch_decks')
        .select('slides, is_public')
        .eq('share_token', shareToken)
        .single()

      if (!data || !data.is_public || !data.slides?.length) {
        setNotFound(true)
      } else {
        setSlides(data.slides)
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
      style={{ width: '100vw', height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}
      onTouchStart={e => { touchStart.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchStart.current === null) return
        const diff = touchStart.current - e.changedTouches[0].clientX
        if (Math.abs(diff) > 50) setCurrent(c => diff > 0 ? Math.min(slideCount - 1, c + 1) : Math.max(0, c - 1))
        touchStart.current = null
      }}
    >
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

      <div style={{ width: '90vw', maxWidth: '90vw' }}>
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
