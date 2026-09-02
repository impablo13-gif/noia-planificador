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

// Mismo catálogo de fases (clave, etiqueta, grupo, color) que NPA Stats usa
// al etiquetar cada gol en directo -- se repite aquí en vez de importarse
// porque son dos repos hermanos independientes, pero las claves tienen que
// coincidir letra por letra con las que llegan en goalEvents[].phase.
export const GOAL_PHASES = [
  { key: 'ABP', label: 'ABP', group: 1, color: '#8E5FD9' },
  { key: 'Ataque Posicional', label: 'Ataque Posicional', group: 2, color: '#E0A030' },
  { key: 'Incorporación', label: 'Incorporación', group: 2, color: '#E0A030' },
  { key: 'Recuperación', label: 'Recuperación', group: 3, color: '#2FBF87' },
  { key: 'Transición', label: 'Transición', group: 3, color: '#2FBF87' },
  { key: '5x4', label: '5x4', group: 4, color: '#3B82C4' },
  { key: '4x5', label: '4x5', group: 4, color: '#3B82C4' },
  { key: '4x3', label: '4x3', group: 5, color: '#E08A3C' },
  { key: '3x4', label: '3x4', group: 5, color: '#E08A3C' },
  { key: '6M (Penalti)', label: '6M (Penalti)', group: 6, color: '#c21f26' },
  { key: '10M (Doble penalti)', label: '10M (Doble penalti)', group: 6, color: '#8a141a' },
  { key: 'En propia', label: 'En propia', group: 7, color: '#8a8a8a' },
]

export const GOAL_PHASE_GROUPS = (() => {
  const map = new Map()
  GOAL_PHASES.forEach((p) => {
    if (!map.has(p.group)) map.set(p.group, { id: p.group, color: p.color, phases: [] })
    map.get(p.group).phases.push(p)
  })
  return [...map.values()]
    .sort((a, b) => a.id - b.id)
    .map((g) => ({ ...g, label: g.phases.map((p) => p.label).join(' / ') }))
})()

// Marcador de fases de gol al estilo del informe de Emanuel Santoro: una
// fila por partido con el recuento por fase, a favor y en contra, más los
// totales de temporada -- base tanto del panel de la app como del Excel
// exportable. Un gol con una fase que ya no exista en GOAL_PHASES (formato
// antiguo, o texto libre) no se pierde: se cuenta igual en el total del
// bloque aunque no tenga columna propia en la tabla.
export function computeFaseGolStats(matches) {
  const rows = matches
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((m) => {
      const forCounts = {}, againstCounts = {}
      GOAL_PHASES.forEach((p) => { forCounts[p.key] = 0; againstCounts[p.key] = 0 })
      ;(m.goalEvents || []).forEach((ev) => {
        const bucket = ev.type === 'for' ? forCounts : againstCounts
        const key = ev.phase || 'Sin especificar'
        bucket[key] = (bucket[key] || 0) + 1
      })
      return { id: m.id, date: m.date, rivalName: m.rivalName, teamGoals: m.teamGoals, rivalScore: m.rivalScore, forCounts, againstCounts }
    })

  const sumSide = (side) => {
    const totals = {}
    rows.forEach((r) => {
      Object.entries(r[side]).forEach(([key, count]) => { totals[key] = (totals[key] || 0) + count })
    })
    return totals
  }
  return { rows, totalsFor: sumSide('forCounts'), totalsAgainst: sumSide('againstCounts') }
}
