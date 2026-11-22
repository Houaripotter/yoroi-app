/**
 * L'offre de rattrapage (21 novembre 2026, sur le modele d'INRO) : -30 % sur la premiere annee de l'abonnement
 * annuel, proposee une seule fois par appareil quand on ferme le paywall de fin d'onboarding ou qu'on annule l'achat.
 *
 * Rien n'est touche dans context/PremiumContext.tsx ni dans la configuration RevenueCat : les prix sont lus dans les
 * offres deja chargees (usePremium().packages) et l'achat Android passe directement par le SDK des achats.
 *
 * Ce que Houari doit creer pour qu'elle s'affiche (sinon, elle ne s'affiche simplement pas) :
 *  - Google Play Console, abonnement annuel, forfait de base : une offre d'identifiant « rattrapage30 », phase a prix
 *    reduit pendant 1 an, eligibilite « determinee par le developpeur », avec le tag rc-ignore-offer.
 *    Elle arrive toute seule dans le paquet annuel de RevenueCat (subscriptionOptions) : rien a changer dans RevenueCat.
 *  - App Store Connect, abonnement yoroi_premium_annual : un code d'offre personnalise YOROI30 (-30 % la premiere
 *    annee, nouveaux abonnes). L'App Store ne permet pas de savoir depuis l'app si ce code existe : une fois cree,
 *    passer RATTRAPAGE_IOS_CODE_CREE a true. Tant qu'il est a false, l'offre n'apparait pas sur iPhone.
 *
 * Prix affiches : jamais ecrits en dur. Android : le prix deja formate par Google Play pour la phase reduite.
 * iPhone : le prix annuel du store moins la reduction, formate dans la devise du store (affichage seulement ; le
 * prix paye est celui du code d'offre dans l'App Store).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatMoney } from './offer';
import { APP_CONFIG } from '@/lib/appConfig';

/** Le pourcentage de la reduction (decision de Houari : 30 %) */
export const RATTRAPAGE_POURCENT = 30;
/** Le code d'offre de l'App Store */
export const CODE_OFFRE_IOS = 'YOROI30';
/** L'identifiant de l'offre Google Play, sur le forfait de base annuel */
export const OFFRE_ANDROID = 'rattrapage30';
/** A passer a true une fois le code YOROI30 cree dans App Store Connect (voir plus haut) */
export const RATTRAPAGE_IOS_CODE_CREE = false;

/** Une seule fois par appareil : posee des que l'offre est vue */
export const CLE_RATTRAPAGE_VUE = '@yoroi_offre_rattrapage_vue_v1';

export async function rattrapageDejaVu(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CLE_RATTRAPAGE_VUE)) === '1';
  } catch {
    // lecture impossible : prudence, on ne montre rien
    return true;
  }
}

export async function marquerRattrapageVu(): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE_RATTRAPAGE_VUE, '1');
  } catch {
    // sans importance
  }
}

// ===== Lecture de l'offre dans le paquet annuel (Android) =====

type Phase = {
  billingPeriod?: { unit?: string; value?: number; iso8601?: string } | null;
  price?: { formatted?: string; amountMicros?: number; currencyCode?: string } | null;
  billingCycleCount?: number | null;
};

export type OptionAbonnement = {
  id?: string;
  pricingPhases?: Phase[] | null;
  freePhase?: Phase | null;
  introPhase?: Phase | null;
  fullPricePhase?: Phase | null;
  tags?: string[] | null;
};

/** L'option « rattrapage30 » du paquet annuel (RevenueCat : id « forfait:offre »), sinon null */
export function optionRattrapage(rawAnnuel: unknown): OptionAbonnement | null {
  const options = (rawAnnuel as { product?: { subscriptionOptions?: OptionAbonnement[] | null } } | null)?.product?.subscriptionOptions;
  if (!Array.isArray(options)) return null;
  return options.find((o) => typeof o?.id === 'string' && (o.id === OFFRE_ANDROID || o.id.endsWith(`:${OFFRE_ANDROID}`))) ?? null;
}

