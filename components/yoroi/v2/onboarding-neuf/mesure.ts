/**
 * onboarding-neuf/mesure.ts : la mesure de chaque ecran, comme mesure.ts d'INRO, dans les regles de YOROI.
 *
 * Tout passe par track() de utils/telemetry.ts (Firebase, et PostHog seulement par sa liste blanche,
 * utils/telemetryPostHog.ts). Rien ne part en apercu du Studio ni en mode createur (setApercuOnboarding), ni si la
 * mesure est coupee dans les Reglages.
 *
 *   onboarding_etape   etape, temps (tranche 0_3, 3_10, 10_30, 30_plus) : envoye en QUITTANT l'ecran
 *                      (PostHog : onboarding_step, avec le numero d'etape)
 *   onboarding_choix   etape, choix (liste fermee) : les reponses, par lib/v2/onboarding/events.ts (choixOnboarding)
 *                      (PostHog : onboarding_answer)
 *   onboarding_rappels reponse : accepte ou refuse (PostHog : notifications_answered)
 *   paywall_ecran_vu   ecran : 1, 2 ou 3 (PostHog : paywall_step_viewed)
 *   rattrapage_vue, rattrapage_tap, rattrapage_ok, rattrapage_refus   source (PostHog : winback_*)
 *   onboarding_termine statut : gratuit, essai ou abonne (PostHog : onboarding_completed)
 *
 * Jamais : le prenom, le poids, la taille, le cap, une date, un texte libre, le nombre exact de jours.
 * Pas de propriete de personne vers PostHog (les proprietes de profil continuent de partir vers Firebase seulement,
 * par setProprietes dans choixOnboarding, comme avant).
 */

import { track } from '@/utils/telemetry';
import { mesureOnboardingCoupee } from '@/lib/v2/onboarding/events';
import { ETAPE_MESURE, trancheTemps, type Etape } from './parcours';

export type Mesure = {
  /** un ecran s'affiche : celui d'avant part avec son temps */
  ecran: (etape: Etape) => void;
  /** l'app passe en arriere-plan ou l'onboarding se ferme : l'ecran en cours part avec son temps */
  vider: () => void;
  rappels: (accepte: boolean) => void;
  paywall: (ecran: 1 | 2 | 3) => void;
  rattrapage: (quoi: 'vue' | 'tap' | 'ok' | 'refus') => void;
  termine: (statut: 'gratuit' | 'essai' | 'abonne') => void;
};

/** maintenant() est injecte pour les tests */
export function creerMesure(maintenant: () => number = Date.now): Mesure {
  let courant: { etape: Etape; debut: number } | null = null;
  const coupee = () => mesureOnboardingCoupee();
  const vider = () => {
    if (!courant) return;
    const c = courant;
    courant = null;
    if (coupee()) return;
    track('onboarding_etape', { etape: ETAPE_MESURE[c.etape], temps: trancheTemps(maintenant() - c.debut) });
  };
  return {
    ecran: (etape) => {
      if (courant?.etape === etape) return;
      vider();
      courant = { etape, debut: maintenant() };
    },
    vider,
    rappels: (accepte) => {
      if (!coupee()) track('onboarding_rappels', { reponse: accepte ? 'accepte' : 'refuse' });
    },
    paywall: (ecran) => {
      if (!coupee()) track('paywall_ecran_vu', { ecran: String(ecran) as '1' | '2' | '3' });
    },
    rattrapage: (quoi) => {
      if (coupee()) return;
      const nom = quoi === 'vue' ? 'rattrapage_vue' : quoi === 'tap' ? 'rattrapage_tap' : quoi === 'ok' ? 'rattrapage_ok' : 'rattrapage_refus';
      track(nom, { source: 'onboarding' });
    },
    termine: (statut) => {
      vider();
      if (!coupee()) track('onboarding_termine', { statut });
    },
  };
}
