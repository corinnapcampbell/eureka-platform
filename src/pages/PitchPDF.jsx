import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

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

function escH(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function parseSteps(text) {
  if (!text?.trim()) return []
  const t = text.trim()
  const lines = t.split('\n').map(s => s.trim()).filter(Boolean)
  const numbered = lines.filter(s => /^\d+[\.\)]\s/.test(s)).map(s => s.replace(/^\d+[\.\)]\s*/, ''))
  if (numbered.length >= 2) return numbered
  if (lines.length >= 2) return lines
  const sentences = t.split(/\.\s+/).map(s => s.trim()).filter(s => s.length > 10)
  if (sentences.length >= 2) return sentences
  return [t]
}

function buildPreviewHTML(form, idea, userEmail) {
  const cats = Array.isArray(idea.categories)
    ? idea.categories
    : typeof idea.categories === 'string'
    ? idea.categories.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const steps = parseSteps(form.how_it_works)

  const audienceTags = (form.target_audience || '')
    .split(',').map(s => s.trim()).filter(Boolean)
    .filter(t => !cats.some(c => c.toLowerCase() === t.toLowerCase()))

  const marketNums = (form.market_size || '').match(/\$[\d.]+[BMKbmk]+\+?/g) || []

  const bmLines = (form.business_model || '').split('\n')
  const freeLine = bmLines.find(l => /^free:/i.test(l.trim()))
  const paidLine = bmLines.find(l => /^paid:/i.test(l.trim()))
  const freeText = freeLine ? freeLine.replace(/^free:\s*/i, '') : bmLines[0] || ''
  const paidText = paidLine ? paidLine.replace(/^paid:\s*/i, '') : bmLines[1] || ''

  const risks = (form.risks || '').split('\n').map(s => s.trim()).filter(Boolean)
  const nextSteps = (form.next_steps || '').split('\n').map(s => s.trim()).filter(Boolean)

  const dateStr = idea.created_at
    ? new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  const marketBoxes = marketNums.length >= 3
    ? [{ v: marketNums[0], l: 'Global Market' }, { v: marketNums[1], l: 'Serviceable' }, { v: marketNums[2], l: 'Target' }]
    : marketNums.length === 2
    ? [{ v: marketNums[0], l: 'Global Market' }, { v: marketNums[1], l: 'Serviceable' }, { v: '$1B+', l: 'TAM' }]
    : marketNums.length === 1
    ? [{ v: marketNums[0], l: 'Global Market' }, { v: '$100B+', l: 'Creator Economy' }, { v: '$1B+', l: 'TAM' }]
    : [{ v: '$180B+', l: 'Global IP Market' }, { v: '$100B+', l: 'Creator Economy' }, { v: '$1B+', l: 'TAM' }]

  const q = '#pdf-preview'
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=DM+Sans:wght@400;500;600&display=swap');
    ${q} .pdf-wrap { display:flex; flex-direction:column; gap:12px; width:375px; margin:0 auto; }
    ${q} .page { width:375px; height:667px; border-radius:8px; overflow:hidden; border:1px solid #e0e0e0; display:flex; flex-direction:column; box-sizing:border-box; }
    ${q} .abar { height:4px; background:linear-gradient(90deg,#7b9ff7,#9b7ff7); flex-shrink:0; }
    ${q} .cover { background:#0e0e1f; flex:1; padding:28px 22px 22px; display:flex; flex-direction:column; justify-content:space-between; }
    ${q} .logo { font-family:'Outfit',sans-serif; font-size:14px; font-weight:300; color:#fff; }
    ${q} .logo b { background:linear-gradient(90deg,#7b9ff7,#9b7ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-weight:700; }
    ${q} .cbadge { background:rgba(123,159,247,0.15); border:1px solid rgba(123,159,247,0.3); border-radius:20px; padding:3px 10px; font-size:8px; color:#7b9ff7; letter-spacing:2px; text-transform:uppercase; }
    ${q} .cnav { display:flex; justify-content:space-between; align-items:center; }
    ${q} .ccats { display:flex; gap:5px; flex-wrap:wrap; margin-top:6px; }
    ${q} .cat { background:rgba(123,159,247,0.1); border:1px solid rgba(123,159,247,0.2); border-radius:4px; padding:3px 8px; font-size:9px; color:#7b9ff7; }
    ${q} .cmid { display:flex; flex-direction:column; gap:10px; }
    ${q} .ctitle { font-size:22px; font-weight:700; color:#fff; line-height:1.2; }
    ${q} .ctagline { font-size:13px; color:rgba(255,255,255,0.45); line-height:1.5; }
    ${q} .cdiv { height:1px; background:linear-gradient(90deg,rgba(123,159,247,0.5),transparent); }
    ${q} .cmeta { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    ${q} .mlabel { font-size:8px; color:rgba(255,255,255,0.25); text-transform:uppercase; letter-spacing:1px; margin-bottom:3px; }
    ${q} .mval { font-size:12px; color:rgba(255,255,255,0.7); font-weight:500; }
    ${q} .chash { font-size:7px; color:rgba(255,255,255,0.15); font-family:monospace; word-break:break-all; line-height:1.6; }
    ${q} .cpage { background:#fff; flex:1; display:flex; flex-direction:column; }
    ${q} .phead { padding:11px 18px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #f0f0f0; flex-shrink:0; }
    ${q} .logod { font-family:'Outfit',sans-serif; font-size:12px; font-weight:300; color:#0e0e1f; }
    ${q} .logod b { background:linear-gradient(90deg,#7b9ff7,#9b7ff7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; font-weight:700; }
    ${q} .pnum { font-size:9px; color:#ccc; }
    ${q} .pbody { padding:14px 18px; display:flex; flex-direction:column; gap:13px; flex:1; overflow:hidden; }
    ${q} .shead { display:flex; align-items:center; gap:9px; flex-shrink:0; }
    ${q} .sicon { width:32px; height:32px; border-radius:8px; background:rgba(123,159,247,0.1); border:1px solid rgba(123,159,247,0.15); display:flex; align-items:center; justify-content:center; font-size:15px; flex-shrink:0; }
    ${q} .slabel { font-size:9px; letter-spacing:2px; color:#9b7ff7; text-transform:uppercase; font-weight:600; }
    ${q} .stext { font-size:12px; color:#333; line-height:1.7; }
    ${q} .hlight { background:rgba(123,159,247,0.07); border:1px solid rgba(123,159,247,0.15); border-left:3px solid #7b9ff7; border-radius:0 8px 8px 0; padding:11px 13px; flex-shrink:0; }
    ${q} .hlabel { font-size:8px; letter-spacing:2px; color:#7b9ff7; text-transform:uppercase; font-weight:600; margin-bottom:5px; }
    ${q} .htext { font-size:12px; color:#333; line-height:1.7; }
    ${q} .divider { height:1px; background:#f0f0f0; flex-shrink:0; }
    ${q} .steps { display:flex; flex-direction:column; gap:9px; }
    ${q} .step { display:flex; gap:9px; align-items:flex-start; }
    ${q} .snum { width:22px; height:22px; border-radius:50%; background:linear-gradient(135deg,#7b9ff7,#9b7ff7); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; flex-shrink:0; }
    ${q} .stxt { font-size:12px; color:#333; line-height:1.55; padding-top:2px; }
    ${q} .bmet { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
    ${q} .bm { background:rgba(123,159,247,0.06); border:1px solid rgba(123,159,247,0.12); border-radius:8px; padding:12px 6px; text-align:center; }
    ${q} .bmv { font-size:15px; font-weight:700; color:#0e0e1f; margin-bottom:3px; }
    ${q} .bml { font-size:8px; color:#999; letter-spacing:0.5px; text-transform:uppercase; }
    ${q} .tags { display:flex; gap:5px; flex-wrap:wrap; }
    ${q} .tag { background:rgba(123,159,247,0.08); border:1px solid rgba(123,159,247,0.2); border-radius:20px; padding:3px 9px; font-size:10px; color:#7b9ff7; }
    ${q} .twocards { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    ${q} .card { background:#f8f8fc; border-radius:8px; padding:11px; box-sizing:border-box; }
    ${q} .card.bl { border-top:3px solid #7b9ff7; }
    ${q} .card.pu { border-top:3px solid #9b7ff7; }
    ${q} .cicon { font-size:18px; margin-bottom:5px; }
    ${q} .clabel { font-size:8px; letter-spacing:2px; color:#9b7ff7; text-transform:uppercase; font-weight:600; margin-bottom:5px; }
    ${q} .ctext { font-size:11px; color:#555; line-height:1.6; }
    ${q} .risks { display:flex; flex-direction:column; }
    ${q} .risk { display:flex; gap:9px; padding:9px 0; border-bottom:1px solid #f5f5f5; }
    ${q} .risk:last-child { border-bottom:none; }
    ${q} .rdot { width:7px; height:7px; border-radius:50%; background:#e07b9f; flex-shrink:0; margin-top:5px; }
    ${q} .rtxt { font-size:12px; color:#444; line-height:1.6; }
    ${q} .tl { display:flex; flex-direction:column; gap:13px; }
    ${q} .tli { display:flex; gap:11px; }
    ${q} .tldot { width:12px; height:12px; border-radius:50%; background:linear-gradient(135deg,#7b9ff7,#9b7ff7); flex-shrink:0; margin-top:3px; }
    ${q} .tltitle { font-size:12px; font-weight:600; color:#0e0e1f; margin-bottom:3px; }
    ${q} .tltext { font-size:11px; color:#666; line-height:1.55; }
    ${q} .pfooter { padding:8px 18px; border-top:1px solid #f0f0f0; display:flex; justify-content:space-between; flex-shrink:0; }
    ${q} .pf { font-size:8px; color:#ccc; }
    ${q} .dfooter { background:#0e0e1f; padding:16px 18px; display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
    ${q} .dfbadge { background:rgba(123,159,247,0.1); border:1px solid rgba(123,159,247,0.2); border-radius:20px; padding:3px 10px; font-size:8px; color:#7b9ff7; letter-spacing:2px; text-transform:uppercase; }
  `

  const phead = (n) => `
    <div class="phead">
      <div class="logod">Eurek<b>AI</b>dea</div>
      <div class="pnum">Page ${n}</div>
    </div>`

  const pfooter = `
    <div class="pfooter">
      <div class="pf">CONFIDENTIAL</div>
      <div class="pf">myeurekaidea.com</div>
    </div>`

  const coverPage = `
    <div class="page">
      <div class="abar"></div>
      <div class="cover">
        <div>
          <div class="cnav">
            <div class="logo">Eurek<b>AI</b>dea</div>
            <div class="cbadge">CONFIDENTIAL</div>
          </div>
          <div class="ccats">${cats.map(c => `<div class="cat">${escH(c)}</div>`).join('')}</div>
        </div>
        <div class="cmid">
          <div class="ctitle">${escH(idea.title)}</div>
          <div class="ctagline">${escH(form.tagline)}</div>
          <div class="cdiv"></div>
          <div class="cmeta">
            <div><div class="mlabel">SUBMITTED BY</div><div class="mval">${escH(userEmail || 'Anonymous')}</div></div>
            <div><div class="mlabel">DATE</div><div class="mval">${escH(dateStr)}</div></div>
            <div><div class="mlabel">MARKET SIZE</div><div class="mval">${escH(marketBoxes[0].v)}</div></div>
            <div><div class="mlabel">LOOKING FOR</div><div class="mval">${escH(idea.looking_for || 'Investors')}</div></div>
          </div>
        </div>
        ${idea.blockchain_hash ? `<div class="chash">${escH(idea.blockchain_hash)}</div>` : ''}
      </div>
    </div>`

  const stepsHTML = steps.length === 1
    ? `<div class="stext">${escH(steps[0])}</div>`
    : `<div class="steps">${steps.map((s, i) => `<div class="step"><div class="snum">${i + 1}</div><div class="stxt">${escH(s)}</div></div>`).join('')}</div>`

  const tagsHTML = audienceTags.length > 0
    ? `<div class="tags">${audienceTags.map(t => `<div class="tag">${escH(t)}</div>`).join('')}</div>`
    : `<div class="stext">${escH(form.target_audience)}</div>`

  const page2 = `
    <div class="page">
      <div class="abar"></div>
      <div class="cpage">
        ${phead(2)}
        <div class="pbody">
          <div class="shead"><div class="sicon">⚡</div><div class="slabel">THE PROBLEM</div></div>
          <div class="stext">${escH(form.problem)}</div>
          <div class="divider"></div>
          <div class="hlight">
            <div class="hlabel">💡 THE SOLUTION</div>
            <div class="htext">${escH(form.solution)}</div>
          </div>
        </div>
        ${pfooter}
      </div>
      <div class="abar"></div>
    </div>`

  const page3 = `
    <div class="page">
      <div class="abar"></div>
      <div class="cpage">
        ${phead(3)}
        <div class="pbody">
          <div class="shead"><div class="sicon">⚙️</div><div class="slabel">HOW IT WORKS</div></div>
          ${stepsHTML}
          <div class="divider"></div>
          <div class="shead"><div class="sicon">📈</div><div class="slabel">MARKET SIZE</div></div>
          <div class="bmet">
            ${marketBoxes.map(b => `<div class="bm"><div class="bmv">${escH(b.v)}</div><div class="bml">${escH(b.l)}</div></div>`).join('')}
          </div>
          <div class="stext" style="font-size:11px;color:#888;margin-top:2px;">${escH(form.market_size)}</div>
        </div>
        ${pfooter}
      </div>
      <div class="abar"></div>
    </div>`

  const page4 = `
    <div class="page">
      <div class="abar"></div>
      <div class="cpage">
        ${phead(4)}
        <div class="pbody">
          <div class="shead"><div class="sicon">🎯</div><div class="slabel">TARGET MARKET</div></div>
          ${tagsHTML}
          <div class="divider"></div>
          <div class="shead"><div class="sicon">💰</div><div class="slabel">BUSINESS MODEL</div></div>
          <div class="twocards">
            <div class="card bl"><div class="cicon">🆓</div><div class="clabel">FREE TIER</div><div class="ctext">${escH(freeText)}</div></div>
            <div class="card pu"><div class="cicon">⭐</div><div class="clabel">PAID TIER</div><div class="ctext">${escH(paidText)}</div></div>
          </div>
        </div>
        ${pfooter}
      </div>
      <div class="abar"></div>
    </div>`

  const page5 = `
    <div class="page">
      <div class="abar"></div>
      <div class="cpage">
        ${phead(5)}
        <div class="pbody">
          <div class="shead"><div class="sicon">🏆</div><div class="slabel">COMPETITIVE ADVANTAGE</div></div>
          <div class="stext">${escH(form.competitive_advantage)}</div>
          <div class="divider"></div>
          <div class="shead"><div class="sicon">⚠️</div><div class="slabel">RISKS &amp; CHALLENGES</div></div>
          <div class="risks">
            ${risks.map(r => `<div class="risk"><div class="rdot"></div><div class="rtxt">${escH(r)}</div></div>`).join('')}
          </div>
        </div>
        ${pfooter}
      </div>
      <div class="abar"></div>
    </div>`

  const lastPage = `
    <div class="page">
      <div class="abar"></div>
      <div class="cpage">
        ${phead('Final')}
        <div class="pbody">
          <div class="shead"><div class="sicon">🚀</div><div class="slabel">NEXT STEPS</div></div>
          <div class="tl">
            ${nextSteps.map(s => `
              <div class="tli">
                <div class="tldot"></div>
                <div><div class="tltitle">${escH(s)}</div></div>
              </div>`).join('')}
          </div>
        </div>
        <div class="dfooter">
          <div class="logo">Eurek<b>AI</b>dea</div>
          <div class="dfbadge">myeurekaidea.com</div>
        </div>
      </div>
      <div class="abar"></div>
    </div>`

  return `<style>${CSS}</style><div class="pdf-wrap">${coverPage}${page2}${page3}${page4}${page5}${lastPage}</div>`
}

export default function PitchPDF({ session }) {
  const { ideaId } = useParams()
  const navigate   = useNavigate()
  const [idea,        setIdea]        = useState(null)
  const [form,        setForm]        = useState({})
  const [loading,     setLoading]     = useState(true)
  const [suggesting,  setSuggesting]  = useState(null)
  const [stage,       setStage]       = useState('form')
  const [previewHTML, setPreviewHTML] = useState('')
  const [publishing,  setPublishing]  = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const previewRef = useRef(null)

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

  useEffect(() => {
    if (stage === 'preview') {
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
    if (stage === 'form') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [stage])

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
    const html = buildPreviewHTML(form, idea, session?.user?.email)
    setPreviewHTML(html)
    setStage('preview')
  }

  async function handlePublish() {
    setPublishing(true)
    await supabase.from('ideas').update({
      pdf_published: true,
      pdf_snapshot: form,
    }).eq('id', ideaId)
    setPublishing(false)
    setPublishSuccess(true)
  }

  async function handleDownload() {
    if (!previewRef.current) return
    const pages = previewRef.current.querySelectorAll('.page')
    if (!pages.length) return
    setDownloading(true)
    try {
      const pdf = new jsPDF({ unit: 'pt', format: [375, 667], orientation: 'portrait' })
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, logging: false })
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        if (i > 0) pdf.addPage([375, 667], 'portrait')
        pdf.addImage(imgData, 'JPEG', 0, 0, 375, 667)
      }
      pdf.save(`${idea?.title || 'pitch'}.pdf`)
    } catch (err) {
      console.error('Download error:', err)
    }
    setDownloading(false)
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
            {stage === 'form' ? 'Build Your Pitch PDF' : 'Preview Your Pitch PDF'}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{idea.title}</p>
        </div>
      </div>

      {/* Stage 1: Form */}
      {stage === 'form' && (
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
      )}

      {/* Stage 2: Preview */}
      {stage === 'preview' && (
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.25rem 6rem' }}>
          <div
            ref={previewRef}
            id="pdf-preview"
            dangerouslySetInnerHTML={{ __html: previewHTML }}
            style={{ overflowX: 'auto' }}
          />

          <div style={{ display: 'flex', gap: 12, marginTop: '1.75rem' }}>
            <button
              onClick={() => setStage('form')}
              style={{
                flex: 1, background: '#fff', border: '0.5px solid rgba(44,44,42,0.15)',
                borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600,
                color: '#2c2c2a', cursor: 'pointer',
              }}
            >
              ✏️ Edit
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || publishSuccess}
              style={{
                flex: 1, background: publishSuccess
                  ? 'linear-gradient(90deg, #5a9f7a, #4a8f6a)'
                  : 'linear-gradient(90deg, #7b9ff7, #9b7ff7)',
                color: '#fff', border: 'none', borderRadius: 12, padding: '14px',
                fontSize: 15, fontWeight: 600, cursor: publishing || publishSuccess ? 'not-allowed' : 'pointer',
                opacity: publishing ? 0.7 : 1,
              }}
            >
              {publishing ? '…Publishing' : publishSuccess ? '✅ Published!' : '✅ Publish'}
            </button>
          </div>

          {publishSuccess && (
            <p style={{ color: '#5a9f7a', fontSize: 13, marginTop: 10, textAlign: 'center' }}>
              Your pitch PDF is now visible to investors
            </p>
          )}
        </div>
      )}

      {/* Floating download button */}
      {stage === 'preview' && (
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            position: 'fixed', bottom: 24, right: 24,
            background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)',
            color: '#fff', border: 'none', borderRadius: 50, padding: '13px 20px',
            fontSize: 14, fontWeight: 600, cursor: downloading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 20px rgba(123,159,247,0.45)',
            opacity: downloading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 6,
            transition: 'opacity 0.15s',
          }}
        >
          {downloading ? '…Generating' : '⬇ Download PDF'}
        </button>
      )}
    </div>
  )
}
