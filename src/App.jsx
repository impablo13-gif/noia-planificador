import { useState } from 'react'
import { CalendarDays, Users, ShieldHalf, Sparkles, LayoutGrid, Bandage, BarChart3, ClipboardCheck, HeartPulse, Video, Compass, FolderKanban } from 'lucide-react'
import CalendarView from './components/CalendarView.jsx'
import RosterView from './components/RosterView.jsx'
import OpponentsView from './components/OpponentsView.jsx'
import AssistantView from './components/AssistantView.jsx'
import MesocicloView from './components/MesocicloView.jsx'
import InjuriesView from './components/InjuriesView.jsx'
import EstadisticasView from './components/EstadisticasView.jsx'
import AsistenciaView from './components/AsistenciaView.jsx'
import BienestarView from './components/BienestarView.jsx'
import AnalisisView from './components/AnalisisView.jsx'
import ModeloJuegoView from './components/ModeloJuegoView.jsx'
import PlaybookView from './components/PlaybookView.jsx'
import ClubCrest from './components/ClubCrest.jsx'
import BackupControls from './components/BackupControls.jsx'
import { seedIfNeeded } from './seedData.js'

const TABS = [
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'plantilla', label: 'Plantilla', icon: Users },
  { id: 'asistencia', label: 'Asistencia', icon: ClipboardCheck },
  { id: 'bienestar', label: 'Bienestar', icon: HeartPulse },
  { id: 'lesiones', label: 'Lesiones', icon: Bandage },
  { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { id: 'analisis', label: 'Análisis', icon: Video },
  { id: 'rivales', label: 'Rivales', icon: ShieldHalf },
  { id: 'modelo', label: 'Modelo de juego', icon: Compass },
  { id: 'playbook', label: 'Playbook', icon: FolderKanban },
  { id: 'mesociclos', label: 'Mesociclos', icon: LayoutGrid },
  { id: 'asistente', label: 'Asistente', icon: Sparkles },
]

export default function App() {
  // Lazy initializer: corre de forma síncrona en el primer render, antes de
  // montar CalendarView, para que su primera lectura de datos ya encuentre
  // la semilla escrita (evita la carrera con useEffect, que corre después).
  useState(() => {
    seedIfNeeded()
    return true
  })
  const [tab, setTab] = useState('calendario')
  const [focusOpponentId, setFocusOpponentId] = useState(null)
  const [focusAnalisisProyectoId, setFocusAnalisisProyectoId] = useState(null)

  function goToOpponent(opponentId) {
    setFocusOpponentId(opponentId)
    setTab('rivales')
  }

  function goToAnalisis(proyectoId) {
    setFocusAnalisisProyectoId(proyectoId)
    setTab('analisis')
  }

  return (
    <>
      <header className="app-header">
        <div className="app-header__top">
          <div className="app-header__brand">
            <ClubCrest />
            <div>
              <div className="app-header__title">Segundo Cerebro</div>
              <div className="app-header__subtitle">Noia Portus Apostoli FS · Juvenil DH · 26-27</div>
            </div>
          </div>
          <BackupControls />
        </div>
        <nav className="tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`tab${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {tab === 'calendario' && <CalendarView onGoToRival={goToOpponent} />}
        {tab === 'plantilla' && <RosterView />}
        {tab === 'asistencia' && <AsistenciaView />}
        {tab === 'bienestar' && <BienestarView />}
        {tab === 'lesiones' && <InjuriesView />}
        {tab === 'estadisticas' && <EstadisticasView />}
        {tab === 'analisis' && (
          <AnalisisView initialProyectoId={focusAnalisisProyectoId} onConsumeInitial={() => setFocusAnalisisProyectoId(null)} />
        )}
        {tab === 'rivales' && (
          <OpponentsView
            initialOpponentId={focusOpponentId}
            onConsumeInitial={() => setFocusOpponentId(null)}
            onGoToAnalisis={goToAnalisis}
          />
        )}
        {tab === 'modelo' && <ModeloJuegoView />}
        {tab === 'playbook' && <PlaybookView />}
        {tab === 'mesociclos' && <MesocicloView />}
        {tab === 'asistente' && <AssistantView />}
      </main>
    </>
  )
}
