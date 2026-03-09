// ============================================
// YOROI - SERVICE BONUS SANTÉ
// ============================================
// Bonus quotidiens depuis Apple Health / Health Connect
// Pas >= 8000 : +10 pts/jour
// Sommeil >= 7h (420 min) : +10 pts/jour
// Calories actives >= 300 : +5 pts/jour

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEY_TOTAL = '@yoroi_health_daily_bonus';
const STORAGE_KEY_HISTORY = '@yoroi_health_bonus_history';
const MAX_HISTORY_DAYS = 90;

const BONUS_THRESHOLDS = {
  steps: { min: 8000, bonus: 10 },
  sleep: { min: 420, bonus: 10 },    // 420 minutes = 7 heures
  calories: { min: 300, bonus: 5 },   // calories actives
} as const;

// ============================================
// TYPES
// ============================================

interface DailyBonusEntry {
  date: string;           // YYYY-MM-DD
  stepsBonus: number;
  sleepBonus: number;
  caloriesBonus: number;
  total: number;
}

interface HealthBonusHistory {
  entries: DailyBonusEntry[];
  cumulativeTotal: number;
}

// ============================================
// FONCTIONS PRINCIPALES
// ============================================

/**
 * Calcule le bonus santé du jour a partir des données Apple Health / Health Connect.
 * Stocke le resultat dans l'historique et met a jour le total cumule.
 * Idempotent : peut etre appele plusieurs fois par jour sans doubler les points.
 */
export const calculateDailyHealthBonus = async (): Promise<DailyBonusEntry> => {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Lire les données de santé via le service unifie
    let steps = 0;
    let sleepMinutes = 0;
    let activeCalories = 0;

    try {
      const HealthConnect = require('./healthConnect').default;

      const [stepsData, sleepData, caloriesData] = await Promise.all([
        HealthConnect.getTodaySteps().catch(() => null),
        HealthConnect.getLastSleep().catch(() => null),
        HealthConnect.getTodayCalories().catch(() => null),
      ]);

      if (stepsData?.count) steps = stepsData.count;
      if (sleepData?.duration) sleepMinutes = sleepData.duration;
      if (caloriesData?.active) activeCalories = caloriesData.active;
    } catch {
      // HealthKit/Health Connect non disponible - bonus = 0
    }

    // Calculer les bonus
    const stepsBonus = steps >= BONUS_THRESHOLDS.steps.min ? BONUS_THRESHOLDS.steps.bonus : 0;
    const sleepBonus = sleepMinutes >= BONUS_THRESHOLDS.sleep.min ? BONUS_THRESHOLDS.sleep.bonus : 0;
    const caloriesBonus = activeCalories >= BONUS_THRESHOLDS.calories.min ? BONUS_THRESHOLDS.calories.bonus : 0;
    const total = stepsBonus + sleepBonus + caloriesBonus;

    const entry: DailyBonusEntry = {
      date: today,
      stepsBonus,
      sleepBonus,
      caloriesBonus,
      total,
    };

    // Charger l'historique existant
    const history = await loadHistory();

    // Remplacer ou ajouter l'entree du jour (idempotent)
    const existingIndex = history.entries.findIndex(e => e.date === today);
    if (existingIndex >= 0) {
      // Soustraire l'ancien total avant de remplacer
      history.cumulativeTotal -= history.entries[existingIndex].total;
      history.entries[existingIndex] = entry;
    } else {
      history.entries.push(entry);
    }
    history.cumulativeTotal += total;

    // Nettoyer les entrees de plus de 90 jours
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_HISTORY_DAYS);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    history.entries = history.entries.filter(e => e.date >= cutoffStr);

    // Recalculer le total cumule (securite)
    history.cumulativeTotal = history.entries.reduce((sum, e) => sum + e.total, 0);

    // Sauvegarder
    await AsyncStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    await AsyncStorage.setItem(STORAGE_KEY_TOTAL, history.cumulativeTotal.toString());

    return entry;
  } catch (error) {
    logger.error('[HealthBonus] Erreur calcul bonus santé:', error);
    return { date: today, stepsBonus: 0, sleepBonus: 0, caloriesBonus: 0, total: 0 };
  }
};

/**
 * Retourne le total cumule des bonus santé (lu par gamification.ts).
 */
export const getHealthBonusTotal = async (): Promise<number> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_TOTAL);
    return data ? parseInt(data, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * Retourne le bonus du jour pour affichage.
 */
export const getTodayHealthBonus = async (): Promise<DailyBonusEntry> => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const history = await loadHistory();
    const todayEntry = history.entries.find(e => e.date === today);
    return todayEntry || { date: today, stepsBonus: 0, sleepBonus: 0, caloriesBonus: 0, total: 0 };
  } catch {
    return { date: today, stepsBonus: 0, sleepBonus: 0, caloriesBonus: 0, total: 0 };
  }
};

// ============================================
// HELPERS INTERNES
// ============================================

const loadHistory = async (): Promise<HealthBonusHistory> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_HISTORY);
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return { entries: [], cumulativeTotal: 0 };
};

export default {
  calculateDailyHealthBonus,
  getHealthBonusTotal,
  getTodayHealthBonus,
  BONUS_THRESHOLDS,
};
