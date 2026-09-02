import { useEffect, useRef, useState } from 'react'
import { Eraser, Undo2 } from 'lucide-react'
import Modal from './Modal.jsx'

const COLORS = ['#201819', '#c21f26', '#1e5799', '#2f7a4f', '#e0670f', '#f2d51a']
const W = 760
const H = 420

// Pista de fútbol sala en SVG (líneas, áreas, círculo central) para tener
// siempre un fondo útil al explicar una jugada — a diferencia de la pizarra
// sobre vídeo (VideoDrawOverlay), esta no depende de tener ningún vídeo
// cargado: es la "pizarra rápida" de Fixo, para una explicación al vuelo.
function Court() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: 'absolute', inset: 0, background: '#1e5799' }}>
      <rect x="4" y="4" width={W - 8} height={H - 8} fill="none" stroke="#fff" strokeWidth="2" />
      <line x1={W / 2} y1="4" x2={W / 2} y2={H - 4} stroke="#fff" strokeWidth="2" />
      <circle cx={W / 2} cy={H / 2} r="45" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx={W / 2} cy={H / 2} r="2.5" fill="#fff" />
      {/* áreas de portería (aprox.) */}
      <path d={`M 4,${H / 2 - 70} A 70,70 0 0 1 4,${H / 2 + 70}`} fill="none" stroke="#fff" strokeWidth="2" />
      <path d={`M ${W - 4},${H / 2 - 70} A 70,70 0 0 0 ${W - 4},${H / 2 + 70}`} fill="none" stroke="#fff" strokeWidth="2" />
      <line x1="60" y1={H / 2 - 55} x2="60" y2={H / 2 + 55} stroke="#fff" strokeWidth="2" />
      <line x1={W - 60} y1={H / 2 - 55} x2={W - 60} y2={H / 2 + 55} stroke="#fff" strokeWidth="2" />
    </svg>
  )
}

export default function QuickWhiteboardModal({ onClose }) {
  const canvasRef = useRef(null)
  const strokesRef = useRef([])
  const drawingRef = useRef(false)
  const [color, setColor] = useState(COLORS[0])
  const [, setTick] = useState(0)

  function redraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)
    strokesRef.current.forEach((stroke) => {
      if (stroke.points.length < 2) return
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = 3.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      stroke.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y))
      ctx.stroke()
    })
  }

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width = W
    canvas.height = H
  }, [])

  function pointFromEvent(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H }
  }

  function handlePointerDown(e) {
    drawingRef.current = true
    strokesRef.current.push({ color, points: [pointFromEvent(e)] })
  }

  function handlePointerMove(e) {
    if (!drawingRef.current) return
    strokesRef.current[strokesRef.current.length - 1].points.push(pointFromEvent(e))
    redraw()
  }

  function handlePointerUp() {
    drawingRef.current = false
  }

  function clearAll() {
    strokesRef.current = []
    redraw()
    setTick((t) => t + 1)
  }

  function undoLast() {
    strokesRef.current.pop()
    redraw()
    setTick((t) => t + 1)
  }

  return (
    <Modal title="Pizarra rápida" onClose={onClose} maxWidth={800}>
      <div className="stack">
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              title={c}
              style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: color === c ? '2px solid var(--ink-900)' : '2px solid var(--gray-200)', cursor: 'pointer', padding: 0 }}
            />
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={undoLast}>
            <Undo2 size={13} />
            Deshacer
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll}>
            <Eraser size={13} />
            Borrar todo
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', aspectRatio: `${W} / ${H}`, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <Court />
          <canvas
            ref={canvasRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
      </div>
    </Modal>
  )
}
