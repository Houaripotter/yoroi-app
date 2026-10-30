/**
 * Force : maximum estime sur une repetition (formule d'Epley), records,
 * series par groupe musculaire et tonnage par semaine, a partir des exercices
 * enregistres dans les seances.
 */
import type { Training } from '@/lib/database';
import { EXERCISES } from '@/lib/exercises';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { NOMS_FR } from '@/lib/v2/seance/rechercheExo';
import { sansPrise } from '@/lib/v2/seance/prise';
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

/**
 * 30 octobre 2026 (verification du lien avec les exercices de l'app) : la petite liste ci dessus (58 exercices) ne
 * connait pas la bibliotheque des seances et des programmes (constants/exerciseLibrary.ts). Un exercice enregistre
 * sans groupe musculaire retrouve le sien dans la bibliotheque, par son nom ou par son nom francais affiche.
 */
let bibliotheque: Map<string, string> | null = null;
function muscleBibliotheque(nom: string): string | undefined {
  if (!bibliotheque) {
    bibliotheque = new Map();
    for (const e of EXERCISE_LIBRARY) if (e.muscle && !bibliotheque.has(strip(e.name))) bibliotheque.set(strip(e.name), e.muscle);
    for (const [biblio, fr] of Object.entries(NOMS_FR)) {
      const m = bibliotheque.get(strip(biblio));
      if (m && !bibliotheque.has(strip(fr))) bibliotheque.set(strip(fr), m);
    }
  }
  return bibliotheque.get(strip(sansPrise(nom).base));
}

export function muscleOf(e: { name: string; muscle_group?: string }): MuscleName | null {
  const g = e.muscle_group ? GROUP_ALIASES[strip(e.muscle_group)] : undefined;
  if (g) return g;
  const lib = LIBRARY.get(strip(e.name));
  if (lib && GROUP_ALIASES[strip(lib)]) return GROUP_ALIASES[strip(lib)];
  const biblio = muscleBibliotheque(e.name);
  if (biblio && GROUP_ALIASES[strip(biblio)]) return GROUP_ALIASES[strip(biblio)];
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

/**
 * Exercices qui stagnent (24 octobre 2026), regle visible et simple, jamais un score invente :
 * tu as fait l'exercice au moins 2 fois ces 3 dernieres semaines et au moins 2 fois les 6 semaines d'avant,
 * et ton meilleur maximum estime recent ne depasse pas celui d'avant. On affiche depuis quand dure le dernier record.
 * Ce qui aide alors, d'apres les etudes : fiche « Je stagne » (volume, proximite de l'echec, progression notee).
 */
export type Stagnation = { key: string; name: string; semaines: number };

export function stagnations(lifts: Lift[], today: string, max = 3): Stagnation[] {
  const out: Stagnation[] = [];
  for (const l of lifts) {
    const recents = l.points.filter((p) => daysBetween(p.date, today) <= 21);
    const avant = l.points.filter((p) => daysBetween(p.date, today) > 21 && daysBetween(p.date, today) <= 63);
    if (recents.length < 2 || avant.length < 2) continue;
    const bestRecent = Math.max(...recents.map((p) => p.value));
    const bestAvant = Math.max(...avant.map((p) => p.value));
    if (bestRecent > bestAvant + 0.04) continue;
    // depuis quand : la date du meilleur maximum estime jusqu'ici
    const top = l.points.reduce((b, p) => (p.value > b.value + 0.04 ? p : b), l.points[0]);
    const semaines = Math.max(3, Math.floor(daysBetween(top.date, today) / 7));
    out.push({ key: l.key, name: l.name, semaines });
  }
  return out.sort((a, b) => b.semaines - a.semaines).slice(0, max);
}

/**
 * Un essai à tester 4 semaines quand un exercice stagne (24 octobre 2026). Une seule piste, choisie sur tes
 * données, sans prétendre connaître la cause :
 * moins de 1,5 fois par semaine : le faire 2 fois (Grgic 2018, la fréquence aide la force) ;
 * peu de séries pour le muscle : en ajouter (Schoenfeld 2017, Ralston 2017, plus de séries, plus de progrès) ;
 * beaucoup de séries : une semaine légère d'abord (Bell 2023, consensus d'entraîneurs) ;
 * sinon : changer de fourchette de répétitions (Schoenfeld 2017, charges lourdes ou légères marchent toutes deux).
 * Les bras et les jambes regroupent plusieurs muscles : leurs seuils sont doublés.
 */
export type Essai = 'frequence' | 'volume' | 'legere' | 'reps';
export function essaiPourStagnation(l: Lift, trainings: Training[], today: string): Essai {
  const parSemaine = l.points.filter((p) => daysBetween(p.date, today) <= 42).length / 6;
  if (parSemaine < 1.5) return 'frequence';
  const muscle = muscleOf({ name: l.name });
  if (!muscle) return 'reps';
  const debut = new Date(new Date(today + 'T12:00:00').getTime() - 27 * 86400000).toISOString().slice(0, 10);
  const series = setsByMuscle(trainings, debut, today)[muscle] / 4;
  const k = muscle === 'Jambes' || muscle === 'Bras' ? 2 : 1;
  if (series < 10 * k) return 'volume';
  if (series >= 20 * k) return 'legere';
  return 'reps';
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);
}
