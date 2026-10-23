/**
 * Fin de page atteinte (15 octobre 2026, ecran 7 Affirmation) : le bouton Continuer s'allume quand
 * le bas du contenu est visible, a une petite marge pres. Si tout tient sans defiler, c'est atteint tout de suite.
 * Tant que les mesures manquent (0), on ne bloque pas : rien n'est encore affiche.
 */
export const MARGE_FIN = 32;

export function finAtteinte(decalage: number, visible: number, contenu: number, marge: number = MARGE_FIN): boolean {
  if (!(visible > 0) || !(contenu > 0)) return false;
  if (contenu <= visible + marge) return true;
  return Math.max(0, decalage) + visible >= contenu - marge;
}
