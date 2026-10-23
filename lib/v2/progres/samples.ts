/**
 * Donnees d'exemple des ecrans vides de Progres.
 * Elles servent uniquement aux apercus en filigrane, toujours marques « exemple »,
 * et ne sont jamais enregistrees ni melangees aux vraies donnees.
 */
import type { Training } from '@/lib/database';
import type { DayWeight } from '@/lib/v2/weightStats';
import { shiftDays, todayIso } from './format';
import { yearGrid } from './year';
import type { DayCell } from './year';

/** Petit bruit regulier et reproductible, pour que l'exemple ne bouge pas a chaque affichage */
function wobble(i: number): number {
  return Math.sin(i * 1.7) * 0.35 + Math.cos(i * 0.9) * 0.2;
}

export const SAMPLE_GOAL = 78;

/** Pesees d'exemple sur deux mois, tendance qui descend doucement */
export function sampleWeightSeries(today = todayIso()): DayWeight[] {
  const out: DayWeight[] = [];
  let trend = 0;
  const days = 63;
  for (let d = days; d >= 0; d -= 3) {
    const i = days - d;
    const base = 82.4 - (i / days) * 2.6;
    const value = Math.round((base + wobble(i)) * 10) / 10;
    trend = out.length === 0 ? value : trend + 0.35 * (value - trend);
    out.push({ date: shiftDays(today, -d), value, trend: Math.round(trend * 100) / 100, hasComposition: false });
  }
  return out;
}

export type SamplePoint = { date: string; value: number; record?: boolean };

/** Courbe de force d'exemple : maximum estime au developpe couche, tampons sur les records */
export function sampleLift(today = todayIso()): { name: string; points: SamplePoint[] } {
  const vals = [70, 71.5, 71, 73, 74.5, 74, 76, 77.5, 77, 79, 80.5, 82];
  let top = 0;
  const points = vals.map((v, i) => {
    const record = i > 0 && v > top;
    top = Math.max(top, v);
    return { date: shiftDays(today, -(vals.length - 1 - i) * 9), value: v, record };
  });
  return { name: 'Développé couché', points };
}

/** Composition d'exemple : trois courbes separees, chacune son echelle */
export function sampleComposition(today = todayIso()): { fat: SamplePoint[]; muscle: SamplePoint[]; water: SamplePoint[] } {
  const n = 8;
  const mk = (from: number, to: number, k: number) =>
    Array.from({ length: n }, (_, i) => ({ date: shiftDays(today, -(n - 1 - i) * 10), value: Math.round((from + ((to - from) * i) / (n - 1) + wobble(i + k) * 0.25) * 10) / 10 }));
  return { fat: mk(22, 19.6, 1), muscle: mk(37.8, 39.6, 4), water: mk(54, 55.6, 7) };
}

/** Mensurations d'exemple pour la silhouette */
export const SAMPLE_SILHOUETTE: { key: 'shoulders' | 'chest' | 'arm' | 'waist' | 'hips' | 'thigh'; label: string; value: string; note: string; delta: number }[] = [
  { key: 'shoulders', label: 'Épaules', value: '118 cm', note: '1,5 cm de plus', delta: 1.5 },
  { key: 'chest', label: 'Poitrine', value: '102 cm', note: '1 cm de plus', delta: 1 },
  { key: 'arm', label: 'Bras', value: '36 cm', note: '8 mm de plus', delta: 0.8 },
  { key: 'waist', label: 'Taille', value: '84 cm', note: '2 cm de moins', delta: -2 },
  { key: 'hips', label: 'Hanches', value: '98 cm', note: 'stable', delta: 0 },
  { key: 'thigh', label: 'Cuisse', value: '58 cm', note: '1 cm de plus', delta: 1 },
];

/** Carte de l'annee d'exemple : trois a quatre seances par semaine, une pause au milieu */
export function sampleYearGrid(today = todayIso()): { weeks: DayCell[][]; monthMarks: { col: number; month: number }[] } {
  const fake: Training[] = [];
  for (let d = 0; d < 365; d++) {
    const date = shiftDays(today, -d);
    const dow = new Date(date + 'T12:00:00').getDay();
    const weekIdx = Math.floor(d / 7);
    if (weekIdx >= 20 && weekIdx <= 22) continue;
    const trains = dow === 1 || dow === 3 || dow === 5 || (dow === 6 && weekIdx % 2 === 0);
    if (!trains) continue;
    const minutes = [40, 60, 75, 95][(d * 7 + weekIdx) % 4];
    fake.push({ date, duration_minutes: minutes } as unknown as Training);
  }
  return yearGrid(fake, today, 53);
}
