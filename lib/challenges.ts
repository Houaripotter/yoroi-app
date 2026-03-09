// ============================================
// YOROI - SYSTEME DE DÉFIS HEBDOMADAIRES
// ============================================
// Chaque lundi, un nouveau défi apparaît
// L'utilisateur a jusqu'à dimanche pour le compléter

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllMeasurements, getAllWorkouts, getPhotosFromStorage } from './storage';
import logger from '@/lib/security/logger';
import { calculateAndStoreUnifiedPoints } from './gamification';
import { getWeights, calculateStreak, getTrainings } from './database';

// ═══════════════════════════════════════════════
// TYPES & CONSTANTES
// ═══════════════════════════════════════════════

export type ChallengeType = 'regularity' | 'warrior' | 'complete' | 'streak' | 'photo';

export interface Challenge {
  id: ChallengeType;
  name: string;
  nameJp: string;
  description: string;
  target: number;
  xpReward: number;
  icon: string;
  color: string;
}

export interface WeeklyChallenge {
  challenge: Challenge;
  weekStart: string; // ISO date du lundi
  weekEnd: string;   // ISO date du dimanche
  progress: number;
  completed: boolean;
  completedAt?: string;
  xpClaimed: boolean;
}

export interface ChallengeProgress {
  current: number;
  target: number;
  percentage: number;
  completed: boolean;
  daysRemaining: number;
}

// ═══════════════════════════════════════════════
// DEFINITION DES DÉFIS
// ═══════════════════════════════════════════════

export const CHALLENGES: Record<ChallengeType, Challenge> = {
  regularity: {
    id: 'regularity',
    name: 'Régularité',
    nameJp: '規則性',
    description: '5 pesées cette semaine',
    target: 5,
    xpReward: 100,
    icon: '',
    color: '#3B82F6',
  },
  warrior: {
    id: 'warrior',
    name: 'Athlète',
    nameJp: '戦士',
    description: '4 entraînements cette semaine',
    target: 4,
    xpReward: 150,
    icon: '',
    color: '#EF4444',
  },
  complete: {
    id: 'complete',
    name: 'Complet',
    nameJp: '完全',
    description: 'Pesée + mensurations + entraînement',
    target: 3, // 3 types d'actions
    xpReward: 200,
    icon: '',
    color: '#F59E0B',
  },
  streak: {
    id: 'streak',
    name: 'Streak',
    nameJp: '連続',
    description: 'Maintenir 7 jours de streak',
    target: 7,
    xpReward: 250,
    icon: '',
    color: '#F97316',
  },
  photo: {
    id: 'photo',
    name: 'Photographe',
    nameJp: '写真家',
    description: 'Prendre une photo transformation',
    target: 1,
    xpReward: 50,
    icon: '📸',
    color: '#8B5CF6',
  },
};

const STORAGE_KEY = '@yoroi_weekly_challenge';
const XP_STORAGE_KEY = '@yoroi_user_xp';

// ═══════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════

/**
 * Obtient le lundi de la semaine courante
 */
const getMondayOfWeek = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuster si dimanche
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Obtient le dimanche de la semaine courante
 */
const getSundayOfWeek = (date: Date = new Date()): Date => {
  const monday = getMondayOfWeek(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return sunday;
};

/**
 * Vérifie si une date est dans la semaine courante
 */
const isInCurrentWeek = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  const monday = getMondayOfWeek();
  const sunday = getSundayOfWeek();
  return date >= monday && date <= sunday;
};

/**
 * Calcule les jours restants jusqu'à dimanche
 */
