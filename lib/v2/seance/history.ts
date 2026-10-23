/**
 * Historique par exercice : derniere seance, meilleure charge, meilleur max estime.
 * Sert a pre-remplir les series et a reperer les records.
 */
import type { Training } from '@/lib/database';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { versUnitePoids } from '@/lib/v2/unitePoids';

export type SetValue = { weight: number; reps: number };

export type ExerciseHistory = {
  name: string;
  muscle?: string;
  lastDate: string;
  lastSets: SetValue[];
  bestWeight: number;
  bestE1rm: number;
  count: number;
};

export type LibraryItem = { name: string; muscle: string; key: string };

/** Nom normalise pour comparer : sans accents, sans casse, espaces reduits */
export function normName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Max estime sur une repetition, formule d'Epley */
export function epley(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0;
  if (reps === 1) return weight;
  // 18 octobre (audit) : meme borne que Progres et Records (au-dela de 15 repetitions, pas de max estime)
  if (reps > 15) return 0;
  return weight * (1 + reps / 30);
}

function setsOf(e: { sets?: number; reps?: number; weight?: number; setsData?: { weight: number; reps: number }[] }): SetValue[] {
  if (Array.isArray(e.setsData) && e.setsData.length > 0) {
    return e.setsData.map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }));
  }
  const n = Math.max(1, Math.min(Number(e.sets) || 1, 20));
  const w = Number(e.weight) || 0;
  const r = Number(e.reps) || 0;
  return Array.from({ length: n }, () => ({ weight: w, reps: r }));
}

function sortKey(t: Training): string {
  return `${t.date.slice(0, 10)} ${t.start_time ?? '00:00'}`;
}

/** Construit l'historique de chaque exercice, du plus recent au plus ancien */
export function buildExerciseHistory(trainings: Training[]): { map: Map<string, ExerciseHistory>; recent: string[] } {
  const map = new Map<string, ExerciseHistory>();
  const recent: string[] = [];
  const sorted = [...trainings].sort((a, b) => (sortKey(a) < sortKey(b) ? 1 : -1));
  for (const t of sorted) {
    for (const e of t.exercises ?? []) {
      if (!e || !e.name) continue;
      const sets = setsOf(e).filter((s) => s.weight > 0 || s.reps > 0);
      if (sets.length === 0) continue;
      const key = normName(e.name);
      const bestW = Math.max(...sets.map((s) => s.weight));
      const bestE = Math.max(...sets.map((s) => epley(s.weight, s.reps)));
      const h = map.get(key);
      if (!h) {
        map.set(key, { name: e.name, muscle: e.muscle_group, lastDate: t.date.slice(0, 10), lastSets: sets, bestWeight: bestW, bestE1rm: bestE, count: 1 });
        recent.push(key);
      } else {
        h.bestWeight = Math.max(h.bestWeight, bestW);
        h.bestE1rm = Math.max(h.bestE1rm, bestE);
        h.count += 1;
        if (!h.muscle && e.muscle_group) h.muscle = e.muscle_group;
      }
    }
  }
  return { map, recent };
}

const STRENGTH_CATEGORIES = new Set(['musculation', 'crossfit', 'street_workout', 'hyrox']);

let libraryCache: LibraryItem[] | null = null;

/** Bibliotheque d'exercices de force (constants/exerciseLibrary.ts), sans doublons */
export function strengthLibrary(): LibraryItem[] {
  if (libraryCache) return libraryCache;
  const seen = new Set<string>();
  const out: LibraryItem[] = [];
  for (const e of EXERCISE_LIBRARY) {
    if (!STRENGTH_CATEGORIES.has(e.category)) continue;
    if (e.unit !== 'reps') continue;
    const key = normName(e.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: e.name, muscle: e.muscle ?? e.category.toUpperCase(), key });
  }
  libraryCache = out;
  return out;
}

/** Groupes musculaires dans l'ordre d'affichage */
export const MUSCLE_ORDER = ['PECTORAUX', 'DOS', 'ÉPAULES', 'JAMBES', 'FESSIERS', 'ISCHIOS', 'BICEPS', 'TRICEPS', 'ABDOS', 'MOLLETS', 'AVANT-BRAS'];

/** Resume court d'une serie : "72,5 kg × 8" */
export function setLabel(s: SetValue, unite: 'kg' | 'lb' = 'kg'): string {
  // 18 octobre 2026 : en livres, la charge (stockee en kilos) est montree en livres
  const w = String(Math.round(versUnitePoids(s.weight, unite) * 100) / 100).replace('.', ',');
  if (s.weight > 0) return `${w} ${unite} × ${s.reps}`;
  return `${s.reps} répétitions`;
}

/** Meilleure serie (charge la plus lourde, puis le plus de repetitions) */
export function bestSet(sets: SetValue[]): SetValue | null {
  if (sets.length === 0) return null;
  return [...sets].sort((a, b) => (b.weight - a.weight) || (b.reps - a.reps))[0];
}
