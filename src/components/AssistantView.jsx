import { useState, useMemo } from 'react'
import assistantPrompt from '../assistantPrompt.md?raw'
import { getMatches, getOpponents, getPlayers, getInjuries, agendaClub, agendaPersonal } from '../db.js'
import { toISODate, formatDateLong } from '../dateUtils.js'
import PromptWorkbench from './PromptWorkbench.jsx'

function buildDataSummary() {
  const todayISO = toISODate(new Date())
  const matches = getMatches()
  const opponents = getOpponents()
  const players = getPlayers()

  const nextMatch = matches
    .filter((m) => m.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
  const nextOpponent = nextMatch ? opponents.find((o) => o.id === nextMatch.opponentId) : null

  const lines = []
  lines.push('## Datos actuales del club (generado automáticamente)')
  lines.push('')
  lines.push(`Fecha de hoy: ${formatDateLong(new Date())}`)
  lines.push('')

  lines.push('### Próximo partido')
  if (nextMatch) {
    lines.push(`- ${nextMatch.competition}${nextMatch.jornada ? ` (jornada ${nextMatch.jornada})` : ''}, ${formatDateLong(new Date(nextMatch.date + 'T00:00:00'))}, ${nextMatch.isHome ? 'en casa' : 'fuera'}.`)
    lines.push(`- Rival: ${nextOpponent ? nextOpponent.name : 'por confirmar'}.`)
    if (nextOpponent?.scouting) {
      const s = nextOpponent.scouting
      if (s.sistemaJuego) lines.push(`- Sistema de juego del rival: ${s.sistemaJuego}`)
      if (s.puntosFuertes) lines.push(`- Puntos fuertes del rival: ${s.puntosFuertes}`)
      if (s.puntosDebiles) lines.push(`- Puntos débiles del rival: ${s.puntosDebiles}`)
      if (s.jugadoresClave) lines.push(`- Jugadores clave del rival: ${s.jugadoresClave}`)
      if (s.abp) lines.push(`- ABP del rival: ${s.abp}`)
      if (s.notasLibres) lines.push(`- Otras notas: ${s.notasLibres}`)
      if (!s.sistemaJuego && !s.puntosFuertes && !s.puntosDebiles && !s.jugadoresClave) {
        lines.push('- (Aún no hay scouting guardado de este rival en la pestaña Rivales.)')
      }
    }
  } else {
    lines.push('- No hay próximos partidos programados en el calendario.')
  }

  lines.push('')
  lines.push('### Plantilla')
  if (players.length === 0) {
    lines.push('- La plantilla está vacía todavía en la app.')
  } else {
    lines.push(`- ${players.length} jugador${players.length === 1 ? '' : 'es'} dado${players.length === 1 ? '' : 's'} de alta.`)
    const porPosicion = players.reduce((acc, p) => {
      acc[p.posicion] = (acc[p.posicion] || 0) + 1
      return acc
    }, {})
    lines.push(`- Por posición: ${Object.entries(porPosicion).map(([k, v]) => `${k}: ${v}`).join(', ')}`)
    const conTarjetas = players.filter((p) => (p.stats?.amarillas || 0) >= 2 || (p.stats?.rojas || 0) >= 1)
    if (conTarjetas.length > 0) {
      lines.push(`- Jugadores a vigilar por tarjetas: ${conTarjetas.map((p) => p.nombre).join(', ')}`)
    }
    const activas = getInjuries().filter((i) => i.estado === 'Activa')
    if (activas.length > 0) {
      lines.push(`- Bajas por lesión ahora mismo: ${activas.map((i) => {
        const p = players.find((pl) => pl.id === i.playerId)
        return `${p ? p.nombre : '—'} (${i.zona}, ${i.tipo})`
      }).join(', ')}`)
    }
  }

  lines.push('')
  lines.push('### Agenda del club pendiente')
  const pendingClub = agendaClub.get().filter((t) => !t.done)
  lines.push(pendingClub.length ? pendingClub.map((t) => `- ${t.text}`).join('\n') : '- Sin tareas pendientes.')

  lines.push('')
  lines.push('### Recordatorios pendientes')
  const pendingPersonal = agendaPersonal.get().filter((t) => !t.done)
  lines.push(pendingPersonal.length ? pendingPersonal.map((t) => `- ${t.text}`).join('\n') : '- Sin recordatorios pendientes.')

  return lines.join('\n')
}

export default function AssistantView() {
  const dataSummary = useMemo(buildDataSummary, [])
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState('')

  const fullPrompt = useMemo(() => {
    const parts = [assistantPrompt, dataSummary]
    if (question.trim()) {
      parts.push(`## Pregunta de Pablo\n\n${question.trim()}`)
    } else {
      parts.push('## Pregunta de Pablo\n\nDame tu valoración y recomendaciones para esta semana.')
    }
    return parts.join('\n\n')
  }, [dataSummary, question])

  return (
    <div>
      <h2 className="section-title">Asistente</h2>
      <p className="section-hint">
        Genera un resumen con los datos actuales del club, cópialo y pégalo en cualquier chat de Claude (este mismo, o claude.ai) para pedir recomendaciones. No hace falta clave de API.
      </p>

      <PromptWorkbench
        prompt={fullPrompt}
        response={response}
        onResponseChange={setResponse}
        resultLabel="Recomendaciones"
        extraFields={
          <div className="field">
            <label className="field__label">¿Sobre qué quieres recomendaciones? <span className="field__optional">(opcional)</span></label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ej. cómo plantear el partido de esta semana, en qué enfocar el entreno del jueves, cómo repartir minutos…"
            />
          </div>
        }
      />
    </div>
  )
}
