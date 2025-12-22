// ============================================
// YOROI - SYSTEME DE JEUNE UNIVERSEL
// ============================================
// Supporte tous les types de jeune :
// - Intermittent (16:8, 18:6, 20:4, OMAD)
// - Religieux (Ramadan, Careme)
// - Avance (Eat Stop Eat, Prolonge)
// - Personnalise
// 100% Offline - AsyncStorage
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// CLES DE STOCKAGE
// ============================================

const STORAGE_KEYS = {
  ACTIVE_MODE: '@yoroi_fasting_active_mode',
  FASTING_START: '@yoroi_fasting_start_time',
  FASTING_HISTORY: '@yoroi_fasting_history',
  FASTING_STREAK: '@yoroi_fasting_streak',
  CUSTOM_SETTINGS: '@yoroi_fasting_custom',
  RAMADAN_SETTINGS: '@yoroi_fasting_ramadan',
  LAST_COMPLETED_DATE: '@yoroi_fasting_last_completed',
};

// ============================================
// TYPES
// ============================================

export type FastingCategory = 'intermittent' | 'religious' | 'advanced' | 'custom';

export interface FastingMode {
  id: string;
  name: string;
  icon: string;
  category: FastingCategory;
  fastingHours: number | null;
  eatingHours: number | null;
  description: string;
  special?: 'sunrise_sunset' | 'lent' | 'weekly';
  warning?: boolean;
}

export interface FastingSession {
  id: string;
  date: string;
  modeId: string;
  startTime: string;
  endTime: string | null;
  targetDuration: number; // en minutes
  actualDuration: number | null; // en minutes
  completed: boolean;
  notes?: string;
}

export interface FastingState {
  isActive: boolean;
  modeId: string | null;
  startTime: string | null;
  targetEndTime: string | null;
  phase: 'fasting' | 'eating' | 'idle';
}

export interface FastingStats {
  totalCompleted: number;
  totalHoursFasted: number;
  currentStreak: number;
  longestStreak: number;
  thisMonthCompleted: number;
  thisMonthTarget: number;
  avgFastingDuration: number;
}

export interface CustomFastingSettings {
  startTime: string; // HH:MM
  durationHours: number;
  activeDays: number[]; // 0-6 (dimanche-samedi)
}

export interface RamadanSettings {
  city: string;
  country: string;
  fajrTime: string; // HH:MM
  maghribTime: string; // HH:MM
  useManualTimes: boolean;
}

// ============================================
// MODES DE JEUNE DISPONIBLES
// ============================================

