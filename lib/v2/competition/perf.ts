/**
 * Calculs de l'ecran Performance : charge (intensite x duree), volume et intensite par semaine.
 */
import type { Training } from '@/lib/database';
import { isoLocal, parseLocalDate } from './dates';

export type Period = '7d' | '30d' | '90d' | 'all';
export const PERIOD_DAYS: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90, all: 3650 };
export const PERIOD_LABELS: Record<Period, string> = { '7d': '7 jours', '30d': '30 jours', '90d': '3 mois', all: 'Tout' };

export const minutesOf = (t: Training) => t.duration_minutes ?? t.duration ?? 60;
export const rpeOf = (t: Training) => t.intensity ?? 5;

export function filterPeriod(trainings: Training[], period: Period): Training[] {
  const cutoff = Date.now() - PERIOD_DAYS[period] * 86400000;
  return trainings.filter((t) => parseLocalDate(t.date).getTime() >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
}

/** Lundi de la semaine, au format AAAA-MM-JJ */
export function weekStart(iso: string): string {
  const d = parseLocalDate(iso);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return isoLocal(d);
}

export function weekNumber(iso: string): number {
  const d = parseLocalDate(iso);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7);
}

export function loadByDay(list: Training[]): { date: string; value: number }[] {
  const m = new Map<string, number>();
  list.forEach((t) => {
    const k = t.date.slice(0, 10);
    m.set(k, (m.get(k) ?? 0) + (rpeOf(t) * minutesOf(t)) / 60);
  });
  return Array.from(m.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value: Math.round(value * 10) / 10 }));
}

export function byWeek(list: Training[]): { week: string; hours: number; rpe: number; count: number }[] {
  const m = new Map<string, { min: number; rpe: number; n: number }>();
  list.forEach((t) => {
    const k = weekStart(t.date.slice(0, 10));
    const c = m.get(k) ?? { min: 0, rpe: 0, n: 0 };
    c.min += minutesOf(t);
    c.rpe += rpeOf(t);
    c.n += 1;
    m.set(k, c);
  });
  return Array.from(m.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, c]) => ({ week, hours: c.min / 60, rpe: c.rpe / c.n, count: c.n }));
}
