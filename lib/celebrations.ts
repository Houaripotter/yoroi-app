// ============================================
// YOROI - SYSTEME DE CELEBRATIONS
// ============================================
// Gère le déclenchement des célébrations animées

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CelebrationType } from '@/components/Celebration';
import { Rank } from './ranks';
import logger from '@/lib/security/logger';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface CelebrationEvent {
  type: CelebrationType;
  title: string;
  subtitle?: string;
  xpGained?: number;
  icon?: string;
}

export interface CelebrationState {
  lastStreakRecord: number;
  lastRankId: string;
  totalMeasurements: number;
  goalReached: boolean;
  shownCelebrations: string[]; // IDs des célébrations déjà montrées
}

// ═══════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════

const STORAGE_KEY = '@yoroi_celebrations';

const MILESTONE_COUNTS = [10, 25, 50, 100, 200, 365, 500, 1000];

// ═══════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════

/**
 * Charge l'état des célébrations
 */
export const loadCelebrationState = async (): Promise<CelebrationState> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error('Erreur chargement célébrations:', error);
  }

  return {
    lastStreakRecord: 0,
    lastRankId: '',
    totalMeasurements: 0,
    goalReached: false,
    shownCelebrations: [],
  };
};

/**
 * Sauvegarde l'état des célébrations
 */
export const saveCelebrationState = async (state: CelebrationState): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error('Erreur sauvegarde célébrations:', error);
  }
};

/**
 * Marque une célébration comme montrée
 */
export const markCelebrationShown = async (celebrationId: string): Promise<void> => {
  const state = await loadCelebrationState();
  if (!state.shownCelebrations.includes(celebrationId)) {
    state.shownCelebrations.push(celebrationId);
    await saveCelebrationState(state);
  }
};

// ═══════════════════════════════════════════════
// DETECTION DES CELEBRATIONS
// ═══════════════════════════════════════════════

/**
 * Vérifie si l'objectif de poids est atteint
 */
export const checkGoalReached = async (
  currentWeight: number,
  goalWeight: number,
  startWeight: number
): Promise<CelebrationEvent | null> => {
  if (!goalWeight || !currentWeight) return null;

  const state = await loadCelebrationState();

  // Vérifier si on vise une perte ou un gain
  const isLossGoal = startWeight > goalWeight;

  // Objectif atteint ?
  const goalReached = isLossGoal
    ? currentWeight <= goalWeight
    : currentWeight >= goalWeight;

  if (goalReached && !state.goalReached) {
    // Marquer comme atteint
    state.goalReached = true;
    await saveCelebrationState(state);

    const weightLost = Math.abs(startWeight - currentWeight);

    return {
      type: 'goal_reached',
      title: 'OBJECTIF ATTEINT !',
      subtitle: `Tu as ${isLossGoal ? 'perdu' : 'pris'} ${weightLost.toFixed(1)} kg. Félicitations, champion !`,
      xpGained: 1000,
      icon: '',
    };
  }

  return null;
};

/**
 * Vérifie si le rang a changé
 */
export const checkRankUp = async (
  currentRank: Rank,
  previousRankId?: string
): Promise<CelebrationEvent | null> => {
  const state = await loadCelebrationState();

  // Premier lancement ou rang différent
  if (state.lastRankId && state.lastRankId !== currentRank.id) {
    // Vérifier que c'est bien une montée (pas une descente)
    const celebrationId = `rank_${currentRank.id}`;

    if (!state.shownCelebrations.includes(celebrationId)) {
      state.lastRankId = currentRank.id;
      state.shownCelebrations.push(celebrationId);
      await saveCelebrationState(state);

      // Calculer les XP basés sur les jours requis pour le rang
      const xpForRank = currentRank.minDays * 10 || 500;

      return {
        type: 'rank_up',
        title: 'PROMOTION !',
        subtitle: `Tu es maintenant ${currentRank.name} ${currentRank.nameJp}`,
        xpGained: xpForRank,
        icon: currentRank.icon,
      };
    }
  } else if (!state.lastRankId) {
    // Premier lancement, juste enregistrer le rang
    state.lastRankId = currentRank.id;
    await saveCelebrationState(state);
  }

  return null;
};

/**
 * Vérifie si c'est un nouveau record de streak
 */
