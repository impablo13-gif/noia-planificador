import { Goal, ShieldAlert, Users2, PieChart, Trophy } from 'lucide-react'
import { summarize, buildMatchRows, computeQuintetos, computeFases, matchPlayerByName } from '../statsEngine.js'
import PlayerAvatar from './PlayerAvatar.jsx'

function QuintetoRow({ q, max, textColor, barColor, players }) {
  return (
    <div>
      <div className="row" style={{ gap: 4, marginBottom: 4 }}>
        {q.players.map((p, i) => (
          <PlayerAvatar key={i} fileId={matchPlayerByName(players, p.name)?.fotoFileId} size="sm" />
        ))}
        <span className="leaderboard-value" style={{ color: textColor, marginLeft: 'auto' }}>{q.count}</span>
      </div>
      <div className="leaderboard-name-row" style={{ marginBottom: 3 }}>
        <span className="leaderboard-name" style={{ whiteSpace: 'normal', fontWeight: 500 }}>
          {q.players.map((p) => p.name).join(' · ')}
        </span>
      </div>
      <div className="leaderboard-bar-track">
        <div className="leaderboard-bar-fill" style={{ width: `${(q.count / max) * 100}%`, background: barColor }} />
      </div>
    </div>
  )
}

function PhaseBar({ phase, count, max, color }) {
  const pct = max ? Math.round((count / max) * 100) : 0
  return (
    <div className="phase-row">
      <span className="phase-row__label">{phase}</span>
      <div className="leaderboard-bar-track" style={{ flex: 1 }}>
        <div className="leaderboard-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="phase-row__count">{count}</span>
    </div>
  )
}

