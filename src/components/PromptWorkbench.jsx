import { useState } from 'react'
import { Copy, Check, Sparkles } from 'lucide-react'

// Bloque reutilizable "copia el prompt / pega la respuesta" que usan tanto el
// Asistente general como el Asistente de Mesociclos: mismo patrón manual
// (sin clave de API) que noia-sesiones.
export default function PromptWorkbench({ prompt, response, onResponseChange, extraFields, resultLabel = 'Recomendaciones' }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="grid cols-2">
        <div className="card">
          {extraFields}

          <div className="field">
            <label className="field__label">Prompt completo a copiar</label>
            <textarea readOnly value={prompt} style={{ minHeight: 220, fontSize: 12.5, fontFamily: 'monospace' }} />
          </div>

          <button type="button" className="btn btn-primary" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copiado' : 'Copiar prompt'}
          </button>
        </div>

        <div className="card">
          <h3 className="section-title" style={{ fontSize: 15 }}>Pega aquí la respuesta</h3>
          <p className="section-hint">Pega la respuesta que te dé Claude para verla ordenada.</p>
          <textarea
            value={response}
            onChange={(e) => onResponseChange(e.target.value)}
            placeholder="Pega aquí la respuesta de Claude…"
            style={{ minHeight: 260 }}
          />
        </div>
      </div>

      {response.trim() && (
        <div className="task-card" style={{ marginTop: 16 }}>
          <div className="task-card__head row">
            <Sparkles size={15} color="var(--red-700)" />
            <strong style={{ fontSize: 14 }}>{resultLabel}</strong>
          </div>
          <div className="task-card__body">
            <div className="task-field__value">{response}</div>
          </div>
        </div>
      )}
    </div>
  )
}
