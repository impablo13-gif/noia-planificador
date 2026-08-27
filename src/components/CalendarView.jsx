import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ClipboardList, StickyNote } from 'lucide-react'
import { getMonthMatrix, dowLabels, monthLabel, toISODate, isSameDay, startOfWeek, endOfWeek, formatDateShort } from '../dateUtils.js'
import { getEventsInRange } from '../eventsEngine.js'
import { getOpponents, getMatches, agendaClub, agendaPersonal } from '../db.js'
import WeekRivalCard from './WeekRivalCard.jsx'
import AgendaBox from './AgendaBox.jsx'
import WeeklyGoalsCard from './WeeklyGoalsCard.jsx'
import EventModal from './EventModal.jsx'
import TrainingModal from './TrainingModal.jsx'
import MatchModal from './MatchModal.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'

function rivalName(opponents, id) {
  const o = opponents.find((x) => x.id === id)
  return o ? o.name : 'Por confirmar'
}

// En el calendario se prioriza la sigla (si el rival la tiene puesta) para
// no llenar la casilla con nombres largos — el nombre completo sigue
// disponible al pasar el ratón por encima.
function rivalCalendarLabel(opponents, id) {
  const o = opponents.find((x) => x.id === id)
  if (!o) return 'Por confirmar'
  return o.siglas || o.name
}

const COMPETITION_EVENT_CLASS = { Liga: 'is-comp-liga', Amistoso: 'is-comp-amistoso', Copa: 'is-comp-copa' }

function isEmptyDay(events) {
  return !events || (events.trainings.length === 0 && events.matches.length === 0)
}

// Convierte una semana (7 fechas, LUN...DOM) en las celdas a pintar: un día
// de partido se come el hueco del día siguiente si ese día no tiene nada
// programado, en vez de dejarlo vacío al lado — así el partido sale mucho
// más ancho sin romper la cuadrícula (cada semana sigue sumando 7 columnas
// en total). El domingo (última columna) nunca se invade: aunque esté
// libre, se deja como su propio día — no queremos que un partido de sábado
// se "fume" el otro día del fin de semana. Este ensanchado (y el resto del
// "modo grande") solo se aplica a la semana activa: las demás semanas no se
// tocan, para que solo destaque de verdad la semana en curso.
function buildWeekCells(week, eventsMap, allowWiden) {
  const cells = []
  for (let i = 0; i < week.length; i++) {
    const date = week[i]
    const iso = toISODate(date)
    const dayEvents = eventsMap[iso] || { trainings: [], matches: [] }
    const isMatchDay = dayEvents.matches.length > 0
    const next = week[i + 1]
    const nextIsSunday = i + 1 === 6
    if (allowWiden && isMatchDay && next && !nextIsSunday && isEmptyDay(eventsMap[toISODate(next)])) {
      cells.push({ date, iso, dayEvents, span: 2 })
      i++
      continue
    }
    cells.push({ date, iso, dayEvents, span: 1 })
  }
  return cells
}

