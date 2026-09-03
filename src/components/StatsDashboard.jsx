import { useState } from 'react'
import { Goal, ShieldAlert, Users2, PieChart, Trophy, Target, Hand, Pencil } from 'lucide-react'
import { summarize, buildMatchRows, computeQuintetos, matchPlayerByName } from '../statsEngine.js'
import { updatePartidoNpa } from '../db.js'
import PlayerAvatar from './PlayerAvatar.jsx'
import FaseGolStats from './FaseGolStats.jsx'
import PlayerStatsTable from './PlayerStatsTable.jsx'

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

// El mismo panel de estadísticas (tiles + xG + quintetos + fases) sirve tanto
// para el global de la temporada como para un único partido — solo cambia el
// array `matches` que se le pasa (toda la temporada, o [ese partido]).
export default function StatsDashboard({ matches, players, onChanged }) {
  const [editingResultado, setEditingResultado] = useState(false)
  const stats = summarize(matches)
  const rows = buildMatchRows(matches)
  const quintetos = computeQuintetos(matches)
  const maxQuintetoFor = Math.max(1, ...quintetos.aFavor.map((q) => q.count))
  const maxQuintetoAgainst = Math.max(1, ...quintetos.enContra.map((q) => q.count))
  // El resultado final solo se puede corregir viendo un partido concreto —
  // sobre un agregado de varios no habría un partido claro al que aplicarlo.
  const editableMatchId = matches.length === 1 ? matches[0].id : null

  function handleResultadoBlur(field, rawValue) {
    const value = Math.max(0, Math.round(Number(rawValue)) || 0)
    updatePartidoNpa(editableMatchId, { [field]: value })
    onChanged?.()
  }

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
        <div className="row spread" style={{ marginBottom: 16 }}>
          <div className="row" style={{ gap: 8 }}>
            <Trophy size={17} />
            <h4 style={{ color: '#fff', margin: 0 }}>Balance de la temporada</h4>
          </div>
          {editableMatchId && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setEditingResultado((v) => !v)}
              style={{ color: '#fff', background: editingResultado ? 'rgba(255,255,255,0.25)' : 'transparent', borderColor: '#fff' }}
              title={editingResultado ? 'Dejar de editar' : 'Corregir el resultado de este partido'}
            >
              <Pencil size={12} />
              {editingResultado ? 'Editando' : 'Editar'}
            </button>
          )}
        </div>
        <div className="row" style={{ gap: 28, flexWrap: 'wrap' }}>
          <div>
            <div className="hero-card__value" style={{ fontSize: 34 }}>{stats.victorias}-{stats.empates}-{stats.derrotas}</div>
            <div className="hero-card__label">V-E-D en {stats.partidos} partido{stats.partidos === 1 ? '' : 's'}</div>
          </div>
          <div>
            {editableMatchId && editingResultado ? (
              <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                <input
                  type="number"
                  min="0"
                  defaultValue={stats.goles}
                  onBlur={(e) => handleResultadoBlur('teamGoals', e.target.value)}
                  style={{ width: 52, fontSize: 22, textAlign: 'center', padding: '2px 4px' }}
                />
                <span className="hero-card__value" style={{ fontSize: 34 }}>-</span>
                <input
                  type="number"
                  min="0"
                  defaultValue={stats.encajados}
                  onBlur={(e) => handleResultadoBlur('rivalScore', e.target.value)}
                  style={{ width: 52, fontSize: 22, textAlign: 'center', padding: '2px 4px' }}
                />
              </div>
            ) : (
              <div className="hero-card__value" style={{ fontSize: 34 }}>{stats.goles}-{stats.encajados}</div>
            )}
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
          <p className="field__help" style={{ marginTop: 10 }}>Pondera cada tiro a puerta, al palo y fuera con un peso distinto sobre la conversión real de la temporada (no es un xG por calidad/localización real del tiro).</p>
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
          <p className="field__help" style={{ marginTop: 10 }}>A partir de las paradas de nuestros porteros (tiros a puerta que de verdad afrontó la portería: paradas + goles encajados) y la tasa de encaje real.</p>
        </div>

        <div className="card">
          <div className="leaderboard-card__head">
            <div className="icon-chip" style={{ '--chip-color': 'var(--gold-600)' }}><Target size={15} /></div>
            <h4>Tiros</h4>
          </div>
          {(() => {
            const total = stats.shotsOn + stats.shotsOff + stats.shotsPost
            const rows2 = [
              { label: 'A puerta', value: stats.shotsOn, color: 'var(--success-600)' },
              { label: 'Al palo', value: stats.shotsPost, color: 'var(--warn-600)' },
              { label: 'Fuera', value: stats.shotsOff, color: 'var(--ink-300)' },
            ]
            const max = Math.max(1, ...rows2.map((r) => r.value))
            return total === 0 ? (
              <p className="text-muted" style={{ fontSize: 12.5 }}>Sin tiros registrados todavía.</p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {rows2.map((r) => (
                  <div key={r.label} className="phase-row">
                    <span className="phase-row__label">{r.label}</span>
                    <div className="leaderboard-bar-track" style={{ flex: 1 }}>
                      <div className="leaderboard-bar-fill" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
                    </div>
                    <span className="phase-row__count">{r.value}</span>
                  </div>
                ))}
              </div>
            )
          })()}
          <div className="row" style={{ gap: 6, marginTop: 12 }}>
            <Hand size={13} color="var(--blue-600)" />
            <span style={{ fontSize: 12.5 }}>{stats.saves} parada{stats.saves === 1 ? '' : 's'} de nuestros porteros</span>
          </div>
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

      </div>

      <FaseGolStats matches={matches} />
      <PlayerStatsTable players={players} matches={matches} onChanged={onChanged} />
    </>
  )
}
