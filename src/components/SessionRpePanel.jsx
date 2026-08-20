import { useState } from 'react'
import { Flame, Plus } from 'lucide-react'
import PlayerAvatar from './PlayerAvatar.jsx'
import { rpeForDate, setPlayerRpe } from '../bienestarStats.js'
import { getAsistenciaForDate } from '../db.js'

// Media + desglose por jugador del RPE de una fecha concreta (entreno o
// partido), con cada valor editable a mano y opción de añadir el RPE de un
// jugador que no respondió la encuesta.
export default function SessionRpePanel({ fecha, players, title = 'RPE de la sesión', onChange }) {
  const [tick, setTick] = useState(0)
  const [addingId, setAddingId] = useState('')
  if (!fecha) return null

  const { avg, count, entries } = rpeForDate(fecha)
  const respondedIds = new Set(entries.map((e) => e.playerId))
  // Si hay asistencia registrada para el día, solo se ofrece añadir RPE a
  // quien realmente estuvo — no tiene sentido pedírselo a quien no entrenó.
  const asistencia = getAsistenciaForDate(fecha)
  const candidates = players
    .filter((p) => !respondedIds.has(p.id))
    .filter((p) => !asistencia || (asistencia.estados[p.id] || 'presente') === 'presente')

  function handleChange(playerId, value) {
    const n = value === '' ? null : Number(value)
    setPlayerRpe(playerId, fecha, n)
    setTick((t) => t + 1)
    onChange?.()
  }

  function handleAdd() {
    if (!addingId) return
    setPlayerRpe(addingId, fecha, 5)
    setAddingId('')
    setTick((t) => t + 1)
    onChange?.()
  }

  return (
    <div
      className="card"
      style={{ background: 'linear-gradient(135deg, var(--red-800) 0%, var(--red-600) 100%)', color: '#fff', border: 'none' }}
    >
      <div className="row spread" style={{ marginBottom: entries.length || candidates.length ? 12 : 0 }}>
        <div className="row" style={{ gap: 8 }}>
          <Flame size={18} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        </div>
        <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 26 }}>{avg != null ? avg.toFixed(1) : '—'}</span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>{count} respuesta{count === 1 ? '' : 's'}</span>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="stack" style={{ gap: 6, marginBottom: candidates.length ? 10 : 0 }}>
          {entries.map((e) => {
            const p = players.find((pl) => pl.id === e.playerId)
            return (
              <div key={e.playerId} className="row spread" style={{ background: 'rgba(255,255,255,0.14)', borderRadius: 8, padding: '5px 10px' }}>
                <div className="row" style={{ gap: 8 }}>
                  <PlayerAvatar fileId={p?.fotoFileId} size="xs" />
                  <span style={{ fontSize: 12.5 }}>{p?.nombre || 'Jugador'}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={e.rpe ?? ''}
                  onChange={(ev) => handleChange(e.playerId, ev.target.value)}
                  style={{ width: 54, padding: '3px 6px', fontSize: 12.5, borderRadius: 5, border: 'none', background: '#fff', color: 'var(--ink-900)' }}
                />
              </div>
            )
          })}
        </div>
      )}

      {candidates.length > 0 && (
        <div className="row" style={{ gap: 6 }}>
          <select
            value={addingId}
            onChange={(ev) => setAddingId(ev.target.value)}
            style={{ flex: 1, borderRadius: 5, border: 'none', background: 'rgba(255,255,255,0.92)', color: 'var(--ink-900)', padding: '6px 8px', fontSize: 12.5 }}
          >
            <option value="">Añadir RPE de otro jugador…</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <button type="button" className="btn btn-sm" style={{ background: '#fff', color: 'var(--red-700)' }} onClick={handleAdd} disabled={!addingId}>
            <Plus size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
