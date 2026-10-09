/**
 * PREMIUM CONTEXT - YOROI
 *
 * Gestion de l'abonnement Premium via RevenueCat (react-native-purchases).
 * Concu pour fonctionner meme sans configuration RevenueCat :
 *  - cles API absentes ou module natif indisponible : etat premium lu depuis
 *    le cache local chiffre (SecureStore), achats desactives
 *  - le Mode Dev ne donne acces Premium qu'en build de developpement (__DEV__) :
 *    en production, le code Mode Dev etait trouvable et debloquait Premium gratuitement.
 *    Pour tester Premium en production : achat sandbox / TestFlight ou entitlement
 *    promotionnel accorde depuis le dashboard RevenueCat.
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useDevMode } from '@/lib/DevModeContext';
import {
  RC_API_KEY,
  PREMIUM_ENTITLEMENT_ID,
} from '@/constants/premium';

// Cache local du statut premium pour un demarrage instantane et hors-ligne
const PREMIUM_CACHE_KEY = 'yoroi_premium_cache_v1';

export interface PremiumPackage {
  identifier: string;
  priceString: string;
  periodLabel: string;
  raw: unknown;
}

interface PremiumContextValue {
  /** Acces premium effectif (abonnement actif OU mode dev, sauf si simulateFreeUser) */
  isPremium: boolean;
  /** Abonnement store reellement actif (hors mode dev) */
  hasActiveSubscription: boolean;
  isLoading: boolean;
  /** RevenueCat configure et operationnel */
  isStoreReady: boolean;
  packages: PremiumPackage[];
  /** Mode dev uniquement : simule un utilisateur gratuit pour voir les gates premium */
  simulateFreeUser: boolean;
  toggleSimulateFreeUser: () => void;
  purchase: (pkg: PremiumPackage) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; restored: boolean; error?: string }>;
  refresh: () => Promise<void>;
  /** Identifiant RevenueCat de l'appareil (pour accorder un Premium promotionnel depuis le dashboard) */
  appUserId: string | null;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

// Chargement paresseux du module natif : echoue proprement si indisponible
function getPurchasesModule(): typeof import('react-native-purchases').default | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases');
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

function periodLabelFor(identifier: string, packageType?: string): string {
  const id = `${packageType ?? ''} ${identifier ?? ''}`.toUpperCase();
  if (id.includes('ANNUAL') || id.includes('YEAR')) return 'par an';
  if (id.includes('MONTH')) return 'par mois';
  if (id.includes('LIFETIME')) return 'a vie';
  return '';
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { isDevMode } = useDevMode();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStoreReady, setIsStoreReady] = useState(false);
  const [packages, setPackages] = useState<PremiumPackage[]>([]);
  const customerInfoListenerRef = useRef<((info: any) => void) | null>(null);
  const [appUserId, setAppUserId] = useState<string | null>(null);
  const [simulateFreeUser, setSimulateFreeUser] = useState(false);
  const toggleSimulateFreeUser = useCallback(() => setSimulateFreeUser(v => !v), []);

  const applyEntitlement = useCallback(async (active: boolean) => {
    setHasActiveSubscription(active);
    try {
      await SecureStore.setItemAsync(PREMIUM_CACHE_KEY, active ? '1' : '0');
    } catch {
      // cache non bloquant
    }
  }, []);

  const loadOfferings = useCallback(async (Purchases: NonNullable<ReturnType<typeof getPurchasesModule>>) => {
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings.current;
      if (!current) return;
      const pkgs: PremiumPackage[] = current.availablePackages.map((p) => ({
        identifier: p.identifier,
        priceString: p.product.priceString,
        periodLabel: periodLabelFor(`${p.identifier} ${p.product?.identifier ?? ''}`, String(p.packageType)),
        raw: p,
      }));
      setPackages(pkgs);
    } catch {
      // offres indisponibles (hors-ligne) : le paywall affiche les prix de secours
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      // 1. Cache local d'abord : demarrage instantane, meme hors-ligne
      try {
        const cached = await SecureStore.getItemAsync(PREMIUM_CACHE_KEY);
        if (!cancelled && cached === '1') setHasActiveSubscription(true);
      } catch {
        // ignore
      }

      // 2. RevenueCat si configure et disponible
      const Purchases = getPurchasesModule();
      if (RC_API_KEY && Purchases) {
        try {
          Purchases.configure({ apiKey: RC_API_KEY });
          // La boutique est prête dès la configuration : achat et restauration restent
          // possibles même si getCustomerInfo échoue au démarrage (réseau instable)
          if (cancelled) return;
          setIsStoreReady(true);
          if (!customerInfoListenerRef.current) {
            const listener = (updated: any) => {
              const nowActive = Boolean(updated.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
              void applyEntitlement(nowActive);
            };
            Purchases.addCustomerInfoUpdateListener(listener);
            customerInfoListenerRef.current = listener;
          }
          void loadOfferings(Purchases);
          Promise.resolve(Purchases.getAppUserID?.()).then((id: any) => {
            if (!cancelled && typeof id === 'string') setAppUserId(id);
          }).catch(() => {});
          const info = await Purchases.getCustomerInfo();
          if (cancelled) return;
          const active = Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
          await applyEntitlement(active);
        } catch {
          // pas de reseau ou configuration invalide : on reste sur le cache
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
  }, [applyEntitlement, loadOfferings]);

  const purchase = useCallback(
    async (pkg: PremiumPackage): Promise<{ success: boolean; error?: string }> => {
      const Purchases = getPurchasesModule();
      if (!Purchases || !isStoreReady) {
        return { success: false, error: 'Boutique indisponible pour le moment. Reessayez plus tard.' };
      }
      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg.raw as never);
        const active = Boolean(customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
        await applyEntitlement(active);
        return { success: active };
      } catch (e) {
        const err = e as { userCancelled?: boolean; message?: string };
        if (err.userCancelled) return { success: false };
        return { success: false, error: 'Achat impossible. Verifiez votre connexion et reessayez.' };
      }
    },
    [isStoreReady, applyEntitlement]
  );

  const restore = useCallback(async (): Promise<{ success: boolean; restored: boolean; error?: string }> => {
    const Purchases = getPurchasesModule();
    if (!Purchases || !isStoreReady) {
      return { success: false, restored: false, error: 'Boutique indisponible pour le moment.' };
    }
    try {
      const info = await Purchases.restorePurchases();
      const active = Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
      await applyEntitlement(active);
      return { success: true, restored: active };
    } catch {
      return { success: false, restored: false, error: 'Restauration impossible. Verifiez votre connexion.' };
    }
  }, [isStoreReady, applyEntitlement]);

  const refresh = useCallback(async () => {
    const Purchases = getPurchasesModule();
    if (!Purchases || !isStoreReady) return;
    if (packages.length === 0) await loadOfferings(Purchases);
    try {
      const info = await Purchases.getCustomerInfo();
      const active = Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
      await applyEntitlement(active);
    } catch {
      // hors-ligne : on garde le cache
    }
  }, [isStoreReady, applyEntitlement, packages.length, loadOfferings]);

  const value: PremiumContextValue = useMemo(() => ({
    isPremium: !simulateFreeUser && (hasActiveSubscription || (__DEV__ && isDevMode)),
    hasActiveSubscription,
    isLoading,
    isStoreReady,
    packages,
    simulateFreeUser,
    toggleSimulateFreeUser,
    purchase,
    restore,
    refresh,
    appUserId,
  }), [
    appUserId,
    simulateFreeUser,
    hasActiveSubscription,
    isDevMode,
    isLoading,
    isStoreReady,
    packages,
    toggleSimulateFreeUser,
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
