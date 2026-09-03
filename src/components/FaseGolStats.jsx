// Marcador de "fases de gol" de la temporada, al estilo del informe de
// Emanuel Santoro: donuts + barras de comparación + tabla coloreada por
// categoría (a favor / en contra, fila de TOTALES y una fila por partido).
// Todo sale de goalEvents[].phase, que NPA Stats ya etiqueta gol a gol -- no
// hace falta teclear nada aparte, solo tener los partidos importados.
import { useState } from 'react'
import { FileSpreadsheet, PieChart, Search } from 'lucide-react'
import { computeFaseGolStats, GOAL_PHASES, GOAL_PHASE_GROUPS } from '../statsEngine.js'
import { parseISODate, formatDateShort } from '../dateUtils.js'
import { exportFaseGolStatsToExcel } from '../faseGolExport.js'

function Donut({ segments, size = 108, strokeWidth = 17 }) {
  const active = segments.filter((s) => s.value > 0)
  const total = active.reduce((s, x) => s + x.value, 0)
  const r = (size - strokeWidth) / 2
  const c = size / 2
  const circumference = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--gray-100)" strokeWidth={strokeWidth} />
      {total > 0 && active.map((s, i) => {
        const dash = (s.value / total) * circumference
        const el = (
          <circle key={i} cx={c} cy={c} r={r} fill="none" stroke={s.color} strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset}
            transform={`rotate(-90 ${c} ${c})`} />
        )
        offset += dash
        return el
      })}
      <text x={c} y={c - 4} textAnchor="middle" fontSize={size * 0.24} fontWeight="800" fill="var(--ink-900)">{total}</text>
      <text x={c} y={c + 14} textAnchor="middle" fontSize={size * 0.1} fontWeight="600" fill="var(--ink-500)">GOLES</text>
    </svg>
  )
}

