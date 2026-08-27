import { useState } from 'react'
import { Target } from 'lucide-react'
import { getWeeklyGoalsForWeek, setWeeklyGoalsForWeek } from '../db.js'

// Foco de la semana en curso (microciclo), aparte del contenido de cada
// sesión suelta — se guarda solo con salir del campo, sin botón de guardar,
// igual que el resto de widgets de la barra lateral del Calendario.
export default function WeeklyGoalsCard({ weekKey, weekLabel }) {
  const stored = getWeeklyGoalsForWeek(weekKey)
  const [objetivos, setObjetivos] = useState(stored.objetivos)
  const [contenidos, setContenidos] = useState(stored.contenidos)

  return (
    <div className="card">
      <div className="row" style={{ gap: 10, marginBottom: 4 }}>
        <div className="icon-chip" style={{ '--chip-color': 'var(--red-700)' }}>
          <Target size={16} />
        </div>
        <h3 className="section-title" style={{ marginBottom: 0 }}>Objetivos de la semana</h3>
      </div>
      {weekLabel && <p className="section-hint" style={{ marginTop: 2, marginBottom: 12 }}>{weekLabel}</p>}

      <div className="field" style={{ marginBottom: 12 }}>
        <label className="field__label">Objetivos</label>
        <textarea
          value={objetivos}
          onChange={(e) => setObjetivos(e.target.value)}
          onBlur={() => setWeeklyGoalsForWeek(weekKey, { objetivos })}
          placeholder="Ej. Consolidar el 4-0 en ataque, mejorar la salida de presión…"
        />
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label className="field__label">Contenidos</label>
        <textarea
          value={contenidos}
          onChange={(e) => setContenidos(e.target.value)}
          onBlur={() => setWeeklyGoalsForWeek(weekKey, { contenidos })}
          placeholder="Ej. Rondos 4v2, circuito de finalización, ABP defensivas…"
        />
      </div>
    </div>
  )
}
