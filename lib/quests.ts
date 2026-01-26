// ============================================
// YOROI - SYSTEME DE QUETES
// ============================================
// Quetes quotidiennes, hebdomadaires et mensuelles
// pour motiver les utilisateurs
// 100% Offline - AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllMeasurements } from './storage';
import { getTrainings, getMeasurements } from './database';
import logger from '@/lib/security/logger';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type QuestPeriod = 'daily' | 'weekly' | 'monthly';
export type QuestId =
  // Daily (10)
  | 'daily_weigh'
  | 'daily_hydration'
  | 'daily_training'
  | 'daily_open_app'
  | 'daily_steps'
  | 'daily_sleep'
  | 'daily_protein'
  | 'daily_stretch'
  | 'daily_meditation'
  | 'daily_cardio'
  // Weekly (10)
  | 'weekly_5_weighs'
  | 'weekly_4_trainings'
  | 'weekly_photo'
  | 'weekly_measurements'
  | 'weekly_7_streak'
  | 'weekly_hydration_streak'
  | 'weekly_cardio_3'
  | 'weekly_meal_prep'
  | 'weekly_rest_day'
  | 'weekly_protein_goal'
  // Monthly (10)
  | 'monthly_lose_2kg'
  | 'monthly_20_trainings'
  | 'monthly_30_streak'
  | 'monthly_50_weighs'
  | 'monthly_transformation'
  | 'monthly_new_pr'
  | 'monthly_sleep_quality'
  | 'monthly_hydration_master'
  | 'monthly_consistency'
  | 'monthly_body_scan';

export interface Quest {
  id: QuestId;
  title: string;
  description: string;
  icon: string;
  xp: number;
  period: QuestPeriod;
  target: number;
  unit?: string;
}

export interface QuestProgress {
  questId: QuestId;
  current: number;
  target: number;
  completed: boolean;
  completedAt?: string;
}

export interface QuestsState {
  daily: {
    date: string;
    quests: QuestProgress[];
    totalXpEarned: number;
  };
  weekly: {
    weekStart: string;
    quests: QuestProgress[];
    totalXpEarned: number;
  };
  monthly: {
    month: string;
    quests: QuestProgress[];
    totalXpEarned: number;
  };
  totalXp: number;
}

// ═══════════════════════════════════════════════
// DEFINITIONS DES QUETES
// ═══════════════════════════════════════════════

export const DAILY_QUESTS: Quest[] = [
  {
    id: 'daily_weigh',
    title: 'Pesee du jour',
    description: 'Se peser une fois',
    icon: '⚖️',
    xp: 10,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_hydration',
    title: 'Hydratation',
    description: 'Boire 2L d\'eau',
    icon: '💧',
    xp: 20,
    period: 'daily',
    target: 2,
    unit: 'L',
  },
  {
    id: 'daily_training',
    title: 'Athlete',
    description: 'Faire un entrainement',
    icon: '',
    xp: 50,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_open_app',
    title: 'Discipline',
    description: 'Ouvrir l\'app',
    icon: '',
    xp: 5,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_steps',
    title: 'Marcheur',
    description: 'Faire 10 000 pas',
    icon: '👟',
    xp: 30,
    period: 'daily',
    target: 10000,
    unit: 'pas',
  },
  {
    id: 'daily_sleep',
    title: 'Repos',
    description: 'Dormir 7h minimum',
    icon: '😴',
    xp: 15,
    period: 'daily',
    target: 7,
    unit: 'h',
  },
  {
    id: 'daily_protein',
    title: 'Proteines',
    description: 'Atteindre objectif proteines',
    icon: '🥩',
    xp: 25,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_stretch',
    title: 'Mobilite',
    description: '10 min d\'etirements',
    icon: '🧘',
    xp: 15,
    period: 'daily',
    target: 10,
    unit: 'min',
  },
  {
    id: 'daily_meditation',
    title: 'Zen',
    description: '5 min de meditation',
    icon: '🧠',
    xp: 20,
    period: 'daily',
    target: 5,
    unit: 'min',
  },
  {
    id: 'daily_cardio',
    title: 'Cardio',
    description: '20 min de cardio',
    icon: '❤️',
    xp: 35,
    period: 'daily',
    target: 20,
    unit: 'min',
  },
];

