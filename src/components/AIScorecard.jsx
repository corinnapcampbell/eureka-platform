import { useState } from 'react'
import { supabase } from '../supabase'

const DIMENSIONS = [
  { key: 'originality',        label: 'Originality',                  weight: 0.06 },
  { key: 'problem_clarity',    label: 'Problem Clarity',              weight: 0.06 },
  { key: 'solution_fit',       label: 'Solution Fit',                 weight: 0.06 },
  { key: 'feasibility',        label: 'Feasibility',                  weight: 0.06 },
  { key: 'market_size',        label: 'Market Size',                  weight: 0.06 },
  { key: 'market_timing',      label: 'Market Timing',                weight: 0.06 },
  { key: 'competition_level',  label: 'Competition Level',            weight: 0.05 },
  { key: 'revenue_potential',  label: 'Revenue Potential',            weight: 0.06 },
  { key: 'business_model',     label: 'Business Model Clarity',       weight: 0.06 },
  { key: 'go_to_market',       label: 'Go-to-Market Viability',       weight: 0.05 },
  { key: 'team_fit',           label: 'Team Fit',                     weight: 0.05 },
  { key: 'next_steps',         label: 'Next Steps Clarity',           weight: 0.05 },
  { key: 'ip_defensibility',   label: 'IP / Defensibility',           weight: 0.05 },
  { key: 'scalability',        label: 'Scalability',                  weight: 0.06 },
  { key: 'regulatory_risk',    label: 'Regulatory Risk',              weight: 0.05 },
  { key: 'customer_validation',label: 'Customer Validation',          weight: 0.05 },
  { key: 'capital_efficiency', label: 'Capital Efficiency',           weight: 0.05 },
  { key: 'impact',             label: 'Social / Environmental Impact', weight: 0.04 },
]

function scoreColor(s) {
  if (s >= 8) return '#22c55e'
  if (s >= 6) return '#7b9ff7'
  if (s >= 4) return '#eab308'
  if (s >= 2) return '#f59e0b'
  return '#ef4444'
}

function ideaHash(idea) {
  const fields = ['title','problem','solution','how_it_works','business_model',
    'tagline','target_audience','market_size','competitive_advantage',
    'risks','next_steps']
  return fields.map(f => String(idea[f] || '')).join('|').length
}

