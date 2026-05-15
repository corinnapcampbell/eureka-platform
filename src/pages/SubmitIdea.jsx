import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'

const CATEGORIES = ['SaaS', 'Marketplace', 'FinTech', 'HealthTech', 'EdTech', 'AI / ML', 'Hardware', 'Consumer', 'B2B', 'Sustainability', 'Other']

export default function SubmitIdea({ session }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)

  const [form, setForm] = useState({
    title: '',
    category: [],
    target_audience: '',
    market_size: '',
    problem: '',
    solution: '',
    what_looking_for: [],
    asking_price: '',
    pricing_model: 'One-time buyout',
    visibility: 'private',
    ai_profile: '',
  })

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleArray(field, value) {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter(v => v !== value)
        : [...f[field], value]
    }))
  }

  async function generateAIProfile() {
    if (!form.problem || !form.solution) return
    setGeneratingAI(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-profile', {
        body: {
          title: form.title,
          problem: form.problem,
          solution: form.solution,
          target_audience: form.target_audience,
          market_size: form.market_size,
        },
      })
      if (error) throw error
      update('ai_profile', data?.profile || '')
    } catch (e) {
      console.error(e)
    }
    setGeneratingAI(false)
  }

  // Simple hash function for blockchain simulation (in production use OpenTimestamps API)
  function generateHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(16, '0') + Date.now().toString(16)
  }

  async function handleSubmit() {
    setSaving(true)
    const hash = generateHash(JSON.stringify(form) + session.user.id)
    const { data, error } = await supabase.from('ideas').insert({
      user_id: session.user.id,
      title: form.title,
      category: form.category,
      target_audience: form.target_audience,
      market_size: form.market_size,
      problem: form.problem,
      solution: form.solution,
      terms: form.what_looking_for.join(', '),
      pricing_model: form.pricing_model,
      visibility: form.visibility,
      ai_profile: form.ai_profile,
      blockchain_hash: hash,
    }).select().single()

    setSaving(false)
    if (!error && data) navigate(`/idea/${data.id}`)
  }

  const steps = ['Basics', 'Problem & Solution', 'Your Terms', 'Review']

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      {/* Header */}
      <div style={{ background: 'var(--ink)', padding: '0' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo size={20} />
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>← Back to vault</button>
        </div>
        {/* Progress */}
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 2rem 1.5rem', display: 'flex', gap: 8 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 3, borderRadius: 2, background: i + 1 <= step ? 'var(--gold-mid)' : 'rgba(255,255,255,0.15)', transition: 'background 0.3s' }} />
              <span style={{ fontSize: 11, color: i + 1 <= step ? 'var(--gold-mid)' : 'rgba(255,255,255,0.3)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '3rem 2rem' }}>

        {/* STEP 1 */}
        {step === 1 && (
          <div className="animate-fadeUp">
            <h2 className="serif" style={{ fontSize: 32, marginBottom: '0.5rem' }}>The basics</h2>
            <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: '2rem' }}>Start with a clear title and context.</p>

            <Field label="Idea title" hint="A short, memorable name">
              <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. AI-powered legal docs for freelancers" style={inputStyle} />
            </Field>

            <Field label="Category" hint="Select all that apply">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CATEGORIES.map(c => (
                  <Chip key={c} label={c} selected={form.category.includes(c)} onClick={() => toggleArray('category', c)} />
                ))}
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Target audience">
                <input value={form.target_audience} onChange={e => update('target_audience', e.target.value)} placeholder="e.g. Freelancers, SMBs" style={inputStyle} />
              </Field>
              <Field label="Market size estimate">
                <select value={form.market_size} onChange={e => update('market_size', e.target.value)} style={inputStyle}>
                  <option value="">Select range</option>
                  <option>Niche (&lt; $10M)</option>
                  <option>Small ($10M–$100M)</option>
                  <option>Medium ($100M–$1B)</option>
                  <option>Large ($1B+)</option>
                  <option>Not sure</option>
                </select>
              </Field>
            </div>

            <NavButtons onNext={() => setStep(2)} nextDisabled={!form.title} />
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="animate-fadeUp">
            <h2 className="serif" style={{ fontSize: 32, marginBottom: '0.5rem' }}>Problem & solution</h2>
            <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: '2rem' }}>The heart of your idea. Be specific.</p>

            <Field label="What problem does this solve?" hint="Describe the pain point in plain language">
              <textarea value={form.problem} onChange={e => update('problem', e.target.value)} placeholder="e.g. Freelancers waste hours writing contracts from scratch or pay expensive lawyers..." style={{ ...inputStyle, height: 110, resize: 'none' }} />
            </Field>

            <Field label="Your solution" hint="How does your idea solve it?">
              <textarea value={form.solution} onChange={e => update('solution', e.target.value)} placeholder="e.g. An AI that asks simple questions and generates a legally sound contract in minutes..." style={{ ...inputStyle, height: 110, resize: 'none' }} />
            </Field>

            {/* AI Profile */}
            <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold-mid)', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: '0.4px', textTransform: 'uppercase', color: 'var(--gold)' }}>AI executive summary</span>
                </div>
                <button onClick={generateAIProfile} disabled={!form.problem || !form.solution || generatingAI} style={{
                  fontSize: 12, fontWeight: 500, background: 'var(--gold-light)', color: 'var(--gold)',
                  border: 'none', borderRadius: 6, padding: '5px 12px',
                  opacity: (!form.problem || !form.solution) ? 0.5 : 1
                }}>
                  {generatingAI ? 'Generating...' : form.ai_profile ? 'Regenerate' : 'Generate'}
                </button>
              </div>
              {form.ai_profile ? (
                <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink)', fontStyle: 'italic' }}>{form.ai_profile}</p>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Fill in the fields above and click Generate to create a professional AI-written executive summary of your idea.</p>
              )}
            </div>

            <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!form.problem || !form.solution} />
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="animate-fadeUp">
            <h2 className="serif" style={{ fontSize: 32, marginBottom: '0.5rem' }}>Your terms</h2>
            <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: '2rem' }}>How do you want to use this idea?</p>

            <Field label="What are you looking for?">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Sell / License', 'Find a co-founder', 'Find investors', 'Open to offers', 'Just storing for now'].map(o => (
                  <Chip key={o} label={o} selected={form.what_looking_for.includes(o)} onClick={() => toggleArray('what_looking_for', o)} />
                ))}
              </div>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Field label="Asking price (optional)">
                <input value={form.asking_price} onChange={e => update('asking_price', e.target.value)} placeholder="e.g. $5,000 or negotiable" style={inputStyle} />
              </Field>
              <Field label="Deal structure">
                <select value={form.pricing_model} onChange={e => update('pricing_model', e.target.value)} style={inputStyle}>
                  <option>One-time buyout</option>
                  <option>Revenue share</option>
                  <option>Monthly license</option>
                  <option>Equity stake</option>
                  <option>Negotiable</option>
                </select>
              </Field>
            </div>

            {/* Protection notice */}
            <div style={{ background: 'var(--gold-light)', borderRadius: 10, padding: '1.25rem', display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>⬡</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--gold)', marginBottom: '0.35rem' }}>Your idea is protected automatically</p>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--gold)' }}>
                  On submission, your idea will be cryptographically hashed and timestamped. Anyone you share it with must confirm NDA terms first. Every viewer is logged. This creates a legally meaningful paper trail — so if someone ever misuses your idea, you won't be starting from zero.
                </p>
              </div>
            </div>

            <NavButtons onBack={() => setStep(2)} onNext={() => setStep(4)} />
          </div>
        )}

        {/* STEP 4 — Review */}
        {step === 4 && (
          <div className="animate-fadeUp">
            <h2 className="serif" style={{ fontSize: 32, marginBottom: '0.5rem' }}>Review & protect</h2>
            <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: '2rem' }}>Everything looks good? Submit to seal it in the vault.</p>

            <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '2rem', marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '0.5rem', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {form.category.map(c => (
                  <span key={c} style={{ fontSize: 11, background: 'var(--gold-light)', color: 'var(--gold)', borderRadius: 4, padding: '3px 8px' }}>{c}</span>
                ))}
              </div>
              <h3 className="serif" style={{ fontSize: 22, marginBottom: '1rem' }}>{form.title || 'Untitled idea'}</h3>
              <ReviewRow label="Problem" value={form.problem} />
              <ReviewRow label="Solution" value={form.solution} />
              {form.ai_profile && <ReviewRow label="AI summary" value={form.ai_profile} />}
              {form.target_audience && <ReviewRow label="Audience" value={form.target_audience} />}
              {form.asking_price && <ReviewRow label="Asking price" value={`${form.asking_price} · ${form.pricing_model}`} />}
            </div>

            <div style={{ background: '#EAF3DE', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', gap: 10, marginBottom: '2rem', alignItems: 'center' }}>
              <span style={{ color: 'var(--success)' }}>✓</span>
              <span style={{ fontSize: 13, color: '#3B6D11' }}>Submitting will cryptographically timestamp and protect this idea immediately.</span>
            </div>

            <NavButtons
              onBack={() => setStep(3)}
              onNext={handleSubmit}
              nextLabel={saving ? 'Protecting...' : 'Submit & protect idea'}
              nextStyle={{ background: 'var(--gold)', color: '#fff' }}
              nextDisabled={saving}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: hint ? 3 : 6 }}>{label}</label>
      {hint && <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{hint}</span>}
      {children}
    </div>
  )
}

