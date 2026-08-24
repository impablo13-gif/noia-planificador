// Cálculos derivados de las respuestas de bienestar/RPE, compartidos entre la
// ficha de jugador, los modales de entreno/partido y el dashboard de Plantilla.

import { getBienestar, upsertBienestar } from './db.js'
import { getEventsInRange } from './eventsEngine.js'
import { parseISODate, toISODate, addDays } from './dateUtils.js'

function hasSession(day) {
  return !!day && (day.trainings.some((t) => !t.cancelled) || day.matches.length > 0)
}

// Un día "real" es un día con entreno (no cancelado) o partido en el
// calendario, o el día siguiente a uno — Pablo avisa que el RPE en concreto
// muchas veces se rellena al día siguiente de la sesión, no esa misma noche,
// así que esa respuesta "tardía" también cuenta como real. Se usa para
// descartar respuestas sueltas que no corresponden a ninguna sesión ni al
// día después de una (p. ej. alguien rellena el Wellness un día cualquiera
// sin entreno cerca) — sin este filtro, ese tipo de respuesta podía colarse
// como "el último día" en los dashboards aunque no hubiera pasado nada.
export function isScheduledSessionDay(fecha) {
  if (!fecha) return false
  const d = parseISODate(fecha)
  const prev = addDays(d, -1)
  const map = getEventsInRange(prev, d)
  if (hasSession(map[fecha])) return true
  return hasSession(map[toISODate(prev)])
}

// Si una fecha no tiene entreno ni partido ese mismo día, busca hacia atrás
// (hasta `maxLookbackDays`) la sesión real más cercana — un finde sin
// entreno, unas vacaciones, o simplemente que a alguien se le olvidó
// responder el mismo día no deben perder la respuesta: corresponde a la
// última sesión de verdad que hubo antes de esa fecha. Devuelve null si no
// encuentra ninguna sesión en ese margen (respuesta realmente huérfana).
export function nearestSessionDate(fecha, { maxLookbackDays = 30 } = {}) {
  if (!fecha) return null
  const end = parseISODate(fecha)
  const start = addDays(end, -maxLookbackDays)
  const map = getEventsInRange(start, end)
  let d = end
  for (let i = 0; i <= maxLookbackDays; i++) {
    const iso = toISODate(d)
    if (hasSession(map[iso])) return iso
    d = addDays(d, -1)
  }
  return null
}

// Todas las respuestas de bienestar que caen en un día real del calendario —
// el resto de funciones de este módulo parten de aquí, no de `getBienestar()`
// directamente, para que "el último día" signifique siempre lo mismo en toda
// la app.
function scheduledBienestar() {
  return getBienestar().filter((e) => isScheduledSessionDay(e.fecha))
}

// Puntuación compuesta 1-5: estrés y fatiga se invierten (alto = peor ahí),
// el resto (sueño/dolor ausente/energía/condición) alto = mejor.
export function wellnessScore(entry) {
  if (!entry) return null
  const vals = []
  if (entry.estres != null) vals.push(6 - entry.estres)
  if (entry.sueno != null) vals.push(entry.sueno)
  if (entry.dolorMuscular != null) vals.push(entry.dolorMuscular)
  if (entry.energia != null) vals.push(entry.energia)
  if (entry.fatiga != null) vals.push(6 - entry.fatiga)
  if (entry.condicionGeneral != null) vals.push(entry.condicionGeneral)
  if (!vals.length) return null
  return vals.reduce((s, v) => s + v, 0) / vals.length
}

function avg(nums) {
  const vals = nums.filter((v) => v != null)
  if (!vals.length) return null
  return vals.reduce((s, v) => s + v, 0) / vals.length
}

// RPE medio de una fecha concreta (un entreno o un partido, por su `date`):
// cuántos jugadores rellenaron la encuesta ese día y cuál fue su RPE medio.
// No filtra por día programado — se llama siempre con la fecha de un
// entreno/partido ya abierto, así que por definición ya lo es.
export function rpeForDate(fecha) {
  if (!fecha) return { avg: null, count: 0, entries: [] }
  const entries = getBienestar().filter((e) => e.fecha === fecha && e.rpe != null)
  return { avg: avg(entries.map((e) => e.rpe)), count: entries.length, entries }
}

// Crea o corrige el RPE de un jugador en una fecha concreta, conservando el
// resto de campos de esa respuesta (sueño, estrés…) si ya existía. Permite
// que cualquier valor de RPE mostrado en la app se pueda editar a mano.
export function setPlayerRpe(playerId, fecha, rpe) {
  const id = `${playerId}__${fecha}`
  const existing = getBienestar().find((e) => e.id === id)
  const entry = { ...(existing || { id, playerId, fecha }), rpe }
  upsertBienestar([entry])
  return entry
}

