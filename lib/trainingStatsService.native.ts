// ============================================
// YOROI - SERVICE STATISTIQUES D'ENTRAÎNEMENT
// ============================================

import { Platform } from 'react-native';
import { Sport, SPORT_LABELS } from './trainingJournalService';
import logger from '@/lib/security/logger';

// 🔒 Platform-specific: SQLite only available on native
const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';
let SQLite: any = null;
let db: any = null;

if (isNativePlatform) {
  SQLite = require('expo-sqlite');
  db = SQLite.openDatabaseSync('yoroi.db');
}

// ============================================
// STATISTIQUES GLOBALES
// ============================================

export interface GlobalStats {
  total: number;
  todo: number;
  in_progress: number;
  mastered: number;
  mastered_this_week: number;
  mastered_this_month: number;
  total_practices: number;
  practices_this_week: number;
  practices_this_month: number;
}

export const getGlobalStats = (): GlobalStats => {
  try {
    const stats: GlobalStats = {
      total: 0,
      todo: 0,
      in_progress: 0,
      mastered: 0,
      mastered_this_week: 0,
      mastered_this_month: 0,
      total_practices: 0,
      practices_this_week: 0,
      practices_this_month: 0,
    };

    // Compter par statut
    const counts = db.getAllSync(
      'SELECT status, COUNT(*) as count FROM progression_items GROUP BY status'
    ) as { status: string; count: number }[];

    counts.forEach(row => {
      if (row.status === 'todo' || row.status === 'in_progress' || row.status === 'mastered') {
        stats[row.status] = row.count;
        stats.total += row.count;
      }
    });

    // Maîtrisés cette semaine
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const masteredWeek = db.getFirstSync(
      'SELECT COUNT(*) as count FROM progression_items WHERE status = ? AND mastered_date >= ?',
      ['mastered', weekAgo.toISOString()]
    ) as { count: number } | null;
    stats.mastered_this_week = masteredWeek?.count || 0;

    // Maîtrisés ce mois
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const masteredMonth = db.getFirstSync(
      'SELECT COUNT(*) as count FROM progression_items WHERE status = ? AND mastered_date >= ?',
      ['mastered', monthAgo.toISOString()]
    ) as { count: number } | null;
    stats.mastered_this_month = masteredMonth?.count || 0;

    // Total pratiques
    const practices = db.getFirstSync(
      'SELECT SUM(practice_count) as total FROM progression_items'
    ) as { total: number } | null;
    stats.total_practices = practices?.total || 0;

    // Pratiques cette semaine
    const practicesWeek = db.getFirstSync(
      'SELECT COUNT(*) as count FROM practice_logs WHERE date >= ?',
      [weekAgo.toISOString()]
    ) as { count: number } | null;
    stats.practices_this_week = practicesWeek?.count || 0;

    // Pratiques ce mois
    const practicesMonth = db.getFirstSync(
      'SELECT COUNT(*) as count FROM practice_logs WHERE date >= ?',
      [monthAgo.toISOString()]
    ) as { count: number } | null;
    stats.practices_this_month = practicesMonth?.count || 0;

    return stats;
  } catch (error) {
    logger.error('[STATS] Erreur stats globales:', error);
    return {
      total: 0,
      todo: 0,
      in_progress: 0,
      mastered: 0,
      mastered_this_week: 0,
      mastered_this_month: 0,
      total_practices: 0,
      practices_this_week: 0,
      practices_this_month: 0,
    };
  }
};

// ============================================
// STREAK (Série de jours consécutifs)
// ============================================

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  practicesLast7Days: { date: string; count: number }[];
}

export const getStreakInfo = (): StreakInfo => {
  try {
    // Récupérer toutes les dates uniques de pratiques
    const uniqueDates = db.getAllSync(`
      SELECT DISTINCT DATE(date) as practice_date
      FROM practice_logs
      ORDER BY practice_date DESC
    `) as { practice_date: string }[];

    if (uniqueDates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastPracticeDate: null,
        practicesLast7Days: [],
      };
    }

    // Calculer le streak actuel
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < uniqueDates.length; i++) {
      const practiceDate = new Date(uniqueDates[i].practice_date);
      practiceDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - practiceDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === currentStreak) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculer le longest streak
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 0; i < uniqueDates.length - 1; i++) {
      const date1 = new Date(uniqueDates[i].practice_date);
      const date2 = new Date(uniqueDates[i + 1].practice_date);
      const daysDiff = Math.floor((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);

    // Pratiques des 7 derniers jours
    const last7Days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dateStr = date.toISOString().split('T')[0];
      const count = db.getFirstSync(
        'SELECT COUNT(*) as count FROM practice_logs WHERE DATE(date) = ?',
        [dateStr]
      ) as { count: number } | null;

      last7Days.push({
        date: dateStr,
        count: count?.count || 0,
      });
    }

    return {
      currentStreak,
      longestStreak,
      lastPracticeDate: uniqueDates[0]?.practice_date || null,
      practicesLast7Days: last7Days,
    };
  } catch (error) {
    logger.error('[STATS] Erreur streak:', error);
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastPracticeDate: null,
      practicesLast7Days: [],
    };
  }
};

