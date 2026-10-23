/**
 * PREMIUM CONTEXT - YOROI
 *
 * Gestion de l'abonnement Premium via RevenueCat (react-native-purchases).
 * Concu pour fonctionner meme sans configuration RevenueCat :
 *  - cles API absentes ou module natif indisponible : etat premium lu depuis
 *    le cache local chiffre (SecureStore), achats desactives
 *  - le mode createur (jeton signe Ed25519, verifie hors ligne, voir lib/v2/creator) donne
 *    Premium en acces libre, meme en production, sans aucun achat. L'ancien code a 4 chiffres,
 *    trouvable dans l'app, n'existe plus.
 *  - vue gratuit (Studio) : simulateFreeUser, garde pendant la session createur seulement.
 *  - apercu (paywall ou onboarding en apercu) : achat et restauration refuses ici meme.
 *  - drapeaux du Studio (lib/v2/creator/premiumFlags) : creatorPremium ouvre Premium,
 *    purchasePreview refuse achat et restauration sans appel au store.
 *  - offres lues dans l'offering current (compatible RevenueCat Experiments) : 3 tentatives
 *    (0, 1000 et 2500 ms, 7000 ms maximum chacune), puis etat d'erreur avec relance manuelle.
 *    offersAttempt et offersRecovered servent a la mesure (lib/v2/premium/events.ts, offresEvent).
 *  - eligibilite a l'essai (iOS) via checkTrialOrIntroductoryPriceEligibility.
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';
import { PREVIEW_PURCHASE_MESSAGE } from '@/lib/v2/creator/purchasePreview';
import { getPurchasePreview, usePremiumFlags } from '@/lib/v2/creator/premiumFlags';
import { describeOffer, type Eligibility } from '@/lib/v2/premium/offer';
import type { EtatAbonnement } from '@/lib/v2/premium/finPremium';
import { statutApresGarde } from '@/lib/v2/premium/gardeDegradation';
import { idInstanceMesure, track } from '@/utils/telemetry';
import { Platform } from 'react-native';
import {
  RC_API_KEY,
  PREMIUM_ENTITLEMENT_ID,
} from '@/constants/premium';
import { traduire } from '@/lib/i18n/tr';

/** Chargement des offres : delai avant chaque tentative, et temps maximum d'une tentative */
const OFFERS_DELAYS = [0, 1000, 2500];
const OFFERS_TIMEOUT_MS = 7000;

// Cache local du statut premium pour un demarrage instantane et hors-ligne
const PREMIUM_CACHE_KEY = 'yoroi_premium_cache_v1';
/** Vue gratuit du Studio, gardee pendant la session createur */
export const SIMULATE_FREE_KEY = '@yoroi_studio_simulate_free';
/** Produit de l'abonnement actif (vague 27 : avantage annuel), garde pour le hors-ligne */
const ACTIVE_PRODUCT_KEY = 'yoroi_premium_product_v1';

/** Produit de l'entitlement Premium actif dans une reponse RevenueCat, sinon null */
function activeProductOf(info: any): string | null {
  const e = info?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID];
  return e && typeof e.productIdentifier === 'string' ? e.productIdentifier : null;
}

/**
 * Vrai seulement si l'abonnement actif est annuel : le paquet du store qui porte ce produit est ANNUAL,
 * ou, a defaut d'offres chargees, l'identifiant du produit le dit clairement. Faux des que l'info manque.
 */
export function isAnnualProduct(productId: string | null, packages: { productId: string; raw: unknown }[]): boolean {
  if (!productId) return false;
  const pkg = packages.find((p) => p.productId === productId);
  const type = (pkg?.raw as { packageType?: string } | undefined)?.packageType;
  if (type) return type === 'ANNUAL';
  return /(annual|annuel|yearly|year|_1y\b|12m)/i.test(productId);
}

export interface PremiumPackage {
  identifier: string;
  /** identifiant du produit dans le store */
  productId: string;
  priceString: string;
  /** « par an », « par mois », lu dans la periode du store */
  periodLabel: string;
  raw: unknown;
}

/** Etat de chargement des offres */
export type OffersStatus = 'loading' | 'ready' | 'error' | 'unavailable';

export type PurchaseResult = {
  success: boolean;
  error?: string;
  cancelled?: boolean;
  /** achat accepte par le store mais Premium pas actif : proposer de restaurer */
  needsRestore?: boolean;
};

