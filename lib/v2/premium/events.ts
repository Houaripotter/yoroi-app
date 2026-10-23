/**
 * Evenements du paywall, des offres et du mur Premium, branches sur utils/telemetry.ts (13 octobre 2026).
 * Les appels restent ceux des ecrans ; ici on traduit vers la liste fermee des evenements de la mesure.
 * Aucune donnee de sante ni information personnelle ne doit passer par ces evenements
 * (un compteur passe seulement comme nombre, jamais une valeur mesuree).
 */

import { track, type Plan, type Tentative } from '@/utils/telemetry';
import type { SourcePaywall, SourcePremium } from './sources';

export type DonneesEvenement = Record<string, string | number | boolean | null | undefined>;

export type PaywallEventName =
  | 'affichage'
  | 'choix_formule'
  | 'appui_bouton'
  | 'achat_reussi'
  | 'achat_annule'
  | 'achat_erreur'
  | 'continuer_gratuit'
  | 'restauration';

const planDe = (formule: unknown): Plan | undefined => (formule === 'annual' ? 'annuel' : formule === 'monthly' ? 'mensuel' : undefined);
const sourceDe = (d?: DonneesEvenement): SourcePaywall => (typeof d?.source === 'string' && d.source ? (d.source as SourcePaywall) : 'app');
const tentativeDe = (n: unknown): Tentative => (n === 2 ? '2' : typeof n === 'number' && n >= 3 ? '3' : '1');

export function paywallEvent(nom: PaywallEventName, donnees?: DonneesEvenement): void {
  if (donnees?.apercu === true) return; // apercu du Studio : rien ne compte
  const source = sourceDe(donnees);
  const plan = planDe(donnees?.formule);
  switch (nom) {
    case 'affichage':
      track('paywall_view', { source, statut: 'gratuit' });
      return;
    case 'choix_formule':
      if (plan) track('paywall_plan_choisi', { source, plan });
      return;
    case 'appui_bouton':
      track('paywall_cta_tap', plan ? { source, plan } : { source });
      return;
    case 'achat_reussi':
      if (plan) track('paywall_purchase_ok', { source, plan, essai: donnees?.essai ? 'oui' : 'non' });
      return;
    case 'achat_annule':
      if (plan) track('paywall_purchase_cancel', { source, plan });
      return;
    case 'achat_erreur':
      if (plan) track('paywall_purchase_error', { source, plan, erreur: donnees?.raison === 'acces_inactif' ? 'acces_inactif' : 'store' });
      return;
    case 'continuer_gratuit':
      track('paywall_dismiss_free', { source });
      return;
    case 'restauration': {
      track('paywall_restore_tap', { source });
      const r = donnees?.resultat;
      track('paywall_restore_result', { source, resultat: r === 'retrouve' ? 'trouve' : r === 'aucun' ? 'rien' : 'erreur' });
      return;
    }
  }
}

/** Chargement des offres RevenueCat (context/PremiumContext.tsx expose offersAttempt et offersRecovered) */
export type OffresEventName = 'paywall_offerings_error' | 'paywall_offerings_retry' | 'paywall_offerings_recovered';

export function offresEvent(nom: OffresEventName, donnees?: { source?: string; tentative?: number }): void {
  track(nom, { source: sourceDe(donnees), tentative: tentativeDe(donnees?.tentative) });
}

/** Mur Premium : premium_gate_hit quand il s'affiche, premium_gate_cta quand on touche son bouton */
export type MurEventName = 'premium_gate_hit' | 'premium_gate_cta';

export function murPremiumEvent(nom: MurEventName, donnees: { source: string; compteur?: number | null }): void {
  // le compteur reste dans l'app : il ne part pas, seule la source compte
  track(nom, { source: donnees.source as SourcePremium });
}
