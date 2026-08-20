// Copia de seguridad completa de la app: todas las claves noia-plan:* de
// localStorage + todos los archivos (fotos, escudos, PDFs) de IndexedDB, en
// un único JSON descargable. Existe porque toda la app vive solo en el
// almacenamiento del navegador — si ese navegador/perfil se resetea, se
// pierde todo lo que no esté en un backup como este.

import { allStorageKeys, getAllFiles, putFileWithId } from './db.js'

const LAST_BACKUP_KEY = 'noia-plan:lastBackupAt'

function blobToDataUri(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function dataUriToBlob(dataUri) {
  const res = await fetch(dataUri)
  return res.blob()
}

export async function buildBackup() {
  const keys = allStorageKeys()
  const localStorageDump = {}
  Object.values(keys).forEach((k) => {
    const raw = localStorage.getItem(k)
    if (raw != null) localStorageDump[k] = raw
  })

  const files = await getAllFiles()
  const filesDump = await Promise.all(
    files.map(async (f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      createdAt: f.createdAt,
      dataUri: await blobToDataUri(f.blob),
    })),
  )

  return {
    formato: 'noia-plan-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    localStorage: localStorageDump,
    files: filesDump,
  }
}

export async function downloadBackup() {
  const backup = await buildBackup()
  const json = JSON.stringify(backup)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = backup.exportedAt.slice(0, 10)
  a.href = url
  a.download = `noia-plan-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  localStorage.setItem(LAST_BACKUP_KEY, backup.exportedAt)
  return backup
}

export function isBackupFile(data) {
  return !!data && data.formato === 'noia-plan-backup'
}

export async function restoreBackup(data) {
  if (!isBackupFile(data)) throw new Error('ese archivo no parece una copia de seguridad de esta app')

  Object.entries(data.localStorage || {}).forEach(([key, value]) => {
    localStorage.setItem(key, value)
  })

  let filesRestored = 0
  for (const f of data.files || []) {
    const blob = await dataUriToBlob(f.dataUri)
    await putFileWithId(f.id, blob, f.name, f.type, f.createdAt)
    filesRestored++
  }

  return {
    keysRestored: Object.keys(data.localStorage || {}).length,
    filesRestored,
    exportedAt: data.exportedAt,
  }
}

export function getLastBackupAt() {
  return localStorage.getItem(LAST_BACKUP_KEY)
}
