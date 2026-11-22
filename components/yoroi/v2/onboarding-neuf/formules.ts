/**
 * onboarding-neuf/formules.ts
 *
 * Les formules du paywall, lues dans les offres du store a l'execution (usePremium().packages, le meme hook que le
 * paywall actuel ; context/PremiumContext.tsx n'est pas touche). Prix, devise, periode, essai et economie viennent
 * toujours du store (lib/v2/premium/offer.ts). Aucun prix ecrit en dur : sans store, en apercu du Studio seulement,
 * les prix d'exemple du Studio (EXAMPLE_PACKAGES, marques comme tels), jamais montres a un vrai utilisateur.
 */

import { useMemo } from 'react';
import { usePremium, type PremiumPackage } from '@/context/PremiumContext';
import { EXAMPLE_PACKAGES, previewTrial } from '@/lib/v2/creator/paywallVariant';
import { formatMoney, savingsPercent, sortOffers, trialFor, type OfferInfo } from '@/lib/v2/premium/offer';
import type { FreeTrial } from '@/lib/v2/onboarding/trial';

export type Formule = {
  id: 'annuel' | 'mensuel';
  pkg: PremiumPackage;
  info: OfferInfo;
  /** le prix ramene a la semaine, dans la devise du store */
  parSemaine: string | null;
  /** l'essai auquel tu as droit (store), sinon null */
  essai: FreeTrial | null;
  /** economie de l'annuel face au mensuel, en pour cent (calculee sur les vrais prix) */
  economie: number | null;
};

/** Le prix d'une periode ramene a une semaine (52,14 semaines par an) */
export function prixParSemaine(info: OfferInfo): string | null {
  if (!info.price || !info.currency || !info.period) return null;
  const mois = info.period.unit === 'YEAR' ? 12 * info.period.count : info.period.unit === 'MONTH' ? info.period.count : null;
  if (!mois) return null;
  const semaines = (mois / 12) * (365 / 7);
  return formatMoney(Math.ceil((info.price / semaines) * 100) / 100, info.currency);
}

/** Le contexte premium, sans planter si l'apercu est ouvert hors du fournisseur (harnais, tests) */
export function usePremiumSur(): ReturnType<typeof usePremium> | null {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return usePremium();
  } catch {
    return null;
  }
}

export type EtatFormules = {
  formules: Formule[];
  annuel: Formule | null;
  mensuel: Formule | null;
  /** les offres viennent du store */
  live: boolean;
  /** apercu sans store : prix d'exemple */
  exemple: boolean;
  statut: 'loading' | 'ready' | 'error' | 'unavailable';
};

export function construireFormules(packages: PremiumPackage[], eligibilite: Record<string, 'eligible' | 'ineligible' | 'unknown'>, apercu: boolean): Omit<EtatFormules, 'statut'> {
  const live = packages.length > 0;
  const exemple = !live && apercu;
  const liste = live ? packages : exemple ? EXAMPLE_PACKAGES : [];
  const offres = sortOffers<PremiumPackage>(liste);
  const a = offres.find((o) => o.info.kind === 'annual') ?? null;
  const m = offres.find((o) => o.info.kind === 'monthly') ?? null;
  const economie = savingsPercent(a?.info ?? null, m?.info ?? null);
  const essaiDe = (raw: unknown, annuel: boolean): FreeTrial | null => (live ? trialFor(raw, eligibilite) : exemple && annuel ? previewTrial() : null);
  const annuel: Formule | null = a ? { id: 'annuel', pkg: a.pkg, info: a.info, parSemaine: prixParSemaine(a.info), essai: essaiDe(a.pkg.raw, true), economie } : null;
  const mensuel: Formule | null = m ? { id: 'mensuel', pkg: m.pkg, info: m.info, parSemaine: prixParSemaine(m.info), essai: essaiDe(m.pkg.raw, false), economie: null } : null;
  // l'annuel en premier, choisi d'office
  const formules = [annuel, mensuel].filter((f): f is Formule => !!f);
  return { formules, annuel, mensuel, live, exemple };
}

export function useFormules(apercu: boolean): EtatFormules {
  const premium = usePremiumSur();
  const packages = premium?.packages ?? [];
  const elig = premium?.trialEligibility ?? {};
  const statut = premium?.offersStatus ?? 'unavailable';
  return useMemo(() => ({ ...construireFormules(packages, elig, apercu), statut: apercu && !packages.length ? 'ready' : statut }), [packages, elig, apercu, statut]);
}
