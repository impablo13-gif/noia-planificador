import { useState } from 'react'
import { MessageSquareText } from 'lucide-react'
import { updateMatch } from '../db.js'
import { toISODate, formatDateLong, parseISODate } from '../dateUtils.js'

// Mini bloc de notas para el próximo partido (cualquier competición, el que
// esté más cerca en el calendario) — cosas que decir al equipo, avisos de
// última hora, recordatorios tácticos… se guarda solo con salir del campo,
// igual que Objetivos de la semana.
export default function MatchNotesCard({ matches, opponents }) {
  const todayISO = toISODate(new Date())
  const nextMatch = matches
    .filter((m) => m.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  const [notes, setNotes] = useState(nextMatch?.notasPartido || '')

  if (!nextMatch) {
    return (
      <div className="card">
        <div className="row" style={{ gap: 10, marginBottom: 4 }}>
          <div className="icon-chip" style={{ '--chip-color': 'var(--blue-600)' }}>
            <MessageSquareText size={16} />
          </div>
          <h3 className="section-title" style={{ marginBottom: 0 }}>Notas del partido</h3>
        </div>
        <p className="text-muted" style={{ fontSize: 12.5 }}>Sin próximos partidos programados.</p>
      </div>
    )
  }

  const opponent = opponents.find((o) => o.id === nextMatch.opponentId)

  return (
    <div className="card">
      <div className="row" style={{ gap: 10, marginBottom: 4 }}>
        <div className="icon-chip" style={{ '--chip-color': 'var(--blue-600)' }}>
          <MessageSquareText size={16} />
        </div>
        <h3 className="section-title" style={{ marginBottom: 0 }}>Notas del partido</h3>
      </div>
      <p className="section-hint" style={{ marginTop: 2, marginBottom: 12 }}>
        {opponent ? opponent.name : 'Rival por confirmar'} · {formatDateLong(parseISODate(nextMatch.date))}
      </p>

      <div className="field" style={{ marginBottom: 0 }}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => updateMatch(nextMatch.id, { notasPartido: notes })}
          placeholder="Ej. Presión alta los primeros 5', vigilar al 7 rival, rotar porteros al descanso…"
        />
      </div>
    </div>
  )
}
