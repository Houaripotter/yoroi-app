// ============================================
// YOROI - RAPPELS INTELLIGENTS
// ============================================
// Analyse les habitudes et adapte les rappels
// 100% Offline - AsyncStorage
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getAllMeasurements, getAllWorkouts, Measurement } from './storage';
import logger from '@/lib/security/logger';

// ============================================
// CLES DE STOCKAGE
// ============================================

const STORAGE_KEY_SMART_REMINDERS = '@yoroi_smart_reminders_settings';
const STORAGE_KEY_HABITS = '@yoroi_detected_habits';
const STORAGE_KEY_LAST_ANALYSIS = '@yoroi_last_habits_analysis';

// ============================================
// TYPES
// ============================================

export interface SmartReminderSettings {
  weightReminder: boolean;
  trainingReminder: boolean;
  hydrationReminder: boolean;
  measurementsReminder: boolean;
  streakProtection: boolean;
  hydrationIntervalHours: number;
}

export interface DetectedHabits {
  avgWeighTime: string | null; // Format "HH:MM"
  weighDays: number[]; // 0-6 (dimanche-samedi)
  trainingDays: number[]; // 0-6
  avgTrainingTime: string | null;
  avgAppOpenTime: string | null;
  lastWeighDate: string | null;
  lastMeasurementDate: string | null;
  currentStreak: number;
  lastAnalysis: string;
}

export interface ReminderMessage {
  type: 'weight' | 'training' | 'hydration' | 'measurements' | 'streak';
  title: string;
  body: string;
  emoji: string;
}

// ============================================
// VALEURS PAR DEFAUT
// ============================================

// TOUT DÉSACTIVÉ PAR DÉFAUT - l'utilisateur doit activer manuellement
export const DEFAULT_SETTINGS: SmartReminderSettings = {
  weightReminder: false,
  trainingReminder: false,
  hydrationReminder: false,
  measurementsReminder: false,
  streakProtection: false,
  hydrationIntervalHours: 2,
};

export const DEFAULT_HABITS: DetectedHabits = {
  avgWeighTime: null,
  weighDays: [],
  trainingDays: [],
  avgTrainingTime: null,
  avgAppOpenTime: null,
  lastWeighDate: null,
  lastMeasurementDate: null,
  currentStreak: 0,
  lastAnalysis: '',
};

// ============================================
// HELPERS
// ============================================

/**
 * Convertir une date en minutes depuis minuit
 */
const dateToMinutes = (date: Date): number => {
  return date.getHours() * 60 + date.getMinutes();
};

/**
 * Convertir des minutes en format HH:MM
 */
const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Calculer la moyenne des minutes
 */
const averageMinutes = (times: number[]): number => {
  if (times.length === 0) return 0;
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length);
};

/**
 * Trouver les jours les plus frequents
 */
const getMostFrequentDays = (days: number[], threshold: number = 0.3): number[] => {
  const counts: Record<number, number> = {};
  days.forEach(day => {
    counts[day] = (counts[day] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(counts));
  const minRequired = Math.max(2, Math.floor(maxCount * threshold));

  return Object.entries(counts)
    .filter(([_, count]) => count >= minRequired)
    .map(([day, _]) => parseInt(day))
    .sort((a, b) => a - b);
};

/**
 * Nom du jour
 */
const getDayName = (day: number): string => {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return days[day];
};

/**
 * Calculer le streak actuel
 */
const calculateStreak = (measurements: Measurement[]): number => {
  if (measurements.length === 0) return 0;

  const sorted = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const uniqueDates = [...new Set(sorted.map(m => m.date.split('T')[0]))];

  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDate = new Date(uniqueDates[0]);
  firstDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    currentStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return currentStreak;
};

// ============================================
// ANALYSE DES HABITUDES
// ============================================

/**
 * Analyser les habitudes de l'utilisateur
 */
export const analyzeHabits = async (): Promise<DetectedHabits> => {
  try {
    const measurements = await getAllMeasurements();
    const workouts = await getAllWorkouts();

    // Analyser les pesees
    const weighTimes: number[] = [];
    const weighDaysSet: Set<number> = new Set();
    let lastWeighDate: string | null = null;
    let lastMeasurementDate: string | null = null;

    // Prendre les 30 derniers jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    measurements.forEach(m => {
      const date = new Date(m.date);
      if (date >= thirtyDaysAgo) {
        weighTimes.push(dateToMinutes(date));
        weighDaysSet.add(date.getDay());
      }

      // Derniere pesee
      if (!lastWeighDate || new Date(m.date) > new Date(lastWeighDate)) {
        lastWeighDate = m.date;
      }

      // Derniere mensuration
      if (m.measurements && Object.keys(m.measurements).length > 0) {
        if (!lastMeasurementDate || new Date(m.date) > new Date(lastMeasurementDate)) {
          lastMeasurementDate = m.date;
        }
      }
    });

    // Analyser les entrainements
    const trainingTimes: number[] = [];
    const trainingDaysSet: Set<number> = new Set();

    workouts.forEach(w => {
      const date = new Date(w.date);
      if (date >= thirtyDaysAgo) {
        trainingTimes.push(dateToMinutes(date));
        trainingDaysSet.add(date.getDay());
      }
    });

    // Calculer les moyennes et jours frequents
    const avgWeighMinutes = weighTimes.length >= 3 ? averageMinutes(weighTimes) : null;
    const avgTrainingMinutes = trainingTimes.length >= 3 ? averageMinutes(trainingTimes) : null;

    const habits: DetectedHabits = {
      avgWeighTime: avgWeighMinutes !== null ? minutesToTime(avgWeighMinutes) : null,
      weighDays: getMostFrequentDays(Array.from(weighDaysSet)),
      trainingDays: getMostFrequentDays(Array.from(trainingDaysSet)),
      avgTrainingTime: avgTrainingMinutes !== null ? minutesToTime(avgTrainingMinutes) : null,
      avgAppOpenTime: null, // Pourrait etre implemente plus tard
      lastWeighDate,
      lastMeasurementDate,
      currentStreak: calculateStreak(measurements),
      lastAnalysis: new Date().toISOString(),
    };

    // Sauvegarder les habitudes detectees
    await AsyncStorage.setItem(STORAGE_KEY_HABITS, JSON.stringify(habits));
    await AsyncStorage.setItem(STORAGE_KEY_LAST_ANALYSIS, new Date().toISOString());

    return habits;
  } catch (error) {
    logger.error('Erreur analyse habitudes:', error);
    return DEFAULT_HABITS;
  }
};

