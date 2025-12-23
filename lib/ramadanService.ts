// ============================================
// YOROI - SERVICE MODE RAMADAN
// ============================================
// Fonctionnalites speciales pour le mois sacre
// Pesee Suhoor/Iftar, hydratation nocturne, stats
// 100% Offline - AsyncStorage
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllMeasurements } from './storage';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type WeighingMoment = 'suhoor' | 'iftar' | 'normal';

export interface RamadanWeight {
  date: string; // YYYY-MM-DD
  suhoor?: number; // Poids avant Fajr
  iftar?: number; // Poids apres Iftar
  suhoorTime?: string; // Heure de la pesee
  iftarTime?: string;
}

export interface RamadanHydration {
  date: string;
  amount: number; // En litres
  startTime: string; // Debut (Iftar)
  endTime: string; // Fin (Fajr)
}

export interface RamadanSettings {
  enabled: boolean;
  startDate: string | null; // Premier jour du Ramadan
  endDate: string | null; // Dernier jour
  fajrTime: string; // Heure de Fajr (ex: "05:30")
  maghribTime: string; // Heure de Maghrib (ex: "19:45")
  hydrationGoal: number; // Objectif en litres
  silentNotifications: boolean; // Pas de notifs pendant le jeune
  preRamadanWeight: number | null; // Poids avant Ramadan
}

export interface RamadanStats {
  currentDay: number;
  totalDays: number;
  daysRemaining: number;
  preRamadanWeight: number | null;
  currentSuhoorWeight: number | null;
  currentIftarWeight: number | null;
  averageSuhoorWeight: number | null;
  averageIftarWeight: number | null;
  dailyVariation: number | null; // Difference moyenne Suhoor-Iftar
  totalWeightChange: number | null;
  averageNightHydration: number | null;
  weights: RamadanWeight[];
}

// ═══════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════

const RAMADAN_SETTINGS_KEY = '@yoroi_ramadan_settings';
const RAMADAN_WEIGHTS_KEY = '@yoroi_ramadan_weights';
const RAMADAN_HYDRATION_KEY = '@yoroi_ramadan_hydration';

// Dates du Ramadan 2025 (approximatives, basees sur le calendrier lunaire)
const RAMADAN_2025_START = '2025-02-28';
const RAMADAN_2025_END = '2025-03-29';

// Dates du Ramadan 2026
const RAMADAN_2026_START = '2026-02-17';
const RAMADAN_2026_END = '2026-03-18';

// ═══════════════════════════════════════════════
// HELPERS - DATES
// ═══════════════════════════════════════════════

/**
 * Obtient les dates du Ramadan pour l'annee en cours ou prochaine
 */
export const getRamadanDates = (year?: number): { start: string; end: string } => {
  const currentYear = year || new Date().getFullYear();

  if (currentYear === 2025) {
    return { start: RAMADAN_2025_START, end: RAMADAN_2025_END };
  } else if (currentYear === 2026) {
    return { start: RAMADAN_2026_START, end: RAMADAN_2026_END };
  }

  // Pour les autres annees, estimer (le Ramadan recule de ~11 jours par an)
  const baseYear = 2025;
  const daysDiff = (currentYear - baseYear) * 11;
  const baseStart = new Date(RAMADAN_2025_START);
  baseStart.setDate(baseStart.getDate() - daysDiff);

  const start = baseStart.toISOString().split('T')[0];
  const end = new Date(baseStart);
  end.setDate(end.getDate() + 29);

  return { start, end: end.toISOString().split('T')[0] };
};

/**
 * Verifie si on est actuellement pendant le Ramadan
 */
export const isRamadanPeriod = (): boolean => {
  const today = new Date().toISOString().split('T')[0];
  const { start, end } = getRamadanDates();
  return today >= start && today <= end;
};

/**
 * Calcule le jour actuel du Ramadan
 */
export const getCurrentRamadanDay = (startDate: string): number => {
  const start = new Date(startDate);
  const today = new Date();
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(30, diffDays + 1));
};

