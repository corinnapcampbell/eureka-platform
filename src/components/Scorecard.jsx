import { useEffect, useRef, useState } from 'react'

const R = 31
const CIRCUMFERENCE = 2 * Math.PI * R

function isBMFilled(raw) {
  if (!raw) return false
  try {
    const bm = typeof raw === 'string' ? JSON.parse(raw) : raw
    return !!(bm && Array.isArray(bm.models) && bm.models.length > 0)
  } catch {
    return false
  }
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

// Fields that map to a non-standard section ID
const SECTION_ID_MAP = {
  pdf_published: 'section-pitch-docs',
  deck_published: 'section-pitch-docs',
}

function ringColor(pct) {
  if (pct === 100) return '#22c55e'
  if (pct >= 71)   return '#7b9ff7'
  if (pct >= 41)   return '#f59e0b'
  return '#ef4444'
}

function handleMissingClick(field, setOpen) {
  setOpen(false)
  const sectionId = SECTION_ID_MAP[field] || ('section-' + field)
  const el = document.getElementById(sectionId)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  window.dispatchEvent(new CustomEvent('openEditSection', { detail: { field } }))
  el.classList.add('section-highlight')
  setTimeout(() => el.classList.remove('section-highlight'), 3000)
}

export default function Scorecard({ idea }) {
  const [animated, setAnimated] = useState(false)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => setAnimated(true), 80)
    return () => clearTimeout(timerRef.current)
  }, [])

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  let earned = 0
  const missing = []

  for (const c of CRITERIA) {
    let done = false
    if (c.check)       done = c.check(idea)
    else if (c.custom) done = c.custom(idea[c.key])
    else               done = hasValue(idea[c.key])
    if (done) earned += c.pts
    else missing.push({ label: c.label, field: c.key })
  }

  const pct = Math.round((earned / TOTAL_PTS) * 100)
  const color = ringColor(pct)
  const offset = animated ? CIRCUMFERENCE * (1 - pct / 100) : CIRCUMFERENCE

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>

      {/* Compact ring trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Idea completeness: ${pct}%. Click to see missing items.`}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        }}
      >
        <span style={{
          fontSize: 9, color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          fontFamily: "'Outfit', sans-serif", fontWeight: 400, whiteSpace: 'nowrap',
        }}>
          Idea Completeness
        </span>
        <div style={{ position: 'relative', width: 72, height: 72 }}>
          <svg width="72" height="72" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
            <circle cx="36" cy="36" r={R} fill="none" stroke="#1a1a2e" strokeWidth="7" />
            <circle
              cx="36" cy="36" r={R}
              fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
              {pct}%
            </span>
          </div>
        </div>
      </button>

      {/* Dropdown checklist */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: '#0e0e1f', border: '1px solid #1a1a3a', borderRadius: 12,
          padding: '1rem 1.25rem', minWidth: 240, zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
          fontFamily: "'Outfit', sans-serif",
        }}>
          {pct === 100 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 500 }}>Your idea page is complete!</span>
            </div>
          ) : (
            <>
              <p style={{
                fontSize: 9, color: 'rgba(255,255,255,0.22)',
                textTransform: 'uppercase', letterSpacing: '0.8px',
                marginBottom: 10, fontWeight: 500,
              }}>
                Missing {missing.length} item{missing.length !== 1 ? 's' : ''}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {missing.map((item, i) => (
                  <li key={i}>
                    <button
                      onClick={() => handleMissingClick(item.field, setOpen)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', textAlign: 'left',
                      }}
                    >
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: '#ef4444', flexShrink: 0, display: 'inline-block',
                      }} />
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 300, lineHeight: 1.4 }}>
                        {item.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
