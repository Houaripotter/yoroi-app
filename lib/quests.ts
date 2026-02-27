// ============================================
// YOROI - SYSTEME DE QUETES
// ============================================
// Quetes quotidiennes, hebdomadaires et mensuelles
// pour motiver les utilisateurs
// 100% Offline - AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllMeasurements } from './storage';
import { getTrainings, getMeasurements, getWeights, calculateStreak } from './database';
import logger from '@/lib/security/logger';
import { calculateAndStoreUnifiedPoints } from './gamification';

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
  instructions: string; // Explication détaillée de ce qu'il faut faire
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

// ✅ 15 défis quotidiens - Triés par XP (5 → 50)
export const DAILY_QUESTS: Quest[] = [
  {
    id: 'daily_open_app',
    title: "T'es vivant ?",
    description: "Prouve que tu es là, ouvre l'app",
    instructions: "Ouvre simplement l'app Yoroi une fois dans la journée. C'est validé automatiquement !",
    icon: '📱',
    xp: 5,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_weigh',
    title: 'La Sentence',
    description: 'Monte sur la balance (ça va bien se passer)',
    instructions: "Va dans 'Ajouter une pesée' et enregistre ton poids du jour. Idéalement le matin à jeun.",
    icon: '⚖️',
    xp: 10,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_breakfast',
    title: 'Carburant',
    description: 'Mange un vrai truc, pas juste un café',
    instructions: "Prends un vrai petit-déjeuner équilibré (protéines + glucides). Tape ici pour valider !",
    icon: '🍳',
    xp: 10,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_read_article',
    title: 'Dormir Moins Bête',
    description: 'Lis un article et muscle ton cerveau',
    instructions: "Lis un article (fitness, nutrition, santé...) puis tape ici pour valider !",
    icon: '📚',
    xp: 15,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_sleep',
    title: 'Recharge Batterie',
    description: 'Dors 7h sinon tu vas ramer demain',
    instructions: "Enregistre tes heures de sommeil (minimum 7h) dans la section Sommeil ou via l'app Santé.",
    icon: '😴',
    xp: 15,
    period: 'daily',
    target: 7,
    unit: 'h',
  },
  {
    id: 'daily_stretch',
    title: 'Anti-Rouille',
    description: '10 min pour déverrouiller tes articulations',
    instructions: "Fais 10 minutes d'étirements ou de mobilité. Tape ici une fois terminé.",
    icon: '🧘',
    xp: 15,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_meditation',
    title: 'Pause Cerveau',
    description: 'Déconnecte tout : 5 min de zénitude',
    instructions: "Médite 5 minutes : assieds-toi, ferme les yeux, respire. Tape ici quand c'est fait.",
    icon: '🙏',
    xp: 15,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_hydration',
    title: 'Chameau',
    description: 'Bois tes 2L avant de dessécher',
    instructions: "Bois au moins 2 litres d'eau aujourd'hui. Note ton hydratation dans la section dédiée.",
    icon: '💧',
    xp: 20,
    period: 'daily',
    target: 2,
    unit: 'L',
  },
  {
    id: 'daily_protein',
    title: 'La Brique',
    description: 'Mange tes prots pour construire du muscle',
    instructions: "Mange tes protéines (viande, poisson, œufs, whey...). Tape ici pour valider !",
    icon: '🥩',
    xp: 20,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_photo',
    title: 'Check Visuel',
    description: 'Une photo pour suivre ton évolution réelle',
    instructions: "Prends une photo de ta transformation dans la section 'Photos'. Même pose, même éclairage !",
    icon: '📸',
    xp: 20,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_no_junk',
    title: 'Pas de McDo',
    description: "Zéro malbouffe aujourd'hui, résiste !",
    instructions: "Évite toute malbouffe aujourd'hui : fast-food, chips, sucreries. Tape ici si tu as tenu bon !",
    icon: '🥗',
    xp: 25,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_steps',
    title: 'Forrest Gump',
    description: 'Fais tes 8000 pas, avance !',
    instructions: "Marche 8000 pas minimum. Synchro automatique via l'app Santé.",
    icon: '👟',
    xp: 25,
    period: 'daily',
    target: 8000,
    unit: 'pas',
  },
  {
    id: 'daily_cardio',
    title: 'Pompe à Sang',
    description: 'Fais monter le rythme cardiaque',
    instructions: "Fais 20-30 min de cardio : course, vélo, corde à sauter, HIIT... Enregistre dans tes entraînements.",
    icon: '❤️',
    xp: 30,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_cold_shower',
    title: 'Cryo Boost',
    description: 'Booste ton flux sanguin et ton immunité',
    instructions: "Termine ta douche par 30 secondes d'eau froide. Respire, c'est que du bonheur ! Tape ici une fois fait.",
    icon: '🥶',
    xp: 30,
    period: 'daily',
    target: 1,
  },
  {
    id: 'daily_training',
    title: 'Paye ton Loyer',
    description: 'Fais ta séance, point barre.',
    instructions: "Fais une séance complète et enregistre-la dans 'Ajouter un entraînement'.",
    icon: '💪',
    xp: 50,
    period: 'daily',
    target: 1,
  },
];

