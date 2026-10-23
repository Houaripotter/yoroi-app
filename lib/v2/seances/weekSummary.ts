/**
 * Chiffres sportifs de l'onglet Seances : bilan de la semaine (seances, tonnage, temps),
 * muscles travailles, derniere seance et sport principal de l'utilisateur.
 */
import type { Training } from '@/lib/database';
import { muscleOf, sessionTonnage, MUSCLE_ORDER } from '@/lib/v2/progres/strength';
import type { MuscleName } from '@/lib/v2/progres/strength';
import { durationOf, mondayOf, setsCount, tonnageParts } from '@/lib/v2/trainingWeek';
import { libelleUnite, versUnitePoids, type UnitePoids } from '@/lib/v2/unitePoids';
import { familyOf, firstSport, parseExercises, parseRounds, workSets } from './sessionData';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

export { MUSCLE_ORDER };
export type { MuscleName };

export type WeekSummary = { sessions: number; tonnageKg: number; minutes: number; sets: number };

function inWeek(t: Training, monday: string, today: string): boolean {
  const d = (t.date || '').slice(0, 10);
  return d >= monday && d <= today;
}

export function weekSummary(trainings: Training[], today: string): WeekSummary {
  const monday = mondayOf(today);
  const out: WeekSummary = { sessions: 0, tonnageKg: 0, minutes: 0, sets: 0 };
  for (const t of trainings) {
    if (!inWeek(t, monday, today)) continue;
    out.sessions += 1;
    out.tonnageKg += sessionTonnage(t);
    out.minutes += durationOf(t);
    out.sets += sessionSets(t);
  }
  return out;
}

/** Series de travail d'une seance : regle unique de lib/v2/trainingWeek */
export function sessionSets(t: Training): number {
  return setsCount(t);
}

/** « 1,2 t » ou « 850 kg » */
export function formatTonnage(kg: number, unite: UnitePoids = 'kg'): { value: string; unit: string } {
  return tonnageParts(kg, unite);
}

/** « 3 h 20 » coupe en valeur et unite pour les gros chiffres */
export function formatHours(min: number): { value: string; unit: string } {
  if (min < 60) return { value: String(Math.round(min)), unit: 'min' };
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return { value: m ? `${h} h ${String(m).padStart(2, '0')}` : String(h), unit: m ? '' : 'h' };
}

export type MuscleLoad = {
  name: MuscleName;
  /** series de musculation reelles */
  sets: number;
  /** sollicite par un autre sport (combat, cardio), sans series comptees */
  engaged: boolean;
  /** 0 a 3, pour la couleur de la silhouette */
  level: 0 | 1 | 2 | 3;
};

/** Groupes sollicites par les sports sans series (repere visuel, jamais affiche en chiffres) */
const ENGAGED_BY_FAMILY: Record<string, MuscleName[]> = {
  combat_pied: ['Épaules', 'Bras', 'Abdos', 'Jambes'],
  combat_sol: ['Dos', 'Bras', 'Abdos', 'Jambes'],
  cardio: ['Jambes'],
};

export function weekMuscles(trainings: Training[], today: string): MuscleLoad[] {
  const monday = mondayOf(today);
  const sets: Record<string, number> = {};
  const engaged = new Set<string>();
  for (const t of trainings) {
    if (!inWeek(t, monday, today)) continue;
    const exs = parseExercises(t);
    let counted = false;
    for (const e of exs) {
      const m = muscleOf(e as any);
      if (!m) continue;
      const n = workSets(e).length;
      if (n > 0) {
        sets[m] = (sets[m] ?? 0) + n;
        counted = true;
      }
    }
    if (!counted) for (const m of ENGAGED_BY_FAMILY[familyOf(t.sport)] ?? []) engaged.add(m);
  }
  return MUSCLE_ORDER.map((name) => {
    const s = sets[name] ?? 0;
    const e = engaged.has(name);
    const level: 0 | 1 | 2 | 3 = s >= 10 ? 3 : s >= 4 ? 2 : s > 0 || e ? 1 : 0;
    return { name, sets: s, engaged: e && s === 0, level };
  });
}

/** Sport principal : le premier favori, sinon le plus pratique, sinon la musculation */
export function mainSport(favoris: string[] | undefined, trainings: Training[]): string {
  if (favoris && favoris.length > 0 && favoris[0]) return favoris[0];
  const counts = new Map<string, number>();
  trainings.slice(0, 80).forEach((t) => {
    const s = firstSport(t.sport);
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'musculation';
}

/** Sports a proposer en raccourci : favoris, puis les plus pratiques, puis les defauts */
export function shortcutSports(favoris: string[] | undefined, trainings: Training[], defaults: string[], max = 4): string[] {
  const counts = new Map<string, number>();
  trainings.slice(0, 80).forEach((t) => {
    const s = firstSport(t.sport);
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  });
  const practiced = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([s]) => s);
  const out: string[] = [];
  for (const s of [...(favoris ?? []), ...practiced, ...defaults]) if (s && !out.includes(s)) out.push(s);
  return out.slice(0, max);
}

/** Resume chiffre d'une seance, pour la carte « Ta derniere seance » */
export type SessionFacts = { minutes: number; sets: number; tonnageKg: number; rounds: number; distanceKm: number };

export function sessionFacts(t: Training): SessionFacts {
  return {
    minutes: durationOf(t),
    sets: sessionSets(t),
    tonnageKg: sessionTonnage(t),
    rounds: parseRounds(t).length || t.rounds || 0,
    distanceKm: t.distance || 0,
  };
}

/** Meilleure serie de chaque exercice (les trois premiers) */
export function topExercises(t: Training, max = 3, unite: UnitePoids = 'kg'): { name: string; best: string; sets: number }[] {
  return parseExercises(t)
    .filter((e) => e && e.name)
    .slice(0, max)
    .map((e) => {
      const s = workSets(e);
      const top = s.reduce<{ weight: number; reps: number } | null>((b, x) => (!b || (x.weight || 0) * 100 + (x.reps || 0) > b.weight * 100 + b.reps ? { weight: x.weight || 0, reps: x.reps || 0 } : b), null);
      const fmt = (n: number) => (Math.round(n * 10) / 10).toString().replace('.', DECIMAL);
      const best = top ? (top.weight > 0 ? `${fmt(versUnitePoids(top.weight, unite))} ${libelleUnite(unite)} × ${top.reps}` : traduire("{0} répétitions", top.reps)) : '';
      return { name: e.name, best, sets: s.length };
    });
}
