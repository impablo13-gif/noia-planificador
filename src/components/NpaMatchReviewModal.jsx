import { useState } from 'react'
import { UploadCloud, UserCheck } from 'lucide-react'
import Modal from './Modal.jsx'
import { applyNpaMatchImport } from '../npaSync.js'
import { getPlayers } from '../db.js'

// Paso de revisión entre "leer el archivo" y "aplicarlo de verdad", para el
// export de un solo partido de NPA Stats ("Descargar datos (JSON)" del
// informe). Antes se aplicaba directo: si el nombre del equipo o de algún
// jugador no coincidía letra por letra con la Plantilla, el partido se
// guardaba igual pero quedaba sin equipo reconocible y sin nadie casado —
// parecía que "no había actualizado nada" sin ninguna forma de arreglarlo.
// Aquí se ve y se corrige antes de guardar: a qué equipo de la Plantilla
// pertenece y quién es cada jugador (ya viene adivinado cuando se puede).
export default function NpaMatchReviewModal({ preview, onClose, onApplied }) {
  const players = getPlayers()
  const [equipo, setEquipo] = useState(preview.equipoGuess || preview.npaEquipo || '')
  const [assignments, setAssignments] = useState(() => {
    const initial = {}
    preview.playerRows.forEach((row) => { initial[row.npaName] = row.matchedId || '' })
    return initial
  })
  const [applying, setApplying] = useState(false)

  const setPick = (npaName, value) => setAssignments((a) => ({ ...a, [npaName]: value }))

  async function handleConfirm() {
    if (!equipo.trim() || applying) return
    setApplying(true)
    try {
      const r = await applyNpaMatchImport(preview, { equipo: equipo.trim(), assignments })
      const parts = [
        `${r.matchesAdded} partido${r.matchesAdded === 1 ? '' : 's'} nuevo${r.matchesAdded === 1 ? '' : 's'}, ${r.matchesUpdated} actualizado${r.matchesUpdated === 1 ? '' : 's'}`,
      ]
      if (r.playersAdded) parts.push(`${r.playersAdded} jugador${r.playersAdded === 1 ? '' : 'es'} nuevo${r.playersAdded === 1 ? '' : 's'} en la Plantilla`)
      parts.push(`calendario: ${r.calendarMatchesLinked} enlazado${r.calendarMatchesLinked === 1 ? '' : 's'}, ${r.calendarMatchesCreated} creado${r.calendarMatchesCreated === 1 ? '' : 's'}`)
      if (r.reportsSynced) parts.push(`${r.reportsSynced} informe${r.reportsSynced === 1 ? '' : 's'} de partido recogido${r.reportsSynced === 1 ? '' : 's'}`)
      if (r.attendanceMarked) parts.push(`asistencia marcada a ${r.attendanceMarked} jugador${r.attendanceMarked === 1 ? '' : 'es'}`)
      let msg = `Actualizado: ${parts.join(' · ')}.`
      if (r.unmatchedPlayers?.length) {
        msg += ` Quedaron sin asignar: ${r.unmatchedPlayers.join(', ')} — sus stats de este partido no se han aplicado.`
      }
      onApplied(msg)
    } catch (err) {
      onApplied(`No se pudo actualizar: ${err.message}.`)
    } finally {
      setApplying(false)
    }
  }

  const unresolvedCount = preview.playerRows.filter((row) => !assignments[row.npaName]).length

  return (
    <Modal
      title="Revisar antes de importar"
      onClose={onClose}
      maxWidth={640}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={applying}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={applying || !equipo.trim()}>
            <UploadCloud size={14} />
            {applying ? 'Importando…' : 'Confirmar e importar'}
          </button>
        </>
      }
    >
      <div className="stack">
        <p className="section-hint" style={{ marginTop: 0 }}>
          NPA Stats trajo el equipo "{preview.npaEquipo || 'sin nombre'}" y {preview.playerRows.length} jugador{preview.playerRows.length === 1 ? '' : 'es'}.
          Confirma a qué equipo de la Plantilla pertenece y quién es cada uno — lo que elijas aquí se recuerda para
          siempre, así las próximas subidas de este mismo equipo/jugadores ya no preguntan.
        </p>

        <div className="field">
          <label>Equipo de la Plantilla</label>
          <input
            list="npa-equipos-list"
            value={equipo}
            onChange={(e) => setEquipo(e.target.value)}
            placeholder="Nombre del equipo en la Plantilla"
          />
          <datalist id="npa-equipos-list">
            {preview.rosterEquipos.map((eq) => <option key={eq} value={eq} />)}
          </datalist>
          {!preview.rosterEquipos.includes(equipo.trim()) && equipo.trim() && (
            <p className="field__help">
              "{equipo.trim()}" no existe todavía en la Plantilla como equipo — se usará tal cual, igualmente.
            </p>
          )}
        </div>

        <div className="field">
          <label>
            Jugadores {unresolvedCount > 0 && <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>· {unresolvedCount} sin asignar</span>}
          </label>
          <div className="stack" style={{ gap: 6, maxHeight: 320, overflowY: 'auto' }}>
            {preview.playerRows.map((row) => (
              <div key={row.npaName} className="row spread" style={{ gap: 8 }}>
                <span style={{ fontSize: 13 }}>
                  {row.npaNumber !== '' ? `#${row.npaNumber} ` : ''}{row.npaName}
                </span>
                <select
                  value={assignments[row.npaName] || ''}
                  onChange={(e) => setPick(row.npaName, e.target.value)}
                  style={{ fontSize: 12.5, padding: '5px 8px', minWidth: 200 }}
                >
                  <option value="">Sin asignar</option>
                  <option value="NEW">+ Crear jugador nuevo</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}{p.equipo ? ` (${p.equipo})` : ''}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {unresolvedCount > 0 && (
          <div className="banner banner-warn" style={{ gap: 8 }}>
            <UserCheck size={15} />
            <span>Quien quede "Sin asignar" se importa igual, pero sus goles/minutos/tiros de este partido no contarán en la ficha de ningún jugador hasta que lo asignes (aquí o en una próxima subida).</span>
          </div>
        )}
      </div>
    </Modal>
  )
}
