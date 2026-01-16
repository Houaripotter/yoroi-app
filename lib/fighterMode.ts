// ============================================
// YOROI - MODE COMPÉTITEUR / FIGHTER
// ============================================

export type UserMode = 'loisir' | 'competiteur';
export type Sport =
  | 'jjb'
  | 'mma'
  | 'boxe'
  | 'muay_thai'
  | 'judo'
  | 'karate'
  | 'taekwondo'
  | 'krav_maga'
  | 'tennis'
  | 'padel'
  | 'badminton'
  | 'squash'
  | 'ping_pong'
  | 'football'
  | 'basket'
  | 'handball'
  | 'rugby'
  | 'volleyball'
  | 'trail'
  | 'running'
  | 'cyclisme'
  | 'natation'
  | 'triathlon'
  | 'marche_nordique'
  | 'randonnee'
  | 'escalade'
  | 'crossfit'
  | 'hyrox'
  | 'musculation'
  | 'yoga'
  | 'pilates'
  | 'hiit'
  | 'calisthenics'
  | 'surf'
  | 'ski'
  | 'snowboard'
  | 'skate'
  | 'golf'
  | 'equitation'
  | 'danse'
  | 'autre';
export type CombatResultat = 'victoire' | 'defaite' | 'nul';
export type CombatMethode = 'soumission' | 'ko' | 'tko' | 'points' | 'decision' | 'dq';
export type CompetitionStatut = 'a_venir' | 'terminee' | 'annulee';

// ============================================
// CATÉGORIES DE POIDS PAR SPORT
// ============================================

export interface WeightCategory {
  id: string;
  name: string;
  maxWeight: number; // en kg
  minWeight?: number;
}

// JJB (Gi) - IBJJF
export const JJB_WEIGHT_CATEGORIES: WeightCategory[] = [
  { id: 'galo', name: 'Galo', maxWeight: 58.5 },
  { id: 'pluma', name: 'Pluma', maxWeight: 64 },
  { id: 'pena', name: 'Pena', maxWeight: 70 },
  { id: 'leve', name: 'Leve', maxWeight: 76 },
  { id: 'medio', name: 'Médio', maxWeight: 82.3 },
  { id: 'meio_pesado', name: 'Meio-Pesado', maxWeight: 88.3 },
  { id: 'pesado', name: 'Pesado', maxWeight: 94.3 },
  { id: 'super_pesado', name: 'Super-Pesado', maxWeight: 100.5 },
  { id: 'pesadissimo', name: 'Pesadíssimo', maxWeight: 999, minWeight: 100.5 },
];

// MMA (UFC)
export const MMA_WEIGHT_CATEGORIES: WeightCategory[] = [
  { id: 'paille', name: 'Paille', maxWeight: 52.5 },
  { id: 'mouche', name: 'Mouche', maxWeight: 56.7 },
  { id: 'coq', name: 'Coq', maxWeight: 61.2 },
  { id: 'plume', name: 'Plume', maxWeight: 65.8 },
  { id: 'leger', name: 'Léger', maxWeight: 70.3 },
  { id: 'welter', name: 'Welter', maxWeight: 77.1 },
  { id: 'moyen', name: 'Moyen', maxWeight: 83.9 },
  { id: 'mi_lourd', name: 'Mi-lourd', maxWeight: 93 },
  { id: 'lourd', name: 'Lourd', maxWeight: 120.2 },
];

