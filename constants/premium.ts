/**
 * PREMIUM - YOROI
 *
 * Configuration du freemium : cles RevenueCat, produits et prix de secours.
 */

import { Platform } from 'react-native';

// Cles API publiques RevenueCat, lues depuis .env (jamais en dur dans le code).
// .env :
//   EXPO_PUBLIC_RC_YOROI_IOS_KEY=appl_xxx
//   EXPO_PUBLIC_RC_YOROI_ANDROID_KEY=goog_xxx
export const RC_API_KEY =
  Platform.OS === 'ios'
    ? (process.env.EXPO_PUBLIC_RC_YOROI_IOS_KEY ?? '')
    : (process.env.EXPO_PUBLIC_RC_YOROI_ANDROID_KEY ?? '');

// Identifiant de l'entitlement configure dans RevenueCat
export const PREMIUM_ENTITLEMENT_ID = 'premium';

// Identifiants produits (App Store Connect / Play Console)
export const PRODUCT_MONTHLY = 'yoroi_premium_monthly';
export const PRODUCT_ANNUAL = 'yoroi_premium_annual';

// Prix affiches en secours si les offres RevenueCat ne sont pas chargees
export const FALLBACK_PRICE_MONTHLY = '3,99 €/mois';
export const FALLBACK_PRICE_ANNUAL = '29,99 €/an';
