// ============================================
// YOROI - SERVICE SOMMEIL & RÉCUPÉRATION
// ============================================
// Gestion du sommeil, dette de sommeil, et récupération

import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays, differenceInMinutes, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import logger from '@/lib/security/logger';

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
  phases?: {
    deep: number;   // minutes
    rem: number;    // minutes
    core: number;   // minutes
    awake: number;  // minutes
    inBed?: number; // minutes
  };
  source?: string;
  efficiency?: number; // 0-100%
  interruptions?: number;
  sleepHeartRate?: { min: number; max: number; avg: number };
  respiratoryRate?: { min: number; max: number; avg?: number };
  wristTemperature?: number; // deviation vs baseline en °C
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
  currentStreak: number; // Jours consécutifs avec objectif atteint
  longestStreak: number; // Plus longue série
  goalReachedDays: number; // Nombre de jours où l'objectif a été atteint (derniers 30 jours)
  totalDays: number; // Nombre total de jours avec données (derniers 30 jours)
}

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEYS = {
  SLEEP_ENTRIES: '@yoroi_sleep_entries',
  SLEEP_GOAL: '@yoroi_sleep_goal', // Objectif en minutes (défaut: 480 = 8h)
  LONGEST_STREAK: '@yoroi_sleep_longest_streak',
};

const DEFAULT_SLEEP_GOAL = 480; // 8h par defaut

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
    logger.error('Erreur lecture objectif sommeil:', error);
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
    logger.error('Erreur sauvegarde objectif sommeil:', error);
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
    logger.error('Erreur lecture sommeil:', error);
    return [];
  }
};

/**
 * Valide le format HH:MM d'une heure
 */
