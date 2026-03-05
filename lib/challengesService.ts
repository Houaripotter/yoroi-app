// ============================================
// YOROI - SERVICE DE DÉFIS
// ============================================
// Défis quotidiens, hebdomadaires et mensuels avec récompenses

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
import { getDailyHydration } from '@/lib/quests';
import { calculateAndStoreUnifiedPoints } from './gamification';
import { getWeights, calculateStreak, getTrainings } from './database';
import { format, startOfWeek, startOfMonth } from 'date-fns';

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
  LAST_DAILY_RESET: '@yoroi_challenge_last_daily_reset',
  LAST_WEEKLY_RESET: '@yoroi_challenge_last_weekly_reset',
  LAST_MONTHLY_RESET: '@yoroi_challenge_last_monthly_reset',
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

    // Recalculer les points unifies
    try {
      const [weights, streak, trainings] = await Promise.all([getWeights(), calculateStreak(), getTrainings()]);
      await calculateAndStoreUnifiedPoints(weights.length, trainings.length, streak);
    } catch { /* non-bloquant */ }

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

// ============================================
// RESET AUTOMATIQUE (quotidien/hebdo/mensuel)
// ============================================

// Utilise la date LOCALE (pas UTC) pour que le reset se fasse a minuit local
const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const getWeekStartStr = () => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
const getMonthStartStr = () => format(startOfMonth(new Date()), 'yyyy-MM-dd');

// Verrou pour empecher les syncs concurrentes
let syncInProgress = false;

/**
 * Reset automatique des defis selon la periode.
 * - Quotidiens : reset chaque nouveau jour
 * - Hebdo : reset chaque nouvelle semaine (lundi)
 * - Mensuels : reset chaque nouveau mois
 * Ne reset PAS les defis deja reclames (claimed) pour eviter de perdre des XP
 */
const autoResetIfNeeded = async (): Promise<void> => {
  try {
    const progress = await getChallengeProgress();
    const today = getToday();
    const weekStart = getWeekStartStr();
    const monthStart = getMonthStartStr();

    const [lastDaily, lastWeekly, lastMonthly] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.LAST_DAILY_RESET),
      AsyncStorage.getItem(STORAGE_KEYS.LAST_WEEKLY_RESET),
      AsyncStorage.getItem(STORAGE_KEYS.LAST_MONTHLY_RESET),
    ]);

    let changed = false;

    // Reset quotidien - nouveau jour = on repart a zero
    if (lastDaily !== today) {
      DAILY_CHALLENGES.forEach(c => {
        progress[c.id] = { challengeId: c.id, current: 0, target: c.target, completed: false, claimed: false };
        changed = true;
      });
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_DAILY_RESET, today);
    }

    // Reset hebdomadaire
    if (lastWeekly !== weekStart) {
      WEEKLY_CHALLENGES.forEach(c => {
        progress[c.id] = { challengeId: c.id, current: 0, target: c.target, completed: false, claimed: false };
        changed = true;
      });
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_WEEKLY_RESET, weekStart);
    }

    // Reset mensuel
    if (lastMonthly !== monthStart) {
      MONTHLY_CHALLENGES.forEach(c => {
        progress[c.id] = { challengeId: c.id, current: 0, target: c.target, completed: false, claimed: false };
        changed = true;
      });
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_MONTHLY_RESET, monthStart);
    }

    if (changed) {
      await AsyncStorage.setItem(STORAGE_KEYS.CHALLENGE_PROGRESS, JSON.stringify(progress));
    }
  } catch (error) {
    logger.error('Erreur auto-reset défis:', error);
  }
};

// ============================================
// SYNCHRONISATION AUTOMATIQUE AVEC LES DONNEES REELLES
// ============================================

/**
 * Synchronise TOUS les defis avec les donnees reelles de l'app.
 * Lit les trainings, poids, hydratation, sommeil, streak depuis la BDD
 * et met a jour la progression de chaque defi automatiquement.
 */
