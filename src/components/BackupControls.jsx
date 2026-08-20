import { useState } from 'react'
import { Download, Upload, Loader2 } from 'lucide-react'
import { downloadBackup, restoreBackup, isBackupFile, getLastBackupAt } from '../backup.js'

function timeAgo(iso) {
  if (!iso) return 'nunca'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  return `hace ${days} d`
}

export default function BackupControls() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [lastBackupAt, setLastBackupAt] = useState(getLastBackupAt())

  async function handleExport() {
    setBusy(true)
    setMsg('')
    try {
      await downloadBackup()
      setLastBackupAt(getLastBackupAt())
      setMsg('Copia descargada ✓')
    } catch (err) {
      setMsg(`Error al exportar: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setMsg('')
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result)
        if (!isBackupFile(data)) throw new Error('ese archivo no es una copia de seguridad de esta app')
        const r = await restoreBackup(data)
        setMsg(`Restaurado: ${r.keysRestored} bloques de datos, ${r.filesRestored} archivos. Recargando…`)
        setTimeout(() => window.location.reload(), 900)
      } catch (err) {
        setMsg(`No se pudo restaurar: ${err.message}`)
        setBusy(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
      <div style={{ textAlign: 'right', fontSize: 10.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.3 }}>
        Copia de seguridad
        <br />
        última: {timeAgo(lastBackupAt)}
      </div>
      <button
        type="button"
        onClick={handleExport}
        disabled={busy}
        title="Descarga toda la app (plantilla, calendario, bienestar, lesiones, fotos…) en un archivo"
        style={{
          appearance: 'none', border: '1.5px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.08)',
          color: '#fff', borderRadius: 8, padding: '7px 10px', display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
        }}
      >
        {busy ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Download size={14} />}
        Exportar
      </button>
      <label
        title="Restaura una copia de seguridad descargada antes (sustituye los datos actuales)"
        style={{
          appearance: 'none', border: '1.5px solid rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.08)',
          color: '#fff', borderRadius: 8, padding: '7px 10px', display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
        }}
      >
        <Upload size={14} />
        Restaurar
        <input type="file" accept="application/json,.json" onChange={handleImportFile} disabled={busy} style={{ display: 'none' }} />
      </label>
      {msg && (
        <span style={{ fontSize: 11.5, color: '#fff', maxWidth: 220 }}>{msg}</span>
      )}
    </div>
  )
}
