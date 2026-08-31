// Sincronización repetible con exports de NPA Stats (la app de relojes/
// rotaciones, en el repo hermano "Nueva carpeta"). Se puede volver a ejecutar
// con un export más reciente sin duplicar jugadores ni partidos: la plantilla
// se actualiza por nombre+equipo (solo dorsal/posición/foto si falta, nunca
// pisa fecha de nacimiento/lateralidad/notas/stats editadas a mano), y los
// partidos se upsertean por una clave estable equipo+fecha.

import {
  getPlayers, savePlayers, addPlayer, uid, saveFile,
  getClubCrestFileId, setClubCrestFileId, upsertPartidosNpa,
  getMatches, addMatch, updateMatch,
  getAsistenciaForDate, setAsistenciaForDate,
  getNpaPlayerAliases, setNpaPlayerAlias, getNpaEquipoAliases, setNpaEquipoAlias,
} from './db.js'
import { matchPlayerByName } from './statsEngine.js'
import { foldName } from './bienestarSync.js'

const NPA_POSICION_MAP = { POR: 'Portero', CIE: 'Cierre', ALA: 'Ala', PIV: 'Pívot' }

// Mismo criterio de emparejamiento por nombre que bienestarSync.js (alias
// confirmado > nombre exacto > solapamiento de palabras, con el último
// token —normalmente el apellido— pesando el doble), aplicado aquí a los
// nombres de jugador del export de un solo partido de NPA Stats en vez de
// a las respuestas del cuestionario. Motes, acentos o apellidos que no
// coincidan letra por letra con la Plantilla dejaban antes a todo el mundo
// como "no encontrado" (ver `previewNpaMatchImport`, que usa esto para
// sugerir un emparejamiento en el aviso de revisión antes de importar).
function tokenOverlapScore(nameTokens, rosterTokens) {
  let score = 0
  nameTokens.forEach((t, i) => {
    if (t.length <= 2) return
    const weight = i === nameTokens.length - 1 && nameTokens.length > 1 ? 2 : 1
    rosterTokens.forEach((rt) => {
      if (rt.length <= 2) return
      if (t === rt || t.startsWith(rt) || rt.startsWith(t)) score += weight
    })
  })
  return score
}

function matchNpaPlayer(players, npaName, aliases) {
  const norm = foldName(npaName)
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
  return null
}

async function dataUriToFileId(dataUri, filename) {
  const res = await fetch(dataUri)
  const blob = await res.blob()
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' })
  return saveFile(file)
}

async function htmlToFileId(html, filename) {
  const file = new File([html], filename, { type: 'text/html' })
  return saveFile(file)
}

function emptyMatchStats() {
  return { partidos: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0, minutos: 0, cargaFisica: 0 }
}

export function isNpaExport(data) {
  return Boolean(data && data.formato === 'npa-stats-copia' && data.datos)
}

// Export ligero de un solo partido (botón "Descargar datos (JSON)" en el
// informe de NPA Stats) — misma idea que la copia de seguridad completa,
// pero sin plantillas/escudos, pensado para subir partido a partido sin
// tener que generar la copia de seguridad entera cada vez.
export function isNpaMatchExport(data) {
  return Boolean(data && data.formato === 'npa-stats-partido' && data.partido)
}

const DIACRITICS_RE = new RegExp('[̀-ͯ]', 'g')

