import { useState } from 'react'
import { UserSearch, Plus } from 'lucide-react'
import { getMercadoJugadores, PUESTOS } from '../db.js'
import PageHeader from './PageHeader.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import MercadoJugadorModal from './MercadoJugadorModal.jsx'

// Cuaderno de seguimiento de jugadores externos que Pablo tiene en el
// radar — su propia versión del "mercado" de Fixo, sin base de datos de
// agencias detrás (eso requeriría un proveedor de datos que no existe aquí).
export default function MercadoView() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const [posicionFiltro, setPosicionFiltro] = useState(null)

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  const jugadores = getMercadoJugadores().filter((j) => !posicionFiltro || j.posicion === posicionFiltro)

  return (
    <div>
      <PageHeader icon={UserSearch} title="Mercado" hint="Jugadores externos en seguimiento propio">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={15} />
          Añadir jugador
        </button>
      </PageHeader>

      <div className="chip-group" style={{ marginBottom: 16 }}>
        <button type="button" className={`chip${!posicionFiltro ? ' is-active' : ''}`} onClick={() => setPosicionFiltro(null)}>Todas</button>
        {PUESTOS.map((p) => (
          <button key={p} type="button" className={`chip${posicionFiltro === p ? ' is-active' : ''}`} onClick={() => setPosicionFiltro(p)}>{p}</button>
        ))}
      </div>

      {jugadores.length === 0 ? (
        <div className="banner banner-info">Sin jugadores en seguimiento todavía.</div>
      ) : (
        <div className="tile-grid">
          {jugadores.map((j) => (
            <div key={j.id} className="tile-card" onClick={() => setEditing(j)}>
              <div className="tile-card__top">
                <PlayerAvatar fileId={j.fotoFileId} size="card" />
                <div>
                  <div className="tile-card__name">{j.nombre}</div>
                  <div className="tile-card__meta">{j.clubActual || 'Club sin especificar'}{j.edad ? ` · ${j.edad} años` : ''}</div>
                </div>
              </div>
              <span className="badge badge-gray">{j.posicion}</span>
            </div>
          ))}
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
