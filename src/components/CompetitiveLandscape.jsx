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

function getLabelStyle(pos, isSelf = false) {
  const base = {
    position: 'absolute',
    fontSize: 12,
    whiteSpace: 'nowrap',
    background: 'rgba(255,255,255,0.92)',
    padding: '2px 5px',
    borderRadius: 4,
    color: isSelf ? '#7b9ff7' : '#444',
    fontWeight: isSelf ? 600 : 400,
    maxWidth: isSelf ? 140 : 110,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
  if (pos === 'left')   return { ...base, right: 20, left: 'auto', top: -6 }
  if (pos === 'top')    return { ...base, left: '50%', transform: 'translateX(-50%)', bottom: 20, top: 'auto' }
  if (pos === 'bottom') return { ...base, left: '50%', transform: 'translateX(-50%)', top: 16 }
  return { ...base, left: 16, top: -6 }
}

function snapLabelPos(dx, dy) {
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'bottom' : 'top'
}

function TableReadOnly({ data, ideaTitle }) {
  if (!data || !data.competitors?.length) return null
  const hasColumns = data.columns?.length > 0
  if (!hasColumns) return (
    <div>
      <div style={{ padding: '6px 0 10px', borderBottom: '0.5px solid rgba(44,44,42,0.1)', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#7b9ff7' }}>{ideaTitle || 'Your idea'}</span>
      </div>
      {(data.competitors || []).map((c, i) => (
        <div key={i} style={{ padding: '6px 0', borderBottom: '0.5px solid rgba(44,44,42,0.06)', fontSize: 13, color: '#2c2c2a' }}>{c.name}</div>
      ))}
    </div>
  )
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '0.5px solid rgba(44,44,42,0.1)', color: '#888780', fontWeight: 600, fontSize: 11 }}>Competitor</th>
            {data.columns.map((col, i) => <th key={i} style={{ padding: '8px 12px', borderBottom: '0.5px solid rgba(44,44,42,0.1)', color: '#888780', fontWeight: 600, fontSize: 11, textAlign: 'center', minWidth: 80 }}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: 'rgba(123,159,247,0.08)', borderLeft: '3px solid #7b9ff7' }}>
            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#7b9ff7', fontSize: 13 }}>{ideaTitle || 'Your idea'}</td>
            {data.columns.map((_, i) => <td key={i} style={{ textAlign: 'center', padding: '8px 12px', color: '#22c55e', fontSize: 16 }}>✓</td>)}
          </tr>
          {(data.competitors || []).map((c, i) => (
            <tr key={i} style={{ borderBottom: '0.5px solid rgba(44,44,42,0.06)' }}>
              <td style={{ padding: '8px 12px', color: '#2c2c2a', fontSize: 13 }}>{c.name}</td>
              {(c.checks || []).map((checked, j) => <td key={j} style={{ textAlign: 'center', padding: '8px 12px', color: checked ? '#22c55e' : '#d1d5db', fontSize: checked ? 16 : 14 }}>{checked ? '✓' : '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MatrixReadOnly({ data, ideaTitle }) {
  if (!data || !data.competitors?.length) return null
  return (
    <div style={{ width: '100%', aspectRatio: '1', position: 'relative', background: 'rgba(123,159,247,0.04)', border: '0.5px solid rgba(123,159,247,0.2)', borderRadius: 10, overflow: 'visible' }}>
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(44,44,42,0.08)' }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(44,44,42,0.08)' }} />
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: '#888780', whiteSpace: 'nowrap' }}>{data.axis_x?.label || 'X axis'} →</div>
      <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: 12, color: '#888780', whiteSpace: 'nowrap' }}>↑ {data.axis_y?.label || 'Y axis'}</div>
      {(data.competitors || []).map((c, i) => (
        <div key={i} style={{ position: 'absolute', left: `${c.x * 100}%`, top: `${(1 - c.y) * 100}%`, transform: 'translate(-50%,-50%)', zIndex: 2 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#888780', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
          <div style={getLabelStyle(c.labelPos || 'right', false)}>{c.name}</div>
        </div>
      ))}
      {data.self && (
        <div style={{ position: 'absolute', left: `${data.self.x * 100}%`, top: `${(1 - data.self.y) * 100}%`, transform: 'translate(-50%,-50%)', zIndex: 3 }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#7b9ff7', border: '2px solid #fff', boxShadow: '0 1px 6px rgba(123,159,247,0.5)' }} />
          <div style={getLabelStyle(data.self.labelPos || 'right', true)}>{ideaTitle || 'Your idea'}</div>
        </div>
      )}
    </div>
  )
}

function GapReadOnly({ data, ideaTitle }) {
  if (!data || !data.stages?.length) return null
  const stages = data.stages || DEFAULT_STAGES
  const gapStart = data.gap_start ?? 1
  const gapEnd = data.gap_end ?? 2
  const pct = (i) => `${(i / (stages.length - 1)) * 100}%`
  const competitorsByStage = stages.map((_, i) => (data.competitors || []).filter(c => c.stage === i))
  return (
    <div style={{ padding: '0 2.5rem 1rem' }}>
      <div style={{ position: 'relative', marginTop: '3rem', minHeight: Math.max(140, Math.max(...stages.map((_, i) => (competitorsByStage[i] || []).length)) * 28 + 40) }}>
        <div style={{ position: 'relative', height: 4, background: '#e5e5e5', borderRadius: 2, margin: '0 0 0', overflow: 'visible' }}>
          <div style={{ position: 'absolute', left: pct(gapStart), width: `calc(${pct(gapEnd)} - ${pct(gapStart)})`, height: '100%', background: 'rgba(123,159,247,0.3)', borderRadius: 2 }} />
        </div>
        {stages.map((s, i) => {
          const inGap = i >= gapStart && i <= gapEnd
          const stageCompetitors = competitorsByStage[i] || []
          return (
            <div key={i} style={{ position: 'absolute', left: pct(i), transform: 'translateX(-50%)', top: -8 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: inGap ? '#7b9ff7' : '#d1d5db', border: '3px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', margin: '0 auto' }} />
              <div style={{ fontSize: 11, color: inGap ? '#7b9ff7' : '#888780', textAlign: 'center', marginTop: 10, fontWeight: inGap ? 600 : 400, whiteSpace: 'nowrap' }}>{s}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginTop: 8 }}>
                {stageCompetitors.map((c, j) => (
                  <div key={j} style={{ background: '#f5f5f3', borderRadius: 5, padding: '3px 8px', fontSize: 11, color: '#555', whiteSpace: 'nowrap', border: '0.5px solid rgba(44,44,42,0.1)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                ))}
              </div>
            </div>
          )
        })}
        <div style={{ position: 'absolute', left: `calc((${pct(gapStart)} + ${pct(gapEnd)}) / 2)`, transform: 'translateX(-50%)', top: -42, fontSize: 12, color: '#7b9ff7', fontWeight: 600, whiteSpace: 'nowrap', background: 'rgba(255,255,255,0.95)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(123,159,247,0.3)' }}>{ideaTitle || 'Your idea'}</div>
      </div>
    </div>
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

  useEffect(() => {
    const p = parseValue(value)
    if (!p) return
    if (p.format) setFormat(p.format)
    if (p.table) setTableData(p.table)
    if (p.matrix) setMatrixData(p.matrix)
    if (p.gap) setGapData(p.gap)
  }, [])

  useEffect(() => {
    function onMouseMove(e) {
      if (!draggingRef.current || !matrixRef.current) return
      const rect = matrixRef.current.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
      const { type, index } = draggingRef.current
      if (type === 'self') {
        setMatrixData(prev => ({ ...prev, self: { x, y: 1 - y } }))
      } else {
        setMatrixData(prev => {
          const competitors = [...prev.competitors]
          competitors[index] = { ...competitors[index], x, y: 1 - y }
          return { ...prev, competitors }
        })
      }
    }
    function onMouseUp() { draggingRef.current = null }
    function onTouchMove(e) {
      if (!draggingRef.current || !matrixRef.current) return
      const touch = e.touches[0]
      const rect = matrixRef.current.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (touch.clientX - rect.left) / rect.width))
      const y = Math.min(1, Math.max(0, (touch.clientY - rect.top) / rect.height))
      const { type, index } = draggingRef.current
      if (type === 'self') {
        setMatrixData(prev => ({ ...prev, self: { x, y: 1 - y } }))
      } else {
        setMatrixData(prev => {
          const competitors = [...prev.competitors]
          competitors[index] = { ...competitors[index], x, y: 1 - y }
          return { ...prev, competitors }
        })
      }
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onMouseUp)
    }
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await onChange({ format, table: tableData, matrix: matrixData, gap: gapData })
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
      const prompt = `You are a startup analyst. Given this idea: Title: ${ideaTitle}. Problem: ${ideaProblem}. Solution: ${ideaSolution}. Return JSON only, no markdown, no explanation. JSON must have these keys: recommended_format (one of: table, matrix, gap), reason (one line explaining why this format fits), competitors (array of 4-6 objects). Each competitor object must have: name (string), for_table: { capabilities: array of booleans matching 4 columns }, for_matrix: { x: float 0-1, y: float 0-1 }, for_gap: { stage: integer 0-3 }. Also include a self object with for_matrix: { x: float 0-1, y: float 0-1 } representing where this idea sits on the matrix. Also include table_columns: array of 4 strings naming the capability columns.`
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
      const aiColumns = result.table_columns || []
      setTableData({ columns: aiColumns, competitors: aiCompetitors.map(c => ({ name: c.name, checks: c.for_table?.capabilities || aiColumns.map(() => false) })) })
      setMatrixData(prev => ({ ...prev, competitors: aiCompetitors.map(c => ({ name: c.name, x: c.for_matrix?.x ?? 0.5, y: c.for_matrix?.y ?? 0.5 })), self: result.self?.for_matrix ? { x: result.self.for_matrix.x, y: result.self.for_matrix.y } : prev.self }))
      setGapData(prev => ({ ...prev, competitors: aiCompetitors.map(c => ({ name: c.name, stage: c.for_gap?.stage ?? 0 })) }))
    } catch {
      setAiError('AI suggestion failed. You can fill this in manually.')
    }
    setAiLoading(false)
  }

  const parsed = parseValue(value)

  if (!isOwner) {
    if (!parsed) return null
    const hasData = (parsed.format === 'table' && parsed.table?.competitors?.length > 0) ||
      (parsed.format === 'matrix' && parsed.matrix?.competitors?.length > 0) ||
      (parsed.format === 'gap' && parsed.gap?.competitors?.length > 0)
    if (!hasData) return null
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
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#7b9ff7', fontSize: 13 }}>{ideaTitle || 'Your idea'}</td>
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
          <p style={{ fontSize: 12, color: '#888780', marginBottom: 12 }}>Set your axes, then drag dots to position your idea and competitors.</p>
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
          <div ref={matrixRef} style={{ position: 'relative', width: '100%', paddingBottom: '60%', maxHeight: 400, background: 'rgba(123,159,247,0.04)', border: '0.5px solid rgba(123,159,247,0.2)', borderRadius: 10, cursor: 'crosshair', userSelect: 'none', marginBottom: 12 }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(44,44,42,0.08)' }} />
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(44,44,42,0.08)' }} />
              <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: '#888780' }}>{matrixData.axis_x?.label} →</div>
              <div style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: 11, color: '#888780', whiteSpace: 'nowrap' }}>↑ {matrixData.axis_y?.label}</div>
              {(matrixData.competitors || []).map((c, i) => (
                <div key={i} onMouseDown={e => { e.preventDefault(); draggingRef.current = { type: 'competitor', index: i } }} onTouchStart={e => { e.preventDefault(); draggingRef.current = { type: 'competitor', index: i } }} style={{ position: 'absolute', left: `${c.x * 100}%`, top: `${(1 - c.y) * 100}%`, transform: 'translate(-50%,-50%)', cursor: 'grab', zIndex: 2 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#888780', border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                  <div
                    style={{ ...getLabelStyle(c.labelPos || 'right', false), cursor: 'grab', userSelect: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
                    onMouseDown={e => {
                      e.stopPropagation()
                      const startX = e.clientX
                      const startY = e.clientY
                      function onMove(ev) {
                        const dx = ev.clientX - startX
                        const dy = ev.clientY - startY
                        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                          setMatrixData(prev => {
                            const competitors = [...prev.competitors]
                            competitors[i] = { ...competitors[i], labelPos: snapLabelPos(dx, dy) }
                            return { ...prev, competitors }
                          })
                        }
                      }
                      function onUp() {
                        window.removeEventListener('mousemove', onMove)
                        window.removeEventListener('mouseup', onUp)
                      }
                      window.addEventListener('mousemove', onMove)
                      window.addEventListener('mouseup', onUp)
                    }}
                    onTouchStart={e => {
                      e.stopPropagation()
                      const startX = e.touches[0].clientX
                      const startY = e.touches[0].clientY
                      function onMove(ev) {
                        const dx = ev.touches[0].clientX - startX
                        const dy = ev.touches[0].clientY - startY
                        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                          setMatrixData(prev => {
                            const competitors = [...prev.competitors]
                            competitors[i] = { ...competitors[i], labelPos: snapLabelPos(dx, dy) }
                            return { ...prev, competitors }
                          })
                        }
                      }
                      function onUp() {
                        window.removeEventListener('touchmove', onMove)
                        window.removeEventListener('touchend', onUp)
                      }
                      window.addEventListener('touchmove', onMove, { passive: false })
                      window.addEventListener('touchend', onUp)
                    }}
                  >{c.name || `Competitor ${i + 1}`}</div>
                </div>
              ))}
              {matrixData.self && (
                <div onMouseDown={e => { e.preventDefault(); draggingRef.current = { type: 'self', index: -1 } }} onTouchStart={e => { e.preventDefault(); draggingRef.current = { type: 'self', index: -1 } }} style={{ position: 'absolute', left: `${matrixData.self.x * 100}%`, top: `${(1 - matrixData.self.y) * 100}%`, transform: 'translate(-50%,-50%)', cursor: 'grab', zIndex: 3 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#7b9ff7', border: '2px solid #fff', boxShadow: '0 1px 6px rgba(123,159,247,0.5)' }} />
                  <div
                    style={{ ...getLabelStyle(matrixData.self.labelPos || 'right', true), cursor: 'grab', userSelect: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
                    onMouseDown={e => {
                      e.stopPropagation()
                      const startX = e.clientX
                      const startY = e.clientY
                      function onMove(ev) {
                        const dx = ev.clientX - startX
                        const dy = ev.clientY - startY
                        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                          setMatrixData(prev => ({ ...prev, self: { ...prev.self, labelPos: snapLabelPos(dx, dy) } }))
                        }
                      }
                      function onUp() {
                        window.removeEventListener('mousemove', onMove)
                        window.removeEventListener('mouseup', onUp)
                      }
                      window.addEventListener('mousemove', onMove)
                      window.addEventListener('mouseup', onUp)
                    }}
                    onTouchStart={e => {
                      e.stopPropagation()
                      const startX = e.touches[0].clientX
                      const startY = e.touches[0].clientY
                      function onMove(ev) {
                        const dx = ev.touches[0].clientX - startX
                        const dy = ev.touches[0].clientY - startY
                        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
                          setMatrixData(prev => ({ ...prev, self: { ...prev.self, labelPos: snapLabelPos(dx, dy) } }))
                        }
                      }
                      function onUp() {
                        window.removeEventListener('touchmove', onMove)
                        window.removeEventListener('touchend', onUp)
                      }
                      window.addEventListener('touchmove', onMove, { passive: false })
                      window.addEventListener('touchend', onUp)
                    }}
                  >{ideaTitle || 'Your idea'}</div>
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
          <p style={{ fontSize: 12, color: '#888780', marginBottom: 12 }}>Show where competitors cluster and where your idea fills the gap.</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto' }}>
            {(gapData.stages || DEFAULT_STAGES).map((s, i) => (
              <input key={i} value={s} onChange={e => setGapData(prev => { const stages = [...prev.stages]; stages[i] = e.target.value; return { ...prev, stages } })} style={{ flex: 1, minWidth: 80, padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 11, textAlign: 'center', outline: 'none' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#888780', display: 'block', marginBottom: 4 }}>Gap start</label>
              <select value={gapData.gap_start} onChange={e => setGapData(prev => ({ ...prev, gap_start: parseInt(e.target.value) }))} style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 12, outline: 'none' }}>
                {(gapData.stages || DEFAULT_STAGES).map((s, i) => <option key={i} value={i}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888780', display: 'block', marginBottom: 4 }}>Gap end</label>
              <select value={gapData.gap_end} onChange={e => setGapData(prev => ({ ...prev, gap_end: parseInt(e.target.value) }))} style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 12, outline: 'none' }}>
                {(gapData.stages || DEFAULT_STAGES).map((s, i) => <option key={i} value={i}>{s}</option>)}
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

      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '0.5px solid rgba(44,44,42,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <button onClick={handleSave} disabled={saving} style={{ ...BTN, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
          {saved && <span style={{ fontSize: 12, color: '#22c55e' }}>Saved ✓</span>}
        </div>
        <p style={{ fontSize: 11, color: '#888780', marginBottom: 8 }}>Preview (as investors will see it)</p>
        <div style={{ border: '0.5px solid rgba(123,159,247,0.2)', borderRadius: 10, padding: '1rem', background: 'rgba(123,159,247,0.02)' }}>
          {format === 'table' && <TableReadOnly data={tableData} ideaTitle={ideaTitle} />}
          {format === 'matrix' && <MatrixReadOnly data={matrixData} ideaTitle={ideaTitle} />}
          {format === 'gap' && <GapReadOnly data={gapData} ideaTitle={ideaTitle} />}
        </div>
      </div>
    </div>
  )
}
