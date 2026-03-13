import { getSleepStats } from './sleepService';
import { getWeeklyLoadStats } from './trainingLoadService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
import { formatHoursHM } from '@/lib/formatDuration';

export interface ReadinessScore {
  score: number; // 0-100
  level: 'optimal' | 'good' | 'moderate' | 'poor' | 'critical';
  message: string;
  factors: {
    sleep: { score: number; impact: 'positive' | 'neutral' | 'negative' };
    charge: { score: number; impact: 'positive' | 'neutral' | 'negative' };
    hydration: { score: number; impact: 'positive' | 'neutral' | 'negative' };
    streak: { score: number; impact: 'positive' | 'neutral' | 'negative' };
    heartRate?: { score: number; impact: 'positive' | 'neutral' | 'negative' };
    hrv?: { score: number; impact: 'positive' | 'neutral' | 'negative' };
  };
  recommendation: 'go' | 'caution' | 'rest';
}

const HYDRATION_KEY = '@yoroi_hydration';
const RESTING_HR_KEY = '@yoroi_health_last_resting_hr';
const HRV_KEY = '@yoroi_health_last_hrv';

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
    const [sleepStats, loadStats, hydration, restingHRRaw, hrvRaw] = await Promise.all([
      getSleepStats(),
      getWeeklyLoadStats(),
      getTodayHydration(),
      AsyncStorage.getItem(RESTING_HR_KEY),
      AsyncStorage.getItem(HRV_KEY),
    ]);
    const restingHR = restingHRRaw ? parseFloat(restingHRRaw) : 0;
    const hrv = hrvRaw ? parseFloat(hrvRaw) : 0;

    // Détection pas de données : Si tout est vide, score = 0
    const hasSleepData = sleepStats && sleepStats.lastNightDuration > 0;
    const hasLoadData = loadStats && loadStats.totalLoad > 0;
    const hasHydrationData = hydration > 0;

    if (!hasSleepData && !hasLoadData && !hasHydrationData) {
      return {
        score: 0,
        level: 'moderate',
        message: 'En attente de données...',
        factors: {
          sleep: { score: 0, impact: 'neutral' },
          charge: { score: 0, impact: 'neutral' },
          hydration: { score: 0, impact: 'neutral' },
          streak: { score: 0, impact: 'neutral' },
        },
        recommendation: 'caution',
      };
    }

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
    // Si pas de donnée hydratation (ni HealthKit ni saisie manuelle) → score neutre 50
    // pour ne pas pénaliser les utilisateurs qui ne loguent pas l'eau
    const hydrationTarget = 2500; // ml
    const hydrationScore = hasHydrationData
      ? Math.min(1, hydration / hydrationTarget) * 100
      : 50; // neutre si aucune donnée
    const hydrationImpact: 'positive' | 'neutral' | 'negative' =
      !hasHydrationData ? 'neutral'
      : hydrationScore >= 80 ? 'positive'
      : hydrationScore >= 50 ? 'neutral'
      : 'negative';

    // Score Streak (0-100)
    const streakScore = Math.min(100, streakDays * 5);
    const streakImpact: 'positive' | 'neutral' | 'negative' =
      streakDays >= 7 ? 'positive' : streakDays >= 3 ? 'neutral' : 'negative';

    // Score FC au repos (0-100) — FC basse = meilleure récupération
    // FC normale au repos : 60-100 bpm. < 60 (athlète) = très bon, > 80 = stress/fatigue
    let hrScore = 50; // neutre si pas de donnée
    let hrImpact: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (restingHR > 0) {
      if (restingHR < 55) { hrScore = 100; hrImpact = 'positive'; }
      else if (restingHR < 65) { hrScore = 85; hrImpact = 'positive'; }
      else if (restingHR < 75) { hrScore = 65; hrImpact = 'neutral'; }
      else if (restingHR < 85) { hrScore = 45; hrImpact = 'neutral'; }
      else { hrScore = 20; hrImpact = 'negative'; }
    }

    // Score HRV (0-100) — HRV élevée = meilleure récupération
    // HRV normale : 20-100 ms selon l'âge/forme. > 60 ms = bon, < 25 ms = fatigue
    let hrvScore = 50; // neutre si pas de donnée
    let hrvImpact: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (hrv > 0) {
      if (hrv >= 80) { hrvScore = 100; hrvImpact = 'positive'; }
      else if (hrv >= 60) { hrvScore = 85; hrvImpact = 'positive'; }
      else if (hrv >= 40) { hrvScore = 65; hrvImpact = 'neutral'; }
      else if (hrv >= 25) { hrvScore = 40; hrvImpact = 'neutral'; }
      else { hrvScore = 15; hrvImpact = 'negative'; }
    }

    // Score global (moyenne pondérée) — avec ou sans données biometriques
    const hasHRData = restingHR > 0;
    const hasHRVData = hrv > 0;
    let globalScore: number;
    if (hasHRData && hasHRVData) {
      // Avec FC repos + HRV : poids réduits sur sommeil/charge pour faire de la place
      globalScore = Math.round(
        sleepScore * 0.28 +
        chargeScore * 0.22 +
        hydrationScore * 0.15 +
        streakScore * 0.10 +
        hrScore * 0.13 +
        hrvScore * 0.12
      );
    } else if (hasHRData || hasHRVData) {
      const bioScore = hasHRData ? hrScore : hrvScore;
      globalScore = Math.round(
        sleepScore * 0.31 +
        chargeScore * 0.26 +
        hydrationScore * 0.18 +
        streakScore * 0.12 +
        bioScore * 0.13
      );
    } else {
      globalScore = Math.round(
        sleepScore * 0.35 +
        chargeScore * 0.30 +
        hydrationScore * 0.20 +
        streakScore * 0.15
      );
    }

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
        ...(restingHR > 0 && { heartRate: { score: Math.round(hrScore), impact: hrImpact } }),
        ...(hrv > 0 && { hrv: { score: Math.round(hrvScore), impact: hrvImpact } }),
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
      message: `Pour résorber ${formatHoursHM(debtHours)} de dette en ${daysToRecover} jours, couche-toi à ${recommendedBedtime} (${formatHoursHM(targetSleepHours)} de sommeil).`,
    };
  } catch (error) {
    logger.error('Erreur calcul récupération:', error);
    return null;
  }
};

