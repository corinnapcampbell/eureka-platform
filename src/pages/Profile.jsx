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
        borderBottom: '0.5px solid var(--border)'
      }}>
        <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <Logo size={20} variant="light" />
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span
            onClick={() => navigate('/dashboard')}
            style={{ fontSize: 13, color: 'var(--muted)', cursor: 'pointer', textDecoration: 'underline' }}
          >My Ideas</span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{user.email}</span>
          <button onClick={signOut} style={{
            background: 'none', border: '0.5px solid var(--border)',
            borderRadius: 6, padding: '6px 14px', fontSize: 13, color: 'var(--muted)', cursor: 'pointer'
          }}>Sign out</button>
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