const isValidTimeFormat = (time: string): boolean => {
  if (!time || typeof time !== 'string') return false;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

/**
 * Parse une heure au format HH:MM en heures et minutes
 */
const parseTime = (time: string): { hours: number; minutes: number } => {
  const [h, m] = time.split(':').map(Number);
  return { hours: h, minutes: m };
};

/**
 * Ajoute une entrée de sommeil
 */
export const addSleepEntry = async (
  bedTime: string,
  wakeTime: string,
  quality: number,
  notes?: string,
  customDate?: string
): Promise<SleepEntry> => {
  // Validation du format horaire
  if (!isValidTimeFormat(bedTime)) {
    throw new Error(`Format heure de coucher invalide: "${bedTime}". Utilisez HH:MM (ex: 23:00)`);
  }
  if (!isValidTimeFormat(wakeTime)) {
    throw new Error(`Format heure de réveil invalide: "${wakeTime}". Utilisez HH:MM (ex: 07:00)`);
  }

  try {
    const entries = await getSleepEntries();
    const today = customDate || format(new Date(), 'yyyy-MM-dd');

    // Calculer la durée
    const bed = parseTime(bedTime);
    const wake = parseTime(wakeTime);

    let durationMinutes = (wake.hours * 60 + wake.minutes) - (bed.hours * 60 + bed.minutes);
    if (durationMinutes <= 0) {
      durationMinutes += 24 * 60; // Passe minuit
    }

    // Validation : durée entre 1h et 16h
    if (durationMinutes < 60 || durationMinutes > 960) {
      throw new Error(`Durée de sommeil irréaliste (${Math.round(durationMinutes / 60)}h). Vérifiez vos horaires.`);
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
    logger.error('Erreur ajout sommeil:', error);
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
    logger.error('Erreur lecture sommeil aujourd\'hui:', error);
    return null;
  }
};

/**
 * Calcule le streak actuel (jours consécutifs avec objectif atteint)
 */
const calculateCurrentStreak = (entries: SleepEntry[], goal: number): number => {
  if (entries.length === 0 || goal === 0) return 0;

  let streak = 0;
  const today = new Date();

  // Parcourir les jours depuis aujourd'hui vers le passé
  for (let i = 0; i < 365; i++) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    const entry = entries.find(e => e.date === date);

    if (!entry) {
      // Pas de données = casse le streak
      break;
    }

    if (entry.duration >= goal) {
      streak++;
    } else {
      // Objectif non atteint = casse le streak
      break;
    }
  }

  return streak;
};

/**
 * Calcule le plus long streak de tous les temps
 */
const calculateLongestStreak = async (entries: SleepEntry[], goal: number): Promise<number> => {
  if (entries.length === 0 || goal === 0) return 0;

  // Récupérer le record sauvegardé
  const savedRecord = await AsyncStorage.getItem(STORAGE_KEYS.LONGEST_STREAK);
  let longestStreak = savedRecord ? parseInt(savedRecord, 10) : 0;

  // Calculer les streaks à partir des données
  let currentTestStreak = 0;
  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  for (let i = 0; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i];

    if (entry.duration >= goal) {
      currentTestStreak++;
      longestStreak = Math.max(longestStreak, currentTestStreak);
    } else {
      currentTestStreak = 0;
    }
  }

  // Sauvegarder le nouveau record si nécessaire
  await AsyncStorage.setItem(STORAGE_KEYS.LONGEST_STREAK, longestStreak.toString());

  return longestStreak;
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

    // Derniers 30 jours pour les statistiques de streak
    const last30Days: SleepEntry[] = [];
    let goalReachedDays = 0;
    for (let i = 0; i < 30; i++) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const entry = entries.find(e => e.date === date);
      if (entry) {
        last30Days.push(entry);
        if (entry.duration >= goal && goal > 0) {
          goalReachedDays++;
        }
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
      if (entry && goal > 0) {
        sleepDebt += Math.max(0, goal - entry.duration);
      }
    }

    // Tendance
    const recent3 = last7Days.slice(0, 3);
    const prev3 = last7Days.slice(3, 6);
    const recentAvg = recent3.length > 0 ? recent3.reduce((s, e) => s + e.duration, 0) / recent3.length : 0;
    const prevAvg = prev3.length > 0 ? prev3.reduce((s, e) => s + e.duration, 0) / prev3.length : 0;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentAvg > prevAvg + 15) trend = 'improving';
    else if (recentAvg < prevAvg - 15) trend = 'declining';

    // Données hebdomadaires
    const weeklyData = last7Days.map(e => ({
      date: e.date,
      duration: e.duration,
      quality: e.quality,
    })).reverse();

    const lastNight = last7Days[0];

    // Calcul des streaks
    const currentStreak = calculateCurrentStreak(entries, goal);
    const longestStreak = await calculateLongestStreak(entries, goal);

    return {
      averageDuration: Math.round(avgDuration),
      averageQuality: Math.round(avgQuality * 10) / 10,
      sleepDebt,
      sleepDebtHours: Math.round(sleepDebt / 60 * 10) / 10,
      lastNightDuration: lastNight?.duration || 0,
      lastNightQuality: lastNight?.quality || 0,
      trend,
      weeklyData,
      currentStreak,
      longestStreak,
      goalReachedDays,
      totalDays: last30Days.length,
    };
  } catch (error) {
    logger.error('Erreur stats sommeil:', error);
    return {
      averageDuration: 0,
      averageQuality: 0,
      sleepDebt: 0,
      sleepDebtHours: 0,
      lastNightDuration: 0,
      lastNightQuality: 0,
      trend: 'stable',
      weeklyData: [],
      currentStreak: 0,
      longestStreak: 0,
      goalReachedDays: 0,
      totalDays: 0,
    };
  }
};

/**
 * Formate la durée en heures/minutes lisibles
 */
