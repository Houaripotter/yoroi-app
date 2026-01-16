// ============================================
// YOROI - SERVICE HEALTH CONNECT
// ============================================
// Intégration Apple Health (iOS) & Google Health Connect (Android)
// Pour le tracking passif automatique
//
// NOTE: Health Connect (Android) est temporairement désactivé
// car expo-health-connect cause des erreurs de bundling avec
// @expo/config-plugins qui essaie d'importer le module Node.js "fs"
//
// Pour réactiver:
// 1. npm install expo-health-connect
// 2. Décommenter le code dans getHealthConnect()
// 3. Tester que le bundling fonctionne
// ============================================

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

// ============================================
// IMPORTS CONDITIONNELS
// ============================================

// Apple HealthKit (iOS)
let Healthkit: any = null;
if (Platform.OS === 'ios') {
  try {
    Healthkit = require('@kingstinct/react-native-healthkit').default;
  } catch (e) {
    logger.info('HealthKit non disponible');
  }
}

// Health Connect (Android) - Complètement désactivé pour éviter les erreurs de bundling
// TODO: Réactiver quand expo-health-connect sera compatible avec le bundler
let HealthConnect: any = null;
const getHealthConnect = (): any => {
  // Temporairement désactivé pour éviter les erreurs de bundling avec @expo/config-plugins
  logger.info('Health Connect temporairement désactivé');
  return null;

  /* Code original commenté pour éviter les erreurs
  if (Platform.OS !== 'android') return null;
  if (HealthConnect !== null) return HealthConnect;

  try {
    // Import dynamique pour éviter le bundling du code Node.js
    HealthConnect = require('expo-health-connect');
    return HealthConnect;
  } catch (e) {
    logger.info('Health Connect non disponible:', e);
    HealthConnect = false; // Marquer comme non disponible
    return null;
  }
  */
};

// ============================================
// TYPES
// ============================================

export interface HealthData {
  weight?: {
    value: number;
    unit: 'kg' | 'lbs';
    date: string;
  };
  steps?: {
    count: number;
    date: string;
  };
  sleep?: {
    startTime: string;
    endTime: string;
    duration: number;
    quality?: 'poor' | 'fair' | 'good' | 'excellent';
  };
  heartRate?: {
    average: number;
    min: number;
    max: number;
    resting: number;
  };
  calories?: {
    active: number;
    basal: number;
    total: number;
  };
  distance?: {
    value: number;
    unit: 'km' | 'miles';
  };
}

export interface HealthPermissions {
  weight: boolean;
  steps: boolean;
  sleep: boolean;
  heartRate: boolean;
  calories: boolean;
  distance: boolean;
}

export interface SyncStatus {
  lastSync: string | null;
  isConnected: boolean;
  provider: 'apple_health' | 'google_fit' | null;
  permissions: HealthPermissions;
}

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEYS = {
  SYNC_STATUS: '@yoroi_health_sync_status',
  LAST_WEIGHT: '@yoroi_health_last_weight',
  LAST_STEPS: '@yoroi_health_last_steps',
  LAST_SLEEP: '@yoroi_health_last_sleep',
};

// ============================================
// SERVICE PRINCIPAL
// ============================================

class HealthConnectService {
  private isInitialized = false;
  private syncStatus: SyncStatus = {
    lastSync: null,
    isConnected: false,
    provider: null,
    permissions: {
      weight: false,
      steps: false,
      sleep: false,
      heartRate: false,
      calories: false,
      distance: false,
    },
  };

  // ============================================
  // INITIALISATION
  // ============================================

  async initialize(): Promise<boolean> {
    try {
      const savedStatus = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
      if (savedStatus) {
        this.syncStatus = JSON.parse(savedStatus);
      }

      if (Platform.OS === 'ios') {
        this.syncStatus.provider = 'apple_health';
      } else if (Platform.OS === 'android') {
        this.syncStatus.provider = 'google_fit';
      }

      this.isInitialized = true;
      logger.info('HealthConnect initialisé:', this.syncStatus.provider);
      return true;
    } catch (error) {
      logger.error('Erreur initialisation HealthConnect:', error);
      return false;
    }
  }