export const syncAllChallenges = async (): Promise<string[]> => {
  // Verrou: si une sync est deja en cours, on attend pas (evite les doublons)
  if (syncInProgress) return [];
  syncInProgress = true;

  try {
    // Reset si nouveau jour/semaine/mois
    await autoResetIfNeeded();

    const today = getToday();
    const weekStart = getWeekStartStr();
    const monthStart = getMonthStartStr();
    const newlyCompleted: string[] = [];

    // Charger toutes les donnees en parallele
    const [trainings, weights, streak, hydrationLiters] = await Promise.all([
      getTrainings().catch(() => []),
      getWeights().catch(() => []),
      calculateStreak().catch(() => 0),
      getDailyHydration().catch(() => 0),
    ]);

    // Sommeil via HealthKit (optionnel, ne bloque pas)
    let sleepHours = 0;
    let weeklySleepHours: number[] = [];
    try {
      const { healthConnect } = require('./healthConnect');
      const sleepData = await healthConnect.getLastSleep?.();
      if (sleepData?.duration) {
        sleepHours = sleepData.duration / 60; // minutes -> heures
      }
      // Historique sommeil de la semaine
      const sleepHistory = await healthConnect.getSleepHistory?.(7);
      if (Array.isArray(sleepHistory)) {
        weeklySleepHours = sleepHistory.map((s: any) => (s.duration || 0) / 60);
      }
    } catch { /* HealthKit non dispo */ }

    // Lire la progression actuelle (pour ne pas ecraser les defis deja claimed)
    const progress = await getChallengeProgress();

    // Helper: met a jour un defi seulement si pas deja claimed
    const syncChallenge = (id: string, current: number, target: number) => {
      const existing = progress[id];
      // Ne pas toucher aux defis deja reclames
      if (existing?.claimed) return;
      const completed = current >= target;
      const wasCompleted = existing?.completed || false;
      progress[id] = {
        challengeId: id,
        current: Math.min(current, target), // cap au target pour l'affichage
        target,
        completed,
        completedAt: completed && !wasCompleted ? new Date().toISOString() : existing?.completedAt,
        claimed: false,
      };
      if (completed && !wasCompleted) {
        newlyCompleted.push(id);
      }
    };

    // === DEFIS QUOTIDIENS ===

    // Entrainement du jour
    const todayTrainings = trainings.filter(t => t.date === today);
    syncChallenge('daily_training', todayTrainings.length, 1);

    // Hydratation (en ml)
    const hydrationMl = Math.round(hydrationLiters * 1000);
    syncChallenge('daily_hydration', hydrationMl, 2500);

    // Sommeil
    syncChallenge('daily_sleep', Math.round(sleepHours * 10) / 10, 7);

    // Pesee du jour
    const todayWeighs = weights.filter(w => w.date === today);
    syncChallenge('daily_weigh', todayWeighs.length > 0 ? 1 : 0, 1);

    // === DEFIS HEBDOMADAIRES ===

    // 5 entrainements cette semaine
    const weekTrainings = trainings.filter(t => t.date >= weekStart);
    syncChallenge('weekly_5_trainings', weekTrainings.length, 5);

    // Streak de 7 jours
    syncChallenge('weekly_streak_7', streak, 7);

    // Hydratation 7 jours : on track les jours OK via une cle separee
    try {
      const hydrationDaysKey = '@yoroi_challenge_hydration_days';
      const storedDays = await AsyncStorage.getItem(hydrationDaysKey);
      const parsedDays = storedDays ? JSON.parse(storedDays) : [];
      let hydrationDays: string[] = Array.isArray(parsedDays) ? parsedDays : [];
      // Filtrer pour ne garder que les jours de cette semaine
      hydrationDays = hydrationDays.filter(d => d >= weekStart);
      // Ajouter aujourd'hui si on a atteint 2.5L
      if (hydrationMl >= 2500 && !hydrationDays.includes(today)) {
        hydrationDays.push(today);
      }
      await AsyncStorage.setItem(hydrationDaysKey, JSON.stringify(hydrationDays));
      syncChallenge('weekly_hydration', hydrationDays.length, 7);
    } catch {
      syncChallenge('weekly_hydration', hydrationMl >= 2500 ? 1 : 0, 7);
    }

    // Sommeil moyen 7h+
    if (weeklySleepHours.length > 0) {
      const avgSleep = weeklySleepHours.reduce((a, b) => a + b, 0) / weeklySleepHours.length;
      syncChallenge('weekly_sleep_quality', Math.round(avgSleep * 10) / 10, 7);
    }

    // === DEFIS MENSUELS ===

    // 20 entrainements ce mois
    const monthTrainings = trainings.filter(t => t.date >= monthStart);
    syncChallenge('monthly_20_trainings', monthTrainings.length, 20);

    // Objectif de poids (on check si un objectif existe et est atteint)
    try {
      const goalStr = await AsyncStorage.getItem('@yoroi_weight_goal');
      if (goalStr) {
        const goal = parseFloat(goalStr);
        if (weights.length > 0 && goal > 0) {
          const latestWeight = weights[0]?.weight || 0;
          const reached = latestWeight <= goal ? 1 : 0;
          syncChallenge('monthly_weight_goal', reached, 1);
        }
      }
    } catch { /* ignore */ }

    // Streak 30 jours
    syncChallenge('monthly_streak_30', streak, 30);

    // Sauvegarder toute la progression
    await AsyncStorage.setItem(STORAGE_KEYS.CHALLENGE_PROGRESS, JSON.stringify(progress));

    return newlyCompleted;
  } catch (error) {
    logger.error('Erreur syncAllChallenges:', error);
    return [];
  } finally {
    syncInProgress = false;
  }
};

/**
 * Recupere les defis quotidiens (synchronise automatiquement)
 */
export const getDailyChallenges = async (): Promise<ActiveChallenge[]> => {
  await syncAllChallenges();
  const all = await getActiveChallenges();
  return all.filter(c => c.type === 'daily');
};

/**
 * Recupere les defis hebdomadaires (synchronise automatiquement)
 */
export const getWeeklyChallenges = async (): Promise<ActiveChallenge[]> => {
  await syncAllChallenges();
  const all = await getActiveChallenges();
  return all.filter(c => c.type === 'weekly');
};

/**
 * Recupere les defis mensuels (synchronise automatiquement)
 */
export const getMonthlyChallenges = async (): Promise<ActiveChallenge[]> => {
  await syncAllChallenges();
  const all = await getActiveChallenges();
  return all.filter(c => c.type === 'monthly');
};

/**
 * Recupere le total XP gagne via les defis
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
 * Reinitialise les defis quotidiens (appele chaque jour)
 */
export const resetDailyChallenges = async (): Promise<void> => {
  try {
    const progress = await getChallengeProgress();

    DAILY_CHALLENGES.forEach(challenge => {
      progress[challenge.id] = {
        challengeId: challenge.id,
        current: 0,
        target: challenge.target,
        completed: false,
        claimed: false,
      };
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
  getMonthlyChallenges,
  getTotalChallengeXP,
  resetDailyChallenges,
  syncAllChallenges,
};

