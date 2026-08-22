import { useState, useEffect } from 'react'
import { Plus, X, ListTodo } from 'lucide-react'

// Mini to-do reutilizable. `api` es agendaClub o agendaPersonal (mismo shape) de db.js.
export default function AgendaBox({ title, icon: Icon = ListTodo, api, placeholder }) {
  const [items, setItems] = useState([])
  const [text, setText] = useState('')

  useEffect(() => {
    setItems(api.get())
  }, [api])

  function handleAdd(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setItems(api.add(trimmed))
    setText('')
  }

  function handleToggle(id) {
    setItems(api.toggle(id))
  }

  function handleRemove(id) {
    setItems(api.remove(id))
  }

  return (
    <div className="card">
      <div className="row spread" style={{ marginBottom: 14 }}>
        <div className="row" style={{ gap: 10 }}>
          <div className="icon-chip" style={{ '--chip-color': 'var(--red-700)' }}>
            <Icon size={16} />
          </div>
          <h3 className="section-title" style={{ marginBottom: 0 }}>{title}</h3>
        </div>
      </div>

      <form onSubmit={handleAdd} className="row" style={{ marginBottom: 10 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary btn-sm btn-icon" aria-label="Añadir">
          <Plus size={15} />
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-muted" style={{ fontSize: 13 }}>Sin tareas pendientes.</p>
      ) : (
        <div>
          {items.map((item) => (
            <div key={item.id} className={`agenda-item${item.done ? ' is-done' : ''}`}>
              <input type="checkbox" checked={item.done} onChange={() => handleToggle(item.id)} />
              <span className="agenda-item__text">{item.text}</span>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => handleRemove(item.id)} aria-label="Borrar">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