// El mismo panel de estadísticas (tiles + xG + quintetos + fases) sirve tanto
// para el global de la temporada como para un único partido — solo cambia el
// array `matches` que se le pasa (toda la temporada, o [ese partido]).
export default function StatsDashboard({ matches, players }) {
  const stats = summarize(matches)
  const rows = buildMatchRows(matches)
  const quintetos = computeQuintetos(matches)
  const fases = computeFases(matches)
  const maxFaseFor = Math.max(1, ...fases.aFavor.map((f) => f.count))
  const maxFaseAgainst = Math.max(1, ...fases.enContra.map((f) => f.count))
  const maxQuintetoFor = Math.max(1, ...quintetos.aFavor.map((q) => q.count))
  const maxQuintetoAgainst = Math.max(1, ...quintetos.enContra.map((q) => q.count))

  if (matches.length === 0) {
    return (
      <div className="empty-state">
        <PieChart size={36} />
        <h3>Todavía no hay partidos importados</h3>
        <p>Pulsa "Subir informe (NPA Stats)" y selecciona el archivo para traer los datos de los partidos.</p>
      </div>
    )
  }

  const diff = stats.goles - stats.encajados

  return (
    <>
      <div className="card hero-card" style={{ padding: 22, marginBottom: 16 }}>
        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          <Trophy size={17} />
          <h4 style={{ color: '#fff', margin: 0 }}>Balance de la temporada</h4>
        </div>
        <div className="row" style={{ gap: 28, flexWrap: 'wrap' }}>
          <div>
            <div className="hero-card__value" style={{ fontSize: 34 }}>{stats.victorias}-{stats.empates}-{stats.derrotas}</div>
            <div className="hero-card__label">V-E-D en {stats.partidos} partido{stats.partidos === 1 ? '' : 's'}</div>
          </div>
          <div>
            <div className="hero-card__value" style={{ fontSize: 34 }}>{stats.goles}-{stats.encajados}</div>
            <div className="hero-card__label">Goles a favor - en contra</div>
          </div>
          <div>
            <div className="hero-card__value" style={{ fontSize: 34 }}>{diff > 0 ? '+' : ''}{diff}</div>
            <div className="hero-card__label">Diferencia de goles</div>
          </div>
          <div>
            <div className="hero-card__value" style={{ fontSize: 34 }}>{stats.shotsOn}</div>
            <div className="hero-card__label">Tiros a puerta</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="leaderboard-card__head">
            <div className="icon-chip" style={{ '--chip-color': 'var(--red-600)' }}><Goal size={15} /></div>
            <h4>Goles esperados a favor</h4>
          </div>
          {(() => {
            const xgTotal = rows.reduce((s, r) => s + r.xgFor, 0)
            const max = Math.max(stats.goles, xgTotal, 1)
            return (
              <div className="stack" style={{ gap: 8 }}>
                <div className="leaderboard-name-row">
                  <span className="leaderboard-name">Reales</span>
                  <span className="leaderboard-value" style={{ color: 'var(--red-600)' }}>{stats.goles}</span>
                </div>
                <div className="leaderboard-bar-track"><div className="leaderboard-bar-fill" style={{ width: `${(stats.goles / max) * 100}%`, background: 'linear-gradient(90deg, var(--red-700), var(--red-500))' }} /></div>
                <div className="leaderboard-name-row">
                  <span className="leaderboard-name">Esperados</span>
                  <span className="leaderboard-value" style={{ color: 'var(--ink-500)' }}>{xgTotal.toFixed(1)}</span>
                </div>
                <div className="leaderboard-bar-track"><div className="leaderboard-bar-fill" style={{ width: `${(xgTotal / max) * 100}%`, background: 'var(--gray-300)' }} /></div>
              </div>
            )
          })()}
          <p className="field__help" style={{ marginTop: 10 }}>Estimado a partir de los tiros a puerta y la conversión real (no es un xG por calidad de tiro).</p>
        </div>

        <div className="card">
          <div className="leaderboard-card__head">
            <div className="icon-chip" style={{ '--chip-color': 'var(--blue-600)' }}><ShieldAlert size={15} /></div>
            <h4>Goles esperados en contra</h4>
          </div>
          {(() => {
            const xgTotal = rows.reduce((s, r) => s + r.xgAgainst, 0)
            const max = Math.max(stats.encajados, xgTotal, 1)
            return (
              <div className="stack" style={{ gap: 8 }}>
                <div className="leaderboard-name-row">
                  <span className="leaderboard-name">Reales</span>
                  <span className="leaderboard-value" style={{ color: 'var(--blue-600)' }}>{stats.encajados}</span>
                </div>
                <div className="leaderboard-bar-track"><div className="leaderboard-bar-fill" style={{ width: `${(stats.encajados / max) * 100}%`, background: 'linear-gradient(90deg, var(--blue-700), var(--blue-500))' }} /></div>
                <div className="leaderboard-name-row">
                  <span className="leaderboard-name">Esperados</span>
                  <span className="leaderboard-value" style={{ color: 'var(--ink-500)' }}>{xgTotal.toFixed(1)}</span>
                </div>
                <div className="leaderboard-bar-track"><div className="leaderboard-bar-fill" style={{ width: `${(xgTotal / max) * 100}%`, background: 'var(--gray-300)' }} /></div>
              </div>
            )
          })()}
          <p className="field__help" style={{ marginTop: 10 }}>Estimado a partir de las ocasiones del rival y la tasa de encaje real.</p>
        </div>

        <div className="card">
          <div className="leaderboard-card__head">
            <div className="icon-chip" style={{ '--chip-color': 'var(--red-600)' }}><Users2 size={15} /></div>
            <h4>Quintetos que más anotan</h4>
          </div>
          {quintetos.aFavor.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 12.5 }}>Sin goles con quinteto registrado todavía.</p>
          ) : (
            <div className="stack" style={{ gap: 14 }}>
              {quintetos.aFavor.map((q, i) => (
                <QuintetoRow key={i} q={q} max={maxQuintetoFor} textColor="var(--red-600)" barColor="linear-gradient(90deg, var(--red-700), var(--red-500))" players={players} />
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="leaderboard-card__head">
            <div className="icon-chip" style={{ '--chip-color': 'var(--blue-600)' }}><Users2 size={15} /></div>
            <h4>Quintetos que más encajan</h4>
          </div>
          {quintetos.enContra.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 12.5 }}>Sin goles en contra con quinteto registrado todavía.</p>
          ) : (
            <div className="stack" style={{ gap: 14 }}>
              {quintetos.enContra.map((q, i) => (
                <QuintetoRow key={i} q={q} max={maxQuintetoAgainst} textColor="var(--blue-600)" barColor="linear-gradient(90deg, var(--blue-700), var(--blue-500))" players={players} />
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="leaderboard-card__head">
            <div className="icon-chip" style={{ '--chip-color': 'var(--red-600)' }}><PieChart size={15} /></div>
            <h4>¿De qué fase vienen nuestros goles?</h4>
          </div>
          {fases.aFavor.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 12.5 }}>Sin datos de fase todavía.</p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {fases.aFavor.map((f) => (
                <PhaseBar key={f.phase} phase={f.phase} count={f.count} max={maxFaseFor} color="linear-gradient(90deg, var(--red-700), var(--red-500))" />
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="leaderboard-card__head">
            <div className="icon-chip" style={{ '--chip-color': 'var(--blue-600)' }}><PieChart size={15} /></div>
            <h4>¿De qué fase vienen los goles del rival?</h4>
          </div>
          {fases.enContra.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 12.5 }}>Sin datos de fase todavía.</p>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {fases.enContra.map((f) => (
                <PhaseBar key={f.phase} phase={f.phase} count={f.count} max={maxFaseAgainst} color="linear-gradient(90deg, var(--blue-700), var(--blue-500))" />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
