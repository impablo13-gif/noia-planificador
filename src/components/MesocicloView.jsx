import { useState, useMemo } from 'react'
import { LayoutGrid } from 'lucide-react'
import mesocicloPrompt from '../mesocicloPrompt.md?raw'
import { getMatches, getOpponents, getPlayers, getInjuries } from '../db.js'
import { getEventsInRange } from '../eventsEngine.js'
import { toISODate, parseISODate, addDays, formatDateLong } from '../dateUtils.js'
import PromptWorkbench from './PromptWorkbench.jsx'
import PageHeader from './PageHeader.jsx'

const PRIORIDADES_MDJ = [
  'Ataque Posicional (AP)', 'Defensa Posicional (DP)', 'Transición Ofensiva (TO)', 'Transición Defensiva (TD)',
  'Sistema 3-1', 'Sistema 4-0', '5x4 / ABP', 'Físico general', 'Prevención de lesiones',
]

const PERIODOS = ['Preparatorio (pretemporada)', 'Competitivo (liga)', 'Transitorio']
const CARGAS = ['Progresiva (pretemporada)', 'Alta / choque', 'Media / desarrollo', 'Baja / recuperación']

function nextMonday(from) {
  const d = new Date(from)
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  return addDays(d, dow === 1 ? 0 : 8 - dow)
}

function suggestPeriodo(startISO) {
  return startISO < '2026-09-14' ? PERIODOS[0] : PERIODOS[1]
}

function buildDataSummary({ startDate, endDate }) {
  const matches = getMatches()
    .filter((m) => m.date >= startDate && m.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date))
  const opponents = getOpponents()
  const players = getPlayers()
  const eventsMap = getEventsInRange(parseISODate(startDate), parseISODate(endDate))

  let trainingCount = 0
  Object.values(eventsMap).forEach((day) => {
    trainingCount += day.trainings.filter((t) => !t.cancelled).length
  })

  const lines = []
  lines.push('## Contexto del club para este ciclo (generado automáticamente)')
  lines.push('')
  lines.push(`Rango: ${formatDateLong(parseISODate(startDate))} → ${formatDateLong(parseISODate(endDate))}`)
  lines.push(`Entrenos programados en el rango: ${trainingCount}`)
  lines.push(`Jugadores en plantilla: ${players.length}`)
  lines.push('')

  lines.push('### Partidos en este rango')
  if (matches.length === 0) {
    lines.push('- Ninguno programado en estas fechas.')
  } else {
    matches.forEach((m) => {
      const opponent = opponents.find((o) => o.id === m.opponentId)
      lines.push(`- ${formatDateLong(parseISODate(m.date))} · ${m.competition}${m.jornada ? ` (jornada ${m.jornada})` : ''} · ${m.isHome ? 'en casa' : 'fuera'} vs ${opponent ? opponent.name : 'rival por confirmar'}`)
      const highlights = opponent?.scouting?.highlights?.filter(Boolean)
      if (highlights?.length) {
        highlights.forEach((h) => lines.push(`  - Scouting: ${h}`))
      }
    })
  }

  return lines.join('\n')
}

