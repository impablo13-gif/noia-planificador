import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, footer, maxWidth }) {
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }
  return (
    <div className="modal-backdrop" onMouseDown={handleBackdrop}>
      <div className="modal" style={maxWidth ? { maxWidth } : undefined}>
        <div className="modal__head">
          <h3 style={{ fontSize: 16 }}>{title}</h3>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  )
}
