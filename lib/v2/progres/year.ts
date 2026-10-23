/**
 * Annee : carte des jours (plaques kozane), seances par mois, series de semaines.
 */
import type { Training } from '@/lib/database';
import { durationOf, mondayOf } from '@/lib/v2/trainingWeek';
import { daysDiff, shiftDays } from './format';

export type DayCell = { date: string; minutes: number; count: number; level: 0 | 1 | 2 | 3 | 4; afterPause: boolean; future: boolean };

export function levelFor(minutes: number, count: number): 0 | 1 | 2 | 3 | 4 {
  if (count === 0) return 0;
  if (minutes <= 0) return 1;
  if (minutes < 45) return 1;
  if (minutes < 75) return 2;
  if (minutes <= 90) return 3;
  return 4;
}

export function byDay(trainings: Training[]): Map<string, { minutes: number; count: number }> {
  const m = new Map<string, { minutes: number; count: number }>();
  for (const t of trainings) {
    const d = (t.date || '').slice(0, 10);
    if (!d) continue;
    const prev = m.get(d) ?? { minutes: 0, count: 0 };
    prev.minutes += durationOf(t);
    prev.count += 1;
    m.set(d, prev);
  }
  return m;
}

/** Semaines (colonnes lundi a dimanche) de la periode, la derniere contient aujourd'hui */
export function yearGrid(trainings: Training[], today: string, weeks = 53): { weeks: DayCell[][]; monthMarks: { col: number; month: number }[] } {
  const days = byDay(trainings);
  const sorted = Array.from(days.keys()).sort();
  const pauseEnds = new Set<string>();
  for (let i = 1; i < sorted.length; i++) {
    if (daysDiff(sorted[i - 1], sorted[i]) >= 14) pauseEnds.add(sorted[i]);
  }
  const start = shiftDays(mondayOf(today), -7 * (weeks - 1));
  const cols: DayCell[][] = [];
  const monthMarks: { col: number; month: number }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    const col: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = shiftDays(start, w * 7 + d);
      const info = days.get(date);
      col.push({
        date,
        minutes: info?.minutes ?? 0,
        count: info?.count ?? 0,
        level: levelFor(info?.minutes ?? 0, info?.count ?? 0),
        afterPause: pauseEnds.has(date),
        future: date > today,
      });
    }
    const month = Number(col[0].date.slice(5, 7)) - 1;
    const firstOfMonthInCol = col.find((c) => c.date.slice(8, 10) === '01');
    const m = firstOfMonthInCol ? Number(firstOfMonthInCol.date.slice(5, 7)) - 1 : w === 0 ? month : -1;
    if (m >= 0 && m !== lastMonth) {
      monthMarks.push({ col: w, month: m });
      lastMonth = m;
    }
    cols.push(col);
  }
  return { weeks: cols, monthMarks };
}

export function monthlyCounts(trainings: Training[], year: number): number[] {
  const out = Array.from({ length: 12 }, () => 0);
  for (const t of trainings) {
    if (!t.date || Number(t.date.slice(0, 4)) !== year) continue;
    out[Number(t.date.slice(5, 7)) - 1] += 1;
  }
  return out;
}

/** Plus longue suite de semaines avec au moins une seance, et la suite en cours */
export function weekStreaks(trainings: Training[], today: string): { best: number; current: number; bestEnd: string | null } {
  const weeks = Array.from(new Set(trainings.filter((t) => t.date).map((t) => mondayOf(t.date)))).sort();
  let best = 0;
  let bestEnd: string | null = null;
  let run = 0;
  for (let i = 0; i < weeks.length; i++) {
    run = i > 0 && daysDiff(weeks[i - 1], weeks[i]) === 7 ? run + 1 : 1;
    if (run > best) {
      best = run;
      bestEnd = weeks[i];
    }
  }
  const thisMonday = mondayOf(today);
  const set = new Set(weeks);
  let current = 0;
  // La semaine en cours compte si elle a deja une seance, sinon on part de la precedente
  let cursor = set.has(thisMonday) ? thisMonday : shiftDays(thisMonday, -7);
  while (set.has(cursor)) {
    current += 1;
    cursor = shiftDays(cursor, -7);
  }
  return { best, current, bestEnd };
}

export function yearTotals(trainings: Training[], year: number) {
  const list = trainings.filter((t) => t.date && Number(t.date.slice(0, 4)) === year);
  const minutes = list.reduce((s, t) => s + durationOf(t), 0);
  const days = new Set(list.map((t) => t.date.slice(0, 10))).size;
  const sports = new Map<string, number>();
  list.forEach((t) => sports.set(t.sport, (sports.get(t.sport) ?? 0) + 1));
  let topSport: string | null = null;
  let topCount = 0;
  sports.forEach((n, s) => {
    if (n > topCount) {
      topCount = n;
      topSport = s;
    }
  });
  return { sessions: list.length, minutes, days, topSport: topSport as string | null, topCount };
}
