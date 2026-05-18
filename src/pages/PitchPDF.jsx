import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import Logo from '../components/Logo'
import BusinessModelSection, { extractBMChips, serializeBMValue } from '../components/BusinessModelSection'
import { parseBMValue, buildBMHtml, escH } from '../utils/businessModel'

const FIELDS = [
  { key: 'tagline',               label: 'Tagline',               hint: 'One punchy sentence capturing the essence of your idea', rows: 2 },
  { key: 'problem',               label: 'Problem',               hint: 'What pain point does this solve?',                        rows: 4 },
  { key: 'solution',              label: 'Solution',              hint: 'How does your idea solve the problem?',                   rows: 4 },
  { key: 'market_size',           label: 'Market Size',           hint: 'TAM / SAM / SOM with dollar figures',                    rows: 3 },
  { key: 'competitive_advantage', label: 'Competitive Advantage', hint: 'What makes this uniquely positioned to win?',            rows: 4 },
]

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

function fallbackSplitBM(text) {
  const lines = (text || '').split('\n').map(s => s.trim()).filter(Boolean)
  const freeIdx = lines.findIndex(l => /^free:/i.test(l))
  const paidIdx = lines.findIndex(l => /paid:|premium|unlock/i.test(l))
  if (freeIdx >= 0 || paidIdx >= 0) {
    return {
      free: freeIdx >= 0 ? [lines[freeIdx].replace(/^free:\s*/i, '')] : [],
      paid: paidIdx >= 0 ? [lines[paidIdx].replace(/^paid:\s*/i, '')] : [],
    }
  }
  if (lines.length >= 2) {
    const mid = Math.ceil(lines.length / 2)
    return { free: lines.slice(0, mid), paid: lines.slice(mid) }
  }
  return { free: lines, paid: [] }
}

