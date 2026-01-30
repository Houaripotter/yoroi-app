// ============================================
// YOROI - SERVICE DE DÉFIS
// ============================================
// Défis quotidiens, hebdomadaires et mensuels avec récompenses

import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

export type ChallengeType = 'daily' | 'weekly' | 'monthly';
export type ChallengeCategory = 'training' | 'weight' | 'hydration' | 'sleep' | 'streak' | 'special';

export interface Challenge {
  id: string;
  type: ChallengeType;
  category: ChallengeCategory;
  title: string;
  description: string;
  icon: string;
  target: number; // Objectif à atteindre
  reward: {
    xp: number;
    badge?: string;
    avatar?: string;
  };
  requirement: {
    metric: string; // 'trainings_count', 'water_ml', 'sleep_hours', etc.
    operator: '>=' | '>' | '=' | '<=' | '<';
    value: number;
  };
}

export interface ChallengeProgress {
  challengeId: string;
  current: number;
  target: number;
  completed: boolean;
  completedAt?: string;
  claimed: boolean; // Récompense réclamée
}

export interface ActiveChallenge extends Challenge {
  progress: ChallengeProgress;
}

// ============================================
// DÉFIS PRÉDÉFINIS
// ============================================

export const DAILY_CHALLENGES: Challenge[] = [
  {
    id: 'daily_training',
    type: 'daily',
    category: 'training',
    title: 'Athlète du Jour',
    description: 'Fais 1 entraînement aujourd\'hui',
    icon: 'dumbbell', // Icône lucide
    target: 1,
    reward: { xp: 25 },
    requirement: { metric: 'trainings_today', operator: '>=', value: 1 },
  },
  {
    id: 'daily_hydration',
    type: 'daily',
    category: 'hydration',
    title: 'Hydratation Complète',
    description: 'Bois 2.5L d\'eau',
    icon: 'droplets', // Icône lucide
    target: 2500,
    reward: { xp: 15 },
    requirement: { metric: 'water_today', operator: '>=', value: 2500 },
  },
  {
    id: 'daily_sleep',
    type: 'daily',
    category: 'sleep',
    title: 'Nuit Réparatrice',
    description: 'Dors au moins 7h',
    icon: 'moon', // Icône lucide
    target: 7,
    reward: { xp: 20 },
    requirement: { metric: 'sleep_hours', operator: '>=', value: 7 },
  },
  {
    id: 'daily_weigh',
    type: 'daily',
    category: 'weight',
    title: 'Discipline Matinale',
    description: 'Pèse-toi ce matin',
    icon: 'scale', // Icône lucide
    target: 1,
    reward: { xp: 10 },
    requirement: { metric: 'weighed_today', operator: '>=', value: 1 },
  },
];

export const WEEKLY_CHALLENGES: Challenge[] = [
  {
    id: 'weekly_5_trainings',
    type: 'weekly',
    category: 'training',
    title: 'Semaine Intense',
    description: 'Fais 5 entraînements cette semaine',
    icon: 'flame', // Icône lucide
    target: 5,
    reward: { xp: 150, badge: 'weekly_athlete' },
    requirement: { metric: 'trainings_week', operator: '>=', value: 5 },
  },
  {
    id: 'weekly_streak_7',
    type: 'weekly',
    category: 'streak',
    title: 'Streak Parfait',
    description: 'Maintiens un streak de 7 jours',
    icon: 'zap', // Icône lucide
    target: 7,
    reward: { xp: 100 },
    requirement: { metric: 'streak', operator: '>=', value: 7 },
  },
  {
    id: 'weekly_hydration',
    type: 'weekly',
    category: 'hydration',
    title: 'Hydratation Parfaite',
    description: 'Atteins 2.5L tous les jours de la semaine',
    icon: 'waves', // Icône lucide
    target: 7,
    reward: { xp: 100 },
    requirement: { metric: 'hydration_days', operator: '>=', value: 7 },
  },
  {
    id: 'weekly_sleep_quality',
    type: 'weekly',
    category: 'sleep',
    title: 'Repos du Champion',
    description: 'Moyenne de 7h+ de sommeil cette semaine',
    icon: 'bed', // Icône lucide
    target: 7,
    reward: { xp: 75 },
    requirement: { metric: 'avg_sleep_hours', operator: '>=', value: 7 },
  },
];

export const MONTHLY_CHALLENGES: Challenge[] = [
  {
    id: 'monthly_20_trainings',
    type: 'monthly',
    category: 'training',
    title: 'Mois de Légende',
    description: 'Fais 20 entraînements ce mois',
    icon: 'trophy', // Icône lucide
    target: 20,
    reward: { xp: 500, badge: 'monthly_legend' },
    requirement: { metric: 'trainings_month', operator: '>=', value: 20 },
  },
  {
    id: 'monthly_weight_goal',
    type: 'monthly',
    category: 'weight',
    title: 'Transformation',
    description: 'Atteins ton objectif de poids',
    icon: 'trending-down', // Icône lucide
    target: 1,
    reward: { xp: 300, avatar: 'champion_evolved' },
    requirement: { metric: 'weight_goal_reached', operator: '>=', value: 1 },
  },
  {
    id: 'monthly_streak_30',
    type: 'monthly',
    category: 'streak',
    title: 'Discipline Ultime',
    description: 'Streak de 30 jours',
    icon: 'crown', // Icône lucide
    target: 30,
    reward: { xp: 500, badge: 'streak_master' },
    requirement: { metric: 'streak', operator: '>=', value: 30 },
  },
];

export const ALL_CHALLENGES = [...DAILY_CHALLENGES, ...WEEKLY_CHALLENGES, ...MONTHLY_CHALLENGES];

// ============================================
// STORAGE
// ============================================

