/**
 * Genre des calculs (28 octobre 2026, decision de Houari) : homme, femme, ou neutre.
 * Neutre : la personne a choisi « Autre » puis « Je préfère ne pas le dire ». Chaque formule qui depend du sexe
 * (masse grasse, metabolisme de base, besoins caloriques, tour de taille, eau, os, muscle, poids de forme) prend alors
 * la moyenne exacte des valeurs homme et femme, au lieu de retomber sans le dire sur l'une des deux.
 * Le reglage est garde dans UserSettings.gender = 'neutral' (lib/storage.ts).
 */
export type GenreFormule = 'male' | 'female' | 'neutral';

/** La valeur homme, la valeur femme, ou leur moyenne en neutre */
export function selonGenre(g: GenreFormule, homme: number, femme: number): number {
  if (g === 'male') return homme;
  if (g === 'female') return femme;
  return (homme + femme) / 2;
}

/** Arrondi au dixieme, pour des bornes neutres lisibles */
export const dixieme = (v: number) => Math.round(v * 10) / 10;

/** Le genre des calculs lu dans les reglages (gender) ; undefined si rien n'est connu */
export function genreDesReglages(s: { gender?: string | null } | null | undefined): GenreFormule | undefined {
  const g = s?.gender;
  return g === 'male' || g === 'female' || g === 'neutral' ? g : undefined;
}
