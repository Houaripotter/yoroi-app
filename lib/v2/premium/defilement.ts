/**
 * Paywall, boutons du pied (17 octobre 2026). Houari : « les boutons doivent être en gris tant que je n'ai pas scrollé
 * jusqu'en bas, mets un petit truc pour qu'il voie qu'il doit scroller, sauf le prix, laisse-le en couleur ».
 * Tant que le bas du contenu n'a pas ete vu, le bouton d'abonnement et « Continuer gratuitement » sont attenues (gris doux)
 * mais restent TOUJOURS touchables : Apple exige un achat et une sortie clairs. Le prix garde sa couleur.
 * Une fois le bas atteint, c'est acquis pour cette ouverture (remonter ne regrise rien).
 */

/** Marge avant la toute fin du contenu : a 24 points du bas, on considere le bas atteint */
export const MARGE_BAS = 24;

/** Vrai si le bas du contenu est visible : position du haut de la vue (y), hauteur de la vue, hauteur du contenu */
export function basAtteint(y: number, vue: number, contenu: number, marge: number = MARGE_BAS): boolean {
  if (!(vue > 0) || !(contenu > 0)) return false;
  return y + vue >= contenu - marge;
}
