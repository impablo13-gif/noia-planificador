import { useState } from 'react'
import { Save, CheckCheck } from 'lucide-react'
import Modal from './Modal.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import { setAsistenciaForDate, ASISTENCIA_ESTADOS } from '../db.js'
import { formatDateLong, parseISODate } from '../dateUtils.js'

export default function AsistenciaModal({ fecha, label, players, initialEstados, onClose, onSaved }) {
  const [estados, setEstados] = useState({ ...initialEstados })

  function setEstado(playerId, estadoId) {
    setEstados((prev) => ({ ...prev, [playerId]: estadoId }))
  }

  function marcarTodosPresentes() {
    const next = {}
    players.forEach((p) => { next[p.id] = 'presente' })
    setEstados(next)
  }

  function handleSave() {
    setAsistenciaForDate(fecha, estados)
    onSaved()
  }

  const counts = ASISTENCIA_ESTADOS.reduce((acc, e) => {
    acc[e.id] = players.filter((p) => (estados[p.id] || 'presente') === e.id).length
    return acc
  }, {})

  return (
    <Modal
      title={`Asistencia · ${formatDateLong(parseISODate(fecha))}`}
      onClose={onClose}
      maxWidth={560}
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
        {label && <p className="section-hint" style={{ marginBottom: 0 }}>{label}</p>}

        <div className="row spread">
          <button type="button" className="btn btn-secondary btn-sm" onClick={marcarTodosPresentes}>
            <CheckCheck size={13} />
            Marcar todos presentes
          </button>
          <div className="row" style={{ gap: 8, fontSize: 11.5 }}>
            {ASISTENCIA_ESTADOS.map((e) => (
              counts[e.id] > 0 && (
                <span key={e.id} className="row" style={{ gap: 3 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color }} />
                  {counts[e.id]} {e.label.toLowerCase()}
                </span>
              )
            ))}
          </div>
        </div>

        <div className="stack" style={{ gap: 6, maxHeight: 380, overflowY: 'auto' }}>
          {players.map((p) => {
            const estado = estados[p.id] || 'presente'
            const estadoDef = ASISTENCIA_ESTADOS.find((e) => e.id === estado)
            return (
              <div
                key={p.id}
                className="stack"
                style={{ gap: 6, border: `1.5px solid ${estadoDef.bg}`, borderRadius: 'var(--radius-sm)', padding: '8px 10px', background: estadoDef.bg }}
              >
                <span className="row" style={{ gap: 9 }}>
                  <PlayerAvatar fileId={p.fotoFileId} size="sm" />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)' }}>{p.nombre}</span>
                </span>
                <div className="chip-group" style={{ gap: 5 }}>
                  {ASISTENCIA_ESTADOS.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setEstado(p.id, e.id)}
                      className="chip"
                      style={
                        estado === e.id
                          ? { background: e.color, borderColor: e.color, color: '#fff', fontSize: 12, padding: '4px 10px' }
                          : { fontSize: 12, padding: '4px 10px' }
                      }
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
