import { useState } from 'react'
import { Swords, House, Plane, ArrowRight, ClipboardList, Paperclip } from 'lucide-react'
import { toISODate, formatDateLong } from '../dateUtils.js'
import { getPlayers, updateOpponent } from '../db.js'
import MatchPlanModal from './MatchPlanModal.jsx'
import MultiFileDrop from './MultiFileDrop.jsx'

// Localiza el próximo partido de Liga (a partir de hoy) y muestra el nombre
// del rival + 3-4 pinceladas de su ficha de scouting.
export default function WeekRivalCard({ matches, opponents, onGoToRival, onChanged }) {
  const [showPlan, setShowPlan] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const todayISO = toISODate(new Date())
  const upcoming = matches
    .filter((m) => m.competition === 'Liga' && m.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  if (!upcoming) {
    return (
      <div className="rival-card">
        <div className="rival-card__label">Rival de la semana</div>
        <div className="rival-card__name">Sin próximos partidos de liga</div>
      </div>
    )
  }

  const opponent = opponents.find((o) => o.id === upcoming.opponentId)
  const highlights = opponent?.scouting?.highlights?.filter(Boolean).slice(0, 4) || []
  const scoutingFileIds = opponent?.scoutingFileIds || []

  function handleScoutingFilesChange(ids) {
    if (!opponent) return
    updateOpponent(opponent.id, { scoutingFileIds: ids })
    onChanged?.()
  }

  return (
    <div className="rival-card">
      <div className="rival-card__label">
        <Swords size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
        Jornada {upcoming.jornada} · {formatDateLong(new Date(upcoming.date + 'T00:00:00'))}
      </div>
      <div className="rival-card__name">
        {upcoming.isHome ? <House size={17} style={{ verticalAlign: -3, marginRight: 6 }} /> : <Plane size={17} style={{ verticalAlign: -3, marginRight: 6 }} />}
        {opponent ? opponent.name : 'Rival por determinar'}
        <span style={{ opacity: 0.75, fontSize: 13, fontWeight: 400, marginLeft: 8 }}>
          {upcoming.isHome ? '(en casa)' : '(fuera)'}
        </span>
      </div>

      {highlights.length > 0 ? (
        <ul>
          {highlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
          Aún no hay pinceladas de scouting guardadas para este rival.
        </p>
      )}

      {opponent && (
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAttach((v) => !v)}
          >
            <Paperclip size={13} />
            {scoutingFileIds.length > 0 ? `${scoutingFileIds.length} documento${scoutingFileIds.length === 1 ? '' : 's'} de scouting` : 'Adjuntar documento de scouting'}
          </button>
          {showAttach && (
            <div style={{ marginTop: 8 }}>
              <MultiFileDrop
                fileIds={scoutingFileIds}
                onChange={handleScoutingFilesChange}
                accept=".pdf,image/*,.doc,.docx"
                label="Subir documento"
              />
            </div>
          )}
        </div>
      )}

      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => opponent && onGoToRival(opponent.id)}
          disabled={!opponent}
        >
          Ver ficha completa
          <ArrowRight size={13} />
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPlan(true)}>
          <ClipboardList size={13} />
          Plan de partido
        </button>
      </div>

      {showPlan && (
        <MatchPlanModal
          match={upcoming}
          opponent={opponent}
          players={getPlayers().filter((p) => p.equipo === upcoming.equipo)}
          onClose={() => setShowPlan(false)}
        />
      )}
    </div>
  )
}
