import { useState, useEffect, useRef } from 'react'

const CARD_STYLE = { background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }
const LABEL_STYLE = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem', display: 'block' }
const AXIS_OPTIONS = ['Protection level', 'Investor-readiness', 'Market size', 'Price point', 'Ease of use', 'Speed to market', 'Technical complexity', 'Custom...']
const DEFAULT_STAGES = ['Raw idea', 'Protected & pitched', 'Validated', 'Patent-ready']
const BTN = { background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const BTN_SM = { background: 'transparent', border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#555' }

function parseValue(v) {
  if (!v) return null
  if (typeof v === 'string') { try { return JSON.parse(v) } catch { return null } }
  return v
}

function TableReadOnly({ data }) {
  if (!data || !data.columns || data.columns.length === 0) return <p style={{ fontSize: 13, color: '#888' }}>No competitor data added yet.</p>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '0.5px solid rgba(44,44,42,0.1)', color: '#888780', fontWeight: 600, fontSize: 11 }}>Competitor</th>
            {data.columns.map((col, i) => <th key={i} style={{ padding: '8px 12px', borderBottom: '0.5px solid rgba(44,44,42,0.1)', color: '#888780', fontWeight: 600, fontSize: 11, textAlign: 'center' }}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: 'rgba(123,159,247,0.08)', borderLeft: '3px solid #7b9ff7' }}>
            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#7b9ff7', fontSize: 13 }}>Your idea</td>
            {data.columns.map((_, i) => <td key={i} style={{ textAlign: 'center', padding: '8px 12px', color: '#22c55e', fontSize: 16 }}>✓</td>)}
          </tr>
          {(data.competitors || []).map((c, i) => (
            <tr key={i} style={{ borderBottom: '0.5px solid rgba(44,44,42,0.06)' }}>
              <td style={{ padding: '8px 12px', color: '#2c2c2a', fontSize: 13 }}>{c.name}</td>
              {(c.checks || []).map((checked, j) => <td key={j} style={{ textAlign: 'center', padding: '8px 12px', color: checked ? '#22c55e' : '#d1d5db', fontSize: checked ? 16 : 13 }}>{checked ? '✓' : '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MatrixReadOnly({ data, ideaTitle }) {
  if (!data || !data.competitors || data.competitors.length === 0) return <p style={{ fontSize: 13, color: '#888' }}>No positioning data added yet.</p>
  const W = 320, H = 320
  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={W + 80} height={H + 60} style={{ display: 'block', margin: '0 auto' }}>
        <line x1={40} y1={10} x2={40} y2={H + 10} stroke="#e5e5e5" strokeWidth={1} />
        <line x1={40} y1={H + 10} x2={W + 50} y2={H + 10} stroke="#e5e5e5" strokeWidth={1} />
        <text x={40 + W / 2} y={H + 35} textAnchor="middle" fontSize={11} fill="#888780">{data.axis_x?.label || 'X axis'}</text>
        <text x={12} y={H / 2 + 10} textAnchor="middle" fontSize={11} fill="#888780" transform={`rotate(-90, 12, ${H / 2 + 10})`}>{data.axis_y?.label || 'Y axis'}</text>
        {(data.competitors || []).map((c, i) => {
          const cx = 40 + c.x * W
          const cy = 10 + (1 - c.y) * H
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={6} fill="#888780" opacity={0.7} />
              <text x={cx + 9} y={cy + 4} fontSize={10} fill="#555">{c.name}</text>
            </g>
          )
        })}
        {data.self && (
          <g>
            <circle cx={40 + data.self.x * W} cy={10 + (1 - data.self.y) * H} r={9} fill="#7b9ff7" />
            <text x={40 + data.self.x * W + 12} y={10 + (1 - data.self.y) * H + 4} fontSize={10} fill="#7b9ff7" fontWeight={600}>{ideaTitle || 'Your idea'}</text>
          </g>
        )}
      </svg>
    </div>
  )
}

function GapReadOnly({ data, ideaTitle }) {
  if (!data || !data.stages || data.stages.length === 0) return <p style={{ fontSize: 13, color: '#888' }}>No gap data added yet.</p>
  const stages = data.stages || DEFAULT_STAGES
  const gapStart = data.gap_start ?? 1
  const gapEnd = data.gap_end ?? 2
  const W = 560
  const stageX = (i) => 40 + (i / (stages.length - 1)) * (W - 80)
  return (
    <svg width={W} height={160} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
      <rect x={stageX(gapStart)} y={50} width={stageX(gapEnd) - stageX(gapStart)} height={40} rx={8} fill="rgba(123,159,247,0.15)" stroke="#7b9ff7" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={40} y1={70} x2={W - 40} y2={70} stroke="#e5e5e5" strokeWidth={2} />
      {stages.map((s, i) => (
        <g key={i}>
          <circle cx={stageX(i)} cy={70} r={5} fill={i >= gapStart && i <= gapEnd ? '#7b9ff7' : '#d1d5db'} />
          <text x={stageX(i)} y={95} textAnchor="middle" fontSize={10} fill="#888780">{s}</text>
        </g>
      ))}
      <text x={(stageX(gapStart) + stageX(gapEnd)) / 2} y={65} textAnchor="middle" fontSize={10} fill="#7b9ff7" fontWeight={600}>{ideaTitle || 'Your idea'}</text>
      {(data.competitors || []).map((c, i) => {
        const x = stageX(Math.min(c.stage, stages.length - 1))
        const y = 28 - (i % 2) * 16
        return (
          <g key={i}>
            <rect x={x - 30} y={y - 10} width={60} height={16} rx={4} fill="#f5f5f3" />
            <text x={x} y={y + 3} textAnchor="middle" fontSize={9} fill="#555">{c.name}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function CompetitiveLandscape({ value, onChange, isOwner, isPaid, ideaTitle, ideaProblem, ideaSolution }) {
  const [format, setFormat] = useState('table')
  const [tableData, setTableData] = useState({ columns: [], competitors: [] })
  const [matrixData, setMatrixData] = useState({ axis_x: { label: 'Protection level', custom: false }, axis_y: { label: 'Investor-readiness', custom: false }, competitors: [], self: { x: 0.5, y: 0.5 } })
  const [gapData, setGapData] = useState({ stages: [...DEFAULT_STAGES], competitors: [], gap_start: 1, gap_end: 2 })
  const [newColName, setNewColName] = useState('')
  const [aiReason, setAiReason] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const matrixRef = useRef(null)
  const draggingRef = useRef(null)
  const hasLoaded = useRef(false)

  useEffect(() => {
    const p = parseValue(value)
    if (!p) return
    if (p.format) setFormat(p.format)
    if (p.table) setTableData(p.table)
    if (p.matrix) setMatrixData(p.matrix)
    if (p.gap) setGapData(p.gap)
    hasLoaded.current = true
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const val = { format, table: tableData, matrix: matrixData, gap: gapData }
    await onChange(val)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addColumn() {
    if (!newColName.trim() || tableData.columns.length >= 6) return
    const col = newColName.trim()
    setNewColName('')
    setTableData(prev => ({ ...prev, columns: [...prev.columns, col], competitors: prev.competitors.map(c => ({ ...c, checks: [...(c.checks || []), false] })) }))
  }

  function removeColumn(i) {
    setTableData(prev => ({ ...prev, columns: prev.columns.filter((_, j) => j !== i), competitors: prev.competitors.map(c => ({ ...c, checks: (c.checks || []).filter((_, j) => j !== i) })) }))
  }

  function addTableCompetitor() {
    setTableData(prev => ({ ...prev, competitors: [...prev.competitors, { name: '', checks: prev.columns.map(() => false) }] }))
  }

  function removeTableCompetitor(i) {
    setTableData(prev => ({ ...prev, competitors: prev.competitors.filter((_, j) => j !== i) }))
  }

  function getRelativePos(e) {
    const rect = matrixRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)) }
  }

  function onMatrixMouseDown(type, index) {
    return (e) => { e.preventDefault(); draggingRef.current = { type, index } }
  }

  function onMatrixMove(e) {
    if (!draggingRef.current || !matrixRef.current) return
    const pos = getRelativePos(e)
    const { type, index } = draggingRef.current
    if (type === 'self') { setMatrixData(prev => ({ ...prev, self: pos })) }
    else { setMatrixData(prev => { const competitors = [...prev.competitors]; competitors[index] = { ...competitors[index], x: pos.x, y: pos.y }; return { ...prev, competitors } }) }
  }

  function onMatrixUp() { draggingRef.current = null }

  function addMatrixCompetitor() {
    setMatrixData(prev => ({ ...prev, competitors: [...prev.competitors, { name: '', x: 0.5, y: 0.5 }] }))
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
      const prompt = `You are a startup analyst. Given this idea: Title: ${ideaTitle}. Problem: ${ideaProblem}. Solution: ${ideaSolution}. Return JSON only, no markdown, no explanation. JSON must have these keys: recommended_format (one of: table, matrix, gap), reason (one line explaining why this format fits), competitors (array of 4-6 objects). Each competitor object must have: name (string), for_table: { capabilities: array of booleans }, for_matrix: { x: float 0-1, y: float 0-1 }, for_gap: { stage: integer 0-3 }. Also include a self object with for_matrix: { x: float 0-1, y: float 0-1 } representing where this idea sits on the matrix.`
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/competitive-suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      const result = typeof data === 'string' ? JSON.parse(data) : (data.result || data)
      if (result.recommended_format) setFormat(result.recommended_format)
      if (result.reason) setAiReason(result.reason)
      const aiCompetitors = result.competitors || []
      setMatrixData(prev => ({ ...prev, competitors: aiCompetitors.map(c => ({ name: c.name, x: c.for_matrix?.x ?? 0.5, y: c.for_matrix?.y ?? 0.5 })), self: result.self?.for_matrix ? { x: result.self.for_matrix.x, y: result.self.for_matrix.y } : prev.self }))
      setGapData(prev => ({ ...prev, competitors: aiCompetitors.map(c => ({ name: c.name, stage: c.for_gap?.stage ?? 0 })) }))
      setTableData(prev => ({ ...prev, competitors: aiCompetitors.map(c => ({ name: c.name, checks: (c.for_table?.capabilities || []) })) }))
    } catch {
      setAiError('AI suggestion failed. You can fill this in manually.')
    }
    setAiLoading(false)
  }

  const parsed = parseValue(value)

  if (!isOwner) {
    if (!parsed) return null
    return (
      <div style={CARD_STYLE}>
        <span style={LABEL_STYLE}>Competitive Landscape</span>
        {parsed.format === 'table' && <TableReadOnly data={parsed.table} ideaTitle={ideaTitle} />}
        {parsed.format === 'matrix' && <MatrixReadOnly data={parsed.matrix} ideaTitle={ideaTitle} />}
        {parsed.format === 'gap' && <GapReadOnly data={parsed.gap} ideaTitle={ideaTitle} />}
      </div>
    )
  }

  return (
    <div style={CARD_STYLE}>
      <span style={LABEL_STYLE}>Competitive Landscape</span>

      {isPaid && (
        <div style={{ marginBottom: '1rem' }}>
          <button onClick={aiSuggest} disabled={aiLoading} style={{ ...BTN, opacity: aiLoading ? 0.6 : 1 }}>
            {aiLoading ? 'Analyzing…' : '✨ AI-suggest competitors'}
          </button>
          {aiReason && <p style={{ fontSize: 12, color: '#7b9ff7', fontStyle: 'italic', marginTop: 6 }}>{aiReason}</p>}
          {aiError && <p style={{ fontSize: 12, color: '#e24b4a', marginTop: 6 }}>{aiError}</p>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
        {['table', 'matrix', 'gap'].map(f => (
          <button key={f} onClick={() => setFormat(f)} style={{ flex: 1, padding: '10px 8px', borderRadius: 8, border: format === f ? '1.5px solid #7b9ff7' : '0.5px solid rgba(44,44,42,0.15)', background: format === f ? 'rgba(123,159,247,0.06)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: format === f ? '#7b9ff7' : '#2c2c2a' }}>{f === 'table' ? 'Feature table' : f === 'matrix' ? 'Positioning matrix' : 'Gap diagram'}</div>
            <div style={{ fontSize: 11, color: '#888780', marginTop: 2 }}>{f === 'table' ? 'Who has what' : f === 'matrix' ? 'Where you sit' : 'The unserved moment'}</div>
          </button>
        ))}
      </div>

      {format === 'table' && (
        <div>
          <p style={{ fontSize: 12, color: '#888780', marginBottom: 8 }}>Add capability columns, then add competitors and check which ones they have.</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input value={newColName} onChange={e => setNewColName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addColumn()} placeholder="Add capability (e.g. Timestamp proof)" style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 13, outline: 'none' }} />
            <button onClick={addColumn} style={BTN}>Add</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {tableData.columns.map((col, i) => (
              <span key={i} style={{ background: 'rgba(123,159,247,0.1)', color: '#7b9ff7', borderRadius: 20, padding: '3px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                {col} <span onClick={() => removeColumn(i)} style={{ cursor: 'pointer', opacity: 0.6 }}>×</span>
              </span>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '0.5px solid rgba(44,44,42,0.1)', color: '#888780', fontWeight: 600, fontSize: 11 }}>Competitor</th>
                  {tableData.columns.map((col, i) => <th key={i} style={{ padding: '8px 12px', borderBottom: '0.5px solid rgba(44,44,42,0.1)', color: '#888780', fontWeight: 600, fontSize: 11, textAlign: 'center', minWidth: 80 }}>{col}</th>)}
                  <th style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: 'rgba(123,159,247,0.08)', borderLeft: '3px solid #7b9ff7' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#7b9ff7', fontSize: 13 }}>Your idea</td>
                  {tableData.columns.map((_, i) => <td key={i} style={{ textAlign: 'center', padding: '8px 12px', color: '#22c55e', fontSize: 16 }}>✓</td>)}
                  <td></td>
                </tr>
                {tableData.competitors.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid rgba(44,44,42,0.06)' }}>
                    <td style={{ padding: '6px 12px' }}>
                      <input value={c.name} onChange={e => setTableData(prev => { const competitors = [...prev.competitors]; competitors[i] = { ...competitors[i], name: e.target.value }; return { ...prev, competitors } })} placeholder="Competitor name" style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%', background: 'transparent', color: '#2c2c2a' }} />
                    </td>
                    {(c.checks || []).map((checked, j) => (
                      <td key={j} style={{ textAlign: 'center', padding: '6px 12px' }}>
                        <input type="checkbox" checked={!!checked} onChange={e => setTableData(prev => { const competitors = [...prev.competitors]; const checks = [...(competitors[i].checks || [])]; checks[j] = e.target.checked; competitors[i] = { ...competitors[i], checks }; return { ...prev, competitors } })} />
                      </td>
                    ))}
                    <td style={{ textAlign: 'center', padding: '6px 4px' }}>
                      <button onClick={() => removeTableCompetitor(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e24b4a', fontSize: 16, lineHeight: 1 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={addTableCompetitor} style={{ ...BTN_SM, marginTop: 10 }}>+ Add competitor</button>
        </div>
      )}

      {format === 'matrix' && (
        <div>
          <p style={{ fontSize: 12, color: '#888780', marginBottom: 12 }}>Set your axes, then drag dots to position your idea and competitors on the map.</p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 11, color: '#888780', display: 'block', marginBottom: 4 }}>X axis</label>
              <select value={matrixData.axis_x?.label} onChange={e => setMatrixData(prev => ({ ...prev, axis_x: { label: e.target.value, custom: e.target.value === 'Custom...' } }))} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 12, outline: 'none' }}>
                {AXIS_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
              {matrixData.axis_x?.custom && <input value={matrixData.axis_x.label === 'Custom...' ? '' : matrixData.axis_x.label} onChange={e => setMatrixData(prev => ({ ...prev, axis_x: { label: e.target.value, custom: true } }))} placeholder="Custom axis label" style={{ marginTop: 6, width: '100%', padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />}
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 11, color: '#888780', display: 'block', marginBottom: 4 }}>Y axis</label>
              <select value={matrixData.axis_y?.label} onChange={e => setMatrixData(prev => ({ ...prev, axis_y: { label: e.target.value, custom: e.target.value === 'Custom...' } }))} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 12, outline: 'none' }}>
                {AXIS_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
              {matrixData.axis_y?.custom && <input value={matrixData.axis_y.label === 'Custom...' ? '' : matrixData.axis_y.label} onChange={e => setMatrixData(prev => ({ ...prev, axis_y: { label: e.target.value, custom: true } }))} placeholder="Custom axis label" style={{ marginTop: 6, width: '100%', padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />}
            </div>
          </div>
          <div ref={matrixRef} onMouseMove={onMatrixMove} onMouseUp={onMatrixUp} onTouchMove={onMatrixMove} onTouchEnd={onMatrixUp} style={{ position: 'relative', width: '100%', paddingBottom: '75%', background: 'rgba(123,159,247,0.04)', border: '0.5px solid rgba(123,159,247,0.2)', borderRadius: 10, cursor: 'crosshair', userSelect: 'none', marginBottom: 12 }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(44,44,42,0.08)' }} />
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(44,44,42,0.08)' }} />
              <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#888780' }}>{matrixData.axis_x?.label}</div>
              <div style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: 10, color: '#888780', whiteSpace: 'nowrap' }}>{matrixData.axis_y?.label}</div>
              {(matrixData.competitors || []).map((c, i) => (
                <div key={i} onMouseDown={onMatrixMouseDown('competitor', i)} onTouchStart={onMatrixMouseDown('competitor', i)} style={{ position: 'absolute', left: `${c.x * 100}%`, top: `${(1 - c.y) * 100}%`, transform: 'translate(-50%,-50%)', cursor: 'grab', zIndex: 2 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#888780', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                  <div style={{ position: 'absolute', left: 16, top: -4, fontSize: 10, color: '#555', whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.9)', padding: '1px 4px', borderRadius: 3 }}>{c.name || `Competitor ${i + 1}`}</div>
                </div>
              ))}
              {matrixData.self && (
                <div onMouseDown={onMatrixMouseDown('self', -1)} onTouchStart={onMatrixMouseDown('self', -1)} style={{ position: 'absolute', left: `${matrixData.self.x * 100}%`, top: `${(1 - matrixData.self.y) * 100}%`, transform: 'translate(-50%,-50%)', cursor: 'grab', zIndex: 3 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#7b9ff7', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(123,159,247,0.4)' }} />
                  <div style={{ position: 'absolute', left: 20, top: -4, fontSize: 10, color: '#7b9ff7', fontWeight: 600, whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.9)', padding: '1px 4px', borderRadius: 3 }}>{ideaTitle || 'Your idea'}</div>
                </div>
              )}
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            {(matrixData.competitors || []).map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#888780', flexShrink: 0 }} />
                <input value={c.name} onChange={e => setMatrixData(prev => { const competitors = [...prev.competitors]; competitors[i] = { ...competitors[i], name: e.target.value }; return { ...prev, competitors } })} placeholder={`Competitor ${i + 1} name`} style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 12, outline: 'none' }} />
                <button onClick={() => removeMatrixCompetitor(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e24b4a', fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={addMatrixCompetitor} style={BTN_SM}>+ Add competitor</button>
        </div>
      )}

      {format === 'gap' && (
        <div>
          <p style={{ fontSize: 12, color: '#888780', marginBottom: 12 }}>Show where competitors cluster and where your idea fills the gap no one else serves.</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto' }}>
            {(gapData.stages || DEFAULT_STAGES).map((s, i) => (
              <input key={i} value={s} onChange={e => setGapData(prev => { const stages = [...prev.stages]; stages[i] = e.target.value; return { ...prev, stages } })} style={{ flex: 1, minWidth: 80, padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 11, textAlign: 'center', outline: 'none' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#888780', display: 'block', marginBottom: 4 }}>Gap start (stage index)</label>
              <select value={gapData.gap_start} onChange={e => setGapData(prev => ({ ...prev, gap_start: parseInt(e.target.value) }))} style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 12, outline: 'none' }}>
                {(gapData.stages || DEFAULT_STAGES).map((_, i) => <option key={i} value={i}>{i}: {(gapData.stages || DEFAULT_STAGES)[i]}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888780', display: 'block', marginBottom: 4 }}>Gap end (stage index)</label>
              <select value={gapData.gap_end} onChange={e => setGapData(prev => ({ ...prev, gap_end: parseInt(e.target.value) }))} style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 12, outline: 'none' }}>
                {(gapData.stages || DEFAULT_STAGES).map((_, i) => <option key={i} value={i}>{i}: {(gapData.stages || DEFAULT_STAGES)[i]}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            {(gapData.competitors || []).map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <input value={c.name} onChange={e => setGapData(prev => { const competitors = [...prev.competitors]; competitors[i] = { ...competitors[i], name: e.target.value }; return { ...prev, competitors } })} placeholder="Competitor name" style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 12, outline: 'none' }} />
                <select value={c.stage} onChange={e => setGapData(prev => { const competitors = [...prev.competitors]; competitors[i] = { ...competitors[i], stage: parseInt(e.target.value) }; return { ...prev, competitors } })} style={{ padding: '5px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 12, outline: 'none' }}>
                  {(gapData.stages || DEFAULT_STAGES).map((s, j) => <option key={j} value={j}>{s}</option>)}
                </select>
                <button onClick={() => removeGapCompetitor(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e24b4a', fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={addGapCompetitor} style={BTN_SM}>+ Add competitor</button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: '1.25rem', paddingTop: '1rem', borderTop: '0.5px solid rgba(44,44,42,0.08)' }}>
        <button onClick={handleSave} disabled={saving} style={{ ...BTN, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
        {saved && <span style={{ fontSize: 12, color: '#22c55e' }}>Saved ✓</span>}
      </div>
    </div>
  )
}
