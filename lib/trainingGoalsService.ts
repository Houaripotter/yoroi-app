// ============================================
// YOROI - SERVICE DE GESTION DES OBJECTIFS D'ENTRAINEMENT
// ============================================
// Permet de definir des objectifs personnalises par sport
// avec calcul automatique semaine -> mois -> annee

import * as SQLite from 'expo-sqlite';
import { Sport, SPORTS } from './sports';

// Database locale (evite dependance circulaire)
let db: SQLite.SQLiteDatabase | null = null;
let tableCreated = false;

const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    // S'assurer que la table existe
    if (!tableCreated) {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS training_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sport_id TEXT NOT NULL UNIQUE,
          weekly_target INTEGER NOT NULL DEFAULT 1,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      tableCreated = true;
    }
    return db;
  }

  db = await SQLite.openDatabaseAsync('yoroi.db');

  // Creer la table si elle n'existe pas
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS training_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sport_id TEXT NOT NULL UNIQUE,
      weekly_target INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  tableCreated = true;

  return db;
};

// ============================================
// TYPES
// ============================================

export interface TrainingGoal {
  id?: number;
  sport_id: string;           // ID du sport (ex: 'jjb', 'musculation')
  weekly_target: number;      // Objectif par semaine (ex: 3)
  is_active: boolean;         // Objectif actif ou pas
  created_at?: string;
  updated_at?: string;
}

export interface GoalProgress {
  goal: TrainingGoal;
  sport: Sport;
  // Cette semaine
  weekCount: number;
  weekTarget: number;
  weekPercent: number;
  // Ce mois (calcule automatiquement)
  monthCount: number;
  monthTarget: number;  // weeklyTarget * nombre de semaines dans le mois
  monthPercent: number;
  // Cette annee (calcule automatiquement)
  yearCount: number;
  yearTarget: number;   // weeklyTarget * 52
  yearPercent: number;
  // Infos supplementaires
  isOnTrack: boolean;   // Est-ce qu'on est dans les temps?
  daysUntilWeekEnd: number;
  sessionsNeeded: number; // Sessions restantes pour atteindre l'objectif de la semaine
}

export interface GlobalGoalStats {
  totalGoals: number;
  activeGoals: number;
  totalWeeklyTarget: number;
  totalWeeklyCompleted: number;
  overallWeekPercent: number;
  goalsOnTrack: number;
  goalsBehind: number;
}

// ============================================
// INITIALISATION DE LA TABLE
// ============================================

export const initTrainingGoalsDB = async () => {
  const database = await getDatabase();

  // Table des objectifs d'entrainement
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS training_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sport_id TEXT NOT NULL UNIQUE,
      weekly_target INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  if (__DEV__) console.log('[TrainingGoals] Table initialisee');
};

// ============================================
// FONCTIONS CRUD
// ============================================

// Ajouter ou mettre a jour un objectif
export const setGoal = async (sportId: string, weeklyTarget: number): Promise<number> => {
  const database = await getDatabase();

  // Verifier si l'objectif existe deja
  const existing = await database.getFirstAsync<TrainingGoal>(
    'SELECT * FROM training_goals WHERE sport_id = ?',
    [sportId]
  );

  if (existing) {
    // Mettre a jour
    await database.runAsync(
      `UPDATE training_goals SET weekly_target = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE sport_id = ?`,
      [weeklyTarget, sportId]
    );
    return existing.id!;
  } else {
    // Creer
    const result = await database.runAsync(
      `INSERT INTO training_goals (sport_id, weekly_target, is_active) VALUES (?, ?, 1)`,
      [sportId, weeklyTarget]
    );
    return result.lastInsertRowId;
  }
};

// Recuperer tous les objectifs
export const getAllGoals = async (): Promise<TrainingGoal[]> => {
  const database = await getDatabase();
  const results = await database.getAllAsync<any>(
    'SELECT * FROM training_goals ORDER BY sport_id ASC'
  );
  return results.map(r => ({
    ...r,
    is_active: r.is_active === 1
  }));
};

