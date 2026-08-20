import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ClipboardList, StickyNote } from 'lucide-react'
import { getMonthMatrix, dowLabels, monthLabel, toISODate, isSameDay } from '../dateUtils.js'
import { getEventsInRange } from '../eventsEngine.js'
import { getOpponents, getMatches, agendaClub, agendaPersonal } from '../db.js'
import WeekRivalCard from './WeekRivalCard.jsx'
import AgendaBox from './AgendaBox.jsx'
import EventModal from './EventModal.jsx'
import TrainingModal from './TrainingModal.jsx'
import MatchModal from './MatchModal.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'

function shortName(opponents, id) {
  const o = opponents.find((x) => x.id === id)
  if (!o) return 'Por confirmar'
  return o.name.length > 16 ? `${o.name.slice(0, 15)}…` : o.name
}

const COMPETITION_EVENT_CLASS = { Liga: 'is-comp-liga', Amistoso: 'is-comp-amistoso', Copa: 'is-comp-copa' }

export default function CalendarView({ onGoToRival }) {
  const today = new Date()
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(null)
  const [editingTraining, setEditingTraining] = useState(null)
  const [editingMatch, setEditingMatch] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const weeks = useMemo(() => getMonthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor])
  const rangeStart = weeks[0][0]
  const rangeEnd = weeks[weeks.length - 1][6]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const eventsMap = useMemo(() => getEventsInRange(rangeStart, rangeEnd), [rangeStart, rangeEnd, refreshKey])
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

          <div className="calendar-grid">
            {dowLabels().map((d) => (
              <div key={d} className="calendar-grid__dow">{d}</div>
            ))}
            {weeks.flat().map((date) => {
              const iso = toISODate(date)
              const dayEvents = eventsMap[iso] || { trainings: [], matches: [] }
              const outside = date.getMonth() !== cursor.getMonth()
              const isToday = isSameDay(date, today)
              return (
                <div
                  key={iso}
                  className={`calendar-day${outside ? ' is-outside' : ''}${isToday ? ' is-today' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className="calendar-day__num">{date.getDate()}</div>
                  <div className="calendar-day__events">
                    {dayEvents.trainings.map((t, i) => (
                      <span key={`t${i}`} className={`calendar-event is-training${t.cancelled ? ' is-cancelled' : ''}`}>
                        {t.time}
                      </span>
                    ))}
                    {dayEvents.matches.map((m) => (
                      <span key={m.id} className={`calendar-event ${COMPETITION_EVENT_CLASS[m.competition] || 'is-comp-amistoso'}`}>
                        {m.isHome ? '🏠' : '✈️'}
                        <PlayerAvatar fileId={opponents.find((o) => o.id === m.opponentId)?.shieldFileId} size="xs" />
                        {shortName(opponents, m.opponentId)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="stack">
          <WeekRivalCard matches={allMatches} opponents={opponents} onGoToRival={onGoToRival} />
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
