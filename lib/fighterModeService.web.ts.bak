// ============================================
// 🥊 YOROI - SERVICE MODE FIGHTER (WEB STUB)
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

// SQLite-based functions not supported on web
const notSupported = () => {
  logger.warn('SQLite operations not supported on web platform');
  return [];
};

export const getAllCompetitions = async (): Promise<Competition[]> => {
  return notSupported() as Competition[];
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
