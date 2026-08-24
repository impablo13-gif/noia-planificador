import { useState } from 'react'
import { Flame, HeartPulse, Moon, Zap, Bone, BatteryMedium, Gauge, MapPin, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { getPlayers } from '../db.js'
import { teamWellnessSnapshot, teamMetricTrend, teamBienestarDates, teamPainBreakdown } from '../bienestarStats.js'
import { formatDateShort, parseISODate } from '../dateUtils.js'
import TrendChart from './TrendChart.jsx'
import PageHeader from './PageHeader.jsx'

const MODOS = [
  { id: 'general', label: 'General (mezcla)' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'rpe', label: 'RPE' },
]

const WELLNESS_METRICS = [
  { key: 'estres', label: 'Estrés', icon: Zap, min: 1, max: 5, invert: true, color: 'var(--warn-600)' },
  { key: 'sueno', label: 'Sueño', icon: Moon, min: 1, max: 5, invert: false, color: 'var(--blue-600)' },
  { key: 'dolorMuscular', label: 'Dolor muscular', icon: Bone, min: 1, max: 5, invert: false, color: 'var(--danger-600)' },
  { key: 'energia', label: 'Energía', icon: BatteryMedium, min: 1, max: 5, invert: false, color: 'var(--success-600)' },
  { key: 'fatiga', label: 'Fatiga', icon: Gauge, min: 1, max: 5, invert: true, color: 'var(--orange-600)' },
  { key: 'condicionGeneral', label: 'Condición', icon: HeartPulse, min: 1, max: 5, invert: false, color: 'var(--red-600)' },
]

function HeroStat({ label, value, unit, sub }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 38, lineHeight: 1 }}>
        {value != null ? value.toFixed(1) : '—'}
        {value != null && <span style={{ fontSize: 16, opacity: 0.75, fontWeight: 600 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, opacity: 0.75, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function HeroCard({ icon: Icon, title, dateLabel, onPrevDate, onNextDate, canPrevDate, canNextDate, children }) {
  return (
    <div className="card hero-card">
      <div className="row spread" style={{ marginBottom: 16, position: 'relative' }}>
        <div className="row" style={{ gap: 8 }}>
          <Icon size={18} />
          <h4 style={{ margin: 0 }}>{title}</h4>
        </div>
        {dateLabel && (
          <div className="row" style={{ gap: 4 }}>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              style={{ color: '#fff', opacity: canPrevDate ? 1 : 0.35 }}
              onClick={onPrevDate}
              disabled={!canPrevDate}
              aria-label="Día anterior"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="hero-card__label" style={{ fontSize: 11.5, minWidth: 150, textAlign: 'center' }}>{dateLabel}</span>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              style={{ color: '#fff', opacity: canNextDate ? 1 : 0.35 }}
              onClick={onNextDate}
              disabled={!canNextDate}
              aria-label="Día siguiente"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
      <div className="row" style={{ gap: 32, position: 'relative' }}>{children}</div>
    </div>
  )
}

function MetricTrendCard({ metric, players }) {
  const trend = teamMetricTrend(players, metric.key)
  const last = trend[trend.length - 1]
  return (
    <div className="card">
      <div className="row spread" style={{ marginBottom: 10 }}>
        <div className="row" style={{ gap: 9 }}>
          <div className="icon-chip" style={{ '--chip-color': metric.color, width: 26, height: 26, borderRadius: 8 }}>
            <metric.icon size={14} />
          </div>
          <h4 style={{ margin: 0, fontSize: 13.5 }}>{metric.label}</h4>
        </div>
        <span style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 18, color: metric.color }}>
          {last ? last.avg.toFixed(1) : '—'}
        </span>
      </div>
      <TrendChart data={trend} color={metric.color} min={metric.min} max={metric.max} height={70} maxPoints={10} />
    </div>
  )
}

export default function BienestarView() {
  const [modo, setModo] = useState('general')
  const [equipoFilter, setEquipoFilter] = useState(null)
  const [selectedFecha, setSelectedFecha] = useState(null)

  const players = getPlayers()
  const equipos = [...new Set(players.map((p) => p.equipo).filter(Boolean))]
  const defaultEquipo = equipos.find((eq) => /juvenil/i.test(eq)) || equipos[0] || null
  const activeEquipo = equipoFilter && equipos.includes(equipoFilter) ? equipoFilter : defaultEquipo
  const equipoPlayers = activeEquipo ? players.filter((p) => p.equipo === activeEquipo) : players

  const dates = teamBienestarDates(equipoPlayers)
  // Si la fecha elegida ya no está en este equipo/filtro (o no se ha
  // elegido ninguna), cae siempre al último día con datos.
  let dateIndex = selectedFecha ? dates.indexOf(selectedFecha) : -1
  if (dateIndex === -1) dateIndex = dates.length - 1
  const currentFecha = dates[dateIndex] ?? null
  const canPrevDate = dateIndex > 0
  const canNextDate = dateIndex >= 0 && dateIndex < dates.length - 1
  const goPrevDate = () => canPrevDate && setSelectedFecha(dates[dateIndex - 1])
  const goNextDate = () => canNextDate && setSelectedFecha(dates[dateIndex + 1])

  const snap = teamWellnessSnapshot(equipoPlayers, currentFecha)

  if (dates.length === 0) {
    return (
      <div className="stack">
        <PageHeader icon={HeartPulse} title="Bienestar" hint="Wellness (pre-entreno) y RPE (post-entreno), mezclados y por separado." />
        {equipos.length > 1 && (
          <div className="chip-group">
            {equipos.map((eq) => (
              <button key={eq} type="button" className={`chip${activeEquipo === eq ? ' is-active' : ''}`} onClick={() => setEquipoFilter(eq)}>{eq}</button>
            ))}
          </div>
        )}
        <div className="empty-state">
          <HeartPulse size={32} />
          <h3>Sin respuestas todavía</h3>
          <p>En cuanto pegues respuestas del cuestionario desde Plantilla ("Pegar bienestar"), aquí aparecerán los dashboards.</p>
        </div>
      </div>
    )
  }

  const rpeTrend = teamMetricTrend(equipoPlayers, 'rpe')
  const wellnessTrend = teamMetricTrend(equipoPlayers, 'wellnessScore')
  const painLatest = teamPainBreakdown(equipoPlayers, { onlyLatest: true, fecha: currentFecha })

  return (
    <div className="stack">
      <PageHeader icon={HeartPulse} title="Bienestar" hint="Wellness (pre-entreno) y RPE (post-entreno), mezclados y por separado." />

      <div className="row spread" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="chip-group">
          {MODOS.map((m) => (
            <button key={m.id} type="button" className={`chip${modo === m.id ? ' is-active' : ''}`} onClick={() => setModo(m.id)}>{m.label}</button>
          ))}
        </div>
        {equipos.length > 1 && (
          <div className="chip-group">
            {equipos.map((eq) => (
              <button key={eq} type="button" className={`chip${activeEquipo === eq ? ' is-active' : ''}`} onClick={() => setEquipoFilter(eq)}>{eq}</button>
            ))}
          </div>
        )}
      </div>

      {modo === 'general' && (
        <div className="stack">
          <HeroCard
            icon={Flame}
            title="Foto del equipo"
            dateLabel={`${formatDateShort(parseISODate(snap.fecha))} · ${snap.responded}/${snap.total} respondieron`}
            onPrevDate={goPrevDate}
            onNextDate={goNextDate}
            canPrevDate={canPrevDate}
            canNextDate={canNextDate}
          >
            <HeroStat label="RPE medio" unit="/10" value={snap.rpeAvg} sub="Cuestionario RPE" />
            <HeroStat label="Bienestar general" unit="/5" value={snap.wellnessAvg} sub="Mezcla de los 6 indicadores Wellness" />
          </HeroCard>
          <div className="grid cols-2">
            <div className="card">
              <div className="row" style={{ gap: 9, marginBottom: 12 }}>
                <div className="icon-chip" style={{ '--chip-color': 'var(--red-600)' }}><Flame size={15} /></div>
                <h4 style={{ margin: 0, fontSize: 13.5 }}>RPE medio por día</h4>
              </div>
              <TrendChart data={rpeTrend} color="var(--red-600)" min={0} max={10} />
            </div>
            <div className="card">
              <div className="row" style={{ gap: 9, marginBottom: 12 }}>
                <div className="icon-chip" style={{ '--chip-color': 'var(--success-600)' }}><TrendingUp size={15} /></div>
                <h4 style={{ margin: 0, fontSize: 13.5 }}>Bienestar general por día</h4>
              </div>
              <TrendChart data={wellnessTrend} color="var(--success-600)" min={1} max={5} />
            </div>
          </div>
        </div>
      )}

      {modo === 'wellness' && (
        <div className="stack">
          <HeroCard
            icon={HeartPulse}
            title="Wellness — foto del equipo"
            dateLabel={`${formatDateShort(parseISODate(snap.fecha))} · ${snap.responded}/${snap.total} respondieron`}
            onPrevDate={goPrevDate}
            onNextDate={goNextDate}
            canPrevDate={canPrevDate}
            canNextDate={canNextDate}
          >
            <HeroStat label="Bienestar general" unit="/5" value={snap.wellnessAvg} />
          </HeroCard>
          <div className="dashboard-grid">
            {WELLNESS_METRICS.map((m) => (
              <MetricTrendCard key={m.key} metric={m} players={equipoPlayers} />
            ))}
          </div>
          <div className="card">
            <div className="row" style={{ gap: 9, marginBottom: 12 }}>
              <div className="icon-chip" style={{ '--chip-color': 'var(--danger-600)' }}><MapPin size={15} /></div>
              <h4 style={{ margin: 0, fontSize: 13.5 }}>Zonas de dolor reportadas ({formatDateShort(parseISODate(currentFecha))})</h4>
            </div>
            {painLatest.length === 0 ? (
              <p className="text-muted" style={{ fontSize: 12.5 }}>Nadie reportó dolor ese día.</p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {painLatest.map(({ zona, count }) => {
                  const max = painLatest[0].count
                  const pct = Math.round((count / max) * 100)
                  return (
                    <div key={zona} className="row" style={{ gap: 10 }}>
                      <span style={{ fontSize: 12.5, width: 130, flexShrink: 0 }}>{zona}</span>
                      <div className="leaderboard-bar-track" style={{ flex: 1 }}>
                        <div className="leaderboard-bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--danger-600), #e07a7a)' }} />
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, width: 18, textAlign: 'right' }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {modo === 'rpe' && (
        <div className="stack">
          <HeroCard
            icon={Flame}
            title="RPE — foto del equipo"
            dateLabel={`${formatDateShort(parseISODate(snap.fecha))} · ${snap.responded}/${snap.total} respondieron`}
            onPrevDate={goPrevDate}
            onNextDate={goNextDate}
            canPrevDate={canPrevDate}
            canNextDate={canNextDate}
          >
            <HeroStat label="RPE medio" unit="/10" value={snap.rpeAvg} />
          </HeroCard>
          <div className="card">
            <div className="row" style={{ gap: 9, marginBottom: 12 }}>
              <div className="icon-chip" style={{ '--chip-color': 'var(--red-600)' }}><Flame size={15} /></div>
              <h4 style={{ margin: 0, fontSize: 13.5 }}>RPE medio por día</h4>
            </div>
            <TrendChart data={rpeTrend} color="var(--red-600)" min={0} max={10} maxPoints={16} height={150} />
          </div>
        </div>
      )}
    </div>
  )
}
