/**
 * Garde-fou contre la degradation a tort d'un abonne (13 octobre 2026).
 *
 * Probleme : getCustomerInfo (et le listener RevenueCat) peut repondre sans erreur ET sans abonnement actif
 * quand le cache RevenueCat est froid ou le reseau degrade. Applique tel quel, ce resultat retire Premium a
 * quelqu'un qui paie, ecrase le cache local et affiche « Ton Premium a pris fin ».
 *
 * Regle : un resultat negatif n'est cru directement que si l'utilisateur n'etait pas deja Premium.
 * S'il l'etait, on invalide le cache RevenueCat et on relit une seconde fois :
 *  - la relecture confirme l'absence d'abonnement : on degrade ;
 *  - la relecture trouve l'abonnement : on le garde ;
 *  - la relecture echoue : on ne change rien (ni degradation, ni ecriture du cache).
 *
 * Logique pure, sans React ni stockage : testee dans __tests__/unit/gardeDegradation.test.ts.
 */

/** Une lecture du statut : actif ou non, et la reponse brute de RevenueCat (pour le produit actif) */
export type Lecture<T> = { actif: boolean; info: T };

/** Decision : appliquer ce statut, ou ne rien changer */
export type Decision<T> = { appliquer: true; actif: boolean; info: T } | { appliquer: false };

export async function statutApresGarde<T>(
  premiere: Lecture<T>,
  etaitPremium: boolean,
  relire: () => Promise<Lecture<T>>,
): Promise<Decision<T>> {
  if (premiere.actif) return { appliquer: true, actif: true, info: premiere.info };
  if (!etaitPremium) return { appliquer: true, actif: false, info: premiere.info };
  try {
    const seconde = await relire();
    return { appliquer: true, actif: seconde.actif, info: seconde.info };
  } catch {
    return { appliquer: false };
  }
}
