import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabase'
 
export default function SharedIdea() {
  const { token } = useParams()
  const [stage, setStage] = useState('loading') // loading | nda | idea | error
  const [idea, setIdea] = useState(null)
  const [email, setEmail] = useState('')
  const [accepting, setAccepting] = useState(false)
 
  useEffect(() => {
    async function fetchLink() {
      const { data: link } = await supabase
        .from('shared_links')
        .select('*, ideas(*)')
        .eq('token', token)
        .single()
 
      if (!link || !link.ideas) {
        setStage('error')
        return
      }
      setIdea(link.ideas)
      setStage('nda')
    }
    fetchLink()
  }, [token])
 
  async function acceptNDA() {
    if (!email) return
    setAccepting(true)
 
    // Log access
    await supabase.from('idea_access_log').insert({
      idea_id: idea.id,
      viewer_email: email,
      viewer_ip: 'logged',
      nda_accepted: true,
    })
 
    setStage('idea')
    setAccepting(false)
  }
 
  if (stage === 'loading') return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )
 
  if (stage === 'error') return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <span style={{ fontSize: 32 }}>⬡</span>
      <h2 className="serif" style={{ fontSize: 24 }}>Link not found</h2>
      <p style={{ fontSize: 14, color: 'var(--muted)' }}>This link may have expired or been revoked.</p>
    </div>
  )
 
  if (stage === 'nda') return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
 
      <div className="animate-fadeUp" style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span className="serif" style={{ fontSize: 22 }}>eureka<span style={{ color: 'var(--gold-mid)' }}>AI</span>dea</span>
        </div>
 
        <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 16, padding: '2.5rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: '1.25rem' }}>⬡</div>
 
          <h2 className="serif" style={{ fontSize: 26, marginBottom: '0.5rem' }}>You've been invited to view a protected idea</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
            Before you can access this idea, you must confirm that you are viewing confidential material under the following NDA terms. Your identity and access time will be logged.
          </p>
 
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: 12, lineHeight: 1.8, color: 'var(--muted)' }}>
            By proceeding, you agree that: (1) the idea you are about to view is confidential and proprietary; (2) you will not disclose, reproduce, or use the idea without written permission from the creator; (3) your access is being logged including your email address and timestamp; (4) unauthorized use may constitute misappropriation under the Defend Trade Secrets Act.
          </div>
 
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Your email address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              style={{ width: '100%', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 14, background: 'var(--surface)', outline: 'none', color: 'var(--ink)' }}
            />
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>This will be logged and shared with the idea creator.</p>
          </div>
 
          <button onClick={acceptNDA} disabled={!email || accepting} style={{
            width: '100%', background: 'var(--ink)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '12px',
            fontSize: 14, fontWeight: 500, opacity: (!email || accepting) ? 0.5 : 1
          }}>
            {accepting ? 'Logging access...' : 'I agree — view the idea'}
          </button>
        </div>
      </div>
    </div>
  )
 
  // Stage: idea
  const date = new Date(idea.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
 
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <nav style={{ maxWidth: 800, margin: '0 auto', padding: '1.5rem 2rem', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="serif" style={{ fontSize: 20 }}>eureka<span style={{ color: 'var(--gold-mid)' }}>AI</span>dea</span>
        <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--gold-light)', borderRadius: 20, padding: '4px 12px' }}>
          🔒 NDA accepted · access logged
        </div>
      </nav>
 
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '3rem 2rem' }}>
 
        <div className="animate-fadeUp" style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {(idea.category || []).map(c => (
            <span key={c} style={{ fontSize: 11, background: 'var(--gold-light)', color: 'var(--gold)', borderRadius: 4, padding: '4px 10px', fontWeight: 500 }}>{c}</span>
          ))}
        </div>
 
        <h1 className="serif animate-fadeUp" style={{ fontSize: 40, lineHeight: 1.15, marginBottom: '0.5rem', animationDelay: '0.05s' }}>{idea.title}</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: '2.5rem' }}>Protected idea · submitted {date}</p>
 
        {idea.ai_profile && (
          <div className="animate-fadeUp" style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '1.75rem', marginBottom: '2rem', animationDelay: '0.1s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold-mid)' }} />
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--gold)' }}>Executive summary</span>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--ink)', fontStyle: 'italic' }}>{idea.ai_profile}</p>
          </div>
        )}
 
        <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '3rem' }}>
          {idea.problem && <SharedSection title="The problem" content={idea.problem} />}
          {idea.solution && <SharedSection title="The solution" content={idea.solution} />}
          {idea.target_audience && <SharedSection title="Target audience" content={idea.target_audience} />}
          {idea.market_size && <SharedSection title="Market size" content={idea.market_size} />}
          {idea.terms && <SharedSection title="Creator is looking for" content={idea.terms} />}
          {idea.asking_price && <SharedSection title="Asking price" content={`${idea.asking_price} · ${idea.pricing_model}`} />}
        </div>
 
        <div style={{ background: 'var(--ink)', borderRadius: 14, padding: '1.5rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            Interested in this idea? Contact the creator through eurekAIdea.<br />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>This idea is protected. Your access has been logged.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
 
function SharedSection({ title, content }) {
  return (
    <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
      <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--ink)' }}>{content}</p>
    </div>
  )
}
 