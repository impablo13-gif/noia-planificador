import { useEffect, useRef, useState } from 'react'
import { Eraser, Undo2, UserPlus, Shield, Circle as BallIcon } from 'lucide-react'
import Modal from './Modal.jsx'

const COLORS = ['#201819', '#c21f26', '#1e5799', '#2f7a4f', '#e0670f', '#f2d51a']
const TOKEN_COLOR = { propio: '#c21f26', rival: '#1e5799', balon: '#f2d51a' }
// Proporción real de una pista de fútbol sala (40 × 20 m), a 20 unidades por
// metro — así el área, el círculo central y la portería guardan la escala
// real entre sí en vez de medidas inventadas a ojo.
const W = 800
const H = 400
const MARGIN = 4
const GOAL_HALF = 30 // 3 m de ancho de portería / 2, × 20
const AREA_R = 120 // radio de área de 6 m, × 20

// Pista de fútbol sala en SVG (líneas, áreas reglamentarias, círculo
// central, puntos de penalti) para tener siempre un fondo útil al explicar
// una jugada — a diferencia de la pizarra sobre vídeo (VideoDrawOverlay),
// esta no depende de tener ningún vídeo cargado: es la "pizarra rápida" de
// Fixo, para una explicación al vuelo. El área se dibuja con la geometría
// real del reglamento (dos cuartos de círculo de radio 6 m centrados en
// cada poste + una recta entre ambos), no un semicírculo aproximado.
function Court() {
  const cy = H / 2
  const xR = W - MARGIN
  const leftArea = `M ${MARGIN},${cy - GOAL_HALF - AREA_R} A ${AREA_R},${AREA_R} 0 0,1 ${MARGIN + AREA_R},${cy - GOAL_HALF} L ${MARGIN + AREA_R},${cy + GOAL_HALF} A ${AREA_R},${AREA_R} 0 0,1 ${MARGIN},${cy + GOAL_HALF + AREA_R}`
  const rightArea = `M ${xR},${cy - GOAL_HALF - AREA_R} A ${AREA_R},${AREA_R} 0 0,0 ${xR - AREA_R},${cy - GOAL_HALF} L ${xR - AREA_R},${cy + GOAL_HALF} A ${AREA_R},${AREA_R} 0 0,0 ${xR},${cy + GOAL_HALF + AREA_R}`
  // Campo en un tono neutro (no rojo ni azul) para que las fichas de "Jugador"
  // (rojas) y "Rival" (azules) se lean claras las dos — con un fondo de
  // cancha azul o roja, la ficha de ese mismo color se camuflaba encima.
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#3a4750' }}>
      <rect x={MARGIN} y={MARGIN} width={W - MARGIN * 2} height={H - MARGIN * 2} fill="none" stroke="#fff" strokeWidth="2" />
      <line x1={W / 2} y1={MARGIN} x2={W / 2} y2={H - MARGIN} stroke="#fff" strokeWidth="2" />
      <circle cx={W / 2} cy={cy} r="60" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx={W / 2} cy={cy} r="2.5" fill="#fff" />
      <path d={leftArea} fill="rgba(255,255,255,0.06)" stroke="#fff" strokeWidth="2" />
      <path d={rightArea} fill="rgba(255,255,255,0.06)" stroke="#fff" strokeWidth="2" />
      {/* puntos de penalti (6 m y 10 m) */}
      <circle cx={MARGIN + AREA_R} cy={cy} r="2.5" fill="#fff" />
      <circle cx={xR - AREA_R} cy={cy} r="2.5" fill="#fff" />
      <circle cx={MARGIN + 200} cy={cy} r="2.5" fill="#fff" />
      <circle cx={xR - 200} cy={cy} r="2.5" fill="#fff" />
    </svg>
  )
}

function Token({ token, onDrag, onRemove }) {
  const isBall = token.type === 'balon'
  const size = isBall ? 16 : 26
  function handlePointerDown(e) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function handlePointerMove(e) {
    if (e.buttons !== 1) return
    const parentRect = e.currentTarget.parentElement.getBoundingClientRect()
    const x = ((e.clientX - parentRect.left) / parentRect.width) * 100
    const y = ((e.clientY - parentRect.top) / parentRect.height) * 100
    onDrag(token.id, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)))
  }
  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onDoubleClick={(e) => { e.stopPropagation(); onRemove(token.id) }}
      title="Arrastra para mover · doble clic para quitar"
      style={{
        position: 'absolute',
        left: `${token.x}%`,
        top: `${token.y}%`,
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        borderRadius: '50%',
        background: TOKEN_COLOR[token.type],
        border: isBall ? '1.5px solid #201819' : '2px solid #fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        cursor: 'grab',
        touchAction: 'none',
      }}
    />
  )
}

export default function QuickWhiteboardModal({ onClose }) {
  const canvasRef = useRef(null)
  const strokesRef = useRef([])
  const drawingRef = useRef(false)
  const cssSizeRef = useRef({ w: 0, h: 0 })
  const [color, setColor] = useState(COLORS[0])
  const [tokens, setTokens] = useState([])
  const [, setTick] = useState(0)

  function redraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { w, h } = cssSizeRef.current
    ctx.clearRect(0, 0, w, h)
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

  // El búfer del canvas se dimensiona a su tamaño realmente renderizado ×
  // devicePixelRatio (no a la unidad virtual W×H del viewBox del campo, que
  // no tiene por qué coincidir en píxeles con el contenedor) — si no, los
  // trazos salen borrosos en cualquier pantalla de alta densidad, causa
  // típica de que una pizarra en canvas se vea "mala" en portátiles modernos.
  function resizeCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    cssSizeRef.current = { w: rect.width, h: rect.height }
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.getContext('2d').scale(dpr, dpr)
    redraw()
  }

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pointFromEvent(e) {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handlePointerDown(e) {
    drawingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
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
    setTokens([])
    setTick((t) => t + 1)
  }

  function undoLast() {
    strokesRef.current.pop()
    redraw()
    setTick((t) => t + 1)
  }

  function addToken(type) {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    // Cada ficha nueva aparece un poco desplazada de la anterior del mismo
    // tipo, para que añadir varias seguidas no las deje todas apiladas.
    const sameType = tokens.filter((t) => t.type === type).length
    const x = 20 + (sameType % 5) * 12
    const y = type === 'rival' ? 75 : type === 'balon' ? 50 : 25
    setTokens((prev) => [...prev, { id, type, x, y }])
  }

  function dragToken(id, x, y) {
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, x, y } : t)))
  }

  function removeToken(id) {
    setTokens((prev) => prev.filter((t) => t.id !== id))
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

        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addToken('propio')}>
            <UserPlus size={13} color={TOKEN_COLOR.propio} />
            Jugador
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addToken('rival')}>
            <Shield size={13} color={TOKEN_COLOR.rival} />
            Rival
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => addToken('balon')}>
            <BallIcon size={13} color={TOKEN_COLOR.balon} fill={TOKEN_COLOR.balon} />
            Balón
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
          {tokens.map((t) => (
            <Token key={t.id} token={t} onDrag={dragToken} onRemove={removeToken} />
          ))}
        </div>
        <p className="field__help" style={{ marginTop: 0 }}>Arrastra las fichas para moverlas, doble clic para quitarlas.</p>
      </div>
    </Modal>
  )
}
