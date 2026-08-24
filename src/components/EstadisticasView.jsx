import { useState } from 'react'
import { Upload, ChevronRight, ArrowLeft, BarChart3, ListOrdered } from 'lucide-react'
import { getPartidosNpa, getPlayers, getMatches } from '../db.js'
import { isNpaExport, syncNpaExport, isNpaMatchExport, syncNpaMatchExport } from '../npaSync.js'
import { buildMatchRows, filterByCompetition } from '../statsEngine.js'
import { formatDateShort, formatDateLong, parseISODate } from '../dateUtils.js'
import StatsDashboard from './StatsDashboard.jsx'
import PageHeader from './PageHeader.jsx'

const COMPETITION_ROW_CLASS = { Liga: 'match-row--liga', Amistoso: 'match-row--amistoso', Copa: 'match-row--copa' }
const COMPETICIONES = ['Liga', 'Amistoso', 'Copa']

export default function EstadisticasView() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [syncMsg, setSyncMsg] = useState('')
  const [equipoFilter, setEquipoFilter] = useState(null)
  const [competicionFilter, setCompeticionFilter] = useState(null)
  const [openMatchId, setOpenMatchId] = useState(null)

  const players = getPlayers()
  const allMatches = getPartidosNpa()
  // Mismos equipos que en Plantilla (derivados de la plantilla, no de qué
  // partidos haya ya importados) para que la diferenciación 1º Equipo /
  // Juvenil sea siempre visible, aunque a un equipo aún no le hayas
  // sincronizado ningún partido.
  const equipos = [...new Set(players.map((p) => p.equipo).filter(Boolean))]
  const defaultEquipo = equipos.find((eq) => /juvenil/i.test(eq)) || equipos[0] || null
  const activeEquipo = equipoFilter && equipos.includes(equipoFilter) ? equipoFilter : defaultEquipo
  const equipoMatches = activeEquipo ? allMatches.filter((m) => m.equipo === activeEquipo) : allMatches
  const competitionByNpaId = new Map(getMatches().filter((cm) => cm.npaMatchId).map((cm) => [cm.npaMatchId, cm.competition]))
  const matches = filterByCompetition(equipoMatches, competitionByNpaId, competicionFilter)
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
        let r
        if (isNpaExport(data)) {
          setSyncMsg('Sincronizando…')
          r = await syncNpaExport(data)
        } else if (isNpaMatchExport(data)) {
          setSyncMsg('Sincronizando…')
          r = await syncNpaMatchExport(data)
        } else {
          throw new Error('ese archivo no parece un export de NPA Stats')
        }
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
      } catch (err) {
        setSyncMsg(`No se pudo actualizar: ${err.message}.`)
      }
    }
    reader.readAsText(file)
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
          </PageHeader>
          <StatsDashboard matches={[openMatch]} players={players} />
        </>
      ) : (
        <>
          <PageHeader icon={BarChart3} title="Estadísticas" hint={`Datos de partido importados de NPA Stats${activeEquipo ? ` · ${activeEquipo}` : ''}`}>
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              <Upload size={15} />
              Subir informe (NPA Stats)
              <input type="file" accept="application/json,.json" onChange={handleUpdateFile} style={{ display: 'none' }} />
            </label>
          </PageHeader>

          <p className="field__help" style={{ marginTop: -10, marginBottom: 16 }}>
            Sube el JSON de "Descargar datos (JSON)" del informe de un partido, o la "Copia de seguridad" completa de NPA Stats — no el PDF, que es una imagen y no lleva los datos por dentro. Al subirlo se actualizan Estadísticas, Plantilla, la ficha del partido en el Calendario y la Asistencia de esa fecha.
          </p>

          {syncMsg && <div className="banner banner-info" style={{ marginBottom: 16 }}>{syncMsg}</div>}

          <div className="row" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {equipos.length > 1 && (
              <div className="chip-group">
                {equipos.map((eq) => (
                  <button key={eq} type="button" className={`chip${activeEquipo === eq ? ' is-active' : ''}`} onClick={() => setEquipoFilter(eq)}>
                    {eq}
                  </button>
                ))}
              </div>
            )}
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
    </div>
  )
}
