// ============================================
// YOROI - RECORDS PERSONNELS
// ============================================
// Suivi et celebration des accomplissements
// 100% Offline - AsyncStorage
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllMeasurements, getAllWorkouts, Measurement, Workout } from './storage';
import { getMeasurements } from './database';
import logger from '@/lib/security/logger';

// ============================================
// CLES DE STOCKAGE
// ============================================

const STORAGE_KEY_RECORDS = '@yoroi_personal_records';
const STORAGE_KEY_RECORDS_HISTORY = '@yoroi_records_history';

// ============================================
// TYPES
// ============================================

export interface PersonalRecords {
  // Poids
  lowestWeight: RecordEntry | null;
  startingWeight: RecordEntry | null;
  maxWeeklyLoss: RecordEntry | null;
  maxMonthlyLoss: RecordEntry | null;
  totalWeightLoss: number;

  // Streak
  longestStreak: RecordEntry | null;
  currentStreak: number;

  // Mensurations
  lowestWaist: RecordEntry | null;
  totalWaistLoss: number;

  // Entrainement
  maxWeeklyWorkouts: RecordEntry | null;
  totalWorkouts: number;
  favoriteSport: { type: string; count: number } | null;

  // Regularite
  bestMonthRegularity: RecordEntry | null;
  totalMeasurements: number;

  // Energie
  bestEnergyStreak: RecordEntry | null;

  // Meta
  lastUpdated: string;
}

export interface RecordEntry {
  value: number;
  date: string;
  label?: string;
}

export interface NewRecordEvent {
  type: RecordType;
  oldValue: number | null;
  newValue: number;
  date: string;
  message: string;
  emoji: string;
}

export type RecordType =
  | 'lowestWeight'
  | 'maxWeeklyLoss'
  | 'maxMonthlyLoss'
  | 'longestStreak'
  | 'lowestWaist'
  | 'maxWeeklyWorkouts'
  | 'bestMonthRegularity'
  | 'bestEnergyStreak';

// ============================================
// VALEURS PAR DEFAUT
// ============================================

const DEFAULT_RECORDS: PersonalRecords = {
  lowestWeight: null,
  startingWeight: null,
  maxWeeklyLoss: null,
  maxMonthlyLoss: null,
  totalWeightLoss: 0,
  longestStreak: null,
  currentStreak: 0,
  lowestWaist: null,
  totalWaistLoss: 0,
  maxWeeklyWorkouts: null,
  totalWorkouts: 0,
  favoriteSport: null,
  bestMonthRegularity: null,
  totalMeasurements: 0,
  bestEnergyStreak: null,
  lastUpdated: '',
};

// ============================================
// HELPERS
// ============================================

const getWeekNumber = (date: Date): string => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${date.getFullYear()}-W${weekNum}`;
};

const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const months = ['jan', 'fev', 'mar', 'avr', 'mai', 'juin', 'juil', 'aout', 'sept', 'oct', 'nov', 'dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatMonthYear = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sept', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(month) - 1]} ${year}`;
};

// ============================================
// CALCUL DES RECORDS
// ============================================

/**
 * Calculer tous les records a partir des donnees
 */
