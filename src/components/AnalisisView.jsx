import { useState } from 'react'
import { Video, Plus, ArrowLeft, Pencil, ShieldHalf, Users } from 'lucide-react'
import { getAnalisisProyectos, getOpponents, getAnalisisEventos } from '../db.js'
import PageHeader from './PageHeader.jsx'
import AnalisisProjectModal from './AnalisisProjectModal.jsx'
import AnalisisProjectPanel from './AnalisisProjectPanel.jsx'

export default function AnalisisView() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const [openId, setOpenId] = useState(null)

  const proyectos = getAnalisisProyectos()
  const opponents = getOpponents()
  const open = openId ? proyectos.find((p) => p.id === openId) : null

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  function opponentName(id) {
    return opponents.find((o) => o.id === id)?.name || 'Rival'
  }

  if (open) {
    return (
      <div>
        <div className="row spread" style={{ marginBottom: 12 }}>
          <button type="button" className="link-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setOpenId(null)}>
            <ArrowLeft size={14} />
            Volver a proyectos
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(open)}>
            <Pencil size={13} />
            Editar proyecto
          </button>
        </div>
        <PageHeader
          icon={open.tipo === 'rival' ? ShieldHalf : Users}
          title={open.nombre}
          hint={open.tipo === 'rival' ? `Scouting de ${opponentName(open.opponentId)}` : 'Análisis propio'}
        />
        <AnalisisProjectPanel proyecto={open} onChanged={bump} />

        {editing && (
          <AnalisisProjectModal
            proyecto={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); bump() }}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader icon={Video} title="Análisis de vídeo" hint="Etiqueta eventos sobre el vídeo, propio o de un rival, y revísalos después">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={15} />
          Nuevo proyecto
        </button>
      </PageHeader>

      {proyectos.length === 0 ? (
        <div className="banner banner-info">Todavía no hay ningún proyecto de análisis — crea uno y sube o enlaza un vídeo para empezar a etiquetar.</div>
      ) : (
        <div className="tile-grid">
          {proyectos.map((p) => {
            const numEventos = getAnalisisEventos(p.id).length
            return (
              <div key={p.id} className="tile-card" onClick={() => setOpenId(p.id)}>
                <div className="tile-card__top">
                  <div className="icon-chip" style={{ '--chip-color': p.tipo === 'rival' ? 'var(--red-600)' : 'var(--blue-600)' }}>
                    {p.tipo === 'rival' ? <ShieldHalf size={16} /> : <Users size={16} />}
                  </div>
                  <div>
                    <div className="tile-card__name">{p.nombre}</div>
                    <div className="tile-card__meta">{p.tipo === 'rival' ? opponentName(p.opponentId) : 'Equipo propio'}</div>
                  </div>
                </div>
                <span className="badge badge-gray">{numEventos} evento{numEventos === 1 ? '' : 's'} marcado{numEventos === 1 ? '' : 's'}</span>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <AnalisisProjectModal
          proyecto={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); bump() }}
        />
      )}
    </div>
  )
}
