import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPETITOR_PROFILE_KEY = '@yoroi_competitor_profile';

export interface CompetitorProfile {
  gender: 'male' | 'female' | null;
  category: string | null;
  belt: string | null;
  currentWeight: number | null;
}

// Catégories IBJJF Hommes (poids en kg)
export const IBJJF_CATEGORIES_MEN = [
  { id: 'rooster', name: 'Rooster', weight: '57.5 kg', maxWeight: 57.5 },
  { id: 'light-feather', name: 'Light Feather', weight: '64 kg', maxWeight: 64 },
  { id: 'feather', name: 'Feather', weight: '70 kg', maxWeight: 70 },
  { id: 'light', name: 'Light', weight: '76 kg', maxWeight: 76 },
  { id: 'middle', name: 'Middle', weight: '82.3 kg', maxWeight: 82.3 },
  { id: 'medium-heavy', name: 'Medium Heavy', weight: '88.3 kg', maxWeight: 88.3 },
  { id: 'heavy', name: 'Heavy', weight: '94.3 kg', maxWeight: 94.3 },
  { id: 'super-heavy', name: 'Super Heavy', weight: '100.5 kg', maxWeight: 100.5 },
  { id: 'ultra-heavy', name: 'Ultra Heavy', weight: '+100.5 kg', maxWeight: 999 },
];

// Catégories IBJJF Femmes (poids en kg)
export const IBJJF_CATEGORIES_WOMEN = [
  { id: 'rooster', name: 'Rooster', weight: '48.5 kg', maxWeight: 48.5 },
  { id: 'light-feather', name: 'Light Feather', weight: '53.5 kg', maxWeight: 53.5 },
  { id: 'feather', name: 'Feather', weight: '58.5 kg', maxWeight: 58.5 },
  { id: 'light', name: 'Light', weight: '64 kg', maxWeight: 64 },
  { id: 'middle', name: 'Middle', weight: '69 kg', maxWeight: 69 },
  { id: 'medium-heavy', name: 'Medium Heavy', weight: '74 kg', maxWeight: 74 },
  { id: 'heavy', name: 'Heavy', weight: '79.3 kg', maxWeight: 79.3 },
  { id: 'super-heavy', name: 'Super Heavy', weight: '+79.3 kg', maxWeight: 999 },
];

// Ceintures BJJ
export const BJJ_BELTS = [
  { id: 'white', name: 'Blanche', color: '#FFFFFF', borderColor: '#E5E7EB' },
  { id: 'blue', name: 'Bleue', color: '#3B82F6', borderColor: '#3B82F6' },
  { id: 'purple', name: 'Violette', color: '#8B5CF6', borderColor: '#8B5CF6' },
  { id: 'brown', name: 'Marron', color: '#78350F', borderColor: '#78350F' },
  { id: 'black', name: 'Noire', color: '#1F2937', borderColor: '#1F2937' },
];

/**
 * Charge le profil compétiteur depuis AsyncStorage
 */
export const loadCompetitorProfile = async (): Promise<CompetitorProfile> => {
  try {
    const stored = await AsyncStorage.getItem(COMPETITOR_PROFILE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Erreur chargement profil compétiteur:', error);
  }

  return {
    gender: null,
    category: null,
    belt: null,
    currentWeight: null,
  };
};

/**
 * Sauvegarde le profil compétiteur dans AsyncStorage
 */
export const saveCompetitorProfile = async (profile: CompetitorProfile): Promise<void> => {
  try {
    await AsyncStorage.setItem(COMPETITOR_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Erreur sauvegarde profil compétiteur:', error);
    throw error;
  }
};

/**
 * Obtient les catégories en fonction du genre
 */
export const getCategoriesByGender = (gender: 'male' | 'female' | null) => {
  if (!gender) return [];
  return gender === 'female' ? IBJJF_CATEGORIES_WOMEN : IBJJF_CATEGORIES_MEN;
};

/**
 * Recommande une catégorie en fonction du poids et du genre
 */
export const getRecommendedCategory = (weight: number, gender: 'male' | 'female' | null) => {
  if (!gender || !weight) return null;
  const categories = getCategoriesByGender(gender);
  return categories.find(cat => weight <= cat.maxWeight);
};

/**
 * Obtient le nom d'une catégorie par son ID et genre
 */
export const getCategoryName = (categoryId: string, gender: 'male' | 'female' | null) => {
  if (!gender) return null;
  const categories = getCategoriesByGender(gender);
  return categories.find(c => c.id === categoryId)?.name || null;
};

/**
 * Obtient le nom d'une ceinture par son ID
 */
export const getBeltName = (beltId: string) => {
  return BJJ_BELTS.find(b => b.id === beltId)?.name || null;
};

/**
 * Vérifie si le profil compétiteur est complet
 */
export const isProfileComplete = (profile: CompetitorProfile): boolean => {
  return !!(profile.gender && profile.category && profile.belt);
};
