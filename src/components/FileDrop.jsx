import { useEffect, useState } from 'react'
import { Paperclip, Upload, X } from 'lucide-react'
import { saveFile, getFile } from '../db.js'

// Input de archivo reutilizable: guarda el blob en IndexedDB y expone el id
// resultante vía onChange. `fileId` es el id actualmente guardado (o null).
export default function FileDrop({ fileId, onChange, accept, label = 'Adjuntar archivo' }) {
  const [meta, setMeta] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    if (!fileId) {
      setMeta(null)
      setPreviewUrl(null)
      return
    }
    getFile(fileId).then((record) => {
      if (cancelled || !record) return
      setMeta({ name: record.name, type: record.type })
      if (record.type && record.type.startsWith('image/')) {
        objectUrl = URL.createObjectURL(record.blob)
        setPreviewUrl(objectUrl)
      } else {
        setPreviewUrl(null)
      }
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      // No se borra aquí el archivo anterior: si el formulario que contiene
      // este campo se cierra sin guardar, el valor previo debe seguir intacto.
      // El archivo sustituido queda huérfano en IndexedDB (coste de espacio
      // asumible) en vez de arriesgarse a perder datos.
      const id = await saveFile(file)
      onChange(id)
    } finally {
      setBusy(false)
    }
  }

  function handleRemove() {
    onChange(null)
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      {previewUrl && (
        <img src={previewUrl} alt={meta?.name || 'archivo'} style={{ maxWidth: 160, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--gray-300)' }} />
      )}
      {meta && !previewUrl && (
        <div className="row" style={{ fontSize: 13, color: 'var(--ink-700)' }}>
          <Paperclip size={14} />
          {meta.name}
        </div>
      )}
      <div className="row">
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
          <Upload size={13} />
          {busy ? 'Subiendo…' : meta ? 'Cambiar' : label}
          <input type="file" accept={accept} onChange={handleFile} disabled={busy} style={{ display: 'none' }} />
        </label>
        {meta && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleRemove}>
            <X size={13} />
            Quitar
          </button>
        )}
      </div>
    </div>
  )
}
