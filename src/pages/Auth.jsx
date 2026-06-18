import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Logo from '../components/Logo'

export default function Auth() {
  const [searchParams] = useSearchParams()
  const [isSignup, setIsSignup] = useState(searchParams.get('signup') === 'true')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    if (isSignup) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      })
      if (error) setError(error.message)
      else setMessage('Account created! You can now log in.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--surface)' }}>

      <div onClick={() => navigate('/')} style={{ marginBottom: '2rem', cursor: 'pointer' }}>
        <Logo size={24} variant="light" />
      </div>

      {isSignup ? (
        <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
          <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginBottom: '0.75rem' }}>Coming Soon</h2>
          <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
            eurekAIdea is currently in private beta. We'll let you know when we're ready for you.
          </p>
          <button
            onClick={() => { setIsSignup(false); setError(''); setMessage('') }}
            style={{ background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 28px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            Sign in instead
          </button>
          <div style={{ marginTop: '2rem', borderTop: '0.5px solid var(--border)', paddingTop: '2rem' }}>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '1rem' }}>Join the waitlist — we'll email you when we launch.</p>
            <WaitlistForm />
          </div>
        </div>
      ) : (
        <div className="animate-fadeUp" style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 16, padding: '2.5rem', width: '100%', maxWidth: 400 }}>
          <h1 className="serif" style={{ fontSize: 28, marginBottom: '0.5rem' }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '2rem' }}>
            Sign in to access your ideas.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" required
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters" required
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{ background: '#FCEBEB', border: '0.5px solid #E5A5A5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#A32D2D', marginBottom: '1rem' }}>
                {error}
              </div>
            )}
            {message && (
              <div style={{ background: '#EAF3DE', border: '0.5px solid #97C459', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#3B6D11', marginBottom: '1rem' }}>
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: '100%', background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 500, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Sign in'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function WaitlistForm() {
  const [wEmail, setWEmail] = useState('')
  const [wStatus, setWStatus] = useState(null)
  const [wLoading, setWLoading] = useState(false)

  async function handleWaitlist() {
    if (!wEmail) return
    setWLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waitlist-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: wEmail }),
      })
      if (res.ok) setWStatus('success')
      else setWStatus('error')
    } catch {
      setWStatus('error')
    }
    setWLoading(false)
  }

  if (wStatus === 'success') return (
    <p style={{ fontSize: 14, color: '#4ade80', fontWeight: 500 }}>You're on the list! We'll be in touch. 🎉</p>
  )

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      <input
        type="email"
        value={wEmail}
        onChange={e => setWEmail(e.target.value)}
        placeholder="your@email.com"
        style={{ flex: '1 1 200px', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: 'var(--ink)', background: 'var(--surface)', outline: 'none' }}
      />
      <button
        onClick={handleWaitlist}
        disabled={wLoading}
        style={{ background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: wLoading ? 'not-allowed' : 'pointer', opacity: wLoading ? 0.7 : 1, whiteSpace: 'nowrap' }}
      >
        {wLoading ? 'Joining…' : 'Join Waitlist'}
      </button>
      {wStatus === 'error' && <p style={{ width: '100%', fontSize: 13, color: '#A32D2D', margin: 0 }}>Something went wrong. Try again.</p>}
    </div>
  )
}

const inputStyle = {
  width: '100%', border: '0.5px solid var(--border)',
  borderRadius: 8, padding: '10px 14px',
  fontSize: 14, color: 'var(--ink)',
  background: 'var(--surface)', outline: 'none',
}
