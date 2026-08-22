import { useState } from 'react'
import { Moon, Zap, Bone, BatteryMedium, Gauge, HeartPulse, Flame, AlertTriangle } from 'lucide-react'
import { setPlayerRpe, playerBienestarHistory } from '../bienestarStats.js'
import { formatDateLong, parseISODate } from '../dateUtils.js'

// Barras verticales que crecen hacia arriba desde la base, una por respuesta,
// en orden cronológico (la más reciente a la derecha).
function BarChart({ values, color, min, max, width = 100, height = 44, barWidth = 8, gap = 4 }) {
  if (values.length === 0) return <div style={{ height }} />
  const n = values.length
  const totalW = Math.max(width, n * (barWidth + gap) - gap)
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${totalW} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {values.map((v, i) => {
        const pct = Math.max(0, Math.min(1, (v - min) / (max - min || 1)))
        const barH = Math.max(2, pct * height)
        const x = i * (barWidth + gap)
        const y = height - barH
        const isLast = i === n - 1
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barH}
            rx={2}
            fill={color}
            opacity={isLast ? 1 : 0.45}
          />
        )
      })}
    </svg>
  )
}

// "Mejor" y "peor" van en direcciones distintas según la métrica: estrés y
// fatiga altos son malos, el resto (sueño/dolor-ausente/energía/condición)
// alto es bueno. `invert` compensa eso para que el color siempre siga la
// misma lógica (verde=bien, rojo=mal) aunque el número no.
const METRICS = [
  { key: 'sueno', label: 'Sueño', icon: Moon, min: 1, max: 5, invert: false },
  { key: 'estres', label: 'Estrés', icon: Zap, min: 1, max: 5, invert: true },
  { key: 'dolorMuscular', label: 'Dolor muscular', icon: Bone, min: 1, max: 5, invert: false },
  { key: 'energia', label: 'Energía', icon: BatteryMedium, min: 1, max: 5, invert: false },
  { key: 'fatiga', label: 'Fatiga', icon: Gauge, min: 1, max: 5, invert: true },
  { key: 'condicionGeneral', label: 'Condición', icon: HeartPulse, min: 1, max: 5, invert: false },
]

function metricColor(value, min, max, invert) {
  if (value == null) return 'var(--gray-300)'
  const pct = (value - min) / (max - min || 1)
  const good = invert ? 1 - pct : pct
  if (good >= 0.6) return 'var(--success-600)'
  if (good >= 0.35) return 'var(--warn-600)'
  return 'var(--danger-600)'
}