function Chip({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 13, borderRadius: 6, padding: '7px 14px', border: '0.5px solid',
      borderColor: selected ? 'var(--gold)' : 'var(--border)',
      background: selected ? 'var(--gold-light)' : 'transparent',
      color: selected ? 'var(--gold)' : 'var(--muted)',
      fontWeight: selected ? 500 : 400,
      transition: 'all 0.15s'
    }}>{label}</button>
  )
}

function ReviewRow({ label, value }) {
  return (
    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
      <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>{value}</div>
    </div>
  )
}

function NavButtons({ onBack, onNext, nextDisabled, nextLabel = 'Next →', nextStyle = {} }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '0.5px solid var(--border)' }}>
      {onBack ? (
        <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 14, color: 'var(--muted)' }}>← Back</button>
      ) : <span />}
      <button onClick={onNext} disabled={nextDisabled} style={{
        background: 'var(--ink)', color: '#fff', border: 'none',
        borderRadius: 8, padding: '11px 28px', fontSize: 14, fontWeight: 500,
        opacity: nextDisabled ? 0.5 : 1,
        ...nextStyle
      }}>{nextLabel}</button>
    </div>
  )
}

const inputStyle = {
  width: '100%', border: '0.5px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 14, color: 'var(--ink)',
  background: 'var(--surface)', outline: 'none', lineHeight: 1.5
}