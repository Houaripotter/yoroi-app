// ============================================
// YOROI - CATÉGORIES DE POIDS PAR SPORT
// ============================================
// Catégories officielles pour chaque discipline

export interface WeightCategory {
  id: string;
  name: string;
  nameEn: string;
  minWeight: number; // kg
  maxWeight: number; // kg
  gender?: 'male' | 'female' | 'both';
}

export interface SportWeightCategories {
  sportId: string;
  sportName: string;
  categories: WeightCategory[];
}

// ═══════════════════════════════════════════════
// JJU-JITSU BRÉSILIEN (IBJJF)
// ═══════════════════════════════════════════════

const JJB_MALE_CATEGORIES: WeightCategory[] = [
  { id: 'jjb_m_galo', name: 'Galo', nameEn: 'Rooster', minWeight: 0, maxWeight: 57.5, gender: 'male' },
  { id: 'jjb_m_pluma', name: 'Pluma', nameEn: 'Feather', minWeight: 57.5, maxWeight: 64, gender: 'male' },
  { id: 'jjb_m_pena', name: 'Pena', nameEn: 'Light', minWeight: 64, maxWeight: 70, gender: 'male' },
  { id: 'jjb_m_leve', name: 'Leve', nameEn: 'Light', minWeight: 70, maxWeight: 76, gender: 'male' },
  { id: 'jjb_m_medio', name: 'Médio', nameEn: 'Middle', minWeight: 76, maxWeight: 82.3, gender: 'male' },
  { id: 'jjb_m_meioPesado', name: 'Meio-Pesado', nameEn: 'Medium Heavy', minWeight: 82.3, maxWeight: 88.3, gender: 'male' },
  { id: 'jjb_m_pesado', name: 'Pesado', nameEn: 'Heavy', minWeight: 88.3, maxWeight: 94.3, gender: 'male' },
  { id: 'jjb_m_superPesado', name: 'Super-Pesado', nameEn: 'Super Heavy', minWeight: 94.3, maxWeight: 100.5, gender: 'male' },
  { id: 'jjb_m_pesadissimo', name: 'Pesadíssimo', nameEn: 'Ultra Heavy', minWeight: 100.5, maxWeight: 999, gender: 'male' },
];

const JJB_FEMALE_CATEGORIES: WeightCategory[] = [
  { id: 'jjb_f_galo', name: 'Galo', nameEn: 'Rooster', minWeight: 0, maxWeight: 48.5, gender: 'female' },
  { id: 'jjb_f_pluma', name: 'Pluma', nameEn: 'Feather', minWeight: 48.5, maxWeight: 53.5, gender: 'female' },
  { id: 'jjb_f_pena', name: 'Pena', nameEn: 'Light Feather', minWeight: 53.5, maxWeight: 58.5, gender: 'female' },
  { id: 'jjb_f_leve', name: 'Leve', nameEn: 'Light', minWeight: 58.5, maxWeight: 64, gender: 'female' },
  { id: 'jjb_f_medio', name: 'Médio', nameEn: 'Middle', minWeight: 64, maxWeight: 69, gender: 'female' },
  { id: 'jjb_f_meioPesado', name: 'Meio-Pesado', nameEn: 'Medium Heavy', minWeight: 69, maxWeight: 74, gender: 'female' },
  { id: 'jjb_f_pesado', name: 'Pesado', nameEn: 'Heavy', minWeight: 74, maxWeight: 79.3, gender: 'female' },
  { id: 'jjb_f_superPesado', name: 'Super-Pesado', nameEn: 'Super Heavy', minWeight: 79.3, maxWeight: 999, gender: 'female' },
];

// ═══════════════════════════════════════════════
// BOXE (Olympique + Pro)
// ═══════════════════════════════════════════════