const getDaysRemaining = (): number => {
  const now = new Date();
  const sunday = getSundayOfWeek();
  const diff = sunday.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Sélectionne un défi aléatoire
 */
const selectRandomChallenge = (): Challenge => {
  const challengeTypes = Object.keys(CHALLENGES) as ChallengeType[];
  const randomIndex = Math.floor(Math.random() * challengeTypes.length);
  return CHALLENGES[challengeTypes[randomIndex]];
};

/**
 * Sélectionne un défi basé sur le numéro de semaine (déterministe)
 */
const selectWeeklyChallenge = (): Challenge => {
  const monday = getMondayOfWeek();
  const startOfYear = new Date(monday.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(
    ((monday.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + 1) / 7
  );

  const challengeTypes = Object.keys(CHALLENGES) as ChallengeType[];
  const index = weekNumber % challengeTypes.length;
  return CHALLENGES[challengeTypes[index]];
};

// ═══════════════════════════════════════════════
// CALCUL DE PROGRESSION
// ═══════════════════════════════════════════════

/**
 * Calcule la progression pour le défi "Régularité" (5 pesées)
 */
const calculateRegularityProgress = async (): Promise<number> => {
  try {
    const measurements = await getAllMeasurements();
    const weeklyMeasurements = measurements.filter(m => isInCurrentWeek(m.date));
    return weeklyMeasurements.length;
  } catch {
    return 0;
  }
};

/**
 * Calcule la progression pour le défi "Athlète" (4 entraînements)
 */
const calculateWarriorProgress = async (): Promise<number> => {
  try {
    const workouts = await getAllWorkouts();
    const weeklyWorkouts = workouts.filter(w => isInCurrentWeek(w.date));
    return weeklyWorkouts.length;
  } catch {
    return 0;
  }
};

/**
 * Calcule la progression pour le défi "Complet" (pesée + mensurations + entraînement)
 */
const calculateCompleteProgress = async (): Promise<number> => {
  try {
    let progress = 0;

    // Vérifier pesée cette semaine
    const measurements = await getAllMeasurements();
    const hasWeeklyMeasurement = measurements.some(m => isInCurrentWeek(m.date));
    if (hasWeeklyMeasurement) progress++;

    // Vérifier mensurations cette semaine (pesée avec données de composition ou mesures corporelles)
    const hasMensuration = measurements.some(m =>
      isInCurrentWeek(m.date) && (m.body_fat || m.muscle_mass || m.measurements?.waist || m.measurements?.hips)
    );
    if (hasMensuration) progress++;

    // Vérifier entraînement cette semaine
    const workouts = await getAllWorkouts();
    const hasWeeklyWorkout = workouts.some(w => isInCurrentWeek(w.date));
    if (hasWeeklyWorkout) progress++;

    return progress;
  } catch {
    return 0;
  }
};

/**
 * Calcule la progression pour le défi "Streak" (7 jours consécutifs)
 */
const calculateStreakProgress = async (): Promise<number> => {
  try {
    const measurements = await getAllMeasurements();
    if (measurements.length === 0) return 0;

    // Trier par date décroissante
    const sorted = [...measurements].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculer le streak actuel
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sorted.length; i++) {
      const measureDate = new Date(sorted[i].date);
      measureDate.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);

      if (measureDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        break;
      }
    }

    return Math.min(streak, 7);
  } catch {
    return 0;
  }
};

/**
 * Calcule la progression pour le défi "Photo" (1 photo)
 */
const calculatePhotoProgress = async (): Promise<number> => {
  try {
    const photos = await getPhotosFromStorage();
    const weeklyPhotos = photos.filter(p => isInCurrentWeek(p.date));
    return weeklyPhotos.length > 0 ? 1 : 0;
  } catch {
    return 0;
  }
};

/**
 * Calcule la progression selon le type de défi
 */
export const calculateChallengeProgress = async (challengeType: ChallengeType): Promise<number> => {
  switch (challengeType) {
    case 'regularity':
      return calculateRegularityProgress();
    case 'warrior':
      return calculateWarriorProgress();
    case 'complete':
      return calculateCompleteProgress();
    case 'streak':
      return calculateStreakProgress();
    case 'photo':
      return calculatePhotoProgress();
    default:
      return 0;
  }
};

// ═══════════════════════════════════════════════
// GESTION DU DÉFI HEBDOMADAIRE
// ═══════════════════════════════════════════════

/**
 * Charge le défi de la semaine depuis le storage
 */
export const loadWeeklyChallenge = async (): Promise<WeeklyChallenge | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return null;

    const challenge: WeeklyChallenge = JSON.parse(data);

    // Vérifier si le défi est toujours valide (même semaine)
    const currentMonday = getMondayOfWeek();
    const challengeMonday = new Date(challenge.weekStart);

    if (currentMonday.getTime() !== challengeMonday.getTime()) {
      // Nouvelle semaine, le défi est périmé
      return null;
    }

    return challenge;
  } catch (error) {
    logger.error('Erreur chargement défi:', error);
    return null;
  }
};

