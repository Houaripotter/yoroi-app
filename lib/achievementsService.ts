// ============================================
// YOROI - SERVICE ACHIEVEMENTS & HISTORIQUE
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACHIEVEMENTS_HISTORY_KEY = '@yoroi_achievements_history';

export interface AchievementUnlock {
  id: string;
  name: string;
  nameJp: string;
  type: 'badge' | 'rank' | 'level';
  unlockedAt: string; // ISO date
  reward: string;
  icon: string;
  color: string;
}

// Sauvegarder un achievement débloqué
export const saveAchievementUnlock = async (achievement: AchievementUnlock): Promise<void> => {
  try {
    const historyJson = await AsyncStorage.getItem(ACHIEVEMENTS_HISTORY_KEY);
    const history: AchievementUnlock[] = historyJson ? JSON.parse(historyJson) : [];

    // Vérifier si déjà débloqué
    const alreadyUnlocked = history.some(a => a.id === achievement.id);
    if (!alreadyUnlocked) {
      history.unshift(achievement); // Ajouter au début
      await AsyncStorage.setItem(ACHIEVEMENTS_HISTORY_KEY, JSON.stringify(history));
    }
  } catch (error) {
    console.error('Erreur sauvegarde achievement:', error);
  }
};

// Récupérer l'historique
export const getAchievementsHistory = async (): Promise<AchievementUnlock[]> => {
  try {
    const historyJson = await AsyncStorage.getItem(ACHIEVEMENTS_HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Erreur chargement historique:', error);
    return [];
  }
};

// Récupérer les achievements débloqués aujourd'hui
export const getTodayAchievements = async (): Promise<AchievementUnlock[]> => {
  try {
    const history = await getAchievementsHistory();
    const today = new Date().toISOString().split('T')[0];
    return history.filter(a => a.unlockedAt.startsWith(today));
  } catch (error) {
    console.error('Erreur achievements aujourd\'hui:', error);
    return [];
  }
};

// Récupérer les achievements de la semaine
export const getWeekAchievements = async (): Promise<AchievementUnlock[]> => {
  try {
    const history = await getAchievementsHistory();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return history.filter(a => new Date(a.unlockedAt) >= weekAgo);
  } catch (error) {
    console.error('Erreur achievements semaine:', error);
    return [];
  }
};

// Vérifier si un achievement a été débloqué
export const isAchievementUnlocked = async (achievementId: string): Promise<boolean> => {
  try {
    const history = await getAchievementsHistory();
    return history.some(a => a.id === achievementId);
  } catch (error) {
    console.error('Erreur vérification achievement:', error);
    return false;
  }
};

// Obtenir les statistiques d'achievements
export const getAchievementStats = async () => {
  try {
    const history = await getAchievementsHistory();
    const today = await getTodayAchievements();
    const week = await getWeekAchievements();

    return {
      total: history.length,
      today: today.length,
      week: week.length,
      badges: history.filter(a => a.type === 'badge').length,
      ranks: history.filter(a => a.type === 'rank').length,
      levels: history.filter(a => a.type === 'level').length,
    };
  } catch (error) {
    console.error('Erreur stats achievements:', error);
    return { total: 0, today: 0, week: 0, badges: 0, ranks: 0, levels: 0 };
  }
};

export default {
  saveAchievementUnlock,
  getAchievementsHistory,
  getTodayAchievements,
  getWeekAchievements,
  isAchievementUnlocked,
  getAchievementStats,
};
