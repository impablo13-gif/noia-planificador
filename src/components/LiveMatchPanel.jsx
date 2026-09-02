import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Timer, Save } from 'lucide-react'
import PlayerAvatar from './PlayerAvatar.jsx'
import { updateMatch } from '../db.js'

function formatClock(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Seguimiento de minutos en directo durante el partido: un cronómetro
// general y, para cada jugador convocado, su propio acumulado que solo
// corre mientras el cronómetro general está en marcha Y el jugador está en
// pista — así una sustitución o una pausa del partido no le sigue sumando
// tiempo a nadie. Independiente de los minutos que luego traiga NPA Stats:
// esto es un apunte propio en vivo, no sustituye esa fuente.
export default function LiveMatchPanel({ match, players, onClose }) {
  const stateRef = useRef({
    clockRunning: false,
    clockAccumMs: match.minutosEnDirecto?.duracionMs || 0,
    clockRunSince: null,
    onCourt: new Set(match.minutosEnDirecto?.onCourtInicial || []),
    playerAccumMs: { ...(match.minutosEnDirecto?.porJugador || {}) },
    playerRunSince: {},
  })
  const [, setTick] = useState(0)
  const bump = () => setTick((t) => t + 1)

  useEffect(() => {
    const interval = setInterval(() => {
      if (stateRef.current.clockRunning) bump()
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  function now() {
    return Date.now()
  }

  function toggleClock() {
    const s = stateRef.current
    const t = now()
    if (s.clockRunning) {
      s.clockAccumMs += t - s.clockRunSince
      Object.keys(s.playerRunSince).forEach((id) => {
        if (s.playerRunSince[id] != null) {
          s.playerAccumMs[id] = (s.playerAccumMs[id] || 0) + (t - s.playerRunSince[id])
          s.playerRunSince[id] = null
        }
      })
      s.clockRunning = false
      s.clockRunSince = null
    } else {
      s.clockRunSince = t
      s.clockRunning = true
      s.onCourt.forEach((id) => { s.playerRunSince[id] = t })
    }
    bump()
  }

  function resetClock() {
    stateRef.current = {
      clockRunning: false, clockAccumMs: 0, clockRunSince: null,
      onCourt: new Set(), playerAccumMs: {}, playerRunSince: {},
    }
    bump()
  }

  function togglePlayer(id) {
    const s = stateRef.current
    const t = now()
    if (s.onCourt.has(id)) {
      if (s.playerRunSince[id] != null) {
        s.playerAccumMs[id] = (s.playerAccumMs[id] || 0) + (t - s.playerRunSince[id])
        s.playerRunSince[id] = null
      }
      s.onCourt.delete(id)
    } else {
      s.onCourt.add(id)
      if (s.clockRunning) s.playerRunSince[id] = t
    }
    bump()
  }

  function playerMs(id) {
    const s = stateRef.current
    const base = s.playerAccumMs[id] || 0
    return s.playerRunSince[id] != null ? base + (now() - s.playerRunSince[id]) : base
  }

  function clockMs() {
    const s = stateRef.current
    return s.clockRunning ? s.clockAccumMs + (now() - s.clockRunSince) : s.clockAccumMs
  }

  function handleGuardar() {
    const s = stateRef.current
    const porJugador = {}
    players.forEach((p) => { porJugador[p.id] = Math.round(playerMs(p.id) / 1000) })
    updateMatch(match.id, {
      minutosEnDirecto: {
        duracionMs: clockMs(),
        porJugador,
        onCourtInicial: [...s.onCourt],
        actualizadoAt: Date.now(),
      },
    })
    onClose()
  }

  const s = stateRef.current

  return (
    <div className="card">
      <div className="row" style={{ gap: 9, marginBottom: 4 }}>
        <div className="icon-chip" style={{ '--chip-color': 'var(--red-600)' }}><Timer size={15} /></div>
        <h4 style={{ margin: 0, fontSize: 14 }}>Partido en directo</h4>
      </div>
      <p className="section-hint" style={{ marginTop: 4, marginBottom: 10 }}>
        Marca quién está en pista — sus minutos corren solo mientras el cronómetro está en marcha. Es un apunte propio, no sustituye a NPA Stats.
      </p>

      <div className="hero-card card" style={{ padding: 16, marginBottom: 12 }}>
        <div className="row spread" style={{ alignItems: 'center' }}>
          <div className="hero-card__value" style={{ fontSize: 32, fontVariantNumeric: 'tabular-nums' }}>{formatClock(clockMs())}</div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={toggleClock}>
              {s.clockRunning ? <Pause size={13} /> : <Play size={13} />}
              {s.clockRunning ? 'Pausar' : 'Iniciar'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetClock} style={{ color: '#fff' }}>
              <RotateCcw size={13} />
              Reiniciar
            </button>
          </div>
        </div>
      </div>

      <div className="row spread" style={{ marginBottom: 8 }}>
        <strong style={{ fontSize: 12.5 }}>En pista</strong>
        <span className="badge badge-gray">{s.onCourt.size} jugador{s.onCourt.size === 1 ? '' : 'es'}</span>
      </div>

      <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {players.map((p) => {
          const active = s.onCourt.has(p.id)
          return (
            <button
              key={p.id}
              type="button"
              className={`chip${active ? ' is-active' : ''}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => togglePlayer(p.id)}
            >
              <PlayerAvatar fileId={p.fotoFileId} size="xs" />
              {p.dorsal ? `#${p.dorsal} ` : ''}{p.nombre}
              <span className="text-muted" style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{formatClock(playerMs(p.id))}</span>
            </button>
          )
        })}
      </div>

      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={handleGuardar}>
          <Save size={13} />
          Guardar y cerrar
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Cerrar sin guardar</button>
      </div>
    </div>
  )
}
