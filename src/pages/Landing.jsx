import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
 
function WaitlistForm() {
  const [wEmail, setWEmail] = useState('')
  const [wStatus, setWStatus] = useState(null)
  const [wLoading, setWLoading] = useState(false)

  async function handleWaitlist() {
    if (!wEmail) return
    setWLoading(true)
    try {
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
    <p style={{ fontSize: 14, color: '#4ade80', fontWeight: 500, marginTop: '1.5rem' }}>You're on the list! We'll be in touch. 🎉</p>
  )

  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 480 }}>
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

export default function Landing() {
  const navigate = useNavigate()
 
  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
 
      {/* Nav */}
      <nav style={{
        maxWidth: 900, margin: '0 auto', padding: '1.5rem 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '0.5px solid var(--border)'
      }}>
        <Logo size={22} variant="light" />
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={() => navigate('/auth')} style={{
            background: 'none', border: '0.5px solid var(--border)',
            borderRadius: 8, padding: '8px 18px', fontSize: 14, color: 'var(--muted)'
          }}>Log in</button>
          <button onClick={() => navigate('/auth?signup=true')} style={{
            background: 'var(--ink)', border: 'none',
            borderRadius: 8, padding: '9px 20px', fontSize: 14,
            fontWeight: 500, color: '#fff'
          }}>Get started free</button>
        </div>
      </nav>
 
      {/* Hero */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '5rem 2rem 4rem' }}>
        <div className="animate-fadeUp" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--gold-light)', borderRadius: 20, padding: '5px 14px', marginBottom: '1.5rem' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold-mid)' }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--gold)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>Your idea vault</span>
        </div>
 
        <h1 className="serif animate-fadeUp" style={{ fontSize: 'clamp(32px, 7vw, 56px)', lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: '1.25rem', animationDelay: '0.1s' }}>
          To make your idea real,<br />you have to share it.<br /><em style={{ color: 'var(--gold)' }}>eurekAIdea makes sure sharing it doesn't mean losing it.</em>
        </h1>

        <p className="animate-fadeUp" style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 480, marginBottom: '2.5rem', animationDelay: '0.2s' }}>
          Every idea you submit is timestamped the moment it's saved — creating documented proof it was yours first, and giving you a safe, professional way to share it with exactly who you choose.
        </p>
 
        <div className="animate-fadeUp" style={{ display: 'flex', gap: 12, animationDelay: '0.3s' }}>
          <button onClick={() => navigate('/auth?signup=true')} style={{
            background: 'var(--ink)', border: 'none', borderRadius: 8,
            padding: '14px 32px', fontSize: 15, fontWeight: 500, color: '#fff'
          }}>Submit your first idea →</button>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: '2rem' }}>Not ready yet? Join the waitlist — we'll email you when we launch.</p>
        <WaitlistForm />
      </div>

      {/* Protection section */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem 6rem' }}>
        <div style={{
          background: 'var(--white)', border: '0.5px solid var(--border)',
          borderRadius: 16, padding: '3rem',
        }}>
          <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1rem' }}>Your idea is safe here</p>
          <h2 className="serif" style={{ fontSize: 32, marginBottom: '1.5rem', maxWidth: 500 }}>Built-in proof, on your terms</h2>
 
          <div className="feature-cards">
            {[
              { icon: '⬡', title: 'Blockchain timestamp', desc: 'A cryptographic fingerprint of your idea is anchored to the blockchain the moment you submit — permanent, immutable, and independently verifiable.' },
              { icon: '◎', title: 'Optional NDA-gated sharing', desc: 'Turn on NDA-gated sharing for any idea — anyone you share it with must confirm NDA terms before seeing details. Every viewer is logged with their identity, timestamp, and IP address.' },
              { icon: '△', title: 'Trade secret info', desc: 'Plain-language guidance on how trade secret law can apply to what you share — protection depends on you keeping details confidential.' },
            ].map(({ icon, title, desc }) => (
              <div key={title}>
                <div style={{ fontSize: 22, marginBottom: '0.75rem', color: 'var(--gold)' }}>{icon}</div>
                <div style={{ fontWeight: 500, fontSize: 15, marginBottom: '0.5rem' }}>{title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--muted)' }}>{desc}</div>
              </div>
            ))}
          </div>
 
          <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '1.5rem', fontSize: 13, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 640 }}>
            <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>What eurekAIdea's proof consists of:</strong> a timestamped record of originality, and — for any idea where you turn on NDA-gated sharing — a traceable access trail and signed NDA from every viewer. Together they form a paper trail with real documentary weight. If someone ever tries to use your idea without permission, you won't be starting from zero. We've built the paper trail. You'd just need a lawyer to use it.
          </div>
        </div>
      </div>
 
      {/* Pricing */}
      <div style={{ background: '#0e0e1f', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ display: 'inline-block', background: 'rgba(123,159,247,0.1)', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 20, padding: '5px 16px', fontSize: 12, color: '#7b9ff7', fontWeight: 500, marginBottom: '1rem', letterSpacing: '0.3px' }}>PRICING</div>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: '#fff', margin: '0 0 0.75rem', letterSpacing: '-0.3px' }}>Simple pricing. Real proof.</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Start free. Document what matters. Go Pro when you're ready.</p>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>

            {/* Free card */}
            <div style={{ flex: '1 1 260px', maxWidth: 320, background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '2rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Free</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: '0.75rem' }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>$0</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>/forever</span>
              </div>
              <p style={{ margin: '0 0 1.25rem', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Everything you need to protect and pitch your ideas.</p>
              <button onClick={() => window.location.href = '/auth?signup=true'} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '11px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: '1.25rem' }}>Get started free</button>
              {['Unlimited idea submissions', 'Blockchain timestamp', 'AI Scorecard on publish', '3 free re-publishes', 'Basic pitch PDF'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <span style={{ color: '#4ade80', fontSize: 13 }}>✓</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{f}</span>
                </div>
              ))}
              {['NDA-gated sharing', 'AI Challenge', 'Score Insights'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>✕</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Protection Pack card */}
            <div style={{ flex: '1 1 260px', maxWidth: 320, background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '2rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Protection Pack</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: '0.75rem' }}>
                <span style={{ fontSize: 36, fontWeight: 700, color: '#fff' }}>$4.99</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>/per idea</span>
              </div>
              <p style={{ margin: '0 0 1.25rem', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>One-time payment per idea.</p>
              <button onClick={() => window.location.href = '/pricing'} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '11px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: '1.25rem' }}>Protect an idea</button>
              {['Everything in Free', 'NDA share link (permanent)', 'Timestamp certificate PDF', 'Verified marketplace badge', 'Score Insights — $2.99 add-on'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <span style={{ color: '#4ade80', fontSize: 13 }}>✓</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Pro card */}
            <div style={{ flex: '1 1 260px', maxWidth: 320, background: 'rgba(123,159,247,0.05)', border: '1.5px solid rgba(123,159,247,0.35)', borderRadius: 20, padding: '2rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 20, right: 20, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#fff' }}>POPULAR</div>
              <p style={{ margin: '0 0 0.4rem', fontSize: 11, color: '#7b9ff7', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Pro</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: '0.75rem' }}>
                <span style={{ fontSize: 36, fontWeight: 700, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>$12</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>/month</span>
              </div>
              <p style={{ margin: '0 0 1.25rem', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>The full toolkit for serious inventors and creators.</p>
              <button onClick={() => window.location.href = '/pricing'} style={{ width: '100%', background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', border: 'none', borderRadius: 12, padding: '11px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: '1.25rem' }}>Upgrade to Pro</button>
              {['Everything in Free + Protection', 'Unlimited re-publishes', 'Score Insights included', 'AI Challenge', 'Advanced pitch deck + PDF', 'Priority marketplace ranking', 'Blueprint tool'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <span style={{ color: '#7b9ff7', fontSize: 13 }}>✓</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{f}</span>
                </div>
              ))}
            </div>

          </div>
          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
            Full pricing details at <span onClick={() => window.location.href='/pricing'} style={{ color: '#7b9ff7', cursor: 'pointer', textDecoration: 'underline' }}>/pricing</span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '0.5px solid var(--border)', padding: '2rem', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
        <div style={{ marginBottom: '0.5rem' }}>
          © {new Date().getFullYear()} <Logo size={13} variant="light" /> All rights reserved.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
          <a href="/privacy-policy" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="/terms" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Terms of Use</a>
        </div>
      </div>
    </div>
  )
}
 