export const WEEKLY_QUESTS: Quest[] = [
  {
    id: 'weekly_5_weighs',
    title: 'Regularite',
    description: '5 pesees dans la semaine',
    icon: '',
    xp: 100,
    period: 'weekly',
    target: 5,
  },
  {
    id: 'weekly_4_trainings',
    title: 'Machine',
    description: '4 entrainements',
    icon: '',
    xp: 150,
    period: 'weekly',
    target: 4,
  },
  {
    id: 'weekly_photo',
    title: 'Photographe',
    description: 'Prendre une photo transformation',
    icon: '📸',
    xp: 75,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_measurements',
    title: 'Complet',
    description: 'Mesurer ses mensurations',
    icon: '📏',
    xp: 100,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_7_streak',
    title: 'Streak',
    description: '7 jours consecutifs',
    icon: '',
    xp: 200,
    period: 'weekly',
    target: 7,
  },
  {
    id: 'weekly_hydration_streak',
    title: 'Hydrate',
    description: '5 jours a 2L d\'eau',
    icon: '💧',
    xp: 120,
    period: 'weekly',
    target: 5,
  },
  {
    id: 'weekly_cardio_3',
    title: 'Cardio King',
    description: '3 sessions cardio',
    icon: '🏃',
    xp: 130,
    period: 'weekly',
    target: 3,
  },
  {
    id: 'weekly_meal_prep',
    title: 'Prep Master',
    description: 'Preparer ses repas',
    icon: '🍱',
    xp: 80,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_rest_day',
    title: 'Recuperation',
    description: 'Prendre 1 jour de repos',
    icon: '🛋️',
    xp: 50,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_protein_goal',
    title: 'Proteines Pro',
    description: '5 jours objectif prot.',
    icon: '💪',
    xp: 110,
    period: 'weekly',
    target: 5,
  },
];

export const MONTHLY_QUESTS: Quest[] = [
  {
    id: 'monthly_lose_2kg',
    title: 'Transformation',
    description: 'Perdre 2 kg',
    icon: '',
    xp: 500,
    period: 'monthly',
    target: 2,
    unit: 'kg',
  },
  {
    id: 'monthly_20_trainings',
    title: 'Titan',
    description: '20 entrainements',
    icon: '',
    xp: 400,
    period: 'monthly',
    target: 20,
  },
  {
    id: 'monthly_30_streak',
    title: 'Marathonien',
    description: '30 jours de streak',
    icon: '',
    xp: 600,
    period: 'monthly',
    target: 30,
  },
  {
    id: 'monthly_50_weighs',
    title: 'Assidu',
    description: '25 pesees ce mois',
    icon: '⚖️',
    xp: 300,
    period: 'monthly',
    target: 25,
  },
  {
    id: 'monthly_transformation',
    title: 'Avant/Apres',
    description: '4 photos transformation',
    icon: '📸',
    xp: 350,
    period: 'monthly',
    target: 4,
  },
  {
    id: 'monthly_new_pr',
    title: 'Record',
    description: 'Battre un record perso',
    icon: '🏆',
    xp: 450,
    period: 'monthly',
    target: 1,
  },
  {
    id: 'monthly_sleep_quality',
    title: 'Dormeur Elite',
    description: '20 nuits de 7h+',
    icon: '🌙',
    xp: 350,
    period: 'monthly',
    target: 20,
  },
  {
    id: 'monthly_hydration_master',
    title: 'Hydra Master',
    description: '25 jours a 2L d\'eau',
    icon: '💧',
    xp: 400,
    period: 'monthly',
    target: 25,
  },
  {
    id: 'monthly_consistency',
    title: 'Consistance',
    description: '4 semaines regulieres',
    icon: '📅',
    xp: 550,
    period: 'monthly',
    target: 4,
  },
  {
    id: 'monthly_body_scan',
    title: 'Analyse Complete',
    description: '4 scans composition',
    icon: '📊',
    xp: 300,
    period: 'monthly',
    target: 4,
  },
];

export const ALL_QUESTS: Quest[] = [
  ...DAILY_QUESTS,
  ...WEEKLY_QUESTS,
  ...MONTHLY_QUESTS,
];

