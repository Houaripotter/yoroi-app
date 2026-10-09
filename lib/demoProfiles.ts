// ============================================
// DEMO PROFILES · 4 profils paramétrés pour le mode créateur
// Utilisé par demoDataService pour générer des données marketing réalistes
// ============================================

export type DemoPeriod = '3mo' | '6mo' | '1y';

export type FightStyle = 'offensif' | 'defensif' | 'technique' | 'polyvalent';

export interface DemoPartner {
  name: string;
  belt: string;
  weight: string;
  skill: number;            // 1-10
  style: string;
  notes?: string;           // note tactique courte
}

export interface DemoProfile {
  key: string;
  name: string;
  birthDate: string; // ISO YYYY-MM-DD
  gender: 'male' | 'female';
  heightCm: number;
  startWeight: number;       // kg au début du parcours
  currentWeight: number;     // kg actuellement
  targetWeight: number;      // kg objectif
  belt: string;              // ceinture actuelle
  beltStripes?: number;      // galons (0-4)
  targetBelt?: string;       // ceinture visée (utilisé pour Houari en transition)
  practiceMonths: number;    // depuis combien de temps
  style: FightStyle;
  bio: string;               // bio courte pour l'écran profil
  // Narratif pour les données générées
  themes: string[];          // thèmes techniques travaillés
  submissions: string[];     // soumissions favorites (quand victoires)
  weaknesses: string[];      // positions/soumissions où subit (quand losses)
  // Partenaires sparring SPÉCIFIQUES au profil (son club, son crew)
  roster: DemoPartner[];
  // Paramètres de volume
  baseSessionsPerWeek: number; // moyenne séances/semaine
  winRateBaseline: number;     // 0..1, win rate global visé
  // Sports pratiqués
  sports: string[];          // liste des sports (JJB, musculation, cardio, etc.)
  // Club principal
  club: { name: string; color: string };
  // Salle de muscu spécifique au profil
  muscuGym: { name: string; color: string };
  // Thèmes musculation spécifiques (style d'entraînement du profil)
  muscuThemes: string[];
  // Exercices signature en musculation
  muscuExercises: string[];
  // Adversaires de compétition (pour les combats)
  competitionOpponents: { name: string; club: string }[];
}

// ============================================
// LES 4 PROFILS
// ============================================