// Historial completo de un jugador, ya limitado a días reales de calendario
// y ordenado cronológicamente — lo usa la ficha del jugador ("Carga y
// bienestar") para que "última sesión" sea siempre el último entreno o
// partido de verdad, no cualquier respuesta suelta.
export function playerBienestarHistory(playerId) {
  return scheduledBienestar()
    .filter((e) => e.playerId === playerId)
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
}

// Última respuesta (día real de calendario) de cada jugador — lo usa la
// insignia de bienestar de cada tarjeta en Plantilla.
export function latestBienestarByPlayer() {
  const map = {}
  scheduledBienestar().forEach((e) => {
    const current = map[e.playerId]
    if (!current || e.fecha > current.fecha) map[e.playerId] = e
  })
  return map
}

// RPE medio histórico de un jugador (todas sus respuestas en días reales).
export function playerAverageRpe(playerId) {
  const entries = scheduledBienestar().filter((e) => e.playerId === playerId && e.rpe != null)
  return { avg: avg(entries.map((e) => e.rpe)), count: entries.length }
}

// Foto del equipo (recibe la plantilla ya filtrada por equipo) en un día
// real (entreno o partido) con respuestas: RPE medio, bienestar general
// medio, y cuántos de la plantilla han respondido. Sin `fecha`, usa el
// último día con datos — se le puede pasar una fecha concreta (de
// `teamBienestarDates`) para navegar a un día anterior.
export function teamWellnessSnapshot(players, fecha) {
  const playerIds = new Set(players.map((p) => p.id))
  const all = scheduledBienestar().filter((e) => playerIds.has(e.playerId))
  const targetFecha = fecha || all.reduce((max, e) => (e.fecha > max ? e.fecha : max), '')
  if (!targetFecha) return { fecha: null, rpeAvg: null, wellnessAvg: null, responded: 0, total: players.length }
  const todays = all.filter((e) => e.fecha === targetFecha)
  return {
    fecha: targetFecha,
    rpeAvg: avg(todays.map((e) => e.rpe)),
    wellnessAvg: avg(todays.map((e) => wellnessScore(e))),
    responded: todays.length,
    total: players.length,
  }
}

// Evolución día a día de la media del equipo para un campo cualquiera de
// bienestar (rpe, estres, sueno, dolorMuscular, energia, fatiga,
// condicionGeneral) — o de la puntuación compuesta si se pide 'wellnessScore'.
// Devuelve solo los días reales con al menos una respuesta, en orden
// cronológico.
export function teamMetricTrend(players, field) {
  const playerIds = new Set(players.map((p) => p.id))
  const byFecha = {}
  scheduledBienestar().forEach((e) => {
    if (!playerIds.has(e.playerId)) return
    const v = field === 'wellnessScore' ? wellnessScore(e) : e[field]
    if (v == null) return
    if (!byFecha[e.fecha]) byFecha[e.fecha] = []
    byFecha[e.fecha].push(v)
  })
  return Object.entries(byFecha)
    .map(([fecha, vals]) => ({ fecha, avg: avg(vals), count: vals.length }))
    .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
}

// Todas las fechas reales (entreno o partido) con alguna respuesta de
// bienestar de estos jugadores.
export function teamBienestarDates(players) {
  const playerIds = new Set(players.map((p) => p.id))
  const fechas = new Set(scheduledBienestar().filter((e) => playerIds.has(e.playerId)).map((e) => e.fecha))
  return [...fechas].sort()
}

// Reparto de zonas de dolor reportadas (excluyendo "Sin dolor"), de más a
// menos frecuente — para detectar patrones de sobrecarga en el grupo.
export function teamPainBreakdown(players, { onlyLatest = false, fecha } = {}) {
  const playerIds = new Set(players.map((p) => p.id))
  let entries = scheduledBienestar().filter((e) => playerIds.has(e.playerId) && e.dolorZona && !/sin dolor/i.test(e.dolorZona))
  if (onlyLatest) {
    const targetFecha = fecha || entries.reduce((max, e) => (e.fecha > max ? e.fecha : max), '')
    entries = entries.filter((e) => e.fecha === targetFecha)
  }
  const counts = {}
  entries.forEach((e) => { counts[e.dolorZona] = (counts[e.dolorZona] || 0) + 1 })
  return Object.entries(counts)
    .map(([zona, count]) => ({ zona, count }))
    .sort((a, b) => b.count - a.count)
}
