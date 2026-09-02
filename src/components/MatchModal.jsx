import { useEffect, useState } from 'react'
import { Save, Trash2, House, Plane, ShieldHalf, Goal, ShieldAlert, FileText, ExternalLink, Flame, ClipboardList } from 'lucide-react'
import Modal from './Modal.jsx'
import FileDrop from './FileDrop.jsx'
import ShieldPhotoField from './ShieldPhotoField.jsx'
import PlayerAvatar from './PlayerAvatar.jsx'
import SessionRpePanel from './SessionRpePanel.jsx'
import MatchTacticalGroupsCard from './MatchTacticalGroupsCard.jsx'
import MatchPlanModal from './MatchPlanModal.jsx'
import { updateMatch, removeMatch, addMatch, addOpponent, getPartidosNpa, getPlayers, getFile, removePartidoNpa, getMatches } from '../db.js'
import { matchPlayerByName } from '../statsEngine.js'
import { rpeForDate } from '../bienestarStats.js'
import { formatDateLong, parseISODate } from '../dateUtils.js'

const EQUIPOS = ['Juvenil División de Honor', '1º EQUIPO']
const SUPERFICIES = ['Parqué', 'Cemento pulido', 'PVC deportivo', 'Parquet sintético', 'Otra']

// Insignia compacta para la cabecera del modal (junto al título), igual que
// en TrainingModal — visible nada más abrir, sin bajar a leer el desglose.
function HeaderRpe({ fecha }) {
  const { avg, count } = rpeForDate(fecha)
  if (avg == null) return null
  return (
    <span
      className="row"
      style={{ gap: 4, fontSize: 13, fontWeight: 700, color: 'var(--red-600)', flexShrink: 0 }}
      title={`RPE medio del partido · ${count} respuesta${count === 1 ? '' : 's'}`}
    >
      <Flame size={14} />
      {avg.toFixed(1)}
    </span>
  )
}

// Abre en una pestaña nueva el informe completo (HTML con fotos, mapas de
// calor, etc.) que NPA Stats generó y que la sincronización adjuntó solo.
function NpaReportLink({ fileId }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl = null
    if (!fileId) { setUrl(null); return }
    getFile(fileId).then((record) => {
      if (cancelled || !record) return
      objectUrl = URL.createObjectURL(record.blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fileId])

  if (!fileId) return null
  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noreferrer"
      className="btn btn-secondary btn-sm"
      style={{ pointerEvents: url ? 'auto' : 'none', opacity: url ? 1 : 0.6 }}
    >
      <FileText size={13} />
      Ver informe completo (NPA Stats)
      <ExternalLink size={11} />
    </a>
  )
}