export const checkStreakRecord = async (
  currentStreak: number
): Promise<CelebrationEvent | null> => {
  if (currentStreak < 3) return null; // Minimum 3 jours pour célébrer

  const state = await loadCelebrationState();

  // Nouveau record ?
  if (currentStreak > state.lastStreakRecord) {
    const previousRecord = state.lastStreakRecord;
    state.lastStreakRecord = currentStreak;
    await saveCelebrationState(state);

    // Célébrer seulement à certains paliers ou si c'est le premier record significatif
    const celebratePaliers = [3, 7, 14, 21, 30, 50, 100, 365];
    const shouldCelebrate = celebratePaliers.includes(currentStreak) ||
      (previousRecord === 0 && currentStreak >= 3);

    if (shouldCelebrate) {
      let subtitle = '';
      let xp = 0;

      if (currentStreak === 3) {
        subtitle = '3 jours consécutifs ! Le voyage commence.';
        xp = 50;
      } else if (currentStreak === 7) {
        subtitle = 'Une semaine complète ! Tu es sur la bonne voie.';
        xp = 100;
      } else if (currentStreak === 14) {
        subtitle = '2 semaines ! La discipline devient habitude.';
        xp = 200;
      } else if (currentStreak === 21) {
        subtitle = '21 jours ! L\'habitude est ancrée.';
        xp = 300;
      } else if (currentStreak === 30) {
        subtitle = 'Un mois entier ! Tu es un vrai champion.';
        xp = 500;
      } else if (currentStreak === 50) {
        subtitle = '50 jours ! Détermination légendaire.';
        xp = 750;
      } else if (currentStreak === 100) {
        subtitle = '100 JOURS ! Tu es une légende vivante !';
        xp = 1500;
      } else if (currentStreak === 365) {
        subtitle = 'UN AN COMPLET ! Maître absolu !';
        xp = 5000;
      } else {
        subtitle = `${currentStreak} jours consécutifs ! Continue !`;
        xp = currentStreak * 5;
      }

      return {
        type: 'streak_record',
        title: 'NOUVEAU RECORD !',
        subtitle,
        xpGained: xp,
        icon: '',
      };
    }
  }

  return null;
};

/**
 * Vérifie si c'est un milestone de pesées
 */
export const checkMeasurementMilestone = async (
  totalMeasurements: number
): Promise<CelebrationEvent | null> => {
  const state = await loadCelebrationState();

  // Vérifier si on a atteint un palier
  for (const milestone of MILESTONE_COUNTS) {
    if (totalMeasurements >= milestone && state.totalMeasurements < milestone) {
      const celebrationId = `milestone_${milestone}`;

      if (!state.shownCelebrations.includes(celebrationId)) {
        state.totalMeasurements = totalMeasurements;
        state.shownCelebrations.push(celebrationId);
        await saveCelebrationState(state);

        let subtitle = '';
        let xp = 0;

        switch (milestone) {
          case 10:
            subtitle = '10 pesées ! Tu prends l\'habitude.';
            xp = 50;
            break;
          case 25:
            subtitle = '25 pesées ! La régularité paie.';
            xp = 100;
            break;
          case 50:
            subtitle = '50 pesées ! Demi-centenaire !';
            xp = 200;
            break;
          case 100:
            subtitle = '100 PESÉES ! Un siècle de données !';
            xp = 500;
            break;
          case 200:
            subtitle = '200 pesées ! Engagement total.';
            xp = 750;
            break;
          case 365:
            subtitle = '365 pesées ! Une année de suivi !';
            xp = 1000;
            break;
          case 500:
            subtitle = '500 pesées ! Demi-millénaire !';
            xp = 1500;
            break;
          case 1000:
            subtitle = '1000 PESÉES ! LÉGENDAIRE !';
            xp = 3000;
            break;
          default:
            subtitle = `${milestone} pesées enregistrées !`;
            xp = milestone;
        }

        return {
          type: 'milestone',
          title: `${milestone}ème PESÉE !`,
          subtitle,
          xpGained: xp,
          icon: '',
        };
      }
    }
  }

  // Mettre à jour le compteur
  if (totalMeasurements > state.totalMeasurements) {
    state.totalMeasurements = totalMeasurements;
    await saveCelebrationState(state);
  }

  return null;
};

/**
 * Crée un événement de célébration pour défi complété
 */
export const createChallengeCompleteCelebration = (
  challengeName: string,
  challengeNameJp: string,
  xpGained: number
): CelebrationEvent => {
  return {
    type: 'challenge_complete',
    title: 'DÉFI COMPLÉTÉ !',
    subtitle: `${challengeName} ${challengeNameJp}`,
    xpGained,
    icon: '',
  };
};

/**
 * Vérifie toutes les célébrations possibles
 */
export const checkAllCelebrations = async (params: {
  currentWeight?: number;
  goalWeight?: number;
  startWeight?: number;
  currentRank?: Rank;
  currentStreak?: number;
  totalMeasurements?: number;
}): Promise<CelebrationEvent[]> => {
  const celebrations: CelebrationEvent[] = [];

  // Vérifier objectif de poids
  if (params.currentWeight && params.goalWeight && params.startWeight) {
    const goalCelebration = await checkGoalReached(
      params.currentWeight,
      params.goalWeight,
      params.startWeight
    );
    if (goalCelebration) celebrations.push(goalCelebration);
  }

  // Vérifier montée de rang
  if (params.currentRank) {
    const rankCelebration = await checkRankUp(params.currentRank);
    if (rankCelebration) celebrations.push(rankCelebration);
  }

  // Vérifier record de streak
  if (params.currentStreak !== undefined) {
    const streakCelebration = await checkStreakRecord(params.currentStreak);
    if (streakCelebration) celebrations.push(streakCelebration);
  }

  // Vérifier milestone de pesées
  if (params.totalMeasurements !== undefined) {
    const milestoneCelebration = await checkMeasurementMilestone(params.totalMeasurements);
    if (milestoneCelebration) celebrations.push(milestoneCelebration);
  }

  return celebrations;
};

/**
 * Reset l'état des célébrations (pour les tests)
 */
export const resetCelebrationState = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};

export default {
  checkGoalReached,
  checkRankUp,
  checkStreakRecord,
  checkMeasurementMilestone,
  checkAllCelebrations,
  createChallengeCompleteCelebration,
  resetCelebrationState,
};
