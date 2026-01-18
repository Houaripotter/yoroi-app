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
  category: 'combat_striking' | 'combat_grappling' | 'fitness' | 'cardio' | 'collectif' | 'raquettes' | 'danse' | 'glisse' | 'nature' | 'autre';
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
    name: 'Jiu Jitsu Brésilien',
    icon: 'human-handsdown', // Grappling/Combat au sol
    color: '#EF4444',
    category: 'combat_grappling',
  },
  {
    id: 'judo',
    name: 'Judo',
    icon: 'kabaddi', // Grappling/prise au sol
    color: '#1E40AF',
    category: 'combat_grappling',
  },
  {
    id: 'lutte',
    name: 'Lutte',
    icon: 'account-multiple',
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
    icon: 'arm-flex',
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
  {
    id: 'street_workout',
    name: 'Street Workout',
    icon: 'arm-flex',
    color: '#F59E0B',
    category: 'fitness',
    muscles: ['pectoraux', 'dos', 'epaules', 'biceps', 'triceps', 'abdos', 'jambes', 'fessiers'],
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
    id: 'futsal',
    name: 'Futsal / Foot en salle',
    icon: 'soccer',
    color: '#14B8A6',
    category: 'collectif',
  },
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

  // === DANSE ===
  {
    id: 'danse',
    name: 'Danse classique',
    icon: 'dance-ballroom',
    color: '#EC4899',
    category: 'danse',
  },
  {
    id: 'hip_hop',
    name: 'Hip Hop / Street Dance',
    icon: 'human-handsup',
    color: '#8B5CF6',
    category: 'danse',
  },
  {
    id: 'zumba',
    name: 'Zumba',
    icon: 'dance-pole',
    color: '#F472B6',
    category: 'danse',
  },
  {
    id: 'salsa',
    name: 'Salsa / Bachata',
    icon: 'dance-ballroom',
    color: '#F97316',
    category: 'danse',
  },
  {
    id: 'pole_dance',
    name: 'Pole Dance',
    icon: 'dance-pole',
    color: '#A855F7',
    category: 'danse',
  },

  // === SPORTS DE GLISSE ===
  {
    id: 'ski',
    name: 'Ski / Snowboard',
    icon: 'ski',
    color: '#0EA5E9',
    category: 'glisse',
  },
  {
    id: 'surf',
    name: 'Surf',
    icon: 'surfing',
    color: '#06B6D4',
    category: 'glisse',
  },
  {
    id: 'patinage',
    name: 'Patinage',
    icon: 'skate',
    color: '#3B82F6',
    category: 'glisse',
  },
  {
    id: 'skateboard',
    name: 'Skateboard',
    icon: 'skateboard',
    color: '#F59E0B',
    category: 'glisse',
  },
  {
    id: 'roller',
    name: 'Roller',
    icon: 'roller-skate',
    color: '#10B981',
    category: 'glisse',
  },
  {
    id: 'wakeboard',
    name: 'Wakeboard / Kitesurf',
    icon: 'surfing',
    color: '#0891B2',
    category: 'glisse',
  },

  // === SPORTS NATURE / PLEIN AIR ===
  {
    id: 'escalade',
    name: 'Escalade',
    icon: 'hiking',
    color: '#78716C',
    category: 'nature',
  },
  {
    id: 'equitation',
    name: 'Équitation',
    icon: 'horse',
    color: '#92400E',
    category: 'nature',
  },
  {
    id: 'golf',
    name: 'Golf',
    icon: 'golf',
    color: '#22C55E',
    category: 'nature',
  },
  {
    id: 'parkour',
    name: 'Parkour / Freerun',
    icon: 'run-fast',
    color: '#6366F1',
    category: 'nature',
  },
  {
    id: 'trail',
    name: 'Trail Running',
    icon: 'terrain',
    color: '#65A30D',
    category: 'cardio',
  },
  {
    id: 'randonnee',
    name: 'Randonnée',
    icon: 'hiking',
    color: '#84CC16',
    category: 'nature',
  },
  {
    id: 'vtt',
    name: 'VTT',
    icon: 'bike',
    color: '#78716C',
    category: 'nature',
  },

  // === CARDIO (ajouts) ===
  {
    id: 'aquabike',
    name: 'Aquabike / Aquagym',
    icon: 'swim',
    color: '#0891B2',
    category: 'cardio',
  },
  {
    id: 'spinning',
    name: 'Spinning / RPM',
    icon: 'bike',
    color: '#DC2626',
    category: 'cardio',
  },

  // === FITNESS (ajouts) ===
  {
    id: 'hyrox',
    name: 'Hyrox',
    icon: 'weight-lifter',
    color: '#EA580C',
    category: 'fitness',
  },
  {
    id: 'body_pump',
    name: 'Body Pump / LIA',
    icon: 'dumbbell',
    color: '#7C3AED',
    category: 'fitness',
  },
  {
    id: 'functional_training',
    name: 'Functional Training',
    icon: 'weight-lifter',
    color: '#0D9488',
    category: 'fitness',
  },
  {
    id: 'gymnastique',
    name: 'Gymnastique',
    icon: 'gymnastics',
    color: '#EC4899',
    category: 'fitness',
  },

  // === COMBAT (ajouts) ===
  {
    id: 'boxe_thai',
    name: 'Boxe Thaï',
    icon: 'boxing-glove',
    color: '#DC2626',
    category: 'combat_striking',
  },
  {
    id: 'capoeira',
    name: 'Capoeira',
    icon: 'dance-ballroom',
    color: '#16A34A',
    category: 'combat_striking',
  },
  {
    id: 'aikido',
    name: 'Aïkido',
    icon: 'human-greeting-variant',
    color: '#1E40AF',
    category: 'combat_grappling',
  },
  {
    id: 'self_defense',
    name: 'Self Défense',
    icon: 'shield-account',
    color: '#374151',
    category: 'combat_striking',
  },

  // === AUTRE ===
  {
    id: 'petanque',
    name: 'Pétanque',
    icon: 'circle-multiple',
    color: '#78716C',
    category: 'autre',
  },
  {
    id: 'billard',
    name: 'Billard',
    icon: 'billiards',
    color: '#15803D',
    category: 'autre',
  },
  {
    id: 'bowling',
    name: 'Bowling',
    icon: 'bowling',
    color: '#DC2626',
    category: 'autre',
  },
  {
    id: 'flechettes',
    name: 'Fléchettes',
    icon: 'bullseye-arrow',
    color: '#EF4444',
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
  danse: SPORTS.filter(s => s.category === 'danse'),
  glisse: SPORTS.filter(s => s.category === 'glisse'),
  nature: SPORTS.filter(s => s.category === 'nature'),
  autre: SPORTS.filter(s => s.category === 'autre'),
};

// Labels français pour les catégories
export const CATEGORY_LABELS: Record<string, string> = {
  combat_striking: 'Combat (Pieds-Poings)',
  combat_grappling: 'Combat (Grappling)',
  fitness: 'Musculation & Fitness',
  cardio: 'Cardio',
  collectif: 'Sports Collectifs',
  raquettes: 'Raquettes',
  danse: 'Danse',
  glisse: 'Sports de Glisse',
  nature: 'Plein Air & Nature',
  autre: 'Autres',
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

// ============================================
// LOGOS DES CLUBS
// ============================================

// Mappage des identifiants de logos vers les images locales
const CLUB_LOGOS: { [key: string]: any } = {
  'gracie-barra': require('@/assets/images/gracie-barra.png'),
  'gracie-barra-olives': require('@/assets/partenaires/clubs/gracie-barra-olives.jpg'),
  'graciebarra': require('@/assets/partenaires/clubs/graciebarra.png'),
  'basic-fit': require('@/assets/images/basic-fit.png'),
  'marseille-fight-club': require('@/assets/partenaires/clubs/marseille-fight-club.jpg'),
  'teamsorel': require('@/assets/partenaires/clubs/teamsorel.jpg'),
  'bodygator': require('@/assets/partenaires/coachs/bodygator.jpg'),
};

/**
 * Récupère la source d'image pour un logo de club
 * @param logoUri Identifiant du logo (ex: 'gracie-barra') ou URI externe
 * @returns Source d'image utilisable dans <Image source={...} />
 */
export const getClubLogoSource = (logoUri?: string): any => {
  if (!logoUri) return null;

  // Si c'est un identifiant connu, retourner l'image locale
  if (CLUB_LOGOS[logoUri]) {
    return CLUB_LOGOS[logoUri];
  }

  // Si c'est une URI externe (commence par http ou file)
  if (logoUri.startsWith('http') || logoUri.startsWith('file')) {
    return { uri: logoUri };
  }

  return null;
};

/**
 * Récupère le nom du club à partir de son identifiant
 * @param logoUri Identifiant du logo
 * @returns Nom du club pour affichage dans un placeholder
 */
export const getClubName = (logoUri?: string): string | null => {
  if (!logoUri) return null;

  const clubNames: { [key: string]: string } = {
    'gracie-barra': 'GB',
    'gracie-barra-olives': 'GBO',
    'graciebarra': 'GB',
    'basic-fit': 'BF',
    'marseille-fight-club': 'MFC',
    'teamsorel': 'TS',
    'bodygator': 'BG',
  };

  return clubNames[logoUri] || logoUri.substring(0, 2).toUpperCase();
};

export default SPORTS;
