import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
 
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
        <Logo size={22} dark />
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
 
        <h1 className="serif animate-fadeUp" style={{ fontSize: 56, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: '1.25rem', animationDelay: '0.1s' }}>
          Store, protect, share<br />and present your ideas<br /><em style={{ color: 'var(--gold)' }}>to the world</em>
        </h1>
 
        <p className="animate-fadeUp" style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 480, marginBottom: '2.5rem', animationDelay: '0.2s' }}>
          Eureka is a safe vault for your ideas. Every idea you submit is cryptographically timestamped and protected the moment it's saved — giving you a beautiful, professional way to share them on your terms.
        </p>
 
        <div className="animate-fadeUp" style={{ display: 'flex', gap: 12, animationDelay: '0.3s' }}>
          <button onClick={() => navigate('/auth?signup=true')} style={{
            background: 'var(--ink)', border: 'none', borderRadius: 8,
            padding: '14px 32px', fontSize: 15, fontWeight: 500, color: '#fff'
          }}>Submit your first idea →</button>
        </div>
      </div>
 
      {/* Protection section */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem 6rem' }}>
        <div style={{
          background: 'var(--white)', border: '0.5px solid var(--border)',
          borderRadius: 16, padding: '3rem',
        }}>
          <p style={{ fontSize: 12, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '1rem' }}>Your idea is safe here</p>
          <h2 className="serif" style={{ fontSize: 32, marginBottom: '1.5rem', maxWidth: 500 }}>Three layers of protection, automatic.</h2>
 
          <div className="feature-cards">
            {[
              { icon: '⬡', title: 'Blockchain timestamp', desc: 'A cryptographic fingerprint of your idea is anchored to the blockchain the moment you submit — permanent, immutable, and independently verifiable.' },
              { icon: '◎', title: 'NDA-gated sharing', desc: 'Anyone you share with must confirm NDA terms before seeing a single word. Every viewer is logged with their identity, timestamp, and IP address.' },
              { icon: '△', title: 'Trade secret layer', desc: 'By keeping your idea behind access controls, it qualifies as a protected trade secret under the Defend Trade Secrets Act.' },
            ].map(({ icon, title, desc }) => (
              <div key={title}>
                <div style={{ fontSize: 22, marginBottom: '0.75rem', color: 'var(--gold)' }}>{icon}</div>
                <div style={{ fontWeight: 500, fontSize: 15, marginBottom: '0.5rem' }}>{title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--muted)' }}>{desc}</div>
              </div>
            ))}
          </div>
 
          <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '1.5rem', fontSize: 13, lineHeight: 1.7, color: 'var(--muted)', maxWidth: 640 }}>
            <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>What Eureka's protection is:</strong> a timestamped record of originality, a traceable access trail, and an NDA agreement from every viewer — together forming a paper trail with real legal weight. If someone ever tries to use your idea without permission, you won't be starting from zero. We've built the paper trail. You'd just need a lawyer to use it.
          </div>
        </div>
      </div>
 
      {/* Footer */}
      <div style={{ borderTop: '0.5px solid var(--border)', padding: '2rem', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
        © {new Date().getFullYear()} <Logo size={13} /> All rights reserved.
      </div>
    </div>
  )
}
 