export const FASTING_MODES: FastingMode[] = [
  // INTERMITTENT
  {
    id: '12_12',
    name: 'Intermittent 12:12',
    icon: 'Clock',
    category: 'intermittent',
    fastingHours: 12,
    eatingHours: 12,
    description: 'Pour debuter. 12h de jeune, 12h pour manger.',
  },
  {
    id: '14_10',
    name: 'Intermittent 14:10',
    icon: 'Clock',
    category: 'intermittent',
    fastingHours: 14,
    eatingHours: 10,
    description: 'Progression douce. 14h de jeune, 10h pour manger.',
  },
  {
    id: '16_8',
    name: 'Intermittent 16:8',
    icon: 'Clock',
    category: 'intermittent',
    fastingHours: 16,
    eatingHours: 8,
    description: 'Le plus populaire. 16h de jeune, 8h pour manger.',
  },
  {
    id: '18_6',
    name: 'Intermittent 18:6',
    icon: 'Clock',
    category: 'intermittent',
    fastingHours: 18,
    eatingHours: 6,
    description: 'Plus intense. 18h de jeune, 6h pour manger.',
  },
  {
    id: '20_4',
    name: 'Warrior Diet 20:4',
    icon: 'Swords',
    category: 'intermittent',
    fastingHours: 20,
    eatingHours: 4,
    description: 'Le regime du guerrier. 20h de jeune, 4h pour manger.',
  },
  {
    id: 'omad',
    name: 'OMAD',
    icon: 'Utensils',
    category: 'intermittent',
    fastingHours: 23,
    eatingHours: 1,
    description: 'One Meal A Day. Un seul repas par jour.',
  },

  // RELIGIEUX
  {
    id: 'ramadan',
    name: 'Ramadan',
    icon: 'Moon',
    category: 'religious',
    fastingHours: null,
    eatingHours: null,
    description: "Jeune de l'aube au coucher du soleil.",
    special: 'sunrise_sunset',
  },
  {
    id: 'yom_kippur',
    name: 'Yom Kippur',
    icon: 'Star',
    category: 'religious',
    fastingHours: 25,
    eatingHours: 0,
    description: 'Grand Pardon. Jeune de 25h.',
  },
  {
    id: 'careme',
    name: 'Careme',
    icon: 'Cross',
    category: 'religious',
    fastingHours: null,
    eatingHours: null,
    description: '40 jours avant Paques. Abstinence ou jeune partiel.',
    special: 'lent',
  },

  // AVANCE
  {
    id: 'eat_stop_eat',
    name: 'Eat Stop Eat',
    icon: 'RefreshCw',
    category: 'advanced',
    fastingHours: 24,
    eatingHours: 0,
    description: 'Jeune de 24h, 1-2 fois par semaine.',
    special: 'weekly',
  },
  {
    id: 'prolonged_36',
    name: 'Jeune 36h',
    icon: 'Droplets',
    category: 'advanced',
    fastingHours: 36,
    eatingHours: 0,
    description: '36h de jeune. Pour les habitues.',
    warning: true,
  },
  {
    id: 'prolonged_48',
    name: 'Jeune 48h',
    icon: 'Droplets',
    category: 'advanced',
    fastingHours: 48,
    eatingHours: 0,
    description: '48h de jeune. Uniquement pour les experimentes.',
    warning: true,
  },
  {
    id: 'prolonged_72',
    name: 'Jeune 72h',
    icon: 'Droplets',
    category: 'advanced',
    fastingHours: 72,
    eatingHours: 0,
    description: '72h de jeune. Supervision medicale recommandee.',
    warning: true,
  },

  // PERSONNALISE
  {
    id: 'custom',
    name: 'Personnalise',
    icon: 'Settings',
    category: 'custom',
    fastingHours: null,
    eatingHours: null,
    description: 'Definis tes propres horaires.',
  },
];

// ============================================
// HELPERS
// ============================================

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Parser une heure HH:MM en minutes depuis minuit
 */
const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Formater des minutes en HH:MM
 */
const formatMinutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Calculer la duree entre deux dates en minutes
 */
const getDurationInMinutes = (start: Date, end: Date): number => {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
};

/**
 * Formater une duree en heures et minutes
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
};

/**
 * Formater un compte a rebours HH:MM:SS
 */
export const formatCountdown = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Obtenir un mode par son ID
 */
export const getFastingMode = (id: string): FastingMode | undefined => {
  return FASTING_MODES.find(m => m.id === id);
};

// ============================================
// GESTION DU JEUNE ACTIF
// ============================================

/**
 * Obtenir l'etat actuel du jeune
 */
export const getFastingState = async (): Promise<FastingState> => {
  try {
    const [modeId, startTimeStr] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_MODE),
      AsyncStorage.getItem(STORAGE_KEYS.FASTING_START),
    ]);

    if (!modeId || !startTimeStr) {
      return {
        isActive: false,
        modeId: null,
        startTime: null,
        targetEndTime: null,
        phase: 'idle',
      };
    }

    const mode = getFastingMode(modeId);
    if (!mode) {
      return {
        isActive: false,
        modeId: null,
        startTime: null,
        targetEndTime: null,
        phase: 'idle',
      };
    }

    const startTime = new Date(startTimeStr);
    const now = new Date();
    let targetEndTime: Date | null = null;
    let phase: 'fasting' | 'eating' | 'idle' = 'fasting';

    // Calculer la fin du jeune
    if (mode.fastingHours) {
      targetEndTime = new Date(startTime.getTime() + mode.fastingHours * 60 * 60 * 1000);

      // Verifier si on est en phase de jeune ou d'alimentation
      if (now >= targetEndTime) {
        if (mode.eatingHours && mode.eatingHours > 0) {
          const eatingEndTime = new Date(targetEndTime.getTime() + mode.eatingHours * 60 * 60 * 1000);
          if (now < eatingEndTime) {
            phase = 'eating';
          } else {
            // Le cycle est termine, reset automatique pour le prochain
            phase = 'idle';
          }
        } else {
          phase = 'idle';
        }
      }
    } else if (modeId === 'ramadan') {
      // Mode Ramadan : recuperer les horaires
      const ramadanSettings = await getRamadanSettings();
      if (ramadanSettings) {
        const today = new Date();
        const maghribMinutes = parseTimeToMinutes(ramadanSettings.maghribTime);
        targetEndTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(),
          Math.floor(maghribMinutes / 60), maghribMinutes % 60);

        if (now >= targetEndTime) {
          phase = 'eating';
        }
      }
    } else if (modeId === 'custom') {
      // Mode personnalise
      const customSettings = await getCustomFastingSettings();
      if (customSettings) {
        targetEndTime = new Date(startTime.getTime() + customSettings.durationHours * 60 * 60 * 1000);
        if (now >= targetEndTime) {
          phase = 'eating';
        }
      }
    }

    return {
      isActive: true,
      modeId,
      startTime: startTimeStr,
      targetEndTime: targetEndTime?.toISOString() || null,
      phase,
    };
  } catch (error) {
    console.error('Erreur getFastingState:', error);
    return {
      isActive: false,
      modeId: null,
      startTime: null,
      targetEndTime: null,
      phase: 'idle',
    };
  }
};

