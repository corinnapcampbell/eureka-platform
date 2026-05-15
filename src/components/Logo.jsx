export default function Logo({ size = 20, dark = false }) {
  const textColor = dark ? '#0e0e1f' : '#fff'
  return (
    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 300, fontSize: size }}>
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
