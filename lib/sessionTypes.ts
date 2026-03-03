// ============================================
// YOROI - TYPES DE SEANCES PAR SPORT
// ============================================

export interface SessionTypeConfig {
  sport: string;
  types: string[];
}

// Types de séances par catégorie de sport
export const SESSION_TYPES_BY_SPORT: Record<string, string[]> = {
  // === SPORTS DE COMBAT (JJB, MMA, etc.) ===
  jjb: ['Cours', 'Sparring', 'Drilling', 'Open Mat', 'Compétition', 'Privé'],
  mma: ['Cours', 'Sparring', 'Drilling', 'Pads', 'Compétition', 'Privé'],
  boxe: ['Cours', 'Sparring', 'Shadow', 'Pads', 'Sac', 'Compétition'],
  kickboxing: ['Cours', 'Sparring', 'Pads', 'Sac', 'Compétition'],
  muay_thai: ['Cours', 'Sparring', 'Pads', 'Clinch', 'Sac', 'Compétition'],
  lutte: ['Cours', 'Sparring', 'Drilling', 'Compétition'],
  judo: ['Cours', 'Randori', 'Nage-komi', 'Uchi-komi', 'Compétition'],
  karate: ['Cours', 'Kumite', 'Kata', 'Kihon', 'Compétition'],
  taekwondo: ['Cours', 'Combat', 'Poomsae', 'Compétition'],
  sambo: ['Cours', 'Combat', 'Drilling', 'Compétition'],
  grappling: ['Cours', 'Sparring', 'Drilling', 'Compétition'],
  catch: ['Cours', 'Sparring', 'Drilling'],
  boxe_francaise: ['Cours', 'Assaut', 'Pads', 'Sac'],
  krav_maga: ['Cours', 'Sparring', 'Techniques', 'Self-defense'],

  // === FITNESS / MUSCULATION ===
  musculation: [
    'Séance libre',
    'Poussée',
    'Tirage',
    'Jambes',
    'Corps complet',
    'Haut du corps',
    'Bas du corps',
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
  crossfit: ['WOD', 'Open Gym', 'Technique', 'Competition'],
  hiit: ['Séance', 'Tabata', 'AMRAP', 'EMOM'],
  yoga: ['Cours', 'Flow', 'Yin', 'Power', 'Hot Yoga'],
  pilates: ['Cours', 'Mat', 'Reformer'],
  corde_a_sauter: ['Entraînement', 'Technique', 'Endurance'],
  stretching: ['Séance', 'Récupération', 'Mobilité'],

  // === ENDURANCE ===
  running: ['Footing', 'Fractionné', 'Tempo', 'Sortie longue', 'Trail', 'Course'],
  natation: ['Entraînement', 'Technique', 'Endurance', 'Sprints'],
  velo: ['Sortie', 'Entraînement', 'VTT', 'Indoor'],
  marche: ['Marche', 'Randonnée', 'Nordic Walking'],
  rameur: ['Entraînement', 'Technique', 'Endurance'],

  // === SPORTS COLLECTIFS ===
  football: ['Match', 'Entraînement', 'Foot à 5', 'Futsal'],
  basketball: ['Match', 'Entraînement', '3x3'],
  rugby: ['Match', 'Entraînement', 'Touch'],
  handball: ['Match', 'Entraînement'],
  volleyball: ['Match', 'Entraînement', 'Beach'],

  // === RAQUETTES ===
  padel: ['Match', 'Entraînement', 'Cours', 'Tournoi'],
  tennis: ['Match', 'Entraînement', 'Cours', 'Tournoi'],
  badminton: ['Match', 'Entraînement', 'Double'],

  // === AUTRE ===
  escalade: ['Séance', 'Bloc', 'Voie', 'Outdoor'],
  danse: ['Cours', 'Chorégraphie', 'Freestyle'],
  autre: ['Séance', 'Entraînement', 'Cours', 'Match'],
};

// Types de séances génériques (fallback)
export const DEFAULT_SESSION_TYPES = ['Séance', 'Entraînement', 'Cours', 'Match', 'Compétition'];

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
  return types[0] || 'Séance';
};

export default {
  SESSION_TYPES_BY_SPORT,
  DEFAULT_SESSION_TYPES,
  DURATION_PRESETS,
  getSessionTypesForSport,
  getDefaultSessionType,
};