// Recuperer les objectifs actifs
export const getActiveGoals = async (): Promise<TrainingGoal[]> => {
  const database = await getDatabase();
  const results = await database.getAllAsync<any>(
    'SELECT * FROM training_goals WHERE is_active = 1 ORDER BY sport_id ASC'
  );
  return results.map(r => ({
    ...r,
    is_active: true
  }));
};

// Recuperer un objectif par sport
export const getGoalBySport = async (sportId: string): Promise<TrainingGoal | null> => {
  const database = await getDatabase();
  const result = await database.getFirstAsync<any>(
    'SELECT * FROM training_goals WHERE sport_id = ?',
    [sportId]
  );
  if (!result) return null;
  return { ...result, is_active: result.is_active === 1 };
};

// Desactiver un objectif
export const deactivateGoal = async (sportId: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE training_goals SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE sport_id = ?',
    [sportId]
  );
};

// Activer un objectif
export const activateGoal = async (sportId: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE training_goals SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE sport_id = ?',
    [sportId]
  );
};

// Supprimer un objectif
export const deleteGoal = async (sportId: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM training_goals WHERE sport_id = ?', [sportId]);
};

// ============================================
// CALCUL DES PROGRESSIONS
// ============================================

// Obtenir les dates de debut et fin de la semaine courante (Lundi - Dimanche)
const getWeekBounds = (): { start: string; end: string; daysRemaining: number } => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Dimanche
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const daysRemaining = Math.ceil((sunday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
    daysRemaining
  };
};

// Obtenir les dates de debut et fin du mois courant
const getMonthBounds = (): { start: string; end: string; weeksInMonth: number } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Calculer le nombre de semaines dans le mois
  const daysInMonth = end.getDate();
  const weeksInMonth = Math.ceil(daysInMonth / 7);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    weeksInMonth
  };
};

// Obtenir les dates de debut et fin de l'annee courante
const getYearBounds = (): { start: string; end: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
};

