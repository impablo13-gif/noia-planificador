import { isSeeded, markSeeded, saveOpponents, saveMatches, savePreseasonTrainings } from './db.js'

// Datos reales extraídos de "Proyecto Temporada 26-27" (carpeta de Pablo):
//  - DHJ G1.pdf: calendario oficial RFEF, División de Honor Juvenil Fútbol Sala Grupo 1, 2026-2027
//  - PRETEMPORADA.xlsx: mesociclo/microciclos de pretemporada
// Se usan solo para precargar la app la primera vez; todo queda editable después.

export const HOME_VENUE = {
  nombre: 'Pab. Alonso Rodríguez',
  direccion: 'Rúa Calzada Nº 2, 15200, Noia (A Coruña)',
}

export const OPPONENTS_SEED = [
  {
    id: '5-coruna',
    name: '5 Coruña F.S.',
    contacto: 'Medín Figueroa, Óscar',
    pabellon: 'P.M. Novo Mesoiro - Polideportivo',
    direccion: 'Rúa Os Ancares Nº s/n, 15190, A Coruña',
    telefono: '— (fax 981135232)',
    kit1: 'Camiseta, pantalón y medias lisos en rojo',
    kit2: 'Camiseta, pantalón y medias lisos en blanco',
  },
  {
    id: 'agrocesa-salamanca',
    name: 'Agrocesa Crianza Ibérica F.S. Salamanca',
    contacto: 'De La Fuente Marchante, Silvia',
    pabellon: 'Pab. La Alamedilla - Polideportivo',
    direccion: 'Parque La Alamedilla Nº s/n, 37006, Salamanca',
    telefono: '923282033 (fax 923225171)',
    kit1: 'Camiseta y pantalón lisos en negro',
    kit2: 'Camiseta y pantalón lisos en rojo',
  },
  {
    id: 'inter-sala-adarsa',
    name: 'C.D. Inter Sala Adarsa Mercedes',
    contacto: '—',
    pabellon: 'Pab. La Alamedilla - Polideportivo (Salamanca)',
    direccion: 'Parque La Alamedilla Nº s/n, 37006, Salamanca',
    telefono: '601379053',
    kit1: 'Camiseta y pantalón lisos en negro',
    kit2: 'Camiseta lisa magenta/rosa',
  },
  {
    id: 'san-cristobal-tabladillo',
    name: 'C.D. San Cristobal Cochinillo Tabladillo',
    contacto: 'Cáceres Santos, Luis María',
    pabellon: 'P.M. San Cristóbal - Pista',
    direccion: 'Calle San Cristóbal de Segovia, 40197, San Cristóbal de Segovia',
    telefono: '608-107451',
    kit1: 'Camiseta y pantalón lisos en azul',
    kit2: 'Medias azules',
  },
  {
    id: 'carballino',
    name: 'Carballiño F.S.',
    contacto: 'Juan Carlos Ferro',
    pabellon: 'Pabellón Municipal Paco Chao Carballiño - Pista',
    direccion: 'Rua do Monte do Moucho, 32500, Carballiño (Ourense)',
    telefono: '609872901',
    kit1: 'Camiseta azul con franja diagonal izquierda, pantalón azul, medias blancas',
    kit2: 'Camiseta, pantalón y medias amarillos',
  },
  {
    id: 'guardo',
    name: 'Guardo FS "A"',
    contacto: 'José Manuel Díaz Poza',
    pabellon: '—',
    direccion: 'Guardo (Palencia)',
    telefono: '616746907',
    kit1: 'Camiseta, pantalón y medias lisos en negro',
    kit2: 'Sin datos',
  },
  {
    id: 'coruxo',
    name: 'I.E.S. Coruxo F.S. "A"',
    contacto: 'Pablo Torras Martínez',
    pabellon: '—',
    direccion: 'Desconocido',
    telefono: '697155055',
    kit1: 'Camiseta lisa roja',
    kit2: 'Camiseta lisa verde, pantalón y medias negros',
  },
  {
    id: 'lugo-acasti',
    name: 'Lugo Sala Acasti Reformas',
    contacto: 'Martínez González, Manuel',
    pabellon: 'Pabellón Municipal de Lugo - Polideportivo',
    direccion: 'Calle Santiago Nº s/n, 27002, Lugo',
    telefono: '—',
    kit1: 'Camiseta de rayas anchas rojas, pantalón azul, medias rojas',
    kit2: 'Camiseta lisa, pantalón y medias amarillos',
  },
  {
    id: 'o-parrulo',
    name: 'O Parrulo F.S.',
    contacto: 'Martínez Martínez, Julio',
    pabellon: "P.M. A'Malata - Polideportivo",
    direccion: "Ctra. A'Malata Nº S/N, 15591, Ferrol",
    telefono: '—',
    kit1: 'Camiseta, pantalón y medias lisos en blanco',
    kit2: 'Camiseta, pantalón y medias lisos en negro',
  },
  {
    id: 'redondela-rodavigo',
    name: 'Redondela F.S. Rodavigo',
    contacto: 'Luis Manuel González',
    pabellon: 'Pabellón A Marisma - Pista',
    direccion: 'Avda. Mendiño nº 34, 36693, Redondela (Pontevedra)',
    telefono: '—',
    kit1: 'Pantalón y medias azules',
    kit2: 'Sin datos',
  },
  {
    id: 'sibuscascoche-ribeira',
    name: 'Sibuscascoche Ribeira Fútbol Sala',
    contacto: '—',
    pabellon: 'Pabellón Municipal de Lugo - Polideportivo',
    direccion: 'Calle Santiago Nº s/n, 27002, Lugo',
    telefono: '—',
    kit1: 'Sin datos',
    kit2: 'Sin datos',
  },
  {
    id: 'trepalio-leon',
    name: 'Trepalio León Sala',
    contacto: 'Aguilera Moreno, Alberto',
    pabellon: 'P.M. Hispánico - Polideportivo',
    direccion: 'Calle Gil de Villasinta, 24005, León',
    telefono: '686545854',
    kit1: 'Pantalón azul marino',
    kit2: 'Camiseta, pantalón y medias azules',
  },
  {
    id: 'troula-betanzos',
    name: 'Troula Betanzos F.S.',
    contacto: '—',
    pabellon: '—',
    direccion: 'Desconocido',
    telefono: '—',
    kit1: 'Sin datos',
    kit2: 'Sin datos',
  },
  {
    id: 'valladolid-sport',
    name: 'Valladolid Sport Sala "A"',
    contacto: 'Rodrigo Cid León',
    pabellon: 'Pabellón Victorine Le Dieu - Pista',
    direccion: 'C/ Sayago, s/n, 47008, Valladolid',
    telefono: '600279196',
    kit1: 'Camiseta y medias azules',
    kit2: 'Camiseta rosa, pantalón azul marino',
  },
  {
    id: 'valladolid-tierno-galvan',
    name: 'Valladolid Tierno Galván AGROCESA',
    contacto: '—',
    pabellon: 'P.M. Lalo García - Polideportivo',
    direccion: 'Calle Enrique Cubero Nº 7, 47014, Valladolid',
    telefono: '983 344567 (fax 983344567)',
    kit1: 'Sin datos',
    kit2: 'Pantalón y medias azul marino',
  },
]

