import { useEffect, useRef, useState } from 'react'

const RADIUS = 52
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function isBMFilled(raw) {
  if (!raw) return false
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.models)) {
      return parsed.models.length > 0
    }
  } catch {}
  return String(raw).trim().length > 0
}

function hasValue(v) {
  return v !== null && v !== undefined && String(v).trim().length > 0
}

const CRITERIA = [
  { key: 'title',                 pts: 10, label: 'Add an idea title' },
  { key: 'problem',               pts: 10, label: 'Describe the problem' },
  { key: 'solution',              pts: 10, label: 'Describe the solution' },
  { key: 'how_it_works',         pts: 10, label: 'Describe how it works' },
  { key: 'key_details',           pts: 10, label: 'Add key details' },
  { key: 'business_model',       pts: 15, label: 'Define your business model', custom: isBMFilled },
  { key: 'tagline',               pts: 5,  label: 'Add your tagline' },
  { key: 'target_audience',      pts: 5,  label: 'Define your target audience' },
  { key: 'market_size',           pts: 5,  label: 'Specify your market size' },
  { key: 'competitive_advantage', pts: 5,  label: 'Describe your competitive advantage' },
  { key: 'risks',                 pts: 5,  label: 'List your risks & challenges' },
  { key: 'next_steps',            pts: 5,  label: 'Outline your next steps' },
  { key: 'pdf_published',         pts: 5,  label: 'Publish your pitch PDF',  check: idea => idea.pdf_published === true },
  { key: 'deck_published',        pts: 5,  label: 'Publish your pitch deck', check: idea => idea.deck_published === true },
]

const TOTAL_PTS = CRITERIA.reduce((s, c) => s + c.pts, 0)

function ringColor(pct) {
  if (pct === 100) return '#22c55e'
  if (pct >= 71)   return '#7b9ff7'
  if (pct >= 41)   return '#f59e0b'
  return '#ef4444'
}

export default function Scorecard({ idea }) {
  const [animated, setAnimated] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => setAnimated(true), 80)
    return () => clearTimeout(timerRef.current)
  }, [])

  let earned = 0
  const missing = []

  for (const c of CRITERIA) {
    let done = false
    if (c.check) {
      done = c.check(idea)
    } else if (c.custom) {
      done = c.custom(idea[c.key])
    } else {
      done = hasValue(idea[c.key])
    }
    if (done) earned += c.pts
    else missing.push(c.label)
  }

  const pct = Math.round((earned / TOTAL_PTS) * 100)
  const color = ringColor(pct)
  const offset = animated ? CIRCUMFERENCE * (1 - pct / 100) : CIRCUMFERENCE

  return (
    <div style={{
      background: '#0e0e1f',
      border: '1px solid #1a1a3a',
      borderRadius: 16,
      padding: '1.25rem 1.5rem',
      marginBottom: '1.25rem',
      fontFamily: "'Outfit', sans-serif",
      fontWeight: 300,
    }}>
      <p style={{
        fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '1px', color: 'rgba(255,255,255,0.3)', marginBottom: '1.1rem',
      }}>
        Idea Completeness
      </p>

      <div style={{ display: 'flex', gap: '1.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Progress ring */}
        <div style={{ flexShrink: 0, position: 'relative', width: 120, height: 120 }}>
          <svg width="120" height="120" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
            <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#1a1a2e" strokeWidth="10" />
            <circle
              cx="60" cy="60" r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{pct}%</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>Complete</span>
          </div>
        </div>

        {/* Checklist */}
        <div style={{ flex: 1, minWidth: 160 }}>
          {pct === 100 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 500 }}>
                Your idea page is complete!
              </span>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginBottom: 9, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Missing
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {missing.map((label, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: '#ef4444', flexShrink: 0, display: 'inline-block',
                    }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
