import { useEffect, useState } from 'react'
import { Dumbbell, Plus, Image as ImageIcon, FileText, Download, Paperclip } from 'lucide-react'
import { getTareas, getFile, saveFile, updateTarea, addTareasBulk, TAREA_MOMENTOS } from '../db.js'
import PageHeader from './PageHeader.jsx'
import TareaModal from './TareaModal.jsx'
import catalogoRfef from '../tareasCatalogoRfef.json'

function TareaThumb({ fileId }) {
  const [url, setUrl] = useState(null)
  const [isPdf, setIsPdf] = useState(false)
  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    if (!fileId) { setUrl(null); setIsPdf(false); return }
    getFile(fileId).then((record) => {
      if (cancelled || !record) return
      if (record.type === 'application/pdf') {
        setIsPdf(true)
        setUrl(null)
      } else {
        setIsPdf(false)
        objectUrl = URL.createObjectURL(record.blob)
        setUrl(objectUrl)
      }
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])

  if (url) return <img src={url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} />
  return (
    <div className="icon-chip" style={{ '--chip-color': isPdf ? 'var(--red-600)' : 'var(--blue-600)' }}>
      {isPdf ? <FileText size={16} /> : <ImageIcon size={16} />}
    </div>
  )
}

// Botón de importación masiva del catálogo real de ~200 tareas RFEF (nombre,
// contenido, espacio/tiempo, consigna...) empaquetado con la app -- funciona
// sin ninguna acción extra, no depende de tener los PDF a mano.
function ImportCatalogoButton({ onImported }) {
  const [msg, setMsg] = useState('')

  function handleImport() {
    const { added, skipped } = addTareasBulk(catalogoRfef)
    setMsg(`${added} tarea${added === 1 ? '' : 's'} nueva${added === 1 ? '' : 's'} importada${added === 1 ? '' : 's'}${skipped ? ` · ${skipped} ya estaba${skipped === 1 ? '' : 'n'}` : ''}.`)
    onImported()
  }

  return (
    <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
      <button type="button" className="btn btn-secondary" onClick={handleImport}>
        <Download size={15} />
        Importar catálogo RFEF ({catalogoRfef.length})
      </button>
      {msg && <span className="text-muted" style={{ fontSize: 12.5 }}>{msg}</span>}
    </div>
  )
}

// Las tareas importadas traen el diagrama gráfico solo como referencia al
// nombre de su PDF original (pdfFilename) -- adjuntarlo de verdad exige el
// archivo, que solo Pablo tiene en su E:. Este botón deja seleccionar de
// golpe todos los PDF de la carpeta y los empareja por nombre de archivo.
function AdjuntarDiagramasButton({ onAttached }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleFiles(e) {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (files.length === 0) return
    setBusy(true)
    setMsg('')
    const tareas = getTareas()
    let attached = 0
    const sinCoincidencia = []
    for (const file of files) {
      const tarea = tareas.find((t) => t.pdfFilename === file.name)
      if (!tarea) { sinCoincidencia.push(file.name); continue }
      const fileId = await saveFile(file)
      updateTarea(tarea.id, { fotoFileId: fileId })
      attached++
    }
    setBusy(false)
    setMsg(`${attached} diagrama${attached === 1 ? '' : 's'} adjuntado${attached === 1 ? '' : 's'}${sinCoincidencia.length ? ` · ${sinCoincidencia.length} sin tarea coincidente` : ''}.`)
    onAttached()
  }

  return (
    <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
      <label className="btn btn-secondary" style={{ cursor: busy ? 'not-allowed' : 'pointer' }}>
        <Paperclip size={15} />
        {busy ? 'Adjuntando…' : 'Adjuntar diagramas (selecciona todos los PDF)'}
        <input type="file" accept="application/pdf" multiple onChange={handleFiles} disabled={busy} style={{ display: 'none' }} />
      </label>
      {msg && <span className="text-muted" style={{ fontSize: 12.5 }}>{msg}</span>}
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
  const [contenidoFiltro, setContenidoFiltro] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  const todasLasTareas = getTareas()
  const contenidosPresentes = [...new Set(todasLasTareas.map((t) => t.contenido).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))

  const tareas = todasLasTareas.filter((t) => {
    if (momentoFiltro && t.momento !== momentoFiltro) return false
    if (contenidoFiltro && t.contenido !== contenidoFiltro) return false
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase()
      if (!t.nombre.toLowerCase().includes(q) && !t.contenido.toLowerCase().includes(q) && !(t.descripcion || '').toLowerCase().includes(q)) return false
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

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="field__help" style={{ marginTop: 0, marginBottom: 10 }}>
          Catálogo real de ejercicios RFEF (nombre, espacio/tiempo, consigna) listo para importar de golpe. El diagrama de cada uno se puede adjuntar después seleccionando de una vez todos los PDF de la carpeta.
        </p>
        <div className="stack" style={{ gap: 10 }}>
          <ImportCatalogoButton onImported={bump} />
          <AdjuntarDiagramasButton onAttached={bump} />
        </div>
      </div>

      <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, contenido o consigna…"
          style={{ maxWidth: 260 }}
        />
        <div className="chip-group">
          <button type="button" className={`chip${!momentoFiltro ? ' is-active' : ''}`} onClick={() => setMomentoFiltro(null)}>Todas</button>
          {TAREA_MOMENTOS.map((m) => (
            <button key={m} type="button" className={`chip${momentoFiltro === m ? ' is-active' : ''}`} onClick={() => setMomentoFiltro(m)}>{m}</button>
          ))}
        </div>
      </div>

      {contenidosPresentes.length > 1 && (
        <div className="chip-group" style={{ marginBottom: 16 }}>
          <button type="button" className={`chip${!contenidoFiltro ? ' is-active' : ''}`} onClick={() => setContenidoFiltro(null)}>Todo el contenido</button>
          {contenidosPresentes.map((c) => (
            <button key={c} type="button" className={`chip${contenidoFiltro === c ? ' is-active' : ''}`} onClick={() => setContenidoFiltro(c)}>{c}</button>
          ))}
        </div>
      )}

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
