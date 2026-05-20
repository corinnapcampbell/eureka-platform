import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'

export default function Profile({ session }) {
  const navigate = useNavigate()
  const user = session.user
  const [fullName, setFullName] = useState(user.user_metadata?.full_name || '')
  const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || '')
  const [avatarPreview, setAvatarPreview] = useState(user.user_metadata?.avatar_url || '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const fileRef = useRef()

  const initials = fullName
    ? fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric'
  })

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
    setUploading(true)
    setError('')
    const path = `${user.id}/avatar.jpg`
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadErr) {
      setError('Avatar upload failed: ' + uploadErr.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl + '?t=' + Date.now()
    setAvatarUrl(url)
    const { error: metaErr } = await supabase.auth.updateUser({ data: { avatar_url: url } })
    if (metaErr) setError('Failed to save avatar: ' + metaErr.message)
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSaveSuccess(false)
    const { error: err } = await supabase.auth.updateUser({
      data: { full_name: fullName, avatar_url: avatarUrl }
    })
    if (err) setError(err.message)
    else setSaveSuccess(true)
    setSaving(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e1f', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      <nav style={{
        maxWidth: 960, margin: '0 auto', padding: '1.25rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)', position: 'relative'
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
                  background: '#1a1a2e', border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: '8px', minWidth: 210,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                  <div style={{ padding: '8px 12px 10px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Signed in as</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#fff', wordBreak: 'break-all' }}>{user.email}</p>
                  </div>
                  <button onClick={() => { navigate('/profile'); setMenuOpen(false) }} style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
                    padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer',
                  }}>👤 Profile</button>
                  <button style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', borderRadius: 8,
                    padding: '9px 12px', fontSize: 14, color: 'var(--muted)', cursor: 'not-allowed',
                  }}>⚙️ Settings <span style={{ fontSize: 11 }}>(coming soon)</span></button>
                  <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', marginTop: 4, paddingTop: 4 }}>
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
                background: avatarPreview ? 'none' : 'linear-gradient(135deg, #7b9ff7, #9b7ff7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, color: '#fff',
                overflow: 'hidden', border: '2px solid rgba(123,159,247,0.35)', flexShrink: 0,
              }}
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>
            {avatarMenuOpen && (
              <>
                <div onClick={() => setAvatarMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{
                  position: 'absolute', top: 44, right: 0, zIndex: 100,
                  background: '#1a1a2e', border: '0.5px solid rgba(255,255,255,0.08)',
                  borderRadius: 12, padding: '8px', minWidth: 190,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}>
                  <button onClick={() => { fileRef.current.click(); setAvatarMenuOpen(false) }} style={{
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

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '3rem 2rem' }}>
        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div
            onClick={() => fileRef.current.click()}
            style={{
              width: 88, height: 88, borderRadius: '50%',
              background: avatarPreview ? 'none' : 'linear-gradient(135deg, #7b9ff7, #9b7ff7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 600, color: '#fff',
              marginBottom: '0.75rem', cursor: 'pointer', position: 'relative',
              overflow: 'hidden', border: '2px solid rgba(123,159,247,0.4)',
              transition: 'opacity 0.15s'
            }}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.15s',
              fontSize: 11, fontWeight: 500, letterSpacing: '0.3px'
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}
            >
              {uploading ? 'Uploading…' : 'Change'}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{fullName || 'Your Profile'}</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>Member since {memberSince}</p>
        </div>

        {/* Form card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '0.5px solid var(--border)',
          borderRadius: 16, padding: '2rem'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
            <input
              value={fullName}
              onChange={e => { setFullName(e.target.value); setSaveSuccess(false) }}
              placeholder="Your full name"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid var(--border)', borderRadius: 10,
                padding: '12px 14px', fontSize: 15, color: '#fff',
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
            <input
              value={user.email}
              disabled
              style={{
                width: '100%', background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid var(--border)', borderRadius: 10,
                padding: '12px 14px', fontSize: 15, color: 'var(--muted)',
                outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed'
              }}
            />
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '6px 0 0' }}>Email cannot be changed</p>
          </div>

          {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: '1rem' }}>{error}</p>}
          {saveSuccess && <p style={{ color: '#4ade80', fontSize: 13, marginBottom: '1rem' }}>✓ Profile updated</p>}

          <button
            onClick={handleSave}
            disabled={saving || uploading}
            style={{
              width: '100%', background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)',
              border: 'none', borderRadius: 10, padding: '13px',
              fontSize: 15, fontWeight: 600, color: '#fff',
              cursor: saving || uploading ? 'not-allowed' : 'pointer',
              opacity: saving || uploading ? 0.7 : 1
            }}
          >{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  )
}
