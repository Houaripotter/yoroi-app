// ============================================
// YOROI - SERVICE SOMMEIL & RÉCUPÉRATION
// ============================================
// Gestion du sommeil, dette de sommeil, et récupération

import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays, differenceInMinutes, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================
// TYPES
// ============================================

export interface SleepEntry {
  id: string;
  date: string; // YYYY-MM-DD
  bedTime: string; // HH:MM (heure de coucher)
  wakeTime: string; // HH:MM (heure de réveil)
  duration: number; // minutes
  quality: number; // 1-5 étoiles
  notes?: string;
}

export interface SleepStats {
  averageDuration: number; // minutes
  averageQuality: number; // 1-5
  sleepDebt: number; // minutes de dette
  sleepDebtHours: number; // heures de dette (arrondi)
  lastNightDuration: number; // dernière nuit
  lastNightQuality: number;
  trend: 'improving' | 'stable' | 'declining';
  weeklyData: { date: string; duration: number; quality: number }[];
}

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEYS = {
  SLEEP_ENTRIES: '@yoroi_sleep_entries',
  SLEEP_GOAL: '@yoroi_sleep_goal', // Objectif en minutes (défaut: 480 = 8h)
};

const DEFAULT_SLEEP_GOAL = 480; // 8 heures en minutes

// ============================================
// FONCTIONS
// ============================================

/**
 * Récupère l'objectif de sommeil (en minutes)
 */
export const getSleepGoal = async (): Promise<number> => {
  try {
    const goal = await AsyncStorage.getItem(STORAGE_KEYS.SLEEP_GOAL);
    return goal ? parseInt(goal, 10) : DEFAULT_SLEEP_GOAL;
  } catch (error) {
    console.error('Erreur lecture objectif sommeil:', error);
    return DEFAULT_SLEEP_GOAL;
  }
};

/**
 * Définit l'objectif de sommeil (en minutes)
 */
export const setSleepGoal = async (minutes: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SLEEP_GOAL, minutes.toString());
  } catch (error) {
    console.error('Erreur sauvegarde objectif sommeil:', error);
  }
};

/**
 * Récupère toutes les entrées de sommeil
 */
export const getSleepEntries = async (): Promise<SleepEntry[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SLEEP_ENTRIES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erreur lecture sommeil:', error);
    return [];
  }
};

/**
 * Ajoute une entrée de sommeil
 */
export const addSleepEntry = async (
  bedTime: string,
  wakeTime: string,
  quality: number,
  notes?: string
): Promise<SleepEntry> => {
  try {
    const entries = await getSleepEntries();
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Calculer la durée
    const [bedH, bedM] = bedTime.split(':').map(Number);
    const [wakeH, wakeM] = wakeTime.split(':').map(Number);
    
    let durationMinutes = (wakeH * 60 + wakeM) - (bedH * 60 + bedM);
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60; // Passe minuit
    }
    
    const newEntry: SleepEntry = {
      id: `sleep_${Date.now()}`,
      date: today,
      bedTime,
      wakeTime,
      duration: durationMinutes,
      quality,
      notes,
    };
    
    // Remplacer si même date, sinon ajouter
    const existingIndex = entries.findIndex(e => e.date === today);
    if (existingIndex >= 0) {
      entries[existingIndex] = newEntry;
    } else {
      entries.unshift(newEntry);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.SLEEP_ENTRIES, JSON.stringify(entries));
    return newEntry;
  } catch (error) {
    console.error('Erreur ajout sommeil:', error);
    throw error;
  }
};

/**
 * Récupère l'entrée de sommeil d'aujourd'hui
 */
export const getTodaySleep = async (): Promise<SleepEntry | null> => {
  try {
    const entries = await getSleepEntries();
    const today = format(new Date(), 'yyyy-MM-dd');
    return entries.find(e => e.date === today) || null;
  } catch (error) {
    console.error('Erreur lecture sommeil aujourd\'hui:', error);
    return null;
  }
};

/**
 * Calcule les statistiques de sommeil
 */
export const getSleepStats = async (): Promise<SleepStats> => {
  try {
    const entries = await getSleepEntries();
    const goal = await getSleepGoal();
    
    // Derniers 7 jours
    const last7Days: SleepEntry[] = [];
    for (let i = 0; i < 7; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const entry = entries.find(e => e.date === date);
      if (entry) {
        last7Days.push(entry);
      }
    }
    
    // Moyennes
    const avgDuration = last7Days.length > 0
      ? last7Days.reduce((sum, e) => sum + e.duration, 0) / last7Days.length
      : 0;
    
    const avgQuality = last7Days.length > 0
      ? last7Days.reduce((sum, e) => sum + e.quality, 0) / last7Days.length
      : 0;
    
    // Dette de sommeil (7 derniers jours)
    let sleepDebt = 0;
    for (let i = 0; i < 7; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const entry = entries.find(e => e.date === date);
      const slept = entry?.duration || 0;
      sleepDebt += Math.max(0, goal - slept);
    }
    
    // Tendance (comparer 3 derniers jours vs 3 précédents)
    const recent3 = last7Days.slice(0, 3);
    const prev3 = last7Days.slice(3, 6);
    const recentAvg = recent3.length > 0 ? recent3.reduce((s, e) => s + e.duration, 0) / recent3.length : 0;
    const prevAvg = prev3.length > 0 ? prev3.reduce((s, e) => s + e.duration, 0) / prev3.length : 0;
    
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentAvg > prevAvg + 15) trend = 'improving';
    else if (recentAvg < prevAvg - 15) trend = 'declining';
    
    // Données hebdomadaires pour graphique
    const weeklyData = last7Days.map(e => ({
      date: e.date,
      duration: e.duration,
      quality: e.quality,
    })).reverse();
    
    const lastNight = last7Days[0];
    
    return {
      averageDuration: Math.round(avgDuration),
      averageQuality: Math.round(avgQuality * 10) / 10,
      sleepDebt,
      sleepDebtHours: Math.round(sleepDebt / 60 * 10) / 10,
      lastNightDuration: lastNight?.duration || 0,
      lastNightQuality: lastNight?.quality || 0,
      trend,
      weeklyData,
    };
  } catch (error) {
    console.error('Erreur stats sommeil:', error);
    return {
      averageDuration: 0,
      averageQuality: 0,
      sleepDebt: 0,
      sleepDebtHours: 0,
      lastNightDuration: 0,
      lastNightQuality: 0,
      trend: 'stable',
      weeklyData: [],
    };
  }
};

/**
 * Formate la durée en heures/minutes lisibles
 */
export const formatSleepDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
};

/**
 * Obtient le message de conseil selon la dette de sommeil
 */
export const getSleepAdvice = (debtHours: number): { message: string; severity: 'good' | 'warning' | 'danger' } => {
  if (debtHours <= 2) {
    return {
      message: 'Sommeil optimal ! Tu es en pleine forme 💪',
      severity: 'good',
    };
  } else if (debtHours <= 5) {
    return {
      message: `Tu as ${debtHours}h de dette. Couche-toi plus tôt ce soir.`,
      severity: 'warning',
    };
  } else if (debtHours <= 10) {
    return {
      message: `Attention ! ${debtHours}h de dette. Risque de fatigue intense.`,
      severity: 'warning',
    };
  } else {
    return {
      message: `🚨 Dette critique : ${debtHours}h ! Repos obligatoire.`,
      severity: 'danger',
    };
  }
};

export default {
  getSleepGoal,
  setSleepGoal,
  getSleepEntries,
  addSleepEntry,
  getTodaySleep,
  getSleepStats,
  formatSleepDuration,
  getSleepAdvice,
};

