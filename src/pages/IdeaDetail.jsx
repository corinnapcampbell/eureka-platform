import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'
 
export default function IdeaDetail({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [idea, setIdea] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shareLink, setShareLink] = useState('')
  const [generatingLink, setGeneratingLink] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
 
  useEffect(() => {
    async function fetchIdea() {
      const { data } = await supabase
        .from('ideas')
        .select('*')
        .eq('id', id)
        .single()
      setIdea(data)
      setLoading(false)
    }
    fetchIdea()
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
 
  async function deleteIdea() {
    if (!window.confirm('Are you sure you want to delete this idea? This cannot be undone.')) return
    setDeleting(true)
    await supabase.from('ideas').delete().eq('id', id)
    navigate('/dashboard')
  }
 
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )
 
  if (!idea) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 16, color: 'var(--muted)' }}>Idea not found.</p>
      <button onClick={() => navigate('/dashboard')} style={btnSecondary}>← Back to vault</button>
    </div>
  )
 
  const date = new Date(idea.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
 
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
 
      {/* Nav */}
      <nav style={{
        maxWidth: 800, margin: '0 auto', padding: '1.25rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid var(--border)'
      }}>
        <Logo size={20} />
        <button onClick={() => navigate('/dashboard')} style={btnSecondary}>← Back to vault</button>
      </nav>
 
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 2rem' }}>
 
        {/* Categories + protection badge */}
        <div className="animate-fadeUp" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(idea.category || []).map(c => (
              <span key={c} style={{ fontSize: 11, background: 'var(--gold-light)', color: 'var(--gold)', borderRadius: 4, padding: '4px 10px', fontWeight: 500 }}>{c}</span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: idea.blockchain_hash ? '#3B6D11' : 'var(--muted)', background: idea.blockchain_hash ? '#EAF3DE' : 'var(--gold-light)', borderRadius: 20, padding: '4px 12px' }}>
            <span>{idea.blockchain_hash ? '⬡' : '◌'}</span>
            <span style={{ fontWeight: 500 }}>{idea.blockchain_hash ? 'Timestamped & protected' : 'Pending protection'}</span>
          </div>
        </div>
 
        {/* Title */}
        <h1 className="serif animate-fadeUp" style={{ fontSize: 40, lineHeight: 1.15, marginBottom: '0.5rem', animationDelay: '0.05s' }}>
          {idea.title}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '2.5rem' }}>Submitted {date}</p>
 
        {/* AI Profile */}
        {idea.ai_profile && (
          <div className="animate-fadeUp" style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '1.75rem', marginBottom: '2rem', animationDelay: '0.1s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold-mid)' }} />
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>AI executive summary</span>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--ink)', fontStyle: 'italic' }}>{idea.ai_profile}</p>
          </div>
        )}
 
        {/* Content sections */}
        <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '2rem' }}>
          {idea.problem && <Section title="The problem" content={idea.problem} />}
          {idea.solution && <Section title="The solution" content={idea.solution} />}
          {idea.target_audience && <Section title="Target audience" content={idea.target_audience} />}
          {idea.market_size && <Section title="Market size" content={idea.market_size} />}
          {idea.terms && <Section title="Looking for" content={idea.terms} />}
          {idea.asking_price && <Section title="Asking price" content={`${idea.asking_price} · ${idea.pricing_model}`} />}
        </div>
 
        {/* Blockchain hash */}
        {idea.blockchain_hash && (
          <div className="animate-fadeUp" style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '1.25rem', marginBottom: '2rem' }}>
            <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: 6 }}>Cryptographic fingerprint</p>
            <code style={{ fontSize: 12, color: 'var(--ink)', wordBreak: 'break-all', fontFamily: 'monospace' }}>{idea.blockchain_hash}</code>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>This hash proves your idea existed in its current form at the time of submission.</p>
          </div>
        )}
 
        {/* Share section */}
        <div style={{ background: 'var(--ink)', borderRadius: 14, padding: '2rem', marginBottom: '1.5rem' }}>
          <h3 className="serif" style={{ fontSize: 22, color: '#fff', marginBottom: '0.5rem' }}>Share this idea</h3>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Generate a protected link to share with a company or investor. Anyone who opens it must agree to NDA terms before seeing your idea — and their access is logged automatically.
          </p>
 
          {!shareLink ? (
            <button onClick={generateShareLink} disabled={generatingLink} style={{
              background: 'var(--gold)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '11px 24px', fontSize: 14, fontWeight: 500,
              opacity: generatingLink ? 0.7 : 1
            }}>
              {generatingLink ? 'Generating...' : '⬡ Generate protected link'}
            </button>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                <code style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)', wordBreak: 'break-all' }}>{shareLink}</code>
                <button onClick={copyLink} style={{
                  background: copied ? '#EAF3DE' : 'var(--gold)', color: copied ? '#3B6D11' : '#fff',
                  border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 500, flexShrink: 0
                }}>{copied ? '✓ Copied' : 'Copy'}</button>
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>This link requires NDA acceptance before viewing. You can generate a new link at any time.</p>
            </div>
          )}
        </div>
 
        {/* Danger zone */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={deleteIdea} disabled={deleting} style={{
            background: 'none', border: '0.5px solid #F09595', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, color: '#A32D2D',
            opacity: deleting ? 0.5 : 1
          }}>
            {deleting ? 'Deleting...' : 'Delete idea'}
          </button>
        </div>
      </div>
    </div>
  )
}
 
function Section({ title, content }) {
  return (
    <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
      <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink)' }}>{content}</p>
    </div>
  )
}
 
const btnSecondary = {
  background: 'none', border: '0.5px solid var(--border)',
  borderRadius: 6, padding: '7px 14px', fontSize: 13, color: 'var(--muted)'
}
 