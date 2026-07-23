import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
import NavBar from '../components/NavBar'

const ROWS = [
  { feature: 'Unlimited idea submissions',          free: true,          protection: true,           pro: true },
  { feature: 'Blockchain timestamp',                free: true,          protection: true,           pro: true },
  { feature: 'Marketplace listing',                 free: true,          protection: true,           pro: true },
  { feature: 'AI Scorecard on publish',             free: true,          protection: true,           pro: true },
  { feature: '3 free re-publishes',                 free: true,          protection: true,           pro: true },
  { feature: 'Basic pitch PDF',                     free: true,          protection: true,           pro: true },
  { feature: 'NDA share link (permanent)',           free: false,         protection: true,           pro: true },
  { feature: 'Timestamp certificate PDF',           free: false,         protection: true,           pro: true },
  { feature: 'Verified marketplace badge',          free: false,         protection: true,           pro: true },
  { feature: 'Score Insights (why + how to improve)', free: false,       protection: '$2.99 add-on', pro: true },
  { feature: '+ 10 extra AI refreshes for this idea — $2.99', free: false, protection: true,        pro: false },
  { feature: 'Extra re-publishes',                  free: '$0.99 each',  protection: '$0.99 each',   pro: 'Unlimited' },
  { feature: 'AI tools (1 free + 3 refreshes per idea)', free: true,    protection: true,           pro: '50/month, pooled across all ideas' },
  { feature: 'Advanced pitch deck + PDF',           free: false,         protection: false,          pro: true },
  { feature: 'Investor view notifications',         free: false,         protection: false,          pro: true },
  { feature: 'Priority marketplace ranking',        free: false,         protection: false,          pro: true },
  { feature: 'Sketch tool',                          free: false,         protection: false,          pro: true },
  { feature: 'AI actions (Scorecard, Challenge, Suggest, etc.)', free: '1 free + 3 refreshes per action', protection: '1 free + 3 refreshes per action', pro: '50/month included' },
  { feature: 'Extra AI refreshes',                  free: '10 for $2.99', protection: '10 for $2.99',  pro: '10 for $1.99 (after 50/mo)' },
]

function CellValue({ value }) {
  if (value === true)  return <span style={{ color: '#4ade80', fontSize: 16 }}>✓</span>
  if (value === false) return <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>—</span>
  return <span style={{ color: '#7b9ff7', fontSize: 13, fontWeight: 500 }}>{value}</span>
}

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

      {/* Comparison table */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 2rem 4rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 640 }}>
          <thead>
            <tr>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: 12, letterSpacing: '0.5px', textTransform: 'uppercase', width: '34%' }}>Feature</th>

              <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '0.5px solid rgba(255,255,255,0.12)', width: '22%' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500, marginBottom: 6 }}>Free</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>$0</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>forever</div>
              </th>

              <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '0.5px solid rgba(255,255,255,0.12)', width: '22%' }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500, marginBottom: 6 }}>Protection Pack</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>$4.99</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>per idea</div>
              </th>

              <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '0.5px solid rgba(255,255,255,0.12)', background: 'rgba(123,159,247,0.08)', width: '22%' }}>
                <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 600, color: '#fff', background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', borderRadius: 20, padding: '3px 10px', marginBottom: 8, letterSpacing: '0.3px' }}>POPULAR</div>
                <div style={{ fontSize: 12, color: '#7b9ff7', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500, marginBottom: 6 }}>Pro</div>
                <div style={{ fontSize: 24, fontWeight: 700, background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>$12</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>/month</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                <td style={{ padding: '0.85rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{row.feature}</td>
                <td style={{ padding: '0.85rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.08)', textAlign: 'center' }}><CellValue value={row.free} /></td>
                <td style={{ padding: '0.85rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.08)', textAlign: 'center' }}><CellValue value={row.protection} /></td>
                <td style={{ padding: '0.85rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.08)', textAlign: 'center', background: 'rgba(123,159,247,0.08)' }}><CellValue value={row.pro} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CTA buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '0 2rem 6rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/auth?signup=true')}
          style={{ background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '13px 28px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
        >
          Get started free
        </button>
        <button
          onClick={() => {}}
          style={{ background: 'none', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '13px 28px', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
        >
          Protect an idea — $4.99
        </button>
        <button
          onClick={() => {}}
          style={{ background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', border: 'none', borderRadius: 12, padding: '13px 28px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
        >
          Upgrade to Pro — $12/mo
        </button>
      </div>

    </div>
  )
}
