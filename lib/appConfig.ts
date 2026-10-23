// ============================================
// YOROI - Configuration App
// ============================================
// Centralise les informations de l'application
// ============================================

import { Platform } from 'react-native';

export const APP_CONFIG = {
  // === IDENTIFIANTS ===
  bundleId: {
    ios: 'com.houari.yoroi',
    android: 'com.houari.yoroi',
  },

  // === APP STORE ===
  appStoreId: '6757306612',
  sku: 'yoroi2026',

  // === URLS ===
  // URL de recherche Play Store (ancien lien, garde pour les ecrans qui le citent encore)
  androidSearchUrl: 'https://play.google.com/store/search?q=Yoroi+Suivi+de+poids+%26+Sport&c=apps',

  /**
   * 17 octobre 2026 : fiche Google Play construite depuis le vrai package Android
   * (app.json android.package et android/app/build.gradle applicationId : com.houari.yoroi).
   * market:// ouvre directement l'app Play Store ; le lien https sert de repli (navigateur, pas de Play Store).
   */
  getPlayStoreUrl: () => `https://play.google.com/store/apps/details?id=${APP_CONFIG.bundleId.android}`,
  getPlayMarketUrl: () => `market://details?id=${APP_CONFIG.bundleId.android}`,

  getStoreUrl: () => {
    if (Platform.OS === 'ios') {
      if (APP_CONFIG.appStoreId) {
        return `https://apps.apple.com/app/yoroi/id${APP_CONFIG.appStoreId}`;
      }
      return 'https://apps.apple.com/app/yoroi';
    }
    // Android : la fiche de l'app sur Google Play
    return APP_CONFIG.getPlayStoreUrl();
  },

  getReviewUrl: () => {
    if (Platform.OS === 'ios') {
      if (APP_CONFIG.appStoreId) {
        return `https://apps.apple.com/app/yoroi/id${APP_CONFIG.appStoreId}?action=write-review`;
      }
      return 'https://apps.apple.com/app/yoroi';
    }
    // Android : la fiche de l'app sur Google Play (la note se donne en bas de la fiche)
    return APP_CONFIG.getPlayStoreUrl();
  },

  // === APP GROUP (pour partage de données iOS) ===
  appGroup: 'group.com.yoroi.app',

  // === VERSION ===
  // La version n'est plus ecrite ici : lire appVersion() de components/yoroi/v2/espace/reglages/version.ts

  // === DEVELOPER INFO ===
  developer: {
    name: 'Yoroi Team',
    email: 'yoroiapp@hotmail.com',
  },

  // === SUPPORT ===
  supportEmail: 'yoroiapp@hotmail.com',

  /**
   * 18 octobre 2026 (3.0.0) : pages publiques du site yoroiapp.com (Cloudflare Pages, projet yoroiapp).
   * Les ecrans de l'app (conditions, confidentialite) restent integres et lisibles hors ligne :
   * ces liens donnent en plus la version en ligne, et la page d'aide demandee par Apple.
   */
  site: {
    accueil: 'https://yoroiapp.com',
    confidentialite: 'https://yoroiapp.com/confidentialite.html',
    privacy: 'https://yoroiapp.com/privacy.html',
    conditions: 'https://yoroiapp.com/conditions.html',
    support: 'https://yoroiapp.com/support.html',
    suppressionDonnees: 'https://yoroiapp.com/suppression-donnees.html',
  },
} as const;

/** Politique de confidentialite en ligne : la page francaise en francais, la page anglaise pour les autres langues */
export function lienConfidentialite(langue: string | null | undefined): string {
  return langue === 'fr' ? APP_CONFIG.site.confidentialite : APP_CONFIG.site.privacy;
}

/**
 * Ouvre la fiche du store pour noter l'app. Android : market:// d'abord (app Play Store), sinon le lien https.
 * openURL est passe en parametre pour rester testable (Linking.openURL dans l'app).
 */
export async function ouvrirFicheStore(openURL: (url: string) => Promise<unknown>, os: string = Platform.OS): Promise<string | null> {
  const essais = os === 'android' ? [APP_CONFIG.getPlayMarketUrl(), APP_CONFIG.getPlayStoreUrl()] : [APP_CONFIG.getReviewUrl()];
  for (const url of essais) {
    try {
      await openURL(url);
      return url;
    } catch {
      // lien suivant
    }
  }
  return null;
}

export default APP_CONFIG;
