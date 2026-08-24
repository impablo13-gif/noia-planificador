// Cálculos derivados de los partidos importados de NPA Stats: resumen de
// equipo, una estimación sencilla de goles esperados, quintetos en pista por
// gol y desglose por fase de juego. Todo a partir de goalEvents/players que
// NPA Stats ya registra durante el partido — aquí solo se agrega y visualiza.

export function summarize(matches) {
  const s = { partidos: matches.length, goles: 0, encajados: 0, shotsOn: 0, shotsOff: 0, shotsPost: 0, saves: 0, occFor: 0, occAgainst: 0, victorias: 0, empates: 0, derrotas: 0 }
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
      s.shotsPost += p.shotsPost || 0
      s.saves += p.saves || 0
    })
  })
  return s
}

function matchShotTotals(m) {
  return (m.players || []).reduce(
    (acc, p) => {
      acc.on += p.shotsOn || 0
      acc.off += p.shotsOff || 0
      acc.post += p.shotsPost || 0
      acc.saves += p.saves || 0
      return acc
    },
    { on: 0, off: 0, post: 0, saves: 0 },
  )
}

// Un tiro al palo estuvo a centímetros de ser gol (ocasión casi tan clara
// como uno a puerta que no entró); uno fuera es, de media, mucho más
// especulativo. Sin datos de calidad/localización real del tiro no hay
// forma de saberlo tiro a tiro, así que se pondera cada categoría sobre la
// tasa de conversión real de los tiros a puerta de la temporada (heurística,
// no un xG por calidad de tiro) — así los tres tipos nunca valen lo mismo.
const XG_POST_WEIGHT = 0.5
const XG_OFF_WEIGHT = 0.15

// xG en contra a partir de las paradas reales de nuestros porteros: los
// tiros que de verdad afrontó la portería son las paradas más los goles
// encajados (todo tiro a puerta o se para o entra), y se aplica la tasa de
// encaje real de la temporada — así "goles esperados en contra" refleja el
// trabajo del portero, no un recuento genérico de ocasiones del rival.
export function buildMatchRows(matches) {
  const totals = matches.reduce(
    (acc, m) => {
      const t = matchShotTotals(m)
      acc.on += t.on
      acc.post += t.post
      acc.off += t.off
      acc.saves += t.saves
      acc.goles += m.teamGoals || 0
      acc.encajados += m.rivalScore || 0
      return acc
    },
    { on: 0, post: 0, off: 0, saves: 0, goles: 0, encajados: 0 },
  )
  const kOn = totals.on > 0 ? totals.goles / totals.on : 0
  const kPost = kOn * XG_POST_WEIGHT
  const kOff = kOn * XG_OFF_WEIGHT
  const shotsFacedTotal = totals.saves + totals.encajados
  const kAgainst = shotsFacedTotal > 0 ? totals.encajados / shotsFacedTotal : 0

  return matches
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((m) => {
      const t = matchShotTotals(m)
      const shotsFaced = t.saves + (m.rivalScore || 0)
      return {
        ...m,
        shotsOn: t.on,
        shotsOff: t.off,
        shotsPost: t.post,
        saves: t.saves,
        xgFor: +(t.on * kOn + t.post * kPost + t.off * kOff).toFixed(2),
        xgAgainst: +(shotsFaced * kAgainst).toFixed(2),
      }
    })
}

// Filtra partidos de NPA Stats por la competición del partido de Calendario
// enlazado (Liga/Amistoso/Copa) — `competitionByNpaId` es el mapa
// npaMatchId -> competition que ya construyen las vistas de Estadísticas a
// partir de getMatches(). `competition` null/undefined = sin filtrar.
export function filterByCompetition(matches, competitionByNpaId, competition) {
  if (!competition) return matches
  return matches.filter((m) => (competitionByNpaId.get(m.id) || 'Amistoso') === competition)
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
  const agg = { partidos: 0, goles: 0, asistencias: 0, shotsOn: 0, shotsOff: 0, shotsPost: 0, saves: 0, fouls: 0, yellow: 0, red: 0, turnovers: 0, recoveries: 0, seconds: 0 }
  const perMatch = []
  matches.forEach((m) => {
    const p = (m.players || []).find((pl) => (pl.name || '').trim().toLowerCase() === norm)
    if (!p) return
    agg.partidos++
    agg.goles += p.goals || 0
    agg.asistencias += p.assists || 0
    agg.shotsOn += p.shotsOn || 0
    agg.shotsOff += p.shotsOff || 0
    agg.shotsPost += p.shotsPost || 0
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
