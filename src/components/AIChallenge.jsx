import { useState } from 'react'

const SYSTEM_PROMPT = 'You are a tough but fair investor evaluating a startup pitch. Your job is to identify weaknesses and ask hard questions. Be direct and specific. If the content is genuinely strong and complete, say so honestly — do not force criticism where none is warranted.'

function buildUserMessage(sectionLabel, content) {
  return `Section: ${sectionLabel}
Content: ${content}

Evaluate this section of a startup pitch. If there are weaknesses:
1. Ask 1-3 specific tough investor questions about this section
2. Give a concrete suggestion for how to strengthen it

If this section is genuinely strong and addresses likely investor concerns well, respond with:
STRONG: [brief positive note]

Format your response as JSON:
{
  "strong": true/false,
  "strongNote": "note if strong",
  "questions": ["q1", "q2", "q3"],
  "suggestion": "improvement suggestion"
}`
}

function parseResponse(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/)
  return JSON.parse(match ? match[1] : text)
}

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
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: buildUserMessage(sectionLabel, content) }],
        }),
      })
      console.log('AI Challenge response status:', res.status)
      if (!res.ok) {
        const errorText = await res.text()
        console.log('AI Challenge error body:', errorText)
        throw new Error(`HTTP ${res.status}`)
      }
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      setResult(parseResponse(text))
    } catch (err) {
      console.log('AI Challenge caught error:', err)
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