/**
 * Verifie si on est pendant les heures de jeune
 */
export const isDuringFastingHours = (fajrTime: string, maghribTime: string): boolean => {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Pendant le jeune si apres Fajr ET avant Maghrib
  return currentTime >= fajrTime && currentTime < maghribTime;
};

/**
 * Calcule le temps restant pour boire
 */
export const getHydrationTimeRemaining = (fajrTime: string): { hours: number; minutes: number } => {
  const now = new Date();
  const [fajrHour, fajrMin] = fajrTime.split(':').map(Number);

  const fajr = new Date();
  fajr.setHours(fajrHour, fajrMin, 0, 0);

  // Si Fajr est deja passe aujourd'hui, prendre demain
  if (now >= fajr) {
    fajr.setDate(fajr.getDate() + 1);
  }

  const diffMs = fajr.getTime() - now.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes };
};

/**
 * Suggere le moment de pesee actuel
 */
export const suggestWeighingMoment = (fajrTime: string, maghribTime: string): WeighingMoment => {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [fajrHour] = fajrTime.split(':').map(Number);
  const [maghribHour] = maghribTime.split(':').map(Number);

  // Entre minuit et Fajr+1h = Suhoor
  if (now.getHours() < fajrHour + 1) {
    return 'suhoor';
  }

  // Entre Maghrib et minuit = Iftar
  if (now.getHours() >= maghribHour) {
    return 'iftar';
  }

  return 'normal';
};

// ═══════════════════════════════════════════════
// GESTION DES PARAMETRES
// ═══════════════════════════════════════════════

/**
 * Obtient les parametres Ramadan
 */
