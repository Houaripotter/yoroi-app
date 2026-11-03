/**
 * 3 novembre 2026 (demande de Houari) : un exercice est « validé » seulement quand toutes ses series prevues sont
 * faites ; sinon il lui manque des series, et l'app le dit clairement (« 1 série manquante »), sans le montrer comme
 * fini. Avant, un exercice laisse en route (passe au suivant apres au moins une serie) s'affichait « 2 faites »
 * en vert et grise comme un exercice termine.
 *
 * Series prevues : l'objectif de series de l'exercice (objectifSeries, retenu a sa creation), sinon ses series de
 * travail. Echauffements et drop sets ne comptent ni comme faites ni comme manquantes. Une serie ajoutee en plus,
 * une fois l'objectif atteint, n'est pas une serie manquante. Donnees pures.
 */
import { traduirePluriel } from '@/lib/i18n/tr';

type SerieEtat = { done: boolean; reps?: number; weight?: number; type?: 'normal' | 'warmup' | 'dropset' | 'superset' };
export type ExoEtat = { sets: SerieEtat[]; objectifSeries?: number };

export type EtatExo = {
  /** a_faire : rien de fait ; valide : tout est fait ; incomplet : commence, il manque des series */
  etat: 'a_faire' | 'valide' | 'incomplet';
  faites: number;
  total: number;
  manquantes: number;
  /** les series de la liste pas encore validees qui manquent (index dans sets), a mettre en evidence */
  indexManquants: number[];
};

const deTravail = (s: SerieEtat) => s.type !== 'warmup' && s.type !== 'dropset';

export function etatExo(ex: ExoEtat): EtatExo {
  const sets = Array.isArray(ex?.sets) ? ex.sets.filter(Boolean) : [];
  const travail = sets.filter(deTravail);
  const o = typeof ex?.objectifSeries === 'number' && Number.isFinite(ex.objectifSeries) && ex.objectifSeries >= 1 ? Math.round(ex.objectifSeries) : null;
  const total = o ?? travail.length;
  const faites = travail.filter((s) => s.done).length;
  const atteint = faites >= total;
  // objectif atteint : une serie ajoutee en plus et pas faite n'est pas une serie manquante
  const manquantes = atteint ? 0 : total - faites;
  const indexManquants: number[] = [];
  sets.forEach((s, i) => { if (!s.done && deTravail(s) && indexManquants.length < manquantes) indexManquants.push(i); });
  const etat = faites === 0 && sets.every((s) => !s.done) ? 'a_faire' : manquantes === 0 && faites > 0 ? 'valide' : 'incomplet';
  return { etat, faites, total, manquantes, indexManquants };
}

/** « 1 série manquante », « 2 séries manquantes » */
export function texteManquantes(n: number): string {
  return traduirePluriel(n, n > 1, '{0} série manquante', '{0} séries manquantes', n);
}