export const formatSleepDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins.toString().padStart(2, '0')}`;
};

/**
 * Obtient le message de conseil selon la dette de sommeil
 */
export const getSleepAdvice = (debtHours: number): { message: string; severity: 'good' | 'warning' | 'danger' } => {
  if (debtHours <= 2) {
    return {
      message: 'Sommeil optimal ! Tu es en pleine forme',
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

/**
 * Exporte les données de sommeil en CSV
 */
export const exportSleepToCSV = async (): Promise<string> => {
  try {
    const entries = await getSleepEntries();

    // En-tête CSV
    let csv = 'Date,Heure Coucher,Heure Réveil,Durée (heures),Qualité (1-5),Notes\n';

    // Ajouter chaque entrée (du plus récent au plus ancien)
    const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

    for (const entry of sortedEntries) {
      const durationHours = (entry.duration / 60).toFixed(1);
      const notes = (entry.notes || '').replace(/,/g, ';').replace(/\n/g, ' '); // Échapper les virgules et retours à la ligne

      csv += `${entry.date},${entry.bedTime},${entry.wakeTime},${durationHours},${entry.quality},"${notes}"\n`;
    }

    return csv;
  } catch (error) {
    logger.error('Erreur export CSV sommeil:', error);
    throw error;
  }
};

/**
 * Génère un texte de partage avec les statistiques de sommeil
 */
export const generateSleepShareText = async (): Promise<string> => {
  try {
    const stats = await getSleepStats();
    const goal = await getSleepGoal();

    let text = 'Mes Stats Sommeil - YOROI\n\n';

    if (stats.currentStreak > 0) {
      text += `Streak actuel : ${stats.currentStreak} jour${stats.currentStreak > 1 ? 's' : ''}\n`;
    }
    if (stats.longestStreak > 0) {
      text += `Record : ${stats.longestStreak} jour${stats.longestStreak > 1 ? 's' : ''}\n`;
    }

    text += `\n⏱️ Moyenne : ${formatSleepDuration(stats.averageDuration)}\n`;
    text += `Qualité : ${stats.averageQuality}/5\n`;

    if (goal > 0) {
      text += `Objectif : ${formatSleepDuration(goal)}\n`;
      const successRate = stats.totalDays > 0 ? Math.round((stats.goalReachedDays / stats.totalDays) * 100) : 0;
      text += `Réussite : ${successRate}% (${stats.goalReachedDays}/${stats.totalDays} jours)\n`;
    }

    if (stats.sleepDebtHours > 0) {
      text += `\nDette : ${stats.sleepDebtHours}h\n`;
    }

    text += '\nGénéré avec YOROI';

    return text;
  } catch (error) {
    logger.error('Erreur génération texte partage:', error);
    throw error;
  }
};

/**
 * Ajoute une entree de sommeil depuis HealthKit (avec source='healthkit' pour dedup)
 * Ne remplace PAS les entrees manuelles existantes pour la meme date.
 */
export const addSleepEntryFromHealthKit = async (entry: {
  date: string; // YYYY-MM-DD
  bedTime: string; // HH:MM
  wakeTime: string; // HH:MM
  duration: number; // minutes
  quality: number; // 1-5
  phases?: {
    deep?: number;
    rem?: number;
    core?: number;
    awake?: number;
    inBed?: number;
  };
}): Promise<SleepEntry | null> => {
  try {
    const entries = await getSleepEntries();
    const existing = entries.find(e => e.date === entry.date);

    // Ne pas ecraser une entree manuelle existante
    if (existing && !existing.id.startsWith('hk_')) {
      return null;
    }

    const newEntry: SleepEntry = {
      id: `hk_${entry.date}`,
      date: entry.date,
      bedTime: entry.bedTime,
      wakeTime: entry.wakeTime,
      duration: entry.duration,
      quality: entry.quality,
      phases: entry.phases ? {
        deep: entry.phases.deep || 0,
        rem: entry.phases.rem || 0,
        core: entry.phases.core || 0,
        awake: entry.phases.awake || 0,
        inBed: entry.phases.inBed,
      } : undefined,
      source: 'healthkit',
      notes: 'HealthKit',
    };

    // Remplacer une ancienne entree HealthKit ou ajouter
    const existingIndex = entries.findIndex(e => e.date === entry.date);
    if (existingIndex >= 0) {
      entries[existingIndex] = newEntry;
    } else {
      entries.unshift(newEntry);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.SLEEP_ENTRIES, JSON.stringify(entries));
    return newEntry;
  } catch (error) {
    logger.error('Erreur ajout sommeil HealthKit:', error);
    return null;
  }
};

/**
 * Recupere les entrees de sommeil pour une date donnee
 */
export const getSleepEntriesByDate = async (date: string): Promise<SleepEntry[]> => {
  try {
    const entries = await getSleepEntries();
    return entries.filter(e => e.date === date);
  } catch (error) {
    logger.error('Erreur lecture sommeil par date:', error);
    return [];
  }
};

export default {
  getSleepGoal,
  setSleepGoal,
  getSleepEntries,
  getSleepEntriesByDate,
  addSleepEntry,
  addSleepEntryFromHealthKit,
  getTodaySleep,
  getSleepStats,
  formatSleepDuration,
  getSleepAdvice,
  exportSleepToCSV,
  generateSleepShareText,
};

