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
  category: 'combat_striking' | 'combat_grappling' | 'fitness' | 'cardio' | 'collectif' | 'raquettes' | 'danse' | 'glisse' | 'nature' | 'aquatique' | 'precision' | 'autre';
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
    color: '#E53935',
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
  {
    id: 'hyrox',
    name: 'Hyrox',
    icon: 'timer',
    color: '#EA580C',
    category: 'fitness',
  },
  {
    id: 'calisthenics',
    name: 'Calisthenics',
    icon: 'gymnastics',
    color: '#10B981',
    category: 'fitness',
  },
  {
    id: 'powerlifting',
    name: 'Powerlifting',
    icon: 'weight-lifter',
    color: '#B91C1C',
    category: 'fitness',
  },
  {
    id: 'fitness',
    name: 'Fitness',
    icon: 'dumbbell',
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
    id: 'marathon',
    name: 'Marathon',
    icon: 'run-fast',
    color: '#DC2626',
    category: 'cardio',
  },
  {
    id: 'triathlon',
    name: 'Triathlon',
    icon: 'trophy-award',
    color: '#0891B2',
    category: 'cardio',
  },
  {
    id: 'obstacle',
    name: 'Course à obstacles',
    icon: 'wall',
    color: '#D97706',
    category: 'cardio',
  },
  {
    id: 'cycling',
    name: 'Cyclisme',
    icon: 'bike-fast',
    color: '#FBBF24',
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
    id: 'climbing',
    name: 'Climbing',
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

  // === SPORTS AQUATIQUES ===
  {
    id: 'water_polo',
    name: 'Water-polo',
    icon: 'water-polo',
    color: '#0284C7',
    category: 'aquatique',
  },
  {
    id: 'plongee',
    name: 'Plongee sous-marine',
    icon: 'diving-scuba',
    color: '#0369A1',
    category: 'aquatique',
  },
  {
    id: 'kayak',
    name: 'Kayak / Canoe',
    icon: 'kayaking',
    color: '#0891B2',
    category: 'aquatique',
  },
  {
    id: 'aviron',
    name: 'Aviron',
    icon: 'rowing',
    color: '#0E7490',
    category: 'aquatique',
  },
  {
    id: 'voile',
    name: 'Voile',
    icon: 'sail-boat',
    color: '#0EA5E9',
    category: 'aquatique',
  },
  {
    id: 'ski_nautique',
    name: 'Ski nautique',
    icon: 'ski-water',
    color: '#06B6D4',
    category: 'aquatique',
  },
  {
    id: 'paddle',
    name: 'Stand Up Paddle',
    icon: 'surfing',
    color: '#22D3EE',
    category: 'aquatique',
  },
  {
    id: 'nage_eau_libre',
    name: 'Nage en eau libre',
    icon: 'swim',
    color: '#0077B6',
    category: 'aquatique',
  },
  {
    id: 'plongeon',
    name: 'Plongeon',
    icon: 'diving',
    color: '#0C4A6E',
    category: 'aquatique',
  },
  {
    id: 'natation_synchronisee',
    name: 'Natation synchronisee',
    icon: 'swim',
    color: '#7C3AED',
    category: 'aquatique',
  },
  {
    id: 'snorkeling',
    name: 'Snorkeling / PMT',
    icon: 'diving-snorkel',
    color: '#38BDF8',
    category: 'aquatique',
  },

  // === SPORTS DE PRECISION ===
  {
    id: 'tir_a_larc',
    name: 'Tir a l\'arc',
    icon: 'bow-arrow',
    color: '#B45309',
    category: 'precision',
  },
  {
    id: 'tir_sportif',
    name: 'Tir sportif',
    icon: 'bullseye',
    color: '#6B7280',
    category: 'precision',
  },
  {
    id: 'escrime',
    name: 'Escrime',
    icon: 'sword',
    color: '#94A3B8',
    category: 'precision',
  },
  {
    id: 'curling',
    name: 'Curling',
    icon: 'curling',
    color: '#0284C7',
    category: 'precision',
  },

  // === CARDIO (ajouts Apple Health / Garmin / Fitbit) ===
  {
    id: 'elliptique',
    name: 'Elliptique',
    icon: 'ellipse',
    color: '#059669',
    category: 'cardio',
  },
  {
    id: 'stairmaster',
    name: 'Stairmaster / Stepper',
    icon: 'stairs',
    color: '#D97706',
    category: 'cardio',
  },
  {
    id: 'step_aerobic',
    name: 'Step / Aerobic',
    icon: 'shoe-sneaker',
    color: '#EC4899',
    category: 'cardio',
  },
  {
    id: 'ski_de_fond',
    name: 'Ski de fond',
    icon: 'ski-cross-country',
    color: '#2563EB',
    category: 'cardio',
  },
  {
    id: 'raquettes_neige',
    name: 'Raquettes a neige',
    icon: 'snowshoeing',
    color: '#60A5FA',
    category: 'cardio',
  },
  {
    id: 'marche_nordique',
    name: 'Marche nordique',
    icon: 'hiking',
    color: '#4ADE80',
    category: 'cardio',
  },
  {
    id: 'velo_elliptique_ext',
    name: 'Velo (exterieur)',
    icon: 'bike-fast',
    color: '#F59E0B',
    category: 'cardio',
  },
  {
    id: 'ski_erg',
    name: 'SkiErg',
    icon: 'ski',
    color: '#334155',
    category: 'cardio',
  },
  {
    id: 'assault_bike',
    name: 'Assault Bike / Air Bike',
    icon: 'bike',
    color: '#B91C1C',
    category: 'cardio',
  },
  {
    id: 'hand_cycling',
    name: 'Hand Cycling',
    icon: 'wheelchair-accessibility',
    color: '#059669',
    category: 'cardio',
  },

  // === COLLECTIFS (ajouts) ===
  {
    id: 'cricket',
    name: 'Cricket',
    icon: 'cricket',
    color: '#65A30D',
    category: 'collectif',
  },
  {
    id: 'baseball',
    name: 'Baseball / Softball',
    icon: 'baseball',
    color: '#DC2626',
    category: 'collectif',
  },
  {
    id: 'hockey_glace',
    name: 'Hockey sur glace',
    icon: 'hockey-sticks',
    color: '#1E3A5F',
    category: 'collectif',
  },
  {
    id: 'hockey_gazon',
    name: 'Hockey sur gazon',
    icon: 'hockey-sticks',
    color: '#16A34A',
    category: 'collectif',
  },
  {
    id: 'lacrosse',
    name: 'Lacrosse',
    icon: 'hockey-sticks',
    color: '#7C3AED',
    category: 'collectif',
  },
  {
    id: 'football_americain',
    name: 'Football americain',
    icon: 'football',
    color: '#92400E',
    category: 'collectif',
  },
  {
    id: 'water_polo_collectif',
    name: 'Water-polo (equipe)',
    icon: 'water-polo',
    color: '#0369A1',
    category: 'collectif',
  },
  {
    id: 'ultimate',
    name: 'Ultimate Frisbee',
    icon: 'disc',
    color: '#A855F7',
    category: 'collectif',
  },
  {
    id: 'beach_volley',
    name: 'Beach Volley',
    icon: 'volleyball',
    color: '#F59E0B',
    category: 'collectif',
  },

  // === RAQUETTES (ajouts) ===
  {
    id: 'tennis_de_table',
    name: 'Tennis de table',
    icon: 'table-tennis',
    color: '#EF4444',
    category: 'raquettes',
  },
  {
    id: 'squash',
    name: 'Squash',
    icon: 'racquetball',
    color: '#0D9488',
    category: 'raquettes',
  },
  {
    id: 'racquetball',
    name: 'Racquetball',
    icon: 'racquetball',
    color: '#2563EB',
    category: 'raquettes',
  },
  {
    id: 'pickleball',
    name: 'Pickleball',
    icon: 'racquetball',
    color: '#84CC16',
    category: 'raquettes',
  },

  // === FITNESS (ajouts Apple Health / Garmin) ===
  {
    id: 'halterophilie',
    name: 'Halterophilie',
    icon: 'weight-lifter',
    color: '#9B2C2C',
    category: 'fitness',
  },
  {
    id: 'kettlebell',
    name: 'Kettlebell',
    icon: 'kettlebell',
    color: '#78716C',
    category: 'fitness',
  },
  {
    id: 'barre_au_sol',
    name: 'Barre au sol',
    icon: 'human-female-dance',
    color: '#EC4899',
    category: 'fitness',
  },
  {
    id: 'tai_chi',
    name: 'Tai Chi',
    icon: 'meditation',
    color: '#059669',
    category: 'fitness',
  },
  {
    id: 'qi_gong',
    name: 'Qi Gong',
    icon: 'meditation',
    color: '#14B8A6',
    category: 'fitness',
  },
  {
    id: 'foam_roller',
    name: 'Foam Roller / Récupération',
    icon: 'human-handsup',
    color: '#A78BFA',
    category: 'fitness',
  },
  {
    id: 'core_training',
    name: 'Core Training',
    icon: 'human-male',
    color: '#F97316',
    category: 'fitness',
  },
  {
    id: 'trx',
    name: 'TRX / Suspension',
    icon: 'arm-flex',
    color: '#EAB308',
    category: 'fitness',
  },
  {
    id: 'bootcamp',
    name: 'Bootcamp',
    icon: 'shield-sword',
    color: '#15803D',
    category: 'fitness',
  },
  {
    id: 'aquagym',
    name: 'Aquagym',
    icon: 'swim',
    color: '#38BDF8',
    category: 'fitness',
  },
  {
    id: 'tabata',
    name: 'Tabata',
    icon: 'timer-outline',
    color: '#EF4444',
    category: 'fitness',
  },
  {
    id: 'circuit_training',
    name: 'Circuit Training',
    icon: 'sync',
    color: '#F97316',
    category: 'fitness',
  },

  // === COMBAT (ajouts) ===
  {
    id: 'wing_chun',
    name: 'Wing Chun',
    icon: 'human-handsdown',
    color: '#DC2626',
    category: 'combat_striking',
  },
  {
    id: 'kung_fu',
    name: 'Kung Fu',
    icon: 'karate',
    color: '#B91C1C',
    category: 'combat_striking',
  },
  {
    id: 'boxe_olympique',
    name: 'Boxe olympique',
    icon: 'boxing-glove',
    color: '#1D4ED8',
    category: 'combat_striking',
  },
  {
    id: 'lutte_olympique',
    name: 'Lutte olympique',
    icon: 'kabaddi',
    color: '#B45309',
    category: 'combat_grappling',
  },
  {
    id: 'sumo',
    name: 'Sumo',
    icon: 'kabaddi',
    color: '#92400E',
    category: 'combat_grappling',
  },
  {
    id: 'savate',
    name: 'Savate',
    icon: 'shoe-sneaker',
    color: '#3B82F6',
    category: 'combat_striking',
  },
  {
    id: 'hapkido',
    name: 'Hapkido',
    icon: 'karate',
    color: '#1E40AF',
    category: 'combat_grappling',
  },
  {
    id: 'jeet_kune_do',
    name: 'Jeet Kune Do',
    icon: 'human-handsdown',
    color: '#475569',
    category: 'combat_striking',
  },
  {
    id: 'penchak_silat',
    name: 'Penchak Silat',
    icon: 'karate',
    color: '#7C2D12',
    category: 'combat_striking',
  },

  // === GLISSE (ajouts) ===
  {
    id: 'ski_alpin',
    name: 'Ski alpin',
    icon: 'ski',
    color: '#2563EB',
    category: 'glisse',
  },
  {
    id: 'snowboard',
    name: 'Snowboard',
    icon: 'snowboard',
    color: '#0EA5E9',
    category: 'glisse',
  },
  {
    id: 'luge',
    name: 'Luge / Bobsleigh',
    icon: 'sledding',
    color: '#EF4444',
    category: 'glisse',
  },
  {
    id: 'trottinette',
    name: 'Trottinette',
    icon: 'scooter',
    color: '#10B981',
    category: 'glisse',
  },
  {
    id: 'kitesurf',
    name: 'Kitesurf',
    icon: 'kite',
    color: '#F97316',
    category: 'glisse',
  },
  {
    id: 'windsurf',
    name: 'Windsurf / Planche a voile',
    icon: 'surfing',
    color: '#0891B2',
    category: 'glisse',
  },
  {
    id: 'longboard',
    name: 'Longboard',
    icon: 'skateboard',
    color: '#D97706',
    category: 'glisse',
  },
  {
    id: 'patinage_vitesse',
    name: 'Patinage de vitesse',
    icon: 'skate',
    color: '#1D4ED8',
    category: 'glisse',
  },

  // === NATURE / PLEIN AIR (ajouts) ===
  {
    id: 'alpinisme',
    name: 'Alpinisme',
    icon: 'image-filter-hdr',
    color: '#475569',
    category: 'nature',
  },
  {
    id: 'via_ferrata',
    name: 'Via Ferrata',
    icon: 'carabiner',
    color: '#78716C',
    category: 'nature',
  },
  {
    id: 'speleologie',
    name: 'Speleologie',
    icon: 'flashlight',
    color: '#57534E',
    category: 'nature',
  },
  {
    id: 'parapente',
    name: 'Parapente / Deltaplane',
    icon: 'paragliding',
    color: '#F97316',
    category: 'nature',
  },
  {
    id: 'saut_parachute',
    name: 'Saut en parachute',
    icon: 'parachute',
    color: '#DC2626',
    category: 'nature',
  },
  {
    id: 'peche',
    name: 'Peche',
    icon: 'fish',
    color: '#0891B2',
    category: 'nature',
  },
  {
    id: 'chasse',
    name: 'Chasse',
    icon: 'pine-tree',
    color: '#4D7C0F',
    category: 'nature',
  },
  {
    id: 'geocaching',
    name: 'Geocaching / Course d\'orientation',
    icon: 'compass',
    color: '#16A34A',
    category: 'nature',
  },
  {
    id: 'bmx',
    name: 'BMX',
    icon: 'bike',
    color: '#DC2626',
    category: 'nature',
  },
  {
    id: 'gravel',
    name: 'Gravel / Cyclocross',
    icon: 'bike',
    color: '#78716C',
    category: 'nature',
  },

  // === DANSE (ajouts) ===
  {
    id: 'breakdance',
    name: 'Breakdance / Breaking',
    icon: 'human-handsup',
    color: '#F97316',
    category: 'danse',
  },
  {
    id: 'danse_contemporaine',
    name: 'Danse contemporaine',
    icon: 'dance-ballroom',
    color: '#A855F7',
    category: 'danse',
  },
  {
    id: 'danse_orientale',
    name: 'Danse orientale',
    icon: 'dance-ballroom',
    color: '#EAB308',
    category: 'danse',
  },
  {
    id: 'flamenco',
    name: 'Flamenco',
    icon: 'dance-ballroom',
    color: '#DC2626',
    category: 'danse',
  },
  {
    id: 'swing',
    name: 'Swing / Rock',
    icon: 'dance-ballroom',
    color: '#0891B2',
    category: 'danse',
  },

  // === ATHLETISME / DISCIPLINES ===
  {
    id: 'sprint',
    name: 'Sprint',
    icon: 'run-fast',
    color: '#EF4444',
    category: 'cardio',
  },
  {
    id: 'saut_hauteur',
    name: 'Saut en hauteur',
    icon: 'human-handsup',
    color: '#8B5CF6',
    category: 'fitness',
  },
  {
    id: 'saut_longueur',
    name: 'Saut en longueur',
    icon: 'human-handsdown',
    color: '#6366F1',
    category: 'fitness',
  },
  {
    id: 'saut_perche',
    name: 'Saut a la perche',
    icon: 'human-handsup',
    color: '#7C3AED',
    category: 'fitness',
  },
  {
    id: 'lancer_disque',
    name: 'Lancer de disque',
    icon: 'disc',
    color: '#B45309',
    category: 'fitness',
  },
  {
    id: 'lancer_javelot',
    name: 'Lancer de javelot',
    icon: 'spear',
    color: '#92400E',
    category: 'fitness',
  },
  {
    id: 'lancer_poids',
    name: 'Lancer de poids',
    icon: 'circle',
    color: '#78716C',
    category: 'fitness',
  },
  {
    id: 'lancer_marteau',
    name: 'Lancer de marteau',
    icon: 'hammer',
    color: '#57534E',
    category: 'fitness',
  },
  {
    id: 'decathlon',
    name: 'Decathlon / Heptathlon',
    icon: 'trophy-award',
    color: '#EAB308',
    category: 'fitness',
  },
  {
    id: 'pentathlon',
    name: 'Pentathlon moderne',
    icon: 'medal',
    color: '#D97706',
    category: 'fitness',
  },
  {
    id: 'course_haies',
    name: 'Course de haies',
    icon: 'run-fast',
    color: '#DC2626',
    category: 'cardio',
  },
  {
    id: 'marche_athletique',
    name: 'Marche athletique',
    icon: 'walk',
    color: '#059669',
    category: 'cardio',
  },

  // === SPORTS MANQUANTS APPLE HEALTH (phantom IDs) ===
  {
    id: 'récupération',
    name: 'Récupération / Cooldown',
    icon: 'human-handsup',
    color: '#94A3B8',
    category: 'fitness',
  },
  {
    id: 'athletisme',
    name: 'Athletisme',
    icon: 'run-fast',
    color: '#DC2626',
    category: 'cardio',
  },
  {
    id: 'disc_golf',
    name: 'Disc Golf / Frisbee Golf',
    icon: 'disc',
    color: '#22C55E',
    category: 'nature',
  },
  {
    id: 'fitness_gaming',
    name: 'Fitness Gaming',
    icon: 'gamepad-variant',
    color: '#A855F7',
    category: 'autre',
  },
  {
    id: 'sports_nautiques',
    name: 'Sports nautiques (autres)',
    icon: 'wave',
    color: '#0891B2',
    category: 'aquatique',
  },
  {
    id: 'cardio_mixte',
    name: 'Cardio mixte',
    icon: 'heart-pulse',
    color: '#EF4444',
    category: 'cardio',
  },
  {
    id: 'jeu',
    name: 'Jeu libre / Play',
    icon: 'human-child',
    color: '#F59E0B',
    category: 'autre',
  },
  {
    id: 'transition',
    name: 'Transition (multi-sport)',
    icon: 'swap-horizontal',
    color: '#6B7280',
    category: 'cardio',
  },

  // === AJOUTS GARMIN POPULAIRES ===
  {
    id: 'meditation',
    name: 'Meditation',
    icon: 'meditation',
    color: '#6366F1',
    category: 'fitness',
  },
  {
    id: 'respiration',
    name: 'Exercices de respiration',
    icon: 'weather-windy',
    color: '#06B6D4',
    category: 'fitness',
  },
  {
    id: 'rucking',
    name: 'Rucking',
    icon: 'bag-personal',
    color: '#4D7C0F',
    category: 'cardio',
  },
  {
    id: 'velo_electrique',
    name: 'Velo electrique (VAE)',
    icon: 'bicycle-electric',
    color: '#059669',
    category: 'cardio',
  },
  {
    id: 'apnee',
    name: 'Apnee',
    icon: 'diving-scuba',
    color: '#0369A1',
    category: 'aquatique',
  },
  {
    id: 'mobilite',
    name: 'Mobilite / Étirements dynamiques',
    icon: 'human-handsup',
    color: '#8B5CF6',
    category: 'fitness',
  },
  {
    id: 'ski_rando',
    name: 'Ski de randonnee',
    icon: 'ski',
    color: '#475569',
    category: 'glisse',
  },
  {
    id: 'swimrun',
    name: 'Swimrun',
    icon: 'swim',
    color: '#0891B2',
    category: 'cardio',
  },
  {
    id: 'rafting',
    name: 'Rafting / Eaux vives',
    icon: 'kayaking',
    color: '#EF4444',
    category: 'aquatique',
  },
  {
    id: 'wakesurf',
    name: 'Wakesurf',
    icon: 'surfing',
    color: '#06B6D4',
    category: 'glisse',
  },
  {
    id: 'ultra_trail',
    name: 'Ultra Trail / Ultra Running',
    icon: 'terrain',
    color: '#92400E',
    category: 'cardio',
  },
  {
    id: 'velo_route',
    name: 'Velo de route',
    icon: 'bike-fast',
    color: '#DC2626',
    category: 'cardio',
  },
  {
    id: 'moto',
    name: 'Moto',
    icon: 'motorbike',
    color: '#1F2937',
    category: 'autre',
  },
  {
    id: 'motocross',
    name: 'Motocross',
    icon: 'motorbike',
    color: '#D97706',
    category: 'autre',
  },

  // === AUTRE ===
  {
    id: 'petanque',
    name: 'Petanque',
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
    name: 'Flechettes',
    icon: 'bullseye-arrow',
    color: '#EF4444',
    category: 'autre',
  },
  {
    id: 'echecs',
    name: 'Echecs',
    icon: 'chess-king',
    color: '#1F2937',
    category: 'autre',
  },
  {
    id: 'e_sport',
    name: 'E-Sport / Gaming',
    icon: 'gamepad-variant',
    color: '#7C3AED',
    category: 'autre',
  },
  {
    id: 'trampoline',
    name: 'Trampoline',
    icon: 'human-handsup',
    color: '#F97316',
    category: 'autre',
  },
  {
    id: 'handball_mur',
    name: 'Pelote basque / Jai alai',
    icon: 'handball',
    color: '#DC2626',
    category: 'autre',
  },
  {
    id: 'badminton_volant',
    name: 'Speedminton',
    icon: 'badminton',
    color: '#FBBF24',
    category: 'raquettes',
  },
  {
    id: 'cheerleading',
    name: 'Cheerleading',
    icon: 'human-female-dance',
    color: '#EC4899',
    category: 'autre',
  },
  {
    id: 'crossfit_games',
    name: 'CrossFit Games / Competitions',
    icon: 'trophy',
    color: '#EF4444',
    category: 'fitness',
  },
  {
    id: 'strongman',
    name: 'Strongman',
    icon: 'weight-lifter',
    color: '#7C2D12',
    category: 'fitness',
  },
  {
    id: 'pentaque_provencale',
    name: 'Jeu provencal / Lyonnaise',
    icon: 'circle-multiple',
    color: '#92400E',
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
  aquatique: SPORTS.filter(s => s.category === 'aquatique'),
  precision: SPORTS.filter(s => s.category === 'precision'),
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
  aquatique: 'Sports Aquatiques',
  precision: 'Precision & Adresse',
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
  { id: 'abdos', name: 'Abdos', icon: 'human-male' },
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

  // Si c'est une URI vers un fichier ou une ressource externe
  if (
    logoUri.startsWith('http') ||
    logoUri.startsWith('file') ||
    logoUri.startsWith('content') || // Android content provider
    logoUri.startsWith('ph://')      // iOS Photos framework
  ) {
    return { uri: logoUri };
  }

  // URI base64
  if (logoUri.startsWith('data:image')) {
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