function NpaSummary({ npaMatch }) {
  const players = getPlayers()
  const shotsOn = (npaMatch.players || []).reduce((s, p) => s + (p.shotsOn || 0), 0)
  const events = [...(npaMatch.goalEvents || [])].sort((a, b) => (a.half - b.half) || (b.remaining - a.remaining))

  return (
    <div className="banner banner-info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
      <div className="row spread">
        <strong style={{ fontSize: 13 }}>Datos sincronizados de NPA Stats</strong>
        <span className="badge badge-red">Noia {npaMatch.teamGoals} - {npaMatch.rivalScore}</span>
      </div>
      <div className="row" style={{ gap: 14, fontSize: 12.5 }}>
        <span>{shotsOn} tiros a puerta</span>
        <span>{(npaMatch.goalEvents || []).length} goles registrados</span>
      </div>
      {events.length > 0 && (
        <div className="stack" style={{ gap: 4 }}>
          {events.map((ev) => (
            <div key={ev.id} className="row" style={{ gap: 6, fontSize: 12 }}>
              {ev.type === 'for' ? <Goal size={12} color="var(--red-600)" /> : <ShieldAlert size={12} color="var(--blue-600)" />}
              <span>{ev.type === 'for' ? (ev.authorName || 'Gol a favor') : 'Gol en contra'}{ev.phase ? ` · ${ev.phase}` : ''}</span>
              <span className="row" style={{ gap: 2, marginLeft: 'auto' }}>
                {(ev.onCourt || []).slice(0, 5).map((p, i) => (
                  <PlayerAvatar key={i} fileId={matchPlayerByName(players, p.name)?.fotoFileId} size="xs" />
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MatchModal({ match, opponents, onClose, onSaved, onGoToRival }) {
  const [date, setDate] = useState(match.date)
  const [rpeTick, setRpeTick] = useState(0)
  const [time, setTime] = useState(match.time || '')
  const [competition, setCompetition] = useState(match.competition || 'Amistoso')
  const [vuelta, setVuelta] = useState(match.vuelta || '1ª Vuelta')
  const [equipo, setEquipo] = useState(match.equipo || EQUIPOS[0])
  const [superficie, setSuperficie] = useState(match.superficie || '')
  const [observaciones, setObservaciones] = useState(match.observaciones || '')
  const [opponentId, setOpponentId] = useState(match.opponentId || '')
  const [rivalMode, setRivalMode] = useState('list')
  const [newRivalName, setNewRivalName] = useState('')
  const [newRivalShieldFileId, setNewRivalShieldFileId] = useState(null)
  const [isHome, setIsHome] = useState(match.isHome ?? true)
  const [resultText, setResultText] = useState(match.resultText || '')
  const [reportText, setReportText] = useState(match.reportText || '')
  const [reportFileId, setReportFileId] = useState(match.reportFileId || null)
  const [status, setStatus] = useState(match.status || 'pendiente')
  const [gruposTacticos, setGruposTacticos] = useState(match.gruposTacticos || [])
  const [showPlan, setShowPlan] = useState(false)

  const opponent = opponents.find((o) => o.id === opponentId)
  const isLiga = match.competition === 'Liga'
  const npaMatch = match.npaMatchId ? getPartidosNpa().find((m) => m.id === match.npaMatchId) : null

  function handleSave() {
    let finalOpponentId = opponentId || null
    if (rivalMode === 'new' && newRivalName.trim()) {
      const created = addOpponent({ name: newRivalName.trim(), shieldFileId: newRivalShieldFileId })
      finalOpponentId = created[created.length - 1].id
    }
    const patch = {
      date,
      time,
      competition,
      vuelta: competition === 'Liga' ? vuelta : null,
      equipo,
      superficie,
      observaciones,
      opponentId: finalOpponentId,
      isHome,
      resultText,
      reportText,
      reportFileId,
      status,
    }
    if (match.id) {
      updateMatch(match.id, patch)
    } else {
      addMatch(patch)
    }
    onSaved()
  }

  function handleDelete() {
    if (match.id) removeMatch(match.id)
    if (match.npaMatchId) removePartidoNpa(match.npaMatchId)
    onSaved()
  }

  return (
    <Modal
      title={
        <span className="row spread" style={{ gap: 10, marginRight: 10 }}>
          <span>Partido · {formatDateLong(parseISODate(match.date))}</span>
          <HeaderRpe key={rpeTick} fecha={date} />
        </span>
      }
      onClose={onClose}
      maxWidth={620}
      footer={
        <>
          {match.id && (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>
              <Trash2 size={14} />
              Eliminar
            </button>
          )}
          {match.id && (
            <button type="button" className="btn btn-secondary" onClick={() => setShowPlan(true)}>
              <ClipboardList size={14} />
              Plan de partido
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            <Save size={14} />
            Guardar
          </button>
        </>
      }
    >
      <div className="stack">
        {isLiga && (
          <div className="badge badge-red">Jornada {match.jornada} · Liga (fecha oficial RFEF)</div>
        )}

        {npaMatch && <NpaSummary npaMatch={npaMatch} />}
        {match.npaReportFileId && (
          <div className="row">
            <NpaReportLink fileId={match.npaReportFileId} />
          </div>
        )}

        <SessionRpePanel fecha={date} players={getPlayers().filter((p) => p.equipo === equipo)} title="RPE del partido" onChange={() => setRpeTick((t) => t + 1)} />

        {match.id && (
          <MatchTacticalGroupsCard
            matchId={match.id}
            grupos={gruposTacticos}
            players={getPlayers().filter((p) => p.equipo === equipo)}
            onChanged={() => setGruposTacticos(getMatches().find((m) => m.id === match.id)?.gruposTacticos || [])}
          />
        )}

        <hr className="divider" />
        <h4 style={{ fontSize: 13.5, color: 'var(--ink-700)' }}>Clasificar partido</h4>

        <div className="grid cols-2">
          <div className="field">
            <label className="field__label">Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">Hora</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label className="field__label">Competición</label>
            <select value={competition} onChange={(e) => setCompetition(e.target.value)} disabled={isLiga}>
              <option value="Liga">Liga</option>
              <option value="Amistoso">Amistoso</option>
              <option value="Copa">Copa</option>
            </select>
          </div>
          {competition === 'Liga' && (
            <div className="field">
              <label className="field__label">Vuelta</label>
              <div className="chip-group">
                <button type="button" className={`chip${vuelta === '1ª Vuelta' ? ' is-active' : ''}`} onClick={() => setVuelta('1ª Vuelta')}>1ª Vuelta</button>
                <button type="button" className={`chip${vuelta === '2ª Vuelta' ? ' is-active' : ''}`} onClick={() => setVuelta('2ª Vuelta')}>2ª Vuelta</button>
              </div>
            </div>
          )}
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label className="field__label">Equipo</label>
            <div className="chip-group">
              {EQUIPOS.map((eq) => (
                <button key={eq} type="button" className={`chip${equipo === eq ? ' is-active' : ''}`} onClick={() => setEquipo(eq)}>{eq}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="field__label">Local / Visitante</label>
            <div className="chip-group">
              <button type="button" className={`chip${isHome ? ' is-active' : ''}`} onClick={() => setIsHome(true)}>
                <House size={13} /> Casa
              </button>
              <button type="button" className={`chip${!isHome ? ' is-active' : ''}`} onClick={() => setIsHome(false)}>
                <Plane size={13} /> Fuera
              </button>
            </div>
          </div>
        </div>

        <div className="grid cols-2">
          <div className="field">
            <label className="field__label">Superficie de la pista <span className="field__optional">(opcional)</span></label>
            <select value={superficie} onChange={(e) => setSuperficie(e.target.value)}>
              <option value="">Sin especificar</option>
              {SUPERFICIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field__label">Estado</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pendiente">Pendiente</option>
              <option value="jugado">Jugado</option>
              <option value="por confirmar">Por confirmar</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field__label">Rival</label>
          {rivalMode === 'list' ? (
            <>
              <select
                value={opponentId}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setRivalMode('new')
                    setOpponentId('')
                  } else {
                    setOpponentId(e.target.value)
                  }
                }}
              >
                <option value="">Por confirmar</option>
                {opponents.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
                <option value="__new__">+ Rival nuevo (fuera de liga)…</option>
              </select>
              {opponent && (
                <button type="button" className="link-btn" style={{ marginTop: 6 }} onClick={() => onGoToRival(opponent.id)}>
                  <ShieldHalf size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                  Ver ficha de scouting de {opponent.name}
                </button>
              )}
              {competition !== 'Liga' && (
                <p className="field__help" style={{ marginTop: 6 }}>
                  ¿Amistoso contra un equipo que no está en tu liga? Elige "+ Rival nuevo" para añadirlo con su escudo.
                </p>
              )}
            </>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              <ShieldPhotoField fileId={newRivalShieldFileId} onChange={setNewRivalShieldFileId} />
              <input
                type="text"
                value={newRivalName}
                onChange={(e) => setNewRivalName(e.target.value)}
                placeholder="Nombre del club rival"
              />
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setRivalMode('list')
                  setNewRivalName('')
                  setNewRivalShieldFileId(null)
                }}
              >
                Elegir de la lista de rivales de liga
              </button>
            </div>
          )}
        </div>

        <div className="field">
          <label className="field__label">Observaciones <span className="field__optional">(opcional)</span></label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas rápidas: viento, pista mojada, cambios de última hora…" style={{ minHeight: 56 }} />
        </div>

        <hr className="divider" />
        <h4 style={{ fontSize: 13.5, color: 'var(--ink-700)' }}>Informe del partido</h4>

        <div className="field">
          <label className="field__label">Resultado</label>
          <input type="text" value={resultText} onChange={(e) => setResultText(e.target.value)} placeholder="Ej. Noia 4 - 2 Rival" />
        </div>

        <div className="field">
          <label className="field__label">Valoración</label>
          <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Valoración, incidencias, goleadores…" />
        </div>

        <div className="field">
          <label className="field__label">Adjuntar informe (PDF, foto del acta…)</label>
          <FileDrop fileId={reportFileId} onChange={setReportFileId} accept=".pdf,image/*,.doc,.docx" label="Subir informe" />
        </div>
      </div>

      {showPlan && (
        <MatchPlanModal
          match={{ ...match, gruposTacticos, observaciones }}
          opponent={opponent}
          players={getPlayers().filter((p) => p.equipo === equipo)}
          onClose={() => setShowPlan(false)}
        />
      )}
    </Modal>
  )
}
