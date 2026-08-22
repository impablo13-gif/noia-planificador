import { useState } from 'react'
import { Bandage, Plus, AlertTriangle } from 'lucide-react'
import { getInjuries, getPlayers } from '../db.js'
import PlayerAvatar from './PlayerAvatar.jsx'
import InjuryModal from './InjuryModal.jsx'
import PageHeader from './PageHeader.jsx'
import { formatDateShort, parseISODate } from '../dateUtils.js'

const ESTADO_BADGE = {
  'Activa': 'badge-danger',
  'En recuperación': 'badge-gold',
  'De alta': 'badge-success',
}

export default function InjuriesView() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const injuries = getInjuries()
  const players = getPlayers()
  const activas = injuries.filter((i) => i.estado === 'Activa')

  const [filter, setFilter] = useState(null)
  const activeFilter = filter || (activas.length > 0 ? 'Activa' : 'Todas')
  const visible = activeFilter === 'Todas' ? injuries : injuries.filter((i) => i.estado === activeFilter)

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  function playerFor(injury) {
    return players.find((p) => p.id === injury.playerId)
  }

  return (
    <div>
      <PageHeader icon={Bandage} title="Lesiones" hint="Seguimiento médico de la plantilla">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})} disabled={players.length === 0}>
          <Plus size={15} />
          Nueva lesión
        </button>
      </PageHeader>

      {activas.length > 0 ? (
        <div className="banner banner-danger" style={{ marginBottom: 16 }}>
          <AlertTriangle size={16} />
          <div>
            <strong>{activas.length} jugador{activas.length === 1 ? '' : 'es'} de baja ahora mismo:</strong>{' '}
            {activas.map((i) => playerFor(i)?.nombre || '—').join(', ')}
          </div>
        </div>
      ) : (
        <div className="banner banner-info" style={{ marginBottom: 16 }}>
          Sin bajas activas en este momento.
        </div>
      )}

      {injuries.length > 0 && (
        <div className="chip-group" style={{ marginBottom: 16 }}>
          {['Activa', 'En recuperación', 'De alta', 'Todas'].map((f) => (
            <button key={f} type="button" className={`chip${activeFilter === f ? ' is-active' : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      )}

      {injuries.length === 0 ? (
        <div className="empty-state">
          <Bandage size={36} />
          <h3>Sin lesiones registradas</h3>
          <p>Cuando haya alguna baja, regístrala aquí con "Nueva lesión".</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="text-muted">Ninguna lesión con este estado.</p>
      ) : (
        <div className="tile-grid">
          {visible.map((i) => {
            const p = playerFor(i)
            return (
              <div key={i.id} className="tile-card" onClick={() => setEditing(i)}>
                <div className="tile-card__top">
                  <PlayerAvatar fileId={p?.fotoFileId} />
                  <div>
                    <div className="tile-card__name">{p?.nombre || 'Jugador eliminado'}</div>
                    <div className="tile-card__meta">{i.zona} · {i.tipo}</div>
                  </div>
                </div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <span className={`badge ${ESTADO_BADGE[i.estado] || 'badge-gray'}`}>{i.estado}</span>
                  {i.fechaLesion && (
                    <span className="badge badge-gray">
                      desde {formatDateShort(parseISODate(i.fechaLesion))}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <InjuryModal
          injury={editing}
          players={players}
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
