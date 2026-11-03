/**
 * 3 novembre 2026 (Houari : « quand je fais l'onboarding en mode créateur pour le tester, rien de ce que je saisis ne
 * doit compter ») : ce que l'onboarding a le droit de faire selon le mode. Logique pure, sans dependance.
 *
 * Trois facons de passer l'onboarding en mode createur :
 *  . l'apercu du Studio (/onboarding?preview=true) : deja sans mesure ni ecriture, inchange ;
 *  . « Nouvel utilisateur » (vue en cours, cle @yoroi_studio_vue_nouvel_utilisateur) : tes vraies donnees sont mises de
 *    cote dans un fichier a part et remises au retour (lib/v2/creator/nouvelUtilisateur.ts). C'est deja un bac a sable :
 *    les ecritures restent permises (l'app vide doit se remplir comme chez un nouvel utilisateur), la mesure est coupee
 *    (les cles @yoroi_mesure_ sont gardees pendant la vue, ses evenements compteraient) ;
 *  . « Simuler une première installation », ou tout autre onboarding lance en mode createur : il tourne sur ton vrai
 *    profil. Ni mesure, ni ecriture : ni pesee, ni profil, ni reglages, ni espace, ni rappels, ni demande Sante, ni
 *    brouillon ; tes reponses ne vivent qu'a l'ecran et l'accueil se rouvre a la fin.
 * Hors mode createur, rien ne change.
 */

export type ModeOnboarding = 'normal' | 'apercu' | 'createur_bac_a_sable' | 'createur_sans_ecriture';

export type RegleOnboarding = {
  mode: ModeOnboarding;
  /** evenements de mesure (Firebase, fil d'ariane Sentry, « où as-tu connu ») */
  mesure: boolean;
  /** pesee, profil, reglages, espace, rappels, demande Sante, brouillon */
  ecritures: boolean;
};

export function regleOnboarding(o: { apercu: boolean; createur: boolean; vueNouvelUtilisateur: boolean }): RegleOnboarding {
  if (o.apercu) return { mode: 'apercu', mesure: false, ecritures: false };
  if (!o.createur) return { mode: 'normal', mesure: true, ecritures: true };
  if (o.vueNouvelUtilisateur) return { mode: 'createur_bac_a_sable', mesure: false, ecritures: true };
  return { mode: 'createur_sans_ecriture', mesure: false, ecritures: false };
}

/** La valeur de la cle de la vue « Nouvel utilisateur » : seul 'true' compte */
export function vueNouvelUtilisateurActive(valeur: string | null | undefined): boolean {
  return valeur === 'true';
}
