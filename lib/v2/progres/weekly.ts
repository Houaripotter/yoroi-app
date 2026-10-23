/**
 * Regroupement des seances par semaine (lundi), sans trou : chaque semaine de la periode
 * a sa barre, meme vide. Sert aux ecrans Ton activite et Performance.
 */
import type { Training } from '@/lib/database';
import { mondayOf } from '@/lib/v2/trainingWeek';
import { isoOf, shiftDays } from './format';
import { shortMonth } from '@/lib/v2/weightStats';

export type WeekBucket = {
  /** lundi de la semaine, AAAA-MM-JJ */
  week: string;
  minutes: number;
  count: number;
  rpeSum: number;
  rpeN: number;
  /** effort ressenti fois heures, additionne */
  load: number;
};

/**
 * Semaines de la periode, du plus ancien au plus recent.
 * days null : depuis la premiere seance (au plus 104 semaines).
 * minutesOf et rpeOf permettent de garder la regle de chaque ecran.
 */
export function weekBuckets(
  trainings: Training[],
  days: number | null,
  minutesOf: (t: Training) => number,
  rpeOf: (t: Training) => number | null,
): WeekBucket[] {
  const today = isoOf(new Date());
  const valid = trainings.filter((t) => t && t.date);
  let start: string;
  if (days) start = shiftDays(today, -days + 1);
  else if (valid.length) start = valid.reduce((m, t) => (t.date.slice(0, 10) < m ? t.date.slice(0, 10) : m), today);
  else start = today;
  const firstMonday = mondayOf(start);
  const lastMonday = mondayOf(today);
  const map = new Map<string, WeekBucket>();
  let w = firstMonday;
  let guard = 0;
  while (w <= lastMonday && guard < 104) {
    map.set(w, { week: w, minutes: 0, count: 0, rpeSum: 0, rpeN: 0, load: 0 });
    w = shiftDays(w, 7);
    guard += 1;
  }
  valid.forEach((t) => {
    const d = t.date.slice(0, 10);
    if (d < start || d > today) return;
    const b = map.get(mondayOf(d));
    if (!b) return;
    const min = minutesOf(t);
    const rpe = rpeOf(t);
    b.minutes += min;
    b.count += 1;
    if (rpe !== null && rpe > 0) {
      b.rpeSum += rpe;
      b.rpeN += 1;
      b.load += (rpe * min) / 60;
    }
  });
  return Array.from(map.values()).sort((a, b) => (a.week < b.week ? -1 : 1));
}

/**
 * Etiquette d'une barre de semaine : « 14 sept. » quand il y a peu de barres,
 * sinon seulement le mois, sur la premiere semaine de chaque mois.
 */
export function weekLabels(weeks: string[]): string[] {
  if (weeks.length <= 6) return weeks.map((w) => `${Number(w.slice(8, 10))} ${shortMonth(w)}`);
  let lastMonth = '';
  return weeks.map((w) => {
    const m = w.slice(0, 7);
    if (m === lastMonth) return '';
    lastMonth = m;
    return shortMonth(w);
  });
}

/** « 115 h 24 », « 45 min » */
export function hoursText(minutes: number): string {
  const m = Math.round(minutes);
  if (m <= 0) return '0 h';
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, '0')}`;
}
