import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'
import { generateIdeaPDF, dedupeArray, hasMultipleSteps } from '../utils/generatePDF'

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
              onClick={() => navigate(`/pitch-builder/${id}`)}
              style={{
                background: '#fff', color: '#0e0e1f', border: 'none',
                borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              📄 Build Pitch PDF
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              style={{
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                border: '0.5px solid rgba(255,255,255,0.2)',
                borderRadius: 10, padding: '11px 22px', fontSize: 13, fontWeight: 600,
                cursor: downloadingPDF ? 'not-allowed' : 'pointer',
                opacity: downloadingPDF ? 0.6 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {downloadingPDF ? 'Generating...' : '⬇ Download PDF'}
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
            {hasMultipleSteps(idea.how_it_works)
              ? idea.how_it_works.split('\n').filter(Boolean).map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: '0.85rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <p style={{ fontSize: 14, lineHeight: 1.75, color: '#2c2c2a', paddingTop: 2 }}>{step}</p>
                  </div>
                ))
              : <p style={{ fontSize: 14, lineHeight: 1.8, color: '#2c2c2a' }}>{idea.how_it_works}</p>
            }
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
                <a
                  href={`/pitch/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#7b9ff7', border: '0.5px solid rgba(123,159,247,0.3)', borderRadius: 6, padding: '5px 11px', textDecoration: 'none', fontWeight: 500, background: 'rgba(123,159,247,0.06)' }}
                >
                  👁 Preview as Investor
                </a>
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
