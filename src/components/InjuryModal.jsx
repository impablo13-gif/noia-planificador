import { useState } from 'react'
import { Save, Trash2 } from 'lucide-react'
import Modal from './Modal.jsx'
import { addInjury, updateInjury, removeInjury } from '../db.js'

const ZONAS = ['Muslo', 'Isquios', 'Gemelo', 'Rodilla', 'Tobillo', 'Espalda', 'Hombro', 'Ingle', 'Otra']
const TIPOS = ['Sobrecarga muscular', 'Rotura fibrilar', 'Esguince', 'Contractura', 'Tendinitis', 'Fractura', 'Contusión', 'Otra']
const ESTADOS = ['Activa', 'En recuperación', 'De alta']

export default function InjuryModal({ injury, players, onClose, onSaved }) {
  const [playerId, setPlayerId] = useState(injury.playerId || players[0]?.id || '')
  const [zona, setZona] = useState(injury.zona || ZONAS[0])
  const [tipo, setTipo] = useState(injury.tipo || TIPOS[0])
  const [estado, setEstado] = useState(injury.estado || 'Activa')
  const [fechaLesion, setFechaLesion] = useState(injury.fechaLesion || '')
  const [fechaAltaEstimada, setFechaAltaEstimada] = useState(injury.fechaAltaEstimada || '')
  const [fechaAltaReal, setFechaAltaReal] = useState(injury.fechaAltaReal || '')
  const [notas, setNotas] = useState(injury.notas || '')

  function handleSave() {
    if (!playerId) return
    const patch = { playerId, zona, tipo, estado, fechaLesion, fechaAltaEstimada, fechaAltaReal, notas }
    if (injury.id) {
      updateInjury(injury.id, patch)
    } else {
      addInjury(patch)
    }
    onSaved()
  }

  function handleDelete() {
    if (injury.id) removeInjury(injury.id)
    onSaved()
  }

  return (
    <Modal
      title={injury.id ? 'Editar lesión' : 'Nueva lesión'}
      onClose={onClose}
      footer={
        <>
          {injury.id && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={14} />
              Eliminar
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!playerId}>
            <Save size={14} />
            Guardar
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="field">
          <label className="field__label">Jugador</label>
          <select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            {players.length === 0 && <option value="">Sin jugadores en la plantilla</option>}
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}{p.equipo ? ` · ${p.equipo}` : ''}</option>
            ))}
          </select>
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label className="field__label">Zona</label>
            <select value={zona} onChange={(e) => setZona(e.target.value)}>
              {ZONAS.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field__label">Estado</label>
          <div className="chip-group">
            {ESTADOS.map((e) => (
              <button key={e} type="button" className={`chip${estado === e ? ' is-active' : ''}`} onClick={() => setEstado(e)}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="grid cols-3">
          <div className="field">
            <label className="field__label">Fecha lesión</label>
            <input type="date" value={fechaLesion} onChange={(e) => setFechaLesion(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Alta estimada</label>
            <input type="date" value={fechaAltaEstimada} onChange={(e) => setFechaAltaEstimada(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Alta real</label>
            <input type="date" value={fechaAltaReal} onChange={(e) => setFechaAltaReal(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="field__label">Notas</label>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Diagnóstico, tratamiento, pruebas de imagen, evolución…" />
        </div>
      </div>
    </Modal>
  )
}
