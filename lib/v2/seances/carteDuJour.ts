/**
 * Ce que dit la carte du jour de l'onglet Séances (28 octobre 2026, maquette A « Aujourd'hui d'abord », avec un
 * emprunt a la maquette C). Donnees pures, testees dans __tests__/unit/seancesCarteDuJour.test.ts.
 *
 *  - la ligne de progression : « La charge monte au squat : 82,5 kg ». Elle vient de la VRAIE regle de progression
 *    des programmes (lib/v2/programmes/progression.ts, proposer), sur les memes seances que l'ecran de musculation
 *    (les semaines legeres passees ne comptent pas). Rien n'est invente : sans hausse prevue, pas de ligne ;
 *    pendant une semaine legere, pas de ligne non plus (la charge ne monte pas).
 *  - ta serie de semaines d'affilee avec ton objectif tenu : le meme calcul que l'ecran de fin de seance
 *    (lib/v2/cartes/exploits.ts, serieSemaines). La semaine en cours compte des que l'objectif est tenu ; avant,
 *    la serie s'arrete a la semaine passee.
 *  - les resumes des sections repliees (muscles, records).
 */
import type { Training } from '@/lib/database';
import { lundiIso, serieSemaines, trier } from '@/lib/v2/cartes/exploits';
import { proposer, seancesDeLExo } from '@/lib/v2/programmes/progression';
import type { ExoProgramme } from '@/lib/v2/programmes/types';
import type { MuscleLoad } from '@/lib/v2/seances/weekSummary';

type SeanceLue = Parameters<typeof seancesDeLExo>[0][number];

function plusJoursIso(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const x = new Date(y, (m || 1) - 1, (d || 1) + n, 12);
  const p = (v: number) => String(v).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

/** Les seances qui comptent dans la progression : hors semaines legeres passees (comme app/seance/muscu.tsx) */
export function horsSemainesLegeres<T extends { date: string }>(trainings: readonly T[], legeres: readonly string[] | null | undefined): T[] {
  const l = legeres ?? [];
  if (!l.length) return [...trainings];
  return trainings.filter((t) => !l.some((d) => t.date.slice(0, 10) >= d && t.date.slice(0, 10) <= plusJoursIso(d, 6)));
}

export type LigneProgression = { nom: string; kg: number };

/**
 * Le premier exercice du jour dont la charge monte selon la regle du programme, ou null.
 * `legere` : semaine legere en cours, la charge ne monte pas, pas de ligne.
 */
export function ligneProgression(exos: readonly ExoProgramme[], trainings: readonly SeanceLue[], opts?: { legeres?: readonly string[] | null; legere?: boolean }): LigneProgression | null {
  if (opts?.legere) return null;
  const base = horsSemainesLegeres(trainings, opts?.legeres);
  for (const e of exos) {
    if (e.poidsDuCorps || e.secondes) continue;
    const p = proposer(e, seancesDeLExo(base, e.nom));
    if (p.raison === 'monte' && p.nouvelleCharge && p.nouvelleCharge > 0) return { nom: e.nom, kg: p.nouvelleCharge };
  }
  return null;
}

/**
 * Semaines d'affilee avec ton objectif tenu (0 sans objectif). Meme calcul que l'ecran de fin de seance :
 * si la semaine en cours a deja son objectif, elle compte ; sinon on compte a partir de la semaine passee.
 */
export function semainesDAffilee(trainings: readonly Training[], aujourdhui: string, objectif: number): number {
  if (!(objectif > 0)) return 0;
  const tries = trier([...trainings]);
  const lundi = lundiIso(aujourdhui);
  const cetteSemaine = tries.filter((t) => lundiIso(String(t.date ?? '').slice(0, 10)) === lundi).length;
  const depuis = cetteSemaine >= objectif ? lundi : lundiIso(plusJoursIso(lundi, -7));
  return serieSemaines(tries, depuis, objectif);
}

/** Le muscle le plus travaille de la semaine (series, puis niveau), ou null */
export function musclePrincipal(loads: readonly MuscleLoad[]): MuscleLoad | null {
  const l = loads.filter((m) => m.level > 0);
  if (!l.length) return null;
  return [...l].sort((a, b) => b.sets - a.sets || b.level - a.level)[0];
}

/** La date du record le plus recent */
export function dernierRecord<T extends { date: string }>(lignes: readonly T[]): T | null {
  if (!lignes.length) return null;
  return [...lignes].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0];
}
