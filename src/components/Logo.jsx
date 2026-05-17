export default function Logo({ size = 20, dark = false }) {
  const textFill = dark ? '#0e0e1f' : '#ffffff'
  const svgH = Math.round(size * 1.25)
  const svgW = Math.round(svgH * 6.5)
  const gradId = dark ? 'aiGradLogoD' : 'aiGradLogoW'
  return (
    <svg xmlns="http://www.w3.org/2000/svg" height={svgH} width={svgW} viewBox="0 0 260 40" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7b9ff7" />
          <stop offset="100%" stopColor="#9b7ff7" />
        </linearGradient>
      </defs>
      <text fontFamily="Outfit, Helvetica, Arial, sans-serif" fontWeight="300" fontSize="32" y="32">
        <tspan fill={textFill}>Eurek</tspan>
        <tspan fill={`url(#${gradId})`}>AI</tspan>
        <tspan fill={textFill}>dea</tspan>
      </text>
    </svg>
  )
}