export default function MesocicloView() {
  const [ambito, setAmbito] = useState('microciclo')
  const [startDate, setStartDate] = useState(toISODate(nextMonday(new Date())))
  const [weeks, setWeeks] = useState(1)
  const [periodo, setPeriodo] = useState(() => suggestPeriodo(toISODate(nextMonday(new Date()))))
  const [objetivo, setObjetivo] = useState('')
  const [prioridades, setPrioridades] = useState([])
  const [carga, setCarga] = useState(CARGAS[1])
  const [bajas, setBajas] = useState(() => {
    const activas = getInjuries().filter((i) => i.estado === 'Activa')
    if (activas.length === 0) return ''
    const players = getPlayers()
    return activas
      .map((i) => {
        const p = players.find((pl) => pl.id === i.playerId)
        return `${p ? p.nombre : 'jugador'}: ${i.zona} (${i.tipo})`
      })
      .join('. ')
  })
  const [response, setResponse] = useState('')

  const endDate = useMemo(() => toISODate(addDays(parseISODate(startDate), weeks * 7 - 1)), [startDate, weeks])

  function togglePrioridad(p) {
    setPrioridades((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))
  }

  const fullPrompt = useMemo(() => {
    const dataSummary = buildDataSummary({ startDate, endDate })
    const lines = []
    lines.push('## Petición de Pablo')
    lines.push('')
    lines.push(`- Ámbito: ${ambito === 'microciclo' ? `Microciclo (${weeks} semana${weeks === 1 ? '' : 's'})` : `Mesociclo (${weeks} semanas)`}`)
    lines.push(`- Periodo de temporada: ${periodo}`)
    lines.push(`- Fechas: ${formatDateLong(parseISODate(startDate))} → ${formatDateLong(parseISODate(endDate))}`)
    lines.push(`- Objetivo principal: ${objetivo.trim() || '(sin especificar, propón uno coherente con el periodo y los partidos del rango)'}`)
    lines.push(`- Prioridades del MDJ a trabajar: ${prioridades.length ? prioridades.join(', ') : '(sin preferencia explícita, decide tú según el rival y el periodo)'}`)
    lines.push(`- Carga deseada: ${carga}`)
    if (bajas.trim()) lines.push(`- Bajas / aspectos físicos a vigilar: ${bajas.trim()}`)
    return [mesocicloPrompt, dataSummary, lines.join('\n')].join('\n\n')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambito, startDate, endDate, weeks, periodo, objetivo, prioridades, carga, bajas])

  return (
    <div>
      <PageHeader
        icon={LayoutGrid}
        title="Mesociclos y microciclos"
        hint="Genera un prompt fundamentado en tus apuntes RFEF de planificación y desarrollo físico (Nacional A y B) más el Modelo de Juego del club. Cópialo y pégalo en cualquier chat de Claude — no hace falta clave de API."
      />

      <PromptWorkbench
        prompt={fullPrompt}
        response={response}
        onResponseChange={setResponse}
        resultLabel="Plan propuesto"
        extraFields={
          <div className="stack" style={{ marginBottom: 16 }}>
            <div className="grid cols-2">
              <div className="field">
                <label className="field__label">Ámbito</label>
                <div className="chip-group">
                  <button type="button" className={`chip${ambito === 'microciclo' ? ' is-active' : ''}`} onClick={() => setAmbito('microciclo')}>Microciclo</button>
                  <button type="button" className={`chip${ambito === 'mesociclo' ? ' is-active' : ''}`} onClick={() => setAmbito('mesociclo')}>Mesociclo</button>
                </div>
              </div>
              <div className="field">
                <label className="field__label">Nº de semanas</label>
                <input type="number" min="1" max="12" value={weeks} onChange={(e) => setWeeks(Math.max(1, Number(e.target.value) || 1))} />
              </div>
            </div>

            <div className="grid cols-2">
              <div className="field">
                <label className="field__label">Fecha de inicio</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setPeriodo(suggestPeriodo(e.target.value))
                  }}
                />
              </div>
              <div className="field">
                <label className="field__label">Periodo de temporada</label>
                <select value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
                  {PERIODOS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="field__help">Hasta el {formatDateLong(parseISODate(endDate))}.</p>

            <div className="field">
              <label className="field__label">Objetivo principal <span className="field__optional">(opcional)</span></label>
              <textarea value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ej. consolidar el 4-0 en ataque, llegar frescos al partido del sábado…" />
            </div>

            <div className="field">
              <label className="field__label">Prioridades del MDJ <span className="field__optional">(opcional)</span></label>
              <div className="chip-group">
                {PRIORIDADES_MDJ.map((p) => (
                  <button key={p} type="button" className={`chip${prioridades.includes(p) ? ' is-active' : ''}`} onClick={() => togglePrioridad(p)}>
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="field__label">Carga deseada</label>
              <select value={carga} onChange={(e) => setCarga(e.target.value)}>
                {CARGAS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field__label">Bajas / aspectos físicos a vigilar <span className="field__optional">(opcional)</span></label>
              <textarea value={bajas} onChange={(e) => setBajas(e.target.value)} placeholder="Ej. dos jugadores con sobrecarga en isquios, portero recién incorporado…" />
            </div>
          </div>
        }
      />
    </div>
  )
}
