import { useState } from 'react'
import { Target, Goal, Handshake, Clock } from 'lucide-react'
import { getPartidosNpa, getMatches } from '../db.js'
import { computePlayerStats, filterByCompetition } from '../statsEngine.js'
import { formatDateShort, parseISODate } from '../dateUtils.js'

const COMPETICIONES = ['Liga', 'Amistoso', 'Copa']

const TILES = [
  { key: 'shotsOn', label: 'Tiros a puerta' },
  { key: 'shotsOff', label: 'Tiros fuera', accent: true },
  { key: 'shotsPost', label: 'Tiros al palo' },
  { key: 'saves', label: 'Paradas' },
  { key: 'recoveries', label: 'Recuperaciones' },
  { key: 'turnovers', label: 'Pérdidas', accent: true },
  { key: 'fouls', label: 'Faltas' },
  { key: 'yellow', label: 'Amarillas' },
  { key: 'red', label: 'Rojas', accent: true },
]

export default function PlayerStatsPanel({ nombre }) {
  const [competicionFilter, setCompeticionFilter] = useState(null)

  const allMatches = getPartidosNpa()
  const competitionByNpaId = new Map(getMatches().filter((cm) => cm.npaMatchId).map((cm) => [cm.npaMatchId, cm.competition]))
  const matches = filterByCompetition(allMatches, competitionByNpaId, competicionFilter)
  const { agg, perMatch } = computePlayerStats(matches, nombre)
  const minutos = Math.round(agg.seconds / 60)
  const values = { ...agg, minutos }

  if (getPartidosNpa().length === 0) {
    return (
      <div className="empty-state">
        <Target size={32} />
        <h3>Sin datos de NPA Stats todavía</h3>
        <p>En cuanto subas un informe con "Subir informe (NPA Stats)" en la pestaña Estadísticas, aquí aparecerán las estadísticas individuales de {nombre}.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="chip-group" style={{ marginBottom: 16 }}>
        <button type="button" className={`chip${!competicionFilter ? ' is-active' : ''}`} onClick={() => setCompeticionFilter(null)}>Todas</button>
        {COMPETICIONES.map((c) => (
          <button key={c} type="button" className={`chip${competicionFilter === c ? ' is-active' : ''}`} onClick={() => setCompeticionFilter(c)}>{c}</button>
        ))}
      </div>

      {agg.partidos === 0 ? (
        <p className="text-muted" style={{ fontSize: 12.5, marginBottom: 16 }}>Sin partidos de {nombre} en esta competición.</p>
      ) : (
        <>
          <div className="card hero-card" style={{ padding: 20, marginBottom: 16 }}>
            <div className="row" style={{ gap: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <Goal size={16} style={{ marginBottom: 2 }} />
                <div className="hero-card__value" style={{ fontSize: 30 }}>{agg.goles}</div>
                <div className="hero-card__label">Goles</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Handshake size={16} style={{ marginBottom: 2 }} />
                <div className="hero-card__value" style={{ fontSize: 30 }}>{agg.asistencias}</div>
                <div className="hero-card__label">Asistencias</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Clock size={16} style={{ marginBottom: 2 }} />
                <div className="hero-card__value" style={{ fontSize: 30 }}>{minutos}'</div>
                <div className="hero-card__label">Minutos</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="hero-card__value" style={{ fontSize: 30 }}>{agg.partidos}</div>
                <div className="hero-card__label">Partidos</div>
              </div>
            </div>
          </div>

          <div className="stat-tile-grid" style={{ marginBottom: 16 }}>
            {TILES.map(({ key, label, accent }) => (
              <div className="stat-tile" key={key}>
                <div className={`stat-tile__value${accent ? ' is-accent' : ''}`}>{values[key]}</div>
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
        </>
      )}
    </div>
  )
}
