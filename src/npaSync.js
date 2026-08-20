// Sincronización repetible con exports de NPA Stats (la app de relojes/
// rotaciones, en el repo hermano "Nueva carpeta"). Se puede volver a ejecutar
// con un export más reciente sin duplicar jugadores ni partidos: la plantilla
// se actualiza por nombre+equipo (solo dorsal/posición/foto si falta, nunca
// pisa fecha de nacimiento/lateralidad/notas/stats editadas a mano), y los
// partidos se upsertean por una clave estable equipo+fecha.

import {
  getPlayers, savePlayers, uid, saveFile,
  getClubCrestFileId, setClubCrestFileId, upsertPartidosNpa,
  getMatches, addMatch, updateMatch,
} from './db.js'

const NPA_POSICION_MAP = { POR: 'Portero', CIE: 'Cierre', ALA: 'Ala', PIV: 'Pívot' }

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
      reportHtml: m.reportHtml || null,
      reportGeneratedAt: m.reportGeneratedAt || null,
    }
  })
  const { added: matchesAdded, updated: matchesUpdated } = upsertPartidosNpa(parsedMatches)

  // Enlazar cada partido de NPA Stats con su partido del Calendario (mismo
  // día + mismo equipo, deducido del propio export): si ya existe (p. ej. la
  // jornada de liga sembrada), se le adjunta el resultado y el npaMatchId; si
  // no existe (un amistoso que no habías programado), se crea directamente
  // en el calendario, ya clasificado, para que aparezca al pulsar ese día.
  let calendarMatchesLinked = 0
  let calendarMatchesCreated = 0
  let reportsSynced = 0
  const calendarMatches = getMatches()
  for (const pm of parsedMatches) {
    const dayISO = pm.date.slice(0, 10)
    const resultText = `Noia ${pm.teamGoals} - ${pm.rivalScore} ${pm.rivalName}`
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

  return { playersAdded, playersUpdated, matchesAdded, matchesUpdated, calendarMatchesLinked, calendarMatchesCreated, reportsSynced }
}