// ═══════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════

const QUESTS_STATE_KEY = '@yoroi_quests_state';
const HYDRATION_KEY = '@yoroi_daily_hydration';

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getWeekStart = (): string => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Lundi
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
};

const getMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthStart = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

// ═══════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════

const initQuestProgress = (quest: Quest): QuestProgress => ({
  questId: quest.id,
  current: 0,
  target: quest.target,
  completed: false,
});

const getDefaultState = (): QuestsState => ({
  daily: {
    date: getToday(),
    quests: DAILY_QUESTS.map(initQuestProgress),
    totalXpEarned: 0,
  },
  weekly: {
    weekStart: getWeekStart(),
    quests: WEEKLY_QUESTS.map(initQuestProgress),
    totalXpEarned: 0,
  },
  monthly: {
    month: getMonth(),
    quests: MONTHLY_QUESTS.map(initQuestProgress),
    totalXpEarned: 0,
  },
  totalXp: 0,
});

// ═══════════════════════════════════════════════
// LOAD / SAVE
// ═══════════════════════════════════════════════

export const loadQuestsState = async (): Promise<QuestsState> => {
  try {
    const stored = await AsyncStorage.getItem(QUESTS_STATE_KEY);
    if (!stored) {
      return getDefaultState();
    }

    const state: QuestsState = JSON.parse(stored);
    const today = getToday();
    const weekStart = getWeekStart();
    const month = getMonth();

    // Reset daily quests si nouveau jour
    if (state.daily.date !== today) {
      state.daily = {
        date: today,
        quests: DAILY_QUESTS.map(initQuestProgress),
        totalXpEarned: 0,
      };
    }

    // Reset weekly quests si nouvelle semaine
    if (state.weekly.weekStart !== weekStart) {
      state.weekly = {
        weekStart,
        quests: WEEKLY_QUESTS.map(initQuestProgress),
        totalXpEarned: 0,
      };
    }

    // Reset monthly quests si nouveau mois
    if (state.monthly.month !== month) {
      state.monthly = {
        month,
        quests: MONTHLY_QUESTS.map(initQuestProgress),
        totalXpEarned: 0,
      };
    }

    return state;
  } catch (error) {
    logger.error('Erreur chargement quetes:', error);
    return getDefaultState();
  }
};

export const saveQuestsState = async (state: QuestsState): Promise<void> => {
  try {
    await AsyncStorage.setItem(QUESTS_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error('Erreur sauvegarde quetes:', error);
  }
};

// ═══════════════════════════════════════════════
// HYDRATATION (manuel)
// ═══════════════════════════════════════════════

export const getDailyHydration = async (): Promise<number> => {
  try {
    const today = getToday();
    const stored = await AsyncStorage.getItem(HYDRATION_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.date === today) {
        return data.amount;
      }
    }
    return 0;
  } catch {
    return 0;
  }
};

export const addHydration = async (liters: number): Promise<number> => {
  try {
    const today = getToday();
    const current = await getDailyHydration();
    const newAmount = Math.min(current + liters, 5); // Max 5L

    await AsyncStorage.setItem(HYDRATION_KEY, JSON.stringify({
      date: today,
      amount: newAmount,
    }));

    // Mettre a jour la quete
    await updateQuestProgress('daily_hydration', newAmount);

    return newAmount;
  } catch {
    return 0;
  }
};

// ═══════════════════════════════════════════════
// MISE A JOUR DES QUETES
// ═══════════════════════════════════════════════

export const updateQuestProgress = async (
  questId: QuestId,
  newValue: number
): Promise<{ completed: boolean; xpEarned: number }> => {
  const state = await loadQuestsState();
  const quest = ALL_QUESTS.find(q => q.id === questId);

  if (!quest) {
    return { completed: false, xpEarned: 0 };
  }

  let periodState: typeof state.daily | typeof state.weekly | typeof state.monthly;

  switch (quest.period) {
    case 'daily':
      periodState = state.daily;
      break;
    case 'weekly':
      periodState = state.weekly;
      break;
    case 'monthly':
      periodState = state.monthly;
      break;
  }

  const questProgress = periodState.quests.find(q => q.questId === questId);

  if (!questProgress) {
    return { completed: false, xpEarned: 0 };
  }

  // Deja complete
  if (questProgress.completed) {
    return { completed: true, xpEarned: 0 };
  }

  // Mettre a jour la progression
  questProgress.current = newValue;

  // Verifier si complete
  let xpEarned = 0;
  if (questProgress.current >= questProgress.target) {
    questProgress.completed = true;
    questProgress.completedAt = new Date().toISOString();
    xpEarned = quest.xp;
    periodState.totalXpEarned += xpEarned;
    state.totalXp += xpEarned;
  }

  await saveQuestsState(state);

  return { completed: questProgress.completed, xpEarned };
};