function slug(s) {
  return (s || '')
    .toString().toLowerCase().normalize('NFD').replace(DIACRITICS_RE, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export async function syncNpaExport(data) {
  const datos = data.datos || {}
  const teams = JSON.parse(datos.teams || '[]')
  const players = getPlayers()
  const byKey = new Map(players.map((p) => [`${p.nombre.trim().toLowerCase()}|${p.equipo || ''}`, p]))

  let playersAdded = 0
  let playersUpdated = 0

  for (const team of teams) {
    const rosterRaw = datos[`roster:${team.id}`]
    const equipo = team.subtitle || team.name || ''

    if (rosterRaw) {
      const roster = JSON.parse(rosterRaw)
      for (const p of roster) {
        const nombre = (p.name || '').toString().trim()
        if (!nombre) continue
        const key = `${nombre.toLowerCase()}|${equipo}`
        const existing = byKey.get(key)
        const posicion = NPA_POSICION_MAP[p.position] || 'Ala'

        if (existing) {
          let changed = false
          if (existing.dorsal !== p.number && p.number != null) { existing.dorsal = p.number; changed = true }
          if (existing.posicion !== posicion) { existing.posicion = posicion; changed = true }
          if (!existing.fotoFileId && p.photo && p.photo.startsWith('data:')) {
            existing.fotoFileId = await dataUriToFileId(p.photo, `${nombre}.jpg`)
            changed = true
          }
          if (changed) playersUpdated++
        } else {
          let fotoFileId = null
          if (p.photo && typeof p.photo === 'string' && p.photo.startsWith('data:')) {
            fotoFileId = await dataUriToFileId(p.photo, `${nombre}.jpg`)
          }
          const fresh = {
            id: uid(), nombre, dorsal: p.number ?? '', posicion, equipo,
            fechaNacimiento: '', lateralidad: '', clubProcedencia: '', fotoFileId, notas: '',
            stats: emptyMatchStats(),
          }
          players.push(fresh)
          byKey.set(key, fresh)
          playersAdded++
        }
      }
    }

    if (!getClubCrestFileId() && team.crest && /juvenil/i.test(equipo || team.name || '')) {
      const crestId = await dataUriToFileId(team.crest, 'escudo-club.jpg')
      setClubCrestFileId(crestId)
    }
  }
  savePlayers(players)

  // Partidos: cada clave "matches:<teamId>:<isoDate>" es un partido completo,
  // con goalEvents (onCourt + fase de juego) y stats por jugador ya incluidos.
  const teamNameById = new Map(teams.map((t) => [t.id, t.subtitle || t.name || '']))
  const matchKeys = Object.keys(datos).filter((k) => k.startsWith('matches:'))
  const parsedMatches = matchKeys.map((key) => {
    // La clave es "matches:<teamId>:<isoDate>" — el isoDate en sí contiene
    // ":" (horas:minutos:segundos), así que solo se puede partir por el
    // primer ":" tras el prefijo, nunca con un split(':') genérico.
    const rest = key.slice('matches:'.length)
    const sep = rest.indexOf(':')
    const teamId = rest.slice(0, sep)
    const isoDate = rest.slice(sep + 1)
    const m = JSON.parse(datos[key])
    return {
      id: `${teamId}__${isoDate}`,
      equipo: teamNameById.get(teamId) || '',
      date: m.date,
      rivalName: m.rivalName,
      teamGoals: m.teamGoals,
      rivalScore: m.rivalScore,
      occFor: m.occFor || 0,
      occAgainst: m.occAgainst || 0,
      halfLength: m.halfLength,
      venue: m.venue,
      startTime: m.startTime,
      players: m.players || [],
      goalEvents: m.goalEvents || [],
      convocados: m.convocados || null,
      reportHtml: m.reportHtml || null,
      reportGeneratedAt: m.reportGeneratedAt || null,
    }
  })
  const { added: matchesAdded, updated: matchesUpdated } = upsertPartidosNpa(parsedMatches)
  const rest = await applyParsedMatches(parsedMatches, players)

  return { playersAdded, playersUpdated, matchesAdded, matchesUpdated, ...rest }
}

// Compartido entre la copia de seguridad completa y el export de un solo
// partido: enlaza cada partido de NPA Stats con su partido del Calendario
// (mismo día + mismo equipo, deducido del propio export) y rellena la
// Asistencia de esa fecha. Si ya existe en el Calendario (p. ej. la jornada
// de liga sembrada), se le adjunta el resultado y el npaMatchId; si no
// existe (un amistoso que no habías programado), se crea directamente, ya
// clasificado, para que aparezca al pulsar ese día.
async function applyParsedMatches(parsedMatches, players) {
  let calendarMatchesLinked = 0
  let calendarMatchesCreated = 0
  let reportsSynced = 0
  let attendanceMarked = 0
  const calendarMatches = getMatches()
  for (const pm of parsedMatches) {
    const dayISO = pm.date.slice(0, 10)
    const resultText = `Noia ${pm.teamGoals} - ${pm.rivalScore} ${pm.rivalName}`

    // Asistencia: se rellena solo con quien apareció en ese partido —
    // convocatoria si Pablo la hizo en NPA Stats (cuenta también al que se
    // quedó en el banquillo), o quien sumó minutos si no hay convocatoria
    // guardada. Nunca pisa un estado ya puesto a mano (p. ej. una lesión).
    const attendees = pm.convocados && pm.convocados.length
      ? pm.convocados
      : (pm.players || []).filter((p) => (p.seconds || 0) > 0)
    if (attendees.length) {
      const existingAsist = getAsistenciaForDate(dayISO)
      const estados = { ...(existingAsist?.estados || {}) }
      let changed = false
      attendees.forEach((a) => {
        const player = matchPlayerByName(players, a.name)
        if (player && !estados[player.id]) {
          estados[player.id] = 'presente'
          changed = true
          attendanceMarked++
        }
      })
      if (changed) setAsistenciaForDate(dayISO, estados)
    }
    const existingCal = calendarMatches.find(
      (cm) => cm.date === dayISO && (cm.equipo === pm.equipo || !cm.equipo) && (!cm.npaMatchId || cm.npaMatchId === pm.id),
    )
    if (existingCal) {
      const patch = { npaMatchId: pm.id, equipo: pm.equipo, resultText: existingCal.resultText || resultText, status: 'jugado' }
      // El informe completo (con fotos, mapas de calor, etc.) generado en NPA
      // Stats se adjunta solo — Pablo no tiene que subir ni copiar nada — y
      // solo se vuelve a guardar si hay una versión más reciente que la que
      // ya está adjunta (evita duplicar el archivo en cada sincronización).
      if (pm.reportHtml && pm.reportGeneratedAt !== existingCal.npaReportGeneratedAt) {
        patch.npaReportFileId = await htmlToFileId(pm.reportHtml, `informe-${dayISO}.html`)
        patch.npaReportGeneratedAt = pm.reportGeneratedAt
        reportsSynced++
      }
      updateMatch(existingCal.id, patch)
      Object.assign(existingCal, patch)
      calendarMatchesLinked++
    } else {
      const newId = `npa-${pm.id}`
      const fresh = {
        id: newId, date: dayISO, time: pm.startTime || '', competition: 'Amistoso', vuelta: null,
        equipo: pm.equipo, superficie: '', observaciones: '', opponentId: null, isHome: null,
        resultText, reportText: '', reportFileId: null, npaMatchId: pm.id, status: 'jugado',
        npaReportFileId: null, npaReportGeneratedAt: null,
      }
      if (pm.reportHtml) {
        fresh.npaReportFileId = await htmlToFileId(pm.reportHtml, `informe-${dayISO}.html`)
        fresh.npaReportGeneratedAt = pm.reportGeneratedAt
        reportsSynced++
      }
      addMatch(fresh)
      calendarMatches.push(fresh)
      calendarMatchesCreated++
    }
  }

  return { calendarMatchesLinked, calendarMatchesCreated, reportsSynced, attendanceMarked }
}

// Export ligero de un solo partido: no trae plantillas ni escudos, así que
// solo casa jugadores por nombre contra la plantilla ya existente en la app
// (nunca crea jugadores nuevos desde aquí, al no tener dorsal/posición
// fiables) y avisa de los nombres que no ha podido casar, para que Pablo
// sepa que a esos habrá que darles minutos/goles a mano.
export async function syncNpaMatchExport(data) {
  const equipo = data.equipo || ''
  const m = data.partido
  const players = getPlayers()

  const pm = {
    id: `manual-${slug(equipo)}__${m.date}`,
    equipo,
    date: m.date,
    rivalName: m.rivalName,
    teamGoals: m.teamGoals,
    rivalScore: m.rivalScore,
    occFor: m.occFor || 0,
    occAgainst: m.occAgainst || 0,
    halfLength: m.halfLength,
    venue: m.venue,
    startTime: m.startTime,
    players: m.players || [],
    goalEvents: m.goalEvents || [],
    convocados: m.convocados || null,
    reportHtml: null,
    reportGeneratedAt: m.reportGeneratedAt || null,
  }

  const unmatchedPlayers = [...new Set(
    (pm.players || [])
      .map((p) => (p.name || '').trim())
      .filter((name) => name && !matchPlayerByName(players, name)),
  )]

  const { added: matchesAdded, updated: matchesUpdated } = upsertPartidosNpa([pm])
  const rest = await applyParsedMatches([pm], players)

  return { playersAdded: 0, playersUpdated: 0, matchesAdded, matchesUpdated, ...rest, unmatchedPlayers }
}

// Primer paso al subir un export de un solo partido: NO guarda nada
// todavía, solo prepara lo que hace falta para el aviso de revisión (equipo
// + cada jugador con su mejor candidato de la Plantilla, si lo hay) para
// que Pablo pueda corregir a mano antes de aplicar — ver `applyNpaMatchImport`.
// La copia de seguridad completa (`isNpaExport`) no pasa por aquí: ya trae
// dorsal/posición/foto fiables de cada jugador y se sincroniza directa,
// como siempre.
export function previewNpaMatchImport(data) {
  if (isNpaExport(data)) return { kind: 'full', data }
  if (!isNpaMatchExport(data)) throw new Error('ese archivo no parece un export de NPA Stats')

  const m = data.partido
  const npaEquipo = (data.equipo || '').trim()
  const players = getPlayers()
  const equipoAliases = getNpaEquipoAliases()
  const rosterEquipos = [...new Set(players.map((p) => p.equipo).filter(Boolean))]
  const aliasedEquipo = equipoAliases[npaEquipo]
  // Pablo solo sube a NPA Stats los partidos del Juvenil, así que si hay más
  // de un equipo en la Plantilla (p. ej. también "1º Equipo") y nada más
  // decide, se prefiere el que tenga "juvenil" en el nombre antes que dejarlo
  // en blanco — mismo criterio que ya usa Estadísticas para el equipo por
  // defecto.
  const equipoGuess = (aliasedEquipo && rosterEquipos.includes(aliasedEquipo)) ? aliasedEquipo
    : rosterEquipos.includes(npaEquipo) ? npaEquipo
    : rosterEquipos.length === 1 ? rosterEquipos[0]
    : rosterEquipos.find((eq) => /juvenil/i.test(eq)) || ''

  const playerAliases = getNpaPlayerAliases()
  const playerRows = (m.players || []).map((p) => {
    const npaName = (p.name || '').trim()
    const matched = npaName ? matchNpaPlayer(players, npaName, playerAliases) : null
    return { npaName, npaNumber: p.number ?? '', npaPosition: p.position || '', matchedId: matched ? matched.id : null }
  }).filter((r) => r.npaName)

  return { kind: 'match', data, npaEquipo, equipoGuess, rosterEquipos, playerRows }
}

// Segundo paso: aplica el import ya con el equipo y el emparejamiento de
// cada jugador que Pablo confirmó en el aviso de revisión.
// `assignments` es un objeto `{ [npaName]: playerId | 'NEW' | '' }` —
// '' significa "sin asignar" (ese jugador se queda sin casar, como antes).
// Cada elección queda guardada como alias para siempre, y el nombre y el
// equipo dentro del partido importado se reescriben a la forma exacta de la
// Plantilla — así, más adelante, cualquier sitio de la app que busque por
// nombre (fichas de jugador, quintetos, asistencia…) lo reconoce sin tener
// que enterarse de que existen alias.
export async function applyNpaMatchImport(preview, { equipo, assignments }) {
  const data = preview.data
  const equipoFinal = (equipo || '').trim()
  if (preview.npaEquipo) setNpaEquipoAlias(preview.npaEquipo, equipoFinal)

  let players = getPlayers()
  let playersAdded = 0
  const nameMap = new Map() // nombre de NPA Stats (trim) -> nombre canónico de la Plantilla

  for (const row of preview.playerRows) {
    const choice = assignments[row.npaName]
    if (!choice) continue // sin asignar: se deja tal cual, como hasta ahora
    let player
    if (choice === 'NEW') {
      const posicion = NPA_POSICION_MAP[row.npaPosition] || 'Ala'
      players = addPlayer({ nombre: row.npaName, dorsal: row.npaNumber ?? '', posicion, equipo: equipoFinal, fechaNacimiento: '', lateralidad: '', clubProcedencia: '', fotoFileId: null, notas: '' })
      player = players[players.length - 1]
      playersAdded++
    } else {
      player = players.find((p) => p.id === choice)
    }
    if (!player) continue
    setNpaPlayerAlias(foldName(row.npaName), player.id)
    nameMap.set(row.npaName, player.nombre)
  }

  const renombra = (nombre) => (nombre && nameMap.has(nombre.trim())) ? nameMap.get(nombre.trim()) : nombre
  const m = data.partido
  const patchedPartido = {
    ...m,
    players: (m.players || []).map((p) => ({ ...p, name: renombra(p.name) })),
    goalEvents: (m.goalEvents || []).map((ev) => ({
      ...ev,
      authorName: renombra(ev.authorName),
      assistName: renombra(ev.assistName),
      onCourt: (ev.onCourt || []).map((oc) => ({ ...oc, name: renombra(oc.name) })),
    })),
    convocados: (m.convocados || null) && m.convocados.map((c) => ({ ...c, name: renombra(c.name) })),
  }

  const rest = await syncNpaMatchExport({ ...data, equipo: equipoFinal, partido: patchedPartido })
  return { ...rest, playersAdded }
}
