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
  // Daily (15) - Triées par XP (5 → 50)
  | 'daily_open_app'       // 5 XP
  | 'daily_weigh'          // 10 XP
  | 'daily_breakfast'      // 10 XP
  | 'daily_read_article'   // 15 XP
  | 'daily_sleep'          // 15 XP
  | 'daily_stretch'        // 15 XP
  | 'daily_meditation'     // 15 XP
  | 'daily_hydration'      // 20 XP
  | 'daily_protein'        // 20 XP
  | 'daily_photo'          // 20 XP
  | 'daily_no_junk'        // 25 XP
  | 'daily_steps'          // 25 XP
  | 'daily_cardio'         // 30 XP
  | 'daily_cold_shower'    // 30 XP (NOUVEAU)
  | 'daily_training'       // 50 XP
  // Weekly (15) - Triées par XP (30 → 200)
  | 'weekly_visit_dojo'    // 30 XP
  | 'weekly_check_stats'   // 40 XP
  | 'weekly_rest_day'      // 50 XP
  | 'weekly_share_progress'// 60 XP
  | 'weekly_try_new'       // 60 XP (NOUVEAU)
  | 'weekly_photo'         // 75 XP
  | 'weekly_meal_prep'     // 80 XP
  | 'weekly_read_articles' // 90 XP (NOUVEAU)
  | 'weekly_5_weighs'      // 100 XP
  | 'weekly_measurements'  // 100 XP
  | 'weekly_no_sugar'      // 110 XP (NOUVEAU)
  | 'weekly_hydration_streak' // 120 XP
  | 'weekly_cardio_3'      // 130 XP
  | 'weekly_4_trainings'   // 150 XP
  | 'weekly_7_streak'      // 200 XP
  // Monthly (15) - Triées par XP (200 → 700)
  | 'monthly_invite_friend'// 200 XP (NOUVEAU)
  | 'monthly_25_weighs'    // 300 XP
  | 'monthly_body_scan'    // 300 XP
  | 'monthly_sleep_quality'// 350 XP
  | 'monthly_transformation'// 350 XP
  | 'monthly_20_trainings' // 400 XP
  | 'monthly_hydration_master' // 400 XP
  | 'monthly_new_pr'       // 450 XP
  | 'monthly_lose_2kg'     // 500 XP
  | 'monthly_all_daily'    // 500 XP (NOUVEAU)
  | 'monthly_consistency'  // 550 XP
  | 'monthly_perfect_week' // 600 XP
  | 'monthly_30_streak'    // 600 XP
  | 'monthly_level_up'     // 650 XP
  | 'monthly_best_version';// 700 XP (NOUVEAU)

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

// ✅ 15 quêtes quotidiennes - Triées par XP (5 → 50)
export const DAILY_QUESTS: Quest[] = [
  {
    id: 'daily_open_app',
    title: 'Discipline',
    description: 'Ouvrir l\'app quotidiennement',
    icon: '📱',
    xp: 5,
    period: 'daily',
    target: 1,
  },
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
    id: 'daily_breakfast',
    title: 'Petit-dej',
    description: 'Prendre un bon petit-dejeuner',
    icon: '🍳',
    xp: 10,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_read_article',
    title: 'Dormir Moins Bete',
    description: 'Lire un article dans Savoir',
    icon: '📚',
    xp: 15,
    period: 'daily',
    target: 1,
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
    id: 'daily_stretch',
    title: 'Mobilite',
    description: 'Faire des etirements',
    icon: '🧘',
    xp: 15,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_meditation',
    title: 'Zen / Spirituel',
    description: 'Meditation, priere ou moment de recueillement',
    icon: '🙏',
    xp: 15,
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
    id: 'daily_protein',
    title: 'Proteines',
    description: 'Manger assez de proteines',
    icon: '🥩',
    xp: 20,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_photo',
    title: 'Snapshot',
    description: 'Prendre une photo progres',
    icon: '📸',
    xp: 20,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_no_junk',
    title: 'Clean Eating',
    description: 'Eviter la malbouffe',
    icon: '🥗',
    xp: 25,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_steps',
    title: 'Marcheur',
    description: 'Faire 8000 pas',
    icon: '👟',
    xp: 25,
    period: 'daily',
    target: 8000,
    unit: 'pas',
  },
  {
    id: 'daily_cardio',
    title: 'Cardio',
    description: 'Faire du cardio',
    icon: '❤️',
    xp: 30,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_cold_shower',
    title: 'Guerrier',
    description: 'Prendre une douche froide',
    icon: '🥶',
    xp: 30,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_training',
    title: 'Athlete',
    description: 'Faire un entrainement',
    icon: '💪',
    xp: 50,
    period: 'daily',
    target: 1,
  },
];