const BOXE_CATEGORIES: WeightCategory[] = [
  { id: 'boxe_minimouche', name: 'Mini-mouche', nameEn: 'Minimum', minWeight: 0, maxWeight: 47.6, gender: 'both' },
  { id: 'boxe_mimouche', name: 'Mi-mouche', nameEn: 'Light Flyweight', minWeight: 47.6, maxWeight: 48.9, gender: 'both' },
  { id: 'boxe_mouche', name: 'Mouche', nameEn: 'Flyweight', minWeight: 48.9, maxWeight: 51, gender: 'both' },
  { id: 'boxe_coq', name: 'Coq', nameEn: 'Bantamweight', minWeight: 51, maxWeight: 54, gender: 'both' },
  { id: 'boxe_plume', name: 'Plume', nameEn: 'Featherweight', minWeight: 54, maxWeight: 57, gender: 'both' },
  { id: 'boxe_superPlume', name: 'Super-plume', nameEn: 'Super Featherweight', minWeight: 57, maxWeight: 59, gender: 'both' },
  { id: 'boxe_leger', name: 'Léger', nameEn: 'Lightweight', minWeight: 59, maxWeight: 61, gender: 'both' },
  { id: 'boxe_superLeger', name: 'Super-léger', nameEn: 'Super Lightweight', minWeight: 61, maxWeight: 64, gender: 'both' },
  { id: 'boxe_miMoyen', name: 'Mi-moyen', nameEn: 'Welterweight', minWeight: 64, maxWeight: 67, gender: 'both' },
  { id: 'boxe_superMoyen', name: 'Super mi-moyen', nameEn: 'Super Welterweight', minWeight: 67, maxWeight: 71, gender: 'both' },
  { id: 'boxe_moyen', name: 'Moyen', nameEn: 'Middleweight', minWeight: 71, maxWeight: 75, gender: 'both' },
  { id: 'boxe_superMoyenBis', name: 'Super-moyen', nameEn: 'Super Middleweight', minWeight: 75, maxWeight: 80, gender: 'both' },
  { id: 'boxe_miLourd', name: 'Mi-lourd', nameEn: 'Light Heavyweight', minWeight: 80, maxWeight: 90, gender: 'both' },
  { id: 'boxe_lourd', name: 'Lourd', nameEn: 'Heavyweight', minWeight: 90, maxWeight: 999, gender: 'both' },
];

// ═══════════════════════════════════════════════
// MMA / UFC
// ═══════════════════════════════════════════════

const MMA_CATEGORIES: WeightCategory[] = [
  { id: 'mma_paille', name: 'Poids paille', nameEn: 'Strawweight', minWeight: 0, maxWeight: 52.2, gender: 'both' },
  { id: 'mma_mouche', name: 'Poids mouche', nameEn: 'Flyweight', minWeight: 52.2, maxWeight: 56.7, gender: 'both' },
  { id: 'mma_coq', name: 'Poids coq', nameEn: 'Bantamweight', minWeight: 56.7, maxWeight: 61.2, gender: 'both' },
  { id: 'mma_plume', name: 'Poids plume', nameEn: 'Featherweight', minWeight: 61.2, maxWeight: 65.8, gender: 'both' },
  { id: 'mma_leger', name: 'Poids léger', nameEn: 'Lightweight', minWeight: 65.8, maxWeight: 70.3, gender: 'both' },
  { id: 'mma_miMoyen', name: 'Poids mi-moyen', nameEn: 'Welterweight', minWeight: 70.3, maxWeight: 77.1, gender: 'both' },
  { id: 'mma_moyen', name: 'Poids moyen', nameEn: 'Middleweight', minWeight: 77.1, maxWeight: 83.9, gender: 'both' },
  { id: 'mma_miLourd', name: 'Poids mi-lourd', nameEn: 'Light Heavyweight', minWeight: 83.9, maxWeight: 93, gender: 'both' },
  { id: 'mma_lourd', name: 'Poids lourd', nameEn: 'Heavyweight', minWeight: 93, maxWeight: 120.2, gender: 'both' },
  { id: 'mma_superLourd', name: 'Poids super-lourd', nameEn: 'Super Heavyweight', minWeight: 120.2, maxWeight: 999, gender: 'both' },
];

