// Sincronización con el cuestionario diario de bienestar/RPE (Google Forms →
// Google Sheets). Pablo copia las filas nuevas de la hoja de respuestas y las
// pega con el botón "Pegar bienestar" — sin exportar ni subir ningún archivo,
// sin necesitar conexión en vivo a Google Sheets (evita problemas de
// permisos/CORS con la hoja).
//
// La fecha real de cada respuesta se calcula así:
//
// Para el RPE (post-entreno): si se responde por la mañana o hasta media
// tarde (antes de las 17:00, hora de "Marca temporal"), es sobre la sesión
// de AYER, sin excepción — a esas horas el entreno de hoy (por la tarde/
// noche) todavía no ha pasado. En ese caso se ignora "Fecha de hoy" a
// propósito: muchos jugadores, al rellenarlo la mañana siguiente, escriben
// ahí el día en el que están (hoy), no el día del entreno que describen
// (ayer), así que fiarse de ese campo en este caso concreto daría la fecha
// equivocada. Respondido ya de tarde/noche (17:00 en adelante), se asume
// que es sobre el entreno de hoy mismo.
//
// Para el Wellness (pre-entreno) y para cualquier caso donde no aplique lo
// anterior: si "Fecha de hoy" contiene una fecha con año verosímil (temporada
// actual), se usa esa. Si no es válida o el año no es verosímil (algunos
// jugadores pusieron su fecha de nacimiento el primer día, o hay erratas de
// tecleo tipo "0026"), se cae de vuelta a la fecha de "Marca temporal" (el
// timestamp automático de Google Forms, que nunca falla).
//
// El nombre que cada jugador escribe en el formulario casi nunca coincide
// tal cual con el de la plantilla (motes, solo el nombre de pila, apellidos
// en otro orden…). `matchPlayer` combina tres niveles automáticos y, si
// ninguno acierta con seguridad, deja el nombre para que Pablo lo resuelva
// una vez a mano (`resolveUnmatchedName`) — a partir de ahí queda recordado
// para siempre en `noia-plan:bienestarAliases`, así que nunca hay que
// volver a adivinarlo ni resolverlo dos veces.
//
// Pablo tiene DOS formularios separados que alimentan el mismo registro
// diario de cada jugador: "Cuestionario WELLNESS" (antes del entreno —
// estado, estrés, sueño, dolor, energía, fatiga, condición general, SIN
// RPE) y "Cuestionario RPE" (después del entreno — estado, dolor otra vez
// por si cambió durante la sesión, y el RPE 1-10, SIN los campos de
// bienestar). Cada sincronización solo escribe los campos que su
// formulario de origen realmente pregunta y conserva lo que ya hubiera de
// la otra — así, aunque lleguen en momentos distintos del día y por
// caminos distintos, ambos acaban fusionados en la misma entrada
// `${playerId}__${fecha}` sin que uno borre lo que puso el otro.

import { getPlayers, getBienestar, upsertBienestar, getBienestarAliases, setBienestarAlias, getAsistenciaForDate } from './db.js'
import { parseISODate, addDays, toISODate } from './dateUtils.js'

