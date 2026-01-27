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
  getStoreUrl: () => {
    if (Platform.OS === 'ios') {
      // Si pas d'ID App Store, utiliser le lien de recherche
      if (APP_CONFIG.appStoreId) {
        return `https://apps.apple.com/app/yoroi/id${APP_CONFIG.appStoreId}`;
      }
      // Fallback: recherche par nom
      return 'https://apps.apple.com/app/yoroi';
    }
    // Android
    return `https://play.google.com/store/apps/details?id=${APP_CONFIG.bundleId.android}`;
  },

  getReviewUrl: () => {
    if (Platform.OS === 'ios') {
      if (APP_CONFIG.appStoreId) {
        return `https://apps.apple.com/app/yoroi/id${APP_CONFIG.appStoreId}?action=write-review`;
      }
      return 'https://apps.apple.com/app/yoroi';
    }
    return `https://play.google.com/store/apps/details?id=${APP_CONFIG.bundleId.android}`;
  },

  // === APP GROUP (pour partage de données iOS) ===
  appGroup: 'group.com.yoroi.app',

  // === VERSION ===
  version: '2.0',

  // === DEVELOPER INFO ===
  developer: {
    name: 'Houari BOUKEROUCHA',
    teamId: 'LTMAN6D7GZ',
    email: 'yoroiapp@hotmail.com',
  },

  // === SUPPORT ===
  supportEmail: 'yoroiapp@hotmail.com',
} as const;

export default APP_CONFIG;
