import { useEffect, useRef, useState } from 'react'
import { FolderKanban, Folder, FolderPlus, Plus, ArrowLeft, ChevronLeft, ChevronRight, Trash2, Pencil, PlaySquare } from 'lucide-react'
import { getPlaybookCarpetas, addPlaybookCarpeta, removePlaybookCarpeta, getPlaybookJugadas, getFile } from '../db.js'
import PageHeader from './PageHeader.jsx'
import PlaybookJugadaModal from './PlaybookJugadaModal.jsx'
import VideoDrawOverlay from './VideoDrawOverlay.jsx'

// Biblioteca de jugadas organizadas en carpetas (ABP, bandas, posicional…),
// cada una reproducible con la misma pizarra en directo que Análisis de
// vídeo — para explicar una jugada ensayada tal cual está en el playbook,
// sin tener que ir a buscar el vídeo suelto cada vez.
export default function PlaybookView() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [carpetaId, setCarpetaId] = useState(undefined) // undefined = todas, null = sin carpeta, id = esa carpeta
  const [nuevaCarpeta, setNuevaCarpeta] = useState('')
  const [editing, setEditing] = useState(null)
  const [jugadaAbiertaId, setJugadaAbiertaId] = useState(null)
  const videoRef = useRef(null)
  const [videoSrc, setVideoSrc] = useState(null)

  const carpetas = getPlaybookCarpetas()
  const jugadasVisibles = getPlaybookJugadas().filter((j) => carpetaId === undefined || j.carpetaId === carpetaId)
  const jugadaAbierta = jugadaAbiertaId ? getPlaybookJugadas().find((j) => j.id === jugadaAbiertaId) : null
  const idx = jugadaAbierta ? jugadasVisibles.findIndex((j) => j.id === jugadaAbierta.id) : -1

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  function handleAddCarpeta() {
    const nombre = nuevaCarpeta.trim()
    if (!nombre) return
    addPlaybookCarpeta(nombre)
    setNuevaCarpeta('')
    bump()
  }

  function handleRemoveCarpeta(id) {
    removePlaybookCarpeta(id)
    if (carpetaId === id) setCarpetaId(undefined)
    bump()
  }

  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    if (!jugadaAbierta) {
      setVideoSrc(null)
      return
    }
    if (jugadaAbierta.videoSourceType === 'url') {
      setVideoSrc(jugadaAbierta.videoUrl || null)
      return
    }
    if (jugadaAbierta.videoFileId) {
      getFile(jugadaAbierta.videoFileId).then((record) => {
        if (cancelled || !record) return
        objectUrl = URL.createObjectURL(record.blob)
        setVideoSrc(objectUrl)
      })
    }
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jugadaAbiertaId])

  if (jugadaAbierta) {
    return (
      <div>
        <div className="row spread" style={{ marginBottom: 12 }}>
          <button type="button" className="link-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setJugadaAbiertaId(null)}>
            <ArrowLeft size={14} />
            Volver al playbook
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(jugadaAbierta)}>
            <Pencil size={13} />
            Editar
          </button>
        </div>
        <PageHeader icon={PlaySquare} title={jugadaAbierta.nombre} hint={`Jugada ${idx + 1} de ${jugadasVisibles.length}`} />

        {videoSrc ? (
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} src={videoSrc} controls autoPlay style={{ width: '100%', borderRadius: 'var(--radius-md)', background: '#000', maxHeight: 520, display: 'block' }} />
            <VideoDrawOverlay videoRef={videoRef} />
          </div>
        ) : (
          <div className="banner banner-warn">Esta jugada todavía no tiene vídeo cargado.</div>
        )}

        <div className="row spread" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setJugadaAbiertaId(jugadasVisibles[idx - 1]?.id)}
            disabled={idx <= 0}
          >
            <ChevronLeft size={13} />
            Jugada anterior
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setJugadaAbiertaId(jugadasVisibles[idx + 1]?.id)}
            disabled={idx === -1 || idx >= jugadasVisibles.length - 1}
          >
            Siguiente jugada
            <ChevronRight size={13} />
          </button>
        </div>

        {editing && (
          <PlaybookJugadaModal
            jugada={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); bump() }}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader icon={FolderKanban} title="Playbook" hint="Jugadas ensayadas organizadas por carpetas — ABP, bandas, posicional…">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={15} />
          Nueva jugada
        </button>
      </PageHeader>

      <div className="row" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <button type="button" className={`chip${carpetaId === undefined ? ' is-active' : ''}`} onClick={() => setCarpetaId(undefined)}>
          Todas
        </button>
        <button type="button" className={`chip${carpetaId === null ? ' is-active' : ''}`} onClick={() => setCarpetaId(null)}>
          Sin carpeta
        </button>
        {carpetas.map((c) => (
          <span key={c.id} className={`chip${carpetaId === c.id ? ' is-active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, paddingRight: 6, cursor: 'pointer' }} onClick={() => setCarpetaId(c.id)}>
            <Folder size={12} />
            {c.nombre}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleRemoveCarpeta(c.id) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', opacity: 0.6 }}
              title="Eliminar carpeta (las jugadas pasan a 'Sin carpeta')"
            >
              <Trash2 size={11} />
            </button>
          </span>
        ))}
        <div className="row" style={{ gap: 4 }}>
          <input
            type="text"
            value={nuevaCarpeta}
            onChange={(e) => setNuevaCarpeta(e.target.value)}
            placeholder="Nueva carpeta…"
            style={{ fontSize: 12.5, padding: '5px 8px', maxWidth: 150 }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCarpeta()}
          />
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={handleAddCarpeta} disabled={!nuevaCarpeta.trim()}>
            <FolderPlus size={14} />
          </button>
        </div>
      </div>

      {jugadasVisibles.length === 0 ? (
        <div className="banner banner-info">Sin jugadas todavía en esta carpeta — crea una con "Nueva jugada".</div>
      ) : (
        <div className="tile-grid">
          {jugadasVisibles.map((j) => {
            const carpeta = carpetas.find((c) => c.id === j.carpetaId)
            return (
              <div key={j.id} className="tile-card" onClick={() => setJugadaAbiertaId(j.id)}>
                <div className="tile-card__top">
                  <div className="icon-chip" style={{ '--chip-color': 'var(--violet-600)' }}>
                    <PlaySquare size={16} />
                  </div>
                  <div>
                    <div className="tile-card__name">{j.nombre}</div>
                    <div className="tile-card__meta">{carpeta ? carpeta.nombre : 'Sin carpeta'}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <PlaybookJugadaModal
          jugada={editing}
          carpetaIdPorDefecto={carpetaId || undefined}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); bump() }}
        />
      )}
    </div>
  )
}