// ═══════════════════════════════════════════════
// JUDO (IJF)
// ═══════════════════════════════════════════════

const JUDO_MALE_CATEGORIES: WeightCategory[] = [
  { id: 'judo_m_extra_leger', name: 'Extra-léger (-60kg)', nameEn: 'Extra Light', minWeight: 0, maxWeight: 60, gender: 'male' },
  { id: 'judo_m_mi_leger', name: 'Mi-léger (-66kg)', nameEn: 'Half Light', minWeight: 60, maxWeight: 66, gender: 'male' },
  { id: 'judo_m_leger', name: 'Léger (-73kg)', nameEn: 'Lightweight', minWeight: 66, maxWeight: 73, gender: 'male' },
  { id: 'judo_m_mi_moyen', name: 'Mi-moyen (-81kg)', nameEn: 'Half Middle', minWeight: 73, maxWeight: 81, gender: 'male' },
  { id: 'judo_m_moyen', name: 'Moyen (-90kg)', nameEn: 'Middleweight', minWeight: 81, maxWeight: 90, gender: 'male' },
  { id: 'judo_m_mi_lourd', name: 'Mi-lourd (-100kg)', nameEn: 'Half Heavy', minWeight: 90, maxWeight: 100, gender: 'male' },
  { id: 'judo_m_lourd', name: 'Lourd (+100kg)', nameEn: 'Heavyweight', minWeight: 100, maxWeight: 999, gender: 'male' },
];

const JUDO_FEMALE_CATEGORIES: WeightCategory[] = [
  { id: 'judo_f_extra_leger', name: 'Extra-léger (-48kg)', nameEn: 'Extra Light', minWeight: 0, maxWeight: 48, gender: 'female' },
  { id: 'judo_f_mi_leger', name: 'Mi-léger (-52kg)', nameEn: 'Half Light', minWeight: 48, maxWeight: 52, gender: 'female' },
  { id: 'judo_f_leger', name: 'Léger (-57kg)', nameEn: 'Lightweight', minWeight: 52, maxWeight: 57, gender: 'female' },
  { id: 'judo_f_mi_moyen', name: 'Mi-moyen (-63kg)', nameEn: 'Half Middle', minWeight: 57, maxWeight: 63, gender: 'female' },
  { id: 'judo_f_moyen', name: 'Moyen (-70kg)', nameEn: 'Middleweight', minWeight: 63, maxWeight: 70, gender: 'female' },
  { id: 'judo_f_mi_lourd', name: 'Mi-lourd (-78kg)', nameEn: 'Half Heavy', minWeight: 70, maxWeight: 78, gender: 'female' },
  { id: 'judo_f_lourd', name: 'Lourd (+78kg)', nameEn: 'Heavyweight', minWeight: 78, maxWeight: 999, gender: 'female' },
];

// ═══════════════════════════════════════════════
// LUTTE (Freestyle & Gréco-romaine)
// ═══════════════════════════════════════════════

const LUTTE_MALE_CATEGORIES: WeightCategory[] = [
  { id: 'lutte_m_57', name: '57 kg', nameEn: '57 kg', minWeight: 0, maxWeight: 57, gender: 'male' },
  { id: 'lutte_m_65', name: '65 kg', nameEn: '65 kg', minWeight: 57, maxWeight: 65, gender: 'male' },
  { id: 'lutte_m_74', name: '74 kg', nameEn: '74 kg', minWeight: 65, maxWeight: 74, gender: 'male' },
  { id: 'lutte_m_86', name: '86 kg', nameEn: '86 kg', minWeight: 74, maxWeight: 86, gender: 'male' },
  { id: 'lutte_m_97', name: '97 kg', nameEn: '97 kg', minWeight: 86, maxWeight: 97, gender: 'male' },
  { id: 'lutte_m_125', name: '125 kg', nameEn: '125 kg', minWeight: 97, maxWeight: 125, gender: 'male' },
];

