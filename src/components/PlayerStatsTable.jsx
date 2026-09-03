import { useState } from 'react'
import { FileSpreadsheet, Users2, Search } from 'lucide-react'
import { computePlayerStats } from '../statsEngine.js'
import { PUESTOS } from '../db.js'
import { exportPlayerStatsToExcel } from '../playerStatsExport.js'

const COLUMNS = [
  { key: 'partidos', label: 'PJ' },
  { key: 'goles', label: 'Goles' },
  { key: 'asistencias', label: 'Asist.' },
  { key: 'shotsOn', label: 'Tiros a puerta' },
  { key: 'shotsOff', label: 'Fuera' },
  { key: 'shotsPost', label: 'Al palo' },
  { key: 'saves', label: 'Paradas' },
  { key: 'fouls', label: 'Faltas' },
  { key: 'yellow', label: 'Amar.' },
  { key: 'red', label: 'Rojas' },
  { key: 'minutos', label: 'Minutos' },
]

// Tabla de estadísticas de toda la plantilla (una fila por jugador) —
// filtrable por nombre y posición aquí mismo, y exportable a Excel con
// autofiltro para seguir filtrando/ordenando ya fuera de la app.
export default function PlayerStatsTable({ players, matches, teamLabel }) {
  const [busqueda, setBusqueda] = useState('')
  const [posicionFiltro, setPosicionFiltro] = useState(null)

  // Solo jugadores que han disputado al menos uno de estos partidos — un
  // jugador sin apariciones aquí no aporta nada a la tabla, solo ceros.
  const allRows = players
    .map((p) => {
      const { agg } = computePlayerStats(matches, p.nombre)
      return { dorsal: p.dorsal ?? '', nombre: p.nombre, posicion: p.posicion || '', ...agg, minutos: Math.round((agg.seconds || 0) / 60) }
    })
    .filter((r) => r.partidos > 0)

  const rows = allRows.filter((r) => {
    if (posicionFiltro && r.posicion !== posicionFiltro) return false
    if (busqueda.trim() && !r.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())) return false
    return true
  })

  const posicionesPresentes = PUESTOS.filter((pu) => allRows.some((r) => r.posicion === pu))

  if (allRows.length === 0) return null

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div className="leaderboard-card__head" style={{ margin: 0 }}>
          <div className="icon-chip" style={{ '--chip-color': 'var(--blue-600)' }}><Users2 size={15} /></div>
          <h4>Estadísticas de jugadores</h4>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-300)' }} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Filtrar por nombre…"
              style={{ fontSize: 12.5, padding: '6px 10px 6px 28px', maxWidth: 170 }}
            />
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportPlayerStatsToExcel(allRows, teamLabel)}>
            <FileSpreadsheet size={14} />
            Exportar a Excel
          </button>
        </div>
      </div>

      {posicionesPresentes.length > 1 && (
        <div className="chip-group" style={{ marginBottom: 12 }}>
          <button type="button" className={`chip${!posicionFiltro ? ' is-active' : ''}`} onClick={() => setPosicionFiltro(null)}>Todas</button>
          {posicionesPresentes.map((pu) => (
            <button key={pu} type="button" className={`chip${posicionFiltro === pu ? ' is-active' : ''}`} onClick={() => setPosicionFiltro(pu)}>{pu}</button>
          ))}
        </div>
      )}

      <div className="fasegol-table-wrap">
        <table className="fasegol-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingLeft: 10, background: 'var(--ink-900)', color: '#fff' }}>Jugador</th>
              <th style={{ background: 'var(--ink-700)', color: '#fff' }}>Posición</th>
              {COLUMNS.map((c) => (
                <th key={c.key} style={{ background: 'var(--ink-700)', color: '#fff' }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={COLUMNS.length + 2} style={{ textAlign: 'center', color: 'var(--ink-500)', padding: 14 }}>Sin jugadores que coincidan con el filtro.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.nombre}>
                  <td className="fasegol-match-cell" style={{ textAlign: 'left', paddingLeft: 10 }}>
                    {r.dorsal !== '' ? `#${r.dorsal} ` : ''}{r.nombre}
                  </td>
                  <td>{r.posicion}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key}>{r[c.key] || 0}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
