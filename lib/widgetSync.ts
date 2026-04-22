// ============================================
// WIDGET SYNC
// Helper qui calcule les stats du widget depuis la DB et les pousse au natif.
// À appeler : au démarrage, après ajout séance, après pesée, etc.
// ============================================

import { getTrainings, getLatestWeight } from './database';
import { updateWidgetStats } from './widgetBridge';
import { logger } from './security/logger';
import { startOfDay, parseISO, differenceInDays } from 'date-fns';

const computeStreak = (trainings: { date: string }[]): number => {
  if (!trainings || trainings.length === 0) return 0;
  const today = startOfDay(new Date());
  const dates = new Set<number>();
  for (const t of trainings) {
    try {
      dates.add(startOfDay(parseISO(t.date)).getTime());
    } catch { /* ignore */ }
  }
  let streak = 0;
  let cursor = today;
  if (!dates.has(cursor.getTime())) {
    cursor = new Date(cursor.getTime() - 86400000);
    if (!dates.has(cursor.getTime())) return 0;
  }
  while (dates.has(cursor.getTime())) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return streak;
};

/**
 * Calcule les stats actuelles et pousse au widget iOS.
 * Silently no-op sur Android ou si le widget n'est pas linké.
 */
export const syncWidget = async (): Promise<void> => {
  try {
    // 90 derniers jours pour calculer correctement la streak
    const [recentTrainings, latestWeight] = await Promise.all([
      getTrainings(90, 200),
      getLatestWeight(),
    ]);

    // Filtre 7 derniers jours pour le compte hebdo
    const weeklyTrainings = (recentTrainings || []).filter(t => {
      try { return differenceInDays(new Date(), parseISO(t.date)) <= 7; }
      catch { return false; }
    });
    const weeklyMinutes = weeklyTrainings.reduce(
      (s, t: any) => s + (t.duration_minutes || t.duration || 0), 0,
    );

    const streakDays = computeStreak(recentTrainings || []);

    await updateWidgetStats({
      weeklyTrainings: weeklyTrainings.length,
      streakDays,
      latestWeightKg: latestWeight?.weight ?? 0,
      weightTrend: 'flat', // à enrichir si besoin (compare aux 7 jours d'avant)
      weeklyMinutes,
    });
  } catch (e) {
    logger.warn('[WidgetSync] Erreur sync widget:', e);
  }
};
