// Combina la regla de entreno recurrente + los entrenos de pretemporada + las
// excepciones/añadidos guardados en trainingOverrides, y los partidos, en un
// único mapa por fecha ISO. Todas las ediciones (hora, cancelar, mover,
// adjuntar sesión) pasan por trainingOverrides, sea cual sea el origen del
// entreno — así el modelo se mantiene simple y uniforme.

import { getPreseasonTrainings, getTrainingRule, getTrainingOverrides, getMatches } from './db.js'
import { toISODate, parseISODate, isoWeekday, addDays } from './dateUtils.js'

function ensureDay(map, iso) {
  if (!map[iso]) map[iso] = { trainings: [], matches: [] }
  return map[iso]
}

export function getEventsInRange(rangeStart, rangeEnd) {
  const map = {}
  const overrides = getTrainingOverrides()

  getPreseasonTrainings().forEach((t) => {
    const d = parseISODate(t.date)
    if (d < rangeStart || d > rangeEnd) return
    const ov = overrides[t.date] || {}
    ensureDay(map, t.date).trainings.push({
      kind: 'preseason',
      date: t.date,
      time: ov.time ?? t.time,
      label: ov.label ?? t.label,
      cancelled: !!ov.cancelled,
      note: ov.note || '',
      status: ov.status ?? t.status ?? 'pendiente',
      sessionText: ov.sessionText ?? t.sessionText ?? '',
      sessionFileId: ov.sessionFileId ?? t.sessionFileId ?? null,
    })
  })

  const rule = getTrainingRule()
  const ruleFrom = parseISODate(rule.fromDate)
  let cursor = rangeStart < ruleFrom ? ruleFrom : rangeStart
  while (cursor <= rangeEnd) {
    const iso = toISODate(cursor)
    if (rule.daysOfWeek.includes(isoWeekday(cursor))) {
      const ov = overrides[iso] || {}
      ensureDay(map, iso).trainings.push({
        kind: 'recurring',
        date: iso,
        time: ov.time ?? rule.time,
        label: ov.label ?? 'Entreno',
        cancelled: !!ov.cancelled,
        note: ov.note || '',
        status: ov.status ?? 'pendiente',
        sessionText: ov.sessionText ?? '',
        sessionFileId: ov.sessionFileId ?? null,
      })
    }
    cursor = addDays(cursor, 1)
  }

  Object.entries(overrides).forEach(([iso, ov]) => {
    if (!ov.added) return
    const d = parseISODate(iso)
    if (d < rangeStart || d > rangeEnd) return
    ensureDay(map, iso).trainings.push({
      kind: 'extra',
      date: iso,
      time: ov.time || '19:00',
      label: ov.label || 'Entreno añadido',
      cancelled: !!ov.cancelled,
      note: ov.note || '',
      status: ov.status ?? 'pendiente',
      sessionText: ov.sessionText || '',
      sessionFileId: ov.sessionFileId ?? null,
    })
  })

  getMatches().forEach((m) => {
    const d = parseISODate(m.date)
    if (d < rangeStart || d > rangeEnd) return
    ensureDay(map, m.date).matches.push(m)
  })

  return map
}
