import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'
import { dedupeArray } from '../utils/generatePDF'

function splitHowItWorks(text) {
  if (!text?.trim()) return []
  // 1. Numbered list: "1." "2." "1)" "2)" at the start of a line
  const numMatches = [...text.matchAll(/(?:^|\n)\s*\d+[.)]\s*([^\n]+)/g)]
  if (numMatches.length >= 2) return numMatches.map(m => m[1].trim()).filter(Boolean)
  // 2. Multiple newlines
  const lines = text.split(/\n+/).map(l => l.replace(/^[-•*\d.)\s]+/, '').trim()).filter(l => l.length > 4)
  if (lines.length >= 2) return lines
  // 3. Sentences ending in period/punctuation
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

function _buildSnapshotHTML(form, idea) {
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
  const stepsHTML = steps.length===1 ? `<div class="stext">${_esc(steps[0])}</div>` : `<div class="steps">${steps.map((s,i)=>`<div class="step"><div class="snum">${i+1}</div><div class="stxt">${_esc(s)}</div></div>`).join('')}</div>`
  const tagsHTML = audienceTags.length>0 ? `<div class="tags">${audienceTags.map(t=>`<div class="tag">${_esc(t)}</div>`).join('')}</div>` : `<div class="stext">${_esc(form.target_audience)}</div>`
  const p2 = `<div class="page"><div class="abar"></div><div class="cpage">${ph(2)}<div class="pbody"><div class="shead"><div class="sicon">⚡</div><div class="slabel">THE PROBLEM</div></div><div class="stext">${_esc(form.problem)}</div><div class="divider"></div><div class="hlight"><div class="hlabel">💡 THE SOLUTION</div><div class="htext">${_esc(form.solution)}</div></div></div>${pf}</div><div class="abar"></div></div>`
  const p3 = `<div class="page"><div class="abar"></div><div class="cpage">${ph(3)}<div class="pbody"><div class="shead"><div class="sicon">⚙️</div><div class="slabel">HOW IT WORKS</div></div>${stepsHTML}<div class="divider"></div><div class="shead"><div class="sicon">📈</div><div class="slabel">MARKET SIZE</div></div><div class="bmet">${marketBoxes.map(b=>`<div class="bm"><div class="bmv">${_esc(b.v)}</div><div class="bml">${_esc(b.l)}</div></div>`).join('')}</div><div class="stext" style="font-size:11px;color:#888;margin-top:2px">${_esc(form.market_size)}</div></div>${pf}</div><div class="abar"></div></div>`
  const p4 = `<div class="page"><div class="abar"></div><div class="cpage">${ph(4)}<div class="pbody"><div class="shead"><div class="sicon">🎯</div><div class="slabel">TARGET MARKET</div></div>${tagsHTML}<div class="divider"></div><div class="shead"><div class="sicon">💰</div><div class="slabel">BUSINESS MODEL</div></div><div class="twocards"><div class="card bl"><div class="cicon">🆓</div><div class="clabel">FREE TIER</div><div class="ctext">${freeHTML}</div></div><div class="card pu"><div class="cicon">⭐</div><div class="clabel">PAID TIER</div><div class="ctext">${paidHTML}</div></div></div></div>${pf}</div><div class="abar"></div></div>`
  const p5 = `<div class="page"><div class="abar"></div><div class="cpage">${ph(5)}<div class="pbody"><div class="shead"><div class="sicon">🏆</div><div class="slabel">COMPETITIVE ADVANTAGE</div></div><div class="stext">${_esc(form.competitive_advantage)}</div><div class="divider"></div><div class="shead"><div class="sicon">⚠️</div><div class="slabel">RISKS &amp; CHALLENGES</div></div><div class="risks">${risks.map(r=>`<div class="risk"><div class="rdot"></div><div class="rtxt">${_esc(r)}</div></div>`).join('')}</div></div>${pf}</div><div class="abar"></div></div>`
  const pLast = `<div class="page"><div class="abar"></div><div class="cpage">${ph('Final')}<div class="pbody"><div class="shead"><div class="sicon">🚀</div><div class="slabel">NEXT STEPS</div></div><div class="tl">${nextSteps.map(s=>`<div class="tli"><div class="tldot"></div><div><div class="tltitle">${_esc(s)}</div></div></div>`).join('')}</div></div><div class="dfooter"><div class="logo">Eurek<b>AI</b>dea</div><div class="dfbadge">myeurekaidea.com</div></div></div><div class="abar"></div></div>`
  return `<style>${CSS}</style><div class="pdf-wrap">${cover}${p2}${p3}${p4}${p5}${pLast}</div>`
}

