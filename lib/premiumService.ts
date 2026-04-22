// ============================================
// PREMIUM SERVICE
// Gestion du flag isPremium + features verrouillées.
//
// Pour l'instant, pas d'intégration StoreKit/Google Play : c'est un flag
// local. Quand tu voudras vraiment monétiser :
//   1. Installer `react-native-iap` ou `react-native-purchases` (RevenueCat)
//   2. Configurer les produits dans App Store Connect + Play Console
//   3. Remplacer les fonctions set/get par les hooks IAP
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const PREMIUM_FLAG_KEY = '@yoroi_is_premium';
const PREMIUM_EXPIRES_KEY = '@yoroi_premium_expires';
const PREMIUM_CHANGED_EVENT = 'YOROI_PREMIUM_CHANGED';

export type PremiumFeature =
  | 'ios_widget'           // Widget iOS Home Screen
  | 'live_activity'        // Dynamic Island pendant séance
  | 'technique_heatmap'    // Heatmap techniques Sparring
  | 'methods_timeline'     // Timeline évolution finitions
  | 'auto_insights'        // Bandeau insights auto
  | 'fun_comparisons'      // Carrousel comparaisons fun
  | 'share_stats_card'     // Carte partage Instagram HD
  | 'unlimited_filters'    // Filtres avancés (ex: stats)
  | 'export_pdf'           // Export PDF mensuel
  | 'weekly_recap_notif'   // Notif récap dimanche
  | 'multi_device_sync';   // Sync iPhone↔iPad

/**
 * Features qui restent gratuites (essence de l'app).
 * Tout ce qui n'est PAS dans PremiumFeature ci-dessus reste accessible à tous.
 */
const FREE_FEATURES = new Set<string>([
  'basic_stats', 'add_training', 'add_weight', 'basic_backup',
  'healthkit_sync', 'basic_sparring_stats',
]);

let _isPremium: boolean | null = null;
let _expiresAt: number | null = null;

/**
 * Init : charge l'état Premium depuis AsyncStorage.
 */
export const initPremium = async (): Promise<void> => {
  try {
    const [flag, expStr] = await Promise.all([
      AsyncStorage.getItem(PREMIUM_FLAG_KEY),
      AsyncStorage.getItem(PREMIUM_EXPIRES_KEY),
    ]);
    _isPremium = flag === 'true';
    _expiresAt = expStr ? parseInt(expStr, 10) : null;

    // Auto-expire si date dépassée
    if (_isPremium && _expiresAt && Date.now() > _expiresAt) {
      _isPremium = false;
      await AsyncStorage.setItem(PREMIUM_FLAG_KEY, 'false');
    }
  } catch {
    _isPremium = false;
  }
};

/**
 * Retourne true si l'user a Premium actif.
 */
export const isPremium = (): boolean => _isPremium ?? false;

/**
 * Retourne true si la feature est débloquée (gratuite ou Premium actif).
 */
export const hasFeature = (feature: PremiumFeature): boolean => {
  // Si déjà gratuit → toujours accessible
  if (FREE_FEATURES.has(feature)) return true;
  return isPremium();
};

/**
 * Active Premium (après achat IAP ou code promo).
 * durationDays : durée en jours (null = illimité).
 */
export const unlockPremium = async (durationDays: number | null = null): Promise<void> => {
  _isPremium = true;
  await AsyncStorage.setItem(PREMIUM_FLAG_KEY, 'true');
  if (durationDays) {
    _expiresAt = Date.now() + durationDays * 86400 * 1000;
    await AsyncStorage.setItem(PREMIUM_EXPIRES_KEY, String(_expiresAt));
  } else {
    _expiresAt = null;
    await AsyncStorage.removeItem(PREMIUM_EXPIRES_KEY);
  }
  DeviceEventEmitter.emit(PREMIUM_CHANGED_EVENT);
};

/**
 * Désactive Premium (test / debug / refund).
 */
export const lockPremium = async (): Promise<void> => {
  _isPremium = false;
  await AsyncStorage.setItem(PREMIUM_FLAG_KEY, 'false');
  await AsyncStorage.removeItem(PREMIUM_EXPIRES_KEY);
  DeviceEventEmitter.emit(PREMIUM_CHANGED_EVENT);
};

/**
 * Écoute les changements d'état Premium pour rafraîchir l'UI.
 */
export const onPremiumChange = (cb: () => void): (() => void) => {
  const sub = DeviceEventEmitter.addListener(PREMIUM_CHANGED_EVENT, cb);
  return () => sub.remove();
};

/**
 * Retourne la date d'expiration (null si illimité ou non-premium).
 */
export const getPremiumExpiresAt = (): Date | null => {
  return _expiresAt ? new Date(_expiresAt) : null;
};
