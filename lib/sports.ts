// ============================================
// YOROI - SYSTEME DE SPORTS
// ============================================

// Pour les icônes, on utilise MaterialCommunityIcons d'Expo (40,000+ icônes)
// Les noms des icônes sont stockés comme strings
// Exemple: 'karate', 'boxing-glove', 'arm-flex', etc.

export interface Sport {
  id: string;
  name: string;
  icon: string; // Nom de l'icône MaterialCommunityIcons (ex: 'karate', 'boxing-glove')
  color: string;
  category: 'combat_striking' | 'combat_grappling' | 'fitness' | 'cardio' | 'collectif' | 'raquettes' | 'autre';
  muscles?: string[];
}

export const SPORTS: Sport[] = [
  // === SPORTS DE COMBAT - STRIKING ===
  {
    id: 'mma',
    name: 'MMA',
    icon: 'mixed-martial-arts',
    color: '#F97316',
    category: 'combat_striking',
  },
  {
    id: 'boxe',
    name: 'Boxe Anglaise',
    icon: 'boxing-glove',
    color: '#DC2626',
    category: 'combat_striking',
  },
  {
    id: 'kickboxing',
    name: 'Kickboxing',
    icon: 'foot-print',
    color: '#DD6B20',
    category: 'combat_striking',
  },
  {
    id: 'muay_thai',
    name: 'Muay Thai',
    icon: 'human-handsdown',
    color: '#9B2C2C',
    category: 'combat_striking',
  },
  {
    id: 'karate',
    name: 'Karate',
    icon: 'karate',
    color: '#F7FAFC',
    category: 'combat_striking',
  },
  {
    id: 'taekwondo',
    name: 'Taekwondo',
    icon: 'karate', // Coup de pied haut
    color: '#3182CE',
    category: 'combat_striking',
  },
  {
    id: 'boxe_francaise',
    name: 'Boxe Francaise',
    icon: 'shoe-sneaker',
    color: '#3B82F6',
    category: 'combat_striking',
  },
  {
    id: 'krav_maga',
    name: 'Krav Maga',
    icon: 'shield-sword',
    color: '#1F2937',
    category: 'combat_striking',
  },

  // === SPORTS DE COMBAT - GRAPPLING ===
  {
    id: 'jjb',
    name: 'JJB',
    icon: 'human-handsdown', // Grappling/Combat au sol
    color: '#EF4444',
    category: 'combat_grappling',
  },
  {
    id: 'judo',
    name: 'Judo',
    icon: 'human-greeting-variant',
    color: '#F7FAFC',
    category: 'combat_grappling',
  },
  {
    id: 'lutte',
    name: 'Lutte',
    icon: 'wrestling',
    color: '#E53E3E',
    category: 'combat_grappling',
  },
  {
    id: 'grappling',
    name: 'Grappling',
    icon: 'human-greeting-proximity',
    color: '#805AD5',
    category: 'combat_grappling',
  },
  {
    id: 'sambo',
    name: 'Sambo',
    icon: 'human-handsup',
    color: '#C53030',
    category: 'combat_grappling',
  },
  {
    id: 'catch',
    name: 'Catch',
    icon: 'wrestling',
    color: '#D69E2E',
    category: 'combat_grappling',
  },

  // === FITNESS / MUSCULATION ===
  {
    id: 'musculation',
    name: 'Musculation',
    icon: 'dumbbell',
    color: '#3B82F6',
    category: 'fitness',
    muscles: ['pectoraux', 'dos', 'epaules', 'biceps', 'triceps', 'abdos', 'jambes', 'mollets'],
  },
  {
    id: 'crossfit',
    name: 'CrossFit',
    icon: 'weight-lifter',
    color: '#ED8936',
    category: 'fitness',
  },
  {
    id: 'hiit',
    name: 'HIIT',
    icon: 'flash',
    color: '#ECC94B',
    category: 'fitness',
  },
  {
    id: 'yoga',
    name: 'Yoga',
    icon: 'yoga',
    color: '#48BB78',
    category: 'fitness',
  },
  {
    id: 'pilates',
    name: 'Pilates',
    icon: 'meditation',
    color: '#EC4899',
    category: 'fitness',
  },
  {
    id: 'stretching',
    name: 'Stretching',
    icon: 'human-handsup',
    color: '#8B5CF6',
    category: 'fitness',
  },

  // === CARDIO ===
  {
    id: 'running',
    name: 'Running',
    icon: 'run',
    color: '#38A169',
    category: 'cardio',
  },
  {
    id: 'natation',
    name: 'Natation',
    icon: 'swim',
    color: '#4299E1',
    category: 'cardio',
  },
  {
    id: 'velo',
    name: 'Velo',
    icon: 'bike',
    color: '#2B6CB0',
    category: 'cardio',
  },
  {
    id: 'marche',
    name: 'Marche',
    icon: 'walk',
    color: '#10B981',
    category: 'cardio',
  },
  {
    id: 'rameur',
    name: 'Rameur',
    icon: 'rowing',
    color: '#0891B2',
    category: 'cardio',
  },
  {
    id: 'corde_a_sauter',
    name: 'Corde a sauter',
    icon: 'jump-rope',
    color: '#ED64A6',
    category: 'cardio',
  },

  // === SPORTS COLLECTIFS ===
  {
    id: 'football',
    name: 'Football',
    icon: 'soccer',
    color: '#10B981',
    category: 'collectif',
  },
  {
    id: 'basketball',
    name: 'Basketball',
    icon: 'basketball',
    color: '#F97316',
    category: 'collectif',
  },
  {
    id: 'rugby',
    name: 'Rugby',
    icon: 'rugby',
    color: '#15803D',
    category: 'collectif',
  },
  {
    id: 'handball',
    name: 'Handball',
    icon: 'handball',
    color: '#2563EB',
    category: 'collectif',
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    icon: 'volleyball',
    color: '#FBBF24',
    category: 'collectif',
  },

  // === RAQUETTES ===
  {
    id: 'padel',
    name: 'Padel',
    icon: 'racquetball',
    color: '#FBBF24',
    category: 'raquettes',
  },
  {
    id: 'tennis',
    name: 'Tennis',
    icon: 'tennis',
    color: '#84CC16',
    category: 'raquettes',
  },
  {
    id: 'badminton',
    name: 'Badminton',
    icon: 'badminton',
    color: '#06B6D4',
    category: 'raquettes',
  },

  // === AUTRE ===
  {
    id: 'escalade',
    name: 'Escalade',
    icon: 'climbing',
    color: '#78716C',
    category: 'autre',
  },
  {
    id: 'danse',
    name: 'Danse',
    icon: 'dance-ballroom',
    color: '#EC4899',
    category: 'autre',
  },
  {
    id: 'autre',
    name: 'Autre',
    icon: 'trophy',
    color: '#6B7280',
    category: 'autre',
  },
];

