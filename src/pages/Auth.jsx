import { useState, useEffect } from 'react'
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
        <Logo size={24} dark />
      </div>
 
      <div className="animate-fadeUp" style={{
        background: 'var(--white)', border: '0.5px solid var(--border)',
        borderRadius: 16, padding: '2.5rem', width: '100%', maxWidth: 420
      }}>
        <h1 className="serif" style={{ fontSize: 26, marginBottom: '0.4rem' }}>
          {isSignup ? 'Create your vault' : 'Welcome back'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: '2rem' }}>
          {isSignup ? 'Your ideas deserve a safe home.' : 'Sign in to access your ideas.'}
        </p>
 
        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Full name</label>
              <input
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name" required
                style={inputStyle}
              />
            </div>
          )}
 
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
              placeholder="Min. 6 characters" required minLength={6}
              style={inputStyle}
            />
          </div>
 
          {error && (
            <div style={{ background: '#FCEBEB', border: '0.5px solid #F09595', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#A32D2D', marginBottom: '1rem' }}>
              {error}
            </div>
          )}
          {message && (
            <div style={{ background: '#EAF3DE', border: '0.5px solid #97C459', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#3B6D11', marginBottom: '1rem' }}>
              {message}
            </div>
          )}
 
          <button type="submit" disabled={loading} style={{
            width: '100%', background: 'var(--ink)', color: '#fff',
            border: 'none', borderRadius: 8, padding: '12px',
            fontSize: 15, fontWeight: 500,
            opacity: loading ? 0.7 : 1
          }}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>
 
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: 14, color: 'var(--muted)' }}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={() => { setIsSignup(!isSignup); setError(''); setMessage('') }}
            style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 500 }}>
            {isSignup ? 'Sign in' : 'Sign up free'}
          </span>
        </p>
      </div>
    </div>
  )
}
 
const inputStyle = {
  width: '100%', border: '0.5px solid var(--border)',
  borderRadius: 8, padding: '10px 14px',
  fontSize: 14, color: 'var(--ink)',
  background: 'var(--surface)', outline: 'none',
}
 