// ✅ 15 défis hebdomadaires - Triés par XP (30 → 200)
export const WEEKLY_QUESTS: Quest[] = [
  {
    id: 'weekly_visit_dojo',
    title: 'Curiosité',
    description: "Va fouiller dans l'onglet Outils",
    instructions: "Explore les outils de l'app (Timer, Chrono, etc.). Tape ici pour valider !",
    icon: '🥋',
    xp: 30,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_check_stats',
    title: "L'Inspecteur",
    description: 'Regarde tes stats en face',
    instructions: "Consulte tes statistiques (poids, perfs, progrès). Tape ici pour valider !",
    icon: '📊',
    xp: 40,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_rest_day',
    title: 'Mode Canapé',
    description: 'Glandouille autorisée (et conseillée)',
    instructions: "Prends 1 jour de repos complet cette semaine. Pas de sport, juste récup. Tape ici quand c'est fait.",
    icon: '🛋️',
    xp: 50,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_share_progress',
    title: 'Influenceur',
    description: 'Partage tes résultats, fais le buzz',
    instructions: "Partage tes progrès avec un ami ou sur les réseaux. Tape ici pour valider !",
    icon: '📤',
    xp: 60,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_try_new',
    title: 'Crash Test',
    description: 'Essaie un nouvel exo pour voir',
    instructions: "Teste un exercice que tu n'as jamais fait. Sorts de ta zone de confort ! Tape ici une fois essayé.",
    icon: '🆕',
    xp: 60,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_photo',
    title: 'La Preuve',
    description: 'Photo de la semaine : on voit le changement',
    instructions: "Prends ta photo hebdo de transformation dans la section 'Photos'. Compare avec la semaine dernière !",
    icon: '📸',
    xp: 75,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_meal_prep',
    title: 'Chef Étoilé',
    description: "Prépare tes gamelles à l'avance",
    instructions: "Prépare tes repas de la semaine en avance (meal prep). Tape ici une fois que c'est fait.",
    icon: '🍱',
    xp: 80,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_read_articles',
    title: 'Einstein',
    description: '3 articles pour devenir un expert',
    instructions: "Lis 3 articles cette semaine (fitness, nutrition...). Tape ici à chaque article lu !",
    icon: '📖',
    xp: 90,
    period: 'weekly',
    target: 3,
  },
  {
    id: 'weekly_5_weighs',
    title: 'Le Traqueur',
    description: 'Pèse-toi 5 fois, sois précis',
    instructions: "Enregistre 5 pesées cette semaine pour un suivi précis. Pas besoin de tous les jours !",
    icon: '⚖️',
    xp: 100,
    period: 'weekly',
    target: 5,
  },
  {
    id: 'weekly_measurements',
    title: 'Tailleur',
    description: 'Sors le mètre ruban, on mesure tout',
    instructions: "Prends tes mensurations (tour de taille, hanches, bras, cuisses) dans la section 'Mensurations'.",
    icon: '📏',
    xp: 100,
    period: 'weekly',
    target: 1,
  },
  {
    id: 'weekly_no_sugar',
    title: 'Sevrage',
    description: '3 jours sans sucre, tu vas survivre',
    instructions: "Tiens 3 jours complets sans sucre ajouté (sodas, gâteaux, bonbons). Tape ici chaque jour réussi.",
    icon: '🍭',
    xp: 110,
    period: 'weekly',
    target: 3,
  },
  {
    id: 'weekly_hydration_streak',
    title: 'Le Poisson',
    description: '5 jours bien hydraté, peau nickel',
    instructions: "Atteins ton objectif d'hydratation (2L+) pendant 5 jours cette semaine.",
    icon: '💧',
    xp: 120,
    period: 'weekly',
    target: 5,
  },
  {
    id: 'weekly_cardio_3',
    title: 'Duracell',
    description: "3 séances cardio, t'arrête pas",
    instructions: "Fais 3 séances de cardio cette semaine : course, vélo, natation, HIIT... Enregistre-les !",
    icon: '🏃',
    xp: 130,
    period: 'weekly',
    target: 3,
  },
  {
    id: 'weekly_4_trainings',
    title: 'La Machine',
    description: '4 entraînements pliés cette semaine',
    instructions: "Enregistre 4 séances d'entraînement complètes cette semaine dans l'app.",
    icon: '💪',
    xp: 150,
    period: 'weekly',
    target: 4,
  },
  {
    id: 'weekly_7_streak',
    title: 'Invincible',
    description: "7 jours d'activité sans aucune pause",
    instructions: "Fais une activité physique chaque jour pendant 7 jours consécutifs. Streak parfait !",
    icon: '🔥',
    xp: 200,
    period: 'weekly',
    target: 7,
  },
];

