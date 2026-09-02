import { Printer, ShieldHalf, Layers3, Users2 } from 'lucide-react'
import Modal from './Modal.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import { formatDateLong, parseISODate } from '../dateUtils.js'

const SCOUTING_FIELDS = [
  { key: 'sistemaJuego', label: 'Sistema de juego' },
  { key: 'puntosFuertes', label: 'Puntos fuertes' },
  { key: 'puntosDebiles', label: 'Puntos débiles' },
  { key: 'jugadoresClave', label: 'Jugadores clave' },
  { key: 'abp', label: 'ABP' },
]

// Documento único para llevar a pista o repasar antes del partido: reúne lo
// que ya está esparcido en tres sitios (scouting del rival, grupos tácticos
// del propio partido, observaciones) en una sola vista imprimible/PDF, en
// vez de ir abriendo cada ficha por separado el día del partido.
export default function MatchPlanModal({ match, opponent, players, onClose }) {
  const scouting = opponent?.scouting || {}
  const grupos = match.gruposTacticos || []

  function playerName(id) {
    const p = players.find((pl) => pl.id === id)
    return p ? { nombre: p.nombre, dorsal: p.dorsal, fotoFileId: p.fotoFileId } : null
  }

  return (
    <Modal title={`Plan de partido${opponent ? ` — ${opponent.name}` : ''}`} onClose={onClose} maxWidth={640}>
      <div className="no-print row" style={{ marginBottom: 14 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
          <Printer size={13} />
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="stack">
        <div className="hero-card card" style={{ padding: 16 }}>
          <div className="row" style={{ gap: 12, alignItems: 'center' }}>
            {opponent && <PlayerAvatar fileId={opponent.shieldFileId} size="lg" />}
            <div>
              <div className="hero-card__value" style={{ fontSize: 20 }}>{opponent?.name || match.rivalName || 'Rival'}</div>
              <div className="hero-card__label">{formatDateLong(parseISODate(match.date))}{match.time ? ` · ${match.time}` : ''}{match.superficie ? ` · ${match.superficie}` : ''}</div>
            </div>
          </div>
        </div>

        {opponent && (
          <div className="card">
            <div className="row" style={{ gap: 9, marginBottom: 8 }}>
              <div className="icon-chip" style={{ '--chip-color': 'var(--red-600)' }}><ShieldHalf size={15} /></div>
              <h4 style={{ margin: 0, fontSize: 14 }}>Scouting</h4>
            </div>
            {scouting.resumen && <p style={{ fontSize: 13, marginTop: 0 }}>{scouting.resumen}</p>}
            <div className="stack" style={{ gap: 8 }}>
              {SCOUTING_FIELDS.map((f) => (
                scouting[f.key] ? (
                  <div key={f.key}>
                    <strong style={{ fontSize: 12.5 }}>{f.label}: </strong>
                    <span style={{ fontSize: 12.5 }}>{scouting[f.key]}</span>
                  </div>
                ) : null
              ))}
              {SCOUTING_FIELDS.every((f) => !scouting[f.key]) && !scouting.resumen && (
                <p className="text-muted" style={{ fontSize: 12.5 }}>Sin pinceladas de scouting guardadas todavía.</p>
              )}
            </div>
          </div>
        )}

        <div className="card">
          <div className="row" style={{ gap: 9, marginBottom: 8 }}>
            <div className="icon-chip" style={{ '--chip-color': 'var(--violet-600)' }}><Layers3 size={15} /></div>
            <h4 style={{ margin: 0, fontSize: 14 }}>Grupos tácticos</h4>
          </div>
          {grupos.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 12.5 }}>Sin grupos tácticos definidos para este partido.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {grupos.map((g) => (
                <div key={g.id}>
                  <strong style={{ fontSize: 12.5 }}>{g.nombre}</strong>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {g.playerIds.length === 0 ? (
                      <span className="text-muted" style={{ fontSize: 12 }}>Sin jugadores asignados.</span>
                    ) : (
                      g.playerIds.map((id) => {
                        const p = playerName(id)
                        if (!p) return null
                        return (
                          <span key={id} className="badge badge-gray" style={{ gap: 5 }}>
                            <PlayerAvatar fileId={p.fotoFileId} size="xs" />
                            {p.dorsal ? `#${p.dorsal} ` : ''}{p.nombre}
                          </span>
                        )
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {match.observaciones && (
          <div className="card">
            <div className="row" style={{ gap: 9, marginBottom: 8 }}>
              <div className="icon-chip" style={{ '--chip-color': 'var(--blue-600)' }}><Users2 size={15} /></div>
              <h4 style={{ margin: 0, fontSize: 14 }}>Observaciones</h4>
            </div>
            <p style={{ fontSize: 13, margin: 0 }}>{match.observaciones}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
