/**
 * 3 novembre 2026 (Houari : « en mode créateur, le compteur affiche 23/20 ») : l'ordre reel des ecrans de l'onboarding,
 * pour la barre d'apercu du Studio (compteur, precedent, suivant, grille) et les puces du Studio.
 * Cause du 23/20 : la barre affichait le numero INTERNE de l'ecran + 1 sur un total de 20 libelles. Ta scene (20)
 * et Ou as-tu connu YOROI (22) ont recu un numero a la fin pour ne decaler aucun ecran : 21/20 et 23/20, et les
 * fleches suivaient les numeros internes (Ton univers menait a Objectif, Ta scene et Source jamais atteintes).
 * Ici le compteur est la position dans le parcours reel, toujours entre 1 et le total.
 * Numeros internes : ceux de app/onboarding.tsx (OUVERTURE = 0 ... SOURCE = 22). Logique pure, sans dependance.
 */

/** Le parcours reel, numeros internes dans l'ordre vu par l'utilisateur (Ta scene apres Ton univers, Sante avant Premium) */
export const ORDRE_ONBOARDING: readonly number[] = [0, 1, 2, 3, 22, 4, 20, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 9, 19];

/** Ecran d'accueil du mode retour : jamais dans l'apercu du Studio */
export const ECRAN_HORS_APERCU = 21;

export const TOTAL_ECRANS = ORDRE_ONBOARDING.length;

/** Position (0 a TOTAL - 1) d'un ecran dans le parcours, -1 s'il n'en fait pas partie */
export function positionEcran(page: number): number {
  return ORDRE_ONBOARDING.indexOf(page);
}

/** Le compteur de la barre d'apercu : jamais au dela du total, jamais sous 1 */
export function compteurEcran(page: number): { position: number; total: number } {
  const i = positionEcran(page);
  return { position: Math.min(TOTAL_ECRANS, Math.max(1, i + 1)), total: TOTAL_ECRANS };
}

/** L'ecran precedent dans le parcours (le meme au premier) */
export function ecranPrecedent(page: number): number {
  const i = positionEcran(page);
  return i <= 0 ? ORDRE_ONBOARDING[0] : ORDRE_ONBOARDING[i - 1];
}

/** L'ecran suivant dans le parcours (le meme au dernier) */
export function ecranSuivant(page: number): number {
  const i = positionEcran(page);
  if (i < 0) return ORDRE_ONBOARDING[0];
  return ORDRE_ONBOARDING[Math.min(TOTAL_ECRANS - 1, i + 1)];
}

/** Numero interne de l'ecran a une position (0 a TOTAL - 1), borne */
export function ecranAPosition(position: number): number {
  return ORDRE_ONBOARDING[Math.max(0, Math.min(TOTAL_ECRANS - 1, Math.round(position) || 0))];
}

/** L'ecran demande par /onboarding?preview=true&page=N : un ecran du parcours, sinon le premier */
export function ecranApercuDemande(n: number): number {
  return positionEcran(n) >= 0 ? n : ORDRE_ONBOARDING[0];
}
