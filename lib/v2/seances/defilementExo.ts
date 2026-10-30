/**
 * Passage a l'exercice suivant pendant une seance (30 octobre 2026).
 * Avant, l'ecran de seance ne gerait pas du tout le defilement : la liste gardait la position de l'exercice
 * d'avant, alors que la page du nouvel exercice n'a plus la meme hauteur (moins de series faites affichees,
 * aide de la barre, carte « Exercice boucle » en moins). La position restait donc au mauvais endroit,
 * et il fallait aller chercher la premiere serie a la main.
 * Ici : ou faire defiler pour poser la carte du nouvel exercice juste sous l'en-tete (16 points de marge),
 * avec sa premiere serie a faire visible. Rien si tout tient deja a l'ecran. Donnees pures.
 */

export const MARGE_HAUT = 16;

export type MesuresDefilement = {
  /** position actuelle du defilement */
  scrollY: number;
  /** hauteur visible de la liste */
  vueH: number;
  /** hauteur cachee en bas par la barre fixe */
  basMasque: number;
  /** haut de la carte de l'exercice, dans la liste */
  carteY: number;
  /** bas de la premiere serie a faire, dans la liste (null : aucune serie a faire) */
  serieBas: number | null;
};

/** La position ou defiler, ou null quand la carte et sa serie tiennent deja a l'ecran */
export function cibleDefilement(m: MesuresDefilement, marge = MARGE_HAUT): number | null {
  const visible = Math.max(0, m.vueH - m.basMasque);
  if (visible <= 0) return null;
  const haut = m.carteY - marge;
  const serieVue = m.serieBas === null || m.serieBas <= m.scrollY + visible;
  if (haut >= m.scrollY && serieVue) return null;
  let cible = haut;
  // la serie a faire passe avant tout : si elle depasse en bas, on descend juste assez
  if (m.serieBas !== null && m.serieBas - cible > visible) cible = m.serieBas - visible;
  cible = Math.max(0, Math.round(cible));
  return Math.abs(cible - m.scrollY) < 2 ? null : cible;
}
