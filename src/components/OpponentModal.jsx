import { useState } from 'react'
import { Save, Trash2, MapPin, Phone, User, Video, Plus, ChevronRight } from 'lucide-react'
import Modal from './Modal.jsx'
import ShieldPhotoField from './ShieldPhotoField.jsx'
import { updateOpponent, removeOpponent, addOpponent, getAnalisisProyectos, addAnalisisProyecto, getAnalisisEventos } from '../db.js'

export default function OpponentModal({ opponent, onClose, onSaved, onGoToAnalisis }) {
  const [name, setName] = useState(opponent.name || '')
  const [siglas, setSiglas] = useState(opponent.siglas || '')
  const [shieldFileId, setShieldFileId] = useState(opponent.shieldFileId || null)
  const [scouting, setScouting] = useState({
    resumen: '', sistemaJuego: '', jugadoresClave: '', puntosFuertes: '',
    puntosDebiles: '', abp: '', notasLibres: '', highlights: [],
    ...opponent.scouting,
  })
  const [highlightsText, setHighlightsText] = useState((opponent.scouting?.highlights || []).join('\n'))

  function setField(key, value) {
    setScouting((s) => ({ ...s, [key]: value }))
  }

  function handleSave() {
    const highlights = highlightsText.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 4)
    const patch = { name, siglas: siglas.trim().toUpperCase(), shieldFileId, scouting: { ...scouting, highlights } }
    if (opponent.id) {
      updateOpponent(opponent.id, patch)
    } else {
      addOpponent(patch)
    }
    onSaved()
  }

  function handleDelete() {
    if (opponent.id) removeOpponent(opponent.id)
    onSaved()
  }

  const proyectosVideo = opponent.id ? getAnalisisProyectos().filter((p) => p.opponentId === opponent.id) : []

  function handleNuevoProyectoVideo() {
    const next = addAnalisisProyecto({ nombre: `Scouting — ${opponent.name}`, tipo: 'rival', opponentId: opponent.id })
    const created = next[next.length - 1]
    onGoToAnalisis?.(created.id)
  }

  return (
    <Modal
      title={opponent.id ? 'Ficha de scouting' : 'Nuevo rival'}
      onClose={onClose}
      maxWidth={640}
      footer={
        <>
          {opponent.id && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={14} />
              Eliminar
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>
            <Save size={14} />
            Guardar
          </button>
        </>
      }
    >
      <div className="stack">
        <ShieldPhotoField fileId={shieldFileId} onChange={setShieldFileId} />

        <div className="grid cols-2">
          <div className="field">
            <label className="field__label">Nombre del club</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Siglas <span className="field__optional">(opcional)</span></label>
            <input
              type="text"
              value={siglas}
              onChange={(e) => setSiglas(e.target.value)}
              placeholder="Ej. RMA"
              style={{ textTransform: 'uppercase' }}
            />
            <p className="field__help">Si la pones, sale en el calendario en vez del nombre completo — útil para no acortar tú a mano cada rival.</p>
          </div>
        </div>

        {(opponent.pabellon || opponent.contacto || opponent.direccion) && (
          <div className="banner banner-info">
            <div>
              {opponent.contacto && opponent.contacto !== '—' && (
                <div><User size={12} style={{ verticalAlign: -1 }} /> {opponent.contacto} {opponent.telefono && opponent.telefono !== '—' ? `· ${opponent.telefono}` : ''}</div>
              )}
              {opponent.pabellon && opponent.pabellon !== '—' && (
                <div><MapPin size={12} style={{ verticalAlign: -1 }} /> {opponent.pabellon}{opponent.direccion ? ` — ${opponent.direccion}` : ''}</div>
              )}
              {(opponent.kit1 || opponent.kit2) && (
                <div style={{ marginTop: 4 }}>
                  {opponent.kit1 && <div>1ª equip.: {opponent.kit1}</div>}
                  {opponent.kit2 && <div>2ª equip.: {opponent.kit2}</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {opponent.id && (
          <>
            <hr className="divider" />
            <div className="row spread" style={{ marginBottom: 4 }}>
              <h4 style={{ fontSize: 13.5, color: 'var(--ink-700)', margin: 0 }}>Análisis de vídeo</h4>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleNuevoProyectoVideo}>
                <Plus size={13} />
                Nuevo proyecto
              </button>
            </div>
            {proyectosVideo.length === 0 ? (
              <p className="section-hint" style={{ marginTop: 0 }}>Sin vídeo etiquetado de este rival todavía.</p>
            ) : (
              <div className="stack" style={{ gap: 4, marginBottom: 4 }}>
                {proyectosVideo.map((p) => {
                  const n = getAnalisisEventos(p.id).length
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="match-row"
                      style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                      onClick={() => onGoToAnalisis?.(p.id)}
                    >
                      <Video size={14} color="var(--red-600)" />
                      <span style={{ flex: 1 }}>{p.nombre}</span>
                      <span className="text-muted">{n} evento{n === 1 ? '' : 's'}</span>
                      <ChevronRight size={14} color="var(--ink-300)" />
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        <hr className="divider" />
        <h4 style={{ fontSize: 13.5, color: 'var(--ink-700)' }}>Scouting</h4>

        <div className="field">
          <label className="field__label">Resumen / sistema de juego</label>
          <textarea value={scouting.sistemaJuego} onChange={(e) => setField('sistemaJuego', e.target.value)} placeholder="Ej. 4-0 con falso pívot, presión en Zona 2…" />
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label className="field__label">Puntos fuertes</label>
            <textarea value={scouting.puntosFuertes} onChange={(e) => setField('puntosFuertes', e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Puntos débiles</label>
            <textarea value={scouting.puntosDebiles} onChange={(e) => setField('puntosDebiles', e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label className="field__label">Jugadores clave</label>
          <textarea value={scouting.jugadoresClave} onChange={(e) => setField('jugadoresClave', e.target.value)} placeholder="Nombre / dorsal / rol / qué lo hace peligroso…" />
        </div>

        <div className="field">
          <label className="field__label">ABP (saques, córners, faltas…)</label>
          <textarea value={scouting.abp} onChange={(e) => setField('abp', e.target.value)} />
        </div>

        <div className="field">
          <label className="field__label">Notas libres</label>
          <textarea value={scouting.notasLibres} onChange={(e) => setField('notasLibres', e.target.value)} />
        </div>

        <div className="field">
          <label className="field__label">Pinceladas para la tarjeta semanal <span className="field__optional">(máx. 4, una por línea)</span></label>
          <textarea
            value={highlightsText}
            onChange={(e) => setHighlightsText(e.target.value)}
            placeholder={'Ej.\nPresión muy alta los primeros 5\'\nPívot nº7 gana casi todos los duelos aéreos\nFlojos en transición defensiva'}
          />
        </div>
      </div>
    </Modal>
  )
}
