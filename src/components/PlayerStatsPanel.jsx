import { Target } from 'lucide-react'
import { getPartidosNpa } from '../db.js'
import { computePlayerStats } from '../statsEngine.js'
import { formatDateShort, parseISODate } from '../dateUtils.js'

const TILES = [
  { key: 'partidos', label: 'Partidos' },
  { key: 'goles', label: 'Goles' },
  { key: 'asistencias', label: 'Asistencias', accent: true },
  { key: 'minutos', label: 'Minutos' },
  { key: 'shotsOn', label: 'Tiros a puerta' },
  { key: 'shotsOff', label: 'Tiros fuera', accent: true },
  { key: 'saves', label: 'Paradas' },
  { key: 'recoveries', label: 'Recuperaciones' },
  { key: 'turnovers', label: 'Pérdidas', accent: true },
  { key: 'fouls', label: 'Faltas' },
  { key: 'yellow', label: 'Amarillas' },
  { key: 'red', label: 'Rojas', accent: true },
]

export default function PlayerStatsPanel({ nombre }) {
  const matches = getPartidosNpa()
  const { agg, perMatch } = computePlayerStats(matches, nombre)
  const minutos = Math.round(agg.seconds / 60)
  const values = { ...agg, minutos }

  if (agg.partidos === 0) {
    return (
      <div className="empty-state">
        <Target size={32} />
        <h3>Sin datos de NPA Stats todavía</h3>
        <p>En cuanto sincronices partidos con "Actualizar desde NPA Stats" en la pestaña Estadísticas, aquí aparecerán las estadísticas individuales de {nombre}.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="stat-tile-grid">
        {TILES.map(({ key, label, accent }) => (
          <div className="stat-tile" key={key}>
            <div className={`stat-tile__value${accent ? ' is-accent' : ''}`}>{values[key]}{key === 'minutos' ? "'" : ''}</div>
            <div className="stat-tile__label">{label}</div>
          </div>
        ))}
      </div>

      <h4 style={{ fontSize: 13.5, marginBottom: 8 }}>Partido a partido</h4>
      <div className="card" style={{ padding: '4px 16px' }}>
        {perMatch.map((m, i) => (
          <div key={i} className="match-row">
            <span className="text-muted">{formatDateShort(parseISODate(m.date.slice(0, 10)))}</span>
            <span style={{ flex: 1 }}>{m.rivalName}</span>
            <span className="text-muted">{Math.round((m.seconds || 0) / 60)}'</span>
            <span>{m.goals || 0}g · {m.assists || 0}a</span>
          </div>
        ))}
      </div>
    </div>
  )
}
