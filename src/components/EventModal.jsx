import { Dumbbell, House, Plane, Plus, Ban } from 'lucide-react'
import Modal from './Modal.jsx'
import { toISODate, formatDateLong } from '../dateUtils.js'

export default function EventModal({ date, events, opponents, onClose, onOpenTraining, onOpenMatch }) {
  const iso = toISODate(date)
  const trainings = events?.trainings || []
  const matches = events?.matches || []

  function opponentName(id) {
    return opponents.find((o) => o.id === id)?.name || 'Rival por confirmar'
  }

  function newTrainingDraft() {
    return { kind: 'new', date: iso, time: '19:00', label: 'Entreno', cancelled: false, status: 'pendiente', sessionText: '', sessionFileId: null }
  }

  function newMatchDraft() {
    return { id: null, date: iso, time: '', competition: 'Amistoso', opponentId: '', isHome: true, resultText: '', reportText: '', reportFileId: null, status: 'pendiente' }
  }

  return (
    <Modal title={formatDateLong(date)} onClose={onClose}>
      <div className="stack">
        <div>
          <div className="row spread" style={{ marginBottom: 8 }}>
            <h4 style={{ fontSize: 13.5, color: 'var(--ink-700)' }}>Entrenos</h4>
            <button type="button" className="link-btn" onClick={() => onOpenTraining(newTrainingDraft())}>
              <Plus size={12} style={{ verticalAlign: -2 }} /> Añadir entreno
            </button>
          </div>
          {trainings.length === 0 && <p className="text-muted" style={{ fontSize: 13 }}>No hay entreno programado.</p>}
          <div className="stack" style={{ gap: 8 }}>
            {trainings.map((t) => (
              <button
                key={t.date + t.kind}
                type="button"
                className="tile-card"
                style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
                onClick={() => onOpenTraining(t)}
              >
                <div className="tile-card__top">
                  {t.cancelled ? <Ban size={16} color="var(--ink-300)" /> : <Dumbbell size={16} color="var(--blue-600)" />}
                  <div>
                    <div className="tile-card__name" style={t.cancelled ? { textDecoration: 'line-through', color: 'var(--ink-300)' } : undefined}>
                      {t.time} · {t.label}
                    </div>
                    {t.note && <div className="tile-card__meta">{t.note}</div>}
                    {t.status === 'subida' && <span className="badge badge-success" style={{ marginTop: 4 }}>Sesión subida</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <hr className="divider" />

        <div>
          <div className="row spread" style={{ marginBottom: 8 }}>
            <h4 style={{ fontSize: 13.5, color: 'var(--ink-700)' }}>Partidos</h4>
            <button type="button" className="link-btn" onClick={() => onOpenMatch(newMatchDraft())}>
              <Plus size={12} style={{ verticalAlign: -2 }} /> Añadir partido
            </button>
          </div>
          {matches.length === 0 && <p className="text-muted" style={{ fontSize: 13 }}>No hay partido este día.</p>}
          <div className="stack" style={{ gap: 8 }}>
            {matches.map((m) => (
              <button
                key={m.id}
                type="button"
                className="tile-card"
                style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
                onClick={() => onOpenMatch(m)}
              >
                <div className="tile-card__top">
                  {m.isHome ? <House size={16} color="var(--red-700)" /> : <Plane size={16} color="var(--warn-600)" />}
                  <div>
                    <div className="tile-card__name">
                      {m.time ? `${m.time} · ` : ''}
                      {m.competition === 'Liga' ? `Jornada ${m.jornada} · ` : `${m.competition} · `}
                      {opponentName(m.opponentId)}
                    </div>
                    {m.resultText && <div className="tile-card__meta">{m.resultText}</div>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