function buildPreviewHTML(form, idea, userEmail, bmValue = null) {
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

  const { free: freeBullets, paid: paidBullets } = bmValue
    ? extractBMChips(bmValue)
    : fallbackSplitBM(form.business_model)

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
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=DM+Sans:wght@400;500;600&family=Inter:wght@300;400;500;600;700&display=swap');
    * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    ${q} .pdf-wrap { display:flex; flex-direction:column; gap:12px; width:375px; margin:0 auto; }
    ${q} .page { width:375px; height:667px; border-radius:8px; overflow:hidden; border:1px solid #e0e0e0; display:flex; flex-direction:column; box-sizing:border-box; }
    ${q} .abar { height:4px; background:linear-gradient(90deg,#7b9ff7,#9b7ff7); flex-shrink:0; }
    ${q} .cover { background:#0e0e1f; flex:1; padding:28px 22px 22px; display:flex; flex-direction:column; justify-content:space-between; }
    ${q} .logo { font-family:'Outfit',sans-serif; font-size:14px; font-weight:300; color:#fff; }
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
    ${q} .bm-model-title { font-family:'Outfit',sans-serif; font-weight:400; font-size:10px; letter-spacing:0.15em; text-transform:uppercase; color:#7b9ff7; margin:14px 0 8px 0; padding-bottom:5px; border-bottom:1px solid rgba(123,159,247,0.2); }
    ${q} .bm-model-title:first-child { margin-top:0; }
  `

  const phead = (n) => `
    <div class="phead">
      <div class="logod"><svg xmlns="http://www.w3.org/2000/svg" height="18" viewBox="0 0 260 40" style="display:block"><defs><linearGradient id="aiGradLogo" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#7b9ff7"/><stop offset="100%" stop-color="#9b7ff7"/></linearGradient></defs><text font-family="Outfit, Helvetica, Arial, sans-serif" font-weight="300" font-size="32" y="32"><tspan fill="#0e0e1f">Eurek</tspan><tspan fill="url(#aiGradLogo)">AI</tspan><tspan fill="#0e0e1f">dea</tspan></text></svg></div>
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
            <div class="logo"><svg xmlns="http://www.w3.org/2000/svg" height="28" viewBox="0 0 260 40" style="display:block"><defs><linearGradient id="aiGradLogo" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#7b9ff7"/><stop offset="100%" stop-color="#9b7ff7"/></linearGradient></defs><text font-family="Outfit, Helvetica, Arial, sans-serif" font-weight="300" font-size="32" y="32"><tspan fill="#ffffff">Eurek</tspan><tspan fill="url(#aiGradLogo)">AI</tspan><tspan fill="#ffffff">dea</tspan></text></svg></div>
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

  const sH = (icon, label) => `<div class="shead"><div class="sicon">${icon}</div><div class="slabel">${label}</div></div>`

  const bmInner = buildBMHtml(bmValue) || '<p style="color:#aaa;font-size:12px;margin:0;font-style:italic">No business model selected yet.</p>'

  const OVERHEAD = 60, LINE = 28
  const sectionHeight = (s) => {
    switch (s.type) {
      case 'problem': case 'solution': case 'competitive_advantage':
        return OVERHEAD + Math.ceil(s.text.length / 60) * LINE
      case 'how_it_works':
        return OVERHEAD + s.items.length * (LINE + 10)
      case 'target_market':
        return OVERHEAD + Math.ceil(s.items.length / 4) * (LINE + 8)
      case 'market_size':
        return OVERHEAD + 3 * LINE
      case 'business_model':
        return OVERHEAD + Math.max(s.freeItems.length, s.paidItems.length) * LINE + 60
      case 'risks': case 'next_steps':
        return OVERHEAD + s.items.length * (LINE + 8)
      default:
        return OVERHEAD + 2 * LINE
    }
  }

  const sections = [
    { type: 'problem', text: form.problem || '',
      html: `${sH('⚡', 'THE PROBLEM')}<div class="stext">${escH(form.problem)}</div>` },
    { type: 'solution', text: form.solution || '',
      html: `<div class="hlight"><div class="hlabel">💡 THE SOLUTION</div><div class="htext">${escH(form.solution)}</div></div>` },
    { type: 'how_it_works', items: steps,
      html: `${sH('⚙️', 'HOW IT WORKS')}${stepsHTML}` },
    { type: 'market_size',
      html: `${sH('📈', 'MARKET SIZE')}<div class="bmet">${marketBoxes.map(b => `<div class="bm"><div class="bmv">${escH(b.v)}</div><div class="bml">${escH(b.l)}</div></div>`).join('')}</div><div class="stext" style="font-size:11px;color:#888;margin-top:2px;">${escH(form.market_size)}</div>` },
    { type: 'target_market', items: audienceTags.length > 0 ? audienceTags : [form.target_audience || ''],
      html: `${sH('🎯', 'TARGET MARKET')}${tagsHTML}` },
    { type: 'business_model', freeItems: freeBullets, paidItems: paidBullets,
      html: `${sH('💰', 'BUSINESS MODEL')}${bmInner}` },
    { type: 'competitive_advantage', text: form.competitive_advantage || '',
      html: `${sH('🏆', 'COMPETITIVE ADVANTAGE')}<div class="stext">${escH(form.competitive_advantage)}</div>` },
    { type: 'risks', items: risks,
      html: `${sH('⚠️', 'RISKS &amp; CHALLENGES')}<div class="risks">${risks.map(r => `<div class="risk"><div class="rdot"></div><div class="rtxt">${escH(r)}</div></div>`).join('')}</div>` },
    { type: 'next_steps', items: nextSteps,
      html: `${sH('🚀', 'NEXT STEPS')}<div class="tl">${nextSteps.map(s => `<div class="tli"><div class="tldot"></div><div><div class="tltitle">${escH(s)}</div></div></div>`).join('')}</div>` },
  ].filter(s => s.html)

  const PAGE_H = 557
  const buckets = []
  let cur = [], curH = 0
  for (const s of sections) {
    const h = sectionHeight(s)
    if (curH + h > PAGE_H && cur.length) { buckets.push(cur); cur = []; curH = 0 }
    cur.push(s.html); curH += h
  }
  if (cur.length) buckets.push(cur)

  const darkFooter = `<div class="dfooter"><div class="logo"><svg xmlns="http://www.w3.org/2000/svg" height="28" viewBox="0 0 260 40" style="display:block"><defs><linearGradient id="aiGradLogo" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#7b9ff7"/><stop offset="100%" stop-color="#9b7ff7"/></linearGradient></defs><text font-family="Outfit, Helvetica, Arial, sans-serif" font-weight="300" font-size="32" y="32"><tspan fill="#ffffff">Eurek</tspan><tspan fill="url(#aiGradLogo)">AI</tspan><tspan fill="#ffffff">dea</tspan></text></svg></div><div class="dfbadge">myeurekaidea.com</div></div>`
  const contentPages = buckets.map((htmls, i) => {
    const foot = i === buckets.length - 1 ? darkFooter : pfooter
    return `<div class="page"><div class="abar"></div><div class="cpage">${phead(i + 2)}<div class="pbody">${htmls.join('<div class="divider"></div>')}</div>${foot}</div><div class="abar"></div></div>`
  }).join('')

  return `<style>${CSS}</style><div class="pdf-wrap">${coverPage}${contentPages}</div>`
}

function addChip(chips, setChips, input, setInput) {
  const val = input.trim()
  if (val && !chips.includes(val)) setChips([...chips, val])
  setInput('')
}

function removeChip(chips, setChips, index) {
  setChips(chips.filter((_, i) => i !== index))
}

function addSuggestion(chips, setChips, val) {
  if (!chips.includes(val)) setChips([...chips, val])
}

function ChipInput({ chips, setChips, inputVal, setInputVal, placeholder, suggestionList, loadingSuggestions, color = '#7b9ff7' }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChip(chips, setChips, inputVal, setInputVal) } }}
          placeholder={placeholder || 'Type a point and press Enter...'}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            border: '0.5px solid rgba(44,44,42,0.2)', background: '#fafaf8', color: '#2c2c2a',
            fontSize: 14, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={() => addChip(chips, setChips, inputVal, setInputVal)}
          style={{
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: color, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}
        >+ Add</button>
      </div>
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {chips.map((chip, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: color + '22', border: `1px solid ${color}`,
              borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#2c2c2a',
            }}>
              {chip}
              <span
                onClick={() => removeChip(chips, setChips, i)}
                style={{ cursor: 'pointer', color: '#aaa', fontWeight: 700, fontSize: 15, lineHeight: 1 }}
              >×</span>
            </span>
          ))}
        </div>
      )}
      {suggestionList?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: '#b0b0a8', marginBottom: 6 }}>
            {loadingSuggestions ? '✨ Loading suggestions...' : '✨ AI suggestions — click to add:'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {suggestionList.map((s, i) => (
              !chips.includes(s) && (
                <span
                  key={i}
                  onClick={() => addSuggestion(chips, setChips, s)}
                  style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: 'transparent', border: `1px dashed ${color}88`,
                    borderRadius: 20, padding: '3px 10px', fontSize: 12,
                    color: '#888', cursor: 'pointer', opacity: 0.75,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.75'}
                >{s}</span>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  )
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
  const [downloading,      setDownloading]      = useState(false)
  const [generating,       setGenerating]       = useState(false)
  const [savingProgress,   setSavingProgress]   = useState(false)
  const previewRef = useRef(null)
  const isMobile = /Mobi|Android/i.test(navigator.userAgent)

  const [bmValue,           setBmValue]           = useState(null)

  // Chip input state
  const [howItWorksChips,   setHowItWorksChips]   = useState([])
  const [howItWorksInput,   setHowItWorksInput]   = useState('')
  const [targetMarketChips, setTargetMarketChips] = useState([])
  const [targetMarketInput, setTargetMarketInput] = useState('')
  const [risksChips,        setRisksChips]        = useState([])
  const [risksInput,        setRisksInput]        = useState('')
  const [nextStepsChips,    setNextStepsChips]    = useState([])
  const [nextStepsInput,    setNextStepsInput]    = useState('')

  const [suggestions, setSuggestions] = useState({
    howItWorks: [], targetMarket: [], freeTier: [], paidTier: [], risks: [], nextSteps: [],
  })
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: { user } }, { data }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('ideas').select('*').eq('id', ideaId).single(),
      ])

      const redirectAway = () => navigate(data?.share_token ? `/share/${data.share_token}` : '/')
      if (!user || !data || data.user_id !== user.id) { redirectAway(); return }

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

      // Pre-populate chip arrays so handlePublish always has chip content
      const splitLines = (text) => text.replace(/\\n/g, '\n').split('\n')

      const hiwRaw = data.how_it_works || ''
      const hiwLines = splitLines(hiwRaw).map(s => s.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean)
      const parsedHowItWorks = hiwLines.length === 1 && hiwRaw.length > 100
        ? hiwRaw.split('. ').map(s => s.trim()).filter(Boolean)
        : hiwLines

      const parsedTargetMarket = (data.target_audience || '').split(/,\s*/).map(s => s.trim()).filter(Boolean)

      const parsedRisks = splitLines(data.risks || '')
        .map(s => s.replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean)

      const parsedNextSteps = splitLines(data.next_steps || '')
        .map(s => s.replace(/^\d+[\.\)]\s*/, '').trim())
        .filter(Boolean)

      setBmValue(parseBMValue(data.business_model) || { models: [] })

      setHowItWorksChips(parsedHowItWorks)
      setTargetMarketChips(parsedTargetMarket)
      setRisksChips(parsedRisks)
      setNextStepsChips(parsedNextSteps)

      setLoading(false)
    }
    load()
  }, [ideaId, navigate])

  useEffect(() => {
    if (!idea?.id || !idea?.problem) return
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) return
    const loadSuggestions = async () => {
      setLoadingSuggestions(true)
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: `For this idea: ${idea.title} — ${idea.problem} — ${idea.solution}, generate suggestions. Return ONLY JSON with no markdown, no backticks, no explanation: {"howItWorks": ["step 1","step 2","step 3","step 4"], "targetMarket": ["🚀 Startup Founders","💰 Investors","⚖️ IP Lawyers","💡 Inventors","🏢 Enterprises"], "freeTier": ["feature 1","feature 2","feature 3","feature 4"], "paidTier": ["feature 1","feature 2","feature 3","feature 4"], "risks": ["risk 1","risk 2","risk 3","risk 4"], "nextSteps": ["milestone 1","milestone 2","milestone 3","milestone 4"]}`,
            }],
          }),
        })
        const data = await res.json()
        const text = data.content?.[0]?.text || '{}'
        const clean = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        setSuggestions({
          howItWorks:   parsed.howItWorks   || [],
          targetMarket: parsed.targetMarket || [],
          freeTier:     parsed.freeTier     || [],
          paidTier:     parsed.paidTier     || [],
          risks:        parsed.risks        || [],
          nextSteps:    parsed.nextSteps    || [],
        })
      } catch (e) {
        console.error('Suggestion load failed', e)
      } finally {
        setLoadingSuggestions(false)
      }
    }
    loadSuggestions()
  }, [idea?.id])

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

  async function saveProgress() {
    setSavingProgress(true)
    const updates = {
      tagline:               form.tagline,
      problem:               form.problem,
      solution:              form.solution,
      market_size:           form.market_size,
      competitive_advantage: form.competitive_advantage,
      how_it_works:          howItWorksChips.length
        ? howItWorksChips.map((s, i) => `${i + 1}. ${s}`).join('\n')
        : form.how_it_works,
      target_audience:       targetMarketChips.length
        ? targetMarketChips.join(', ')
        : form.target_audience,
      business_model:        bmValue ? serializeBMValue(bmValue) : form.business_model,
      risks:                 risksChips.length
        ? risksChips.join('\n')
        : form.risks,
      next_steps:            nextStepsChips.length
        ? nextStepsChips.join('\n')
        : form.next_steps,
    }
    await supabase.from('ideas').update(updates).eq('id', ideaId)
    setSavingProgress(false)
  }

  async function handleGenerate() {
    setGenerating(true)
    const formWithChips = {
      ...form,
      how_it_works:    howItWorksChips.map((s, i) => `${i + 1}. ${s}`).join('\n'),
      target_audience: targetMarketChips.join(', '),
      risks:           risksChips.join('\n'),
      next_steps:      nextStepsChips.join('\n'),
    }
    console.log('DEBUG bmValue at generate:', JSON.stringify(bmValue))
    console.log('DEBUG form.business_model:', form.business_model)
    const html = buildPreviewHTML(formWithChips, idea, session?.user?.email, bmValue)
    setPreviewHTML(html)
    setGenerating(false)
    setStage('preview')
  }

  async function handlePublish() {
    setPublishing(true)
    const snapshot = {
      ...form,
      how_it_works:    howItWorksChips.length   ? howItWorksChips.map((s, i) => `${i + 1}. ${s}`).join('\n') : form.how_it_works,
      target_audience: targetMarketChips.length  ? targetMarketChips.join(', ')                               : form.target_audience,
      risks:           risksChips.length         ? risksChips.join('\n')                                       : form.risks,
      next_steps:      nextStepsChips.length     ? nextStepsChips.join('\n')                                   : form.next_steps,
      business_model:  bmValue ? serializeBMValue(bmValue) : form.business_model,
    }
    await supabase.from('ideas').update({
      pdf_published: true,
      pdf_snapshot:  snapshot,
    }).eq('id', ideaId)
    console.log('SNAPSHOT SAVED:', JSON.stringify(snapshot, null, 2))
    setPublishing(false)
    setPublishSuccess(true)
  }

  async function handleDownload() {
    if (!previewRef.current) return
    const pages = previewRef.current.querySelectorAll('.page')
    if (!pages.length) return
    setDownloading(true)
    try {
      if (isMobile && navigator.canShare) {
        const files = await Promise.all(
          Array.from(pages).map(async (page, i) => {
            const canvas = await html2canvas(page, { scale: 2, useCORS: true, logging: false })
            const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92))
            return new File([blob], `${idea?.title || 'pitch'}-page-${i + 1}.jpg`, { type: 'image/jpeg' })
          })
        )
        const shareData = { files, title: idea?.title || 'Pitch' }
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData)
        }
      } else {
        const pdf = new jsPDF({ unit: 'pt', format: [375, 667], orientation: 'portrait' })
        for (let i = 0; i < pages.length; i++) {
          const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, logging: false })
          const imgData = canvas.toDataURL('image/jpeg', 0.95)
          if (i > 0) pdf.addPage([375, 667], 'portrait')
          pdf.addImage(imgData, 'JPEG', 0, 0, 375, 667)
        }
        pdf.save(`${idea?.title || 'pitch'}.pdf`)
      }
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                <Logo size={15} variant="dark" />
              </span>
              {session && (
                <button onClick={() => navigate('/dashboard')} title="My Dashboard" style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {(session?.user?.user_metadata?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)) || (session?.user?.email?.[0]?.toUpperCase() || '?')}
                </button>
              )}
            </div>
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

          {/* How It Works — chip input */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', marginBottom: 2 }}>How It Works</div>
                <div style={{ fontSize: 12, color: '#b0b0a8' }}>Step-by-step breakdown of the product or process</div>
              </div>
            </div>
            <ChipInput
              chips={howItWorksChips} setChips={setHowItWorksChips}
              inputVal={howItWorksInput} setInputVal={setHowItWorksInput}
              placeholder="Describe a step and press Enter..."
              suggestionList={suggestions.howItWorks} loadingSuggestions={loadingSuggestions} color="#7b9ff7"
            />
          </div>

          {/* Target Market — chip input */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', marginBottom: 2 }}>Target Market</div>
                <div style={{ fontSize: 12, color: '#b0b0a8' }}>Who are your primary customers?</div>
              </div>
            </div>
            <ChipInput
              chips={targetMarketChips} setChips={setTargetMarketChips}
              inputVal={targetMarketInput} setInputVal={setTargetMarketInput}
              placeholder="e.g. 🚀 Startup Founders — press Enter to add"
              suggestionList={suggestions.targetMarket} loadingSuggestions={loadingSuggestions} color="#9b7ff7"
            />
          </div>

          {/* Business Model */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', marginBottom: 2 }}>Business Model</div>
                <div style={{ fontSize: 12, color: '#b0b0a8' }}>Select your model(s) and fill in the details</div>
              </div>
            </div>
            <BusinessModelSection
              value={bmValue}
              onChange={(val) => {
                setBmValue(val)
                supabase.from('ideas').update({ business_model: serializeBMValue(val) }).eq('id', ideaId)
              }}
              theme="light"
            />
          </div>

          {/* Risks & Challenges — chip input */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', marginBottom: 2 }}>Risks &amp; Challenges</div>
                <div style={{ fontSize: 12, color: '#b0b0a8' }}>Key risks and how you plan to address them</div>
              </div>
            </div>
            <ChipInput
              chips={risksChips} setChips={setRisksChips}
              inputVal={risksInput} setInputVal={setRisksInput}
              placeholder="Describe a risk and press Enter..."
              suggestionList={suggestions.risks} loadingSuggestions={loadingSuggestions} color="#e05c7a"
            />
          </div>

          {/* Next Steps — chip input */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', marginBottom: 2 }}>Next Steps</div>
                <div style={{ fontSize: 12, color: '#b0b0a8' }}>Immediate action items to move forward</div>
              </div>
            </div>
            <ChipInput
              chips={nextStepsChips} setChips={setNextStepsChips}
              inputVal={nextStepsInput} setInputVal={setNextStepsInput}
              placeholder="Describe a milestone and press Enter..."
              suggestionList={suggestions.nextSteps} loadingSuggestions={loadingSuggestions} color="#7b9ff7"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: '0.5rem' }}>
            <button
              onClick={saveProgress}
              disabled={savingProgress}
              style={{
                flex: '0 0 auto', background: 'none',
                border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 12, padding: '16px 22px',
                fontSize: 14, fontWeight: 500, color: '#888780',
                cursor: savingProgress ? 'not-allowed' : 'pointer',
                opacity: savingProgress ? 0.6 : 1, transition: 'opacity 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {savingProgress ? 'Saving…' : '💾 Save Progress'}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                flex: 1, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)',
                color: '#fff', border: 'none', borderRadius: 12, padding: '16px',
                fontSize: 16, fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
                letterSpacing: '0.2px',
                opacity: generating ? 0.75 : 1, transition: 'opacity 0.15s',
              }}
            >
              {generating ? '…Building Preview' : '✨ Generate Preview'}
            </button>
          </div>
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
          {downloading ? '…Generating' : isMobile ? '⬇ Save to Photos' : '⬇ Download PDF'}
        </button>
      )}
    </div>
  )
}