// ═══════════════════════════════════════════════
// VERIFICATION AUTOMATIQUE DES QUETES
// ═══════════════════════════════════════════════

export const checkAndUpdateQuests = async (): Promise<QuestId[]> => {
  const state = await loadQuestsState();
  const today = getToday();
  const weekStart = getWeekStart();
  const monthStart = getMonthStart();
  const completedQuests: QuestId[] = [];

  // === DAILY QUESTS ===

  // Pesee du jour
  const measurements = await getAllMeasurements();
  const todayMeasurement = measurements.find(m => m.date === today);
  if (todayMeasurement) {
    const result = await updateQuestProgress('daily_weigh', 1);
    if (result.completed && result.xpEarned > 0) completedQuests.push('daily_weigh');
  }

  // Ouvrir l'app (toujours valide)
  const appResult = await updateQuestProgress('daily_open_app', 1);
  if (appResult.completed && appResult.xpEarned > 0) completedQuests.push('daily_open_app');

  // Entrainement du jour
  const trainings = await getTrainings();
  const todayTraining = trainings.find(t => t.date === today);
  if (todayTraining) {
    const result = await updateQuestProgress('daily_training', 1);
    if (result.completed && result.xpEarned > 0) completedQuests.push('daily_training');
  }

  // Hydratation
  const hydration = await getDailyHydration();
  if (hydration >= 2) {
    const result = await updateQuestProgress('daily_hydration', hydration);
    if (result.completed && result.xpEarned > 0) completedQuests.push('daily_hydration');
  }

  // === WEEKLY QUESTS ===

  // 5 pesees cette semaine
  const weekMeasurements = measurements.filter(m => m.date >= weekStart);
  if (weekMeasurements.length >= 1) {
    const result = await updateQuestProgress('weekly_5_weighs', weekMeasurements.length);
    if (result.completed && result.xpEarned > 0) completedQuests.push('weekly_5_weighs');
  }

  // 4 entrainements cette semaine
  const weekTrainings = trainings.filter(t => t.date >= weekStart);
  if (weekTrainings.length >= 1) {
    const result = await updateQuestProgress('weekly_4_trainings', weekTrainings.length);
    if (result.completed && result.xpEarned > 0) completedQuests.push('weekly_4_trainings');
  }

  // Mensurations cette semaine
  const bodyMeasurements = await getMeasurements();
  const weekBodyMeasurements = bodyMeasurements.filter(m => m.date >= weekStart);
  if (weekBodyMeasurements.length >= 1) {
    const result = await updateQuestProgress('weekly_measurements', 1);
    if (result.completed && result.xpEarned > 0) completedQuests.push('weekly_measurements');
  }

  // === MONTHLY QUESTS ===

  // 20 entrainements ce mois
  const monthStartStr = monthStart.toISOString().split('T')[0];
  const monthTrainings = trainings.filter(t => t.date >= monthStartStr);
  if (monthTrainings.length >= 1) {
    const result = await updateQuestProgress('monthly_20_trainings', monthTrainings.length);
    if (result.completed && result.xpEarned > 0) completedQuests.push('monthly_20_trainings');
  }

  // Perte de 2kg ce mois
  const monthMeasurements = measurements.filter(m => m.date >= monthStartStr);
  if (monthMeasurements.length >= 2) {
    const sortedMonth = [...monthMeasurements].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const firstOfMonth = sortedMonth[0];
    const latest = sortedMonth[sortedMonth.length - 1];
    const weightLoss = firstOfMonth.weight - latest.weight;

    if (weightLoss > 0) {
      const result = await updateQuestProgress('monthly_lose_2kg', weightLoss);
      if (result.completed && result.xpEarned > 0) completedQuests.push('monthly_lose_2kg');
    }
  }

  return completedQuests;
};

