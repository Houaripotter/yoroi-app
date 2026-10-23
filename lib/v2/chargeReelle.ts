/**
 * Charge d'entraînement calculée à partir des VRAIES séances (base SQLite),
 * comme l'accueil. Les charges notées à part (@yoroi_training_loads) servent
 * seulement à retrouver l'effort ressenti d'une séance quand il existe.
 */
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { getTrainingLoads } from '@/lib/trainingLoadService';
import type { TrainingLoad } from '@/lib/trainingLoadService';
import { isoLocal, addDays, startOfToday } from '@/lib/v2/competition/dates';

/** Effort retenu quand la séance n'a pas d'effort noté (milieu de l'échelle). */
export const DEFAULT_RPE = 5;

export type ChargeReelle = {
  totalLoad: number;
  averageRPE: number;
  totalDuration: number;
  sessionsCount: number;
  /** Séances sans effort noté : leur effort est compté à DEFAULT_RPE. */
  estimatedCount: number;
  /** Séances sans durée : elles comptent comme séances mais pas en points. */
  noDurationCount: number;
  dailyLoads: { date: string; load: number }[];
  trend: 'increasing' | 'stable' | 'decreasing';
  /** Habitude : charge moyenne par semaine sur les quatre semaines d'avant (0 si moins de deux semaines connues). */
  habitWeeklyLoad: number;
  /** Nombre de semaines avec au moins une séance parmi ces quatre semaines. */
  habitWeeks: number;
};

function rpeOf(t: Training, loads: TrainingLoad[]): number | null {
  if (t.intensity && t.intensity > 0) return Math.min(10, t.intensity);
  const byId = t.id != null ? loads.find((l) => l.trainingId === t.id) : undefined;
  if (byId && byId.rpe > 0) return byId.rpe;
  return null;
}

function durationOf(t: Training, loads: TrainingLoad[]): number {
  const d = t.duration_minutes ?? t.duration ?? 0;
  if (d > 0) return d;
  const byId = t.id != null ? loads.find((l) => l.trainingId === t.id) : undefined;
  return byId?.duration ?? 0;
}

export async function getChargeReelle(): Promise<ChargeReelle> {
  const [trainings, loads] = await Promise.all([getTrainings(36), getTrainingLoads().catch(() => [] as TrainingLoad[])]);
  const today = startOfToday();
  const days = Array.from({ length: 7 }, (_, i) => isoLocal(addDays(today, i - 6)));
  const prevDays = new Set(Array.from({ length: 7 }, (_, i) => isoLocal(addDays(today, i - 13))));
  const daySet = new Set(days);
  /** Quatre semaines d'avant : jours -34 a -7, semaine 0 = la plus recente. */
  const habitWeekOf = new Map<string, number>();
  for (let i = 7; i <= 34; i++) habitWeekOf.set(isoLocal(addDays(today, -i)), Math.floor((i - 7) / 7));
  const habitLoads = [0, 0, 0, 0];
  const habitSeen = [false, false, false, false];

  let totalLoad = 0;
  let totalDuration = 0;
  let rpeSum = 0;
  let rpeCount = 0;
  let estimatedCount = 0;
  let noDurationCount = 0;
  let sessionsCount = 0;
  let prevLoad = 0;
  const perDay = new Map<string, number>();

  for (const t of trainings) {
    const day = (t.date || '').slice(0, 10);
    const inWeek = daySet.has(day);
    const inPrev = prevDays.has(day);
    const hw = habitWeekOf.get(day);
    if (!inWeek && hw == null) continue;
    const rpe = rpeOf(t, loads);
    const dur = durationOf(t, loads);
    const load = dur * (rpe ?? DEFAULT_RPE);
    if (hw != null) {
      habitLoads[hw] += load;
      habitSeen[hw] = true;
    }
    if (inPrev) {
      prevLoad += load;
      continue;
    }
    sessionsCount += 1;
    totalDuration += dur;
    totalLoad += load;
    if (rpe == null) estimatedCount += 1;
    else {
      rpeSum += rpe;
      rpeCount += 1;
    }
    if (!dur) noDurationCount += 1;
    perDay.set(day, (perDay.get(day) ?? 0) + load);
  }

  const habitWeeks = habitSeen.filter(Boolean).length;
  const habitSum = habitLoads.reduce((a, b) => a + b, 0);
  const habitWeeklyLoad = habitWeeks >= 2 ? habitSum / habitWeeks : 0;

  let trend: ChargeReelle['trend'] = 'stable';
  if (totalLoad > prevLoad * 1.15) trend = 'increasing';
  else if (totalLoad < prevLoad * 0.85) trend = 'decreasing';

  return {
    totalLoad,
    averageRPE: rpeCount ? Math.round((rpeSum / rpeCount) * 10) / 10 : 0,
    totalDuration,
    sessionsCount,
    estimatedCount,
    noDurationCount,
    dailyLoads: days.map((date) => ({ date, load: perDay.get(date) ?? 0 })),
    trend,
    habitWeeklyLoad,
    habitWeeks,
  };
}
