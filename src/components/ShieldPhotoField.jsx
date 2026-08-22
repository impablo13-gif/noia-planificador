import { useRef, useState } from 'react'
import { Upload, Crop, X } from 'lucide-react'
import { saveFile, getFile } from '../db.js'
import PlayerAvatar from './PlayerAvatar.jsx'
import PhotoCropper from './PhotoCropper.jsx'

// Igual que PlayerPhotoField pero para escudos: vista previa sin recortar
// (contain) y encuadrado en cuadrado/PNG en vez de círculo/JPEG, porque un
// escudo es un logotipo y no debe perder ni forma ni transparencia.
export default function ShieldPhotoField({ fileId, onChange, label = 'Subir escudo' }) {
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
    setCropFile(new File([record.blob], record.name || 'escudo.png', { type: record.type || 'image/png' }))
  }

  async function handleCropSave(blob) {
    const newFile = new File([blob], 'escudo.png', { type: 'image/png' })
    const id = await saveFile(newFile)
    onChange(id)
    setCropFile(null)
  }

  function handleRemove() {
    onChange(null)
  }

  return (
    <div className="row" style={{ alignItems: 'center', gap: 14 }}>
      <PlayerAvatar fileId={fileId} size="shield-lg" />
      <div className="stack" style={{ gap: 8 }}>
        <div className="row">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()}>
            <Upload size={13} />
            {fileId ? 'Cambiar escudo' : label}
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
        <PhotoCropper
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onSave={handleCropSave}
          shape="square"
          title="Encuadrar escudo"
          saveLabel="Usar este escudo"
          helpText="Arrastra el escudo para encuadrarlo y usa la barra para hacer zoom — se guarda en PNG, sin perder la transparencia."
        />
      )}
    </div>
  )
}
