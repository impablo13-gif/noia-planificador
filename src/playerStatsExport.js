// Excel de estadísticas de jugadores de la temporada — una fila por jugador,
// con autofiltro en la cabecera para poder filtrar/ordenar por cualquier
// columna directamente en Excel (posición, goles, minutos…).
import * as XLSXStyle from 'xlsx-js-style'

const COLUMNS = [
  { key: 'dorsal', label: 'Dorsal', wch: 8 },
  { key: 'nombre', label: 'Nombre', wch: 22 },
  { key: 'posicion', label: 'Posición', wch: 12 },
  { key: 'partidos', label: 'PJ', wch: 6 },
  { key: 'goles', label: 'Goles', wch: 7 },
  { key: 'asistencias', label: 'Asist.', wch: 7 },
  { key: 'shotsOn', label: 'Tiros a puerta', wch: 12 },
  { key: 'shotsOff', label: 'Tiros fuera', wch: 10 },
  { key: 'shotsPost', label: 'Al palo', wch: 8 },
  { key: 'saves', label: 'Paradas', wch: 9 },
  { key: 'fouls', label: 'Faltas', wch: 8 },
  { key: 'yellow', label: 'Amarillas', wch: 10 },
  { key: 'red', label: 'Rojas', wch: 7 },
  { key: 'turnovers', label: 'Pérdidas', wch: 9 },
  { key: 'recoveries', label: 'Recuperaciones', wch: 13 },
  { key: 'minutos', label: 'Minutos', wch: 9 },
]

const fill = (hex) => ({ patternType: 'solid', fgColor: { rgb: hex } })
const THIN_BORDER = { top: { style: 'thin', color: { rgb: 'D9D9D9' } }, bottom: { style: 'thin', color: { rgb: 'D9D9D9' } }, left: { style: 'thin', color: { rgb: 'D9D9D9' } }, right: { style: 'thin', color: { rgb: 'D9D9D9' } } }

export function exportPlayerStatsToExcel(rows, teamLabel) {
  if (!rows.length) return
  const aoa = [COLUMNS.map((c) => c.label), ...rows.map((r) => COLUMNS.map((c) => r[c.key] ?? ''))]
  const ws = XLSXStyle.utils.aoa_to_sheet(aoa)

  COLUMNS.forEach((c, i) => {
    const addr = XLSXStyle.utils.encode_cell({ r: 0, c: i })
    if (ws[addr]) ws[addr].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fill('201819'), alignment: { horizontal: 'center', vertical: 'center' }, border: THIN_BORDER }
  })
  for (let r = 1; r < aoa.length; r++) {
    for (let c = 0; c < COLUMNS.length; c++) {
      const addr = XLSXStyle.utils.encode_cell({ r, c })
      if (ws[addr]) ws[addr].s = { alignment: { horizontal: c <= 1 ? 'left' : 'center' }, border: THIN_BORDER }
    }
  }

  ws['!cols'] = COLUMNS.map((c) => ({ wch: c.wch }))
  ws['!autofilter'] = { ref: XLSXStyle.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: COLUMNS.length - 1 } }) }

  const wb = XLSXStyle.utils.book_new()
  XLSXStyle.utils.book_append_sheet(wb, ws, 'Jugadores')
  const nameBase = (teamLabel || 'noia').toString().replace(/[\\/:*?"<>|]/g, '').trim() || 'noia'
  XLSXStyle.writeFile(wb, `${nameBase}_jugadores_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
