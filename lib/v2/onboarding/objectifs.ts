/**
 * Objectifs de l'onboarding en choix multiples (vague 29), avec leurs compatibilites :
 *  - Perdre du poids et Me maintenir s'excluent (deux sens opposes pour le poids) ;
 *  - Prendre du muscle va avec Perdre du poids (recomposition : le poids baisse lentement),
 *    avec Me maintenir (poids stable) ou seul (prise de poids lente) ;
 *  - Performer en combat va avec tout.
 * Le sens du poids (cap, estimation, plan) decoule de la combinaison. Fonctions pures, testees par un script node.
 */
import type { Goal } from './draft';

/** Sens du poids pour le cap et l'estimation */
export type Sens = 'baisse' | 'recompo' | 'stable' | 'hausse' | 'categorie' | 'aucun';

/** Ordre d'affichage et d'enregistrement */
export const ORDRE_OBJECTIFS: Goal[] = ['lose', 'gain', 'combat', 'maintain'];

const EXCLUS: Partial<Record<Goal, Goal[]>> = { lose: ['maintain'], maintain: ['lose'] };

export function isGoal(v: unknown): v is Goal {
  return typeof v === 'string' && (ORDRE_OBJECTIFS as string[]).includes(v);
}

/** Liste propre : sans doublon, sans valeur inconnue, sans paire incompatible (la premiere dans l'ordre gagne) */
export function objectifsPropres(list: unknown): Goal[] {
  const raw = Array.isArray(list) ? list.filter(isGoal) : [];
  const out: Goal[] = [];
  for (const g of ORDRE_OBJECTIFS) {
    if (!raw.includes(g)) continue;
    if ((EXCLUS[g] ?? []).some((x) => out.includes(x))) continue;
    out.push(g);
  }
  return out;
}

/**
 * Coche ou decoche un objectif. Un choix incompatible decoche l'autre, avec une phrase douce qui explique.
 */
export function toggleObjectif(list: Goal[], id: Goal): { list: Goal[]; note: string | null } {
  const cur = objectifsPropres(list);
  if (cur.includes(id)) return { list: cur.filter((g) => g !== id), note: null };
  const retires = (EXCLUS[id] ?? []).filter((g) => cur.includes(g));
  const next = ORDRE_OBJECTIFS.filter((g) => g === id || (cur.includes(g) && !retires.includes(g)));
  let note: string | null = null;
  if (retires.length) {
    note = id === 'lose'
      ? 'Perdre du poids et le maintenir vont dans deux sens, on garde Perdre du poids.'
      : 'Te maintenir et perdre du poids vont dans deux sens, on garde Me maintenir.';
  }
  return { list: next, note };
}

export function sensDe(list: Goal[]): Sens {
  const l = objectifsPropres(list);
  if (l.includes('lose')) return l.includes('gain') ? 'recompo' : 'baisse';
  if (l.includes('maintain')) return 'stable';
  if (l.includes('gain')) return 'hausse';
  if (l.includes('combat')) return 'categorie';
  return 'aucun';
}

/** Ce que donne la combinaison, en une phrase (sous les cartes) */
export function phraseCombinaison(list: Goal[]): string | null {
  const l = objectifsPropres(list);
  const combat = l.includes('combat');
  const s = sensDe(l);
  if (s === 'recompo') return 'Perdre du gras et prendre du muscle : une recomposition. Ton poids baisse lentement.';
  if (s === 'stable' && l.includes('gain')) return 'Ton poids reste stable pendant que le muscle se construit.';
  if (s === 'hausse') return combat ? 'Une prise de poids lente, pour du muscle plutôt que du gras, sans perdre ta forme de combat.' : 'Une prise de poids lente, pour du muscle plutôt que du gras.';
  if (s === 'baisse' && combat) return 'Ton poids baisse, ta forme de combat reste au centre.';
  if (s === 'stable' && combat) return 'Ton poids reste stable, ta forme de combat reste au centre.';
  if (s === 'categorie') return 'Ta catégorie de poids guidera ton cap, si tu en as une.';
  return null;
}

/**
 * Objectif principal, pour les anciens appelants qui n'en lisent qu'un (brouillon goal, paywall, seances suggerees).
 * Perdre passe en premier (aussi en recomposition), puis le maintien, le muscle, le combat.
 */
export function objectifPrincipal(list: Goal[]): Goal | null {
  const l = objectifsPropres(list);
  if (l.includes('lose')) return 'lose';
  if (l.includes('maintain')) return 'maintain';
  if (l.includes('gain')) return 'gain';
  if (l.includes('combat')) return 'combat';
  return null;
}

/** Valeur du profil (weight_goal) : 'lose', 'gain' ou 'maintain' */
export function weightGoalDe(list: Goal[]): 'lose' | 'gain' | 'maintain' {
  const s = sensDe(list);
  if (s === 'baisse' || s === 'recompo') return 'lose';
  if (s === 'hausse') return 'gain';
  return 'maintain';
}

/** Objectifs d'un brouillon : la liste si elle existe, sinon l'ancien objectif unique */
export function objectifsDuBrouillon(d: { goals?: Goal[] | null; goal?: Goal | null }): Goal[] {
  const l = objectifsPropres(d.goals);
  if (l.length) return l;
  return d.goal ? [d.goal] : [];
}
