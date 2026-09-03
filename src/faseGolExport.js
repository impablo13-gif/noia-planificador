// Excel del marcador de fases de gol, al estilo del informe de Emanuel
// Santoro: tabla coloreada por categoría con GOLES A FAVOR y EN CONTRA en
// bloques espejados, fila de TOTALES y una fila por partido. Usa
// "xlsx-js-style" y no el "xlsx" a secas porque la edición community de
// SheetJS descarta los colores de celda al escribir el archivo.
import * as XLSXStyle from 'xlsx-js-style'
import { GOAL_PHASES, GOAL_PHASE_GROUPS } from './statsEngine.js'
import { parseISODate, formatDateShort } from './dateUtils.js'

const rgbNoHash = (hex) => hex.replace('#', '').toUpperCase()
const hexToRgb = (hex) => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
const tintHex = (hex, amount) => {
  const [r, g, b] = hexToRgb(hex)
  const mix = (c) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0')
  return `${mix(r)}${mix(g)}${mix(b)}`.toUpperCase()
}
const THIN_BORDER = { top: { style: 'thin', color: { rgb: 'D9D9D9' } }, bottom: { style: 'thin', color: { rgb: 'D9D9D9' } }, left: { style: 'thin', color: { rgb: 'D9D9D9' } }, right: { style: 'thin', color: { rgb: 'D9D9D9' } } }
const fill = (hex) => ({ patternType: 'solid', fgColor: { rgb: rgbNoHash(hex) } })
const center = { horizontal: 'center', vertical: 'center', wrapText: true }

function buildSheet(rows, totalsFor, totalsAgainst) {
  const groups = GOAL_PHASE_GROUPS
  const blocks = [
    { key: 'forCounts', totals: totalsFor, label: 'GOLES A FAVOR' },
    { key: 'againstCounts', totals: totalsAgainst, label: 'GOLES EN CONTRA' },
  ]
  const FIXED = ['Fecha', 'Rival', 'Resultado']
  const phasesPerBlock = groups.reduce((n, g) => n + g.phases.length, 0)
  const totalCols = FIXED.length + blocks.length * (phasesPerBlock + 1)
  const dataStartRow = 3
  const totalRows = dataStartRow + 1 + rows.length

  const aoa = Array.from({ length: totalRows }, () => Array(totalCols).fill(''))
  const merges = []
  const styles = {}
  const setStyle = (r, c, s) => { styles[`${r}-${c}`] = s }

  FIXED.forEach((label, i) => {
    aoa[0][i] = label
    merges.push({ s: { r: 0, c: i }, e: { r: 2, c: i } })
    setStyle(0, i, { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fill('#201819'), alignment: center, border: THIN_BORDER })
  })

  let col = FIXED.length
  const colMeta = []
  blocks.forEach((block) => {
    const blockStart = col
    groups.forEach((g) => {
      const groupStart = col
      g.phases.forEach((p) => {
        aoa[2][col] = p.label
        setStyle(2, col, { font: { bold: true, sz: 9 }, fill: fill(`#${tintHex(g.color, 0.72)}`), alignment: center, border: THIN_BORDER })
        colMeta[col] = { block: block.key, phaseKey: p.key }
        col++
      })
      aoa[1][groupStart] = g.label
      setStyle(1, groupStart, { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fill(g.color), alignment: center, border: THIN_BORDER })
      if (col - 1 > groupStart) merges.push({ s: { r: 1, c: groupStart }, e: { r: 1, c: col - 1 } })
    })
    aoa[0][blockStart] = block.label
    setStyle(0, blockStart, { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fill('#453a3b'), alignment: center, border: THIN_BORDER })
    merges.push({ s: { r: 0, c: blockStart }, e: { r: 0, c: col - 1 } })

    aoa[0][col] = 'Total'
    merges.push({ s: { r: 0, c: col }, e: { r: 2, c: col } })
    setStyle(0, col, { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: fill('#453a3b'), alignment: center, border: THIN_BORDER })
    colMeta[col] = { block: block.key, isTotal: true }
    col++
  })

  aoa[dataStartRow][0] = 'TOTALES'
  merges.push({ s: { r: dataStartRow, c: 0 }, e: { r: dataStartRow, c: 2 } })
  setStyle(dataStartRow, 0, { font: { bold: true }, fill: fill('#f7e6bf'), border: THIN_BORDER })

  for (let c = FIXED.length; c < totalCols; c++) {
    const meta = colMeta[c]
    const value = meta.isTotal
      ? Object.values(meta.block === 'forCounts' ? totalsFor : totalsAgainst).reduce((a, b) => a + b, 0)
      : ((meta.block === 'forCounts' ? totalsFor : totalsAgainst)[meta.phaseKey] || 0)
    aoa[dataStartRow][c] = value
    setStyle(dataStartRow, c, { font: { bold: true }, fill: fill('#f7e6bf'), alignment: center, border: THIN_BORDER })
  }

  rows.forEach((row, i) => {
    const r = dataStartRow + 1 + i
    aoa[r][0] = formatDateShort(parseISODate(row.date.slice(0, 10)))
    aoa[r][1] = row.rivalName || ''
    aoa[r][2] = `${row.teamGoals ?? ''}-${row.rivalScore ?? ''}`
    setStyle(r, 0, { border: THIN_BORDER })
    setStyle(r, 1, { border: THIN_BORDER })
    setStyle(r, 2, { alignment: center, border: THIN_BORDER })
    for (let c = FIXED.length; c < totalCols; c++) {
      const meta = colMeta[c]
      const source = meta.block === 'forCounts' ? row.forCounts : row.againstCounts
      const value = meta.isTotal ? Object.values(source).reduce((a, b) => a + b, 0) : (source[meta.phaseKey] || 0)
      aoa[r][c] = value
      setStyle(r, c, { alignment: center, border: THIN_BORDER, font: meta.isTotal ? { bold: true } : undefined })
    }
  })

  const ws = XLSXStyle.utils.aoa_to_sheet(aoa)
  ws['!merges'] = merges
  Object.entries(styles).forEach(([key, s]) => {
    const [r, c] = key.split('-').map(Number)
    const addr = XLSXStyle.utils.encode_cell({ r, c })
    if (ws[addr]) ws[addr].s = s
  })
  ws['!cols'] = Array.from({ length: totalCols }, (_, c) => ({ wch: c < FIXED.length ? 14 : 9 }))
  ws['!rows'] = [{ hpt: 20 }, { hpt: 20 }, { hpt: 26 }]
  // Autofiltro desde la fila de cabecera de fases (fila 3 de Excel) hasta la
  // última fila de partido, para poder filtrar/ordenar por cualquier
  // columna (fase, rival, resultado…) ya abierto en Excel. La fila de
  // TOTALES queda dentro del rango — es lo habitual en Excel, se filtra con
  // el resto si se aplica un filtro.
  ws['!autofilter'] = { ref: XLSXStyle.utils.encode_range({ s: { r: 2, c: 0 }, e: { r: totalRows - 1, c: totalCols - 1 } }) }
  return ws
}

export function exportFaseGolStatsToExcel(rows, totalsFor, totalsAgainst, teamLabel) {
  if (!rows.length) return
  const wb = XLSXStyle.utils.book_new()
  XLSXStyle.utils.book_append_sheet(wb, buildSheet(rows, totalsFor, totalsAgainst), 'Fases de gol')
  const nameBase = (teamLabel || 'noia').toString().replace(/[\\/:*?"<>|]/g, '').trim() || 'noia'
  XLSXStyle.writeFile(wb, `${nameBase}_fases_de_gol_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