// ✅ 15 quêtes hebdomadaires - Triées par XP (30 → 200)
export const WEEKLY_QUESTS: Quest[] = [
  {
    id: 'weekly_visit_dojo',
    title: 'Sensei',
    description: 'Visiter le Dojo',
    icon: '🥋',
    xp: 30,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_check_stats',
    title: 'Analyste',
    description: 'Consulter ses statistiques',
    icon: '📊',
    xp: 40,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_rest_day',
    title: 'Recuperation',
    description: 'Prendre 1 jour de repos complet',
    icon: '🛋️',
    xp: 50,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_share_progress',
    title: 'Influenceur',
    description: 'Partager sa progression',
    icon: '📤',
    xp: 60,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_try_new',
    title: 'Explorateur',
    description: 'Essayer un nouvel exercice',
    icon: '🆕',
    xp: 60,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_photo',
    title: 'Photographe',
    description: 'Prendre une photo progres',
    icon: '📸',
    xp: 75,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_meal_prep',
    title: 'Prep Master',
    description: 'Preparer ses repas a l\'avance',
    icon: '🍱',
    xp: 80,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_read_articles',
    title: 'Erudit',
    description: 'Lire 3 articles dans Savoir',
    icon: '📖',
    xp: 90,
    period: 'weekly',
    target: 3,
  },
  {
    id: 'weekly_5_weighs',
    title: 'Regularite',
    description: '5 pesees cette semaine',
    icon: '⚖️',
    xp: 100,
    period: 'weekly',
    target: 5,
  },
  {
    id: 'weekly_measurements',
    title: 'Mensuration',
    description: 'Mesurer son corps',
    icon: '📏',
    xp: 100,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_no_sugar',
    title: 'Detox Sucre',
    description: '3 jours sans sucre ajoute',
    icon: '🍭',
    xp: 110,
    period: 'weekly',
    target: 3,
  },
  {
    id: 'weekly_hydration_streak',
    title: 'Hydrate',
    description: '5 jours bien hydrate',
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
    id: 'weekly_4_trainings',
    title: 'Machine',
    description: '4 entrainements',
    icon: '💪',
    xp: 150,
    period: 'weekly',
    target: 4,
  },
  {
    id: 'weekly_7_streak',
    title: 'Streak 7j',
    description: '7 jours consecutifs',
    icon: '🔥',
    xp: 200,
    period: 'weekly',
    target: 7,
  },
];

