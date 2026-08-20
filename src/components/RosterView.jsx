import { useState } from 'react'
import { UserPlus, Users, FileJson, Bandage, ClipboardPaste } from 'lucide-react'
import { getPlayers, savePlayers, uid, PUESTOS, getInjuries, getPartidosNpa } from '../db.js'
import { isNpaExport, syncNpaExport } from '../npaSync.js'
import { computePlayerStats } from '../statsEngine.js'
import { latestBienestarByPlayer as getLatestBienestarByPlayer } from '../bienestarStats.js'
import PlayerAvatar from './PlayerAvatar.jsx'
import PlayerModal from './PlayerModal.jsx'
import RosterDashboard from './RosterDashboard.jsx'
import WellnessBadge from './WellnessBadge.jsx'
import PasteBienestarModal from './PasteBienestarModal.jsx'

function foldAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function normalizeImportedPlayer(raw) {
  const nombre = (raw.nombre || raw.name || '').toString().trim()
  if (!nombre) return null
  const posicionRaw = (raw.posicion || raw.position || '').toString()
  const posicion = PUESTOS.find((p) => foldAccents(p) === foldAccents(posicionRaw)) || PUESTOS[0]
  const s = raw.stats || {}
  return {
    id: uid(),
    nombre,
    dorsal: raw.dorsal ?? raw.numero ?? '',
    posicion,
    equipo: raw.equipo || '',
    fechaNacimiento: raw.fechaNacimiento || raw.fecha_nacimiento || '',
    fotoFileId: null,
    notas: raw.notas || '',
    stats: {
      partidos: Number(s.partidos) || 0,
      goles: Number(s.goles) || 0,
      asistencias: Number(s.asistencias) || 0,
      amarillas: Number(s.amarillas) || 0,
      rojas: Number(s.rojas) || 0,
      minutos: Number(s.minutos) || 0,
      cargaFisica: Number(s.cargaFisica) || 0,
    },
  }
}

