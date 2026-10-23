/**
 * Calculs de l'espace Sante : periodes, moyennes, tendances, regroupements, formats.
 */
import { isoOf, num, thousands, shiftDays, todayIso, dayShort, daysDiff } from '@/lib/v2/progres/format';
import type { Kind, MetricDef } from './metrics';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export type Phases = { deep: number; rem: number; core: number; awake: number };
export type DayPoint = { date: string; value: number; v2?: number; phases?: Phases; source?: string };

export type Period = 'jour' | 'semaine' | 'mois' | 'an';
export const PERIOD_DAYS: Record<Period, number> = { jour: 1, semaine: 7, mois: 30, an: 365 };

/** Garde les points des n derniers jours (aujourd'hui compris) */
export function lastDays(points: DayPoint[], n: number): DayPoint[] {
  const from = shiftDays(todayIso(), -(n - 1));
  return points.filter((p) => p.date >= from);
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export type PeriodStats = { avg: number | null; min: number | null; max: number | null; total: number | null; count: number };

export function periodStats(points: DayPoint[], kind: Kind): PeriodStats {
  const vals = points.map((p) => p.value).filter((v) => Number.isFinite(v) && v > 0);
  if (vals.length === 0) return { avg: null, min: null, max: null, total: null, count: 0 };
  return {
    avg: mean(vals),
    min: Math.min(...vals),
    max: Math.max(...vals),
    total: kind === 'sum' ? vals.reduce((a, b) => a + b, 0) : null,
    count: vals.length,
  };
}

/** Tendance : moyenne des 7 derniers jours comparee aux 7 precedents, en % */
export function weekTrend(points: DayPoint[]): number | null {
  const today = todayIso();
  const cur = points.filter((p) => daysDiff(p.date, today) >= 0 && daysDiff(p.date, today) < 7).map((p) => p.value).filter((v) => v > 0);
  const prev = points.filter((p) => daysDiff(p.date, today) >= 7 && daysDiff(p.date, today) < 14).map((p) => p.value).filter((v) => v > 0);
  const a = mean(cur);
  const b = mean(prev);
  if (a === null || b === null || b === 0) return null;
  return ((a - b) / b) * 100;
}

/** Les 7 derniers jours, un point par jour (0 quand rien) */
export function sevenDays(points: DayPoint[]): DayPoint[] {
  const map = new Map(points.map((p) => [p.date, p]));
  const out: DayPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = shiftDays(todayIso(), -i);
    out.push(map.get(d) ?? { date: d, value: 0 });
  }
  return out;
}

/** Remplit chaque jour de la periode (0 quand rien), pour les barres */
export function fillDays(points: DayPoint[], n: number): DayPoint[] {
  const map = new Map(points.map((p) => [p.date, p]));
  const out: DayPoint[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = shiftDays(todayIso(), -i);
    out.push(map.get(d) ?? { date: d, value: 0 });
  }
  return out;
}

/** Sur un an : une moyenne par semaine (jours mesures seulement) */
export function weeklyBuckets(points: DayPoint[]): DayPoint[] {
  const buckets = new Map<string, number[]>();
  const today = todayIso();
  points.forEach((p) => {
    if (!(p.value > 0)) return;
    const back = daysDiff(p.date, today);
    const weekIdx = Math.floor(back / 7);
    const key = shiftDays(today, -weekIdx * 7);
    const arr = buckets.get(key) ?? [];
    arr.push(p.value);
    buckets.set(key, arr);
  });
  return Array.from(buckets.entries())
    .map(([date, vals]) => ({ date, value: mean(vals) ?? 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Derniere valeur mesuree */
export function latest(points: DayPoint[]): DayPoint | null {
  for (let i = points.length - 1; i >= 0; i--) if (points[i].value > 0) return points[i];
  return null;
}

/** Valeur du jour pour un cumul, derniere mesure sinon */
export function headline(points: DayPoint[], m: MetricDef): DayPoint | null {
  if (m.kind === 'sum') {
    const t = points.find((p) => p.date === todayIso());
    if (t && t.value > 0) return t;
    // la nuit de sommeil ou les pas d'hier si rien aujourd'hui
    return latest(points);
  }
  return latest(points);
}

export function formatValue(m: MetricDef, v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '0';
  if (m.key === 'sommeil') return hoursMinutes(v);
  if (m.digits === 0) return thousands(v);
  return num(v, m.digits);
}

/** 452 min donne 7 h 32 */
export function hoursMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const mm = Math.round(min % 60);
  if (h === 0) return `${mm} min`;
  return `${h} h ${String(mm).padStart(2, '0')}`;
}

export function unitFor(m: MetricDef): string {
  if (m.key === 'sommeil') return '';
  return m.unit;
}

/** « aujourd'hui », « hier », « 3 oct. » */
export function whenLabel(date: string | null | undefined): string {
  // audit 43 : une source sans date (profil demo, appareil ancien) ne fait plus planter l'ecran
  if (!date) return 'date inconnue';
  const d = daysDiff(date.slice(0, 10), todayIso());
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return 'hier';
  if (d < 7) return traduire("il y a {0} jours", d);
  return traduire("le {0}", dayShort(date.slice(0, 10), daysDiff(date.slice(0, 10), todayIso()) > 300));
}

export function trendText(t: number | null): string | null {
  if (t === null || !Number.isFinite(t)) return null;
  const r = Math.round(t);
  if (r === 0) return traduire('stable sur 7 jours');
  return traduire("{0}{1} % sur 7 jours", r > 0 ? '+' : '', r);
}

export function todayKey(): string {
  return isoOf(new Date());
}

export function relativeSync(iso: string | null | undefined): string {
  if (!iso) return traduire('jamais synchronisé');
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(diff)) return traduire('jamais synchronisé');
  if (diff < 1) return traduire("synchronisé à l'instant");
  if (diff < 60) return traduire("synchronisé il y a {0} min", diff);
  const h = Math.floor(diff / 60);
  if (h < 24) return traduire("synchronisé il y a {0} h", h);
  const d = Math.floor(h / 24);
  return traduirePluriel(d, d > 1, "synchronisé il y a {0} jour", "synchronisé il y a {0} jours", d);
}