/**
 * Obtenir les habitudes detectees (depuis le cache ou analyse)
 */
export const getDetectedHabits = async (forceRefresh: boolean = false): Promise<DetectedHabits> => {
  try {
    // Verifier si on doit re-analyser (1 fois par semaine)
    const lastAnalysis = await AsyncStorage.getItem(STORAGE_KEY_LAST_ANALYSIS);
    const needsRefresh = forceRefresh || !lastAnalysis ||
      (new Date().getTime() - new Date(lastAnalysis).getTime()) > 7 * 24 * 60 * 60 * 1000;

    if (needsRefresh) {
      return await analyzeHabits();
    }

    const cached = await AsyncStorage.getItem(STORAGE_KEY_HABITS);
    if (cached) {
      return JSON.parse(cached);
    }

    return await analyzeHabits();
  } catch (error) {
    logger.error('Erreur lecture habitudes:', error);
    return DEFAULT_HABITS;
  }
};

// ============================================
// GESTION DES SETTINGS
// ============================================

/**
 * Obtenir les parametres de rappels
 */
export const getSmartReminderSettings = async (): Promise<SmartReminderSettings> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_SMART_REMINDERS);
    if (!data) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch (error) {
    logger.error('Erreur lecture settings rappels:', error);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Sauvegarder les parametres de rappels
 */
export const saveSmartReminderSettings = async (settings: Partial<SmartReminderSettings>): Promise<void> => {
  try {
    const current = await getSmartReminderSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(STORAGE_KEY_SMART_REMINDERS, JSON.stringify(updated));
  } catch (error) {
    logger.error('Erreur sauvegarde settings rappels:', error);
  }
};

// ============================================
// GENERATION DES MESSAGES
// ============================================

/**
 * Generer un message de rappel pesee
 */
export const generateWeightReminderMessage = (habits: DetectedHabits): ReminderMessage => {
  const now = new Date();
  const currentTime = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

  if (habits.avgWeighTime) {
    return {
      type: 'weight',
      title: 'Pesee du matin',
      body: `Tu te peses habituellement vers ${habits.avgWeighTime}. Il est ${currentTime}, c'est le moment !`,
      emoji: '⚖️',
    };
  }

  return {
    type: 'weight',
    title: 'Pesee du matin',
    body: 'N\'oublie pas ta pesee quotidienne !',
    emoji: '⚖️',
  };
};

/**
 * Generer un message de rappel entrainement
 */
export const generateTrainingReminderMessage = (habits: DetectedHabits): ReminderMessage => {
  const now = new Date();
  const dayName = getDayName(now.getDay());

  if (habits.trainingDays.includes(now.getDay())) {
    const timeStr = habits.avgTrainingTime || '18h';
    return {
      type: 'training',
      title: 'Entrainement',
      body: `Tu t'entraines souvent le ${dayName}. C'est l'heure de se bouger !`,
      emoji: '',
    };
  }

  return {
    type: 'training',
    title: 'Entrainement',
    body: 'C\'est le moment de s\'entrainer !',
    emoji: '',
  };
};

/**
 * Generer un message de rappel hydratation
 */
export const generateHydrationReminderMessage = (hoursSinceLastDrink: number = 2): ReminderMessage => {
  return {
    type: 'hydration',
    title: 'Hydratation',
    body: `Tu n'as rien bu depuis ${hoursSinceLastDrink}h. Une petite gorgee ?`,
    emoji: '💧',
  };
};

/**
 * Generer un message de rappel mensurations
 */
export const generateMeasurementsReminderMessage = (habits: DetectedHabits): ReminderMessage => {
  let daysSinceLast = 0;

  if (habits.lastMeasurementDate) {
    const lastDate = new Date(habits.lastMeasurementDate);
    const now = new Date();
    daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (daysSinceLast >= 7) {
    return {
      type: 'measurements',
      title: 'Mensurations',
      body: `Ca fait ${daysSinceLast} jours que tu n'as pas mesure ton tour de taille.`,
      emoji: '📏',
    };
  }

  return {
    type: 'measurements',
    title: 'Mensurations',
    body: 'Pense a prendre tes mensurations cette semaine !',
    emoji: '📏',
  };
};

/**
 * Generer un message de protection streak
 */
export const generateStreakProtectionMessage = (habits: DetectedHabits): ReminderMessage => {
  return {
    type: 'streak',
    title: 'Streak en danger !',
    body: `Attention ! Tu n'as pas ouvert Yoroi aujourd'hui. Ton streak de ${habits.currentStreak} jours est en danger !`,
    emoji: '',
  };
};

// ============================================
// FORMATAGE POUR AFFICHAGE
// ============================================

/**
 * Formater les jours d'entrainement detectes
 */
export const formatTrainingDays = (days: number[]): string => {
  if (days.length === 0) return 'Non detecte';
  return days.map(d => getDayName(d)).join(', ');
};

/**
 * Formater l'heure de pesee detectee
 */
export const formatWeighTime = (time: string | null): string => {
  if (!time) return 'Non detecte';
  return `Vers ${time}`;
};

/**
 * Verifier si c'est un jour d'entrainement
 */
export const isTrainingDay = (habits: DetectedHabits): boolean => {
  const today = new Date().getDay();
  return habits.trainingDays.includes(today);
};

/**
 * Verifier si c'est l'heure de la pesee
 */
export const isWeighTime = (habits: DetectedHabits, toleranceMinutes: number = 30): boolean => {
  if (!habits.avgWeighTime) return false;

  const now = new Date();
  const currentMinutes = dateToMinutes(now);

  const [hours, mins] = habits.avgWeighTime.split(':').map(Number);
  const targetMinutes = hours * 60 + mins;

  return Math.abs(currentMinutes - targetMinutes) <= toleranceMinutes;
};

/**
 * Jours depuis la derniere pesee
 */
export const daysSinceLastWeigh = (habits: DetectedHabits): number => {
  if (!habits.lastWeighDate) return -1;

  const lastDate = new Date(habits.lastWeighDate);
  const now = new Date();
  return Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Jours depuis les dernieres mensurations
 */
export const daysSinceLastMeasurements = (habits: DetectedHabits): number => {
  if (!habits.lastMeasurementDate) return -1;

  const lastDate = new Date(habits.lastMeasurementDate);
  const now = new Date();
  return Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
};

// ============================================
// NOTIFICATIONS (si permissions accordees)
// ============================================

/**
 * Programmer une notification de rappel
 */
export const scheduleSmartNotification = async (
  message: ReminderMessage,
  triggerDate: Date
): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') return null;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    // Calculer le delai en secondes
    const now = new Date();
    const seconds = Math.max(1, Math.floor((triggerDate.getTime() - now.getTime()) / 1000));

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${message.emoji} ${message.title}`,
        body: message.body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });

    return identifier;
  } catch (error) {
    logger.error('Erreur programmation notification:', error);
    return null;
  }
};

/**
 * Annuler toutes les notifications programmees
 */
export const cancelAllSmartNotifications = async (): Promise<void> => {
  try {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    logger.error('Erreur annulation notifications:', error);
  }
};

// ============================================
// EXPORT PAR DEFAUT
// ============================================

export default {
  analyzeHabits,
  getDetectedHabits,
  getSmartReminderSettings,
  saveSmartReminderSettings,
  generateWeightReminderMessage,
  generateTrainingReminderMessage,
  generateHydrationReminderMessage,
  generateMeasurementsReminderMessage,
  generateStreakProtectionMessage,
  formatTrainingDays,
  formatWeighTime,
  isTrainingDay,
  isWeighTime,
  daysSinceLastWeigh,
  daysSinceLastMeasurements,
  scheduleSmartNotification,
  cancelAllSmartNotifications,
};
