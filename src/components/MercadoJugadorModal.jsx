import { useState } from 'react'
import { Save, Trash2 } from 'lucide-react'
import Modal from './Modal.jsx'
import PlayerPhotoField from './PlayerPhotoField.jsx'
import { addMercadoJugador, updateMercadoJugador, removeMercadoJugador, PUESTOS } from '../db.js'

// Ficha de un jugador externo en seguimiento — a diferencia del "mercado" de
// Fixo (una base de datos de agencias con cientos de fichas), esto es un
// cuaderno de seguimiento propio de Pablo: los jugadores que él mismo está
// vigilando, sin depender de ningún proveedor de datos externo.
export default function MercadoJugadorModal({ jugador, onClose, onSaved }) {
  const isNew = !jugador?.id
  const [nombre, setNombre] = useState(jugador?.nombre || '')
  const [clubActual, setClubActual] = useState(jugador?.clubActual || '')
  const [posicion, setPosicion] = useState(jugador?.posicion || PUESTOS[0])
  const [edad, setEdad] = useState(jugador?.edad ?? '')
  const [contacto, setContacto] = useState(jugador?.contacto || '')
  const [notas, setNotas] = useState(jugador?.notas || '')
  const [fotoFileId, setFotoFileId] = useState(jugador?.fotoFileId || null)

  function handleSave() {
    const patch = { nombre: nombre.trim(), clubActual: clubActual.trim(), posicion, edad, contacto: contacto.trim(), notas: notas.trim(), fotoFileId }
    if (isNew) addMercadoJugador(patch)
    else updateMercadoJugador(jugador.id, patch)
    onSaved()
  }

  function handleDelete() {
    removeMercadoJugador(jugador.id)
    onSaved()
  }

  return (
    <Modal
      title={isNew ? 'Nuevo jugador en seguimiento' : 'Editar jugador'}
      onClose={onClose}
      maxWidth={560}
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
          <label className="field__label">Notas de seguimiento <span className="field__optional">(opcional)</span></label>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Qué destaca, partidos vistos, impresión general…" />
        </div>
      </div>
    </Modal>
  )
}
