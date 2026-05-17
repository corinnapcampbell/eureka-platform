import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { buildDefaultSlides, ScaledSlide, Thumbnail, SLIDE_NAMES, SLIDE_W, SLIDE_H, SlideContent } from '../components/DeckSlides'
import jsPDF from 'jspdf'

const SLIDES_COUNT = 8
const NAVY = '#0e0e1f'

export default function DeckBuilder({ session }) {
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
  const saveTimer = useRef(null)
  const touchStart = useRef(null)

  useEffect(() => {
    async function load() {
      const { data: ideaData } = await supabase.from('ideas').select('*').eq('id', ideaId).single()
      setIdea(ideaData)

      const userId = session?.user?.id
      const ownerCheck = userId && ideaData?.user_id === userId

      if (!ownerCheck) {
        // Non-owner: look for a public deck and redirect to DeckViewer
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
    const bizSlide = slides.find(s => s.type === 'business')
    const deckFreeTierChips = bizSlide?.freeTierChips || []
    const deckPaidTierChips = bizSlide?.paidTierChips || []
    const businessModel = [
      ...deckFreeTierChips.map(f => `Free: ${f}`),
      ...deckPaidTierChips.map(p => `Paid: ${p}`),
    ].join('\n')
    await supabase.from('pitch_decks').update({ slides }).eq('id', deckId)
    if (businessModel) await supabase.from('ideas').update({ business_model: businessModel }).eq('id', ideaId)
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

  function handlePDF() {
    if (!slides) return
    setGeneratingPDF(true)
    try {
      const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: [297, 167] })
      const W = 297, H = 167
      const navy = [14, 14, 31]
      const accent = [123, 159, 247]
      const ml = 16

      function accentBars() {
        doc.setDrawColor(...accent)
        doc.setLineWidth(0.8)
        doc.line(0, 1.5, W, 1.5)
        doc.line(0, H - 1.5, W, H - 1.5)
      }

      function footer(pg) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 130)
        doc.text('EurekAIdea', ml, H - 6)
        doc.text('Presented via EurekAIdea', W / 2, H - 6, { align: 'center' })
        doc.text(`${pg} / 8`, W - ml, H - 6, { align: 'right' })
      }

      slides.forEach((slide, idx) => {
        if (idx > 0) doc.addPage()
        const dark = slide.type === 'cover' || slide.type === 'roadmap' || slide.type === 'closing'
        if (dark) { doc.setFillColor(...navy); doc.rect(0, 0, W, H, 'F') }
        accentBars()

        const textColor = dark ? [255, 255, 255] : navy
        const mutedColor = dark ? [120, 120, 150] : [100, 100, 110]
        let y = 24

        if (slide.type === 'cover') {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...textColor)
          doc.text(slide.title || '', W / 2, 72, { align: 'center', maxWidth: W - 60 })
          doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...mutedColor)
          doc.text(slide.tagline || '', W / 2, 88, { align: 'center', maxWidth: W - 80 })
          doc.setFontSize(8); doc.setTextColor(60, 60, 80)
          doc.text(`Presented by: ${slide.presenter || ''}  |  ${slide.date || ''}  |  ${slide.stage || ''}  |  ${slide.marketSize || ''}`, W / 2, 104, { align: 'center' })
        } else {
          const label = slide.sectionLabel || ''
          doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...accent)
          doc.text(label, ml, y); y += 8

          const title = slide.headline || slide.title || ''
          doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...textColor)
          const titleLines = doc.splitTextToSize(title, W - ml * 2)
          doc.text(titleLines, ml, y); y += titleLines.length * 6 + 6

          doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...mutedColor)

          if (slide.type === 'problem') {
            ;(slide.bullets || []).forEach((b, i) => {
              const lines = doc.splitTextToSize(`${i + 1}. ${b}`, W - ml * 2)
              doc.text(lines, ml, y); y += lines.length * 5 + 3
            })
          } else if (slide.type === 'solution') {
            const descLines = doc.splitTextToSize(slide.description || '', W - ml * 2)
            doc.text(descLines, ml, y); y += descLines.length * 5 + 8
            ;(slide.features || []).forEach(f => {
              doc.text(`${f.icon}  ${f.label}`, ml, y); y += 6
            })
          } else if (slide.type === 'market') {
            ;(slide.metrics || []).map(m => `${m.value} — ${m.label}`).forEach(t => {
              doc.text(t, ml, y); y += 6
            }); y += 4
            const descLines = doc.splitTextToSize(slide.description || '', W - ml * 2)
            doc.text(descLines, ml, y)
          } else if (slide.type === 'business') {
            const fChips = slide.freeTierChips || (slide.freeTier ? [slide.freeTier] : [])
            const pChips = slide.paidTierChips || (slide.paidTier ? [slide.paidTier] : [])
            doc.text(`Free: ${fChips.join(', ')}`, ml, y); y += 12
            doc.text(`Paid: ${pChips.join(', ')}`, ml, y); y += 12
            doc.setFontSize(8); doc.text(slide.note || '', ml, y)
          } else if (slide.type === 'advantage') {
            ;(slide.weHave || []).forEach(w => { doc.text(`✓ ${w}`, ml, y); y += 6 }); y += 4
            ;(slide.othersDont || []).forEach(o => { doc.text(`✗ ${o}`, ml + 90, y - (slide.weHave?.length || 0) * 6 - 4 + (slide.othersDont.indexOf(o)) * 6 + 6); })
            y += 4
            const qLines = doc.splitTextToSize(`"${slide.quote || ''}"`, W - ml * 2)
            doc.setFontSize(9); doc.text(qLines, ml, y)
          } else if (slide.type === 'roadmap') {
            ;(slide.steps || []).forEach(s => {
              doc.setFont('helvetica', 'bold'); doc.setTextColor(...textColor); doc.text(`${s.num}. ${s.title}`, ml, y)
              doc.setFont('helvetica', 'normal'); doc.setTextColor(...mutedColor); doc.text(s.description || '', ml + 8, y + 5)
              y += 14
            })
          } else if (slide.type === 'closing') {
            doc.setFontSize(9); doc.text(slide.subtitle || '', W / 2, y, { align: 'center', maxWidth: W - 60 }); y += 18
            doc.setTextColor(...accent); doc.text(slide.email || '', W / 2, y, { align: 'center' }); y += 8
            doc.text(slide.website || '', W / 2, y, { align: 'center' })
          }
        }
        footer(idx + 1)
      })

      const slug = (idea?.title || 'deck').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      doc.save(`${slug}-deck.pdf`)
    } catch (e) {
      console.error('PDF error:', e)
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#12121f', overflow: 'hidden' }}>

      {/* Top bar */}
      <div style={{ background: NAVY, borderBottom: '0.5px solid rgba(255,255,255,0.07)', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, zIndex: 10 }}>
        <button onClick={() => navigate(`/idea/${ideaId}`)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: '4px 0', flexShrink: 0 }}>
          ← Back
        </button>
        <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}>
            Deck Builder — {SLIDE_NAMES[current]}
          </span>
          {saving && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 10 }}>Saving…</span>}
        </div>
        <button
          onClick={handlePDF}
          disabled={generatingPDF}
          style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '7px 14px', fontSize: 13, color: 'rgba(255,255,255,0.65)', cursor: 'pointer', flexShrink: 0, opacity: generatingPDF ? 0.5 : 1 }}
        >
          {generatingPDF ? '…' : '↓ PDF'}
        </button>
        <button
          onClick={() => setPresenting(true)}
          style={{ background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '7px 16px', fontSize: 13, color: '#fff', cursor: 'pointer', flexShrink: 0 }}
        >
          ▶ Present
        </button>
        <button
          onClick={saveProgress}
          disabled={savingProgress}
          style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.18)', borderRadius: 7, padding: '7px 16px', fontSize: 13, color: 'rgba(255,255,255,0.55)', cursor: savingProgress ? 'not-allowed' : 'pointer', flexShrink: 0, opacity: savingProgress ? 0.6 : 1 }}
        >
          {savingProgress ? 'Saving...' : '💾 Save Progress'}
        </button>
        <button
          onClick={handleShare}
          style={{ background: 'rgba(123,159,247,0.15)', border: '0.5px solid rgba(123,159,247,0.3)', borderRadius: 7, padding: '7px 16px', fontSize: 13, color: '#7b9ff7', cursor: 'pointer', flexShrink: 0 }}
        >
          Share Deck
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 204, background: '#0a0a18', borderRight: '0.5px solid rgba(255,255,255,0.06)', overflowY: 'auto', padding: '12px 10px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            {slides.map((slide, i) => (
              <Thumbnail key={i} slide={slide} slideNum={i + 1} selected={current === i} onClick={() => setCurrent(i)} />
            ))}
          </div>
          {/* Free vs Paid info panel */}
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '28px 36px', background: '#1a1a2e', overflow: 'hidden' }}>
          <div style={{ width: '100%', maxWidth: 900 }}>
            <ScaledSlide
              slide={slides[current]}
              slideNum={current + 1}
              onUpdate={updates => updateSlide(current, updates)}
              containerStyle={{ boxShadow: '0 8px 50px rgba(0,0,0,0.55)', borderRadius: 8 }}
            />
          </div>
        </div>
      </div>

      {/* Present mode */}
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

      {/* Share modal */}
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
              <button
                onClick={copyShareLink}
                style={{ background: shareCopied ? '#EAF3DE' : NAVY, color: shareCopied ? '#3B6D11' : '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 500, flexShrink: 0, cursor: 'pointer' }}
              >
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