  // ============================================
  // DISPONIBILITÉ
  // ============================================

  async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'ios' && Healthkit) {
      try {
        const status = await Healthkit.getAuthorizationStatus('HKQuantityTypeIdentifierBodyMass');
        return status !== null;
      } catch {
        return true; // On suppose que c'est disponible
      }
    } else if (Platform.OS === 'android') {
      const HC = getHealthConnect();
      if (HC) {
        try {
          const available = await HC.isHealthConnectAvailable();
          return available;
        } catch {
          return false;
        }
      }
    }
    return false;
  }

  getProviderName(): string {
    if (Platform.OS === 'ios') {
      return 'Apple Santé';
    } else if (Platform.OS === 'android') {
      return 'Health Connect';
    }
    return 'Non disponible';
  }

  // ============================================
  // PERMISSIONS iOS (Apple HealthKit)
  // ============================================

  private async requestIOSPermissions(): Promise<HealthPermissions> {
    if (!Healthkit) {
      return this.syncStatus.permissions;
    }

    try {
      // Types à lire
      const readTypes = [
        'HKQuantityTypeIdentifierBodyMass',           // Poids
        'HKQuantityTypeIdentifierStepCount',          // Pas
        'HKCategoryTypeIdentifierSleepAnalysis',      // Sommeil
        'HKQuantityTypeIdentifierHeartRate',          // Fréquence cardiaque
        'HKQuantityTypeIdentifierActiveEnergyBurned', // Calories
        'HKQuantityTypeIdentifierDistanceWalkingRunning', // Distance
      ];

      // Types à écrire
      const writeTypes = [
        'HKQuantityTypeIdentifierBodyMass',
      ];

      await Healthkit.requestAuthorization(readTypes, writeTypes);

      // Vérifier les permissions accordées
      const permissions: HealthPermissions = {
        weight: true,
        steps: true,
        sleep: true,
        heartRate: true,
        calories: true,
        distance: true,
      };

      return permissions;
    } catch (error) {
      logger.error('Erreur demande permissions iOS:', error);
      return this.syncStatus.permissions;
    }
  }

  // ============================================
  // PERMISSIONS Android (Health Connect)
  // ============================================

  private async requestAndroidPermissions(): Promise<HealthPermissions> {
    const HC = getHealthConnect();
    if (!HC) {
      return this.syncStatus.permissions;
    }

    try {
      const permissions = [
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'TotalCaloriesBurned' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'write', recordType: 'Weight' },
      ];

      await HC.requestPermission(permissions);

      return {
        weight: true,
        steps: true,
        sleep: true,
        heartRate: true,
        calories: true,
        distance: true,
      };
    } catch (error) {
      logger.error('Erreur demande permissions Android:', error);
      return this.syncStatus.permissions;
    }
  }

  // ============================================
  // CONNEXION
  // ============================================

  async connect(): Promise<boolean> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        logger.warn('Health provider non disponible');
        return false;
      }

      let permissions: HealthPermissions;

      if (Platform.OS === 'ios') {
        permissions = await this.requestIOSPermissions();
      } else {
        permissions = await this.requestAndroidPermissions();
      }

      this.syncStatus.permissions = permissions;
      this.syncStatus.isConnected = true;
      this.syncStatus.lastSync = new Date().toISOString();
      await this.saveSyncStatus();

      logger.info('Connecté à', this.getProviderName());
      return true;
    } catch (error) {
      logger.error('Erreur connexion:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.syncStatus.isConnected = false;
    this.syncStatus.permissions = {
      weight: false,
      steps: false,
      sleep: false,
      heartRate: false,
      calories: false,
      distance: false,
    };
    await this.saveSyncStatus();
  }

  // ============================================
  // LECTURE iOS
  // ============================================

  private async getIOSWeight(): Promise<HealthData['weight'] | null> {
    if (!Healthkit) return null;

    try {
      const samples = await Healthkit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 derniers jours
        to: new Date(),
        limit: 1,
        ascending: false,
      });

      if (samples && samples.length > 0) {
        const latest = samples[0];
        return {
          value: Math.round(latest.quantity * 10) / 10,
          unit: 'kg',
          date: latest.startDate,
        };
      }
    } catch (error) {
      logger.error('Erreur lecture poids iOS:', error);
    }
    return null;
  }

  private async getIOSSteps(): Promise<HealthData['steps'] | null> {
    if (!Healthkit) return null;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const samples = await Healthkit.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
        from: today,
        to: new Date(),
      });

      if (samples && samples.length > 0) {
        const totalSteps = samples.reduce((sum: number, s: any) => sum + s.quantity, 0);
        return {
          count: Math.round(totalSteps),
          date: today.toISOString(),
        };
      }
    } catch (error) {
      logger.error('Erreur lecture pas iOS:', error);
    }
    return null;
  }

  private async getIOSSleep(): Promise<HealthData['sleep'] | null> {
    if (!Healthkit) return null;

    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const samples = await Healthkit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        from: yesterday,
        to: new Date(),
      });

      if (samples && samples.length > 0) {
        // Calculer la durée totale de sommeil
        let totalMinutes = 0;
        let startTime = samples[0].startDate;
        let endTime = samples[samples.length - 1].endDate;

        samples.forEach((s: any) => {
          const duration = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
          totalMinutes += duration;
        });

        return {
          startTime,
          endTime,
          duration: Math.round(totalMinutes),
          quality: this.getSleepQuality(totalMinutes),
        };
      }
    } catch (error) {
      logger.error('Erreur lecture sommeil iOS:', error);
    }
    return null;
  }

  // ============================================
  // LECTURE Android
  // ============================================

  private async getAndroidWeight(): Promise<HealthData['weight'] | null> {
    const HC = getHealthConnect();
    if (!HC) return null;

    try {
      const endTime = new Date();
      const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const records = await HC.readRecords('Weight', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        },
      });

      if (records && records.length > 0) {
        const latest = records[records.length - 1];
        return {
          value: Math.round(latest.weight.inKilograms * 10) / 10,
          unit: 'kg',
          date: latest.time,
        };
      }
    } catch (error) {
      logger.error('Erreur lecture poids Android:', error);
    }
    return null;
  }

  private async getAndroidSteps(): Promise<HealthData['steps'] | null> {
    const HC = getHealthConnect();
    if (!HC) return null;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: today.toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      if (records && records.length > 0) {
        const totalSteps = records.reduce((sum: number, r: any) => sum + r.count, 0);
        return {
          count: totalSteps,
          date: today.toISOString(),
        };
      }
    } catch (error) {
      logger.error('Erreur lecture pas Android:', error);
    }
    return null;
  }

  private async getAndroidSleep(): Promise<HealthData['sleep'] | null> {
    const HC = getHealthConnect();
    if (!HC) return null;

    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const records = await HC.readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: yesterday.toISOString(),
          endTime: new Date().toISOString(),
        },
      });

      if (records && records.length > 0) {
        const latest = records[records.length - 1];
        const duration = (new Date(latest.endTime).getTime() - new Date(latest.startTime).getTime()) / 60000;

        return {
          startTime: latest.startTime,
          endTime: latest.endTime,
          duration: Math.round(duration),
          quality: this.getSleepQuality(duration),
        };
      }
    } catch (error) {
      logger.error('Erreur lecture sommeil Android:', error);
    }
    return null;
  }

  // ============================================
  // MÉTHODES PUBLIQUES DE LECTURE
  // ============================================

  async getLatestWeight(): Promise<HealthData['weight'] | null> {
    if (!this.syncStatus.permissions.weight) return null;

    if (Platform.OS === 'ios') {
      return this.getIOSWeight();
    } else {
      return this.getAndroidWeight();
    }
  }

  async getTodaySteps(): Promise<HealthData['steps'] | null> {
    if (!this.syncStatus.permissions.steps) return null;

    if (Platform.OS === 'ios') {
      return this.getIOSSteps();
    } else {
      return this.getAndroidSteps();
    }
  }

  async getLastSleep(): Promise<HealthData['sleep'] | null> {
    if (!this.syncStatus.permissions.sleep) return null;

    if (Platform.OS === 'ios') {
      return this.getIOSSleep();
    } else {
      return this.getAndroidSleep();
    }
  }

  async getAllHealthData(): Promise<HealthData> {
    const [weight, steps, sleep] = await Promise.all([
      this.getLatestWeight(),
      this.getTodaySteps(),
      this.getLastSleep(),
    ]);

    return {
      weight: weight || undefined,
      steps: steps || undefined,
      sleep: sleep || undefined,
    };
  }

  // ============================================
  // ÉCRITURE
  // ============================================

  async writeWeight(weight: number, unit: 'kg' | 'lbs' = 'kg'): Promise<boolean> {
    if (!this.syncStatus.permissions.weight) return false;

    const weightInKg = unit === 'lbs' ? weight * 0.453592 : weight;

    try {
      if (Platform.OS === 'ios' && Healthkit) {
        await Healthkit.saveQuantitySample('HKQuantityTypeIdentifierBodyMass', weightInKg, {
          start: new Date(),
          end: new Date(),
        });
        return true;
      } else if (Platform.OS === 'android') {
        const HC = getHealthConnect();
        if (HC) {
          await HC.insertRecords([
          {
            recordType: 'Weight',
            weight: { value: weightInKg, unit: 'KILOGRAMS' },
            time: new Date().toISOString(),
          },
        ]);
          return true;
        }
      }
    } catch (error) {
      logger.error('Erreur écriture poids:', error);
    }
    return false;
  }

  // ============================================
  // SYNCHRONISATION
  // ============================================

  async syncAll(): Promise<HealthData | null> {
    if (!this.syncStatus.isConnected) {
      return null;
    }

    try {
      logger.info('Synchronisation en cours...');
      const data = await this.getAllHealthData();

      // Sauvegarder en cache local
      if (data.weight) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_WEIGHT, JSON.stringify(data.weight));
      }
      if (data.steps) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_STEPS, JSON.stringify(data.steps));
      }
      if (data.sleep) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_SLEEP, JSON.stringify(data.sleep));
      }

      this.syncStatus.lastSync = new Date().toISOString();
      await this.saveSyncStatus();

      logger.info('Synchronisation terminée:', data);
      return data;
    } catch (error) {
      logger.error('Erreur synchronisation:', error);
      return null;
    }
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  private async saveSyncStatus(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_STATUS, JSON.stringify(this.syncStatus));
  }

  hasPermission(type: keyof HealthPermissions): boolean {
    return this.syncStatus.permissions[type] || false;
  }

  formatSleepDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  }

  getSleepQuality(minutes: number): 'poor' | 'fair' | 'good' | 'excellent' {
    if (minutes < 300) return 'poor';
    if (minutes < 360) return 'fair';
    if (minutes < 480) return 'good';
    return 'excellent';
  }
}

// ============================================
// INSTANCE SINGLETON
// ============================================

export const healthConnect = new HealthConnectService();

// ============================================
// HELPERS
// ============================================

export const getProviderIcon = (): string => {
  if (Platform.OS === 'ios') {
    return '';
  }
  return '';
};

export const getConnectionInstructions = (): string[] => {
  if (Platform.OS === 'ios') {
    return [
      "1. YOROI va demander l'accès à Apple Santé",
      "2. Autorise l'accès au poids, aux pas et au sommeil",
      "3. Tes données seront synchronisées automatiquement",
    ];
  }
  return [
    "1. Assure-toi que Health Connect est installé",
    "2. YOROI va demander l'accès à tes données",
    "3. Autorise l'accès au poids, aux pas et au sommeil",
    "4. Tes données seront synchronisées automatiquement",
  ];
};

export default healthConnect;
