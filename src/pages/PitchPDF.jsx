import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const FIELDS = [
  { key: 'tagline',               label: 'Tagline',               hint: 'One punchy sentence capturing the essence of your idea', rows: 2 },
  { key: 'problem',               label: 'Problem',               hint: 'What pain point does this solve?',                        rows: 4 },
  { key: 'solution',              label: 'Solution',              hint: 'How does your idea solve the problem?',                   rows: 4 },
  { key: 'how_it_works',          label: 'How It Works',          hint: 'Step-by-step breakdown of the product or process',        rows: 4 },
  { key: 'market_size',           label: 'Market Size',           hint: 'TAM / SAM / SOM with dollar figures',                    rows: 3 },
  { key: 'target_audience',       label: 'Target Market',         hint: 'Who are your primary customers?',                        rows: 3 },
  { key: 'business_model',        label: 'Business Model',        hint: 'Free tier, paid tier, pricing structure',                 rows: 4 },
  { key: 'competitive_advantage', label: 'Competitive Advantage', hint: 'What makes this uniquely positioned to win?',            rows: 4 },
  { key: 'risks',                 label: 'Risks & Challenges',    hint: 'Key risks and how you plan to address them',             rows: 4 },
  { key: 'next_steps',            label: 'Next Steps',            hint: 'Immediate action items to move forward',                 rows: 4 },
]

export default function PitchPDF({ session }) {
  const { ideaId } = useParams()
  const navigate   = useNavigate()
  const [idea,      setIdea]      = useState(null)
  const [form,      setForm]      = useState({})
  const [loading,   setLoading]   = useState(true)
  const [suggesting, setSuggesting] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('ideas').select('*').eq('id', ideaId).single()
      if (data) {
        setIdea(data)
        setForm({
          tagline:               data.tagline               || '',
          problem:               data.problem               || '',
          solution:              data.solution              || '',
          how_it_works:          data.how_it_works          || '',
          market_size:           data.market_size           || '',
          target_audience:       data.target_audience       || '',
          business_model:        data.business_model        || '',
          competitive_advantage: data.competitive_advantage || '',
          risks:                 data.risks                 || '',
          next_steps:            data.next_steps            || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [ideaId])

  async function aiSuggest(fieldKey) {
    setSuggesting(fieldKey)
    try {
      const res = await fetch('/api/functions/improve-pitch-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: { ...idea, ...form },
          field: fieldKey,
          currentValue: form[fieldKey],
        }),
      })
      if (res.ok) {
        const { improved } = await res.json()
        if (improved) setForm(f => ({ ...f, [fieldKey]: improved }))
      }
    } catch (e) {
      console.error('AI suggest error:', e)
    }
    setSuggesting(null)
  }

  function handleGenerate() {
    console.log('Pitch form values:', form)
  }

  if (loading) return (
    <div style={{ height: '100vh', background: '#0e0e1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  if (!idea) return (
    <div style={{ height: '100vh', background: '#0e0e1f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Idea not found.</p>
      <button onClick={() => navigate('/dashboard')} style={{ color: '#7b9ff7', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer' }}>← Back to dashboard</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3' }}>
      {/* Gradient accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' }} />

      {/* Dark header */}
      <div style={{ background: '#0e0e1f', padding: '1.25rem 1.5rem 1.75rem' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <button
              onClick={() => navigate(`/idea/${ideaId}`)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
            >
              ← Back to idea
            </button>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 300, fontSize: 15 }}>
              <span style={{ color: 'rgba(255,255,255,0.88)' }}>Eurek</span>
              <span style={{ color: '#7b9ff7' }}>AI</span>
              <span style={{ color: 'rgba(255,255,255,0.88)' }}>dea</span>
            </span>
          </div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: '#fff', marginBottom: '0.3rem', letterSpacing: '-0.3px' }}>
            Build Your Pitch PDF
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{idea.title}</p>
        </div>
      </div>

      {/* Form */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.25rem 5rem' }}>

        <p style={{ fontSize: 13, color: '#888780', marginBottom: '1.5rem', lineHeight: 1.65 }}>
          Review and refine each section below. Use <strong style={{ color: '#7b9ff7' }}>✨ AI Suggest</strong> to generate a polished version of any field based on your full idea context.
        </p>

        {FIELDS.map(({ key, label, hint, rows }) => (
          <div
            key={key}
            style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: '#b0b0a8' }}>{hint}</div>
              </div>
              <button
                onClick={() => aiSuggest(key)}
                disabled={!!suggesting}
                style={{
                  background: suggesting === key ? 'rgba(123,159,247,0.12)' : 'rgba(123,159,247,0.07)',
                  border: '0.5px solid rgba(123,159,247,0.28)',
                  borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#7b9ff7',
                  cursor: suggesting ? 'not-allowed' : 'pointer',
                  fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
                  opacity: suggesting && suggesting !== key ? 0.45 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {suggesting === key ? '…thinking' : '✨ AI Suggest'}
              </button>
            </div>
            <textarea
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              rows={rows}
              placeholder={`Enter ${label.toLowerCase()}…`}
              style={{
                width: '100%', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 8,
                padding: '10px 12px', fontSize: 14, color: '#2c2c2a', lineHeight: 1.7,
                resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                background: '#fafaf8', outline: 'none',
              }}
            />
          </div>
        ))}

        <button
          onClick={handleGenerate}
          style={{
            width: '100%', background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)',
            color: '#fff', border: 'none', borderRadius: 12, padding: '16px',
            fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem',
            letterSpacing: '0.2px',
          }}
        >
          ✨ Generate Preview
        </button>
      </div>
    </div>
  )
}
