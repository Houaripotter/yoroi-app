/**
 * PREMIUM CONTEXT - YOROI
 *
 * Gestion de l'abonnement Premium via RevenueCat (react-native-purchases).
 * Concu pour fonctionner meme sans configuration RevenueCat :
 *  - cles API absentes ou module natif indisponible : etat premium lu depuis
 *    le cache local chiffre (SecureStore), achats desactives
 *  - le Mode Dev actif donne toujours acces Premium (proprietaire/testeurs)
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useDevMode } from '@/lib/DevModeContext';
import { getUserSettings } from '@/lib/storage';
import {
  RC_API_KEY,
  PREMIUM_ENTITLEMENT_ID,
} from '@/constants/premium';

// Cache local du statut premium pour un demarrage instantane et hors-ligne
const PREMIUM_CACHE_KEY = 'yoroi_premium_cache_v1';

// Grand-perisage : les utilisateurs qui avaient deja l'app avant le passage
// en freemium gardent l'acces complet gratuitement.
const LEGACY_FREE_KEY = 'yoroi_legacy_free_v1';

export interface PremiumPackage {
  identifier: string;
  priceString: string;
  periodLabel: string;
  raw: unknown;
}

interface PremiumContextValue {
  /** Acces premium effectif (abonnement actif OU mode dev OU utilisateur historique) */
  isPremium: boolean;
  /** Abonnement store reellement actif (hors mode dev) */
  hasActiveSubscription: boolean;
  /** Utilisateur historique : acces complet conserve */
  isLegacyFree: boolean;
  isLoading: boolean;
  /** RevenueCat configure et operationnel */
  isStoreReady: boolean;
  packages: PremiumPackage[];
  purchase: (pkg: PremiumPackage) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; restored: boolean; error?: string }>;
  refresh: () => Promise<void>;
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
  const id = (packageType ?? identifier ?? '').toUpperCase();
  if (id.includes('ANNUAL') || id.includes('YEAR')) return 'par an';
  if (id.includes('MONTH')) return 'par mois';
  if (id.includes('LIFETIME')) return 'a vie';
  return '';
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { isDevMode } = useDevMode();
  const [isLegacyFree, setIsLegacyFree] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isStoreReady, setIsStoreReady] = useState(false);
  const [packages, setPackages] = useState<PremiumPackage[]>([]);

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
        periodLabel: periodLabelFor(p.identifier, String(p.packageType)),
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
          const info = await Purchases.getCustomerInfo();
          if (cancelled) return;
          setIsStoreReady(true);
          const active = Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
          await applyEntitlement(active);
          await loadOfferings(Purchases);

          Purchases.addCustomerInfoUpdateListener((updated) => {
            const nowActive = Boolean(updated.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
            void applyEntitlement(nowActive);
          });
        } catch {
          // pas de reseau ou configuration invalide : on reste sur le cache
        }
      }

      if (!cancelled) setIsLoading(false);
    };

    void init();
    return () => {
      cancelled = true;
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
    try {
      const info = await Purchases.getCustomerInfo();
      const active = Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT_ID]);
      await applyEntitlement(active);
    } catch {
      // hors-ligne : on garde le cache
    }
  }, [isStoreReady, applyEntitlement]);

  // Grand-perisage : les utilisateurs qui avaient deja un profil avant le freemium
  // gardent l'acces complet gratuitement.
  useEffect(() => {
    let cancelled = false;
    const decide = async () => {
      try {
        const stored = await SecureStore.getItemAsync(LEGACY_FREE_KEY);
        if (cancelled) return;
        if (stored === '1') {
          setIsLegacyFree(true);
          return;
        }
        if (stored === '0') return;
        // Premiere execution de cette version : verifier si l'utilisateur a deja un profil
        const settings = await getUserSettings();
        const hasProfile = Boolean(settings.username);
        setIsLegacyFree(hasProfile);
        await SecureStore.setItemAsync(LEGACY_FREE_KEY, hasProfile ? '1' : '0');
      } catch {
        // non bloquant : par defaut, pas d'acces historique
      }
    };
    void decide();
    return () => {
      cancelled = true;
    };
  }, []);

  const value: PremiumContextValue = {
    isPremium: hasActiveSubscription || isDevMode || isLegacyFree,
    hasActiveSubscription,
    isLegacyFree,
    isLoading,
    isStoreReady,
    packages,
    purchase,
    restore,
    refresh,
  };

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremium doit etre utilise dans un PremiumProvider');
  }
  return ctx;
}