function scoutingDefaults() {
  return {
    resumen: '',
    sistemaJuego: '',
    jugadoresClave: '',
    puntosFuertes: '',
    puntosDebiles: '',
    abp: '',
    notasLibres: '',
    highlights: [],
  }
}

export function buildOpponentsSeed() {
  return OPPONENTS_SEED.map((o) => ({ ...o, shieldFileId: null, scouting: scoutingDefaults() }))
}

// Liga: División de Honor Juvenil F.S. Grupo 1, temporada 2026-2027 (30 jornadas)
export const MATCHES_SEED = [
  { jornada: 1, date: '2026-09-19', opponentId: 'o-parrulo', isHome: false },
  { jornada: 2, date: '2026-09-26', opponentId: 'sibuscascoche-ribeira', isHome: true },
  { jornada: 3, date: '2026-10-03', opponentId: 'troula-betanzos', isHome: false },
  { jornada: 4, date: '2026-10-10', opponentId: '5-coruna', isHome: true },
  { jornada: 5, date: '2026-10-17', opponentId: 'inter-sala-adarsa', isHome: false },
  { jornada: 6, date: '2026-10-24', opponentId: 'carballino', isHome: true },
  { jornada: 7, date: '2026-10-31', opponentId: 'coruxo', isHome: false },
  { jornada: 8, date: '2026-11-07', opponentId: 'valladolid-tierno-galvan', isHome: true },
  { jornada: 9, date: '2026-11-14', opponentId: 'redondela-rodavigo', isHome: true },
  { jornada: 10, date: '2026-11-21', opponentId: 'trepalio-leon', isHome: false },
  { jornada: 11, date: '2026-11-28', opponentId: 'valladolid-sport', isHome: true },
  { jornada: 12, date: '2026-12-05', opponentId: 'agrocesa-salamanca', isHome: false },
  { jornada: 13, date: '2026-12-12', opponentId: 'san-cristobal-tabladillo', isHome: true },
  { jornada: 14, date: '2026-12-19', opponentId: 'guardo', isHome: false },
  { jornada: 15, date: '2027-01-09', opponentId: 'lugo-acasti', isHome: true },
  { jornada: 16, date: '2027-01-23', opponentId: 'o-parrulo', isHome: true },
  { jornada: 17, date: '2027-01-30', opponentId: 'sibuscascoche-ribeira', isHome: false },
  { jornada: 18, date: '2027-02-06', opponentId: 'troula-betanzos', isHome: true },
  { jornada: 19, date: '2027-02-13', opponentId: '5-coruna', isHome: false },
  { jornada: 20, date: '2027-02-20', opponentId: 'inter-sala-adarsa', isHome: true },
  { jornada: 21, date: '2027-02-27', opponentId: 'carballino', isHome: false },
  { jornada: 22, date: '2027-03-06', opponentId: 'coruxo', isHome: true },
  { jornada: 23, date: '2027-03-20', opponentId: 'valladolid-tierno-galvan', isHome: false },
  { jornada: 24, date: '2027-04-10', opponentId: 'redondela-rodavigo', isHome: false },
  { jornada: 25, date: '2027-04-17', opponentId: 'trepalio-leon', isHome: true },
  { jornada: 26, date: '2027-04-24', opponentId: 'valladolid-sport', isHome: false },
  { jornada: 27, date: '2027-05-01', opponentId: 'agrocesa-salamanca', isHome: true },
  { jornada: 28, date: '2027-05-08', opponentId: 'san-cristobal-tabladillo', isHome: false },
  { jornada: 29, date: '2027-05-15', opponentId: 'guardo', isHome: true },
  { jornada: 30, date: '2027-05-22', opponentId: 'lugo-acasti', isHome: false },
]

