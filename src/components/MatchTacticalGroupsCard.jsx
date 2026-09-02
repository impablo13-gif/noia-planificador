import { useState } from 'react'
import { Layers3, Plus, Trash2 } from 'lucide-react'
import { updateMatch } from '../db.js'
import PlayerAvatar from './PlayerAvatar.jsx'

// Agrupaciones tácticas del partido (power-play, ABP ofensiva/defensiva,
// unidad de saque de banda…) — quintetos que se repiten en situaciones
// concretas, para tenerlos listos antes de que aparezca la situación en
// pista, no improvisarlos sobre la marcha. Vive en el propio partido
// (match.gruposTacticos), no en la plantilla, porque puede cambiar de un
// rival a otro.
export default function MatchTacticalGroupsCard({ matchId, grupos, players, onChanged }) {
  const [nuevoNombre, setNuevoNombre] = useState('')

  function save(next) {
    updateMatch(matchId, { gruposTacticos: next })
    onChanged()
  }

  function handleAddGrupo() {
    const nombre = nuevoNombre.trim()
    if (!nombre) return
    save([...grupos, { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, nombre, playerIds: [] }])
    setNuevoNombre('')
  }

  function handleRemoveGrupo(id) {
    save(grupos.filter((g) => g.id !== id))
  }

  function toggleJugador(grupoId, playerId) {
    save(grupos.map((g) => {
      if (g.id !== grupoId) return g
      const has = g.playerIds.includes(playerId)
      return { ...g, playerIds: has ? g.playerIds.filter((id) => id !== playerId) : [...g.playerIds, playerId] }
    }))
  }

  return (
    <div className="card">
      <div className="row" style={{ gap: 9, marginBottom: 4 }}>
        <div className="icon-chip" style={{ '--chip-color': 'var(--violet-600)' }}><Layers3 size={15} /></div>
        <h4 style={{ margin: 0, fontSize: 14 }}>Grupos tácticos del partido</h4>
      </div>
      <p className="section-hint" style={{ marginTop: 4, marginBottom: 10 }}>
        Quintetos o unidades para situaciones concretas — power-play, ABP a favor/en contra, saques de banda…
      </p>

      {grupos.length > 0 && (
        <div className="stack" style={{ gap: 10, marginBottom: 10 }}>
          {grupos.map((g) => (
            <div key={g.id} className="card" style={{ padding: 10, background: 'var(--gray-50)' }}>
              <div className="row spread" style={{ marginBottom: 6 }}>
                <strong style={{ fontSize: 13 }}>{g.nombre}</strong>
                <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => handleRemoveGrupo(g.id)}>
                  <Trash2 size={13} color="var(--danger-600)" />
                </button>
              </div>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                {players.map((p) => {
                  const active = g.playerIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`chip${active ? ' is-active' : ''}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 3px' }}
                      onClick={() => toggleJugador(g.id, p.id)}
                    >
                      <PlayerAvatar fileId={p.fotoFileId} size="xs" />
                      {p.dorsal ? `#${p.dorsal} ` : ''}{p.nombre}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 6 }}>
        <input
          type="text"
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Ej. Power-play 5x4…"
          style={{ flex: 1 }}
          onKeyDown={(e) => e.key === 'Enter' && handleAddGrupo()}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddGrupo} disabled={!nuevoNombre.trim()}>
          <Plus size={13} />
          Añadir grupo
        </button>
      </div>
    </div>
  )
}
