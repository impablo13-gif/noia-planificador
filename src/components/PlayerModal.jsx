import { useState } from 'react'
import { Save, Trash2 } from 'lucide-react'
import Modal from './Modal.jsx'
import FileDrop from './FileDrop.jsx'
import PlayerPhotoField from './PlayerPhotoField.jsx'
import PlayerStatsPanel from './PlayerStatsPanel.jsx'
import PlayerLoadPanel from './PlayerLoadPanel.jsx'
import PlayerConceptosPanel from './PlayerConceptosPanel.jsx'
import RadarChart from './RadarChart.jsx'
import { addPlayer, updatePlayer, removePlayer, PUESTOS, LATERALIDADES, CUALIDADES_EJES } from '../db.js'

const TABS = [
  { id: 'datos', label: 'Datos' },
  { id: 'cualidades', label: 'Cualidades' },
  { id: 'estadisticas', label: 'Estadísticas' },
  { id: 'carga', label: 'Carga y bienestar' },
  { id: 'conceptos', label: 'Conceptos' },
  { id: 'club', label: 'Ficha de club' },
]

export default function PlayerModal({ player, onClose, onSaved }) {
  const [tab, setTab] = useState('datos')
  const [nombre, setNombre] = useState(player.nombre || '')
  const [dorsal, setDorsal] = useState(player.dorsal ?? '')
  const [posicion, setPosicion] = useState(player.posicion || PUESTOS[0])
  const [equipo, setEquipo] = useState(player.equipo || '')
  const [lateralidad, setLateralidad] = useState(player.lateralidad || '')
  const [clubProcedencia, setClubProcedencia] = useState(player.clubProcedencia || '')
  const [fechaNacimiento, setFechaNacimiento] = useState(player.fechaNacimiento || '')
  const [fotoFileId, setFotoFileId] = useState(player.fotoFileId || null)
  const [notas, setNotas] = useState(player.notas || '')
  const [stats, setStats] = useState({ partidos: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0, minutos: 0, cargaFisica: 0, ...player.stats })
  const [tutorNombre, setTutorNombre] = useState(player.tutorNombre || '')
  const [tutorTelefono, setTutorTelefono] = useState(player.tutorTelefono || '')
  const [tutorEmail, setTutorEmail] = useState(player.tutorEmail || '')
  const [talla, setTalla] = useState(player.talla || '')
  const [fichaFederativaFileId, setFichaFederativaFileId] = useState(player.fichaFederativaFileId || null)
  const [cualidades, setCualidades] = useState(() => {
    const base = {}
    CUALIDADES_EJES.forEach((e) => { base[e.key] = 0 })
    return { ...base, ...player.cualidades }
  })

  function setCualidad(key, value) {
    setCualidades((c) => ({ ...c, [key]: value }))
  }

  function handleSave() {
    if (!nombre.trim()) return
    const patch = {
      nombre: nombre.trim(), dorsal, posicion, equipo: equipo.trim(), lateralidad, clubProcedencia: clubProcedencia.trim(), fechaNacimiento, fotoFileId, notas, stats,
      tutorNombre: tutorNombre.trim(), tutorTelefono: tutorTelefono.trim(), tutorEmail: tutorEmail.trim(), talla: talla.trim(), fichaFederativaFileId,
      cualidades,
    }
    if (player.id) {
      updatePlayer(player.id, patch)
    } else {
      addPlayer(patch)
    }
    onSaved()
  }

  function handleDelete() {
    if (player.id) removePlayer(player.id)
    onSaved()
  }

  return (
    <Modal
      title={player.id ? nombre || 'Editar jugador' : 'Nuevo jugador'}
      onClose={onClose}
      maxWidth={620}
      footer={
        <>
          {player.id && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={14} />
              Eliminar
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={!nombre.trim()}>
            <Save size={14} />
            Guardar
          </button>
        </>
      }
    >
      {player.id && (
        <div className="chip-group" style={{ marginBottom: 18 }}>
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`chip${tab === t.id ? ' is-active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {(!player.id || tab === 'datos') && (
        <div className="stack">
          <div className="field">
            <label className="field__label">Foto</label>
            <PlayerPhotoField fileId={fotoFileId} onChange={setFotoFileId} />
          </div>

          <div className="grid cols-2">
            <div className="field">
              <label className="field__label">Nombre</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellidos" />
            </div>
            <div className="field">
              <label className="field__label">Dorsal</label>
              <input type="number" value={dorsal} onChange={(e) => setDorsal(e.target.value)} />
            </div>
          </div>

          <div className="grid cols-2">
            <div className="field">
              <label className="field__label">Posición</label>
              <select value={posicion} onChange={(e) => setPosicion(e.target.value)}>
                {PUESTOS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label">Fecha de nacimiento</label>
              <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
            </div>
          </div>

          <div className="grid cols-2">
            <div className="field">
              <label className="field__label">Equipo <span className="field__optional">(opcional)</span></label>
              <input type="text" value={equipo} onChange={(e) => setEquipo(e.target.value)} placeholder="Ej. Juvenil División de Honor" />
            </div>
            <div className="field">
              <label className="field__label">Club de procedencia <span className="field__optional">(opcional)</span></label>
              <input type="text" value={clubProcedencia} onChange={(e) => setClubProcedencia(e.target.value)} placeholder="Ej. O Parrulo FS" />
            </div>
          </div>

          <div className="field">
            <label className="field__label">Lateralidad <span className="field__optional">(opcional)</span></label>
            <div className="chip-group">
              {LATERALIDADES.map((l) => (
                <button key={l} type="button" className={`chip${lateralidad === l ? ' is-active' : ''}`} onClick={() => setLateralidad(lateralidad === l ? '' : l)}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field__label">Notas</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones sobre el jugador…" />
          </div>
        </div>
      )}

      {player.id && tab === 'cualidades' && (
        <div className="stack">
          <p className="section-hint" style={{ marginTop: 0 }}>Los 5 ejes del modelo de desarrollo del club — sirve para el radar de la ficha y el resumen de equipo en el dashboard de Plantilla.</p>
          <div className="row" style={{ justifyContent: 'center', marginBottom: 8 }}>
            <RadarChart axes={CUALIDADES_EJES} values={cualidades} />
          </div>
          <div className="stack" style={{ gap: 14 }}>
            {CUALIDADES_EJES.map((e) => (
              <div key={e.key} className="field" style={{ marginBottom: 0 }}>
                <label className="field__label">{e.label} <span className="field__optional">({cualidades[e.key] || 0}/10)</span></label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={cualidades[e.key] || 0}
                  onChange={(ev) => setCualidad(e.key, Number(ev.target.value))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {player.id && tab === 'estadisticas' && <PlayerStatsPanel nombre={nombre} />}

      {player.id && tab === 'carga' && (
        <PlayerLoadPanel
          playerId={player.id}
          cargaFisica={stats.cargaFisica}
          onChange={(v) => setStats((s) => ({ ...s, cargaFisica: v }))}
        />
      )}

      {player.id && tab === 'conceptos' && <PlayerConceptosPanel playerId={player.id} />}

      {player.id && tab === 'club' && (
        <div className="stack">
          <p className="section-hint" style={{ marginTop: 0 }}>Datos de contacto y documentación pensados para menores de edad — no salen en ningún informe compartido con otros equipos.</p>

          <h4 style={{ fontSize: 13.5, color: 'var(--ink-700)' }}>Tutor / madre o padre</h4>
          <div className="grid cols-2">
            <div className="field">
              <label className="field__label">Nombre <span className="field__optional">(opcional)</span></label>
              <input type="text" value={tutorNombre} onChange={(e) => setTutorNombre(e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label">Teléfono <span className="field__optional">(opcional)</span></label>
              <input type="tel" value={tutorTelefono} onChange={(e) => setTutorTelefono(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="field__label">Email <span className="field__optional">(opcional)</span></label>
            <input type="email" value={tutorEmail} onChange={(e) => setTutorEmail(e.target.value)} />
          </div>

          <hr className="divider" />
          <h4 style={{ fontSize: 13.5, color: 'var(--ink-700)' }}>Ficha federativa</h4>
          <div className="field">
            <label className="field__label">Talla de equipación <span className="field__optional">(opcional)</span></label>
            <input type="text" value={talla} onChange={(e) => setTalla(e.target.value)} placeholder="Ej. M, 14 años…" style={{ maxWidth: 160 }} />
          </div>
          <div className="field">
            <label className="field__label">Documento (licencia, ficha RFEF…)</label>
            <FileDrop fileId={fichaFederativaFileId} onChange={setFichaFederativaFileId} accept=".pdf,image/*" label="Subir documento" />
          </div>
        </div>
      )}
    </Modal>
  )
}
