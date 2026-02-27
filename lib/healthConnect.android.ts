// ============================================
// YOROI - SERVICE HEALTH CONNECT (Android)
// ============================================
// Intégration Google Health Connect pour Android
// Parité complète avec iOS HealthKit
// ============================================

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
import { addTraining } from './database';
import type { Training } from './database';

// ============================================
// HEALTH CONNECT SDK (Android)
// ============================================

let HealthConnect: typeof import('react-native-health-connect') | null = null;

const getHealthConnect = () => {
  if (Platform.OS !== 'android') return null;
  if (HealthConnect !== null) return HealthConnect;

  try {
    HealthConnect = require('react-native-health-connect');
    return HealthConnect;
  } catch (e) {
    logger.warn('[HealthConnect Android] Module not available:', e);
    return null;
  }
};

// ============================================
// TYPES
// ============================================

export interface HealthData {
  weight?: {
    value: number;
    unit: 'kg' | 'lbs';
    date: string;
    source?: string;
  };
  steps?: {
    count: number;
    date: string;
    source?: string;
  };
  sleep?: {
    startTime: string;
    endTime: string;
    duration: number;
    quality?: 'poor' | 'fair' | 'good' | 'excellent';
    source?: string;
    phases?: {
      awake: number;
      rem: number;
      core: number;
      deep: number;
      inBed: number;
    };
  };
  hydration?: {
    amount: number;
    date: string;
    source?: string;
  };
  heartRate?: {
    current?: number;
    average: number;
    min: number;
    max: number;
    resting: number;
    source?: string;
  };
  heartRateVariability?: {
    value: number;
    date: string;
    source?: string;
  };
  calories?: {
    active: number;
    basal: number;
    total: number;
    source?: string;
  };
  distance?: {
    walking: number;
    running: number;
    total: number;
    unit: 'km' | 'miles';
    source?: string;
  };
  vo2Max?: {
    value: number;
    date: string;
    source?: string;
  };
  oxygenSaturation?: {
    value: number;
    date: string;
    source?: string;
  };
  respiratoryRate?: {
    value: number;
    date: string;
    source?: string;
  };
  bodyTemperature?: {
    value: number;
    date: string;
    source?: string;
  };
  bodyComposition?: {
    bodyFatPercentage?: number;
    leanBodyMass?: number;
    date: string;
    source?: string;
  };
  workouts?: {
    id: string;
    activityType: string;
    startDate: string;
    endDate: string;
    duration: number;
    distance?: number;
    calories?: number;
    averageHeartRate?: number;
    maxHeartRate?: number;
    source?: string;
  }[];
}

export interface HealthPermissions {
  weight: boolean;
  steps: boolean;
  sleep: boolean;
  hydration: boolean;
  heartRate: boolean;
  heartRateVariability: boolean;
  restingHeartRate: boolean;
  calories: boolean;
  distance: boolean;
  vo2Max: boolean;
  oxygenSaturation: boolean;
  respiratoryRate: boolean;
  bodyTemperature: boolean;
  bodyComposition: boolean;
  workouts: boolean;
}

export interface SyncStatus {
  lastSync: string | null;
  isConnected: boolean;
  provider: 'apple_health' | 'health_connect' | null;
  permissions: HealthPermissions;
  failureReason?: 'USER_DENIED' | 'MODULE_NOT_LOADED' | 'DEVICE_NOT_SUPPORTED' | 'HEALTH_CONNECT_NOT_INSTALLED' | 'UNKNOWN';
}

// ============================================
// SOURCE NAME MAP - Normalise les noms d'apps vers des clés standard
// ============================================

export const SOURCE_NAME_MAP: Record<string, string> = {
  // Withings
  'Health Mate': 'withings', 'Withings': 'withings', 'com.withings.wiscale2': 'withings',
  // Garmin
  'Garmin Connect': 'garmin', 'com.garmin.android.apps.connectmobile': 'garmin',
  // Polar
  'Polar Flow': 'polar', 'com.polar.polarflow': 'polar', 'Polar Beat': 'polar',
  // Whoop
  'WHOOP': 'whoop', 'com.whoop.android': 'whoop',
  // Samsung
  'Samsung Health': 'samsung', 'com.sec.android.app.shealth': 'samsung',
  // Fitbit
  'Fitbit': 'fitbit', 'com.fitbit.FitbitMobile': 'fitbit',
  // Xiaomi
  'Mi Fitness': 'xiaomi', 'Zepp Life': 'xiaomi', 'Mi Fit': 'xiaomi',
  'com.xiaomi.wearable': 'xiaomi', 'com.xiaomi.hm.health': 'xiaomi',
  // Renpho / Eufy / Omron
  'Renpho': 'renpho', 'RENPHO': 'renpho', 'com.qingniu.renpho': 'renpho',
  'EufyLife': 'eufy', 'eufy Life': 'eufy',
  'OMRON connect': 'omron', 'Omron': 'omron',
  // Suunto
  'Suunto': 'suunto',
  // Oura
  'Oura': 'oura',
  // Yoroi manual
  'Yoroi': 'manual', 'YOROI': 'manual',
};

export const normalizeSourceName = (rawSource: string): string => {
  if (!rawSource) return 'unknown';
  if (SOURCE_NAME_MAP[rawSource]) return SOURCE_NAME_MAP[rawSource];
  const lower = rawSource.toLowerCase();
  for (const [key, value] of Object.entries(SOURCE_NAME_MAP)) {
    if (lower.includes(key.toLowerCase())) return value;
  }
  if (lower.includes('watch')) return 'android_watch';
  return rawSource;
};

export const SOURCE_PRIORITY: Record<string, number> = {
  withings: 10, garmin: 9, polar: 9, whoop: 9,
  renpho: 9, eufy: 9, omron: 9, suunto: 9, oura: 9,
  apple_watch: 8, samsung: 8, fitbit: 8,
  xiaomi: 7, iphone: 5, manual: 3,
  apple_health: 1, health_connect: 1, unknown: 0,
};

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEYS = {
  SYNC_STATUS: '@yoroi_health_sync_status',
  LAST_WEIGHT: '@yoroi_health_last_weight',
  LAST_STEPS: '@yoroi_health_last_steps',
  LAST_SLEEP: '@yoroi_health_last_sleep',
  LAST_HYDRATION: '@yoroi_health_last_hydration',
  PERMISSION_DENIAL_COUNT: '@yoroi_health_denial_count',
};

// Mapping des types d'exercices Yoroi -> Health Connect (pour l'ecriture)
const EXERCISE_TYPE_MAP: { [key: string]: number } = {
  'Running': 56, 'Course': 56, 'Trail': 56,
  'Cycling': 8, 'Velo': 8,
  'Swimming': 74, 'Natation': 74,
  'Musculation': 80, 'WeightLifting': 80,
  'CrossFit': 23,
  'Yoga': 83,
  'Boxing': 5, 'Boxe': 5,
  'MMA': 45, 'JJB': 45, 'Judo': 45, 'Karate': 45,
  'Muay Thai': 5,
  'HIIT': 35,
  'Marche': 79, 'Walking': 79,
  'Randonnee': 37, 'Hiking': 37,
  'Football': 29, 'Soccer': 29,
  'Basketball': 4,
  'Tennis': 76,
  'Badminton': 2,
  'Rugby': 57,
  'Handball': 33,
  'Volleyball': 78,
  'Golf': 32,
  'Pilates': 51,
  'Danse': 24, 'Dance': 24,
  'Aviron': 55, 'Rowing': 55,
  'Escalade': 53, 'Climbing': 53,
  'Surf': 73, 'Surfing': 73,
  'Ski': 61, 'Skiing': 61,
  'Ski de fond': 22, 'CrossCountrySkiing': 22,
  'Snowboard': 65,
  'Patin': 40, 'Skating': 40,
  'Elliptique': 25, 'Elliptical': 25,
  'Stepper': 71, 'StairClimbing': 71,
  'Stretching': 72,
  'Gymnastique': 31, 'Gymnastics': 31,
  'Equitation': 38, 'HorseRiding': 38,
  'Escrime': 28, 'Fencing': 28,
  'Baseball': 3,
  'Cricket': 14,
  'Hockey': 36,
  'Squash': 70,
  'Paddle': 76, 'Padel': 76,
  'TableTennis': 75,
  'Cardio': 0, 'Other': 0,
};

