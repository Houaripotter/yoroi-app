/**
 * Correction d'une serie deja validee (31 octobre 2026, retour de Houari : une serie validee a 1 repetition au
 * lieu de 12 ne pouvait pas etre corrigee). Avant, toucher la ligne verte la « devalidait » : elle redevenait la
 * serie en cours, et pendant le repos qui suit une validation la barre de validation est remplacee par le minuteur,
 * donc plus aucun bouton pour revalider. Maintenant la ligne s'ouvre en correction a part : la serie reste faite,
 * la serie en cours ne bouge pas, et l'enregistrement ne relance ni repos ni pre-remplissage.
 */
import type { LiveSet } from '@/lib/v2/seance/model';
import { epley } from '@/lib/v2/seance/history';

export type ValeursSerie = { weight: number; reps: number };
export type Meilleurs = { bestWeight: number; bestE1rm: number } | null | undefined;

/** Record, avec la meme regle qu'a la validation : contre l'historique et les autres series faites de la seance */
export function estRecord(valeurs: ValeursSerie, autresFaites: ValeursSerie[], h: Meilleurs): boolean {
  if (!h || valeurs.weight <= 0) return false;
  const bestW = Math.max(h.bestWeight, ...autresFaites.map((s) => s.weight));
  const bestE = Math.max(h.bestE1rm, ...autresFaites.map((s) => epley(s.weight, s.reps)));
  return valeurs.weight > bestW + 0.001 || epley(valeurs.weight, valeurs.reps) > bestE + 0.01;
}

/** On peut enregistrer une correction des qu'il y a au moins une repetition */
export function correctionPossible(valeurs: ValeursSerie): boolean {
  return Number.isFinite(valeurs.reps) && valeurs.reps > 0 && Number.isFinite(valeurs.weight) && valeurs.weight >= 0;
}

/**
 * Applique la correction : la serie garde sa place et reste validee, avec les nouvelles valeurs et son record
 * recalcule. Les autres series ne changent pas. Renvoie null si la serie n'existe pas ou si la correction est vide.
 */
export function corrigerSerie(sets: LiveSet[], setId: string, valeurs: ValeursSerie, h: Meilleurs): { sets: LiveSet[]; record: boolean } | null {
  const i = sets.findIndex((s) => s.id === setId);
  if (i < 0 || !correctionPossible(valeurs)) return null;
  const autres = sets.filter((s, j) => s.done && j !== i);
  const record = estRecord(valeurs, autres, h);
  const weight = Math.round(valeurs.weight * 100) / 100;
  const next = sets.map((s, j) => (j === i ? { ...s, weight, reps: Math.round(valeurs.reps), done: true, record } : s));
  return { sets: next, record };
}
