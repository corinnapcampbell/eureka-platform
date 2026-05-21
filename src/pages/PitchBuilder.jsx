import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'
import NavBar from '../components/NavBar'
import { generateIdeaPDF } from '../utils/generatePDF'

const SECTIONS = [
  { key: 'tagline', label: 'Tagline', hint: 'A short, punchy one-liner that captures the essence of your idea', placeholder: 'e.g. The AI assistant that turns meeting notes into action plans instantly' },
  { key: 'problem', label: 'Problem', hint: 'Pre-filled from your submission — edit freely', placeholder: 'Describe the pain point your idea addresses...' },
  { key: 'solution', label: 'Solution', hint: 'Pre-filled from your submission — edit freely', placeholder: 'Describe your solution...' },
  { key: 'how_it_works', label: 'How It Works', hint: 'Walk through the product or experience step by step', placeholder: 'Step 1: A user does X\nStep 2: The system does Y\nStep 3: The result is Z' },
  { key: 'target_audience', label: 'Target Market', hint: 'Pre-filled from your submission — refine for the pitch', placeholder: 'e.g. Early-stage founders, solopreneurs, remote teams of 2–10 people' },
  { key: 'market_size', label: 'Market Size', hint: 'How big is the opportunity?', placeholder: 'e.g. The global market for X is estimated at $4.2B and growing at 18% YoY' },
  { key: 'business_model', label: 'Business Model', hint: 'How does this make money?', placeholder: 'e.g. SaaS subscription at $29/month per seat. Enterprise plans from $500/month.' },
  { key: 'competitive_advantage', label: 'Competitive Advantage', hint: 'Why will this win against existing alternatives?', placeholder: 'Unlike X and Y, we are the only solution that...' },
  { key: 'risks', label: 'Risks & Challenges', hint: 'Honest assessment of the biggest risks and your mitigation plan', placeholder: 'Key risk 1: ...\nMitigation: ...\nKey risk 2: ...' },
  { key: 'next_steps', label: 'Next Steps', hint: 'What needs to happen to bring this to market?', placeholder: '1. Build MVP (3 months)\n2. Beta test with 20 users\n3. Launch on Product Hunt' },
]

const emptyPitch = {
  tagline: '', problem: '', solution: '', how_it_works: '',
  target_audience: '', market_size: '', business_model: '',
  competitive_advantage: '', risks: '', next_steps: '',
}

const MOBILE_CSS = `
  @media (max-width: 767px) {
    .pb-desktop-only { display: none !important; }
    .pb-view-list .pb-editor-only { display: none !important; }
    .pb-view-editor .pb-list-only { display: none !important; }
  }
  @media (min-width: 768px) {
    .pb-mobile-only { display: none !important; }
  }
`