// Mapping inverse: Health Connect exercise type number -> Yoroi sport key
const ANDROID_EXERCISE_TYPE_NAMES: Record<number, string> = {
  0: 'other', 1: 'badminton', 2: 'badminton', 3: 'baseball', 4: 'basketball',
  5: 'boxe', 6: 'cricket', 7: 'curling', 8: 'velo', 9: 'velo',
  10: 'velo_stationnaire', 11: 'elliptique', 12: 'escrime', 13: 'football_us',
  14: 'cricket', 15: 'frisbee', 16: 'golf', 17: 'guidedBreathing', 18: 'gymnastique',
  19: 'handball', 20: 'hiit', 21: 'randonnee', 22: 'ski_fond', 23: 'crossfit',
  24: 'danse', 25: 'elliptique', 26: 'exerciseMachine', 27: 'escalade', 28: 'escrime',
  29: 'football', 30: 'fonctionnel', 31: 'gymnastique', 32: 'golf', 33: 'handball',
  34: 'hiit', 35: 'hiit', 36: 'hockey', 37: 'randonnee', 38: 'equitation',
  39: 'hockey', 40: 'patin', 41: 'patin', 42: 'saut_corde', 43: 'kayak',
  44: 'lacrosse', 45: 'mma', 46: 'muscu', 47: 'ski', 48: 'paddleboard',
  49: 'paragliding', 50: 'pilates', 51: 'pilates', 52: 'racquetball',
  53: 'escalade', 54: 'roller', 55: 'aviron', 56: 'running', 57: 'rugby',
  58: 'voile', 59: 'plongee', 60: 'skateboard', 61: 'ski', 62: 'snowboard',
  63: 'softball', 64: 'squash', 65: 'snowboard', 66: 'escalier', 67: 'renforcement',
  68: 'stretching', 69: 'surf', 70: 'squash', 71: 'stepper', 72: 'stretching',
  73: 'surf', 74: 'natation', 75: 'tennis_table', 76: 'tennis', 77: 'volleyball',
  78: 'volleyball', 79: 'marche', 80: 'muscu', 81: 'water_polo', 82: 'wheelchair',
  83: 'yoga',
};

// Label francais pour les sports Android
const ANDROID_SPORT_LABELS: Record<string, string> = {
  'running': 'Course', 'velo': 'Velo', 'natation': 'Natation', 'muscu': 'Musculation',
  'crossfit': 'CrossFit', 'yoga': 'Yoga', 'boxe': 'Boxe', 'mma': 'MMA',
  'football': 'Football', 'basketball': 'Basketball', 'tennis': 'Tennis',
  'badminton': 'Badminton', 'rugby': 'Rugby', 'handball': 'Handball',
  'volleyball': 'Volleyball', 'golf': 'Golf', 'pilates': 'Pilates',
  'danse': 'Danse', 'aviron': 'Aviron', 'escalade': 'Escalade',
  'surf': 'Surf', 'ski': 'Ski', 'ski_fond': 'Ski de fond', 'snowboard': 'Snowboard',
  'randonnee': 'Randonnee', 'marche': 'Marche', 'hiit': 'HIIT',
  'patin': 'Patinage', 'equitation': 'Equitation', 'escrime': 'Escrime',
  'elliptique': 'Elliptique', 'stepper': 'Stepper', 'stretching': 'Stretching',
  'gymnastique': 'Gymnastique', 'hockey': 'Hockey', 'squash': 'Squash',
  'baseball': 'Baseball', 'cricket': 'Cricket', 'voile': 'Voile',
  'kayak': 'Kayak', 'plongee': 'Plongee', 'saut_corde': 'Corde a sauter',
  'tennis_table': 'Tennis de table', 'water_polo': 'Water Polo',
  'fonctionnel': 'Fonctionnel', 'renforcement': 'Renforcement',
  'velo_stationnaire': 'Velo stationnaire', 'other': 'Autre',
};

/**
 * Extrait le nom de source brut depuis un record Health Connect Android
 */
const extractAndroidSourceName = (record: any): string => {
  return record?.metadata?.dataOrigin
    || record?.metadata?.clientRecordId
    || 'health_connect';
};

// ============================================
// SERVICE ANDROID
// ============================================

class HealthConnectService {
  private isInitialized = false;
  private syncStatus: SyncStatus = {
    lastSync: null,
    isConnected: false,
    provider: 'health_connect',
    permissions: {
      weight: false,
      steps: false,
      sleep: false,
      hydration: false,
      heartRate: false,
      heartRateVariability: false,
      restingHeartRate: false,
      calories: false,
      distance: false,
      vo2Max: false,
      oxygenSaturation: false,
      respiratoryRate: false,
      bodyTemperature: false,
      bodyComposition: false,
      workouts: false,
    },
  };

