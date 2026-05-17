import { useState } from 'react'
import { supabase } from '../supabase'


export default function AIChallenge({ sectionKey, sectionLabel, content, isPaid }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  if (!isPaid) return null

  async function handleChallenge() {
    if (!content?.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const fnUrl = 'https://gvjtmyesrrdwkcwkusiz.supabase.co/functions/v1/ai-challenge'
      const response = await fetch(
        fnUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ sectionLabel, content }),
        }
      )
      const result = await response.json()
      if (result.error) {
        setError('Unable to analyse right now: ' + result.error)
      } else {
        setResult(result)
      }
    } catch {
      setError('Unable to analyse right now. Please try again.')
    }
    setLoading(false)
  }

  const btnStyle = {
    background: 'linear-gradient(#0e0e1f, #0e0e1f) padding-box, linear-gradient(90deg, #7b9ff7, #9b7ff7) border-box',
    border: '1px solid transparent',
    borderRadius: 8,
    padding: '7px 14px',
    minHeight: 36,
    fontSize: 12,
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 300,
    color: loading ? 'rgba(123,159,247,0.5)' : '#a5b4fc',
    cursor: loading || !content?.trim() ? 'not-allowed' : 'pointer',
    opacity: !content?.trim() ? 0.4 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    animation: loading ? 'aicPulse 1.4s ease-in-out infinite' : 'none',
  }

  return (
    <div style={{ marginTop: 14 }}>
      <style>{`@keyframes aicPulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      {!result && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleChallenge} disabled={loading || !content?.trim()} style={btnStyle}>
            {loading ? 'Analysing…' : '⚡ Challenge with AI'}
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'right', marginTop: 6, fontFamily: "'Outfit', sans-serif" }}>
          {error}
        </p>
      )}

      {result && (
        <div style={{
          background: '#0e0e1f', border: '1px solid #1a1a3a', borderRadius: 12,
          padding: 20, position: 'relative',
        }}>
          <button
            onClick={() => { setResult(null); setError(null) }}
            style={{
              position: 'absolute', top: 10, right: 12,
              background: 'none', border: 'none', color: '#444',
              cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 4,
            }}
          >✕</button>

          <p style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
            marginBottom: 14, fontFamily: "'Outfit', sans-serif",
            background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            AI Investor Challenge
          </p>

          {result.strong ? (
            <p style={{ fontSize: 13, color: '#22c55e', lineHeight: 1.65, fontFamily: "'Outfit', sans-serif" }}>
              ✓ {result.strongNote || 'This section looks strong. No major concerns.'}
            </p>
          ) : (
            <>
              {result.questions?.length > 0 && (
                <ol style={{ paddingLeft: 18, margin: '0 0 14px 0' }}>
                  {result.questions.map((q, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 6, fontFamily: "'Outfit', sans-serif", fontWeight: 300 }}>
                      {q}
                    </li>
                  ))}
                </ol>
              )}
              {result.suggestion && (
                <div style={{ borderLeft: '3px solid #7b9ff7', paddingLeft: 12 }}>
                  <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7, fontFamily: "'Outfit', sans-serif", fontWeight: 300 }}>
                    💡 {result.suggestion}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