// BOXE
export const BOXE_WEIGHT_CATEGORIES: WeightCategory[] = [
  { id: 'mini_mouche', name: 'Mini-mouche', maxWeight: 47.6 },
  { id: 'mouche', name: 'Mouche', maxWeight: 50.8 },
  { id: 'super_mouche', name: 'Super-mouche', maxWeight: 52.2 },
  { id: 'coq', name: 'Coq', maxWeight: 53.5 },
  { id: 'super_coq', name: 'Super-coq', maxWeight: 55.3 },
  { id: 'plume', name: 'Plume', maxWeight: 57.2 },
  { id: 'super_plume', name: 'Super-plume', maxWeight: 59 },
  { id: 'leger', name: 'Léger', maxWeight: 61.2 },
  { id: 'super_leger', name: 'Super-léger', maxWeight: 63.5 },
  { id: 'welter', name: 'Welter', maxWeight: 66.7 },
  { id: 'super_welter', name: 'Super-welter', maxWeight: 69.9 },
  { id: 'moyen', name: 'Moyen', maxWeight: 72.6 },
  { id: 'super_moyen', name: 'Super-moyen', maxWeight: 76.2 },
  { id: 'mi_lourd', name: 'Mi-lourd', maxWeight: 79.4 },
  { id: 'lourd_leger', name: 'Lourd-léger', maxWeight: 90.7 },
  { id: 'lourd', name: 'Lourd', maxWeight: 999, minWeight: 90.7 },
];

// MUAY THAI
export const MUAY_THAI_WEIGHT_CATEGORIES: WeightCategory[] = [
  { id: 'mini_mouche', name: 'Mini-mouche', maxWeight: 47.6 },
  { id: 'mouche', name: 'Mouche', maxWeight: 51 },
  { id: 'coq', name: 'Coq', maxWeight: 53.5 },
  { id: 'plume', name: 'Plume', maxWeight: 57 },
  { id: 'leger', name: 'Léger', maxWeight: 60 },
  { id: 'super_leger', name: 'Super-léger', maxWeight: 63.5 },
  { id: 'welter', name: 'Welter', maxWeight: 67 },
  { id: 'super_welter', name: 'Super-welter', maxWeight: 71 },
  { id: 'moyen', name: 'Moyen', maxWeight: 75 },
  { id: 'super_moyen', name: 'Super-moyen', maxWeight: 79 },
  { id: 'mi_lourd', name: 'Mi-lourd', maxWeight: 86 },
  { id: 'lourd', name: 'Lourd', maxWeight: 95 },
  { id: 'super_lourd', name: 'Super-lourd', maxWeight: 999, minWeight: 95 },
];

export function getWeightCategories(sport: Sport): WeightCategory[] {
  switch (sport) {
    case 'jjb':
      return JJB_WEIGHT_CATEGORIES;
    case 'mma':
      return MMA_WEIGHT_CATEGORIES;
    case 'boxe':
      return BOXE_WEIGHT_CATEGORIES;
    case 'muay_thai':
      return MUAY_THAI_WEIGHT_CATEGORIES;
    default:
      return JJB_WEIGHT_CATEGORIES;
  }
}

export function findWeightCategory(sport: Sport, weight: number): WeightCategory | null {
  const categories = getWeightCategories(sport);
  return categories.find(cat => {
    if (cat.minWeight) {
      return weight >= cat.minWeight;
    }
    return weight <= cat.maxWeight;
  }) || null;
}

// ============================================
// INTERFACES
// ============================================

export interface Competition {
  id: number;
  nom: string;
  date: string; // ISO date
  lieu?: string;
  sport: Sport;
  type_evenement?: string; // "Combat", "Match", "Course", "Compétition", etc.
  categorie_poids?: string;
  poids_max?: number;
  statut: CompetitionStatut;
  created_at?: string;
}

export interface Combat {
  id: number;
  competition_id?: number;
  date: string; // ISO date
  resultat: CombatResultat;
  methode?: CombatMethode;
  technique?: string;
  round?: number;
  temps?: string; // "3:42"
  adversaire_nom?: string;
  adversaire_club?: string;
  poids_pesee?: number;
  poids_jour_j?: number;
  notes?: string;
  created_at?: string;
}

export interface Hydratation {
  id: number;
  date: string; // ISO date
  heure: string; // HH:mm
  quantite_ml: number;
  type: 'eau' | 'cafe' | 'the' | 'sport_drink';
  created_at?: string;
}

export interface ObjectifPoids {
  id: number;
  competition_id?: number;
  poids_depart: number;
  poids_cible: number;
  date_pesee: string; // ISO date
  statut: 'en_cours' | 'atteint' | 'echoue';
  created_at?: string;
}

