import { useEffect, useRef, useState } from 'react'
import { Play, Trash2, SkipForward, Plus, X, Settings2, Repeat, Star, ListVideo, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import {
  getFile, getPlayers,
  getAnalisisEventos, addAnalisisEvento, updateAnalisisEvento, removeAnalisisEvento,
  getUltimoEventoFin, updateAnalisisProyecto, uid,
} from '../db.js'
import VideoDrawOverlay from './VideoDrawOverlay.jsx'

const PALETTE = ['var(--blue-600)', 'var(--success-600)', 'var(--danger-600)', 'var(--violet-600)', 'var(--warn-600)', 'var(--gold-600)', 'var(--orange-600)', 'var(--red-600)']

// "Pausa enfática": cuando un evento en presentación lleva nota, se puede
// categorizar para que se resalte con un color distinto en pantalla al
// llegar a ese clip — igual que en Fixo (momento clave / positivo / corrección).
const NOTA_TIPO_COLOR = { clave: 'var(--gold-600)', positivo: 'var(--success-600)', correccion: 'var(--danger-600)' }
const NOTA_TIPO_LABEL = { clave: 'Momento clave', positivo: 'Positivo', correccion: 'Corrección' }

function formatTime(seconds) {
  if (seconds == null || Number.isNaN(seconds)) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

// Pantalla de etiquetado: reproduce el vídeo del proyecto y, con la botonera
// configurable, marca eventos sobre la marcha (clic para empezar, clic de
// nuevo para cerrar) sin interrumpir la reproducción. La lista de eventos de
// abajo permite saltar a cada uno, añadir una nota o el jugador implicado, y
// borrarlo.
export default function AnalisisProjectPanel({ proyecto, onChanged, initialEventId }) {
  const videoRef = useRef(null)
  const [videoSrc, setVideoSrc] = useState(null)
  const [activeTag, setActiveTag] = useState(null) // { botonId, startTime }
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingBotonera, setEditingBotonera] = useState(false)
  const [newBotonLabel, setNewBotonLabel] = useState('')
  const [newBotonEspejo, setNewBotonEspejo] = useState('')
  const [filtroVista, setFiltroVista] = useState('todos') // 'todos' | 'principal' | 'espejo'
  const [presentando, setPresentando] = useState(false)
  const [clipIndex, setClipIndex] = useState(0)
  const players = getPlayers()

  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    setActiveTag(null)
    if (proyecto.videoSourceType === 'url') {
      setVideoSrc(proyecto.videoUrl || null)
      return
    }
    if (proyecto.videoFileId) {
      getFile(proyecto.videoFileId).then((record) => {
        if (cancelled || !record) return
        objectUrl = URL.createObjectURL(record.blob)
        setVideoSrc(objectUrl)
      })
    } else {
      setVideoSrc(null)
    }
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [proyecto.id, proyecto.videoSourceType, proyecto.videoFileId, proyecto.videoUrl])

  function bump() {
    setRefreshKey((k) => k + 1)
    onChanged?.()
  }

  function currentTime() {
    return videoRef.current?.currentTime ?? 0
  }

  // Cierra una marca en curso: crea su evento y, si el botón tiene definida
  // una etiqueta espejo, crea también el evento inverso con las mismas marcas
  // de tiempo (misma acción, leída desde el otro lado — p. ej. "presión
  // rival" a la vez que "salida de presión, nosotros") para no tener que
  // volver a ver el vídeo una segunda vez etiquetando lo contrario.
  function finalizeTag(tag, endTime) {
    addAnalisisEvento({ proyectoId: proyecto.id, botonId: tag.botonId, label: tag.label, startTime: tag.startTime, endTime })
    if (tag.espejoLabel) {
      addAnalisisEvento({ proyectoId: proyecto.id, botonId: tag.botonId, label: tag.espejoLabel, startTime: tag.startTime, endTime, perspectiva: 'espejo' })
    }
    bump()
  }

  function handleBotonClick(boton) {
    const t = currentTime()
    if (activeTag?.botonId === boton.id) {
      finalizeTag(activeTag, t)
      setActiveTag(null)
      return
    }
    if (activeTag) finalizeTag(activeTag, t)
    setActiveTag({ botonId: boton.id, label: boton.label, espejoLabel: boton.espejoLabel, startTime: t })
  }

  function handleSeek(time) {
    if (!videoRef.current) return
    videoRef.current.currentTime = time
    videoRef.current.play()
  }

  // Al entrar desde la Videoteca con un clip concreto elegido, salta a él en
  // cuanto el vídeo esté listo para aceptar un currentTime (si aún no lo
  // está, currentTime se ignora en silencio).
  useEffect(() => {
    if (!initialEventId || !videoSrc || !videoRef.current) return
    const ev = getAnalisisEventos(proyecto.id).find((e) => e.id === initialEventId)
    if (!ev) return
    const v = videoRef.current
    if (v.readyState >= 1) {
      handleSeek(ev.startTime)
    } else {
      const onReady = () => handleSeek(ev.startTime)
      v.addEventListener('loadedmetadata', onReady, { once: true })
      // eslint-disable-next-line consistent-return
      return () => v.removeEventListener('loadedmetadata', onReady)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEventId, videoSrc])

  function handleContinuar() {
    const t = getUltimoEventoFin(proyecto.id)
    if (t != null) handleSeek(t)
  }

  function handleAddBoton() {
    const label = newBotonLabel.trim()
    if (!label) return
    const color = PALETTE[proyecto.botones.length % PALETTE.length]
    updateAnalisisProyecto(proyecto.id, { botones: [...proyecto.botones, { id: uid(), label, color, espejoLabel: newBotonEspejo.trim() }] })
    setNewBotonLabel('')
    setNewBotonEspejo('')
    bump()
  }

  function handleRemoveBoton(botonId) {
    updateAnalisisProyecto(proyecto.id, { botones: proyecto.botones.filter((b) => b.id !== botonId) })
    bump()
  }

  function handleEspejoChange(botonId, espejoLabel) {
    updateAnalisisProyecto(proyecto.id, { botones: proyecto.botones.map((b) => (b.id === botonId ? { ...b, espejoLabel } : b)) })
    bump()
  }

  function toggleEnPresentacion(evento) {
    updateAnalisisEvento(evento.id, { enPresentacion: !evento.enPresentacion })
    bump()
  }

  function startPresentacion() {
    if (clipsPresentacion.length === 0) return
    setClipIndex(0)
    setPresentando(true)
  }

  function exitPresentacion() {
    setPresentando(false)
    videoRef.current?.pause()
  }

  // Mientras se presenta, cada clip se reproduce de startTime a endTime y se
  // pausa solo ahí — no hace falta ir buscando manualmente cada corte cuando
  // enseñas la sesión de vídeo al equipo.
  useEffect(() => {
    if (!presentando || !videoRef.current) return
    const clip = clipsPresentacion[clipIndex]
    if (!clip) {
      setPresentando(false)
      return
    }
    const v = videoRef.current
    v.currentTime = clip.startTime
    v.play()
    function onTimeUpdate() {
      if (v.currentTime >= clip.endTime) v.pause()
    }
    v.addEventListener('timeupdate', onTimeUpdate)
    return () => v.removeEventListener('timeupdate', onTimeUpdate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presentando, clipIndex, refreshKey])

  const eventos = getAnalisisEventos(proyecto.id)
    .filter((e) => filtroVista === 'todos' || (filtroVista === 'espejo' ? e.perspectiva === 'espejo' : e.perspectiva !== 'espejo'))
    .sort((a, b) => a.startTime - b.startTime)
  const clipsPresentacion = getAnalisisEventos(proyecto.id).filter((e) => e.enPresentacion).sort((a, b) => a.startTime - b.startTime)
  const ultimoFin = getUltimoEventoFin(proyecto.id)

  return (
    <div className="stack">
      {videoSrc ? (
        <div style={{ position: 'relative' }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} src={videoSrc} controls style={{ width: '100%', borderRadius: 'var(--radius-md)', background: '#000', maxHeight: 480, display: 'block' }} />
          <VideoDrawOverlay videoRef={videoRef} />
        </div>
      ) : (
        <div className="banner banner-warn">Este proyecto todavía no tiene vídeo cargado — edítalo para añadir uno.</div>
      )}

      {presentando && clipsPresentacion[clipIndex] && (
        <div className="card hero-card" style={{ padding: '12px 16px' }}>
          <div className="row spread" style={{ flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div className="hero-card__label">Clip {clipIndex + 1} de {clipsPresentacion.length}</div>
              <div className="hero-card__value" style={{ fontSize: 18 }}>{clipsPresentacion[clipIndex].label}</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setClipIndex((i) => Math.max(i - 1, 0))} disabled={clipIndex === 0}>
                <ChevronLeft size={13} />
                Anterior
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setClipIndex((i) => Math.min(i + 1, clipsPresentacion.length - 1))} disabled={clipIndex === clipsPresentacion.length - 1}>
                Siguiente
                <ChevronRight size={13} />
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={exitPresentacion}>
                <LogOut size={13} />
                Salir
              </button>
            </div>
          </div>
          {clipsPresentacion[clipIndex].nota && (
            <div
              className="banner"
              style={{
                marginTop: 10,
                background: NOTA_TIPO_COLOR[clipsPresentacion[clipIndex].notaTipo] || 'var(--ink-700)',
                color: '#fff',
                fontWeight: 600,
              }}
            >
              {NOTA_TIPO_LABEL[clipsPresentacion[clipIndex].notaTipo] && <strong>{NOTA_TIPO_LABEL[clipsPresentacion[clipIndex].notaTipo]}: </strong>}
              {clipsPresentacion[clipIndex].nota}
            </div>
          )}
        </div>
      )}

      <div className="row spread" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {proyecto.botones.map((boton) => (
            <button
              key={boton.id}
              type="button"
              className="btn btn-sm"
              style={{
                borderColor: boton.color,
                color: activeTag?.botonId === boton.id ? '#fff' : boton.color,
                background: activeTag?.botonId === boton.id ? boton.color : 'transparent',
              }}
              onClick={() => handleBotonClick(boton)}
              disabled={!videoSrc}
            >
              {activeTag?.botonId === boton.id ? `● ${boton.label} (marcando…)` : boton.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 8 }}>
          {!presentando && clipsPresentacion.length > 0 && (
            <button type="button" className="btn btn-primary btn-sm" onClick={startPresentacion}>
              <ListVideo size={13} />
              Presentación ({clipsPresentacion.length})
            </button>
          )}
          {ultimoFin != null && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleContinuar}>
              <SkipForward size={13} />
              Continuar desde {formatTime(ultimoFin)}
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingBotonera((v) => !v)}>
            <Settings2 size={13} />
            Botonera
          </button>
        </div>
      </div>

      {editingBotonera && (
        <div className="card" style={{ padding: 12 }}>
          <p className="section-hint" style={{ marginTop: 0 }}>
            La "etiqueta espejo" es opcional: si la rellenas, cada vez que marques ese evento se anota también, con las
            mismas marcas de tiempo, su lectura inversa (p. ej. "presión rival" → espejo "salida de presión, nosotros")
            — para no tener que ver el vídeo dos veces.
          </p>
          <div className="stack" style={{ gap: 6, marginBottom: 10 }}>
            {proyecto.botones.map((boton) => (
              <div key={boton.id} className="row" style={{ gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: boton.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, minWidth: 140 }}>{boton.label}</span>
                <Repeat size={12} color="var(--ink-300)" />
                <input
                  type="text"
                  defaultValue={boton.espejoLabel || ''}
                  onBlur={(e) => handleEspejoChange(boton.id, e.target.value.trim())}
                  placeholder="Etiqueta espejo (opcional)…"
                  style={{ flex: 1, fontSize: 12.5, padding: '4px 6px' }}
                />
                <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => handleRemoveBoton(boton.id)}>
                  <X size={13} color="var(--danger-600)" />
                </button>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <input
              type="text"
              value={newBotonLabel}
              onChange={(e) => setNewBotonLabel(e.target.value)}
              placeholder="Nuevo botón de evento…"
              style={{ maxWidth: 200 }}
            />
            <input
              type="text"
              value={newBotonEspejo}
              onChange={(e) => setNewBotonEspejo(e.target.value)}
              placeholder="Etiqueta espejo (opcional)…"
              style={{ maxWidth: 200 }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBoton()}
            />
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddBoton}>
              <Plus size={13} />
              Añadir
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row spread" style={{ marginBottom: 8 }}>
          <h4 style={{ margin: 0, fontSize: 14 }}>Eventos marcados ({eventos.length})</h4>
          <div className="chip-group">
            <button type="button" className={`chip${filtroVista === 'todos' ? ' is-active' : ''}`} onClick={() => setFiltroVista('todos')}>Todos</button>
            <button type="button" className={`chip${filtroVista === 'principal' ? ' is-active' : ''}`} onClick={() => setFiltroVista('principal')}>Principal</button>
            <button type="button" className={`chip${filtroVista === 'espejo' ? ' is-active' : ''}`} onClick={() => setFiltroVista('espejo')}>Espejo</button>
          </div>
        </div>
        {eventos.length === 0 ? (
          <p className="section-hint">Todavía no has marcado ningún evento — reproduce el vídeo y usa la botonera de arriba.</p>
        ) : (
          <div className="stack" style={{ gap: 6 }}>
            {eventos.map((ev) => (
              <EventoRow key={ev.id} evento={ev} players={players} onSeek={handleSeek} onChanged={bump} onToggleEnPresentacion={() => toggleEnPresentacion(ev)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EventoRow({ evento, players, onSeek, onChanged, onToggleEnPresentacion }) {
  const [nota, setNota] = useState(evento.nota || '')

  function handleSaveNota() {
    if (nota !== (evento.nota || '')) {
      updateAnalisisEvento(evento.id, { nota })
      onChanged()
    }
  }

  function handleNotaTipo(tipo) {
    updateAnalisisEvento(evento.id, { notaTipo: evento.notaTipo === tipo ? null : tipo })
    onChanged()
  }

  function handleJugador(e) {
    updateAnalisisEvento(evento.id, { jugadorId: e.target.value || null })
    onChanged()
  }

  return (
    <div className="row" style={{ gap: 8, alignItems: 'flex-start', padding: '6px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => onSeek(evento.startTime)} title="Saltar aquí">
        <Play size={13} />
      </button>
      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onToggleEnPresentacion} title="Añadir a presentación">
        <Star size={13} color={evento.enPresentacion ? 'var(--gold-600)' : 'var(--gray-300)'} fill={evento.enPresentacion ? 'var(--gold-600)' : 'none'} />
      </button>
      <span className="text-muted" style={{ fontSize: 12.5, minWidth: 92 }}>
        {formatTime(evento.startTime)} – {formatTime(evento.endTime)}
      </span>
      {evento.perspectiva === 'espejo' && <Repeat size={12} color="var(--violet-600)" title="Etiqueta espejo" />}
      <strong style={{ fontSize: 13, minWidth: 140 }}>{evento.label}</strong>
      <select value={evento.jugadorId || ''} onChange={handleJugador} style={{ fontSize: 12.5, padding: '4px 6px', maxWidth: 150 }}>
        <option value="">Jugador…</option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>{p.dorsal ? `#${p.dorsal} ` : ''}{p.nombre}</option>
        ))}
      </select>
      <input
        type="text"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        onBlur={handleSaveNota}
        placeholder="Nota…"
        style={{ flex: 1, fontSize: 12.5, padding: '4px 6px' }}
      />
      {nota && (
        <div className="row" style={{ gap: 3 }} title="Tipo de pausa enfática en la presentación">
          {Object.entries(NOTA_TIPO_LABEL).map(([tipo, label]) => (
            <button
              key={tipo}
              type="button"
              onClick={() => handleNotaTipo(tipo)}
              title={label}
              style={{
                width: 14, height: 14, borderRadius: '50%', padding: 0, cursor: 'pointer',
                background: evento.notaTipo === tipo ? NOTA_TIPO_COLOR[tipo] : 'transparent',
                border: `2px solid ${NOTA_TIPO_COLOR[tipo]}`,
              }}
            />
          ))}
        </div>
      )}
      <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => { removeAnalisisEvento(evento.id); onChanged() }} title="Eliminar">
        <Trash2 size={13} color="var(--danger-600)" />
      </button>
    </div>
  )
}
