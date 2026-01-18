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

    // Sur iOS, Apple Health est toujours disponible sur les appareils physiques
    return Platform.OS === 'ios' && HealthKit.isHealthDataAvailable();
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
    if (DEMO_MODE) {
      this.syncStatus.isConnected = true;
      this.syncStatus.lastSync = new Date().toISOString();
      await this.saveSyncStatus();
      return true;
    }

    try {
      const available = await this.isAvailable();
      if (!available) {
        logger.warn('Apple Health non disponible');
        return false;
      }

      // Demander les permissions (ouvre le popup iOS)
      await this.requestIOSPermissions();

      // IMPORTANT: Sur iOS, Apple ne confirme pas si les permissions sont accordées
      // pour des raisons de confidentialité. On marque comme "connecté" après la demande.
      // Si l'utilisateur n'a pas accordé les permissions, il devra les activer dans
      // Réglages iOS → Santé → YOROI

      this.syncStatus.isConnected = true;
      this.syncStatus.lastSync = new Date().toISOString();

      // Marquer toutes les permissions comme potentiellement disponibles
      // (Apple ne permet pas de vérifier le statut exact)
      Object.keys(this.syncStatus.permissions).forEach(key => {
        this.syncStatus.permissions[key as keyof HealthPermissions] = true;
      });

      await this.saveSyncStatus();

      logger.info('Connexion HealthKit réussie');

      // Lancer une première synchronisation automatiquement
      logger.info('🔄 Lancement de la synchronisation initiale...');
      await this.syncAll();

      return true;
    } catch (error) {
      logger.error('Erreur connexion:', error);
      return false;
    }
  }

  // Vérifier si on peut réellement lire des données
  private async verifyPermissions(): Promise<boolean> {

    try {
      // Essayer de lire les pas du jour
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
        from: today.getTime(),
        to: new Date().getTime(),
        limit: 1,
      });

      // Si on peut lire (même si vide), c'est que les permissions sont OK
      return true;
    } catch (error) {
      // Si erreur, c'est que les permissions ne sont pas accordées
      logger.info('Permissions Apple Health pas encore accordées');
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

  private async getIOSWeight(): Promise<HealthData['weight'] | null> {

    try {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        limit: 1,
        ascending: false,
      });

      if (samples && samples.length > 0) {
        const latest = samples[0];
        return {
          value: Math.round(latest.quantity * 10) / 10,
          unit: 'kg',
          date: new Date(latest.startDate).toISOString(),
        };
      }
    } catch (error) {
      logger.error('Erreur lecture poids iOS:', error);
    }
    return null;
  }

  private async getIOSSteps(): Promise<HealthData['steps'] | null> {
    // Limites de validation pour éviter les valeurs impossibles
    const MAX_STEPS_PER_DAY = 100000; // Maximum réaliste: 100k pas/jour (ultra-marathon)

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
        from: today.getTime(),
        to: new Date().getTime(),
        ascending: false,
        limit: 1000,
      });

      if (samples && samples.length > 0) {
        // Dédupliquer les échantillons par période temporelle pour éviter les doublons
        // (iPhone + Apple Watch peuvent rapporter les mêmes pas)
        const processedPeriods = new Set<string>();
        let totalSteps = 0;

        samples.forEach((s: any) => {
          // Créer une clé unique basée sur la période
          const periodKey = `${s.startDate}_${s.endDate}`;

          // Si on n'a pas déjà traité cette période
          if (!processedPeriods.has(periodKey)) {
            // Valider que la valeur est raisonnable pour un seul échantillon
            const sampleSteps = Math.min(s.quantity, MAX_STEPS_PER_DAY);
            if (sampleSteps > 0 && sampleSteps < MAX_STEPS_PER_DAY) {
              totalSteps += sampleSteps;
              processedPeriods.add(periodKey);
            }
          }
        });

        // Appliquer le cap final
        const validatedSteps = Math.min(totalSteps, MAX_STEPS_PER_DAY);

        return {
          count: Math.round(validatedSteps),
          date: today.toISOString(),
        };
      }
    } catch (error: any) {
      // Ne logger qu'une info pour les erreurs de permissions
      if (error?.message?.includes('Authorization') || error?.message?.includes('Code=5')) {
        logger.info('Permissions Apple Health pas encore accordées pour les pas');
      } else {
        logger.error('Erreur lecture pas iOS:', error);
      }
    }
    return null;
  }

  private async getIOSSleep(): Promise<HealthData['sleep'] | null> {
    // Limites de validation pour éviter les valeurs impossibles
    const MAX_SLEEP_MINUTES = 840; // Maximum: 14 heures (840 minutes) - très long mais possible
    const MAX_SAMPLE_DURATION = 720; // Un échantillon ne peut pas dépasser 12h

    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        from: yesterday.getTime(),
        to: new Date().getTime(),
        limit: 100, // Limiter pour eviter surcharge memoire
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

        // Utiliser un Set pour éviter les doublons de périodes
        const processedPeriods = new Set<string>();

        sortedSamples.forEach((s: any) => {
          // Créer une clé unique pour cette période
          const periodKey = `${s.startDate}_${s.endDate}_${s.value}`;

          // Éviter les doublons
          if (processedPeriods.has(periodKey)) {
            return;
          }
          processedPeriods.add(periodKey);

          const duration = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;

          // Ignorer les échantillons avec des durées impossibles
          if (duration <= 0 || duration > MAX_SAMPLE_DURATION) {
            return;
          }

          totalMinutes += duration;

          // Phases de sommeil (Apple Watch uniquement)
          // HKCategoryValueSleepAnalysis values:
          // 0 = InBed, 1 = Asleep, 2 = Awake
          // 3 = AsleepCore, 4 = AsleepDeep, 5 = AsleepREM
          switch (s.value) {
            case 0:
              inBedMinutes += duration;
              break;
            case 2:
              awakeMinutes += duration;
              break;
            case 3:
              coreMinutes += duration;
              break;
            case 4:
              deepMinutes += duration;
              break;
            case 5:
              remMinutes += duration;
              break;
          }
        });

        // Appliquer le cap maximum pour le total
        const validatedTotal = Math.min(totalMinutes, MAX_SLEEP_MINUTES);

        // Si le total est 0 ou invalide, ne pas retourner de données
        if (validatedTotal <= 0) {
          return null;
        }

        const result: HealthData['sleep'] = {
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          duration: Math.round(validatedTotal),
          quality: this.getSleepQuality(validatedTotal),
        };

        // Ajouter les phases si disponibles (Apple Watch)
        if (remMinutes > 0 || coreMinutes > 0 || deepMinutes > 0) {
          // Valider aussi les phases individuelles
          result.phases = {
            awake: Math.round(Math.min(awakeMinutes, MAX_SLEEP_MINUTES)),
            rem: Math.round(Math.min(remMinutes, MAX_SLEEP_MINUTES)),
            core: Math.round(Math.min(coreMinutes, MAX_SLEEP_MINUTES)),
            deep: Math.round(Math.min(deepMinutes, MAX_SLEEP_MINUTES)),
            inBed: Math.round(Math.min(inBedMinutes, MAX_SLEEP_MINUTES)),
          };
        }

        return result;
      }
    } catch (error: any) {
      // Ne logger qu'une info pour les erreurs de permissions
      if (error?.message?.includes('Authorization') || error?.message?.includes('Code=5') || error?.message?.includes('Value is undefined')) {
        logger.info('Permissions Apple Health pas encore accordées pour le sommeil');
      } else {
        logger.error('Erreur lecture sommeil iOS:', error);
      }
    }
    return null;
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

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierDietaryWater', {
        from: today.getTime(),
        to: new Date().getTime(),
      });

      if (samples && samples.length > 0) {
        // Apple Health retourne l'eau en litres, on convertit en millilitres
        const totalLiters = samples.reduce((sum: number, s: any) => sum + s.quantity, 0);
        return {
          amount: Math.round(totalLiters * 1000),
          date: today.toISOString(),
        };
      }
    } catch (error: any) {
      // Ne logger qu'une info pour les erreurs de permissions
      if (error?.message?.includes('Authorization') || error?.message?.includes('Code=5') || error?.message?.includes('Value is undefined')) {
        logger.info('Permissions Apple Health pas encore accordées pour l\'hydratation');
      } else {
        logger.error('Erreur lecture hydratation iOS:', error);
      }
    }
    return null;
  }

  async getTodayHydration(): Promise<HealthData['hydration'] | null> {
    return this.getIOSHydration();
  }

  // ============================================
  // HEART RATE & HRV
  // ============================================

  private async getIOSHeartRate(): Promise<HealthData['heartRate'] | null> {

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', {
        from: today.getTime(),
        to: new Date().getTime(),
        limit: 100, // Derniers 100 échantillons pour calculer moyenne/min/max
        ascending: false,
      });

      if (samples && samples.length > 0) {
        const values = samples.map((s: any) => s.quantity);
        const current = values[0]; // Plus récent
        const average = values.reduce((a: number, b: number) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        // Récupérer aussi le resting HR
        const restingSamples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierRestingHeartRate', {
          from: today.getTime(),
          to: new Date().getTime(),
          limit: 1,
          ascending: false,
        });

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
    } catch (error: any) {
      // Ne logger qu'une info pour les erreurs de permissions
      if (error?.message?.includes('Authorization') || error?.message?.includes('Code=5')) {
        logger.info('Permissions Apple Health pas encore accordées pour la fréquence cardiaque');
      } else {
        logger.error('Erreur lecture fréquence cardiaque iOS:', error);
      }
    }
    return null;
  }

  async getTodayHeartRate(): Promise<HealthData['heartRate'] | null> {
    return this.getIOSHeartRate();
  }

  private async getIOSHeartRateVariability(): Promise<HealthData['heartRateVariability'] | null> {

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', {
        from: today.getTime(),
        to: new Date().getTime(),
        limit: 1,
        ascending: false,
      });

      if (samples && samples.length > 0) {
        return {
          value: Math.round(samples[0].quantity), // HRV en ms
          date: samples[0].startDate,
        };
      }
    } catch (error: any) {
      // Ne logger qu'une info pour les erreurs de permissions
      if (error?.message?.includes('Authorization') || error?.message?.includes('Code=5')) {
        logger.info('Permissions Apple Health pas encore accordées pour HRV');
      } else {
        logger.error('Erreur lecture HRV iOS:', error);
      }
    }
    return null;
  }

  async getTodayHRV(): Promise<HealthData['heartRateVariability'] | null> {
    return this.getIOSHeartRateVariability();
  }

  // ============================================
  // CALORIES & DISTANCE
  // ============================================

  private async getIOSCalories(): Promise<HealthData['calories'] | null> {

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [activeSamples, basalSamples] = await Promise.all([
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', {
          from: today.getTime(),
          to: new Date().getTime(),
        }),
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBasalEnergyBurned', {
          from: today.getTime(),
          to: new Date().getTime(),
        }),
      ]);

      const active = activeSamples && activeSamples.length > 0
        ? activeSamples.reduce((sum: number, s: any) => sum + s.quantity, 0)
        : 0;

      const basal = basalSamples && basalSamples.length > 0
        ? basalSamples.reduce((sum: number, s: any) => sum + s.quantity, 0)
        : 0;

      return {
        active: Math.round(active),
        basal: Math.round(basal),
        total: Math.round(active + basal),
      };
    } catch (error) {
      logger.error('Erreur lecture calories iOS:', error);
    }
    return null;
  }

  async getTodayCalories(): Promise<HealthData['calories'] | null> {
    return this.getIOSCalories();
  }

  private async getIOSDistance(): Promise<HealthData['distance'] | null> {

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Distance marche + course (en mètres)
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierDistanceWalkingRunning', {
        from: today.getTime(),
        to: new Date().getTime(),
      });

      if (samples && samples.length > 0) {
        const totalMeters = samples.reduce((sum: number, s: any) => sum + s.quantity, 0);
        const totalKm = totalMeters / 1000;

        return {
          walking: Math.round(totalKm * 0.6 * 10) / 10, // Estimation 60% marche
          running: Math.round(totalKm * 0.4 * 10) / 10, // Estimation 40% course
          total: Math.round(totalKm * 10) / 10,
          unit: 'km',
        };
      }
    } catch (error) {
      logger.error('Erreur lecture distance iOS:', error);
    }
    return null;
  }

  async getTodayDistance(): Promise<HealthData['distance'] | null> {
    return this.getIOSDistance();
  }

  // ============================================
  // MÉTRIQUES AVANCÉES
  // ============================================

  private async getIOSVO2Max(): Promise<HealthData['vo2Max'] | null> {

    try {
      const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierVO2Max', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        limit: 1,
        ascending: false,
      });

      if (samples && samples.length > 0) {
        return {
          value: Math.round(samples[0].quantity * 10) / 10,
          date: samples[0].startDate,
        };
      }
    } catch (error) {
      logger.error('Erreur lecture VO2 Max iOS:', error);
    }
    return null;
  }

  async getVO2Max(): Promise<HealthData['vo2Max'] | null> {
    return this.getIOSVO2Max();
  }

  private async getIOSOxygenSaturation(): Promise<HealthData['oxygenSaturation'] | null> {

    try {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierOxygenSaturation', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        limit: 1,
        ascending: false,
      });

      if (samples && samples.length > 0) {
        // Apple Health retourne SpO2 en fraction (0.0-1.0), on convertit en %
        return {
          value: Math.round(samples[0].quantity * 100),
          date: samples[0].startDate,
        };
      }
    } catch (error) {
      logger.error('Erreur lecture SpO2 iOS:', error);
    }
    return null;
  }

  async getOxygenSaturation(): Promise<HealthData['oxygenSaturation'] | null> {
    return this.getIOSOxygenSaturation();
  }

  private async getIOSRespiratoryRate(): Promise<HealthData['respiratoryRate'] | null> {

    try {
      const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierRespiratoryRate', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        limit: 1,
        ascending: false,
      });

      if (samples && samples.length > 0) {
        return {
          value: Math.round(samples[0].quantity),
          date: samples[0].startDate,
        };
      }
    } catch (error) {
      logger.error('Erreur lecture fréquence respiratoire iOS:', error);
    }
    return null;
  }

  async getRespiratoryRate(): Promise<HealthData['respiratoryRate'] | null> {
    return this.getIOSRespiratoryRate();
  }

  private async getIOSBodyTemperature(): Promise<HealthData['bodyTemperature'] | null> {

    try {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyTemperature', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        limit: 1,
        ascending: false,
      });

      if (samples && samples.length > 0) {
        // Apple Health stocke en Celsius
        return {
          value: Math.round(samples[0].quantity * 10) / 10,
          date: samples[0].startDate,
        };
      }
    } catch (error) {
      logger.error('Erreur lecture température corporelle iOS:', error);
    }
    return null;
  }

  async getBodyTemperature(): Promise<HealthData['bodyTemperature'] | null> {
    return this.getIOSBodyTemperature();
  }

  // ============================================
  // COMPOSITION CORPORELLE
  // ============================================

  private async getIOSBodyComposition(): Promise<HealthData['bodyComposition'] | null> {

    try {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [fatSamples, leanSamples] = await Promise.all([
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyFatPercentage', {
          from: fromDate.getTime(),
          to: new Date().getTime(),
          limit: 1,
          ascending: false,
        }),
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierLeanBodyMass', {
          from: fromDate.getTime(),
          to: new Date().getTime(),
          limit: 1,
          ascending: false,
        }),
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
    } catch (error) {
      logger.error('Erreur lecture composition corporelle iOS:', error);
    }
    return null;
  }

  async getBodyComposition(): Promise<HealthData['bodyComposition'] | null> {
    return this.getIOSBodyComposition();
  }

  // ============================================
  // WORKOUTS
  // ============================================

  private async getIOSWorkouts(): Promise<HealthData['workouts'] | null> {

    try {
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
    } catch (error) {
      logger.error('Erreur lecture workouts iOS:', error);
    }
    return null;
  }

  async getWorkouts(): Promise<HealthData['workouts'] | null> {
    return this.getIOSWorkouts();
  }

  // ============================================
  // HISTORICAL DATA (TRENDS)
  // ============================================

  async getHRVHistory(days: number = 7): Promise<Array<{ date: string; value: number }>> {
    if (DEMO_MODE) return DemoData.getDemoHRVHistory(days);

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
    if (DEMO_MODE) return DemoData.getDemoRestingHRHistory(days);

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
    if (DEMO_MODE) return DemoData.getDemoHeartRateHistory(days);

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
    if (DEMO_MODE) return DemoData.getDemoOxygenSaturationHistory(days);

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
    if (DEMO_MODE) return DemoData.getDemoBodyTemperatureHistory(days);

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
    if (DEMO_MODE) return DemoData.getDemoWeightHistory(days);

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
  }>> {
    if (DEMO_MODE) return DemoData.getDemoSleepHistory(days);

    const MAX_SLEEP_MINUTES = 840; // Maximum: 14 heures par nuit
    const MAX_SAMPLE_DURATION = 720; // Un échantillon ne peut pas dépasser 12h

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
        limit: 500, // Limiter pour eviter surcharge memoire sur historique long
      });

      if (samples && samples.length > 0) {
        // Grouper par date (considerer le sommeil de la nuit precedente)
        const sleepByDate: { [key: string]: {
          deep: number;
          rem: number;
          core: number;
          awake: number;
          total: number;
          periods: Set<string>;
        }} = {};

        samples.forEach((s: any) => {
          // Utiliser la date de fin pour grouper (matin)
          const date = new Date(s.endDate).toISOString().split('T')[0];
          const duration = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
          const periodKey = `${s.startDate}_${s.endDate}_${s.value}`;

          // Ignorer les durées impossibles
          if (duration <= 0 || duration > MAX_SAMPLE_DURATION) {
            return;
          }

          if (!sleepByDate[date]) {
            sleepByDate[date] = { deep: 0, rem: 0, core: 0, awake: 0, total: 0, periods: new Set() };
          }

          // Éviter les doublons
          if (sleepByDate[date].periods.has(periodKey)) {
            return;
          }
          sleepByDate[date].periods.add(periodKey);

          sleepByDate[date].total += duration;

          switch (s.value) {
            case 2:
              sleepByDate[date].awake += duration;
              break;
            case 3:
              sleepByDate[date].core += duration;
              break;
            case 4:
              sleepByDate[date].deep += duration;
              break;
            case 5:
              sleepByDate[date].rem += duration;
              break;
          }
        });

        return Object.keys(sleepByDate).map(date => ({
          date,
          // Appliquer les caps maximum
          deep: Math.round(Math.min(sleepByDate[date].deep, MAX_SLEEP_MINUTES)),
          rem: Math.round(Math.min(sleepByDate[date].rem, MAX_SLEEP_MINUTES)),
          core: Math.round(Math.min(sleepByDate[date].core, MAX_SLEEP_MINUTES)),
          awake: Math.round(Math.min(sleepByDate[date].awake, MAX_SLEEP_MINUTES)),
          total: Math.round(Math.min(sleepByDate[date].total, MAX_SLEEP_MINUTES)),
        })).sort((a, b) => a.date.localeCompare(b.date));
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
    if (DEMO_MODE) return DemoData.getDemoCaloriesHistory(days);

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
    if (DEMO_MODE) return DemoData.getDemoVO2MaxHistory(days);

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
    if (DEMO_MODE) return DemoData.getDemoStepsHistory(days);

    const MAX_STEPS_PER_DAY = 100000; // Maximum réaliste

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', {
        from: fromDate.getTime(),
        to: new Date().getTime(),
      });

      if (samples && samples.length > 0) {
        // Grouper par jour avec déduplication
        const stepsByDate: { [key: string]: { total: number; periods: Set<string> } } = {};

        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          const periodKey = `${s.startDate}_${s.endDate}`;

          if (!stepsByDate[date]) {
            stepsByDate[date] = { total: 0, periods: new Set() };
          }

          // Éviter les doublons de périodes
          if (!stepsByDate[date].periods.has(periodKey)) {
            stepsByDate[date].periods.add(periodKey);
            stepsByDate[date].total += s.quantity;
          }
        });

        return Object.keys(stepsByDate).map(date => ({
          date,
          // Appliquer le cap maximum par jour
          value: Math.round(Math.min(stepsByDate[date].total, MAX_STEPS_PER_DAY)),
        })).sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('Erreur lecture historique pas:', error);
    }
    return [];
  }

  async getAllHealthData(): Promise<HealthData> {
    // Mode démo : retourner des données fictives
    if (DEMO_MODE) {
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

    const [
      weight,
      steps,
      sleep,
      hydration,
      heartRate,
      hrv,
      calories,
      distance,
      vo2Max,
      oxygenSaturation,
      respiratoryRate,
      bodyTemperature,
      bodyComposition,
      workouts,
    ] = await Promise.all([
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

    return {
      weight: weight || undefined,
      steps: steps || undefined,
      sleep: sleep || undefined,
      hydration: hydration || undefined,
      heartRate: heartRate || undefined,
      heartRateVariability: hrv || undefined,
      calories: calories || undefined,
      distance: distance || undefined,
      vo2Max: vo2Max || undefined,
      oxygenSaturation: oxygenSaturation || undefined,
      respiratoryRate: respiratoryRate || undefined,
      bodyTemperature: bodyTemperature || undefined,
      bodyComposition: bodyComposition || undefined,
      workouts: workouts || undefined,
    };
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
      // Mapper les types d'activités Yoroi vers HealthKit
      const activityTypeMap: { [key: string]: string } = {
        'Running': 'HKWorkoutActivityTypeRunning',
        'Course': 'HKWorkoutActivityTypeRunning',
        'Trail': 'HKWorkoutActivityTypeRunning',
        'Cycling': 'HKWorkoutActivityTypeCycling',
        'Vélo': 'HKWorkoutActivityTypeCycling',
        'Swimming': 'HKWorkoutActivityTypeSwimming',
        'Natation': 'HKWorkoutActivityTypeSwimming',
        'Musculation': 'HKWorkoutActivityTypeTraditionalStrengthTraining',
        'CrossFit': 'HKWorkoutActivityTypeCrosstraining',
        'Yoga': 'HKWorkoutActivityTypeYoga',
        'Boxing': 'HKWorkoutActivityTypeBoxing',
        'Boxe': 'HKWorkoutActivityTypeBoxing',
        'MMA': 'HKWorkoutActivityTypeMixedMetabolicCardioTraining',
        'JJB': 'HKWorkoutActivityTypeMartialArts',
        'Judo': 'HKWorkoutActivityTypeMartialArts',
        'Karate': 'HKWorkoutActivityTypeMartialArts',
        'Karaté': 'HKWorkoutActivityTypeMartialArts',
        'Muay Thai': 'HKWorkoutActivityTypeKickboxing',
      };

      const hkActivityType = activityTypeMap[workout.activityType] || 'HKWorkoutActivityTypeOther';

      await HealthKit.saveWorkoutSample(hkActivityType, {
        start: workout.startDate,
        end: workout.endDate,
        distance: workout.distance ? workout.distance * 1000 : undefined, // Convertir km -> mètres
        totalEnergyBurned: workout.calories,
      });

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
    if (DEMO_MODE) {
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
}

export const healthConnect = new HealthConnectService();

export const getProviderIcon = (): string => '';

export const getConnectionInstructions = (): string[] => [
  "1. YOROI va demander l'accès à Apple Santé",
  "2. Autorise l'accès au poids, aux pas, au sommeil et à l'hydratation",
  "3. Tes données seront synchronisées automatiquement",
];

export default healthConnect;
