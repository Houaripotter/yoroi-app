// ============================================
// STATS INSIGHTS GENERATOR
// Génère des phrases courtes et contextuelles à partir des data brutes.
// Usage : générer 1-3 insights pour afficher en tête du Dashboard ou autre.
// ============================================

import { differenceInDays, parseISO } from 'date-fns';

export interface Insight {
  id: string;
  /** Texte court (max 70 caractères) */
  text: string;
  /** Tonalité visuelle */
  tone: 'positive' | 'neutral' | 'warning' | 'celebration';
  /** Icône Lucide ou MaterialCommunity (string name) */
  icon?: string;
  /** Action optionnelle au tap */
  href?: string;
}

interface WeightLike { date: string; weight: number; fat_percent?: number; muscle_percent?: number }
interface TrainingLike { date: string; sport?: string; duration?: number; duration_minutes?: number }
interface SleepLike { date: string; duration?: number; total?: number }

// ─── Helpers ─────────────────────────────────

const daysAgo = (date: string): number => {
  try { return differenceInDays(new Date(), parseISO(date)); } catch { return 9999; }
};

const lastNDays = <T extends { date: string }>(arr: T[], n: number): T[] =>
  arr.filter(x => daysAgo(x.date) <= n);

const fmtKg = (kg: number): string => Math.abs(kg) < 0.1 ? '0' : Math.abs(kg).toFixed(1);

// ─── Generators ─────────────────────────────────

/**
 * Insight perte/gain de poids sur 30 derniers jours (vs 30 jours d'avant).
 */
const weightDelta = (weights: WeightLike[]): Insight | null => {
  if (!weights || weights.length < 2) return null;
  // Tri DESC
  const sorted = [...weights].sort((a, b) => b.date.localeCompare(a.date));
  const recent = sorted.slice(0, 5);  // 5 dernières pesées
  const old = sorted.slice(5, 10);    // 5 d'avant
  if (recent.length < 2 || old.length === 0) return null;
  const avgRecent = recent.reduce((s, w) => s + w.weight, 0) / recent.length;
  const avgOld = old.reduce((s, w) => s + w.weight, 0) / old.length;
  const delta = avgRecent - avgOld;
  if (Math.abs(delta) < 0.3) return null;
  if (delta < 0) {
    return {
      id: 'weight-loss',
      text: `Tu as perdu ${fmtKg(delta)} kg récemment 🎉`,
      tone: 'celebration',
      icon: 'trending-down',
    };
  }
  return {
    id: 'weight-gain',
    text: `Tu as pris ${fmtKg(delta)} kg récemment`,
    tone: 'neutral',
    icon: 'trending-up',
  };
};

/**
 * Insight nombre de séances cette semaine vs moyenne.
 */
const trainingsWeekly = (trainings: TrainingLike[]): Insight | null => {
  if (!trainings || trainings.length === 0) return null;
  const last7 = lastNDays(trainings, 7).length;
  const last28 = lastNDays(trainings, 28).length;
  const avg7 = last28 / 4;
  if (last7 === 0 && last28 === 0) return null;
  if (last7 >= 5) {
    return {
      id: 'trainings-streak',
      text: `${last7} séances cette semaine, t'es en feu 🔥`,
      tone: 'celebration',
      icon: 'fire',
    };
  }
  if (last7 > avg7 * 1.4) {
    return {
      id: 'trainings-up',
      text: `${last7} séances cette semaine, +${Math.round((last7 / Math.max(avg7, 0.1) - 1) * 100)}% vs moyenne`,
      tone: 'positive',
      icon: 'trending-up',
    };
  }
  if (last7 === 0) {
    return {
      id: 'trainings-zero',
      text: `Aucune séance cette semaine, reprends doucement`,
      tone: 'warning',
      icon: 'alert-circle',
    };
  }
  return null;
};

/**
 * Insight sommeil moyen vs objectif.
 */
const sleepInsight = (nights: SleepLike[], goalMinutes: number = 480): Insight | null => {
  if (!nights || nights.length === 0) return null;
  const last7 = lastNDays(nights, 7);
  if (last7.length === 0) return null;
  const avgMin = last7.reduce((s, n) => s + (n.duration || n.total || 0), 0) / last7.length;
  const deltaMin = goalMinutes - avgMin;
  if (Math.abs(deltaMin) < 20) {
    return {
      id: 'sleep-on-goal',
      text: `Sommeil pile sur ton objectif (${Math.round(avgMin / 60 * 10) / 10}h moy.)`,
      tone: 'positive',
      icon: 'moon',
    };
  }
  if (deltaMin > 30) {
    const h = Math.floor(deltaMin / 60);
    const m = Math.round(deltaMin % 60);
    return {
      id: 'sleep-debt',
      text: `Dette de sommeil : ${h > 0 ? `${h}h` : ''}${m}min/nuit en moyenne`,
      tone: 'warning',
      icon: 'moon',
    };
  }
  return null;
};

/**
 * Insight perte/gain composition corporelle.
 */
const compositionDelta = (weights: WeightLike[]): Insight | null => {
  if (!weights || weights.length < 4) return null;
  const sorted = [...weights].sort((a, b) => b.date.localeCompare(a.date));
  const withFat = sorted.filter(w => w.fat_percent && w.fat_percent > 0);
  if (withFat.length < 4) return null;
  const recent = withFat.slice(0, 3);
  const old = withFat.slice(3, 6);
  if (old.length === 0) return null;
  const avgRecent = recent.reduce((s, w) => s + (w.fat_percent || 0), 0) / recent.length;
  const avgOld = old.reduce((s, w) => s + (w.fat_percent || 0), 0) / old.length;
  const delta = avgRecent - avgOld;
  if (Math.abs(delta) < 0.3) return null;
  if (delta < 0) {
    return {
      id: 'fat-loss',
      text: `Masse grasse en baisse : -${Math.abs(delta).toFixed(1)} pts récents`,
      tone: 'celebration',
      icon: 'fire',
    };
  }
  return null;
};

// ─── API publique ─────────────────────────────────

/**
 * Génère jusqu'à `max` insights pertinents et triés par priorité.
 * Renvoie un tableau vide si aucune data significative.
 */
export const generateInsights = (data: {
  weights?: WeightLike[];
  trainings?: TrainingLike[];
  nights?: SleepLike[];
  sleepGoalMinutes?: number;
}, max: number = 2): Insight[] => {
  const candidates: (Insight | null)[] = [
    weightDelta(data.weights || []),
    trainingsWeekly(data.trainings || []),
    sleepInsight(data.nights || [], data.sleepGoalMinutes ?? 480),
    compositionDelta(data.weights || []),
  ];
  // Priorité : celebration > positive > warning > neutral
  const order: Record<Insight['tone'], number> = { celebration: 0, positive: 1, warning: 2, neutral: 3 };
  return candidates
    .filter((x): x is Insight => x !== null)
    .sort((a, b) => order[a.tone] - order[b.tone])
    .slice(0, max);
};
