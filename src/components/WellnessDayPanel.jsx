import { useState } from 'react'
import { HeartPulse, Plus, Trash2, Moon, Zap, Bone, BatteryMedium, Gauge } from 'lucide-react'
import PlayerAvatar from './PlayerAvatar.jsx'
import { wellnessForDate, setPlayerBienestarField, removePlayerBienestarEntry } from '../bienestarStats.js'
import { getAsistenciaForDate } from '../db.js'

const METRICS = [
  { key: 'estres', label: 'Estrés', icon: Zap },
  { key: 'sueno', label: 'Sueño', icon: Moon },
  { key: 'dolorMuscular', label: 'Dolor', icon: Bone },
  { key: 'energia', label: 'Energía', icon: BatteryMedium },
  { key: 'fatiga', label: 'Fatiga', icon: Gauge },
  { key: 'condicionGeneral', label: 'Condición', icon: HeartPulse },
]

// Media + desglose por jugador del Wellness de una fecha concreta, con cada
// campo (1-5) editable a mano y opción de borrar la respuesta completa —
// hermano de SessionRpePanel, pero para los 6 indicadores de Wellness en
// vez del RPE.
export default function WellnessDayPanel({ fecha, players, title = 'Wellness del día', onChange }) {
  const [tick, setTick] = useState(0)
  const [addingId, setAddingId] = useState('')
  if (!fecha) return null

  const { avg, count, entries } = wellnessForDate(fecha)
  const respondedIds = new Set(entries.map((e) => e.playerId))
  const asistencia = getAsistenciaForDate(fecha)
  const candidates = players
    .filter((p) => !respondedIds.has(p.id))
    .filter((p) => !asistencia || (asistencia.estados[p.id] || 'presente') === 'presente')

  function handleChange(playerId, field, value) {
    const n = value === '' ? null : Number(value)
    setPlayerBienestarField(playerId, fecha, field, n)
    setTick((t) => t + 1)
    onChange?.()
  }

  function handleAdd() {
    if (!addingId) return
    METRICS.forEach((m) => setPlayerBienestarField(addingId, fecha, m.key, 3))
    setAddingId('')
    setTick((t) => t + 1)
    onChange?.()
  }

  function handleRemove(playerId) {
    removePlayerBienestarEntry(playerId, fecha)
    setTick((t) => t + 1)
    onChange?.()
  }

  return (
    <div className="card hero-card">
      <div className="row spread" style={{ marginBottom: entries.length || candidates.length ? 12 : 0 }}>
        <div className="row" style={{ gap: 8 }}>
          <HeartPulse size={18} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        </div>
        <div className="row" style={{ gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 26 }}>{avg != null ? avg.toFixed(1) : '—'}</span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>{count} respuesta{count === 1 ? '' : 's'}</span>
        </div>
      </div>

      {entries.length > 0 && (
        <div className="stack" style={{ gap: 8, marginBottom: candidates.length ? 10 : 0 }}>
          {entries.map((e) => {
            const p = players.find((pl) => pl.id === e.playerId)
            return (
              <div key={e.playerId} className="stack" style={{ gap: 6, background: 'rgba(255,255,255,0.14)', borderRadius: 8, padding: '7px 10px' }}>
                <div className="row spread">
                  <div className="row" style={{ gap: 8 }}>
                    <PlayerAvatar fileId={p?.fotoFileId} size="xs" />
                    <span style={{ fontSize: 12.5 }}>{p?.nombre || 'Jugador'}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ color: '#fff' }}
                    onClick={() => handleRemove(e.playerId)}
                    title="Borrar la respuesta completa de este jugador este día (Wellness y RPE)"
                    aria-label="Borrar respuesta"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                  {METRICS.map((m) => (
                    <label key={m.key} title={m.label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5, opacity: 0.9 }}>
                      <m.icon size={11} />
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={e[m.key] ?? ''}
                        onChange={(ev) => handleChange(e.playerId, m.key, ev.target.value)}
                        style={{ width: 32, padding: '2px 4px', fontSize: 12, borderRadius: 5, border: 'none', background: '#fff', color: 'var(--ink-900)' }}
                      />
                    </label>
                  ))}
                </div>
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
            <option value="">Añadir Wellness de otro jugador…</option>
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
