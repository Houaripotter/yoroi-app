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
  failureReason?: 'USER_DENIED' | 'MODULE_NOT_LOADED' | 'DEVICE_NOT_SUPPORTED' | 'UNKNOWN';
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

// ============================================
// APPLE HEALTHKIT ERROR CODES REFERENCE
// ============================================
// HKError codes from Apple documentation (HKError.h):
//
// Code 0 = errorNoError (no error)
// Code 1 = errorHealthDataUnavailable (Health data not available on device)
// Code 2 = errorHealthDataRestricted (Health data restricted by parental controls)
// Code 3 = errorInvalidArgument (invalid argument passed to API)
// Code 4 = errorAuthorizationNotDetermined (user hasn't responded to permission request)
// Code 5 = errorAuthorizationDenied (user denied permission)
// Code 6 = errorDatabaseInaccessible (Health app locked or database unavailable)
// Code 7 = errorUserCanceled (user canceled the operation)
// Code 8 = errorAnotherWorkoutSessionStarted (another workout session was started)
// Code 9 = errorUserExitedWorkoutSession (user exited workout session)
// Code 10 = errorRequiredAuthorizationDenied (required authorization was denied)
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

  /**
   * Check if the error is a HealthKit authorization/permission error
   * Handles both numeric error codes and string-based error messages
   *
   * HKError codes:
   * - Code 4 = errorAuthorizationNotDetermined
   * - Code 5 = errorAuthorizationDenied
   * - Code 6 = errorDatabaseInaccessible (Health app locked)
   */
  private isHealthKitAuthError(error: any): boolean {
    const message = error?.message || '';
    const code = error?.code;

    return (
      code === 4 ||
      code === 5 ||
      code === 6 ||
      message.includes('Authorization') ||
      message.includes('not authorized') ||
      message.includes('Code=4') ||
      message.includes('Code=5') ||
      message.includes('Code=6')
    );
  }

  /**
   * Check if the error indicates HealthKit/Health data is unavailable on this device
   *
   * HKError codes:
   * - Code 1 = errorHealthDataUnavailable
   * - Code 2 = errorHealthDataRestricted (parental controls)
   */
  private isHealthKitUnavailableError(error: any): boolean {
    const message = error?.message || '';
    const code = error?.code;

    return (
      code === 1 ||
      code === 2 ||
      message.includes('not available') ||
      message.includes('Health data unavailable') ||
      message.includes('Health data restricted') ||
      message.includes('Code=1') ||
      message.includes('Code=2')
    );
  }

  /**
   * Check if the error indicates an invalid argument was passed to HealthKit API
   *
   * HKError codes:
   * - Code 3 = errorInvalidArgument
   */
  private isHealthKitInvalidArgumentError(error: any): boolean {
    const message = error?.message || '';
    const code = error?.code;

    return (
      code === 3 ||
      message.includes('invalid argument') ||
      message.includes('Code=3')
    );
  }

  /**
   * Check if the error is a user cancellation error
   *
   * HKError codes:
   * - Code 7 = errorUserCanceled
   */
  private isHealthKitUserCanceledError(error: any): boolean {
    const message = error?.message || '';
    const code = error?.code;

    return (
      code === 7 ||
      message.includes('user cancel') ||
      message.includes('Code=7')
    );
  }

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
      // ✅ VÉRIFIER QUE LE MODULE HEALTHKIT EST CHARGÉ
      if (!HealthKit) {
        logger.error('[HealthKit] Module not loaded - cannot request permissions');
        throw new Error('HealthKit module not available');
      }

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

      // ✅ TESTER VRAIMENT LES PERMISSIONS EN FAISANT DES LECTURES
      logger.info('[HealthKit] Testing permissions by attempting reads...');

      const permissions: HealthPermissions = {
        weight: await this.testPermission('HKQuantityTypeIdentifierBodyMass'),
        steps: await this.testPermission('HKQuantityTypeIdentifierStepCount'),
        sleep: await this.testPermissionCategory('HKCategoryTypeIdentifierSleepAnalysis'),
        hydration: await this.testPermission('HKQuantityTypeIdentifierDietaryWater'),
        heartRate: await this.testPermission('HKQuantityTypeIdentifierHeartRate'),
        heartRateVariability: await this.testPermission('HKQuantityTypeIdentifierHeartRateVariabilitySDNN'),
        restingHeartRate: await this.testPermission('HKQuantityTypeIdentifierRestingHeartRate'),
        calories: await this.testPermission('HKQuantityTypeIdentifierActiveEnergyBurned'),
        distance: await this.testPermission('HKQuantityTypeIdentifierDistanceWalkingRunning'),
        vo2Max: await this.testPermission('HKQuantityTypeIdentifierVO2Max'),
        oxygenSaturation: await this.testPermission('HKQuantityTypeIdentifierOxygenSaturation'),
        respiratoryRate: await this.testPermission('HKQuantityTypeIdentifierRespiratoryRate'),
        bodyTemperature: await this.testPermission('HKQuantityTypeIdentifierBodyTemperature'),
        bodyComposition: await this.testPermission('HKQuantityTypeIdentifierBodyFatPercentage'),
        workouts: false, // Workout read permission is tested separately
      };

      logger.info('[HealthKit] Permission test results:', permissions);
      return permissions;
    } catch (error) {
      logger.error('Erreur demande permissions iOS:', error);
      return this.syncStatus.permissions;
    }
  }

  /**
   * Tester si une permission est accordée en tentant une lecture
   */
  private async testPermission(identifier: string): Promise<boolean> {
    if (!HealthKit) return false;

    try {
      await HealthKit.queryQuantitySamples(identifier, {
        from: new Date().getTime(),
        to: new Date().getTime(),
        limit: 1
      });
      return true; // Si pas d'erreur = permission OK
    } catch (error: any) {
      // Erreur de permission = refusée (Code 4, 5, or 6)
      if (this.isHealthKitAuthError(error)) {
        return false;
      }
      // Erreur de disponibilité (Code 1 or 2) = données non disponibles sur cet appareil
      if (this.isHealthKitUnavailableError(error)) {
        return false;
      }
      // Autres erreurs (pas de données, etc.) = permission OK
      return true;
    }
  }

  /**
   * Tester permission pour catégories (sommeil)
   */
  private async testPermissionCategory(identifier: string): Promise<boolean> {
    if (!HealthKit) return false;

    try {
      await HealthKit.queryCategorySamples(identifier, {
        from: new Date().getTime(),
        to: new Date().getTime(),
        limit: 1
      });
      return true;
    } catch (error: any) {
      // Erreur de permission = refusée (Code 4, 5, or 6)
      if (this.isHealthKitAuthError(error)) {
        return false;
      }
      // Erreur de disponibilité (Code 1 or 2) = données non disponibles sur cet appareil
      if (this.isHealthKitUnavailableError(error)) {
        return false;
      }
      return true;
    }
  }

  async connect(): Promise<boolean> {
    // Mode démo : simuler une connexion réussie
    if (DEMO_MODE && __DEV__) {
      this.syncStatus.isConnected = true;
      this.syncStatus.lastSync = new Date().toISOString();
      delete this.syncStatus.failureReason;
      await this.saveSyncStatus();
      return true;
    }

    try {
      const available = await this.isAvailable();
      if (!available) {
        logger.warn('[HealthConnect] Apple Health non disponible sur cet appareil');
        // ✅ DÉFINIR LA RAISON DE L'ÉCHEC
        this.syncStatus.isConnected = false;
        this.syncStatus.failureReason = 'DEVICE_NOT_SUPPORTED';
        await this.saveSyncStatus();
        return false;
      }

      // Demander les permissions (ouvre le popup iOS)
      await this.requestIOSPermissions();

      // CRITIQUE: Vérifier que les permissions ont vraiment été accordées
      logger.info('[HealthConnect] Vérification des permissions réelles...');
      const hasPermissions = await this.verifyPermissions();

      if (!hasPermissions) {
        logger.warn('[HealthConnect] Utilisateur a refusé les permissions');
        // ✅ DÉFINIR LA RAISON DE L'ÉCHEC
        this.syncStatus.isConnected = false;
        this.syncStatus.failureReason = 'USER_DENIED';
        await this.saveSyncStatus();
        return false;
      }

      // Tester une lecture réelle pour s'assurer que tout fonctionne
      logger.info('[HealthConnect] Test de lecture HealthKit...');
      const testData = await this.getLatestWeight();

      logger.info('[HealthConnect] Test réussi, marquage comme connecté');

      this.syncStatus.isConnected = true;
      this.syncStatus.lastSync = new Date().toISOString();
      delete this.syncStatus.failureReason; // ✅ SUPPRIMER failureReason SI SUCCÈS

      // Marquer toutes les permissions comme disponibles (vérifiées)
      Object.keys(this.syncStatus.permissions).forEach(key => {
        this.syncStatus.permissions[key as keyof HealthPermissions] = true;
      });

      await this.saveSyncStatus();

      logger.info('[HealthConnect] Connexion HealthKit réussie');

      // Lancer une première synchronisation avec retry automatique
      logger.info('[HealthConnect] 🔄 Lancement de la synchronisation initiale...');
      await this.syncWithRetry();

      return true;
    } catch (error: any) {
      logger.error('[HealthConnect] Erreur lors de la connexion:', error);

      // ✅ DÉFINIR LA RAISON DE L'ÉCHEC EN FONCTION DE L'ERREUR
      this.syncStatus.isConnected = false;

      if (error?.message?.includes('HealthKit module not available')) {
        this.syncStatus.failureReason = 'MODULE_NOT_LOADED';
      } else {
        this.syncStatus.failureReason = 'UNKNOWN';
      }

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
   * HELPER: Crée des options de requête sécurisées avec validation des dates
   * @kingstinct/react-native-healthkit attend des objets Date, pas des timestamps
   */
  private createQueryOptions(fromDate: Date, toDate: Date, options: any = {}): any | null {
    // ✅ VALIDATION: S'assurer que les dates sont valides
    if (!fromDate || !toDate || !(fromDate instanceof Date) || !(toDate instanceof Date)) {
      logger.error('[HealthKit] Dates invalides pour la requête');
      return null;
    }

    const fromTimestamp = fromDate.getTime();
    const toTimestamp = toDate.getTime();

    if (isNaN(fromTimestamp) || isNaN(toTimestamp) || fromTimestamp === 0 || toTimestamp === 0) {
      logger.error('[HealthKit] Timestamps invalides pour la requête', {
        from: fromTimestamp,
        to: toTimestamp
      });
      return null;
    }

    // ✅ NETTOYAGE: Supprimer les propriétés undefined de options pour éviter les erreurs natives
    const cleanOptions: any = {};
    for (const key in options) {
      if (options[key] !== undefined && options[key] !== null) {
        cleanOptions[key] = options[key];
      }
    }

    // ✅ @kingstinct/react-native-healthkit attend des objets Date
    return {
      from: fromDate,
      to: toDate,
      ...cleanOptions
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
        // ✅ PROTECTION: Vérifier que HealthKit.queryQuantitySamples existe
        if (!HealthKit || typeof HealthKit.queryQuantitySamples !== 'function') {
          logger.info('[HealthKit] Module HealthKit non disponible sur ce device');
          return null;
        }

        // Revenir à queryQuantitySamples pour compatibilité max
        // Note: Sur simulateur sans données, cette requête peut échouer silencieusement
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
      // ✅ FIX: Regarder 48h en arrière au lieu de 24h pour capturer le sommeil de la nuit précédente
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      logger.info('[HealthKit] Requête sommeil: de', twoDaysAgo.toISOString(), 'à', now.toISOString());

      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        from: twoDaysAgo.getTime(),
        to: now.getTime(),
        limit: 500, // ✅ FIX: Augmenter la limite de 100 à 500
      });

      logger.info('[HealthKit] Échantillons sommeil bruts:', samples?.length || 0);

      if (samples && samples.length > 0) {
        // ✅ FIX: Filtrer les sources pour ne garder que les vraies données (Apple Watch, pas estimations iPhone)
        const filteredSamples = samples.filter((s: any) => {
          const source = s.sourceRevision?.source?.name || s.device?.name || '';
          const bundleId = s.sourceRevision?.source?.bundleIdentifier || '';

          // Accepter: Apple Watch, Santé (données manuelles), apps tierces de sommeil
          // Rejeter: com.apple.health.sleep-analysis-time (estimations automatiques iPhone)
          const isAutoEstimation = bundleId.includes('sleep-analysis-time') ||
                                   bundleId.includes('com.apple.health') && !source.toLowerCase().includes('watch');

          if (isAutoEstimation) {
            logger.info('[HealthKit] Ignoré estimation auto:', source, bundleId);
          }

          return !isAutoEstimation;
        });

        logger.info('[HealthKit] Échantillons sommeil filtrés (vrais):', filteredSamples.length);

        // Si pas de vraies données, essayer quand même avec toutes les données
        const samplesToUse = filteredSamples.length > 0 ? filteredSamples : samples;

        let totalMinutes = 0;
        let awakeMinutes = 0;
        let remMinutes = 0;
        let coreMinutes = 0;
        let deepMinutes = 0;
        let inBedMinutes = 0;

        // Trier les échantillons par date de début
        const sortedSamples = [...samplesToUse].sort((a: any, b: any) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );

        // ✅ FIX: Grouper par nuit (prendre la nuit la plus récente)
        const lastNightStart = new Date(now);
        lastNightStart.setHours(18, 0, 0, 0); // 18h hier = début de la "nuit"
        lastNightStart.setDate(lastNightStart.getDate() - 1);

        const lastNightSamples = sortedSamples.filter((s: any) => {
          const sampleStart = new Date(s.startDate).getTime();
          return sampleStart >= lastNightStart.getTime();
        });

        const finalSamples = lastNightSamples.length > 0 ? lastNightSamples : sortedSamples;

        if (finalSamples.length === 0) {
          logger.info('[HealthKit] Aucun échantillon de sommeil pour la nuit dernière');
          return null;
        }

        const startTime = finalSamples[0].startDate;
        const endTime = finalSamples[finalSamples.length - 1].endDate;

        finalSamples.forEach((s: any) => {
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

        logger.info('[HealthKit] Sommeil calculé:', {
          total: Math.round(totalMinutes),
          deep: Math.round(deepMinutes),
          rem: Math.round(remMinutes),
          core: Math.round(coreMinutes),
          awake: Math.round(awakeMinutes),
        });

        // ✅ FIX: Assouplir la limite minimum de 3h à 1h pour ne pas rater les siestes/nuits courtes
        // Limite de sécurité : une nuit entre 1h et 16h
        if (totalMinutes < 60 || totalMinutes > 960) {
          logger.info('[HealthKit] Sommeil rejeté (durée invalide):', totalMinutes, 'minutes');
          return null;
        }

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

      logger.info('[HealthKit] Aucune donnée de sommeil trouvée');
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

      // ✅ UTILISER Promise.allSettled POUR NE PAS BLOQUER SI 1 ÉCHOUE
      const results = await Promise.allSettled([
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', queryOptions),
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBasalEnergyBurned', queryOptions),
      ]);

      const activeResult = results[0].status === 'fulfilled' ? results[0].value : [];
      const basalResult = results[1].status === 'fulfilled' ? results[1].value : [];

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

      // ✅ UTILISER Promise.allSettled POUR NE PAS BLOQUER SI 1 ÉCHOUE
      const results = await Promise.allSettled([
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyFatPercentage', queryOptions),
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierLeanBodyMass', queryOptions),
      ]);

      const fatSamples = results[0].status === 'fulfilled' ? results[0].value : [];
      const leanSamples = results[1].status === 'fulfilled' ? results[1].value : [];

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

  /**
   * ✅ Hash simple compatible React Native (pas de Buffer)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 16);
  }

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
          // ✅ UTILISER simpleHash AU LIEU DE Buffer
          const deterministicId = workout.uuid || workout.id || `workout_${this.simpleHash(workoutFingerprint)}`;

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

    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch HRV history');
      return [];
    }

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

    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch resting HR history');
      return [];
    }

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

    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch heart rate history');
      return [];
    }

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

    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch SpO2 history');
      return [];
    }

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

    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch temperature history');
      return [];
    }

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

  async getWeightHistory(days: number = 30): Promise<Array<{ date: string; value: number; source?: string }>> {
    if (DEMO_MODE && __DEV__) return DemoData.getDemoWeightHistory(days);

    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch weight history');
      return [];
    }

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      logger.info('[HealthKit] getWeightHistory: Requête sur', days, 'jours, depuis', fromDate.toISOString());

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        ascending: true,
        limit: 1000, // ✅ FIX: Ajouter une limite explicite
      });

      logger.info('[HealthKit] getWeightHistory: Échantillons reçus:', samples?.length || 0);

      if (samples && samples.length > 0) {
        const result = samples.map((s: any) => ({
          date: new Date(s.startDate).toISOString().split('T')[0],
          value: Math.round(s.quantity * 10) / 10,
          source: s.sourceRevision?.source?.name || s.device?.name || 'Unknown',
        }));

        logger.info('[HealthKit] getWeightHistory: Poids trouvés:', result.length);
        return result;
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
    source?: string; // ✅ NOUVEAU: Ajouter la source pour debug
  }>> {
    if (DEMO_MODE && __DEV__) return DemoData.getDemoSleepHistory(days);

    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch sleep history');
      return [];
    }

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      logger.info('[HealthKit] getSleepHistory: Requête sur', days, 'jours, depuis', fromDate.toISOString());

      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        limit: 2000, // ✅ FIX: Augmenter de 500 à 2000
      });

      logger.info('[HealthKit] getSleepHistory: Échantillons bruts reçus:', samples?.length || 0);

      if (samples && samples.length > 0) {
        // ✅ FIX: Filtrer les estimations automatiques iPhone
        const filteredSamples = samples.filter((s: any) => {
          const source = s.sourceRevision?.source?.name || s.device?.name || '';
          const bundleId = s.sourceRevision?.source?.bundleIdentifier || '';

          // Rejeter les estimations automatiques d'Apple
          const isAutoEstimation = bundleId.includes('sleep-analysis-time') ||
                                   (bundleId.includes('com.apple.health') && !source.toLowerCase().includes('watch'));

          return !isAutoEstimation;
        });

        logger.info('[HealthKit] getSleepHistory: Échantillons après filtrage:', filteredSamples.length);

        // Utiliser les données filtrées si disponibles, sinon toutes les données
        const samplesToUse = filteredSamples.length > 0 ? filteredSamples : samples;

        // Grouper par date - prendre les données brutes d'Apple Santé
        const sleepByDate: { [key: string]: { deep: number; rem: number; core: number; awake: number; total: number; sources: Set<string> } } = {};

        samplesToUse.forEach((s: any) => {
          const date = new Date(s.endDate).toISOString().split('T')[0];
          const duration = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
          if (duration <= 0) return;

          if (!sleepByDate[date]) {
            sleepByDate[date] = { deep: 0, rem: 0, core: 0, awake: 0, total: 0, sources: new Set() };
          }

          // Tracker la source
          const source = s.sourceRevision?.source?.name || s.device?.name || 'Unknown';
          sleepByDate[date].sources.add(source);

          switch (s.value) {
            case 1: sleepByDate[date].total += duration; break;
            case 2: sleepByDate[date].awake += duration; break;
            case 3: sleepByDate[date].core += duration; sleepByDate[date].total += duration; break;
            case 4: sleepByDate[date].deep += duration; sleepByDate[date].total += duration; break;
            case 5: sleepByDate[date].rem += duration; sleepByDate[date].total += duration; break;
          }
        });

        const result = Object.keys(sleepByDate)
          .filter(date => sleepByDate[date].total > 0)
          .map(date => ({
            date,
            deep: Math.round(sleepByDate[date].deep),
            rem: Math.round(sleepByDate[date].rem),
            core: Math.round(sleepByDate[date].core),
            awake: Math.round(sleepByDate[date].awake),
            total: Math.round(sleepByDate[date].total),
            duration: Math.round(sleepByDate[date].total),
            source: Array.from(sleepByDate[date].sources).join(', '),
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        logger.info('[HealthKit] getSleepHistory: Résultat final:', result.length, 'jours de données');
        return result;
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

    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch calories history');
      return [];
    }

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      // ✅ UTILISER Promise.allSettled POUR NE PAS BLOQUER SI 1 ÉCHOUE
      const results = await Promise.allSettled([
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
          from: fromDate.getTime(),
          to: new Date().getTime(),
        }),
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBasalEnergyBurned', {
          from: fromDate.getTime(),
          to: new Date().getTime(),
        }),
      ]);

      const activeSamples = results[0].status === 'fulfilled' ? results[0].value : [];
      const basalSamples = results[1].status === 'fulfilled' ? results[1].value : [];

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

    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch VO2 Max history');
      return [];
    }

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

    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch steps history');
      return [];
    }

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

  /**
   * ✅ Wrapper pour ajouter un timeout aux promesses
   */
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), ms)
      )
    ]);
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

      // ✅ LANCER TOUTES LES REQUÊTES AVEC TIMEOUT DE 5S CHACUNE
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
    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.error('[HealthKit] Module not loaded - cannot write weight');
      throw new Error('HealthKit module not available');
    }

    const weightInKg = unit === 'lbs' ? weight * 0.453592 : weight;

    try {
      // ✅ CHECK FOR DUPLICATES: Prevent writing same weight twice on same day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingWeights = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
        from: today,
        to: tomorrow,
        limit: 10,
      });

      // Check if same weight (within 0.1kg tolerance) already exists today
      if (existingWeights && existingWeights.length > 0) {
        const alreadyExists = existingWeights.some(
          (sample: any) => Math.abs(sample.quantity - weightInKg) < 0.1
        );
        if (alreadyExists) {
          logger.info('[HealthKit] Weight already exists for today, skipping duplicate');
          return true; // Already saved, consider it success
        }
      }

      // Save the weight
      await HealthKit.saveQuantitySample('HKQuantityTypeIdentifierBodyMass', weightInKg, {
        start: new Date(),
        end: new Date(),
      });
      return true;
    } catch (error) {
      logger.error('Erreur écriture poids:', error);
      throw error; // ✅ THROW AU LIEU DE RETOURNER FALSE
    }
  }

  async writeHydration(amountMl: number): Promise<boolean> {
    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.error('[HealthKit] Module not loaded - cannot write hydration');
      throw new Error('HealthKit module not available');
    }

    // Apple Health attend des litres, on convertit
    const amountLiters = amountMl / 1000;

    try {
      await HealthKit.saveQuantitySamples('HKQuantityTypeIdentifierDietaryWater', amountLiters, {
        start: new Date(),
        end: new Date(),
      });
      return true;
    } catch (error) {
      logger.error('Erreur écriture hydratation:', error);
      throw error; // ✅ THROW AU LIEU DE RETOURNER FALSE
    }
  }

  async writeBodyFat(percentage: number): Promise<boolean> {
    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.error('[HealthKit] Module not loaded - cannot write body fat');
      throw new Error('HealthKit module not available');
    }

    try {
      // Apple Health attend un ratio (0-1), on convertit depuis le pourcentage
      const ratio = percentage / 100;

      // ✅ CHECK FOR DUPLICATES: Prevent writing same body fat twice on same day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingBodyFat = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyFatPercentage', {
        from: today,
        to: tomorrow,
        limit: 10,
      });

      // Check if same body fat (within 0.5% tolerance) already exists today
      if (existingBodyFat && existingBodyFat.length > 0) {
        const alreadyExists = existingBodyFat.some(
          (sample: any) => Math.abs(sample.quantity - ratio) < 0.005 // 0.5% tolerance
        );
        if (alreadyExists) {
          logger.info('[HealthKit] Body fat already exists for today, skipping duplicate');
          return true; // Already saved, consider it success
        }
      }

      // Save the body fat
      await HealthKit.saveQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', ratio, {
        start: new Date(),
        end: new Date(),
      });
      return true;
    } catch (error) {
      logger.error('Erreur écriture body fat:', error);
      throw error; // ✅ THROW AU LIEU DE RETOURNER FALSE
    }
  }

  async writeWorkout(workout: {
    activityType: string;
    startDate: Date;
    endDate: Date;
    distance?: number; // en km
    calories?: number; // en kcal
  }): Promise<boolean> {
    // ✅ VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.error('[HealthKit] Module not loaded - cannot write workout');
      throw new Error('HealthKit module not available');
    }

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
        'MMA': WorkoutActivityType.mixedCardio,
        'JJB': WorkoutActivityType.martialArts,
        'Judo': WorkoutActivityType.martialArts,
        'Karate': WorkoutActivityType.martialArts,
        'Karaté': WorkoutActivityType.martialArts,
        'Muay Thai': WorkoutActivityType.kickboxing,
      };

      // Fallback sur 'Other' si non trouvé
      const hkActivityType = activityTypeMap[workout.activityType] || WorkoutActivityType.other;

      const totals: { distance?: number; energyBurned?: number } = {};

      if (workout.distance) {
        totals.distance = workout.distance * 1000; // Convertir km -> mètres
      }

      if (workout.calories) {
        totals.energyBurned = workout.calories;
      }

      // ✅ SIMPLIFIER : UN SEUL NIVEAU DE TRY-CATCH
      try {
        await HealthKit.saveWorkoutSample(
          hkActivityType,
          [],
          new Date(workout.startDate),
          new Date(workout.endDate),
          totals,
          {}
        );

        logger.info('Workout enregistré dans Apple Health:', workout.activityType);
        return true;
      } catch (saveError: any) {
        // Si erreur de permission, créer une erreur typée pour que le caller puisse la détecter
        if (
          saveError?.message?.includes('Authorization is not determined') ||
          saveError?.code === 5 ||
          saveError?.message?.includes('Code=5') ||
          saveError?.message?.includes('not authorized')
        ) {
          // ✅ THROW UNE ERREUR SPÉCIALE AU LIEU DE REDEMANDER SILENCIEUSEMENT
          const permissionError = new Error('HEALTHKIT_PERMISSION_REQUIRED');
          (permissionError as any).originalError = saveError;
          (permissionError as any).dataType = 'workout';
          throw permissionError;
        }

        // Autres erreurs : remonter telles quelles
        throw saveError;
      }
    } catch (error: any) {
      logger.error('Erreur écriture workout:', error);

      // ✅ REMONTER L'ERREUR AU LIEU DE RETOURNER FALSE SILENCIEUSEMENT
      // Le caller pourra détecter le type d'erreur et afficher un message approprié
      throw error;
    }
  }

  /**
   * ✅ Synchronisation avec retry automatique (exponential backoff)
   */
  private async syncWithRetry(maxRetries = 3, delayMs = 1000): Promise<HealthData | null> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        logger.info(`[HealthConnect] Tentative de sync ${i + 1}/${maxRetries}`);
        return await this.syncAll();
      } catch (error) {
        logger.warn(`[HealthConnect] Sync failed (attempt ${i + 1}):`, error);

        if (i < maxRetries - 1) {
          // Attendre avant de réessayer (exponential backoff: 1s, 2s, 4s)
          const waitTime = delayMs * Math.pow(2, i);
          logger.info(`[HealthConnect] Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    logger.error('[HealthConnect] Sync failed after all retries');
    return null;
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
      throw error; // ✅ THROW AU LIEU DE RETOURNER NULL pour que syncWithRetry puisse détecter l'erreur
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
  /**
   * ✏️ Écrire des données de sommeil dans Apple Santé
   * Permet la saisie manuelle du sommeil
   */
  async writeSleepData(data: { startDate: Date; endDate: Date }): Promise<boolean> {
    try {
      if (!this.syncStatus.isConnected) {
        logger.error('[HealthKit] Not connected - cannot write sleep data');
        return false;
      }

      const { startDate, endDate } = data;

      // Validation
      if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
        logger.error('[HealthKit] Invalid dates for sleep data');
        return false;
      }

      if (endDate <= startDate) {
        logger.error('[HealthKit] End date must be after start date');
        return false;
      }

      const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      if (durationHours > 16) {
        logger.error('[HealthKit] Sleep duration too long (> 16h)');
        return false;
      }

      if (durationHours < 0.1) {
        logger.error('[HealthKit] Sleep duration too short (< 6min)');
        return false;
      }

      logger.info('[HealthKit] Writing sleep data:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        duration: `${durationHours.toFixed(2)}h`,
      });

      // Utiliser HealthKit pour écrire le sommeil
      // Note: @kingstinct/react-native-healthkit utilise saveCategorySample pour les données de catégorie comme le sommeil
      // La valeur 1 correspond à HKCategoryValueSleepAnalysisAsleep
      const result = await HealthKit.saveCategorySample('HKCategoryTypeIdentifierSleepAnalysis', 1, {
        start: startDate,
        end: endDate,
      });

      if (result) {
        logger.info('[HealthKit] ✅ Sleep data written successfully');
        return true;
      } else {
        logger.error('[HealthKit] ❌ Failed to write sleep data');
        return false;
      }
    } catch (error) {
      logger.error('[HealthKit] Error writing sleep data:', error);
      return false;
    }
  }

  /**
   * 🌙 Récupérer les détails complets du sommeil (phases, interruptions, qualité)
   * Retourne toutes les données disponibles dans Apple Santé
   */
  async getSleepDetails(fromDate: Date, toDate: Date): Promise<{
    totalDuration: number; // Durée totale en heures
    stages: {
      asleep: number; // Sommeil total (non spécifié)
      awake: number; // Éveillé
      core: number; // Sommeil léger
      deep: number; // Sommeil profond
      rem: number; // Sommeil paradoxal (REM)
      inBed: number; // Au lit (mais pas endormi)
    };
    interruptions: number; // Nombre de fois réveillé
    efficiency: number; // % de temps vraiment endormi (0-100)
    bedTime: string | null; // Heure de coucher (ISO string)
    wakeTime: string | null; // Heure de réveil (ISO string)
    source: string; // "iPhone" ou "Apple Watch"
  } | null> {
    try {
      if (!this.syncStatus.isConnected) {
        logger.error('[HealthKit] Not connected - cannot get sleep details');
        return null;
      }

      logger.info('[HealthKit] Fetching sleep details from', fromDate, 'to', toDate);

      // Récupérer tous les échantillons de sommeil en utilisant HealthKit (importé depuis le wrapper)
      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        from: fromDate,
        to: toDate,
        limit: 1000,
        ascending: false,
      });

      if (!samples || samples.length === 0) {
        logger.info('[HealthKit] No sleep data found');
        return null;
      }

      logger.info(`[HealthKit] Found ${samples.length} sleep samples`);

      // Initialiser les compteurs
      const stages = {
        asleep: 0,
        awake: 0,
        core: 0,
        deep: 0,
        rem: 0,
        inBed: 0,
      };

      let interruptions = 0;
      let bedTime: Date | null = null;
      let wakeTime: Date | null = null;
      let source = 'iPhone';

      // Analyser chaque échantillon
      for (const sample of samples) {
        const start = new Date(sample.startDate);
        const end = new Date(sample.endDate);
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);

        // Déterminer la source (Apple Watch vs iPhone)
        if (sample.sourceName && sample.sourceName.toLowerCase().includes('watch')) {
          source = 'Apple Watch';
        }

        // Première et dernière fois
        if (!bedTime || start < bedTime) bedTime = start;
        if (!wakeTime || end > wakeTime) wakeTime = end;

        // Compter par type de sommeil
        // Les valeurs possibles sont: 'inBed', 'asleep', 'awake', 'core', 'deep', 'rem'
        const value = sample.value;

        switch (value) {
          case 'inBed':
          case 'InBed':
            stages.inBed += durationMinutes;
            break;

          case 'asleep':
          case 'Asleep':
          case 'asleepUnspecified':
            stages.asleep += durationMinutes;
            break;

          case 'awake':
          case 'Awake':
            stages.awake += durationMinutes;
            interruptions++;
            break;

          case 'core':
          case 'Core':
          case 'asleepCore':
            stages.core += durationMinutes;
            break;

          case 'deep':
          case 'Deep':
          case 'asleepDeep':
            stages.deep += durationMinutes;
            break;

          case 'rem':
          case 'REM':
          case 'asleepREM':
            stages.rem += durationMinutes;
            break;

          default:
            logger.warn(`[HealthKit] Unknown sleep value: ${value}`);
            stages.asleep += durationMinutes;
        }
      }

      // Convertir minutes en heures
      const totalSleepMinutes = stages.asleep + stages.core + stages.deep + stages.rem;
      const totalInBedMinutes = stages.inBed > 0 ? stages.inBed : totalSleepMinutes + stages.awake;

      // Calculer l'efficacité (% de temps vraiment endormi)
      const efficiency = totalInBedMinutes > 0
        ? (totalSleepMinutes / totalInBedMinutes) * 100
        : 0;

      const result = {
        totalDuration: totalSleepMinutes / 60, // Convertir en heures
        stages: {
          asleep: stages.asleep / 60,
          awake: stages.awake / 60,
          core: stages.core / 60,
          deep: stages.deep / 60,
          rem: stages.rem / 60,
          inBed: stages.inBed / 60,
        },
        interruptions: Math.max(0, interruptions - 1), // -1 car le réveil final n'est pas une interruption
        efficiency: Math.round(efficiency),
        bedTime: bedTime ? bedTime.toISOString() : null,
        wakeTime: wakeTime ? wakeTime.toISOString() : null,
        source,
      };

      logger.info('[HealthKit] Sleep details:', result);

      return result;
    } catch (error) {
      logger.error('[HealthKit] Error getting sleep details:', error);
      return null;
    }
  }

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

  // ============================================
  // ✅ NOUVEAU: FONCTION DE DIAGNOSTIC COMPLÈTE
  // ============================================
  async runDiagnostic(): Promise<{
    healthKitAvailable: boolean;
    isConnected: boolean;
    permissions: any;
    recentData: {
      sleep: number;
      weight: number;
      steps: number;
      heartRate: number;
    };
    errors: string[];
    recommendations: string[];
  }> {
    const errors: string[] = [];
    const recommendations: string[] = [];

    logger.info('========================================');
    logger.info('[HealthKit] DÉMARRAGE DIAGNOSTIC COMPLET');
    logger.info('========================================');

    // 1. Vérifier si HealthKit est disponible
    const healthKitAvailable = await this.isAvailable();
    logger.info('[Diagnostic] HealthKit disponible:', healthKitAvailable);

    if (!healthKitAvailable) {
      errors.push('HealthKit non disponible sur cet appareil');
      recommendations.push('Vérifiez que vous êtes sur un appareil iOS physique (pas simulateur)');
    }

    // 2. Vérifier la connexion
    const isConnected = this.syncStatus.isConnected;
    logger.info('[Diagnostic] Connecté:', isConnected);

    if (!isConnected) {
      errors.push('Non connecté à Apple Health');
      recommendations.push('Allez dans Réglages > Confidentialité > Santé > Yoroi et activez toutes les permissions');
    }

    // 3. Tester les requêtes
    let sleepCount = 0;
    let weightCount = 0;
    let stepsCount = 0;
    let heartRateCount = 0;

    try {
      // Test sommeil (30 jours)
      const sleepHistory = await this.getSleepHistory(30);
      sleepCount = sleepHistory.length;
      logger.info('[Diagnostic] Sommeil trouvé:', sleepCount, 'jours');

      if (sleepCount === 0) {
        errors.push('Aucune donnée de sommeil trouvée sur 30 jours');
        recommendations.push('Portez votre Apple Watch la nuit pour enregistrer le sommeil');
        recommendations.push('Vérifiez que le Suivi du sommeil est activé sur votre Apple Watch');
      }
    } catch (e) {
      errors.push('Erreur lecture sommeil: ' + (e as Error).message);
    }

    try {
      // Test poids (90 jours)
      const weightHistory = await this.getWeightHistory(90);
      weightCount = weightHistory.length;
      logger.info('[Diagnostic] Poids trouvé:', weightCount, 'mesures');

      if (weightCount === 0) {
        errors.push('Aucune donnée de poids trouvée sur 90 jours');
        recommendations.push('Ajoutez votre poids manuellement dans Apple Santé ou utilisez une balance connectée');
      }
    } catch (e) {
      errors.push('Erreur lecture poids: ' + (e as Error).message);
    }

    try {
      // Test pas (aujourd'hui)
      const steps = await this.getTodaySteps();
      stepsCount = steps?.count || 0;
      logger.info('[Diagnostic] Pas aujourd\'hui:', stepsCount);
    } catch (e) {
      errors.push('Erreur lecture pas: ' + (e as Error).message);
    }

    try {
      // Test fréquence cardiaque
      const heartRate = await this.getTodayHeartRate();
      heartRateCount = heartRate?.average || 0;
      logger.info('[Diagnostic] FC moyenne:', heartRateCount);

      if (heartRateCount === 0) {
        recommendations.push('Portez votre Apple Watch pour enregistrer la fréquence cardiaque');
      }
    } catch (e) {
      errors.push('Erreur lecture FC: ' + (e as Error).message);
    }

    // Résumé
    logger.info('========================================');
    logger.info('[HealthKit] FIN DIAGNOSTIC');
    logger.info('Erreurs:', errors.length);
    logger.info('Recommandations:', recommendations.length);
    logger.info('========================================');

    return {
      healthKitAvailable,
      isConnected,
      permissions: this.syncStatus.permissions,
      recentData: {
        sleep: sleepCount,
        weight: weightCount,
        steps: stepsCount,
        heartRate: heartRateCount,
      },
      errors,
      recommendations,
    };
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