const STORAGE_KEYS = {
  CHALLENGE_PROGRESS: '@yoroi_challenge_progress',
  COMPLETED_CHALLENGES: '@yoroi_completed_challenges',
  TOTAL_XP_FROM_CHALLENGES: '@yoroi_challenge_xp',
};

// ============================================
// FONCTIONS
// ============================================

/**
 * Récupère la progression des défis
 */
export const getChallengeProgress = async (): Promise<Record<string, ChallengeProgress>> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CHALLENGE_PROGRESS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    logger.error('Erreur lecture progression défis:', error);
    return {};
  }
};

/**
 * Met à jour la progression d'un défi
 */
export const updateChallengeProgress = async (
  challengeId: string,
  current: number,
  target: number
): Promise<void> => {
  try {
    const progress = await getChallengeProgress();
    const challenge = ALL_CHALLENGES.find(c => c.id === challengeId);
    
    const completed = current >= target;
    
    progress[challengeId] = {
      challengeId,
      current,
      target,
      completed,
      completedAt: completed && !progress[challengeId]?.completed ? new Date().toISOString() : progress[challengeId]?.completedAt,
      claimed: progress[challengeId]?.claimed || false,
    };
    
    await AsyncStorage.setItem(STORAGE_KEYS.CHALLENGE_PROGRESS, JSON.stringify(progress));
  } catch (error) {
    logger.error('Erreur mise à jour progression:', error);
  }
};

/**
 * Valide manuellement un défi (le marque comme complété)
 */
export const manualCompleteChallenge = async (challengeId: string): Promise<boolean> => {
  try {
    const challenge = ALL_CHALLENGES.find(c => c.id === challengeId);
    if (!challenge) return false;

    const progress = await getChallengeProgress();

    // Si déjà complété, ne rien faire
    if (progress[challengeId]?.completed) return true;

    progress[challengeId] = {
      challengeId,
      current: challenge.target,
      target: challenge.target,
      completed: true,
      completedAt: new Date().toISOString(),
      claimed: false,
    };

    await AsyncStorage.setItem(STORAGE_KEYS.CHALLENGE_PROGRESS, JSON.stringify(progress));
    return true;
  } catch (error) {
    logger.error('Erreur validation manuelle défi:', error);
    return false;
  }
};

/**
 * Réclame la récompense d'un défi
 */
export const claimChallengeReward = async (challengeId: string): Promise<number> => {
  try {
    const progress = await getChallengeProgress();
    const challenge = ALL_CHALLENGES.find(c => c.id === challengeId);
    
    if (!challenge || !progress[challengeId]?.completed || progress[challengeId]?.claimed) {
      return 0;
    }
    
    progress[challengeId].claimed = true;
    await AsyncStorage.setItem(STORAGE_KEYS.CHALLENGE_PROGRESS, JSON.stringify(progress));
    
    // Ajouter XP total
    const totalXpData = await AsyncStorage.getItem(STORAGE_KEYS.TOTAL_XP_FROM_CHALLENGES);
    const totalXp = totalXpData ? parseInt(totalXpData, 10) : 0;
    await AsyncStorage.setItem(STORAGE_KEYS.TOTAL_XP_FROM_CHALLENGES, (totalXp + challenge.reward.xp).toString());
    
    return challenge.reward.xp;
  } catch (error) {
    logger.error('Erreur réclamation récompense:', error);
    return 0;
  }
};

/**
 * Récupère les défis actifs avec leur progression
 */
export const getActiveChallenges = async (): Promise<ActiveChallenge[]> => {
  try {
    const progress = await getChallengeProgress();
    
    return ALL_CHALLENGES.map(challenge => ({
      ...challenge,
      progress: progress[challenge.id] || {
        challengeId: challenge.id,
        current: 0,
        target: challenge.target,
        completed: false,
        claimed: false,
      },
    }));
  } catch (error) {
    logger.error('Erreur récupération défis actifs:', error);
    return [];
  }
};

/**
 * Récupère les défis quotidiens
 */
export const getDailyChallenges = async (): Promise<ActiveChallenge[]> => {
  const all = await getActiveChallenges();
  return all.filter(c => c.type === 'daily');
};

/**
 * Récupère les défis hebdomadaires
 */
export const getWeeklyChallenges = async (): Promise<ActiveChallenge[]> => {
  const all = await getActiveChallenges();
  return all.filter(c => c.type === 'weekly');
};

/**
 * Récupère le total XP gagné via les défis
 */
export const getTotalChallengeXP = async (): Promise<number> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TOTAL_XP_FROM_CHALLENGES);
    return data ? parseInt(data, 10) : 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Réinitialise les défis quotidiens (appelé chaque jour)
 */
export const resetDailyChallenges = async (): Promise<void> => {
  try {
    const progress = await getChallengeProgress();
    
    DAILY_CHALLENGES.forEach(challenge => {
      if (progress[challenge.id]) {
        progress[challenge.id] = {
          challengeId: challenge.id,
          current: 0,
          target: challenge.target,
          completed: false,
          claimed: false,
        };
      }
    });
    
    await AsyncStorage.setItem(STORAGE_KEYS.CHALLENGE_PROGRESS, JSON.stringify(progress));
  } catch (error) {
    logger.error('Erreur reset défis quotidiens:', error);
  }
};

export default {
  DAILY_CHALLENGES,
  WEEKLY_CHALLENGES,
  MONTHLY_CHALLENGES,
  ALL_CHALLENGES,
  getChallengeProgress,
  updateChallengeProgress,
  manualCompleteChallenge,
  claimChallengeReward,
  getActiveChallenges,
  getDailyChallenges,
  getWeeklyChallenges,
  getTotalChallengeXP,
  resetDailyChallenges,
};

