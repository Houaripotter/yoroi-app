// ============================================
// YOROI WRAPPED : Bilan annuel style Spotify
// ============================================
// Calcule les stats marquantes de l'annee ecoulee.
// ============================================

import { getTrainings, getWeights } from './database';
import { getAllMeasurements } from './storage';
import { getUnlockedBadges } from './badges';
import logger from '@/lib/security/logger';

export interface WrappedStats {
  year: number;
  totalSessions: number;
  uniqueDays: number;
  totalMinutes: number;
  topSport: string;       // type le plus pratique
  topSportCount: number;
  longestStreak: number;  // en jours
  badgesUnlocked: number;
  weightEvolution?: { start: number; end: number; delta: number; unit: string };
  monthsActive: number;   // nb de mois avec au moins 1 session
  bestMonth: { name: string; sessions: number };
  avgPerWeek: number;
  personalBests: number;  // nb de PRs etablis dans l'annee (approximation)
  ready: boolean;         // true si donnees suffisantes
}

const MONTH_NAMES = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

export async function generateWrappedStats(year?: number): Promise<WrappedStats> {
  try {
    const targetYear = year ?? new Date().getFullYear();
    const yearStart = new Date(targetYear, 0, 1).getTime();
    const yearEnd = new Date(targetYear + 1, 0, 1).getTime();

    const [trainings, weights, measurements, badges] = await Promise.all([
      getTrainings(5000).catch(() => []),
      getWeights(1000).catch(() => []),
      getAllMeasurements().catch(() => []),
      getUnlockedBadges().catch(() => []),
    ]);

    const yearTrainings = trainings.filter(t => {
      const d = new Date(t.date).getTime();
      return d >= yearStart && d < yearEnd;
    });

    if (yearTrainings.length === 0) {
      return {
        year: targetYear,
        totalSessions: 0,
        uniqueDays: 0,
        totalMinutes: 0,
        topSport: '',
        topSportCount: 0,
        longestStreak: 0,
        badgesUnlocked: badges.length,
        monthsActive: 0,
        bestMonth: { name: MONTH_NAMES[0], sessions: 0 },
        avgPerWeek: 0,
        personalBests: 0,
        ready: false,
      };
    }

    // Total minutes
    const totalMinutes = yearTrainings.reduce((sum, t) => sum + (t.duration || 0), 0);

    // Unique days
    const days = new Set(yearTrainings.map(t => new Date(t.date).toISOString().slice(0, 10)));
    const uniqueDays = days.size;

    // Top sport
    const byType: Record<string, number> = {};
    yearTrainings.forEach(t => {
      const type = t.sport || 'autre';
      byType[type] = (byType[type] || 0) + 1;
    });
    const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const [topSport, topSportCount] = sorted[0] || ['', 0];

    // Longest streak
    const sortedDays = Array.from(days).sort();
    let longestStreak = 0;
    let cur = 0;
    let prev: Date | null = null;
    for (const dStr of sortedDays) {
      const d = new Date(dStr);
      if (prev && (d.getTime() - prev.getTime()) === 86400000) {
        cur += 1;
      } else {
        cur = 1;
      }
      if (cur > longestStreak) longestStreak = cur;
      prev = d;
    }

    // Months active + best month
    const byMonth: number[] = new Array(12).fill(0);
    yearTrainings.forEach(t => {
      const d = new Date(t.date);
      if (d.getFullYear() === targetYear) byMonth[d.getMonth()] += 1;
    });
    const monthsActive = byMonth.filter(n => n > 0).length;
    let bestIdx = 0;
    for (let i = 1; i < 12; i++) if (byMonth[i] > byMonth[bestIdx]) bestIdx = i;
    const bestMonth = { name: MONTH_NAMES[bestIdx], sessions: byMonth[bestIdx] };

    // Avg per week
    // 18 octobre (audit) : semaines ecoulees de ta premiere seance de l'annee a aujourd'hui (ou au 31 decembre),
    // et non plus le nombre de jours actifs divise par 7 (100 seances sur 100 jours donnaient 6,7 par semaine)
    const firstDay = sortedDays.length ? new Date(sortedDays[0]).getTime() : yearStart;
    const endDay = Math.min(Date.now(), yearEnd);
    const weeks = Math.max(1, Math.ceil((endDay - firstDay) / (7 * 86400000)));
    const avgPerWeek = yearTrainings.length / weeks;

    // Weight evolution
    const yearWeights = weights
      .filter(w => {
        const d = new Date(w.date).getTime();
        return d >= yearStart && d < yearEnd;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let weightEvolution: WrappedStats['weightEvolution'] | undefined;
    if (yearWeights.length >= 2) {
      const start = yearWeights[0].weight;
      const end = yearWeights[yearWeights.length - 1].weight;
      weightEvolution = {
        start,
        end,
        delta: end - start,
        unit: (yearWeights[0] as any).unit || 'kg',
      };
    }

    // Personal bests approx : nb de sessions avec un nouveau max dans l'annee (par type)
    // Approximation : on regarde les trainings avec un "maxWeight" ou "bestTime" qui augmente
    let personalBests = 0;
    const bestByType: Record<string, number> = {};
    yearTrainings
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach(t => {
        const type = t.sport || '';
        const perf = (t as any).performanceValue || (t as any).weightLifted || 0;
        if (perf && (!bestByType[type] || perf > bestByType[type])) {
          bestByType[type] = perf;
          personalBests += 1;
        }
      });

    return {
      year: targetYear,
      totalSessions: yearTrainings.length,
      uniqueDays,
      totalMinutes,
      topSport,
      topSportCount,
      longestStreak,
      badgesUnlocked: badges.length,
      weightEvolution,
      monthsActive,
      bestMonth,
      avgPerWeek,
      personalBests,
      ready: yearTrainings.length >= 5,
    };
  } catch (e) {
    logger.warn('[Wrapped] erreur generation stats', e);
    return {
      year: new Date().getFullYear(),
      totalSessions: 0,
      uniqueDays: 0,
      totalMinutes: 0,
      topSport: '',
      topSportCount: 0,
      longestStreak: 0,
      badgesUnlocked: 0,
      monthsActive: 0,
      bestMonth: { name: MONTH_NAMES[0], sessions: 0 },
      avgPerWeek: 0,
      personalBests: 0,
      ready: false,
    };
  }
}
