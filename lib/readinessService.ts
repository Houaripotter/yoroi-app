import { getSleepStats, SleepStats } from './sleepService';
import { getWeeklyLoadStats, WeeklyLoadStats } from './trainingLoadService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

export interface ReadinessScore {
  score: number; // 0-100
  level: 'optimal' | 'good' | 'moderate' | 'poor' | 'critical';
  message: string;
  factors: {
    sleep: { score: number; impact: 'positive' | 'neutral' | 'negative' };
    charge: { score: number; impact: 'positive' | 'neutral' | 'negative' };
    hydration: { score: number; impact: 'positive' | 'neutral' | 'negative' };
    streak: { score: number; impact: 'positive' | 'neutral' | 'negative' };
  };
  recommendation: 'go' | 'caution' | 'rest';
}

const HYDRATION_KEY = '@yoroi_hydration';

/**
 * Récupère l'hydratation du jour
 */
const getTodayHydration = async (): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const stored = await AsyncStorage.getItem(`${HYDRATION_KEY}_${today}`);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * Calcule le score de préparation (Readiness)
 */
export const calculateReadinessScore = async (
  streakDays: number = 0
): Promise<ReadinessScore> => {
  try {
    const [sleepStats, loadStats, hydration] = await Promise.all([
      getSleepStats(),
      getWeeklyLoadStats(),
      getTodayHydration(),
    ]);

    // Score Sommeil (0-100)
    let sleepScore = 0;
    if (sleepStats) {
      const debtImpact = Math.max(0, 50 - sleepStats.sleepDebtHours * 5);
      const qualityImpact = sleepStats.averageQuality * 10;
      const durationImpact = Math.min(30, (sleepStats.lastNightDuration / 480) * 30);
      sleepScore = debtImpact * 0.4 + qualityImpact * 0.3 + durationImpact * 0.3;
    }
    const sleepImpact: 'positive' | 'neutral' | 'negative' =
      sleepScore >= 70 ? 'positive' : sleepScore >= 40 ? 'neutral' : 'negative';

    // Score Charge (0-100)
    let chargeScore = 0;
    if (loadStats) {
      const loadRatio = loadStats.totalLoad / 2000;
      if (loadRatio < 0.75) chargeScore = 80; // Zone optimale
      else if (loadRatio < 1) chargeScore = 60; // Modéré
      else if (loadRatio < 1.25) chargeScore = 40; // Élevé
      else chargeScore = 20; // Danger
    }
    const chargeImpact: 'positive' | 'neutral' | 'negative' = 
      chargeScore >= 60 ? 'positive' : chargeScore >= 40 ? 'neutral' : 'negative';

    // Score Hydratation (0-100)
    const hydrationTarget = 2500; // ml
    const hydrationRatio = Math.min(1, hydration / hydrationTarget);
    const hydrationScore = hydrationRatio * 100;
    const hydrationImpact: 'positive' | 'neutral' | 'negative' = 
      hydrationScore >= 80 ? 'positive' : hydrationScore >= 50 ? 'neutral' : 'negative';

    // Score Streak (0-100)
    const streakScore = Math.min(100, streakDays * 5);
    const streakImpact: 'positive' | 'neutral' | 'negative' = 
      streakDays >= 7 ? 'positive' : streakDays >= 3 ? 'neutral' : 'negative';

    // Score global (moyenne pondérée)
    const globalScore = Math.round(
      sleepScore * 0.35 +
      chargeScore * 0.30 +
      hydrationScore * 0.20 +
      streakScore * 0.15
    );

    // Déterminer le niveau
    let level: ReadinessScore['level'];
    let message: string;
    let recommendation: 'go' | 'caution' | 'rest';

    if (globalScore >= 80) {
      level = 'optimal';
      message = 'Prêt pour une séance intense !';
      recommendation = 'go';
    } else if (globalScore >= 65) {
      level = 'good';
      message = 'En bonne forme, tu peux y aller';
      recommendation = 'go';
    } else if (globalScore >= 50) {
      level = 'moderate';
      message = 'Attention, écoute ton corps';
      recommendation = 'caution';
    } else if (globalScore >= 35) {
      level = 'poor';
      message = 'Récupération recommandée';
      recommendation = 'caution';
    } else {
      level = 'critical';
      message = 'Repos nécessaire avant de reprendre';
      recommendation = 'rest';
    }

    return {
      score: globalScore,
      level,
      message,
      factors: {
        sleep: { score: Math.round(sleepScore), impact: sleepImpact },
        charge: { score: Math.round(chargeScore), impact: chargeImpact },
        hydration: { score: Math.round(hydrationScore), impact: hydrationImpact },
        streak: { score: Math.round(streakScore), impact: streakImpact },
      },
      recommendation,
    };
  } catch (error) {
    logger.error('Erreur calcul readiness:', error);
    return {
      score: 50,
      level: 'moderate',
      message: 'Données insuffisantes',
      factors: {
        sleep: { score: 50, impact: 'neutral' },
        charge: { score: 50, impact: 'neutral' },
        hydration: { score: 50, impact: 'neutral' },
        streak: { score: 50, impact: 'neutral' },
      },
      recommendation: 'caution',
    };
  }
};

/**
 * Calcule l'heure de coucher recommandée pour résorber la dette de sommeil
 */
export const calculateRecoveryBedtime = async (daysToRecover: number = 3): Promise<{
  recommendedBedtime: string; // HH:mm
  hoursToSleep: number;
  message: string;
} | null> => {
  try {
    const sleepStats = await getSleepStats();
    if (!sleepStats || sleepStats.sleepDebtHours <= 0) {
      return null;
    }

    const debtHours = sleepStats.sleepDebtHours;
    const hoursToRecover = debtHours / daysToRecover;
    const idealSleepHours = 8; // 8h par nuit
    const targetSleepHours = idealSleepHours + hoursToRecover;

    // Calculer l'heure de coucher (supposant réveil à 7h)
    const wakeUpHour = 7;
    const bedtimeHour = wakeUpHour - targetSleepHours;
    const bedtimeMinutes = Math.floor((bedtimeHour % 1) * 60);
    const bedtimeHours = Math.floor(bedtimeHour);

    const recommendedBedtime = `${bedtimeHours.toString().padStart(2, '0')}:${bedtimeMinutes.toString().padStart(2, '0')}`;

    return {
      recommendedBedtime,
      hoursToSleep: Math.round(targetSleepHours * 10) / 10,
      message: `Pour résorber ${debtHours.toFixed(1)}h de dette en ${daysToRecover} jours, couche-toi à ${recommendedBedtime} (${targetSleepHours.toFixed(1)}h de sommeil).`,
    };
  } catch (error) {
    logger.error('Erreur calcul récupération:', error);
    return null;
  }
};

