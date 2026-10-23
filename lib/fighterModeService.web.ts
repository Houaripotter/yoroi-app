// ============================================
// YOROI - SERVICE MODE FIGHTER (WEB STUB)
// ============================================
// Web version - SQLite not supported
// All functions return empty data or throw not supported errors

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
import {
  UserMode,
  Sport,
  Competition,
  Combat,
  Hydratation,
  ObjectifPoids,
  UserProfile,
} from './fighterMode';

const STORAGE_KEY_MODE = '@yoroi_user_mode';
const STORAGE_KEY_SPORT = '@yoroi_user_sport';
const STORAGE_KEY_CATEGORY = '@yoroi_weight_category';
const STORAGE_KEY_BELT = '@yoroi_belt';

// AsyncStorage-based functions work on web
export const getUserMode = async (): Promise<UserMode> => {
  try {
    const mode = await AsyncStorage.getItem(STORAGE_KEY_MODE);
    return (mode as UserMode) || 'loisir';
  } catch (error) {
    logger.error('Error getting user mode:', error);
    return 'loisir';
  }
};

export const setUserMode = async (mode: UserMode): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_MODE, mode);
  } catch (error) {
    logger.error('Error setting user mode:', error);
  }
};

export const getUserSport = async (): Promise<Sport | null> => {
  try {
    const sport = await AsyncStorage.getItem(STORAGE_KEY_SPORT);
    return sport as Sport | null;
  } catch (error) {
    logger.error('Error getting user sport:', error);
    return null;
  }
};

export const setUserSport = async (sport: Sport): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_SPORT, sport);
  } catch (error) {
    logger.error('Error setting user sport:', error);
  }
};

// 23 octobre 2026 : fonctions presentes dans la version native et absentes ici (meme liste d'exports).
// Categorie et ceinture restent dans AsyncStorage, comme le mode et le sport ci-dessus.
export const getUserWeightCategory = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_CATEGORY);
  } catch (error) {
    logger.error('Error getting weight category:', error);
    return null;
  }
};

export const setUserWeightCategory = async (category: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_CATEGORY, category);
  } catch (error) {
    logger.error('Error setting weight category:', error);
  }
};

export const getUserBelt = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_BELT);
  } catch (error) {
    logger.error('Error getting belt:', error);
    return null;
  }
};

export const setUserBelt = async (belt: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_BELT, belt);
  } catch (error) {
    logger.error('Error setting belt:', error);
  }
};

export const getUserProfile = async (): Promise<UserProfile> => {
  const [mode, sport, categorie_poids, ceinture] = await Promise.all([
    getUserMode(),
    getUserSport(),
    getUserWeightCategory(),
    getUserBelt(),
  ]);
  return {
    mode,
    sport: sport || undefined,
    categorie_poids: categorie_poids || undefined,
    ceinture: ceinture || undefined,
  };
};

// SQLite-based functions not supported on web
const notSupported = () => {
  logger.warn('SQLite operations not supported on web platform');
  return [];
};

export const getAllCompetitions = async (): Promise<Competition[]> => {
  return notSupported() as Competition[];
};

// 23 octobre 2026 : memes noms que lib/fighterModeService.ts. Sans eux, l'import valait undefined sur le web
// et l'ecran « Un combat » (app/seance/match.tsx, ouvert par « Ajouter un combat ») plantait a l'ouverture.
export const getCompetitions = async (): Promise<Competition[]> => {
  return notSupported() as Competition[];
};

export const getCombats = async (): Promise<Combat[]> => {
  return notSupported() as Combat[];
};

export const getUpcomingCompetitions = async (): Promise<Competition[]> => {
  return notSupported() as Competition[];
};

export const getCompetitionById = async (id: number): Promise<Competition | null> => {
  return null;
};

export const addCompetition = async (competition: Omit<Competition, 'id'>): Promise<number> => {
  logger.warn('addCompetition not supported on web');
  return 0;
};

export const updateCompetition = async (id: number, competition: Partial<Competition>): Promise<void> => {
  logger.warn('updateCompetition not supported on web');
};

export const deleteCompetition = async (id: number): Promise<void> => {
  logger.warn('deleteCompetition not supported on web');
};

export const getAllCombats = async (): Promise<Combat[]> => {
  return notSupported() as Combat[];
};

export const getCombatsByCompetition = async (competitionId: number): Promise<Combat[]> => {
  return notSupported() as Combat[];
};

export const getCombatById = async (id: number): Promise<Combat | null> => {
  return null;
};

export const addCombat = async (combat: Omit<Combat, 'id'>): Promise<number> => {
  logger.warn('addCombat not supported on web');
  return 0;
};

export const updateCombat = async (id: number, combat: Partial<Combat>): Promise<void> => {
  logger.warn('updateCombat not supported on web');
};

export const deleteCombat = async (id: number): Promise<void> => {
  logger.warn('deleteCombat not supported on web');
};

export const getHydratationHistory = async (): Promise<Hydratation[]> => {
  return notSupported() as Hydratation[];
};

export const addHydratation = async (hydratation: Omit<Hydratation, 'id'>): Promise<number> => {
  logger.warn('addHydratation not supported on web');
  return 0;
};

export const deleteHydratation = async (id: number): Promise<void> => {
  logger.warn('deleteHydratation not supported on web');
};

export const getObjectifsPoids = async (): Promise<ObjectifPoids[]> => {
  return notSupported() as ObjectifPoids[];
};

export const addObjectifPoids = async (objectif: Omit<ObjectifPoids, 'id'>): Promise<number> => {
  logger.warn('addObjectifPoids not supported on web');
  return 0;
};

export const updateObjectifPoids = async (id: number, objectif: Partial<ObjectifPoids>): Promise<void> => {
  logger.warn('updateObjectifPoids not supported on web');
};

// 23 octobre 2026 : sans SQLite sur le web, pas de competition, d'hydratation ni d'objectif a lire.
export const getNextCompetition = async (): Promise<Competition | null> => {
  return null;
};

export const getNextEvent = async (): Promise<{
  type: 'competition' | 'combat' | null;
  name: string;
  daysLeft: number;
  date: string;
  sport?: Sport;
} | null> => {
  return null;
};

export const getHydratationToday = async (): Promise<Hydratation[]> => {
  return notSupported() as Hydratation[];
};

export const getTotalHydratationToday = async (): Promise<number> => {
  return 0;
};

export const getCurrentObjectifPoids = async (): Promise<ObjectifPoids | null> => {
  return null;
};

export default {
  getUserMode,
  setUserMode,
  getUserSport,
  setUserSport,
  getUserWeightCategory,
  setUserWeightCategory,
  getUserBelt,
  setUserBelt,
  getUserProfile,
  getCompetitions,
  getUpcomingCompetitions,
  getNextCompetition,
  getCompetitionById,
  addCompetition,
  updateCompetition,
  deleteCompetition,
  getCombats,
  getCombatsByCompetition,
  getCombatById,
  addCombat,
  updateCombat,
  deleteCombat,
  getHydratationToday,
  getTotalHydratationToday,
  addHydratation,
  deleteHydratation,
  getObjectifsPoids,
  getCurrentObjectifPoids,
  addObjectifPoids,
  updateObjectifPoids,
  getNextEvent,
};
