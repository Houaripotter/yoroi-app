// ============================================
// YOROI - SERVICE HEALTH CONNECT (iOS)
// ============================================
// Intégration Apple Health uniquement
// ============================================

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Apple HealthKit (iOS)
let Healthkit: any = null;
try {
  Healthkit = require('@kingstinct/react-native-healthkit').default;
} catch (e) {
  console.log('HealthKit non disponible');
}

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
// SERVICE iOS
// ============================================

class HealthConnectService {
  private isInitialized = false;
  private syncStatus: SyncStatus = {
    lastSync: null,
    isConnected: false,
    provider: 'apple_health',
    permissions: {
      weight: false,
      steps: false,
      sleep: false,
      heartRate: false,
      calories: false,
      distance: false,
    },
  };

  async initialize(): Promise<boolean> {
    try {
      const savedStatus = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
      if (savedStatus) {
        this.syncStatus = JSON.parse(savedStatus);
      }
      this.syncStatus.provider = 'apple_health';
      this.isInitialized = true;
      console.log('HealthConnect iOS initialisé');
      return true;
    } catch (error) {
      console.error('Erreur initialisation HealthConnect:', error);
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!Healthkit) return false;
    try {
      const status = await Healthkit.getAuthorizationStatus('HKQuantityTypeIdentifierBodyMass');
      return status !== null;
    } catch {
      return true;
    }
  }

  getProviderName(): string {
    return 'Apple Santé';
  }

  private async requestIOSPermissions(): Promise<HealthPermissions> {
    if (!Healthkit) {
      return this.syncStatus.permissions;
    }

    try {
      const readTypes = [
        'HKQuantityTypeIdentifierBodyMass',
        'HKQuantityTypeIdentifierStepCount',
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
      ];

      const writeTypes = ['HKQuantityTypeIdentifierBodyMass'];

      await Healthkit.requestAuthorization(readTypes, writeTypes);

      return {
        weight: true,
        steps: true,
        sleep: true,
        heartRate: true,
        calories: true,
        distance: true,
      };
    } catch (error) {
      console.error('Erreur demande permissions iOS:', error);
      return this.syncStatus.permissions;
    }
  }

  async connect(): Promise<boolean> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        console.warn('Apple Health non disponible');
        return false;
      }

      const permissions = await this.requestIOSPermissions();
      this.syncStatus.permissions = permissions;
      this.syncStatus.isConnected = true;
      this.syncStatus.lastSync = new Date().toISOString();
      await this.saveSyncStatus();

      return true;
    } catch (error) {
      console.error('Erreur connexion:', error);
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

  private async getIOSWeight(): Promise<HealthData['weight'] | null> {
    if (!Healthkit) return null;

    try {
      const samples = await Healthkit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
      console.error('Erreur lecture poids iOS:', error);
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
      console.error('Erreur lecture pas iOS:', error);
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
        let totalMinutes = 0;
        const startTime = samples[0].startDate;
        const endTime = samples[samples.length - 1].endDate;

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
      console.error('Erreur lecture sommeil iOS:', error);
    }
    return null;
  }

  async getLatestWeight(): Promise<HealthData['weight'] | null> {
    if (!this.syncStatus.permissions.weight) return null;
    return this.getIOSWeight();
  }

  async getTodaySteps(): Promise<HealthData['steps'] | null> {
    if (!this.syncStatus.permissions.steps) return null;
    return this.getIOSSteps();
  }

  async getLastSleep(): Promise<HealthData['sleep'] | null> {
    if (!this.syncStatus.permissions.sleep) return null;
    return this.getIOSSleep();
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

  async writeWeight(weight: number, unit: 'kg' | 'lbs' = 'kg'): Promise<boolean> {
    if (!this.syncStatus.permissions.weight || !Healthkit) return false;

    const weightInKg = unit === 'lbs' ? weight * 0.453592 : weight;

    try {
      await Healthkit.saveQuantitySample('HKQuantityTypeIdentifierBodyMass', weightInKg, {
        start: new Date(),
        end: new Date(),
      });
      return true;
    } catch (error) {
      console.error('Erreur écriture poids:', error);
      return false;
    }
  }

  async syncAll(): Promise<HealthData | null> {
    if (!this.syncStatus.isConnected) {
      return null;
    }

    try {
      console.log('Synchronisation iOS en cours...');
      const data = await this.getAllHealthData();

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

      console.log('Synchronisation terminée:', data);
      return data;
    } catch (error) {
      console.error('Erreur synchronisation:', error);
      return null;
    }
  }

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

export const healthConnect = new HealthConnectService();

export const getProviderIcon = (): string => '❤️';

export const getConnectionInstructions = (): string[] => [
  "1. YOROI va demander l'accès à Apple Santé",
  "2. Autorise l'accès au poids, aux pas et au sommeil",
  "3. Tes données seront synchronisées automatiquement",
];

export default healthConnect;
