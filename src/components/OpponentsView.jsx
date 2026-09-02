import { useState, useEffect } from 'react'
import { ShieldPlus, ShieldHalf, Video } from 'lucide-react'
import { getOpponents, getAnalisisProyectos, getAnalisisEventos } from '../db.js'
import OpponentModal from './OpponentModal.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import PageHeader from './PageHeader.jsx'

export default function OpponentsView({ initialOpponentId, onConsumeInitial, onGoToAnalisis }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const opponents = getOpponents()
  const analisisProyectos = getAnalisisProyectos()

  function videoEventCount(opponentId) {
    return analisisProyectos
      .filter((p) => p.opponentId === opponentId)
      .reduce((sum, p) => sum + getAnalisisEventos(p.id).length, 0)
  }

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
      <PageHeader icon={ShieldHalf} title="Rivales" hint={`División de Honor Juvenil, Grupo 1 · ${opponents.length} equipos`}>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ scouting: {} })}>
          <ShieldPlus size={15} />
          Añadir rival
        </button>
      </PageHeader>

      <div className="tile-grid">
        {opponents.map((o) => (
          <div key={o.id} className="tile-card tile-card--opponent" onClick={() => setEditing(o)}>
            <div className="tile-card__top">
              <PlayerAvatar fileId={o.shieldFileId} size="shield" />
              <div>
                <div className="tile-card__name">{o.name}</div>
                <div className="tile-card__meta">{o.pabellon && o.pabellon !== '—' ? o.pabellon : 'Pabellón sin datos'}</div>
              </div>
            </div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {o.scouting?.highlights?.length > 0 ? (
                <span className="badge badge-success">Scouting anotado</span>
              ) : (
                <span className="badge badge-gray">
                  <ShieldHalf size={11} /> Sin scouting aún
                </span>
              )}
              {videoEventCount(o.id) > 0 && (
                <span className="badge badge-red">
                  <Video size={11} /> {videoEventCount(o.id)} evento{videoEventCount(o.id) === 1 ? '' : 's'} de vídeo
                </span>
              )}
            </div>
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
          onGoToAnalisis={onGoToAnalisis}
        />
      )}
    </div>
  )
}
