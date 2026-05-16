import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'
import { generateIdeaPDF, dedupeArray } from '../utils/generatePDF'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

function splitHowItWorks(text) {
  if (!text?.trim()) return []
  const numMatches = [...text.matchAll(/(?:^|\n)\s*\d+[.)]\s*([^\n]+)/g)]
  if (numMatches.length >= 2) return numMatches.map(m => m[1].trim()).filter(Boolean)
  const lines = text.split(/\n+/).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(l => l.length > 4)
  if (lines.length >= 2) return lines
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 10)
  if (sentences.length >= 2) return sentences
  return [text.trim()]
}

function _esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function _parseSteps(text) {
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

function buildSnapshotHTML(form, idea) {
  const cats = Array.isArray(idea.categories)
    ? idea.categories
    : typeof idea.categories === 'string'
    ? idea.categories.split(',').map(s => s.trim()).filter(Boolean)
    : []

  const steps = _parseSteps(form.how_it_works)
  const audienceTags = (form.target_audience || '').split(',').map(s => s.trim()).filter(Boolean)
    .filter(t => !cats.some(c => c.toLowerCase() === t.toLowerCase()))
  const marketNums = (form.market_size || '').match(/\$[\d.]+[BMKbmk]+\+?/g) || []
  const bmLines = (form.business_model || '').split('\n').map(s => s.trim()).filter(Boolean)
  const freeItems = bmLines.filter(l => /^free:/i.test(l)).map(l => l.replace(/^free:\s*/i, ''))
  const paidItems = bmLines.filter(l => /^paid:/i.test(l)).map(l => l.replace(/^paid:\s*/i, ''))
  const freeHTML = freeItems.length ? freeItems.map(f => `· ${_esc(f)}`).join('<br>') : _esc(bmLines[0] || '')
  const paidHTML = paidItems.length ? paidItems.map(f => `· ${_esc(f)}`).join('<br>') : _esc(bmLines[1] || '')
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
    ${q} .pdf-wrap{display:flex;flex-direction:column;gap:12px;width:375px;margin:0 auto}
    ${q} .page{width:375px;height:667px;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0;display:flex;flex-direction:column;box-sizing:border-box}
    ${q} .abar{height:4px;background:linear-gradient(90deg,#7b9ff7,#9b7ff7);flex-shrink:0}
    ${q} .cover{background:#0e0e1f;flex:1;padding:28px 22px 22px;display:flex;flex-direction:column;justify-content:space-between}
    ${q} .logo{font-family:'Outfit',sans-serif;font-size:14px;font-weight:300;color:#fff}
    ${q} .logo b{background:linear-gradient(90deg,#7b9ff7,#9b7ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:700}
    ${q} .cbadge{background:rgba(123,159,247,0.15);border:1px solid rgba(123,159,247,0.3);border-radius:20px;padding:3px 10px;font-size:8px;color:#7b9ff7;letter-spacing:2px;text-transform:uppercase}
    ${q} .cnav{display:flex;justify-content:space-between;align-items:center}
    ${q} .ccats{display:flex;gap:5px;flex-wrap:wrap;margin-top:6px}
    ${q} .cat{background:rgba(123,159,247,0.1);border:1px solid rgba(123,159,247,0.2);border-radius:4px;padding:3px 8px;font-size:9px;color:#7b9ff7}
    ${q} .cmid{display:flex;flex-direction:column;gap:10px}
    ${q} .ctitle{font-size:22px;font-weight:700;color:#fff;line-height:1.2}
    ${q} .ctagline{font-size:13px;color:rgba(255,255,255,0.45);line-height:1.5}
    ${q} .cdiv{height:1px;background:linear-gradient(90deg,rgba(123,159,247,0.5),transparent)}
    ${q} .cmeta{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    ${q} .mlabel{font-size:8px;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
    ${q} .mval{font-size:12px;color:rgba(255,255,255,0.7);font-weight:500}
    ${q} .chash{font-size:7px;color:rgba(255,255,255,0.15);font-family:monospace;word-break:break-all;line-height:1.6}
    ${q} .cpage{background:#fff;flex:1;display:flex;flex-direction:column}
    ${q} .phead{padding:11px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;flex-shrink:0}
    ${q} .logod{font-family:'Outfit',sans-serif;font-size:12px;font-weight:300;color:#0e0e1f}
    ${q} .logod b{background:linear-gradient(90deg,#7b9ff7,#9b7ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:700}
    ${q} .pnum{font-size:9px;color:#ccc}
    ${q} .pbody{padding:14px 18px;display:flex;flex-direction:column;gap:13px;flex:1;overflow:hidden}
    ${q} .shead{display:flex;align-items:center;gap:9px;flex-shrink:0}
    ${q} .sicon{width:32px;height:32px;border-radius:8px;background:rgba(123,159,247,0.1);border:1px solid rgba(123,159,247,0.15);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
    ${q} .slabel{font-size:9px;letter-spacing:2px;color:#9b7ff7;text-transform:uppercase;font-weight:600}
    ${q} .stext{font-size:12px;color:#333;line-height:1.7}
    ${q} .hlight{background:rgba(123,159,247,0.07);border:1px solid rgba(123,159,247,0.15);border-left:3px solid #7b9ff7;border-radius:0 8px 8px 0;padding:11px 13px;flex-shrink:0}
    ${q} .hlabel{font-size:8px;letter-spacing:2px;color:#7b9ff7;text-transform:uppercase;font-weight:600;margin-bottom:5px}
    ${q} .htext{font-size:12px;color:#333;line-height:1.7}
    ${q} .divider{height:1px;background:#f0f0f0;flex-shrink:0}
    ${q} .steps{display:flex;flex-direction:column;gap:9px}
    ${q} .step{display:flex;gap:9px;align-items:flex-start}
    ${q} .snum{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#7b9ff7,#9b7ff7);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
    ${q} .stxt{font-size:12px;color:#333;line-height:1.55;padding-top:2px}
    ${q} .bmet{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
    ${q} .bm{background:rgba(123,159,247,0.06);border:1px solid rgba(123,159,247,0.12);border-radius:8px;padding:12px 6px;text-align:center}
    ${q} .bmv{font-size:15px;font-weight:700;color:#0e0e1f;margin-bottom:3px}
    ${q} .bml{font-size:8px;color:#999;letter-spacing:0.5px;text-transform:uppercase}
    ${q} .tags{display:flex;gap:5px;flex-wrap:wrap}
    ${q} .tag{background:rgba(123,159,247,0.08);border:1px solid rgba(123,159,247,0.2);border-radius:20px;padding:3px 9px;font-size:10px;color:#7b9ff7}
    ${q} .twocards{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    ${q} .card{background:#f8f8fc;border-radius:8px;padding:11px;box-sizing:border-box}
    ${q} .card.bl{border-top:3px solid #7b9ff7}
    ${q} .card.pu{border-top:3px solid #9b7ff7}
    ${q} .cicon{font-size:18px;margin-bottom:5px}
    ${q} .clabel{font-size:8px;letter-spacing:2px;color:#9b7ff7;text-transform:uppercase;font-weight:600;margin-bottom:5px}
    ${q} .ctext{font-size:11px;color:#555;line-height:1.6}
    ${q} .risks{display:flex;flex-direction:column}
    ${q} .risk{display:flex;gap:9px;padding:9px 0;border-bottom:1px solid #f5f5f5}
    ${q} .risk:last-child{border-bottom:none}
    ${q} .rdot{width:7px;height:7px;border-radius:50%;background:#e07b9f;flex-shrink:0;margin-top:5px}
    ${q} .rtxt{font-size:12px;color:#444;line-height:1.6}
    ${q} .tl{display:flex;flex-direction:column;gap:13px}
    ${q} .tli{display:flex;gap:11px}
    ${q} .tldot{width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#7b9ff7,#9b7ff7);flex-shrink:0;margin-top:3px}
    ${q} .tltitle{font-size:12px;font-weight:600;color:#0e0e1f;margin-bottom:3px}
    ${q} .tltext{font-size:11px;color:#666;line-height:1.55}
    ${q} .pfooter{padding:8px 18px;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between;flex-shrink:0}
    ${q} .pf{font-size:8px;color:#ccc}
    ${q} .dfooter{background:#0e0e1f;padding:16px 18px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
    ${q} .dfbadge{background:rgba(123,159,247,0.1);border:1px solid rgba(123,159,247,0.2);border-radius:20px;padding:3px 10px;font-size:8px;color:#7b9ff7;letter-spacing:2px;text-transform:uppercase}
  `
  const ph = (n) => `<div class="phead"><div class="logod">Eurek<b>AI</b>dea</div><div class="pnum">Page ${n}</div></div>`
  const pf = `<div class="pfooter"><div class="pf">CONFIDENTIAL</div><div class="pf">myeurekaidea.com</div></div>`

  const cover = `<div class="page"><div class="abar"></div><div class="cover"><div><div class="cnav"><div class="logo">Eurek<b>AI</b>dea</div><div class="cbadge">CONFIDENTIAL</div></div><div class="ccats">${cats.map(c=>`<div class="cat">${_esc(c)}</div>`).join('')}</div></div><div class="cmid"><div class="ctitle">${_esc(idea.title)}</div><div class="ctagline">${_esc(form.tagline)}</div><div class="cdiv"></div><div class="cmeta"><div><div class="mlabel">DATE</div><div class="mval">${_esc(dateStr)}</div></div><div><div class="mlabel">MARKET SIZE</div><div class="mval">${_esc(marketBoxes[0].v)}</div></div><div><div class="mlabel">LOOKING FOR</div><div class="mval">${_esc(idea.looking_for||'Investors')}</div></div><div><div class="mlabel">STATUS</div><div class="mval">Confidential</div></div></div></div>${idea.blockchain_hash?`<div class="chash">${_esc(idea.blockchain_hash)}</div>`:''}</div></div>`

  const stepsHTML = steps.length===1
    ? `<div class="stext">${_esc(steps[0])}</div>`
    : `<div class="steps">${steps.map((s,i)=>`<div class="step"><div class="snum">${i+1}</div><div class="stxt">${_esc(s)}</div></div>`).join('')}</div>`

  const tagsHTML = audienceTags.length>0
    ? `<div class="tags">${audienceTags.map(t=>`<div class="tag">${_esc(t)}</div>`).join('')}</div>`
    : `<div class="stext">${_esc(form.target_audience)}</div>`

  const p2 = `<div class="page"><div class="abar"></div><div class="cpage">${ph(2)}<div class="pbody"><div class="shead"><div class="sicon">⚡</div><div class="slabel">THE PROBLEM</div></div><div class="stext">${_esc(form.problem)}</div><div class="divider"></div><div class="hlight"><div class="hlabel">💡 THE SOLUTION</div><div class="htext">${_esc(form.solution)}</div></div></div>${pf}</div><div class="abar"></div></div>`
  const p3 = `<div class="page"><div class="abar"></div><div class="cpage">${ph(3)}<div class="pbody"><div class="shead"><div class="sicon">⚙️</div><div class="slabel">HOW IT WORKS</div></div>${stepsHTML}<div class="divider"></div><div class="shead"><div class="sicon">📈</div><div class="slabel">MARKET SIZE</div></div><div class="bmet">${marketBoxes.map(b=>`<div class="bm"><div class="bmv">${_esc(b.v)}</div><div class="bml">${_esc(b.l)}</div></div>`).join('')}</div><div class="stext" style="font-size:11px;color:#888;margin-top:2px">${_esc(form.market_size)}</div></div>${pf}</div><div class="abar"></div></div>`
  const p4 = `<div class="page"><div class="abar"></div><div class="cpage">${ph(4)}<div class="pbody"><div class="shead"><div class="sicon">🎯</div><div class="slabel">TARGET MARKET</div></div>${tagsHTML}<div class="divider"></div><div class="shead"><div class="sicon">💰</div><div class="slabel">BUSINESS MODEL</div></div><div class="twocards"><div class="card bl"><div class="cicon">🆓</div><div class="clabel">FREE TIER</div><div class="ctext">${freeHTML}</div></div><div class="card pu"><div class="cicon">⭐</div><div class="clabel">PAID TIER</div><div class="ctext">${paidHTML}</div></div></div></div>${pf}</div><div class="abar"></div></div>`
  const p5 = `<div class="page"><div class="abar"></div><div class="cpage">${ph(5)}<div class="pbody"><div class="shead"><div class="sicon">🏆</div><div class="slabel">COMPETITIVE ADVANTAGE</div></div><div class="stext">${_esc(form.competitive_advantage)}</div><div class="divider"></div><div class="shead"><div class="sicon">⚠️</div><div class="slabel">RISKS &amp; CHALLENGES</div></div><div class="risks">${risks.map(r=>`<div class="risk"><div class="rdot"></div><div class="rtxt">${_esc(r)}</div></div>`).join('')}</div></div>${pf}</div><div class="abar"></div></div>`
  const pLast = `<div class="page"><div class="abar"></div><div class="cpage">${ph('Final')}<div class="pbody"><div class="shead"><div class="sicon">🚀</div><div class="slabel">NEXT STEPS</div></div><div class="tl">${nextSteps.map(s=>`<div class="tli"><div class="tldot"></div><div><div class="tltitle">${_esc(s)}</div></div></div>`).join('')}</div></div><div class="dfooter"><div class="logo">Eurek<b>AI</b>dea</div><div class="dfbadge">myeurekaidea.com</div></div></div><div class="abar"></div></div>`

  return `<style>${CSS}</style><div class="pdf-wrap">${cover}${p2}${p3}${p4}${p5}${pLast}</div>`
}

export default function SharedIdea() {
  const { token } = useParams()
  const [stage, setStage] = useState('loading')
  const [idea, setIdea] = useState(null)
  const [email, setEmail] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [deckInfo, setDeckInfo] = useState(null)   // { share_token } if public deck exists
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [downloadingSnapshotPDF, setDownloadingSnapshotPDF] = useState(false)
  const [viewingSnapshotPDF, setViewingSnapshotPDF] = useState(false)

  useEffect(() => {
    async function fetchLink() {
      const { data: link, error } = await supabase
        .from('shared_links')
        .select('*, ideas(*)')
        .eq('token', token)
        .maybeSingle()

      if (error) console.error('shared_links fetch error:', error.message, error.code)
      if (!link || !link.ideas) {
        setStage('error')
        return
      }
      setIdea(link.ideas)
      setStage('nda')

      // Check whether the owner has published a public deck for this idea
      const { data: deck } = await supabase
        .from('pitch_decks')
        .select('share_token, is_public')
        .eq('idea_id', link.ideas.id)
        .eq('is_public', true)
        .maybeSingle()
      if (deck?.share_token) setDeckInfo(deck)
    }
    fetchLink()
  }, [token])

  async function acceptNDA() {
    if (!email) return
    setAccepting(true)

    const { error: logError } = await supabase.from('idea_access_log').insert({
      idea_id: idea.id,
      viewer_email: email,
      viewer_ip: 'logged',
      nda_accepted: true,
    })
    if (logError) console.error('idea_access_log insert error:', logError.message, logError.code)

    setStage('idea')
    setAccepting(false)
  }

  function buildSnapshotForm(ideaData) {
    return {
      tagline:               ideaData.tagline               || '',
      problem:               ideaData.problem               || '',
      solution:              ideaData.solution              || '',
      how_it_works:          ideaData.how_it_works          || '',
      market_size:           ideaData.market_size           || '',
      target_audience:       ideaData.target_audience       || '',
      business_model:        ideaData.business_model        || '',
      competitive_advantage: ideaData.competitive_advantage || '',
      risks:                 ideaData.risks                 || '',
      next_steps:            ideaData.next_steps            || '',
      ...(ideaData.pdf_snapshot || {}),
    }
  }

  async function fetchFreshIdea() {
    const { data } = await supabase
      .from('ideas')
      .select('*')
      .eq('id', idea.id)
      .single()
    console.log('FRESH IDEA DATA:', JSON.stringify(data, null, 2))
    if (data) setIdea(data)
    return data || idea
  }

  async function viewSnapshotPDF() {
    setViewingSnapshotPDF(true)
    const fresh = await fetchFreshIdea()
    const form = buildSnapshotForm(fresh)
    const inner = buildSnapshotHTML(form, fresh)
    const fullHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fresh.title} — Pitch PDF</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f5f5f3;padding:20px 0;min-height:100vh"><div id="pdf-preview">${inner}</div></body></html>`
    const blob = new Blob([fullHTML], { type: 'text/html' })
    window.open(URL.createObjectURL(blob), '_blank')
    setViewingSnapshotPDF(false)
  }

  async function downloadSnapshotPDF() {
    setDownloadingSnapshotPDF(true)
    const fresh = await fetchFreshIdea()
    const form = buildSnapshotForm(fresh)
    const inner = buildSnapshotHTML(form, fresh)
    const container = document.createElement('div')
    container.id = 'pdf-preview'
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:375px;z-index:-9999'
    container.innerHTML = inner
    document.body.appendChild(container)
    try {
      const pages = container.querySelectorAll('.page')
      const pdf = new jsPDF({ unit: 'pt', format: [375, 667], orientation: 'portrait' })
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, logging: false })
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        if (i > 0) pdf.addPage([375, 667], 'portrait')
        pdf.addImage(imgData, 'JPEG', 0, 0, 375, 667)
      }
      pdf.save(`${idea.title || 'pitch'}.pdf`)
    } catch (e) { console.error('Snapshot PDF download error:', e) }
    document.body.removeChild(container)
    setDownloadingSnapshotPDF(false)
  }

  function handleDownloadPDF() {
    setDownloadingPDF(true)
    try {
      generateIdeaPDF(idea)
    } catch (e) {
      console.error('PDF error:', e)
    }
    setDownloadingPDF(false)
  }

  if (stage === 'loading') return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e1f' }}>
      <div className="spinner" />
    </div>
  )

  if (stage === 'error') return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#0e0e1f', padding: '2rem' }}>
      <Logo size={22} />
      <span style={{ fontSize: 40, opacity: 0.25 }}>⬡</span>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff' }}>Link not found</h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>This link may have expired or been revoked.</p>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 8 }}>Presented via eurekAIdea · myeurekaidea.com</p>
    </div>
  )

  // ─── PHASE 1: TEASER / NDA ───────────────────────────────────────────────
  if (stage === 'nda') return (
    <div style={{ minHeight: '100vh', background: '#0e0e1f', position: 'relative', overflow: 'hidden' }}>
      {/* Gradient accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' }} />

      {/* Geometric decorations */}
      <div style={{ position: 'absolute', top: -140, right: -140, width: 420, height: 420, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: -70, right: -70, width: 260, height: 260, borderRadius: '50%', border: '1px solid rgba(123,159,247,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -100, width: 320, height: 320, borderRadius: '50%', border: '1px solid rgba(155,127,247,0.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -40, left: -40, width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(155,127,247,0.05)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '3.5rem 1.25rem 3rem', position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Logo size={24} />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(28px, 6vw, 40px)', color: '#fff', lineHeight: 1.15, marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>
            {idea.title}
          </h1>
          {idea.target_audience && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>
              Built for {idea.target_audience}
            </p>
          )}
        </div>

        {/* Category chips — deduplicated */}
        {dedupeArray(idea.category || []).length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginBottom: '2rem' }}>
            {dedupeArray(idea.category || []).map(c => (
              <span key={c} style={{ fontSize: 11, background: 'rgba(123,159,247,0.1)', color: '#7b9ff7', borderRadius: 20, padding: '4px 12px', fontWeight: 500, border: '0.5px solid rgba(123,159,247,0.18)' }}>{c}</span>
            ))}
          </div>
        )}

        {/* Blurred preview card */}
        <div style={{ position: 'relative', marginBottom: '1.75rem', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '1.5rem', filter: 'blur(5px)', userSelect: 'none', pointerEvents: 'none', minHeight: 90 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(123,159,247,0.5)', marginBottom: 8 }}>The Problem</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7 }}>
              {idea.problem ? idea.problem.slice(0, 110) + '...' : 'Protected content · Accept NDA to view the full idea details and pitch documents.'}
            </p>
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(14,14,31,0.2) 0%, rgba(14,14,31,0.88) 100%)', borderRadius: 14 }} />
          <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.3px' }}>Content protected · accept NDA to reveal</span>
          </div>
        </div>

        {/* Protection badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(123,159,247,0.07)', border: '0.5px solid rgba(123,159,247,0.18)', borderRadius: 20, padding: '6px 16px' }}>
            <span style={{ fontSize: 12 }}>🔒</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>This idea is protected by eurekAIdea</span>
          </div>
        </div>

        {/* NDA form card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: '1.75rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Your email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              onKeyDown={e => e.key === 'Enter' && email && !accepting && acceptNDA()}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#fff', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            onClick={acceptNDA}
            disabled={!email || accepting}
            style={{
              width: '100%',
              background: (!email || accepting) ? 'rgba(123,159,247,0.3)' : 'linear-gradient(90deg, #7b9ff7, #9b7ff7)',
              color: '#fff', border: 'none', borderRadius: 10, padding: '14px',
              fontSize: 15, fontWeight: 600,
              cursor: (!email || accepting) ? 'not-allowed' : 'pointer',
              letterSpacing: '0.2px',
            }}
          >
            {accepting ? 'Logging access...' : 'View Protected Idea — Accept NDA'}
          </button>

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 12, lineHeight: 1.65 }}>
            By proceeding you agree this content is confidential and proprietary.<br />
            Your identity and access time will be logged.
          </p>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.18)' }}>Presented via eurekAIdea · myeurekaidea.com</p>
        </div>
      </div>
    </div>
  )

  // ─── PHASE 2: FULL CONTENT ───────────────────────────────────────────────
  const date = new Date(idea.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const categories = dedupeArray(idea.category || [])
  const lookingFor = dedupeArray((idea.terms || '').split(', ').filter(Boolean))

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f3' }}>
      {/* Gradient accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' }} />

      {/* Dark header */}
      <div style={{ background: '#0e0e1f', paddingBottom: '2.5rem' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '1.5rem 1.25rem 0' }}>

          {/* Nav row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: 8 }}>
            <Logo size={20} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(123,159,247,0.09)', border: '0.5px solid rgba(123,159,247,0.18)', borderRadius: 20, padding: '5px 13px' }}>
              <span style={{ fontSize: 11 }}>🔒</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>NDA accepted · access logged</span>
            </div>
          </div>

          {/* Categories + hash badge — deduplicated */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
            {categories.map(c => (
              <span key={c} style={{ fontSize: 11, background: 'rgba(123,159,247,0.1)', color: '#7b9ff7', borderRadius: 20, padding: '4px 12px', fontWeight: 500, border: '0.5px solid rgba(123,159,247,0.18)' }}>{c}</span>
            ))}
            {idea.blockchain_hash && (
              <span style={{ fontSize: 11, background: 'rgba(74,222,128,0.08)', color: '#4ade80', borderRadius: 20, padding: '4px 12px', fontWeight: 500, border: '0.5px solid rgba(74,222,128,0.18)' }}>⬡ Timestamped</span>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(28px, 5vw, 40px)', color: '#fff', lineHeight: 1.15, marginBottom: '0.5rem', letterSpacing: '-0.5px' }}>
            {idea.title}
          </h1>
          {idea.target_audience && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', marginBottom: '0.5rem' }}>
              Built for {idea.target_audience}
            </p>
          )}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)' }}>Protected idea · submitted {date}</p>
        </div>
      </div>

      {/* White content area */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

        {/* Card 1: Problem & Solution */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {idea.problem && (
            <div style={{ background: '#0e0e1f', borderRadius: 14, padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem' }}>
                <span style={{ fontSize: 16 }}>⚡</span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.35)' }}>The Problem</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.78)' }}>{idea.problem}</p>
            </div>
          )}

          {idea.solution && (
            <div style={{ background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', borderRadius: 15, padding: 1.5 }}>
              <div style={{ background: '#fff', borderRadius: 13, padding: '1.5rem', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: 16 }}>💡</span>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#9b7ff7' }}>The Solution</span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{idea.solution}</p>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Key Details — all arrays deduplicated */}
        {(idea.market_size || idea.terms || categories.length > 0) && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>Key Details</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {idea.market_size && (
                <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '8px 14px' }}>
                  <span style={{ fontSize: 11, color: '#888780' }}>Market · </span>
                  <span style={{ fontSize: 13, color: '#2c2c2a', fontWeight: 500 }}>{idea.market_size}</span>
                </div>
              )}
              {categories.map(c => (
                <div key={c} style={{ background: '#EBF0F7', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#3B5273', fontWeight: 500 }}>{c}</div>
              ))}
              {lookingFor.map(t => (
                <div key={t} style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#16a34a', fontWeight: 500 }}>Looking for: {t}</div>
              ))}
              {idea.asking_price && (
                <div style={{ background: '#fdf8f0', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#92400e', fontWeight: 500 }}>{idea.asking_price} · {idea.pricing_model}</div>
              )}
            </div>
          </div>
        )}

        {/* Card 3: How It Works */}
        {idea.how_it_works && (() => {
          const steps = splitHowItWorks(idea.how_it_works)
          return (
            <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>How It Works</p>
              {steps.length === 1
                ? <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{steps[0]}</p>
                : steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, marginBottom: '0.85rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                      <p style={{ fontSize: 14, lineHeight: 1.75, color: '#2c2c2a', paddingTop: 2 }}>{step}</p>
                    </div>
                  ))
              }
            </div>
          )
        })()}

        {/* Card 4: Business Model (conditional) */}
        {idea.business_model && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '0.75rem' }}>Business Model</p>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{idea.business_model}</p>
          </div>
        )}

        {/* Card 5: Pitch Documents — only shown when at least one is published */}
        {(idea.pdf_published || idea.deck_published) && (
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '0.85rem', paddingLeft: 2 }}>Pitch Documents</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>

              {idea.pdf_published && (
                <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: 22 }}>📄</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#2c2c2a' }}>Pitch PDF</p>
                      <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>Published ✓</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={viewSnapshotPDF}
                      disabled={viewingSnapshotPDF}
                      style={{ flex: 1, textAlign: 'center', background: 'rgba(123,159,247,0.07)', border: '0.5px solid rgba(123,159,247,0.22)', borderRadius: 7, padding: '7px 0', fontSize: 12, color: '#7b9ff7', cursor: viewingSnapshotPDF ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: viewingSnapshotPDF ? 0.6 : 1 }}
                    >
                      {viewingSnapshotPDF ? '…' : 'View'}
                    </button>
                    <button
                      onClick={downloadSnapshotPDF}
                      disabled={downloadingSnapshotPDF}
                      style={{ flex: 1, textAlign: 'center', background: 'rgba(123,159,247,0.13)', border: '0.5px solid rgba(123,159,247,0.22)', borderRadius: 7, padding: '7px 0', fontSize: 12, color: '#7b9ff7', cursor: downloadingSnapshotPDF ? 'not-allowed' : 'pointer', fontWeight: 500, opacity: downloadingSnapshotPDF ? 0.6 : 1 }}
                    >
                      {downloadingSnapshotPDF ? '…' : '↓ Download'}
                    </button>
                  </div>
                </div>
              )}

              {idea.deck_published && (
                <div style={{ background: 'linear-gradient(135deg, rgba(123,159,247,0.04), rgba(155,127,247,0.04))', border: '0.5px solid rgba(123,159,247,0.22)', borderRadius: 14, padding: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: '0.85rem' }}>
                    <span style={{ fontSize: 22 }}>📊</span>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#2c2c2a' }}>Pitch Deck</p>
                      <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>Published ✓</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <a
                      href={deckInfo ? `/deck/view/${deckInfo.share_token}` : `/deck/${idea.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flex: 1, textAlign: 'center', background: 'rgba(123,159,247,0.07)', border: '0.5px solid rgba(123,159,247,0.22)', borderRadius: 7, padding: '7px 0', fontSize: 12, color: '#7b9ff7', textDecoration: 'none', fontWeight: 500 }}
                    >
                      View
                    </a>
                    {deckInfo && (
                      <a
                        href={`/deck/view/${deckInfo.share_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ flex: 1, textAlign: 'center', background: 'rgba(123,159,247,0.13)', border: '0.5px solid rgba(123,159,247,0.22)', borderRadius: 7, padding: '7px 0', fontSize: 12, color: '#7b9ff7', textDecoration: 'none', fontWeight: 500 }}
                      >
                        ↓ Download
                      </a>
                    )}
                  </div>
                </div>
              )}

            </div>
        </div>
        )}

        {/* Card 6: AI Executive Summary (collapsed) */}
        {idea.ai_profile && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, marginBottom: '1.25rem', overflow: 'hidden' }}>
            <button
              onClick={() => setSummaryExpanded(x => !x)}
              style={{ width: '100%', background: 'none', border: 'none', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888780' }}>AI Executive Summary</span>
              </div>
              <span style={{ fontSize: 12, color: '#7b9ff7', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 12 }}>
                {summaryExpanded ? 'Collapse ▲' : 'Read full summary ▼'}
              </span>
            </button>
            {summaryExpanded && (
              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                <p style={{ fontSize: 14, lineHeight: 1.85, color: '#2c2c2a', fontStyle: 'italic' }}>{idea.ai_profile}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ background: '#0e0e1f', borderRadius: 14, padding: '1.5rem 1.75rem', textAlign: 'center' }}>
          {idea.blockchain_hash && (
            <div style={{ marginBottom: '0.85rem' }}>
              <p style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(255,255,255,0.2)', marginBottom: 5 }}>Cryptographic fingerprint</p>
              <code style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', wordBreak: 'break-all', fontFamily: 'monospace' }}>{idea.blockchain_hash}</code>
            </div>
          )}
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>🔒 Access logged · Confidential under NDA</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginTop: 6 }}>Presented via eurekAIdea · myeurekaidea.com</p>
        </div>
      </div>
    </div>
  )
}
