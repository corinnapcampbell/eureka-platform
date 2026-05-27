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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: 12 }}>
          {freemium.freeTier && (
            <div style={{ borderRadius: 10, border: '0.5px solid rgba(20,184,166,0.25)', borderTop: '3px solid #14b8a6', padding: '0.85rem 1rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#14b8a6', marginBottom: '0.6rem' }}>🆓 Free Tier{freemium.paidPrice ? '' : ''}</p>
              {freemium.freeTier.split('\n').filter(Boolean).map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}><span style={{ color: '#14b8a6', fontWeight: 700, flexShrink: 0 }}>·</span><span style={{ fontSize: 13, color: '#2c2c2a', lineHeight: 1.5 }}>{line}</span></div>
              ))}
            </div>
          )}
          {(freemium.paidFeatures || freemium.paidPrice) && (
            <div style={{ borderRadius: 10, border: '0.5px solid rgba(139,92,246,0.25)', borderTop: '3px solid #8b5cf6', padding: '0.85rem 1rem' }}>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8b5cf6', marginBottom: '0.6rem' }}>⭐ Paid Tier{freemium.paidPrice ? ` · ${freemium.paidPrice}` : ''}</p>
              {(freemium.paidFeatures || '').split('\n').filter(Boolean).map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}><span style={{ color: '#8b5cf6', fontWeight: 700, flexShrink: 0 }}>·</span><span style={{ fontSize: 13, color: '#2c2c2a', lineHeight: 1.5 }}>{line}</span></div>
              ))}
            </div>
          )}
        </div>
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
  const [teaseSuggesting, setTeaseSuggesting] = useState(false)
  const [teaseSuggestion, setTeaseSuggestion] = useState(null)

  const startEditRef = useRef(null)

  useEffect(() => {
    const INLINE_FIELDS = new Set(['title', 'problem', 'solution', 'how_it_works', 'business_model', 'tagline', 'target_audience', 'competitive_advantage', 'risks', 'next_steps', 'tease'])
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
                {isOwner && <button onClick={() => startEdit('title')} style={pencilBtnDarkStyle} title="Edit title">✏️</button>}
                {savedField === 'title' && <span style={savedConfirmDarkStyle}>Saved ✓</span>}
              </div>
            )}
          </div>
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

      {/* White content area */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

        {isOwner && <AIScorecard idea={idea} ideaId={id} isPaid={false} />}

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
            <AIChallenge
              sectionKey="business_model"
              sectionLabel="Business Model"
              content={(() => { try { const bm = typeof idea.business_model === 'string' ? JSON.parse(idea.business_model) : idea.business_model; return bm?.models?.length ? `Models: ${bm.models.join(', ')}` : '' } catch { return idea.business_model || '' } })()}
              isPaid={isPaid}
            />
          </div>
        )}

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
            <AIChallenge sectionKey="competitive_advantage" sectionLabel="Competitive Advantage" content={idea.competitive_advantage} isPaid={isPaid} />
          </div>
        )}

        {/* Card 6: Risks & Challenges */}
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
              <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{idea.risks}</p>
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
              <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{idea.next_steps}</p>
            ) : (
              <p style={{ fontSize: 13, color: '#b0b0a8', fontStyle: 'italic' }}>Not added yet — click ✏️ to outline your next steps</p>
            )}
            {savedField === 'next_steps' && inlineEdit.next_steps === undefined && <span style={savedConfirmStyle}>Saved ✓</span>}
            <AIChallenge sectionKey="next_steps" sectionLabel="Next Steps" content={idea.next_steps} isPaid={isPaid} />
          </div>
        )}

        {/* Team */}
        {(idea.team || isOwner) && (
          <div id="section-team" style={{ background: '#0e0e1f', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>👥</span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.35)' }}>The Team</span>
              </div>
              {isOwner && inlineEdit.team === undefined && <button onClick={() => startEdit('team')} style={pencilBtnDarkStyle} title="Edit team">✏️</button>}
            </div>
            {inlineEdit.team !== undefined ? (
              <div>
                <textarea
                  value={inlineEdit.team}
                  onChange={e => setInlineEdit(s => ({ ...s, team: e.target.value }))}
                  style={{ width: '100%', minHeight: 80, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#fff', fontFamily: "'Outfit', sans-serif", resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => saveInlineField('team')} style={{ background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => cancelEdit('team')} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: idea.team ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)', lineHeight: 1.7, margin: 0, fontFamily: "'Outfit', sans-serif", fontStyle: idea.team ? 'normal' : 'italic' }}>
                {idea.team || (isOwner ? 'Add your team background and relevant experience…' : 'No team information provided.')}
              </p>
            )}
          </div>
        )}

        {/* Customer Validation */}
        {(idea.customer_validation || isOwner) && (
          <div id="section-customer_validation" style={{ background: '#0e0e1f', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>✅</span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.35)' }}>Customer Validation</span>
              </div>
              {isOwner && inlineEdit.customer_validation === undefined && <button onClick={() => startEdit('customer_validation')} style={pencilBtnDarkStyle} title="Edit customer validation">✏️</button>}
            </div>
            {inlineEdit.customer_validation !== undefined ? (
              <div>
                <textarea
                  value={inlineEdit.customer_validation}
                  onChange={e => setInlineEdit(s => ({ ...s, customer_validation: e.target.value }))}
                  style={{ width: '100%', minHeight: 80, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#fff', fontFamily: "'Outfit', sans-serif", resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => saveInlineField('customer_validation')} style={{ background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => cancelEdit('customer_validation')} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: idea.customer_validation ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)', lineHeight: 1.7, margin: 0, fontFamily: "'Outfit', sans-serif", fontStyle: idea.customer_validation ? 'normal' : 'italic' }}>
                {idea.customer_validation || (isOwner ? 'Add waitlist numbers, user interviews, pilot users, or early feedback…' : 'No customer validation data provided.')}
              </p>
            )}
          </div>
        )}

        {/* Traction */}
        {(idea.traction || isOwner) && (
          <div id="section-traction" style={{ background: '#0e0e1f', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🚀</span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.35)' }}>Traction & Next Milestones</span>
              </div>
              {isOwner && inlineEdit.traction === undefined && <button onClick={() => startEdit('traction')} style={pencilBtnDarkStyle} title="Edit traction">✏️</button>}
            </div>
            {inlineEdit.traction !== undefined ? (
              <div>
                <textarea
                  value={inlineEdit.traction}
                  onChange={e => setInlineEdit(s => ({ ...s, traction: e.target.value }))}
                  style={{ width: '100%', minHeight: 80, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#fff', fontFamily: "'Outfit', sans-serif", resize: 'vertical', boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => saveInlineField('traction')} style={{ background: 'linear-gradient(90deg,#7b9ff7,#9b7ff7)', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Save</button>
                  <button onClick={() => cancelEdit('traction')} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 14, color: idea.traction ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)', lineHeight: 1.7, margin: 0, fontFamily: "'Outfit', sans-serif", fontStyle: idea.traction ? 'normal' : 'italic' }}>
                {idea.traction || (isOwner ? 'Add milestones, timelines, and progress to date…' : 'No traction data provided.')}
              </p>
            )}
          </div>
        )}

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
