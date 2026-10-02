import { useState } from 'react'
import { UserSearch, Plus, Search } from 'lucide-react'
import { getMercadoJugadores, PUESTOS, MERCADO_ESTADOS, MERCADO_PRIORIDADES } from '../db.js'
import PageHeader from './PageHeader.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import MercadoJugadorModal from './MercadoJugadorModal.jsx'

const ORDEN_PRIORIDAD = { alta: 0, media: 1, baja: 2 }

// Cuaderno de seguimiento de jugadores externos que Pablo tiene en el
// radar — su propia versión del "mercado" de Fixo, sin base de datos de
// agencias detrás (eso requeriría un proveedor de datos que no existe aquí).
export default function MercadoView() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const [posicionFiltro, setPosicionFiltro] = useState(null)
  const [estadoFiltro, setEstadoFiltro] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  const todos = getMercadoJugadores()
  const jugadores = todos
    .filter((j) => !posicionFiltro || j.posicion === posicionFiltro)
    .filter((j) => !estadoFiltro || (j.estado || 'por_ver') === estadoFiltro)
    .filter((j) => {
      if (!busqueda.trim()) return true
      const q = busqueda.trim().toLowerCase()
      return j.nombre.toLowerCase().includes(q) || (j.clubActual || '').toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const pa = ORDEN_PRIORIDAD[a.prioridad] ?? 1
      const pb = ORDEN_PRIORIDAD[b.prioridad] ?? 1
      if (pa !== pb) return pa - pb
      return a.nombre.localeCompare(b.nombre, 'es')
    })

  return (
    <div>
      <PageHeader icon={UserSearch} title="Mercado" hint="Jugadores externos en seguimiento propio">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={15} />
          Añadir jugador
        </button>
      </PageHeader>

      <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="field" style={{ marginBottom: 0, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-300)' }} />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o club…"
            style={{ fontSize: 13, padding: '7px 10px 7px 28px', maxWidth: 220 }}
          />
        </div>
        <div className="chip-group">
          <button type="button" className={`chip${!posicionFiltro ? ' is-active' : ''}`} onClick={() => setPosicionFiltro(null)}>Todas las posiciones</button>
          {PUESTOS.map((p) => (
            <button key={p} type="button" className={`chip${posicionFiltro === p ? ' is-active' : ''}`} onClick={() => setPosicionFiltro(p)}>{p}</button>
          ))}
        </div>
      </div>

      <div className="chip-group" style={{ marginBottom: 16 }}>
        <button type="button" className={`chip${!estadoFiltro ? ' is-active' : ''}`} onClick={() => setEstadoFiltro(null)}>Todos los estados</button>
        {MERCADO_ESTADOS.map((e) => {
          const n = todos.filter((j) => (j.estado || 'por_ver') === e.id).length
          if (n === 0) return null
          return (
            <button
              key={e.id}
              type="button"
              className={`chip${estadoFiltro === e.id ? ' is-active' : ''}`}
              style={estadoFiltro === e.id ? { background: e.color, borderColor: e.color, color: '#fff' } : undefined}
              onClick={() => setEstadoFiltro(e.id)}
            >
              {e.label} ({n})
            </button>
          )
        })}
      </div>

      {jugadores.length === 0 ? (
        <div className="banner banner-info">
          {todos.length === 0 ? 'Sin jugadores en seguimiento todavía.' : 'Ningún jugador coincide con el filtro.'}
        </div>
      ) : (
        <div className="tile-grid">
          {jugadores.map((j) => {
            const estadoDef = MERCADO_ESTADOS.find((e) => e.id === (j.estado || 'por_ver')) || MERCADO_ESTADOS[0]
            const prioridadDef = MERCADO_PRIORIDADES.find((p) => p.id === j.prioridad)
            return (
              <div key={j.id} className="tile-card" onClick={() => setEditing(j)}>
                <div className="tile-card__top">
                  <PlayerAvatar fileId={j.fotoFileId} size="card" />
                  <div className="row spread" style={{ flex: 1, alignItems: 'flex-start' }}>
                    <div>
                      <div className="tile-card__name">{j.nombre}</div>
                      <div className="tile-card__meta">{j.clubActual || 'Club sin especificar'}{j.edad ? ` · ${j.edad} años` : ''}</div>
                    </div>
                    {prioridadDef && (
                      <span
                        title={`Prioridad ${prioridadDef.label.toLowerCase()}`}
                        style={{ width: 9, height: 9, borderRadius: '50%', background: prioridadDef.color, flexShrink: 0, marginTop: 4 }}
                      />
                    )}
                  </div>
                </div>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge badge-gray">{j.posicion}</span>
                  <span className="badge" style={{ background: estadoDef.bg, color: estadoDef.color }}>{estadoDef.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <MercadoJugadorModal
          jugador={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); bump() }}
        />
      )}
    </div>
  )
}
