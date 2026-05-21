import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'

export default function Settings({ session }) {
  const navigate = useNavigate()
  const user = session.user
  const meta = user.user_metadata || {}

  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)

  // Password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState('')

  // Notifications
  const [notifyViewed, setNotifyViewed] = useState(meta.notify_idea_viewed ?? true)
  const [notifyNDA, setNotifyNDA] = useState(meta.notify_nda_accepted ?? true)
  const [notifySaving, setNotifySaving] = useState(false)
  const [notifySuccess, setNotifySuccess] = useState(false)

  // Privacy
  const [defaultVisibility, setDefaultVisibility] = useState(meta.default_visibility || 'nda')
  const [privacySaving, setPrivacySaving] = useState(false)
  const [privacySuccess, setPrivacySuccess] = useState(false)

  // Danger zone
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const initials = (meta.full_name || user.email)[0].toUpperCase()
  const avatarUrl = meta.avatar_url || ''

  async function signOut() { await supabase.auth.signOut() }

  async function handlePasswordChange() {
    setPwError('')
    setPwSuccess(false)
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setPwError(error.message)
    else { setPwSuccess(true); setNewPassword(''); setConfirmPassword('') }
    setPwSaving(false)
  }

  async function handleNotificationsSave() {
    setNotifySaving(true)
    setNotifySuccess(false)
    await supabase.auth.updateUser({ data: { notify_idea_viewed: notifyViewed, notify_nda_accepted: notifyNDA } })
    setNotifySuccess(true)
    setNotifySaving(false)
  }

  async function handlePrivacySave() {
    setPrivacySaving(true)
    setPrivacySuccess(false)
    await supabase.auth.updateUser({ data: { default_visibility: defaultVisibility } })
    setPrivacySuccess(true)
    setPrivacySaving(false)
  }

  async function handleDeleteAccount() {
    if (deleteInput !== 'DELETE') { setDeleteError('Type DELETE to confirm.'); return }
    setDeleting(true)
    setDeleteError('')
    const { error } = await supabase.rpc('delete_user')
    if (error) { setDeleteError(error.message); setDeleting(false); return }
    await supabase.auth.signOut()
  }

  const card = { background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '2rem', marginBottom: '1.5rem' }
  const label = { fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }
  const input = { width: '100%', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 14px', fontSize: 15, color: '#fff', outline: 'none', boxSizing: 'border-box' }
  const btn = { background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer' }
  const toggle = (checked, onChange) => (
    <div onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, background: checked ? 'linear-gradient(90deg, #7b9ff7, #9b7ff7)' : 'rgba(255,255,255,0.12)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e1f', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
      <nav style={{ maxWidth: 960, margin: '0 auto', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.08)', position: 'relative' }}>
        <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}><Logo size={20} variant="dark" /></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span onClick={() => navigate('/dashboard')} style={{ fontSize: 13, color: 'var(--muted)', cursor: 'pointer' }}>My Ideas</span>
          <div style={{ position: 'relative' }}>
            <div onClick={() => { setMenuOpen(o => !o); setAvatarMenuOpen(false) }} style={{ width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: menuOpen ? 'rgba(255,255,255,0.08)' : 'none', border: '0.5px solid rgba(255,255,255,0.12)', transition: 'background 0.15s' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--muted)' }} />)}
            </div>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{ position: 'absolute', top: 40, right: 0, zIndex: 100, background: '#1a1a2e', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px', minWidth: 210, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                  <div style={{ padding: '8px 12px 10px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', marginBottom: 4 }}>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Signed in as</p>
                    <p style={{ margin: '2px 0 0', fontSize: 13, color: '#fff', wordBreak: 'break-all' }}>{user.email}</p>
                  </div>
                  <button onClick={() => { navigate('/profile'); setMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer' }}>👤 Profile</button>
                  <button onClick={() => { navigate('/settings'); setMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer' }}>⚙️ Settings</button>
                  <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', marginTop: 4, paddingTop: 4 }}>
                    <button onClick={() => { signOut(); setMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#f87171', cursor: 'pointer' }}>Sign out</button>
                  </div>
                </div>
              </>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <div onClick={() => { setAvatarMenuOpen(o => !o); setMenuOpen(false) }} style={{ width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', background: avatarUrl ? 'none' : 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', border: '2px solid rgba(123,159,247,0.35)', flexShrink: 0 }}>
              {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            {avatarMenuOpen && (
              <>
                <div onClick={() => setAvatarMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{ position: 'absolute', top: 44, right: 0, zIndex: 100, background: '#1a1a2e', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px', minWidth: 190, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                  <button onClick={() => { navigate('/profile'); setAvatarMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer' }}>🖼️ Edit picture</button>
                  <button onClick={() => { navigate('/profile'); setAvatarMenuOpen(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderRadius: 8, padding: '9px 12px', fontSize: 14, color: '#fff', cursor: 'pointer' }}>👤 Profile settings</button>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '3rem 2rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: '0.25rem' }}>Settings</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '2.5rem', marginTop: 0 }}>Manage your account preferences</p>

        {/* Account — Change Password */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 1.25rem' }}>🔐 Account</h2>
          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>New Password</label>
            <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPwSuccess(false); setPwError('') }} placeholder="Min. 6 characters" style={input} />
          </div>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={label}>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPwSuccess(false); setPwError('') }} placeholder="Repeat new password" style={input} />
          </div>
          {pwError && <p style={{ color: '#f87171', fontSize: 13, margin: '0 0 1rem' }}>{pwError}</p>}
          {pwSuccess && <p style={{ color: '#4ade80', fontSize: 13, margin: '0 0 1rem' }}>✓ Password updated</p>}
          <button onClick={handlePasswordChange} disabled={pwSaving} style={{ ...btn, opacity: pwSaving ? 0.7 : 1, cursor: pwSaving ? 'not-allowed' : 'pointer' }}>{pwSaving ? 'Saving…' : 'Update Password'}</button>
        </div>

        {/* Notifications */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 1.25rem' }}>🔔 Notifications</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: '#fff' }}>Idea viewed</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>Email me when someone views my idea</p>
            </div>
            {toggle(notifyViewed, () => { setNotifyViewed(v => !v); setNotifySuccess(false) })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, color: '#fff' }}>NDA accepted</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>Email me when someone signs the NDA</p>
            </div>
            {toggle(notifyNDA, () => { setNotifyNDA(v => !v); setNotifySuccess(false) })}
          </div>
          {notifySuccess && <p style={{ color: '#4ade80', fontSize: 13, margin: '0 0 1rem' }}>✓ Preferences saved</p>}
          <button onClick={handleNotificationsSave} disabled={notifySaving} style={{ ...btn, opacity: notifySaving ? 0.7 : 1, cursor: notifySaving ? 'not-allowed' : 'pointer' }}>{notifySaving ? 'Saving…' : 'Save Preferences'}</button>
        </div>

        {/* Privacy */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 1.25rem' }}>🔒 Privacy</h2>
          <label style={label}>Default idea visibility</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: '1.25rem' }}>
            {[{ value: 'public', label: 'Public' }, { value: 'nda', label: 'NDA only' }, { value: 'private', label: 'Private' }].map(opt => (
              <button key={opt.value} onClick={() => { setDefaultVisibility(opt.value); setPrivacySuccess(false) }} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '0.5px solid', borderColor: defaultVisibility === opt.value ? '#7b9ff7' : 'rgba(255,255,255,0.12)', background: defaultVisibility === opt.value ? 'rgba(123,159,247,0.15)' : 'none', color: defaultVisibility === opt.value ? '#7b9ff7' : 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>{opt.label}</button>
            ))}
          </div>
          {privacySuccess && <p style={{ color: '#4ade80', fontSize: 13, margin: '0 0 1rem' }}>✓ Preference saved</p>}
          <button onClick={handlePrivacySave} disabled={privacySaving} style={{ ...btn, opacity: privacySaving ? 0.7 : 1, cursor: privacySaving ? 'not-allowed' : 'pointer' }}>{privacySaving ? 'Saving…' : 'Save'}</button>
        </div>

        {/* Danger Zone */}
        <div style={{ ...card, border: '0.5px solid rgba(248,113,113,0.3)', marginBottom: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 0.5rem', color: '#f87171' }}>⚠️ Danger Zone</h2>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 1.25rem' }}>Deleting your account is permanent and cannot be undone. All your ideas and data will be removed.</p>
          <div style={{ marginBottom: '1rem' }}>
            <label style={label}>Type DELETE to confirm</label>
            <input value={deleteInput} onChange={e => { setDeleteInput(e.target.value); setDeleteError('') }} placeholder="DELETE" style={{ ...input, borderColor: 'rgba(248,113,113,0.3)' }} />
          </div>
          {deleteError && <p style={{ color: '#f87171', fontSize: 13, margin: '0 0 1rem' }}>{deleteError}</p>}
          <button onClick={handleDeleteAccount} disabled={deleting || deleteInput !== 'DELETE'} style={{ background: deleteInput === 'DELETE' ? '#f87171' : 'rgba(248,113,113,0.2)', border: 'none', borderRadius: 10, padding: '12px 20px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: deleteInput === 'DELETE' ? 'pointer' : 'not-allowed', opacity: deleting ? 0.7 : 1 }}>{deleting ? 'Deleting…' : 'Delete Account'}</button>
          {import.meta.env.DEV && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '0.5px solid rgba(248,113,113,0.15)' }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dev only</p>
              <button
                onClick={async () => {
                  await supabase.auth.updateUser({ data: { onboarding_complete: false } })
                  alert('Onboarding reset — reload the dashboard to see it again.')
                }}
                style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}
              >Reset onboarding</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
