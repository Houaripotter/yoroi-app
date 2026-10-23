/**
 * Force : maximum estime sur une repetition (formule d'Epley), records,
 * series par groupe musculaire et tonnage par semaine, a partir des exercices
 * enregistres dans les seances.
 */
import type { Training } from '@/lib/database';
import { EXERCISES } from '@/lib/exercises';
import { exercisesOf as allExercisesOf, mondayOf, tonnage, workSetsOf } from '@/lib/v2/trainingWeek';
import { shiftDays } from './format';

type SetLike = { weight: number; reps: number; type?: string };
type ExerciseLike = {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  muscle_group?: string;
  setsData?: SetLike[];
};

export type LiftPoint = { date: string; value: number; weight: number; reps: number; record: boolean };
export type Lift = { key: string; name: string; sessions: number; lastDate: string; points: LiftPoint[] };

/** Formule d'Epley, fiable jusqu'a une quinzaine de repetitions */
export function epley(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0) || reps > 15) return 0;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

/** Series de travail : regle unique de lib/v2/trainingWeek (echauffements exclus) */
function setsOf(e: ExerciseLike): SetLike[] {
  return workSetsOf(e);
}

function exercisesOf(t: Training): ExerciseLike[] {
  return allExercisesOf(t).filter((e): e is ExerciseLike => !!e.name) as ExerciseLike[];
}

const strip = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/** Nom lisible, sans la precision entre parentheses quand elle est longue */
export function niceName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

export function computeLifts(trainings: Training[]): Lift[] {
  const map = new Map<string, { name: string; lastDate: string; sessions: Set<string>; best: Map<string, { value: number; weight: number; reps: number }> }>();
  for (const t of trainings) {
    const date = (t.date || '').slice(0, 10);
    if (!date) continue;
    for (const e of exercisesOf(t)) {
      let best = { value: 0, weight: 0, reps: 0 };
      for (const s of setsOf(e)) {
        const v = epley(s.weight, s.reps);
        if (v > best.value) best = { value: v, weight: s.weight, reps: s.reps };
      }
      if (best.value <= 0) continue;
      const key = strip(e.name);
      const entry = map.get(key) ?? { name: niceName(e.name), lastDate: '', sessions: new Set<string>(), best: new Map() };
      if (date >= entry.lastDate) {
        entry.lastDate = date;
        entry.name = niceName(e.name);
      }
      entry.sessions.add(date + String(t.id ?? ''));
      const prev = entry.best.get(date);
      if (!prev || best.value > prev.value) entry.best.set(date, best);
      map.set(key, entry);
    }
  }
  const lifts: Lift[] = [];
  map.forEach((v, key) => {
    const days = Array.from(v.best.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    let top = 0;
    const points: LiftPoint[] = days.map(([date, b], i) => {
      const value = Math.round(b.value * 10) / 10;
      const record = i > 0 && value > top + 0.04;
      top = Math.max(top, value);
      return { date, value, weight: b.weight, reps: b.reps, record };
    });
    lifts.push({ key, name: v.name, sessions: v.sessions.size, lastDate: v.lastDate, points });
  });
  return lifts.sort((a, b) => b.sessions - a.sessions || (a.lastDate < b.lastDate ? 1 : -1));
}

export const MUSCLE_ORDER = ['Pectoraux', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Abdos'] as const;
export type MuscleName = (typeof MUSCLE_ORDER)[number];

const GROUP_ALIASES: Record<string, MuscleName> = {
  pectoraux: 'Pectoraux',
  pecs: 'Pectoraux',
  poitrine: 'Pectoraux',
  dos: 'Dos',
  lombaires: 'Dos',
  trapezes: 'Dos',
  epaules: 'Épaules',
  deltoides: 'Épaules',
  biceps: 'Bras',
  triceps: 'Bras',
  'avant-bras': 'Bras',
  avant_bras: 'Bras',
  bras: 'Bras',
  jambes: 'Jambes',
  quadriceps: 'Jambes',
  ischios: 'Jambes',
  'ischio-jambiers': 'Jambes',
  fessiers: 'Jambes',
  mollets: 'Jambes',
  adducteurs: 'Jambes',
  abdos: 'Abdos',
  abdominaux: 'Abdos',
  gainage: 'Abdos',
  core: 'Abdos',
};

const LIBRARY = new Map(EXERCISES.map((e) => [strip(e.name), e.muscle_group]));

export function muscleOf(e: { name: string; muscle_group?: string }): MuscleName | null {
  const g = e.muscle_group ? GROUP_ALIASES[strip(e.muscle_group)] : undefined;
  if (g) return g;
  const lib = LIBRARY.get(strip(e.name));
  if (lib && GROUP_ALIASES[strip(lib)]) return GROUP_ALIASES[strip(lib)];
  const n = strip(e.name);
  if (/couche|pec|pompe|dips|ecarte/.test(n)) return 'Pectoraux';
  if (/traction|rowing|tirage|souleve|deadlift/.test(n)) return 'Dos';
  if (/militaire|elevation|epaule|oiseau|arnold/.test(n)) return 'Épaules';
  if (/curl|biceps|triceps|barre au front|extension/.test(n)) return 'Bras';
  if (/squat|presse|fente|leg|mollet|hip thrust|fessier/.test(n)) return 'Jambes';
  if (/abdo|crunch|gainage|planche|releve/.test(n)) return 'Abdos';
  return null;
}

export function setsByMuscle(trainings: Training[], fromIso: string, toIso: string): Record<MuscleName, number> {
  const out = Object.fromEntries(MUSCLE_ORDER.map((m) => [m, 0])) as Record<MuscleName, number>;
  for (const t of trainings) {
    const d = (t.date || '').slice(0, 10);
    if (d < fromIso || d > toIso) continue;
    for (const e of exercisesOf(t)) {
      const m = muscleOf(e);
      if (!m) continue;
      out[m] += setsOf(e).length;
    }
  }
  return out;
}

/** Tonnage d'une seance : regle unique de lib/v2/trainingWeek */
export function sessionTonnage(t: Training): number {
  return tonnage(t);
}

export type WeekBar = { monday: string; value: number };

/** Tonnage des n dernieres semaines (la semaine en cours comprise) */
export function weeklyTonnage(trainings: Training[], today: string, weeks = 10): WeekBar[] {
  const thisMonday = mondayOf(today);
  const bars: WeekBar[] = Array.from({ length: weeks }, (_, i) => ({ monday: shiftDays(thisMonday, -7 * (weeks - 1 - i)), value: 0 }));
  const idx = new Map(bars.map((b, i) => [b.monday, i]));
  for (const t of trainings) {
    const k = idx.get(mondayOf(t.date));
    if (k === undefined) continue;
    bars[k].value += sessionTonnage(t);
  }
  return bars;
}

export function hasStrengthData(trainings: Training[]): boolean {
  return trainings.some((t) => exercisesOf(t).some((e) => setsOf(e).some((s) => s.weight > 0 && s.reps > 0)));
}
