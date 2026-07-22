import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import html2pdf from 'html2pdf.js'
import Logo from '../components/Logo'
import NavBar from '../components/NavBar'
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
        return OVERHEAD + Math.ceil((s.text || '').length / 60) * LINE
      case 'how_it_works':
        return OVERHEAD + (s.items || []).length * (LINE + 10)
      case 'target_market':
        return OVERHEAD + Math.ceil((s.items || []).length / 4) * (LINE + 8)
      case 'market_size':
        return OVERHEAD + 3 * LINE
      case 'business_model':
        return OVERHEAD + Math.max((s.freeItems || []).length, (s.paidItems || []).length) * LINE + 60
      case 'risks': case 'next_steps':
        return OVERHEAD + (s.items || []).length * (LINE + 8)
      case 'team':
        return OVERHEAD + 5 * LINE
      case 'origin_story':
        return OVERHEAD + 4 * LINE
      case 'customer_validation':
        return OVERHEAD + 3 * LINE
      case 'traction':
        return OVERHEAD + 5 * LINE
      case 'competitive_landscape':
        return OVERHEAD + 5 * LINE
      case 'revenue_projections':
        return OVERHEAD + 5 * LINE
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
    (idea._pdf_team?.name || (typeof idea.team === 'string' ? (() => { try { return JSON.parse(idea.team) } catch { return null } })() : idea.team)?.name) ? (() => {
      try {
        const t = idea._pdf_team?.name ? idea._pdf_team : (typeof idea.team === 'string' ? JSON.parse(idea.team) : idea.team)
        if (!t?.name) return null
        return {
          type: 'team',
          html: `${sH('👥', 'THE TEAM')}<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#7b9ff7,#9b7ff7);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0">${escH((t.name||'?')[0].toUpperCase())}</div><div><div style="font-size:13px;font-weight:600;color:#0e0e1f">${escH(t.name||'')}</div><div style="font-size:11px;color:#888">${escH(t.role||'')}</div></div></div>${t.bio ? `<div class="stext">${escH(t.bio)}</div>` : ''}${t.origin ? `<div class="hlight" style="margin-top:8px"><div class="hlabel">Origin Story</div><div class="htext" style="font-style:italic">${escH(t.origin)}</div></div>` : ''}`
        }
      } catch { return null }
    })() : null,
    (idea._pdf_origin_story || idea.origin_story) ? {
      type: 'origin_story',
      html: `${sH('✨', 'ORIGIN STORY')}<div class="hlight"><div class="htext" style="font-style:italic">${escH(idea._pdf_origin_story || idea.origin_story)}</div></div>`
    } : null,
    (idea._pdf_customer_validation?.waitlist || idea._pdf_customer_validation?.interviews || idea._pdf_customer_validation?.pilots || idea._pdf_customer_validation?.stage || idea.customer_validation) ? (() => {
      try {
        const cv = idea._pdf_customer_validation?.waitlist || idea._pdf_customer_validation?.interviews || idea._pdf_customer_validation?.pilots || idea._pdf_customer_validation?.stage
          ? idea._pdf_customer_validation
          : (typeof idea.customer_validation === 'string' ? JSON.parse(idea.customer_validation) : idea.customer_validation)
        if (!cv) return null
        const stats = [
          cv.waitlist ? { v: cv.waitlist, l: 'Waitlist' } : null,
          cv.interviews ? { v: cv.interviews, l: 'Interviews' } : null,
          cv.pilots ? { v: cv.pilots, l: 'Pilots' } : null,
          cv.stage ? { v: cv.stage, l: 'Stage' } : null,
        ].filter(Boolean)
        if (!stats.length) return null
        return {
          type: 'customer_validation',
          html: `${sH('✅', 'CUSTOMER VALIDATION')}<div class="bmet">${stats.map(s => `<div class="bm"><div class="bmv">${escH(String(s.v))}</div><div class="bml">${escH(s.l)}</div></div>`).join('')}</div>`
        }
      } catch { return null }
    })() : null,
    (idea._pdf_traction_milestones?.length || idea.traction) ? (() => {
      try {
        const milestones = idea._pdf_traction_milestones?.length
          ? idea._pdf_traction_milestones
          : (typeof idea.traction === 'string' ? JSON.parse(idea.traction) : idea.traction)?.milestones
        if (!milestones?.length) return null
        return {
          type: 'traction',
          html: `${sH('📊', 'TRACTION & MILESTONES')}<div class="tl">${milestones.slice(0,5).map(m => `<div class="tli"><div class="tldot" style="background:${m.status==='done'?'#22c55e':m.status==='in-progress'?'#7b9ff7':'#d1d5db'}"></div><div><div class="tltitle">${escH(m.label||'')}</div>${m.date?`<div class="tltext">${escH(m.date)}</div>`:''}</div></div>`).join('')}</div>`
        }
      } catch { return null }
    })() : null,
    (idea.who_pays || idea.revenue_streams || idea.pricing_power || idea.revenue_potential || idea.business_stage) ? (() => {
      const rows = [
        { label: 'Who pays', val: idea.who_pays },
        { label: 'Revenue streams', val: idea.revenue_streams },
        { label: 'Pricing power', val: idea.pricing_power },
        { label: 'Revenue potential', val: idea.revenue_potential },
        { label: 'Business stage', val: idea.business_stage },
      ].filter(r => r.val)
      if (!rows.length) return null
      return {
        type: 'revenue_details',
        html: `${sH('💰', 'REVENUE DETAILS')}<div style="display:flex;flex-direction:column;gap:10px">${rows.map(r => `<div><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#888780;margin-bottom:3px">${escH(r.label)}</div><div style="font-size:12px;color:#2c2c2a;line-height:1.6">${escH(r.val)}</div></div>`).join('')}</div>`
      }
    })() : null,
    idea.competitive_landscape ? (() => {
      try {
        const svgLabelAttrs = (cx, cW, offset = 8) => cx > cW * 0.55 ? { x: cx - offset, textAnchor: 'end' } : { x: cx + offset, textAnchor: 'start' }
        const cl = typeof idea.competitive_landscape === 'string' ? JSON.parse(idea.competitive_landscape) : idea.competitive_landscape
        if (!cl) return null

        if (cl.format === 'table' && cl.table?.competitors?.length) {
          const cols = cl.table.columns || []
          const competitors = cl.table.competitors
          const headerRow = `<tr><th style="text-align:left;padding:6px 10px;font-size:10px;color:#888;font-weight:700;border-bottom:2px solid #7b9ff7">Competitor</th>${cols.map(c=>`<th style="padding:6px 10px;font-size:10px;color:#888;font-weight:700;text-align:center;border-bottom:2px solid #7b9ff7">${escH(c)}</th>`).join('')}</tr>`
          const yourRow = `<tr style="background:rgba(123,159,247,0.08);border-left:3px solid #7b9ff7"><td style="padding:6px 10px;font-size:11px;font-weight:700;color:#7b9ff7">${escH(idea.title || 'Your idea')}</td>${cols.map(()=>`<td style="text-align:center;padding:6px 10px;font-size:14px;color:#22c55e">✓</td>`).join('')}</tr>`
          const rows = competitors.map(c=>`<tr style="border-bottom:1px solid #f5f5f5"><td style="padding:6px 10px;font-size:11px;color:#333">${escH(c.name)}</td>${(c.checks||[]).map(ch=>`<td style="text-align:center;padding:6px 10px;font-size:13px;color:${ch?'#22c55e':'#ccc'}">${ch?'✓':'—'}</td>`).join('')}</tr>`).join('')
          return { type: 'competitive_landscape', html: `${sH('🏁', 'COMPETITIVE LANDSCAPE')}<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:11px">${headerRow}${yourRow}${rows}</table></div>` }
        }

        if (cl.format === 'matrix' && cl.matrix?.competitors?.length) {
          const W = 300, H = 260
          const competitors = cl.matrix.competitors
          const self = cl.matrix.self || { x: 0.8, y: 0.8 }
          const axisX = cl.matrix.axis_x?.label || 'X axis'
          const axisY = cl.matrix.axis_y?.label || 'Y axis'
          const dots = competitors.map(c => {
            const cx = Math.round(40 + c.x * (W - 60))
            const cy = Math.round(10 + (1 - c.y) * (H - 40))
            const _la = svgLabelAttrs(cx, W)
            return `<circle cx="${cx}" cy="${cy}" r="5" fill="#888780" opacity="0.8"/><text x="${_la.x}" y="${cy + 4}" font-size="9" fill="#555" text-anchor="${_la.textAnchor}" font-family="Inter,sans-serif">${escH(c.name)}</text>`
          }).join('')
          const selfCx = Math.round(40 + self.x * (W - 60))
          const selfCy = Math.round(10 + (1 - self.y) * (H - 40))
          const _sla = svgLabelAttrs(selfCx, W, 12)
          const selfDot = `<circle cx="${selfCx}" cy="${selfCy}" r="8" fill="#7b9ff7"/><text x="${_sla.x}" y="${selfCy + 4}" font-size="9" fill="#7b9ff7" font-weight="700" text-anchor="${_sla.textAnchor}" font-family="Inter,sans-serif">${escH(idea.title || 'Your idea')}</text>`
          const svg = `<svg width="${W}" height="${H + 30}" xmlns="http://www.w3.org/2000/svg"><line x1="40" y1="${H - 30}" x2="${W - 10}" y2="${H - 30}" stroke="#e5e5e5" stroke-width="1"/><line x1="40" y1="10" x2="40" y2="${H - 30}" stroke="#e5e5e5" stroke-width="1"/><text x="${W / 2}" y="${H + 20}" text-anchor="middle" font-size="10" fill="#888780" font-family="Inter,sans-serif">${escH(axisX)} →</text><text x="12" y="${H / 2}" text-anchor="middle" font-size="10" fill="#888780" font-family="Inter,sans-serif" transform="rotate(-90,12,${H / 2})">↑ ${escH(axisY)}</text>${dots}${selfDot}</svg>`
          return { type: 'competitive_landscape', html: `${sH('🏁', 'COMPETITIVE LANDSCAPE')}<div style="overflow-x:auto">${svg}</div>` }
        }

        if (cl.format === 'gap' && cl.gap?.competitors?.length) {
          const stages = cl.gap.stages || ['Raw idea', 'Protected & pitched', 'Validated', 'Patent-ready']
          const gapStart = cl.gap.gap_start ?? 1
          const gapEnd = cl.gap.gap_end ?? 2
          const W = 300
          const stageX = i => Math.round(20 + (i / (stages.length - 1)) * (W - 40))
          const competitorsByStage = stages.map((_, i) => cl.gap.competitors.filter(c => c.stage === i))
          const gapRect = `<rect x="${stageX(gapStart)}" y="28" width="${stageX(gapEnd) - stageX(gapStart)}" height="16" rx="4" fill="rgba(123,159,247,0.2)" stroke="#7b9ff7" stroke-width="1" stroke-dasharray="3 2"/>`
          const axisLine = `<line x1="20" y1="36" x2="${W - 20}" y2="36" stroke="#e5e5e5" stroke-width="2"/>`
          const stageDots = stages.map((s, i) => {
            const x = stageX(i)
            const inGap = i >= gapStart && i <= gapEnd
            const dots = competitorsByStage[i].map((c, j) => `<rect x="${x - 22}" y="${4 - j * 14}" width="44" height="12" rx="3" fill="#f5f5f3"/><text x="${x}" y="${12 - j * 14}" text-anchor="middle" font-size="8" fill="#555" font-family="Inter,sans-serif">${escH(c.name)}</text>`).join('')
            return `${dots}<circle cx="${x}" cy="36" r="5" fill="${inGap ? '#7b9ff7' : '#d1d5db'}"/><text x="${x}" y="54" text-anchor="middle" font-size="9" fill="${inGap ? '#7b9ff7' : '#888780'}" font-weight="${inGap ? '700' : '400'}" font-family="Inter,sans-serif">${escH(s)}</text>`
          }).join('')
          const ideaLabel = `<text x="${(stageX(gapStart) + stageX(gapEnd)) / 2}" y="24" text-anchor="middle" font-size="9" fill="#7b9ff7" font-weight="700" font-family="Inter,sans-serif">${escH(idea.title || 'Your idea')}</text>`
          const svg = `<svg width="${W}" height="70" xmlns="http://www.w3.org/2000/svg">${gapRect}${axisLine}${stageDots}${ideaLabel}</svg>`
          return { type: 'competitive_landscape', html: `${sH('🏁', 'COMPETITIVE LANDSCAPE')}<div style="overflow-x:auto">${svg}</div>` }
        }

        return null
      } catch { return null }
    })() : null,
    (idea._pdf_revenue_projections?.startingUsers || idea._pdf_revenue_projections?.monthlyGrowthRate || idea._pdf_revenue_projections?.conversionRate) ? (() => {
      try {
        const rev = idea._pdf_revenue_projections
        const paidPrice = parseFloat(String(rev.paidPriceOverride || (() => {
          try {
            const bm = typeof idea.business_model === 'string' ? JSON.parse(idea.business_model) : idea.business_model
            const models = bm?.models || []
            for (const model of models) {
              const key = model.toLowerCase().replace(/\s*\/\s*/g, '_').replace(/\s+/g, '_').replace(/[^a-z_]/g, '')
              const data = bm?.[key]
              if (data?.paidPrice) return data.paidPrice
            }
          } catch {}
          return '$12'
        })()).replace(/[^0-9.]/g, '')) || 12
        const isOneTime = (() => {
          try {
            const bm = typeof idea.business_model === 'string' ? JSON.parse(idea.business_model) : idea.business_model
            return (bm?.models || []).includes('One-time Purchase')
          } catch { return false }
        })()
        const startingUsers = parseFloat(rev.startingUsers) || 100
        const monthlyGrowth = (parseFloat(rev.monthlyGrowthRate) || 10) / 100
        const convRate = (parseFloat(rev.conversionRate) || 5) / 100
        const calc = (months, mult) => {
          const units = startingUsers * Math.pow(1 + monthlyGrowth * mult, months)
          return isOneTime ? units * paidPrice : units * convRate * paidPrice
        }
        const fmt = n => n >= 1000000 ? '$' + (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? '$' + Math.round(n / 1000) + 'K' : '$' + Math.round(n)
        const scenarios = [
          { label: 'Conservative', mult: 0.5, color: '#888780' },
          { label: 'Moderate', mult: 1, color: '#7b9ff7' },
          { label: 'Optimistic', mult: 2, color: '#22c55e' },
        ]
        const cards = scenarios.map(sc => `
          <div style="flex:1;background:${sc.color}0d;border:0.5px solid ${sc.color}40;border-radius:10px;padding:10px 12px">
            <div style="font-size:10px;font-weight:700;color:${sc.color};letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">${sc.label}</div>
            ${[{l:'6mo',m:6},{l:'12mo',m:12},{l:'24mo',m:24}].map(p => `
              <div style="margin-bottom:5px">
                <div style="font-size:9px;color:#b0b0a8;text-transform:uppercase">${p.l} ${isOneTime ? 'Revenue' : 'MRR'}</div>
                <div style="font-size:14px;font-weight:700;color:#0e0e1f">${escH(fmt(calc(p.m, sc.mult)))}</div>
              </div>
            `).join('')}
          </div>
        `).join('')
        return {
          type: 'revenue_projections',
          html: `${sH('💰', 'REVENUE PROJECTIONS')}<div class="stext" style="margin-bottom:8px;font-size:11px;color:#888">Starting users: ${escH(String(startingUsers))} · Monthly growth: ${escH(String(rev.monthlyGrowthRate || 10))}%${isOneTime ? '' : ` · Conversion: ${escH(String(rev.conversionRate || 5))}%`} · Price: ${escH(rev.paidPriceOverride || '$' + paidPrice)}${isOneTime ? '' : '/mo'}</div><div style="display:flex;gap:8px">${cards}</div><div class="stext" style="margin-top:8px;font-size:10px;color:#aaa;font-style:italic">Model assumptions only — actual results will vary.</div>`
        }
      } catch { return null }
    })() : null,
  ].filter(s => s?.html)

  const PAGE_H = 520
  const buckets = []
  let cur = [], curH = 0
  for (const s of sections) {
    const h = sectionHeight(s)
    if (h >= PAGE_H) {
      if (cur.length) { buckets.push(cur); cur = []; curH = 0 }
      buckets.push([s.html])
    } else {
      if (curH + h > PAGE_H && cur.length) { buckets.push(cur); cur = []; curH = 0 }
      cur.push(s.html); curH += h
    }
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
  const [aiSuggestions, setAiSuggestions] = useState({})
  const [stage,       setStage]       = useState('form')
  const [previewHTML, setPreviewHTML] = useState('')
  const [publishing,  setPublishing]  = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [downloading,      setDownloading]      = useState(false)
  const [generating,       setGenerating]       = useState(false)
  const [savingProgress,   setSavingProgress]   = useState(false)
  const previewRef = useRef(null)
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)

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
  const [teamMembers, setTeamMembers] = useState([{ name: '', role: '', bio: '' }])
  const [originStory, setOriginStory] = useState('')
  const [cvForm, setCvForm] = useState({ waitlist: '', interviews: '', pilots: '', stage: '' })
  const [tractionMilestones, setTractionMilestones] = useState([])
  const [revenueForm, setRevenueForm] = useState({ startingUsers: '', monthlyGrowthRate: '', conversionRate: '', paidPriceOverride: '' })

  useEffect(() => {
    async function load() {
      const [{ data: { user } }, { data }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('ideas').select('*').eq('id', ideaId).single(),
      ])

      const redirectAway = () => navigate(data?.share_token ? `/share/${data.share_token}` : '/')
      if (!user || !data || data.user_id !== user.id) { redirectAway(); return }

      setIdea(data)
      if (data.pdf_draft) {
        const d = data.pdf_draft
        setForm({
          tagline:               d.tagline               || '',
          problem:               d.problem               || '',
          solution:              d.solution              || '',
          how_it_works:          d.how_it_works          || '',
          market_size:           d.market_size           || '',
          target_audience:       d.target_audience       || '',
          business_model:        d.business_model        || '',
          competitive_advantage: d.competitive_advantage || '',
          risks:                 d.risks                 || '',
          next_steps:            d.next_steps            || '',
        })
        setBmValue(parseBMValue(d.business_model) || { models: [] })
        setHowItWorksChips(d.howItWorksChips || [])
        setTargetMarketChips(d.targetMarketChips || [])
        setRisksChips(d.risksChips || [])
        setNextStepsChips(d.nextStepsChips || [])
        if (d.teamMembers) setTeamMembers(d.teamMembers)
        if (d.originStory !== undefined) setOriginStory(d.originStory)
        if (d.cvForm) setCvForm(d.cvForm)
        if (d.tractionMilestones) setTractionMilestones(d.tractionMilestones)
        if (d.revenueForm) setRevenueForm(d.revenueForm)
        setLoading(false)
        return
      }
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

      const rawTeam = data.team ? (typeof data.team === 'string' ? (() => { try { return JSON.parse(data.team) } catch { return null } })() : data.team) : null
      if (rawTeam?.name) setTeamMembers([{ name: rawTeam.name || '', role: rawTeam.role || '', bio: rawTeam.bio || '' }])
      if (data.origin_story) setOriginStory(data.origin_story)
      const rawCV = data.customer_validation ? (typeof data.customer_validation === 'string' ? (() => { try { return JSON.parse(data.customer_validation) } catch { return null } })() : data.customer_validation) : null
      if (rawCV) setCvForm({ waitlist: rawCV.waitlist || '', interviews: rawCV.interviews || '', pilots: rawCV.pilots || '', stage: rawCV.stage || '' })
      const rawTraction = data.traction ? (typeof data.traction === 'string' ? (() => { try { return JSON.parse(data.traction) } catch { return null } })() : data.traction) : null
      if (rawTraction?.milestones?.length) setTractionMilestones(rawTraction.milestones.map(m => ({ label: m.label || '', date: m.date || '', status: m.status || 'upcoming' })))
      const rawRevenue = data.revenue_projections ? (typeof data.revenue_projections === 'string' ? (() => { try { return JSON.parse(data.revenue_projections) } catch { return null } })() : data.revenue_projections) : null
      if (rawRevenue) setRevenueForm({ startingUsers: String(rawRevenue.startingUsers || ''), monthlyGrowthRate: String(rawRevenue.monthlyGrowthRate || ''), conversionRate: String(rawRevenue.conversionRate || ''), paidPriceOverride: rawRevenue.paidPriceOverride || '' })
      setLoading(false)
    }
    load()
  }, [ideaId, navigate])

  useEffect(() => {
    if (!idea?.id || !idea?.problem) return
    const loadSuggestions = async () => {
      setLoadingSuggestions(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pitch-suggestion`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ prompt: `For this idea: ${idea.title} — ${idea.problem} — ${idea.solution}. Team: ${idea.team || ''}. Customer validation: ${idea.customer_validation || ''}. Traction: ${idea.traction || ''}. Generate suggestions. Return ONLY JSON with no markdown, no backticks, no explanation: {"howItWorks": ["step 1","step 2","step 3","step 4"], "targetMarket": ["🚀 Startup Founders","💰 Investors","⚖️ IP Lawyers","💡 Inventors","🏢 Enterprises"], "freeTier": ["feature 1","feature 2","feature 3","feature 4"], "paidTier": ["feature 1","feature 2","feature 3","feature 4"], "risks": ["risk 1","risk 2","risk 3","risk 4"], "nextSteps": ["milestone 1","milestone 2","milestone 3","milestone 4"]}`, target_key: ideaId }),
          }
        )
        if (res.status === 429) { setLoadingSuggestions(false); return }
        const parsed = await res.json()
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
      const { data: { session: aiSession } } = await supabase.auth.getSession()
      const res = await fetch('https://gvjtmyesrrdwkcwkusiz.supabase.co/functions/v1/improve-pitch-field', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiSession?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ idea: { ...idea, ...form }, field: fieldKey, currentValue: form[fieldKey], target_key: `${ideaId}_${fieldKey}` }),
      })
      if (res.status === 429) {
        const errData = await res.json().catch(() => ({}))
        if (errData.reason === 'countdown_exhausted' || errData.reason === 'pool_exhausted') {
          setAiSuggestions(s => ({ ...s, [`${fieldKey}_locked`]: true }))
        }
      } else if (res.ok) {
        const { improved } = await res.json()
        if (improved) setAiSuggestions(s => ({ ...s, [fieldKey]: improved }))
      }
    } catch (e) {
      console.error('AI suggest error:', e)
    }
    setSuggesting(null)
  }

  async function saveProgress() {
    setSavingProgress(true)
    const draft = {
      tagline:               form.tagline,
      problem:               form.problem,
      solution:              form.solution,
      market_size:           form.market_size,
      competitive_advantage: form.competitive_advantage,
      how_it_works:          form.how_it_works,
      target_audience:       form.target_audience,
      business_model:        bmValue ? serializeBMValue(bmValue) : form.business_model,
      risks:                 form.risks,
      next_steps:            form.next_steps,
      howItWorksChips,
      targetMarketChips,
      risksChips,
      nextStepsChips,
      teamMembers,
      originStory,
      cvForm,
      tractionMilestones,
      revenueForm,
    }
    await supabase.from('ideas').update({ pdf_draft: draft }).eq('id', ideaId)
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
    const ideaWithFormData = {
      ...idea,
      _pdf_team: teamMembers[0] || {},
      _pdf_team_members: teamMembers,
      _pdf_origin_story: originStory,
      _pdf_customer_validation: cvForm,
      _pdf_traction_milestones: tractionMilestones,
      _pdf_revenue_projections: revenueForm,
    }
    const html = buildPreviewHTML(formWithChips, ideaWithFormData, session?.user?.email, bmValue)
    setPreviewHTML(html)
    setGenerating(false)
    isMobile ? setStage('preview') : setStage('preview-desktop')
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
      _pdf_team: teamMembers[0] || {},
      _pdf_team_members: teamMembers,
      _pdf_origin_story: originStory,
      _pdf_customer_validation: cvForm,
      _pdf_traction_milestones: tractionMilestones,
      _pdf_revenue_projections: revenueForm,
    }
    await supabase.from('ideas').update({
      pdf_published: true,
      pdf_snapshot:  snapshot,
    }).eq('id', ideaId)
    console.log('SNAPSHOT SAVED:', JSON.stringify(snapshot, null, 2))
    setPublishing(false)
    setPublishSuccess(true)
  }

  async function handleStartOverPDF() {
    if (!window.confirm('This will discard your PDF draft and re-pull everything from your idea page. Your published PDF snapshot is not affected. Continue?')) return
    await supabase.from('ideas').update({ pdf_draft: null }).eq('id', ideaId)
    window.location.reload()
  }

  async function handleDownload() {
    if (isMobile && /CriOS/i.test(navigator.userAgent)) {
      window.location.href = 'x-safari-' + window.location.href
      return
    }
    console.log('handleDownload called')
    if (!previewRef.current) { console.log('no previewRef'); return }
    const pages = previewRef.current.querySelectorAll('.page')
    console.log('pages found:', pages.length)
    if (!pages.length) { console.log('no pages'); return }
    setDownloading(true)
    try {
      console.log('navigator.canShare:', typeof navigator.canShare)
      console.log('navigator.share:', typeof navigator.share)
      if (navigator.canShare && (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent))) {
        const wrapper = document.createElement('div')
        wrapper.id = 'pdf-preview'
        wrapper.style.cssText = [
          'position:fixed',
          'left:-9999px',
          'top:0',
          'width:375px',
          'overflow:visible',
          'z-index:-1',
        ].join(';')
        // Strip @import to prevent html2canvas crash on mobile Safari
        const safeHTML = previewHTML.replace(/@import[^;]+;/g, '')
        wrapper.innerHTML = safeHTML
        document.body.appendChild(wrapper)

        const pageEls = wrapper.querySelectorAll('.page')
        const files = []

        for (let i = 0; i < pageEls.length; i++) {
          const pageEl = pageEls[i]
          const offsetTop = pageEl.offsetTop

          const canvas = await html2canvas(wrapper, {
            scale: 2,
            useCORS: true,
            logging: false,
            width: 375,
            height: 667,
            windowWidth: 375,
            windowHeight: 667,
            x: 0,
            y: offsetTop,
            scrollY: -offsetTop,
          })

          const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92))
          files.push(new File([blob], `${idea?.title || 'pitch'}-page-${i + 1}.jpg`, { type: 'image/jpeg' }))
        }

        document.body.removeChild(wrapper)

        const shareData = { files, title: idea?.title || 'Pitch' }
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData)
        }
      } else {
        const wrapper = document.createElement('div')
        wrapper.id = 'pdf-preview'
        wrapper.style.cssText = [
          'position:fixed',
          'left:-9999px',
          'top:0',
          'width:375px',
          'overflow:visible',
          'z-index:-1',
        ].join(';')
        const safeHTML = previewHTML.replace(/@import[^;]+;/g, '')
        wrapper.innerHTML = safeHTML
        document.body.appendChild(wrapper)

        const pageEls = wrapper.querySelectorAll('.page')
        const pdf = new jsPDF({ unit: 'pt', format: [375, 667], orientation: 'portrait' })

        for (let i = 0; i < pageEls.length; i++) {
          const pageEl = pageEls[i]
          const offsetTop = pageEl.offsetTop
          const canvas = await html2canvas(wrapper, {
            scale: 2,
            useCORS: true,
            logging: false,
            width: 375,
            height: 667,
            windowWidth: 375,
            windowHeight: 667,
            x: 0,
            y: offsetTop,
            scrollY: -offsetTop,
          })
          const imgData = canvas.toDataURL('image/jpeg', 0.95)
          if (i > 0) pdf.addPage([375, 667], 'portrait')
          pdf.addImage(imgData, 'JPEG', 0, 0, 375, 667)
        }

        document.body.removeChild(wrapper)
        pdf.save(`${idea?.title || 'pitch'}.pdf`)
      }
    } catch (err) { console.error('Download error:', err.name, err.message, err) }
    setDownloading(false)
  }

  async function handleDownloadDesktop() {
    if (/CriOS/i.test(navigator.userAgent)) {
      window.location.href = 'x-safari-' + window.location.href
      return
    }
    if (!previewHTML) return
    setDownloading(true)
    try {
      const printWindow = window.open('', '_blank', 'width=420,height=720')
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${idea?.title || 'Pitch'}</title>
<style>
  * {
    -webkit-print-color-adjust: exact !important;
    color-adjust: exact !important;
    print-color-adjust: exact !important;
    box-sizing: border-box;
  }
  html, body {
    margin: 0;
    padding: 0;
    width: 375px;
    background: #fff;
  }
  @media print {
    @page {
      margin: 0;
      size: 375px 667px;
    }
    html, body {
      width: 375px;
      margin: 0;
      padding: 0;
    }
    #pdf-preview .page {
      width: 375px !important;
      height: 667px !important;
      overflow: hidden !important;
      page-break-after: always !important;
      break-after: page !important;
      display: flex !important;
      flex-direction: column !important;
    }
    #pdf-preview .page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
  }
</style>
</head>
<body>
<div id="pdf-preview">${previewHTML}</div>
</body>
</html>`)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
        setDownloading(false)
      }, 1500)
    } catch (err) {
      console.error('Desktop PDF error:', err.name, err.message, err)
      setDownloading(false)
    }
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
          <div style={{ marginBottom: '1.25rem' }}>
            <NavBar
              session={session}
              leftContent={
                <button onClick={() => navigate(`/idea/${ideaId}`)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: 0 }}>← Back to idea</button>
              }
            />
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
                {aiSuggestions[`${key}_locked`] ? (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    <button disabled title="Coming soon" style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '0.5px solid rgba(220,38,38,0.3)', background: 'transparent', color: 'rgba(220,38,38,0.5)', cursor: 'not-allowed', whiteSpace: 'nowrap' }}>
                      Get 10 more for $2.99
                    </button>
                    <a href="/pricing" style={{ fontSize: 11, padding: '5px 10px', borderRadius: 6, border: '0.5px solid rgba(123,159,247,0.4)', background: 'rgba(123,159,247,0.08)', color: '#7b9ff7', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      Upgrade →
                    </a>
                  </div>
                ) : (
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
                )}
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
              {aiSuggestions[key] && (
                <div style={{ marginTop: '0.75rem', background: 'rgba(123,159,247,0.06)', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 10, padding: '1rem 1.25rem' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#7b9ff7', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.5rem' }}>AI Suggestion — review before using</p>
                  <p style={{ fontSize: 14, color: '#2c2c2a', lineHeight: 1.7, margin: '0 0 0.75rem', fontStyle: 'italic' }}>{aiSuggestions[key]}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        setForm(f => ({ ...f, [key]: aiSuggestions[key] }))
                        setAiSuggestions(s => { const n = { ...s }; delete n[key]; return n })
                      }}
                      style={{ background: '#2c2c2a', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                    >Use this suggestion</button>
                    <button
                      onClick={() => setAiSuggestions(s => { const n = { ...s }; delete n[key]; return n })}
                      style={{ background: 'none', border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#888', cursor: 'pointer' }}
                    >Dismiss</button>
                  </div>
                </div>
              )}
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
              }}
              theme="light"
            />
          </div>

          {/* Team */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', marginBottom: 2 }}>The Team</div>
                <div style={{ fontSize: 12, color: '#b0b0a8' }}>Add all team members — name, role, and background</div>
              </div>
              <button onClick={() => setTeamMembers(m => [...m, { name: '', role: '', bio: '' }])} style={{ background: 'rgba(123,159,247,0.07)', border: '0.5px solid rgba(123,159,247,0.28)', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#7b9ff7', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>+ Add member</button>
            </div>
            {teamMembers.map((m, i) => (
              <div key={i} style={{ border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 10, padding: '1rem', marginBottom: 10, background: '#fafaf8', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#7b9ff7' }}>Member {i + 1}{i === 0 ? ' (Founder)' : ''}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => aiSuggest(`team_${i}`)} disabled={!!suggesting} style={{ background: suggesting === `team_${i}` ? 'rgba(123,159,247,0.12)' : 'rgba(123,159,247,0.07)', border: '0.5px solid rgba(123,159,247,0.28)', borderRadius: 6, padding: '4px 10px', fontSize: 11, color: '#7b9ff7', cursor: suggesting ? 'not-allowed' : 'pointer', opacity: suggesting && suggesting !== `team_${i}` ? 0.45 : 1 }}>{suggesting === `team_${i}` ? '…' : '✨ AI Suggest'}</button>
                    {teamMembers.length > 1 && <button onClick={() => setTeamMembers(ms => ms.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e24b4a', fontSize: 16, lineHeight: 1 }}>×</button>}
                  </div>
                </div>
                <input value={m.name} onChange={e => setTeamMembers(ms => { const n = [...ms]; n[i] = { ...n[i], name: e.target.value }; return n })} placeholder="Full name" style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#2c2c2a', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', outline: 'none', marginBottom: 6 }} />
                <div style={{ position: 'relative', marginBottom: 6 }}>
                  <input value={m.role} onChange={e => setTeamMembers(ms => { const n = [...ms]; n[i] = { ...n[i], role: e.target.value }; return n })} placeholder="Role (e.g. CEO, CTO, Head of Design, Legal Advisor…)" style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#2c2c2a', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                  {['CEO / Founder', 'CTO', 'COO', 'Head of Design', 'Head of Marketing', 'Legal Advisor', 'Investor', 'Advisor'].filter(r => r !== m.role).slice(0, 5).map(r => (
                    <span key={r} onClick={() => setTeamMembers(ms => { const n = [...ms]; n[i] = { ...n[i], role: r }; return n })} style={{ fontSize: 11, color: '#7b9ff7', background: 'rgba(123,159,247,0.08)', borderRadius: 20, padding: '2px 8px', cursor: 'pointer', border: '0.5px solid rgba(123,159,247,0.2)' }}>{r}</span>
                  ))}
                </div>
                <textarea value={m.bio} onChange={e => setTeamMembers(ms => { const n = [...ms]; n[i] = { ...n[i], bio: e.target.value }; return n })} rows={2} placeholder="Brief background and relevant experience" style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#2c2c2a', lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', outline: 'none' }} />
                {aiSuggestions[`team_${i}`] && (
                  <div style={{ marginTop: 8, background: 'rgba(123,159,247,0.06)', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 8, padding: '0.75rem 1rem' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#7b9ff7', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px' }}>AI Suggestion</p>
                    <p style={{ fontSize: 13, color: '#2c2c2a', lineHeight: 1.7, margin: '0 0 8px', fontStyle: 'italic' }}>{aiSuggestions[`team_${i}`]}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => { setTeamMembers(ms => { const n = [...ms]; n[i] = { ...n[i], bio: aiSuggestions[`team_${i}`] }; return n }); setAiSuggestions(s => { const n = { ...s }; delete n[`team_${i}`]; return n }) }} style={{ background: '#2c2c2a', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Use this</button>
                      <button onClick={() => setAiSuggestions(s => { const n = { ...s }; delete n[`team_${i}`]; return n })} style={{ background: 'none', border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#888', cursor: 'pointer' }}>Dismiss</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Origin Story */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', marginBottom: 2 }}>Origin Story</div>
                <div style={{ fontSize: 12, color: '#b0b0a8' }}>What personal experience led you to build this?</div>
              </div>
              <button onClick={() => aiSuggest('origin_story')} disabled={!!suggesting} style={{ background: suggesting === 'origin_story' ? 'rgba(123,159,247,0.12)' : 'rgba(123,159,247,0.07)', border: '0.5px solid rgba(123,159,247,0.28)', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#7b9ff7', cursor: suggesting ? 'not-allowed' : 'pointer', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, opacity: suggesting && suggesting !== 'origin_story' ? 0.45 : 1 }}>{suggesting === 'origin_story' ? '…thinking' : '✨ AI Suggest'}</button>
            </div>
            <textarea value={originStory} onChange={e => setOriginStory(e.target.value)} rows={4} placeholder="Share the personal moment or insight that sparked this idea…" style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#2c2c2a', lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fafaf8', outline: 'none' }} />
            {aiSuggestions['origin_story'] && (
              <div style={{ marginTop: '0.75rem', background: 'rgba(123,159,247,0.06)', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 10, padding: '1rem 1.25rem' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#7b9ff7', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 0.5rem' }}>AI Suggestion — review before using</p>
                <p style={{ fontSize: 14, color: '#2c2c2a', lineHeight: 1.7, margin: '0 0 0.75rem', fontStyle: 'italic' }}>{aiSuggestions['origin_story']}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setOriginStory(aiSuggestions['origin_story']); setAiSuggestions(s => { const n = { ...s }; delete n['origin_story']; return n }) }} style={{ background: '#2c2c2a', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Use this suggestion</button>
                  <button onClick={() => setAiSuggestions(s => { const n = { ...s }; delete n['origin_story']; return n })} style={{ background: 'none', border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#888', cursor: 'pointer' }}>Dismiss</button>
                </div>
              </div>
            )}
          </div>

          {/* Customer Validation */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', marginBottom: 2 }}>Customer Validation</div>
                <div style={{ fontSize: 12, color: '#b0b0a8' }}>Evidence of market demand</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[{ key: 'waitlist', label: 'Waitlist signups', placeholder: 'e.g. 250' }, { key: 'interviews', label: 'Customer interviews', placeholder: 'e.g. 12' }, { key: 'pilots', label: 'Pilots / beta users', placeholder: 'e.g. 3' }, { key: 'stage', label: 'Stage', placeholder: 'e.g. Pre-revenue' }].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{f.label}</div>
                  <input value={cvForm[f.key]} onChange={e => setCvForm(v => ({ ...v, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#2c2c2a', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fafaf8', outline: 'none' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Traction & Milestones */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', marginBottom: 2 }}>Traction &amp; Milestones</div>
                <div style={{ fontSize: 12, color: '#b0b0a8' }}>Key milestones reached and upcoming</div>
              </div>
              <button onClick={() => setTractionMilestones(m => [...m, { label: '', date: '', status: 'upcoming' }])} style={{ background: 'rgba(123,159,247,0.07)', border: '0.5px solid rgba(123,159,247,0.28)', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#7b9ff7', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>+ Add milestone</button>
            </div>
            {tractionMilestones.length === 0 && <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>No milestones yet — click + Add milestone to get started.</p>}
            {tractionMilestones.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <select value={m.status} onChange={e => setTractionMilestones(ms => { const n = [...ms]; n[i] = { ...n[i], status: e.target.value }; return n })} style={{ padding: '6px 8px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.2)', fontSize: 12, outline: 'none', background: m.status === 'done' ? 'rgba(34,197,94,0.08)' : m.status === 'in-progress' ? 'rgba(123,159,247,0.08)' : '#fafaf8', color: m.status === 'done' ? '#22c55e' : m.status === 'in-progress' ? '#7b9ff7' : '#888', flexShrink: 0 }}>
                  <option value="done">✓ Done</option>
                  <option value="in-progress">→ In progress</option>
                  <option value="upcoming">○ Upcoming</option>
                </select>
                <input value={m.label} onChange={e => setTractionMilestones(ms => { const n = [...ms]; n[i] = { ...n[i], label: e.target.value }; return n })} placeholder="Milestone description" style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.15)', fontSize: 13, color: '#2c2c2a', fontFamily: 'inherit', background: '#fafaf8', outline: 'none' }} />
                <input value={m.date} onChange={e => setTractionMilestones(ms => { const n = [...ms]; n[i] = { ...n[i], date: e.target.value }; return n })} placeholder="Date (optional)" style={{ width: 110, padding: '6px 10px', borderRadius: 6, border: '0.5px solid rgba(44,44,42,0.15)', fontSize: 12, color: '#888', fontFamily: 'inherit', background: '#fafaf8', outline: 'none' }} />
                <button onClick={() => setTractionMilestones(ms => ms.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e24b4a', fontSize: 16, flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>

          {/* Revenue Projections */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', marginBottom: 2 }}>Revenue Projections</div>
                <div style={{ fontSize: 12, color: '#b0b0a8' }}>Pulled from your idea page — edit here for this PDF only</div>
              </div>
            </div>
            {(() => {
              const isOneTime = (() => {
                try {
                  const bm = typeof idea.business_model === 'string' ? JSON.parse(idea.business_model) : idea.business_model
                  return (bm?.models || []).includes('One-time Purchase')
                } catch { return false }
              })()
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{isOneTime ? 'Starting monthly sales' : 'Starting users'}</div>
                    <input type="number" value={revenueForm.startingUsers} onChange={e => setRevenueForm(v => ({ ...v, startingUsers: e.target.value }))} placeholder="100" style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#2c2c2a', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fafaf8', outline: 'none' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>{isOneTime ? 'Sales growth rate (%)' : 'Monthly growth rate (%)'}</div>
                    <input type="number" value={revenueForm.monthlyGrowthRate} onChange={e => setRevenueForm(v => ({ ...v, monthlyGrowthRate: e.target.value }))} placeholder="10" style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#2c2c2a', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fafaf8', outline: 'none' }} />
                  </div>
                  {!isOneTime && (
                    <div>
                      <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>Free→paid conversion (%)</div>
                      <input type="number" value={revenueForm.conversionRate} onChange={e => setRevenueForm(v => ({ ...v, conversionRate: e.target.value }))} placeholder="5" style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#2c2c2a', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fafaf8', outline: 'none' }} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>Price override (optional)</div>
                    <input value={revenueForm.paidPriceOverride} onChange={e => setRevenueForm(v => ({ ...v, paidPriceOverride: e.target.value }))} placeholder="$12" style={{ width: '100%', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#2c2c2a', fontFamily: 'inherit', boxSizing: 'border-box', background: '#fafaf8', outline: 'none' }} />
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Competitive Landscape Preview */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', marginBottom: 2 }}>Competitive Landscape</div>
                <div style={{ fontSize: 12, color: '#b0b0a8' }}>Pulled from your idea page — edit there to update</div>
              </div>
            </div>
            {idea?.competitive_landscape ? (
              <div style={{ border: '0.5px solid rgba(123,159,247,0.2)', borderRadius: 8, padding: '0.75rem', background: 'rgba(123,159,247,0.02)' }}>
                {(() => {
                  try {
                    const cl = typeof idea.competitive_landscape === 'string' ? JSON.parse(idea.competitive_landscape) : idea.competitive_landscape
                    if (!cl?.format) return <p style={{ fontSize: 12, color: '#b0b0a8', margin: 0 }}>No format selected yet.</p>
                    const CompetitiveLandscape = require('../components/CompetitiveLandscape').default
                    return null
                  } catch { return null }
                })()}
                <p style={{ fontSize: 11, color: '#7b9ff7', margin: 0, fontStyle: 'italic' }}>✓ Competitive landscape data loaded — will appear in your PDF.</p>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>No competitive landscape data yet. <a href={`/idea/${ideaId}`} style={{ color: '#7b9ff7', textDecoration: 'none' }}>Add it on your idea page →</a></p>
            )}
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
              onClick={handleStartOverPDF}
              style={{
                flex: '0 0 auto', background: 'none',
                border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 12, padding: '16px 22px',
                fontSize: 14, fontWeight: 500, color: '#888780',
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >↺ Start over</button>
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
              onClick={handleStartOverPDF}
              style={{
                flex: 1, background: '#fff', border: '0.5px solid rgba(44,44,42,0.2)',
                borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600,
                color: '#888780', cursor: 'pointer',
              }}
            >↺ Start over</button>
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

      {stage === 'preview-desktop' && (
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
              ✏️  Edit
            </button>
            <button
              onClick={handleStartOverPDF}
              style={{
                flex: 1, background: '#fff', border: '0.5px solid rgba(44,44,42,0.2)',
                borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 600,
                color: '#888780', cursor: 'pointer',
              }}
            >↺ Start over</button>
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
        <a
          href={'x-safari-https://myeurekaidea.com' + window.location.pathname}
          style={{
            position: 'fixed', bottom: 24, right: 24,
            background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)',
            color: '#fff', border: 'none', borderRadius: 50, padding: '13px 20px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(123,159,247,0.45)',
            display: 'flex', alignItems: 'center', gap: 6,
            textDecoration: 'none',
          }}
        >⬇ Save to Photos</a>
      )}

      {stage === 'preview-desktop' && (
        <button
          onClick={handleDownloadDesktop}
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
