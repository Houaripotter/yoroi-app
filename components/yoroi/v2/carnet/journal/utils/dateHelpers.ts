/**
 * Date Helpers for Training Journal
 * Utility functions for formatting dates
 */

/**
 * Format relative date (Hier, Il y a 2j, 12 janv., etc.)
 */
export const getRelativeDate = (dateString: string, t: (key: string, params?: any) => string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('common.today');
  if (diffDays === 1) return t('common.yesterday');
  if (diffDays < 7) return t('trainingJournal.daysAgo', { days: diffDays });
  if (diffDays < 30) return t('trainingJournal.weeksAgo', { weeks: Math.floor(diffDays / 7) });

  // Format: "12 janv."
  const monthKey = `dates.${['januaryShort', 'februaryShort', 'marchShort', 'aprilShort', 'mayShort', 'juneShort', 'julyShort', 'augustShort', 'septemberShort', 'octoberShort', 'novemberShort', 'decemberShort'][date.getMonth()]}`;
  return `${date.getDate()} ${t(monthKey)}`;
};