export function buildMatchesSeed() {
  return MATCHES_SEED.map((m) => ({
    id: `liga-j${m.jornada}`,
    competition: 'Liga',
    vuelta: m.jornada <= 15 ? '1ª Vuelta' : '2ª Vuelta',
    equipo: 'Juvenil División de Honor',
    time: '',
    superficie: '',
    observaciones: '',
    resultText: '',
    reportText: '',
    reportFileId: null,
    npaMatchId: null,
    status: 'pendiente',
    ...m,
  }))
}

// Pretemporada: Mesociclo (10-ago a 13-sep-2026). Semanas 1 y 2 con horario ya
// confirmado en las hojas "Microciclo 1"/"Microciclo 2"; semanas 3-5 con el
// patrón genérico del Mesociclo (Pablo aún no había subido el microciclo
// actualizado de esas semanas cuando se creó la app).
export const PRESEASON_TRAININGS_SEED = [
  // Semana 1 (10-16 agosto) — Microciclo 1
  { date: '2026-08-10', time: '16:30', label: 'Presentación + TAC-TEC' },
  { date: '2026-08-11', time: '19:00', label: 'FUERZA + TAC-TEC' },
  { date: '2026-08-13', time: '19:00', label: 'TAC-TEC' },
  // Semana 2 (17-23 agosto) — Microciclo 2
  { date: '2026-08-17', time: '19:00', label: 'FUERZA + TAC-TEC' },
  { date: '2026-08-19', time: '16:00', label: 'TAC-TEC' },
  { date: '2026-08-20', time: '19:00', label: 'FUERZA + TAC-TEC' },
  // Semana 3 (24-30 agosto) — patrón genérico Mesociclo
  { date: '2026-08-24', time: '19:00', label: 'FUERZA + TAC-TEC' },
  { date: '2026-08-25', time: '19:00', label: 'TAC-TEC' },
  { date: '2026-08-27', time: '19:00', label: 'FUERZA + TAC-TEC' },
  // Semana 4 (31 agosto-6 septiembre) — patrón genérico Mesociclo
  { date: '2026-08-31', time: '19:00', label: 'TAC-TEC' },
  { date: '2026-09-01', time: '19:00', label: 'FUERZA + TAC-TEC' },
  { date: '2026-09-03', time: '19:00', label: 'TAC-TEC' },
  // Semana 5 (7-13 septiembre) — patrón genérico Mesociclo (última antes de liga)
  { date: '2026-09-07', time: '19:00', label: 'TAC-TEC' },
  { date: '2026-09-08', time: '19:00', label: 'FUERZA + TAC-TEC' },
  { date: '2026-09-10', time: '19:00', label: 'FUERZA + TAC-TEC' },
  { date: '2026-09-11', time: '19:00', label: 'TAC-TEC' },
]

export function buildPreseasonTrainingsSeed() {
  return PRESEASON_TRAININGS_SEED.map((t) => ({
    id: `pre-${t.date}`,
    status: 'pendiente',
    sessionText: '',
    sessionFileId: null,
    ...t,
  }))
}

// Detectado en Microciclo 2 (Sábado 22-08, hora 16:00, sin rival anotado):
// probable amistoso de pretemporada aún por confirmar — se añade como partido
// editable para que Pablo lo complete o lo borre.
export function buildPreseasonFriendlySeed() {
  return [
    {
      id: 'amistoso-2026-08-22',
      competition: 'Amistoso',
      equipo: 'Juvenil División de Honor',
      date: '2026-08-22',
      time: '16:00',
      superficie: '',
      observaciones: '',
      opponentId: null,
      isHome: null,
      resultText: '',
      reportText: '',
      reportFileId: null,
      npaMatchId: null,
      status: 'por confirmar',
    },
  ]
}

export function seedIfNeeded() {
  if (isSeeded()) return
  saveOpponents(buildOpponentsSeed())
  saveMatches([...buildMatchesSeed(), ...buildPreseasonFriendlySeed()])
  savePreseasonTrainings(buildPreseasonTrainingsSeed())
  markSeeded()
}
