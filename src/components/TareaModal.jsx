import { useState } from 'react'
import { Save, Trash2 } from 'lucide-react'
import Modal from './Modal.jsx'
import FileDrop from './FileDrop.jsx'
import { addTarea, updateTarea, removeTarea, TAREA_MOMENTOS } from '../db.js'

export default function TareaModal({ tarea, onClose, onSaved }) {
  const isNew = !tarea?.id
  const [nombre, setNombre] = useState(tarea?.nombre || '')
  const [contenido, setContenido] = useState(tarea?.contenido || '')
  const [momento, setMomento] = useState(tarea?.momento || 'Principal')
  const [descripcion, setDescripcion] = useState(tarea?.descripcion || '')
  const [fotoFileId, setFotoFileId] = useState(tarea?.fotoFileId || null)
  const [videoUrl, setVideoUrl] = useState(tarea?.videoUrl || '')

  function handleSave() {
    const patch = { nombre: nombre.trim(), contenido: contenido.trim(), momento, descripcion: descripcion.trim(), fotoFileId, videoUrl: videoUrl.trim() }
    if (isNew) addTarea(patch)
    else updateTarea(tarea.id, patch)
    onSaved()
  }

  function handleDelete() {
    removeTarea(tarea.id)
    onSaved()
  }

  return (
    <Modal
      title={isNew ? 'Nueva tarea' : 'Editar tarea'}
      onClose={onClose}
      maxWidth={560}
      footer={
        <>
          {!isNew && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={14} />
              Eliminar
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!nombre.trim()}>
            <Save size={14} />
            Guardar
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label className="field__label">Nombre de la tarea</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. 3c3 con porteros, transición rápida" />
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label className="field__label">Contenido <span className="field__optional">(opcional)</span></label>
            <input type="text" value={contenido} onChange={(e) => setContenido(e.target.value)} placeholder="Ej. pivote, finalización, ABP…" />
          </div>
          <div className="field">
            <label className="field__label">Momento de la sesión</label>
            <div className="chip-group">
              {TAREA_MOMENTOS.map((m) => (
                <button key={m} type="button" className={`chip${momento === m ? ' is-active' : ''}`} onClick={() => setMomento(m)}>{m}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="field">
          <label className="field__label">Descripción <span className="field__optional">(opcional)</span></label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Organización, reglas, variantes…" />
        </div>

        <div className="field">
          <label className="field__label">Diagrama o foto <span className="field__optional">(opcional)</span></label>
          <FileDrop fileId={fotoFileId} onChange={setFotoFileId} accept="image/*" label="Subir imagen" />
        </div>

        <div className="field">
          <label className="field__label">Vídeo <span className="field__optional">(opcional)</span></label>
          <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
        </div>
      </div>
    </Modal>
  )
}