interface PremiumContextValue {
  /** Acces premium effectif (abonnement actif OU mode createur, sauf en vue gratuit) */
  isPremium: boolean;
  /** Abonnement store reellement actif (hors mode dev) */
  hasActiveSubscription: boolean;
  /**
   * Vague 47 : etat de l'abonnement pour la fin du Premium. Confirme par RevenueCat, sinon le dernier etat
   * mis en cache une fois le chargement fini, sinon 'inconnu' (rien n'est alors retire). Hors mode createur.
   */
  etatAbonnement: EtatAbonnement;
  /** Vague 27 : Premium par un abonnement annuel actif (ou mode createur), faux si l'info manque */
  isAnnualPremium: boolean;
  isLoading: boolean;
  /** RevenueCat configure et operationnel */
  isStoreReady: boolean;
  packages: PremiumPackage[];
  offersStatus: OffersStatus;
  /** Tentative de chargement des offres en cours ou derniere faite (1 a 3), 0 avant la premiere */
  offersAttempt: number;
  /** Vrai si les offres sont arrivees apres au moins un echec (pour paywall_offerings_recovered) */
  offersRecovered: boolean;
  /** Relance le chargement des offres (bouton Reessayer) */
  reloadOffers: () => Promise<void>;
  /** Eligibilite a l'essai par identifiant de produit (iOS) */
  trialEligibility: Record<string, Eligibility>;
  /** Mode createur uniquement : simule un utilisateur gratuit pour voir les cadenas Premium */
  simulateFreeUser: boolean;
  toggleSimulateFreeUser: () => void;
  setSimulateFreeUser: (on: boolean) => void;
  purchase: (pkg: PremiumPackage) => Promise<PurchaseResult>;
  restore: () => Promise<{ success: boolean; restored: boolean; error?: string }>;
  refresh: () => Promise<void>;
  /** Identifiant RevenueCat de l'appareil (pour accorder un Premium promotionnel depuis le dashboard) */
  appUserId: string | null;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

// Chargement paresseux du module natif : echoue proprement si indisponible
/**
 * Vague 41 : dans Expo Go et sur le web, RevenueCat passe en mode navigateur et refuse la cle native
 * de l'App Store (console.error, bandeau rouge « Error configuring Purchases » en developpement).
 * La boutique n'existe pas dans ces environnements : on ne configure rien, on le note dans le journal
 * en developpement seulement. Les builds TestFlight et App Store gardent la boutique native, rien ne change.
 */
let storeAbsentNote = false;
function boutiqueIndisponibleIci(): boolean {
  try {
    const key = RC_API_KEY || '';
    const cleWeb = key.startsWith('test_') || key.startsWith('rcb_');
    if (cleWeb) return false;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const C = require('expo-constants');
    const Constants = C.default ?? C;
    const expoGo = Constants?.executionEnvironment === 'storeClient' || Constants?.appOwnership === 'expo';
    return Platform.OS === 'web' || expoGo;
  } catch {
    return false;
  }
}

function getPurchasesModule(): typeof import('react-native-purchases').default | null {
  if (boutiqueIndisponibleIci()) {
    if (__DEV__ && !storeAbsentNote) {
      storeAbsentNote = true;
      // eslint-disable-next-line no-console
      console.log('[Premium] Boutique indisponible dans Expo Go ou sur le web : RevenueCat non configuré (normal ici).');
    }
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}


export function PremiumProvider({ children }: { children: ReactNode }) {
  const { isCreator, ready: creatorReady } = useCreatorMode();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [activeProduct, setActiveProduct] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // vague 47 : etat confirme par RevenueCat (null tant qu'il n'a pas repondu) et dernier etat en cache (null si aucun)
  const [etatConfirme, setEtatConfirme] = useState<boolean | null>(null);
  const [etatCache, setEtatCache] = useState<boolean | null>(null);
  const [isStoreReady, setIsStoreReady] = useState(false);
  const [packages, setPackages] = useState<PremiumPackage[]>([]);
  const [offersStatus, setOffersStatus] = useState<OffersStatus>('loading');
  const [trialEligibility, setTrialEligibility] = useState<Record<string, Eligibility>>({});
  const offersRun = useRef(0);
  // tentative en cours (0 avant le premier chargement) et offres recuperees apres un echec
  const [offersAttempt, setOffersAttempt] = useState(0);
  const [offersRecovered, setOffersRecovered] = useState(false);
  const offersFailedRef = useRef(false);
  const { creatorPremium } = usePremiumFlags();
  const customerInfoListenerRef = useRef<((info: any) => void) | null>(null);
  // dernier statut d'abonnement connu (cache local ou RevenueCat) : sert au garde-fou anti degradation
  const etaitPremiumRef = useRef(false);
  const [appUserId, setAppUserId] = useState<string | null>(null);
  const [simulateRaw, setSimulateRaw] = useState(false);
  const simulateFreeUser = isCreator && simulateRaw;

  // la vue gratuit est relue au demarrage et oubliee des que le mode createur se ferme
  useEffect(() => {
    if (!creatorReady) return;
    if (!isCreator) {
      setSimulateRaw(false);
      AsyncStorage.removeItem(SIMULATE_FREE_KEY).catch(() => {});
      return;
    }
    AsyncStorage.getItem(SIMULATE_FREE_KEY).then((v) => setSimulateRaw(v === 'true')).catch(() => {});
  }, [isCreator, creatorReady]);

  const setSimulateFreeUser = useCallback((on: boolean) => {
    setSimulateRaw(on);
    if (on) AsyncStorage.setItem(SIMULATE_FREE_KEY, 'true').catch(() => {});
    else AsyncStorage.removeItem(SIMULATE_FREE_KEY).catch(() => {});
  }, []);
  const toggleSimulateFreeUser = useCallback(() => setSimulateFreeUser(!simulateRaw), [setSimulateFreeUser, simulateRaw]);

  const applyEntitlement = useCallback(async (active: boolean, info?: unknown) => {
    etaitPremiumRef.current = active;
    setHasActiveSubscription(active);
    setEtatConfirme(active);
    if (info !== undefined) {
      const product = active ? activeProductOf(info) : null;
      setActiveProduct(product);
      try {
        if (product) await SecureStore.setItemAsync(ACTIVE_PRODUCT_KEY, product);
        else await SecureStore.deleteItemAsync(ACTIVE_PRODUCT_KEY);
      } catch {
        // cache non bloquant
      }
    } else if (!active) {
      setActiveProduct(null);
    }
    try {
      await SecureStore.setItemAsync(PREMIUM_CACHE_KEY, active ? '1' : '0');
    } catch {
      // cache non bloquant
    }
  }, []);

  /**
   * Garde-fou (13 octobre 2026) : une reponse RevenueCat sans abonnement actif ne degrade un abonne
   * qu'apres invalidation du cache RevenueCat et une seconde lecture qui le confirme.
   * Si la seconde lecture echoue, rien ne change. Voir lib/v2/premium/gardeDegradation.ts.
   */
  const appliquerAvecGarde = useCallback(async (
    Purchases: NonNullable<ReturnType<typeof getPurchasesModule>>,
    info: any,
  ) => {
    const lire = (i: any) => ({ actif: Boolean(i?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID]), info: i });
    const decision = await statutApresGarde(lire(info), etaitPremiumRef.current, async () => {
      try { await Purchases.invalidateCustomerInfoCache(); } catch { /* relecture quand meme */ }
      return lire(await Purchases.getCustomerInfo());
    });
    if (etaitPremiumRef.current && !lire(info).actif && decision.appliquer) {
      track(decision.actif ? 'premium_degradation_evitee' : 'premium_perdu_confirme');
    }
    if (decision.appliquer) await applyEntitlement(decision.actif, decision.info);
  }, [applyEntitlement]);

  const checkEligibility = useCallback(async (Purchases: NonNullable<ReturnType<typeof getPurchasesModule>>, ids: string[]) => {
    if (Platform.OS !== 'ios' || ids.length === 0) return;
    try {
      const res = await Purchases.checkTrialOrIntroductoryPriceEligibility(ids);
      const map: Record<string, Eligibility> = {};
      for (const id of ids) {
        const status = Number((res as Record<string, { status?: number }>)[id]?.status);
        // 2 : eligible ; 1 : deja utilise ; 3 : pas d'essai ; 0 : inconnu
        map[id] = status === 2 ? 'eligible' : status === 1 || status === 3 ? 'ineligible' : 'unknown';
      }
      setTrialEligibility(map);
    } catch {
      // eligibilite inconnue : l'essai n'est pas promis
    }
  }, []);

  /**
   * Offres de l'offering current : 3 tentatives (delais 0, 1000 et 2500 ms), chacune limitee a 7000 ms
   * (Promise.race), puis erreur. offersAttempt dit la tentative en cours, offersRecovered si les offres
   * sont arrivees apres un echec (tentative ratee dans ce chargement, ou chargement precedent en erreur).
   */
  const loadOfferings = useCallback(async (Purchases: NonNullable<ReturnType<typeof getPurchasesModule>>) => {
    const run = ++offersRun.current;
    setOffersStatus('loading');
    setOffersRecovered(false);
    let echecs = offersFailedRef.current ? 1 : 0;
    for (let k = 0; k < OFFERS_DELAYS.length; k++) {
      const wait = OFFERS_DELAYS[k];
      if (wait) await new Promise((r) => setTimeout(r, wait));
      if (run !== offersRun.current) return;
      setOffersAttempt(k + 1);
      const minuteur: { id?: ReturnType<typeof setTimeout> } = {};
      try {
        const offerings = await Promise.race([
          Purchases.getOfferings(),
          new Promise<never>((_, reject) => {
            minuteur.id = setTimeout(() => reject(new Error('offres_timeout')), OFFERS_TIMEOUT_MS);
          }),
        ]);
        const current = offerings.current;
        const list = current?.availablePackages ?? [];
        if (list.length === 0) {
          echecs += 1;
          continue;
        }
        const pkgs: PremiumPackage[] = list.map((p) => {
          const info = describeOffer(p, p.product.priceString);
          return { identifier: p.identifier, productId: p.product.identifier, priceString: p.product.priceString, periodLabel: info.per, raw: p };
        });
        if (run !== offersRun.current) return;
        offersFailedRef.current = false;
        setPackages(pkgs);
        setOffersRecovered(echecs > 0);
        setOffersStatus('ready');
        void checkEligibility(Purchases, pkgs.map((p) => p.productId));
        return;
      } catch {
        // hors ligne, store indisponible ou delai depasse : on relance
        echecs += 1;
      } finally {
        if (minuteur.id) clearTimeout(minuteur.id);
      }
    }
    if (run === offersRun.current) {
      offersFailedRef.current = true;
      setOffersStatus('error');
    }
  }, [checkEligibility]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1. Cache local d'abord : demarrage instantane, meme hors-ligne
      try {
        const cached = await SecureStore.getItemAsync(PREMIUM_CACHE_KEY);
        if (!cancelled) setEtatCache(cached === '1' ? true : cached === '0' ? false : null);
        if (!cancelled && cached === '1') {
          etaitPremiumRef.current = true;
          setHasActiveSubscription(true);
          const product = await SecureStore.getItemAsync(ACTIVE_PRODUCT_KEY).catch(() => null);
          if (!cancelled && product) setActiveProduct(product);
        }
      } catch {
        // ignore
      }

      // 2. RevenueCat si configure et disponible
      const Purchases = getPurchasesModule();
      if (!RC_API_KEY || !Purchases) {
        if (!cancelled) setOffersStatus('unavailable');
      }
      if (RC_API_KEY && Purchases) {
        try {
          Purchases.configure({ apiKey: RC_API_KEY });
          // La boutique est prête dès la configuration : achat et restauration restent
          // possibles même si getCustomerInfo échoue au démarrage (réseau instable)
          if (cancelled) return;
          setIsStoreReady(true);
          if (!customerInfoListenerRef.current) {
            const listener = (updated: any) => {
              void appliquerAvecGarde(Purchases, updated);
            };
            Purchases.addCustomerInfoUpdateListener(listener);
            customerInfoListenerRef.current = listener;
          }
          void loadOfferings(Purchases);
          // lien RevenueCat et Firebase : l'identifiant d'instance Firebase devient l'attribut $firebaseAppInstanceId
          idInstanceMesure()
            .then((id) => { if (id) Purchases.setFirebaseAppInstanceID?.(id); })
            .catch(() => {});
          Promise.resolve(Purchases.getAppUserID?.()).then((id: any) => {
            if (!cancelled && typeof id === 'string') setAppUserId(id);
          }).catch(() => {});
          const info = await Purchases.getCustomerInfo();
          if (cancelled) return;
          await appliquerAvecGarde(Purchases, info);
        } catch {
          // pas de reseau ou configuration invalide : on reste sur le cache
          // offres jamais demandees (configuration en echec) : erreur visible plutot qu'un chargement sans fin
          if (!cancelled && offersRun.current === 0) setOffersStatus('error');
        }
      }

      if (!cancelled) setIsLoading(false);
    };

    void init();
    return () => {
      cancelled = true;
      const listener = customerInfoListenerRef.current;
      if (listener) {
        try { getPurchasesModule()?.removeCustomerInfoUpdateListener?.(listener); } catch {}
        customerInfoListenerRef.current = null;
      }
    };
  }, [appliquerAvecGarde, loadOfferings]);

  const purchase = useCallback(
    async (pkg: PremiumPackage): Promise<PurchaseResult> => {
      if (getPurchasePreview()) return { success: false, error: PREVIEW_PURCHASE_MESSAGE };
      const Purchases = getPurchasesModule();
      if (!Purchases || !isStoreReady) {
        return { success: false, error: traduire('La boutique n’est pas disponible pour le moment. Réessaie dans un instant.') };
      }
      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg.raw as never);
        let active = Boolean(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
        let lastInfo: unknown = customerInfo;
        if (!active) {
          // le store a valide l'achat mais l'acces n'est pas encore remonte : une relecture
          await new Promise((r) => setTimeout(r, 1500));
          try {
            const again = await Purchases.getCustomerInfo();
            active = Boolean(again.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
            lastInfo = again;
          } catch {
            // on garde le premier resultat
          }
        }
        await applyEntitlement(active, lastInfo);
        if (active) return { success: true };
        return {
          success: false,
          needsRestore: true,
          error: traduire('Le store a validé ton achat, mais Premium ne s’est pas encore activé. Touche Restaurer mes achats pour le récupérer. Si ça ne marche pas, écris à yoroiapp@hotmail.com.'),
        };
      } catch (e) {
        const err = e as { userCancelled?: boolean; message?: string };
        if (err.userCancelled) return { success: false, cancelled: true };
        return { success: false, error: traduire('L’achat n’a pas pu aboutir. Vérifie ta connexion et réessaie.') };
      }
    },
    [isStoreReady, applyEntitlement]
  );

  const restore = useCallback(async (): Promise<{ success: boolean; restored: boolean; error?: string }> => {
    if (getPurchasePreview()) return { success: false, restored: false, error: PREVIEW_PURCHASE_MESSAGE };
    const Purchases = getPurchasesModule();
    if (!Purchases || !isStoreReady) {
      return { success: false, restored: false, error: traduire('La boutique n’est pas disponible pour le moment.') };
    }
    try {
      const info = await Purchases.restorePurchases();
      await appliquerAvecGarde(Purchases, info);
      return { success: true, restored: etaitPremiumRef.current };
    } catch {
      return { success: false, restored: false, error: traduire('La restauration n’a pas pu aboutir. Vérifie ta connexion et réessaie.') };
    }
  }, [isStoreReady, appliquerAvecGarde]);

  const refresh = useCallback(async () => {
    const Purchases = getPurchasesModule();
    if (!Purchases || !isStoreReady) return;
    if (packages.length === 0 && offersStatus !== 'loading') void loadOfferings(Purchases);
    try {
      const info = await Purchases.getCustomerInfo();
      await appliquerAvecGarde(Purchases, info);
    } catch {
      // hors-ligne : on garde le cache
    }
  }, [isStoreReady, appliquerAvecGarde, packages.length, loadOfferings, offersStatus]);

  const reloadOffers = useCallback(async () => {
    const Purchases = getPurchasesModule();
    if (!Purchases || !isStoreReady) {
      setOffersStatus(RC_API_KEY && Purchases ? 'error' : 'unavailable');
      return;
    }
    await loadOfferings(Purchases);
  }, [isStoreReady, loadOfferings]);

  const value: PremiumContextValue = useMemo(() => ({
    isPremium: !simulateFreeUser && (hasActiveSubscription || isCreator || creatorPremium),
    hasActiveSubscription,
    etatAbonnement: etatConfirme !== null ? (etatConfirme ? 'actif' : 'inactif') : isLoading || etatCache === null ? 'inconnu' : etatCache ? 'actif' : 'inactif',
    isAnnualPremium: !simulateFreeUser && ((hasActiveSubscription && isAnnualProduct(activeProduct, packages)) || isCreator),
    isLoading,
    isStoreReady,
    packages,
    offersStatus,
    offersAttempt,
    offersRecovered,
    reloadOffers,
    trialEligibility,
    simulateFreeUser,
    toggleSimulateFreeUser,
    setSimulateFreeUser,
    purchase,
    restore,
    refresh,
    appUserId,
  }), [
    appUserId,
    activeProduct,
    simulateFreeUser,
    hasActiveSubscription,
    etatConfirme,
    etatCache,
    isCreator,
    creatorPremium,
    offersStatus,
    offersAttempt,
    offersRecovered,
    reloadOffers,
    trialEligibility,
    isLoading,
    isStoreReady,
    packages,
    toggleSimulateFreeUser,
    setSimulateFreeUser,
    purchase,
    restore,
    refresh,
  ]);

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremium doit etre utilise dans un PremiumProvider');
  }
  return ctx;
}