export const calculateAllRecords = async (): Promise<{
  records: PersonalRecords;
  newRecords: NewRecordEvent[];
}> => {
  const measurements = await getAllMeasurements();
  const workouts = await getAllWorkouts();
  const bodyMeasurements = await getMeasurements();
  const previousRecords = await getPersonalRecords();

  const newRecords: NewRecordEvent[] = [];

  // Trier par date croissante
  const sortedMeasurements = [...measurements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const records: PersonalRecords = { ...DEFAULT_RECORDS };
  records.lastUpdated = new Date().toISOString();
  records.totalMeasurements = measurements.length;
  records.totalWorkouts = workouts.length;

  if (sortedMeasurements.length === 0) {
    return { records, newRecords };
  }

  // === RECORDS POIDS ===

  // Poids de depart
  records.startingWeight = {
    value: sortedMeasurements[0].weight,
    date: sortedMeasurements[0].date,
  };

  // Poids le plus bas
  let lowestWeight = sortedMeasurements[0];
  sortedMeasurements.forEach(m => {
    if (m.weight < lowestWeight.weight) {
      lowestWeight = m;
    }
  });
  records.lowestWeight = {
    value: lowestWeight.weight,
    date: lowestWeight.date,
  };

  // Verifier nouveau record poids le plus bas
  if (previousRecords.lowestWeight && lowestWeight.weight < previousRecords.lowestWeight.value) {
    newRecords.push({
      type: 'lowestWeight',
      oldValue: previousRecords.lowestWeight.value,
      newValue: lowestWeight.weight,
      date: lowestWeight.date,
      message: `Nouveau poids record ! ${lowestWeight.weight.toFixed(1)} kg`,
      emoji: '📉',
    });
  }

  // Perte totale
  records.totalWeightLoss = records.startingWeight.value - records.lowestWeight.value;

  // Perte max en 1 semaine
  const weeklyChanges: Map<string, { start: number; end: number; loss: number; endDate: string }> = new Map();
  sortedMeasurements.forEach(m => {
    const weekKey = getWeekNumber(new Date(m.date));
    const existing = weeklyChanges.get(weekKey);
    if (!existing) {
      weeklyChanges.set(weekKey, { start: m.weight, end: m.weight, loss: 0, endDate: m.date });
    } else {
      existing.end = m.weight;
      existing.loss = existing.start - existing.end;
      existing.endDate = m.date;
    }
  });

  let maxWeeklyLoss = 0;
  let maxWeeklyLossDate = '';
  weeklyChanges.forEach((data, _week) => {
    if (data.loss > maxWeeklyLoss) {
      maxWeeklyLoss = data.loss;
      maxWeeklyLossDate = data.endDate;
    }
  });

  if (maxWeeklyLoss > 0) {
    records.maxWeeklyLoss = {
      value: maxWeeklyLoss,
      date: maxWeeklyLossDate,
    };

    if (previousRecords.maxWeeklyLoss && maxWeeklyLoss > previousRecords.maxWeeklyLoss.value) {
      newRecords.push({
        type: 'maxWeeklyLoss',
        oldValue: previousRecords.maxWeeklyLoss.value,
        newValue: maxWeeklyLoss,
        date: maxWeeklyLossDate,
        message: `Record ! -${maxWeeklyLoss.toFixed(1)} kg cette semaine`,
        emoji: '⚖️',
      });
    }
  }

  // Perte max en 1 mois
  const monthlyChanges: Map<string, { start: number; end: number; loss: number; endDate: string }> = new Map();
  sortedMeasurements.forEach(m => {
    const monthKey = getMonthKey(new Date(m.date));
    const existing = monthlyChanges.get(monthKey);
    if (!existing) {
      monthlyChanges.set(monthKey, { start: m.weight, end: m.weight, loss: 0, endDate: m.date });
    } else {
      existing.end = m.weight;
      existing.loss = existing.start - existing.end;
      existing.endDate = m.date;
    }
  });

  let maxMonthlyLoss = 0;
  let maxMonthlyLossDate = '';
  let maxMonthlyLossMonth = '';
  monthlyChanges.forEach((data, month) => {
    if (data.loss > maxMonthlyLoss) {
      maxMonthlyLoss = data.loss;
      maxMonthlyLossDate = data.endDate;
      maxMonthlyLossMonth = month;
    }
  });

  if (maxMonthlyLoss > 0) {
    records.maxMonthlyLoss = {
      value: maxMonthlyLoss,
      date: maxMonthlyLossDate,
      label: formatMonthYear(maxMonthlyLossMonth),
    };
  }

  // === RECORDS STREAK ===
  let currentStreak = 0;
  let longestStreak = 0;
  let longestStreakEndDate = '';

  // Calculer les streaks
  const uniqueDates = [...new Set(sortedMeasurements.map(m => m.date.split('T')[0]))].sort();

  let tempStreak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
        longestStreakEndDate = uniqueDates[i - 1];
      }
      tempStreak = 1;
    }
  }

  // Verifier dernier streak
  if (tempStreak > longestStreak) {
    longestStreak = tempStreak;
    longestStreakEndDate = uniqueDates[uniqueDates.length - 1];
  }

  // Streak actuel
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastMeasurementDate = new Date(uniqueDates[uniqueDates.length - 1]);
  lastMeasurementDate.setHours(0, 0, 0, 0);
  const daysSinceLast = Math.floor((today.getTime() - lastMeasurementDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLast <= 1) {
    currentStreak = 1;
    for (let i = uniqueDates.length - 2; i >= 0; i--) {
      const prevDate = new Date(uniqueDates[i]);
      const currDate = new Date(uniqueDates[i + 1]);
      const diff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  records.currentStreak = currentStreak;
  if (longestStreak > 0) {
    records.longestStreak = {
      value: longestStreak,
      date: longestStreakEndDate,
    };

    if (previousRecords.longestStreak && longestStreak > previousRecords.longestStreak.value) {
      newRecords.push({
        type: 'longestStreak',
        oldValue: previousRecords.longestStreak.value,
        newValue: longestStreak,
        date: longestStreakEndDate,
        message: `Nouveau record de streak ! ${longestStreak} jours`,
        emoji: '🔥',
      });
    }
  }

  // === RECORDS MENSURATIONS ===
  const waistMeasurements = bodyMeasurements.filter(m => m.waist && m.waist > 0);
  if (waistMeasurements.length > 0) {
    const sortedWaist = [...waistMeasurements].sort((a, b) => a.waist! - b.waist!);
    records.lowestWaist = {
      value: sortedWaist[0].waist!,
      date: sortedWaist[0].date,
    };

    const firstWaist = waistMeasurements.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )[0];
    records.totalWaistLoss = firstWaist.waist! - sortedWaist[0].waist!;

    if (previousRecords.lowestWaist && sortedWaist[0].waist! < previousRecords.lowestWaist.value) {
      newRecords.push({
        type: 'lowestWaist',
        oldValue: previousRecords.lowestWaist.value,
        newValue: sortedWaist[0].waist!,
        date: sortedWaist[0].date,
        message: `Record tour de taille ! ${sortedWaist[0].waist} cm`,
        emoji: '📏',
      });
    }
  }

  // === RECORDS ENTRAINEMENT ===
  if (workouts.length > 0) {
    // Max en 1 semaine
    const weeklyWorkouts: Map<string, { count: number; endDate: string }> = new Map();
    workouts.forEach(w => {
      const weekKey = getWeekNumber(new Date(w.date));
      const existing = weeklyWorkouts.get(weekKey);
      if (!existing) {
        weeklyWorkouts.set(weekKey, { count: 1, endDate: w.date });
      } else {
        existing.count++;
        if (new Date(w.date) > new Date(existing.endDate)) {
          existing.endDate = w.date;
        }
      }
    });

    let maxWeeklyWorkouts = 0;
    let maxWeeklyWorkoutsDate = '';
    weeklyWorkouts.forEach((data, _week) => {
      if (data.count > maxWeeklyWorkouts) {
        maxWeeklyWorkouts = data.count;
        maxWeeklyWorkoutsDate = data.endDate;
      }
    });

    if (maxWeeklyWorkouts > 0) {
      records.maxWeeklyWorkouts = {
        value: maxWeeklyWorkouts,
        date: maxWeeklyWorkoutsDate,
      };

      if (previousRecords.maxWeeklyWorkouts && maxWeeklyWorkouts > previousRecords.maxWeeklyWorkouts.value) {
        newRecords.push({
          type: 'maxWeeklyWorkouts',
          oldValue: previousRecords.maxWeeklyWorkouts.value,
          newValue: maxWeeklyWorkouts,
          date: maxWeeklyWorkoutsDate,
          message: `Record ! ${maxWeeklyWorkouts} entrainements cette semaine`,
          emoji: '💪',
        });
      }
    }

    // Sport prefere
    const sportCounts: Map<string, number> = new Map();
    workouts.forEach(w => {
      const count = sportCounts.get(w.type) || 0;
      sportCounts.set(w.type, count + 1);
    });

    let favoriteSport = '';
    let maxSportCount = 0;
    sportCounts.forEach((count, sport) => {
      if (count > maxSportCount) {
        maxSportCount = count;
        favoriteSport = sport;
      }
    });

    if (favoriteSport) {
      records.favoriteSport = {
        type: favoriteSport,
        count: maxSportCount,
      };
    }
  }

  // === RECORDS REGULARITE ===
  const monthlyMeasurements: Map<string, { count: number; daysInMonth: number }> = new Map();
  sortedMeasurements.forEach(m => {
    const date = new Date(m.date);
    const monthKey = getMonthKey(date);
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const existing = monthlyMeasurements.get(monthKey);
    if (!existing) {
      monthlyMeasurements.set(monthKey, { count: 1, daysInMonth });
    } else {
      existing.count++;
    }
  });

  let bestMonthRegularity = 0;
  let bestMonthKey = '';
  monthlyMeasurements.forEach((data, month) => {
    const regularity = (data.count / data.daysInMonth) * 100;
    if (regularity > bestMonthRegularity) {
      bestMonthRegularity = regularity;
      bestMonthKey = month;
    }
  });

  if (bestMonthKey) {
    records.bestMonthRegularity = {
      value: Math.round(bestMonthRegularity),
      date: bestMonthKey,
      label: formatMonthYear(bestMonthKey),
    };
  }

  // === RECORDS ENERGIE ===
  const energyMeasurements = sortedMeasurements.filter(m => m.energyLevel && m.energyLevel >= 4);
  if (energyMeasurements.length > 0) {
    // Calculer la plus longue serie de jours haute energie
    const energyDates = [...new Set(energyMeasurements.map(m => m.date.split('T')[0]))].sort();
    let maxEnergyStreak = 1;
    let tempEnergyStreak = 1;
    let maxEnergyStreakDate = energyDates[0];

    for (let i = 1; i < energyDates.length; i++) {
      const prevDate = new Date(energyDates[i - 1]);
      const currDate = new Date(energyDates[i]);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        tempEnergyStreak++;
        if (tempEnergyStreak > maxEnergyStreak) {
          maxEnergyStreak = tempEnergyStreak;
          maxEnergyStreakDate = energyDates[i];
        }
      } else {
        tempEnergyStreak = 1;
      }
    }

    if (maxEnergyStreak > 1) {
      records.bestEnergyStreak = {
        value: maxEnergyStreak,
        date: maxEnergyStreakDate,
      };
    }
  }

  // Sauvegarder les records
  await savePersonalRecords(records);

  return { records, newRecords };
};

