import { useEffect, useRef, useState } from 'react'
import { Pencil, Eraser, Undo2, Mic, Square } from 'lucide-react'

const COLORS = ['#ffffff', '#f2d51a', '#e0670f', '#c21f26', '#2f7a4f', '#1e5799']

// Pizarra encima del vídeo: pensada para explicar una jugada al vuelo (pausas
// el vídeo, dibujas, sigues) — no se guarda nada, es efímera a propósito,
// como la "pizarra rápida" de Fixo. Se limpia sola en cada play/seek para no
// dejar trazos de una jugada pegados sobre la siguiente.
export default function VideoDrawOverlay({ videoRef, onRecorded }) {
  const canvasRef = useRef(null)
  const strokesRef = useRef([]) // [{ color, points: [{x,y}] }]
  const drawingRef = useRef(false)
  const [active, setActive] = useState(false)
  const [color, setColor] = useState(COLORS[0])
  const outputCanvasRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const rafRef = useRef(null)
  const micStreamRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const recordingRef = useRef(false)
  const [recordError, setRecordError] = useState('')

  // El búfer del canvas tiene que ir a resolución de dispositivo (CSS size ×
  // devicePixelRatio), con el contexto escalado igual, o los trazos salen
  // borrosos en cualquier pantalla de alta densidad — causa típica de que
  // una pizarra en canvas se vea "mala" en portátiles modernos.
  const cssSizeRef = useRef({ w: 0, h: 0 })

  function resizeCanvas() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = video.clientWidth
    const h = video.clientHeight
    cssSizeRef.current = { w, h }
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.getContext('2d').scale(dpr, dpr)
    redraw()
  }

  function redraw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { w, h } = cssSizeRef.current
    ctx.clearRect(0, 0, w, h)
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

  // El vídeo se pone en marcha con play() al iniciar una grabación narrada —
  // sin esta guarda, el propio arranque borraría de golpe la pizarra que se
  // quería narrar.
  function clearAllUnlessRecording() {
    if (recordingRef.current) return
    clearAll()
  }

  function undoLast() {
    strokesRef.current.pop()
    redraw()
  }

  // Graba voz + pizarra en directo sobre el vídeo, mezclando en un canvas
  // oculto el fotograma del vídeo con el dibujo superpuesto, y capturando
  // ese canvas + el micrófono como un único stream — igual que la "grabación
  // narrada" de Fixo, para mandar correcciones individuales sin estar
  // delante del jugador. Solo funciona con vídeos del mismo origen (locales
  // o de la nube propia); un vídeo externo sin CORS abierto "mancha" el
  // canvas y el navegador bloquea la captura por seguridad.
  async function startRecording() {
    setRecordError('')
    const video = videoRef.current
    if (!video) return
    let micStream
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setRecordError('No se pudo acceder al micrófono — revisa los permisos del navegador.')
      return
    }
    micStreamRef.current = micStream

    const outCanvas = outputCanvasRef.current
    outCanvas.width = video.videoWidth || video.clientWidth || 640
    outCanvas.height = video.videoHeight || video.clientHeight || 360
    const ctx = outCanvas.getContext('2d')

    function drawFrame() {
      try {
        ctx.drawImage(video, 0, 0, outCanvas.width, outCanvas.height)
        if (canvasRef.current) ctx.drawImage(canvasRef.current, 0, 0, outCanvas.width, outCanvas.height)
      } catch {
        // Fotograma no disponible todavía (vídeo aún cargando) — se reintenta en el siguiente frame.
      }
      rafRef.current = requestAnimationFrame(drawFrame)
    }
    drawFrame()

    let recorder
    try {
      const videoTrack = outCanvas.captureStream(30).getVideoTracks()[0]
      const combined = new MediaStream([videoTrack, ...micStream.getAudioTracks()])
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t)) || ''
      recorder = new MediaRecorder(combined, mimeType ? { mimeType } : undefined)
    } catch {
      setRecordError('Este vídeo no se puede grabar (origen externo sin permiso de uso compartido). Funciona con vídeos subidos como archivo local.')
      cancelAnimationFrame(rafRef.current)
      micStream.getTracks().forEach((t) => t.stop())
      return
    }

    chunksRef.current = []
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      onRecorded?.(URL.createObjectURL(blob))
    }
    recorder.onerror = () => {
      setRecordError('La grabación se ha interrumpido (posible restricción de origen del vídeo).')
    }
    recorder.start()
    mediaRecorderRef.current = recorder
    setActive(true)
    setRecording(true)
    recordingRef.current = true
    video.play()
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    videoRef.current?.pause()
    setRecording(false)
    recordingRef.current = false
  }

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    const video = videoRef.current
    video?.addEventListener('loadedmetadata', resizeCanvas)
    video?.addEventListener('play', clearAllUnlessRecording)
    video?.addEventListener('seeked', clearAllUnlessRecording)
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      video?.removeEventListener('loadedmetadata', resizeCanvas)
      video?.removeEventListener('play', clearAllUnlessRecording)
      video?.removeEventListener('seeked', clearAllUnlessRecording)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Si se cambia de proyecto o se cierra la vista a media grabación, corta
  // limpio: para el micrófono, el bucle de dibujo y libera la última
  // grabación en memoria.
  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    micStreamRef.current?.getTracks().forEach((t) => t.stop())
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
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
        {recording ? (
          <button type="button" className="btn btn-sm" onClick={stopRecording} style={{ color: '#fff', background: 'var(--red-600)', borderColor: '#fff' }}>
            <Square size={13} />
            ● REC — Detener
          </button>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={startRecording} style={{ color: '#fff' }} title="Grabar narración (voz + pizarra)">
            <Mic size={13} />
            Narrar
          </button>
        )}
      </div>
      {recordError && (
        <div className="banner banner-danger" style={{ position: 'absolute', bottom: 8, left: 8, right: 8, pointerEvents: 'auto', fontSize: 12 }}>
          {recordError}
        </div>
      )}
      <canvas ref={outputCanvasRef} style={{ position: 'absolute', left: -9999, top: 0 }} />
    </div>
  )
}
