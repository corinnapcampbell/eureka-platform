import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'
 
export default function Dashboard({ session }) {
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const navigate = useNavigate()
  const name = session.user.user_metadata?.full_name?.split(' ')[0] || 'there'
 
  useEffect(() => {
    async function fetchIdeas() {
      const { data } = await supabase
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false })
      setIdeas(data || [])
      setLoading(false)
    }
    fetchIdeas()
  }, [])
 
  async function signOut() {
    await supabase.auth.signOut()
  }
 
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
 
      {/* Nav */}
      <nav style={{
        maxWidth: 960, margin: '0 auto', padding: '1.25rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid var(--border)', position: 'relative'
      }}>
        <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <Logo size={20} variant="dark" />
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span
            onClick={() => navigate('/dashboard')}
            style={{ fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}
          >My Ideas</span>

          {/* Three dots menu */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => { setMenuOpen(o => !o); setAvatarMenuOpen(false) }}
              style={{
                width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4, background: menuOpen ? 'rgba(255,255,255,0.08)' : 'none',
                border: '0.5px solid rgba(255,255,255,0.12)', transition: 'background 0.15s'
              }}
            >
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--muted)' }} />
              ))}
            </div>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{
                  position: 'absolute', top: 40, right: 0, zIndex: 100,
                  background: '#1a1a2e', border: '0.5px solid var(--border)',
                  borderRadius: 12, padding: '8px', minWidth: 210,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                  <div style={{ padding: '8px 12px 10px', borderBottom: '0.5px solid var(--border)', marginBottom: 4 }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Signed in as</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#fff', wordBreak: 'break-all' }}>{session.user.email}</p>
                  </div>
                  <button onClick={() => { navigate('/profile'); setMenuOpen(false) }} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', borderRadius: 8,
                    padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer',
                  }}>👤 Profile</button>
                  <button style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', borderRadius: 8,
                    padding: '9px 12px', fontSize: 14, color: 'var(--muted)', cursor: 'not-allowed',
                  }}>⚙️ Settings <span style={{ fontSize: 11 }}>(coming soon)</span></button>
                  <div style={{ borderTop: '0.5px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
                    <button onClick={() => { signOut(); setMenuOpen(false) }} style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      background: 'none', border: 'none', borderRadius: 8,
                      padding: '9px 12px', fontSize: 14, color: '#f87171', cursor: 'pointer',
                    }}>Sign out</button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Avatar circle with its own popover */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => { setAvatarMenuOpen(o => !o); setMenuOpen(false) }}
              style={{
                width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
                background: session.user.user_metadata?.avatar_url ? 'none' : 'linear-gradient(135deg, #7b9ff7, #9b7ff7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, color: '#fff',
                overflow: 'hidden', border: '2px solid rgba(123,159,247,0.35)', flexShrink: 0,
              }}
            >
              {session.user.user_metadata?.avatar_url
                ? <img src={session.user.user_metadata.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (session.user.user_metadata?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) || session.user.email[0].toUpperCase())
              }
            </div>
            {avatarMenuOpen && (
              <>
                <div onClick={() => setAvatarMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{
                  position: 'absolute', top: 44, right: 0, zIndex: 100,
                  background: '#1a1a2e', border: '0.5px solid var(--border)',
                  borderRadius: 12, padding: '8px', minWidth: 190,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                  <button onClick={() => { navigate('/profile'); setAvatarMenuOpen(false) }} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', borderRadius: 8,
                    padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer',
                  }}>🖼️ Edit picture</button>
                  <button onClick={() => { navigate('/profile'); setAvatarMenuOpen(false) }} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', borderRadius: 8,
                    padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer',
                  }}>👤 Profile settings</button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
 
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '3rem 2rem' }}>
 
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '3rem' }}>
          <div>
            <h1 className="serif animate-fadeUp" style={{ fontSize: 36, marginBottom: '0.4rem' }}>
              Good to see you, {name}.
            </h1>
            <p style={{ fontSize: 15, color: 'var(--muted)' }}>
              {ideas.length === 0 ? 'Your vault is empty. Submit your first idea.' : `You have ${ideas.length} idea${ideas.length !== 1 ? 's' : ''} protected.`}
            </p>
          </div>
          <button onClick={() => navigate('/submit')} style={{
            background: 'var(--ink)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 500,
            whiteSpace: 'nowrap'
          }}>+ New idea</button>
        </div>
 
        {/* Ideas grid */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : ideas.length === 0 ? (
          <EmptyState navigate={navigate} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {ideas.map((idea, i) => (
              <IdeaCard key={idea.id} idea={idea} index={i} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
 
function IdeaCard({ idea, index, navigate }) {
  const date = new Date(idea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const categories = idea.category || []
 
  return (
    <div
      onClick={() => navigate(`/idea/${idea.id}`)}
      className="animate-fadeUp"
      style={{
        background: 'var(--white)', border: '0.5px solid var(--border)',
        borderRadius: 14, padding: '1.5rem', cursor: 'pointer',
        transition: 'border-color 0.2s, transform 0.15s',
        animationDelay: `${index * 0.06}s`,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.slice(0, 2).map(c => (
            <span key={c} style={{ fontSize: 11, background: 'var(--gold-light)', color: 'var(--gold)', borderRadius: 4, padding: '3px 8px', fontWeight: 500 }}>{c}</span>
          ))}
        </div>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--success)', flexShrink: 0 }}>✓</div>
      </div>
 
      <h3 className="serif" style={{ fontSize: 18, lineHeight: 1.3, marginBottom: '0.6rem' }}>{idea.title}</h3>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.25rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {idea.problem}
      </p>
 
      <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{date}</span>
        <span style={{ fontSize: 12, color: idea.blockchain_hash ? 'var(--success)' : 'var(--muted)', fontWeight: 500 }}>
          {idea.blockchain_hash ? '⬡ Timestamped' : '◌ Pending'}
        </span>
      </div>
    </div>
  )
}
 
function EmptyState({ navigate }) {
  return (
    <div style={{
      border: '1px dashed var(--border)', borderRadius: 16,
      padding: '5rem 2rem', textAlign: 'center'
    }}>
      <div style={{ fontSize: 36, marginBottom: '1rem' }}>💡</div>
      <h2 className="serif" style={{ fontSize: 24, marginBottom: '0.75rem' }}>Your vault is empty</h2>
      <p style={{ fontSize: 15, color: 'var(--muted)', marginBottom: '2rem', maxWidth: 360, margin: '0 auto 2rem' }}>
        Submit your first idea and it will be cryptographically protected the moment you save it.
      </p>
      <button onClick={() => navigate('/submit')} style={{
        background: 'var(--ink)', color: '#fff', border: 'none',
        borderRadius: 8, padding: '12px 28px', fontSize: 14, fontWeight: 500
      }}>Submit your first idea</button>
    </div>
  )
}
 