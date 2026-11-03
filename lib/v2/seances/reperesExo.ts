/**
 * 2 novembre 2026 (demande de Houari) : les reperes affiches en haut de chaque exercice, en seance en direct.
 * Record de charge de tous les temps, max de la derniere seance, cran de la machine.
 *
 * Le record est lu dans computeRecords (records.ts), la source unique des cartes de record : la pastille
 * « Record 81 kg » montre exactement la charge max de la carte de l'exercice (series d'echauffement exclues).
 * Le max de la derniere fois suit la meme regle (workSets, charge la plus lourde puis le plus de repetitions).
 * Le nom francais et le nom de la bibliotheque du meme exercice donnent la meme cle (cleRecordExercice).
 * Rien d'invente : une donnee qui manque reste null et la pastille ne s'affiche pas.
 */
import type { Training } from '@/lib/database';
import { computeRecords, cleRecordExercice } from './records';
import { parseExercises, workSets } from './sessionData';
import { cranDe, type Reglages } from './reglagesMachine';
import { nomBibliotheque, nomFr } from '@/lib/v2/seance/rechercheExo';
import { libelleUnite, versUnitePoids, type UnitePoids } from '@/lib/v2/unitePoids';
import { DECIMAL } from '@/lib/i18n/tr';
import { exerciceEnPlaques, maxPlaques, recordPlaquesBattu } from './plaquesSerie';

/** `plaques` : un repere en plaques de la pile (3 novembre 2026), jamais converti en kilos */
export type SerieRepere = { weight: number; reps: number; plaques?: number };

export type ReperesExo = {
  /** charge max de tous les temps (comme la carte de record), ou meilleures repetitions au poids du corps */
  record: SerieRepere | null;
  /** la serie la plus lourde de la derniere seance ou l'exercice a des series de travail */
  derniere: { date: string; max: SerieRepere } | null;
  /**
   * 3 novembre 2026 : pour un exercice compte en plaques (lib/v2/seances/plaquesSerie.ts), le record et la derniere
   * fois en plaques, jamais convertis en kilos. Absents tant que l'exercice n'a jamais ete note en plaques.
   */
  recordPlaques?: { plaques: number; reps: number };
  dernierePlaques?: { date: string; max: { plaques: number; reps: number } };
};

export type IndexReperes = Map<string, ReperesExo>;

/** La serie la plus lourde (avec des repetitions), sinon le plus de repetitions au poids du corps */
export function serieMax(sets: { weight: number; reps: number }[]): SerieRepere | null {
  let lourde: SerieRepere | null = null;
  let corps = 0;
  for (const s of sets) {
    const w = Number(s.weight) || 0;
    const r = Number(s.reps) || 0;
    if (w > 0 && r > 0 && (!lourde || w > lourde.weight || (w === lourde.weight && r > lourde.reps))) lourde = { weight: w, reps: r };
    if (!(w > 0) && r > corps) corps = r;
  }
  if (lourde) return lourde;
  return corps > 0 ? { weight: 0, reps: corps } : null;
}