export default function PitchBuilder({ session }) {
  const { ideaId } = useParams()
  const navigate = useNavigate()
  const [idea, setIdea] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pitch, setPitch] = useState(emptyPitch)
  const pitchRef = useRef(emptyPitch)
  const [suggestions, setSuggestions] = useState({})
  const [loadingSuggestion, setLoadingSuggestion] = useState({})
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [pdfReady, setPdfReady] = useState(false)
  const saveTimers = useRef({})
  const [mobileView, setMobileView] = useState('list') // 'list' | 'editor'
  const [mobileActiveIdx, setMobileActiveIdx] = useState(0)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId)
        .single()
      if (data) {
        setIdea(data)
        const isOwner = session?.user?.id === data.user_id
        if (!isOwner) {
          navigate(`/pitch/${ideaId}`, { replace: true })
          return
        }
        const loaded = {
          tagline:               data.tagline               || '',
          problem:               data.problem               || '',
          solution:              data.solution              || '',
          how_it_works:          data.how_it_works          || '',
          target_audience:       data.target_audience       || '',
          market_size:           data.market_size           || '',
          business_model:        data.business_model        || '',
          competitive_advantage: data.competitive_advantage || '',
          risks:                 data.risks                 || '',
          next_steps:            data.next_steps            || '',
        }
        setPitch(loaded)
        pitchRef.current = loaded
      }
      setLoading(false)
    }
    load()
  }, [ideaId])

  useEffect(() => { pitchRef.current = pitch }, [pitch])

  function updateField(key, value) {
    setPitch(p => ({ ...p, [key]: value }))
    clearTimeout(saveTimers.current[key])
    saveTimers.current[key] = setTimeout(async () => {
      const current = { ...pitchRef.current, [key]: value }
      const complete = SECTIONS.every(s => current[s.key]?.trim())
      await supabase.from('ideas').update({
        [key]: value,
        pitch_sections_complete: complete,
      }).eq('id', ideaId)
    }, 1000)
  }

  const filledCount = SECTIONS.filter(s => pitch[s.key]?.trim()).length
  const aiEnabled = filledCount >= 3
  const allComplete = filledCount === SECTIONS.length

  async function getSuggestion(sectionKey) {
    setLoadingSuggestion(l => ({ ...l, [sectionKey]: true }))
    try {
      const res = await fetch('/api/functions/generate-pitch-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_name: sectionKey,
          existing_sections: pitchRef.current,
          idea_context: { title: idea?.title },
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { suggestion } = await res.json()
      setSuggestions(s => ({ ...s, [sectionKey]: suggestion || '' }))
    } catch (e) {
      console.error('AI suggestion error:', e)
    }
    setLoadingSuggestion(l => ({ ...l, [sectionKey]: false }))
  }

  function useSuggestion(key) {
    updateField(key, suggestions[key])
    setSuggestions(s => ({ ...s, [key]: null }))
  }

  function dismissSuggestion(key) {
    setSuggestions(s => ({ ...s, [key]: null }))
  }

  function handleGeneratePDF() {
    setGeneratingPDF(true)
    setPdfReady(false)
    try {
      generateIdeaPDF({ ...idea, ...pitch }, { userEmail: session?.user?.email })
      setPdfReady(true)
    } catch (e) {
      console.error('PDF generation error:', e)
    }
    setGeneratingPDF(false)
  }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  const activeSection = SECTIONS[mobileActiveIdx]
  const isFirst = mobileActiveIdx === 0
  const isLast = mobileActiveIdx === SECTIONS.length - 1

  return (
    <div className={`pb-root pb-view-${mobileView}`} style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <style>{MOBILE_CSS}</style>

      {/* ── DESKTOP HEADER ─────────────────────────────────────────────────── */}
      <div className="pb-desktop-only" style={{ background: 'var(--ink)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem 2rem' }}>
          <NavBar
            session={session}
            rightExtra={
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => navigate(`/pitch/${ideaId}`)} style={{ background: 'rgba(123,159,247,0.1)', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 7, padding: '7px 14px', fontSize: 13, color: '#7b9ff7', cursor: 'pointer' }}>Preview PDF →</button>
                <button onClick={() => navigate(`/deck/${ideaId}`)} style={{ background: 'rgba(123,159,247,0.15)', border: '0.5px solid rgba(123,159,247,0.3)', borderRadius: 7, padding: '7px 14px', fontSize: 13, color: '#7b9ff7', cursor: 'pointer' }}>Build Deck →</button>
                <button onClick={() => navigate(`/idea/${ideaId}`)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }}>← Back to idea</button>
              </div>
            }
          />
        </div>
      </div>

      {/* ── MOBILE LIST HEADER (visible on mobile, list view only) ─────────── */}
      <div className="pb-mobile-only pb-list-only" style={{ background: 'var(--ink)', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <Logo size={18} variant="dark" />
          <button
            onClick={() => navigate(`/idea/${ideaId}`)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}
          >← Back to idea</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => navigate(`/pitch/${ideaId}`)} style={{ width: '100%', minHeight: 44, background: 'rgba(123,159,247,0.1)', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 8, fontSize: 14, color: '#7b9ff7', cursor: 'pointer', fontWeight: 500 }}>
            Preview PDF →
          </button>
          <button onClick={() => navigate(`/deck/${ideaId}`)} style={{ width: '100%', minHeight: 44, background: 'rgba(123,159,247,0.15)', border: '0.5px solid rgba(123,159,247,0.3)', borderRadius: 8, fontSize: 14, color: '#7b9ff7', cursor: 'pointer', fontWeight: 500 }}>
            Build Deck →
          </button>
        </div>
      </div>

      {/* ── MOBILE EDITOR HEADER (visible on mobile, editor view only) ──────── */}
      <div className="pb-mobile-only pb-editor-only" style={{ background: 'var(--ink)', padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: 8, minHeight: 56, position: 'sticky', top: 0, zIndex: 10 }}>
        <button
          onClick={() => setMobileView('list')}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', flexShrink: 0, padding: '0 4px' }}
        >← Back</button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#fff' }}>
          {activeSection.label} — {mobileActiveIdx + 1} of {SECTIONS.length}
        </span>
        <div style={{ width: 56, flexShrink: 0 }} />
      </div>

      {/* ── DESKTOP MAIN CONTENT ────────────────────────────────────────────── */}
      <div className="pb-desktop-only">
        {/* Title + progress */}
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 2rem 0' }}>
          <div style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>Pitch Builder</span>
          </div>
          <h1 className="serif" style={{ fontSize: 30, marginBottom: '0.25rem' }}>{idea?.title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '1.75rem' }}>
            Fill in all 10 sections to generate a branded investor PDF. Auto-saves as you type.
          </p>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                {filledCount} of {SECTIONS.length} sections completed
              </span>
              {!aiEnabled && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Fill {3 - filledCount} more section{3 - filledCount !== 1 ? 's' : ''} to unlock AI suggestions
                </span>
              )}
              {allComplete && (
                <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>✓ Ready to export PDF</span>
              )}
            </div>
            <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(filledCount / SECTIONS.length) * 100}%`, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* Sections + PDF export */}
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 2rem 3rem' }}>
          {SECTIONS.map((section, idx) => (
            <SectionCard
              key={section.key}
              section={section}
              index={idx}
              value={pitch[section.key]}
              onChange={val => updateField(section.key, val)}
              aiEnabled={aiEnabled}
              loadingAI={!!loadingSuggestion[section.key]}
              suggestion={suggestions[section.key]}
              onAISuggest={() => getSuggestion(section.key)}
              onUseSuggestion={() => useSuggestion(section.key)}
              onDismissSuggestion={() => dismissSuggestion(section.key)}
            />
          ))}
          <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '2rem', marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <h3 className="serif" style={{ fontSize: 22, marginBottom: '0.4rem' }}>Export as PDF</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 400 }}>
                  {allComplete
                    ? 'Your pitch is complete. Generate a branded, multi-page PDF ready to share with investors or co-founders.'
                    : `Complete all 10 sections to unlock PDF export. ${SECTIONS.length - filledCount} section${SECTIONS.length - filledCount !== 1 ? 's' : ''} remaining.`}
                </p>
              </div>
              <button
                onClick={handleGeneratePDF}
                disabled={!allComplete || generatingPDF}
                style={{ background: allComplete ? 'var(--ink)' : 'var(--surface)', color: allComplete ? '#fff' : 'var(--muted)', border: `0.5px solid ${allComplete ? 'transparent' : 'var(--border)'}`, borderRadius: 8, padding: '11px 26px', fontSize: 14, fontWeight: 500, opacity: generatingPDF ? 0.7 : 1, flexShrink: 0, cursor: allComplete ? 'pointer' : 'default' }}
              >
                {generatingPDF ? 'Generating...' : '↓ Generate PDF'}
              </button>
            </div>
            {pdfReady && (
              <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: '#EAF3DE', borderRadius: 8, fontSize: 13, color: '#3B6D11', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✓</span>
                <span>PDF generated and downloaded. Click "Generate PDF" again to re-download at any time.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE LIST CONTENT ─────────────────────────────────────────────���─ */}
      <div className="pb-mobile-only pb-list-only">
        {/* Title + progress */}
        <div style={{ padding: '1.25rem 1.25rem 0' }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>Pitch Builder</span>
          <h1 className="serif" style={{ fontSize: 26, marginBottom: '0.25rem', marginTop: '0.15rem' }}>{idea?.title}</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '1.25rem' }}>Fill in all 10 sections to generate a branded investor PDF. Auto-saves as you type.</p>
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{filledCount} of {SECTIONS.length} sections completed</span>
              {allComplete && <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>✓ Ready</span>}
            </div>
            <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(filledCount / SECTIONS.length) * 100}%`, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        </div>

        {/* Section tap cards */}
        <div style={{ padding: '0 1.25rem 2rem' }}>
          {SECTIONS.map((section, idx) => {
            const filled = pitch[section.key]?.trim()
            const excerpt = filled ? filled.slice(0, 80) + (filled.length > 80 ? '…' : '') : null
            return (
              <div
                key={section.key}
                onClick={() => { setMobileActiveIdx(idx); setMobileView('editor') }}
                style={{ background: '#fff', border: '0.5px solid var(--border)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '0.75rem', cursor: 'pointer', minHeight: 64 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: excerpt ? 5 : 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '2px 7px', background: filled ? '#EAF3DE' : 'var(--surface)', color: filled ? '#3B6D11' : 'var(--muted)', border: `0.5px solid ${filled ? '#c3dea8' : 'var(--border)'}`, flexShrink: 0 }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', flex: 1 }}>{section.label}</span>
                  {filled
                    ? <span style={{ fontSize: 12, color: '#3B6D11', flexShrink: 0 }}>✓</span>
                    : <span style={{ fontSize: 18, color: 'var(--muted)', flexShrink: 0 }}>›</span>
                  }
                </div>
                {excerpt
                  ? <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>{excerpt}</p>
                  : <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>{section.hint}</p>
                }
              </div>
            )
          })}

          {/* Export PDF card */}
          <div style={{ background: '#fff', border: '0.5px solid var(--border)', borderRadius: 14, padding: '1.5rem', marginTop: '0.5rem' }}>
            <h3 className="serif" style={{ fontSize: 20, marginBottom: '0.4rem' }}>Export as PDF</h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
              {allComplete
                ? 'Your pitch is complete. Generate a branded PDF ready to share with investors.'
                : `Complete all 10 sections to unlock PDF export. ${SECTIONS.length - filledCount} section${SECTIONS.length - filledCount !== 1 ? 's' : ''} remaining.`}
            </p>
            <button
              onClick={handleGeneratePDF}
              disabled={!allComplete || generatingPDF}
              style={{ width: '100%', minHeight: 44, background: allComplete ? 'var(--ink)' : 'var(--surface)', color: allComplete ? '#fff' : 'var(--muted)', border: `0.5px solid ${allComplete ? 'transparent' : 'var(--border)'}`, borderRadius: 8, fontSize: 14, fontWeight: 500, opacity: generatingPDF ? 0.7 : 1, cursor: allComplete ? 'pointer' : 'default' }}
            >
              {generatingPDF ? 'Generating...' : '↓ Generate PDF'}
            </button>
            {pdfReady && (
              <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', background: '#EAF3DE', borderRadius: 8, fontSize: 13, color: '#3B6D11', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>✓</span><span>PDF generated and downloaded.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE EDITOR CONTENT ───────────────────────────────────────────── */}
      <div className="pb-mobile-only pb-editor-only" style={{ padding: '1.25rem 1.25rem 96px' }}>
        <SectionCard
          section={activeSection}
          index={mobileActiveIdx}
          value={pitch[activeSection.key]}
          onChange={val => updateField(activeSection.key, val)}
          aiEnabled={aiEnabled}
          loadingAI={!!loadingSuggestion[activeSection.key]}
          suggestion={suggestions[activeSection.key]}
          onAISuggest={() => getSuggestion(activeSection.key)}
          onUseSuggestion={() => useSuggestion(activeSection.key)}
          onDismissSuggestion={() => dismissSuggestion(activeSection.key)}
        />
      </div>

      {/* ── MOBILE BOTTOM NAV (editor view, fixed) ─────────────────────────── */}
      <div className="pb-mobile-only pb-editor-only" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid var(--border)', padding: '0.75rem 1.25rem', display: 'flex', gap: 12 }}>
        <button
          onClick={() => setMobileActiveIdx(i => i - 1)}
          disabled={isFirst}
          style={{ flex: 1, minHeight: 44, background: isFirst ? 'var(--surface)' : 'var(--ink)', color: isFirst ? 'var(--muted)' : '#fff', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 14, cursor: isFirst ? 'default' : 'pointer', opacity: isFirst ? 0.4 : 1 }}
        >← Previous</button>
        <button
          onClick={() => setMobileActiveIdx(i => i + 1)}
          disabled={isLast}
          style={{ flex: 1, minHeight: 44, background: isLast ? 'var(--surface)' : 'var(--ink)', color: isLast ? 'var(--muted)' : '#fff', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 14, cursor: isLast ? 'default' : 'pointer', opacity: isLast ? 0.4 : 1 }}
        >Next →</button>
      </div>
    </div>
  )
}

function SectionCard({ section, index, value, onChange, aiEnabled, loadingAI, suggestion, onAISuggest, onUseSuggestion, onDismissSuggestion }) {
  const filled = value?.trim()
  return (
    <div style={{
      marginBottom: '1.25rem',
      background: 'var(--white)',
      border: '0.5px solid var(--border)',
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{
              fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '2px 7px',
              background: filled ? '#EAF3DE' : 'var(--surface)',
              color: filled ? '#3B6D11' : 'var(--muted)',
              border: `0.5px solid ${filled ? '#c3dea8' : 'var(--border)'}`,
            }}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{section.label}</label>
            {filled && <span style={{ fontSize: 11, color: '#3B6D11' }}>✓</span>}
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', paddingLeft: 1 }}>{section.hint}</p>
        </div>
        <button
          onClick={onAISuggest}
          disabled={!aiEnabled || loadingAI}
          title={!aiEnabled ? `Fill ${3} sections first to unlock AI suggestions` : `Get an AI suggestion for ${section.label}`}
          style={{
            fontSize: 11, fontWeight: 500, flexShrink: 0,
            border: `0.5px solid ${aiEnabled ? 'var(--gold)' : 'var(--border)'}`,
            background: aiEnabled ? 'var(--gold-light)' : 'transparent',
            color: aiEnabled ? 'var(--gold)' : 'var(--muted)',
            borderRadius: 6, padding: '5px 10px',
            opacity: (!aiEnabled || loadingAI) ? 0.5 : 1,
            cursor: aiEnabled && !loadingAI ? 'pointer' : 'default',
          }}
        >
          {loadingAI ? '...' : '✨ AI Suggest'}
        </button>
      </div>

      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={section.placeholder}
        rows={4}
        style={{
          width: '100%', border: '0.5px solid var(--border)', borderRadius: 8,
          padding: '10px 14px', fontSize: 14, color: 'var(--ink)',
          background: 'var(--surface)', outline: 'none', lineHeight: 1.65,
          resize: 'vertical', minHeight: 90, boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />

      {suggestion && (
        <div style={{ marginTop: '0.75rem', background: 'var(--gold-light)', border: '0.5px solid var(--gold)', borderRadius: 8, padding: '1rem' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            AI Suggestion — review before using
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--ink)', marginBottom: '0.75rem', fontStyle: 'italic' }}>{suggestion}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onUseSuggestion} style={{ fontSize: 12, fontWeight: 500, background: 'var(--gold)', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 13px', cursor: 'pointer' }}>
              Use this suggestion
            </button>
            <button onClick={onDismissSuggestion} style={{ fontSize: 12, background: 'none', border: '0.5px solid var(--border)', borderRadius: 6, padding: '5px 13px', color: 'var(--muted)', cursor: 'pointer' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
