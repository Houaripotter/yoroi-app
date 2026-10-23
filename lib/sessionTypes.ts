// ============================================
// YOROI - TYPES DE SÉANCES PAR SPORT
// ============================================
import { traduire } from '@/lib/i18n/tr';

export interface SessionTypeConfig {
  sport: string;
  types: string[];
}

// Types de séances par catégorie de sport
export const SESSION_TYPES_BY_SPORT: Record<string, string[]> = {
  // === SPORTS DE COMBAT (JJB, MMA, etc.) ===
  jjb: ['Cours', 'Sparring', 'Drilling', 'Open Mat', traduire('Compétition'), traduire('Privé')],
  mma: ['Cours', 'Sparring', 'Drilling', 'Pads', traduire('Compétition'), traduire('Privé')],
  boxe: ['Cours', 'Sparring', 'Shadow', 'Pads', 'Sac', traduire('Compétition')],
  kickboxing: ['Cours', 'Sparring', 'Pads', 'Sac', traduire('Compétition')],
  muay_thai: ['Cours', 'Sparring', 'Pads', 'Clinch', 'Sac', traduire('Compétition')],
  lutte: ['Cours', 'Sparring', 'Drilling', traduire('Compétition')],
  judo: ['Cours', 'Randori', 'Nage-komi', 'Uchi-komi', traduire('Compétition')],
  karate: ['Cours', 'Kumite', 'Kata', 'Kihon', traduire('Compétition')],
  taekwondo: ['Cours', traduire('Combat'), 'Poomsae', traduire('Compétition')],
  sambo: ['Cours', traduire('Combat'), 'Drilling', traduire('Compétition')],
  grappling: ['Cours', 'Sparring', 'Drilling', traduire('Compétition')],
  catch: ['Cours', 'Sparring', 'Drilling'],
  boxe_francaise: ['Cours', 'Assaut', 'Pads', 'Sac'],
  krav_maga: ['Cours', 'Sparring', 'Techniques', 'Self-defense'],

  // === FITNESS / MUSCULATION ===
  musculation: [
    traduire('Séance libre'),
    traduire('Poussée'),
    'Tirage',
    'Jambes',
    'Corps complet',
    traduire('Haut du corps'),
    traduire('Bas du corps'),
    'PPL',
    'Circuit',
    // Groupes musculaires spécifiques
    'Pectoraux',
    'Dos',
    'Épaules',
    'Bras',
    'Biceps',
    'Triceps',
    'Fessiers',
    'Abdominaux',
    'Mollets',
    'Cardio',
  ],
  crossfit: ['WOD', 'Open Gym', traduire('Technique'), 'Competition'],
  hiit: [traduire('Séance'), 'Tabata', 'AMRAP', 'EMOM'],
  yoga: ['Cours', 'Flow', 'Yin', 'Power', 'Hot Yoga'],
  pilates: ['Cours', 'Mat', 'Reformer'],
  corde_a_sauter: ['Entraînement', traduire('Technique'), 'Endurance'],
  stretching: [traduire('Séance'), traduire('Récupération'), traduire('Mobilité')],

  // === ENDURANCE ===
  running: ['Footing', traduire('Fractionné'), 'Tempo', 'Sortie longue', 'Trail', 'Course'],
  natation: ['Entraînement', traduire('Technique'), 'Endurance', 'Sprints'],
  velo: ['Sortie', 'Entraînement', 'VTT', 'Indoor'],
  marche: ['Marche', traduire('Randonnée'), 'Nordic Walking'],
  rameur: ['Entraînement', traduire('Technique'), 'Endurance'],

  // === SPORTS COLLECTIFS ===
  football: ['Match', 'Entraînement', traduire('Foot à 5'), 'Futsal'],
  basketball: ['Match', 'Entraînement', '3x3'],
  rugby: ['Match', 'Entraînement', 'Touch'],
  handball: ['Match', 'Entraînement'],
  volleyball: ['Match', 'Entraînement', 'Beach'],

  // === RAQUETTES ===
  padel: ['Match', 'Entraînement', 'Cours', 'Tournoi'],
  tennis: ['Match', 'Entraînement', 'Cours', 'Tournoi'],
  badminton: ['Match', 'Entraînement', 'Double'],

  // === AUTRE ===
  escalade: [traduire('Séance'), 'Bloc', 'Voie', 'Outdoor'],
  danse: ['Cours', traduire('Chorégraphie'), 'Freestyle'],
  autre: [traduire('Séance'), 'Entraînement', 'Cours', 'Match'],
};

// Types de séances génériques (fallback)
export const DEFAULT_SESSION_TYPES = [traduire('Séance'), 'Entraînement', 'Cours', 'Match', traduire('Compétition')];

// Durées prédéfinies (en minutes)
export const DURATION_PRESETS = [
  { label: '30min', value: 30 },
  { label: '45min', value: 45 },
  { label: '1h', value: 60 },
  { label: '1h15', value: 75 },
  { label: '1h30', value: 90 },
  { label: '2h', value: 120 },
];

// Obtenir les types de séances pour un sport donné
export const getSessionTypesForSport = (sport: string): string[] => {
  const sportLower = sport.toLowerCase().replace(/\s+/g, '_');
  return SESSION_TYPES_BY_SPORT[sportLower] || DEFAULT_SESSION_TYPES;
};

// Obtenir le premier type de séance (défaut)
export const getDefaultSessionType = (sport: string): string => {
  const types = getSessionTypesForSport(sport);
  return types[0] || traduire('Séance');
};

export default {
  SESSION_TYPES_BY_SPORT,
  DEFAULT_SESSION_TYPES,
  DURATION_PRESETS,
  getSessionTypesForSport,
  getDefaultSessionType,
};
