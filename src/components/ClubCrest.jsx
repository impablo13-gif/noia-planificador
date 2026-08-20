import { useEffect, useRef, useState } from 'react'
import { getFile, saveFile, deleteFile, getClubCrestFileId, setClubCrestFileId } from '../db.js'

// Escudo del club en la cabecera: si no hay ninguno subido muestra "NPA".
// Clic en el escudo abre el selector de archivo para subir/cambiarlo.
export default function ClubCrest() {
  const [fileId, setFileId] = useState(getClubCrestFileId())
  const [url, setUrl] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    if (!fileId) {
      setUrl(null)
      return
    }
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

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const previous = fileId
    const id = await saveFile(file)
    setClubCrestFileId(id)
    setFileId(id)
    if (previous) await deleteFile(previous)
  }

  return (
    <button
      type="button"
      className="app-header__crest"
      onClick={() => inputRef.current?.click()}
      title="Cambiar escudo del club"
      style={{ border: 'none', padding: 0, cursor: 'pointer', overflow: 'hidden' }}
    >
      {url ? (
        <img src={url} alt="Escudo del club" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
      ) : (
        'NPA'
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </button>
  )
}
