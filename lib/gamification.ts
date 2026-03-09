// ============================================
// YOROI - SYSTEME DE GAMIFICATION SIMPLIFIE
// ============================================
// Style Pokemon : Avatar qui evolue avec des paliers clairs

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

export interface Level {
  level: number;
  name: string;
  nameJp: string;
  pointsRequired: number;
  icon: string;
  color: string;
  description: string;
}

// 5 niveaux simples et clairs
export const LEVELS: Level[] = [
  {
    level: 1,
    name: 'Debutant',
    nameJp: '初心者',
    pointsRequired: 0,
    icon: 'Sprout',
    color: '#6B7280',
    description: 'Tu commences ton voyage',
  },
  {
    level: 2,
    name: 'Apprenti',
    nameJp: '見習い',
    pointsRequired: 100,
    icon: 'Shield',
    color: '#3B82F6',
    description: 'Tu apprends les bases',
  },
  {
    level: 3,
    name: 'Athlète',
    nameJp: '戦士',
    pointsRequired: 300,
    icon: 'Swords',
    color: '#10B981',
    description: 'Tu maitrises la discipline',
  },
  {
    level: 4,
    name: 'Champion',
    nameJp: '勇者',
    pointsRequired: 600,
    icon: 'Trophy',
    color: '#F59E0B',
    description: 'Tu inspires les autres',
  },
  {
    level: 5,
    name: 'Legende',
    nameJp: '伝説',
    pointsRequired: 1000,
    icon: 'Crown',
    color: '#FFD700',
    description: 'Tu as atteint le sommet',
  },
];

// Actions qui donnent des points (SIMPLE)
export const POINTS_ACTIONS = {
  peser: 5,              // Se peser = +5 pts
  entraînement: 20,      // Entraînement = +20 pts
  objectif_jour: 10,     // Completer objectif du jour = +10 pts
  photo: 15,             // Ajouter une photo = +15 pts
  hydration_complete: 10, // Objectif hydratation atteint = +10 pts
  streak_7: 50,          // 7 jours de suite = +50 pts bonus
  streak_30: 200,        // 30 jours de suite = +200 pts bonus
  streak_100: 500,       // 100 jours de suite = +500 pts bonus
};

// Obtenir le niveau actuel en fonction des points
export const getLevel = (points: number): Level => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].pointsRequired) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
};

// Obtenir le prochain niveau
export const getNextLevel = (points: number): Level | null => {
  const currentLevel = getLevel(points);
  const nextIndex = LEVELS.findIndex(l => l.level === currentLevel.level) + 1;
  return nextIndex < LEVELS.length ? LEVELS[nextIndex] : null;
};

// Progression vers le prochain niveau (en %)
export const getLevelProgress = (points: number): {
  progress: number;
  pointsToNext: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
} => {
  const currentLevel = getLevel(points);
  const nextLevel = getNextLevel(points);

  if (!nextLevel) {
    return {
      progress: 100,
      pointsToNext: 0,
      currentLevelPoints: points,
      nextLevelPoints: currentLevel.pointsRequired,
    };
  }

  const pointsInLevel = points - currentLevel.pointsRequired;
  const pointsNeeded = nextLevel.pointsRequired - currentLevel.pointsRequired;
  const progress = Math.round((pointsInLevel / pointsNeeded) * 100);

  return {
    progress: Math.min(100, Math.max(0, progress)),
    pointsToNext: nextLevel.pointsRequired - points,
    currentLevelPoints: currentLevel.pointsRequired,
    nextLevelPoints: nextLevel.pointsRequired,
  };
};

// Calculer les points totaux depuis les activités
export const calculateTotalPoints = async (
  weightsCount: number,
  trainingsCount: number,
  photosCount: number,
  streak: number,
  hydrationDaysComplete: number
): Promise<number> => {
  let total = 0;

  // Points de base
  total += weightsCount * POINTS_ACTIONS.peser;
  total += trainingsCount * POINTS_ACTIONS.entraînement;
  total += photosCount * POINTS_ACTIONS.photo;
  total += hydrationDaysComplete * POINTS_ACTIONS.hydration_complete;

  // Bonus streak
  if (streak >= 100) {
    total += POINTS_ACTIONS.streak_100;
  } else if (streak >= 30) {
    total += POINTS_ACTIONS.streak_30;
  } else if (streak >= 7) {
    total += POINTS_ACTIONS.streak_7;
  }

  return total;
};

// ============================================
// SYSTEME DE POINTS UNIFIES
// ============================================
// Agrege TOUTES les sources de points/XP

const UNIFIED_POINTS_KEY = '@yoroi_unified_total_points';
const UNIFIED_BREAKDOWN_KEY = '@yoroi_unified_breakdown';

