/**
 * Objectif de chaque exercice en seance (30 octobre 2026) : toujours dire combien de series faire.
 * Series : celles prevues par le programme ou la seance (retenues a la creation de l'exercice), sinon
 * les series de la liste, sinon 3. Repetitions : celles du programme, sinon celles de « Mes seances »,
 * sinon rien (on n'invente pas de repetitions). Une serie ajoutee en plus ne repousse pas l'objectif.
 * Donnees pures.
 */
import { traduire } from '@/lib/i18n/tr';

export const SERIES_PAR_DEFAUT = 3;

type SerieLike = { done: boolean; type?: 'normal' | 'warmup' | 'dropset' | 'superset' };
export type ExoObjectif = {
  sets: SerieLike[];
  cible?: { repsMin: number; repsMax: number; secondes?: boolean };
  objectifSeries?: number;
  objectifReps?: number;
};

export type Objectif = {
  /** series visees */
  total: number;
  /** series de travail faites */
  faites: number;
  /** numero de la prochaine serie a faire (1 = la premiere), null quand tout est fait */
  prochaine: number | null;
  /** repetitions (ou secondes) visees, null si aucune donnee fiable */
  reps: { min: number; max: number; secondes: boolean } | null;
  atteint: boolean;
};

const deTravail = (s: SerieLike) => s.type !== 'warmup' && s.type !== 'dropset';
const entier = (n: unknown): number | null => (typeof n === 'number' && Number.isFinite(n) && n >= 1 ? Math.round(n) : null);

/** Series a viser pour cette liste de series, a garder sur l'exercice des sa creation */
export function seriesVisees(sets: SerieLike[]): number {
  return sets.filter(deTravail).length || SERIES_PAR_DEFAUT;
}

export function objectifExo(ex: ExoObjectif): Objectif {
  const travail = ex.sets.filter(deTravail);
  const total = entier(ex.objectifSeries) ?? (travail.length || SERIES_PAR_DEFAUT);
  const faites = travail.filter((s) => s.done).length;
  const reste = ex.sets.some((s) => !s.done);
  const prochaine = reste ? faites + 1 : null;
  let reps: Objectif['reps'] = null;
  const min = entier(ex.cible?.repsMin);
  if (ex.cible && min !== null) reps = { min, max: Math.max(min, entier(ex.cible.repsMax) ?? min), secondes: !!ex.cible.secondes };
  else if (entier(ex.objectifReps) !== null) reps = { min: entier(ex.objectifReps)!, max: entier(ex.objectifReps)!, secondes: false };
  return { total, faites, prochaine, reps, atteint: faites >= total };
}

/** « Série 2 sur 4 », ou « Série 5, en plus » au dela de l'objectif */
export function texteSerie(o: Objectif, numero: number): string {
  return numero > o.total ? traduire('Série {0}, en plus', numero) : traduire('Série {0} sur {1}', numero, o.total);
}

/** « 8 à 12 répétitions », « 10 répétitions », « 30 à 45 secondes » ; null sans donnee */
export function texteReps(o: Objectif): string | null {
  if (!o.reps) return null;
  const { min, max, secondes } = o.reps;
  if (secondes) return min === max ? traduire('{0} secondes', min) : traduire('{0} à {1} secondes', min, max);
  return min === max ? traduire('{0} répétitions', min) : traduire('{0} à {1} répétitions', min, max);
}
