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
  analisisProyectos: 'noia-plan:analisisProyectos',
  analisisEventos: 'noia-plan:analisisEventos',
  modeloJuego: 'noia-plan:modeloJuego',
  conceptosCatalogo: 'noia-plan:conceptosCatalogo',
  playbookCarpetas: 'noia-plan:playbookCarpetas',
  playbookJugadas: 'noia-plan:playbookJugadas',
  tareas: 'noia-plan:tareas',
  mercadoJugadores: 'noia-plan:mercadoJugadores',
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

// Los 5 ejes del propio modelo de desarrollo del jugador del club (ver
// assistantPrompt.md) — el radar de cada jugador usa esta escala, no
// atributos genéricos de videojuego, para que hable el mismo idioma que el
// resto de la app.
export const CUALIDADES_EJES = [
  { key: 'tecnica', label: 'Técnica' },
  { key: 'tactica', label: 'Táctica' },
  { key: 'fisico', label: 'Físico' },
  { key: 'habitos', label: 'Hábitos' },
  { key: 'emociones', label: 'Emociones' },
]

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

// ---------- Conceptos de juego (dominio individual por jugador) ----------

// Catálogo compartido por toda la plantilla — cada jugador tiene su propio
// estado sobre cada concepto (no adquirido / en progreso / dominado), pero
// la lista de conceptos en sí es una sola, común al equipo.
export function getConceptosCatalogo() {
  return readJSON(KEYS.conceptosCatalogo, [])
}

export function addConceptoCatalogo(nombre) {
  const next = [...getConceptosCatalogo(), { id: uid(), nombre }]
  writeJSON(KEYS.conceptosCatalogo, next)
  return next
}

export function removeConceptoCatalogo(id) {
  const next = getConceptosCatalogo().filter((c) => c.id !== id)
  writeJSON(KEYS.conceptosCatalogo, next)
  return next
}