/**
 * Demarrer un jeune
 */
export const startFasting = async (
  modeId: string,
  customStartTime?: Date
): Promise<boolean> => {
  try {
    const startTime = customStartTime || new Date();

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_MODE, modeId),
      AsyncStorage.setItem(STORAGE_KEYS.FASTING_START, startTime.toISOString()),
    ]);

    console.log('Jeune demarre:', modeId);
    return true;
  } catch (error) {
    console.error('Erreur startFasting:', error);
    return false;
  }
};

/**
 * Arreter le jeune (avec option de completion)
 */
export const stopFasting = async (completed: boolean = false): Promise<boolean> => {
  try {
    const state = await getFastingState();

    if (state.isActive && state.modeId && state.startTime) {
      const mode = getFastingMode(state.modeId);
      const startTime = new Date(state.startTime);
      const endTime = new Date();
      const duration = getDurationInMinutes(startTime, endTime);

      // Ajouter a l'historique
      const session: FastingSession = {
        id: generateId(),
        date: startTime.toISOString().split('T')[0],
        modeId: state.modeId,
        startTime: state.startTime,
        endTime: endTime.toISOString(),
        targetDuration: mode?.fastingHours ? mode.fastingHours * 60 : duration,
        actualDuration: duration,
        completed,
      };

      await addFastingSession(session);

      // Mettre a jour le streak si complete
      if (completed) {
        await updateFastingStreak(true);
      }
    }

    // Reset
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_MODE),
      AsyncStorage.removeItem(STORAGE_KEYS.FASTING_START),
    ]);

    console.log('Jeune arrete, complete:', completed);
    return true;
  } catch (error) {
    console.error('Erreur stopFasting:', error);
    return false;
  }
};

/**
 * Marquer le jeune comme complete (quand le timer atteint 0)
 */
export const completeFasting = async (): Promise<boolean> => {
  return await stopFasting(true);
};

// ============================================
// HISTORIQUE ET STATISTIQUES
// ============================================

/**
 * Ajouter une session a l'historique
 */
const addFastingSession = async (session: FastingSession): Promise<void> => {
  try {
    const history = await getFastingHistory();
    history.unshift(session);
    // Garder les 365 dernieres sessions
    const trimmed = history.slice(0, 365);
    await AsyncStorage.setItem(STORAGE_KEYS.FASTING_HISTORY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Erreur addFastingSession:', error);
  }
};

/**
 * Obtenir l'historique des jeunes
 */
export const getFastingHistory = async (): Promise<FastingSession[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FASTING_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erreur getFastingHistory:', error);
    return [];
  }
};

/**
 * Obtenir les statistiques de jeune
 */
