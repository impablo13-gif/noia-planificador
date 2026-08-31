// Persistencia local: localStorage para datos estructurados, IndexedDB para archivos binarios
// (fotos, escudos, PDFs de sesiones/informes). No hay servidor: todo vive en este navegador.

const KEYS = {
  seeded: 'noia-plan:seeded',
  trainingRule: 'noia-plan:trainingRule',
  preseasonTrainings: 'noia-plan:preseasonTrainings',
  trainingOverrides: 'noia-plan:trainingOverrides',
  matches: 'noia-plan:matches',
  opponents: 'noia-plan:opponents',
  players: 'noia-plan:players',
  agendaClub: 'noia-plan:agendaClub',
  agendaPersonal: 'noia-plan:agendaPersonal',
  clubCrestFileId: 'noia-plan:clubCrestFileId',
  injuries: 'noia-plan:injuries',
  partidosNpa: 'noia-plan:partidosNpa',
  npaPlayerAliases: 'noia-plan:npaPlayerAliases',
  npaEquipoAliases: 'noia-plan:npaEquipoAliases',
  bienestar: 'noia-plan:bienestar',
  bienestarAliases: 'noia-plan:bienestarAliases',
  asistencia: 'noia-plan:asistencia',
  weeklyGoals: 'noia-plan:weeklyGoals',
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

// ---------- Semilla inicial (una sola vez) ----------

export function isSeeded() {
  return localStorage.getItem(KEYS.seeded) === '1'
}

export function markSeeded() {
  localStorage.setItem(KEYS.seeded, '1')
}

// ---------- Regla de entreno recurrente ----------

const DEFAULT_TRAINING_RULE = { daysOfWeek: [1, 2, 4], time: '19:00', fromDate: '2026-09-14' }

export function getTrainingRule() {
  return readJSON(KEYS.trainingRule, DEFAULT_TRAINING_RULE)
}

export function saveTrainingRule(rule) {
  writeJSON(KEYS.trainingRule, rule)
}

// ---------- Entrenos de pretemporada (semilla) ----------

export function getPreseasonTrainings() {
  return readJSON(KEYS.preseasonTrainings, [])
}

export function savePreseasonTrainings(list) {
  writeJSON(KEYS.preseasonTrainings, list)
}

export function addPreseasonTraining(training) {
  const next = [...getPreseasonTrainings(), { id: uid(), status: 'pendiente', ...training }]
  savePreseasonTrainings(next)
  return next
}

export function updatePreseasonTraining(id, patch) {
  const next = getPreseasonTrainings().map((t) => (t.id === id ? { ...t, ...patch } : t))
  savePreseasonTrainings(next)
  return next
}

export function removePreseasonTraining(id) {
  const next = getPreseasonTrainings().filter((t) => t.id !== id)
  savePreseasonTrainings(next)
  return next
}

// ---------- Excepciones sobre la regla recurrente (temporada regular) ----------

export function getTrainingOverrides() {
  return readJSON(KEYS.trainingOverrides, {})
}

export function saveTrainingOverride(date, patch) {
  const overrides = getTrainingOverrides()
  const next = { ...overrides, [date]: { ...(overrides[date] || {}), ...patch } }
  writeJSON(KEYS.trainingOverrides, next)
  return next
}

export function removeTrainingOverride(date) {
  const overrides = getTrainingOverrides()
  const next = { ...overrides }
  delete next[date]
  writeJSON(KEYS.trainingOverrides, next)
  return next
}

// ---------- Partidos ----------

export function getMatches() {
  return readJSON(KEYS.matches, [])
}

export function saveMatches(list) {
  writeJSON(KEYS.matches, list)
}

export function addMatch(match) {
  const next = [...getMatches(), { id: uid(), status: 'pendiente', ...match }]
  saveMatches(next)
  return next
}

export function updateMatch(id, patch) {
  const next = getMatches().map((m) => (m.id === id ? { ...m, ...patch } : m))
  saveMatches(next)
  return next
}

export function removeMatch(id) {
  const next = getMatches().filter((m) => m.id !== id)
  saveMatches(next)
  return next
}

// ---------- Rivales ----------

export function getOpponents() {
  return readJSON(KEYS.opponents, [])
}

export function saveOpponents(list) {
  writeJSON(KEYS.opponents, list)
}

export function updateOpponent(id, patch) {
  const next = getOpponents().map((o) => (o.id === id ? { ...o, ...patch } : o))
  saveOpponents(next)
  return next
}

const EMPTY_SCOUTING = {
  resumen: '', sistemaJuego: '', jugadoresClave: '', puntosFuertes: '',
  puntosDebiles: '', abp: '', notasLibres: '', highlights: [],
}

export function addOpponent(opponent) {
  const next = [...getOpponents(), { id: uid(), shieldFileId: null, scouting: { ...EMPTY_SCOUTING }, ...opponent }]
  saveOpponents(next)
  return next
}

export function removeOpponent(id) {
  const next = getOpponents().filter((o) => o.id !== id)
  saveOpponents(next)
  return next
}

// ---------- Plantilla ----------

export const PUESTOS = ['Portero', 'Cierre', 'Ala', 'Pívot', 'Ala-Cierre', 'Ala-Pívot']
export const LATERALIDADES = ['Diestro', 'Zurdo', 'Ambidiestro']

export function getPlayers() {
  return readJSON(KEYS.players, [])
}

export function savePlayers(list) {
  writeJSON(KEYS.players, list)
}

const EMPTY_STATS = { partidos: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0, minutos: 0, cargaFisica: 0 }

export function addPlayer(player) {
  const next = [...getPlayers(), { id: uid(), stats: { ...EMPTY_STATS }, ...player }]
  savePlayers(next)
  return next
}

export function updatePlayer(id, patch) {
  const next = getPlayers().map((p) => (p.id === id ? { ...p, ...patch, stats: { ...p.stats, ...(patch.stats || {}) } } : p))
  savePlayers(next)
  return next
}

export function removePlayer(id) {
  const next = getPlayers().filter((p) => p.id !== id)
  savePlayers(next)
  return next
}

// ---------- Agendas (club y personal, independientes) ----------

function makeAgendaApi(key) {
  return {
    get: () => readJSON(key, []),
    add: (text, dueDate) => {
      const next = [{ id: uid(), text, done: false, dueDate: dueDate || null }, ...readJSON(key, [])]
      writeJSON(key, next)
      return next
    },
    toggle: (id) => {
      const next = readJSON(key, []).map((t) => (t.id === id ? { ...t, done: !t.done } : t))
      writeJSON(key, next)
      return next
    },
    remove: (id) => {
      const next = readJSON(key, []).filter((t) => t.id !== id)
      writeJSON(key, next)
      return next
    },
  }
}

export const agendaClub = makeAgendaApi(KEYS.agendaClub)
export const agendaPersonal = makeAgendaApi(KEYS.agendaPersonal)

// ---------- Lesiones ----------

export function getInjuries() {
  return readJSON(KEYS.injuries, [])
}

export function saveInjuries(list) {
  writeJSON(KEYS.injuries, list)
}

export function addInjury(injury) {
  const next = [...getInjuries(), { id: uid(), estado: 'Activa', ...injury }]
  saveInjuries(next)
  return next
}

export function updateInjury(id, patch) {
  const next = getInjuries().map((i) => (i.id === id ? { ...i, ...patch } : i))
  saveInjuries(next)
  return next
}

export function removeInjury(id) {
  const next = getInjuries().filter((i) => i.id !== id)
  saveInjuries(next)
  return next
}

// ---------- Partidos importados de NPA Stats (relojes/rotaciones) ----------

export function getPartidosNpa() {
  return readJSON(KEYS.partidosNpa, [])
}

export function savePartidosNpa(list) {
  writeJSON(KEYS.partidosNpa, list)
}

// Upsert por id (clave estable derivada de equipo+fecha del propio export de
// NPA Stats) para que reimportar el mismo archivo no duplique partidos.
export function upsertPartidosNpa(nuevos) {
  const current = getPartidosNpa()
  const byId = new Map(current.map((m) => [m.id, m]))
  let added = 0
  let updated = 0
  nuevos.forEach((m) => {
    if (byId.has(m.id)) updated++
    else added++
    byId.set(m.id, m)
  })
  savePartidosNpa([...byId.values()])
  return { added, updated }
}

export function removePartidoNpa(id) {
  const next = getPartidosNpa().filter((m) => m.id !== id)
  savePartidosNpa(next)
  return next
}

// Alias nombre-de-NPA-Stats → jugador y equipo-de-NPA-Stats → equipo de la
// Plantilla: el nombre/equipo que Pablo escribe en NPA Stats casi nunca
// coincide letra por letra con la Plantilla (motes, acentos, "NOIA PORTUS
// APOSTOLI" contra "Juvenil División de Honor"…), así que una vez que los
// empareja a mano en el aviso de revisión al subir un informe, queda
// recordado para siempre y las siguientes subidas no vuelven a preguntar.
export function getNpaPlayerAliases() {
  return readJSON(KEYS.npaPlayerAliases, {})
}

export function setNpaPlayerAlias(key, playerId) {
  const aliases = getNpaPlayerAliases()
  aliases[key] = playerId
  writeJSON(KEYS.npaPlayerAliases, aliases)
}

export function getNpaEquipoAliases() {
  return readJSON(KEYS.npaEquipoAliases, {})
}

export function setNpaEquipoAlias(npaEquipo, rosterEquipo) {
  const aliases = getNpaEquipoAliases()
  aliases[npaEquipo] = rosterEquipo
  writeJSON(KEYS.npaEquipoAliases, aliases)
}

// ---------- Bienestar / RPE diario (cuestionario Google Forms) ----------

export function getBienestar() {
  return readJSON(KEYS.bienestar, [])
}

export function saveBienestar(list) {
  writeJSON(KEYS.bienestar, list)
}

// Upsert por jugador+fecha: si el mismo jugador vuelve a responder el mismo
// día (o se reimporta el mismo CSV), la entrada más reciente sustituye a la
// anterior en vez de duplicarla.
export function upsertBienestar(nuevos) {
  const current = getBienestar()
  const byId = new Map(current.map((e) => [e.id, e]))
  let added = 0
  let updated = 0
  nuevos.forEach((e) => {
    if (byId.has(e.id)) updated++
    else added++
    byId.set(e.id, e)
  })
  saveBienestar([...byId.values()])
  return { added, updated }
}

// Borra por completo la respuesta de un jugador en una fecha (RPE y
// Wellness a la vez, al ser la misma entrada) — para quitar una respuesta
// duplicada, de prueba, o puesta en el día equivocado.
export function removeBienestarEntry(id) {
  const next = getBienestar().filter((e) => e.id !== id)
  saveBienestar(next)
  return next
}

// Alias nombre-del-cuestionario → jugador: una vez que un nombre se empareja
// (automáticamente o a mano, tras confirmarlo Pablo), se recuerda para
// siempre, así las siguientes sincronizaciones no tienen que volver a
// adivinarlo aunque el nombre de la hoja no se parezca al de la plantilla.
export function getBienestarAliases() {
  return readJSON(KEYS.bienestarAliases, {})
}

export function setBienestarAlias(key, playerId) {
  const aliases = getBienestarAliases()
  aliases[key] = playerId
  writeJSON(KEYS.bienestarAliases, aliases)
  return aliases
}

// ---------- Asistencia a entrenos/partidos ----------
// Quién estuvo presente cada día — permite distinguir, en el bienestar, entre
// "no respondió" y "no entrenó con este equipo ese día" (bienestarSync /
// SessionRpePanel la usan para no pedir RPE a quien no estuvo). Cada jugador
// tiene un estado, no solo presente/ausente — un "Falta" y un "Lesión" son
// ambos ausencias, pero de naturaleza distinta, y un "Filial"/"1º Equipo"
// simplemente entrenó ese día con otro equipo, no faltó.

// Dos variantes de lesión porque no es lo mismo para la carga del grupo: un
// lesionado que viene y hace trabajo aparte cuenta como presente en la
// pista (aunque no entrene con el grupo), uno que no viene es una ausencia
// más — de ahí que sean dos estados distintos, no uno con una nota aparte.
export const ASISTENCIA_ESTADOS = [
  { id: 'presente', label: 'Presente', color: 'var(--success-600)', bg: 'var(--success-100)' },
  { id: 'lesion_presente', label: 'Lesión (en pista)', color: 'var(--warn-600)', bg: 'var(--warn-100)' },
  { id: 'lesion_ausente', label: 'Lesión (ausente)', color: 'var(--danger-600)', bg: 'var(--danger-100)' },
  { id: 'filial', label: 'Filial', color: 'var(--blue-600)', bg: 'var(--blue-100)' },
  { id: 'primer_equipo', label: '1º Equipo', color: 'var(--red-700)', bg: 'var(--red-100)' },
  { id: 'falta', label: 'Falta', color: 'var(--ink-500)', bg: 'var(--gray-100)' },
]

export function getAsistencia() {
  return readJSON(KEYS.asistencia, {})
}

export function getAsistenciaForDate(fecha) {
  return getAsistencia()[fecha] || null
}

// `estados` es un objeto { [playerId]: 'presente' | 'lesion' | 'filial' | 'primer_equipo' | 'falta' }.
export function setAsistenciaForDate(fecha, estados) {
  const all = getAsistencia()
  all[fecha] = { estados, updatedAt: Date.now() }
  writeJSON(KEYS.asistencia, all)
  return all
}

// ---------- Objetivos y contenidos semanales ----------
// Un microciclo (semana) tiene su propio foco, distinto del contenido de
// cada sesión suelta — clave = lunes de esa semana en ISO, así cada semana
// del calendario tiene un único registro estable independientemente de en
// qué mes se esté mirando.

export function getWeeklyGoals() {
  return readJSON(KEYS.weeklyGoals, {})
}

export function getWeeklyGoalsForWeek(weekKey) {
  return getWeeklyGoals()[weekKey] || { objetivos: '', contenidos: '' }
}

export function setWeeklyGoalsForWeek(weekKey, patch) {
  const all = getWeeklyGoals()
  all[weekKey] = { ...(all[weekKey] || { objetivos: '', contenidos: '' }), ...patch }
  writeJSON(KEYS.weeklyGoals, all)
  return all[weekKey]
}

// ---------- Escudo del club (cabecera) ----------

export function getClubCrestFileId() {
  return localStorage.getItem(KEYS.clubCrestFileId) || null
}

export function setClubCrestFileId(id) {
  if (id) localStorage.setItem(KEYS.clubCrestFileId, id)
  else localStorage.removeItem(KEYS.clubCrestFileId)
}

// ---------- IndexedDB: archivos binarios (fotos, escudos, PDFs) ----------

const IDB_NAME = 'noia-plan-files'
const IDB_STORE = 'files'
let dbPromise = null

function openFilesDB() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

export async function saveFile(file) {
  const db = await openFilesDB()
  const id = uid()
  const record = { id, name: file.name, type: file.type, blob: file, createdAt: Date.now() }
  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(record)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  return id
}

export async function getFile(id) {
  if (!id) return null
  const db = await openFilesDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteFile(id) {
  if (!id) return
  const db = await openFilesDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).delete(id)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
}

// Todos los archivos guardados (fotos, escudos, PDFs) — usado por la copia
// de seguridad completa para volcarlos junto al resto de datos.
export async function getAllFiles() {
  const db = await openFilesDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

// Como `saveFile`, pero conservando el id original — lo necesita la
// restauración de una copia de seguridad para que fotoFileId/shieldFileId/etc.
// sigan apuntando al archivo correcto tras importar.
export async function putFileWithId(id, blob, name, type, createdAt) {
  const db = await openFilesDB()
  const record = { id, name, type, blob, createdAt: createdAt || Date.now() }
  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(record)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  })
  return id
}

// Todas las claves `noia-plan:*` que usa la app — la copia de seguridad
// completa recorre esta lista, así que cualquier store nuevo que se añada
// aquí queda incluido automáticamente en el backup sin tocar backup.js.
export function allStorageKeys() {
  return { ...KEYS }
}
