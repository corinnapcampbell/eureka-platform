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
 
      {/* Pricing */}
      <div style={{ background: '#0e0e1f', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ display: 'inline-block', background: 'rgba(123,159,247,0.1)', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 20, padding: '5px 16px', fontSize: 12, color: '#7b9ff7', fontWeight: 500, marginBottom: '1rem', letterSpacing: '0.3px' }}>PRICING</div>
            <h2 style={{ fontSize: 32, fontWeight: 700, color: '#fff', margin: '0 0 0.75rem', letterSpacing: '-0.3px' }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Start free. Upgrade when you're ready.</p>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {/* Free card */}
            <div style={{ flex: '1 1 320px', maxWidth: 380, background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '2rem' }}>
              <p style={{ margin: '0 0 0.4rem', fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Free</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: '0.75rem' }}>
                <span style={{ fontSize: 38, fontWeight: 700, color: '#fff' }}>$0</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>/forever</span>
              </div>
              <p style={{ margin: '0 0 1.5rem', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Everything you need to protect and pitch your ideas.</p>
              <button onClick={() => window.location.href='/auth?signup=true'} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: '1.5rem' }}>Get started free</button>
              {['Unlimited idea submissions', 'Blockchain timestamp', 'NDA-gated sharing', 'Basic pitch PDF & deck', 'AI Investor Scorecard', 'Blueprint — 2D basic', 'AI Challenge (limited)'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <span style={{ color: '#4ade80', fontSize: 13, flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{f}</span>
                </div>
              ))}
            </div>
            {/* Pro card */}
            <div style={{ flex: '1 1 320px', maxWidth: 380, background: 'rgba(123,159,247,0.05)', border: '1.5px solid rgba(123,159,247,0.35)', borderRadius: 20, padding: '2rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 20, right: 20, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#fff' }}>POPULAR</div>
              <p style={{ margin: '0 0 0.4rem', fontSize: 13, color: '#7b9ff7', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Pro</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: '0.75rem' }}>
                <span style={{ fontSize: 38, fontWeight: 700, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Coming soon</span>
              </div>
              <p style={{ margin: '0 0 1.5rem', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>The full toolkit for serious inventors and creators.</p>
              <button disabled style={{ width: '100%', background: 'rgba(123,159,247,0.1)', border: '0.5px solid rgba(123,159,247,0.2)', borderRadius: 12, padding: '12px', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.3)', cursor: 'not-allowed', marginBottom: '1.5rem' }}>Coming soon</button>
              {['Everything in Free', 'Blueprint — 3D interactive', 'AI Scorecard improvement reports', 'AI Challenge unlimited', 'Pre-publish editor', 'Custom branding', 'Idea visibility controls'].map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <span style={{ color: '#7b9ff7', fontSize: 13, flexShrink: 0 }}>✓</span>
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
 