import { useState } from 'react'
import { FileSpreadsheet, Users2, Search, Pencil, Plus, Trash2 } from 'lucide-react'
import { computePlayerStats } from '../statsEngine.js'
import { PUESTOS, updatePartidoNpaPlayer, addPartidoNpaPlayer, removePartidoNpaPlayer } from '../db.js'
import { exportPlayerStatsToExcel } from '../playerStatsExport.js'

const COLUMNS = [
  { key: 'partidos', label: 'PJ' },
  { key: 'goles', label: 'Goles', field: 'goals' },
  { key: 'asistencias', label: 'Asist.', field: 'assists' },
  { key: 'shotsOn', label: 'Tiros a puerta', field: 'shotsOn' },
  { key: 'shotsOff', label: 'Fuera', field: 'shotsOff' },
  { key: 'shotsPost', label: 'Al palo', field: 'shotsPost' },
  { key: 'saves', label: 'Paradas', field: 'saves' },
  { key: 'fouls', label: 'Faltas', field: 'fouls' },
  { key: 'yellow', label: 'Amar.', field: 'yellow' },
  { key: 'red', label: 'Rojas', field: 'red' },
  { key: 'minutos', label: 'Minutos', field: 'seconds', toField: (v) => v * 60 },
]

// Tabla de estadísticas de toda la plantilla (una fila por jugador) —
// filtrable por nombre y posición aquí mismo, y exportable a Excel con
// autofiltro para seguir filtrando/ordenando ya fuera de la app.
export default function PlayerStatsTable({ players, matches, teamLabel, onChanged }) {
  const [busqueda, setBusqueda] = useState('')
  const [posicionFiltro, setPosicionFiltro] = useState(null)
  const [editing, setEditing] = useState(false)
  const [nuevoJugador, setNuevoJugador] = useState('')
  // Editar un dato solo tiene sentido viendo un partido concreto — sobre un
  // agregado de varios partidos no habría un partido claro al que aplicar
  // el cambio.
  const editableMatchId = matches.length === 1 ? matches[0].id : null
  const isEditing = editing && !!editableMatchId

  function handleEdit(nombre, col, rawValue) {
    if (!editableMatchId || !col.field) return
    const n = Math.max(0, Math.round(Number(rawValue)) || 0)
    const value = col.toField ? col.toField(n) : n
    updatePartidoNpaPlayer(editableMatchId, nombre, { [col.field]: value })
    onChanged?.()
  }

  function handleAddPlayer() {
    if (!editableMatchId || !nuevoJugador) return
    addPartidoNpaPlayer(editableMatchId, nuevoJugador)
    setNuevoJugador('')
    onChanged?.()
  }

  function handleRemovePlayer(nombre) {
    if (!editableMatchId) return
    removePartidoNpaPlayer(editableMatchId, nombre)
    onChanged?.()
  }

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
  const jugadoresAusentes = players.filter((p) => !allRows.some((r) => r.nombre === p.nombre))

  // Con un partido en edición se muestra igualmente aunque nadie tenga datos
  // todavía, para poder añadir jugadores desde cero; en el agregado de
  // varios partidos, sin filas no hay nada útil que mostrar.
  if (allRows.length === 0 && !editableMatchId) return null

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div className="leaderboard-card__head" style={{ margin: 0 }}>
          <div className="icon-chip" style={{ '--chip-color': 'var(--blue-600)' }}><Users2 size={15} /></div>
          <h4>Estadísticas de jugadores</h4>
          {editableMatchId && (
            <button
              type="button"
              className={`btn btn-sm ${isEditing ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setEditing((v) => !v)}
              title={isEditing ? 'Dejar de editar' : 'Editar los datos de este partido'}
            >
              <Pencil size={12} />
              {isEditing ? 'Editando' : 'Editar'}
            </button>
          )}
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

      {!editableMatchId && (
        <p className="text-muted" style={{ fontSize: 11.5, marginTop: 0, marginBottom: 10 }}>
          Para corregir un dato a mano, abre ese partido en "Partido a partido" — aquí es la suma de varios partidos.
        </p>
      )}
      {isEditing && (
        <p className="text-muted" style={{ fontSize: 11.5, marginTop: 0, marginBottom: 10 }}>Toca "Editando" para guardar y salir del modo edición.</p>
      )}

      {isEditing && jugadoresAusentes.length > 0 && (
        <div className="row" style={{ gap: 6, marginBottom: 12 }}>
          <select value={nuevoJugador} onChange={(e) => setNuevoJugador(e.target.value)} style={{ fontSize: 12.5, padding: '5px 8px', maxWidth: 220 }}>
            <option value="">Añadir jugador que falta…</option>
            {jugadoresAusentes.map((p) => (
              <option key={p.id} value={p.nombre}>{p.dorsal ? `#${p.dorsal} ` : ''}{p.nombre}</option>
            ))}
          </select>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddPlayer} disabled={!nuevoJugador}>
            <Plus size={13} />
            Añadir
          </button>
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
              {isEditing && <th style={{ background: 'var(--ink-700)' }} />}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={COLUMNS.length + 2 + (isEditing ? 1 : 0)} style={{ textAlign: 'center', color: 'var(--ink-500)', padding: 14 }}>Sin jugadores que coincidan con el filtro.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.nombre}>
                  <td className="fasegol-match-cell" style={{ textAlign: 'left', paddingLeft: 10 }}>
                    {r.dorsal !== '' ? `#${r.dorsal} ` : ''}{r.nombre}
                  </td>
                  <td>{r.posicion}</td>
                  {COLUMNS.map((c) => (
                    <td key={c.key}>
                      {isEditing && c.field ? (
                        <input
                          type="number"
                          min="0"
                          defaultValue={r[c.key] || 0}
                          onBlur={(e) => handleEdit(r.nombre, c, e.target.value)}
                          style={{ width: 48, textAlign: 'center', fontSize: 12, padding: '2px 4px' }}
                        />
                      ) : (
                        r[c.key] || 0
                      )}
                    </td>
                  ))}
                  {isEditing && (
                    <td>
                      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => handleRemovePlayer(r.nombre)} title="Quitar del partido">
                        <Trash2 size={12} color="var(--danger-600)" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
