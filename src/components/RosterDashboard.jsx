import { useState } from 'react'
import { Goal, Handshake, Clock, Flame, HeartPulse } from 'lucide-react'
import PlayerAvatar from './PlayerAvatar.jsx'
import SessionRpePanel from './SessionRpePanel.jsx'
import { getPartidosNpa } from '../db.js'
import { computePlayerStats } from '../statsEngine.js'
import { teamWellnessSnapshot, playerAverageRpe } from '../bienestarStats.js'
import { formatDateShort, parseISODate } from '../dateUtils.js'

const MEDALS = ['🥇', '🥈', '🥉']

function LeaderboardCard({ title, icon: Icon, iconColor, barColor, players, getValue, unit, emptyText }) {
  const ranked = players
    .map((p) => ({ p, value: getValue(p) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
  const max = ranked[0]?.value || 0

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row" style={{ gap: 10, marginBottom: 16 }}>
        <div className="icon-chip" style={{ '--chip-color': iconColor }}>
          <Icon size={16} />
        </div>
        <h4 style={{ fontSize: 14 }}>{title}</h4>
      </div>

      {ranked.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 12.5 }}>{emptyText}</p>
      ) : (
        <div className="stack" style={{ gap: 11 }}>
          {ranked.map(({ p, value }, i) => {
            const pct = max ? Math.round((value / max) * 100) : 0
            return (
              <div key={p.id} className="leaderboard-row">
                <span className="leaderboard-rank" style={i < 3 ? { fontSize: 15 } : undefined}>{MEDALS[i] || i + 1}</span>
                <PlayerAvatar fileId={p.fotoFileId} size="sm" />
                <div className="leaderboard-main">
                  <div className="leaderboard-name-row">
                    <span className="leaderboard-name">{p.nombre}</span>
                    <span className="leaderboard-value" style={{ color: iconColor }}>{value}{unit || ''}</span>
                  </div>
                  <div className="leaderboard-bar-track">
                    <div className="leaderboard-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Anillo de progreso (SVG) para una métrica sobre un máximo, con el número
// grande en el centro — más legible de un vistazo que una barra plana.
function ProgressRing({ value, max, label, size = 88, stroke = 8 }) {
  const pct = value != null ? Math.max(0, Math.min(1, value / max)) : 0
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} />
        {value != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#fff"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fff"
          fontFamily="var(--font-head)"
          fontWeight="800"
          fontSize="24"
        >
          {value != null ? value.toFixed(1) : '—'}
        </text>
      </svg>
      <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 4 }}>{label}</div>
    </div>
  )
}

function TeamWellnessCard({ snap }) {
  if (!snap.fecha) {
    return (
      <div className="card">
        <div className="row" style={{ gap: 10, marginBottom: 16 }}>
          <div className="icon-chip" style={{ '--chip-color': 'var(--red-600)' }}>
            <HeartPulse size={16} />
          </div>
          <h4 style={{ fontSize: 14 }}>Bienestar del equipo</h4>
        </div>
        <p className="text-muted" style={{ fontSize: 12.5 }}>Aún no hay respuestas del cuestionario de bienestar sincronizadas.</p>
      </div>
    )
  }

  const compliancePct = snap.total ? Math.round((snap.responded / snap.total) * 100) : 0

  return (
    <div
      className="card hero-card"
      style={{ padding: 22 }}
    >
      <div className="row spread" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 8 }}>
          <Flame size={17} />
          <h4 style={{ color: '#fff' }}>Bienestar del equipo</h4>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11.5, opacity: 0.85 }}>{formatDateShort(parseISODate(snap.fecha))}</div>
          <div className="row" style={{ gap: 5, marginTop: 2, justifyContent: 'flex-end' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: compliancePct >= 70 ? '#7bdc9a' : compliancePct >= 40 ? '#ffd782' : '#ff9d9d' }} />
            <span style={{ fontSize: 11.5, fontWeight: 700 }}>{snap.responded}/{snap.total} respondieron</span>
          </div>
        </div>
      </div>
      <div className="row" style={{ gap: 24, justifyContent: 'center' }}>
        <ProgressRing value={snap.rpeAvg} max={10} label="RPE medio /10" />
        <ProgressRing value={snap.wellnessAvg} max={5} label="Bienestar general /5" />
      </div>
    </div>
  )
}

export default function RosterDashboard({ players }) {
  // Goles/asistencias/minutos vienen de los partidos sincronizados desde NPA
  // Stats (se calculan por nombre, no de un campo manual); el RPE/bienestar
  // del equipo viene del cuestionario diario sincronizado en Plantilla.
  const [, setTick] = useState(0)
  const bump = () => setTick((t) => t + 1)
  const matches = getPartidosNpa()
  const npaFor = (p) => computePlayerStats(matches, p.nombre).agg
  const wellnessSnap = teamWellnessSnapshot(players)

  return (
    <div className="dashboard-grid">
      <TeamWellnessCard snap={wellnessSnap} />
      <LeaderboardCard
        title="Más goles"
        icon={Goal}
        iconColor="var(--red-600)"
        barColor="linear-gradient(90deg, var(--red-700), var(--red-500))"
        players={players}
        getValue={(p) => npaFor(p).goles}
        emptyText="Aún no hay goles importados de NPA Stats."
      />
      <LeaderboardCard
        title="Más asistencias"
        icon={Handshake}
        iconColor="var(--blue-600)"
        barColor="linear-gradient(90deg, var(--blue-700), var(--blue-500))"
        players={players}
        getValue={(p) => npaFor(p).asistencias}
        emptyText="Aún no hay asistencias importadas de NPA Stats."
      />
      <LeaderboardCard
        title="Más minutos"
        icon={Clock}
        iconColor="var(--warn-600)"
        barColor="linear-gradient(90deg, #a1671b, #d9a94a)"
        players={players.filter((p) => p.posicion !== 'Portero')}
        getValue={(p) => Math.round(npaFor(p).seconds / 60)}
        unit="'"
        emptyText="Aún no hay minutos importados de NPA Stats."
      />
      <LeaderboardCard
        title="RPE medio por jugador"
        icon={Flame}
        iconColor="var(--red-600)"
        barColor="linear-gradient(90deg, var(--red-700), var(--red-500))"
        players={players}
        getValue={(p) => Math.round((playerAverageRpe(p.id).avg || 0) * 10) / 10}
        unit=" RPE"
        emptyText="Aún no hay respuestas de RPE — sincroniza el cuestionario de bienestar."
      />
      {wellnessSnap.fecha && (
        <div style={{ gridColumn: '1 / -1' }}>
          <SessionRpePanel fecha={wellnessSnap.fecha} players={players} title="Editar RPE del equipo" onChange={bump} />
        </div>
      )}
    </div>
  )
}
