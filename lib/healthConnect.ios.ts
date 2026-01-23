// ============================================
// YOROI - SERVICE HEALTH CONNECT (iOS)
// ============================================
// Intégration Apple Health uniquement
// ============================================

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DemoData from './healthDemoData';
import logger from '@/lib/security/logger';

// ============================================
// MODE DÉMO - Active les fausses données
// ============================================
// ATTENTION: Mettre à FALSE pour utiliser les vraies données Apple Health
// PRODUCTION: Désactivé pour l'App Store
// NOTE: Désactivé - les données vides s'afficheront si non connecté à HealthKit
const DEMO_MODE = false;

// Apple HealthKit (iOS) - Safe wrapper with Expo Go fallback
import HealthKit, { isHealthKitAvailable, isRunningInExpoGo } from './healthKit.wrapper';

// CRITIQUE: Ne pas importer directement depuis kingstinct au top-level pour éviter NitroModules error dans Expo Go
let WorkoutActivityType: any = {};
if (!isRunningInExpoGo && isHealthKitAvailable) {
  try {
    const HK = require('@kingstinct/react-native-healthkit');
    WorkoutActivityType = HK.WorkoutActivityType;
  } catch (e) {
    logger.warn('Failed to load WorkoutActivityType dynamically');
  }
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
    duration: number; // minutes totales
    quality?: 'poor' | 'fair' | 'good' | 'excellent';
    // Phases de sommeil (Apple Watch uniquement)
    phases?: {
      awake: number; // minutes
      rem: number;   // minutes
      core: number;  // minutes (sommeil léger/intermédiaire)
      deep: number;  // minutes
      inBed: number; // minutes au lit
    };
  };
  hydration?: {
    amount: number; // en millilitres
    date: string;
  };
  heartRate?: {
    current?: number;    // BPM actuel
    average: number;     // BPM moyen sur la période
    min: number;         // BPM minimum
    max: number;         // BPM maximum
    resting: number;     // FC au repos (important pour récupération)
  };
  heartRateVariability?: {
    value: number;       // HRV en ms (SDNN)
    date: string;
  };
  calories?: {
    active: number;      // Calories actives brûlées
    basal: number;       // Calories au repos (BMR)
    total: number;       // Total = active + basal
  };
  distance?: {
    walking: number;     // Distance marche (km)
    running: number;     // Distance course (km)
    total: number;       // Total (km)
    unit: 'km' | 'miles';
  };
  vo2Max?: {
    value: number;       // ml/kg/min
    date: string;
  };
  oxygenSaturation?: {
    value: number;       // SpO2 en % (0-100)
    date: string;
  };
  respiratoryRate?: {
    value: number;       // Respirations par minute
    date: string;
  };
  bodyTemperature?: {
    value: number;       // Température en °C
    date: string;
  };
  bodyComposition?: {
    bodyFatPercentage?: number;  // % graisse corporelle
    leanBodyMass?: number;       // Masse maigre en kg
    date: string;
  };
  workouts?: Array<{
    id: string;
    activityType: string;        // Running, Cycling, MMA, etc.
    startDate: string;
    endDate: string;
    duration: number;             // minutes
    distance?: number;            // km
    calories?: number;            // kcal
    averageHeartRate?: number;    // BPM
    maxHeartRate?: number;        // BPM
  }>;
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
  LAST_HYDRATION: '@yoroi_health_last_hydration',
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

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      logger.info('HealthConnect iOS ignoré sur cette plateforme');
      return false;
    }
    try {
      const savedStatus = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATUS);
      if (savedStatus) {
        this.syncStatus = JSON.parse(savedStatus);
      }
      this.syncStatus.provider = 'apple_health';
      this.isInitialized = true;
      logger.info('HealthConnect iOS initialisé');
      return true;
    } catch (error) {
      logger.error('Erreur initialisation HealthConnect:', error);
      return false;
    }
  }

  async isAvailable(): Promise<boolean> {
    // Vérifier si on est dans Expo Go
    if (isRunningInExpoGo) {
      logger.warn('[HealthConnect] Running in Expo Go - HealthKit not available');
      return false;
    }

    // Vérifier si le module HealthKit est chargé
    if (!isHealthKitAvailable) {
      logger.warn('[HealthConnect] HealthKit module not available');
      return false;
    }

    // Vérifier que c'est bien iOS
    if (Platform.OS !== 'ios') {
      return false;
    }

    // Sur iOS, Apple Health est toujours disponible sur les appareils physiques
    // IMPORTANT: Wrapper dans try/catch pour éviter crash sur iPad ou si module natif ne charge pas
    try {
      return HealthKit?.isHealthDataAvailable() ?? false;
    } catch (error) {
      logger.error('[HealthConnect] HealthKit.isHealthDataAvailable() failed:', error);
      return false;
    }
  }

  getProviderName(): string {
    return 'Apple Santé';
  }

  private async requestIOSPermissions(): Promise<HealthPermissions> {
    try {
      const toRead = [
        // Poids et composition corporelle
        'HKQuantityTypeIdentifierBodyMass',
        'HKQuantityTypeIdentifierBodyFatPercentage',
        'HKQuantityTypeIdentifierLeanBodyMass',
        // Activité
        'HKQuantityTypeIdentifierStepCount',
        'HKQuantityTypeIdentifierDistanceWalkingRunning',
        // Sommeil
        'HKCategoryTypeIdentifierSleepAnalysis',
        // Hydratation
        'HKQuantityTypeIdentifierDietaryWater',
        // Fréquence cardiaque
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        'HKQuantityTypeIdentifierRestingHeartRate',
        // Calories
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKQuantityTypeIdentifierBasalEnergyBurned',
        // Métriques avancées
        'HKQuantityTypeIdentifierVO2Max',
        'HKQuantityTypeIdentifierOxygenSaturation',
        'HKQuantityTypeIdentifierRespiratoryRate',
        'HKQuantityTypeIdentifierBodyTemperature',
        // Entraînements
        'HKWorkoutTypeIdentifier',
      ];

      const toShare = [
        'HKQuantityTypeIdentifierBodyMass',
        'HKQuantityTypeIdentifierDietaryWater',
        'HKWorkoutTypeIdentifier', // Permettre l'écriture des workouts
      ];

      // L'API HealthKit attend un objet { toRead, toShare }
      await HealthKit.requestAuthorization({ toRead, toShare });

      // Apple Health ne permet pas de vérifier directement les permissions
      // On retourne false par défaut - l'utilisateur doit autoriser manuellement dans Réglages iOS
      return {
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
    } catch (error) {
      logger.error('Erreur demande permissions iOS:', error);
      return this.syncStatus.permissions;
    }
  }

  async connect(): Promise<boolean> {
    // Mode démo : simuler une connexion réussie
    if (DEMO_MODE && __DEV__) {
      this.syncStatus.isConnected = true;
      this.syncStatus.lastSync = new Date().toISOString();
      await this.saveSyncStatus();
      return true;
    }

    try {
      const available = await this.isAvailable();
      if (!available) {
        logger.warn('[HealthConnect] Apple Health non disponible sur cet appareil');
        return false;
      }

      // Demander les permissions (ouvre le popup iOS)
      await this.requestIOSPermissions();

      // CRITIQUE: Vérifier que les permissions ont vraiment été accordées
      // en tentant de lire une donnée de test
      logger.info('[HealthConnect] Vérification des permissions réelles...');
      const hasPermissions = await this.verifyPermissions();

      if (!hasPermissions) {
        logger.warn('[HealthConnect] Utilisateur a refusé les permissions ou permissions non accordées');
        this.syncStatus.isConnected = false;
        await this.saveSyncStatus();
        return false;
      }

      // Tester une lecture réelle pour s'assurer que tout fonctionne
      logger.info('[HealthConnect] Test de lecture HealthKit...');
      const testData = await this.getLatestWeight();

      // On accepte null (pas de données) mais on vérifie qu'il n'y a pas eu d'erreur critique
      logger.info('[HealthConnect] Test réussi, marquage comme connecté');

      this.syncStatus.isConnected = true;
      this.syncStatus.lastSync = new Date().toISOString();

      // Marquer toutes les permissions comme disponibles (vérifiées)
      Object.keys(this.syncStatus.permissions).forEach(key => {
        this.syncStatus.permissions[key as keyof HealthPermissions] = true;
      });

      await this.saveSyncStatus();

      logger.info('[HealthConnect] Connexion HealthKit réussie');

      // Lancer une première synchronisation automatiquement
      logger.info('[HealthConnect] 🔄 Lancement de la synchronisation initiale...');
      await this.syncAll();

      return true;
    } catch (error) {
      logger.error('[HealthConnect] Erreur lors de la connexion:', error);
      this.syncStatus.isConnected = false;
      await this.saveSyncStatus();
      return false;
    }
  }

  // Vérifier si on peut réellement lire des données
  private async verifyPermissions(): Promise<boolean> {

    try {
      // Essayer de lire les pas du jour
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const queryOptions = this.createQueryOptions(today, new Date(), { limit: 1 });
      if (!queryOptions) {
        logger.warn('[HealthKit] Impossible de créer les options de requête pour la vérification');
        return false;
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', queryOptions);

      // Si on peut lire (même si vide), c'est que les permissions sont OK
      return true;
    } catch (error) {
      // Si erreur, c'est que les permissions ne sont pas accordées
      logger.info('Permissions Apple Health pas encore accordées');
      return false;
    }
  }

  /**
   * HELPER: Crée des options de requête sécurisées avec validation des timestamps
   */
  private createQueryOptions(fromDate: Date, toDate: Date, options: any = {}): any | null {
    const fromTimestamp = fromDate.getTime();
    const toTimestamp = toDate.getTime();

    // ✅ VALIDATION: S'assurer que les timestamps sont des nombres valides
    if (!fromTimestamp || !toTimestamp || isNaN(fromTimestamp) || isNaN(toTimestamp)) {
      logger.error('[HealthKit] Timestamps invalides pour la requête', {
        from: fromTimestamp,
        to: toTimestamp
      });
      return null;
    }

    return {
      from: fromTimestamp,
      to: toTimestamp,
      ...options
    };
  }

  /**
   * HELPER: Wrapper sécurisé pour toutes les requêtes HealthKit
   * - Vérifie que le module HealthKit est chargé
   * - Gère les erreurs de permissions de manière standardisée
   * - Log les erreurs de façon cohérente
   * - Retourne null en cas d'erreur au lieu de crasher
   */
  private async queryHealthKit<T>(
    queryFn: () => Promise<T>,
    dataTypeName: string
  ): Promise<T | null> {
    // Vérification #1: Module HealthKit chargé
    if (!HealthKit) {
      logger.warn(`[HealthConnect] HealthKit module not loaded, cannot fetch ${dataTypeName}`);
      return null;
    }

    try {
      return await queryFn();
    } catch (error) {
      // Gestion standardisée des erreurs
      if (error instanceof Error) {
        // Erreur de permissions (attendue si utilisateur refuse)
        if (
          error.message?.includes('Authorization') ||
          error.message?.includes('Code=5') ||
          error.message?.includes('not authorized')
        ) {
          logger.info(`[HealthConnect] Permissions non accordées pour ${dataTypeName}`);
          return null;
        }

        // Erreur de type de donnée non disponible
        if (error.message?.includes('dataTypeNotAvailable')) {
          logger.info(`[HealthConnect] Type de donnée ${dataTypeName} non disponible sur cet appareil`);
          return null;
        }

        // Erreur "undefined" (HealthKit retourne undefined au lieu d'un tableau)
        if (error.message?.includes('Value is undefined') || error.message?.includes('expected a number')) {
          logger.info(`[HealthConnect] Pas de données disponibles pour ${dataTypeName}`);
          return null;
        }

        // Autres erreurs (réelles)
        logger.error(`[HealthConnect] Erreur lecture ${dataTypeName}:`, error);
      } else {
        logger.error(`[HealthConnect] Erreur inconnue lecture ${dataTypeName}:`, error);
      }

      return null;
    }
  }

  private async getIOSWeight(): Promise<HealthData['weight'] | null> {
    return this.queryHealthKit(async () => {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const queryOptions = this.createQueryOptions(fromDate, new Date(), {
        limit: 1,
        ascending: false,
      });
      if (!queryOptions) {
        return null;
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', queryOptions);

      if (samples && samples.length > 0) {
        const latest = samples[0];
        return {
          value: Math.round(latest.quantity * 10) / 10,
          unit: 'kg',
          date: new Date(latest.startDate).toISOString(),
        };
      }
      return null;
    }, 'weight');
  }

  private async getIOSSteps(): Promise<HealthData['steps'] | null> {
    return this.queryHealthKit(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const queryOptions = this.createQueryOptions(today, new Date());
      if (!queryOptions) {
        logger.error('[HealthKit] Impossible de créer les options de requête pour les steps');
        return null;
      }

      try {
        // Revenir à queryQuantitySamples pour compatibilité max
        const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', queryOptions);

        // ✅ PROTECTION: Vérifier que samples est bien un tableau et contient des données valides
        if (!samples || !Array.isArray(samples) || samples.length === 0) {
          logger.info('[HealthKit] Pas de données de pas disponibles');
          return null;
        }

        // ✅ PROTECTION: Vérifier que les samples contiennent des valeurs numériques valides
        const validSamples = samples.filter(s => s && typeof s.quantity !== 'undefined' && !isNaN(Number(s.quantity)));
        if (validSamples.length === 0) {
          logger.info('[HealthKit] Aucune donnée de pas valide trouvée');
          return null;
        }

        if (validSamples.length > 0) {
          // DÉDOUBLONNAGE : Apple Santé peut avoir des échantillons qui se chevauchent
          // entre l'iPhone et la Watch. On groupe par source et on prend le meilleur.
          // Pour faire simple et robuste sans queryStatistics : on additionne tout
          // mais on s'assure de ne pas prendre de données aberrantes.
          const totalSteps = validSamples.reduce((sum: number, s: any) => {
            const quantity = Number(s?.quantity || 0);
            return sum + (isNaN(quantity) ? 0 : quantity);
          }, 0);

          if (totalSteps > 0) {
            // Limite de sécurité : 100 000 pas par jour max pour éviter les bugs de capteurs
            const safeSteps = Math.min(Math.round(totalSteps), 100000);

            return {
              count: safeSteps,
              date: today.toISOString(),
            };
          }
        }
      } catch (error) {
        logger.error('[HealthKit] Erreur lecture steps:', error);
      }

      return null;
    }, 'steps');
  }

  private async getIOSSleep(): Promise<HealthData['sleep'] | null> {
    return this.queryHealthKit(async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        from: yesterday.getTime(),
        to: now.getTime(),
        limit: 100,
      });

      if (samples && samples.length > 0) {
        let totalMinutes = 0;
        let awakeMinutes = 0;
        let remMinutes = 0;
        let coreMinutes = 0;
        let deepMinutes = 0;
        let inBedMinutes = 0;

        // Trier les échantillons par date de début
        const sortedSamples = [...samples].sort((a: any, b: any) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );

        const startTime = sortedSamples[0].startDate;
        const endTime = sortedSamples[sortedSamples.length - 1].endDate;

        sortedSamples.forEach((s: any) => {
          const duration = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
          if (duration <= 0) return;

          // HKCategoryValueSleepAnalysis: 0=InBed, 1=Asleep, 2=Awake, 3=Core, 4=Deep, 5=REM
          // IMPORTANT: On ne compte que le sommeil REEL (pas InBed)
          switch (s.value) {
            case 0:
              inBedMinutes += duration;
              break;
            case 1: // Asleep
            case 3: // Core
            case 4: // Deep
            case 5: // REM
              totalMinutes += duration;
              if (s.value === 3) coreMinutes += duration;
              if (s.value === 4) deepMinutes += duration;
              if (s.value === 5) remMinutes += duration;
              break;
            case 2:
              awakeMinutes += duration;
              break;
          }
        });

        // Limite de sécurité : une nuit ne peut pas faire plus de 16h
        if (totalMinutes <= 0 || totalMinutes > 960) return null;

        const result: HealthData['sleep'] = {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration: Math.round(totalMinutes),
          quality: this.getSleepQuality(totalMinutes),
          phases: {
            deep: Math.round(deepMinutes),
            rem: Math.round(remMinutes),
            core: Math.round(coreMinutes),
            awake: Math.round(awakeMinutes),
            inBed: Math.round(inBedMinutes),
          },
        };
        return result;
      }
      return null;
    }, 'sleep');
  }

  async getLatestWeight(): Promise<HealthData['weight'] | null> {
    return this.getIOSWeight();
  }

  async getTodaySteps(): Promise<HealthData['steps'] | null> {
    return this.getIOSSteps();
  }

  async getLastSleep(): Promise<HealthData['sleep'] | null> {
    return this.getIOSSleep();
  }

  private async getIOSHydration(): Promise<HealthData['hydration'] | null> {
    return this.queryHealthKit(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const queryOptions = this.createQueryOptions(today, new Date());
      if (!queryOptions) {
        return null;
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierDietaryWater', queryOptions);

      if (samples && samples.length > 0) {
        // Apple Health retourne l'eau en litres, on convertit en millilitres
        const totalLiters = samples.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
        return {
          amount: Math.round(totalLiters * 1000), // Convertir litres en ml
          date: today.toISOString(),
        };
      }
      return null;
    }, 'hydration');
  }

  async getTodayHydration(): Promise<HealthData['hydration'] | null> {
    return this.getIOSHydration();
  }

  // ============================================
  // HEART RATE & HRV
  // ============================================

  private async getIOSHeartRate(): Promise<HealthData['heartRate'] | null> {
    return this.queryHealthKit(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const queryOptions = this.createQueryOptions(today, new Date(), {
        limit: 100, // Derniers 100 échantillons pour calculer moyenne/min/max
        ascending: false,
      });
      if (!queryOptions) {
        return null;
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', queryOptions);

      if (samples && samples.length > 0) {
        const values = samples.map((s: any) => s.quantity);
        const current = values[0]; // Plus récent
        const average = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Récupérer aussi le resting HR
        const restingQueryOptions = this.createQueryOptions(today, new Date(), {
          limit: 1,
          ascending: false,
        });
        if (!restingQueryOptions) {
          return null;
        }

        const restingSamples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierRestingHeartRate', restingQueryOptions);

        const resting = restingSamples && restingSamples.length > 0
          ? restingSamples[0].quantity
          : Math.round(min); // Fallback sur le min

        return {
          current: Math.round(current),
          average: Math.round(average),
          min: Math.round(min),
          max: Math.round(max),
          resting: Math.round(resting),
        };
      }
      return null;
    }, 'heartRate');
  }

  async getTodayHeartRate(): Promise<HealthData['heartRate'] | null> {
    return this.getIOSHeartRate();
  }

  private async getIOSHeartRateVariability(): Promise<HealthData['heartRateVariability'] | null> {
    return this.queryHealthKit(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const queryOptions = this.createQueryOptions(today, new Date(), {
        limit: 1,
        ascending: false,
      });
      if (!queryOptions) {
        return null;
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', queryOptions);

      if (samples && samples.length > 0) {
        return {
          value: Math.round(samples[0].quantity), // HRV en ms
          date: samples[0].startDate,
        };
      }
      return null;
    }, 'hrv');
  }

  async getTodayHRV(): Promise<HealthData['heartRateVariability'] | null> {
    return this.getIOSHeartRateVariability();
  }

  // ============================================
  // CALORIES & DISTANCE
  // ============================================

  private async getIOSCalories(): Promise<HealthData['calories'] | null> {
    return this.queryHealthKit(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const queryOptions = this.createQueryOptions(today, new Date());
      if (!queryOptions) {
        return null;
      }

      const [activeResult, basalResult] = await Promise.all([
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', queryOptions),
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBasalEnergyBurned', queryOptions),
      ]);

      const active = activeResult && activeResult.length > 0
        ? activeResult.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0)
        : 0;

      const basal = basalResult && basalResult.length > 0
        ? basalResult.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0)
        : 0;

      return {
        active: Math.round(active),
        basal: Math.round(basal),
        total: Math.round(active + basal),
      };
    }, 'calories');
  }

  async getTodayCalories(): Promise<HealthData['calories'] | null> {
    return this.getIOSCalories();
  }

  private async getIOSDistance(): Promise<HealthData['distance'] | null> {
    return this.queryHealthKit(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const queryOptions = this.createQueryOptions(today, new Date());
      if (!queryOptions) {
        return null;
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierDistanceWalkingRunning', queryOptions);

      if (samples && samples.length > 0) {
        const totalMeters = samples.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
        const totalKm = totalMeters / 1000;

        return {
          walking: Math.round(totalKm * 0.6 * 10) / 10, // Estimation 60% marche
          running: Math.round(totalKm * 0.4 * 10) / 10, // Estimation 40% course
          total: Math.round(totalKm * 10) / 10,
          unit: 'km',
        };
      }
      return null;
    }, 'distance');
  }

  async getTodayDistance(): Promise<HealthData['distance'] | null> {
    return this.getIOSDistance();
  }

  // ============================================
  // MÉTRIQUES AVANCÉES
  // ============================================

  private async getIOSVO2Max(): Promise<HealthData['vo2Max'] | null> {
    return this.queryHealthKit(async () => {
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const queryOptions = this.createQueryOptions(fromDate, new Date(), {
        limit: 1,
        ascending: false,
      });
      if (!queryOptions) {
        return null;
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierVO2Max', queryOptions);

      if (samples && samples.length > 0) {
        return {
          value: Math.round(samples[0].quantity * 10) / 10,
          date: samples[0].startDate,
        };
      }
      return null;
    }, 'vo2max');
  }

  async getVO2Max(): Promise<HealthData['vo2Max'] | null> {
    return this.getIOSVO2Max();
  }

  private async getIOSOxygenSaturation(): Promise<HealthData['oxygenSaturation'] | null> {
    return this.queryHealthKit(async () => {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const queryOptions = this.createQueryOptions(fromDate, new Date(), {
        limit: 1,
        ascending: false,
      });
      if (!queryOptions) {
        return null;
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierOxygenSaturation', queryOptions);

      if (samples && samples.length > 0) {
        // Apple Health retourne SpO2 en fraction (0.0-1.0), on convertit en %
        return {
          value: Math.round(samples[0].quantity * 100),
          date: samples[0].startDate,
        };
      }
      return null;
    }, 'oxygenSaturation');
  }

  async getOxygenSaturation(): Promise<HealthData['oxygenSaturation'] | null> {
    return this.getIOSOxygenSaturation();
  }

  private async getIOSRespiratoryRate(): Promise<HealthData['respiratoryRate'] | null> {
    return this.queryHealthKit(async () => {
      const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const queryOptions = this.createQueryOptions(fromDate, new Date(), {
        limit: 1,
        ascending: false,
      });
      if (!queryOptions) {
        return null;
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierRespiratoryRate', queryOptions);

      if (samples && samples.length > 0) {
        return {
          value: Math.round(samples[0].quantity),
          date: samples[0].startDate,
        };
      }
      return null;
    }, 'respiratoryRate');
  }

  async getRespiratoryRate(): Promise<HealthData['respiratoryRate'] | null> {
    return this.getIOSRespiratoryRate();
  }

  private async getIOSBodyTemperature(): Promise<HealthData['bodyTemperature'] | null> {
    return this.queryHealthKit(async () => {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const queryOptions = this.createQueryOptions(fromDate, new Date(), {
        limit: 1,
        ascending: false,
      });
      if (!queryOptions) {
        return null;
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyTemperature', queryOptions);

      if (samples && samples.length > 0) {
        // Apple Health stocke en Celsius
        return {
          value: Math.round(samples[0].quantity * 10) / 10,
          date: samples[0].startDate,
        };
      }
      return null;
    }, 'bodyTemperature');
  }

  async getBodyTemperature(): Promise<HealthData['bodyTemperature'] | null> {
    return this.getIOSBodyTemperature();
  }

  // ============================================
  // COMPOSITION CORPORELLE
  // ============================================

  private async getIOSBodyComposition(): Promise<HealthData['bodyComposition'] | null> {
    return this.queryHealthKit(async () => {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const queryOptions = this.createQueryOptions(fromDate, new Date(), {
        limit: 1,
        ascending: false,
      });
      if (!queryOptions) {
        return null;
      }

      const [fatSamples, leanSamples] = await Promise.all([
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyFatPercentage', queryOptions),
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierLeanBodyMass', queryOptions),
      ]);

      const bodyFatPercentage = fatSamples && fatSamples.length > 0
        ? Math.round(fatSamples[0].quantity * 100) // Converti en %
        : undefined;

      const leanBodyMass = leanSamples && leanSamples.length > 0
        ? Math.round(leanSamples[0].quantity * 10) / 10
        : undefined;

      if (bodyFatPercentage !== undefined || leanBodyMass !== undefined) {
        return {
          bodyFatPercentage,
          leanBodyMass,
          date: new Date().toISOString(),
        };
      }
      return null;
    }, 'bodyComposition');
  }

  async getBodyComposition(): Promise<HealthData['bodyComposition'] | null> {
    return this.getIOSBodyComposition();
  }

  // ============================================
  // WORKOUTS
  // ============================================

  private async getIOSWorkouts(): Promise<HealthData['workouts'] | null> {
    return this.queryHealthKit(async () => {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const samples = await HealthKit.queryWorkoutSamples({
        from: fromDate.getTime(),
        to: new Date().getTime(),
        limit: 20,
        ascending: false,
      });

      if (samples && samples.length > 0) {
        return samples.map((workout: any) => {
          // Generer un ID deterministe base sur les donnees du workout pour eviter les doublons
          const workoutFingerprint = `${workout.startDate}_${workout.endDate}_${workout.workoutActivityType || 'unknown'}`;
          const deterministicId = workout.uuid || workout.id || `workout_${Buffer.from(workoutFingerprint).toString('base64').slice(0, 16)}`;

          return {
            id: deterministicId,
            activityType: workout.workoutActivityType || 'Unknown',
            startDate: workout.startDate,
            endDate: workout.endDate,
            duration: Math.round((new Date(workout.endDate).getTime() - new Date(workout.startDate).getTime()) / 60000),
            distance: workout.totalDistance ? Math.round(workout.totalDistance / 1000 * 10) / 10 : undefined,
            calories: workout.totalEnergyBurned ? Math.round(workout.totalEnergyBurned) : undefined,
            averageHeartRate: workout.averageHeartRate ? Math.round(workout.averageHeartRate) : undefined,
            maxHeartRate: workout.maxHeartRate ? Math.round(workout.maxHeartRate) : undefined,
          };
        });
      }
      return null;
    }, 'workouts');
  }

  async getWorkouts(): Promise<HealthData['workouts'] | null> {
    return this.getIOSWorkouts();
  }

  // ============================================
  // HISTORICAL DATA (TRENDS)
  // ============================================

  async getHRVHistory(days: number = 7): Promise<Array<{ date: string; value: number }>> {
    if (DEMO_MODE && __DEV__) return DemoData.getDemoHRVHistory(days);

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        ascending: true,
      });

      if (samples && samples.length > 0) {
        // Grouper par jour et prendre la moyenne
        const groupedByDay: { [key: string]: number[] } = {};

        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!groupedByDay[date]) {
            groupedByDay[date] = [];
          }
          groupedByDay[date].push(s.quantity);
        });

        return Object.keys(groupedByDay).map(date => ({
          date,
          value: Math.round(groupedByDay[date].reduce((a, b) => a + b, 0) / groupedByDay[date].length),
        })).sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('Erreur lecture historique HRV:', error);
    }
    return [];
  }

  async getRestingHRHistory(days: number = 7): Promise<Array<{ date: string; value: number }>> {
    if (DEMO_MODE && __DEV__) return DemoData.getDemoRestingHRHistory(days);

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierRestingHeartRate', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        ascending: true,
      });

      if (samples && samples.length > 0) {
        // Grouper par jour
        const groupedByDay: { [key: string]: number[] } = {};

        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!groupedByDay[date]) {
            groupedByDay[date] = [];
          }
          groupedByDay[date].push(s.quantity);
        });

        return Object.keys(groupedByDay).map(date => ({
          date,
          value: Math.round(groupedByDay[date].reduce((a, b) => a + b, 0) / groupedByDay[date].length),
        })).sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('Erreur lecture historique Resting HR:', error);
    }
    return [];
  }

  async getHeartRateHistory(days: number = 7): Promise<Array<{ date: string; value: number }>> {
    if (DEMO_MODE && __DEV__) return DemoData.getDemoHeartRateHistory(days);

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        ascending: true,
      });

      if (samples && samples.length > 0) {
        // Grouper par jour et calculer la moyenne
        const groupedByDay: { [key: string]: number[] } = {};

        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!groupedByDay[date]) {
            groupedByDay[date] = [];
          }
          groupedByDay[date].push(s.quantity);
        });

        return Object.keys(groupedByDay).map(date => ({
          date,
          value: Math.round(groupedByDay[date].reduce((a, b) => a + b, 0) / groupedByDay[date].length),
        })).sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('Erreur lecture historique Heart Rate:', error);
    }
    return [];
  }

  async getOxygenSaturationHistory(days: number = 7): Promise<Array<{ date: string; value: number }>> {
    if (DEMO_MODE && __DEV__) return DemoData.getDemoOxygenSaturationHistory(days);

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierOxygenSaturation', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        ascending: true,
      });

      if (samples && samples.length > 0) {
        // Grouper par jour et calculer la moyenne
        const groupedByDay: { [key: string]: number[] } = {};

        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!groupedByDay[date]) {
            groupedByDay[date] = [];
          }
          // SpO2 est en fraction (0-1), convertir en pourcentage
          groupedByDay[date].push(s.quantity * 100);
        });

        return Object.keys(groupedByDay).map(date => ({
          date,
          value: Math.round(groupedByDay[date].reduce((a, b) => a + b, 0) / groupedByDay[date].length),
        })).sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('Erreur lecture historique SpO2:', error);
    }
    return [];
  }

  async getBodyTemperatureHistory(days: number = 7): Promise<Array<{ date: string; value: number }>> {
    if (DEMO_MODE && __DEV__) return DemoData.getDemoBodyTemperatureHistory(days);

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyTemperature', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        ascending: true,
      });

      if (samples && samples.length > 0) {
        // Grouper par jour et calculer la moyenne
        const groupedByDay: { [key: string]: number[] } = {};

        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!groupedByDay[date]) {
            groupedByDay[date] = [];
          }
          groupedByDay[date].push(s.quantity);
        });

        return Object.keys(groupedByDay).map(date => ({
          date,
          value: parseFloat((groupedByDay[date].reduce((a, b) => a + b, 0) / groupedByDay[date].length).toFixed(1)),
        })).sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('Erreur lecture historique température:', error);
    }
    return [];
  }

  async getWeightHistory(days: number = 30): Promise<Array<{ date: string; value: number }>> {
    if (DEMO_MODE && __DEV__) return DemoData.getDemoWeightHistory(days);

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        ascending: true,
      });

      if (samples && samples.length > 0) {
        return samples.map((s: any) => ({
          date: new Date(s.startDate).toISOString().split('T')[0],
          value: Math.round(s.quantity * 10) / 10,
        }));
      }
    } catch (error) {
      logger.error('Erreur lecture historique poids:', error);
    }
    return [];
  }

  async getSleepHistory(days: number = 7): Promise<Array<{
    date: string;
    deep: number;
    rem: number;
    core: number;
    awake: number;
    total: number;
    duration?: number;
  }>> {
    if (DEMO_MODE && __DEV__) return DemoData.getDemoSleepHistory(days);

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        limit: 500,
      });

      if (samples && samples.length > 0) {
        // Grouper par date - prendre les données brutes d'Apple Santé
        const sleepByDate: { [key: string]: { deep: number; rem: number; core: number; awake: number; total: number } } = {};

        samples.forEach((s: any) => {
          const date = new Date(s.endDate).toISOString().split('T')[0];
          const duration = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
          if (duration <= 0) return;

          if (!sleepByDate[date]) {
            sleepByDate[date] = { deep: 0, rem: 0, core: 0, awake: 0, total: 0 };
          }

          switch (s.value) {
            case 1: sleepByDate[date].total += duration; break;
            case 2: sleepByDate[date].awake += duration; break;
            case 3: sleepByDate[date].core += duration; sleepByDate[date].total += duration; break;
            case 4: sleepByDate[date].deep += duration; sleepByDate[date].total += duration; break;
            case 5: sleepByDate[date].rem += duration; sleepByDate[date].total += duration; break;
          }
        });

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
      logger.error('Erreur lecture historique sommeil:', error);
    }
    return [];
  }

  async getCaloriesHistory(days: number = 7): Promise<Array<{
    date: string;
    active: number;
    basal: number;
    total: number;
  }>> {
    if (DEMO_MODE && __DEV__) return DemoData.getDemoCaloriesHistory(days);

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const [activeSamples, basalSamples] = await Promise.all([
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
          from: fromDate.getTime(),
          to: new Date().getTime(),
        }),
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBasalEnergyBurned', {
          from: fromDate.getTime(),
          to: new Date().getTime(),
        }),
      ]);

      // Grouper par date
      const caloriesByDate: { [key: string]: { active: number; basal: number }} = {};

      activeSamples?.forEach((s: any) => {
        const date = new Date(s.startDate).toISOString().split('T')[0];
        if (!caloriesByDate[date]) {
          caloriesByDate[date] = { active: 0, basal: 0 };
        }
        caloriesByDate[date].active += s.quantity;
      });

      basalSamples?.forEach((s: any) => {
        const date = new Date(s.startDate).toISOString().split('T')[0];
        if (!caloriesByDate[date]) {
          caloriesByDate[date] = { active: 0, basal: 0 };
        }
        caloriesByDate[date].basal += s.quantity;
      });

      return Object.keys(caloriesByDate).map(date => ({
        date,
        active: Math.round(caloriesByDate[date].active),
        basal: Math.round(caloriesByDate[date].basal),
        total: Math.round(caloriesByDate[date].active + caloriesByDate[date].basal),
      })).sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      logger.error('Erreur lecture historique calories:', error);
    }
    return [];
  }

  async getVO2MaxHistory(days: number = 30): Promise<Array<{ date: string; value: number }>> {
    if (DEMO_MODE && __DEV__) return DemoData.getDemoVO2MaxHistory(days);

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierVO2Max', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        ascending: true,
      });

      if (samples && samples.length > 0) {
        return samples.map((s: any) => ({
          date: new Date(s.startDate).toISOString().split('T')[0],
          value: Math.round(s.quantity * 10) / 10,
        }));
      }
    } catch (error) {
      logger.error('Erreur lecture historique VO2 Max:', error);
    }
    return [];
  }

  async getStepsHistory(days: number = 7): Promise<Array<{ date: string; value: number }>> {
    if (DEMO_MODE && __DEV__) return DemoData.getDemoStepsHistory(days);

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
      });

      if (samples && samples.length > 0) {
        // Grouper par jour - prendre les données brutes d'Apple Santé
        const stepsByDate: { [key: string]: number } = {};

        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!stepsByDate[date]) stepsByDate[date] = 0;
          stepsByDate[date] += s.quantity || 0;
        });

        return Object.keys(stepsByDate)
          .filter(date => stepsByDate[date] > 0)
          .map(date => ({ date, value: Math.round(stepsByDate[date]) }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('Erreur lecture historique pas:', error);
    }
    return [];
  }

  async getAllHealthData(): Promise<HealthData> {
    // Mode démo : UNIQUEMENT si explicitement activé en dev
    if (DEMO_MODE && __DEV__) {
      const demoData = DemoData.getDemoHealthData();
      // Calculer les totaux
      if (demoData.calories) {
        demoData.calories.total = demoData.calories.active + demoData.calories.basal;
      }
      if (demoData.distance) {
        demoData.distance.total = demoData.distance.walking + demoData.distance.running;
      }
      return demoData;
    }

    try {
      // Vérifier si le module est disponible avant de lancer les requêtes
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

      // Lancer toutes les requêtes en parallèle avec allSettled pour ne pas bloquer si une échoue
      const results = await Promise.allSettled([
        this.getLatestWeight(),
        this.getTodaySteps(),
        this.getLastSleep(),
        this.getTodayHydration(),
        this.getTodayHeartRate(),
        this.getTodayHRV(),
        this.getTodayCalories(),
        this.getTodayDistance(),
        this.getVO2Max(),
        this.getOxygenSaturation(),
        this.getRespiratoryRate(),
        this.getBodyTemperature(),
        this.getBodyComposition(),
        this.getWorkouts(),
      ]);

      // Extraire les valeurs avec typage explicite
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

      // Logger les échecs pour debugging (sans crasher)
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          const dataTypes = ['weight', 'steps', 'sleep', 'hydration', 'heartRate', 'hrv',
                           'calories', 'distance', 'vo2max', 'oxygenSat', 'respRate',
                           'temperature', 'bodyComp', 'workouts'];
          logger.warn(`[HealthConnect] Failed to fetch ${dataTypes[i]}:`, r.reason);
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
      // Erreur critique lors de getAllHealthData - ne devrait jamais arriver avec allSettled
      logger.error('[HealthConnect] Critical error in getAllHealthData:', error);
      // Retourner structure vide plutôt que crasher
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

  async writeWeight(weight: number, unit: 'kg' | 'lbs' = 'kg'): Promise<boolean> {

    const weightInKg = unit === 'lbs' ? weight * 0.453592 : weight;

    try {
      await HealthKit.saveQuantitySample('HKQuantityTypeIdentifierBodyMass', weightInKg, {
        start: new Date(),
        end: new Date(),
      });
      return true;
    } catch (error) {
      logger.error('Erreur écriture poids:', error);
      return false;
    }
  }

  async writeHydration(amountMl: number): Promise<boolean> {

    // Apple Health attend des litres, on convertit
    const amountLiters = amountMl / 1000;

    try {
      await HealthKit.saveQuantitySample('HKQuantityTypeIdentifierDietaryWater', amountLiters, {
        start: new Date(),
        end: new Date(),
      });
      return true;
    } catch (error) {
      logger.error('Erreur écriture hydratation:', error);
      return false;
    }
  }

  async writeBodyFat(percentage: number): Promise<boolean> {
    try {
      // Apple Health attend un ratio (0-1), on convertit depuis le pourcentage
      const ratio = percentage / 100;

      await HealthKit.saveQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', ratio, {
        start: new Date(),
        end: new Date(),
      });
      return true;
    } catch (error) {
      logger.error('Erreur écriture body fat:', error);
      return false;
    }
  }

  async writeWorkout(workout: {
    activityType: string;
    startDate: Date;
    endDate: Date;
    distance?: number; // en km
    calories?: number; // en kcal
  }): Promise<boolean> {

    try {
      // Mapper les types d'activités Yoroi vers HealthKit Enum (WorkoutActivityType)
      const activityTypeMap: { [key: string]: any } = {
        'Running': WorkoutActivityType.running,
        'Course': WorkoutActivityType.running,
        'Trail': WorkoutActivityType.running,
        'Cycling': WorkoutActivityType.cycling,
        'Vélo': WorkoutActivityType.cycling,
        'Swimming': WorkoutActivityType.swimming,
        'Natation': WorkoutActivityType.swimming,
        'Musculation': WorkoutActivityType.traditionalStrengthTraining,
        'CrossFit': WorkoutActivityType.crossTraining,
        'Yoga': WorkoutActivityType.yoga,
        'Boxing': WorkoutActivityType.boxing,
        'Boxe': WorkoutActivityType.boxing,
        'MMA': WorkoutActivityType.mixedCardio, // MixedMetabolicCardioTraining maps to mixedCardio or mixedMetabolicCardioTraining (30)
        'JJB': WorkoutActivityType.martialArts,
        'Judo': WorkoutActivityType.martialArts,
        'Karate': WorkoutActivityType.martialArts,
        'Karaté': WorkoutActivityType.martialArts,
        'Muay Thai': WorkoutActivityType.kickboxing,
      };

      // Fallback sur 'Other' (3000) si non trouvé
      const hkActivityType = activityTypeMap[workout.activityType] || WorkoutActivityType.other;

      // Nouvelle signature: saveWorkoutSample(type, quantities, start, end, totals, metadata)
      // quantities: [] car on sauvegarde juste le résumé
      // totals: { distance (meters), energyBurned (kcal) }
      
      const totals: { distance?: number; energyBurned?: number } = {};
      
      if (workout.distance) {
        totals.distance = workout.distance * 1000; // Convertir km -> mètres
      }
      
      if (workout.calories) {
        totals.energyBurned = workout.calories;
      }

      try {
          await HealthKit.saveWorkoutSample(
            hkActivityType,
            [], // Empty quantities samples
            new Date(workout.startDate),
            new Date(workout.endDate),
            totals,
            {} // Metadata
          );
      } catch (saveError: any) {
          // Si l'erreur est "Authorization is not determined" (Code 5), on tente de redemander la permission
          if (saveError?.message?.includes('Authorization is not determined') || saveError?.code === 5 || saveError?.message?.includes('Code=5')) {
              logger.warn('Permission inconnue pour Workout, tentative de demande...');
              await HealthKit.requestAuthorization({
                  toRead: ['HKWorkoutTypeIdentifier'],
                  toShare: ['HKWorkoutTypeIdentifier']
              });
              
              // On réessaie une fois
              await HealthKit.saveWorkoutSample(
                hkActivityType,
                [], 
                new Date(workout.startDate),
                new Date(workout.endDate),
                totals,
                {} 
              );
          } else {
              throw saveError;
          }
      }

      logger.info('Workout enregistré dans Apple Health:', workout.activityType);
      return true;
    } catch (error) {
      logger.error('Erreur écriture workout:', error);
      return false;
    }
  }

  async syncAll(): Promise<HealthData | null> {
    if (!this.syncStatus.isConnected) {
      return null;
    }

    try {
      logger.info('Synchronisation iOS en cours...');
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
      if (data.hydration) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_HYDRATION, JSON.stringify(data.hydration));
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

  getSyncStatus(): SyncStatus {
    if (DEMO_MODE && __DEV__) {
      return {
        ...this.syncStatus,
        isConnected: true,
        lastSync: new Date().toISOString(),
      };
    }
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
   * Nettoyer toutes les données en cache
   * Utile quand l'utilisateur se déconnecte ou pour résoudre des problèmes
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.LAST_STEPS,
        STORAGE_KEYS.LAST_SLEEP,
        STORAGE_KEYS.LAST_WEIGHT,
        STORAGE_KEYS.LAST_HYDRATION,
      ]);
      logger.info('Cache santé nettoyé');
    } catch (error) {
      logger.error('Erreur nettoyage cache:', error);
    }
  }

  /**
   * Réinitialiser complètement la connexion et le cache
   */
  async disconnect(): Promise<void> {
    try {
      await this.clearCache();
      await AsyncStorage.removeItem(STORAGE_KEYS.SYNC_STATUS);
      this.syncStatus = {
        lastSync: null,
        isConnected: false,
        provider: 'apple_health',
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
      this.isInitialized = false;
      logger.info('Déconnexion Apple Health complète');
    } catch (error) {
      logger.error('Erreur déconnexion:', error);
    }
  }
}

export const healthConnect = new HealthConnectService();

export const getProviderIcon = (): string => '';

export const getConnectionInstructions = (): string[] => [
  "1. YOROI va demander l'accès à Apple Santé",
  "2. Autorise l'accès au poids, aux pas, au sommeil et à l'hydratation",
  "3. Tes données seront synchronisées automatiquement",
];

export default healthConnect;
