import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'

export default function InventorProfile() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [ideas, setIdeas] = useState([])
  const [showMessageNote, setShowMessageNote] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: prof } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_public', true)
        .maybeSingle()

      if (!prof) {
        setLoading(false)
        return
      }

      setProfile(prof)

      const { data: publishedIdeas } = await supabase
        .from('ideas')
        .select('id, title, tagline')
        .eq('user_id', userId)
        .eq('is_published', true)

      if (publishedIdeas?.length) {
        const { data: links } = await supabase
          .rpc('get_share_tokens_for_published_ideas', { p_idea_ids: publishedIdeas.map(i => i.id) })

        const tokenMap = {}
        links?.forEach(l => { tokenMap[l.idea_id] = l.token })

        setIdeas(publishedIdeas.map(i => ({ ...i, shareToken: tokenMap[i.id] || null })))
      }

      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e0e1f' }}>
      <div className="spinner" />
    </div>
  )

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: '#0e0e1f', color: '#fff', fontFamily: 'Outfit, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <div style={{ position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <Logo size={20} variant="dark" />
      </div>
      <svg viewBox="232 50 112 148" width="64" height="64" style={{ marginBottom: '1.5rem', opacity: 0.6 }}>
        <defs>
          <radialGradient id="ip-g" cx="50%" cy="42%" r="52%">
            <stop offset="0" stopColor="#8C8FF7" stopOpacity="0.18"/>
            <stop offset="1" stopColor="#9B7FF7" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="ip-g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0" stopColor="#7B9FF7"/>
            <stop offset="1" stopColor="#9B7FF7"/>
          </linearGradient>
          <linearGradient id="ip-g2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0" stopColor="#7B9FF7" stopOpacity="0"/>
            <stop offset="0.18" stopColor="#7B9FF7" stopOpacity="0.85"/>
            <stop offset="0.82" stopColor="#9B7FF7" stopOpacity="0.85"/>
            <stop offset="1" stopColor="#9B7FF7" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <ellipse cx="288" cy="113" rx="61" ry="58" fill="url(#ip-g)"/>
        <path fill="none" stroke="url(#ip-g1)" strokeWidth="7" strokeLinejoin="round" d="M288,57c-30.5,0-55.9,25.4-55.9,54.2c0,20.3,11,37.3,28,48.3l5.1,12.7h45.7l5.1-12.7c16.9-11,28-28,28-48.3C343.9,82.4,318.5,57,288,57z"/>
        <rect x="261" y="179" width="54" height="12" rx="6" fill="url(#ip-g2)"/>
        <path fill="none" stroke="url(#ip-g1)" strokeWidth="8" strokeLinecap="round" d="M298.3,84.6c-14.3-6.1-27.6,3.8-27.6,12.3s5.4,14.3,22.4,14.3"/>
        <path fill="none" stroke="url(#ip-g1)" strokeWidth="8" strokeLinecap="round" d="M294.7,111.2c-16.9,0-25.2,3.4-25.1,15.9c0.1,9.4,12.2,15.1,28.7,11.1"/>
      </svg>
      <p style={{ fontSize: 20, fontWeight: 600, margin: '0 0 0.75rem', color: '#fff' }}>This profile isn't public</p>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', margin: '0 0 2.5rem', maxWidth: 320, lineHeight: 1.6 }}>This inventor hasn't made their profile visible yet.</p>
      <button
        onClick={() => navigate('/')}
        style={{ background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', border: 'none', borderRadius: 12, padding: '13px 28px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
      >Go home</button>
    </div>
  )

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e1f', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      {/* Gradient accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' }} />

      {/* Nav */}
      <div style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <Logo size={20} variant="dark" />
          </span>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer' }}>← Back</button>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 2rem 6rem' }}>

        {/* Avatar + name + headline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: profile.avatar_url ? 'none' : 'linear-gradient(135deg, #7b9ff7, #9b7ff7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 700, color: '#fff',
            overflow: 'hidden', border: '2px solid rgba(123,159,247,0.35)',
            marginBottom: '1rem', flexShrink: 0,
          }}>
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 0.4rem', letterSpacing: '-0.3px' }}>
            {profile.full_name || 'Inventor'}
          </h1>
          {profile.headline && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{profile.headline}</p>
          )}
        </div>

        {/* Bio card */}
        {profile.bio && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.35)', marginBottom: '0.85rem' }}>About</p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.8, margin: 0 }}>{profile.bio}</p>
          </div>
        )}

        {/* Skills card */}
        {profile.skills?.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.35)', marginBottom: '0.85rem' }}>Skills</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {profile.skills.map(skill => (
                <span key={skill} style={{ background: 'rgba(123,159,247,0.15)', color: '#7b9ff7', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 500 }}>{skill}</span>
              ))}
            </div>
          </div>
        )}

        {/* Published ideas card */}
        {ideas.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'rgba(255,255,255,0.35)', marginBottom: '0.85rem' }}>Published Ideas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ideas.map(idea => (
                <div key={idea.id} style={{ padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                  {idea.shareToken ? (
                    <a href={`/share/${idea.shareToken}`} style={{ fontSize: 14, fontWeight: 600, color: '#7b9ff7', textDecoration: 'none', display: 'block', marginBottom: idea.tagline ? 4 : 0 }}>
                      {idea.title} →
                    </a>
                  ) : (
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: `0 0 ${idea.tagline ? 4 : 0}px` }}>{idea.title}</p>
                  )}
                  {idea.tagline && (
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>{idea.tagline}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message button */}
        {profile.contactable && (
          <div style={{ marginTop: '0.5rem' }}>
            <button
              onClick={() => setShowMessageNote(v => !v)}
              style={{ background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
            >
              Message {profile.full_name?.split(' ')[0] || 'this inventor'}
            </button>
            {showMessageNote && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: '0.75rem' }}>Messaging is coming soon.</p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
