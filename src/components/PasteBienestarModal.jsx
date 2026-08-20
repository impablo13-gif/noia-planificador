import { useState } from 'react'
import { ClipboardPaste, Check, UserCheck } from 'lucide-react'
import Modal from './Modal.jsx'
import { syncBienestarPaste, looksLikePastedBienestar, resolveUnmatchedName } from '../bienestarSync.js'
import { getPlayers } from '../db.js'

// Alternativa a "Actualizar bienestar" (CSV) para cuando Pablo solo tiene
// unas pocas filas nuevas: las copia directamente de la hoja de Google
// (Ctrl+C sobre las filas, sin cabecera) y las pega aquí, sin tener que
// exportar/descargar/subir ningún archivo.
export default function PasteBienestarModal({ onClose, onSynced }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [picks, setPicks] = useState({})
  const players = getPlayers()

  function runSync() {
    const r = syncBienestarPaste(text)
    setResult(r)
    onSynced()
  }

  function handleSync() {
    setError('')
    if (!looksLikePastedBienestar(text)) {
      setError('Eso no parece una fila del cuestionario — debe empezar por la fecha/hora de la respuesta (Marca temporal), tal cual sale al copiar de la hoja de Google.')
      return
    }
    runSync()
  }

  function handleResolve(name) {
    const playerId = picks[name]
    if (!playerId) return
    resolveUnmatchedName(name, playerId)
    runSync()
  }

  return (
    <Modal
      title="Pegar bienestar"
      onClose={onClose}
      maxWidth={640}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button type="button" className="btn btn-primary" onClick={handleSync} disabled={!text.trim()}>
            <ClipboardPaste size={14} />
            Sincronizar
          </button>
        </>
      }
    >
      <div className="stack">
        <p className="section-hint" style={{ marginBottom: 0 }}>
          Sirve tanto para el Cuestionario WELLNESS (antes del entreno) como para el Cuestionario RPE (después) — se
          reconocen solos, y se pueden pegar juntos o por separado, se van fusionando en el mismo registro de cada
          jugador. En la hoja de respuestas, selecciona las filas nuevas (sin cabecera) y cópialas (Ctrl+C). Pega
          aquí abajo (Ctrl+V) y pulsa "Sincronizar".
        </p>
        <div className="field">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setResult(null) }}
            placeholder={'18/08/2026 21:01:47\tHugo Martinez\t18/08/2026\tFull\t4\t5\t4\tSin dolor\tNinguna\t5\t2\t4\t7'}
            style={{ minHeight: 180, fontFamily: 'monospace', fontSize: 12.5 }}
          />
        </div>

        {error && <div className="banner banner-danger">{error}</div>}

        {result && (
          <div className="banner banner-info" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
            <div className="row" style={{ gap: 6 }}>
              <Check size={15} />
              <strong>{result.added} respuesta{result.added === 1 ? '' : 's'} nueva{result.added === 1 ? '' : 's'}, {result.updated} actualizada{result.updated === 1 ? '' : 's'}.</strong>
            </div>
            {result.missing.length > 0 && (
              <div style={{ fontSize: 13 }}>Sin responder el {result.lastFecha}: {result.missing.join(', ')}.</div>
            )}
          </div>
        )}

        {result && result.unmatched.length > 0 && (
          <div className="banner banner-warn" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              No he podido identificar a estos nombres en la plantilla — dime quién es cada uno y lo recordaré para siempre:
            </div>
            {result.unmatched.map((name) => (
              <div key={name} className="row spread" style={{ gap: 8 }}>
                <span style={{ fontSize: 13 }}>{name}</span>
                <div className="row" style={{ gap: 6 }}>
                  <select
                    value={picks[name] || ''}
                    onChange={(e) => setPicks((p) => ({ ...p, [name]: e.target.value }))}
                    style={{ fontSize: 12.5, padding: '5px 8px' }}
                  >
                    <option value="">Es…</option>
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleResolve(name)}
                    disabled={!picks[name]}
                  >
                    <UserCheck size={13} />
                    Asignar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