// Compter les entrainements pour un sport dans une periode
const countTrainings = async (
  sportId: string,
  startDate: string,
  endDate: string
): Promise<number> => {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM trainings WHERE sport = ? AND date >= ? AND date <= ?`,
    [sportId, startDate, endDate]
  );
  return result?.count || 0;
};

// Calculer la progression pour un objectif
export const getGoalProgress = async (goal: TrainingGoal): Promise<GoalProgress> => {
  const sport = SPORTS.find(s => s.id === goal.sport_id);
  if (!sport) {
    throw new Error(`Sport not found: ${goal.sport_id}`);
  }

  const weekBounds = getWeekBounds();
  const monthBounds = getMonthBounds();
  const yearBounds = getYearBounds();

  // Compter les entrainements
  const weekCount = await countTrainings(goal.sport_id, weekBounds.start, weekBounds.end);
  const monthCount = await countTrainings(goal.sport_id, monthBounds.start, monthBounds.end);
  const yearCount = await countTrainings(goal.sport_id, yearBounds.start, yearBounds.end);

  // Calculer les objectifs
  const weekTarget = goal.weekly_target;
  const monthTarget = goal.weekly_target * monthBounds.weeksInMonth;
  const yearTarget = goal.weekly_target * 52;

  // Calculer les pourcentages
  const weekPercent = weekTarget > 0 ? Math.min(100, (weekCount / weekTarget) * 100) : 0;
  const monthPercent = monthTarget > 0 ? Math.min(100, (monthCount / monthTarget) * 100) : 0;
  const yearPercent = yearTarget > 0 ? Math.min(100, (yearCount / yearTarget) * 100) : 0;

  // Est-ce qu'on est dans les temps?
  const sessionsNeeded = Math.max(0, weekTarget - weekCount);
  const isOnTrack = weekCount >= weekTarget || sessionsNeeded <= weekBounds.daysRemaining;

  return {
    goal,
    sport,
    weekCount,
    weekTarget,
    weekPercent,
    monthCount,
    monthTarget,
    monthPercent,
    yearCount,
    yearTarget,
    yearPercent,
    isOnTrack,
    daysUntilWeekEnd: weekBounds.daysRemaining,
    sessionsNeeded
  };
};

// Obtenir la progression de tous les objectifs actifs
export const getAllGoalsProgress = async (): Promise<GoalProgress[]> => {
  const goals = await getActiveGoals();
  const progressList: GoalProgress[] = [];

  for (const goal of goals) {
    try {
      const progress = await getGoalProgress(goal);
      progressList.push(progress);
    } catch (e) {
      console.warn(`[TrainingGoals] Erreur pour ${goal.sport_id}:`, e);
    }
  }

  return progressList;
};

// Obtenir les statistiques globales
export const getGlobalGoalStats = async (): Promise<GlobalGoalStats> => {
  const allGoals = await getAllGoals();
  const activeGoals = allGoals.filter(g => g.is_active);

  let totalWeeklyTarget = 0;
  let totalWeeklyCompleted = 0;
  let goalsOnTrack = 0;
  let goalsBehind = 0;

  const weekBounds = getWeekBounds();

  for (const goal of activeGoals) {
    totalWeeklyTarget += goal.weekly_target;
    const weekCount = await countTrainings(goal.sport_id, weekBounds.start, weekBounds.end);
    totalWeeklyCompleted += Math.min(weekCount, goal.weekly_target);

    const sessionsNeeded = Math.max(0, goal.weekly_target - weekCount);
    if (weekCount >= goal.weekly_target || sessionsNeeded <= weekBounds.daysRemaining) {
      goalsOnTrack++;
    } else {
      goalsBehind++;
    }
  }

  const overallWeekPercent = totalWeeklyTarget > 0
    ? Math.min(100, (totalWeeklyCompleted / totalWeeklyTarget) * 100)
    : 0;

  return {
    totalGoals: allGoals.length,
    activeGoals: activeGoals.length,
    totalWeeklyTarget,
    totalWeeklyCompleted,
    overallWeekPercent,
    goalsOnTrack,
    goalsBehind
  };
};

// ============================================
// UTILITAIRES
// ============================================

// Obtenir le texte de progression
export const getProgressText = (progress: GoalProgress): string => {
  if (progress.weekPercent >= 100) {
    return 'Objectif atteint !';
  }
  if (progress.isOnTrack) {
    return `${progress.sessionsNeeded} session${progress.sessionsNeeded > 1 ? 's' : ''} restante${progress.sessionsNeeded > 1 ? 's' : ''}`;
  }
  return `En retard (${progress.sessionsNeeded} sessions)`;
};

// Obtenir la couleur de progression
export const getProgressColor = (progress: GoalProgress, colors: any): string => {
  if (progress.weekPercent >= 100) return colors.success || '#4CAF50';
  if (progress.isOnTrack) return colors.accent || '#F7B32B';
  return colors.error || '#FF5252';
};

// Formater les statistiques pour le partage
export const formatGoalsForShare = async (): Promise<string> => {
  const progressList = await getAllGoalsProgress();

  if (progressList.length === 0) {
    return 'Aucun objectif defini';
  }

  const lines = progressList.map(p => {
    const emoji = p.weekPercent >= 100 ? '✅' : p.isOnTrack ? '🔥' : '⚠️';
    return `${emoji} ${p.sport.name}: ${p.yearCount}/${p.yearTarget} (${Math.round(p.yearPercent)}%)`;
  });

  return lines.join('\n');
};

// Export par defaut
export default {
  initTrainingGoalsDB,
  setGoal,
  getAllGoals,
  getActiveGoals,
  getGoalBySport,
  deactivateGoal,
  activateGoal,
  deleteGoal,
  getGoalProgress,
  getAllGoalsProgress,
  getGlobalGoalStats,
  getProgressText,
  getProgressColor,
  formatGoalsForShare
};
