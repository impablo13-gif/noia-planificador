import { useEffect, useState } from 'react'
import { Paperclip, Upload, X } from 'lucide-react'
import { saveFile, getFile } from '../db.js'

function FileRow({ fileId, onRemove }) {
  const [meta, setMeta] = useState(null)

  useEffect(() => {
    let cancelled = false
    getFile(fileId).then((record) => {
      if (!cancelled && record) setMeta({ name: record.name })
    })
    return () => { cancelled = true }
  }, [fileId])

  return (
    <div className="row spread" style={{ fontSize: 12.5, background: 'var(--gray-50)', padding: '6px 10px', borderRadius: 'var(--radius-sm)' }}>
      <span className="row" style={{ gap: 6, minWidth: 0 }}>
        <Paperclip size={13} style={{ flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta?.name || 'Archivo'}</span>
      </span>
      <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onRemove} aria-label="Quitar archivo">
        <X size={12} />
      </button>
    </div>
  )
}

// Igual que FileDrop pero para varios archivos a la vez -- el informe en PDF,
// una foto del acta, lo que haga falta -- en vez de un único hueco que obliga
// a elegir solo uno. Cada archivo se guarda como blob independiente en
// IndexedDB y `fileIds` es la lista de ids resultante.
export default function MultiFileDrop({ fileIds, onChange, accept, label = 'Adjuntar archivo' }) {
  const ids = fileIds || []
  const [busy, setBusy] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const id = await saveFile(file)
      onChange([...ids, id])
    } finally {
      setBusy(false)
    }
  }

  function handleRemove(id) {
    onChange(ids.filter((x) => x !== id))
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      {ids.map((id) => (
        <FileRow key={id} fileId={id} onRemove={() => handleRemove(id)} />
      ))}
      <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', alignSelf: 'flex-start' }}>
        <Upload size={13} />
        {busy ? 'Subiendo…' : ids.length ? 'Añadir otro archivo' : label}
        <input type="file" accept={accept} onChange={handleFile} disabled={busy} style={{ display: 'none' }} />
      </label>
    </div>
  )
}
