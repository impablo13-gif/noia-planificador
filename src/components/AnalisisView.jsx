import { useState, useEffect } from 'react'
import { Video, Plus, ArrowLeft, Pencil, ShieldHalf, Users, Film, Play, Star } from 'lucide-react'
import { getAnalisisProyectos, getOpponents, getAnalisisEventos } from '../db.js'
import PageHeader from './PageHeader.jsx'
import AnalisisProjectModal from './AnalisisProjectModal.jsx'
import AnalisisProjectPanel from './AnalisisProjectPanel.jsx'

function formatTime(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function AnalisisView({ initialProyectoId, onConsumeInitial }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [initialEventId, setInitialEventId] = useState(null)
  const [vista, setVista] = useState('proyectos') // 'proyectos' | 'videoteca'
  const [videotecaFiltro, setVideotecaFiltro] = useState('todos') // 'todos' | 'propio' | 'rival'

  const proyectos = getAnalisisProyectos()
  const opponents = getOpponents()
  const open = openId ? proyectos.find((p) => p.id === openId) : null

  useEffect(() => {
    if (!initialProyectoId) return
    const found = proyectos.find((p) => p.id === initialProyectoId)
    if (found) setOpenId(found.id)
    onConsumeInitial?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProyectoId])

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  function opponentName(id) {
    return opponents.find((o) => o.id === id)?.name || 'Rival'
  }

  function openClip(proyectoId, eventId) {
    setInitialEventId(eventId)
    setOpenId(proyectoId)
  }

  if (open) {
    return (
      <div>
        <div className="row spread" style={{ marginBottom: 12 }}>
          <button type="button" className="link-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => { setOpenId(null); setInitialEventId(null) }}>
            <ArrowLeft size={14} />
            Volver
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
        <AnalisisProjectPanel proyecto={open} onChanged={bump} initialEventId={initialEventId} />

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

      <div className="chip-group" style={{ marginBottom: 16 }}>
        <button type="button" className={`chip${vista === 'proyectos' ? ' is-active' : ''}`} onClick={() => setVista('proyectos')}>Proyectos</button>
        <button type="button" className={`chip${vista === 'videoteca' ? ' is-active' : ''}`} onClick={() => setVista('videoteca')}>
          <Film size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
          Videoteca
        </button>
      </div>

      {vista === 'proyectos' ? (
        proyectos.length === 0 ? (
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
        )
      ) : (
        <VideotecaTab
          proyectos={proyectos}
          filtro={videotecaFiltro}
          onFiltroChange={setVideotecaFiltro}
          opponentName={opponentName}
          onOpenClip={openClip}
        />
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

// Vista agregada de todos los clips etiquetados en todos los proyectos —
// para revisar lo último marcado sin tener que ir entrando proyecto a
// proyecto, igual que la "videoteca" de Fixo.
function VideotecaTab({ proyectos, filtro, onFiltroChange, opponentName, onOpenClip }) {
  const clips = proyectos
    .filter((p) => filtro === 'todos' || p.tipo === filtro)
    .flatMap((p) => getAnalisisEventos(p.id).map((e) => ({ ...e, proyecto: p })))
    .sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div>
      <div className="chip-group" style={{ marginBottom: 12 }}>
        <button type="button" className={`chip${filtro === 'todos' ? ' is-active' : ''}`} onClick={() => onFiltroChange('todos')}>Todos</button>
        <button type="button" className={`chip${filtro === 'propio' ? ' is-active' : ''}`} onClick={() => onFiltroChange('propio')}>Propio</button>
        <button type="button" className={`chip${filtro === 'rival' ? ' is-active' : ''}`} onClick={() => onFiltroChange('rival')}>Rivales</button>
      </div>

      {clips.length === 0 ? (
        <div className="banner banner-info">Sin clips etiquetados todavía en esta categoría.</div>
      ) : (
        <div className="card">
          <div className="stack" style={{ gap: 4 }}>
            {clips.map((c) => (
              <button
                key={c.id}
                type="button"
                className="match-row"
                style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                onClick={() => onOpenClip(c.proyecto.id, c.id)}
              >
                <Play size={13} color="var(--ink-300)" />
                {c.enPresentacion && <Star size={12} color="var(--gold-600)" fill="var(--gold-600)" />}
                <span style={{ minWidth: 140 }}>{c.label}</span>
                <span className="text-muted" style={{ fontSize: 12 }}>{formatTime(c.startTime)}–{formatTime(c.endTime)}</span>
                <span style={{ flex: 1 }} />
                <span className="badge badge-gray">
                  {c.proyecto.tipo === 'rival' ? opponentName(c.proyecto.opponentId) : 'Propio'} · {c.proyecto.nombre}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