export default function PlayerLoadPanel({ playerId, cargaFisica, onChange }) {
  const [history, setHistory] = useState(() => playerBienestarHistory(playerId))
  const last = history[history.length - 1]
  const [pickedDate, setPickedDate] = useState('')
  const pickedEntry = pickedDate ? history.find((e) => e.fecha === pickedDate) : null

  function handleRpeEdit(fecha, value) {
    const n = value === '' ? null : Number(value)
    setPlayerRpe(playerId, fecha, n)
    setHistory((prev) => {
      const exists = prev.some((e) => e.fecha === fecha)
      if (exists) return prev.map((e) => (e.fecha === fecha ? { ...e, rpe: n } : e))
      return [...prev, { fecha, rpe: n }].sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
    })
  }

  if (history.length === 0) {
    return (
      <div>
        <div className="field" style={{ maxWidth: 220, marginBottom: 20 }}>
          <label className="field__label">RPE medio (manual, hasta tener datos)</label>
          <input type="number" min="0" max="10" step="0.1" value={cargaFisica || 0} onChange={(e) => onChange(Number(e.target.value) || 0)} />
        </div>
        <div className="empty-state">
          <HeartPulse size={32} />
          <h3>Sin cuestionarios de bienestar todavía</h3>
          <p>En cuanto pegues respuestas del cuestionario diario desde Plantilla ("Pegar bienestar"), aquí aparecerá la evolución de este jugador.</p>
        </div>
      </div>
    )
  }

  const rpeValues = history.map((e) => e.rpe).filter((v) => v != null)
  const rpeAvg = rpeValues.length ? rpeValues.reduce((s, v) => s + v, 0) / rpeValues.length : null
  const rpeCount = rpeValues.length

  return (
    <div>
      {last?.estado && /lesi[oó]n/i.test(last.estado) && (
        <div className="banner banner-danger" style={{ marginBottom: 14 }}>
          <AlertTriangle size={15} />
          <span>Última respuesta ({last.fecha}): estado "{last.estado}"{last.dolorZona && last.dolorZona !== 'Sin dolor' ? ` · ${last.dolorZona}` : ''}</span>
        </div>
      )}

      {/* RPE en grande: es la métrica que más importa para dosificar la carga. */}
      <div
        className="card hero-card"
        style={{ padding: 18, marginBottom: 14 }}
      >
        <div className="row spread" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="row" style={{ gap: 6, marginBottom: 4 }}>
              <Flame size={18} />
              <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.03em' }}>RPE</span>
            </div>
            <div className="row" style={{ gap: 18, alignItems: 'flex-end' }}>
              <div>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={last?.rpe ?? ''}
                  onChange={(e) => handleRpeEdit(last.fecha, e.target.value)}
                  style={{
                    fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 40, lineHeight: 1,
                    width: 84, padding: '2px 4px', border: 'none', borderRadius: 6,
                    background: 'rgba(255,255,255,0.16)', color: '#fff',
                  }}
                />
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>última sesión ({last.fecha})</div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 22, lineHeight: 1 }}>
                  {rpeAvg != null ? rpeAvg.toFixed(1) : '—'}
                </div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>media ({rpeCount} sesion{rpeCount === 1 ? '' : 'es'})</div>
              </div>
            </div>
          </div>
          <div style={{ width: 160, flexShrink: 0 }}>
            <BarChart values={rpeValues} color="#fff" min={0} max={10} height={54} barWidth={9} gap={5} />
          </div>
        </div>

        <div className="row" style={{ gap: 10, marginTop: 14, alignItems: 'center' }}>
          <label style={{ fontSize: 12, opacity: 0.9 }}>Ver / corregir otro día:</label>
          <input
            type="date"
            value={pickedDate}
            onChange={(e) => setPickedDate(e.target.value)}
            style={{ padding: '5px 8px', borderRadius: 6, border: 'none', fontSize: 12.5 }}
          />
        </div>
        {pickedDate && (
          <div className="row spread" style={{ marginTop: 8, background: 'rgba(255,255,255,0.14)', borderRadius: 7, padding: '8px 12px' }}>
            <span style={{ fontSize: 12.5 }}>{formatDateLong(parseISODate(pickedDate))}</span>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={pickedEntry?.rpe ?? ''}
              placeholder="—"
              onChange={(ev) => handleRpeEdit(pickedDate, ev.target.value)}
              style={{ width: 56, padding: '3px 6px', fontSize: 13, borderRadius: 5, border: 'none', background: '#fff', color: 'var(--ink-900)' }}
            />
          </div>
        )}
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 16 }}>
        {METRICS.map(({ key, label, icon: Icon, min, max, invert }) => {
          const values = history.map((e) => e[key]).filter((v) => v != null)
          const value = last?.[key]
          return (
            <div className="card" key={key} style={{ padding: 14 }}>
              <div className="row spread" style={{ marginBottom: 6 }}>
                <Icon size={15} color={metricColor(value, min, max, invert)} />
                <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, color: metricColor(value, min, max, invert) }}>
                  {value != null ? value : '—'}
                </span>
              </div>
              <BarChart values={values} color={metricColor(value, min, max, invert)} min={min} max={max} />
              <div className="tile-card__meta" style={{ marginTop: 2 }}>{label}</div>
            </div>
          )
        })}
      </div>

      {last?.observacion && (
        <div className="banner banner-info" style={{ marginBottom: 16 }}>{last.observacion}</div>
      )}

      <div className="field" style={{ maxWidth: 220 }}>
        <label className="field__label">RPE medio (manual, complementario)</label>
        <input type="number" min="0" max="10" step="0.1" value={cargaFisica || 0} onChange={(e) => onChange(Number(e.target.value) || 0)} />
      </div>
    </div>
  )
}