/** Reperes de tous les exercices, une fois par chargement de l'historique */
export function indexReperes(trainings: Training[]): IndexReperes {
  const index: IndexReperes = new Map();
  const entree = (k: string): ReperesExo => {
    let e = index.get(k);
    if (!e) {
      e = { record: null, derniere: null };
      index.set(k, e);
    }
    return e;
  };
  const res = computeRecords(trainings);
  for (const l of res.lines) {
    if (l.kind === 'force' && l.key.startsWith('force:')) {
      const max = l.maxLoad ?? l.bestSet;
      if (max && max.weight > 0) entree(l.key.slice(6)).record = { weight: max.weight, reps: max.reps };
    } else if (l.kind === 'reps' && l.key.startsWith('reps:') && l.best > 0) {
      const e = entree(l.key.slice(5));
      // une charge deja soulevee prime sur les repetitions au poids du corps
      if (!e.record) e.record = { weight: 0, reps: Math.round(l.best) };
    }
  }
  // meme ordre que computeRecords : la derniere seance ecrase les precedentes
  const sorted = [...trainings].filter((t) => t && t.date).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.start_time ?? '').localeCompare(b.start_time ?? '')));
  for (const t of sorted) {
    for (const ex of parseExercises(t)) {
      const name = (ex.name ?? '').trim();
      if (!name) continue;
      // 3 novembre 2026 : en plaques, le max et le record se comptent en plaques ; les series sans kilos ne sont
      // pas du poids du corps, elles n'ecrasent pas « Dernière fois » en kilos
      if (exerciceEnPlaques(ex)) {
        const mp = maxPlaques((ex.setsData ?? []).filter((s) => s && s.type !== 'warmup'));
        if (mp) {
          const e = entree(cleRecordExercice(name));
          e.dernierePlaques = { date: t.date.slice(0, 10), max: mp };
          const r = e.recordPlaques;
          if (!r || mp.plaques > r.plaques || (mp.plaques === r.plaques && mp.reps > r.reps)) e.recordPlaques = mp;
        }
        const kg = serieMax(workSets(ex));
        if (kg && kg.weight > 0) entree(cleRecordExercice(name)).derniere = { date: t.date.slice(0, 10), max: kg };
        continue;
      }
      const max = serieMax(workSets(ex));
      if (!max) continue;
      entree(cleRecordExercice(name)).derniere = { date: t.date.slice(0, 10), max };
    }
  }
  return index;
}

/** Les reperes d'un exercice, sous son nom francais comme sous son nom de bibliotheque */
export function reperesDe(index: IndexReperes, nom: string): ReperesExo {
  return index.get(cleRecordExercice(nom ?? '')) ?? { record: null, derniere: null };
}

/** Le cran de la derniere fois, sous le nom de l'exercice, son nom de bibliotheque ou son nom francais */
export function cranAvant(r: Reglages, nom: string): number | null {
  if (!nom) return null;
  return cranDe(r, nom) ?? cranDe(r, nomBibliotheque(nom)) ?? cranDe(r, nomFr(nom));
}

/** Le cran a afficher : celui note pendant la seance, sinon celui de la derniere fois ; null si aucun */
export function cranAffiche(cranSeance: number | null | undefined, avant: number | null): number | null {
  const v = cranSeance !== undefined ? cranSeance : avant;
  return typeof v === 'number' && v > 0 ? v : null;
}

/**
 * Record battu pendant la seance : une serie faite (hors echauffement) plus lourde que le record,
 * ou, pour un record au poids du corps, plus de repetitions sans charge. Sans record, rien (premiere fois).
 */
export function recordBattu(record: SerieRepere | null, sets: { weight: number; reps: number; done?: boolean; type?: string }[]): boolean {
  if (!record) return false;
  const faites = sets.filter((s) => s && s.done && s.type !== 'warmup');
  if (record.weight > 0) return faites.some((s) => (Number(s.reps) || 0) > 0 && (Number(s.weight) || 0) > record.weight + 1e-9);
  return faites.some((s) => !((Number(s.weight) || 0) > 0) && (Number(s.reps) || 0) > record.reps);
}

/** 3 novembre 2026 : record en plaques battu pendant la seance (series faites hors echauffement) */
export function recordPlaquesBattuEnSeance(record: { plaques: number; reps: number } | null | undefined, sets: { reps: number; plaques?: number; done?: boolean; type?: string }[]): boolean {
  if (!record) return false;
  return sets.some((s) => s && s.done && s.type !== 'warmup' && recordPlaquesBattu(record, [], s));
}

/** « 81 kg », « 178,57 lb » : la charge seule, comme setLabel */
export function libelleCharge(kg: number, unite: UnitePoids = 'kg'): string {
  const w = String(Math.round(versUnitePoids(kg, unite) * 100) / 100).replace('.', DECIMAL);
  return `${w} ${libelleUnite(unite)}`;
}

/** La serie de meme numero de la derniere fois, series de travail d'abord (jamais l'echauffement s'il y en a) */
export function serieDerniereFois<S>(h: { lastSets: S[]; travail?: S[] } | undefined, i: number): S | undefined {
  if (!h) return undefined;
  const l = h.travail && h.travail.length > 0 ? h.travail : h.lastSets;
  if (!l || l.length === 0) return undefined;
  return l[Math.min(i, l.length - 1)];
}
