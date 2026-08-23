// Cálculos derivados de los partidos importados de NPA Stats: resumen de
// equipo, una estimación sencilla de goles esperados, quintetos en pista por
// gol y desglose por fase de juego. Todo a partir de goalEvents/players que
// NPA Stats ya registra durante el partido — aquí solo se agrega y visualiza.

export function summarize(matches) {
  const s = { partidos: matches.length, goles: 0, encajados: 0, shotsOn: 0, shotsOff: 0, occFor: 0, occAgainst: 0, victorias: 0, empates: 0, derrotas: 0 }
  matches.forEach((m) => {
    const gf = m.teamGoals || 0
    const gc = m.rivalScore || 0
    s.goles += gf
    s.encajados += gc
    s.occFor += m.occFor || 0
    s.occAgainst += m.occAgainst || 0
    if (gf > gc) s.victorias++
    else if (gf < gc) s.derrotas++
    else s.empates++
    ;(m.players || []).forEach((p) => {
      s.shotsOn += p.shotsOn || 0
      s.shotsOff += p.shotsOff || 0
    })
  })
  return s
}

// xG simplificado: no hay datos de calidad/localización del tiro, así que se
// aproxima con la tasa de conversión real de la temporada (goles / tiros a
// puerta, y encajados / ocasiones del rival) aplicada partido a partido. Sirve
// para ver qué partidos se resolvieron por encima o por debajo de lo esperado
// según el volumen de ocasiones generado, no como un xG basado en el tiro.
export function buildMatchRows(matches) {
  const totalShotsOn = matches.reduce((sum, m) => sum + (m.players || []).reduce((s, p) => s + (p.shotsOn || 0), 0), 0)
  const totalGoles = matches.reduce((sum, m) => sum + (m.teamGoals || 0), 0)
  const totalOccAgainst = matches.reduce((sum, m) => sum + (m.occAgainst || 0), 0)
  const totalEncajados = matches.reduce((sum, m) => sum + (m.rivalScore || 0), 0)
  const kFor = totalShotsOn > 0 ? totalGoles / totalShotsOn : 0
  const kAgainst = totalOccAgainst > 0 ? totalEncajados / totalOccAgainst : 0

  return matches
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((m) => {
      const shotsOn = (m.players || []).reduce((s, p) => s + (p.shotsOn || 0), 0)
      return {
        ...m,
        shotsOn,
        xgFor: +(shotsOn * kFor).toFixed(2),
        xgAgainst: +((m.occAgainst || 0) * kAgainst).toFixed(2),
      }
    })
}

export function matchPlayerByName(players, name) {
  const norm = (name || '').trim().toLowerCase()
  if (!norm) return null
  return players.find((p) => p.nombre.trim().toLowerCase() === norm) || null
}

// Agrega, para un jugador por nombre, sus datos across todos los partidos de
// NPA Stats importados (goles/asistencias/tiros/faltas/paradas/minutos…) más
// el desglose partido a partido.
export function computePlayerStats(matches, nombre) {
  const norm = (nombre || '').trim().toLowerCase()
  const agg = { partidos: 0, goles: 0, asistencias: 0, shotsOn: 0, shotsOff: 0, saves: 0, fouls: 0, yellow: 0, red: 0, turnovers: 0, recoveries: 0, seconds: 0 }
  const perMatch = []
  matches.forEach((m) => {
    const p = (m.players || []).find((pl) => (pl.name || '').trim().toLowerCase() === norm)
    if (!p) return
    agg.partidos++
    agg.goles += p.goals || 0
    agg.asistencias += p.assists || 0
    agg.shotsOn += p.shotsOn || 0
    agg.shotsOff += p.shotsOff || 0
    agg.saves += p.saves || 0
    agg.fouls += p.fouls || 0
    agg.yellow += p.yellow || 0
    agg.red += p.red || 0
    agg.turnovers += p.turnovers || 0
    agg.recoveries += p.recoveries || 0
    agg.seconds += p.seconds || 0
    perMatch.push({ matchId: m.id, date: m.date, rivalName: m.rivalName, teamGoals: m.teamGoals, rivalScore: m.rivalScore, ...p })
  })
  perMatch.sort((a, b) => (a.date < b.date ? 1 : -1))
  return { agg, perMatch }
}

function lineupKey(onCourt) {
  return (onCourt || []).map((p) => p.number).sort((a, b) => a - b).join('-')
}

export function computeQuintetos(matches) {
  const forMap = new Map()
  const againstMap = new Map()
  matches.forEach((m) => {
    ;(m.goalEvents || []).forEach((ev) => {
      const key = lineupKey(ev.onCourt)
      if (!key) return
      const map = ev.type === 'for' ? forMap : againstMap
      const entry = map.get(key) || { players: ev.onCourt || [], count: 0 }
      entry.count++
      map.set(key, entry)
    })
  })
  const top = (map) => [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5)
  return { aFavor: top(forMap), enContra: top(againstMap) }
}

export function computeFases(matches) {
  const forMap = {}
  const againstMap = {}
  matches.forEach((m) => {
    ;(m.goalEvents || []).forEach((ev) => {
      const map = ev.type === 'for' ? forMap : againstMap
      const phase = ev.phase || 'Sin especificar'
      map[phase] = (map[phase] || 0) + 1
    })
  })
  const toList = (map) => Object.entries(map).map(([phase, count]) => ({ phase, count })).sort((a, b) => b.count - a.count)
  return { aFavor: toList(forMap), enContra: toList(againstMap) }
}
