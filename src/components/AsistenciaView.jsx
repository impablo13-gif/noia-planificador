import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ClipboardCheck, Users } from 'lucide-react'
import { getMonthMatrix, dowLabels, monthLabel, toISODate } from '../dateUtils.js'
import { getEventsInRange } from '../eventsEngine.js'
import { getPlayers, getAsistenciaForDate } from '../db.js'
import AsistenciaModal from './AsistenciaModal.jsx'

export default function AsistenciaView() {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [refreshKey, setRefreshKey] = useState(0)
  const [opening, setOpening] = useState(null)
  const [equipoFilter, setEquipoFilter] = useState(null)

  const players = getPlayers()
  const equipos = [...new Set(players.map((p) => p.equipo).filter(Boolean))]
  const defaultEquipo = equipos.find((eq) => /juvenil/i.test(eq)) || equipos[0] || null
  const activeEquipo = equipoFilter && equipos.includes(equipoFilter) ? equipoFilter : defaultEquipo
  const equipoPlayers = activeEquipo ? players.filter((p) => p.equipo === activeEquipo) : players

  const weeks = useMemo(() => getMonthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor])
  const rangeStart = weeks[0][0]
  const rangeEnd = weeks[weeks.length - 1][6]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const eventsMap = useMemo(() => getEventsInRange(rangeStart, rangeEnd), [rangeStart, rangeEnd, refreshKey])

  const sessions = []
  Object.entries(eventsMap).forEach(([iso, day]) => {
    day.trainings.filter((t) => !t.cancelled).forEach((t) => sessions.push({ fecha: iso, label: `Entreno · ${t.label}` }))
    day.matches.forEach((m) => sessions.push({ fecha: iso, label: `Partido${m.rivalName ? ` vs ${m.rivalName}` : ''}` }))
  })
  sessions.sort((a, b) => (a.fecha < b.fecha ? -1 : 1))

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="stack">
      <div className="row spread">
        <div>
          <h2 className="section-title">Asistencia</h2>
          <p className="section-hint">Quién estuvo presente en cada entreno y partido — sirve para saber a quién pedir RPE.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </button>
          <span className="calendar-nav__title" style={{ fontSize: 15 }}>{monthLabel(cursor.getFullYear(), cursor.getMonth())}</span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {equipos.length > 1 && (
        <div className="chip-group">
          {equipos.map((eq) => (
            <button key={eq} type="button" className={`chip${activeEquipo === eq ? ' is-active' : ''}`} onClick={() => setEquipoFilter(eq)}>{eq}</button>
          ))}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="empty-state">
          <ClipboardCheck size={32} />
          <h3>Sin entrenos ni partidos este mes</h3>
        </div>
      ) : (
        <div className="card">
          {sessions.map((s) => {
            const asist = getAsistenciaForDate(s.fecha)
            const count = asist
              ? equipoPlayers.filter((p) => (asist.estados[p.id] || 'presente') === 'presente').length
              : null
            return (
              <button
                key={s.fecha + s.label}
                type="button"
                className="match-row"
                style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', background: 'transparent' }}
                onClick={() => setOpening(s)}
              >
                <span className="text-muted" style={{ minWidth: 90 }}>{dowLabels()[(new Date(s.fecha).getDay() + 6) % 7]} {s.fecha.slice(8, 10)}/{s.fecha.slice(5, 7)}</span>
                <span style={{ flex: 1 }}>{s.label}</span>
                {count != null ? (
                  <span className="badge badge-success"><Users size={11} /> {count}/{equipoPlayers.length}</span>
                ) : (
                  <span className="badge badge-gray">Sin registrar</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {opening && (
        <AsistenciaModal
          fecha={opening.fecha}
          label={opening.label}
          players={equipoPlayers}
          initialEstados={getAsistenciaForDate(opening.fecha)?.estados || {}}
          onClose={() => setOpening(null)}
          onSaved={() => {
            setOpening(null)
            bump()
          }}
        />
      )}
    </div>
  )
}
