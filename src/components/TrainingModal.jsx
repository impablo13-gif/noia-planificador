import { useState } from 'react'
import { CalendarClock, Ban, Save, Flame } from 'lucide-react'
import Modal from './Modal.jsx'
import FileDrop from './FileDrop.jsx'
import SessionRpePanel from './SessionRpePanel.jsx'
import { saveTrainingOverride, getPlayers } from '../db.js'
import { rpeForDate } from '../bienestarStats.js'
import { formatDateLong, parseISODate } from '../dateUtils.js'

// Insignia compacta para meter en la cabecera del modal (junto al título),
// no en el cuerpo — es lo que se ve nada más abrir, sin desplazar nada.
function HeaderRpe({ fecha }) {
  const { avg, count } = rpeForDate(fecha)
  if (avg == null) return null
  return (
    <span
      className="row"
      style={{ gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--red-600)', flexShrink: 0 }}
      title={`RPE medio de la sesión · ${count} respuesta${count === 1 ? '' : 's'}`}
    >
      <Flame size={14} />
      {avg.toFixed(1)}
    </span>
  )
}

export default function TrainingModal({ training, onClose, onSaved }) {
  const [date, setDate] = useState(training.date)
  const [rpeTick, setRpeTick] = useState(0)
  const [time, setTime] = useState(training.time || '19:00')
  const [label, setLabel] = useState(training.label || 'Entreno')
  const [note, setNote] = useState(training.note || '')
  const [status, setStatus] = useState(training.status || 'pendiente')
  const [sessionText, setSessionText] = useState(training.sessionText || '')
  const [sessionFileId, setSessionFileId] = useState(training.sessionFileId || null)
  const [cancelled, setCancelled] = useState(!!training.cancelled)

  function persistAt(targetDate, patch) {
    const finalPatch = training.kind === 'new' && targetDate === training.date ? { ...patch, added: true } : patch
    saveTrainingOverride(targetDate, finalPatch)
  }

  function handleSave() {
    const patch = { time, label, note, status, sessionText, sessionFileId, cancelled }
    if (date !== training.date) {
      // Mover de fecha: el día original queda cancelado (con nota) y se crea
      // el entreno en la fecha nueva, conservando hora/contenido/sesión.
      saveTrainingOverride(training.date, { cancelled: true, note: `Movido a ${formatDateLong(parseISODate(date))}` })
      saveTrainingOverride(date, { ...patch, added: true, cancelled: false })
    } else {
      persistAt(date, patch)
    }
    onSaved()
  }

  function handleToggleCancelled() {
    const next = !cancelled
    setCancelled(next)
    persistAt(training.date, { time, label, note, status, sessionText, sessionFileId, cancelled: next })
    onSaved()
  }

  return (
    <Modal
      title={
        <span className="row spread" style={{ gap: 10, marginRight: 10 }}>
          <span>Entreno · {formatDateLong(parseISODate(training.date))}</span>
          <HeaderRpe key={rpeTick} fecha={date} />
        </span>
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            <Save size={14} />
            Guardar
          </button>
        </>
      }
    >
      <div className="stack">
        <SessionRpePanel fecha={date} players={getPlayers()} title="RPE de la sesión" onChange={() => setRpeTick((t) => t + 1)} />
        <div className="grid cols-2">
          <div className="field">
            <label className="field__label"><CalendarClock size={13} /> Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Hora</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="field__label">Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pendiente">Pendiente</option>
            <option value="subida">Sesión subida</option>
          </select>
        </div>

        <div className="field">
          <label className="field__label">Contenido / etiqueta</label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej. FUERZA + TAC-TEC" />
        </div>

        <div className="field">
          <label className="field__label">Nota</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. cambio de pista, cita previa..." />
        </div>

        <div className="field">
          <label className="field__label">Sesión (texto)</label>
          <textarea value={sessionText} onChange={(e) => setSessionText(e.target.value)} placeholder="Pega o escribe aquí la sesión de este día…" />
        </div>

        <div className="field">
          <label className="field__label">Adjuntar sesión (PDF, imagen…)</label>
          <FileDrop fileId={sessionFileId} onChange={setSessionFileId} accept=".pdf,image/*,.doc,.docx" label="Subir sesión" />
        </div>

        <hr className="divider" />

        <div className="row spread">
          <button type="button" className={`btn btn-sm ${cancelled ? 'btn-secondary' : 'btn-danger'}`} onClick={handleToggleCancelled}>
            <Ban size={13} />
            {cancelled ? 'Reactivar entreno' : 'Cancelar este día'}
          </button>
        </div>
        {date !== training.date && (
          <p className="field__help">Al guardar, el {formatDateLong(parseISODate(training.date))} quedará marcado como movido y el entreno pasará al {formatDateLong(parseISODate(date))}.</p>
        )}
      </div>
    </Modal>
  )
}
