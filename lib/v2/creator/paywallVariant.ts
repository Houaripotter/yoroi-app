/**
 * Variantes forcees du paywall, pour les apercus du Studio (mode createur seulement).
 * En memoire uniquement : rien n'est ecrit, et la variante ne s'applique QUE si le paywall
 * est ouvert en apercu (achat et restauration bloques par purchasePreview). Aucun appel au store :
 * les variantes reprennent les vraies offres deja chargees, ou des offres d'exemple si le store
 * n'en a pas (Expo Go, web), avec un bandeau « prix d'exemple ».
 *
 *  - reel : ce que le store renvoie vraiment
 *  - essai : un essai gratuit de 7 jours affiche sur chaque offre
 *  - sans_essai : aucune offre d'essai
 *  - erreur : les offres n'ont pas pu se charger
 *  - chargement : les offres sont en cours de chargement
 *  - bienvenue : la bienvenue Premium apres un achat avec essai, et la demande d'autorisation
 *    des notifications pour le rappel de fin d'essai (aucun rappel n'est programme)
 *  - restaure : la bienvenue apres une restauration d'achat
 */
import { useSyncExternalStore } from 'react';
import type { PremiumPackage } from '@/context/PremiumContext';
import { traduire } from '@/lib/i18n/tr';

export type PaywallVariant = 'reel' | 'essai' | 'sans_essai' | 'erreur' | 'chargement' | 'bienvenue' | 'restaure';

export const PAYWALL_VARIANTS: { id: PaywallVariant; label: string; sub: string }[] = [
  { id: 'reel', label: traduire('Offres réelles'), sub: traduire('Ce que le store renvoie maintenant') },
  { id: 'essai', label: traduire('Avec essai'), sub: traduire('7 jours gratuits sur chaque formule') },
  { id: 'sans_essai', label: traduire('Sans essai'), sub: traduire('Le prix directement') },
  { id: 'erreur', label: traduire('Offres en erreur'), sub: traduire('Le message et le bouton Réessayer') },
  { id: 'chargement', label: traduire('Offres en chargement'), sub: traduire('Le petit indicateur') },
  { id: 'bienvenue', label: traduire('Après l’achat'), sub: traduire('Bienvenue Premium, puis la demande de notification') },
  { id: 'restaure', label: traduire('Après une restauration'), sub: traduire('Ton Premium est de retour') },
];

/** Duree de l'essai simule par la variante « essai » */
export const PREVIEW_TRIAL_DAYS = 7;

let variant: PaywallVariant = 'reel';
let version = 0;
const listeners = new Set<() => void>();

export function setPaywallVariant(v: PaywallVariant): void {
  if (variant === v) return;
  variant = v;
  version += 1;
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // un abonne en erreur ne bloque pas les autres
    }
  });
}

export function getPaywallVariant(): PaywallVariant {
  return variant;
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Variante active (relue a chaque changement) */
export function usePaywallVariant(): PaywallVariant {
  useSyncExternalStore(subscribe, () => version, () => version);
  return variant;
}

/** Essai simule : fin dans 7 jours a partir de maintenant */
export function previewTrial(): { days: number; end: Date } {
  return { days: PREVIEW_TRIAL_DAYS, end: new Date(Date.now() + PREVIEW_TRIAL_DAYS * 86400000) };
}

function examplePackage(kind: 'annual' | 'monthly'): PremiumPackage {
  const annual = kind === 'annual';
  // PRIX D'EXEMPLE, jamais montres en vrai : seulement dans un apercu du Studio (paywall ouvert avec preview=1,
  // achat bloque) quand le store ne renvoie aucune offre, sous le bandeau « Aperçu, prix d'exemple » du paywall
  // memes montants que la grille du store (49,99 € par an, 9,99 € par mois, octobre 2026)
  const priceString = annual ? '49,99 €' : '9,99 €';
  return {
    identifier: annual ? '$apercu_annuel' : '$apercu_mensuel',
    productId: annual ? 'apercu.annuel' : 'apercu.mensuel',
    priceString,
    periodLabel: annual ? traduire('par an') : traduire('par mois'),
    raw: {
      identifier: annual ? '$apercu_annuel' : '$apercu_mensuel',
      packageType: annual ? 'ANNUAL' : 'MONTHLY',
      product: { identifier: annual ? 'apercu.annuel' : 'apercu.mensuel', price: annual ? 49.99 : 9.99, priceString, currencyCode: 'EUR', subscriptionPeriod: annual ? 'P1Y' : 'P1M' },
    },
  };
}

/** Deux offres d'exemple (annuelle et mensuelle), seulement quand le store n'en donne aucune */
export const EXAMPLE_PACKAGES: PremiumPackage[] = [examplePackage('annual'), examplePackage('monthly')];
