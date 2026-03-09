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
  // URL de recherche Play Store tant que l'app n'a pas de lien direct
  androidSearchUrl: 'https://play.google.com/store/search?q=Yoroi+Suivi+de+poids+%26+Sport&c=apps',

  getStoreUrl: () => {
    if (Platform.OS === 'ios') {
      if (APP_CONFIG.appStoreId) {
        return `https://apps.apple.com/app/yoroi/id${APP_CONFIG.appStoreId}`;
      }
      return 'https://apps.apple.com/app/yoroi';
    }
    // Android — redirige vers la recherche Play Store
    return APP_CONFIG.androidSearchUrl;
  },

  getReviewUrl: () => {
    if (Platform.OS === 'ios') {
      if (APP_CONFIG.appStoreId) {
        return `https://apps.apple.com/app/yoroi/id${APP_CONFIG.appStoreId}?action=write-review`;
      }
      return 'https://apps.apple.com/app/yoroi';
    }
    // Android — redirige vers la recherche Play Store
    return APP_CONFIG.androidSearchUrl;
  },

  // === APP GROUP (pour partage de données iOS) ===
  appGroup: 'group.com.yoroi.app',

  // === VERSION ===
  version: '2.3.0',

  // === DEVELOPER INFO ===
  developer: {
    name: 'Yoroi Team',
    email: 'yoroiapp@hotmail.com',
  },

  // === SUPPORT ===
  supportEmail: 'yoroiapp@hotmail.com',
} as const;

export default APP_CONFIG;