export interface UnifiedPointsBreakdown {
  activityPoints: number;
  questsXp: number;
  challengesXp: number;
  challengeServiceXp: number;
  healthBonus: number;
  chestXp: number;
  loginBonusXp: number;
  total: number;
}

/**
 * Calcule et stocke les points unifies depuis TOUTES les sources.
 * Appeler apres chaque action qui modifie les points.
 */
export const calculateAndStoreUnifiedPoints = async (
  weightsCount: number,
  trainingsCount: number,
  streak: number,
): Promise<number> => {
  try {
    // Bonus x1.5 XP le weekend (samedi=6, dimanche=0)
    const day = new Date().getDay();
    const weekendMultiplier = (day === 0 || day === 6) ? 1.5 : 1.0;

    // 1. Points d'activité (pesees, entraînements, streak) avec bonus weekend
    const baseActivityPoints =
      weightsCount * POINTS_ACTIONS.peser +
      trainingsCount * POINTS_ACTIONS.entraînement +
      (streak >= 100 ? POINTS_ACTIONS.streak_100 : streak >= 30 ? POINTS_ACTIONS.streak_30 : streak >= 7 ? POINTS_ACTIONS.streak_7 : 0);
    const activityPoints = Math.round(baseActivityPoints * weekendMultiplier);

    // 2. XP quetes
    let questsXp = 0;
    try {
      const questsData = await AsyncStorage.getItem('@yoroi_quests_state');
      if (questsData) {
        const state = JSON.parse(questsData);
        questsXp = state.totalXp || 0;
      }
    } catch { /* ignore */ }

    // 3. XP challenges hebdo
    let challengesXp = 0;
    try {
      const xpData = await AsyncStorage.getItem('@yoroi_user_xp');
      if (xpData) challengesXp = parseInt(xpData, 10) || 0;
    } catch { /* ignore */ }

    // 4. XP challenge service
    let challengeServiceXp = 0;
    try {
      const xpData = await AsyncStorage.getItem('@yoroi_challenge_xp');
      if (xpData) challengeServiceXp = parseInt(xpData, 10) || 0;
    } catch { /* ignore */ }

    // 5. Bonus santé (Phase 3)
    let healthBonus = 0;
    try {
      const bonusData = await AsyncStorage.getItem('@yoroi_health_daily_bonus');
      if (bonusData) healthBonus = parseInt(bonusData, 10) || 0;
    } catch { /* ignore */ }

    // 6. XP coffres mysteres ouverts
    let chestXp = 0;
    try {
      const chestData = await AsyncStorage.getItem('@yoroi_chest_xp_total');
      if (chestData) chestXp = parseInt(chestData, 10) || 0;
    } catch { /* ignore */ }

    // 7. Bonus de connexion journaliers cumules
    let loginBonusXp = 0;
    try {
      const loginData = await AsyncStorage.getItem('@yoroi_login_bonus_xp_total');
      if (loginData) loginBonusXp = parseInt(loginData, 10) || 0;
    } catch { /* ignore */ }

    const total = activityPoints + questsXp + challengesXp + challengeServiceXp + healthBonus + chestXp + loginBonusXp;

    const breakdown: UnifiedPointsBreakdown = {
      activityPoints,
      questsXp,
      challengesXp,
      challengeServiceXp,
      healthBonus,
      chestXp,
      loginBonusXp,
      total,
    };

    await AsyncStorage.setItem(UNIFIED_POINTS_KEY, total.toString());
    await AsyncStorage.setItem(UNIFIED_BREAKDOWN_KEY, JSON.stringify(breakdown));

    return total;
  } catch (error) {
    logger.error('[Gamification] Erreur calcul points unifies:', error);
    return 0;
  }
};

/**
 * Lecture rapide du total de points unifies.
 */
export const getUnifiedPoints = async (): Promise<number> => {
  try {
    const data = await AsyncStorage.getItem(UNIFIED_POINTS_KEY);
    return data ? parseInt(data, 10) : 0;
  } catch {
    return 0;
  }
};

/**
 * Lecture du detail des points unifies (pour affichage).
 */
export const getUnifiedPointsBreakdown = async (): Promise<UnifiedPointsBreakdown> => {
  try {
    const data = await AsyncStorage.getItem(UNIFIED_BREAKDOWN_KEY);
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return {
    activityPoints: 0,
    questsXp: 0,
    challengesXp: 0,
    challengeServiceXp: 0,
    healthBonus: 0,
    chestXp: 0,
    loginBonusXp: 0,
    total: 0,
  };
};

export default {
  LEVELS,
  POINTS_ACTIONS,
  getLevel,
  getNextLevel,
  getLevelProgress,
  calculateTotalPoints,
  calculateAndStoreUnifiedPoints,
  getUnifiedPoints,
  getUnifiedPointsBreakdown,
};