// ✅ 15 défis mensuels - Triés par XP (200 → 700)
export const MONTHLY_QUESTS: Quest[] = [
  {
    id: 'monthly_invite_friend',
    title: 'Recruteur',
    description: "Ramène un pote sur l'app",
    instructions: "Invite un ami à télécharger Yoroi et à commencer son parcours fitness. Tape ici quand il a rejoint !",
    icon: '👥',
    xp: 200,
    period: 'monthly',
    target: 1,
  },
  {
    id: 'monthly_25_weighs',
    title: 'Routine de Fer',
    description: '25 pesées, la rigueur ça paie',
    instructions: "Pèse-toi 25 fois ce mois (presque tous les jours). Suivi régulier = résultats garantis.",
    icon: '⚖️',
    xp: 300,
    period: 'monthly',
    target: 25,
  },
  {
    id: 'monthly_body_scan',
    title: 'Le Scanner',
    description: 'Fais tes 4 bilans complets',
    instructions: "Fais 4 bilans complets (poids + mensurations + composition) dans la section 'Composition corporelle'.",
    icon: '📊',
    xp: 300,
    period: 'monthly',
    target: 4,
  },
  {
    id: 'monthly_sleep_quality',
    title: 'Marmotte Pro',
    description: '20 bonnes nuits de sommeil réparateur',
    instructions: "Dors 7h+ pendant 20 nuits ce mois. Enregistre ton sommeil via l'app Santé ou manuellement.",
    icon: '🌙',
    xp: 350,
    period: 'monthly',
    target: 20,
  },
  {
    id: 'monthly_transformation',
    title: 'Métamorphose',
    description: 'Tes 4 photos : admire le travail',
    instructions: "Prends 4 photos de transformation ce mois (1 par semaine idéalement). Section 'Photos'.",
    icon: '📸',
    xp: 350,
    period: 'monthly',
    target: 4,
  },
  {
    id: 'monthly_20_trainings',
    title: 'Spartiate',
    description: '20 séances dans le mois. Respect.',
    instructions: "Enregistre 20 séances d'entraînement ce mois. Muscu, cardio, sport... tout compte !",
    icon: '🏋️',
    xp: 400,
    period: 'monthly',
    target: 20,
  },
  {
    id: 'monthly_hydration_master',
    title: 'Océan',
    description: "25 jours d'hydratation, t'es au top",
    instructions: "Atteins ton objectif hydratation (2L+) pendant 25 jours ce mois. Note chaque jour dans l'app.",
    icon: '💧',
    xp: 400,
    period: 'monthly',
    target: 25,
  },
  {
    id: 'monthly_new_pr',
    title: 'Légende',
    description: 'Bats ton propre record perso',
    instructions: "Bats un de tes records personnels (poids soulevé, temps, reps). Enregistre-le dans 'Records'.",
    icon: '🏆',
    xp: 450,
    period: 'monthly',
    target: 1,
  },
  {
    id: 'monthly_lose_2kg',
    title: 'Bye Bye le Gras',
    description: "Perds 2kg (ciao les poignées d'amour)",
    instructions: "Perds 2kg ce mois (comparaison début vs fin de mois). Suivi automatique via tes pesées.",
    icon: '🎯',
    xp: 500,
    period: 'monthly',
    target: 2,
    unit: 'kg',
  },
  {
    id: 'monthly_all_daily',
    title: 'Premier de la Classe',
    description: '10 jours sans aucune lacune',
    instructions: "Complète TOUS les défis quotidiens pendant 10 jours différents ce mois. Journées parfaites !",
    icon: '💯',
    xp: 500,
    period: 'monthly',
    target: 10,
  },
  {
    id: 'monthly_consistency',
    title: 'Métronome',
    description: '4 semaines réglées comme une horloge',
    instructions: "Fais au moins 4 entraînements par semaine pendant 4 semaines consécutives. Régularité exemplaire !",
    icon: '📅',
    xp: 550,
    period: 'monthly',
    target: 4,
  },
  {
    id: 'monthly_perfect_week',
    title: 'God Mode',
    description: 'Une semaine parfaite, intouchable',
    instructions: "Réussis une semaine parfaite : tous les défis quotidiens validés 7 jours d'affilée.",
    icon: '✨',
    xp: 600,
    period: 'monthly',
    target: 7,
  },
  {
    id: 'monthly_30_streak',
    title: "L'Habitué",
    description: "30 jours de suite sur l'app",
    instructions: "Ouvre l'app et fais une action (pesée, entraînement...) chaque jour pendant 30 jours. Streak ultime !",
    icon: '🔥',
    xp: 600,
    period: 'monthly',
    target: 30,
  },
  {
    id: 'monthly_level_up',
    title: 'Boss Final',
    description: 'Passe au rang supérieur',
    instructions: "Accumule assez d'XP pour passer au rang supérieur dans le système de gamification.",
    icon: '⬆️',
    xp: 650,
    period: 'monthly',
    target: 1,
  },
  {
    id: 'monthly_best_version',
    title: 'Mission Accomplie',
    description: 'Objectif principal atteint. Bravo.',
    instructions: "Atteins ton objectif principal du mois (poids cible, performance, habitude). Tu l'as mérité !",
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

  // Recalculer les points unifies si XP gagne
  if (xpEarned > 0) {
    try {
      const [weights, streak] = await Promise.all([getWeights(), calculateStreak()]);
      const trainings = await getTrainings();
      await calculateAndStoreUnifiedPoints(weights.length, trainings.length, streak);
    } catch { /* non-bloquant */ }
  }

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

  // Pas du jour (synchro HealthKit/Google Fit)
  try {
    const HealthService = require('./healthService').default;
    const stepsData = await HealthService.getSteps();
    const steps = stepsData?.value ?? stepsData ?? 0;
    if (typeof steps === 'number' && steps > 0) {
      const stepsResult = await updateQuestProgress('daily_steps', steps);
      if (stepsResult.completed && stepsResult.xpEarned > 0) completedQuests.push('daily_steps');
    }
  } catch (e) {
    // HealthKit non disponible, on ignore
  }

  // Sommeil (synchro HealthKit/Google Fit)
  try {
    const HealthService = require('./healthService').default;
    const sleepData = await HealthService.getSleep(1);
    if (sleepData && sleepData.length > 0) {
      const lastSleep = sleepData[0];
      const sleepHours = typeof lastSleep === 'number' ? lastSleep : (lastSleep?.duration ?? lastSleep?.value ?? 0);
      if (sleepHours > 0) {
        const sleepResult = await updateQuestProgress('daily_sleep', sleepHours);
        if (sleepResult.completed && sleepResult.xpEarned > 0) completedQuests.push('daily_sleep');
      }
    }
  } catch (e) {
    // HealthKit non disponible, on ignore
  }

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

  // Recalculer les points unifies apres retrait XP
  if (xpRemoved > 0) {
    try {
      const [weights, streak] = await Promise.all([getWeights(), calculateStreak()]);
      const trainings = await getTrainings();
      await calculateAndStoreUnifiedPoints(weights.length, trainings.length, streak);
    } catch { /* non-bloquant */ }
  }

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
