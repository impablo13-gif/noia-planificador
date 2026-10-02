import { useState } from 'react'
import { Save, Trash2, Plus } from 'lucide-react'
import Modal from './Modal.jsx'
import PlayerPhotoField from './PlayerPhotoField.jsx'
import MultiFileDrop from './MultiFileDrop.jsx'
import RadarChart from './RadarChart.jsx'
import { formatDateLong, parseISODate } from '../dateUtils.js'
import {
  addMercadoJugador, updateMercadoJugador, removeMercadoJugador,
  addMercadoObservacion, removeMercadoObservacion, getMercadoJugadores,
  PUESTOS, CUALIDADES_EJES, MERCADO_ESTADOS, MERCADO_PRIORIDADES,
} from '../db.js'

const TABS = [
  { id: 'datos', label: 'Datos' },
  { id: 'cualidades', label: 'Cualidades' },
  { id: 'seguimiento', label: 'Seguimiento' },
]

// Ficha de un jugador externo en seguimiento — a diferencia del "mercado" de
// Fixo (una base de datos de agencias con cientos de fichas), esto es un
// cuaderno de seguimiento propio de Pablo: los jugadores que él mismo está
// vigilando, sin depender de ningún proveedor de datos externo. Con pestañas
// igual que la ficha de un jugador de la Plantilla (PlayerModal) para poder
// valorarlo con el mismo radar de 5 ejes y compararlo de verdad con el
// equipo real, no solo con una nota de texto suelta.
export default function MercadoJugadorModal({ jugador, onClose, onSaved }) {
  const isNew = !jugador?.id
  const [tab, setTab] = useState('datos')
  const [nombre, setNombre] = useState(jugador?.nombre || '')
  const [clubActual, setClubActual] = useState(jugador?.clubActual || '')
  const [posicion, setPosicion] = useState(jugador?.posicion || PUESTOS[0])
  const [edad, setEdad] = useState(jugador?.edad ?? '')
  const [contacto, setContacto] = useState(jugador?.contacto || '')
  const [notas, setNotas] = useState(jugador?.notas || '')
  const [fotoFileId, setFotoFileId] = useState(jugador?.fotoFileId || null)
  const [estado, setEstadoState] = useState(jugador?.estado || 'por_ver')
  const [prioridad, setPrioridad] = useState(jugador?.prioridad || 'media')
  const [scoutingFileIds, setScoutingFileIds] = useState(jugador?.scoutingFileIds || [])
  const [cualidades, setCualidades] = useState(() => {
    const base = {}
    CUALIDADES_EJES.forEach((e) => { base[e.key] = 0 })
    return { ...base, ...jugador?.cualidades }
  })
  const [nuevaObservacion, setNuevaObservacion] = useState('')
  const [observaciones, setObservaciones] = useState(jugador?.observaciones || [])

  function setCualidad(key, value) {
    setCualidades((prev) => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const patch = {
      nombre: nombre.trim(), clubActual: clubActual.trim(), posicion, edad, contacto: contacto.trim(), notas: notas.trim(), fotoFileId,
      estado, prioridad, cualidades, scoutingFileIds,
    }
    if (isNew) addMercadoJugador(patch)
    else updateMercadoJugador(jugador.id, patch)
    onSaved()
  }

  function handleDelete() {
    removeMercadoJugador(jugador.id)
    onSaved()
  }

  function handleAddObservacion() {
    if (!nuevaObservacion.trim()) return
    addMercadoObservacion(jugador.id, nuevaObservacion.trim())
    // Relee de almacenamiento para quedarse con el id real (lo genera
    // addMercadoObservacion) -- si no, "Quitar" sobre una recién añadida no
    // encontraría a quién borrar de verdad.
    const fresh = getMercadoJugadores().find((j) => j.id === jugador.id)
    setObservaciones(fresh?.observaciones || [])
    setNuevaObservacion('')
  }

  function handleRemoveObservacion(obsId) {
    removeMercadoObservacion(jugador.id, obsId)
    setObservaciones((prev) => prev.filter((o) => o.id !== obsId))
  }

  const estadoDef = MERCADO_ESTADOS.find((e) => e.id === estado) || MERCADO_ESTADOS[0]

  return (
    <Modal
      title={isNew ? 'Nuevo jugador en seguimiento' : 'Editar jugador'}
      onClose={onClose}
      maxWidth={620}
      footer={
        <>
          {!isNew && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={14} />
              Eliminar
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!nombre.trim()}>
            <Save size={14} />
            Guardar
          </button>
        </>
      }
    >
      {!isNew && (
        <div className="row spread" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div className="chip-group">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={`chip${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <span className="badge" style={{ background: estadoDef.bg, color: estadoDef.color }}>{estadoDef.label}</span>
        </div>
      )}

      {(isNew || tab === 'datos') && (
        <div className="stack">
          <PlayerPhotoField fileId={fotoFileId} onChange={setFotoFileId} />

          <div className="grid cols-2">
            <div className="field">
              <label className="field__label">Nombre</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label">Club actual <span className="field__optional">(opcional)</span></label>
              <input type="text" value={clubActual} onChange={(e) => setClubActual(e.target.value)} />
            </div>
          </div>

          <div className="grid cols-2">
            <div className="field">
              <label className="field__label">Posición</label>
              <select value={posicion} onChange={(e) => setPosicion(e.target.value)}>
                {PUESTOS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label">Edad <span className="field__optional">(opcional)</span></label>
              <input type="number" value={edad} onChange={(e) => setEdad(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label className="field__label">Contacto <span className="field__optional">(opcional)</span></label>
            <input type="text" value={contacto} onChange={(e) => setContacto(e.target.value)} placeholder="Padre/madre, agente, teléfono…" />
          </div>

          <div className="field">
            <label className="field__label">Resumen / impresión general <span className="field__optional">(opcional)</span></label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Qué destaca, impresión general en una frase…" />
            <p className="field__help">Para el detalle de cada vez que lo has visto, usa el historial en la pestaña "Seguimiento".</p>
          </div>
        </div>
      )}

      {!isNew && tab === 'cualidades' && (
        <div className="stack">
          <p className="section-hint" style={{ marginTop: 0 }}>Los mismos 5 ejes del modelo de desarrollo del club que usa la Plantilla — para poder comparar a este jugador con los tuyos de verdad, no solo con una nota de texto.</p>
          <div className="row" style={{ justifyContent: 'center', marginBottom: 8 }}>
            <RadarChart axes={CUALIDADES_EJES} values={cualidades} color="var(--blue-600)" />
          </div>
          <div className="stack" style={{ gap: 14 }}>
            {CUALIDADES_EJES.map((e) => (
              <div key={e.key} className="field" style={{ marginBottom: 0 }}>
                <label className="field__label">{e.label} <span className="field__optional">({cualidades[e.key] || 0}/10)</span></label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={cualidades[e.key] || 0}
                  onChange={(ev) => setCualidad(e.key, Number(ev.target.value))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isNew && tab === 'seguimiento' && (
        <div className="stack">
          <div className="grid cols-2">
            <div className="field">
              <label className="field__label">Estado del seguimiento</label>
              <div className="chip-group">
                {MERCADO_ESTADOS.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="chip"
                    style={estado === e.id ? { background: e.color, borderColor: e.color, color: '#fff' } : undefined}
                    onClick={() => setEstadoState(e.id)}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="field__label">Prioridad</label>
              <div className="chip-group">
                {MERCADO_PRIORIDADES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="chip"
                    style={prioridad === p.id ? { background: p.color, borderColor: p.color, color: '#fff' } : undefined}
                    onClick={() => setPrioridad(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field">
            <label className="field__label">Documentos de scouting <span className="field__optional">(opcional)</span></label>
            <MultiFileDrop fileIds={scoutingFileIds} onChange={setScoutingFileIds} accept=".pdf,image/*,.doc,.docx" label="Subir documento" />
          </div>

          <hr className="divider" />

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field__label">Añadir observación</label>
            <textarea
              value={nuevaObservacion}
              onChange={(e) => setNuevaObservacion(e.target.value)}
              placeholder="Ej. Visto hoy vs Rival X: muy bien en el regate, floja la pierna izquierda…"
              style={{ minHeight: 56 }}
            />
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} onClick={handleAddObservacion} disabled={!nuevaObservacion.trim()}>
              <Plus size={13} />
              Añadir al historial
            </button>
          </div>

          <div className="stack" style={{ gap: 8 }}>
            {observaciones.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 12.5 }}>Sin observaciones todavía.</p>
            ) : (
              observaciones.map((o) => (
                <div key={o.id} className="card" style={{ padding: '10px 12px' }}>
                  <div className="row spread" style={{ marginBottom: 4 }}>
                    <span className="text-muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{formatDateLong(parseISODate(o.fecha))}</span>
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => handleRemoveObservacion(o.id)} title="Quitar esta observación">
                      <Trash2 size={12} color="var(--danger-600)" />
                    </button>
                  </div>
                  <p style={{ fontSize: 13, whiteSpace: 'pre-line' }}>{o.texto}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