export const getFastingStats = async (): Promise<FastingStats> => {
  try {
    const history = await getFastingHistory();
    const streak = await getFastingStreak();

    const completedSessions = history.filter(s => s.completed);
    const totalCompleted = completedSessions.length;

    // Heures totales jeunees
    const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);
    const totalHoursFasted = Math.round(totalMinutes / 60);

    // Ce mois-ci
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthSessions = completedSessions.filter(
      s => new Date(s.date) >= thisMonthStart
    );
    const thisMonthCompleted = thisMonthSessions.length;

    // Calculer le nombre de jours dans le mois pour l'objectif
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const thisMonthTarget = daysPassed; // Objectif = 1 jeune par jour passe

    // Duree moyenne
    const avgFastingDuration = totalCompleted > 0
      ? Math.round(totalMinutes / totalCompleted)
      : 0;

    // Plus long streak
    let longestStreak = 0;
    let tempStreak = 0;
    const sortedDates = [...new Set(completedSessions.map(s => s.date))].sort();

    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    return {
      totalCompleted,
      totalHoursFasted,
      currentStreak: streak,
      longestStreak,
      thisMonthCompleted,
      thisMonthTarget,
      avgFastingDuration,
    };
  } catch (error) {
    console.error('Erreur getFastingStats:', error);
    return {
      totalCompleted: 0,
      totalHoursFasted: 0,
      currentStreak: 0,
      longestStreak: 0,
      thisMonthCompleted: 0,
      thisMonthTarget: 0,
      avgFastingDuration: 0,
    };
  }
};

// ============================================
// GESTION DU STREAK
// ============================================

/**
 * Obtenir le streak actuel
 */
export const getFastingStreak = async (): Promise<number> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FASTING_STREAK);
    return data ? parseInt(data, 10) : 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Mettre a jour le streak
 */
const updateFastingStreak = async (completed: boolean): Promise<void> => {
  try {
    const lastCompletedStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_COMPLETED_DATE);
    const today = new Date().toISOString().split('T')[0];

    if (completed) {
      let newStreak = 1;

      if (lastCompletedStr) {
        const lastDate = new Date(lastCompletedStr);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Jour consecutif
          const currentStreak = await getFastingStreak();
          newStreak = currentStreak + 1;
        } else if (diffDays === 0) {
          // Meme jour, garder le streak
          newStreak = await getFastingStreak();
        }
        // Si > 1, reset a 1
      }

      await AsyncStorage.setItem(STORAGE_KEYS.FASTING_STREAK, newStreak.toString());
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_COMPLETED_DATE, today);
    }
  } catch (error) {
    console.error('Erreur updateFastingStreak:', error);
  }
};

// ============================================
// PARAMETRES PERSONNALISES
// ============================================

/**
 * Obtenir les parametres de jeune personnalise
 */
export const getCustomFastingSettings = async (): Promise<CustomFastingSettings | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Sauvegarder les parametres personnalises
 */
export const saveCustomFastingSettings = async (settings: CustomFastingSettings): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Erreur saveCustomFastingSettings:', error);
    return false;
  }
};

// ============================================
// PARAMETRES RAMADAN
// ============================================

/**
 * Obtenir les parametres Ramadan
 */
export const getRamadanSettings = async (): Promise<RamadanSettings | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RAMADAN_SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Sauvegarder les parametres Ramadan
 */
export const saveRamadanSettings = async (settings: RamadanSettings): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.RAMADAN_SETTINGS, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.error('Erreur saveRamadanSettings:', error);
    return false;
  }
};

/**
 * Calculer les horaires approximatifs pour le Ramadan
 * Formule simplifiee basee sur la latitude et la date
 * Note: Pour une precision optimale, l'utilisateur devrait entrer ses horaires
 */
export const calculateApproximatePrayerTimes = (
  latitude: number,
  date: Date = new Date()
): { fajr: string; maghrib: string } => {
  // Formule simplifiee - approximation
  // En realite, les calculs sont plus complexes et dependent de la methode de calcul

  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

  // Declination solaire approximative
  const declination = -23.45 * Math.cos((360 / 365) * (dayOfYear + 10) * Math.PI / 180);

  // Angle horaire pour Fajr (18 degres sous l'horizon)
  const fajrAngle = 18;
  const maghribAngle = 0.833; // Lever/coucher du soleil

  const latRad = latitude * Math.PI / 180;
  const decRad = declination * Math.PI / 180;

  // Calcul simplifie
  const cosHourAngleFajr = (Math.sin(-fajrAngle * Math.PI / 180) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));

  const cosHourAngleMaghrib = (Math.sin(-maghribAngle * Math.PI / 180) - Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));

  // Heures
  const solarNoon = 12; // Midi solaire (simplifie)

  let fajrHour = solarNoon - (Math.acos(Math.max(-1, Math.min(1, cosHourAngleFajr))) * 180 / Math.PI) / 15;
  let maghribHour = solarNoon + (Math.acos(Math.max(-1, Math.min(1, cosHourAngleMaghrib))) * 180 / Math.PI) / 15;

  // Ajuster pour le fuseau horaire (simplifie)
  fajrHour = Math.max(3, Math.min(7, fajrHour));
  maghribHour = Math.max(17, Math.min(21, maghribHour));

  return {
    fajr: formatMinutesToTime(Math.floor(fajrHour * 60)),
    maghrib: formatMinutesToTime(Math.floor(maghribHour * 60)),
  };
};

