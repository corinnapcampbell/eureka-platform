import { useState, useEffect, useRef } from 'react'

const AXIS_OPTIONS = [
  'Protection level',
  'Investor-readiness',
  'Market size',
  'Price point',
  'Ease of use',
  'Speed to market',
  'Technical complexity',
  'Custom...',
]

const DEFAULT_STAGES = ['Raw idea', 'Protected & pitched', 'Validated', 'Patent-ready']

function parseValue(value) {
  if (!value) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return null }
  }
  return value
}

export default function CompetitiveLandscape({ value, onChange, isOwner, isPaid, ideaTitle, ideaProblem, ideaSolution }) {
  const parsed = parseValue(value)

  const [format, setFormat] = useState(parsed?.format || 'table')
  const [tableData, setTableData] = useState(parsed?.table || { columns: [], competitors: [] })
  const [matrixData, setMatrixData] = useState(parsed?.matrix || {
    axis_x: { label: 'Ease of use', custom: false },
    axis_y: { label: 'Market size', custom: false },
    competitors: [],
    self: { x: 0.5, y: 0.5 },
  })
  const [gapData, setGapData] = useState(parsed?.gap || {
    stages: [...DEFAULT_STAGES],
    competitors: [],
    gap_start: 1,
    gap_end: 2,
  })
  const [newColName, setNewColName] = useState('')
  const [aiReason, setAiReason] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [formatWarning, setFormatWarning] = useState(false)
  const [saving, setSaving] = useState(false)

  const matrixRef = useRef(null)
  const draggingRef = useRef(null)

  const isSaving = useRef(false)
  useEffect(() => {
    if (isSaving.current) return
    const p = parseValue(value)
    if (!p) return
    if (p.format) setFormat(p.format)
    if (p.table) setTableData(p.table)
    if (p.matrix) setMatrixData(p.matrix)
    if (p.gap) setGapData(p.gap)
  }, [value])

  function switchFormat(f) {
    if (f === format) return
    setFormatWarning(true)
    setFormat(f)
  }

  async function handleSave() {
    isSaving.current = true
    setSaving(true)
    await onChange({ format, table: tableData, matrix: matrixData, gap: gapData })
    setSaving(false)
    isSaving.current = false
  }

  function addColumn() {
    if (!newColName.trim() || tableData.columns.length >= 6) return
    const col = newColName.trim()
    setNewColName('')
    setTableData(prev => ({
      ...prev,
      columns: [...prev.columns, col],
      competitors: prev.competitors.map(c => ({ ...c, checks: [...c.checks, false] })),
    }))
  }

  function removeColumn(i) {
    setTableData(prev => ({
      ...prev,
      columns: prev.columns.filter((_, j) => j !== i),
      competitors: prev.competitors.map(c => ({ ...c, checks: c.checks.filter((_, j) => j !== i) })),
    }))
  }

  function addTableCompetitor() {
    setTableData(prev => ({
      ...prev,
      competitors: [...prev.competitors, { name: '', checks: prev.columns.map(() => false) }],
    }))
  }

  function removeTableCompetitor(i) {
    setTableData(prev => ({ ...prev, competitors: prev.competitors.filter((_, j) => j !== i) }))
  }

  function getRelativePos(e) {
    const rect = matrixRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    }
  }

  function onMatrixMouseDown(type, index) {
    return (e) => {
      e.preventDefault()
      draggingRef.current = { type, index }
    }
  }

  function onMatrixMove(e) {
    if (!draggingRef.current || !matrixRef.current) return
    const pos = getRelativePos(e)
    const { type, index } = draggingRef.current
    if (type === 'self') {
      setMatrixData(prev => ({ ...prev, self: pos }))
    } else {
      setMatrixData(prev => {
        const competitors = [...prev.competitors]
        competitors[index] = { ...competitors[index], x: pos.x, y: pos.y }
        return { ...prev, competitors }
      })
    }
  }

  function onMatrixUp() {
    draggingRef.current = null
  }

  function addMatrixCompetitor() {
    setMatrixData(prev => ({
      ...prev,
      competitors: [...prev.competitors, { name: '', x: 0.5, y: 0.5 }],
    }))
  }

  function removeMatrixCompetitor(i) {
    setMatrixData(prev => ({ ...prev, competitors: prev.competitors.filter((_, j) => j !== i) }))
  }

  function addGapCompetitor() {
    setGapData(prev => ({ ...prev, competitors: [...prev.competitors, { name: '', stage: 0 }] }))
  }

  function removeGapCompetitor(i) {
    setGapData(prev => ({ ...prev, competitors: prev.competitors.filter((_, j) => j !== i) }))
  }

  async function aiSuggest() {
    setAiLoading(true)
    setAiError('')
    setAiReason('')
    try {
      const prompt = `You are a startup analyst. Given this idea: Title: ${ideaTitle}. Problem: ${ideaProblem}. Solution: ${ideaSolution}. Return JSON only, no markdown, no explanation. JSON must have these keys: recommended_format (one of: table, matrix, gap), reason (one line explaining why this format fits), competitors (array of 4-6 objects). Each competitor object must have: name (string), for_table: { capabilities: array of booleans matching the columns }, for_matrix: { x: float 0-1, y: float 0-1 }, for_gap: { stage: integer 0-3 }. Also include a self object with for_matrix: { x: float 0-1, y: float 0-1 } representing where this idea sits on the matrix.`
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/competitive-suggest`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ prompt }),
        }
      )
      const data = await res.json()
      const result = typeof data === 'string' ? JSON.parse(data) : (data.result || data)
      if (result.recommended_format) setFormat(result.recommended_format)
      if (result.reason) setAiReason(result.reason)
      const aiCompetitors = result.competitors || []
      setMatrixData(prev => ({
        ...prev,
        competitors: aiCompetitors.map(c => ({ name: c.name, x: c.for_matrix?.x ?? 0.5, y: c.for_matrix?.y ?? 0.5 })),
        self: result.self?.for_matrix ? { x: result.self.for_matrix.x, y: result.self.for_matrix.y } : prev.self,
      }))
      setGapData(prev => ({
        ...prev,
        competitors: aiCompetitors.map(c => ({ name: c.name, stage: c.for_gap?.stage ?? 0 })),
      }))
      setTableData(prev => ({
        ...prev,
        competitors: aiCompetitors.map(c => ({ name: c.name, checks: prev.columns.map(() => false) })),
      }))
    } catch {
      setAiError('AI suggestion failed. You can fill this in manually.')
    }
    setAiLoading(false)
  }

  // ── READ-ONLY ──────────────────────────────────────────────────────────────
  if (!isOwner) {
    if (!value) return null
    const p = parseValue(value)
    if (!p || !p.format) return null
    const fmt = p.format
    const tbl = p.table
    const mat = p.matrix
    const gap = p.gap

    return (
      <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>Competitive Landscape</p>

        {fmt === 'table' && tbl && tbl.columns?.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, color: '#888780', fontWeight: 600, borderBottom: '1px solid #f0f0ee' }}>Competitor</th>
                  {tbl.columns.map((col, i) => (
                    <th key={i} style={{ textAlign: 'center', padding: '6px 10px', fontSize: 11, color: '#888780', fontWeight: 600, borderBottom: '1px solid #f0f0ee' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: 'rgba(123,159,247,0.08)', borderLeft: '3px solid #7b9ff7' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2c2c2a' }}>{ideaTitle || 'Your idea'}</td>
                  {tbl.columns.map((_, i) => (
                    <td key={i} style={{ textAlign: 'center', padding: '8px 10px', color: '#22c55e', fontWeight: 700 }}>✓</td>
                  ))}
                </tr>
                {(tbl.competitors || []).map((comp, ci) => (
                  <tr key={ci} style={{ borderBottom: '1px solid #f8f8f6' }}>
                    <td style={{ padding: '8px 10px', color: '#2c2c2a' }}>{comp.name}</td>
                    {(comp.checks || []).map((checked, i) => (
                      <td key={i} style={{ textAlign: 'center', padding: '8px 10px', color: checked ? '#22c55e' : '#d1d5db', fontWeight: checked ? 700 : 400 }}>{checked ? '✓' : '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {fmt === 'matrix' && mat && (
          <svg width="340" height="340" style={{ display: 'block', margin: '0 auto' }}>
            <line x1="40" y1="300" x2="320" y2="300" stroke="#e0e0e0" strokeWidth="1.5" />
            <line x1="40" y1="300" x2="40" y2="20" stroke="#e0e0e0" strokeWidth="1.5" />
            <text x="180" y="332" textAnchor="middle" fontSize="10" fill="#888780">{mat.axis_x?.label || 'X Axis'}</text>
            <text x="12" y="160" textAnchor="middle" fontSize="10" fill="#888780" transform="rotate(-90,12,160)">{mat.axis_y?.label || 'Y Axis'}</text>
            {(mat.competitors || []).map((c, i) => {
              const cx = 40 + c.x * 280
              const cy = 300 - c.y * 280
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="6" fill="#d1d5db" />
                  <text x={cx} y={cy - 10} textAnchor="middle" fontSize="9" fill="#888780">{c.name}</text>
                </g>
              )
            })}
            {mat.self && (() => {
              const cx = 40 + mat.self.x * 280
              const cy = 300 - mat.self.y * 280
              return (
                <g>
                  <circle cx={cx} cy={cy} r="8" fill="#7b9ff7" />
                  <text x={cx} y={cy - 12} textAnchor="middle" fontSize="9" fill="#7b9ff7" fontWeight="600">{ideaTitle || 'Your idea'}</text>
                </g>
              )
            })()}
          </svg>
        )}

        {fmt === 'gap' && gap && (
          <svg width="100%" height="120" viewBox="0 0 400 120">
            {(() => {
              const stages = gap.stages || DEFAULT_STAGES
              const segW = 340 / (stages.length - 1)
              const x1 = 30 + (gap.gap_start ?? 1) * segW
              const x2 = 30 + (gap.gap_end ?? 2) * segW
              return <rect x={x1} y="40" width={x2 - x1} height="40" rx="6" fill="rgba(123,159,247,0.15)" />
            })()}
            <line x1="30" y1="60" x2="370" y2="60" stroke="#e0e0e0" strokeWidth="1.5" />
            {(gap.stages || DEFAULT_STAGES).map((s, i) => {
              const stages = gap.stages || DEFAULT_STAGES
              const x = 30 + i * (340 / (stages.length - 1))
              return (
                <g key={i}>
                  <circle cx={x} cy="60" r="4" fill="#d1d5db" />
                  <text x={x} y="85" textAnchor="middle" fontSize="8" fill="#888780">{s}</text>
                </g>
              )
            })}
            {(gap.competitors || []).map((c, i) => {
              const stages = gap.stages || DEFAULT_STAGES
              const x = 30 + (c.stage || 0) * (340 / (stages.length - 1))
              return (
                <g key={i}>
                  <rect x={x - 30} y={20 - (i % 2) * 16} width="60" height="14" rx="7" fill="#f0f0ee" />
                  <text x={x} y={30 - (i % 2) * 16} textAnchor="middle" fontSize="8" fill="#555">{c.name}</text>
                </g>
              )
            })}
            {(() => {
              const stages = gap.stages || DEFAULT_STAGES
              const gapStart = gap.gap_start ?? 1
              const gapEnd = gap.gap_end ?? 2
              const x = 30 + ((gapStart + gapEnd) / 2) * (340 / (stages.length - 1))
              return (
                <g>
                  <rect x={x - 35} y="44" width="70" height="16" rx="8" fill="#7b9ff7" />
                  <text x={x} y="55" textAnchor="middle" fontSize="8" fill="#fff" fontWeight="600">{(ideaTitle || 'Your idea').slice(0, 12)}</text>
                </g>
              )
            })()}
          </svg>
        )}
      </div>
    )
  }

  // ── OWNER EDITOR ───────────────────────────────────────────────────────────
  const inputStyle = { border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
  const btnStyle = { background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }

  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
      <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>Competitive Landscape</p>

      {isPaid && (
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={aiSuggest} disabled={aiLoading} style={{ ...btnStyle, opacity: aiLoading ? 0.6 : 1, cursor: aiLoading ? 'not-allowed' : 'pointer' }}>
            {aiLoading ? 'Thinking…' : '✨ AI-suggest competitors'}
          </button>
          {aiReason && <p style={{ fontSize: 12, color: '#888780', fontStyle: 'italic', marginTop: 6 }}>{aiReason}</p>}
          {aiError && <p style={{ fontSize: 12, color: '#e24b4a', marginTop: 6 }}>{aiError}</p>}
        </div>
      )}

      {/* Format picker */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { key: 'table', label: 'Feature table', desc: 'Who has what' },
          { key: 'matrix', label: 'Positioning matrix', desc: 'Where you sit' },
          { key: 'gap', label: 'Gap diagram', desc: 'The unserved moment' },
        ].map(f => (
          <div
            key={f.key}
            onClick={() => switchFormat(f.key)}
            style={{
              border: format === f.key ? '1.5px solid #7b9ff7' : '0.5px solid rgba(44,44,42,0.1)',
              borderRadius: 10,
              padding: '10px 14px',
              cursor: 'pointer',
              flex: '1 1 120px',
              background: format === f.key ? 'rgba(123,159,247,0.05)' : '#fff',
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: format === f.key ? '#7b9ff7' : '#2c2c2a', margin: '0 0 2px' }}>{f.label}</p>
            <p style={{ fontSize: 11, color: '#888780', margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>
      {formatWarning && (
        <p style={{ fontSize: 11, color: '#888780', fontStyle: 'italic', marginBottom: '0.75rem' }}>
          Switching format clears position data for this view. Your other format data is preserved.
        </p>
      )}

      {/* TABLE EDITOR */}
      {format === 'table' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem', alignItems: 'center' }}>
            <input
              value={newColName}
              onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addColumn()}
              placeholder="Add capability (e.g. Timestamp proof)"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={addColumn} disabled={tableData.columns.length >= 6} style={{ ...btnStyle, flexShrink: 0, opacity: tableData.columns.length >= 6 ? 0.5 : 1 }}>Add</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {tableData.columns.map((col, i) => (
              <span key={i} style={{ fontSize: 12, background: 'rgba(123,159,247,0.1)', color: '#4a6fd4', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                {col}
                <span onClick={() => removeColumn(i)} style={{ cursor: 'pointer', fontWeight: 700, color: '#9b7ff7' }}>×</span>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'rgba(123,159,247,0.08)', borderLeft: '3px solid #7b9ff7', borderRadius: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#7b9ff7', minWidth: 120 }}>{ideaTitle || 'Your idea'}</span>
            {tableData.columns.map((_, i) => (
              <input key={i} type="checkbox" checked={true} readOnly style={{ accentColor: '#7b9ff7' }} />
            ))}
          </div>
          {tableData.competitors.map((comp, ci) => (
            <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <input
                value={comp.name}
                onChange={e => setTableData(prev => {
                  const competitors = [...prev.competitors]
                  competitors[ci] = { ...competitors[ci], name: e.target.value }
                  return { ...prev, competitors }
                })}
                placeholder="Competitor name"
                style={{ ...inputStyle, width: 140 }}
              />
              {comp.checks.map((checked, i) => (
                <input
                  key={i}
                  type="checkbox"
                  checked={checked}
                  onChange={e => setTableData(prev => {
                    const competitors = [...prev.competitors]
                    const checks = [...competitors[ci].checks]
                    checks[i] = e.target.checked
                    competitors[ci] = { ...competitors[ci], checks }
                    return { ...prev, competitors }
                  })}
                />
              ))}
              <span onClick={() => removeTableCompetitor(ci)} style={{ cursor: 'pointer', color: '#ccc', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>×</span>
            </div>
          ))}
          <button onClick={addTableCompetitor} style={{ background: 'none', border: '1px dashed #ddd', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#888780', cursor: 'pointer', marginTop: 4 }}>+ Add competitor</button>
        </div>
      )}

      {/* MATRIX EDITOR */}
      {format === 'matrix' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
            {[
              { key: 'axis_x', label: 'X Axis' },
              { key: 'axis_y', label: 'Y Axis' },
            ].map(axis => (
              <div key={axis.key}>
                <p style={{ fontSize: 11, color: '#888780', marginBottom: 4, fontWeight: 600 }}>{axis.label}</p>
                <select
                  value={matrixData[axis.key]?.custom ? 'Custom...' : (matrixData[axis.key]?.label || '')}
                  onChange={e => {
                    const v = e.target.value
                    setMatrixData(prev => ({
                      ...prev,
                      [axis.key]: v === 'Custom...' ? { label: '', custom: true } : { label: v, custom: false },
                    }))
                  }}
                  style={{ ...inputStyle, height: 36 }}
                >
                  {AXIS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {matrixData[axis.key]?.custom && (
                  <input
                    value={matrixData[axis.key]?.label || ''}
                    onChange={e => setMatrixData(prev => ({ ...prev, [axis.key]: { ...prev[axis.key], label: e.target.value } }))}
                    placeholder="Enter axis label"
                    style={{ ...inputStyle, marginTop: 6 }}
                  />
                )}
              </div>
            ))}
          </div>
          <div
            ref={matrixRef}
            onMouseMove={onMatrixMove}
            onMouseUp={onMatrixUp}
            onMouseLeave={onMatrixUp}
            onTouchMove={onMatrixMove}
            onTouchEnd={onMatrixUp}
            style={{ width: 400, height: 400, border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 10, position: 'relative', background: '#fafaf8', cursor: 'crosshair', userSelect: 'none', margin: '0 auto', maxWidth: '100%' }}
          >
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: '#e0e0e0' }} />
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: '#e0e0e0' }} />
            <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#888780', whiteSpace: 'nowrap' }}>{matrixData.axis_x?.label || 'X Axis'}</div>
            <div style={{ position: 'absolute', top: '50%', left: 4, transform: 'rotate(-90deg) translateX(-50%)', fontSize: 9, color: '#888780', whiteSpace: 'nowrap' }}>{matrixData.axis_y?.label || 'Y Axis'}</div>
            {matrixData.competitors.map((c, i) => (
              <div
                key={i}
                onMouseDown={onMatrixMouseDown('competitor', i)}
                onTouchStart={onMatrixMouseDown('competitor', i)}
                style={{
                  position: 'absolute',
                  left: c.x * 400 - 6,
                  top: (1 - c.y) * 400 - 6,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: '#d1d5db',
                  cursor: 'grab',
                  zIndex: 2,
                }}
                title={c.name}
              />
            ))}
            <div
              onMouseDown={onMatrixMouseDown('self', -1)}
              onTouchStart={onMatrixMouseDown('self', -1)}
              style={{
                position: 'absolute',
                left: (matrixData.self?.x ?? 0.5) * 400 - 8,
                top: (1 - (matrixData.self?.y ?? 0.5)) * 400 - 8,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#7b9ff7',
                cursor: 'grab',
                zIndex: 3,
                border: '2px solid #fff',
                boxShadow: '0 0 0 1.5px #7b9ff7',
              }}
              title={ideaTitle || 'Your idea'}
            />
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            {matrixData.competitors.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#d1d5db', flexShrink: 0 }} />
                <input
                  value={c.name}
                  onChange={e => setMatrixData(prev => {
                    const competitors = [...prev.competitors]
                    competitors[i] = { ...competitors[i], name: e.target.value }
                    return { ...prev, competitors }
                  })}
                  placeholder="Competitor name"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <span onClick={() => removeMatrixCompetitor(i)} style={{ cursor: 'pointer', color: '#ccc', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>×</span>
              </div>
            ))}
          </div>
          <button onClick={addMatrixCompetitor} style={{ background: 'none', border: '1px dashed #ddd', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#888780', cursor: 'pointer', marginTop: 4 }}>+ Add competitor</button>
        </div>
      )}

      {/* GAP EDITOR */}
      {format === 'gap' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: '1rem' }}>
            {(gapData.stages || DEFAULT_STAGES).map((s, i) => (
              <input
                key={i}
                value={s}
                onChange={e => setGapData(prev => {
                  const stages = [...prev.stages]
                  stages[i] = e.target.value
                  return { ...prev, stages }
                })}
                style={{ ...inputStyle, fontSize: 11, textAlign: 'center' }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: '1rem', alignItems: 'flex-end' }}>
            <div>
              <p style={{ fontSize: 11, color: '#888780', marginBottom: 4, fontWeight: 600 }}>Gap start (stage index)</p>
              <select value={gapData.gap_start ?? 1} onChange={e => setGapData(prev => ({ ...prev, gap_start: parseInt(e.target.value) }))} style={{ ...inputStyle, width: 80, height: 36 }}>
                {[0, 1, 2, 3].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#888780', marginBottom: 4, fontWeight: 600 }}>Gap end (stage index)</p>
              <select value={gapData.gap_end ?? 2} onChange={e => setGapData(prev => ({ ...prev, gap_end: parseInt(e.target.value) }))} style={{ ...inputStyle, width: 80, height: 36 }}>
                {[0, 1, 2, 3].map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
          {(gapData.competitors || []).map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <input
                value={c.name}
                onChange={e => setGapData(prev => {
                  const competitors = [...prev.competitors]
                  competitors[i] = { ...competitors[i], name: e.target.value }
                  return { ...prev, competitors }
                })}
                placeholder="Competitor name"
                style={{ ...inputStyle, flex: 1 }}
              />
              <select
                value={c.stage ?? 0}
                onChange={e => setGapData(prev => {
                  const competitors = [...prev.competitors]
                  competitors[i] = { ...competitors[i], stage: parseInt(e.target.value) }
                  return { ...prev, competitors }
                })}
                style={{ ...inputStyle, width: 100, height: 36 }}
              >
                {[0, 1, 2, 3].map(j => <option key={j} value={j}>{j}: {(gapData.stages || DEFAULT_STAGES)[j]}</option>)}
              </select>
              <span onClick={() => removeGapCompetitor(i)} style={{ cursor: 'pointer', color: '#ccc', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>×</span>
            </div>
          ))}
          <button onClick={addGapCompetitor} style={{ background: 'none', border: '1px dashed #ddd', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#888780', cursor: 'pointer', marginTop: 4 }}>+ Add competitor</button>
        </div>
      )}

      <button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', marginTop: '1rem', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
