/**
 * Calculs du suivi de poids (refonte v2).
 * La tendance lisse les variations d'un jour a l'autre (eau, repas),
 * c'est elle qu'on montre en premier, les pesees brutes restent visibles en points.
 */
import type { Weight } from '@/lib/database';

export type DayWeight = {
  id?: number;
  date: string; // yyyy-MM-dd
  value: number;
  trend: number;
  hasComposition: boolean;
};

const ALPHA = 0.2;

export function toDailySeries(weights: Weight[]): DayWeight[] {
  const byDate = new Map<string, Weight>();
  for (const w of weights) {
    if (!w || !w.date || !(w.weight > 0)) continue;
    const day = w.date.slice(0, 10);
    const prev = byDate.get(day);
    // Une pesee par jour : on garde la plus recente saisie
    if (!prev || (w.id ?? 0) > (prev.id ?? 0)) byDate.set(day, w);
  }
  const days = Array.from(byDate.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  let trend = 0;
  return days.map(([date, w], i) => {
    trend = i === 0 ? w.weight : trend + ALPHA * (w.weight - trend);
    return {
      id: w.id,
      date,
      value: w.weight,
      trend: Math.round(trend * 100) / 100,
      hasComposition: !!(w.fat_percent || w.muscle_percent || w.water_percent),
    };
  });
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T12:00:00') - Date.parse(a + 'T12:00:00')) / 86400000);
}

export function filterPeriod(series: DayWeight[], days: number | null): DayWeight[] {
  if (!days || series.length === 0) return series;
  const last = series[series.length - 1].date;
  return series.filter((p) => daysBetween(p.date, last) <= days);
}

/** Moyenne des pesees des 7 derniers jours */
export function average7(series: DayWeight[]): number | null {
  const recent = filterPeriod(series, 6);
  if (recent.length === 0) return null;
  return recent.reduce((s, p) => s + p.value, 0) / recent.length;
}

/** Variation de la tendance par semaine, sur les 28 derniers jours (regression lineaire) */
export function weeklyRate(series: DayWeight[]): number | null {
  const recent = filterPeriod(series, 28);
  if (recent.length < 4) return null;
  const x0 = recent[0].date;
  const xs = recent.map((p) => daysBetween(x0, p.date));
  const ys = recent.map((p) => p.trend);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) * (xs[i] - mx);
  }
  if (den === 0) return null;
  return (num / den) * 7;
}

export function lowestPoint(series: DayWeight[]): DayWeight | null {
  if (series.length === 0) return null;
  return series.reduce((m, p) => (p.value < m.value ? p : m), series[0]);
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function formatKg(v: number, digits = 1): string {
  return v.toFixed(digits).replace('.', ',');
}

export function formatLongDate(date: string): string {
  const d = new Date(date + 'T12:00:00');
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function monthName(date: string): string {
  const d = new Date(date + 'T12:00:00');
  const m = MONTHS[d.getMonth()];
  return m.charAt(0).toUpperCase() + m.slice(1);
}

export function shortMonth(date: string): string {
  return MONTHS_SHORT[new Date(date + 'T12:00:00').getMonth()];
}

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
