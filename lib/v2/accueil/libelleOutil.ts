/**
 * Libelles des raccourcis de l'accueil (components/yoroi/v2/accueil/Raccourcis.tsx). Aucun import React Native : tout se teste avec jest.
 */
/*
 * 24 octobre 2026 (Houari, iPhone en portugais : « Compartilhar » laissait un « r » seul a la ligne) : un libelle
 * ne coupe jamais un mot. Un mot seul tient sur une ligne ; deux mots ou plus gardent deux lignes au plus. La taille
 * baisse juste assez pour que le mot le plus long tienne dans LARGEUR_LIBELLE (largeur moyenne d'un caractere gras
 * comptee large, 0,64 de la taille : « Chrono » en Archivo 12,5 extra gras mesure 46,1), jamais sous 75 % ; adjustsFontSizeToFit reste en filet de securite.
 */
export const LARGEUR_LIBELLE = 84;
export const TAILLE_LIBELLE = 12.5;
export const ECHELLE_MIN_LIBELLE = 0.75;
export const CHASSE = 0.64;

export function lignesLibelleOutil(titre: string): 1 | 2 {
  return titre.trim().split(/\s+/).length > 1 ? 2 : 1;
}

export function tailleLibelleOutil(titre: string): number {
  const plusLong = Math.max(1, ...titre.trim().split(/\s+/).map((m) => m.length));
  const t = Math.min(TAILLE_LIBELLE, LARGEUR_LIBELLE / (plusLong * CHASSE));
  return Math.max(TAILLE_LIBELLE * ECHELLE_MIN_LIBELLE, Math.floor(t * 10) / 10);
}