export default function AIScorecard({ idea, ideaId, isPaid = false, readOnly = false }) {
  const saved = idea.ai_scorecard || null
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scorecard, setScorecard] = useState(saved)
  const [locked, setLocked] = useState(false)
  const [remaining, setRemaining] = useState(null)

  const currentHash = ideaHash(idea)
  const needsRefresh = scorecard && scorecard.idea_hash !== currentHash

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const prompt = `You are an expert startup evaluator. Score this idea on 18 dimensions, each 1-10.

Idea:
Title: ${idea.title || ''}
Problem: ${idea.problem || ''}
Solution: ${idea.solution || ''}
How it works: ${idea.how_it_works || ''}
Business model: ${idea.business_model ? JSON.stringify(idea.business_model) : ''}
Tagline: ${idea.tagline || ''}
Target audience: ${idea.target_audience || ''}
Market size: ${idea.market_size || ''}
Competitive advantage: ${idea.competitive_advantage || ''}
Risks: ${idea.risks || ''}
Next steps: ${idea.next_steps || ''}
Team: ${idea.team ? (() => { try { const t = JSON.parse(idea.team); return `${t.name || ''}, ${t.role || ''}. ${t.bio || ''} ${t.origin || ''}` } catch { return idea.team } })() : ''}
Customer validation: ${idea.customer_validation ? (() => { try { const c = JSON.parse(idea.customer_validation); return `Waitlist: ${c.waitlist || 0}, Interviews: ${c.interviews || 0}, Pilots: ${c.pilots || 0}, Stage: ${c.stage || 'unknown'}` } catch { return idea.customer_validation } })() : ''}
Traction & milestones: ${idea.traction ? (() => { try { const tr = JSON.parse(idea.traction); return (tr.milestones || []).map(m => `${m.label} (${m.status}, ${m.date || 'no date'})`).join('; ') } catch { return idea.traction } })() : ''}

Return ONLY valid JSON, no markdown, no explanation, in this exact shape:
{
  "scores": [
    {
      "key": "originality",
      "score": 7,
      "rationale": "One sentence describing what this score reflects.",
      "issues": "One sentence describing the main weakness or gap that hurt this score.",
      "suggestion": "One specific actionable improvement the owner could make."
    }
  ]
}

Keys must be exactly: originality, problem_clarity, solution_fit, feasibility, market_size, market_timing, competition_level, revenue_potential, business_model, go_to_market, team_fit, next_steps, ip_defensibility, scalability, regulatory_risk, customer_validation, capital_efficiency, impact.
Score 1 = very weak, 10 = exceptional. Be honest and direct.`

      const { data: { session: aiSession } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-scorecard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aiSession?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ prompt, target_key: ideaId }),
        }
      )
      if (res.status === 429) {
        const errData = await res.json().catch(() => ({}))
        if (errData.reason === 'countdown_exhausted' || errData.reason === 'pool_exhausted') {
          setLocked(true)
        } else {
          setError('Usage limit reached. Please try again later.')
        }
        return
      }
      const rem = parseInt(res.headers.get('X-AI-Remaining'))
      if (!isNaN(rem)) setRemaining(rem)
      const parsed = await res.json()

      const overall = DIMENSIONS.reduce((acc, d) => {
        const s = parsed.scores.find(x => x.key === d.key)
        return acc + (s ? s.score * d.weight : 0)
      }, 0)

      const result = {
        scores: parsed.scores,
        overall: Math.round(overall * 10) / 10,
        generated_at: new Date().toISOString(),
        idea_hash: currentHash,
      }

      await supabase.from('ideas').update({ ai_scorecard: result }).eq('id', ideaId)
      setScorecard(result)
    } catch (e) {
      setError('Failed to generate score. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const hasScore = scorecard && scorecard.scores

  return (
    <div id="section-ai-scorecard" style={{ background: '#0e0e1f', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
      {/* Header row — always visible */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🏆</span>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.35)' }}>AI Investor Scorecard</span>
          {hasScore && (
            <span style={{ fontSize: 13, fontWeight: 700, color: scoreColor(scorecard.overall), marginLeft: 8 }}>
              {scorecard.overall} / 10
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div style={{ marginTop: '1.25rem' }}>
          {/* Generate / Refresh button — owner only */}
          {!readOnly && (
            <div style={{ marginBottom: '1.25rem' }}>
              {needsRefresh && (
                <p style={{ fontSize: 11, color: '#f59e0b', marginBottom: 8, fontFamily: "'Outfit', sans-serif" }}>
                  ⚠️ Your idea has changed since the last score. Refresh for updated results.
                </p>
              )}
              {locked ? (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 16px' }}>
                  <p style={{ fontSize: 12, color: '#ef4444', fontFamily: "'Outfit', sans-serif", margin: '0 0 10px' }}>
                    You've used all your free AI scorecard refreshes for this idea.
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button disabled title="Coming soon" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: 'rgba(239,68,68,0.5)', cursor: 'not-allowed', fontFamily: "'Outfit', sans-serif" }}>
                      {isPaid ? 'Get 10 more for $1.99' : 'Get 10 more for this idea — $2.99'}
                    </button>
                    <a href="/pricing" style={{ fontSize: 12, padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(123,159,247,0.4)', background: 'rgba(123,159,247,0.1)', color: '#a5b4fc', textDecoration: 'none', fontFamily: "'Outfit', sans-serif" }}>
                      Upgrade to Pro →
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    onClick={generate}
                    disabled={loading}
                    style={{
                      background: loading ? 'rgba(123,159,247,0.3)' : 'linear-gradient(90deg,#7b9ff7,#9b7ff7)',
                      border: 'none', borderRadius: 10, padding: '10px 20px',
                      fontSize: 13, fontWeight: 600, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {loading ? 'Analyzing…' : hasScore ? (needsRefresh ? '🔄 Refresh Score' : '🔄 Regenerate Score') : '✨ Generate AI Score'}
                  </button>
                  {remaining !== null && (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Outfit', sans-serif" }}>
                      {isPaid && remaining >= 10 ? null : `${remaining} refreshes left`}
                    </span>
                  )}
                </div>
              )}
              {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>{error}</p>}
            </div>
          )}

          {/* No score yet */}
          {!hasScore && !loading && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontFamily: "'Outfit', sans-serif" }}>
              {readOnly ? 'The owner has not generated a score yet.' : 'Generate your AI score to see how investors will evaluate this idea.'}
            </p>
          )}

          {/* Score display */}
          {hasScore && (
            <div>
              {/* Overall score */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 10 }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: scoreColor(scorecard.overall), fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>
                  {scorecard.overall}
                </span>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 2 }}>Overall Score</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>out of 10 · {new Date(scorecard.generated_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Dimension bars */}
              {DIMENSIONS.map(d => {
                const s = scorecard.scores.find(x => x.key === d.key)
                if (!s) return null
                const color = scoreColor(s.score)
                return (
                  <div key={d.key} style={{ marginBottom: '1.1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: "'Outfit', sans-serif" }}>{d.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "'Outfit', sans-serif" }}>{s.score}/10</span>
                    </div>
                    {/* Bar */}
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${s.score * 10}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
                    </div>
                    {/* Rationale — visible to all */}
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, fontFamily: "'Outfit', sans-serif", lineHeight: 1.5 }}>{s.rationale}</p>
                    {/* Issues — visible to owner (free + paid) */}
                    {!readOnly && s.issues && (
                      <p style={{ fontSize: 11, color: '#f59e0b', margin: '4px 0 0', fontFamily: "'Outfit', sans-serif", lineHeight: 1.5 }}>⚠️ {s.issues}</p>
                    )}
                    {/* Suggestion — paid owner only */}
                    {isPaid && s.suggestion && (
                      <p style={{ fontSize: 11, color: '#7b9ff7', margin: '4px 0 0', fontFamily: "'Outfit', sans-serif", lineHeight: 1.5 }}>💡 {s.suggestion}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