// ============================================
// GESTION DU STOCKAGE
// ============================================

/**
 * Obtenir les records sauvegardes
 */
export const getPersonalRecords = async (): Promise<PersonalRecords> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_RECORDS);
    if (!data) return DEFAULT_RECORDS;
    return { ...DEFAULT_RECORDS, ...JSON.parse(data) };
  } catch (error) {
    logger.error('Erreur lecture records:', error);
    return DEFAULT_RECORDS;
  }
};

/**
 * Sauvegarder les records
 */
export const savePersonalRecords = async (records: PersonalRecords): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
  } catch (error) {
    logger.error('Erreur sauvegarde records:', error);
  }
};

/**
 * Ajouter un evenement de record a l'historique
 */
export const addRecordToHistory = async (event: NewRecordEvent): Promise<void> => {
  try {
    const history = await getRecordsHistory();
    history.unshift(event);
    // Garder seulement les 50 derniers
    const trimmed = history.slice(0, 50);
    await AsyncStorage.setItem(STORAGE_KEY_RECORDS_HISTORY, JSON.stringify(trimmed));
  } catch (error) {
    logger.error('Erreur ajout historique:', error);
  }
};

/**
 * Obtenir l'historique des records
 */
export const getRecordsHistory = async (): Promise<NewRecordEvent[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_RECORDS_HISTORY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    logger.error('Erreur lecture historique:', error);
    return [];
  }
};