function DonutCard({ title, totals, chipColor }) {
  const total = Object.values(totals).reduce((a, b) => a + b, 0)
  const groupTotal = (g) => g.phases.reduce((s, p) => s + (totals[p.key] || 0), 0)
  const groupsWithGoals = GOAL_PHASE_GROUPS.filter((g) => groupTotal(g) > 0)
  return (
    <div className="card fasegol-donut-card">
      <div className="leaderboard-card__head">
        <div className="icon-chip" style={{ '--chip-color': chipColor }}><PieChart size={15} /></div>
        <h4>{title}</h4>
      </div>
      {total === 0 ? (
        <p className="text-muted" style={{ fontSize: 12.5 }}>Sin datos de fase todavía.</p>
      ) : (
        <div className="fasegol-donut-row">
          <Donut segments={GOAL_PHASE_GROUPS.map((g) => ({ value: groupTotal(g), color: g.color }))} />
          <div className="fasegol-legend">
            {groupsWithGoals.map((g) => {
              const v = groupTotal(g)
              const pct = total ? Math.round((v / total) * 100) : 0
              return (
                <div key={g.id} className="fasegol-legend-item">
                  <span className="fasegol-legend-dot" style={{ background: g.color }} />
                  <span className="fasegol-legend-name">{g.label}</span>
                  <strong>{v}</strong>
                  <span className="fasegol-legend-pct">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function CompareBar({ label, color, forValue, againstValue, max }) {
  const pct = (v) => `${max ? (v / max) * 100 : 0}%`
  return (
    <div className="phase-row" style={{ alignItems: 'flex-start' }}>
      <span className="phase-row__label">{label}</span>
      <div className="fasegol-bicompare" style={{ flex: 1 }}>
        <div className="leaderboard-bar-track"><div className="leaderboard-bar-fill" style={{ width: pct(forValue), background: color }} /></div>
        <div className="leaderboard-bar-track"><div className="leaderboard-bar-fill" style={{ width: pct(againstValue), background: color, opacity: 0.4 }} /></div>
      </div>
      <span className="phase-row__count" style={{ width: 46 }}>{forValue} · {againstValue}</span>
    </div>
  )
}

export default function FaseGolStats({ matches, teamLabel }) {
  const [busqueda, setBusqueda] = useState('')
  const { rows, totalsFor, totalsAgainst } = computeFaseGolStats(matches)
  const totalForAll = Object.values(totalsFor).reduce((a, b) => a + b, 0)
  const totalAgainstAll = Object.values(totalsAgainst).reduce((a, b) => a + b, 0)
  const maxPhase = Math.max(1, ...GOAL_PHASES.map((p) => Math.max(totalsFor[p.key] || 0, totalsAgainst[p.key] || 0)))
  const filteredRows = busqueda.trim()
    ? rows.filter((r) => (r.rivalName || '').toLowerCase().includes(busqueda.trim().toLowerCase()))
    : rows

  if (totalForAll === 0 && totalAgainstAll === 0) {
    return (
      <div className="card">
        <div className="leaderboard-card__head">
          <div className="icon-chip" style={{ '--chip-color': 'var(--red-600)' }}><PieChart size={15} /></div>
          <h4>Fases de gol</h4>
        </div>
        <p className="text-muted" style={{ fontSize: 12.5 }}>Sin datos de fase todavía.</p>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="fasegol-donuts">
        <DonutCard title="¿De qué fase vienen nuestros goles?" totals={totalsFor} chipColor="var(--red-600)" />
        <DonutCard title="¿De qué fase vienen los goles del rival?" totals={totalsAgainst} chipColor="var(--blue-600)" />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="leaderboard-card__head">
          <div className="icon-chip" style={{ '--chip-color': 'var(--gold-600)' }}><PieChart size={15} /></div>
          <h4>A favor vs en contra, por fase</h4>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          {GOAL_PHASES.filter((p) => (totalsFor[p.key] || 0) + (totalsAgainst[p.key] || 0) > 0).map((p) => (
            <CompareBar key={p.key} label={p.label} color={p.color} forValue={totalsFor[p.key] || 0} againstValue={totalsAgainst[p.key] || 0} max={maxPhase} />
          ))}
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div className="leaderboard-card__head" style={{ margin: 0 }}>
            <div className="icon-chip" style={{ '--chip-color': 'var(--red-600)' }}><PieChart size={15} /></div>
            <h4>Marcador de fases, partido a partido</h4>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="field" style={{ marginBottom: 0, position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-300)' }} />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Filtrar por rival…"
                style={{ paddingLeft: 28, fontSize: 12.5, padding: '6px 10px 6px 28px', maxWidth: 180 }}
              />
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => exportFaseGolStatsToExcel(rows, totalsFor, totalsAgainst, teamLabel)}>
              <FileSpreadsheet size={14} />
              Exportar a Excel
            </button>
          </div>
        </div>

        <div className="fasegol-table-wrap">
          <table className="fasegol-table">
            <thead>
              <tr>
                <th rowSpan={3} className="fasegol-th-match">Partido</th>
                <th colSpan={GOAL_PHASES.length + 1} className="fasegol-th-block">GOLES A FAVOR ({totalForAll})</th>
                <th colSpan={GOAL_PHASES.length + 1} className="fasegol-th-block">GOLES EN CONTRA ({totalAgainstAll})</th>
              </tr>
              <tr>
                {GOAL_PHASE_GROUPS.map((g) => (
                  <th key={`for-g-${g.id}`} colSpan={g.phases.length} className="fasegol-th-group" style={{ background: g.color }}>{g.label}</th>
                ))}
                <th rowSpan={2} className="fasegol-th-total">Total</th>
                {GOAL_PHASE_GROUPS.map((g) => (
                  <th key={`against-g-${g.id}`} colSpan={g.phases.length} className="fasegol-th-group" style={{ background: g.color }}>{g.label}</th>
                ))}
                <th rowSpan={2} className="fasegol-th-total">Total</th>
              </tr>
              <tr>
                {GOAL_PHASES.map((p) => (
                  <th key={`for-p-${p.key}`} className="fasegol-th-phase" style={{ borderTopColor: p.color, background: `color-mix(in srgb, ${p.color} 16%, white)` }}>{p.label}</th>
                ))}
                {GOAL_PHASES.map((p) => (
                  <th key={`against-p-${p.key}`} className="fasegol-th-phase" style={{ borderTopColor: p.color, background: `color-mix(in srgb, ${p.color} 16%, white)` }}>{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="fasegol-totals-row">
                <td style={{ textAlign: 'left', paddingLeft: 10 }}>TOTALES</td>
                {GOAL_PHASES.map((p) => <td key={`ft-${p.key}`}>{totalsFor[p.key] || 0}</td>)}
                <td>{totalForAll}</td>
                {GOAL_PHASES.map((p) => <td key={`at-${p.key}`}>{totalsAgainst[p.key] || 0}</td>)}
                <td>{totalAgainstAll}</td>
              </tr>
              {filteredRows.length === 0 && (
                <tr><td colSpan={GOAL_PHASES.length * 2 + 3} style={{ textAlign: 'center', color: 'var(--ink-500)', padding: 14 }}>Sin partidos que coincidan con "{busqueda}".</td></tr>
              )}
              {filteredRows.map((row) => {
                const rowForTotal = Object.values(row.forCounts).reduce((a, b) => a + b, 0)
                const rowAgainstTotal = Object.values(row.againstCounts).reduce((a, b) => a + b, 0)
                return (
                  <tr key={row.id}>
                    <td className="fasegol-match-cell" style={{ textAlign: 'left', paddingLeft: 10 }}>
                      {formatDateShort(parseISODate(row.date.slice(0, 10)))} <span>vs {row.rivalName}</span>
                    </td>
                    {GOAL_PHASES.map((p) => <td key={`fr-${p.key}`}>{row.forCounts[p.key] || 0}</td>)}
                    <td style={{ fontWeight: 700 }}>{rowForTotal}</td>
                    {GOAL_PHASES.map((p) => <td key={`ar-${p.key}`}>{row.againstCounts[p.key] || 0}</td>)}
                    <td style={{ fontWeight: 700 }}>{rowAgainstTotal}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
