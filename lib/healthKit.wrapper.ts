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
  requestAuthorization: () => Promise.resolve(false),
  queryQuantitySamples: () => Promise.resolve([]),
  queryCategorySamples: () => Promise.resolve([]),
  getLastSleepSample: () => Promise.resolve(null),
  getHeartRateSamples: () => Promise.resolve([]),
  getHeartRateVariabilitySamples: () => Promise.resolve([]),
  getOxygenSaturationSamples: () => Promise.resolve([]),
  getBodyTemperatureSamples: () => Promise.resolve([]),
  getRespiratoryRateSamples: () => Promise.resolve([]),
  getWaterSamples: () => Promise.resolve([]),
  getWeightSamples: () => Promise.resolve([]),
  getStepCount: () => Promise.resolve({ quantity: 0 }),
  getActiveEnergyBurned: () => Promise.resolve({ quantity: 0 }),
};

// Exporter le module réel ou le mock
export default HealthKit || MockHealthKit;

// Export pour savoir si HealthKit est disponible
export const isHealthKitAvailable = HealthKit !== null;
export const isRunningInExpoGo = isExpoGo;