// ═══════════════════════════════════════════════
// COMPLETION MANUELLE
// ═══════════════════════════════════════════════

export const completeQuest = async (questId: QuestId): Promise<{ success: boolean; xpEarned: number }> => {
  const quest = ALL_QUESTS.find(q => q.id === questId);
  if (!quest) {
    return { success: false, xpEarned: 0 };
  }

  const result = await updateQuestProgress(questId, quest.target);
  return { success: result.completed, xpEarned: result.xpEarned };
};

// ═══════════════════════════════════════════════
// GETTERS
// ═══════════════════════════════════════════════

export const getQuestById = (questId: QuestId): Quest | undefined => {
  return ALL_QUESTS.find(q => q.id === questId);
};

export const getDailyQuestsProgress = async (): Promise<{
  quests: (Quest & QuestProgress)[];
  completed: number;
  total: number;
  xpEarned: number;
}> => {
  const state = await loadQuestsState();

  const quests = state.daily.quests.map(progress => {
    const quest = DAILY_QUESTS.find(q => q.id === progress.questId)!;
    return { ...quest, ...progress };
  });

  return {
    quests,
    completed: quests.filter(q => q.completed).length,
    total: quests.length,
    xpEarned: state.daily.totalXpEarned,
  };
};

export const getWeeklyQuestsProgress = async (): Promise<{
  quests: (Quest & QuestProgress)[];
  completed: number;
  total: number;
  xpEarned: number;
}> => {
  const state = await loadQuestsState();

  const quests = state.weekly.quests.map(progress => {
    const quest = WEEKLY_QUESTS.find(q => q.id === progress.questId)!;
    return { ...quest, ...progress };
  });

  return {
    quests,
    completed: quests.filter(q => q.completed).length,
    total: quests.length,
    xpEarned: state.weekly.totalXpEarned,
  };
};

export const getMonthlyQuestsProgress = async (): Promise<{
  quests: (Quest & QuestProgress)[];
  completed: number;
  total: number;
  xpEarned: number;
}> => {
  const state = await loadQuestsState();

  const quests = state.monthly.quests.map(progress => {
    const quest = MONTHLY_QUESTS.find(q => q.id === progress.questId)!;
    return { ...quest, ...progress };
  });

  return {
    quests,
    completed: quests.filter(q => q.completed).length,
    total: quests.length,
    xpEarned: state.monthly.totalXpEarned,
  };
};

export const getTotalXp = async (): Promise<number> => {
  const state = await loadQuestsState();
  return state.totalXp;
};

// ═══════════════════════════════════════════════
// STREAK TRACKING
// ═══════════════════════════════════════════════

export const updateStreakQuest = async (currentStreak: number): Promise<void> => {
  // Weekly streak (7 days)
  if (currentStreak >= 7) {
    await updateQuestProgress('weekly_7_streak', currentStreak);
  } else {
    await updateQuestProgress('weekly_7_streak', currentStreak);
  }

  // Monthly streak (30 days)
  if (currentStreak >= 30) {
    await updateQuestProgress('monthly_30_streak', currentStreak);
  } else {
    await updateQuestProgress('monthly_30_streak', currentStreak);
  }
};

// ═══════════════════════════════════════════════
// PHOTO QUEST
// ═══════════════════════════════════════════════

export const completePhotoQuest = async (): Promise<{ xpEarned: number }> => {
  const result = await updateQuestProgress('weekly_photo', 1);
  return { xpEarned: result.xpEarned };
};

export default {
  loadQuestsState,
  saveQuestsState,
  checkAndUpdateQuests,
  completeQuest,
  updateQuestProgress,
  getDailyQuestsProgress,
  getWeeklyQuestsProgress,
  getMonthlyQuestsProgress,
  getTotalXp,
  addHydration,
  getDailyHydration,
  updateStreakQuest,
  completePhotoQuest,
  getQuestById,
  DAILY_QUESTS,
  WEEKLY_QUESTS,
  MONTHLY_QUESTS,
  ALL_QUESTS,
};