// ✅ 15 quêtes mensuelles - Triées par XP (200 → 700)
export const MONTHLY_QUESTS: Quest[] = [
  {
    id: 'monthly_invite_friend',
    title: 'Ambassadeur',
    description: 'Inviter un ami a utiliser YOROI',
    icon: '👥',
    xp: 200,
    period: 'monthly',
    target: 1,
  },
  {
    id: 'monthly_25_weighs',
    title: 'Assidu',
    description: '25 pesees ce mois',
    icon: '⚖️',
    xp: 300,
    period: 'monthly',
    target: 25,
  },
  {
    id: 'monthly_body_scan',
    title: 'Analyse Complete',
    description: '4 scans composition corporelle',
    icon: '📊',
    xp: 300,
    period: 'monthly',
    target: 4,
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
    id: 'monthly_transformation',
    title: 'Avant/Apres',
    description: '4 photos transformation',
    icon: '📸',
    xp: 350,
    period: 'monthly',
    target: 4,
  },
  {
    id: 'monthly_20_trainings',
    title: 'Titan',
    description: '20 entrainements ce mois',
    icon: '🏋️',
    xp: 400,
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
    id: 'monthly_new_pr',
    title: 'Record',
    description: 'Battre un record personnel',
    icon: '🏆',
    xp: 450,
    period: 'monthly',
    target: 1,
  },
  {
    id: 'monthly_lose_2kg',
    title: 'Objectif Poids',
    description: 'Atteindre un objectif de -2kg',
    icon: '🎯',
    xp: 500,
    period: 'monthly',
    target: 2,
    unit: 'kg',
  },
  {
    id: 'monthly_all_daily',
    title: 'Perfectionniste',
    description: 'Completer toutes les quetes du jour 10 fois',
    icon: '💯',
    xp: 500,
    period: 'monthly',
    target: 10,
  },
  {
    id: 'monthly_consistency',
    title: 'Consistance',
    description: '4 semaines regulieres d\'entrainement',
    icon: '📅',
    xp: 550,
    period: 'monthly',
    target: 4,
  },
  {
    id: 'monthly_perfect_week',
    title: 'Semaine Parfaite',
    description: '7 jours de suite toutes quetes completees',
    icon: '✨',
    xp: 600,
    period: 'monthly',
    target: 7,
  },
  {
    id: 'monthly_30_streak',
    title: 'Marathonien',
    description: '30 jours de streak sans interruption',
    icon: '🔥',
    xp: 600,
    period: 'monthly',
    target: 30,
  },
  {
    id: 'monthly_level_up',
    title: 'Level Up',
    description: 'Monter d\'un niveau de rang',
    icon: '⬆️',
    xp: 650,
    period: 'monthly',
    target: 1,
  },
  {
    id: 'monthly_best_version',
    title: 'Meilleure Version',
    description: 'Atteindre un objectif personnel majeur',
    icon: '👑',
    xp: 700,
    period: 'monthly',
    target: 1,
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

export const uncompleteQuest = async (questId: QuestId): Promise<{ success: boolean; xpRemoved: number }> => {
  const state = await loadQuestsState();
  const quest = ALL_QUESTS.find(q => q.id === questId);

  if (!quest) {
    return { success: false, xpRemoved: 0 };
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

  if (!questProgress || !questProgress.completed) {
    return { success: false, xpRemoved: 0 };
  }

  // Retirer la completion
  questProgress.completed = false;
  questProgress.completedAt = undefined;
  questProgress.current = 0;

  // Retirer les XP
  const xpRemoved = quest.xp;
  periodState.totalXpEarned = Math.max(0, periodState.totalXpEarned - xpRemoved);
  state.totalXp = Math.max(0, state.totalXp - xpRemoved);

  await saveQuestsState(state);

  return { success: true, xpRemoved };
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

  const quests = state.daily.quests
    .map(progress => {
      const quest = DAILY_QUESTS.find(q => q.id === progress.questId);
      if (!quest) return null;
      return { ...quest, ...progress };
    })
    .filter((q): q is Quest & QuestProgress => q !== null);

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

  const quests = state.weekly.quests
    .map(progress => {
      const quest = WEEKLY_QUESTS.find(q => q.id === progress.questId);
      if (!quest) return null;
      return { ...quest, ...progress };
    })
    .filter((q): q is Quest & QuestProgress => q !== null);

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

  const quests = state.monthly.quests
    .map(progress => {
      const quest = MONTHLY_QUESTS.find(q => q.id === progress.questId);
      if (!quest) return null;
      return { ...quest, ...progress };
    })
    .filter((q): q is Quest & QuestProgress => q !== null);

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
