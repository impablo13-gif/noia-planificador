import { useEffect, useRef, useState } from 'react'
import { Check, ZoomIn } from 'lucide-react'
import Modal from './Modal.jsx'

const OUTPUT_SIZE = 320

// Encuadrador de foto/escudo: arrastra para mover, control para hacer zoom.
// Exporta un cuadrado ya recortado (canvas -> blob) en vez de guardar la
// imagen tal cual. `shape` solo cambia la máscara de vista previa (círculo
// para caras, cuadrado para escudos, que no son redondos); el archivo
// resultante es siempre un cuadrado. Los escudos se exportan en PNG para no
// perder la transparencia del logo (una foto de cara sí puede ir a JPEG).
export default function PhotoCropper({ file, onCancel, onSave, shape = 'circle', title = 'Encuadrar foto', saveLabel = 'Usar esta foto', helpText = 'Arrastra la imagen para encuadrarla y usa la barra para hacer zoom.' }) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const dragRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [scale, setScale] = useState(1)
  const [minScale, setMinScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const cover = Math.max(OUTPUT_SIZE / img.width, OUTPUT_SIZE / img.height)
      setMinScale(cover)
      setScale(cover)
      setOffset({ x: 0, y: 0 })
      setReady(true)
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  function clampOffset(off, s) {
    const img = imgRef.current
    if (!img) return off
    const w = img.width * s
    const h = img.height * s
    const maxX = Math.max(0, (w - OUTPUT_SIZE) / 2)
    const maxY = Math.max(0, (h - OUTPUT_SIZE) / 2)
    return { x: Math.min(maxX, Math.max(-maxX, off.x)), y: Math.min(maxY, Math.max(-maxY, off.y)) }
  }

  useEffect(() => {
    if (!ready) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    const img = imgRef.current
    const w = img.width * scale
    const h = img.height * scale
    const x = OUTPUT_SIZE / 2 - w / 2 + offset.x
    const y = OUTPUT_SIZE / 2 - h / 2 + offset.y
    ctx.drawImage(img, x, y, w, h)
  }, [ready, scale, offset])

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, offset }
  }
  function handlePointerMove(e) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setOffset(clampOffset({ x: dragRef.current.offset.x + dx, y: dragRef.current.offset.y + dy }, scale))
  }
  function handlePointerUp() {
    dragRef.current = null
  }

  function handleZoom(e) {
    const next = Number(e.target.value)
    setScale(next)
    setOffset((off) => clampOffset(off, next))
  }

  function handleSave() {
    if (shape === 'square') {
      canvasRef.current.toBlob((blob) => {
        if (blob) onSave(blob)
      }, 'image/png')
    } else {
      canvasRef.current.toBlob((blob) => {
        if (blob) onSave(blob)
      }, 'image/jpeg', 0.92)
    }
  }

  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!ready}>
            <Check size={14} />
            {saveLabel}
          </button>
        </>
      }
    >
      <div className="stack" style={{ alignItems: 'center' }}>
        <div
          style={{
            width: OUTPUT_SIZE, height: OUTPUT_SIZE, borderRadius: shape === 'square' ? 'var(--radius-md)' : '50%', overflow: 'hidden',
            border: '2px solid var(--gray-300)', cursor: ready ? 'grab' : 'default', touchAction: 'none',
            background: shape === 'square'
              ? 'repeating-conic-gradient(var(--gray-200) 0% 25%, var(--gray-100) 0% 50%) 50% / 16px 16px'
              : 'var(--gray-100)',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <canvas ref={canvasRef} width={OUTPUT_SIZE} height={OUTPUT_SIZE} style={{ width: OUTPUT_SIZE, height: OUTPUT_SIZE, display: 'block' }} />
        </div>
        <div className="row" style={{ width: '100%', gap: 10 }}>
          <ZoomIn size={15} color="var(--ink-500)" />
          <input type="range" min={minScale} max={minScale * 3} step="0.01" value={scale} onChange={handleZoom} style={{ flex: 1 }} />
        </div>
        <p className="field__help">{helpText}</p>
      </div>
    </Modal>
  )
}
