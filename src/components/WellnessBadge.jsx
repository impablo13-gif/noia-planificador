import { HeartPulse, AlertTriangle } from 'lucide-react'
import { wellnessScore } from '../bienestarStats.js'

// Indicador mínimo (un icono, sin texto salvo la fecha) del último cuestionario
// de bienestar de un jugador: verde/ámbar/rojo según la media de sus
// respuestas (estrés y fatiga se invierten: en esas dos, más alto es peor).
export default function WellnessBadge({ entry }) {
  if (!entry) return null

  if (entry.estado && /lesi[oó]n/i.test(entry.estado)) {
    return (
      <span className="badge badge-danger" title={`Lesión reportada · ${entry.fecha}`}>
        <AlertTriangle size={11} /> {entry.fecha?.slice(5)}
      </span>
    )
  }

  const score = wellnessScore(entry)
  if (score == null) return null
  const cls = score >= 4 ? 'badge-success' : score >= 3 ? 'badge-gold' : 'badge-danger'
  return (
    <span className={`badge ${cls}`} title={`Bienestar ${score.toFixed(1)}/5 · ${entry.fecha}`}>
      <HeartPulse size={11} /> {score.toFixed(1)}
    </span>
  )
}
