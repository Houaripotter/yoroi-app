// ============================================
// YOROI - SCORE DE FORME QUOTIDIEN
// ============================================
// Calcul local du score de forme (0-100)
// Motive l'utilisateur avec des conseils personnalises
// 100% Offline - AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllMeasurements, getAllWorkouts } from './storage';
import { getDailyHydration, getDailyQuestsProgress } from './quests';

// ============================================
// TYPES
// ============================================

export type ScoreLevel = 'poor' | 'average' | 'good' | 'great' | 'excellent';

export interface FitnessScoreData {
  score: number;
  level: ScoreLevel;
  icon: string;
  label: string;
  color: string;
  breakdown: ScoreBreakdown;
  advice: string;
  previousScore?: number;
  scoreDiff?: number;
}

export interface ScoreBreakdown {
  weightTrend: number;      // -20 a +20
  streak: number;           // 0 a +20
  trainedToday: number;     // 0 ou +15
  hydration: number;        // 0 a +10
  weighedToday: number;     // 0 ou +10
  questsBonus: number;      // 0 ou +5
}

export interface ScoreHistoryEntry {
  date: string;
  score: number;
  level: ScoreLevel;
}

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEY = '@yoroi_fitness_score_history';
const WATER_GOAL = 2.0; // 2 litres par defaut

// Configuration des niveaux
export const SCORE_LEVELS: Record<ScoreLevel, { min: number; max: number; icon: string; label: string; color: string }> = {
  poor: { min: 0, max: 30, icon: '😰', label: 'A ameliorer', color: '#EF4444' },
  average: { min: 31, max: 50, icon: '😐', label: 'Moyen', color: '#F97316' },
  good: { min: 51, max: 70, icon: '😊', label: 'Bien', color: '#EAB308' },
  great: { min: 71, max: 85, icon: '💪', label: 'Tres bien', color: '#22C55E' },
  excellent: { min: 86, max: 100, icon: '🔥', label: 'Excellent', color: '#D4AF37' },
};

// Conseils par niveau
const ADVICE_BY_LEVEL: Record<ScoreLevel, string[]> = {
  poor: [
    'Petit coup de mou ? Un entrainement et c\'est reparti !',
    'Commence par te peser et boire de l\'eau. Tu peux le faire !',
    'Chaque jour est une nouvelle chance. Releve-toi, guerrier !',
    'Un pas apres l\'autre. Commence par ouvrir l\'app !',
  ],
  average: [
    'Tu es sur la bonne voie. Continue comme ca !',
    'Quelques efforts de plus et tu seras au top !',
    'N\'abandonne pas, tu progresses !',
    'Un petit entrainement pour booster ton score ?',
  ],
  good: [
    'Belle regularite ! Continue sur cette lancee.',
    'Tu es dans le bon rythme, guerrier !',
    'Tes efforts paient, continue !',
    'Tu fais du bon travail, persevere !',
  ],
  great: [
    'Impressionnant ! Tu es vraiment motive.',
    'Tu es en feu ! Continue comme ca.',
    'Excellent travail, tu es un vrai guerrier !',
    'Ta discipline est admirable !',
  ],
  excellent: [
    'Tu es une machine ! Le guerrier en toi est fier.',
    'Legende ! Tu domines tous les domaines.',
    'Perfection atteinte ! Tu es au sommet.',
    'Maitre absolu ! Tu es un exemple a suivre.',
  ],
};

// ============================================
// HELPERS
// ============================================

const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getScoreLevel = (score: number): ScoreLevel => {
  if (score <= 30) return 'poor';
  if (score <= 50) return 'average';
  if (score <= 70) return 'good';
  if (score <= 85) return 'great';
  return 'excellent';
};

const getRandomAdvice = (level: ScoreLevel): string => {
  const advices = ADVICE_BY_LEVEL[level];
  return advices[Math.floor(Math.random() * advices.length)];
};

// ============================================
// CALCUL DU SCORE
// ============================================

/**
 * Calcule le score de forme quotidien
 */
