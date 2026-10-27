/**
 * Tes jours, séance par séance (27 octobre 2026). Houari : « Pour PP, Upper Lower, tous les programmes, je dois
 * pouvoir choisir mes jours : sur quel jour de la semaine je fais mon Push, mon Pull, mon Upper, mon Lower. »
 *
 * Le modèle, le plus simple qui colle au code existant :
 *  - Un programme « à la semaine » a autant de séances que de jours par semaine (Push, Pull, Upper, Lower sur 4 jours).
 *    Chaque séance a son jour : `plan[i]` est le jour de la séance i (0 = lundi), REPOS (-1) si elle n'en a pas.
 *    Exemple, le split de Houari : Push lundi, Pull mardi, repos mercredi, Upper jeudi, Lower vendredi = [0, 1, 3, 4].
 *    La séance du jour vient alors du plan, plus de l'ordre de passage : tu peux déplacer un jour en pleine semaine,
 *    l'historique (faits) et la progression (par séance, progression.ts) ne bougent pas.
 *  - Un programme « en boucle » a moins de séances que de jours (Séance A et Séance B sur 3 jours) : seuls tes jours
 *    d'entraînement comptent (ProgrammeActif.jours, comme avant), les séances s'enchaînent dans l'ordre.
 *  - Les séances de marche retirées par ta fin de séance (finSeance.ts, joursRetires) n'ont jamais de jour.
 * ProgrammeActif.jours reste tenu à jour avec les jours du plan : planning, rappels et anciennes versions le lisent.
 * Données pures, testées dans __tests__/unit/planJours.test.ts.
 */
import { joursRetires } from './finSeance';
import type { FinSeance } from './finSeance';
import type { Programme } from './types';

export const REPOS = -1;

/** Le programme se cale sur la semaine : une séance par jour d'entraînement */
export function estPlanFixe(p: Pick<Programme, 'jours' | 'joursParSemaine'>): boolean {
  return p.jours.length > 0 && p.jours.length <= 7 && p.jours.length === p.joursParSemaine;
}

/** Les séances qui peuvent avoir un jour (sans les marches retirées) */
export function indicesGardes(p: Programme, fin?: FinSeance | null): number[] {
  const retires = joursRetires(p, fin);
  const out = p.jours.map((j, i) => (retires.includes(j.id) ? -1 : i)).filter((i) => i >= 0);
  return out.length ? out : p.jours.map((_, i) => i);
}

/** Un plan lisible pour ce programme, sinon null (programme en boucle, longueur changée, rien de placé, deux séances le même jour) */
export function planValide(p: Programme, plan: unknown, fin?: FinSeance | null): number[] | null {
  if (!estPlanFixe(p) || !Array.isArray(plan) || plan.length !== p.jours.length) return null;
  const gardes = indicesGardes(p, fin);
  const out = plan.map((v, i) => (Number.isInteger(v) && v >= 0 && v <= 6 && gardes.includes(i) ? (v as number) : REPOS));
  const places = out.filter((v) => v !== REPOS);
  if (!places.length || new Set(places).size !== places.length) return null;
  return out;
}

/**
 * Le plan de départ : tes jours s'ils sont aussi nombreux que les séances, sinon les jours conseillés
 * (`conseilles(n)`, suivi.ts joursConseilles). Les séances y sont posées dans l'ordre du programme.
 */