// ============================================
// STATISTIQUES PAR SPORT
// ============================================

export interface SportStats {
  sport: Sport;
  total: number;
  todo: number;
  in_progress: number;
  mastered: number;
  completionRate: number;
  totalPractices: number;
}

export const getStatsBySport = (): SportStats[] => {
  try {
    const sportsList = db.getAllSync(
      'SELECT DISTINCT sport FROM progression_items'
    ) as { sport: Sport }[];

    const stats: SportStats[] = sportsList.map(({ sport }) => {
      // Compter par statut pour ce sport
      const counts = db.getAllSync(
        'SELECT status, COUNT(*) as count FROM progression_items WHERE sport = ? GROUP BY status',
        [sport]
      ) as { status: string; count: number }[];

      const sportStat: SportStats = {
        sport,
        total: 0,
        todo: 0,
        in_progress: 0,
        mastered: 0,
        completionRate: 0,
        totalPractices: 0,
      };

      counts.forEach(row => {
        if (row.status === 'todo' || row.status === 'in_progress' || row.status === 'mastered') {
          sportStat[row.status] = row.count;
          sportStat.total += row.count;
        }
      });

      // Taux de completion
      sportStat.completionRate = sportStat.total > 0
        ? Math.round((sportStat.mastered / sportStat.total) * 100)
        : 0;

      // Total pratiques pour ce sport
      const practices = db.getFirstSync(
        'SELECT SUM(practice_count) as total FROM progression_items WHERE sport = ?',
        [sport]
      ) as { total: number } | null;
      sportStat.totalPractices = practices?.total || 0;

      return sportStat;
    });

    // Trier par total décroissant
    return stats.sort((a, b) => b.total - a.total);
  } catch (error) {
    logger.error('[STATS] Erreur stats par sport:', error);
    return [];
  }
};

// ============================================
// PRATIQUES PAR JOUR (derniers N jours)
// ============================================

export interface DailyPractice {
  date: string;
  count: number;
}

export const getPracticesLastDays = (days: number = 7): DailyPractice[] => {
  try {
    const result: DailyPractice[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dateStr = date.toISOString().split('T')[0];
      const count = db.getFirstSync(
        'SELECT COUNT(*) as count FROM practice_logs WHERE DATE(date) = ?',
        [dateStr]
      ) as { count: number } | null;

      result.push({
        date: dateStr,
        count: count?.count || 0,
      });
    }

    return result;
  } catch (error) {
    logger.error('[STATS] Erreur pratiques par jour:', error);
    return [];
  }
};

// ============================================
// PRATIQUES PAR MOIS (pour calendrier)
// ============================================

export interface PracticeLogWithItem {
  id: number;
  item_id: number;
  item_name: string;
  sport: Sport;
  date: string;
  sets?: number;
  reps?: number;
  weight?: number;
  distance?: number;
  time?: number;
  quality_rating?: number;
  notes?: string;
}

export const getPracticeLogsForMonth = (year: number, month: number): PracticeLogWithItem[] => {
  try {
    // Créer les dates de début et fin du mois
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const logs = db.getAllSync(`
      SELECT
        pl.id,
        pl.item_id,
        pi.name as item_name,
        pi.sport,
        pl.date,
        pl.sets,
        pl.reps,
        pl.weight,
        pl.distance,
        pl.time,
        pl.quality_rating,
        pl.notes
      FROM practice_logs pl
      INNER JOIN progression_items pi ON pl.item_id = pi.id
      WHERE DATE(pl.date) >= DATE(?) AND DATE(pl.date) <= DATE(?)
      ORDER BY pl.date DESC
    `, [startDate.toISOString(), endDate.toISOString()]) as PracticeLogWithItem[];

    return logs;
  } catch (error) {
    logger.error('[STATS] Erreur logs par mois:', error);
    return [];
  }
};

export default {
  getGlobalStats,
  getStreakInfo,
  getStatsBySport,
  getPracticesLastDays,
  getPracticeLogsForMonth,
};
