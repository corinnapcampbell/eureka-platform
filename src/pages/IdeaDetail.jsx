import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'
import NavBar from '../components/NavBar'
import { dedupeArray } from '../utils/generatePDF'
import { buildSnapshotHTML } from '../utils/businessModel'
import BusinessModelSection, { parseBMValue, serializeBMValue } from '../components/BusinessModelSection'
import Scorecard from '../components/Scorecard'
import AIScorecard from '../components/AIScorecard'
import AIChallenge from '../components/AIChallenge'
import CompetitiveLandscape from '../components/CompetitiveLandscape'

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

function BMReadView({ raw }) {
  const bm = parseBMValue(raw)
  if (!bm || !bm.models?.length) {
    return <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{raw}</p>
  }
  const { models, freemium, marketplace, subscription, oneTime, advertising, licensing, transactionFees, hardwareSoftware, other } = bm
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {models.map(m => (
          <span key={m} style={{ fontSize: 11, background: 'rgba(123,159,247,0.1)', color: '#4a6fd4', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 20, padding: '3px 10px', fontWeight: 500 }}>{m}</span>
        ))}
      </div>
      {models.includes('Freemium / SaaS') && freemium && (
        (() => {
          const displayTiers = (freemium.tiers && freemium.tiers.length)
            ? freemium.tiers
            : [
                { name: 'Free Tier', features: freemium.freeTier || '' },
                { name: `Paid Tier${freemium.paidPrice ? ' · ' + freemium.paidPrice : ''}`, features: [freemium.paidFeatures, freemium.paidLimits].filter(Boolean).join('\n') },
              ].filter(t => t.features)
          const tierColors = ['#14b8a6', '#8b5cf6', '#7b9ff7', '#f59e0b', '#22c55e']
          return displayTiers.map((tier, ti) => (
            <div key={ti} style={{ background: ti === 0 ? 'rgba(20,184,166,0.06)' : 'rgba(139,92,246,0.06)', border: `0.5px solid ${ti === 0 ? 'rgba(20,184,166,0.25)' : 'rgba(139,92,246,0.22)'}`, borderRadius: 10, padding: '0.75rem 1rem', flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: tierColors[ti] || '#7b9ff7', marginBottom: '0.6rem' }}>{tier.name || `Tier ${ti + 1}`}</p>
              {(tier.features || '').split('\n').filter(Boolean).map((line, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                  <span style={{ color: tierColors[ti] || '#7b9ff7', fontSize: 10, marginTop: 3, flexShrink: 0 }}>•</span>
                  <span style={{ fontSize: 13, color: '#2c2c2a', lineHeight: 1.5 }}>{line.trim()}</span>
                </div>
              ))}
            </div>
          ))
        })()
      )}
      {models.filter(m => m !== 'Freemium / SaaS').map(m => {
        const dataMap = { Marketplace: marketplace, Subscription: subscription, 'One-time Purchase': oneTime, Advertising: advertising, Licensing: licensing, 'Transaction Fees': transactionFees, 'Hardware + Software': hardwareSoftware, Other: other }
        const d = dataMap[m]
        if (!d) return null
        const entries = Object.entries(d).filter(([k, v]) => k !== 'tiers' && k !== 'cards' && v)
        const tiers = d.tiers || []
        const cards = d.cards || []
        return (
          <div key={m} style={{ marginBottom: 10, padding: '0.85rem 1rem', borderRadius: 10, border: '0.5px solid rgba(123,159,247,0.2)', background: 'rgba(123,159,247,0.03)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7b9ff7', marginBottom: '0.6rem' }}>{m === 'Other' && d.name ? d.name : m}</p>
            {entries.map(([k, v]) => (
              <p key={k} style={{ fontSize: 13, color: '#2c2c2a', lineHeight: 1.6, marginBottom: 4 }}>{v}</p>
            ))}
            {tiers.map((tier, i) => (
              <div key={i} style={{ fontSize: 13, color: '#2c2c2a', lineHeight: 1.6, marginBottom: 4 }}>
                {[tier.name, tier.price].filter(Boolean).join(' · ')}
                {tier.features && <span style={{ color: '#888780' }}> — {tier.features.split('\n')[0]}</span>}
              </div>
            ))}
            {cards.map((card, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                {card.title && <p style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 3 }}>{card.title}</p>}
                {(card.items || []).filter(Boolean).map((item, ii) => (
                  <div key={ii} style={{ display: 'flex', gap: 6, marginBottom: 2 }}><span style={{ color: '#7b9ff7', flexShrink: 0 }}>·</span><span style={{ fontSize: 13, color: '#2c2c2a' }}>{item}</span></div>
                ))}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
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
  const [showMobilePDF, setShowMobilePDF] = useState(false)
  const [mobilePDFContent, setMobilePDFContent] = useState('')
  const [inlineEdit, setInlineEdit] = useState({})
  const [inlineSaving, setInlineSaving] = useState(null)
  const [savedField, setSavedField] = useState(null)
  const [isPaid, setIsPaid] = useState(true) // hardcoded true for testing; wire to real tier later
  const [aiRevenueLoading, setAiRevenueLoading] = useState(false)
  const [revenueSuggestionReason, setRevenueSuggestionReason] = useState('')
  const [teaseSuggesting, setTeaseSuggesting] = useState(false)
  const [teaseSuggestion, setTeaseSuggestion] = useState(null)
  const [publishingScore, setPublishingScore] = useState(false)
  const [prePublishModal, setPrePublishModal] = useState(false)
  const [prePublishLoading, setPrePublishLoading] = useState(false)
  const [prePublishSuggestions, setPrePublishSuggestions] = useState([])
  const [scorecardKey, setScorecardKey] = useState(0)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [supportFiles, setSupportFiles] = useState([])

  const startEditRef = useRef(null)

  useEffect(() => {
    const INLINE_FIELDS = new Set(['title', 'problem', 'solution', 'how_it_works', 'business_model', 'tagline', 'target_audience', 'competitive_advantage', 'risks', 'next_steps', 'tease', 'origin_story', 'who_pays', 'revenue_streams', 'pricing_power', 'revenue_potential', 'business_stage'])
    function handler(e) {
      const { field } = e.detail
      if (INLINE_FIELDS.has(field) && startEditRef.current) startEditRef.current(field)
    }
    window.addEventListener('openEditSection', handler)
    return () => window.removeEventListener('openEditSection', handler)
  }, [])

  useEffect(() => {
    async function fetchIdea() {
      const { data } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', id)
        .single()
      setIdea(data)
      if (data?.support_files) setSupportFiles(data.support_files)
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
        .select('viewer_email, viewed_at, last_viewed, view_count')
        .eq('idea_id', id)
        .order('last_viewed', { ascending: false })
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
      r.viewed_at ? new Date(r.viewed_at).toLocaleString('en-US') : '',
      r.ip_address || '',
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
    'business_model', 'competitive_advantage', 'risks', 'next_steps', 'origin_story', 'who_pays', 'revenue_streams', 'pricing_power', 'revenue_potential', 'business_stage',
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
      business_model: fresh.business_model || '', competitive_advantage: fresh.competitive_advantage || '', origin_story: fresh.origin_story || '', who_pays: fresh.who_pays || '', revenue_streams: fresh.revenue_streams || '', pricing_power: fresh.pricing_power || '', revenue_potential: fresh.revenue_potential || '', business_stage: fresh.business_stage || '',
      risks: fresh.risks || '', next_steps: fresh.next_steps || '',
      ...(fresh.pdf_snapshot || {}),
    }
    const inner = buildSnapshotHTML(form, fresh)
    const fullHTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fresh.title} — Pitch PDF</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"></head><body style="margin:0;background:#f5f5f3;padding:20px 0;min-height:100vh"><div id="pdf-preview">${inner}</div></body></html>`
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      setMobilePDFContent(fullHTML)
      setShowMobilePDF(true)
    } else {
      const blob = new Blob([fullHTML], { type: 'text/html' })
      window.open(URL.createObjectURL(blob), '_blank')
    }
    setViewingPDF(false)
  }

  function startEdit(field) {
    const raw = idea[field] || ''
    const val = field === 'business_model' ? parseBMValue(raw) : raw
    setInlineEdit(v => ({ ...v, [field]: val }))
  }
  startEditRef.current = startEdit
  function cancelEdit(field) {
    setInlineEdit(v => { const n = { ...v }; delete n[field]; return n })
  }
  async function saveInlineField(field) {
    setInlineSaving(field)
    const val = inlineEdit[field]
    const saveVal = field === 'business_model' && val && typeof val === 'object'
      ? serializeBMValue(val)
      : val
    const { data } = await supabase.from('ideas').update({ [field]: saveVal }).eq('id', id).select().single()
    if (data) setIdea(data)
    setInlineSaving(null)
    cancelEdit(field)
    setSavedField(field)
    setTimeout(() => setSavedField(prev => prev === field ? null : prev), 2000)
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

  async function handlePrePublish() {
    if (!isPaid) { publishAndScore(); return }
    setPrePublishModal(true)
    setPrePublishLoading(true)
    setPrePublishSuggestions([])
    try {
      const prompt = `You are an expert startup pitch coach. Review this idea pitch and return ONLY a JSON array of exactly 3 improvement suggestions for the weakest sections. No explanation, no markdown, just the JSON array.

Idea: "${idea.title}"
Problem: ${idea.problem || 'not filled in'}
Solution: ${idea.solution || 'not filled in'}
How it works: ${idea.how_it_works || 'not filled in'}
Target audience: ${idea.target_audience || 'not filled in'}
Market size: ${idea.market_size || 'not filled in'}
Competitive advantage: ${idea.competitive_advantage || 'not filled in'}
Business model: ${idea.business_model || 'not filled in'}
Risks: ${idea.risks || 'not filled in'}
Next steps: ${idea.next_steps || 'not filled in'}

Return exactly this format:
[
  { "field": "problem", "label": "Problem", "issue": "one sentence describing the weakness", "rewrite": "improved version of the text" },
  { "field": "solution", "label": "Solution", "issue": "one sentence describing the weakness", "rewrite": "improved version of the text" },
  { "field": "competitive_advantage", "label": "Competitive Advantage", "issue": "one sentence describing the weakness", "rewrite": "improved version of the text" }
]

Pick the 3 weakest fields from: problem, solution, how_it_works, competitive_advantage, risks, next_steps, target_audience. Return only the JSON array.`

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-scorecard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      const text = typeof data === 'string' ? data : JSON.stringify(data)
      const clean = text.replace(/```json|```/g, '').trim()
      const suggestions = JSON.parse(clean.startsWith('[') ? clean : clean.slice(clean.indexOf('[')))
      setPrePublishSuggestions(suggestions)
    } catch (e) {
      console.error('Pre-publish review failed:', e)
      setPrePublishSuggestions([])
    }
    setPrePublishLoading(false)
  }

  async function applyPrePublishSuggestion(field, rewrite) {
    await supabase.from('ideas').update({ [field]: rewrite }).eq('id', id)
    setIdea(prev => ({ ...prev, [field]: rewrite }))
    setPrePublishSuggestions(prev => prev.filter(s => s.field !== field))
  }

  async function publishAndScore() {
    setPublishingScore(true)
    try {
      const newCount = (idea.publish_count || 0) + 1
      await supabase.from('ideas').update({ is_published: true, publish_count: newCount }).eq('id', id)
      const prompt = `You are an expert startup evaluator. Score this idea on 18 dimensions, each 1-10.

Idea:
Title: ${idea.title || ''}
Problem: ${idea.problem || ''}
Solution: ${idea.solution || ''}
How it works: ${idea.how_it_works || ''}
Business model: ${idea.business_model ? JSON.stringify(idea.business_model) : ''}
Tagline: ${idea.tagline || ''}
Target audience: ${idea.target_audience || ''}
Market size: ${idea.market_size || ''}
Competitive advantage: ${idea.competitive_advantage || ''}
Risks: ${idea.risks || ''}
Next steps: ${idea.next_steps || ''}
Team: ${idea.team ? (() => { try { const t = JSON.parse(idea.team); return `${t.name || ''}, ${t.role || ''}. ${t.bio || ''} ${t.origin || ''}` } catch { return idea.team } })() : ''}
Customer validation: ${idea.customer_validation ? (() => { try { const c = JSON.parse(idea.customer_validation); return `Waitlist: ${c.waitlist || 0}, Interviews: ${c.interviews || 0}, Pilots: ${c.pilots || 0}, Stage: ${c.stage || 'unknown'}` } catch { return idea.customer_validation } })() : ''}
Traction & milestones: ${idea.traction ? (() => { try { const tr = JSON.parse(idea.traction); return (tr.milestones || []).map(m => `${m.label} (${m.status}, ${m.date || 'no date'})`).join('; ') } catch { return idea.traction } })() : ''}

Return ONLY valid JSON, no markdown, no explanation, in this exact shape:
{
  "scores": [
    {
      "key": "originality",
      "score": 7,
      "rationale": "One sentence describing what this score reflects.",
      "issues": "One sentence describing the main weakness or gap that hurt this score.",
      "suggestion": "One specific actionable improvement the owner could make."
    }
  ]
}

Keys must be exactly: originality, problem_clarity, solution_fit, feasibility, market_size, market_timing, competition_level, revenue_potential, business_model, go_to_market, team_fit, next_steps, ip_defensibility, scalability, regulatory_risk, customer_validation, capital_efficiency, impact.
Score 1 = very weak, 10 = exceptional. Be honest and direct.`
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-scorecard`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ prompt }),
        }
      )
      const parsed = await res.json()
      const DIM_WEIGHTS = {originality:0.06,problem_clarity:0.06,solution_fit:0.06,feasibility:0.06,market_size:0.06,market_timing:0.06,competition_level:0.05,revenue_potential:0.06,business_model:0.06,go_to_market:0.05,team_fit:0.05,next_steps:0.05,ip_defensibility:0.05,scalability:0.06,regulatory_risk:0.05,customer_validation:0.05,capital_efficiency:0.05,impact:0.04}
      const overall = parsed.scores.reduce((acc, s) => acc + (DIM_WEIGHTS[s.key] || 0) * s.score, 0)
      const hashFields = ['title','problem','solution','how_it_works','business_model','tagline','target_audience','market_size','competitive_advantage','risks','next_steps']
      const idea_hash = hashFields.map(f => String(idea[f] || '')).join('|').length
      const result = { scores: parsed.scores, overall: Math.round(overall * 10) / 10, generated_at: new Date().toISOString(), idea_hash }
      await supabase.from('ideas').update({ ai_scorecard: result }).eq('id', id)
      const { data: fresh } = await supabase.from('ideas').select('*').eq('id', id).single()
      if (fresh) setIdea(fresh)
      setScorecardKey(k => k + 1)
    } catch (e) {
      console.error('Publish & score failed:', e)
    } finally {
      setPublishingScore(false)
    }
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

  async function handleRevenueAISuggest() {
    setAiRevenueLoading(true)
    setRevenueSuggestionReason('')
    try {
      const prompt = `For this startup idea: "${idea.title}" — ${idea.problem || ''} ${idea.solution || ''}. Market size info: ${idea.market_size || 'unknown'}. Stage: ${idea.stage || 'unknown'}. Target audience: ${idea.target_audience || 'unknown'}. Business model: ${idea.business_model || 'unknown'}. Suggest realistic revenue projection assumptions for a financial model. Return ONLY JSON with no markdown, no backticks, no explanation: {"startingUsers": <number>, "monthlyGrowthRate": <number, percent e.g. 8>, "conversionRate": <number, percent e.g. 4>, "reasoning": "<one sentence explaining these numbers based on the idea's market and stage>"}`
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/revenue-suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (data.startingUsers) {
        setInlineEdit(v => ({ ...v, revenue_projections: {
          startingUsers: data.startingUsers,
          monthlyGrowthRate: data.monthlyGrowthRate || 10,
          conversionRate: data.conversionRate || 5,
          paidPriceOverride: v.revenue_projections?.paidPriceOverride || '',
        }}))
        setRevenueSuggestionReason(data.reasoning || '')
      }
    } catch (e) {
      console.error('Revenue suggestion failed', e)
    }
    setAiRevenueLoading(false)
  }

  const date = new Date(idea.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const isOwner = !!session?.user?.id && session.user.id === idea.user_id

  return (
    <>
    <style>{`
      .section-highlight { animation: highlightPulse 3s ease-out forwards; }
      @keyframes highlightPulse {
        0%   { box-shadow: 0 0 0 3px #7b9ff7; border-radius: 14px; }
        50%  { box-shadow: 0 0 0 6px rgba(123,159,247,0.4); border-radius: 14px; }
        100% { box-shadow: 0 0 0 0px rgba(123,159,247,0); border-radius: 14px; }
      }
    `}</style>
    <div style={{ minHeight: '100vh', background: '#f5f5f3' }}>
      {/* Gradient accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' }} />

      {/* Dark header */}
      <div style={{ background: '#0e0e1f', paddingBottom: '2.5rem' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '1.5rem 1.25rem 0' }}>

          <div style={{ marginBottom: '2rem' }}>
            <NavBar
              session={session}
              rightExtra={
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button onClick={() => setEditing(true)} style={btnPrimary}>Edit idea</button>
                  <button onClick={() => navigate('/dashboard')} style={btnGhost}>← Back to vault</button>
                </div>
              }
            />
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
          <div id="section-title" style={{ marginBottom: '0.5rem' }}>
            {inlineEdit.title !== undefined ? (
              <>
                <input
                  value={inlineEdit.title}
                  onChange={e => setInlineEdit(v => ({ ...v, title: e.target.value }))}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 'clamp(22px, 4vw, 32px)', fontFamily: "'DM Serif Display', serif", color: '#fff', outline: 'none', boxSizing: 'border-box', letterSpacing: '-0.5px', lineHeight: 1.2 }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => saveInlineField('title')} disabled={inlineSaving === 'title'} style={inlineSaveBtnStyle}>{inlineSaving === 'title' ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => cancelEdit('title')} style={inlineCancelBtnDarkStyle}>Cancel</button>
                </div>
                {savedField === 'title' && <span style={savedConfirmDarkStyle}>Saved ✓</span>}
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(28px, 5vw, 40px)', color: '#fff', lineHeight: 1.15, letterSpacing: '-0.5px' }}>
                  {idea.title}
                </h1>
                {isOwner && !idea.is_published && (
                  <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '3px 10px', fontWeight: 500, alignSelf: 'center', flexShrink: 0 }}>Draft</span>
                )}
                {isOwner && <button onClick={() => startEdit('title')} style={pencilBtnDarkStyle} title="Edit title">✏️</button>}
                {savedField === 'title' && <span style={savedConfirmDarkStyle}>Saved ✓</span>}
              </div>
            )}
          </div>
          {/* HERO IMAGE */}
          {(idea.product_image_url || isOwner) && (
            <div style={{ marginBottom: '1.25rem', borderRadius: 14, overflow: 'hidden', background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)' }}>
              {idea.product_image_url ? (
                <div style={{ position: 'relative' }}>
                  <img src={idea.product_image_url} alt="Product" style={{ width: '100%', maxHeight: 340, objectFit: 'cover', display: 'block' }} />
                  {isOwner && (
                    <button onClick={async () => {
                      await supabase.from('ideas').update({ product_image_url: null }).eq('id', id)
                      setIdea(v => ({ ...v, product_image_url: null }))
                    }} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Remove</button>
                  )}
                </div>
              ) : isOwner ? (
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '1.25rem', cursor: 'pointer', color: '#7b9ff7', fontSize: 14, fontWeight: 500 }}>
                  {uploadingImage ? 'Uploading…' : '+ Add product image'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                    const file = e.target.files[0]
                    if (!file) return
                    setUploadingImage(true)
                    const ext = file.name.split('.').pop()
                    const path = `${id}/hero.${ext}`
                    const { error } = await supabase.storage.from('idea-assets').upload(path, file, { upsert: true })
                    if (!error) {
                      const { data: urlData } = supabase.storage.from('idea-assets').getPublicUrl(path)
                      const publicUrl = urlData.publicUrl + '?t=' + Date.now()
                      await supabase.from('ideas').update({ product_image_url: publicUrl }).eq('id', id)
                      setIdea(v => ({ ...v, product_image_url: publicUrl }))
                    } else {
                      console.log('STORAGE ERROR:', error)
                    }
                    setUploadingImage(false)
                  }} />
                </label>
              ) : null}
            </div>
          )}

          {/* Tagline */}
          {(idea.tagline || isOwner) && (
            <div id="section-tagline" style={{ marginBottom: '0.5rem' }}>
              {inlineEdit.tagline !== undefined ? (
                <>
                  <input
                    value={inlineEdit.tagline}
                    onChange={e => setInlineEdit(v => ({ ...v, tagline: e.target.value }))}
                    placeholder="A short, memorable tagline…"
                    autoFocus
                    style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 15, color: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: "'Outfit', sans-serif", fontStyle: 'italic' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => saveInlineField('tagline')} disabled={inlineSaving === 'tagline'} style={inlineSaveBtnStyle}>{inlineSaving === 'tagline' ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => cancelEdit('tagline')} style={inlineCancelBtnDarkStyle}>Cancel</button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {idea.tagline
                    ? <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>{idea.tagline}</p>
                    : <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Add a tagline…</p>
                  }
                  {isOwner && <button onClick={() => startEdit('tagline')} style={pencilBtnDarkStyle} title="Edit tagline">✏️</button>}
                </div>
              )}
            </div>
          )}

          {/* Target Audience */}
          {(idea.target_audience || isOwner) && (
            <div id="section-target_audience" style={{ marginBottom: '0.5rem' }}>
              {inlineEdit.target_audience !== undefined ? (
                <>
                  <input
                    value={inlineEdit.target_audience}
                    onChange={e => setInlineEdit(v => ({ ...v, target_audience: e.target.value }))}
                    placeholder="Who is this built for?"
                    autoFocus
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 8, padding: '6px 12px', fontSize: 14, color: '#fff', outline: 'none', fontFamily: "'Outfit', sans-serif" }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => saveInlineField('target_audience')} disabled={inlineSaving === 'target_audience'} style={inlineSaveBtnStyle}>{inlineSaving === 'target_audience' ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => cancelEdit('target_audience')} style={inlineCancelBtnDarkStyle}>Cancel</button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {idea.target_audience
                    ? <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)' }}>Built for {idea.target_audience}</p>
                    : <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>Add target audience…</p>
                  }
                  {isOwner && <button onClick={() => startEdit('target_audience')} style={pencilBtnDarkStyle} title="Edit target audience">✏️</button>}
                </div>
              )}
            </div>
          )}

          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.22)', marginBottom: '1.75rem' }}>Submitted {date}</p>

          {/* Build action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
            {isOwner && <Scorecard idea={idea} />}
          </div>
        </div>
      </div>

      {prePublishModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,14,31,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0e0e1f', margin: 0 }}>✨ AI Pitch Review</h2>
                <p style={{ fontSize: 13, color: '#888780', margin: '4px 0 0' }}>Review suggestions before your idea gets scored</p>
              </div>
              <button onClick={() => setPrePublishModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#888', cursor: 'pointer' }}>✕</button>
            </div>

            {prePublishLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                <p style={{ fontSize: 14, color: '#888780' }}>Reviewing your pitch…</p>
              </div>
            ) : prePublishSuggestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem 0 2rem' }}>
                <p style={{ fontSize: 15, color: '#2c2c2a', marginBottom: '1.5rem' }}>Your pitch looks strong! Ready to publish and score.</p>
                <button
                  onClick={() => { setPrePublishModal(false); publishAndScore() }}
                  style={{ background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                >✨ Publish & Score</button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: '#888780', marginBottom: '1.25rem' }}>We found {prePublishSuggestions.length} section{prePublishSuggestions.length > 1 ? 's' : ''} to strengthen. Apply suggestions or skip and publish.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: '1.5rem' }}>
                  {prePublishSuggestions.map((s, i) => (
                    <div key={i} style={{ background: 'rgba(123,159,247,0.04)', border: '0.5px solid rgba(123,159,247,0.2)', borderRadius: 12, padding: '1rem 1.25rem' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#7b9ff7', marginBottom: 4 }}>{s.label}</p>
                      <p style={{ fontSize: 13, color: '#e24b4a', marginBottom: 8, lineHeight: 1.5 }}>⚠ {s.issue}</p>
                      <p style={{ fontSize: 13, color: '#2c2c2a', lineHeight: 1.6, marginBottom: 10, fontStyle: 'italic' }}>"{s.rewrite}"</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => applyPrePublishSuggestion(s.field, s.rewrite)}
                          style={{ background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                        >Apply</button>
                        <button
                          onClick={() => setPrePublishSuggestions(prev => prev.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: '0.5px solid rgba(44,44,42,0.2)', borderRadius: 7, padding: '6px 14px', fontSize: 12, color: '#888780', cursor: 'pointer' }}
                        >Skip</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setPrePublishModal(false); publishAndScore() }}
                  style={{ width: '100%', background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', border: 'none', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                >✨ Publish & Score</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* White content area */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

        {isOwner && (
          <>
            {(isPaid || (idea.publish_count || 0) < 3 || !idea.is_published) ? (
              <div style={{ marginBottom: '1.25rem' }}>
                <button
                  onClick={handlePrePublish}
                  disabled={publishingScore}
                  style={{
                    background: publishingScore ? 'rgba(123,159,247,0.4)' : 'linear-gradient(90deg,#7b9ff7,#9b7ff7)',
                    border: 'none', borderRadius: 10, padding: '11px 22px',
                    fontSize: 13, fontWeight: 600, color: '#fff',
                    cursor: publishingScore ? 'not-allowed' : 'pointer',
                  }}
                >
                  {publishingScore ? 'Publishing & scoring…' : '✨ Publish & Score'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
                <button
                  onClick={() => {}}
                  style={{ background: 'none', border: '0.5px solid rgba(123,159,247,0.5)', borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 500, color: '#7b9ff7', cursor: 'pointer' }}
                >
                  $0.99 Re-publish
                </button>
                <button
                  onClick={() => {}}
                  style={{ background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
            <AIScorecard key={scorecardKey} idea={idea} ideaId={id} isPaid={false} readOnly={true} />
          </>
        )}

        {/* Card 1: Problem & Solution */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {(idea.problem || isOwner) && (
            <div id="section-problem" style={{ background: '#0e0e1f', borderRadius: 14, padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚡</span>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.35)' }}>The Problem</span>
                </div>
                {isOwner && inlineEdit.problem === undefined && <button onClick={() => startEdit('problem')} style={pencilBtnDarkStyle} title="Edit problem">✏️</button>}
              </div>
              {inlineEdit.problem !== undefined ? (
                <>
                  <textarea value={inlineEdit.problem} onChange={e => setInlineEdit(v => ({ ...v, problem: e.target.value }))} rows={5} style={{ ...inlineTextareaDarkStyle }} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => saveInlineField('problem')} disabled={inlineSaving === 'problem'} style={inlineSaveBtnStyle}>{inlineSaving === 'problem' ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => cancelEdit('problem')} style={inlineCancelBtnDarkStyle}>Cancel</button>
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(255,255,255,0.78)' }}>
                  {idea.problem || <em style={{ opacity: 0.35, fontStyle: 'normal' }}>No problem statement yet — click ✏️ to add</em>}
                </p>
              )}
              {savedField === 'problem' && <span style={savedConfirmDarkStyle}>Saved ✓</span>}
              <AIChallenge sectionKey="problem" sectionLabel="Problem" content={idea.problem} isPaid={isPaid} />
            </div>
          )}

          {(idea.solution || isOwner) && (
            <div id="section-solution" style={{ background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', borderRadius: 15, padding: 1.5 }}>
              <div style={{ background: '#fff', borderRadius: 13, padding: '1.5rem', height: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>💡</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#9b7ff7' }}>The Solution</span>
                  </div>
                  {isOwner && inlineEdit.solution === undefined && <button onClick={() => startEdit('solution')} style={pencilBtnLightStyle} title="Edit solution">✏️</button>}
                </div>
                {inlineEdit.solution !== undefined ? (
                  <>
                    <textarea value={inlineEdit.solution} onChange={e => setInlineEdit(v => ({ ...v, solution: e.target.value }))} rows={5} style={inlineTextareaStyle} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => saveInlineField('solution')} disabled={inlineSaving === 'solution'} style={inlineSaveBtnStyle}>{inlineSaving === 'solution' ? 'Saving…' : 'Save'}</button>
                      <button onClick={() => cancelEdit('solution')} style={inlineCancelBtnStyle}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>
                    {idea.solution || <em style={{ opacity: 0.35, fontStyle: 'normal' }}>No solution statement yet — click ✏️ to add</em>}
                  </p>
                )}
                {savedField === 'solution' && <span style={savedConfirmStyle}>Saved ✓</span>}
                <AIChallenge sectionKey="solution" sectionLabel="Solution" content={idea.solution} isPaid={isPaid} />
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Key Details */}
        {(idea.market_size || idea.terms || (idea.category || []).length > 0 || idea.asking_price || isOwner) && (
          <div id="section-key_details" style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>Key Details</p>
              {isOwner && <button onClick={() => setEditing(true)} style={pencilBtnLightStyle} title="Edit key details">✏️</button>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div id="section-market_size">
                {idea.market_size ? (
                  <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '8px 14px' }}>
                    <span style={{ fontSize: 11, color: '#888780' }}>Market · </span>
                    <span style={{ fontSize: 13, color: '#2c2c2a', fontWeight: 500 }}>{idea.market_size}</span>
                  </div>
                ) : isOwner ? (
                  <div style={{ background: '#f5f5f3', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', opacity: 0.5 }} onClick={() => setEditing(true)}>
                    <span style={{ fontSize: 13, color: '#888780', fontStyle: 'italic' }}>+ Market size</span>
                  </div>
                ) : null}
              </div>
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

        {/* Card: Investor Tease */}
        {(idea.tease || isOwner) && (
          <div id="section-tease" style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>Investor Tease</p>
                <p style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Shown to investors before they sign the NDA</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isOwner && inlineEdit.tease === undefined && (
                  <button onClick={() => startEdit('tease')} style={pencilBtnLightStyle} title="Edit tease">✏️</button>
                )}
              </div>
            </div>

            {inlineEdit.tease !== undefined ? (
              <div>
                <textarea
                  value={inlineEdit.tease}
                  onChange={e => setInlineEdit(v => ({ ...v, tease: e.target.value }))}
                  rows={4}
                  style={inlineTextareaStyle}
                  placeholder="Write a short teaser that makes investors curious without revealing your idea…"
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => saveInlineField('tease')} disabled={inlineSaving === 'tease'} style={inlineSaveBtnStyle}>{inlineSaving === 'tease' ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => cancelEdit('tease')} style={inlineCancelBtnStyle}>Cancel</button>
                </div>
                {savedField === 'tease' && <span style={savedConfirmStyle}>Saved ✓</span>}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: '#2c2c2a', lineHeight: 1.7 }}>
                {idea.tease || (isOwner ? <em style={{ opacity: 0.35, fontStyle: 'normal' }}>No investor tease yet — click ✏️ to add</em> : null)}
              </p>
            )}
            <AIChallenge sectionKey="tease" sectionLabel="Investor Tease" content={idea.tease} isPaid={isPaid} />
          </div>
        )}

        {/* Card 3: How It Works (conditional) */}
        {(idea.how_it_works || isOwner) && (
          <div id="section-how_it_works" style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>How It Works</p>
              {isOwner && inlineEdit.how_it_works === undefined && <button onClick={() => startEdit('how_it_works')} style={pencilBtnLightStyle} title="Edit how it works">✏️</button>}
            </div>
            {inlineEdit.how_it_works !== undefined ? (
              <>
                <textarea value={inlineEdit.how_it_works} onChange={e => setInlineEdit(v => ({ ...v, how_it_works: e.target.value }))} rows={6} style={inlineTextareaStyle} placeholder="Describe how your idea works, step by step…" />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => saveInlineField('how_it_works')} disabled={inlineSaving === 'how_it_works'} style={inlineSaveBtnStyle}>{inlineSaving === 'how_it_works' ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => cancelEdit('how_it_works')} style={inlineCancelBtnStyle}>Cancel</button>
                </div>
                {savedField === 'how_it_works' && <span style={savedConfirmStyle}>Saved ✓</span>}
              </>
            ) : idea.how_it_works ? (
              (() => {
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
              })()
            ) : (
              <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>Not added yet — click ✏️ to describe how your idea works</p>
            )}
            {savedField === 'how_it_works' && inlineEdit.how_it_works === undefined && <span style={savedConfirmStyle}>Saved ✓</span>}
            <AIChallenge sectionKey="how_it_works" sectionLabel="How It Works" content={idea.how_it_works} isPaid={isPaid} />
          </div>
        )}

        {/* Card 4: Business Model (conditional) */}
        {(idea.business_model || isOwner) && (
          <div id="section-business_model" style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>Business Model</p>
              {isOwner && inlineEdit.business_model === undefined && <button onClick={() => startEdit('business_model')} style={pencilBtnLightStyle} title="Edit business model">✏️</button>}
            </div>
            {inlineEdit.business_model !== undefined ? (
              <>
                <BusinessModelSection
                  value={inlineEdit.business_model}
                  onChange={v => setInlineEdit(prev => ({ ...prev, business_model: v }))}
                  theme="light"
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={() => saveInlineField('business_model')} disabled={inlineSaving === 'business_model'} style={inlineSaveBtnStyle}>{inlineSaving === 'business_model' ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => cancelEdit('business_model')} style={inlineCancelBtnStyle}>Cancel</button>
                </div>
                {savedField === 'business_model' && <span style={savedConfirmStyle}>Saved ✓</span>}
              </>
            ) : idea.business_model ? (
              <BMReadView raw={idea.business_model} />
            ) : (
              <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>Not added yet — click ✏️ to describe your business model</p>
            )}
            {savedField === 'business_model' && inlineEdit.business_model === undefined && <span style={savedConfirmStyle}>Saved ✓</span>}
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', marginBottom: '0.75rem' }}>Revenue Structure</p>
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#888780' }}>Who pays</p>
                  {isOwner && inlineEdit.who_pays === undefined && <button onClick={() => startEdit('who_pays')} style={pencilBtnLightStyle} title="Edit who pays">✏️</button>}
                </div>
                {inlineEdit.who_pays !== undefined ? (
                  <>
                    <textarea value={inlineEdit.who_pays} onChange={e => setInlineEdit(v => ({ ...v, who_pays: e.target.value }))} rows={2} style={inlineTextareaStyle} autoFocus />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => saveInlineField('who_pays')} disabled={inlineSaving === 'who_pays'} style={inlineSaveBtnStyle}>{inlineSaving === 'who_pays' ? 'Saving…' : 'Save'}</button>
                      <button onClick={() => cancelEdit('who_pays')} style={inlineCancelBtnStyle}>Cancel</button>
                    </div>
                    {savedField === 'who_pays' && <span style={savedConfirmStyle}>Saved ✓</span>}
                  </>
                ) : idea.who_pays ? (
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: '#2c2c2a' }}>{idea.who_pays}</p>
                ) : isOwner ? (
                  <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>Not added yet — click ✏️</p>
                ) : null}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#888780' }}>Revenue streams</p>
                  {isOwner && inlineEdit.revenue_streams === undefined && <button onClick={() => startEdit('revenue_streams')} style={pencilBtnLightStyle} title="Edit revenue streams">✏️</button>}
                </div>
                {inlineEdit.revenue_streams !== undefined ? (
                  <>
                    <textarea value={inlineEdit.revenue_streams} onChange={e => setInlineEdit(v => ({ ...v, revenue_streams: e.target.value }))} rows={2} style={inlineTextareaStyle} autoFocus />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => saveInlineField('revenue_streams')} disabled={inlineSaving === 'revenue_streams'} style={inlineSaveBtnStyle}>{inlineSaving === 'revenue_streams' ? 'Saving…' : 'Save'}</button>
                      <button onClick={() => cancelEdit('revenue_streams')} style={inlineCancelBtnStyle}>Cancel</button>
                    </div>
                    {savedField === 'revenue_streams' && <span style={savedConfirmStyle}>Saved ✓</span>}
                  </>
                ) : idea.revenue_streams ? (
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: '#2c2c2a' }}>{idea.revenue_streams}</p>
                ) : isOwner ? (
                  <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>Not added yet — click ✏️</p>
                ) : null}
              </div>
            </div>
            <AIChallenge
              sectionKey="business_model"
              sectionLabel="Business Model"
              content={(() => { try { const bm = typeof idea.business_model === 'string' ? JSON.parse(idea.business_model) : idea.business_model; return bm?.models?.length ? `Models: ${bm.models.join(', ')}` : '' } catch { return idea.business_model || '' } })()}
              isPaid={isPaid}
            />
          </div>
        )}

        {/* Revenue Projections */}
        {(idea.revenue_projections || isOwner) && (() => {
          let rp = null
          try { rp = idea.revenue_projections ? (typeof idea.revenue_projections === 'string' ? JSON.parse(idea.revenue_projections) : idea.revenue_projections) : null } catch {}
          const editing = inlineEdit.revenue_projections !== undefined
          const editVal = editing ? inlineEdit.revenue_projections : (rp || { startingUsers: 100, monthlyGrowthRate: 10, conversionRate: 5, paidPriceOverride: '' })
          const getPaidPrice = () => {
            if (rp?.paidPriceOverride) return rp.paidPriceOverride
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
          }
          const paidPrice = parseFloat((getPaidPrice() || '$12').replace(/[^0-9.]/g, '')) || 12
          const startingUsers = (rp?.startingUsers) || 100
          const monthlyGrowth = ((rp?.monthlyGrowthRate) || 10) / 100
          const convRate = ((rp?.conversionRate) || 5) / 100
          const scenarios = [
            { label: 'Conservative', multiplier: 0.5, color: '#888780' },
            { label: 'Moderate', multiplier: 1, color: '#7b9ff7' },
            { label: 'Optimistic', multiplier: 2, color: '#22c55e' },
          ]
          const calc = (months, mult) => {
            const users = startingUsers * Math.pow(1 + monthlyGrowth * mult, months)
            return users * convRate * paidPrice
          }
          const fmt = n => n >= 1000000 ? '$' + (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? '$' + Math.round(n / 1000) + 'K' : '$' + Math.round(n)
          return (
            <div id="section-revenue_projections" style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780', margin: 0 }}>Revenue Projections</p>
                  {isOwner && inlineEdit.revenue_potential !== undefined
                    ? <input value={inlineEdit.revenue_potential} onChange={e => setInlineEdit(v => ({ ...v, revenue_potential: e.target.value }))} onBlur={() => saveInlineField('revenue_potential')} style={{ fontSize: 11, borderRadius: 5, padding: '2px 8px', border: '1px solid #7b9ff7', color: '#7b9ff7', background: 'rgba(123,159,247,0.1)', width: 90, fontFamily: 'inherit' }} autoFocus />
                    : <span onClick={() => isOwner && setInlineEdit(v => ({ ...v, revenue_potential: idea.revenue_potential || '' }))} style={{ fontSize: 11, background: 'rgba(123,159,247,0.1)', color: '#7b9ff7', borderRadius: 5, padding: '2px 8px', fontWeight: 500, cursor: isOwner ? 'pointer' : 'default', border: isOwner ? '1px dashed rgba(123,159,247,0.4)' : 'none' }}>{idea.revenue_potential || (isOwner ? '+ revenue potential' : '')}</span>
                  }
                  {isOwner && inlineEdit.business_stage !== undefined
                    ? <input value={inlineEdit.business_stage} onChange={e => setInlineEdit(v => ({ ...v, business_stage: e.target.value }))} onBlur={() => saveInlineField('business_stage')} style={{ fontSize: 11, borderRadius: 5, padding: '2px 8px', border: '1px solid #aaa', color: '#555', background: 'rgba(44,44,42,0.06)', width: 90, fontFamily: 'inherit' }} autoFocus />
                    : <span onClick={() => isOwner && setInlineEdit(v => ({ ...v, business_stage: idea.business_stage || '' }))} style={{ fontSize: 11, background: 'rgba(44,44,42,0.06)', color: '#555', borderRadius: 5, padding: '2px 8px', fontWeight: 500, cursor: isOwner ? 'pointer' : 'default', border: isOwner ? '1px dashed rgba(44,44,42,0.2)' : 'none' }}>{idea.business_stage || (isOwner ? '+ stage' : '')}</span>
                  }
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {isOwner && isPaid && <button onClick={handleRevenueAISuggest} disabled={aiRevenueLoading} style={{ background: aiRevenueLoading ? 'rgba(123,159,247,0.12)' : 'rgba(123,159,247,0.07)', border: '0.5px solid rgba(123,159,247,0.28)', borderRadius: 7, padding: '4px 10px', fontSize: 12, color: '#7b9ff7', cursor: aiRevenueLoading ? 'not-allowed' : 'pointer', fontWeight: 500 }}>{aiRevenueLoading ? '…thinking' : '✨ AI Suggest'}</button>}
                  {isOwner && !editing && <button onClick={() => setInlineEdit(v => ({ ...v, revenue_projections: rp || { startingUsers: 100, monthlyGrowthRate: 10, conversionRate: 5, paidPriceOverride: '' } }))} style={pencilBtnLightStyle} title="Edit revenue projections">✏️</button>}
                </div>
              </div>
              {editing ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>Starting users</div>
                      <input type="number" value={editVal.startingUsers ?? 100} onChange={e => setInlineEdit(v => ({ ...v, revenue_projections: { ...v.revenue_projections, startingUsers: e.target.value } }))} style={inlineTextareaStyle} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>Monthly growth rate (%)</div>
                      <input type="number" value={editVal.monthlyGrowthRate ?? 10} onChange={e => setInlineEdit(v => ({ ...v, revenue_projections: { ...v.revenue_projections, monthlyGrowthRate: e.target.value } }))} style={inlineTextareaStyle} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>Free→paid conversion (%)</div>
                      <input type="number" value={editVal.conversionRate ?? 5} onChange={e => setInlineEdit(v => ({ ...v, revenue_projections: { ...v.revenue_projections, conversionRate: e.target.value } }))} style={inlineTextareaStyle} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#888780', marginBottom: 4 }}>Price override (optional, auto from Business Model: {getPaidPrice()})</div>
                      <input value={editVal.paidPriceOverride || ''} onChange={e => setInlineEdit(v => ({ ...v, revenue_projections: { ...v.revenue_projections, paidPriceOverride: e.target.value } }))} placeholder={getPaidPrice()} style={inlineTextareaStyle} />
                    </div>
                  </div>
                  {revenueSuggestionReason && (
                    <div style={{ background: 'rgba(123,159,247,0.06)', border: '0.5px solid rgba(123,159,247,0.2)', borderRadius: 8, padding: '0.5rem 0.75rem', marginBottom: 10, fontSize: 12, color: '#555', fontStyle: 'italic' }}>✨ {revenueSuggestionReason}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { saveInlineField('revenue_projections'); setRevenueSuggestionReason('') }} disabled={inlineSaving === 'revenue_projections'} style={inlineSaveBtnStyle}>{inlineSaving === 'revenue_projections' ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => { cancelEdit('revenue_projections'); setRevenueSuggestionReason('') }} style={inlineCancelBtnStyle}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 12, color: '#888780', marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>Starting users: <strong style={{ color: '#2c2c2a' }}>{startingUsers.toLocaleString()}</strong></span>
                    <span>Monthly growth: <strong style={{ color: '#2c2c2a' }}>{(rp?.monthlyGrowthRate) || 10}%</strong></span>
                    <span>Conversion: <strong style={{ color: '#2c2c2a' }}>{(rp?.conversionRate) || 5}%</strong></span>
                    <span>Price: <strong style={{ color: '#2c2c2a' }}>{getPaidPrice()}/mo</strong></span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                    {scenarios.map(sc => (
                      <div key={sc.label} style={{ background: sc.color + '0d', border: `0.5px solid ${sc.color}40`, borderRadius: 10, padding: '0.75rem 1rem' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: sc.color, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>{sc.label}</div>
                        {[{ l: '6mo', m: 6 }, { l: '12mo', m: 12 }, { l: '24mo', m: 24 }].map(p => (
                          <div key={p.l} style={{ marginBottom: 6 }}>
                            <div style={{ fontSize: 10, color: '#b0b0a8', textTransform: 'uppercase' }}>{p.l} MRR</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#2c2c2a' }}>{fmt(calc(p.m, sc.multiplier))}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: '#b0b0a8', fontStyle: 'italic', marginTop: 10 }}>Model assumptions only — actual results will vary.</p>
                  {savedField === 'revenue_projections' && <span style={{ color: '#22c55e', fontSize: 12, marginLeft: 8 }}>Saved ✓</span>}
                </>
              )}
            </div>
          )
        })()}

        {/* Customer Validation */}
        {(idea.customer_validation || isOwner) && (() => {
          let cvData = null
          try { cvData = idea.customer_validation ? JSON.parse(idea.customer_validation) : null } catch {}
          const editing = inlineEdit.customer_validation !== undefined
          const editVal = editing ? inlineEdit.customer_validation : { waitlist: '', interviews: '', pilots: '', stage: '' }
          return (
            <div id="section-customer_validation" style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>Customer Validation</p>
                {isOwner && !editing && <button onClick={() => setInlineEdit(v => ({ ...v, customer_validation: cvData || { waitlist: '', interviews: '', pilots: '', stage: '' } }))} style={pencilBtnLightStyle} title="Edit customer validation">✏️</button>}
              </div>
              {editing ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 11, color: '#888780', marginBottom: 4, fontWeight: 600 }}>Waitlist signups</p>
                      <input type="number" value={editVal.waitlist || ''} onChange={e => setInlineEdit(v => ({ ...v, customer_validation: { ...v.customer_validation, waitlist: e.target.value } }))} placeholder="0" autoFocus style={inlineTextareaStyle} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#888780', marginBottom: 4, fontWeight: 600 }}>User interviews</p>
                      <input type="number" value={editVal.interviews || ''} onChange={e => setInlineEdit(v => ({ ...v, customer_validation: { ...v.customer_validation, interviews: e.target.value } }))} placeholder="0" style={inlineTextareaStyle} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#888780', marginBottom: 4, fontWeight: 600 }}>Paid pilots</p>
                      <input type="number" value={editVal.pilots || ''} onChange={e => setInlineEdit(v => ({ ...v, customer_validation: { ...v.customer_validation, pilots: e.target.value } }))} placeholder="0" style={inlineTextareaStyle} />
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#888780', marginBottom: 4, fontWeight: 600 }}>Stage</p>
                      <select value={editVal.stage || ''} onChange={e => setInlineEdit(v => ({ ...v, customer_validation: { ...v.customer_validation, stage: e.target.value } }))} style={{ ...inlineTextareaStyle, height: 38 }}>
                        <option value="">Select stage</option>
                        <option value="Idea">Idea</option>
                        <option value="Pre-launch">Pre-launch</option>
                        <option value="Beta">Beta</option>
                        <option value="Live">Live</option>
                        <option value="Revenue">Revenue</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => saveInlineField('customer_validation')} disabled={inlineSaving === 'customer_validation'} style={inlineSaveBtnStyle}>{inlineSaving === 'customer_validation' ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => cancelEdit('customer_validation')} style={inlineCancelBtnStyle}>Cancel</button>
                  </div>
                </>
              ) : cvData ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Waitlist', value: cvData.waitlist || '0', suffix: '' },
                    { label: 'Interviews', value: cvData.interviews || '0', suffix: '' },
                    { label: 'Pilots', value: cvData.pilots || '0', suffix: '' },
                    { label: 'Stage', value: cvData.stage || '—', suffix: '' },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: 'rgba(123,159,247,0.06)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#2c2c2a', margin: 0, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>{stat.value}</p>
                      <p style={{ fontSize: 10, color: '#888780', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{stat.label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>Not added yet — click ✏️ to add validation data</p>
              )}
              {savedField === 'customer_validation' && !editing && <span style={savedConfirmStyle}>Saved ✓</span>}
            </div>
          )
        })()}

        {/* Card 5: Competitive Advantage */}
        {(idea.competitive_advantage || isOwner) && (
          <div id="section-competitive_advantage" style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>Competitive Advantage</p>
              {isOwner && inlineEdit.competitive_advantage === undefined && <button onClick={() => startEdit('competitive_advantage')} style={pencilBtnLightStyle} title="Edit competitive advantage">✏️</button>}
            </div>
            {inlineEdit.competitive_advantage !== undefined ? (
              <>
                <textarea value={inlineEdit.competitive_advantage} onChange={e => setInlineEdit(v => ({ ...v, competitive_advantage: e.target.value }))} rows={4} style={inlineTextareaStyle} placeholder="What makes this uniquely positioned to win?" autoFocus />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => saveInlineField('competitive_advantage')} disabled={inlineSaving === 'competitive_advantage'} style={inlineSaveBtnStyle}>{inlineSaving === 'competitive_advantage' ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => cancelEdit('competitive_advantage')} style={inlineCancelBtnStyle}>Cancel</button>
                </div>
              </>
            ) : idea.competitive_advantage ? (
              <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{idea.competitive_advantage}</p>
            ) : (
              <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>Not added yet — click ✏️ to describe your competitive advantage</p>
            )}
            {savedField === 'competitive_advantage' && inlineEdit.competitive_advantage === undefined && <span style={savedConfirmStyle}>Saved ✓</span>}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>Pricing Power</p>
                {isOwner && inlineEdit.pricing_power === undefined && <button onClick={() => startEdit('pricing_power')} style={pencilBtnLightStyle} title="Edit pricing power">✏️</button>}
              </div>
              {inlineEdit.pricing_power !== undefined ? (
                <>
                  <textarea value={inlineEdit.pricing_power} onChange={e => setInlineEdit(v => ({ ...v, pricing_power: e.target.value }))} rows={2} style={inlineTextareaStyle} autoFocus />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => saveInlineField('pricing_power')} disabled={inlineSaving === 'pricing_power'} style={inlineSaveBtnStyle}>{inlineSaving === 'pricing_power' ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => cancelEdit('pricing_power')} style={inlineCancelBtnStyle}>Cancel</button>
                  </div>
                  {savedField === 'pricing_power' && <span style={savedConfirmStyle}>Saved ✓</span>}
                </>
              ) : idea.pricing_power ? (
                <p style={{ fontSize: 13, lineHeight: 1.7, color: '#2c2c2a' }}>{idea.pricing_power}</p>
              ) : isOwner ? (
                <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>Not added yet — click ✏️</p>
              ) : null}
            </div>
            <AIChallenge sectionKey="competitive_advantage" sectionLabel="Competitive Advantage" content={idea.competitive_advantage} isPaid={isPaid} />
          </div>
        )}

        {/* Card 6: Competitive Landscape */}
        {(idea.competitive_landscape || isOwner) && (
          <CompetitiveLandscape
            value={idea.competitive_landscape}
            onChange={async (val) => {
              const { error } = await supabase
                .from('ideas')
                .update({ competitive_landscape: typeof val === 'string' ? val : JSON.stringify(val) })
                .eq('id', id)
              if (error) { console.error('competitive_landscape save error:', error); return }
              setIdea(prev => ({ ...prev, competitive_landscape: typeof val === 'string' ? val : JSON.stringify(val) }))
            }}
            isOwner={isOwner}
            isPaid={isPaid}
            ideaTitle={idea.title}
            ideaProblem={idea.problem}
            ideaSolution={idea.solution}
          />
        )}

        {/* Card 7: Risks & Challenges */}
        {(idea.risks || isOwner) && (
          <div id="section-risks" style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>Risks & Challenges</p>
              {isOwner && inlineEdit.risks === undefined && <button onClick={() => startEdit('risks')} style={pencilBtnLightStyle} title="Edit risks">✏️</button>}
            </div>
            {inlineEdit.risks !== undefined ? (
              <>
                <textarea value={inlineEdit.risks} onChange={e => setInlineEdit(v => ({ ...v, risks: e.target.value }))} rows={4} style={inlineTextareaStyle} placeholder="What obstacles or risks could affect this idea?" autoFocus />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => saveInlineField('risks')} disabled={inlineSaving === 'risks'} style={inlineSaveBtnStyle}>{inlineSaving === 'risks' ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => cancelEdit('risks')} style={inlineCancelBtnStyle}>Cancel</button>
                </div>
              </>
            ) : idea.risks ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>
                {idea.risks.split('\n').filter(l => l.trim()).map((line, i) => (
                  <li key={i}>{line.trim()}</li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>Not added yet — click ✏️ to list your risks & challenges</p>
            )}
            {savedField === 'risks' && inlineEdit.risks === undefined && <span style={savedConfirmStyle}>Saved ✓</span>}
            <AIChallenge sectionKey="risks" sectionLabel="Risks & Challenges" content={idea.risks} isPaid={isPaid} />
          </div>
        )}

        {/* Card 7: Next Steps */}
        {(idea.next_steps || isOwner) && (
          <div id="section-next_steps" style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>Next Steps</p>
              {isOwner && inlineEdit.next_steps === undefined && <button onClick={() => startEdit('next_steps')} style={pencilBtnLightStyle} title="Edit next steps">✏️</button>}
            </div>
            {inlineEdit.next_steps !== undefined ? (
              <>
                <textarea value={inlineEdit.next_steps} onChange={e => setInlineEdit(v => ({ ...v, next_steps: e.target.value }))} rows={4} style={inlineTextareaStyle} placeholder="What are the next steps to bring this idea to life?" autoFocus />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => saveInlineField('next_steps')} disabled={inlineSaving === 'next_steps'} style={inlineSaveBtnStyle}>{inlineSaving === 'next_steps' ? 'Saving…' : 'Save'}</button>
                  <button onClick={() => cancelEdit('next_steps')} style={inlineCancelBtnStyle}>Cancel</button>
                </div>
              </>
            ) : idea.next_steps ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>
                {idea.next_steps.split('\n').filter(l => l.trim()).map((line, i) => (
                  <li key={i}>{line.trim()}</li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>Not added yet — click ✏️ to outline your next steps</p>
            )}
            {savedField === 'next_steps' && inlineEdit.next_steps === undefined && <span style={savedConfirmStyle}>Saved ✓</span>}
            <AIChallenge sectionKey="next_steps" sectionLabel="Next Steps" content={idea.next_steps} isPaid={isPaid} />
          </div>
        )}

          {/* SUPPORT FILES */}
          {(supportFiles.length > 0 || isOwner) && (
            <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#888780', marginBottom: '1rem' }}>Support Files</p>
              {supportFiles.map((f, i) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '0.65rem 0.85rem', borderRadius: 10, border: '0.5px solid rgba(0,0,0,0.07)', background: 'rgba(123,159,247,0.03)' }}>
                  <input value={f.name} onChange={async (e) => {
                    const updated = supportFiles.map((x, xi) => xi === i ? { ...x, name: e.target.value } : x)
                    setSupportFiles(updated)
                    await supabase.from('ideas').update({ support_files: updated }).eq('id', id)
                  }} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, color: '#2c2c2a', fontWeight: 500, outline: 'none' }} />
                  <button onClick={() => {
                    const updated = supportFiles.map((x, xi) => xi === i ? { ...x, show_preview: !x.show_preview } : x)
                    setSupportFiles(updated)
                    supabase.from('ideas').update({ support_files: updated }).eq('id', id)
                  }} style={{ fontSize: 11, color: f.show_preview ? '#7b9ff7' : '#aaa', border: '0.5px solid currentColor', borderRadius: 6, padding: '2px 8px', background: 'transparent', cursor: 'pointer' }}>{f.show_preview ? 'Preview ON' : 'Preview OFF'}</button>
                  <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#7b9ff7', textDecoration: 'none' }}>Open ↗</a>
                  <button onClick={async () => {
                    const updated = supportFiles.filter((_, xi) => xi !== i)
                    setSupportFiles(updated)
                    await supabase.from('ideas').update({ support_files: updated }).eq('id', id)
                  }} style={{ fontSize: 11, color: '#e57373', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
                  {f.show_preview && f.type === 'image' && <img src={f.url} alt={f.name} style={{ width: '100%', borderRadius: 8, marginTop: 6, display: 'block' }} />}
                  {f.show_preview && f.type === 'video_link' && (
                    <iframe src={f.url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/').replace('vimeo.com/', 'player.vimeo.com/video/')} style={{ width: '100%', height: 220, borderRadius: 8, marginTop: 6, border: 'none' }} allowFullScreen />
                  )}
                </div>
              ))}
              {isOwner && (
                <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 13, color: '#7b9ff7', fontWeight: 500, cursor: 'pointer', padding: '6px 14px', border: '0.5px solid #7b9ff7', borderRadius: 8 }}>
                    {uploadingFile ? 'Uploading…' : '+ Upload file'}
                    <input type="file" accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={async (e) => {
                      const file = e.target.files[0]
                      if (!file) return
                      setUploadingFile(true)
                      const fileId = crypto.randomUUID()
                      const ext = file.name.split('.').pop()
                      const path = `${id}/files/${fileId}.${ext}`
                      const isImage = file.type.startsWith('image/')
                      const { error } = await supabase.storage.from('idea-assets').upload(path, file, { upsert: false })
                      if (!error) {
                        const { data: { publicUrl } } = supabase.storage.from('idea-assets').getPublicUrl(path)
                        const newFile = { id: fileId, name: file.name.replace(`.${ext}`, ''), url: publicUrl, type: isImage ? 'image' : 'doc', show_preview: isImage }
                        const updated = [...supportFiles, newFile]
                        setSupportFiles(updated)
                        await supabase.from('ideas').update({ support_files: updated }).eq('id', id)
                      }
                      setUploadingFile(false)
                    }} />
                  </label>
                  <button onClick={() => {
                    const url = prompt('Paste a YouTube, Vimeo, or Loom URL:')
                    if (!url) return
                    const fileId = crypto.randomUUID()
                    const newFile = { id: fileId, name: 'Video', url, type: 'video_link', show_preview: false }
                    const updated = [...supportFiles, newFile]
                    setSupportFiles(updated)
                    supabase.from('ideas').update({ support_files: updated }).eq('id', id)
                  }} style={{ fontSize: 13, color: '#7b9ff7', fontWeight: 500, cursor: 'pointer', padding: '6px 14px', border: '0.5px solid #7b9ff7', borderRadius: 8, background: 'transparent' }}>+ Add video link</button>
                </div>
              )}
            </div>
          )}

        {/* Team */}
        {(idea.team || isOwner) && (() => {
          let teamData = null
          try { teamData = idea.team ? JSON.parse(idea.team) : null } catch {}
          const editing = inlineEdit.team !== undefined
          const editVal = editing ? inlineEdit.team : { name: '', role: '', bio: '', origin: '' }
          return (
            <div id="section-team" style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>The Team</p>
                {isOwner && !editing && <button onClick={() => setInlineEdit(v => ({ ...v, team: teamData || { name: '', role: '', bio: '', origin: '' } }))} style={pencilBtnLightStyle} title="Edit team">✏️</button>}
              </div>
              {editing ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                    <input value={editVal.name || ''} onChange={e => setInlineEdit(v => ({ ...v, team: { ...v.team, name: e.target.value } }))} placeholder="Full name" autoFocus style={inlineTextareaStyle} />
                    <input value={editVal.role || ''} onChange={e => setInlineEdit(v => ({ ...v, team: { ...v.team, role: e.target.value } }))} placeholder="Role / title" style={inlineTextareaStyle} />
                    <textarea value={editVal.bio || ''} onChange={e => setInlineEdit(v => ({ ...v, team: { ...v.team, bio: e.target.value } }))} placeholder="Background and relevant experience" rows={3} style={inlineTextareaStyle} />
                    <textarea value={editVal.origin || ''} onChange={e => setInlineEdit(v => ({ ...v, team: { ...v.team, origin: e.target.value } }))} placeholder="Origin story — why you built this" rows={3} style={inlineTextareaStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => saveInlineField('team')} disabled={inlineSaving === 'team'} style={inlineSaveBtnStyle}>{inlineSaving === 'team' ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => cancelEdit('team')} style={inlineCancelBtnStyle}>Cancel</button>
                  </div>
                </>
              ) : teamData ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1rem' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#7b9ff7,#9b7ff7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Outfit', sans-serif" }}>{(teamData.name || '?')[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#2c2c2a', margin: 0, fontFamily: "'Outfit', sans-serif" }}>{teamData.name}</p>
                      <p style={{ fontSize: 12, color: '#888780', margin: '2px 0 0', fontFamily: "'Outfit', sans-serif" }}>{teamData.role}</p>
                    </div>
                  </div>
                  {teamData.bio && <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a', marginBottom: teamData.origin ? '1rem' : 0 }}>{teamData.bio}</p>}
                  {teamData.origin && (
                    <div style={{ borderLeft: '3px solid #7b9ff7', paddingLeft: 12, marginTop: 8 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#7b9ff7', marginBottom: 4 }}>Origin Story</p>
                      <p style={{ fontSize: 13, lineHeight: 1.7, color: '#555', fontStyle: 'italic', margin: 0 }}>{teamData.origin}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>Not added yet — click ✏️ to introduce your team</p>
              )}
              {savedField === 'team' && !editing && <span style={savedConfirmStyle}>Saved ✓</span>}
            </div>
          )
        })()}

        {/* Traction & Next Milestones */}
        {(idea.traction || isOwner) && (() => {
          let trData = null
          try { trData = idea.traction ? JSON.parse(idea.traction) : null } catch {}
          const editing = inlineEdit.traction !== undefined
          const editVal = editing ? inlineEdit.traction : { milestones: [] }
          const emptyMilestone = { label: '', date: '', status: 'upcoming' }
          return (
            <div id="section-traction" style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#888780' }}>Traction & Next Milestones</p>
                {isOwner && !editing && <button onClick={() => setInlineEdit(v => ({ ...v, traction: trData || { milestones: [{ ...emptyMilestone }] } }))} style={pencilBtnLightStyle} title="Edit traction">✏️</button>}
              </div>
              {editing ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {(editVal.milestones || []).map((m, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px 32px', gap: 8, alignItems: 'center' }}>
                        <input value={m.label || ''} onChange={e => { const ms = [...editVal.milestones]; ms[i] = { ...ms[i], label: e.target.value }; setInlineEdit(v => ({ ...v, traction: { ...v.traction, milestones: ms } })) }} placeholder="Milestone description" autoFocus={i === 0} style={inlineTextareaStyle} />
                        <input type="date" value={m.date || ''} onChange={e => { const ms = [...editVal.milestones]; ms[i] = { ...ms[i], date: e.target.value }; setInlineEdit(v => ({ ...v, traction: { ...v.traction, milestones: ms } })) }} style={inlineTextareaStyle} />
                        <select value={m.status || 'upcoming'} onChange={e => { const ms = [...editVal.milestones]; ms[i] = { ...ms[i], status: e.target.value }; setInlineEdit(v => ({ ...v, traction: { ...v.traction, milestones: ms } })) }} style={{ ...inlineTextareaStyle, height: 38 }}>
                          <option value="done">✅ Done</option>
                          <option value="in-progress">🔄 In Progress</option>
                          <option value="upcoming">⏳ Upcoming</option>
                        </select>
                        <button onClick={() => { const ms = editVal.milestones.filter((_, j) => j !== i); setInlineEdit(v => ({ ...v, traction: { ...v.traction, milestones: ms } })) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#ccc', padding: 0 }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => setInlineEdit(v => ({ ...v, traction: { ...v.traction, milestones: [...(v.traction.milestones || []), { ...emptyMilestone }] } }))} style={{ background: 'none', border: '1px dashed #ddd', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#888780', cursor: 'pointer', marginTop: 4, width: 'fit-content' }}>+ Add milestone</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => saveInlineField('traction')} disabled={inlineSaving === 'traction'} style={inlineSaveBtnStyle}>{inlineSaving === 'traction' ? 'Saving…' : 'Save'}</button>
                    <button onClick={() => cancelEdit('traction')} style={inlineCancelBtnStyle}>Cancel</button>
                  </div>
                </>
              ) : trData && trData.milestones && trData.milestones.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {trData.milestones.map((m, i) => {
                    const colors = { done: '#22c55e', 'in-progress': '#7b9ff7', upcoming: '#d1d5db' }
                    const color = colors[m.status] || '#d1d5db'
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingBottom: i < trData.milestones.length - 1 ? 16 : 0, position: 'relative' }}>
                        {i < trData.milestones.length - 1 && <div style={{ position: 'absolute', left: 7, top: 16, width: 2, height: 'calc(100% - 8px)', background: '#f0f0ee' }} />}
                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 3, zIndex: 1 }} />
                        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <p style={{ fontSize: 14, color: '#2c2c2a', margin: 0, lineHeight: 1.5 }}>{m.label}</p>
                          {m.date && <span style={{ fontSize: 11, color: '#888780', background: '#f5f5f3', borderRadius: 6, padding: '2px 8px', flexShrink: 0, marginLeft: 12 }}>{new Date(m.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>Not added yet — click ✏️ to add milestones</p>
              )}
              {savedField === 'traction' && !editing && <span style={savedConfirmStyle}>Saved ✓</span>}
            </div>
          )
        })()}

        {/* Card 8: AI Executive Summary (collapsed) */}
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
        <div id="section-pitch-docs" style={{ background: '#fff', border: '0.5px solid rgba(44,44,42,0.1)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
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
                    <div key={entry.viewer_email || i} style={{ padding: '0.65rem 0', borderBottom: i < Math.min(accessLog.length, 5) - 1 ? '0.5px solid rgba(44,44,42,0.07)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a' }}>{entry.viewer_email || 'Anonymous'}</span>
                        <span style={{ fontSize: 10, background: '#dcfce7', color: '#16a34a', borderRadius: 4, padding: '2px 7px', fontWeight: 500, flexShrink: 0 }}>Views: {entry.view_count || 1}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#888780' }}>
                          First visit: {entry.viewed_at ? new Date(entry.viewed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                        <span style={{ fontSize: 11, color: '#888780' }}>
                          Last visit: {entry.last_viewed ? new Date(entry.last_viewed).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
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
                { label: 'First Viewed', value: accessLog.length ? new Date(accessLog[accessLog.length - 1].viewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
                { label: 'Last Viewed', value: accessLog.length ? new Date(accessLog[0].viewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' },
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
                  {['Email', 'First Viewed', 'Last Viewed', 'Views'].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#888780' }}>{h}</span>
                  ))}
                </div>
                {accessLog.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#888780', fontSize: 13 }}>No access records yet.</div>
                ) : (
                  accessLog.map((entry, i) => (
                    <div key={entry.viewer_email || i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.6fr 1.6fr 0.5fr', padding: '0.7rem 1rem', background: i % 2 === 0 ? '#fff' : '#fafaf8', borderBottom: i < accessLog.length - 1 ? '0.5px solid rgba(44,44,42,0.06)' : 'none', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>{entry.viewer_email || 'Anonymous'}</span>
                      <span style={{ fontSize: 12, color: '#555552' }}>
                        First visit: {entry.viewed_at ? new Date(entry.viewed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                      <span style={{ fontSize: 12, color: '#555552' }}>
                        Last visit: {entry.last_viewed ? new Date(entry.last_viewed).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#2c2c2a' }}>Total visits: {entry.view_count || 1}</span>
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

    {showMobilePDF && (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0e0e1f', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: "'DM Sans', sans-serif" }}>Investor Preview</span>
          <button
            onClick={() => setShowMobilePDF(false)}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, width: 32, height: 32, color: 'rgba(255,255,255,0.7)', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
          >×</button>
        </div>
        <iframe
          srcDoc={mobilePDFContent}
          style={{ flex: 1, border: 'none', width: '100%' }}
          title="Investor Preview"
        />
      </div>
    )}
    </>
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

const pencilBtnDarkStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 14, opacity: 0.5, padding: '2px 4px', lineHeight: 1, flexShrink: 0,
}

const pencilBtnLightStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: 14, opacity: 0.5, padding: '2px 4px', lineHeight: 1, flexShrink: 0,
}

const inlineTextareaStyle = {
  width: '100%', border: '0.5px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: 14, lineHeight: 1.7, color: 'var(--ink)',
  background: '#fafaf8', outline: 'none', resize: 'vertical',
  boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 44,
}

const inlineTextareaDarkStyle = {
  width: '100%', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
  padding: '10px 14px', fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.85)',
  background: 'rgba(255,255,255,0.06)', outline: 'none', resize: 'vertical',
  boxSizing: 'border-box', fontFamily: 'inherit', minHeight: 44,
}

const inlineSaveBtnStyle = {
  minHeight: 44, padding: '0 20px', background: '#3B5273', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

const inlineCancelBtnStyle = {
  minHeight: 44, padding: '0 16px', background: 'none',
  border: '0.5px solid rgba(44,44,42,0.15)', borderRadius: 8,
  fontSize: 13, color: '#888780', cursor: 'pointer',
}

const inlineCancelBtnDarkStyle = {
  minHeight: 44, padding: '0 16px', background: 'none',
  border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8,
  fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
}

const savedConfirmStyle = {
  display: 'inline-block', marginTop: 8, fontSize: 12, color: '#3B6D11',
  background: '#EAF3DE', borderRadius: 4, padding: '3px 8px', fontWeight: 500,
}

const savedConfirmDarkStyle = {
  display: 'inline-block', marginTop: 8, fontSize: 12, color: '#4ade80',
  background: 'rgba(74,222,128,0.1)', borderRadius: 4, padding: '3px 8px', fontWeight: 500,
}
