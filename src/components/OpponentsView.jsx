import { useState, useEffect } from 'react'
import { ShieldPlus, ShieldHalf } from 'lucide-react'
import { getOpponents } from '../db.js'
import OpponentModal from './OpponentModal.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'

export default function OpponentsView({ initialOpponentId, onConsumeInitial }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const opponents = getOpponents()

  useEffect(() => {
    if (!initialOpponentId) return
    const found = opponents.find((o) => o.id === initialOpponentId)
    if (found) setEditing(found)
    onConsumeInitial?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpponentId])

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div>
      <div className="row spread" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">Rivales</h2>
          <p className="section-hint">División de Honor Juvenil, Grupo 1 · {opponents.length} equipos</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ scouting: {} })}>
          <ShieldPlus size={15} />
          Añadir rival
        </button>
      </div>

      <div className="tile-grid">
        {opponents.map((o) => (
          <div key={o.id} className="tile-card" onClick={() => setEditing(o)}>
            <div className="tile-card__top">
              <PlayerAvatar fileId={o.shieldFileId} />
              <div>
                <div className="tile-card__name">{o.name}</div>
                <div className="tile-card__meta">{o.pabellon && o.pabellon !== '—' ? o.pabellon : 'Pabellón sin datos'}</div>
              </div>
            </div>
            {o.scouting?.highlights?.length > 0 ? (
              <span className="badge badge-success">Scouting anotado</span>
            ) : (
              <span className="badge badge-gray">
                <ShieldHalf size={11} /> Sin scouting aún
              </span>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <OpponentModal
          opponent={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            bump()
          }}
        />
      )}
    </div>
  )
}