export default function CalendarView({ onGoToRival }) {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(null)
  const [editingTraining, setEditingTraining] = useState(null)
  const [editingMatch, setEditingMatch] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const weeks = useMemo(() => getMonthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor])
  const currentWeekIndex = weeks.findIndex((week) => week.some((d) => isSameDay(d, today)))
  // La semana activa de verdad (hoy), no la que se esté mirando en el mes —
  // los Objetivos de la semana viven siempre en la barra lateral con el
  // foco de "ahora mismo", igual que Rival de la semana.
  const activeWeekKey = toISODate(startOfWeek(today))
  const activeWeekLabel = `${formatDateShort(startOfWeek(today))} – ${formatDateShort(endOfWeek(today))}`
  const rangeStart = weeks[0][0]
  const rangeEnd = weeks[weeks.length - 1][6]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const eventsMap = useMemo(() => getEventsInRange(rangeStart, rangeEnd), [rangeStart, rangeEnd, refreshKey])
  const dayCells = useMemo(
    () => weeks.flatMap((week, weekIdx) => buildWeekCells(week, eventsMap, weekIdx === currentWeekIndex).map((cell) => ({ ...cell, weekIdx }))),
    [weeks, eventsMap, currentWeekIndex],
  )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const opponents = useMemo(() => getOpponents(), [refreshKey])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allMatches = useMemo(() => getMatches(), [refreshKey])

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  function goPrevMonth() {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
  }

  function goNextMonth() {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
  }

  const selectedIso = selectedDate ? toISODate(selectedDate) : null

  return (
    <div className="stack">
      <div className="home-grid">
        <div className="card">
          <div className="calendar-nav">
            <button type="button" className="btn btn-ghost btn-icon" onClick={goPrevMonth} aria-label="Mes anterior">
              <ChevronLeft size={18} />
            </button>
            <div className="calendar-nav__title">{monthLabel(cursor.getFullYear(), cursor.getMonth())}</div>
            <button type="button" className="btn btn-ghost btn-icon" onClick={goNextMonth} aria-label="Mes siguiente">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="row" style={{ marginBottom: 10, fontSize: 12, color: 'var(--ink-500)', gap: 14, flexWrap: 'wrap' }}>
            <span>🏠 Casa · ✈️ Fuera</span>
            <span className="badge badge-comp-liga" style={{ padding: '1px 8px' }}>Liga</span>
            <span className="badge badge-comp-amistoso" style={{ padding: '1px 8px' }}>Amistoso</span>
            <span className="badge badge-comp-copa" style={{ padding: '1px 8px' }}>Copa</span>
            <span>🔵 Entreno</span>
          </div>

          <div className="calendar-grid-scroll">
            <div className="calendar-grid">
              {dowLabels().map((d) => (
                <div key={d} className="calendar-grid__dow">{d}</div>
              ))}
              {dayCells.map(({ date, iso, dayEvents, span, weekIdx }) => {
                const outside = date.getMonth() !== cursor.getMonth()
                const isToday = isSameDay(date, today)
                const isCurrentWeek = weekIdx === currentWeekIndex
                const isMatchDay = dayEvents.matches.length > 0
                return (
                  <div
                    key={iso}
                    className={`calendar-day${outside ? ' is-outside' : ''}${isToday ? ' is-today' : ''}${isCurrentWeek ? ' is-current-week' : ''}${isMatchDay ? ' is-match-day' : ''}${span === 2 ? ' is-wide' : ''}`}
                    style={span === 2 ? { gridColumn: 'span 2' } : undefined}
                    onClick={() => setSelectedDate(date)}
                  >
                    <div className="calendar-day__head">
                      <span className="calendar-day__dow">{dowLabels()[(date.getDay() + 6) % 7]}</span>
                      <span className="calendar-day__num">{date.getDate()}</span>
                    </div>
                    <div className="calendar-day__events">
                      {dayEvents.trainings.map((t, i) => (
                        <span key={`t${i}`} className={`calendar-event is-training${t.cancelled ? ' is-cancelled' : ''}`}>
                          {t.time}
                        </span>
                      ))}
                      {dayEvents.matches.map((m) => (
                        <span key={m.id} className={`calendar-event calendar-event--match ${COMPETITION_EVENT_CLASS[m.competition] || 'is-comp-amistoso'}`}>
                          <span className="calendar-event__shield">
                            <PlayerAvatar fileId={opponents.find((o) => o.id === m.opponentId)?.shieldFileId} size="sm" />
                            <span className="calendar-event__venue">{m.isHome ? '🏠' : '✈️'}</span>
                          </span>
                          <span className="calendar-event__rival" title={rivalName(opponents, m.opponentId)}>{rivalCalendarLabel(opponents, m.opponentId)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="stack">
          <WeekRivalCard matches={allMatches} opponents={opponents} onGoToRival={onGoToRival} />
          <WeeklyGoalsCard weekKey={activeWeekKey} weekLabel={activeWeekLabel} />
          <AgendaBox title="Agenda del club" icon={ClipboardList} api={agendaClub} placeholder="Tarea de coaching pendiente…" />
          <AgendaBox title="Recordatorios" icon={StickyNote} api={agendaPersonal} placeholder="Recordatorio o tarea del día a día…" />
        </div>
      </div>

      {selectedDate && (
        <EventModal
          date={selectedDate}
          events={eventsMap[selectedIso]}
          opponents={opponents}
          onClose={() => setSelectedDate(null)}
          onOpenTraining={(t) => setEditingTraining(t)}
          onOpenMatch={(m) => setEditingMatch(m)}
        />
      )}

      {editingTraining && (
        <TrainingModal
          training={editingTraining}
          onClose={() => setEditingTraining(null)}
          onSaved={() => {
            setEditingTraining(null)
            bump()
          }}
        />
      )}

      {editingMatch && (
        <MatchModal
          match={editingMatch}
          opponents={opponents}
          onClose={() => setEditingMatch(null)}
          onSaved={() => {
            setEditingMatch(null)
            bump()
          }}
          onGoToRival={(id) => {
            setEditingMatch(null)
            setSelectedDate(null)
            onGoToRival(id)
          }}
        />
      )}
    </div>
  )
}