export default function IdeaDetail({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [idea, setIdea] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shareLink, setShareLink] = useState('')
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [accessLog, setAccessLog] = useState([])
  const [loadingLog, setLoadingLog] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)
  const [termsExpanded, setTermsExpanded] = useState(false)
  const [publishing, setPublishing] = useState(null)   // 'pdf' | 'deck' | null
  const [deckInfo, setDeckInfo] = useState(null)
  const [viewingPDF, setViewingPDF] = useState(false)

  useEffect(() => {
    async function fetchIdea() {
      const { data } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', id)
        .single()
      setIdea(data)
      if (data) setEditForm({
        title: data.title || '',
        category: data.category || [],
        target_audience: data.target_audience || '',
        market_size: data.market_size || '',
        problem: data.problem || '',
        solution: data.solution || '',
        what_looking_for: data.terms ? data.terms.split(', ').filter(Boolean) : [],
        asking_price: data.asking_price || '',
        pricing_model: data.pricing_model || 'One-time buyout',
      })
      setLoading(false)

      // Pre-load any existing share link so "Preview as Investor" works on reload
      const { data: existingLink } = await supabase
        .from('shared_links')
        .select('token')
        .eq('idea_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (existingLink?.token) setShareLink(`${window.location.origin}/share/${existingLink.token}`)
    }
    fetchIdea()
  }, [id])

  useEffect(() => {
    async function fetchLog() {
      const { data } = await supabase
        .from('idea_access_log')
        .select('*')
        .eq('idea_id', id)
        .order('created_at', { ascending: false })
      setAccessLog(data || [])
      setLoadingLog(false)
    }
    fetchLog()
  }, [id])

  useEffect(() => {
    async function fetchDeck() {
      const { data: deck } = await supabase
        .from('pitch_decks')
        .select('share_token, is_public')
        .eq('idea_id', id)
        .eq('is_public', true)
        .maybeSingle()
      if (deck?.share_token) setDeckInfo(deck)
    }
    fetchDeck()
  }, [id])

  async function generateShareLink() {
    setGeneratingLink(true)
    const token = crypto.randomUUID()
    const { error } = await supabase.from('shared_links').insert({
      idea_id: id,
      token,
      created_by: session.user.id,
    })
    if (!error) {
      const link = `${window.location.origin}/share/${token}`
      setShareLink(link)
    }
    setGeneratingLink(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function saveEdit() {
    setEditSaving(true)
    const { data } = await supabase.from('ideas').update({
      title:           editForm.title,
      category:        editForm.category,
      target_audience: editForm.target_audience,
      market_size:     editForm.market_size,
      problem:         editForm.problem,
      solution:        editForm.solution,
      terms:           editForm.what_looking_for.join(', '),
      asking_price:    editForm.asking_price,
      pricing_model:   editForm.pricing_model,
    }).eq('id', id).select().single()
    if (data) setIdea(data)
    setEditSaving(false)
    setEditing(false)
  }

  function toggleEditCategory(c) {
    setEditForm(f => ({
      ...f,
      category: f.category.includes(c) ? f.category.filter(v => v !== c) : [...f.category, c],
    }))
  }

  function toggleEditLookingFor(o) {
    setEditForm(f => ({
      ...f,
      what_looking_for: f.what_looking_for.includes(o)
        ? f.what_looking_for.filter(v => v !== o)
        : [...f.what_looking_for, o],
    }))
  }

  function handleDownloadPDF() {
    setDownloadingPDF(true)
    try {
      generateIdeaPDF(idea, { userEmail: session.user.email })
    } catch (e) {
      console.error('PDF error:', e)
    }
    setDownloadingPDF(false)
  }

  function exportCSV() {
    const headers = ['Email', 'Date & Time', 'IP Address', 'NDA Accepted']
    const rows = accessLog.map(r => [
      r.viewer_email || '',
      r.created_at ? new Date(r.created_at).toLocaleString('en-US') : '',
      r.viewer_ip || '',
      r.nda_accepted ? 'Yes' : 'No',
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'access-log.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function deleteIdea() {
    if (!window.confirm('Are you sure you want to delete this idea? This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('ideas').delete().eq('id', id)
    navigate('/dashboard')
  }

  const PITCH_SNAPSHOT_FIELDS = [
    'title', 'tagline', 'problem', 'solution', 'how_it_works', 'market_size',
    'business_model', 'competitive_advantage', 'risks', 'next_steps',
    'target_audience', 'category', 'looking_for', 'traction', 'team',
    'additional_info', 'blockchain_hash', 'created_at',
  ]

  async function publishDoc(type) {
    setPublishing(type)
    const snapshot = {
      ...Object.fromEntries(PITCH_SNAPSHOT_FIELDS.filter(f => idea[f] != null).map(f => [f, idea[f]])),
      presenterName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '—',
      email: session.user.email || '',
    }
    const { data: updated } = await supabase
      .from('ideas')
      .update({ [`${type}_published`]: true, [`${type}_snapshot`]: snapshot })
      .eq('id', id)
      .select()
      .single()
    if (updated) setIdea(updated)
    if (type === 'deck') {
      await supabase.from('pitch_decks').update({ is_public: true }).eq('idea_id', id)
      const { data: deck } = await supabase.from('pitch_decks').select('share_token, is_public').eq('idea_id', id).eq('is_public', true).maybeSingle()
      if (deck?.share_token) setDeckInfo(deck)
    }
    setPublishing(null)
  }

  async function previewAsPDFInvestor() {
    setViewingPDF(true)
    const { data } = await supabase.from('ideas').select('*').eq('id', id).single()
    const fresh = data || idea
    const form = {
      tagline: fresh.tagline || '', problem: fresh.problem || '',
      solution: fresh.solution || '', how_it_works: fresh.how_it_works || '',
      market_size: fresh.market_size || '', target_audience: fresh.target_audience || '',
      business_model: fresh.business_model || '', competitive_advantage: fresh.competitive_advantage || '',
      risks: fresh.risks || '', next_steps: fresh.next_steps || '',
      ...(fresh.pdf_snapshot || {}),
    }
    const inner = _buildSnapshotHTML(form, fresh)
    const fullHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fresh.title} — Pitch PDF</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f5f5f3;padding:20px 0;min-height:100vh"><div id="pdf-preview">${inner}</div></body></html>`
    const blob = new Blob([fullHTML], { type: 'text/html' })
    window.open(URL.createObjectURL(blob), '_blank')
    setViewingPDF(false)
  }

  async function unpublishDoc(type) {
    setPublishing(type)
    const { data: updated } = await supabase
      .from('ideas')
      .update({ [`${type}_published`]: false })
      .eq('id', id)
      .select()
      .single()
    if (updated) setIdea(updated)
    if (type === 'deck') {
      await supabase.from('pitch_decks').update({ is_public: false }).eq('idea_id', id)
      setDeckInfo(null)
    }
    setPublishing(null)
  }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e1f' }}>
      <div className="spinner" />
    </div>
  )

  if (!idea) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#0e0e1f' }}>
      <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>Idea not found.</p>
      <button onClick={() => navigate('/dashboard')} style={btnGhost}>← Back to vault</button>
    </div>
  )

  const date = new Date(idea.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

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
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setEditing(true)} style={btnPrimary}>Edit idea</button>
              <button onClick={() => navigate('/dashboard')} style={btnGhost}>← Back to vault</button>
            </div>
          </div>

          {/* Categories + protection badge */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
            {dedupeArray(idea.category || []).map(c => (
              <span key={c} style={{ fontSize: 11, background: 'rgba(123,159,247,0.1)', color: '#7b9ff7', borderRadius: 20, padding: '4px 12px', fontWeight: 500, border: '0.5px solid rgba(123,159,247,0.18)' }}>{c}</span>
            ))}
            <span style={{
              fontSize: 11, borderRadius: 20, padding: '4px 12px', fontWeight: 500,
              background: idea.blockchain_hash ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.05)',
              color: idea.blockchain_hash ? '#4ade80' : 'rgba(255,255,255,0.3)',
              border: `0.5px solid ${idea.blockchain_hash ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              {idea.blockchain_hash ? '⬡ Timestamped & protected' : '◌ Pending protection'}
            </span>
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
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', marginBottom: '1.75rem' }}>Submitted {date}</p>

          {/* Build action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(`/pitch/${id}`)}
              style={{
                background: '#fff', color: '#0e0e1f', border: 'none',
                borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              📄 Build Pitch PDF
            </button>
            <button
              onClick={() => navigate(`/deck/${id}`)}
              style={{
                background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              📊 Build Pitch Deck
            </button>
          </div>
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

        {/* Card 2: Key Details */}
        {(idea.market_size || idea.terms || (idea.category || []).length > 0 || idea.asking_price) && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>Key Details</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {idea.market_size && (
                <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '8px 14px' }}>
                  <span style={{ fontSize: 11, color: '#888780' }}>Market · </span>
                  <span style={{ fontSize: 13, color: '#2c2c2a', fontWeight: 500 }}>{idea.market_size}</span>
                </div>
              )}
              {dedupeArray(idea.category || []).map(c => (
                <div key={c} style={{ background: '#EBF0F7', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#3B5273', fontWeight: 500 }}>{c}</div>
              ))}
              {idea.terms && dedupeArray(idea.terms.split(', ').filter(Boolean)).map(t => (
                <div key={t} style={{ background: '#f0fdf4', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#16a34a', fontWeight: 500 }}>Looking for: {t}</div>
              ))}
              {idea.asking_price && (
                <div style={{ background: '#fdf8f0', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#92400e', fontWeight: 500 }}>{idea.asking_price} · {idea.pricing_model}</div>
              )}
            </div>
          </div>
        )}

        {/* Card 3: How It Works (conditional) */}
        {idea.how_it_works && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '1rem' }}>How It Works</p>
            {(() => {
              const steps = splitHowItWorks(idea.how_it_works)
              if (steps.length <= 1) {
                return <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{idea.how_it_works}</p>
              }
              return steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: '0.85rem', alignItems: 'flex-start' }}>
                  <div style={{ width: 26, height: 26, minWidth: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <p style={{ fontSize: 14, lineHeight: 1.75, color: '#2c2c2a', paddingTop: 4 }}>{step}</p>
                </div>
              ))
            })()}
          </div>
        )}

        {/* Card 4: Business Model (conditional) */}
        {idea.business_model && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '0.75rem' }}>Business Model</p>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{idea.business_model}</p>
          </div>
        )}

        {/* Card 5: AI Executive Summary (collapsed) */}
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

        {/* Pitch Documents — publish controls */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
            <span style={{ fontSize: 16 }}>📄</span>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>Pitch Documents</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

            {/* PDF panel */}
            <div style={{ border: '0.5px solid rgba(44,44,42,0.08)', borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#2c2c2a' }}>Pitch PDF</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: idea.pdf_published ? '#4ade80' : '#d1d5db' }} />
                  <span style={{ fontSize: 11, color: idea.pdf_published ? '#16a34a' : '#888780', fontWeight: 500 }}>
                    {idea.pdf_published ? 'Published' : 'Not published'}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#888780', marginBottom: '1rem', lineHeight: 1.55 }}>
                {idea.pdf_published ? 'Visible to NDA-signed investors on the shared page.' : 'Publish to make visible on the shared page.'}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={previewAsPDFInvestor}
                  disabled={viewingPDF}
                  style={{ fontSize: 12, color: '#7b9ff7', border: '0.5px solid rgba(123,159,247,0.3)', borderRadius: 6, padding: '5px 11px', fontWeight: 500, background: 'rgba(123,159,247,0.06)', cursor: viewingPDF ? 'not-allowed' : 'pointer', opacity: viewingPDF ? 0.6 : 1 }}
                >
                  {viewingPDF ? '…' : '👁 Preview as Investor'}
                </button>
                {idea.pdf_published ? (
                  <button
                    onClick={() => unpublishDoc('pdf')}
                    disabled={publishing === 'pdf'}
                    style={{ fontSize: 12, color: '#888780', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 6, padding: '5px 11px', cursor: 'pointer', background: 'none', opacity: publishing === 'pdf' ? 0.6 : 1 }}
                  >
                    {publishing === 'pdf' ? '…' : 'Unpublish'}
                  </button>
                ) : (
                  <button
                    onClick={() => publishDoc('pdf')}
                    disabled={publishing === 'pdf'}
                    style={{ fontSize: 12, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 11px', cursor: publishing === 'pdf' ? 'not-allowed' : 'pointer', background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', opacity: publishing === 'pdf' ? 0.6 : 1, fontWeight: 500 }}
                  >
                    {publishing === 'pdf' ? 'Publishing…' : '✓ Publish PDF'}
                  </button>
                )}
              </div>
            </div>

            {/* Deck panel */}
            <div style={{ border: '0.5px solid rgba(44,44,42,0.08)', borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📊</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#2c2c2a' }}>Pitch Deck</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: idea.deck_published ? '#4ade80' : '#d1d5db' }} />
                  <span style={{ fontSize: 11, color: idea.deck_published ? '#16a34a' : '#888780', fontWeight: 500 }}>
                    {idea.deck_published ? 'Published' : 'Not published'}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#888780', marginBottom: '1rem', lineHeight: 1.55 }}>
                {idea.deck_published ? 'Visible to NDA-signed investors on the shared page.' : 'Publish to make visible on the shared page.'}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href={deckInfo ? `/deck/view/${deckInfo.share_token}` : `/deck/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#9b7ff7', border: '0.5px solid rgba(155,127,247,0.3)', borderRadius: 6, padding: '5px 11px', textDecoration: 'none', fontWeight: 500, background: 'rgba(155,127,247,0.06)' }}
                >
                  👁 Preview as Investor
                </a>
                {idea.deck_published ? (
                  <button
                    onClick={() => unpublishDoc('deck')}
                    disabled={publishing === 'deck'}
                    style={{ fontSize: 12, color: '#888780', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 6, padding: '5px 11px', cursor: 'pointer', background: 'none', opacity: publishing === 'deck' ? 0.6 : 1 }}
                  >
                    {publishing === 'deck' ? '…' : 'Unpublish'}
                  </button>
                ) : (
                  <button
                    onClick={() => publishDoc('deck')}
                    disabled={publishing === 'deck'}
                    style={{ fontSize: 12, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 11px', cursor: publishing === 'deck' ? 'not-allowed' : 'pointer', background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', opacity: publishing === 'deck' ? 0.6 : 1, fontWeight: 500 }}
                  >
                    {publishing === 'deck' ? 'Publishing…' : '✓ Publish Deck'}
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Card 6: Share link */}
        <div style={{ background: '#0e0e1f', borderRadius: 14, padding: '1.75rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#fff', marginBottom: '0.4rem' }}>Share this idea</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: '1.25rem', lineHeight: 1.65 }}>
            Generate a protected link. Anyone who opens it must agree to NDA terms before viewing — their access is logged automatically.
          </p>

          {!shareLink ? (
            <button onClick={generateShareLink} disabled={generatingLink} style={{
              background: 'rgba(123,159,247,0.15)', color: '#7b9ff7',
              border: '0.5px solid rgba(123,159,247,0.3)',
              borderRadius: 8, padding: '11px 22px', fontSize: 13, fontWeight: 500,
              opacity: generatingLink ? 0.6 : 1, cursor: generatingLink ? 'not-allowed' : 'pointer',
            }}>
              {generatingLink ? 'Generating...' : '⬡ Generate protected link'}
            </button>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 14px', marginBottom: 10, flexWrap: 'wrap' }}>
                <code style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)', wordBreak: 'break-all', minWidth: 0 }}>{shareLink}</code>
                <button onClick={copyLink} style={{
                  background: copied ? '#EAF3DE' : 'linear-gradient(90deg, #7b9ff7, #9b7ff7)',
                  color: copied ? '#3B6D11' : '#fff',
                  border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 500, flexShrink: 0, cursor: 'pointer',
                }}>{copied ? '✓ Copied' : 'Copy'}</button>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)' }}>Requires NDA acceptance before viewing. Generate a new link any time.</p>
            </div>
          )}
        </div>

        {/* Blockchain fingerprint */}
        {idea.blockchain_hash && (
          <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: 6 }}>Cryptographic fingerprint</p>
            <code style={{ fontSize: 12, color: '#2c2c2a', wordBreak: 'break-all', fontFamily: 'monospace', display: 'block' }}>{idea.blockchain_hash}</code>
            <p style={{ fontSize: 11, color: '#888780', marginTop: 6 }}>This hash proves your idea existed in its current form at the time of submission.</p>
          </div>
        )}

        {/* Protection & Access */}
        <div style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
            <span style={{ fontSize: 16 }}>🔐</span>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>Idea Protection & Access</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

            {/* Left: Protection Status */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#2c2c2a', marginBottom: '0.85rem' }}>Protection Status</p>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '0.75rem' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 9, color: '#16a34a', fontWeight: 700 }}>✓</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a' }}>Blockchain Timestamp</p>
                  {idea.blockchain_hash
                    ? <p style={{ fontSize: 11, color: '#888780' }}>{new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · <code style={{ fontFamily: 'monospace' }}>{idea.blockchain_hash.slice(0, 14)}…</code></p>
                    : <p style={{ fontSize: 11, color: '#888780' }}>Pending</p>
                  }
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '0.75rem' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 9, color: '#16a34a', fontWeight: 700 }}>✓</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a' }}>NDA-Gated Sharing</p>
                  <p style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>Active</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '1rem' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#EBF0F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 10 }}>⚖</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a' }}>California Law</p>
                  <p style={{ fontSize: 11, color: '#888780' }}>Protected under California Law</p>
                </div>
              </div>

              <button
                onClick={() => setTermsExpanded(x => !x)}
                style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: '#7b9ff7', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {termsExpanded ? '▲' : '▼'} What viewers agreed to
              </button>

              {termsExpanded && (
                <div style={{ marginTop: '0.75rem', background: '#f9f9f7', borderRadius: 8, padding: '0.85rem 1rem', fontSize: 12, color: '#555552', lineHeight: 1.75 }}>
                  <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>By accessing this idea, viewers agreed to:</p>
                  <ul style={{ paddingLeft: '1.1rem', margin: 0 }}>
                    <li>Keep all information strictly confidential</li>
                    <li>Not share, reproduce, or distribute any part of this idea</li>
                    <li>Not use the idea for any commercial purpose without written consent</li>
                    <li>Their full name/email, IP address, and access timestamp have been permanently logged</li>
                    <li>This agreement is governed by the laws of California, United States</li>
                    <li>Violation may constitute misappropriation of trade secrets under applicable law</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Right: Access Log */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#2c2c2a' }}>Who has viewed this idea</p>
                {accessLog.length > 0 && (
                  <button onClick={() => setShowLogModal(true)} style={{ background: 'none', border: 'none', fontSize: 11, color: '#7b9ff7', cursor: 'pointer', fontWeight: 500, padding: 0 }}>
                    View Full Access Log →
                  </button>
                )}
              </div>

              {loadingLog ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                  <div className="spinner" style={{ width: 20, height: 20 }} />
                </div>
              ) : accessLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                  <div style={{ fontSize: 24, marginBottom: '0.5rem', opacity: 0.35 }}>🔒</div>
                  <p style={{ fontSize: 13, color: '#888780' }}>No one has viewed this idea yet</p>
                </div>
              ) : (
                <>
                  {accessLog.slice(0, 5).map((entry, i) => (
                    <div key={entry.id || i} style={{ padding: '0.65rem 0', borderBottom: i < Math.min(accessLog.length, 5) - 1 ? '0.5px solid rgba(44,44,42,0.07)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a' }}>{entry.viewer_email || 'Anonymous'}</span>
                        <span style={{ fontSize: 10, background: '#dcfce7', color: '#16a34a', borderRadius: 4, padding: '2px 7px', fontWeight: 500, flexShrink: 0 }}>NDA Accepted</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: '#888780' }}>
                          {entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                        {entry.viewer_ip && <span style={{ fontSize: 10, color: '#b0b0a8' }}>{entry.viewer_ip}</span>}
                      </div>
                    </div>
                  ))}
                  <p style={{ fontSize: 11, color: '#888780', marginTop: '0.75rem' }}>
                    {accessLog.length} {accessLog.length === 1 ? 'person has' : 'people have'} viewed this idea
                  </p>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Danger zone */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={deleteIdea} disabled={deleting} style={{
            background: 'none', border: '0.5px solid rgba(224,75,74,0.4)', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, color: '#E04B4A',
            opacity: deleting ? 0.5 : 1, cursor: deleting ? 'not-allowed' : 'pointer',
          }}>
            {deleting ? 'Deleting...' : 'Delete idea'}
          </button>
        </div>
      </div>

      {/* Access Log modal */}
      {showLogModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '2rem 1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760, padding: '2rem', margin: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', gap: 12 }}>
              <div>
                <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, marginBottom: '0.2rem' }}>🔐 Full Access Log</h2>
                <p style={{ fontSize: 13, color: '#888780' }}>{idea.title}</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <button onClick={exportCSV} style={{ background: '#f5f5f3', border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 7, padding: '7px 14px', fontSize: 13, color: '#2c2c2a', cursor: 'pointer', fontWeight: 500 }}>
                  ↓ Export CSV
                </button>
                <button onClick={() => setShowLogModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#888780', cursor: 'pointer', padding: '0 4px' }}>✕</button>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Total Views', value: accessLog.length },
                { label: 'Unique Viewers', value: new Set(accessLog.map(r => r.viewer_email)).size },
                { label: 'First Viewed', value: accessLog.length ? new Date(accessLog[accessLog.length - 1].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                { label: 'Last Viewed', value: accessLog.length ? new Date(accessLog[0].created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
              ].map(stat => (
                <div key={stat.label} style={{ background: '#f9f9f7', borderRadius: 10, padding: '0.85rem 1rem' }}>
                  <p style={{ fontSize: 10, color: '#888780', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{stat.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#2c2c2a' }}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{ border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 10, overflow: 'auto', marginBottom: '1.5rem' }}>
              <div style={{ minWidth: 520 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.6fr 1fr 1fr', background: '#f5f5f3', padding: '0.65rem 1rem', borderBottom: '0.5px solid rgba(44,44,42,0.1)' }}>
                  {['Email', 'Date & Time', 'IP Address', 'NDA Status'].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888780' }}>{h}</span>
                  ))}
                </div>
                {accessLog.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#888780', fontSize: 13 }}>No access records yet.</div>
                ) : (
                  accessLog.map((entry, i) => (
                    <div key={entry.id || i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.6fr 1fr 1fr', padding: '0.7rem 1rem', background: i % 2 === 0 ? '#fff' : '#fafaf8', borderBottom: i < accessLog.length - 1 ? '0.5px solid rgba(44,44,42,0.06)' : 'none', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{entry.viewer_email || 'Anonymous'}</span>
                      <span style={{ fontSize: 12, color: '#555552' }}>
                        {entry.created_at ? new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                      <span style={{ fontSize: 11, color: '#888780', fontFamily: 'monospace' }}>{entry.viewer_ip || '—'}</span>
                      <span style={{ fontSize: 11, background: '#dcfce7', color: '#16a34a', borderRadius: 4, padding: '2px 7px', fontWeight: 500, display: 'inline-block', whiteSpace: 'nowrap' }}>
                        {entry.nda_accepted ? 'NDA Accepted' : 'Pending'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* NDA terms */}
            <div style={{ background: '#f9f9f7', borderRadius: 10, padding: '1rem 1.25rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888780', marginBottom: '0.65rem' }}>NDA Terms Agreed By All Viewers</p>
              <ul style={{ paddingLeft: '1.1rem', margin: 0, fontSize: 12, color: '#555552', lineHeight: 1.8 }}>
                <li>Keep all information strictly confidential</li>
                <li>Not share, reproduce, or distribute any part of this idea</li>
                <li>Not use the idea for any commercial purpose without written consent</li>
                <li>Their full name/email, IP address, and access timestamp have been permanently logged</li>
                <li>This agreement is governed by the laws of California, United States</li>
                <li>Violation may constitute misappropriation of trade secrets under applicable law</li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* Edit Idea modal */}
      {editing && editForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '2rem 1rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, padding: '2rem', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24 }}>Edit idea</h2>
              <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#888780', cursor: 'pointer' }}>✕</button>
            </div>

            <EditField label="Title">
              <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} style={editInputStyle} />
            </EditField>

            <EditField label="Category">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['SaaS','Marketplace','FinTech','HealthTech','EdTech','AI / ML','Hardware','Consumer','B2B','Sustainability','Other'].map(c => (
                  <button key={c} onClick={() => toggleEditCategory(c)} style={{
                    fontSize: 13, borderRadius: 6, padding: '6px 13px', border: '0.5px solid',
                    borderColor: editForm.category.includes(c) ? 'var(--gold)' : 'var(--border)',
                    background: editForm.category.includes(c) ? 'var(--gold-light)' : 'transparent',
                    color: editForm.category.includes(c) ? 'var(--gold)' : 'var(--muted)', cursor: 'pointer',
                  }}>{c}</button>
                ))}
              </div>
            </EditField>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <EditField label="Target audience">
                <input value={editForm.target_audience} onChange={e => setEditForm(f => ({ ...f, target_audience: e.target.value }))} style={editInputStyle} />
              </EditField>
              <EditField label="Market size">
                <select value={editForm.market_size} onChange={e => setEditForm(f => ({ ...f, market_size: e.target.value }))} style={editInputStyle}>
                  <option value="">Select range</option>
                  <option>Niche (&lt; $10M)</option>
                  <option>Small ($10M–$100M)</option>
                  <option>Medium ($100M–$1B)</option>
                  <option>Large ($1B+)</option>
                  <option>Not sure</option>
                </select>
              </EditField>
            </div>

            <EditField label="Problem">
              <textarea value={editForm.problem} onChange={e => setEditForm(f => ({ ...f, problem: e.target.value }))} rows={4} style={{ ...editInputStyle, resize: 'vertical' }} />
            </EditField>

            <EditField label="Solution">
              <textarea value={editForm.solution} onChange={e => setEditForm(f => ({ ...f, solution: e.target.value }))} rows={4} style={{ ...editInputStyle, resize: 'vertical' }} />
            </EditField>

            <EditField label="What are you looking for?">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Sell / License','Find a co-founder','Find investors','Open to offers','Just storing for now'].map(o => (
                  <button key={o} onClick={() => toggleEditLookingFor(o)} style={{
                    fontSize: 13, borderRadius: 6, padding: '6px 13px', border: '0.5px solid',
                    borderColor: editForm.what_looking_for.includes(o) ? 'var(--gold)' : 'var(--border)',
                    background: editForm.what_looking_for.includes(o) ? 'var(--gold-light)' : 'transparent',
                    color: editForm.what_looking_for.includes(o) ? 'var(--gold)' : 'var(--muted)', cursor: 'pointer',
                  }}>{o}</button>
                ))}
              </div>
            </EditField>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <EditField label="Asking price">
                <input value={editForm.asking_price} onChange={e => setEditForm(f => ({ ...f, asking_price: e.target.value }))} placeholder="e.g. $5,000 or negotiable" style={editInputStyle} />
              </EditField>
              <EditField label="Deal structure">
                <select value={editForm.pricing_model} onChange={e => setEditForm(f => ({ ...f, pricing_model: e.target.value }))} style={editInputStyle}>
                  <option>One-time buyout</option>
                  <option>Revenue share</option>
                  <option>Monthly license</option>
                  <option>Equity stake</option>
                  <option>Negotiable</option>
                </select>
              </EditField>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '0.5px solid var(--border)' }}>
              <button onClick={() => setEditing(false)} style={{ background: 'none', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 20px', fontSize: 14, color: 'var(--muted)', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={saveEdit} disabled={editSaving} style={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 500, opacity: editSaving ? 0.6 : 1, cursor: editSaving ? 'not-allowed' : 'pointer' }}>
                {editSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditField({ label, children }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const editInputStyle = {
  width: '100%', border: '0.5px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 14, color: 'var(--ink)',
  background: 'var(--surface)', outline: 'none', lineHeight: 1.5,
  boxSizing: 'border-box', fontFamily: 'inherit',
}

const btnPrimary = {
  background: 'rgba(255,255,255,0.12)', border: '0.5px solid rgba(255,255,255,0.18)',
  borderRadius: 7, padding: '7px 14px', fontSize: 13, color: '#fff', cursor: 'pointer', fontWeight: 500,
}

const btnGhost = {
  background: 'none', border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: 7, padding: '7px 14px', fontSize: 13, color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
}
