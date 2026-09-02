import { useState } from 'react'
import { Save, Trash2, Upload } from 'lucide-react'
import Modal from './Modal.jsx'
import { addAnalisisProyecto, updateAnalisisProyecto, removeAnalisisProyecto, saveFile, getOpponents } from '../db.js'

// Crea o edita la ficha de un proyecto de análisis: a qué se refiere (equipo
// propio o un rival concreto) y de dónde sale el vídeo — archivo local (se
// guarda en este dispositivo) o una URL ya alojada (Drive, OneDrive, nube
// propia…). El etiquetado de eventos vive aparte, en AnalisisProjectPanel.
export default function AnalisisProjectModal({ proyecto, onClose, onSaved }) {
  const isNew = !proyecto?.id
  const opponents = getOpponents()
  const [nombre, setNombre] = useState(proyecto?.nombre || '')
  const [tipo, setTipo] = useState(proyecto?.tipo || 'propio')
  const [opponentId, setOpponentId] = useState(proyecto?.opponentId || '')
  const [videoSourceType, setVideoSourceType] = useState(proyecto?.videoSourceType || 'file')
  const [videoUrl, setVideoUrl] = useState(proyecto?.videoUrl || '')
  const [videoFileId, setVideoFileId] = useState(proyecto?.videoFileId || null)
  const [videoFileName, setVideoFileName] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const id = await saveFile(file)
      setVideoFileId(id)
      setVideoFileName(file.name)
    } finally {
      setBusy(false)
    }
  }

  function handleSave() {
    const patch = {
      nombre: nombre.trim(),
      tipo,
      opponentId: tipo === 'rival' ? opponentId || null : null,
      videoSourceType,
      videoFileId: videoSourceType === 'file' ? videoFileId : null,
      videoUrl: videoSourceType === 'url' ? videoUrl.trim() : '',
    }
    if (isNew) addAnalisisProyecto(patch)
    else updateAnalisisProyecto(proyecto.id, patch)
    onSaved()
  }

  function handleDelete() {
    removeAnalisisProyecto(proyecto.id)
    onSaved()
  }

  const canSave = nombre.trim() && (videoSourceType === 'file' ? !!videoFileId : videoUrl.trim())

  return (
    <Modal
      title={isNew ? 'Nuevo proyecto de análisis' : 'Editar proyecto'}
      onClose={onClose}
      maxWidth={520}
      footer={
        <>
          {!isNew && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={14} />
              Eliminar
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!canSave || busy}>
            <Save size={14} />
            Guardar
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label className="field__label">Nombre del proyecto</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Jornada 4 vs. Escola Pia" />
        </div>

        <div className="field">
          <label className="field__label">¿De qué es este vídeo?</label>
          <div className="chip-group">
            <button type="button" className={`chip${tipo === 'propio' ? ' is-active' : ''}`} onClick={() => setTipo('propio')}>Nuestro equipo</button>
            <button type="button" className={`chip${tipo === 'rival' ? ' is-active' : ''}`} onClick={() => setTipo('rival')}>Un rival</button>
          </div>
        </div>

        {tipo === 'rival' && (
          <div className="field">
            <label className="field__label">Rival</label>
            <select value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
              <option value="">Selecciona…</option>
              {opponents.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label className="field__label">Vídeo</label>
          <div className="chip-group" style={{ marginBottom: 8 }}>
            <button type="button" className={`chip${videoSourceType === 'file' ? ' is-active' : ''}`} onClick={() => setVideoSourceType('file')}>Archivo local</button>
            <button type="button" className={`chip${videoSourceType === 'url' ? ' is-active' : ''}`} onClick={() => setVideoSourceType('url')}>Enlace (Drive, OneDrive…)</button>
          </div>

          {videoSourceType === 'file' ? (
            <>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                <Upload size={13} />
                {busy ? 'Guardando…' : videoFileId ? 'Cambiar vídeo' : 'Elegir vídeo'}
                <input type="file" accept="video/*" onChange={handleFile} disabled={busy} style={{ display: 'none' }} />
              </label>
              {videoFileId && !videoFileName && <p className="field__help">Ya hay un vídeo guardado para este proyecto.</p>}
              {videoFileName && <p className="field__help">{videoFileName}</p>}
              <p className="field__help">Se guarda entero en este dispositivo (IndexedDB) — para partidos completos pesa bastante, así que si el navegador se queda sin espacio, usa mejor un enlace de Drive/OneDrive.</p>
            </>
          ) : (
            <>
              <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
              <p className="field__help">Tiene que ser un enlace que se pueda reproducir directamente (vídeo público o compartido con enlace de descarga/streaming directo).</p>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
