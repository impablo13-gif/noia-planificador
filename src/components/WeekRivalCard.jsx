import { useState } from 'react'
import { Swords, House, Plane, ArrowRight, ClipboardList } from 'lucide-react'
import { toISODate, formatDateLong } from '../dateUtils.js'
import { getPlayers } from '../db.js'
import MatchPlanModal from './MatchPlanModal.jsx'

// Localiza el próximo partido de Liga (a partir de hoy) y muestra el nombre
// del rival + 3-4 pinceladas de su ficha de scouting.
export default function WeekRivalCard({ matches, opponents, onGoToRival }) {
  const [showPlan, setShowPlan] = useState(false)
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
