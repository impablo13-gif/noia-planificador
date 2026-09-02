import { useEffect, useState } from 'react'
import { Dumbbell, Plus, Image as ImageIcon } from 'lucide-react'
import { getTareas, getFile, TAREA_MOMENTOS } from '../db.js'
import PageHeader from './PageHeader.jsx'
import TareaModal from './TareaModal.jsx'

function TareaThumb({ fileId }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    if (!fileId) { setUrl(null); return }
    getFile(fileId).then((record) => {
      if (cancelled || !record) return
      objectUrl = URL.createObjectURL(record.blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])

  if (url) return <img src={url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
  return (
    <div className="icon-chip" style={{ '--chip-color': 'var(--blue-600)' }}>
      <ImageIcon size={16} />
    </div>
  )
}

// Biblioteca de ejercicios de entrenamiento reutilizables entre sesiones —
// con foto/diagrama y vídeo opcional, filtrable por contenido y momento de
// la sesión, igual que la biblioteca de tareas de Fixo.
export default function TareasView() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const [momentoFiltro, setMomentoFiltro] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  const tareas = getTareas().filter((t) => {
    if (momentoFiltro && t.momento !== momentoFiltro) return false
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      if (!t.nombre.toLowerCase().includes(q) && !t.contenido.toLowerCase().includes(q)) return false
    }
    return true
  })

  return (
    <div>
      <PageHeader icon={Dumbbell} title="Tareas" hint="Biblioteca de ejercicios reutilizables entre sesiones">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={15} />
          Nueva tarea
        </button>
      </PageHeader>

      <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o contenido…"
          style={{ maxWidth: 260 }}
        />
        <div className="chip-group">
          <button type="button" className={`chip${!momentoFiltro ? ' is-active' : ''}`} onClick={() => setMomentoFiltro(null)}>Todas</button>
          {TAREA_MOMENTOS.map((m) => (
            <button key={m} type="button" className={`chip${momentoFiltro === m ? ' is-active' : ''}`} onClick={() => setMomentoFiltro(m)}>{m}</button>
          ))}
        </div>
      </div>

      {tareas.length === 0 ? (
        <div className="banner banner-info">Sin tareas todavía — crea la primera con "Nueva tarea".</div>
      ) : (
        <div className="tile-grid">
          {tareas.map((t) => (
            <div key={t.id} className="tile-card" onClick={() => setEditing(t)}>
              <div className="tile-card__top">
                <TareaThumb fileId={t.fotoFileId} />
                <div>
                  <div className="tile-card__name">{t.nombre}</div>
                  <div className="tile-card__meta">{t.contenido || 'Sin contenido especificado'}</div>
                </div>
              </div>
              <span className="badge badge-gray">{t.momento}</span>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <TareaModal
          tarea={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); bump() }}
        />
      )}
    </div>
  )
}
