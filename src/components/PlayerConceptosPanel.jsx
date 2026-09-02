import { useState } from 'react'
import { Plus, X, Circle, CircleDot, CheckCircle2 } from 'lucide-react'
import { getPlayers, getConceptosCatalogo, addConceptoCatalogo, removeConceptoCatalogo, setPlayerConcepto } from '../db.js'

const ESTADOS = [
  { id: 'no', label: 'No adquirido', icon: Circle, color: 'var(--gray-300)' },
  { id: 'progreso', label: 'En progreso', icon: CircleDot, color: 'var(--warn-600)' },
  { id: 'dominado', label: 'Dominado', icon: CheckCircle2, color: 'var(--success-600)' },
]

// Conceptos de juego que domina (o no) este jugador en concreto — catálogo
// compartido con toda la plantilla (se gestiona desde aquí mismo), pero el
// semáforo de dominio es individual. El resumen a nivel de equipo se ve
// desde el dashboard de Plantilla, no aquí.
export default function PlayerConceptosPanel({ playerId }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [nuevoConcepto, setNuevoConcepto] = useState('')
  const player = getPlayers().find((p) => p.id === playerId)
  const catalogo = getConceptosCatalogo()

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  function handleSetEstado(conceptoId, estado) {
    setPlayerConcepto(playerId, conceptoId, estado)
    bump()
  }

  function handleAddConcepto() {
    const nombre = nuevoConcepto.trim()
    if (!nombre) return
    addConceptoCatalogo(nombre)
    setNuevoConcepto('')
    bump()
  }

  function handleRemoveConcepto(id) {
    removeConceptoCatalogo(id)
    bump()
  }

  return (
    <div className="stack">
      <p className="section-hint" style={{ marginTop: 0 }}>
        El catálogo de conceptos es común a toda la plantilla — añadir o quitar uno aquí afecta a todos los jugadores.
      </p>

      {catalogo.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 12.5 }}>Todavía no hay conceptos definidos. Añade el primero abajo.</p>
      ) : (
        <div className="stack" style={{ gap: 4 }}>
          {catalogo.map((c) => {
            const estadoActual = player?.conceptos?.[c.id] || 'no'
            return (
              <div key={c.id} className="row spread" style={{ padding: '6px 0', borderBottom: '1px solid var(--gray-100)' }}>
                <span style={{ fontSize: 13 }}>{c.nombre}</span>
                <div className="row" style={{ gap: 4 }}>
                  {ESTADOS.map((e) => {
                    const Icon = e.icon
                    const active = estadoActual === e.id
                    return (
                      <button
                        key={e.id}
                        type="button"
                        className="btn btn-ghost btn-sm btn-icon"
                        title={e.label}
                        onClick={() => handleSetEstado(c.id, e.id)}
                        style={{ opacity: active ? 1 : 0.35 }}
                      >
                        <Icon size={16} color={e.color} fill={active && e.id !== 'no' ? e.color : 'none'} />
                      </button>
                    )
                  })}
                  <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => handleRemoveConcepto(c.id)} title="Quitar del catálogo">
                    <X size={13} color="var(--danger-600)" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="row" style={{ gap: 6 }}>
        <input
          type="text"
          value={nuevoConcepto}
          onChange={(e) => setNuevoConcepto(e.target.value)}
          placeholder="Ej. Velocidad sin balón…"
          style={{ flex: 1 }}
          onKeyDown={(e) => e.key === 'Enter' && handleAddConcepto()}
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddConcepto} disabled={!nuevoConcepto.trim()}>
          <Plus size={13} />
          Añadir concepto
        </button>
      </div>
    </div>
  )
}
