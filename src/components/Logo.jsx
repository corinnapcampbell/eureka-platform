export default function Logo({ size = 20, variant = 'dark' }) {
  const textColor = variant === 'light' ? '#0e0e1f' : '#ffffff'
  return (
    <span style={{
      fontFamily: "'Outfit', Helvetica, Arial, sans-serif",
      fontWeight: 300,
      fontSize: size,
      lineHeight: 1,
      display: 'inline-flex',
      alignItems: 'center',
      verticalAlign: 'middle',
      letterSpacing: 0,
    }}>
      <span style={{ color: textColor }}>Eurek</span>
      <span style={{
        background: 'linear-gradient(90deg, #7b9ff7, #9b7ff7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>AI</span>
      <span style={{ color: textColor }}>dea</span>
    </span>
  )
}