export const getRamadanSettings = async (): Promise<RamadanSettings> => {
  try {
    const stored = await AsyncStorage.getItem(RAMADAN_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Erreur lecture settings Ramadan:', error);
  }

  const { start, end } = getRamadanDates();

  return {
    enabled: false,
    startDate: start,
    endDate: end,
    fajrTime: '05:30',
    maghribTime: '19:45',
    hydrationGoal: 3,
    silentNotifications: true,
    preRamadanWeight: null,
  };
};

/**
 * Sauvegarde les parametres Ramadan
 */
export const saveRamadanSettings = async (settings: Partial<RamadanSettings>): Promise<void> => {
  try {
    const current = await getRamadanSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(RAMADAN_SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Erreur sauvegarde settings Ramadan:', error);
  }
};

/**
 * Active ou desactive le mode Ramadan
 */
export const toggleRamadanMode = async (enabled: boolean): Promise<void> => {
  const settings = await getRamadanSettings();

  if (enabled && !settings.preRamadanWeight) {
    // Sauvegarder le poids actuel comme reference
    const measurements = await getAllMeasurements();
    if (measurements.length > 0) {
      const sorted = [...measurements].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      settings.preRamadanWeight = sorted[0].weight;
    }
  }

  await saveRamadanSettings({ ...settings, enabled });
};

// ═══════════════════════════════════════════════
// GESTION DES PESEES RAMADAN
// ═══════════════════════════════════════════════

/**
 * Obtient toutes les pesees Ramadan
 */
export const getRamadanWeights = async (): Promise<RamadanWeight[]> => {
  try {
    const stored = await AsyncStorage.getItem(RAMADAN_WEIGHTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Erreur lecture pesees Ramadan:', error);
  }
  return [];
};

/**
 * Ajoute une pesee Ramadan
 */
export const addRamadanWeight = async (
  weight: number,
  moment: WeighingMoment
): Promise<void> => {
  try {
    const weights = await getRamadanWeights();
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Chercher si on a deja une entree pour aujourd'hui
    const existingIndex = weights.findIndex(w => w.date === today);

    if (existingIndex >= 0) {
      // Mettre a jour l'entree existante
      if (moment === 'suhoor') {
        weights[existingIndex].suhoor = weight;
        weights[existingIndex].suhoorTime = currentTime;
      } else if (moment === 'iftar') {
        weights[existingIndex].iftar = weight;
        weights[existingIndex].iftarTime = currentTime;
      }
    } else {
      // Creer une nouvelle entree
      const newEntry: RamadanWeight = {
        date: today,
        ...(moment === 'suhoor' && { suhoor: weight, suhoorTime: currentTime }),
        ...(moment === 'iftar' && { iftar: weight, iftarTime: currentTime }),
      };
      weights.push(newEntry);
    }

    await AsyncStorage.setItem(RAMADAN_WEIGHTS_KEY, JSON.stringify(weights));
  } catch (error) {
    console.error('Erreur ajout pesee Ramadan:', error);
  }
};

// ═══════════════════════════════════════════════
// GESTION DE L'HYDRATATION RAMADAN
// ═══════════════════════════════════════════════

/**
 * Obtient l'hydratation de cette nuit
 */
export const getTonightHydration = async (): Promise<number> => {
  try {
    const stored = await AsyncStorage.getItem(RAMADAN_HYDRATION_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      const today = new Date().toISOString().split('T')[0];

      // Verifier si c'est la meme nuit (entre Iftar et Fajr)
      if (data.date === today) {
        return data.amount;
      }
    }
  } catch (error) {
    console.error('Erreur lecture hydratation:', error);
  }
  return 0;
};

/**
 * Ajoute de l'hydratation nocturne
 */
export const addRamadanHydration = async (liters: number): Promise<number> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const current = await getTonightHydration();
    const newAmount = Math.min(current + liters, 6); // Max 6L

    await AsyncStorage.setItem(RAMADAN_HYDRATION_KEY, JSON.stringify({
      date: today,
      amount: newAmount,
    }));

    return newAmount;
  } catch (error) {
    console.error('Erreur ajout hydratation:', error);
    return 0;
  }
};

/**
 * Obtient l'historique d'hydratation du Ramadan
 */
export const getRamadanHydrationHistory = async (): Promise<{ date: string; amount: number }[]> => {
  try {
    const key = '@yoroi_ramadan_hydration_history';
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Erreur lecture historique hydratation:', error);
  }
  return [];
};

// ═══════════════════════════════════════════════
// STATISTIQUES RAMADAN
// ═══════════════════════════════════════════════

/**
 * Calcule les statistiques Ramadan
 */
export const getRamadanStats = async (): Promise<RamadanStats> => {
  const settings = await getRamadanSettings();
  const weights = await getRamadanWeights();
  const hydrationHistory = await getRamadanHydrationHistory();

  const startDate = settings.startDate || getRamadanDates().start;
  const currentDay = getCurrentRamadanDay(startDate);
  const totalDays = 30;
  const daysRemaining = Math.max(0, totalDays - currentDay);

  // Poids Suhoor et Iftar
  const suhoorWeights = weights.filter(w => w.suhoor).map(w => w.suhoor!);
  const iftarWeights = weights.filter(w => w.iftar).map(w => w.iftar!);

  // Moyennes
  const averageSuhoorWeight = suhoorWeights.length > 0
    ? suhoorWeights.reduce((a, b) => a + b, 0) / suhoorWeights.length
    : null;

  const averageIftarWeight = iftarWeights.length > 0
    ? iftarWeights.reduce((a, b) => a + b, 0) / iftarWeights.length
    : null;

  // Variation journaliere moyenne (Iftar - Suhoor du meme jour)
  const dailyVariations: number[] = [];
  for (const w of weights) {
    if (w.suhoor && w.iftar) {
      dailyVariations.push(w.iftar - w.suhoor);
    }
  }
  const dailyVariation = dailyVariations.length > 0
    ? dailyVariations.reduce((a, b) => a + b, 0) / dailyVariations.length
    : null;

  // Derniers poids
  const sortedWeights = [...weights].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const latestWithSuhoor = sortedWeights.find(w => w.suhoor);
  const latestWithIftar = sortedWeights.find(w => w.iftar);

  // Evolution totale
  const totalWeightChange = settings.preRamadanWeight && latestWithSuhoor?.suhoor
    ? latestWithSuhoor.suhoor - settings.preRamadanWeight
    : null;

  // Hydratation moyenne
  const hydrationAmounts = hydrationHistory.map(h => h.amount);
  const averageNightHydration = hydrationAmounts.length > 0
    ? hydrationAmounts.reduce((a, b) => a + b, 0) / hydrationAmounts.length
    : null;

  return {
    currentDay,
    totalDays,
    daysRemaining,
    preRamadanWeight: settings.preRamadanWeight,
    currentSuhoorWeight: latestWithSuhoor?.suhoor || null,
    currentIftarWeight: latestWithIftar?.iftar || null,
    averageSuhoorWeight,
    averageIftarWeight,
    dailyVariation,
    totalWeightChange,
    averageNightHydration,
    weights,
  };
};

// ═══════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════

/**
 * Verifie si les notifications doivent etre silencieuses
 */
export const shouldMuteNotifications = async (): Promise<boolean> => {
  const settings = await getRamadanSettings();

  if (!settings.enabled || !settings.silentNotifications) {
    return false;
  }

  return isDuringFastingHours(settings.fajrTime, settings.maghribTime);
};

/**
 * Obtient le prochain moment de notification autorise
 */
export const getNextNotificationTime = async (): Promise<Date | null> => {
  const settings = await getRamadanSettings();

  if (!settings.enabled) {
    return null;
  }

  const [maghribHour, maghribMin] = settings.maghribTime.split(':').map(Number);
  const now = new Date();

  const maghrib = new Date();
  maghrib.setHours(maghribHour, maghribMin, 0, 0);

  // Si Maghrib est deja passe, prendre demain
  if (now >= maghrib) {
    maghrib.setDate(maghrib.getDate() + 1);
  }

  return maghrib;
};

// ═══════════════════════════════════════════════
// DETECTION AUTOMATIQUE
// ═══════════════════════════════════════════════

/**
 * Verifie si on devrait proposer d'activer le mode Ramadan
 */
export const shouldSuggestRamadanMode = async (): Promise<boolean> => {
  const settings = await getRamadanSettings();

  // Deja active ou deja refuse
  if (settings.enabled) {
    return false;
  }

  // Verifier si on est proche du Ramadan (7 jours avant ou pendant)
  const { start, end } = getRamadanDates();
  const today = new Date();
  const startDate = new Date(start);
  const endDate = new Date(end);

  // 7 jours avant le debut
  const suggestionStart = new Date(startDate);
  suggestionStart.setDate(suggestionStart.getDate() - 7);

  return today >= suggestionStart && today <= endDate;
};

/**
 * Marque que la suggestion a ete refusee
 */
export const dismissRamadanSuggestion = async (): Promise<void> => {
  const key = '@yoroi_ramadan_suggestion_dismissed';
  const year = new Date().getFullYear();
  await AsyncStorage.setItem(key, String(year));
};

/**
 * Verifie si la suggestion a ete refusee cette annee
 */
export const wasSuggestionDismissed = async (): Promise<boolean> => {
  try {
    const key = '@yoroi_ramadan_suggestion_dismissed';
    const stored = await AsyncStorage.getItem(key);
    const year = new Date().getFullYear();
    return stored === String(year);
  } catch {
    return false;
  }
};

// ═══════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════

export default {
  // Settings
  getRamadanSettings,
  saveRamadanSettings,
  toggleRamadanMode,

  // Weights
  getRamadanWeights,
  addRamadanWeight,

  // Hydration
  getTonightHydration,
  addRamadanHydration,
  getRamadanHydrationHistory,

  // Stats
  getRamadanStats,

  // Helpers
  getRamadanDates,
  isRamadanPeriod,
  getCurrentRamadanDay,
  isDuringFastingHours,
  getHydrationTimeRemaining,
  suggestWeighingMoment,

  // Notifications
  shouldMuteNotifications,
  getNextNotificationTime,

  // Detection
  shouldSuggestRamadanMode,
  dismissRamadanSuggestion,
  wasSuggestionDismissed,
};
