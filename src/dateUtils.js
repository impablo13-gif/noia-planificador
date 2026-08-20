// Helpers de fechas. Trabajamos siempre con fechas locales y claves ISO 'YYYY-MM-DD'.

const DOW_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_LABELS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export function makeDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day)
}

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date, n) {
  const next = new Date(date)
  next.setDate(next.getDate() + n)
  return next
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Lunes=1 ... Domingo=7 (ISO)
export function isoWeekday(date) {
  const d = date.getDay()
  return d === 0 ? 7 : d
}

export function startOfWeek(date) {
  return addDays(date, 1 - isoWeekday(date))
}

export function endOfWeek(date) {
  return addDays(startOfWeek(date), 6)
}

export function monthLabel(year, monthIndex) {
  return `${MONTH_LABELS[monthIndex]} ${year}`
}

export function dowLabels() {
  return DOW_LABELS
}

// Matriz de semanas (cada una con 7 Date) que cubre el mes, empezando en lunes.
export function getMonthMatrix(year, monthIndex) {
  const firstOfMonth = makeDate(year, monthIndex, 1)
  const gridStart = startOfWeek(firstOfMonth)
  const lastOfMonth = makeDate(year, monthIndex + 1, 0)
  const gridEnd = endOfWeek(lastOfMonth)

  const weeks = []
  let cursor = gridStart
  while (cursor <= gridEnd) {
    const week = []
    for (let i = 0; i < 7; i++) {
      week.push(cursor)
      cursor = addDays(cursor, 1)
    }
    weeks.push(week)
  }
  return weeks
}

export function formatDateLong(date) {
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatDateShort(date) {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
