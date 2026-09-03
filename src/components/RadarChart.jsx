// Radar de N ejes (pentágono para los 5 ejes del club) — reutilizado tanto
// para el resumen individual de un jugador como para la media del equipo en
// el dashboard de Plantilla, igual que el resumen "tipo FIFA" de Fixo.
export default function RadarChart({ axes, values, size = 200, color = 'var(--red-600)', max = 10 }) {
  const center = size / 2
  const maxRadius = size / 2 - 28
  const n = axes.length

  function pointFor(i, ratio) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return {
      x: center + Math.cos(angle) * maxRadius * ratio,
      y: center + Math.sin(angle) * maxRadius * ratio,
    }
  }

  const rings = [0.25, 0.5, 0.75, 1]
  const dataPoints = axes.map((a, i) => pointFor(i, Math.max(0, Math.min(1, (values[a.key] || 0) / max))))
  const dataPath = `M ${dataPoints.map((p) => `${p.x},${p.y}`).join(' L ')} Z`

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((r) => {
        const pts = axes.map((_, i) => pointFor(i, r))
        return (
          <polygon key={r} points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--gray-200)" strokeWidth="1" />
        )
      })}
      {axes.map((a, i) => {
        const p = pointFor(i, 1)
        return <line key={a.key} x1={center} y1={center} x2={p.x} y2={p.y} stroke="var(--gray-200)" strokeWidth="1" />
      })}
      <path d={dataPath} fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2" />
      {dataPoints.map((p, i) => (
        <circle key={axes[i].key} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
      {axes.map((a, i) => {
        const p = pointFor(i, 1.22)
        return (
          <text key={a.key} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="var(--ink-700)" fontFamily="var(--font-body)">
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}
