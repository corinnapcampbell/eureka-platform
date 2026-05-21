import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'

export default function NotFound({ session }) {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e1f', color: '#fff', fontFamily: 'Outfit, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>

      {/* Logo top */}
      <div style={{ position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <Logo size={20} variant="dark" />
      </div>

      {/* Lightbulb favicon SVG */}
      <svg viewBox="232 50 112 148" width="64" height="64" style={{ marginBottom: '1.5rem', opacity: 0.6 }}>
        <defs>
          <radialGradient id="g" cx="50%" cy="42%" r="52%">
            <stop offset="0" stopColor="#8C8FF7" stopOpacity="0.18"/>
            <stop offset="1" stopColor="#9B7FF7" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0" stopColor="#7B9FF7"/>
            <stop offset="1" stopColor="#9B7FF7"/>
          </linearGradient>
          <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0" stopColor="#7B9FF7" stopOpacity="0"/>
            <stop offset="0.18" stopColor="#7B9FF7" stopOpacity="0.85"/>
            <stop offset="0.82" stopColor="#9B7FF7" stopOpacity="0.85"/>
            <stop offset="1" stopColor="#9B7FF7" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <ellipse cx="288" cy="113" rx="61" ry="58" fill="url(#g)"/>
        <path fill="none" stroke="url(#g1)" strokeWidth="7" strokeLinejoin="round" d="M288,57c-30.5,0-55.9,25.4-55.9,54.2c0,20.3,11,37.3,28,48.3l5.1,12.7h45.7l5.1-12.7c16.9-11,28-28,28-48.3C343.9,82.4,318.5,57,288,57z"/>
        <rect x="261" y="179" width="54" height="12" rx="6" fill="url(#g2)"/>
        <path fill="none" stroke="url(#g1)" strokeWidth="8" strokeLinecap="round" d="M298.3,84.6c-14.3-6.1-27.6,3.8-27.6,12.3s5.4,14.3,22.4,14.3"/>
        <path fill="none" stroke="url(#g1)" strokeWidth="8" strokeLinecap="round" d="M294.7,111.2c-16.9,0-25.2,3.4-25.1,15.9c0.1,9.4,12.2,15.1,28.7,11.1"/>
      </svg>

      {/* 404 */}
      <h1 style={{ fontSize: 96, fontWeight: 700, margin: '0 0 0.25rem', lineHeight: 1, background: 'linear-gradient(135deg, #7b9ff7, #9b7ff7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', letterSpacing: '-2px' }}>404</h1>

      <p style={{ fontSize: 20, fontWeight: 600, margin: '0 0 0.75rem', color: '#fff' }}>This page doesn't exist</p>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', margin: '0 0 2.5rem', maxWidth: 320, lineHeight: 1.6 }}>The page you're looking for may have been moved, deleted, or never existed in the first place.</p>

      {/* CTAs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)', border: 'none', borderRadius: 12, padding: '13px 28px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
        >Go home</button>
        {session && (
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '13px 28px', fontSize: 15, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
          >My Ideas</button>
        )}
      </div>

    </div>
  )
}
