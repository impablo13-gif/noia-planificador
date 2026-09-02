import { useEffect, useRef, useState } from 'react'
import { Pencil, Eraser, Undo2 } from 'lucide-react'

const COLORS = ['#ffffff', '#f2d51a', '#e0670f', '#c21f26', '#2f7a4f', '#1e5799']

// Pizarra encima del vídeo: pensada para explicar una jugada al vuelo (pausas
// el vídeo, dibujas, sigues) — no se guarda nada, es efímera a propósito,
// como la "pizarra rápida" de Fixo. Se limpia sola en cada play/seek para no
// dejar trazos de una jugada pegados sobre la siguiente.
export default function VideoDrawOverlay({ videoRef }) {
  const canvasRef = useRef(null)
  const strokesRef = useRef([]) // [{ color, points: [{x,y}] }]
  const drawingRef = useRef(false)
  const [active, setActive] = useState(false)
  const [color, setColor] = useState(COLORS[0])

  function resizeCanvas() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.clientWidth
    canvas.height = video.clientHeight
    redraw()
  }

  function redraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    strokesRef.current.forEach((stroke) => {
      if (stroke.points.length < 2) return
      ctx.strokeStyle = stroke.color
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
      stroke.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y))
      ctx.stroke()
    })
  }

  function clearAll() {
    strokesRef.current = []
    redraw()
  }

  function undoLast() {
    strokesRef.current.pop()
    redraw()
  }

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    const video = videoRef.current
    video?.addEventListener('loadedmetadata', resizeCanvas)
    video?.addEventListener('play', clearAll)
    video?.addEventListener('seeked', clearAll)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      video?.removeEventListener('loadedmetadata', resizeCanvas)
      video?.removeEventListener('play', clearAll)
      video?.removeEventListener('seeked', clearAll)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pointFromEvent(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e) {
    if (!active) return
    drawingRef.current = true
    strokesRef.current.push({ color, points: [pointFromEvent(e)] })
  }

  function handlePointerMove(e) {
    if (!active || !drawingRef.current) return
    strokesRef.current[strokesRef.current.length - 1].points.push(pointFromEvent(e))
    redraw()
  }

  function handlePointerUp() {
    drawingRef.current = false
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: active ? 'auto' : 'none', cursor: active ? 'crosshair' : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="row" style={{ position: 'absolute', top: 8, right: 8, gap: 4, pointerEvents: 'auto', background: 'rgba(20,16,17,0.65)', borderRadius: 'var(--radius-sm)', padding: 5 }}>
        {active && COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            title={c}
            style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: color === c ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', padding: 0 }}
          />
        ))}
        {active && (
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={undoLast} title="Deshacer trazo" style={{ color: '#fff' }}>
            <Undo2 size={13} />
          </button>
        )}
        {active && (
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={clearAll} title="Borrar todo" style={{ color: '#fff' }}>
            <Eraser size={13} />
          </button>
        )}
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setActive((v) => !v)}
          style={{ color: '#fff', background: active ? 'var(--red-600)' : 'transparent', borderColor: '#fff' }}
        >
          <Pencil size={13} />
          {active ? 'Dibujando' : 'Pizarra'}
        </button>
      </div>
    </div>
  )
}
