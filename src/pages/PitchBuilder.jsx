import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'
import jsPDF from 'jspdf'

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

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', ideaId)
        .single()
      if (data) {
        setIdea(data)
        const loaded = {
          tagline:              data.tagline              || '',
          problem:              data.problem              || '',
          solution:             data.solution             || '',
          how_it_works:         data.how_it_works         || '',
          target_audience:      data.target_audience      || '',
          market_size:          data.market_size          || '',
          business_model:       data.business_model       || '',
          competitive_advantage:data.competitive_advantage|| '',
          risks:                data.risks                || '',
          next_steps:           data.next_steps           || '',
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
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pitch-section`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            section: sectionKey,
            idea_title: idea?.title,
            ...Object.fromEntries(SECTIONS.map(s => [s.key, pitchRef.current[s.key]])),
          }),
        }
      )
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
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      const W = 210, H = 297, ml = 20, contentW = 170
      const navy  = [14, 14, 31]
      const accent = [123, 159, 247]
      const gray  = [89, 89, 89]
      const date  = idea?.created_at
        ? new Date(idea.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

      function addAccentLines() {
        doc.setDrawColor(...accent)
        doc.setLineWidth(0.5)
        doc.line(0, 5, W, 5)
        doc.line(0, H - 5, W, H - 5)
      }

      // ── COVER ─────────────────────────────────────────────────
      doc.setFillColor(...navy)
      doc.rect(0, 0, W, H, 'F')
      addAccentLines()

      // Logo
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(255, 255, 255)
      doc.text('Eurek', ml, 19)
      const eurekW = doc.getTextWidth('Eurek')
      doc.setTextColor(...accent)
      doc.text('AI', ml + eurekW, 19)
      const aiW = doc.getTextWidth('AI')
      doc.setTextColor(255, 255, 255)
      doc.text('dea', ml + eurekW + aiW, 19)

      // CONFIDENTIAL top-right
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(55, 55, 75)
      doc.text('CONFIDENTIAL', W - ml, 19, { align: 'right' })

      // Title
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(30)
      doc.setTextColor(255, 255, 255)
      const titleLines = doc.splitTextToSize(idea?.title || 'Untitled Idea', contentW)
      const titleY = 125
      doc.text(titleLines, W / 2, titleY, { align: 'center' })

      // Tagline
      if (pitch.tagline?.trim()) {
        const tagY = titleY + titleLines.length * 11.5 + 8
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(13)
        doc.setTextColor(150, 150, 190)
        const tagLines = doc.splitTextToSize(pitch.tagline, contentW - 20)
        doc.text(tagLines, W / 2, tagY, { align: 'center' })
      }

      // Owner + date
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 135)
      doc.text(session?.user?.email || '', W / 2, 198, { align: 'center' })
      doc.text(`Submitted ${date}`, W / 2, 206, { align: 'center' })

      // Divider
      doc.setDrawColor(40, 40, 58)
      doc.setLineWidth(0.25)
      doc.line(ml + 35, 213, W - ml - 35, 213)

      // Hash
      if (idea?.blockchain_hash) {
        doc.setFontSize(6.5)
        doc.setTextColor(50, 50, 70)
        const hashText = `Timestamp hash: ${idea.blockchain_hash}`
        const hashLines = doc.splitTextToSize(hashText, contentW)
        doc.text(hashLines, W / 2, 258, { align: 'center' })
      }

      // CONFIDENTIAL bottom-right stamp
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(40, 40, 60)
      doc.text('CONFIDENTIAL', W - ml, H - 14, { align: 'right' })

      // ── CONTENT PAGES ─────────────────────────────────────────
      const pageGroups = [
        [{ label: 'The Problem',           content: pitch.problem },
         { label: 'The Solution',          content: pitch.solution }],
        [{ label: 'How It Works',          content: pitch.how_it_works },
         { label: 'Target Market',         content: pitch.target_audience }],
        [{ label: 'Market Size',           content: pitch.market_size },
         { label: 'Business Model',        content: pitch.business_model }],
        [{ label: 'Competitive Advantage', content: pitch.competitive_advantage },
         { label: 'Risks & Challenges',    content: pitch.risks }],
        [{ label: 'Next Steps',            content: pitch.next_steps }],
      ]

      pageGroups.forEach(sections => {
        doc.addPage()
        addAccentLines()
        let y = 26

        sections.forEach(({ label, content }, idx) => {
          if (idx > 0) y += 14
          // Section heading
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(12)
          doc.setTextColor(...navy)
          doc.text(label.toUpperCase(), ml, y)
          y += 1.5
          // Accent underline
          doc.setDrawColor(...accent)
          doc.setLineWidth(0.3)
          doc.line(ml, y, ml + doc.getTextWidth(label.toUpperCase()), y)
          y += 7
          // Content
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(10.5)
          doc.setTextColor(...gray)
          const lines = doc.splitTextToSize(content?.trim() || '—', contentW)
          // Handle overflow — add new page if needed
          lines.forEach(line => {
            if (y > H - 22) {
              doc.addPage()
              addAccentLines()
              y = 26
            }
            doc.text(line, ml, y)
            y += 5.8
          })
        })
      })

      // ── FOOTERS (post-pass, skip cover) ─────────────────────
      const total = doc.getNumberOfPages()
      for (let p = 2; p <= total; p++) {
        doc.setPage(p)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(150, 150, 160)
        doc.text(`EurekAIdea · Confidential · ${date}`, ml, H - 10)
        doc.setTextColor(...accent)
        doc.text('Protected & Presented by eurekAIdea', W / 2, H - 10, { align: 'center' })
        doc.setTextColor(150, 150, 160)
        doc.text(`${p} / ${total}`, W - ml, H - 10, { align: 'right' })
      }

      // ── SAVE ─────────────────────────────────────────────────
      const slug = (idea?.title || 'idea').replace(/[^a-z0-9]+/gi, '-').toLowerCase()
      doc.save(`${slug}-eurekAIdea-pitch.pdf`)
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>

      {/* Header */}
      <div style={{ background: 'var(--ink)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo size={20} />
          <button onClick={() => navigate(`/idea/${ideaId}`)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }}>
            ← Back to idea
          </button>
        </div>
      </div>

      {/* Title + progress */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '2.5rem 2rem 0' }}>
        <div style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>Pitch Builder</span>
        </div>
        <h1 className="serif" style={{ fontSize: 30, marginBottom: '0.25rem' }}>{idea?.title}</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: '1.75rem' }}>
          Fill in all 10 sections to generate a branded investor PDF. Auto-saves as you type.
        </p>

        {/* Progress bar */}
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
            <div style={{
              height: '100%',
              width: `${(filledCount / SECTIONS.length) * 100}%`,
              background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)',
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Sections */}
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

        {/* PDF export */}
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
              style={{
                background: allComplete ? 'var(--ink)' : 'var(--surface)',
                color: allComplete ? '#fff' : 'var(--muted)',
                border: `0.5px solid ${allComplete ? 'transparent' : 'var(--border)'}`,
                borderRadius: 8, padding: '11px 26px', fontSize: 14, fontWeight: 500,
                opacity: generatingPDF ? 0.7 : 1, flexShrink: 0, cursor: allComplete ? 'pointer' : 'default',
              }}
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
  )
}

function SectionCard({ section, index, value, onChange, aiEnabled, loadingAI, suggestion, onAISuggest, onUseSuggestion, onDismissSuggestion }) {
  const filled = value?.trim()
  return (
    <div style={{
      marginBottom: '1.25rem',
      background: 'var(--white)',
      border: `0.5px solid ${filled ? 'var(--border)' : 'var(--border)'}`,
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
            <button onClick={onUseSuggestion} style={{
              fontSize: 12, fontWeight: 500, background: 'var(--gold)', color: '#fff',
              border: 'none', borderRadius: 6, padding: '5px 13px', cursor: 'pointer',
            }}>
              Use this suggestion
            </button>
            <button onClick={onDismissSuggestion} style={{
              fontSize: 12, background: 'none', border: '0.5px solid var(--border)',
              borderRadius: 6, padding: '5px 13px', color: 'var(--muted)', cursor: 'pointer',
            }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
