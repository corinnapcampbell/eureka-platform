import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import NavBar from '../components/NavBar'

const FREE_FEATURES = [
  { label: 'Unlimited idea submissions', included: true },
  { label: 'Blockchain timestamp & protection', included: true },
  { label: 'NDA-gated sharing', included: true },
  { label: 'Basic pitch PDF', included: true },
  { label: 'Basic deck builder', included: true },
  { label: 'AI Investor Scorecard (view)', included: true },
  { label: 'Blueprint — 2D basic', included: true },
  { label: 'AI Challenge (limited)', included: true },
  { label: 'Blueprint — 3D interactive', included: false },
  { label: 'AI Scorecard improvement reports', included: false },
  { label: 'Pre-publish editor', included: false },
  { label: 'Custom branding on PDF & deck', included: false },
  { label: 'Priority marketplace ranking', included: false },
  { label: 'Idea visibility controls', included: false },
]

const PRO_FEATURES = [
  { label: 'Everything in Free', included: true },
  { label: 'Blueprint — 3D interactive (rotate & move)', included: true },
  { label: 'AI Scorecard improvement reports', included: true },
  { label: 'AI Challenge unlimited', included: true },
  { label: 'Pre-publish editor (fonts, colors, layout)', included: true },
  { label: 'Custom branding on PDF & deck', included: true },
  { label: 'Idea visibility controls', included: true },
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
          Protect your ideas.<br />
          <span style={{ background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Share them with confidence.</span>
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', margin: 0, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
          Start free and upgrade when you're ready to unlock the full power of eurekAIdea.
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
                <span style={{ fontSize: 14, color: f.included ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)', lineHeight: 1.4 }}>{f.label}</span>
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
              <span style={{ fontSize: 42, fontWeight: 700, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Coming soon</span>
            </div>
            <p style={{ margin: '0.75rem 0 0', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>The full toolkit for serious inventors and creators.</p>
          </div>

          <button
            disabled
            style={{ width: '100%', background: 'rgba(123,159,247,0.15)', border: '0.5px solid rgba(123,159,247,0.25)', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.35)', cursor: 'not-allowed', marginBottom: '2rem' }}
          >
            Coming soon
          </button>

          <div style={{ flex: 1 }}>
            {PRO_FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1, color: '#7b9ff7' }}>✓</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