export interface UserProfile {
  mode: UserMode;
  sport?: Sport;
  categorie_poids?: string;
  poids_categorie_max?: number;
  ceinture?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function calculateDaysUntil(targetDate: string): number {
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function calculateRecord(combats: Combat[]): { victoires: number; defaites: number; nuls: number } {
  return combats.reduce(
    (acc, combat) => {
      if (combat.resultat === 'victoire') acc.victoires++;
      else if (combat.resultat === 'defaite') acc.defaites++;
      else if (combat.resultat === 'nul') acc.nuls++;
      return acc;
    },
    { victoires: 0, defaites: 0, nuls: 0 }
  );
}

export function calculateWinRate(combats: Combat[]): number {
  if (combats.length === 0) return 0;
  const record = calculateRecord(combats);
  return Math.round((record.victoires / combats.length) * 100);
}

export function isWeightInCategory(weight: number, categoryMax: number, margin: number = 2): boolean {
  return weight <= categoryMax + margin;
}

export function calculateWeightToLose(currentWeight: number, targetWeight: number): number {
  return Math.max(0, currentWeight - targetWeight);
}

// ============================================
// SPORTS LABELS
// ============================================

export const SPORT_LABELS: Record<Sport, string> = {
  jjb: 'Jiu-Jitsu Brésilien',
  mma: 'MMA',
  boxe: 'Boxe',
  muay_thai: 'Muay Thaï',
  judo: 'Judo',
  karate: 'Karaté',
  taekwondo: 'Taekwondo',
  krav_maga: 'Krav Maga',
  tennis: 'Tennis',
  padel: 'Padel',
  badminton: 'Badminton',
  squash: 'Squash',
  ping_pong: 'Ping-Pong',
  football: 'Football',
  basket: 'Basketball',
  handball: 'Handball',
  rugby: 'Rugby',
  volleyball: 'Volleyball',
  trail: 'Trail',
  running: 'Course à pied',
  cyclisme: 'Cyclisme',
  natation: 'Natation',
  triathlon: 'Triathlon',
  marche_nordique: 'Marche Nordique',
  randonnee: 'Randonnée',
  escalade: 'Escalade',
  crossfit: 'CrossFit',
  hyrox: 'HYROX',
  musculation: 'Musculation',
  yoga: 'Yoga',
  pilates: 'Pilates',
  hiit: 'HIIT',
  calisthenics: 'Calisthenics',
  surf: 'Surf',
  ski: 'Ski',
  snowboard: 'Snowboard',
  skate: 'Skate',
  golf: 'Golf',
  equitation: 'Équitation',
  danse: 'Danse',
  autre: 'Autre',
};

export const SPORT_ICONS: Record<Sport, string> = {
  jjb: '',
  mma: '',
  boxe: '',
  muay_thai: '',
  judo: '',
  karate: '',
  taekwondo: '',
  krav_maga: '',
  tennis: '',
  padel: '',
  badminton: '',
  squash: '',
  ping_pong: '',
  football: '',
  basket: '',
  handball: '',
  rugby: '',
  volleyball: '',
  trail: '',
  running: '',
  cyclisme: '',
  natation: '',
  triathlon: '',
  marche_nordique: '🚶',
  randonnee: '🥾',
  escalade: '',
  crossfit: '',
  hyrox: '',
  musculation: '',
  yoga: '',
  pilates: '',
  hiit: '',
  calisthenics: '',
  surf: '',
  ski: '',
  snowboard: '🏂',
  skate: '🛹',
  golf: '⛳',
  equitation: '🏇',
  danse: '💃',
  autre: '',
};

// ============================================
// CEINTURES JJB
// ============================================

export const JJB_BELTS = [
  { id: 'blanche', name: 'Blanche', color: '#FFFFFF' },
  { id: 'bleue', name: 'Bleue', color: '#0066CC' },
  { id: 'violette', name: 'Violette', color: '#6B46C1' },
  { id: 'marron', name: 'Marron', color: '#8B4513' },
  { id: 'noire', name: 'Noire', color: '#000000' },
];
