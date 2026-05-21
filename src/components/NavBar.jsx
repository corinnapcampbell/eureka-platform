import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from './Logo'
import { supabase } from '../supabase'

export default function NavBar({ session, leftContent = null, rightExtra = null }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)

  const user = session?.user
  const meta = user?.user_metadata || {}
  const initials = meta.full_name
    ? meta.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0]?.toUpperCase() || '?')
  const avatarUrl = meta.avatar_url || ''

  async function signOut() { await supabase.auth.signOut() }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      {/* Left: logo + optional back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <Logo size={20} variant="dark" />
        </span>
        {leftContent}
      </div>

      {/* Right: page actions + three-dots + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {rightExtra}

        {/* Three dots */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => { setMenuOpen(o => !o); setAvatarMenuOpen(false) }}
            style={{
              width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 4, background: menuOpen ? 'rgba(255,255,255,0.08)' : 'none',
              border: '0.5px solid rgba(255,255,255,0.18)', transition: 'background 0.15s', flexShrink: 0
            }}
          >
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }} />
            ))}
          </div>
          {menuOpen && (
            <>
              <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
              <div style={{
                position: 'absolute', top: 40, right: 0, zIndex: 100,
                background: '#1a1a2e', border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '8px', minWidth: 210,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                <div style={{ padding: '8px 12px 10px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Signed in as</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#fff', wordBreak: 'break-all' }}>{user?.email}</p>
                </div>
                <button onClick={() => { navigate('/dashboard'); setMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer' }}>🗂 My Ideas</button>
                <button onClick={() => { navigate('/profile'); setMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer' }}>👤 Profile</button>
                <button onClick={() => { navigate('/settings'); setMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer' }}>⚙️ Settings</button>
                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', marginTop: 4, paddingTop: 4 }}>
                  <button onClick={() => { signOut(); setMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#f87171', cursor: 'pointer' }}>Sign out</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Avatar circle */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => { setAvatarMenuOpen(o => !o); setMenuOpen(false) }}
            style={{
              width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
              background: avatarUrl ? 'none' : 'linear-gradient(135deg, #7b9ff7, #9b7ff7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: '#fff',
              overflow: 'hidden', border: '2px solid rgba(123,159,247,0.35)', flexShrink: 0,
            }}
          >
            {avatarUrl
              ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          {avatarMenuOpen && (
            <>
              <div onClick={() => setAvatarMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
              <div style={{
                position: 'absolute', top: 42, right: 0, zIndex: 100,
                background: '#1a1a2e', border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '8px', minWidth: 190,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                <button onClick={() => { navigate('/profile#avatar'); setAvatarMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer' }}>🖼️ Edit picture</button>
                <button onClick={() => { navigate('/profile'); setAvatarMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer' }}>👤 Profile settings</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
