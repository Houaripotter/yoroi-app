/**
 * Geometrie des anneaux d'activite (17 octobre nuit). Houari : « à 7 945/8 000 pas, l'anneau rose paraît
 * complètement fermé alors qu'il manque 55 pas ». Les extremites arrondies debordent d'une demi-epaisseur de chaque
 * cote du trait et mangeaient le petit vide restant.
 * Echelle lineaire (et non un plafond) : sous 100 %, l'angle dessine vaut p x (360 degres - angle du capuchon), ou
 * l'angle du capuchon est celui que couvre une epaisseur de trait sur ce rayon. Chaque pourcent reste visible, le vide
 * diminue progressivement et l'anneau ne se ferme qu'a 100 % pile, ou l'on ajoute l'angle manquant.
 * Aucun import React Native : tout se teste avec jest.
 */

/** La part du cercle couverte par une epaisseur de trait (les deux demi extremites arrondies) */
export function partCapuchon(epaisseur: number, rayon: number): number {
  const c = 2 * Math.PI * rayon;
  return c > 0 ? Math.min(1, Math.max(0, epaisseur / c)) : 0;
}

/** La part du premier tour a dessiner (0 a 1) pour une valeur p (0 a 2 tours) */
export function partDessinee(part: number, epaisseur: number, rayon: number): number {
  const p = Math.max(0, Number.isFinite(part) ? part : 0);
  if (p >= 1) return 1;
  return p * (1 - partCapuchon(epaisseur, rayon));
}

/** L'angle dessine en degres sous 100 %, 360 a 100 % et au-dela */
export function angleDessine(part: number, epaisseur: number, rayon: number): number {
  return partDessinee(part, epaisseur, rayon) * 360;
}

/** Le vide visible (en points) entre la fin et le debut du trait, extremites arrondies comprises */
export function videVisible(part: number, epaisseur: number, rayon: number): number {
  const c = 2 * Math.PI * rayon;
  const d = partDessinee(part, epaisseur, rayon);
  if (d >= 1) return 0;
  return Math.max(0, c - (d * c + epaisseur));
}