export default function RosterView() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [editing, setEditing] = useState(null)
  const [importMsg, setImportMsg] = useState('')
  const [pastingBienestar, setPastingBienestar] = useState(false)
  const [equipoFilter, setEquipoFilter] = useState(null)
  const players = getPlayers()
  const equipos = [...new Set(players.map((p) => p.equipo).filter(Boolean))]
  const defaultEquipo = equipos.find((eq) => /juvenil/i.test(eq)) || equipos[0] || null
  const activeEquipo = equipoFilter && equipos.includes(equipoFilter) ? equipoFilter : defaultEquipo
  const visiblePlayers = activeEquipo ? players.filter((p) => p.equipo === activeEquipo) : players

  const injuryByPlayer = {}
  getInjuries().forEach((i) => {
    if (i.estado === 'De alta') return
    const current = injuryByPlayer[i.playerId]
    if (!current || (i.estado === 'Activa' && current.estado !== 'Activa')) injuryByPlayer[i.playerId] = i
  })

  const npaMatches = getPartidosNpa()
  const latestBienestarByPlayer = getLatestBienestarByPlayer()

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  function newDraft() {
    return { stats: { partidos: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0, minutos: 0, cargaFisica: 0 } }
  }

  function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result)

        if (isNpaExport(data)) {
          setImportMsg('Sincronizando jugadores, fotos y partidos…')
          const r = await syncNpaExport(data)
          setImportMsg(`NPA Stats: ${r.playersAdded} jugador${r.playersAdded === 1 ? '' : 'es'} nuevo${r.playersAdded === 1 ? '' : 's'}, ${r.playersUpdated} actualizado${r.playersUpdated === 1 ? '' : 's'} · ${r.matchesAdded} partido${r.matchesAdded === 1 ? '' : 's'} nuevo${r.matchesAdded === 1 ? '' : 's'}, ${r.matchesUpdated} actualizado${r.matchesUpdated === 1 ? '' : 's'} · calendario: ${r.calendarMatchesLinked} enlazado${r.calendarMatchesLinked === 1 ? '' : 's'}, ${r.calendarMatchesCreated} creado${r.calendarMatchesCreated === 1 ? '' : 's'}${r.reportsSynced ? ` · ${r.reportsSynced} informe${r.reportsSynced === 1 ? '' : 's'} de partido recogido${r.reportsSynced === 1 ? '' : 's'}` : ''}.`)
        } else if (Array.isArray(data)) {
          const normalized = data.map(normalizeImportedPlayer)
          const imported = normalized.filter(Boolean)
          const skipped = normalized.length - imported.length
          savePlayers([...getPlayers(), ...imported])
          setImportMsg(`Importados ${imported.length} jugador${imported.length === 1 ? '' : 'es'}${skipped ? ` · ${skipped} omitido${skipped === 1 ? '' : 's'} (sin nombre)` : ''}.`)
        } else {
          throw new Error('formato de JSON no reconocido')
        }
        bump()
      } catch (err) {
        setImportMsg(`No se pudo importar: ${err.message}.`)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div>
      <div className="row spread" style={{ marginBottom: 16 }}>
        <div>
          <h2 className="section-title">Plantilla</h2>
          <p className="section-hint">Temporada 26/27 · {players.length} jugador{players.length === 1 ? '' : 'es'}</p>
        </div>
        <div className="row">
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <FileJson size={15} />
            Importar JSON
            <input type="file" accept="application/json,.json" onChange={handleImportFile} style={{ display: 'none' }} />
          </label>
          <button type="button" className="btn btn-secondary" onClick={() => setPastingBienestar(true)}>
            <ClipboardPaste size={15} />
            Pegar bienestar
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setEditing(newDraft())}>
            <UserPlus size={15} />
            Añadir jugador
          </button>
        </div>
      </div>

      {importMsg && (
        <div className="banner banner-info" style={{ marginBottom: 16 }}>
          {importMsg}
        </div>
      )}

      <details style={{ marginBottom: 16 }}>
        <summary className="link-btn" style={{ cursor: 'pointer' }}>Formato esperado del JSON</summary>
        <pre style={{ fontSize: 12, background: 'var(--gray-50)', padding: 12, borderRadius: 'var(--radius-sm)', overflowX: 'auto', marginTop: 8 }}>
{`[
  {
    "nombre": "Juan Pérez",
    "dorsal": 7,
    "posicion": "Ala",
    "equipo": "Juvenil División de Honor",
    "fechaNacimiento": "2009-05-12",
    "notas": "",
    "stats": { "partidos": 0, "goles": 0, "asistencias": 0, "amarillas": 0, "rojas": 0, "minutos": 0 }
  }
]`}
        </pre>
        <p className="field__help">Solo "nombre" es obligatorio; el resto de campos son opcionales y se rellenan a 0/vacío si faltan. "posicion" debe ser Portero, Cierre, Ala o Pívot. También puedes arrastrar directamente un export de NPA Stats (relojes/rotaciones): importa cada equipo con sus jugadores y fotos automáticamente.</p>
      </details>

      {equipos.length > 1 && (
        <div className="chip-group" style={{ marginBottom: 16 }}>
          {equipos.map((eq) => (
            <button key={eq} type="button" className={`chip${activeEquipo === eq ? ' is-active' : ''}`} onClick={() => setEquipoFilter(eq)}>
              {eq}
            </button>
          ))}
        </div>
      )}

      {visiblePlayers.length > 0 && <RosterDashboard players={visiblePlayers} />}

      {players.length === 0 ? (
        <div className="empty-state">
          <Users size={36} />
          <h3>Aún no hay jugadores</h3>
          <p>Añade la plantilla real de esta temporada con "Añadir jugador".</p>
        </div>
      ) : (
        <div className="tile-grid">
          {visiblePlayers.map((p) => {
            const injury = injuryByPlayer[p.id]
            const injuryClass = injury?.estado === 'Activa'
              ? ' tile-card--injury-activa'
              : injury?.estado === 'En recuperación'
                ? ' tile-card--injury-recuperacion'
                : ''
            const npaAgg = computePlayerStats(npaMatches, p.nombre).agg
            return (
              <div key={p.id} className={`tile-card tile-card--player${injuryClass}`} onClick={() => setEditing(p)}>
                <div className="tile-card__top">
                  <PlayerAvatar fileId={p.fotoFileId} size="card" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row spread" style={{ gap: 6 }}>
                      <div className="tile-card__name">{p.nombre}</div>
                      {p.dorsal !== '' && p.dorsal != null && <span className="player-dorsal">{p.dorsal}</span>}
                    </div>
                    <span className="player-position-pill">{p.posicion}</span>
                  </div>
                </div>
                <div className="tile-card__stats row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {injury && (
                    <span className="badge badge-danger"><Bandage size={11} /> {injury.estado}</span>
                  )}
                  <WellnessBadge entry={latestBienestarByPlayer[p.id]} />
                  <span className="badge badge-gray">{npaAgg.partidos} PJ</span>
                  <span className="badge badge-red">{npaAgg.goles} goles</span>
                  <span className="badge badge-blue">{npaAgg.asistencias} asist.</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <PlayerModal
          player={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            bump()
          }}
        />
      )}

      {pastingBienestar && (
        <PasteBienestarModal onClose={() => setPastingBienestar(false)} onSynced={bump} />
      )}
    </div>
  )
}
