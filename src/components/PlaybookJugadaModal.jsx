import { useState } from 'react'
import { Save, Trash2, Upload } from 'lucide-react'
import Modal from './Modal.jsx'
import { addPlaybookJugada, updatePlaybookJugada, removePlaybookJugada, saveFile, getPlaybookCarpetas } from '../db.js'

// Crea o edita una jugada del Playbook — igual de sencillo que un proyecto de
// Análisis (archivo local o enlace externo), pero organizado en carpetas en
// vez de por rival/propio, porque aquí lo que importa es el tipo de jugada
// (ABP, banda, posicional…), no de quién es el vídeo.
export default function PlaybookJugadaModal({ jugada, carpetaIdPorDefecto, onClose, onSaved }) {
  const isNew = !jugada?.id
  const carpetas = getPlaybookCarpetas()
  const [nombre, setNombre] = useState(jugada?.nombre || '')
  const [carpetaId, setCarpetaId] = useState(jugada?.carpetaId ?? carpetaIdPorDefecto ?? '')
  const [videoSourceType, setVideoSourceType] = useState(jugada?.videoSourceType || 'file')
  const [videoUrl, setVideoUrl] = useState(jugada?.videoUrl || '')
  const [videoFileId, setVideoFileId] = useState(jugada?.videoFileId || null)
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
      carpetaId: carpetaId || null,
      videoSourceType,
      videoFileId: videoSourceType === 'file' ? videoFileId : null,
      videoUrl: videoSourceType === 'url' ? videoUrl.trim() : '',
    }
    if (isNew) addPlaybookJugada(patch)
    else updatePlaybookJugada(jugada.id, patch)
    onSaved()
  }

  function handleDelete() {
    removePlaybookJugada(jugada.id)
    onSaved()
  }

  const canSave = nombre.trim() && (videoSourceType === 'file' ? !!videoFileId : videoUrl.trim())

  return (
    <Modal
      title={isNew ? 'Nueva jugada' : 'Editar jugada'}
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
          <label className="field__label">Nombre de la jugada</label>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Saque de banda — Corinthians" />
        </div>

        <div className="field">
          <label className="field__label">Carpeta <span className="field__optional">(opcional)</span></label>
          <select value={carpetaId} onChange={(e) => setCarpetaId(e.target.value)}>
            <option value="">Sin carpeta</option>
            {carpetas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

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
              {videoFileId && !videoFileName && <p className="field__help">Ya hay un vídeo guardado para esta jugada.</p>}
              {videoFileName && <p className="field__help">{videoFileName}</p>}
            </>
          ) : (
            <input type="text" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://…" />
          )}
        </div>
      </div>
    </Modal>
  )
}
