// Web stub - SQLite training stats not supported on web
import logger from '@/lib/security/logger';
logger.warn('trainingStatsService: SQLite operations not supported on web platform');

export const getGlobalStats = () => ({
  total: 0,
  todo: 0,
  in_progress: 0,
  mastered: 0,
  mastered_this_week: 0,
  mastered_this_month: 0,
  total_practices: 0,
  practices_this_week: 0,
  practices_this_month: 0,
});

export const getStatsBySport = () => [];
export const getStatsByTechnique = () => [];
export const getPracticeHistory = () => [];
export const getRecentlyMastered = () => [];
export const getMasteryTrend = () => [];