// Sports de combat uniquement (pour le chrono)
export const COMBAT_SPORTS = SPORTS.filter(s => s.category === 'combat_striking' || s.category === 'combat_grappling');

// Sports par categorie
export const SPORTS_BY_CATEGORY = {
  combat_striking: SPORTS.filter(s => s.category === 'combat_striking'),
  combat_grappling: SPORTS.filter(s => s.category === 'combat_grappling'),
  fitness: SPORTS.filter(s => s.category === 'fitness'),
  cardio: SPORTS.filter(s => s.category === 'cardio'),
  collectif: SPORTS.filter(s => s.category === 'collectif'),
  raquettes: SPORTS.filter(s => s.category === 'raquettes'),
  autre: SPORTS.filter(s => s.category === 'autre'),
};

// Labels français pour les catégories
export const CATEGORY_LABELS: Record<string, string> = {
  combat_striking: '🥊 Sports de Combat - Striking',
  combat_grappling: '🥋 Sports de Combat - Grappling',
  fitness: '🏋️ Fitness & Musculation',
  cardio: '🏃 Cardio',
  collectif: '⚽ Sports Collectifs',
  raquettes: '🎾 Sports de Raquette',
  autre: '🎯 Autres',
};

export interface Muscle {
  id: string;
  name: string;
  icon: string; // Nom de l'icône MaterialCommunityIcons
}

export const MUSCLES: Muscle[] = [
  { id: 'pectoraux', name: 'Pectoraux', icon: 'human-male' },
  { id: 'dos', name: 'Dos', icon: 'human-male' },
  { id: 'epaules', name: 'Epaules', icon: 'arm-flex' },
  { id: 'biceps', name: 'Biceps', icon: 'arm-flex' },
  { id: 'triceps', name: 'Triceps', icon: 'arm-flex' },
  { id: 'abdos', name: 'Abdos', icon: 'Human-male' },
  { id: 'jambes', name: 'Jambes', icon: 'human-handsdown' },
  { id: 'mollets', name: 'Mollets', icon: 'foot-print' },
  { id: 'avant_bras', name: 'Avant-bras', icon: 'arm-flex' },
  { id: 'fessiers', name: 'Fessiers', icon: 'human-handsdown' },
];

export const getSportById = (id: string): Sport | undefined => {
  return SPORTS.find(s => s.id === id);
};

export const getSportColor = (id: string): string => {
  return getSportById(id)?.color || '#6B7280';
};

export const getSportIcon = (id: string): string => {
  return getSportById(id)?.icon || 'trophy';
};

export const getSportName = (id: string): string => {
  return getSportById(id)?.name || 'Autre';
};

export const getSportCategory = (id: string): string => {
  return getSportById(id)?.category || 'autre';
};

export default SPORTS;