export const calculateFitnessScore = async (): Promise<FitnessScoreData> => {
  const today = getToday();
  let score = 50; // Score de base
  const breakdown: ScoreBreakdown = {
    weightTrend: 0,
    streak: 0,
    trainedToday: 0,
    hydration: 0,
    weighedToday: 0,
    questsBonus: 0,
  };

  try {
    // === 1. TENDANCE POIDS (-20 a +20) ===
    const measurements = await getAllMeasurements();

    if (measurements.length >= 2) {
      // Trier par date decroissante
      const sorted = [...measurements].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Comparer les 7 derniers jours
      const recent = sorted[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const olderMeasurement = sorted.find(
        m => new Date(m.date) <= weekAgo
      );

      if (olderMeasurement) {
        const weightChange = recent.weight - olderMeasurement.weight;

        if (weightChange < -0.5) {
          // Perte de poids = positif
          breakdown.weightTrend = Math.min(20, Math.abs(weightChange) * 10);
        } else if (weightChange > 0.5) {
          // Prise de poids = negatif
          breakdown.weightTrend = Math.max(-20, -weightChange * 10);
        } else {
          // Stable = leger bonus
          breakdown.weightTrend = 5;
        }
      }

      // === STREAK ===
      let streak = 0;
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      for (let i = 0; i < sorted.length; i++) {
        const measureDate = new Date(sorted[i].date);
        measureDate.setHours(0, 0, 0, 0);
        const expectedDate = new Date(todayDate);
        expectedDate.setDate(todayDate.getDate() - i);

        if (measureDate.getTime() === expectedDate.getTime()) {
          streak++;
        } else {
          break;
        }
      }

      // Bonus streak
      if (streak >= 30) {
        breakdown.streak = 20;
      } else if (streak >= 7) {
        breakdown.streak = 10;
      } else if (streak >= 3) {
        breakdown.streak = 5;
      }

      // === PESEE AUJOURD'HUI (+10) ===
      const todayMeasurement = sorted.find(m => m.date === today);
      if (todayMeasurement) {
        breakdown.weighedToday = 10;
      }
    }

    // === 2. ENTRAINEMENT AUJOURD'HUI (+15) ===
    const workouts = await getAllWorkouts();
    const todayWorkout = workouts.find(w => w.date === today);
    if (todayWorkout) {
      breakdown.trainedToday = 15;
    }

    // === 3. HYDRATATION (+0 a +10) ===
    const hydration = await getDailyHydration();
    const hydrationPercent = Math.min(1, hydration / WATER_GOAL);
    breakdown.hydration = Math.round(hydrationPercent * 10);

    // === 4. QUETES COMPLETEES (+5) ===
    const questsProgress = await getDailyQuestsProgress();
    if (questsProgress.completed === questsProgress.total && questsProgress.total > 0) {
      breakdown.questsBonus = 5;
    }

    // Calculer le score final
    score += breakdown.weightTrend;
    score += breakdown.streak;
    score += breakdown.trainedToday;
    score += breakdown.hydration;
    score += breakdown.weighedToday;
    score += breakdown.questsBonus;

    // Borner entre 0 et 100
    score = Math.min(100, Math.max(0, Math.round(score)));

  } catch (error) {
    console.error('Erreur calcul score forme:', error);
  }

  // Determiner le niveau
  const level = getScoreLevel(score);
  const levelConfig = SCORE_LEVELS[level];

  // Recuperer le score precedent
  const history = await getScoreHistory();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const previousEntry = history.find(h => h.date === yesterdayStr);

  // Sauvegarder le score du jour
  await saveScoreToHistory(score, level);

  return {
    score,
    level,
    icon: levelConfig.icon,
    label: levelConfig.label,
    color: levelConfig.color,
    breakdown,
    advice: getRandomAdvice(level),
    previousScore: previousEntry?.score,
    scoreDiff: previousEntry ? score - previousEntry.score : undefined,
  };
};

// ============================================
// HISTORIQUE
// ============================================

/**
 * Recupere l'historique des scores
 */
export const getScoreHistory = async (): Promise<ScoreHistoryEntry[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Erreur lecture historique score:', error);
    return [];
  }
};

/**
 * Sauvegarde le score du jour dans l'historique
 */
const saveScoreToHistory = async (score: number, level: ScoreLevel): Promise<void> => {
  try {
    const today = getToday();
    let history = await getScoreHistory();

    // Verifier si on a deja un score pour aujourd'hui
    const todayIndex = history.findIndex(h => h.date === today);

    if (todayIndex >= 0) {
      // Mettre a jour le score existant
      history[todayIndex] = { date: today, score, level };
    } else {
      // Ajouter le nouveau score
      history.push({ date: today, score, level });
    }

    // Garder seulement les 30 derniers jours
    history = history
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Erreur sauvegarde historique score:', error);
  }
};

/**
 * Recupere l'historique des 7 derniers jours
 */
export const getLast7DaysHistory = async (): Promise<ScoreHistoryEntry[]> => {
  const history = await getScoreHistory();
  const last7Days: ScoreHistoryEntry[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const entry = history.find(h => h.date === dateStr);
    if (entry) {
      last7Days.push(entry);
    } else {
      // Pas de score pour ce jour
      last7Days.push({
        date: dateStr,
        score: 0,
        level: 'poor',
      });
    }
  }

  return last7Days;
};

/**
 * Calcule la moyenne des 7 derniers jours
 */
export const getWeeklyAverage = async (): Promise<number> => {
  const history = await getLast7DaysHistory();
  const validScores = history.filter(h => h.score > 0);

  if (validScores.length === 0) return 0;

  const sum = validScores.reduce((acc, h) => acc + h.score, 0);
  return Math.round(sum / validScores.length);
};

/**
 * Calcule la tendance (hausse, baisse, stable)
 */
export const getScoreTrend = async (): Promise<'up' | 'down' | 'stable'> => {
  const history = await getLast7DaysHistory();
  const validScores = history.filter(h => h.score > 0);

  if (validScores.length < 2) return 'stable';

  const recent = validScores.slice(-3);
  const older = validScores.slice(0, -3);

  if (recent.length === 0 || older.length === 0) return 'stable';

  const recentAvg = recent.reduce((acc, h) => acc + h.score, 0) / recent.length;
  const olderAvg = older.reduce((acc, h) => acc + h.score, 0) / older.length;

  const diff = recentAvg - olderAvg;

  if (diff > 5) return 'up';
  if (diff < -5) return 'down';
  return 'stable';
};

// ============================================
// EXPORTS
// ============================================

export default {
  calculateFitnessScore,
  getScoreHistory,
  getLast7DaysHistory,
  getWeeklyAverage,
  getScoreTrend,
  SCORE_LEVELS,
};