export const DEMO_PROFILES: Record<string, DemoProfile> = {
  houari: {
    key: 'houari',
    name: 'Houari',
    birthDate: '1992-03-15',
    gender: 'male',
    heightCm: 178,
    startWeight: 103,
    currentWeight: 88,
    targetWeight: 75,
    belt: 'blanche',
    beltStripes: 4,
    targetBelt: 'bleue',
    practiceMonths: 18,
    style: 'polyvalent',
    bio: 'Ex-sportif · reprise après 5 ans de pause · transformation 103kg → 88kg (objectif 75kg) · ceinture blanche 4 galons',
    themes: [
      'Triangle',
      'Armbar',
      'Passage de garde',
      'Mount escape',
      'Kimura',
      'Rear Naked Choke',
      'Knee on belly',
      'Butterfly guard',
    ],
    submissions: ['Triangle', 'Kimura', 'Armbar', 'Rear Naked Choke', 'Guillotine'],
    weaknesses: ['Heel hook', 'D\'Arce', 'Darce choke', 'Omoplata'],
    roster: [
      { name: 'Professeur Lucas', belt: 'noire', weight: '82', skill: 10, style: 'pression + passage', notes: 'Coach · te pousse sur le cardio' },
      { name: 'Professeur Veni', belt: 'noire', weight: '78', skill: 10, style: 'technique au sol', notes: 'Coach senior · spécialiste leg lock' },
      { name: 'Larbi', belt: 'marron', weight: '85', skill: 9, style: 'pression', notes: 'Partenaire régulier · te passe la garde' },
      { name: 'Hedi', belt: 'blanche', weight: '70', skill: 7, style: 'garde solide', notes: 'Partenaire fétiche · sparring technique' },
      { name: 'Yanis', belt: 'bleue', weight: '70', skill: 7, style: 'jeu au sol', notes: 'Blue belt · technique et précis' },
      { name: 'Louis', belt: 'blanche', weight: '84', skill: 6, style: 'offensif', notes: 'Autre blanche 4 galons du club' },
      { name: 'Eliott', belt: 'bleue', weight: '72', skill: 6, style: 'technique', notes: 'Sparring classique du mardi' },
      { name: 'Kevin', belt: 'blanche', weight: '90', skill: 4, style: 'puissance brute', notes: 'Plus lourd · cardio test' },
    ],
    baseSessionsPerWeek: 4,
    winRateBaseline: 0.48,
    sports: ['jjb', 'musculation'],
    club: { name: 'Gracie Barra Les Olives', color: '#DC2626' },
    muscuGym: { name: 'Basic-Fit Prado', color: '#F59E0B' },
    muscuThemes: ['Push (pecs/épaules/triceps)', 'Pull (dos/biceps)', 'Legs (quadri/ischios)', 'Full body force', 'Hypertrophie haut'],
    muscuExercises: ['Développé couché', 'Squat', 'Soulevé de terre', 'Tractions', 'Développé militaire', 'Rowing barre', 'Hip thrust', 'Dips'],
    competitionOpponents: [
      { name: 'Antoine Martin', club: 'Alliance Marseille' },
      { name: 'Mehdi Benali', club: 'Checkmat Marseille' },
      { name: 'Romain Garcia', club: 'Carlson Gracie Toulon' },
      { name: 'Youssef Kadi', club: 'Atos Aix' },
    ],
  },

  louis: {
    key: 'louis',
    name: 'Louis',
    birthDate: '1995-07-22',
    gender: 'male',
    heightCm: 182,
    startWeight: 86,
    currentWeight: 84,
    targetWeight: 82,
    belt: 'blanche',
    beltStripes: 4,
    targetBelt: 'bleue',
    practiceMonths: 14,
    style: 'offensif',
    bio: 'Style offensif · pression constante · recherche passage et soumission rapide',
    themes: [
      'Passage knee cut',
      'Passage over-under',
      'Guillotine',
      'D\'Arce choke',
      'Mount attacks',
      'Kimura depuis side control',
      'Choke Ezekiel',
      'Pressure passing',
    ],
    submissions: ['Guillotine', 'D\'Arce', 'Ezekiel', 'Cross collar choke', 'Kimura'],
    weaknesses: ['Lapel guard', 'Berimbolo', 'De la Riva', 'Worm guard'],
    roster: [
      { name: 'Professeur Lucas', belt: 'noire', weight: '82', skill: 10, style: 'pression + passage', notes: 'Coach · te mène en sparring' },
      { name: 'Professeur Veni', belt: 'noire', weight: '78', skill: 10, style: 'technique au sol', notes: 'Coach senior · te corrige sur les détails' },
      { name: 'Larbi', belt: 'marron', weight: '85', skill: 9, style: 'pression', notes: 'Partenaire rival · même gabarit' },
      { name: 'Houari', belt: 'blanche', weight: '82', skill: 7, style: 'polyvalent', notes: 'Autre blanche 4 galons · rolls réguliers' },
      { name: 'Hedi', belt: 'blanche', weight: '70', skill: 7, style: 'garde solide', notes: 'Plus léger · bon test de passage' },
      { name: 'Yanis', belt: 'bleue', weight: '70', skill: 7, style: 'technique', notes: 'Blue belt · sparring technique' },
      { name: 'Eliott', belt: 'bleue', weight: '72', skill: 6, style: 'technique', notes: 'Sparring classique du mardi' },
      { name: 'Kevin', belt: 'blanche', weight: '90', skill: 4, style: 'puissance brute', notes: 'Plus lourd · test de pression' },
    ],
    baseSessionsPerWeek: 5,
    winRateBaseline: 0.55,
    sports: ['jjb', 'musculation'],
    club: { name: 'Gracie Barra Les Olives', color: '#DC2626' },
    muscuGym: { name: 'On Air Fitness', color: '#3B82F6' },
    muscuThemes: ['Powerlifting', 'Force max 5x5', 'Push explosif', 'Pull lourd', 'Legs + abdos'],
    muscuExercises: ['Développé couché', 'Squat', 'Soulevé de terre', 'Développé militaire', 'Power clean', 'Front squat', 'Good morning', 'Farmer walk'],
    competitionOpponents: [
      { name: 'Jérémy Lefèvre', club: 'Alliance Marseille' },
      { name: 'Pablo Silva', club: 'Carlson Gracie Toulon' },
      { name: 'Hugo Morel', club: 'Checkmat Marseille' },
      { name: 'Thomas Leroy', club: 'Atos Aix' },
      { name: 'Bruno Vieira', club: 'Gracie Barra Aix' },
    ],
  },

  hedi: {
    key: 'hedi',
    name: 'Hédi',
    birthDate: '1996-11-08',
    gender: 'male',
    heightCm: 175,
    startWeight: 74,
    currentWeight: 70,
    targetWeight: 70,
    belt: 'blanche',
    beltStripes: 4,
    targetBelt: 'bleue',
    practiceMonths: 16,
    style: 'defensif',
    bio: 'Style défensif · spécialiste de la garde · attend la faille, contre efficacement',
    themes: [
      'Closed guard',
      'Spider guard',
      'De la Riva',
      'Lasso',
      'Triangle depuis garde',
      'Omoplata',
      'Armbar depuis garde',
      'Sweep hook',
      'Hip bump',
    ],
    submissions: ['Triangle', 'Omoplata', 'Armbar', 'Kimura depuis garde'],
    weaknesses: ['Passage knee cut', 'Pression passage', 'Smash pass', 'Darce'],
    roster: [
      { name: 'Professeur Lucas', belt: 'noire', weight: '82', skill: 10, style: 'pression + passage', notes: 'Coach · te passe systématiquement la garde' },
      { name: 'Professeur Veni', belt: 'noire', weight: '78', skill: 10, style: 'technique au sol', notes: 'Coach senior · spécialiste du jeu que tu aimes' },
      { name: 'Larbi', belt: 'marron', weight: '85', skill: 9, style: 'pression', notes: 'Écart de poids important · focus défense' },
      { name: 'Houari', belt: 'blanche', weight: '82', skill: 7, style: 'polyvalent', notes: 'Autre blanche 4 galons · même catégorie technique' },
      { name: 'Louis', belt: 'blanche', weight: '84', skill: 6, style: 'offensif', notes: 'Passeur · te challenge ta garde' },
      { name: 'Yanis', belt: 'bleue', weight: '70', skill: 7, style: 'technique', notes: 'Même catégorie · sparring 50/50 rolls techniques' },
      { name: 'Eliott', belt: 'bleue', weight: '72', skill: 6, style: 'technique', notes: 'Partenaire régulier du jeudi' },
      { name: 'Kevin', belt: 'blanche', weight: '90', skill: 4, style: 'puissance brute', notes: 'Beaucoup plus lourd · test de guard retention' },
    ],
    baseSessionsPerWeek: 4,
    winRateBaseline: 0.50,
    sports: ['jjb', 'musculation'],
    club: { name: 'Gracie Barra Les Olives', color: '#DC2626' },
    muscuGym: { name: 'Fitness Park', color: '#10B981' },
    muscuThemes: ['Mobilité + core', 'Endurance de force', 'Stabilité gainage', 'Prehab épaules/genoux', 'Cardio interval'],
    muscuExercises: ['Squat gobelet', 'Pompes archer', 'Tractions', 'Plank variations', 'Hip thrust', 'Bulgarian split squat', 'Kettlebell swing', 'Turkish get-up'],
    competitionOpponents: [
      { name: 'Julien Moreau', club: 'Alliance Aix' },
      { name: 'Rayan Benamar', club: 'Alliance Marseille' },
      { name: 'Victor Amaral', club: 'Carlson Gracie Toulon' },
      { name: 'Arthur Dubois', club: 'Gracie Barra Aix' },
    ],
  },

  yanis: {
    key: 'yanis',
    name: 'Yanis',
    birthDate: '1994-01-30',
    gender: 'male',
    heightCm: 176,
    startWeight: 72,
    currentWeight: 70,
    targetWeight: 70,
    belt: 'bleue',
    beltStripes: 2,
    practiceMonths: 36,
    style: 'technique',
    bio: 'Ceinture bleue · 3 ans de pratique · jeu au sol technique · scientifique du grappling',
    themes: [
      'Berimbolo',
      'De la Riva',
      'Reverse De la Riva',
      'Single leg X',
      'Leg drag',
      'Back attacks',
      'Bow and arrow choke',
      'Straight footlock',
      'Ashi garami',
      'Kneebar',
    ],
    submissions: ['Bow and arrow', 'Rear naked choke', 'Straight footlock', 'Triangle', 'Armbar depuis dos'],
    weaknesses: ['Pression 100kg+', 'Mount bras cadenassé'],
    roster: [
      { name: 'Professeur Lucas', belt: 'noire', weight: '82', skill: 10, style: 'pression + passage', notes: 'Coach · t\'apprend le side control dur' },
      { name: 'Professeur Veni', belt: 'noire', weight: '78', skill: 10, style: 'technique au sol', notes: 'Coach senior · ton modèle de jeu' },
      { name: 'Larbi', belt: 'marron', weight: '85', skill: 9, style: 'pression', notes: 'Adversaire rival · écart de poids 15kg' },
      { name: 'Houari', belt: 'blanche', weight: '82', skill: 7, style: 'polyvalent', notes: 'Tu le domines techniquement · rolls de coaching' },
      { name: 'Hedi', belt: 'blanche', weight: '70', skill: 7, style: 'garde solide', notes: 'Même catégorie · sparring équilibré' },
      { name: 'Louis', belt: 'blanche', weight: '84', skill: 6, style: 'offensif', notes: 'Autre blanche · test de passage dynamique' },
      { name: 'Eliott', belt: 'bleue', weight: '72', skill: 6, style: 'technique', notes: 'Autre blue belt du club' },
      { name: 'Kevin', belt: 'blanche', weight: '90', skill: 4, style: 'puissance brute', notes: 'Très lourd · test leg lock' },
    ],
    baseSessionsPerWeek: 5,
    winRateBaseline: 0.62,
    sports: ['jjb', 'musculation', 'cardio'],
    club: { name: 'Gracie Barra Les Olives', color: '#DC2626' },
    muscuGym: { name: 'Fit\'n Form Marseille', color: '#059669' },
    muscuThemes: ['Strength-endurance', 'HIIT', 'Core + grip', 'Mobilité guerrier', 'Préparation compétition'],
    muscuExercises: ['Clean & press', 'Goblet squat', 'Tractions lestées', 'Rope climb', 'Sandbag carry', 'Burpees', 'Farmer walk', 'Kettlebell snatch'],
    competitionOpponents: [
      { name: 'Lucas Santiago', club: 'Alliance Paris' },
      { name: 'Kenji Tanaka', club: 'Carpe Diem BJJ' },
      { name: 'Mateus Costa', club: 'Gracie Barra Bordeaux' },
      { name: 'Fabio Neves', club: 'Checkmat Lyon' },
      { name: 'Rodrigo Lima', club: 'Alliance Marseille' },
      { name: 'Erik Lundqvist', club: 'Carlson Gracie Toulon' },
    ],
  },

  // ============================================
  // SARAH · Marathonienne (Endurance)
  // ============================================
  sarah: {
    key: 'sarah',
    name: 'Sarah',
    birthDate: '1993-06-12',
    gender: 'female',
    heightCm: 168,
    startWeight: 62,
    currentWeight: 58,
    targetWeight: 57,
    belt: '',
    beltStripes: 0,
    practiceMonths: 48,
    style: 'technique',
    bio: 'Marathonienne · 4 ans de running régulier · PR marathon 3h42 · prépa Paris Marathon 2026',
    themes: [
      'Endurance fondamentale',
      'Fractionné 400m',
      'Seuil lactique',
      'Sortie longue',
      'Côtes (hill repeats)',
      'VMA courte',
      'Foulée économique',
      'Sortie trail',
    ],
    submissions: [], // N/A pour endurance
    weaknesses: [],
    roster: [
      { name: 'Coach Marc',     belt: '', weight: '72', skill: 10, style: 'entraîneur marathon', notes: 'Coach · plan personnalisé Paris Marathon' },
      { name: 'Emma',           belt: '', weight: '54', skill: 8,  style: 'buddy marathon',       notes: 'Running partner du samedi · 21km' },
      { name: 'Thomas',         belt: '', weight: '70', skill: 9,  style: 'trailer',              notes: 'Partenaire trails · ultra 50km' },
      { name: 'Clara',          belt: '', weight: '56', skill: 7,  style: 'semi-marathon',        notes: 'Running club · fractionné mardi' },
      { name: 'Antoine',        belt: '', weight: '75', skill: 8,  style: 'triathlète',           notes: 'Partenaire vélo occasionnel' },
    ],
    baseSessionsPerWeek: 5,
    winRateBaseline: 0.5,
    sports: ['running', 'marathon'],
    club: { name: 'RunnersClub Marseille', color: '#10B981' },
    muscuGym: { name: 'Home gym · renforcement', color: '#3B82F6' },
    muscuThemes: ['PPG runner', 'Gainage', 'Mobilité hanches', 'Stretching post-run'],
    muscuExercises: ['Planches', 'Fentes', 'Squats poids corps', 'Hip thrust', 'Mollets', 'Band hip abduction'],
    competitionOpponents: [
      { name: 'Marathon de Paris', club: 'ASO' },
      { name: 'Semi de Marseille', club: 'GPM Sports' },
      { name: '10 km du Mucem',    club: 'Association' },
      { name: 'Trail de la Côte Bleue', club: 'TCB' },
      { name: 'Marseille-Cassis',  club: 'MSC' },
    ],
  },

  // ============================================
  // CLÉMENT · Hyroxien (Force)
  // ============================================
  clement: {
    key: 'clement',
    name: 'Clément',
    birthDate: '1991-11-28',
    gender: 'male',
    heightCm: 181,
    startWeight: 92,
    currentWeight: 86,
    targetWeight: 84,
    belt: '',
    beltStripes: 0,
    practiceMonths: 24,
    style: 'polyvalent',
    bio: 'Compétiteur Hyrox · PR 1h03 au Hyrox Paris · objectif sub-1h à Hyrox Amsterdam · mix force-endurance',
    themes: [
      'Sled push/pull',
      'Burpee broad jump',
      'Running intercalé',
      'Wall balls intensité',
      'Farmer carry distance',
      'Sandbag lunges',
      'SkiErg interval',
      'Transitions rapides',
    ],
    submissions: [],
    weaknesses: [],
    roster: [
      { name: 'Coach Julie', belt: '', weight: '62', skill: 10, style: 'Coach Hyrox certifiée', notes: 'Plan compète Hyrox · programmation 12 semaines' },
      { name: 'Vincent',      belt: '', weight: '88', skill: 9,  style: 'Doubles Hyrox',         notes: 'Partenaire doubles · même gabarit' },
      { name: 'Benjamin',     belt: '', weight: '82', skill: 8,  style: 'Pro Hyrox',             notes: 'Pro division · benchmark pour training' },
      { name: 'Alexandre',    belt: '', weight: '90', skill: 7,  style: 'Fonctionnel',           notes: 'Training partner mercredi' },
      { name: 'Mathieu',      belt: '', weight: '85', skill: 8,  style: 'Runner reconverti',     notes: 'Fort sur le running, faible sur sled' },
    ],
    baseSessionsPerWeek: 5,
    winRateBaseline: 0.5,
    sports: ['hyrox', 'running', 'musculation'],
    club: { name: 'Hyrox Box Marseille', color: '#F97316' },
    muscuGym: { name: 'FitLab · functional fitness', color: '#DC2626' },
    muscuThemes: ['Strength block', 'Hyrox simulation', 'Conditioning', 'Weak stations', 'Compromised running'],
    muscuExercises: ['Sled push', 'Sled pull', 'Burpee broad jump', 'Wall balls', 'Farmer carry', 'Sandbag lunges', 'SkiErg', 'Rower'],
    competitionOpponents: [
      { name: 'Hyrox Paris 2025',    club: 'Hyrox Event' },
      { name: 'Hyrox Barcelona',     club: 'Hyrox Event' },
      { name: 'Hyrox Amsterdam',     club: 'Hyrox Event' },
      { name: 'Hyrox London',        club: 'Hyrox Event' },
      { name: 'Hyrox Chicago Pro',   club: 'Hyrox Pro' },
    ],
  },

  // ============================================
  // NINA · CrossFitter (Force)
  // ============================================
  nina: {
    key: 'nina',
    name: 'Nina',
    birthDate: '1994-03-18',
    gender: 'female',
    heightCm: 165,
    startWeight: 60,
    currentWeight: 63,
    targetWeight: 64,
    belt: '',
    beltStripes: 0,
    practiceMonths: 36,
    style: 'polyvalent',
    bio: 'CrossFit athlete · 3 ans · Squat 105kg · Deadlift 130kg · prépa Open CrossFit 2026',
    themes: [
      'Olympic lifts (clean, snatch)',
      'Hero WODs',
      'Benchmark girls (Fran, Grace)',
      'Gymnastics (muscle-ups, HSPU)',
      'Strength 5x5',
      'Metcons',
      'Double unders',
      'Rowing intervals',
    ],
    submissions: [],
    weaknesses: [],
    roster: [
      { name: 'Coach Mike',   belt: '', weight: '88', skill: 10, style: 'L2 CrossFit · nutrition', notes: 'Programmation individualisée' },
      { name: 'Lucas',        belt: '', weight: '82', skill: 9,  style: 'Compétiteur',             notes: 'Training partner · même box' },
      { name: 'Emma',         belt: '', weight: '58', skill: 8,  style: 'Gymnastics',              notes: 'Spécialiste muscle-ups' },
      { name: 'Pierre',       belt: '', weight: '95', skill: 8,  style: 'Strength focus',          notes: 'Benchmark squat/DL' },
      { name: 'Sophie',       belt: '', weight: '62', skill: 7,  style: 'Endurance',               notes: 'Partenaire metcons' },
    ],
    baseSessionsPerWeek: 5,
    winRateBaseline: 0.5,
    sports: ['crossfit', 'musculation'],
    club: { name: 'CrossFit Marseille', color: '#DC2626' },
    muscuGym: { name: 'CrossFit Marseille', color: '#DC2626' },
    muscuThemes: ['Strength', 'Hero WOD', 'Girls WOD', 'Olympic lifts', 'Gymnastics', 'Metcon'],
    muscuExercises: ['Back squat', 'Deadlift', 'Clean', 'Snatch', 'Thrusters', 'Muscle-ups', 'Handstand push-ups', 'Box jumps', 'Double unders', 'Wall balls'],
    competitionOpponents: [
      { name: 'Open CrossFit 2025',       club: 'CrossFit HQ' },
      { name: 'French Throwdown',         club: 'FT Events' },
      { name: 'Summer Battle',            club: 'FR Competition' },
      { name: 'Mediterranean Throwdown',  club: 'MT Events' },
    ],
  },
};