const LUTTE_FEMALE_CATEGORIES: WeightCategory[] = [
  { id: 'lutte_f_50', name: '50 kg', nameEn: '50 kg', minWeight: 0, maxWeight: 50, gender: 'female' },
  { id: 'lutte_f_53', name: '53 kg', nameEn: '53 kg', minWeight: 50, maxWeight: 53, gender: 'female' },
  { id: 'lutte_f_57', name: '57 kg', nameEn: '57 kg', minWeight: 53, maxWeight: 57, gender: 'female' },
  { id: 'lutte_f_62', name: '62 kg', nameEn: '62 kg', minWeight: 57, maxWeight: 62, gender: 'female' },
  { id: 'lutte_f_68', name: '68 kg', nameEn: '68 kg', minWeight: 62, maxWeight: 68, gender: 'female' },
  { id: 'lutte_f_76', name: '76 kg', nameEn: '76 kg', minWeight: 68, maxWeight: 76, gender: 'female' },
];

// ═══════════════════════════════════════════════
// CATALOGUE PAR SPORT
// ═══════════════════════════════════════════════

export const WEIGHT_CATEGORIES_BY_SPORT: { [sportId: string]: SportWeightCategories } = {
  jjb: {
    sportId: 'jjb',
    sportName: 'Jiu-Jitsu Brésilien',
    categories: [...JJB_MALE_CATEGORIES, ...JJB_FEMALE_CATEGORIES],
  },
  boxe: {
    sportId: 'boxe',
    sportName: 'Boxe',
    categories: BOXE_CATEGORIES,
  },
  mma: {
    sportId: 'mma',
    sportName: 'MMA',
    categories: MMA_CATEGORIES,
  },
  judo: {
    sportId: 'judo',
    sportName: 'Judo',
    categories: [...JUDO_MALE_CATEGORIES, ...JUDO_FEMALE_CATEGORIES],
  },
  lutte: {
    sportId: 'lutte',
    sportName: 'Lutte',
    categories: [...LUTTE_MALE_CATEGORIES, ...LUTTE_FEMALE_CATEGORIES],
  },
  'lutte-greco': {
    sportId: 'lutte-greco',
    sportName: 'Lutte Gréco-romaine',
    categories: [...LUTTE_MALE_CATEGORIES, ...LUTTE_FEMALE_CATEGORIES],
  },
  'lutte-libre': {
    sportId: 'lutte-libre',
    sportName: 'Lutte Libre',
    categories: [...LUTTE_MALE_CATEGORIES, ...LUTTE_FEMALE_CATEGORIES],
  },
};

// ═══════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════

/**
 * Récupère les catégories de poids pour un sport donné
 */
export const getWeightCategoriesForSport = (sportId: string): WeightCategory[] => {
  const sport = WEIGHT_CATEGORIES_BY_SPORT[sportId];
  return sport?.categories || [];
};

/**
 * Récupère les catégories de poids filtrées par genre
 */
export const getWeightCategoriesBySportAndGender = (
  sportId: string,
  gender: 'male' | 'female'
): WeightCategory[] => {
  const categories = getWeightCategoriesForSport(sportId);
  return categories.filter(cat => cat.gender === gender || cat.gender === 'both');
};

/**
 * Trouve la catégorie de poids correspondante selon le poids actuel
 */
export const findWeightCategoryByWeight = (
  sportId: string,
  weight: number,
  gender: 'male' | 'female'
): WeightCategory | null => {
  const categories = getWeightCategoriesBySportAndGender(sportId, gender);
  return categories.find(cat => weight >= cat.minWeight && weight <= cat.maxWeight) || null;
};

/**
 * Vérifie si un sport a des catégories de poids
 */
export const sportHasWeightCategories = (sportId: string): boolean => {
  return !!WEIGHT_CATEGORIES_BY_SPORT[sportId];
};