/**
 * Sauvegarde le défi de la semaine
 */
export const saveWeeklyChallenge = async (challenge: WeeklyChallenge): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(challenge));
  } catch (error) {
    logger.error('Erreur sauvegarde défi:', error);
  }
};

/**
 * Génère un nouveau défi pour la semaine
 */
export const generateWeeklyChallenge = async (): Promise<WeeklyChallenge> => {
  const challenge = selectWeeklyChallenge();
  const monday = getMondayOfWeek();
  const sunday = getSundayOfWeek();

  const weeklyChallenge: WeeklyChallenge = {
    challenge,
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
    progress: 0,
    completed: false,
    xpClaimed: false,
  };

  await saveWeeklyChallenge(weeklyChallenge);
  return weeklyChallenge;
};

/**
 * Obtient ou crée le défi de la semaine
 */
export const getOrCreateWeeklyChallenge = async (): Promise<WeeklyChallenge> => {
  const existing = await loadWeeklyChallenge();

  if (existing) {
    // Mettre à jour la progression
    const progress = await calculateChallengeProgress(existing.challenge.id);
    const completed = progress >= existing.challenge.target;

    const updated: WeeklyChallenge = {
      ...existing,
      progress,
      completed,
      completedAt: completed && !existing.completedAt ? new Date().toISOString() : existing.completedAt,
    };

    await saveWeeklyChallenge(updated);
    return updated;
  }

  return generateWeeklyChallenge();
};

/**
 * Obtient les informations de progression du défi
 */
export const getChallengeProgressInfo = async (): Promise<ChallengeProgress & { challenge: Challenge }> => {
  const weeklyChallenge = await getOrCreateWeeklyChallenge();
  const { challenge, progress, completed } = weeklyChallenge;

  return {
    challenge,
    current: progress,
    target: challenge.target,
    percentage: Math.min(100, (progress / challenge.target) * 100),
    completed,
    daysRemaining: getDaysRemaining(),
  };
};

// ═══════════════════════════════════════════════
// GESTION DES XP
// ═══════════════════════════════════════════════

/**
 * Obtient les XP actuels de l'utilisateur
 */
export const getUserXP = async (): Promise<number> => {
  try {
    const data = await AsyncStorage.getItem(XP_STORAGE_KEY);
    return data ? parseInt(data, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * Ajoute des XP à l'utilisateur
 */
export const addUserXP = async (xp: number): Promise<number> => {
  try {
    const current = await getUserXP();
    const newTotal = current + xp;
    await AsyncStorage.setItem(XP_STORAGE_KEY, newTotal.toString());
    return newTotal;
  } catch {
    return 0;
  }
};

/**
 * Réclame la récompense XP du défi complété
 */
export const claimChallengeReward = async (): Promise<{ success: boolean; xpGained: number; totalXP: number }> => {
  try {
    const weeklyChallenge = await loadWeeklyChallenge();

    if (!weeklyChallenge || !weeklyChallenge.completed || weeklyChallenge.xpClaimed) {
      return { success: false, xpGained: 0, totalXP: await getUserXP() };
    }

    const xpGained = weeklyChallenge.challenge.xpReward;
    const totalXP = await addUserXP(xpGained);

    // Marquer comme réclamé
    weeklyChallenge.xpClaimed = true;
    await saveWeeklyChallenge(weeklyChallenge);

    // Recalculer les points unifies
    try {
      const [weights, streak, trainings] = await Promise.all([getWeights(), calculateStreak(), getTrainings()]);
      await calculateAndStoreUnifiedPoints(weights.length, trainings.length, streak);
    } catch { /* non-bloquant */ }

    return { success: true, xpGained, totalXP };
  } catch {
    return { success: false, xpGained: 0, totalXP: await getUserXP() };
  }
};

/**
 * Vérifie si le défi a été complété et peut être réclamé
 */
export const canClaimReward = async (): Promise<boolean> => {
  const weeklyChallenge = await loadWeeklyChallenge();
  return weeklyChallenge !== null && weeklyChallenge.completed && !weeklyChallenge.xpClaimed;
};

export default {
  CHALLENGES,
  getOrCreateWeeklyChallenge,
  getChallengeProgressInfo,
  calculateChallengeProgress,
  claimChallengeReward,
  canClaimReward,
  getUserXP,
  addUserXP,
};