// ============================================
// ANALYSE CORRELATION JEUNE/POIDS
// ============================================

export interface FastingWeightCorrelation {
  avgWeightChangeFasting: number;
  avgWeightChangeNonFasting: number;
  recommendation: string;
}

/**
 * Analyser la correlation entre jeune et perte de poids
 */
export const analyzeFastingWeightCorrelation = async (
  measurements: Array<{ date: string; weight: number }>
): Promise<FastingWeightCorrelation | null> => {
  try {
    const history = await getFastingHistory();
    const completedDates = new Set(history.filter(s => s.completed).map(s => s.date));

    if (completedDates.size < 5 || measurements.length < 10) {
      return null;
    }

    // Calculer la variation de poids pour les jours de jeune vs non-jeune
    const sortedMeasurements = [...measurements].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let fastingDaysChange = 0;
    let fastingDaysCount = 0;
    let nonFastingDaysChange = 0;
    let nonFastingDaysCount = 0;

    for (let i = 1; i < sortedMeasurements.length; i++) {
      const change = sortedMeasurements[i].weight - sortedMeasurements[i - 1].weight;
      const date = sortedMeasurements[i].date;

      if (completedDates.has(date)) {
        fastingDaysChange += change;
        fastingDaysCount++;
      } else {
        nonFastingDaysChange += change;
        nonFastingDaysCount++;
      }
    }

    const avgFasting = fastingDaysCount > 0 ? fastingDaysChange / fastingDaysCount : 0;
    const avgNonFasting = nonFastingDaysCount > 0 ? nonFastingDaysChange / nonFastingDaysCount : 0;

    let recommendation = '';
    const diff = avgNonFasting - avgFasting;

    if (diff > 0.1) {
      const multiplier = Math.abs(avgFasting) > 0.01 ? Math.abs(avgNonFasting / avgFasting) : 3;
      recommendation = `Le jeune t'aide a perdre ${multiplier.toFixed(1)}x plus vite !`;
    } else if (diff > 0) {
      recommendation = 'Le jeune a un impact positif sur ta perte de poids.';
    } else {
      recommendation = 'Continue le jeune pour voir les resultats a long terme.';
    }

    return {
      avgWeightChangeFasting: avgFasting,
      avgWeightChangeNonFasting: avgNonFasting,
      recommendation,
    };
  } catch (error) {
    console.error('Erreur analyzeFastingWeightCorrelation:', error);
    return null;
  }
};

// ============================================
// UTILITAIRES POUR LE TIMER
// ============================================

/**
 * Calculer le temps restant en secondes
 */
export const getTimeRemaining = (targetEndTime: string): number => {
  const target = new Date(targetEndTime);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / 1000));
};

/**
 * Calculer le pourcentage de progression
 */
export const getProgressPercentage = (startTime: string, targetEndTime: string): number => {
  const start = new Date(startTime);
  const end = new Date(targetEndTime);
  const now = new Date();

  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  if (totalDuration <= 0) return 100;
  return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
};

/**
 * Formater l'heure de debut/fin pour affichage
 */
export const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Formater la date pour affichage
 */
export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "aujourd'hui";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'hier';
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
};

// ============================================
// EXPORT PAR DEFAUT
// ============================================

export default {
  FASTING_MODES,
  getFastingMode,
  getFastingState,
  startFasting,
  stopFasting,
  completeFasting,
  getFastingHistory,
  getFastingStats,
  getFastingStreak,
  getCustomFastingSettings,
  saveCustomFastingSettings,
  getRamadanSettings,
  saveRamadanSettings,
  calculateApproximatePrayerTimes,
  analyzeFastingWeightCorrelation,
  getTimeRemaining,
  getProgressPercentage,
  formatTime,
  formatDate,
  formatDuration,
  formatCountdown,
};