  // ============================================
  // INITIALISATION
  // ============================================

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      logger.info('[HealthConnect Android] Ignoré sur cette plateforme');
      return false;
    }

    try {
      const savedStatus = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
      if (savedStatus) {
        this.syncStatus = JSON.parse(savedStatus);
      }

      this.syncStatus.provider = 'health_connect';

      // Initialize Health Connect SDK
      const HC = getHealthConnect();
      if (HC) {
        await HC.initialize();
        logger.info('[HealthConnect Android] SDK initialisé');
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur initialisation:', error);
      return false;
    }
  }

  // ============================================
  // DISPONIBILITÉ
  // ============================================

  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    const HC = getHealthConnect();
    if (!HC) {
      logger.warn('[HealthConnect Android] Module non disponible');
      return false;
    }

    try {
      const status = await HC.getSdkStatus();
      // SDK_AVAILABLE = 3
      if (status === 3) {
        return true;
      }

      // SDK_UNAVAILABLE = 1, SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED = 2
      logger.info('[HealthConnect Android] SDK status:', status);
      return false;
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur vérification disponibilité:', error);
      return false;
    }
  }

  async isHealthConnectInstalled(): Promise<boolean> {
    const HC = getHealthConnect();
    if (!HC) return false;

    try {
      const status = await HC.getSdkStatus();
      // Si status = 1, Health Connect n'est pas installé
      return status !== 1;
    } catch {
      return false;
    }
  }

  getProviderName(): string {
    return 'Health Connect';
  }

  // ============================================
  // PERMISSIONS
  // ============================================

  private async requestAndroidPermissions(): Promise<HealthPermissions> {
    const HC = getHealthConnect();
    if (!HC) {
      return this.syncStatus.permissions;
    }

    try {
      // Permissions à lire
      const readPermissions = [
        { accessType: 'read', recordType: 'Weight' },
        { accessType: 'read', recordType: 'BodyFat' },
        { accessType: 'read', recordType: 'LeanBodyMass' },
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'Hydration' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
        { accessType: 'read', recordType: 'RestingHeartRate' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        { accessType: 'read', recordType: 'BasalMetabolicRate' },
        { accessType: 'read', recordType: 'TotalCaloriesBurned' },
        { accessType: 'read', recordType: 'Distance' },
        { accessType: 'read', recordType: 'Vo2Max' },
        { accessType: 'read', recordType: 'OxygenSaturation' },
        { accessType: 'read', recordType: 'RespiratoryRate' },
        { accessType: 'read', recordType: 'BodyTemperature' },
        { accessType: 'read', recordType: 'ExerciseSession' },
      ];

      // Permissions à écrire
      const writePermissions = [
        { accessType: 'write', recordType: 'Weight' },
        { accessType: 'write', recordType: 'BodyFat' },
        { accessType: 'write', recordType: 'Hydration' },
        { accessType: 'write', recordType: 'SleepSession' },
        { accessType: 'write', recordType: 'ExerciseSession' },
      ];

      const allPermissions = [...readPermissions, ...writePermissions];

      await HC.requestPermission(allPermissions as any);

      // Vérifier les permissions réellement accordées
      const grantedPermissions = await HC.getGrantedPermissions();
      const grantedTypes = new Set(grantedPermissions.map((p: any) => p.recordType));

      const permissions: HealthPermissions = {
        weight: grantedTypes.has('Weight'),
        steps: grantedTypes.has('Steps'),
        sleep: grantedTypes.has('SleepSession'),
        hydration: grantedTypes.has('Hydration'),
        heartRate: grantedTypes.has('HeartRate'),
        heartRateVariability: grantedTypes.has('HeartRateVariabilityRmssd'),
        restingHeartRate: grantedTypes.has('RestingHeartRate'),
        calories: grantedTypes.has('ActiveCaloriesBurned') || grantedTypes.has('TotalCaloriesBurned'),
        distance: grantedTypes.has('Distance'),
        vo2Max: grantedTypes.has('Vo2Max'),
        oxygenSaturation: grantedTypes.has('OxygenSaturation'),
        respiratoryRate: grantedTypes.has('RespiratoryRate'),
        bodyTemperature: grantedTypes.has('BodyTemperature'),
        bodyComposition: grantedTypes.has('BodyFat') || grantedTypes.has('LeanBodyMass'),
        workouts: grantedTypes.has('ExerciseSession'),
      };

      logger.info('[HealthConnect Android] Permissions accordées:', permissions);
      return permissions;
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur demande permissions:', error);

      // Incrémenter le compteur de refus
      const denialCount = await this.incrementDenialCount();
      if (denialCount >= 2) {
        logger.warn('[HealthConnect Android] Permissions refusées 2 fois - blocage permanent possible');
      }

      return this.syncStatus.permissions;
    }
  }

  private async incrementDenialCount(): Promise<number> {
    try {
      const countStr = await AsyncStorage.getItem(STORAGE_KEYS.PERMISSION_DENIAL_COUNT);
      const count = (countStr ? parseInt(countStr, 10) : 0) + 1;
      await AsyncStorage.setItem(STORAGE_KEYS.PERMISSION_DENIAL_COUNT, count.toString());
      return count;
    } catch {
      return 1;
    }
  }

  async getPermissionDenialCount(): Promise<number> {
    try {
      const countStr = await AsyncStorage.getItem(STORAGE_KEYS.PERMISSION_DENIAL_COUNT);
      return countStr ? parseInt(countStr, 10) : 0;
    } catch {
      return 0;
    }
  }

  // ============================================
  // CONNEXION
  // ============================================

  async connect(): Promise<boolean> {
    try {
      // Vérifier si Health Connect est installé
      const installed = await this.isHealthConnectInstalled();
      if (!installed) {
        this.syncStatus.isConnected = false;
        this.syncStatus.failureReason = 'HEALTH_CONNECT_NOT_INSTALLED';
        await this.saveSyncStatus();
        return false;
      }

      const available = await this.isAvailable();
      if (!available) {
        logger.warn('[HealthConnect Android] Health Connect non disponible');
        this.syncStatus.isConnected = false;
        this.syncStatus.failureReason = 'DEVICE_NOT_SUPPORTED';
        await this.saveSyncStatus();
        return false;
      }

      // Demander les permissions
      const permissions = await this.requestAndroidPermissions();

      // Vérifier qu'au moins une permission a été accordée
      const hasAnyPermission = Object.values(permissions).some(p => p);
      if (!hasAnyPermission) {
        this.syncStatus.isConnected = false;
        this.syncStatus.failureReason = 'USER_DENIED';
        await this.saveSyncStatus();
        return false;
      }

      this.syncStatus.permissions = permissions;
      this.syncStatus.isConnected = true;
      this.syncStatus.lastSync = new Date().toISOString();
      delete this.syncStatus.failureReason;
      await this.saveSyncStatus();

      logger.info('[HealthConnect Android] Connexion réussie');

      // Lancer une première synchronisation
      await this.syncWithRetry();

      return true;
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur connexion:', error);
      this.syncStatus.isConnected = false;
      this.syncStatus.failureReason = 'UNKNOWN';
      await this.saveSyncStatus();
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.syncStatus.isConnected = false;
    this.syncStatus.permissions = {
      weight: false,
      steps: false,
      sleep: false,
      hydration: false,
      heartRate: false,
      heartRateVariability: false,
      restingHeartRate: false,
      calories: false,
      distance: false,
      vo2Max: false,
      oxygenSaturation: false,
      respiratoryRate: false,
      bodyTemperature: false,
      bodyComposition: false,
      workouts: false,
    };
    await this.saveSyncStatus();
  }

  // ============================================
  // HELPERS
  // ============================================

  private createTimeRangeFilter(startTime: Date, endTime: Date) {
    return {
      operator: 'between' as const,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
  }

  private async queryHealthConnect<T>(
    queryFn: () => Promise<T>,
    dataTypeName: string
  ): Promise<T | null> {
    const HC = getHealthConnect();
    if (!HC) {
      logger.warn(`[HealthConnect Android] Module not loaded, cannot fetch ${dataTypeName}`);
      return null;
    }

    try {
      return await queryFn();
    } catch (error: any) {
      // Gestion des erreurs de permission
      if (error?.message?.includes('Permission') || error?.message?.includes('permission')) {
        logger.info(`[HealthConnect Android] Permissions non accordées pour ${dataTypeName}`);
        return null;
      }

      logger.error(`[HealthConnect Android] Erreur lecture ${dataTypeName}:`, error);
      return null;
    }
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, 16);
  }

  // ============================================
  // LECTURE: POIDS
  // ============================================

  private async getAndroidWeight(): Promise<HealthData['weight'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const endTime = new Date();
      const startTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const records = await HC.readRecords('Weight', {
        timeRangeFilter: this.createTimeRangeFilter(startTime, endTime),
      });

      if (records?.records && records.records.length > 0) {
        // Prendre le plus récent
        const sorted = [...records.records].sort((a: any, b: any) =>
          new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        const latest = sorted[0] as any;

        return {
          value: Math.round(latest.weight.inKilograms * 10) / 10,
          unit: 'kg',
          date: new Date(latest.time).toISOString(),
          source: normalizeSourceName(extractAndroidSourceName(latest)),
        };
      }
      return null;
    }, 'weight');
  }

  async getLatestWeight(): Promise<HealthData['weight'] | null> {
    if (!this.syncStatus.permissions.weight) return null;
    return this.getAndroidWeight();
  }

  // ============================================
  // LECTURE: PAS
  // ============================================

  private async getAndroidSteps(): Promise<HealthData['steps'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('Steps', {
        timeRangeFilter: this.createTimeRangeFilter(today, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const totalSteps = records.records.reduce((sum: number, r: any) => sum + (r.count || 0), 0);

        // Limite de sécurité
        const safeSteps = Math.min(Math.round(totalSteps), 100000);

        return {
          count: safeSteps,
          date: today.toISOString(),
          source: normalizeSourceName(extractAndroidSourceName(records.records[0])),
        };
      }
      return null;
    }, 'steps');
  }

  async getTodaySteps(): Promise<HealthData['steps'] | null> {
    if (!this.syncStatus.permissions.steps) return null;
    return this.getAndroidSteps();
  }

  // ============================================
  // LECTURE: SOMMEIL
  // ============================================

  private async getAndroidSleep(): Promise<HealthData['sleep'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const records = await HC.readRecords('SleepSession', {
        timeRangeFilter: this.createTimeRangeFilter(twoDaysAgo, now),
      });

      if (records?.records && records.records.length > 0) {
        // Prendre la session la plus récente
        const sorted = [...records.records].sort((a: any, b: any) =>
          new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
        );
        const latest = sorted[0] as any;

        const startTime = new Date(latest.startTime);
        const endTime = new Date(latest.endTime);
        const totalMinutes = (endTime.getTime() - startTime.getTime()) / 60000;

        // Calculer les phases si disponibles
        let awakeMinutes = 0;
        let remMinutes = 0;
        let coreMinutes = 0;
        let deepMinutes = 0;

        if (latest.stages && Array.isArray(latest.stages)) {
          for (const stage of latest.stages) {
            const stageDuration = (new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime()) / 60000;
            // Health Connect sleep stages:
            // 1 = AWAKE, 2 = SLEEPING, 3 = OUT_OF_BED, 4 = LIGHT, 5 = DEEP, 6 = REM
            switch (stage.stage) {
              case 1: // AWAKE
              case 3: // OUT_OF_BED
                awakeMinutes += stageDuration;
                break;
              case 4: // LIGHT
                coreMinutes += stageDuration;
                break;
              case 5: // DEEP
                deepMinutes += stageDuration;
                break;
              case 6: // REM
                remMinutes += stageDuration;
                break;
            }
          }
        }

        // Validation: entre 1h et 16h
        if (totalMinutes < 60 || totalMinutes > 960) {
          return null;
        }

        return {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: Math.round(totalMinutes),
          quality: this.getSleepQuality(totalMinutes),
          phases: {
            deep: Math.round(deepMinutes),
            rem: Math.round(remMinutes),
            core: Math.round(coreMinutes),
            awake: Math.round(awakeMinutes),
            inBed: Math.round(totalMinutes + awakeMinutes),
          },
        };
      }
      return null;
    }, 'sleep');
  }

  async getLastSleep(): Promise<HealthData['sleep'] | null> {
    if (!this.syncStatus.permissions.sleep) return null;
    return this.getAndroidSleep();
  }

  // ============================================
  // LECTURE: HYDRATATION
  // ============================================

  private async getAndroidHydration(): Promise<HealthData['hydration'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('Hydration', {
        timeRangeFilter: this.createTimeRangeFilter(today, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const totalLiters = records.records.reduce((sum: number, r: any) =>
          sum + (r.volume?.inLiters || 0), 0);

        return {
          amount: Math.round(totalLiters * 1000), // Convertir en ml
          date: today.toISOString(),
        };
      }
      return null;
    }, 'hydration');
  }

  async getTodayHydration(): Promise<HealthData['hydration'] | null> {
    if (!this.syncStatus.permissions.hydration) return null;
    return this.getAndroidHydration();
  }

  // ============================================
  // LECTURE: FRÉQUENCE CARDIAQUE
  // ============================================

  private async getAndroidHeartRate(): Promise<HealthData['heartRate'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('HeartRate', {
        timeRangeFilter: this.createTimeRangeFilter(today, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        // Extraire tous les samples de FC
        const allBpm: number[] = [];
        for (const record of records.records) {
          if (record.samples) {
            for (const sample of record.samples as any[]) {
              if (sample.beatsPerMinute) {
                allBpm.push(sample.beatsPerMinute);
              }
            }
          }
        }

        if (allBpm.length === 0) return null;

        const current = allBpm[allBpm.length - 1];
        const average = allBpm.reduce((a, b) => a + b, 0) / allBpm.length;
        const min = Math.min(...allBpm);
        const max = Math.max(...allBpm);

        // Essayer de récupérer le resting HR
        let resting = min;
        try {
          const restingRecords = await HC.readRecords('RestingHeartRate', {
            timeRangeFilter: this.createTimeRangeFilter(today, new Date()),
          });
          if (restingRecords?.records && restingRecords.records.length > 0) {
            const latestResting = restingRecords.records[restingRecords.records.length - 1] as any;
            resting = latestResting.beatsPerMinute || min;
          }
        } catch {
          // Fallback sur le min
        }

        return {
          current: Math.round(current),
          average: Math.round(average),
          min: Math.round(min),
          max: Math.round(max),
          resting: Math.round(resting),
          source: normalizeSourceName(extractAndroidSourceName(records.records[0])),
        };
      }
      return null;
    }, 'heartRate');
  }

  async getTodayHeartRate(): Promise<HealthData['heartRate'] | null> {
    if (!this.syncStatus.permissions.heartRate) return null;
    return this.getAndroidHeartRate();
  }

  // ============================================
  // LECTURE: HRV
  // ============================================

  private async getAndroidHRV(): Promise<HealthData['heartRateVariability'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Note: Android utilise RMSSD, iOS utilise SDNN - valeurs légèrement différentes
      const records = await HC.readRecords('HeartRateVariabilityRmssd', {
        timeRangeFilter: this.createTimeRangeFilter(today, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const latest = records.records[records.records.length - 1] as any;

        return {
          value: Math.round(latest.heartRateVariabilityMillis || 0),
          date: new Date(latest.time).toISOString(),
          source: normalizeSourceName(extractAndroidSourceName(latest)),
        };
      }
      return null;
    }, 'hrv');
  }

  async getTodayHRV(): Promise<HealthData['heartRateVariability'] | null> {
    if (!this.syncStatus.permissions.heartRateVariability) return null;
    return this.getAndroidHRV();
  }

  // ============================================
  // LECTURE: CALORIES
  // ============================================

  private async getAndroidCalories(): Promise<HealthData['calories'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [activeRecords, basalRecords] = await Promise.all([
        HC.readRecords('ActiveCaloriesBurned', {
          timeRangeFilter: this.createTimeRangeFilter(today, new Date()),
        }).catch(() => ({ records: [] })),
        HC.readRecords('BasalMetabolicRate', {
          timeRangeFilter: this.createTimeRangeFilter(today, new Date()),
        }).catch(() => ({ records: [] })),
      ]);

      const active = activeRecords?.records?.reduce((sum: number, r: any) =>
        sum + (r.energy?.inKilocalories || 0), 0) || 0;

      // Pour le basal, on prend la dernière valeur et on calcule pour la journée
      let basal = 0;
      if (basalRecords?.records && basalRecords.records.length > 0) {
        const latestBasal = basalRecords.records[basalRecords.records.length - 1] as any;
        const bmrPerDay = latestBasal.basalMetabolicRate?.inKilocaloriesPerDay || 0;
        // Calculer les calories basales écoulées aujourd'hui
        const hoursToday = new Date().getHours() + new Date().getMinutes() / 60;
        basal = (bmrPerDay / 24) * hoursToday;
      }

      return {
        active: Math.round(active),
        basal: Math.round(basal),
        total: Math.round(active + basal),
      };
    }, 'calories');
  }

  async getTodayCalories(): Promise<HealthData['calories'] | null> {
    if (!this.syncStatus.permissions.calories) return null;
    return this.getAndroidCalories();
  }

  // ============================================
  // LECTURE: DISTANCE
  // ============================================

  private async getAndroidDistance(): Promise<HealthData['distance'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('Distance', {
        timeRangeFilter: this.createTimeRangeFilter(today, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const totalMeters = records.records.reduce((sum: number, r: any) =>
          sum + (r.distance?.inMeters || 0), 0);

        const totalKm = totalMeters / 1000;

        return {
          walking: Math.round(totalKm * 0.6 * 10) / 10, // Estimation
          running: Math.round(totalKm * 0.4 * 10) / 10,
          total: Math.round(totalKm * 10) / 10,
          unit: 'km',
        };
      }
      return null;
    }, 'distance');
  }

  async getTodayDistance(): Promise<HealthData['distance'] | null> {
    if (!this.syncStatus.permissions.distance) return null;
    return this.getAndroidDistance();
  }

  // ============================================
  // LECTURE: MÉTRIQUES AVANCÉES
  // ============================================

  private async getAndroidVO2Max(): Promise<HealthData['vo2Max'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const records = await HC.readRecords('Vo2Max', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const latest = records.records[records.records.length - 1] as any;

        return {
          value: Math.round(latest.vo2MillilitersPerMinuteKilogram * 10) / 10,
          date: new Date(latest.time).toISOString(),
          source: normalizeSourceName(extractAndroidSourceName(latest)),
        };
      }
      return null;
    }, 'vo2max');
  }

  async getVO2Max(): Promise<HealthData['vo2Max'] | null> {
    if (!this.syncStatus.permissions.vo2Max) return null;
    return this.getAndroidVO2Max();
  }

  private async getAndroidOxygenSaturation(): Promise<HealthData['oxygenSaturation'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const records = await HC.readRecords('OxygenSaturation', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const latest = records.records[records.records.length - 1] as any;

        return {
          value: Math.round(latest.percentage * 100),
          date: new Date(latest.time).toISOString(),
          source: normalizeSourceName(extractAndroidSourceName(latest)),
        };
      }
      return null;
    }, 'oxygenSaturation');
  }

  async getOxygenSaturation(): Promise<HealthData['oxygenSaturation'] | null> {
    if (!this.syncStatus.permissions.oxygenSaturation) return null;
    return this.getAndroidOxygenSaturation();
  }

  private async getAndroidRespiratoryRate(): Promise<HealthData['respiratoryRate'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const records = await HC.readRecords('RespiratoryRate', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const latest = records.records[records.records.length - 1] as any;

        return {
          value: Math.round(latest.rate),
          date: new Date(latest.time).toISOString(),
          source: normalizeSourceName(extractAndroidSourceName(latest)),
        };
      }
      return null;
    }, 'respiratoryRate');
  }

  async getRespiratoryRate(): Promise<HealthData['respiratoryRate'] | null> {
    if (!this.syncStatus.permissions.respiratoryRate) return null;
    return this.getAndroidRespiratoryRate();
  }

  private async getAndroidBodyTemperature(): Promise<HealthData['bodyTemperature'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const records = await HC.readRecords('BodyTemperature', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const latest = records.records[records.records.length - 1] as any;

        return {
          value: Math.round(latest.temperature?.inCelsius * 10) / 10,
          date: new Date(latest.time).toISOString(),
          source: normalizeSourceName(extractAndroidSourceName(latest)),
        };
      }
      return null;
    }, 'bodyTemperature');
  }

  async getBodyTemperature(): Promise<HealthData['bodyTemperature'] | null> {
    if (!this.syncStatus.permissions.bodyTemperature) return null;
    return this.getAndroidBodyTemperature();
  }

  // ============================================
  // LECTURE: COMPOSITION CORPORELLE
  // ============================================

  private async getAndroidBodyComposition(): Promise<HealthData['bodyComposition'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [fatRecords, leanRecords] = await Promise.all([
        HC.readRecords('BodyFat', {
          timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
        }).catch(() => ({ records: [] })),
        HC.readRecords('LeanBodyMass', {
          timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
        }).catch(() => ({ records: [] })),
      ]);

      const bodyFatPercentage = fatRecords?.records && fatRecords.records.length > 0
        ? Math.round((fatRecords.records[fatRecords.records.length - 1] as any).percentage * 100)
        : undefined;

      const leanBodyMass = leanRecords?.records && leanRecords.records.length > 0
        ? Math.round((leanRecords.records[leanRecords.records.length - 1] as any).mass?.inKilograms * 10) / 10
        : undefined;

      if (bodyFatPercentage !== undefined || leanBodyMass !== undefined) {
        const sourceSample = (fatRecords?.records && fatRecords.records.length > 0)
          ? fatRecords.records[fatRecords.records.length - 1]
          : (leanRecords?.records && leanRecords.records.length > 0)
            ? leanRecords.records[leanRecords.records.length - 1]
            : null;
        return {
          bodyFatPercentage,
          leanBodyMass,
          date: new Date().toISOString(),
          source: sourceSample ? normalizeSourceName(extractAndroidSourceName(sourceSample)) : undefined,
        };
      }
      return null;
    }, 'bodyComposition');
  }

  async getBodyComposition(): Promise<HealthData['bodyComposition'] | null> {
    if (!this.syncStatus.permissions.bodyComposition) return null;
    return this.getAndroidBodyComposition();
  }

  // ============================================
  // LECTURE: WORKOUTS
  // ============================================

  private async getAndroidWorkouts(): Promise<HealthData['workouts'] | null> {
    return this.queryHealthConnect(async () => {
      const HC = getHealthConnect()!;
      const fromDate = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);

      const records = await HC.readRecords('ExerciseSession', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const workouts: NonNullable<HealthData['workouts']> = [];

        for (const session of records.records) {
          const workoutFingerprint = `${session.startTime}_${session.endTime}_${session.exerciseType || 'unknown'}`;
          const deterministicId = session.metadata?.id || `workout_${this.simpleHash(workoutFingerprint)}`;

          const sportKey = ANDROID_EXERCISE_TYPE_NAMES[session.exerciseType] || 'other';
          const startTime = new Date(session.startTime);
          const endTime = new Date(session.endTime);
          const source = extractAndroidSourceName(session);

          // Extraire distance et calories depuis les segments ou les records associes
          // Note: cast to any - TS types may lag behind runtime API
          let distance: number | undefined;
          let calories: number | undefined;
          const sessionAny = session as any;

          if (sessionAny.route?.distance) {
            distance = Math.round(sessionAny.route.distance / 1000 * 100) / 100;
          }
          if (sessionAny.segments?.[0]?.totalCalories?.inKilocalories) {
            calories = Math.round(sessionAny.segments[0].totalCalories.inKilocalories);
          }

          // Lire les heart rate samples pour ce workout
          let avgHR: number | undefined;
          let maxHR: number | undefined;
          try {
            const hrRecords = await HC.readRecords('HeartRate', {
              timeRangeFilter: this.createTimeRangeFilter(startTime, endTime),
            });
            if (hrRecords?.records && hrRecords.records.length > 0) {
              const allBpm: number[] = [];
              for (const hr of hrRecords.records) {
                if (hr.samples) {
                  for (const sample of hr.samples) {
                    if (sample.beatsPerMinute > 0) allBpm.push(sample.beatsPerMinute);
                  }
                }
              }
              if (allBpm.length > 0) {
                avgHR = Math.round(allBpm.reduce((a: number, b: number) => a + b, 0) / allBpm.length);
                maxHR = Math.max(...allBpm);
              }
            }
          } catch (e) {
            // HR may not be available
          }

          // Lire les calories depuis TotalCaloriesBurned si pas dispo dans segments
          if (!calories) {
            try {
              const calRecords = await HC.readRecords('TotalCaloriesBurned', {
                timeRangeFilter: this.createTimeRangeFilter(startTime, endTime),
              });
              if (calRecords?.records && calRecords.records.length > 0) {
                let totalCal = 0;
                for (const cr of calRecords.records) {
                  totalCal += cr.energy?.inKilocalories || 0;
                }
                if (totalCal > 0) calories = Math.round(totalCal);
              }
            } catch (e) {
              // Calories may not be available
            }
          }

          // Lire la distance depuis Distance records si pas dispo dans session
          if (!distance) {
            try {
              const distRecords = await HC.readRecords('Distance', {
                timeRangeFilter: this.createTimeRangeFilter(startTime, endTime),
              });
              if (distRecords?.records && distRecords.records.length > 0) {
                let totalDist = 0;
                for (const dr of distRecords.records) {
                  totalDist += dr.distance?.inMeters || 0;
                }
                if (totalDist > 0) distance = Math.round(totalDist / 10) / 100; // m -> km
              }
            } catch (e) {
              // Distance may not be available
            }
          }

          workouts.push({
            id: deterministicId,
            activityType: sportKey,
            startDate: startTime.toISOString(),
            endDate: endTime.toISOString(),
            duration: Math.round((endTime.getTime() - startTime.getTime()) / 60000),
            distance,
            calories,
            averageHeartRate: avgHR,
            maxHeartRate: maxHR,
            source: normalizeSourceName(source),
          });
        }

        return workouts.length > 0 ? workouts : null;
      }
      return null;
    }, 'workouts');
  }

  async getWorkouts(): Promise<HealthData['workouts'] | null> {
    if (!this.syncStatus.permissions.workouts) return null;
    return this.getAndroidWorkouts();
  }

  // ============================================
  // HISTORIQUES
  // ============================================

  async getWeightHistory(days: number = 30): Promise<{ date: string; value: number; source?: string }[]> {
    const HC = getHealthConnect();
    if (!HC) return [];

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('Weight', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        return records.records.map((r: any) => ({
          date: new Date(r.time).toISOString().split('T')[0],
          value: Math.round(r.weight.inKilograms * 10) / 10,
          source: r.metadata?.dataOrigin || 'Unknown',
        }));
      }
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur lecture historique poids:', error);
    }
    return [];
  }

  async getSleepHistory(days: number = 7): Promise<{
    date: string;
    deep: number;
    rem: number;
    core: number;
    awake: number;
    total: number;
    duration?: number;
    source?: string;
  }[]> {
    const HC = getHealthConnect();
    if (!HC) return [];

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('SleepSession', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const sleepByDate: { [key: string]: { deep: number; rem: number; core: number; awake: number; total: number } } = {};

        for (const session of records.records as any[]) {
          const date = new Date(session.endTime).toISOString().split('T')[0];
          const totalMinutes = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000;

          if (!sleepByDate[date]) {
            sleepByDate[date] = { deep: 0, rem: 0, core: 0, awake: 0, total: 0 };
          }

          sleepByDate[date].total += totalMinutes;

          if (session.stages) {
            for (const stage of session.stages) {
              const stageDuration = (new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime()) / 60000;
              switch (stage.stage) {
                case 1: case 3: sleepByDate[date].awake += stageDuration; break;
                case 4: sleepByDate[date].core += stageDuration; break;
                case 5: sleepByDate[date].deep += stageDuration; break;
                case 6: sleepByDate[date].rem += stageDuration; break;
              }
            }
          }
        }

        return Object.keys(sleepByDate)
          .filter(date => sleepByDate[date].total > 0)
          .map(date => ({
            date,
            deep: Math.round(sleepByDate[date].deep),
            rem: Math.round(sleepByDate[date].rem),
            core: Math.round(sleepByDate[date].core),
            awake: Math.round(sleepByDate[date].awake),
            total: Math.round(sleepByDate[date].total),
            duration: Math.round(sleepByDate[date].total),
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur lecture historique sommeil:', error);
    }
    return [];
  }

  async getStepsHistory(days: number = 7): Promise<{ date: string; value: number }[]> {
    const HC = getHealthConnect();
    if (!HC) return [];

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('Steps', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const stepsByDate: { [key: string]: number } = {};

        for (const record of records.records as any[]) {
          const date = new Date(record.startTime).toISOString().split('T')[0];
          if (!stepsByDate[date]) stepsByDate[date] = 0;
          stepsByDate[date] += record.count || 0;
        }

        return Object.keys(stepsByDate)
          .filter(date => stepsByDate[date] > 0)
          .map(date => ({ date, value: Math.round(stepsByDate[date]) }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur lecture historique pas:', error);
    }
    return [];
  }

  async getHRVHistory(days: number = 7): Promise<{ date: string; value: number }[]> {
    const HC = getHealthConnect();
    if (!HC) return [];

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('HeartRateVariabilityRmssd', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const hrvByDate: { [key: string]: number[] } = {};

        for (const record of records.records as any[]) {
          const date = new Date(record.time).toISOString().split('T')[0];
          if (!hrvByDate[date]) hrvByDate[date] = [];
          hrvByDate[date].push(record.heartRateVariabilityMillis || 0);
        }

        return Object.keys(hrvByDate).map(date => ({
          date,
          value: Math.round(hrvByDate[date].reduce((a, b) => a + b, 0) / hrvByDate[date].length),
        })).sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur lecture historique HRV:', error);
    }
    return [];
  }

  async getHeartRateHistory(days: number = 7): Promise<{ date: string; value: number }[]> {
    const HC = getHealthConnect();
    if (!HC) return [];

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('HeartRate', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const hrByDate: { [key: string]: number[] } = {};

        for (const record of records.records as any[]) {
          const date = new Date(record.startTime).toISOString().split('T')[0];
          if (!hrByDate[date]) hrByDate[date] = [];

          if (record.samples) {
            for (const sample of record.samples) {
              hrByDate[date].push(sample.beatsPerMinute || 0);
            }
          }
        }

        return Object.keys(hrByDate)
          .filter(date => hrByDate[date].length > 0)
          .map(date => ({
            date,
            value: Math.round(hrByDate[date].reduce((a, b) => a + b, 0) / hrByDate[date].length),
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur lecture historique FC:', error);
    }
    return [];
  }

  async getRestingHRHistory(days: number = 7): Promise<{ date: string; value: number }[]> {
    const HC = getHealthConnect();
    if (!HC) return [];

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('RestingHeartRate', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        return records.records.map((r: any) => ({
          date: new Date(r.time).toISOString().split('T')[0],
          value: Math.round(r.beatsPerMinute),
        })).sort((a: any, b: any) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur lecture historique Resting HR:', error);
    }
    return [];
  }

  async getCaloriesHistory(days: number = 7): Promise<{
    date: string;
    active: number;
    basal: number;
    total: number;
  }[]> {
    const HC = getHealthConnect();
    if (!HC) return [];

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('ActiveCaloriesBurned', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        const caloriesByDate: { [key: string]: number } = {};

        for (const record of records.records as any[]) {
          const date = new Date(record.startTime).toISOString().split('T')[0];
          if (!caloriesByDate[date]) caloriesByDate[date] = 0;
          caloriesByDate[date] += record.energy?.inKilocalories || 0;
        }

        return Object.keys(caloriesByDate)
          .map(date => ({
            date,
            active: Math.round(caloriesByDate[date]),
            basal: 0,
            total: Math.round(caloriesByDate[date]),
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur lecture historique calories:', error);
    }
    return [];
  }

  async getVO2MaxHistory(days: number = 30): Promise<{ date: string; value: number }[]> {
    const HC = getHealthConnect();
    if (!HC) return [];

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('Vo2Max', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        return records.records.map((r: any) => ({
          date: new Date(r.time).toISOString().split('T')[0],
          value: Math.round(r.vo2MillilitersPerMinuteKilogram * 10) / 10,
        })).sort((a: any, b: any) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur lecture historique VO2 Max:', error);
    }
    return [];
  }

  async getOxygenSaturationHistory(days: number = 7): Promise<{ date: string; value: number }[]> {
    const HC = getHealthConnect();
    if (!HC) return [];

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('OxygenSaturation', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        return records.records.map((r: any) => ({
          date: new Date(r.time).toISOString().split('T')[0],
          value: Math.round(r.percentage * 100),
        })).sort((a: any, b: any) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur lecture historique SpO2:', error);
    }
    return [];
  }

  async getBodyTemperatureHistory(days: number = 7): Promise<{ date: string; value: number }[]> {
    const HC = getHealthConnect();
    if (!HC) return [];

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const records = await HC.readRecords('BodyTemperature', {
        timeRangeFilter: this.createTimeRangeFilter(fromDate, new Date()),
      });

      if (records?.records && records.records.length > 0) {
        return records.records.map((r: any) => ({
          date: new Date(r.time).toISOString().split('T')[0],
          value: parseFloat((r.temperature?.inCelsius || 0).toFixed(1)),
        })).sort((a: any, b: any) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur lecture historique température:', error);
    }
    return [];
  }

  // ============================================
  // ÉCRITURE: POIDS
  // ============================================

  async writeWeight(weight: number, unit: 'kg' | 'lbs' = 'kg'): Promise<boolean> {
    const HC = getHealthConnect();
    if (!HC) {
      throw new Error('Health Connect module not available');
    }

    const weightInKg = unit === 'lbs' ? weight * 0.453592 : weight;

    try {
      // Vérifier les doublons
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingRecords = await HC.readRecords('Weight', {
        timeRangeFilter: this.createTimeRangeFilter(today, tomorrow),
      });

      if (existingRecords?.records && existingRecords.records.length > 0) {
        const alreadyExists = existingRecords.records.some(
          (r: any) => Math.abs(r.weight.inKilograms - weightInKg) < 0.1
        );
        if (alreadyExists) {
          logger.info('[HealthConnect Android] Poids déjà enregistré pour aujourd\'hui');
          return true;
        }
      }

      await HC.insertRecords([
        {
          recordType: 'Weight',
          time: new Date().toISOString(),
          weight: {
            value: weightInKg,
            unit: 'kilograms',
          },
        },
      ]);

      logger.info(`[HealthConnect Android] Poids enregistre: ${weightInKg} kg`);
      return true;
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur écriture poids:', error);
      throw error;
    }
  }

  // ============================================
  // ÉCRITURE: HYDRATATION
  // ============================================

  async writeHydration(amountMl: number): Promise<boolean> {
    const HC = getHealthConnect();
    if (!HC) {
      throw new Error('Health Connect module not available');
    }

    try {
      const now = new Date();

      await HC.insertRecords([
        {
          recordType: 'Hydration',
          startTime: now.toISOString(),
          endTime: now.toISOString(),
          volume: {
            value: amountMl / 1000, // Convertir en litres
            unit: 'liters',
          },
        },
      ]);

      logger.info(`[HealthConnect Android] Hydratation enregistree: ${amountMl} ml`);
      return true;
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur écriture hydratation:', error);
      throw error;
    }
  }

  // ============================================
  // ÉCRITURE: BODY FAT
  // ============================================

  async writeBodyFat(percentage: number): Promise<boolean> {
    const HC = getHealthConnect();
    if (!HC) {
      throw new Error('Health Connect module not available');
    }

    try {
      // Vérifier les doublons
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingRecords = await HC.readRecords('BodyFat', {
        timeRangeFilter: this.createTimeRangeFilter(today, tomorrow),
      });

      if (existingRecords?.records && existingRecords.records.length > 0) {
        const alreadyExists = existingRecords.records.some(
          (r: any) => Math.abs(r.percentage * 100 - percentage) < 0.5
        );
        if (alreadyExists) {
          logger.info('[HealthConnect Android] Body fat déjà enregistré pour aujourd\'hui');
          return true;
        }
      }

      await HC.insertRecords([
        {
          recordType: 'BodyFat',
          time: new Date().toISOString(),
          percentage: percentage / 100, // Convertir en ratio
        },
      ]);

      logger.info(`[HealthConnect Android] Body fat enregistre: ${percentage}%`);
      return true;
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur écriture body fat:', error);
      throw error;
    }
  }

  // ============================================
  // ÉCRITURE: WORKOUT
  // ============================================

  async writeWorkout(workout: {
    activityType: string;
    startDate: Date;
    endDate: Date;
    distance?: number;
    calories?: number;
  }): Promise<boolean> {
    const HC = getHealthConnect();
    if (!HC) {
      throw new Error('Health Connect module not available');
    }

    try {
      const exerciseType = EXERCISE_TYPE_MAP[workout.activityType] || 0; // 0 = OTHER

      const record: any = {
        recordType: 'ExerciseSession',
        startTime: new Date(workout.startDate).toISOString(),
        endTime: new Date(workout.endDate).toISOString(),
        exerciseType,
      };

      // Note: Health Connect n'accepte pas directement distance/calories sur ExerciseSession
      // Il faut créer des records séparés (Distance, ActiveCaloriesBurned) si nécessaire

      await HC.insertRecords([record]);

      // Si distance fournie, créer un record Distance
      if (workout.distance) {
        await HC.insertRecords([
          {
            recordType: 'Distance',
            startTime: new Date(workout.startDate).toISOString(),
            endTime: new Date(workout.endDate).toISOString(),
            distance: {
              value: workout.distance * 1000, // km -> m
              unit: 'meters',
            },
          },
        ]);
      }

      // Si calories fournies, créer un record ActiveCaloriesBurned
      if (workout.calories) {
        await HC.insertRecords([
          {
            recordType: 'ActiveCaloriesBurned',
            startTime: new Date(workout.startDate).toISOString(),
            endTime: new Date(workout.endDate).toISOString(),
            energy: {
              value: workout.calories,
              unit: 'kilocalories',
            },
          },
        ]);
      }

      logger.info('[HealthConnect Android] Workout enregistré:', workout.activityType);
      return true;
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur écriture workout:', error);
      throw error;
    }
  }

  // ============================================
  // ÉCRITURE: SLEEP
  // ============================================

  async writeSleepData(sleepData: {
    startTime: Date;
    endTime: Date;
    stages?: {
      stage: 'awake' | 'light' | 'deep' | 'rem';
      startTime: Date;
      endTime: Date;
    }[];
  }): Promise<boolean> {
    const HC = getHealthConnect();
    if (!HC) {
      throw new Error('Health Connect module not available');
    }

    try {
      // Mapper les stages Yoroi vers Health Connect
      const stageMap: { [key: string]: number } = {
        'awake': 1, // AWAKE
        'light': 4, // LIGHT
        'deep': 5,  // DEEP
        'rem': 6,   // REM
      };

      const record: any = {
        recordType: 'SleepSession',
        startTime: new Date(sleepData.startTime).toISOString(),
        endTime: new Date(sleepData.endTime).toISOString(),
      };

      if (sleepData.stages && sleepData.stages.length > 0) {
        record.stages = sleepData.stages.map(s => ({
          startTime: new Date(s.startTime).toISOString(),
          endTime: new Date(s.endTime).toISOString(),
          stage: stageMap[s.stage] || 2, // 2 = SLEEPING default
        }));
      }

      await HC.insertRecords([record]);

      logger.info('[HealthConnect Android] Sommeil enregistré');
      return true;
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur écriture sommeil:', error);
      throw error;
    }
  }

  // ============================================
  // SYNCHRONISATION
  // ============================================

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), ms)
      ),
    ]);
  }

  async getAllHealthData(): Promise<HealthData> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return {
          weight: undefined,
          steps: undefined,
          sleep: undefined,
          hydration: undefined,
          heartRate: undefined,
          heartRateVariability: undefined,
          calories: undefined,
          distance: undefined,
          vo2Max: undefined,
          oxygenSaturation: undefined,
          respiratoryRate: undefined,
          bodyTemperature: undefined,
          bodyComposition: undefined,
          workouts: undefined,
        };
      }

      const TIMEOUT_MS = 5000;
      const results = await Promise.allSettled([
        this.withTimeout(this.getLatestWeight(), TIMEOUT_MS),
        this.withTimeout(this.getTodaySteps(), TIMEOUT_MS),
        this.withTimeout(this.getLastSleep(), TIMEOUT_MS),
        this.withTimeout(this.getTodayHydration(), TIMEOUT_MS),
        this.withTimeout(this.getTodayHeartRate(), TIMEOUT_MS),
        this.withTimeout(this.getTodayHRV(), TIMEOUT_MS),
        this.withTimeout(this.getTodayCalories(), TIMEOUT_MS),
        this.withTimeout(this.getTodayDistance(), TIMEOUT_MS),
        this.withTimeout(this.getVO2Max(), TIMEOUT_MS),
        this.withTimeout(this.getOxygenSaturation(), TIMEOUT_MS),
        this.withTimeout(this.getRespiratoryRate(), TIMEOUT_MS),
        this.withTimeout(this.getBodyTemperature(), TIMEOUT_MS),
        this.withTimeout(this.getBodyComposition(), TIMEOUT_MS),
        this.withTimeout(this.getWorkouts(), TIMEOUT_MS),
      ]);

      const weight = results[0].status === 'fulfilled' ? results[0].value : null;
      const steps = results[1].status === 'fulfilled' ? results[1].value : null;
      const sleep = results[2].status === 'fulfilled' ? results[2].value : null;
      const hydration = results[3].status === 'fulfilled' ? results[3].value : null;
      const heartRate = results[4].status === 'fulfilled' ? results[4].value : null;
      const hrv = results[5].status === 'fulfilled' ? results[5].value : null;
      const calories = results[6].status === 'fulfilled' ? results[6].value : null;
      const distance = results[7].status === 'fulfilled' ? results[7].value : null;
      const vo2Max = results[8].status === 'fulfilled' ? results[8].value : null;
      const oxygenSaturation = results[9].status === 'fulfilled' ? results[9].value : null;
      const respiratoryRate = results[10].status === 'fulfilled' ? results[10].value : null;
      const bodyTemperature = results[11].status === 'fulfilled' ? results[11].value : null;
      const bodyComposition = results[12].status === 'fulfilled' ? results[12].value : null;
      const workouts = results[13].status === 'fulfilled' ? results[13].value : null;

      // Logger les échecs
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          const dataTypes = ['weight', 'steps', 'sleep', 'hydration', 'heartRate', 'hrv',
            'calories', 'distance', 'vo2max', 'oxygenSat', 'respRate',
            'temperature', 'bodyComp', 'workouts'];
          logger.warn(`[HealthConnect Android] Failed to fetch ${dataTypes[i]}:`, r.reason);
        }
      });

      return {
        weight: weight ?? undefined,
        steps: steps ?? undefined,
        sleep: sleep ?? undefined,
        hydration: hydration ?? undefined,
        heartRate: heartRate ?? undefined,
        heartRateVariability: hrv ?? undefined,
        calories: calories ?? undefined,
        distance: distance ?? undefined,
        vo2Max: vo2Max ?? undefined,
        oxygenSaturation: oxygenSaturation ?? undefined,
        respiratoryRate: respiratoryRate ?? undefined,
        bodyTemperature: bodyTemperature ?? undefined,
        bodyComposition: bodyComposition ?? undefined,
        workouts: workouts ?? undefined,
      };
    } catch (error) {
      logger.error('[HealthConnect Android] Critical error in getAllHealthData:', error);
      return {
        weight: undefined,
        steps: undefined,
        sleep: undefined,
        hydration: undefined,
        heartRate: undefined,
        heartRateVariability: undefined,
        calories: undefined,
        distance: undefined,
        vo2Max: undefined,
        oxygenSaturation: undefined,
        respiratoryRate: undefined,
        bodyTemperature: undefined,
        bodyComposition: undefined,
        workouts: undefined,
      };
    }
  }

  private async syncWithRetry(maxRetries = 3, delayMs = 1000): Promise<HealthData | null> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        logger.info(`[HealthConnect Android] Tentative de sync ${i + 1}/${maxRetries}`);
        return await this.syncAll();
      } catch (error) {
        logger.warn(`[HealthConnect Android] Sync failed (attempt ${i + 1}):`, error);

        if (i < maxRetries - 1) {
          const waitTime = delayMs * Math.pow(2, i);
          logger.info(`[HealthConnect Android] Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    logger.error('[HealthConnect Android] Sync failed after all retries');
    return null;
  }

  async syncAll(): Promise<HealthData | null> {
    if (!this.syncStatus.isConnected) {
      const available = await this.isAvailable();
      if (!available) {
        logger.warn('[HealthConnect Android] Non connecte et non disponible, abandon');
        return null;
      }
      logger.info('[HealthConnect Android] Non connecte mais Health Connect disponible, on continue');
    }

    try {
      logger.info('[HealthConnect Android] Synchronisation en cours...');
      const data = await this.getAllHealthData();

      // Cache rapide pour l'UI
      if (data.weight) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_WEIGHT, JSON.stringify(data.weight));
      }
      if (data.steps) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_STEPS, JSON.stringify(data.steps));
      }
      if (data.sleep) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_SLEEP, JSON.stringify(data.sleep));
      }
      if (data.hydration) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_HYDRATION, JSON.stringify(data.hydration));
      }

      // Import workouts dans SQLite (table trainings)
      if (data.workouts && data.workouts.length > 0) {
        let importedFingerprints: Set<string> = new Set();
        try {
          const saved = await AsyncStorage.getItem('@yoroi_imported_workouts');
          if (saved) importedFingerprints = new Set(JSON.parse(saved));
        } catch {}

        let workoutsSaved = 0;
        for (const workout of data.workouts) {
          const fingerprint = `${workout.startDate}_${workout.activityType}_${workout.duration}`;
          if (importedFingerprints.has(fingerprint)) continue;

          try {
            const sportKey = workout.activityType;
            const sportLabel = ANDROID_SPORT_LABELS[sportKey] || sportKey;
            const trainingDate = new Date(workout.startDate).toISOString().split('T')[0];
            const startTime = new Date(workout.startDate).toTimeString().slice(0, 5);

            const noteParts: string[] = [];
            if (workout.duration > 0) noteParts.push(`${Math.round(workout.duration)} min`);
            if (workout.distance && workout.distance > 0) noteParts.push(`${workout.distance.toFixed(2)} km`);
            if (workout.calories && workout.calories > 0) noteParts.push(`${Math.round(workout.calories)} kcal`);
            if (workout.averageHeartRate && workout.averageHeartRate > 0) noteParts.push(`${Math.round(workout.averageHeartRate)} bpm`);
            const noteText = noteParts.length > 0 ? `${sportLabel} (${noteParts.join(', ')})` : sportLabel;

            const training: Training = {
              sport: sportKey,
              session_type: sportLabel,
              date: trainingDate,
              start_time: startTime,
              duration_minutes: workout.duration,
              distance: workout.distance,
              calories: workout.calories,
              heart_rate: workout.averageHeartRate,
              max_heart_rate: workout.maxHeartRate,
              source: workout.source || 'health_connect',
              notes: noteText,
            };

            await addTraining(training);
            importedFingerprints.add(fingerprint);
            workoutsSaved++;

            // Notification Strava-like pour les workouts recents (< 30 min)
            const workoutAge = Date.now() - new Date(workout.endDate).getTime();
            if (workoutAge < 30 * 60 * 1000) {
              await this.sendWorkoutNotification(workout, sportLabel);
            }
          } catch (e) {
            logger.warn('[HealthConnect Android] Erreur sauvegarde workout:', e);
          }
        }

        if (workoutsSaved > 0) {
          const fingerprintsArray = Array.from(importedFingerprints).slice(-500);
          await AsyncStorage.setItem('@yoroi_imported_workouts', JSON.stringify(fingerprintsArray));
          logger.info(`[HealthConnect Android] ${workoutsSaved} workouts sauvegardes dans SQLite`);
        }
      }

      this.syncStatus.lastSync = new Date().toISOString();
      await this.saveSyncStatus();

      logger.info('[HealthConnect Android] Synchronisation terminee');
      return data;
    } catch (error) {
      logger.error('[HealthConnect Android] Erreur synchronisation:', error);
      throw error;
    }
  }

  /**
   * Notification Strava-like apres un workout (Android)
   */
  private async sendWorkoutNotification(
    workout: NonNullable<HealthData['workouts']>[0],
    sportLabel: string
  ): Promise<void> {
    try {
      const Notif = await import('expo-notifications');

      const durationH = Math.floor(workout.duration / 60);
      const durationM = Math.round(workout.duration % 60);
      const durationStr = durationH > 0
        ? `${durationH}h${durationM > 0 ? `${String(durationM).padStart(2, '0')}` : ''}`
        : `${durationM} min`;

      const sourceLabel = workout.source === 'garmin' ? 'Garmin'
        : workout.source === 'samsung' ? 'Samsung Health'
        : workout.source === 'fitbit' ? 'Fitbit'
        : workout.source === 'polar' ? 'Polar'
        : workout.source === 'suunto' ? 'Suunto'
        : workout.source === 'xiaomi' ? 'Xiaomi'
        : '';

      const title = `Bravo pour ta seance de ${sportLabel.toLowerCase()} !`;

      const lines: string[] = [durationStr];
      if (workout.distance && workout.distance > 0) lines[0] += ` | ${workout.distance.toFixed(2)} km`;
      if (workout.calories && workout.calories > 0) lines.push(`${Math.round(workout.calories)} kcal`);
      if (workout.averageHeartRate && workout.averageHeartRate > 0) {
        let hrStr = `FC moy ${Math.round(workout.averageHeartRate)} bpm`;
        if (workout.maxHeartRate && workout.maxHeartRate > 0) hrStr += ` (max ${Math.round(workout.maxHeartRate)})`;
        lines.push(hrStr);
      }
      if (sourceLabel) lines.push(`Via ${sourceLabel}`);
      lines.push('Tape pour partager ta seance !');

      await Notif.scheduleNotificationAsync({
        content: {
          title,
          body: lines.join('\n'),
          subtitle: sourceLabel || undefined,
          data: { type: 'workout_complete' },
          sound: 'default',
        },
        trigger: null,
      });

      logger.info(`[HealthConnect Android] Notification envoyee: ${title}`);
    } catch (e) {
      logger.warn('[HealthConnect Android] Erreur notification:', e);
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

  /**
   * Stub pour parite API avec iOS - sur Android les workouts sont detectes dans syncAll
   */
  async setupWorkoutObserver(): Promise<void> {
    logger.info('[HealthConnect Android] Workout observer: les workouts sont importes via syncAll');
  }

  /**
   * Ouvre les paramètres Health Connect (utile si permissions refusées)
   */
  async openHealthConnectSettings(): Promise<void> {
    const HC = getHealthConnect();
    if (HC) {
      try {
        await HC.openHealthConnectSettings();
      } catch (error) {
        logger.error('[HealthConnect Android] Erreur ouverture paramètres:', error);
      }
    }
  }

  /**
   * Ouvre le Play Store pour installer Health Connect
   */
  async openHealthConnectPlayStore(): Promise<void> {
    const { Linking } = require('react-native');
    try {
      await Linking.openURL('market://details?id=com.google.android.apps.healthdata');
    } catch {
      await Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata');
    }
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
  return ''; // Health Connect icon
};

export const getConnectionInstructions = (): string[] => {
  return [
    "1. Assure-toi que Health Connect est installé sur ton téléphone",
    "2. YOROI va demander l'accès à tes données de santé",
    "3. Autorise l'accès au poids, aux pas, au sommeil et au reste",
    "4. Tes données seront synchronisées automatiquement",
  ];
};

export default healthConnect;