function toISOFromTimestamp(ts) {
  const datePart = (ts || '').trim().split(' ')[0]
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart
  // Admite "/", "-" y "." como separador de fecha — según la configuración
  // regional de la hoja, Google Sheets puede copiar cualquiera de los tres.
  const m = datePart.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

// Hora (0-23) de "Marca temporal" — segunda "palabra" del timestamp, antes
// de los dos puntos. Null si no se puede leer.
function timestampHour(ts) {
  const parts = (ts || '').trim().split(/\s+/)
  if (parts.length < 2) return null
  const m = parts[1].match(/^(\d{1,2}):/)
  return m ? Number(m[1]) : null
}

// Antes de esta hora, una respuesta de RPE es sobre el entreno de AYER —
// coincide con el criterio de Pablo ("por la mañana o hasta las 16/17").
const RPE_MORNING_CUTOFF_HOUR = 17

// Año verosímil para "hoy" dentro de una temporada — descarta fechas de
// nacimiento (años ~2005-2015 en jugadores juveniles) y erratas de tecleo.
function isPlausibleTodayYear(iso) {
  const year = Number((iso || '').slice(0, 4))
  return year >= 2024 && year <= 2030
}

// `hasRpe` marca si la fila viene de un formulario que pregunta RPE (el
// "Cuestionario RPE" o el combinado antiguo) — solo en ese caso se aplica la
// regla de "respondido antes de las 17:00 → es de ayer", porque el Wellness
// es de antes del entreno y una respuesta de mañana ahí sí es de hoy.
function resolveFecha(marcaTemporal, fechaDeHoy, hasRpe) {
  const marcaFecha = toISOFromTimestamp(marcaTemporal)
  if (hasRpe && marcaFecha) {
    const hour = timestampHour(marcaTemporal)
    if (hour != null && hour < RPE_MORNING_CUTOFF_HOUR) {
      return toISODate(addDays(parseISODate(marcaFecha), -1))
    }
  }
  const fromField = toISOFromTimestamp(fechaDeHoy)
  if (fromField && isPlausibleTodayYear(fromField)) return fromField
  return marcaFecha
}

export function foldName(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function levenshtein1OrLess(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false
  if (a === b) return true
  const [s, l] = a.length <= b.length ? [a, b] : [b, a]
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== l[i]) {
      return s.length === l.length ? s.slice(i + 1) === l.slice(i + 1) : s.slice(i) === l.slice(i + 1)
    }
  }
  return true
}

// Puntúa cuánto se parece el nombre del formulario (sheetTokens) al nombre
// de un jugador de la plantilla (rosterTokens). El último token del nombre
// del formulario (normalmente el apellido) pesa el doble que el resto,
// porque el nombre de pila solo no distingue entre jugadores que lo
// comparten (p. ej. dos "Mateo" o dos "Adrián" en la plantilla) — el
// apellido (o el trozo de apellido del que sale un mote como "Troiti") sí.
function tokenOverlapScore(sheetTokens, rosterTokens) {
  let score = 0
  sheetTokens.forEach((t, i) => {
    if (t.length <= 2) return
    const weight = i === sheetTokens.length - 1 && sheetTokens.length > 1 ? 2 : 1
    rosterTokens.forEach((rt) => {
      if (rt.length <= 2) return
      if (t === rt || t.startsWith(rt) || rt.startsWith(t)) score += weight
    })
  })
  return score
}

