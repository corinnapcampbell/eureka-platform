import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import NavBar from '../components/NavBar'

const FREE_FEATURES = [
  { text: 'Unlimited idea submissions', included: true },
  { text: 'Blockchain timestamp on every idea', included: true },
  { text: 'Draft mode — edit freely before publishing', included: true },
  { text: 'Marketplace listing', included: true },
  { text: 'AI Scorecard on publish (score visible)', included: true },
  { text: '3 free re-publishes per idea', included: true },
  { text: 'Basic pitch PDF', included: true },
  { text: 'NDA-gated sharing', included: false },
  { text: 'Timestamp certificate PDF', included: false },
  { text: 'Score Insights (why + how to improve)', included: false },
  { text: 'AI Challenge', included: false },
  { text: 'Priority marketplace ranking', included: false },
]

const PROTECTION_FEATURES = [
  { text: 'Everything in Free', included: true },
  { text: 'NDA share link (permanent)', included: true },
  { text: 'Downloadable timestamp certificate', included: true },
  { text: 'Verified badge on marketplace', included: true },
  { text: 'Score Insights — $2.99 add-on per idea', included: true },
  { text: 'Extra re-publishes — $0.99 each', included: true },
]

const PRO_FEATURES = [
  { text: 'Everything in Free + Protection', included: true },
  { text: 'Unlimited re-publishes + re-scores', included: true },
  { text: 'Score Insights included for all ideas', included: true },
  { text: 'AI Challenge (50 uses/month)', included: true },
  { text: 'Advanced pitch deck + PDF', included: true },
  { text: 'Investor view notifications', included: true },
  { text: 'Priority marketplace ranking', included: true },
  { text: 'Blueprint tool', included: true },
  { text: 'Visibility controls', included: true },
]

export default function Pricing({ session }) {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e1f', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>

      {/* Nav */}
      <div style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.25rem 2rem' }}>
          {session ? (
            <NavBar session={session} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                <Logo size={20} variant="dark" />
              </span>
              <button onClick={() => navigate('/auth')} style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '7px 16px', fontSize: 13, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>Sign in</button>
            </div>
          )}
        </div>
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '4rem 2rem 3rem' }}>
        <div style={{ display: 'inline-block', background: 'rgba(123,159,247,0.1)', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 20, padding: '5px 16px', fontSize: 12, color: '#7b9ff7', fontWeight: 500, marginBottom: '1.25rem', letterSpacing: '0.3px' }}>
          PRICING
        </div>
        <h1 style={{ fontSize: 38, fontWeight: 700, margin: '0 0 1rem', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          Simple pricing.<br />
          <span style={{ background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Serious protection.</span>
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          Start free. Protect what matters. Go Pro when you're ready.
        </p>
      </div>

      {/* Pricing cards */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 2rem 6rem', display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* Free card */}
        <div style={{ flex: '1 1 340px', maxWidth: 400, background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Free</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 700 }}>$0</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>/forever</span>
            </div>
            <p style={{ margin: '0.75rem 0 0', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>Everything you need to protect and pitch your ideas.</p>
          </div>

          <button
            onClick={() => navigate(session ? '/dashboard' : '/auth')}
            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: '2rem', transition: 'background 0.15s' }}
          >
            {session ? 'Go to Dashboard' : 'Get started free'}
          </button>

          <div style={{ flex: 1 }}>
            {FREE_FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1, color: f.included ? '#4ade80' : 'rgba(255,255,255,0.15)' }}>
                  {f.included ? '✓' : '✕'}
                </span>
                <span style={{ fontSize: 14, color: f.included ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)', lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Protection Pack card */}
        <div style={{ flex: '1 1 340px', maxWidth: 400, background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: 13, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Protection Pack</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 700 }}>$4.99</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>per idea</span>
            </div>
            <p style={{ margin: '0.75rem 0 0', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>One-time payment per idea.</p>
          </div>

          <button
            onClick={() => {}}
            style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: '2rem', transition: 'background 0.15s' }}
          >
            Protect an idea
          </button>

          <div style={{ flex: 1 }}>
            {PROTECTION_FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1, color: '#4ade80' }}>✓</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pro card */}
        <div style={{ flex: '1 1 340px', maxWidth: 400, background: 'rgba(123,159,247,0.05)', border: '1.5px solid rgba(123,159,247,0.35)', borderRadius: 20, padding: '2rem', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {/* Popular badge */}
          <div style={{ position: 'absolute', top: 20, right: 20, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '0.3px' }}>POPULAR</div>

          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: 13, color: '#7b9ff7', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Pro</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 42, fontWeight: 700, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>$12</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>/month</span>
            </div>
            <p style={{ margin: '0.75rem 0 0', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>The full toolkit for serious inventors and creators.</p>
          </div>

          <button
            onClick={() => {}}
            style={{ width: '100%', background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', border: 'none', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer', marginBottom: '2rem' }}
          >
            Upgrade to Pro
          </button>

          <div style={{ flex: 1 }}>
            {PRO_FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1, color: '#7b9ff7' }}>✓</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
