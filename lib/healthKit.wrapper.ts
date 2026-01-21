// ============================================
// HEALTHKIT WRAPPER - Safe import with Expo Go fallback
// ============================================

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Détecter si on est dans Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

let HealthKit: any = null;

// Tenter d'importer HealthKit seulement si pas dans Expo Go
if (!isExpoGo && Platform.OS === 'ios') {
  try {
    HealthKit = require('@kingstinct/react-native-healthkit').default;
    console.log('[HealthKit] Module chargé avec succès');
  } catch (error) {
    console.warn('[HealthKit] Module non disponible (probablement Expo Go):', error);
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
  saveWorkoutSample: async () => true,
};

// Exporter le module réel ou le mock
export default HealthKit || MockHealthKit;

// Export pour savoir si HealthKit est disponible
export const isHealthKitAvailable = HealthKit !== null;
export const isRunningInExpoGo = isExpoGo;
