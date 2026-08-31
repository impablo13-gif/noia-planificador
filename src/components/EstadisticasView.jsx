import { useState } from 'react'
import { Upload, ChevronRight, ArrowLeft, BarChart3, ListOrdered, Trash2 } from 'lucide-react'
import { getPartidosNpa, getPlayers, getMatches, removeMatch, updateMatch, removePartidoNpa } from '../db.js'
import { isNpaExport, syncNpaExport, previewNpaMatchImport } from '../npaSync.js'
import { buildMatchRows, filterByCompetition } from '../statsEngine.js'
import { formatDateShort, formatDateLong, parseISODate } from '../dateUtils.js'
import StatsDashboard from './StatsDashboard.jsx'
import PageHeader from './PageHeader.jsx'
import NpaMatchReviewModal from './NpaMatchReviewModal.jsx'

const COMPETITION_ROW_CLASS = { Liga: 'match-row--liga', Amistoso: 'match-row--amistoso', Copa: 'match-row--copa' }
const COMPETICIONES = ['Liga', 'Amistoso', 'Copa']

export default function EstadisticasView() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncMsg, setSyncMsg] = useState('')
  const [competicionFilter, setCompeticionFilter] = useState(null)
  const [openMatchId, setOpenMatchId] = useState(null)
  const [reviewPreview, setReviewPreview] = useState(null) // preview de previewNpaMatchImport a la espera de que Pablo lo confirme/edite

  const players = getPlayers()
  // Esta pantalla es solo para el Juvenil (el único equipo del que Pablo
  // sube partidos de NPA Stats aquí) — cualquier partido importado con otro
  // nombre de equipo (pruebas, "1º Equipo", el nombre de club tal cual sin
  // corregir…) queda fuera sin más, no aparece ni como chip ni como opción.
  const allMatches = getPartidosNpa().filter((m) => /juvenil/i.test(m.equipo || ''))
  const competitionByNpaId = new Map(getMatches().filter((cm) => cm.npaMatchId).map((cm) => [cm.npaMatchId, cm.competition]))
  const matches = filterByCompetition(allMatches, competitionByNpaId, competicionFilter)
  const openMatch = openMatchId ? matches.find((m) => m.id === openMatchId) : null

  function bump() {
    setRefreshKey((k) => k + 1)
  }

  function handleUpdateFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result)
        if (isNpaExport(data)) {
          // Copia de seguridad completa: ya trae dorsal/posición/foto fiables
          // de cada jugador y equipo, así que se sincroniza directa, sin
          // pasar por el aviso de revisión (que es solo para el export de un
          // solo partido, donde el equipo/jugadores hay que casarlos a mano).
          setSyncMsg('Sincronizando…')
          const r = await syncNpaExport(data)
          const parts = [
            `${r.matchesAdded} partido${r.matchesAdded === 1 ? '' : 's'} nuevo${r.matchesAdded === 1 ? '' : 's'}, ${r.matchesUpdated} actualizado${r.matchesUpdated === 1 ? '' : 's'}`,
          ]
          if (r.playersAdded || r.playersUpdated) {
            parts.push(`plantilla ${r.playersAdded} nueva${r.playersAdded === 1 ? '' : 's'}, ${r.playersUpdated} actualizada${r.playersUpdated === 1 ? '' : 's'}`)
          }
          parts.push(`calendario: ${r.calendarMatchesLinked} enlazado${r.calendarMatchesLinked === 1 ? '' : 's'}, ${r.calendarMatchesCreated} creado${r.calendarMatchesCreated === 1 ? '' : 's'}`)
          if (r.reportsSynced) parts.push(`${r.reportsSynced} informe${r.reportsSynced === 1 ? '' : 's'} de partido recogido${r.reportsSynced === 1 ? '' : 's'}`)
          if (r.attendanceMarked) parts.push(`asistencia marcada a ${r.attendanceMarked} jugador${r.attendanceMarked === 1 ? '' : 'es'}`)
          let msg = `Actualizado: ${parts.join(' · ')}.`
          if (r.unmatchedPlayers?.length) {
            msg += ` No encontré en la plantilla a: ${r.unmatchedPlayers.join(', ')} — sus stats de este partido no se han podido aplicar.`
          }
          setSyncMsg(msg)
          bump()
        } else {
          // Export de un solo partido: se prepara el aviso de revisión
          // (equipo + cada jugador, con lo que se haya podido adivinar) y no
          // se guarda nada todavía — se aplica solo si Pablo confirma en el
          // modal, con el equipo/jugadores ya corregidos a mano si hacía falta.
          setReviewPreview(previewNpaMatchImport(data))
        }
      } catch (err) {
        setSyncMsg(`No se pudo actualizar: ${err.message}.`)
      }
    }
    reader.readAsText(file)
  }

  function handleReviewApplied(msg) {
    setReviewPreview(null)
    setSyncMsg(msg)
    bump()
  }

  // Mismo criterio que ya usa MatchModal para borrar un partido enlazado:
  // si el Calendario lo creó el propio import de NPA Stats (id "npa-…"), se
  // borra entero con él; si ya existía antes (una jornada de liga sembrada a
  // la que solo se le enganchó el resultado), se desengancha en vez de
  // borrar el partido del Calendario, que Pablo puso a mano.
  function handleRemoveMatch(m) {
    const cal = getMatches().find((cm) => cm.npaMatchId === m.id)
    if (cal) {
      if (cal.id.startsWith('npa-')) removeMatch(cal.id)
      else updateMatch(cal.id, { npaMatchId: null, npaReportFileId: null, npaReportGeneratedAt: null })
    }
    removePartidoNpa(m.id)
    setOpenMatchId(null)
    bump()
  }

  const rows = buildMatchRows(matches)

  return (
    <div>
      {openMatch ? (
        <>
          <button type="button" className="link-btn" style={{ marginBottom: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setOpenMatchId(null)}>
            <ArrowLeft size={14} />
            Volver al global
          </button>
          <PageHeader
            icon={BarChart3}
            title={openMatch.rivalName}
            hint={`${formatDateLong(parseISODate(openMatch.date.slice(0, 10)))}${openMatch.venue ? ` · ${openMatch.venue}` : ''}`}
          >
            <span className="badge badge-red" style={{ fontSize: 15, padding: '8px 16px' }}>
              Noia {openMatch.teamGoals} - {openMatch.rivalScore} {openMatch.rivalName}
            </span>
            <button type="button" className="btn btn-danger" onClick={() => handleRemoveMatch(openMatch)}>
              <Trash2 size={14} />
              Eliminar
            </button>
          </PageHeader>
          <StatsDashboard matches={[openMatch]} players={players} />
        </>
      ) : (
        <>
          <PageHeader icon={BarChart3} title="Estadísticas" hint="Datos de partido del Juvenil importados de NPA Stats">
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              <Upload size={15} />
              Subir informe (NPA Stats)
              <input type="file" accept="application/json,.json" onChange={handleUpdateFile} style={{ display: 'none' }} />
            </label>
          </PageHeader>

          <p className="field__help" style={{ marginTop: -10, marginBottom: 16 }}>
            Sube el JSON de "Descargar datos (JSON)" del informe de un partido, o la "Copia de seguridad" completa de NPA Stats — no el PDF, que es una imagen y no lleva los datos por dentro. Al subirlo se actualizan Estadísticas, Plantilla, la ficha del partido en el Calendario y la Asistencia de esa fecha. Solo se muestran aquí los partidos del Juvenil.
          </p>

          {syncMsg && <div className="banner banner-info" style={{ marginBottom: 16 }}>{syncMsg}</div>}

          <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <div className="chip-group">
              <button type="button" className={`chip${!competicionFilter ? ' is-active' : ''}`} onClick={() => setCompeticionFilter(null)}>
                Todas
              </button>
              {COMPETICIONES.map((c) => (
                <button key={c} type="button" className={`chip${competicionFilter === c ? ' is-active' : ''}`} onClick={() => setCompeticionFilter(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <StatsDashboard matches={matches} players={players} />

          {matches.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="row" style={{ gap: 9, marginBottom: 4 }}>
                <div className="icon-chip" style={{ '--chip-color': 'var(--blue-600)' }}><ListOrdered size={15} /></div>
                <h4 style={{ margin: 0, fontSize: 14 }}>Partido a partido</h4>
              </div>
              <p className="section-hint" style={{ marginBottom: 10, marginTop: 4 }}>Toca un partido para ver sus estadísticas por separado, aquí mismo.</p>
              {rows.map((m) => {
                const competition = competitionByNpaId.get(m.id) || 'Amistoso'
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`match-row ${COMPETITION_ROW_CLASS[competition] || ''}`}
                    style={{ width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => setOpenMatchId(m.id)}
                  >
                    <span className="text-muted">{formatDateShort(parseISODate(m.date.slice(0, 10)))}</span>
                    <span style={{ flex: 1 }}>{m.rivalName}</span>
                    <span><strong>{m.teamGoals}-{m.rivalScore}</strong></span>
                    <span className="text-muted">xG {m.xgFor} / {m.xgAgainst}</span>
                    <ChevronRight size={14} color="var(--ink-300)" />
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {reviewPreview && (
        <NpaMatchReviewModal
          preview={reviewPreview}
          onClose={() => setReviewPreview(null)}
          onApplied={handleReviewApplied}
        />
      )}
    </div>
  )
}