export function planParDefaut(p: Programme, jours: readonly number[] | null | undefined, conseilles: (n: number) => number[], fin?: FinSeance | null): number[] | null {
  if (!estPlanFixe(p)) return null;
  const gardes = indicesGardes(p, fin);
  const tri = (l: readonly number[]) => Array.from(new Set(l.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort((a, b) => a - b);
  const tiens = tri(jours ?? []);
  const base = tiens.length === gardes.length ? tiens : tri(conseilles(gardes.length));
  if (base.length < gardes.length) return null;
  const plan = p.jours.map(() => REPOS);
  gardes.forEach((i, k) => {
    plan[i] = base[k];
  });
  return plan;
}

/** Les jours d'entraînement du plan (0 = lundi), triés */
export function joursDuPlan(plan: readonly number[]): number[] {
  return Array.from(new Set(plan.filter((d) => d >= 0 && d <= 6))).sort((a, b) => a - b);
}

/** La séance posée sur ce jour de la semaine (0 = lundi), REPOS sinon */
export function seanceDuJourSemaine(plan: readonly number[], jour: number): number {
  return plan.indexOf(jour);
}

/**
 * La séance `index` va sur `jour`. Ce qui était sur ce jour prend l'ancienne place de la séance (échange) :
 * chaque séance reste une seule fois dans la semaine.
 */
export function placerSeance(plan: readonly number[], index: number, jour: number): number[] {
  if (index < 0 || index >= plan.length || jour < 0 || jour > 6) return [...plan];
  const out = [...plan];
  const ancien = out[index];
  const occupant = out.indexOf(jour);
  if (occupant === index) return out;
  if (occupant >= 0) out[occupant] = ancien;
  out[index] = jour;
  return out;
}

/** Ce jour devient un jour de repos : sa séance n'a plus de jour */
export function mettreAuRepos(plan: readonly number[], jour: number): number[] {
  return plan.map((d) => (d === jour ? REPOS : d));
}

/** Les séances gardées sans jour (avertissement doux : elles ne seront pas faites cette semaine) */
export function seancesSansJour(p: Programme, plan: readonly number[], fin?: FinSeance | null): number[] {
  return indicesGardes(p, fin).filter((i) => (plan[i] ?? REPOS) === REPOS);
}

/** Les grands muscles : deux séances lourdes qui les partagent ne se suivent pas idéalement */
const GRANDS_MUSCLES = ['pectoraux', 'dos', 'jambes', 'fessiers'];

const estLourde = (j: Programme['jours'][number]) => !j.cardio && !j.rounds && j.exos.length > 0;

/**
 * Deux séances de musculation qui travaillent un même grand muscle sur deux jours qui se suivent (dimanche puis
 * lundi compris) : [jour, jour suivant, muscle]. Rien n'est bloqué, YOROI le dit seulement.
 */
export function joursTropProches(p: Programme, plan: readonly number[]): { jour: number; suivant: number; muscle: string }[] {
  const out: { jour: number; suivant: number; muscle: string }[] = [];
  for (let d = 0; d < 7; d++) {
    const a = plan.indexOf(d);
    const b = plan.indexOf((d + 1) % 7);
    if (a < 0 || b < 0 || a === b) continue;
    const ja = p.jours[a];
    const jb = p.jours[b];
    if (!estLourde(ja) || !estLourde(jb)) continue;
    const m = GRANDS_MUSCLES.find((x) => ja.muscles.includes(x) && jb.muscles.includes(x));
    if (m) out.push({ jour: d, suivant: (d + 1) % 7, muscle: m });
  }
  return out;
}

/** Même plan (pour ne réécrire que ce qui change) */
export function memePlan(a: readonly number[] | null | undefined, b: readonly number[] | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Pour montrer un programme à la semaine dont tes jours ne collent pas au nombre de séances (choisis avant le
 * 27 octobre 2026) : les séances posées dans l'ordre sur tes jours, celles en trop sans jour. Rien n'est enregistré
 * tant que tu ne touches pas un jour.
 */
export function planPartiel(p: Programme, jours: readonly number[], fin?: FinSeance | null): number[] | null {
  if (!estPlanFixe(p)) return null;
  const tri = Array.from(new Set(jours.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))).sort((a, b) => a - b);
  const plan = p.jours.map(() => REPOS);
  indicesGardes(p, fin).forEach((i, k) => {
    if (k < tri.length) plan[i] = tri[k];
  });
  return plan;
}