export const DEMO_PROFILE_KEYS = Object.keys(DEMO_PROFILES) as (keyof typeof DEMO_PROFILES)[];

// ============================================
// HELPERS
// ============================================

/** Nombre de semaines pour une période */
export const periodToWeeks = (period: DemoPeriod): number => {
  switch (period) {
    case '3mo': return 13;
    case '6mo': return 26;
    case '1y':  return 52;
  }
};

/** Multiplicateur de volume selon période */
export const periodMultiplier = (period: DemoPeriod): number => {
  switch (period) {
    case '3mo': return 0.25;
    case '6mo': return 0.5;
    case '1y':  return 1.0;
  }
};

/** Nombre de séances cible pour une période donnée */
export const sessionsForPeriod = (profile: DemoProfile, period: DemoPeriod): number => {
  const weeks = periodToWeeks(period);
  // Avec variance : 20% de semaines creuses (vacances, maladie, blessure)
  const activeWeeks = Math.round(weeks * 0.8);
  return Math.round(profile.baseSessionsPerWeek * activeWeeks);
};

/** Label lisible d'une période */
export const periodLabel = (period: DemoPeriod): string => {
  switch (period) {
    case '3mo': return '3 mois';
    case '6mo': return '6 mois';
    case '1y':  return '1 an';
  }
};