// 'no' | 'progreso' | 'dominado' — ausencia en player.conceptos equivale a 'no'.
export function setPlayerConcepto(playerId, conceptoId, estado) {
  const player = getPlayers().find((p) => p.id === playerId)
  const conceptos = { ...(player?.conceptos || {}), [conceptoId]: estado }
  return updatePlayer(playerId, { conceptos })
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

// Corrige a mano un dato de un jugador en un partido concreto ya importado
// de NPA Stats (por si el dato llegó mal, o Pablo quiere ajustarlo) — solo
// tiene sentido sobre un partido concreto, nunca sobre un agregado de varios.
export function updatePartidoNpaPlayer(matchId, playerName, patch) {
  const next = getPartidosNpa().map((m) => {
    if (m.id !== matchId) return m
    const players = (m.players || []).map((p) => (p.name === playerName ? { ...p, ...patch } : p))
    return { ...m, players }
  })
  savePartidosNpa(next)
  return next
}

// Corrige a mano campos propios del partido (resultado final…), no de un
// jugador — mismo criterio: solo tiene sentido sobre un partido concreto.
export function updatePartidoNpa(matchId, patch) {
  const next = getPartidosNpa().map((m) => (m.id === matchId ? { ...m, ...patch } : m))
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

// ---------- Análisis de vídeo (etiquetado de eventos por proyecto) ----------

// Botonera de partida al crear un proyecto — cada botón es un tipo de evento
// que se etiqueta con su color propio; el color no tiene significado táctico,
// es solo para distinguir de un vistazo la lista de eventos ya marcados.
export const DEFAULT_BOTONES = [
  { id: 'ataque-posicional', label: 'Ataque posicional', color: 'var(--blue-600)' },
  { id: 'contraataque', label: 'Contraataque', color: 'var(--success-600)' },
  { id: 'perdida', label: 'Pérdida', color: 'var(--danger-600)' },
  { id: 'recuperacion', label: 'Recuperación', color: 'var(--violet-600)' },
  { id: 'presion-rival', label: 'Presión rival', color: 'var(--warn-600)' },
  { id: 'abp-favor', label: 'ABP a favor', color: 'var(--gold-600)' },
  { id: 'abp-contra', label: 'ABP en contra', color: 'var(--orange-600)' },
  { id: 'gol', label: 'Gol', color: 'var(--red-600)' },
]

export function getAnalisisProyectos() {
  return readJSON(KEYS.analisisProyectos, [])
}

export function saveAnalisisProyectos(list) {
  writeJSON(KEYS.analisisProyectos, list)
}

export function addAnalisisProyecto(proyecto) {
  const next = [
    ...getAnalisisProyectos(),
    {
      id: uid(),
      tipo: 'propio', // 'propio' | 'rival'
      opponentId: null,
      videoSourceType: 'file', // 'file' | 'url'
      videoFileId: null,
      videoUrl: '',
      botones: DEFAULT_BOTONES,
      createdAt: Date.now(),
      ...proyecto,
    },
  ]
  saveAnalisisProyectos(next)
  return next
}

export function updateAnalisisProyecto(id, patch) {
  const next = getAnalisisProyectos().map((p) => (p.id === id ? { ...p, ...patch } : p))
  saveAnalisisProyectos(next)
  return next
}

// Al borrar un proyecto se borran también sus eventos y, si el vídeo se subió
// como archivo local (no una URL externa), el propio archivo en IndexedDB —
// si no, quedaría un vídeo huérfano ocupando espacio para siempre.
export function removeAnalisisProyecto(id) {
  const proyecto = getAnalisisProyectos().find((p) => p.id === id)
  const next = getAnalisisProyectos().filter((p) => p.id !== id)
  saveAnalisisProyectos(next)
  saveAnalisisEventos(getAnalisisEventos().filter((e) => e.proyectoId !== id))
  if (proyecto?.videoSourceType === 'file' && proyecto.videoFileId) {
    deleteFile(proyecto.videoFileId)
  }
  return next
}

export function getAnalisisEventos(proyectoId) {
  const all = readJSON(KEYS.analisisEventos, [])
  return proyectoId ? all.filter((e) => e.proyectoId === proyectoId) : all
}

function saveAnalisisEventos(list) {
  writeJSON(KEYS.analisisEventos, list)
}

export function addAnalisisEvento(evento) {
  const next = [...getAnalisisEventos(), { id: uid(), nota: '', jugadorId: null, createdAt: Date.now(), ...evento }]
  saveAnalisisEventos(next)
  return next
}

export function updateAnalisisEvento(id, patch) {
  const next = getAnalisisEventos().map((e) => (e.id === id ? { ...e, ...patch } : e))
  saveAnalisisEventos(next)
  return next
}

export function removeAnalisisEvento(id) {
  const next = getAnalisisEventos().filter((e) => e.id !== id)
  saveAnalisisEventos(next)
  return next
}

// Punto para "continuar donde lo dejé": el final del último evento marcado.
export function getUltimoEventoFin(proyectoId) {
  const eventos = getAnalisisEventos(proyectoId)
  if (eventos.length === 0) return null
  return Math.max(...eventos.map((e) => e.endTime ?? e.startTime ?? 0))
}

// ---------- Modelo de juego ----------

export const MODELO_JUEGO_SECCIONES = ['identidad', 'conceptos', 'sistemaOfensivo', 'sistemaDefensivo', 'situacionesEspeciales', 'bibliografia']

const EMPTY_MODELO_JUEGO = {
  identidad: '', conceptos: '', sistemaOfensivo: '', sistemaDefensivo: '', situacionesEspeciales: '', bibliografia: '',
  videos: [], // { id, seccion, titulo, url }
}

export function getModeloJuego() {
  return { ...EMPTY_MODELO_JUEGO, ...readJSON(KEYS.modeloJuego, {}) }
}

export function updateModeloJuego(patch) {
  const next = { ...getModeloJuego(), ...patch }
  writeJSON(KEYS.modeloJuego, next)
  return next
}

export function addModeloJuegoVideo(video) {
  const modelo = getModeloJuego()
  return updateModeloJuego({ videos: [...modelo.videos, { id: uid(), ...video }] })
}

export function removeModeloJuegoVideo(id) {
  const modelo = getModeloJuego()
  return updateModeloJuego({ videos: modelo.videos.filter((v) => v.id !== id) })
}

// ---------- Playbook (jugadas organizadas en carpetas) ----------

export function getPlaybookCarpetas() {
  return readJSON(KEYS.playbookCarpetas, [])
}

export function addPlaybookCarpeta(nombre) {
  const next = [...getPlaybookCarpetas(), { id: uid(), nombre }]
  writeJSON(KEYS.playbookCarpetas, next)
  return next
}

export function removePlaybookCarpeta(id) {
  const next = getPlaybookCarpetas().filter((c) => c.id !== id)
  writeJSON(KEYS.playbookCarpetas, next)
  // Las jugadas de la carpeta borrada no se pierden: pasan a "sin carpeta"
  // en vez de desaparecer, por si Pablo la borró sin querer vaciarlas.
  const jugadas = getPlaybookJugadas().map((j) => (j.carpetaId === id ? { ...j, carpetaId: null } : j))
  writeJSON(KEYS.playbookJugadas, jugadas)
  return next
}

export function getPlaybookJugadas(carpetaId) {
  const all = readJSON(KEYS.playbookJugadas, [])
  return carpetaId === undefined ? all : all.filter((j) => j.carpetaId === carpetaId)
}

export function addPlaybookJugada(jugada) {
  const next = [...getPlaybookJugadas(), { id: uid(), carpetaId: null, videoSourceType: 'file', videoFileId: null, videoUrl: '', createdAt: Date.now(), ...jugada }]
  writeJSON(KEYS.playbookJugadas, next)
  return next
}

export function updatePlaybookJugada(id, patch) {
  const next = getPlaybookJugadas().map((j) => (j.id === id ? { ...j, ...patch } : j))
  writeJSON(KEYS.playbookJugadas, next)
  return next
}

export function removePlaybookJugada(id) {
  const jugada = getPlaybookJugadas().find((j) => j.id === id)
  const next = getPlaybookJugadas().filter((j) => j.id !== id)
  writeJSON(KEYS.playbookJugadas, next)
  if (jugada?.videoSourceType === 'file' && jugada.videoFileId) deleteFile(jugada.videoFileId)
  return next
}

// ---------- Tareas (biblioteca de ejercicios de entrenamiento) ----------

export const TAREA_MOMENTOS = ['Calentamiento', 'Principal', 'Vuelta a la calma']

export function getTareas() {
  return readJSON(KEYS.tareas, [])
}

export function addTarea(tarea) {
  const next = [...getTareas(), { id: uid(), nombre: '', contenido: '', momento: 'Principal', descripcion: '', fotoFileId: null, videoUrl: '', createdAt: Date.now(), ...tarea }]
  writeJSON(KEYS.tareas, next)
  return next
}

export function updateTarea(id, patch) {
  const next = getTareas().map((t) => (t.id === id ? { ...t, ...patch } : t))
  writeJSON(KEYS.tareas, next)
  return next
}

export function removeTarea(id) {
  const tarea = getTareas().find((t) => t.id === id)
  const next = getTareas().filter((t) => t.id !== id)
  writeJSON(KEYS.tareas, next)
  if (tarea?.fotoFileId) deleteFile(tarea.fotoFileId)
  return next
}

// ---------- Mercado de jugadores (seguimiento de fichajes externos) ----------

export function getMercadoJugadores() {
  return readJSON(KEYS.mercadoJugadores, [])
}

export function addMercadoJugador(jugador) {
  const next = [...getMercadoJugadores(), { id: uid(), nombre: '', clubActual: '', posicion: PUESTOS[0], edad: '', notas: '', contacto: '', fotoFileId: null, createdAt: Date.now(), ...jugador }]
  writeJSON(KEYS.mercadoJugadores, next)
  return next
}

export function updateMercadoJugador(id, patch) {
  const next = getMercadoJugadores().map((j) => (j.id === id ? { ...j, ...patch } : j))
  writeJSON(KEYS.mercadoJugadores, next)
  return next
}

export function removeMercadoJugador(id) {
  const jugador = getMercadoJugadores().find((j) => j.id === id)
  const next = getMercadoJugadores().filter((j) => j.id !== id)
  writeJSON(KEYS.mercadoJugadores, next)
  if (jugador?.fotoFileId) deleteFile(jugador.fotoFileId)
  return next
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