/** Duree d'une periode en jours (P7D, P1W, P1M) */
function joursDe(p: Phase['billingPeriod']): number | null {
  if (!p) return null;
  const iso = typeof p.iso8601 === 'string' ? /^P(\d+)([DWMY])$/.exec(p.iso8601) : null;
  const unite = iso ? iso[2] : String(p.unit ?? '').charAt(0).toUpperCase();
  const n = iso ? Number(iso[1]) : Number(p.value ?? 0);
  if (!(n > 0)) return null;
  if (unite === 'D') return n;
  if (unite === 'W') return 7 * n;
  if (unite === 'M') return 30 * n;
  if (unite === 'Y') return 365 * n;
  return null;
}

export type PrixRattrapage = {
  /** le prix de la premiere annee, formate dans la devise du store */
  premiereAnnee: string | null;
  /** le meme ramene a la semaine */
  parSemaine: string | null;
  /** jours d'essai lus dans l'offre (Android), sinon null */
  essaiJours: number | null;
};

/**
 * Le prix de l'offre. Android : la phase payante reduite de l'option (prix de Google Play) et une phase a 0 pour
 * l'essai. iPhone (ou sans option) : le prix annuel du store moins la reduction.
 */
export function prixRattrapage(args: { plateforme: string; rawAnnuel: unknown; prixAnnuel: number | null; devise: string | null }): PrixRattrapage {
  const semaine = (montant: number, devise: string) => formatMoney(Math.ceil((montant / (365 / 7)) * 100) / 100, devise);
  if (args.plateforme === 'android') {
    const o = optionRattrapage(args.rawAnnuel);
    if (o) {
      const phases = Array.isArray(o.pricingPhases) ? o.pricingPhases : [];
      const gratuite = o.freePhase ?? phases.find((p) => Number(p?.price?.amountMicros) === 0) ?? null;
      const reduite = o.introPhase ?? phases.find((p) => Number(p?.price?.amountMicros) > 0 && p !== phases[phases.length - 1]) ?? null;
      const montant = reduite?.price?.amountMicros ? Number(reduite.price.amountMicros) / 1e6 : null;
      const devise = reduite?.price?.currencyCode ?? args.devise;
      return {
        premiereAnnee: reduite?.price?.formatted ?? null,
        parSemaine: montant && devise ? semaine(montant, devise) : null,
        essaiJours: joursDe(gratuite?.billingPeriod ?? null),
      };
    }
  }
  if (!args.prixAnnuel || !args.devise) return { premiereAnnee: null, parSemaine: null, essaiJours: null };
  const remise = args.prixAnnuel * (1 - RATTRAPAGE_POURCENT / 100);
  return { premiereAnnee: formatMoney(remise, args.devise), parSemaine: semaine(remise, args.devise), essaiJours: null };
}

/** Le lien de l'App Store avec le code d'offre deja rempli */
export function lienCodeOffre(): string {
  return `https://apps.apple.com/redeem?ctx=offercodes&id=${APP_CONFIG.appStoreId}&code=${CODE_OFFRE_IOS}`;
}

export type ResultatRattrapage = { success: boolean; cancelled?: boolean; ouvert?: boolean; error?: string };

/**
 * L'achat de l'offre. Android : directement par le SDK des achats (purchaseSubscriptionOption), PremiumContext n'est
 * pas touche ; l'appelant appelle ensuite refresh(). iPhone : l'App Store s'ouvre avec le code deja rempli ;
 * l'abonnement remonte ensuite tout seul (l'appelant rafraichit au retour dans l'app).
 */
export async function acheterRattrapage(args: { plateforme: string; rawAnnuel: unknown; ouvrir: (url: string) => Promise<unknown> }): Promise<ResultatRattrapage> {
  if (args.plateforme === 'ios') {
    try {
      await args.ouvrir(lienCodeOffre());
      return { success: false, ouvert: true };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  const option = optionRattrapage(args.rawAnnuel);
  if (!option) return { success: false, error: 'offre_absente' };
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases');
    const Purchases = mod?.default ?? mod;
    if (!Purchases?.purchaseSubscriptionOption) return { success: false, error: 'store_absent' };
    await Purchases.purchaseSubscriptionOption(option);
    return { success: true };
  } catch (e) {
    const err = e as { userCancelled?: boolean; message?: string };
    if (err?.userCancelled) return { success: false, cancelled: true };
    return { success: false, error: err?.message ?? String(e) };
  }
}