// Empareja el nombre libre del formulario con la plantilla, en orden:
// 1) alias ya confirmado antes (a mano o automáticamente) para ese nombre
//    exacto — el más fiable, cero ambigüedad;
// 2) coincidencia exacta de nombre completo;
// 3) solapamiento de palabras ponderado (ver `tokenOverlapScore`), solo si
//    hay una coincidencia que gane claramente a la segunda mejor;
// 4) tolerar 1 letra de diferencia en la primera palabra (variantes de
//    escritura tipo Lukas/Lucas), solo si hay una única candidata posible.
// Si nada desempata con claridad, no empareja — mejor dejarlo sin responder
// (aparece en el resumen de la sincronización, resoluble a mano una vez con
// `resolveUnmatchedName`) que asignarle datos de otro jugador.
function matchPlayer(players, sheetName, aliases) {
  const norm = foldName(sheetName)
  if (!norm) return null

  const aliasId = aliases?.[norm]
  if (aliasId) {
    const aliased = players.find((p) => p.id === aliasId)
    if (aliased) return aliased
  }

  const exact = players.find((p) => foldName(p.nombre) === norm)
  if (exact) return exact

  const tokens = norm.split(/\s+/)
  const scored = players
    .map((p) => ({ p, score: tokenOverlapScore(tokens, foldName(p.nombre).split(/\s+/)) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
  if (scored.length && (scored.length === 1 || scored[0].score > scored[1].score)) {
    return scored[0].p
  }

  const firstToken = tokens[0]
  const fuzzy = players.filter((p) => levenshtein1OrLess(foldName(p.nombre), firstToken))
  return fuzzy.length === 1 ? fuzzy[0] : null
}

// Guarda (o confirma) manualmente a qué jugador corresponde un nombre del
// cuestionario que la sincronización no pudo resolver sola. Queda memorizado
// para siempre — la próxima sincronización, y todas las siguientes, lo
// reconocerán al instante sin volver a preguntar.
export function resolveUnmatchedName(sheetName, playerId) {
  setBienestarAlias(foldName(sheetName), playerId)
}

// Construye solo los campos que ese formulario en concreto pregunta —
// `col.x === undefined` significa "esta fuente no toca ese campo", y se deja
// tal cual estuviera ya guardado (ver `syncBienestarRows`), no se borra.
function buildPartialEntry(r, col) {
  const num = (idx) => {
    if (idx === undefined) return undefined
    const v = Number(r[idx])
    return Number.isFinite(v) && r[idx] !== '' ? v : null
  }
  const str = (idx) => (idx === undefined ? undefined : (r[idx] || ''))
  const patch = {}
  const estado = str(col.estado); if (estado !== undefined) patch.estado = estado
  const estres = num(col.estres); if (estres !== undefined) patch.estres = estres
  const sueno = num(col.sueno); if (sueno !== undefined) patch.sueno = sueno
  const dolorMuscular = num(col.dolorMuscular); if (dolorMuscular !== undefined) patch.dolorMuscular = dolorMuscular
  const dolorZona = str(col.localizacion); if (dolorZona !== undefined) patch.dolorZona = dolorZona
  const observacion = str(col.observacion); if (observacion !== undefined) patch.observacion = observacion
  const energia = num(col.energia); if (energia !== undefined) patch.energia = energia
  const fatiga = num(col.fatiga); if (fatiga !== undefined) patch.fatiga = fatiga
  const condicionGeneral = num(col.condicion); if (condicionGeneral !== undefined) patch.condicionGeneral = condicionGeneral
  const rpe = num(col.rpe); if (rpe !== undefined) patch.rpe = rpe
  return patch
}

// Núcleo de la sincronización: recibe filas ya partidas en campos y una
// función que decide, fila a fila, de qué formulario viene cada una (ver
// `pasteColFor`) — así una misma tanda pegada puede traer filas de Wellness
// y de RPE mezcladas y cada una se resuelve por separado.
function syncBienestarRows(rows, colFor) {
  const players = getPlayers()
  const aliases = getBienestarAliases()
  const existingById = new Map(getBienestar().map((e) => [e.id, e]))
  const entries = []
  const unmatched = new Set()

  for (const r of rows) {
    const col = typeof colFor === 'function' ? colFor(r) : colFor
    const nombreSheet = (r[col.nombre] || '').trim()
    if (!nombreSheet) continue
    const fecha = resolveFecha(r[col.ts], r[col.fechaHoy], col.rpe !== undefined)
    if (!fecha) continue
    const player = matchPlayer(players, nombreSheet, aliases)
    if (!player) { unmatched.add(nombreSheet); continue }
    // Refuerza el alias con cada acierto (venga del nivel que venga) para
    // que futuras sincronizaciones sean cada vez más rápidas y fiables.
    const key = foldName(nombreSheet)
    if (aliases[key] !== player.id) { aliases[key] = player.id; setBienestarAlias(key, player.id) }

    const id = `${player.id}__${fecha}`
    const base = existingById.get(id) || { id, playerId: player.id, fecha }
    const patch = buildPartialEntry(r, col)
    const merged = { ...base, ...patch, timestamp: r[col.ts] || base.timestamp || '' }
    existingById.set(id, merged)
    entries.push(merged)
  }

  const { added, updated } = upsertBienestar(entries)

  const lastFecha = entries.reduce((max, e) => (e.fecha > max ? e.fecha : max), '')
  const respondedIds = new Set(entries.filter((e) => e.fecha === lastFecha).map((e) => e.playerId))
  const equipoDelDia = (() => {
    const counts = {}
    entries.filter((e) => e.fecha === lastFecha).forEach((e) => {
      const p = players.find((pl) => pl.id === e.playerId)
      if (p?.equipo) counts[p.equipo] = (counts[p.equipo] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
  })()
  // Si hay asistencia registrada para ese día, "sin responder" solo cuenta a
  // quien de verdad estuvo en la sesión — no tiene sentido reclamarle el RPE
  // a quien no entrenó. Sin asistencia registrada, se asume toda la plantilla
  // del equipo (comportamiento de siempre).
  const asistencia = lastFecha ? getAsistenciaForDate(lastFecha) : null
  const missing = equipoDelDia
    ? players
        .filter((p) => p.equipo === equipoDelDia && !respondedIds.has(p.id))
        .filter((p) => !asistencia || (asistencia.estados[p.id] || 'presente') === 'presente')
        .map((p) => p.nombre)
    : []

  return { added, updated, unmatched: [...unmatched], lastFecha, missing }
}

// Pablo tiene dos formularios en su orden fijo real, tal cual los genera
// Google Sheets, más el formato combinado antiguo (un único formulario que
// hacía las dos cosas a la vez, por si queda algún pegado de ese tipo por
// ahí) — se usan para el "pegar directamente" (sin cabecera, sin exportar
// ni subir ningún archivo).
const COLS_COMBINED = [
  'ts', 'nombre', 'fechaHoy', 'estado', 'estres', 'sueno', 'dolorMuscular',
  'localizacion', 'observacion', 'energia', 'fatiga', 'condicion', 'rpe',
]
const COLS_WELLNESS = [
  'ts', 'nombre', 'fechaHoy', 'estado', 'estres', 'sueno', 'dolorMuscular',
  'localizacion', 'observacion', 'energia', 'fatiga', 'condicion',
]
const COLS_RPE = [
  'ts', 'nombre', 'fechaHoy', 'estado', 'dolorMuscular', 'localizacion', 'observacion', 'rpe',
]
const toColMap = (cols) => Object.fromEntries(cols.map((k, i) => [k, i]))
const COL_COMBINED = toColMap(COLS_COMBINED)
const COL_WELLNESS = toColMap(COLS_WELLNESS)
const COL_RPE = toColMap(COLS_RPE)

// Cada fila pegada puede venir de cualquiera de los dos formularios (o del
// antiguo combinado) — se distingue solo por cuántos campos trae: el
// "Cuestionario RPE" tiene 8 (hasta el RPE final), el "Cuestionario
// WELLNESS" 12 (sin RPE), y el combinado antiguo 13 (con todo). Se elige el
// más cercano en vez de exigir un número exacto, por si el copiado pierde
// algún campo vacío al final.
function pasteColFor(row) {
  if (row.length >= 13) return COL_COMBINED
  if (row.length >= 10) return COL_WELLNESS
  return COL_RPE
}

// Una fila copiada de Google Sheets viene separada por tabuladores reales;
// si el camino de copiar/pegar los convirtió en espacios (pasa en algunos
// editores), se recurre a bloques de 2+ espacios como alternativa.
function splitPasteRow(line) {
  const byTab = line.split('\t')
  if (byTab.length > 1) return byTab
  return line.split(/ {2,}/)
}

// Un timestamp de Google Forms al principio de la línea: "DD/MM/AAAA HH:MM...".
// Tolera un BOM/espacio invisible delante (a veces se cuela al copiar) y
// "/", "-" o "." como separador de fecha (depende de la configuración
// regional de la hoja).
const TIMESTAMP_LINE_RE = /^[﻿​]*\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\s+\d{1,2}:\d{2}/

// Quita el BOM inicial (frecuente al copiar de Excel) y normaliza saltos de
// línea CRLF (Windows/Excel) a LF antes de partir en filas.
function normalizePasteText(text) {
  return (text || '').replace(/^﻿/, '').replace(/\r\n/g, '\n')
}

export function looksLikePastedBienestar(text) {
  // Cualquier línea vale, no solo la primera — así una fila de cabecera, una
  // línea en blanco suelta o un carácter invisible al principio del bloque
  // no hacen que se rechace todo el pegado por error.
  return normalizePasteText(text)
    .split('\n')
    .some((line) => TIMESTAMP_LINE_RE.test(line.trim()))
}

// Acepta filas pegadas de cualquiera de los dos formularios, incluso
// mezcladas en el mismo pegado — cada fila se resuelve por separado. Las
// líneas que no empiezan por un timestamp real (cabecera colada, línea en
// blanco…) se ignoran en vez de romper el resto del pegado.
export function syncBienestarPaste(text) {
  const rows = normalizePasteText(text)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => TIMESTAMP_LINE_RE.test(line))
    .map(splitPasteRow)
  if (rows.length === 0) return { added: 0, updated: 0, unmatched: [], lastFecha: null, missing: [] }

  return syncBienestarRows(rows, pasteColFor)
}
