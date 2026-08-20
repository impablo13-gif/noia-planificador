import { useRef, useState } from 'react'
import { Upload, Crop, X } from 'lucide-react'
import { saveFile, getFile } from '../db.js'
import PlayerAvatar from './PlayerAvatar.jsx'
import PhotoCropper from './PhotoCropper.jsx'

export default function PlayerPhotoField({ fileId, onChange }) {
  const [cropFile, setCropFile] = useState(null)
  const inputRef = useRef(null)

  function handlePick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setCropFile(file)
  }

  async function handleReframe() {
    const record = await getFile(fileId)
    if (!record) return
    setCropFile(new File([record.blob], record.name || 'foto.jpg', { type: record.type || 'image/jpeg' }))
  }

  async function handleCropSave(blob) {
    // No se borra el fichero anterior aquí: solo se confirma de verdad al
    // guardar el formulario del jugador (si se cierra sin guardar, la foto
    // original debe seguir intacta). Ver misma nota en FileDrop.jsx.
    const newFile = new File([blob], 'foto.jpg', { type: 'image/jpeg' })
    const id = await saveFile(newFile)
    onChange(id)
    setCropFile(null)
  }

  function handleRemove() {
    onChange(null)
  }

  return (
    <div className="row" style={{ alignItems: 'center', gap: 14 }}>
      <PlayerAvatar fileId={fileId} size="lg" />
      <div className="stack" style={{ gap: 8 }}>
        <div className="row">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()}>
            <Upload size={13} />
            {fileId ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {fileId && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleReframe}>
              <Crop size={13} />
              Encuadrar
            </button>
          )}
          {fileId && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemove}>
              <X size={13} />
              Quitar
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" onChange={handlePick} style={{ display: 'none' }} />
      </div>

      {cropFile && (
        <PhotoCropper file={cropFile} onCancel={() => setCropFile(null)} onSave={handleCropSave} />
      )}
    </div>
  )
}
