// ============================================
// HEALTHKIT WRAPPER - Safe import with Expo Go fallback
// ============================================

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { logger } from '@/lib/security/logger';

// Détection Expo Go robuste : supporte SDK 50+ et anciennes versions
// - executionEnvironment === 'storeClient' = Expo Go (SDK 46+)
// - appOwnership === 'expo' = Expo Go (ancienne API)
const execEnv: string = (Constants as any).executionEnvironment ?? '';
const isExpoGo =
  execEnv === 'storeClient' ||
  Constants.appOwnership === 'expo';

let HealthKit: any = null;
let loadError: string | null = null;

// Tenter d'importer HealthKit seulement si pas dans Expo Go et sur iOS
if (!isExpoGo && Platform.OS === 'ios') {
  try {
    const mod = require('@kingstinct/react-native-healthkit');
    // Le module peut exporter .default ou directement l'objet
    HealthKit = mod?.default ?? mod;
    if (!HealthKit || typeof HealthKit.requestAuthorization !== 'function') {
      loadError = 'Module structure invalide';
      HealthKit = null;
    } else {
      logger.info('[HealthKit] Module chargé avec succès');
    }
  } catch (error: any) {
    loadError = error?.message ?? 'Erreur inconnue';
    logger.warn('[HealthKit] Module non disponible:', loadError);
  }
}

// Mock pour Expo Go ou si le module n'est pas disponible
const MockHealthKit = {
  isHealthDataAvailable: () => false,
  requestAuthorization: async () => ({}),
  queryQuantitySamples: async () => [],
  queryCategorySamples: async () => [],
  queryWorkoutSamples: async () => [],
  queryStatistics: async () => ({ sumQuantity: 0 }),
  saveQuantitySample: async () => true,
  saveCategorySample: async () => true,
  saveWorkoutSample: async () => true,
};

// Exporter le module réel ou le mock
export default HealthKit || MockHealthKit;

// Export pour savoir si HealthKit est disponible
export const isHealthKitAvailable = HealthKit !== null;
export const isRunningInExpoGo = isExpoGo;
export const isMockMode = HealthKit === null;

// Diagnostic object for troubleshooting
export const healthKitDiagnostic = {
  isAvailable: HealthKit !== null,
  isExpoGo,
  isMock: HealthKit === null,
  platform: Platform.OS,
  moduleLoaded: HealthKit !== null,
  loadError,
  moduleError: HealthKit === null && !isExpoGo && Platform.OS === 'ios'
    ? `HealthKit module failed to load: ${loadError}`
    : null,
};
