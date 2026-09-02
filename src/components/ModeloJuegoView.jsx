import { useState } from 'react'
import { Compass, Plus, Trash2, ExternalLink, Link2 } from 'lucide-react'
import { getModeloJuego, updateModeloJuego, addModeloJuegoVideo, removeModeloJuegoVideo } from '../db.js'
import PageHeader from './PageHeader.jsx'

const SECCIONES = [
  { key: 'identidad', label: 'Identidad', placeholder: 'Cómo queremos que juegue el equipo, en una idea — el porqué de todo lo demás…' },
  { key: 'conceptos', label: 'Conceptos de juego', placeholder: 'Los principios que trabajamos siempre, con y sin balón…' },
  { key: 'sistemaOfensivo', label: 'Sistema ofensivo', placeholder: 'Sistema predominante, zonas de elaboración/finalización, variantes…' },
  { key: 'sistemaDefensivo', label: 'Sistema defensivo', placeholder: 'Tipo de defensa, presión, repliegue, ayudas…' },
  { key: 'situacionesEspeciales', label: 'Situaciones especiales (ABP)', placeholder: 'Saques de banda, córners, faltas, power-play, portero-jugador…' },
  { key: 'bibliografia', label: 'Bibliografía y referencias', placeholder: 'Cursos, clínics, libros o entrenadores en los que se apoya este modelo…' },
]

// Documento de identidad táctica del equipo, aparte del scouting de cada
// rival (eso vive en Rivales) — pensado para ser algo estable que se revisa
// y afina a lo largo de la temporada, no para cada partido. Cada sección
// puede llevar vídeos de referencia (propios o de YouTube) enlazados.
export default function ModeloJuegoView() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [seccionFiltro, setSeccionFiltro] = useState(SECCIONES[0].key)
  const [nuevoTitulo, setNuevoTitulo] = useState('')
  const [nuevoUrl, setNuevoUrl] = useState('')
  const modelo = getModeloJuego()

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  function handleAddVideo() {
    const titulo = nuevoTitulo.trim()
    const url = nuevoUrl.trim()
    if (!titulo || !url) return
    addModeloJuegoVideo({ seccion: seccionFiltro, titulo, url })
    setNuevoTitulo('')
    setNuevoUrl('')
    bump()
  }

  function handleRemoveVideo(id) {
    removeModeloJuegoVideo(id)
    bump()
  }

  const videosSeccion = modelo.videos.filter((v) => v.seccion === seccionFiltro)

  return (
    <div>
      <PageHeader icon={Compass} title="Modelo de juego" hint="La identidad táctica del equipo — se revisa y afina durante la temporada, no partido a partido" />

      <div className="grid cols-2">
        {SECCIONES.map((s) => (
          <div key={s.key} className="field">
            <label className="field__label">{s.label}</label>
            <textarea
              defaultValue={modelo[s.key]}
              onBlur={(e) => updateModeloJuego({ [s.key]: e.target.value })}
              placeholder={s.placeholder}
              style={{ minHeight: 110 }}
            />
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row" style={{ gap: 9, marginBottom: 4 }}>
          <div className="icon-chip" style={{ '--chip-color': 'var(--blue-600)' }}><Link2 size={15} /></div>
          <h4 style={{ margin: 0, fontSize: 14 }}>Vídeos de referencia</h4>
        </div>
        <p className="section-hint" style={{ marginTop: 4, marginBottom: 10 }}>
          Ejemplos (propios o de YouTube) que ilustran cada apartado del modelo — para mostrarlos junto a la idea, no solo explicarla.
        </p>

        <div className="chip-group" style={{ marginBottom: 10 }}>
          {SECCIONES.map((s) => (
            <button key={s.key} type="button" className={`chip${seccionFiltro === s.key ? ' is-active' : ''}`} onClick={() => setSeccionFiltro(s.key)}>
              {s.label}
            </button>
          ))}
        </div>

        {videosSeccion.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 12.5, marginBottom: 10 }}>Sin vídeos todavía en "{SECCIONES.find((s) => s.key === seccionFiltro)?.label}".</p>
        ) : (
          <div className="stack" style={{ gap: 4, marginBottom: 10 }}>
            {videosSeccion.map((v) => (
              <div key={v.id} className="row" style={{ gap: 8, padding: '4px 0' }}>
                <a href={v.url} target="_blank" rel="noreferrer" className="row" style={{ gap: 6, flex: 1, textDecoration: 'none' }}>
                  <ExternalLink size={13} color="var(--blue-600)" />
                  {v.titulo}
                </a>
                <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => handleRemoveVideo(v.id)}>
                  <Trash2 size={13} color="var(--danger-600)" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ gap: 6 }}>
          <input type="text" value={nuevoTitulo} onChange={(e) => setNuevoTitulo(e.target.value)} placeholder="Título del vídeo…" style={{ maxWidth: 220 }} />
          <input type="text" value={nuevoUrl} onChange={(e) => setNuevoUrl(e.target.value)} placeholder="https://…" style={{ flex: 1 }} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddVideo} disabled={!nuevoTitulo.trim() || !nuevoUrl.trim()}>
            <Plus size={13} />
            Añadir
          </button>
        </div>
      </div>
    </div>
  )
}