// ============================================
// FORMATAGE POUR AFFICHAGE
// ============================================

/**
 * Formater une date de record
 */
export const formatRecordDate = (dateStr: string): string => {
  return formatDate(dateStr);
};

/**
 * Obtenir le nom lisible d'un sport
 */
export const getSportName = (type: string): string => {
  const names: Record<string, string> = {
    musculation: 'Musculation',
    jjb: 'JJB',
    running: 'Running',
    autre: 'Autre',
    basic_fit: 'Basic Fit',
    gracie_barra: 'Gracie Barra',
  };
  return names[type] || type;
};

/**
 * Generer le texte de partage pour un record
 */
export const generateRecordShareText = (type: RecordType, value: number): string => {
  const texts: Record<RecordType, string> = {
    lowestWeight: `J'ai atteint mon poids record de ${value.toFixed(1)} kg ! 📉`,
    maxWeeklyLoss: `J'ai battu mon record ! -${value.toFixed(1)} kg cette semaine 🏆`,
    maxMonthlyLoss: `Record du mois ! -${value.toFixed(1)} kg de perdus 📉`,
    longestStreak: `Nouveau record de streak ! ${value} jours consecutifs 🔥`,
    lowestWaist: `Record tour de taille ! ${value} cm atteints 📏`,
    maxWeeklyWorkouts: `${value} entrainements cette semaine ! Nouveau record 💪`,
    bestMonthRegularity: `${value}% de regularite ce mois-ci ! 📅`,
    bestEnergyStreak: `${value} jours d'energie au top ! 🔥`,
  };
  return texts[type] + '\n\n#Yoroi #Transformation #Record';
};

// ============================================
// EXPORT
// ============================================

export default {
  calculateAllRecords,
  getPersonalRecords,
  savePersonalRecords,
  addRecordToHistory,
  getRecordsHistory,
  formatRecordDate,
  getSportName,
  generateRecordShareText,
};
