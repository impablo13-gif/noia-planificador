// Gráfico de barras con eje de fechas para ver la evolución de una métrica
// de equipo día a día — usado por el dashboard de Bienestar. Muestra como
// mucho los últimos `maxPoints` días con datos, la barra más reciente en
// color pleno y las anteriores atenuadas, con el valor encima de cada barra.
export default function TrendChart({ data, color, min, max, decimals = 1, maxPoints = 12, height = 130 }) {
  const points = data.slice(-maxPoints)

  if (points.length === 0) {
    return <p className="text-muted" style={{ fontSize: 12.5 }}>Sin datos todavía.</p>
  }

  const barWidth = 26
  const gap = 14
  const chartW = points.length * (barWidth + gap) - gap
  const topPad = 22

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={Math.max(chartW, 100)} height={height + topPad + 26} viewBox={`0 0 ${Math.max(chartW, 100)} ${height + topPad + 26}`}>
        {points.map((p, i) => {
          const pct = Math.max(0, Math.min(1, (p.avg - min) / (max - min || 1)))
          const barH = Math.max(3, pct * height)
          const x = i * (barWidth + gap)
          const y = topPad + (height - barH)
          const isLast = i === points.length - 1
          const [dd, mm] = p.fecha.slice(5).split('-').reverse()
          return (
            <g key={p.fecha}>
              <text x={x + barWidth / 2} y={topPad - 8} textAnchor="middle" fontSize="11" fontWeight="700" fill={isLast ? color : 'var(--ink-500)'}>
                {p.avg.toFixed(decimals)}
              </text>
              <rect x={x} y={y} width={barWidth} height={barH} rx="4" fill={color} opacity={isLast ? 1 : 0.4} />
              <text x={x + barWidth / 2} y={topPad + height + 16} textAnchor="middle" fontSize="10" fill="var(--ink-500)">
                {dd}/{mm}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
