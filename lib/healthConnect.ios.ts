// ============================================
// YOROI - SERVICE HEALTH CONNECT (iOS)
// ============================================
// Intégration Apple Health uniquement
// ============================================

import { Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Demo data removed - DEMO_MODE is disabled for production
import logger from '@/lib/security/logger';
import { getNativeWorkouts, runNativeDiagnostic, NativeDiagnosticResult, requestAllHealthPermissionsNative, getTodayActivityRingsNative } from './yoroiHealthKit';
import { saveHealthDataBatch, saveHealthData, addWeight, addTraining, updateTrainingDetails, getExistingHealthkitUUIDs, getTrainingsCount } from './database';
import type { HealthDataRecord, Training } from './database';
import { addSleepEntryFromHealthKit } from './sleepService';
import { saveNotification } from './notificationHistoryService';
import { getEffectiveHRZones, calcZoneDurations } from './hrZones';

// ============================================
// MODE DÉMO - Active les fausses données
// ============================================
// ATTENTION: Mettre à FALSE pour utiliser les vraies données Apple Health
// PRODUCTION: Désactivé pour l'App Store
// NOTE: Désactivé - les données vides s'afficheront si non connecté à HealthKit
const DEMO_MODE = false;

// Apple HealthKit (iOS) - Safe wrapper with Expo Go fallback
import HealthKit, { isHealthKitAvailable, isRunningInExpoGo, healthKitDiagnostic, isMockMode } from './healthKit.wrapper';

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

export interface HeartRateSample {
  timestamp: string;
  bpm: number;
}

export interface WorkoutDetails {
  cacheVersion?: number;  // Incrémenter si algo de calcul change (invalide cache)
  startLatitude?: number;   // Premier point GPS (pour localisation même sans route)
  startLongitude?: number;
  // Route GPS
  routePoints?: Array<{
    latitude: number;
    longitude: number;
    altitude?: number;
    speed?: number;
    timestamp?: string;
  }>;
  routeBoundingBox?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  // FC
  heartRateSamples?: HeartRateSample[];
  avgHeartRate?: number;
  minHeartRate?: number;
  maxHeartRate?: number;
  heartRateZones?: Array<{
    zone: number;     // 1-5
    name: string;
    minBpm: number;
    maxBpm: number;
    durationSeconds: number;
    color: string;
  }>;
  // Splits (par km)
  splits?: Array<{
    index: number;
    distanceKm: number;
    paceSecondsPerKm: number;
    durationSeconds: number;
    elevationGain: number;
    avgHeartRate?: number;
  }>;
  // Météo
  weatherTemp?: number;       // Celsius
  weatherHumidity?: number;   // 0-100%
  weatherCondition?: string;
  // Qualité de l'air (index 1-6 si dispo via HealthKit metadata)
  airQualityIndex?: number;      // 1=Bon, 2=Modere, 3=Mauvais pour groupes sensibles, 4=Mauvais, 5=Tres mauvais, 6=Dangereux
  airQualityCategory?: string;   // Texte descriptif
  // Elevation
  elevationAscended?: number;  // metres
  elevationDescended?: number; // metres
  // Performances
  distanceKm?: number;
  activeCalories?: number;
  totalCalories?: number;
  avgPaceSecondsPerKm?: number;
  durationMinutes?: number;
  isIndoor?: boolean;
  // FC récupération (post workout)
  recoveryHR?: { atEnd: number; after1Min?: number; after2Min?: number };
}

export interface HealthData {
  weight?: {
    value: number;
    unit: 'kg' | 'lbs';
    date: string;
    source?: string;             // Nom de source normalisé (withings, garmin, etc.)
  };
  steps?: {
    count: number;
    date: string;
    source?: string;
  };
  sleep?: {
    startTime: string;
    endTime: string;
    duration: number; // minutes totales
    quality?: 'poor' | 'fair' | 'good' | 'excellent';
    source?: string;
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
    source?: string;
  };
  heartRate?: {
    current?: number;    // BPM actuel
    average: number;     // BPM moyen sur la période
    min: number;         // BPM minimum
    max: number;         // BPM maximum
    resting: number;     // FC au repos (important pour récupération)
    source?: string;
  };
  heartRateVariability?: {
    value: number;       // HRV en ms (SDNN)
    date: string;
    source?: string;
  };
  calories?: {
    active: number;      // Calories actives brûlées
    basal: number;       // Calories au repos (BMR)
    total: number;       // Total = active + basal
    source?: string;
  };
  distance?: {
    walking: number;     // Distance marche (km)
    running: number;     // Distance course (km)
    total: number;       // Total (km)
    unit: 'km' | 'miles';
    source?: string;
  };
  vo2Max?: {
    value: number;       // ml/kg/min
    date: string;
    source?: string;
  };
  oxygenSaturation?: {
    value: number;       // SpO2 en % (0-100)
    date: string;
    source?: string;
  };
  respiratoryRate?: {
    value: number;       // Respirations par minute
    date: string;
    source?: string;
  };
  bodyTemperature?: {
    value: number;       // Température en °C
    date: string;
    source?: string;
  };
  bodyComposition?: {
    bodyFatPercentage?: number;  // % graisse corporelle
    leanBodyMass?: number;       // Masse maigre en kg
    date: string;
    source?: string;
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
    source?: string;
  }>;
  bloodPressure?: {
    systolic: number;            // mmHg
    diastolic: number;           // mmHg
    date: string;
    source?: string;
  };
  bloodGlucose?: {
    value: number;               // mmol/L
    unit: 'mmol/L' | 'mg/dL';
    date: string;
    source?: string;
  };
  height?: {
    value: number;               // cm
    date: string;
    source?: string;
  };
  floorsClimbed?: {
    count: number;
    date: string;
    source?: string;
  };
  mindfulMinutes?: {
    minutes: number;
    date: string;
    source?: string;
  };
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
  bloodPressure: boolean;
  bloodGlucose: boolean;
  height: boolean;
  floorsClimbed: boolean;
  mindfulMinutes: boolean;
}

export interface SyncStatus {
  lastSync: string | null;
  isConnected: boolean;
  provider: 'apple_health' | 'google_fit' | null;
  permissions: HealthPermissions;
  failureReason?: 'USER_DENIED' | 'MODULE_NOT_LOADED' | 'DEVICE_NOT_SUPPORTED' | 'UNKNOWN';
}

// ============================================
// SOURCE NAME MAP - Normalise les noms d'apps vers des clés standard
// ============================================

export const SOURCE_NAME_MAP: Record<string, string> = {
  // Withings
  'Health Mate': 'withings', 'Withings': 'withings', 'Withings Health Mate': 'withings',
  // Garmin
  'Garmin Connect': 'garmin', 'com.garmin.android.apps.connectmobile': 'garmin',
  'Garmin': 'garmin', 'com.garmin.connect.mobile': 'garmin',
  // Polar
  'Polar Flow': 'polar', 'com.polar.polarflow': 'polar', 'Polar Beat': 'polar',
  // Whoop
  'WHOOP': 'whoop', 'com.whoop.android': 'whoop',
  // Apple
  'Apple Watch': 'apple_watch', "John's Apple Watch": 'apple_watch',
  'iPhone': 'iphone',
  // Samsung
  'Samsung Health': 'samsung', 'com.sec.android.app.shealth': 'samsung',
  // Fitbit
  'Fitbit': 'fitbit', 'com.fitbit.FitbitMobile': 'fitbit',
  // Xiaomi
  'Mi Fitness': 'xiaomi', 'Mi Fit': 'xiaomi',
  'com.xiaomi.wearable': 'xiaomi', 'com.xiaomi.hm.health': 'xiaomi',
  // Renpho / Eufy / Omron
  'Renpho': 'renpho', 'RENPHO': 'renpho',
  'EufyLife': 'eufy', 'eufy Life': 'eufy',
  'OMRON connect': 'omron', 'Omron': 'omron',
  // Suunto
  'Suunto': 'suunto', 'com.suunto.app': 'suunto', 'Suunto App': 'suunto',
  // Oura
  'Oura': 'oura', 'com.ouraring.oura': 'oura',
  // COROS
  'COROS': 'coros', 'com.coros.coros': 'coros', 'COROS PACE': 'coros',
  'COROS VERTIX': 'coros', 'COROS APEX': 'coros',
  // Amazfit / Zepp
  'Amazfit': 'amazfit', 'Zepp': 'amazfit', 'Zepp Life': 'amazfit',
  'com.huami.watch.hmwatchmanager': 'amazfit', 'Zepp App': 'amazfit',
  // Huawei
  'Huawei Health': 'huawei', 'com.huawei.health': 'huawei', 'HUAWEI Health': 'huawei',
  'Huawei': 'huawei',
  // Wahoo
  'Wahoo': 'wahoo', 'Wahoo Fitness': 'wahoo', 'ELEMNT': 'wahoo',
  'com.wahoofitness.fitness': 'wahoo',
  // Strava
  'Strava': 'strava', 'com.strava': 'strava',
  // Peloton
  'Peloton': 'peloton', 'com.onepeloton.callisto': 'peloton',
  // MyFitnessPal
  'MyFitnessPal': 'myfitnesspal', 'com.myfitnesspal.mfp': 'myfitnesspal',
  // Samsung Galaxy Watch (noms de montres specifiques)
  'Galaxy Watch': 'samsung', 'Galaxy Watch4': 'samsung', 'Galaxy Watch5': 'samsung',
  'Galaxy Watch6': 'samsung', 'Galaxy Watch Ultra': 'samsung',
  'Samsung Galaxy Watch': 'samsung',
  // Yoroi manual
  'Yoroi': 'manual', 'YOROI': 'manual',
  // HealthKit proxy (apps tierces qui écrivent via HealthKit sans nom propre)
  'SourceProxy': 'apple_health', 'com.apple.health': 'apple_health',
  'Health': 'apple_health', 'Apple Health': 'apple_health',
};

/**
 * Normalise le nom de source brut en clé standard.
 * Essaie d'abord un match exact, puis un match partiel (contains).
 */
export const normalizeSourceName = (rawSource: string): string => {
  if (!rawSource) return 'unknown';
  // Exact match
  if (SOURCE_NAME_MAP[rawSource]) return SOURCE_NAME_MAP[rawSource];
  // Partial match (case-insensitive)
  const lower = rawSource.toLowerCase();
  for (const [key, value] of Object.entries(SOURCE_NAME_MAP)) {
    if (lower.includes(key.toLowerCase())) return value;
  }
  // Fallback patterns pour marques connues (avant le catch-all 'watch')
  if (lower.includes('garmin')) return 'garmin';
  if (lower.includes('coros')) return 'coros';
  if (lower.includes('suunto')) return 'suunto';
  if (lower.includes('polar')) return 'polar';
  if (lower.includes('amazfit') || lower.includes('zepp') || lower.includes('huami')) return 'amazfit';
  if (lower.includes('huawei')) return 'huawei';
  if (lower.includes('samsung') || lower.includes('galaxy')) return 'samsung';
  if (lower.includes('fitbit')) return 'fitbit';
  if (lower.includes('wahoo') || lower.includes('elemnt')) return 'wahoo';
  if (lower.includes('whoop')) return 'whoop';
  if (lower.includes('strava')) return 'strava';
  // Apple Watch variants (nom personnalisé)
  if (lower.includes('apple watch') || lower.includes('watch')) return 'apple_watch';
  if (lower.includes('iphone')) return 'iphone';
  return rawSource;
};

/**
 * Extrait le nom de source brut depuis un sample HealthKit iOS
 */
const extractIOSSourceName = (sample: any): string => {
  return sample?.sourceRevision?.source?.name
    || sample?.device?.name
    || 'apple_health';
};

// ============================================
// SOURCE PRIORITY - Plus haut = plus fiable
// ============================================

export const SOURCE_PRIORITY: Record<string, number> = {
  withings: 10,
  garmin: 9,
  polar: 9,
  whoop: 9,
  renpho: 9,
  eufy: 9,
  omron: 9,
  suunto: 9,
  oura: 9,
  coros: 9,
  wahoo: 9,
  huawei: 8,
  amazfit: 8,
  apple_watch: 8,
  samsung: 8,
  fitbit: 8,
  xiaomi: 7,
  strava: 6,
  peloton: 6,
  myfitnesspal: 5,
  iphone: 5,
  manual: 3,
  apple_health: 1,
  unknown: 0,
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
  LAST_RESTING_HR: '@yoroi_health_last_resting_hr',
  LAST_HRV: '@yoroi_health_last_hrv',
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

// ============================================
// WORKOUT TYPE MAPPING: Apple HealthKit -> Yoroi sport types
// Couvre TOUS les HKWorkoutActivityType (80+)
// ============================================
const WORKOUT_TYPE_MAP: Record<string, string> = {
  // ═══ COURSE ═══
  'HKWorkoutActivityTypeRunning': 'running', 'running': 'running',
  // ═══ RANDONNEE ═══
  'HKWorkoutActivityTypeHiking': 'randonnee', 'hiking': 'randonnee',
  // ═══ MARCHE ═══
  'HKWorkoutActivityTypeWalking': 'marche', 'walking': 'marche',
  // ═══ MUSCULATION ═══
  'HKWorkoutActivityTypeTraditionalStrengthTraining': 'musculation',
  'HKWorkoutActivityTypeFunctionalStrengthTraining': 'musculation',
  'HKWorkoutActivityTypeCoreTraining': 'musculation',
  'traditionalStrengthTraining': 'musculation', 'functionalStrengthTraining': 'musculation',
  'coreTraining': 'musculation',
  // ═══ CROSSTRAINING / HIIT ═══
  'HKWorkoutActivityTypeCrossTraining': 'crossfit',
  'HKWorkoutActivityTypeHighIntensityIntervalTraining': 'hiit',
  'crossTraining': 'crossfit', 'highIntensityIntervalTraining': 'hiit',
  // ═══ SPORTS DE COMBAT ═══
  'HKWorkoutActivityTypeMartialArts': 'mma', 'martialArts': 'mma',
  'HKWorkoutActivityTypeBoxing': 'boxe', 'boxing': 'boxe',
  'HKWorkoutActivityTypeKickboxing': 'kickboxing', 'kickboxing': 'kickboxing',
  'HKWorkoutActivityTypeWrestling': 'lutte', 'wrestling': 'lutte',
  'HKWorkoutActivityTypeTaiChi': 'tai_chi', 'taiChi': 'tai_chi',
  // ═══ CARDIO MIXTE ═══
  'HKWorkoutActivityTypeMixedCardio': 'cardio_mixte', 'mixedCardio': 'cardio_mixte',
  'HKWorkoutActivityTypeMixedMetabolicCardioTraining': 'cardio_mixte', 'mixedMetabolicCardioTraining': 'cardio_mixte',
  // ═══ VELO ═══
  'HKWorkoutActivityTypeCycling': 'velo', 'cycling': 'velo',
  'HKWorkoutActivityTypeHandCycling': 'hand_cycling', 'handCycling': 'hand_cycling',
  // ═══ NATATION ═══
  'HKWorkoutActivityTypeSwimming': 'natation', 'swimming': 'natation',
  // ═══ YOGA / FLEXIBILITE / PILATES ═══
  'HKWorkoutActivityTypeYoga': 'yoga', 'yoga': 'yoga',
  'HKWorkoutActivityTypePilates': 'pilates', 'pilates': 'pilates',
  'HKWorkoutActivityTypeFlexibility': 'stretching', 'flexibility': 'stretching',
  'HKWorkoutActivityTypeMindAndBody': 'yoga', 'mindAndBody': 'yoga',
  'HKWorkoutActivityTypeCooldown': 'récupération', 'cooldown': 'récupération',
  // ═══ FOOTBALL ═══
  'HKWorkoutActivityTypeSoccer': 'football', 'soccer': 'football',
  'HKWorkoutActivityTypeAmericanFootball': 'football_americain', 'americanFootball': 'football_americain',
  'HKWorkoutActivityTypeAustralianFootball': 'football', 'australianFootball': 'football',
  // ═══ BASKETBALL ═══
  'HKWorkoutActivityTypeBasketball': 'basketball', 'basketball': 'basketball',
  // ═══ TENNIS / RAQUETTE ═══
  'HKWorkoutActivityTypeTennis': 'tennis', 'tennis': 'tennis',
  'HKWorkoutActivityTypeBadminton': 'badminton', 'badminton': 'badminton',
  'HKWorkoutActivityTypeTableTennis': 'tennis_de_table', 'tableTennis': 'tennis_de_table',
  'HKWorkoutActivityTypeRacquetball': 'racquetball', 'racquetball': 'racquetball',
  'HKWorkoutActivityTypeSquash': 'squash', 'squash': 'squash',
  'HKWorkoutActivityTypePickleball': 'pickleball', 'pickleball': 'pickleball',
  // ═══ CARDIO / ELLIPTIQUE / STEPPER ═══
  'HKWorkoutActivityTypeElliptical': 'elliptique', 'elliptical': 'elliptique',
  'HKWorkoutActivityTypeStairClimbing': 'stairmaster', 'stairClimbing': 'stairmaster',
  'HKWorkoutActivityTypeStepTraining': 'step_aerobic', 'stepTraining': 'step_aerobic',
  'HKWorkoutActivityTypeFitnessGaming': 'fitness_gaming', 'fitnessGaming': 'fitness_gaming',
  'HKWorkoutActivityTypeJumpRope': 'corde_a_sauter', 'jumpRope': 'corde_a_sauter',
  'HKWorkoutActivityTypeStairs': 'stairmaster', 'stairs': 'stairmaster',
  // ═══ RAMEUR ═══
  'HKWorkoutActivityTypeRowing': 'rameur', 'rowing': 'rameur',
  // ═══ DANSE ═══
  'HKWorkoutActivityTypeDance': 'danse', 'dance': 'danse',
  'HKWorkoutActivityTypeSocialDance': 'danse', 'socialDance': 'danse',
  'HKWorkoutActivityTypeCardioDance': 'danse', 'cardioDance': 'danse',
  'HKWorkoutActivityTypeDanceInspiredTraining': 'danse', 'danceInspiredTraining': 'danse',
  // ═══ SKI / SPORTS D'HIVER ═══
  'HKWorkoutActivityTypeDownhillSkiing': 'ski', 'downhillSkiing': 'ski',
  'HKWorkoutActivityTypeCrossCountrySkiing': 'ski_de_fond', 'crossCountrySkiing': 'ski_de_fond',
  'HKWorkoutActivityTypeSnowboarding': 'snowboard', 'snowboarding': 'snowboard',
  'HKWorkoutActivityTypeSnowSports': 'ski', 'snowSports': 'ski',
  'HKWorkoutActivityTypeSkatingSports': 'patinage', 'skatingSports': 'patinage',
  'HKWorkoutActivityTypeCurling': 'curling', 'curling': 'curling',
  // ═══ SPORTS NAUTIQUES ═══
  'HKWorkoutActivityTypeSurfingSports': 'surf', 'surfingSports': 'surf',
  'HKWorkoutActivityTypePaddleSports': 'paddle', 'paddleSports': 'paddle',
  'HKWorkoutActivityTypeSailing': 'voile', 'sailing': 'voile',
  'HKWorkoutActivityTypeWaterFitness': 'aquagym', 'waterFitness': 'aquagym',
  'HKWorkoutActivityTypeWaterPolo': 'water_polo', 'waterPolo': 'water_polo',
  'HKWorkoutActivityTypeWaterSports': 'sports_nautiques', 'waterSports': 'sports_nautiques',
  'HKWorkoutActivityTypeUnderwaterDiving': 'plongee', 'underwaterDiving': 'plongee',
  // ═══ SPORTS D'EQUIPE ═══
  'HKWorkoutActivityTypeVolleyball': 'volleyball', 'volleyball': 'volleyball',
  'HKWorkoutActivityTypeHandball': 'handball', 'handball': 'handball',
  'HKWorkoutActivityTypeRugby': 'rugby', 'rugby': 'rugby',
  'HKWorkoutActivityTypeLacrosse': 'lacrosse', 'lacrosse': 'lacrosse',
  'HKWorkoutActivityTypeHockey': 'hockey_glace', 'hockey': 'hockey_glace',
  'HKWorkoutActivityTypeCricket': 'cricket', 'cricket': 'cricket',
  'HKWorkoutActivityTypeBaseball': 'baseball', 'baseball': 'baseball',
  'HKWorkoutActivityTypeSoftball': 'baseball', 'softball': 'baseball',
  // ═══ GOLF ═══
  'HKWorkoutActivityTypeGolf': 'golf', 'golf': 'golf',
  // ═══ ESCALADE ═══
  'HKWorkoutActivityTypeClimbing': 'escalade', 'climbing': 'escalade',
  // ═══ EQUITATION ═══
  'HKWorkoutActivityTypeEquestrianSports': 'equitation', 'equestrianSports': 'equitation',
  // ═══ ESCRIME ═══
  'HKWorkoutActivityTypeFencing': 'escrime', 'fencing': 'escrime',
  // ═══ GYMNASTIQUE ═══
  'HKWorkoutActivityTypeGymnastics': 'gymnastique', 'gymnastics': 'gymnastique',
  // ═══ ATHLETISME ═══
  'HKWorkoutActivityTypeTrackAndField': 'athletisme', 'trackAndField': 'athletisme',
  // ═══ TIR A L'ARC ═══
  'HKWorkoutActivityTypeArchery': 'tir_a_larc', 'archery': 'tir_a_larc',
  // ═══ BOWLING ═══
  'HKWorkoutActivityTypeBowling': 'bowling', 'bowling': 'bowling',
  // ═══ DISC SPORTS ═══
  'HKWorkoutActivityTypeDiscSports': 'disc_golf', 'discSports': 'disc_golf',
  // ═══ PREPARATION / RECOVERY ═══
  'HKWorkoutActivityTypePreparationAndRecovery': 'récupération',
  'preparationAndRecovery': 'récupération',
  // ═══ BARRE ═══
  'HKWorkoutActivityTypeBarre': 'barre_au_sol', 'barre': 'barre_au_sol',
  // ═══ MULTI-SPORT / TRIATHLON ═══
  'HKWorkoutActivityTypeSwimBikeRun': 'triathlon', 'swimBikeRun': 'triathlon',
  'HKWorkoutActivityTypeTransition': 'transition', 'transition': 'transition',
  // ═══ WHEELCHAIR ═══
  'HKWorkoutActivityTypeWheelchairWalkPace': 'marche', 'wheelchairWalkPace': 'marche',
  'HKWorkoutActivityTypeWheelchairRunPace': 'running', 'wheelchairRunPace': 'running',
  // ═══ OTHER / CATCH-ALL ═══
  'HKWorkoutActivityTypeOther': 'autre', 'other': 'autre',
  'HKWorkoutActivityTypePlay': 'jeu', 'play': 'jeu',
  'HKWorkoutActivityTypeHunting': 'chasse', 'hunting': 'chasse',
  'HKWorkoutActivityTypeFishing': 'peche', 'fishing': 'peche',
};

// ════════════════════════════════════════════════════════════════
// Mapping NUMERIQUE: HKWorkoutActivityType enum values OFFICIELS
// Source: Apple Developer Documentation - HKWorkoutActivityType
// https://developer.apple.com/documentation/healthkit/hkworkoutactivitytype
// ════════════════════════════════════════════════════════════════
const WORKOUT_TYPE_NUMERIC_MAP: Record<number, string> = {
  // Valeurs officielles Apple HKWorkoutActivityType
  1: 'football_americain',  // AmericanFootball
  2: 'tir_a_larc',          // Archery
  3: 'football',           // AustralianFootball
  4: 'badminton',          // Badminton
  5: 'baseball',           // Baseball
  6: 'basketball',         // Basketball
  7: 'bowling',            // Bowling
  8: 'boxe',               // Boxing
  9: 'escalade',           // Climbing
  10: 'cricket',           // Cricket
  11: 'crossfit',          // CrossTraining
  12: 'curling',           // Curling
  13: 'velo',              // Cycling
  14: 'danse',             // Dance
  15: 'danse',             // DanceInspiredTraining (deprecated)
  16: 'elliptique',        // Elliptical
  17: 'equitation',        // EquestrianSports
  18: 'escrime',           // Fencing
  19: 'peche',             // Fishing
  20: 'musculation',       // FunctionalStrengthTraining
  21: 'golf',              // Golf
  22: 'gymnastique',       // Gymnastics
  23: 'handball',          // Handball
  24: 'randonnee',         // Hiking *** C'ETAIT LE BUG ***
  25: 'hockey_glace',       // Hockey
  26: 'chasse',            // Hunting
  27: 'lacrosse',          // Lacrosse
  28: 'mma',                // MartialArts
  29: 'yoga',              // MindAndBody
  30: 'cardio_mixte',       // MixedMetabolicCardioTraining
  31: 'paddle',            // PaddleSports
  32: 'jeu',               // Play
  33: 'récupération',      // PreparationAndRecovery
  34: 'racquetball',       // Racquetball
  35: 'rameur',            // Rowing
  36: 'rugby',             // Rugby
  37: 'running',           // Running
  38: 'voile',             // Sailing
  39: 'patinage',          // SkatingSports
  40: 'ski',               // SnowSports
  41: 'football',          // Soccer
  42: 'baseball',           // Softball
  43: 'squash',            // Squash
  44: 'stairmaster',        // StairClimbing
  45: 'surf',              // SurfingSports
  46: 'natation',          // Swimming
  47: 'tennis_de_table',   // TableTennis
  48: 'tennis',            // Tennis
  49: 'athletisme',        // TrackAndField
  50: 'musculation',       // TraditionalStrengthTraining
  51: 'volleyball',        // Volleyball
  52: 'marche',            // Walking
  53: 'aquagym',           // WaterFitness
  54: 'water_polo',        // WaterPolo
  55: 'sports_nautiques',  // WaterSports
  56: 'lutte',             // Wrestling
  57: 'yoga',              // Yoga
  // iOS 10+
  58: 'barre_au_sol',       // Barre
  59: 'musculation',       // CoreTraining
  60: 'ski_de_fond',        // CrossCountrySkiing
  61: 'ski',               // DownhillSkiing
  62: 'stretching',        // Flexibility
  63: 'hiit',              // HighIntensityIntervalTraining
  64: 'corde_a_sauter',    // JumpRope
  65: 'kickboxing',        // Kickboxing
  66: 'pilates',           // Pilates
  67: 'snowboard',         // Snowboarding
  68: 'stairmaster',        // Stairs
  69: 'step_aerobic',       // StepTraining
  70: 'marche',            // WheelchairWalkPace
  71: 'running',           // WheelchairRunPace
  72: 'tai_chi',           // TaiChi
  73: 'cardio_mixte',       // MixedCardio
  74: 'hand_cycling',       // HandCycling
  75: 'disc_golf',         // DiscSports
  76: 'fitness_gaming',    // FitnessGaming
  77: 'danse',             // CardioDance
  78: 'danse',             // SocialDance
  79: 'pickleball',        // Pickleball
  80: 'récupération',      // Cooldown
  // 81: non defini par Apple
  82: 'triathlon',         // SwimBikeRun
  83: 'transition',        // Transition
  84: 'plongee',           // UnderwaterDiving
  3000: 'autre',           // Other
};

/**
 * Convertir un type de workout Apple en type Yoroi (pour la base)
 */
const mapWorkoutType = (activityType: string): string => {
  // 1. Essayer le mapping string direct
  const mapped = WORKOUT_TYPE_MAP[activityType];
  if (mapped) return mapped;

  // 2. Essayer le mapping numerique (Apple renvoie parfois un nombre)
  const numType = parseInt(activityType, 10);
  if (!isNaN(numType) && WORKOUT_TYPE_NUMERIC_MAP[numType]) {
    return WORKOUT_TYPE_NUMERIC_MAP[numType];
  }

  // 3. Fallback
  logger.warn(`[HealthKit] Type de workout non mappe: "${activityType}"`);
  return 'autre';
};

/**
 * Nom lisible detaille pour la notification et la DB
 */
const getWorkoutLabel = (activityType: string): string => {
  const mapped = mapWorkoutType(activityType);
  const labels: Record<string, string> = {
    // Course & marche
    running: 'Course', randonnee: 'Randonnee', marche: 'Marche', trail: 'Trail',
    // Musculation & fitness
    musculation: 'Musculation', crossfit: 'CrossFit', hiit: 'HIIT', hyrox: 'HYROX',
    barre_au_sol: 'Barre au sol', stretching: 'Stretching', step_aerobic: 'Step',
    // Combat
    mma: 'MMA', jjb: 'JJB', boxe: 'Boxe', kickboxing: 'Kickboxing', lutte: 'Lutte',
    tai_chi: 'Tai Chi',
    // Velo & natation
    velo: 'Velo', hand_cycling: 'Hand Cycling', natation: 'Natation', aquagym: 'Aquagym',
    // Yoga / bien-etre
    yoga: 'Yoga', pilates: 'Pilates',
    // Football
    football: 'Football', football_americain: 'Football US',
    // Basketball
    basketball: 'Basketball',
    // Raquettes
    tennis: 'Tennis', tennis_de_table: 'Tennis de table',
    badminton: 'Badminton', squash: 'Squash',
    racquetball: 'Racquetball', pickleball: 'Pickleball',
    // Cardio
    cardio_mixte: 'Cardio', elliptique: 'Elliptique', stairmaster: 'Stairmaster',
    corde_a_sauter: 'Corde a sauter', fitness_gaming: 'Fitness Gaming',
    // Rameur
    rameur: 'Rameur',
    // Danse
    danse: 'Danse',
    // Hiver
    ski: 'Ski', ski_de_fond: 'Ski de fond', snowboard: 'Snowboard',
    patinage: 'Patinage', curling: 'Curling',
    // Nautique
    surf: 'Surf', paddle: 'Paddle', voile: 'Voile',
    water_polo: 'Water-polo', sports_nautiques: 'Sports nautiques',
    plongee: 'Plongee',
    // Equipe
    volleyball: 'Volleyball', handball: 'Handball', rugby: 'Rugby',
    lacrosse: 'Lacrosse', hockey_glace: 'Hockey', cricket: 'Cricket',
    baseball: 'Baseball',
    // Individuel
    golf: 'Golf', escalade: 'Escalade', equitation: 'Equitation',
    escrime: 'Escrime', gymnastique: 'Gymnastique',
    athletisme: 'Athletisme', tir_a_larc: 'Tir a l\'arc',
    bowling: 'Bowling', disc_golf: 'Disc Golf',
    // Divers
    récupération: 'Récupération', triathlon: 'Triathlon',
    transition: 'Transition',
    jeu: 'Jeu', chasse: 'Chasse', peche: 'Peche',
    autre: 'Séance',
  };
  return labels[mapped] || 'Séance';
};

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
      bloodPressure: false,
      bloodGlucose: false,
      height: false,
      floorsClimbed: false,
      mindfulMinutes: false,
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

      // Si un mauvais DEVICE_NOT_SUPPORTED a été persisté (ex: depuis simulateur)
      // mais que le module natif est maintenant disponible → reset pour permettre une nouvelle tentative
      if (
        this.syncStatus.failureReason === 'DEVICE_NOT_SUPPORTED' &&
        isHealthKitAvailable
      ) {
        logger.info('[HealthConnect] Reset DEVICE_NOT_SUPPORTED obsolète (module disponible)');
        delete this.syncStatus.failureReason;
        this.syncStatus.isConnected = false;
        await this.saveSyncStatus();
      }

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
    return 'App Santé';
  }

  /**
   * Simple requestAuthorization - sans tester les permissions après.
   * Sur iOS, Apple ne révèle pas ce que l'utilisateur a choisi.
   */
  private async requestIOSPermissionsSimple(): Promise<void> {
    if (!HealthKit) throw new Error('HealthKit module not available');

    const toRead = [
      'HKQuantityTypeIdentifierBodyMass',
      'HKQuantityTypeIdentifierBodyFatPercentage',
      'HKQuantityTypeIdentifierLeanBodyMass',
      'HKQuantityTypeIdentifierStepCount',
      'HKQuantityTypeIdentifierDistanceWalkingRunning',
      'HKQuantityTypeIdentifierDistanceCycling',
      'HKQuantityTypeIdentifierDistanceSwimming',
      'HKQuantityTypeIdentifierDistanceDownhillSnowSports',
      'HKQuantityTypeIdentifierAppleExerciseTime',
      'HKQuantityTypeIdentifierAppleStandTime',
      'HKCategoryTypeIdentifierAppleStandHour',
      'HKCategoryTypeIdentifierSleepAnalysis',
      'HKQuantityTypeIdentifierDietaryWater',
      'HKQuantityTypeIdentifierHeartRate',
      'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
      'HKQuantityTypeIdentifierRestingHeartRate',
      'HKQuantityTypeIdentifierActiveEnergyBurned',
      'HKQuantityTypeIdentifierBasalEnergyBurned',
      'HKQuantityTypeIdentifierVO2Max',
      'HKQuantityTypeIdentifierOxygenSaturation',
      'HKQuantityTypeIdentifierRespiratoryRate',
      'HKQuantityTypeIdentifierBodyTemperature',
      'HKWorkoutTypeIdentifier',
      // Route GPS des séances (indispensable pour la carte du parcours)
      'HKSeriesTypeWorkoutRoute',
      'HKQuantityTypeIdentifierBloodPressureSystolic',
      'HKQuantityTypeIdentifierBloodPressureDiastolic',
      'HKQuantityTypeIdentifierBloodGlucose',
      'HKQuantityTypeIdentifierHeight',
      'HKQuantityTypeIdentifierFlightsClimbed',
      'HKCategoryTypeIdentifierMindfulSession',
      // Température poignet sommeil (Apple Watch Series 8+)
      'HKQuantityTypeIdentifierAppleSleepingWristTemperature',
    ];

    const toShare = [
      'HKQuantityTypeIdentifierBodyMass',
      'HKQuantityTypeIdentifierDietaryWater',
      'HKWorkoutTypeIdentifier',
    ];

    await HealthKit.requestAuthorization({ toRead, toShare });
  }

  private async requestIOSPermissions(): Promise<HealthPermissions> {
    try {
      // VÉRIFIER QUE LE MODULE HEALTHKIT EST CHARGÉ
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
        'HKQuantityTypeIdentifierDistanceCycling',
        'HKQuantityTypeIdentifierDistanceSwimming',
        'HKQuantityTypeIdentifierDistanceDownhillSnowSports',
        'HKQuantityTypeIdentifierAppleExerciseTime',
        'HKQuantityTypeIdentifierAppleStandTime',
        'HKCategoryTypeIdentifierAppleStandHour',
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
        // Routes GPS des séances (indispensable pour la carte du parcours)
        'HKSeriesTypeWorkoutRoute',
        // Pression artérielle
        'HKQuantityTypeIdentifierBloodPressureSystolic',
        'HKQuantityTypeIdentifierBloodPressureDiastolic',
        // Glycémie
        'HKQuantityTypeIdentifierBloodGlucose',
        // Taille
        'HKQuantityTypeIdentifierHeight',
        // Étages montés
        'HKQuantityTypeIdentifierFlightsClimbed',
        // Pleine conscience
        'HKCategoryTypeIdentifierMindfulSession',
        // Température poignet sommeil (Apple Watch Series 8+)
        'HKQuantityTypeIdentifierAppleSleepingWristTemperature',
      ];

      const toShare = [
        'HKQuantityTypeIdentifierBodyMass',
        'HKQuantityTypeIdentifierDietaryWater',
        'HKWorkoutTypeIdentifier', // Permettre l'écriture des workouts
      ];

      // L'API HealthKit attend un objet { toRead, toShare }
      await HealthKit.requestAuthorization({ toRead, toShare });

      // TESTER VRAIMENT LES PERMISSIONS EN FAISANT DES LECTURES
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
        workouts: await this.testWorkoutPermission(),
        bloodPressure: await this.testPermission('HKQuantityTypeIdentifierBloodPressureSystolic'),
        bloodGlucose: await this.testPermission('HKQuantityTypeIdentifierBloodGlucose'),
        height: await this.testPermission('HKQuantityTypeIdentifierHeight'),
        floorsClimbed: await this.testPermission('HKQuantityTypeIdentifierFlightsClimbed'),
        mindfulMinutes: await this.testPermissionCategory('HKCategoryTypeIdentifierMindfulSession'),
      };

      logger.info('[HealthKit] Permission test results:', permissions);
      return permissions;
    } catch (error) {
      logger.error('Erreur demande permissions iOS:', error);
      return this.syncStatus.permissions;
    }
  }

  /**
   * Tester si la permission de lecture des workouts est accordée
   */
  private async testWorkoutPermission(): Promise<boolean> {
    if (!HealthKit) return false;
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      await HealthKit.queryWorkoutSamples({
        filter: { date: { startDate: weekAgo, endDate: now } },
        limit: 1,
      });
      return true;
    } catch (error) {
      if (this.isHealthKitAuthError(error)) return false;
      return true; // Autres erreurs = probablement pas un problème de permission
    }
  }

  /**
   * Tester si une permission est accordée en tentant une lecture
   */
  private async testPermission(identifier: string): Promise<boolean> {
    if (!HealthKit) return false;

    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const options = this.createQueryOptions(weekAgo, now, { limit: 1 });
      if (!options) return false;

      await HealthKit.queryQuantitySamples(identifier, options);
      return true; // Si pas d'erreur = permission OK
    } catch (error: unknown) {
      if (this.isHealthKitAuthError(error)) {
        logger.info(`[HealthKit] Permission refusée pour: ${identifier}`);
        return false;
      }
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
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const options = this.createQueryOptions(weekAgo, now, { limit: 1 });
      if (!options) return false;

      await HealthKit.queryCategorySamples(identifier, options);
      return true;
    } catch (error: unknown) {
      if (this.isHealthKitAuthError(error)) {
        logger.info(`[HealthKit] Permission catégorie refusée pour: ${identifier}`);
        return false;
      }
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
      // Vérifier d'abord si le module natif est chargé
      if (!isHealthKitAvailable) {
        logger.warn('[HealthConnect] Module HealthKit non chargé (build natif requis)');
        this.syncStatus.isConnected = false;
        this.syncStatus.failureReason = 'MODULE_NOT_LOADED';
        await this.saveSyncStatus();
        return false;
      }

      const available = await this.isAvailable();
      if (!available) {
        logger.warn('[HealthConnect] Apple Health non disponible sur cet appareil');
        this.syncStatus.isConnected = false;
        this.syncStatus.failureReason = 'DEVICE_NOT_SUPPORTED';
        await this.saveSyncStatus();
        return false;
      }

      // Demander les permissions via Swift natif (bypass Nitro v13 qui échoue sur iOS 26)
      // requestAllHealthPermissionsNative() demande TOUS les types santé directement via HKHealthStore
      const nativePermResult = await requestAllHealthPermissionsNative().catch(() => 'error:native failed');
      logger.info('[HealthConnect] requestAllHealthPermissionsNative:', nativePermResult);

      // Fallback Nitro si le module natif n'est pas encore disponible (premier build sans rebuild)
      if (nativePermResult.startsWith('error:module absent')) {
        try {
          await this.requestIOSPermissionsSimple();
          logger.info('[HealthConnect] requestAuthorization Nitro réussi (fallback)');
        } catch (permError) {
          logger.warn('[HealthConnect] requestAuthorization Nitro a échoué (fallback):', permError);
        }
      }

      logger.info('[HealthConnect] Marquage comme connecté');

      this.syncStatus.isConnected = true;
      this.syncStatus.lastSync = new Date().toISOString();
      delete this.syncStatus.failureReason;

      await this.saveSyncStatus();

      logger.info('[HealthConnect] Connexion HealthKit réussie');

      // Lancer une première synchronisation avec retry automatique
      // IMPORTANT: on wrappe dans try/catch pour ne PAS annuler isConnected si syncWithRetry plante
      logger.info('[HealthConnect] Lancement de la synchronisation initiale...');
      try {
        await this.syncWithRetry();
      } catch (syncErr) {
        logger.warn('[HealthConnect] syncWithRetry échoué (connexion quand même valide):', syncErr);
      }

      return true;
    } catch (error: unknown) {
      logger.error('[HealthConnect] Erreur lors de la connexion:', error);

      // DÉFINIR LA RAISON DE L'ÉCHEC EN FONCTION DE L'ERREUR
      this.syncStatus.isConnected = false;

      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('HealthKit module not available')) {
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
    // VALIDATION: S'assurer que les dates sont valides
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

    // NETTOYAGE: Supprimer les propriétés undefined de options pour éviter les erreurs natives
    const cleanOptions: any = {};
    for (const key in options) {
      if (options[key] !== undefined && options[key] !== null) {
        cleanOptions[key] = options[key];
      }
    }

    // @kingstinct/react-native-healthkit v13+ attend filter.date avec startDate/endDate
    const result: any = {
      filter: {
        date: {
          startDate: fromDate,
          endDate: toDate,
        },
      },
    };
    if (cleanOptions.limit !== undefined) result.limit = cleanOptions.limit;
    if (cleanOptions.ascending !== undefined) result.ascending = cleanOptions.ascending;
    return result;
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
          source: normalizeSourceName(extractIOSSourceName(latest)),
        };
      }
      return null;
    }, 'weight');
  }

  private async getIOSSteps(): Promise<HealthData['steps'] | null> {
    return this.queryHealthKit(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      try {
        if (!HealthKit) {
          logger.info('[HealthKit] Module HealthKit non disponible sur ce device');
          return null;
        }

        // FIX: Utiliser queryStatisticsForQuantity pour obtenir le total DEDOUBLONNE par Apple
        // Cela evite le double comptage iPhone + Apple Watch
        // IMPORTANT: Ne pas require() dans Expo Go (NitroModules non supportes)
        try {
          if (isRunningInExpoGo) throw new Error('Expo Go - skip queryStatisticsForQuantity');
          const HK = require('@kingstinct/react-native-healthkit');
          if (typeof HK.queryStatisticsForQuantity === 'function') {
            const stats = await HK.queryStatisticsForQuantity(
              'HKQuantityTypeIdentifierStepCount',
              ['cumulativeSum'],
              {
                filter: {
                  date: {
                    startDate: today,
                    endDate: new Date(),
                  },
                },
              }
            );

            const totalSteps = stats?.sumQuantity?.quantity ?? 0;
            logger.info('[HealthKit] Steps via queryStatisticsForQuantity (dedoublonne):', Math.round(totalSteps));

            if (totalSteps > 0) {
              // Limite de securite: 200 000 pas/jour (marathoniens ultra)
              const safeSteps = Math.min(Math.round(totalSteps), 100000);
              return {
                count: safeSteps,
                date: today.toISOString(),
              };
            }
          }
        } catch (statsError) {
          logger.warn('[HealthKit] queryStatisticsForQuantity echoue, fallback sur queryQuantitySamples:', statsError);
        }

        // FALLBACK: queryQuantitySamples si queryStatisticsForQuantity n'est pas disponible
        if (typeof HealthKit.queryQuantitySamples !== 'function') {
          return null;
        }

        const queryOptions = this.createQueryOptions(today, new Date(), { limit: 1000 });
        if (!queryOptions) {
          return null;
        }

        const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', queryOptions);

        if (!samples || !Array.isArray(samples) || samples.length === 0) {
          logger.info('[HealthKit] Pas de données de pas disponibles');
          return null;
        }

        const validSamples = samples.filter((s: any) => s && typeof s.quantity !== 'undefined' && !isNaN(Number(s.quantity)));
        if (validSamples.length === 0) {
          return null;
        }

        // Fallback: additionner avec cap de securite
        const totalSteps = validSamples.reduce((sum: number, s: any) => {
          const quantity = Number(s?.quantity || 0);
          return sum + (isNaN(quantity) ? 0 : quantity);
        }, 0);

        if (totalSteps > 0) {
          const safeSteps = Math.min(Math.round(totalSteps), 100000);
          logger.info('[HealthKit] Steps via fallback queryQuantitySamples:', safeSteps);
          return {
            count: safeSteps,
            date: today.toISOString(),
          };
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
      // FIX: Regarder 48h en arrière au lieu de 24h pour capturer le sommeil de la nuit précédente
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      logger.info('[HealthKit] Requête sommeil: de', twoDaysAgo.toISOString(), 'à', now.toISOString());

      const sleepQueryOptions = this.createQueryOptions(twoDaysAgo, now, { limit: 500 });
      if (!sleepQueryOptions) {
        logger.error('[HealthKit] Impossible de créer les options de requête pour le sommeil');
        return null;
      }
      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', sleepQueryOptions);

      logger.info('[HealthKit] Échantillons sommeil bruts:', samples?.length || 0);

      if (samples && samples.length > 0) {
        // FIX: Filtrer les estimations automatiques iPhone, garder Apple Watch + apps tierces
        const filteredSamples = samples.filter((s: any) => {
          const sourceName = (s.sourceRevision?.source?.name || '').toLowerCase();
          const deviceName = (s.device?.name || '').toLowerCase();
          const bundleId = s.sourceRevision?.source?.bundleIdentifier || '';

          // TOUJOURS rejeter les estimations automatiques iPhone
          if (bundleId.includes('sleep-analysis-time')) return false;

          // Si c'est une app tierce (pas apple), toujours accepter
          if (!bundleId.includes('com.apple.health')) return true;

          // Pour com.apple.health: accepter si source OU device contient "watch"
          const isFromWatch = sourceName.includes('watch') || deviceName.includes('watch');
          return isFromWatch;
        });

        logger.info('[HealthKit] Echantillons sommeil: bruts=', samples.length, ', filtres=', filteredSamples.length);

        // Si pas de vraies données, utiliser TOUTES les données
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

        // FIX: Grouper par nuit (prendre la nuit la plus récente)
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

        // Detecter si on a des phases detaillees (value=3,4,5) pour eviter le double comptage
        // Apple Health envoie soit value=1 (Asleep = total), soit value=3+4+5 (phases detaillees)
        // Si les deux existent, value=1 est un duplicat qu'il faut ignorer
        const hasDetailedPhases = finalSamples.some((s: any) => s.value === 3 || s.value === 4 || s.value === 5);

        finalSamples.forEach((s: any) => {
          const duration = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
          if (duration <= 0) return;

          // HKCategoryValueSleepAnalysis: 0=InBed, 1=Asleep, 2=Awake, 3=Core, 4=Deep, 5=REM
          switch (s.value) {
            case 0:
              inBedMinutes += duration;
              break;
            case 1: // Asleep (total global - ignorer si on a les phases detaillees)
              if (!hasDetailedPhases) {
                totalMinutes += duration;
              }
              break;
            case 3: // Core
              coreMinutes += duration;
              totalMinutes += duration;
              break;
            case 4: // Deep
              deepMinutes += duration;
              totalMinutes += duration;
              break;
            case 5: // REM
              remMinutes += duration;
              totalMinutes += duration;
              break;
            case 2: // Awake
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

        // Limite de securite : entre 30min (sieste) et 16h
        if (totalMinutes < 30 || totalMinutes > 960) {
          logger.info('[HealthKit] Sommeil rejete (durée invalide):', totalMinutes, 'minutes');
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
          : 0; // Pas de fallback - 0 = pas de donnée resting HR

        return {
          current: Math.round(current),
          average: Math.round(average),
          min: Math.round(min),
          max: Math.round(max),
          resting: Math.round(resting),
          source: normalizeSourceName(extractIOSSourceName(samples[0])),
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
          source: normalizeSourceName(extractIOSSourceName(samples[0])),
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

      // Méthode 1 : queryStatisticsForQuantity (dédoublonnage iPhone + Watch)
      try {
        if (!isRunningInExpoGo) {
          const HK = require('@kingstinct/react-native-healthkit');
          if (typeof HK.queryStatisticsForQuantity === 'function') {
            const [activeStats, basalStats] = await Promise.allSettled([
              HK.queryStatisticsForQuantity(
                'HKQuantityTypeIdentifierActiveEnergyBurned',
                ['cumulativeSum'],
                { filter: { date: { startDate: today, endDate: new Date() } } }
              ),
              HK.queryStatisticsForQuantity(
                'HKQuantityTypeIdentifierBasalEnergyBurned',
                ['cumulativeSum'],
                { filter: { date: { startDate: today, endDate: new Date() } } }
              ),
            ]);

            const active = activeStats.status === 'fulfilled'
              ? Math.round(activeStats.value?.sumQuantity?.quantity ?? 0)
              : 0;
            const basal = basalStats.status === 'fulfilled'
              ? Math.round(basalStats.value?.sumQuantity?.quantity ?? 0)
              : 0;

            if (active > 0 || basal > 0) {
              logger.info('[HealthKit] Calories via queryStatisticsForQuantity: active=', active, 'basal=', basal);
              return { active, basal, total: active + basal };
            }
          }
        }
      } catch (statsError) {
        logger.warn('[HealthKit] queryStatisticsForQuantity calories echoue, fallback:', statsError);
      }

      // Méthode 2 : queryQuantitySamples (fallback)
      const queryOptions = this.createQueryOptions(today, new Date());
      if (!queryOptions) {
        return null;
      }

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
        active: Math.round(active * 10) / 10,
        basal: Math.round(basal * 10) / 10,
        total: Math.round((active + basal) * 10) / 10,
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

      // Méthode 1 : queryStatisticsForQuantity (dédoublonnage iPhone + Watch)
      try {
        if (!isRunningInExpoGo) {
          const HK = require('@kingstinct/react-native-healthkit');
          if (typeof HK.queryStatisticsForQuantity === 'function') {
            const stats = await HK.queryStatisticsForQuantity(
              'HKQuantityTypeIdentifierDistanceWalkingRunning',
              ['cumulativeSum'],
              {
                filter: {
                  date: {
                    startDate: today,
                    endDate: new Date(),
                  },
                },
              }
            );

            const raw = stats?.sumQuantity?.quantity ?? 0;
            if (raw > 0) {
              // HealthKit retourne la distance en mètres pour ce type
              // Si la valeur est < 200, elle est probablement déjà en km
              const totalKm = raw > 200 ? Math.round((raw / 1000) * 100) / 100 : Math.round(raw * 100) / 100;
              logger.info('[HealthKit] Distance via queryStatisticsForQuantity:', totalKm, 'km (raw:', raw, ')');
              if (totalKm > 0) {
                return {
                  walking: Math.round(totalKm * 0.6 * 100) / 100,
                  running: Math.round(totalKm * 0.4 * 100) / 100,
                  total: totalKm,
                  unit: 'km',
                };
              }
            }
          }
        }
      } catch (statsError) {
        logger.warn('[HealthKit] queryStatisticsForQuantity distance echoue, fallback:', statsError);
      }

      // Méthode 2 : queryQuantitySamples (fallback)
      const queryOptions = this.createQueryOptions(today, new Date());
      if (!queryOptions) return null;

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierDistanceWalkingRunning', queryOptions);

      if (!samples || !Array.isArray(samples) || samples.length === 0) return null;

      const validSamples = samples.filter((s: any) => s && typeof s.quantity !== 'undefined' && !isNaN(Number(s.quantity)));
      if (validSamples.length === 0) return null;

      const totalRaw = validSamples.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0);
      if (totalRaw <= 0) return null;

      // Détecter l'unité : si > 200, c'est probablement des mètres
      const totalKm = totalRaw > 200
        ? Math.round((totalRaw / 1000) * 100) / 100
        : Math.round(totalRaw * 100) / 100;

      logger.info('[HealthKit] Distance via fallback queryQuantitySamples:', totalKm, 'km (raw:', totalRaw, ')');

      if (totalKm <= 0) return null;

      return {
        walking: Math.round(totalKm * 0.6 * 100) / 100,
        running: Math.round(totalKm * 0.4 * 100) / 100,
        total: totalKm,
        unit: 'km',
      };
    }, 'distance');
  }

  async getTodayDistance(): Promise<HealthData['distance'] | null> {
    return this.getIOSDistance();
  }

  // ============================================
  // EXERCICE & ACTIVITÉ (Anneaux Apple)
  // ============================================

  // Cache partagé pour éviter deux appels HKActivitySummaryQuery dans la même session
  private _activityRingsCache: { exerciseMinutes: number | null; standHours: number | null; activeCalories: number | null } | null = null;

  private async getActivityRings() {
    if (this._activityRingsCache) return this._activityRingsCache;
    const rings = await getTodayActivityRingsNative();
    this._activityRingsCache = rings ?? { exerciseMinutes: null, standHours: null, activeCalories: null };
    return this._activityRingsCache;
  }

  async getTodayExerciseMinutes(): Promise<number | null> {
    const rings = await this.getActivityRings();
    if (rings.exerciseMinutes !== null) return rings.exerciseMinutes;

    // Fallback Nitro (cas où Swift module absent)
    return this.queryHealthKit(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const queryOptions = this.createQueryOptions(today, new Date());
      if (!queryOptions) return null;
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierAppleExerciseTime', queryOptions);
      if (samples && samples.length > 0) {
        return Math.round(samples.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0));
      }
      return null;
    }, 'exerciseMinutes');
  }

  async getTodayStandHours(): Promise<number | null> {
    const rings = await this.getActivityRings();
    if (rings.standHours !== null) return rings.standHours;

    // Fallback Nitro
    return this.queryHealthKit(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const queryOptions = this.createQueryOptions(today, new Date());
      if (!queryOptions) return null;
      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierAppleStandHour', queryOptions);
      if (samples && samples.length > 0) return samples.length;
      return null;
    }, 'standHours');
  }

  async getTodayActivitySummary(): Promise<{
    activeCalories: number | null;
    exerciseMinutes: number | null;
    standHours: number | null;
    goals: { move: number; exercise: number; stand: number };
  }> {
    const [calories, exerciseMinutes, standHours] = await Promise.allSettled([
      this.getTodayCalories(),
      this.getTodayExerciseMinutes(),
      this.getTodayStandHours(),
    ]);

    return {
      activeCalories: calories.status === 'fulfilled' ? (calories.value?.active ?? null) : null,
      exerciseMinutes: exerciseMinutes.status === 'fulfilled' ? exerciseMinutes.value : null,
      standHours: standHours.status === 'fulfilled' ? standHours.value : null,
      goals: { move: 500, exercise: 30, stand: 12 },
    };
  }

  /**
   * Données d'activité des 7 derniers jours (pour le tableau hebdomadaire)
   * Retourne un array de 7 entrées : [{date, calories, exerciseMin, standH}]
   */
  async getWeeklyActivityData(): Promise<Array<{
    date: string;     // 'YYYY-MM-DD'
    calories: number;
    exerciseMin: number;
    standH: number;
  }>> {
    const days: Array<{ date: string; calories: number; exerciseMin: number; standH: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, calories: 0, exerciseMin: 0, standH: 0 });
    }

    try {
      if (!HealthKit || isRunningInExpoGo) return days;

      const from = new Date();
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      const queryOptions = this.createQueryOptions(from, new Date());
      if (!queryOptions) return days;

      const [calRes, exRes, stRes] = await Promise.allSettled([
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', queryOptions),
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierAppleExerciseTime', queryOptions),
        HealthKit.queryCategorySamples('HKCategoryTypeIdentifierAppleStandHour', queryOptions),
      ]);

      if (calRes.status === 'fulfilled' && calRes.value) {
        for (const s of calRes.value) {
          const d = (s.startDate || '').slice(0, 10);
          const entry = days.find(x => x.date === d);
          if (entry) entry.calories += Math.round(s.quantity || 0);
        }
      }
      if (exRes.status === 'fulfilled' && exRes.value) {
        for (const s of exRes.value) {
          const d = (s.startDate || '').slice(0, 10);
          const entry = days.find(x => x.date === d);
          if (entry) entry.exerciseMin += Math.round(s.quantity || 0);
        }
      }
      if (stRes.status === 'fulfilled' && stRes.value) {
        for (const s of stRes.value) {
          const d = (s.startDate || '').slice(0, 10);
          const entry = days.find(x => x.date === d);
          if (entry) entry.standH += 1; // chaque sample = 1h debout
        }
      }
    } catch (e) {
      logger.warn('[HealthKit] getWeeklyActivityData erreur:', e);
    }
    return days;
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
          source: normalizeSourceName(extractIOSSourceName(samples[0])),
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
          source: normalizeSourceName(extractIOSSourceName(samples[0])),
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
          source: normalizeSourceName(extractIOSSourceName(samples[0])),
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
          source: normalizeSourceName(extractIOSSourceName(samples[0])),
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

      // UTILISER Promise.allSettled POUR NE PAS BLOQUER SI 1 ÉCHOUE
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
        // Source: prefer fat sample, then lean sample
        const sourceSample = (fatSamples && fatSamples.length > 0) ? fatSamples[0]
          : (leanSamples && leanSamples.length > 0) ? leanSamples[0] : null;
        return {
          bodyFatPercentage,
          leanBodyMass,
          date: new Date().toISOString(),
          source: sourceSample ? normalizeSourceName(extractIOSSourceName(sourceSample)) : undefined,
        };
      }
      return null;
    }, 'bodyComposition');
  }

  async getBodyComposition(): Promise<HealthData['bodyComposition'] | null> {
    return this.getIOSBodyComposition();
  }

  // ============================================
  // PRESSION ARTÉRIELLE
  // ============================================

  private async getIOSBloodPressure(): Promise<HealthData['bloodPressure'] | null> {
    return this.queryHealthKit(async () => {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const queryOptions = this.createQueryOptions(fromDate, new Date(), { limit: 1, ascending: false });
      if (!queryOptions) return null;

      const [systolicSamples, diastolicSamples] = await Promise.all([
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBloodPressureSystolic', queryOptions),
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBloodPressureDiastolic', queryOptions),
      ]);

      if (systolicSamples?.length > 0 && diastolicSamples?.length > 0) {
        return {
          systolic: Math.round(systolicSamples[0].quantity),
          diastolic: Math.round(diastolicSamples[0].quantity),
          date: systolicSamples[0].startDate,
          source: normalizeSourceName(extractIOSSourceName(systolicSamples[0])),
        };
      }
      return null;
    }, 'bloodPressure');
  }

  async getBloodPressure(): Promise<HealthData['bloodPressure'] | null> {
    return this.getIOSBloodPressure();
  }

  // ============================================
  // GLYCÉMIE
  // ============================================

  private async getIOSBloodGlucose(): Promise<HealthData['bloodGlucose'] | null> {
    return this.queryHealthKit(async () => {
      const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const queryOptions = this.createQueryOptions(fromDate, new Date(), { limit: 1, ascending: false });
      if (!queryOptions) return null;

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBloodGlucose', queryOptions);
      if (samples?.length > 0) {
        // Apple Health stocke en mmol/L (convertit automatiquement selon locale)
        return {
          value: Math.round(samples[0].quantity * 100) / 100,
          unit: 'mmol/L',
          date: samples[0].startDate,
          source: normalizeSourceName(extractIOSSourceName(samples[0])),
        };
      }
      return null;
    }, 'bloodGlucose');
  }

  async getBloodGlucose(): Promise<HealthData['bloodGlucose'] | null> {
    return this.getIOSBloodGlucose();
  }

  async getBloodGlucoseHistory(days: number = 0): Promise<Array<{ date: string; value: number; unit: string }>> {
    if (!HealthKit) return [];
    try {
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);

      const queryOptions = this.createQueryOptions(fromDate, new Date(), { ascending: true, limit: 0 });
      if (!queryOptions) return [];

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBloodGlucose', queryOptions);
      if (!samples || samples.length === 0) return [];

      // Grouper par jour, moyenne par jour
      const byDay: { [key: string]: number[] } = {};
      samples.forEach((s: any) => {
        const date = new Date(s.startDate).toISOString().split('T')[0];
        if (!byDay[date]) byDay[date] = [];
        // HealthKit retourne mmol/L, convertir en mg/dL (* 18.0182)
        byDay[date].push(s.quantity * 18.0182);
      });

      return Object.keys(byDay).sort().map(date => ({
        date,
        value: parseFloat((byDay[date].reduce((a, b) => a + b, 0) / byDay[date].length).toFixed(0)),
        unit: 'mg/dL',
      }));
    } catch (error) {
      logger.error('Erreur lecture historique glycémie:', error);
    }
    return [];
  }

  // ============================================
  // TAILLE
  // ============================================

  private async getIOSHeight(): Promise<HealthData['height'] | null> {
    return this.queryHealthKit(async () => {
      const fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 an
      const queryOptions = this.createQueryOptions(fromDate, new Date(), { limit: 1, ascending: false });
      if (!queryOptions) return null;

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeight', queryOptions);
      if (samples?.length > 0) {
        // Apple Health stocke en mètres
        const heightCm = Math.round(samples[0].quantity * 100);
        return {
          value: heightCm,
          date: samples[0].startDate,
          source: normalizeSourceName(extractIOSSourceName(samples[0])),
        };
      }
      return null;
    }, 'height');
  }

  async getHeight(): Promise<HealthData['height'] | null> {
    return this.getIOSHeight();
  }

  // ============================================
  // ÉTAGES MONTÉS
  // ============================================

  private async getIOSFloorsClimbed(): Promise<HealthData['floorsClimbed'] | null> {
    return this.queryHealthKit(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const queryOptions = this.createQueryOptions(today, new Date());
      if (!queryOptions) return null;

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierFlightsClimbed', queryOptions);
      if (samples?.length > 0) {
        const total = samples.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
        return {
          count: Math.round(total),
          date: today.toISOString(),
          source: normalizeSourceName(extractIOSSourceName(samples[0])),
        };
      }
      return null;
    }, 'floorsClimbed');
  }

  async getFloorsClimbed(): Promise<HealthData['floorsClimbed'] | null> {
    return this.getIOSFloorsClimbed();
  }

  // ============================================
  // MINUTES DE PLEINE CONSCIENCE
  // ============================================

  private async getIOSMindfulMinutes(): Promise<HealthData['mindfulMinutes'] | null> {
    return this.queryHealthKit(async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const queryOptions = this.createQueryOptions(today, new Date());
      if (!queryOptions) return null;

      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierMindfulSession', queryOptions);
      if (samples?.length > 0) {
        // Chaque sample = une session, durée = endDate - startDate
        const totalMinutes = samples.reduce((sum: number, s: any) => {
          const durationMs = new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
          return sum + durationMs / 60000;
        }, 0);
        return {
          minutes: Math.round(totalMinutes),
          date: today.toISOString(),
          source: normalizeSourceName(extractIOSSourceName(samples[0])),
        };
      }
      return null;
    }, 'mindfulMinutes');
  }

  async getMindfulMinutes(): Promise<HealthData['mindfulMinutes'] | null> {
    return this.getIOSMindfulMinutes();
  }

  // ============================================
  // WORKOUTS
  // ============================================

  /**
   * Hash simple compatible React Native (pas de Buffer)
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

  // Extrait la valeur numérique d'un champ qui peut être un nombre OU un objet Quantity v13 {quantity, unit}
  private extractQuantityValue(raw: any): number | undefined {
    if (raw == null) return undefined;
    if (typeof raw === 'number' && isFinite(raw)) return raw;
    // Objet Quantity v13 : { quantity: number, unit: string }
    if (typeof raw === 'object' && typeof raw.quantity === 'number' && isFinite(raw.quantity)) return raw.quantity;
    return undefined;
  }

  // Mappe un tableau de WorkoutProxy bruts en objets normalisés Yoroi
  // Appelle getStatistic('heartRate') sur chaque WorkoutProxy pour obtenir FC moy/max
  private async mapRawWorkouts(rawWorkouts: any[]): Promise<any[]> {
    const mapped: any[] = [];
    for (const workout of rawWorkouts) {
      try {
        const startRaw = workout.startDate;
        const endRaw = workout.endDate;
        const startDate = startRaw instanceof Date ? startRaw : new Date(String(startRaw));
        const endDate = endRaw instanceof Date ? endRaw : new Date(String(endRaw));
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          logger.warn('[HealthKit] Workout avec dates invalides, ignoré');
          continue;
        }
        const startStr = startDate.toISOString();
        const endStr = endDate.toISOString();
        const activityType = workout.workoutActivityType ?? workout.workoutActivity ?? 'Unknown';
        const uuid = workout.uuid ?? workout.id;
        const fingerprint = `${startStr}_${endStr}_${activityType}`;
        const deterministicId = uuid || `workout_${this.simpleHash(fingerprint)}`;

        const durationMs = endDate.getTime() - startDate.getTime();
        const durationMin = Math.max(0, Math.round(durationMs / 60000));

        // En v13 Nitro, totalDistance et totalEnergyBurned sont des Quantity {quantity, unit}
        // La distance est en MÈTRES, on convertit en km
        const distanceMeters = this.extractQuantityValue(workout.totalDistance ?? workout.distance);
        const caloriesKcal = this.extractQuantityValue(workout.totalEnergyBurned ?? workout.calories);

        // FC : averageHeartRate/maxHeartRate ne sont PAS des propriétés directes de HKWorkout.
        // Il faut appeler getStatistic('heartRate') sur le WorkoutProxy Nitro.
        let hrAvg: number | undefined;
        let hrMax: number | undefined;
        try {
          if (typeof workout.getStatistic === 'function') {
            const hrStat = await workout.getStatistic('heartRate', 'count/min');
            if (hrStat) {
              const avg = this.extractQuantityValue(hrStat.averageQuantity);
              const max = this.extractQuantityValue(hrStat.maximumQuantity);
              if (avg != null && avg > 0) hrAvg = Math.round(avg);
              if (max != null && max > 0) hrMax = Math.round(max);
            }
          }
        } catch (_hrErr) {
          // getStatistic peut échouer si la FC n'était pas enregistrée pour cette séance
        }

        mapped.push({
          id: deterministicId,
          hkUUID: uuid || undefined,
          activityType: String(activityType),
          startDate: startStr,
          endDate: endStr,
          duration: durationMin,
          distance: distanceMeters != null ? Math.round(distanceMeters / 1000 * 10) / 10 : undefined,
          calories: caloriesKcal != null ? Math.round(caloriesKcal) : undefined,
          averageHeartRate: hrAvg,
          maxHeartRate: hrMax,
          source: workout.sourceRevision?.source?.name || undefined,
        });
      } catch (mapErr) {
        logger.warn('[HealthKit] Erreur mapping workout individuel:', mapErr);
      }
    }
    return mapped;
  }

  private async getIOSWorkouts(days?: number): Promise<HealthData['workouts'] | null> {
    return this.queryHealthKit(async () => {
      // limit: 0 = HKObjectQueryNoLimit (tous les workouts)
      let filter: any;
      if (days) {
        const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        filter = { date: { startDate: fromDate, endDate: new Date() } };
      }

      // === MÉTHODE 1: queryWorkoutSamples ===
      let rawWorkouts: any[] = [];
      try {
        const opts: any = { limit: 0 };
        if (filter) opts.filter = filter;
        const samples = await HealthKit.queryWorkoutSamples(opts);
        if (samples) rawWorkouts = samples;
        console.log('[getIOSWorkouts] M1 queryWorkoutSamples →', rawWorkouts.length, 'workout(s)');
      } catch (e: any) {
        console.log('[getIOSWorkouts] M1 erreur:', e?.message);
      }

      // === MÉTHODE 2: queryWorkoutSamplesWithAnchor (fallback si méthode 1 retourne 0) ===
      if (rawWorkouts.length === 0) {
        try {
          const opts: any = { limit: 0 };
          if (filter) opts.filter = filter;
          const anchorResult = await HealthKit.queryWorkoutSamplesWithAnchor(opts);
          if (anchorResult?.workouts?.length > 0) {
            rawWorkouts = anchorResult.workouts;
            console.log('[getIOSWorkouts] M2 queryWorkoutSamplesWithAnchor →', rawWorkouts.length, 'workout(s)');
          } else {
            console.log('[getIOSWorkouts] M2 → 0 workout(s)');
          }
        } catch (e: any) {
          console.log('[getIOSWorkouts] M2 erreur:', e?.message);
        }
      }

      // === MÉTHODE 3: Module natif Swift direct (contournement total du bridge Nitro) ===
      if (rawWorkouts.length === 0) {
        try {
          const daysParam = days ?? 0;
          console.log('[getIOSWorkouts] M3 module Swift natif, days=' + daysParam);
          const nativeWorkouts = await getNativeWorkouts(daysParam);
          console.log('[getIOSWorkouts] M3 résultat:', nativeWorkouts.length, 'workout(s)');
          if (nativeWorkouts.length > 0) {
            rawWorkouts = nativeWorkouts.map(w => ({
              uuid: w.uuid,
              startDate: new Date(w.startDate),  // timestamp ms → Date
              endDate: new Date(w.endDate),
              workoutActivityType: w.workoutActivityType,
              totalDistance: w.totalDistance > 0 ? { quantity: w.totalDistance, unit: 'm' } : undefined,
              totalEnergyBurned: w.totalEnergyBurned > 0 ? { quantity: w.totalEnergyBurned, unit: 'kcal' } : undefined,
              sourceRevision: { source: { name: w.sourceName } },
            }));
          }
        } catch (e: any) {
          console.log('[getIOSWorkouts] M3 erreur:', e?.message);
        }
      }

      if (rawWorkouts.length === 0) {
        console.log('[getIOSWorkouts] TOUTES LES MÉTHODES ont retourné 0 workout');
        return null;
      }

      const mapped = await this.mapRawWorkouts(rawWorkouts);
      console.log('[getIOSWorkouts] ', mapped.length, 'workout(s) mappés avec succès');
      return mapped.length > 0 ? mapped : null;
    }, 'workouts');
  }

  async getWorkouts(): Promise<HealthData['workouts'] | null> {
    return this.getIOSWorkouts();
  }

  /**
   * Vérifie si les permissions Entraînements sont accordées dans Apple Santé.
   * Tente de lire 1 séance récente avec un timeout court (5s).
   * Retourne { accessible: true, count: N } ou { accessible: false, count: 0 }
   */
  async canReadWorkouts(): Promise<{ accessible: boolean; count: number }> {
    try {
      // Utiliser 365 jours pour couvrir les utilisateurs dont le dernier workout
      // date de plus d'un mois (évite les faux-négatifs de permission)
      const result = await this.withTimeout(this.getIOSWorkouts(365), 8000);
      if (!result) return { accessible: false, count: 0 };
      return { accessible: true, count: (result as any[]).length };
    } catch {
      return { accessible: false, count: 0 };
    }
  }

  /**
   * Diagnostic complet : teste le module, les permissions, et retourne ce que HealthKit voit.
   */
  async diagnoseWorkouts(): Promise<{
    moduleLoaded: boolean;
    isConnected: boolean;
    healthkit30d: number;
    healthkitAll: number;
    activityTypes: string[];
    dbCount: number;
    dbFromHealthkit: number;
    cacheSize: number;
    error: string | null;
    rawApiTest: number;
    rawApiError: string | null;
    anchorApiTest: number;
    anchorApiError: string | null;
    nativeModuleTest: number;
    authStatus: string | null;
    nativeDiag: NativeDiagnosticResult | null;  // résultat 3 tests Gemini
  }> {
    const diag = {
      moduleLoaded: isHealthKitAvailable,
      isConnected: this.syncStatus.isConnected,
      healthkit30d: 0,
      healthkitAll: 0,
      activityTypes: [] as string[],
      dbCount: 0,
      dbFromHealthkit: 0,
      cacheSize: 0,
      error: null as string | null,
      rawApiTest: -1,
      rawApiError: null as string | null,
      anchorApiTest: -1,
      anchorApiError: null as string | null,
      nativeModuleTest: -1,
      authStatus: null as string | null,
      nativeDiag: null as NativeDiagnosticResult | null,
    };

    // Compter les séances en base
    try {
      const counts = await getTrainingsCount();
      diag.dbCount = counts.total;
      diag.dbFromHealthkit = counts.fromHealthkit;
    } catch (e: any) { diag.error = `DB: ${e?.message}`; }

    // Tester le cache AsyncStorage
    try {
      const cached = await AsyncStorage.getItem('@yoroi_imported_workouts');
      diag.cacheSize = cached ? JSON.parse(cached).length : 0;
    } catch {}

    if (!isHealthKitAvailable) return diag;

    // === VÉRIFIER LE STATUT DE PERMISSION POUR LES ENTRAÎNEMENTS ===
    try {
      const status = await HealthKit.authorizationStatusFor('HKWorkoutTypeIdentifier');
      // 0 = notDetermined, 1 = sharingDenied, 2 = sharingAuthorized
      const statusMap: Record<number, string> = { 0: 'notDetermined', 1: 'sharingDenied', 2: 'sharingAuthorized' };
      diag.authStatus = statusMap[status as number] ?? String(status);
    } catch (e: any) {
      diag.authStatus = `erreur: ${e?.message}`;
    }

    // === TEST DIRECT DE L'API queryWorkoutSamples ===
    try {
      const rawSamples = await Promise.race([
        HealthKit.queryWorkoutSamples({ limit: 10 }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout 8s')), 8000)),
      ]) as any[];
      diag.rawApiTest = rawSamples?.length ?? 0;
    } catch (e: any) {
      diag.rawApiTest = -2; // -2 = erreur
      diag.rawApiError = e?.message ?? String(e);
    }

    // === TEST AVEC queryWorkoutSamplesWithAnchor (API alternative, sans sort descriptor) ===
    try {
      const anchorResult = await Promise.race([
        HealthKit.queryWorkoutSamplesWithAnchor({ limit: 10 }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout 8s')), 8000)),
      ]) as any;
      diag.anchorApiTest = anchorResult?.workouts?.length ?? 0;
    } catch (e: any) {
      diag.anchorApiTest = -2;
      diag.anchorApiError = e?.message ?? String(e);
    }

    // === TEST MODULE NATIF SWIFT (contournement total Nitro, String JSON) ===
    try {
      const nativeResult = await Promise.race([
        getNativeWorkouts(365),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout 10s')), 10000)),
      ]);
      diag.nativeModuleTest = nativeResult.length;
    } catch (e: any) {
      diag.nativeModuleTest = -2;
    }

    // === DIAGNOSTIC APPROFONDI SWIFT (3 tests Gemini) ===
    // Test A : HKSourceQuery (sources enregistrées)
    // Test B : requête nucléaire sans predicate (OS bloque-t-il tout ?)
    // Test C : requête avec predicate 365j (bug timestamps ?)
    try {
      diag.nativeDiag = await Promise.race([
        runNativeDiagnostic(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout 15s')), 15000)),
      ]);
    } catch (e: any) {
      console.log('[HealthConnect] runNativeDiagnostic timeout/erreur:', e?.message);
    }

    // Tester HealthKit 365 jours (le user peut avoir son dernier workout à > 30 jours)
    try {
      const r365 = await this.withTimeout(this.getIOSWorkouts(365), 10000);
      diag.healthkit30d = r365 ? r365.length : 0; // champ réutilisé pour 365j
      if (r365 && r365.length > 0) {
        const types = [...new Set(r365.map(w => String(w.activityType)))].slice(0, 10);
        diag.activityTypes = types.map(t => {
          const mapped = mapWorkoutType(t);
          return `${mapped} (${t})`;
        });
      }
    } catch (e: any) { diag.error = `HK365j: ${e?.message}`; }

    // Tester HealthKit tout l'historique (timeout 30s)
    try {
      const rAll = await this.withTimeout(this.getIOSWorkouts(), 30000);
      diag.healthkitAll = rAll ? rAll.length : 0;
    } catch (e: any) {
      diag.healthkitAll = -1; // timeout ou erreur
      if (!diag.error) diag.error = `HKAll: ${e?.message}`;
    }

    return diag;
  }

  /**
   * Re-demande les permissions HealthKit (utile si l'utilisateur les avait refusées).
   * Sur iOS, cela rouvre le dialogue de permissions Apple Santé.
   */
  async requestWorkoutPermissions(): Promise<void> {
    try {
      await this.requestIOSPermissionsSimple();
    } catch { /* iOS peut ignorer silencieusement */ }
  }

  /**
   * Recuperer les details enrichis d'un workout depuis HealthKit.
   * Strategie: requeter le JOUR EXACT du workout (rapide), puis matcher par heure/durée.
   * Inclut: route GPS, FC detaillee, splits, météo, elevation.
   */
  async getWorkoutDetailsByUUID(
    uuid: string,
    fallbackStartDate?: string,
    fallbackDurationMin?: number,
  ): Promise<WorkoutDetails | null> {
    if (!HealthKit || isRunningInExpoGo) return null;

    try {
      // === STRATEGIE 1: Requeter le jour exact du workout (rapide, ~1-10 resultats) ===
      let samples: any[] = [];

      if (fallbackStartDate) {
        const targetDate = new Date(fallbackStartDate);
        if (!isNaN(targetDate.getTime())) {
          // Fenetre = jour entier (00:00 a 23:59)
          const dayStart = new Date(targetDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(targetDate);
          dayEnd.setHours(23, 59, 59, 999);

          try {
            samples = await HealthKit.queryWorkoutSamples({
              filter: { date: { startDate: dayStart, endDate: dayEnd } },
              limit: 50,
            }) || [];
            logger.info(`[HealthKit] Query jour exact (${dayStart.toISOString().split('T')[0]}): ${samples.length} workouts`);
          } catch (e) {
            logger.warn('[HealthKit] Erreur query jour exact:', e);
          }
        }
      }

      // === STRATEGIE 2: Si pas de resultats, requeter 7 jours autour ===
      if (samples.length === 0 && fallbackStartDate) {
        const targetDate = new Date(fallbackStartDate);
        if (!isNaN(targetDate.getTime())) {
          const weekStart = new Date(targetDate.getTime() - 3 * 24 * 60 * 60 * 1000);
          const weekEnd = new Date(targetDate.getTime() + 3 * 24 * 60 * 60 * 1000);
          try {
            samples = await HealthKit.queryWorkoutSamples({
              filter: { date: { startDate: weekStart, endDate: weekEnd } },
              limit: 100,
            }) || [];
            logger.info(`[HealthKit] Query semaine: ${samples.length} workouts`);
          } catch (e) {
            logger.warn('[HealthKit] Erreur query semaine:', e);
          }
        }
      }

      // === STRATEGIE 3: Dernier recours - 90 derniers jours ===
      if (samples.length === 0) {
        try {
          samples = await HealthKit.queryWorkoutSamples({
            filter: { date: { startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), endDate: new Date() } },
            limit: 500,
          }) || [];
          logger.info(`[HealthKit] Query 90j fallback: ${samples.length} workouts`);
        } catch (e) {
          logger.warn('[HealthKit] Erreur query 90j:', e);
        }
      }

      if (!samples || samples.length === 0) {
        logger.warn('[HealthKit] Aucun workout trouve dans HealthKit');
        return null;
      }

      // === MATCHING: trouver le bon workout ===
      let workout: any = null;

      // 1. UUID exact
      if (uuid && uuid !== 'fallback') {
        workout = samples.find((w: any) => w.uuid === uuid || w.id === uuid);
        if (workout) logger.info('[HealthKit] Workout trouve par UUID exact');
      }

      // 2. Par heure de debut (tolerance 5 min) - LE PLUS FIABLE
      if (!workout && fallbackStartDate) {
        const targetMs = new Date(fallbackStartDate).getTime();
        if (!isNaN(targetMs)) {
          // Si on a la durée, on peut affiner le match
          const candidates = samples.filter((w: any) => {
            const wStart = new Date(w.startDate).getTime();
            return Math.abs(wStart - targetMs) < 300000; // 5 min tolerance
          });

          if (candidates.length === 1) {
            workout = candidates[0];
          } else if (candidates.length > 1 && fallbackDurationMin) {
            // Plusieurs candidats -> matcher aussi par durée
            workout = candidates.find((w: any) => {
              const wDur = (new Date(w.endDate).getTime() - new Date(w.startDate).getTime()) / 60000;
              return Math.abs(wDur - fallbackDurationMin) < 5; // 5 min tolerance durée
            }) || candidates[0]; // Sinon prendre le premier
          } else if (candidates.length > 1) {
            workout = candidates[0];
          }

          if (workout) logger.info(`[HealthKit] Workout trouve par date/heure (parmi ${candidates.length} candidats)`);
        }
      }

      // 3. Dernier recours: le workout le plus proche en temps
      if (!workout && fallbackStartDate) {
        const targetMs = new Date(fallbackStartDate).getTime();
        if (!isNaN(targetMs)) {
          let bestDiff = Infinity;
          for (const w of samples) {
            const diff = Math.abs(new Date(w.startDate).getTime() - targetMs);
            if (diff < bestDiff && diff < 3600000) { // Max 1h d'ecart
              bestDiff = diff;
              workout = w;
            }
          }
          if (workout) logger.info(`[HealthKit] Workout trouve par proximite temporelle (${Math.round(bestDiff/1000)}s d'ecart)`);
        }
      }

      if (!workout) {
        logger.warn('[HealthKit] Workout non trouve. UUID:', uuid, 'date:', fallbackStartDate, 'samples:', samples.length);
        if (samples.length > 0) {
          // Log les dates des samples pour debug
          const sampleDates = samples.slice(0, 5).map((w: any) => w.startDate);
          logger.warn('[HealthKit] Premiers samples dates:', JSON.stringify(sampleDates));
        }
        return null;
      }

      const details: WorkoutDetails = {};

      // LOG DEBUG: dump brut du workout pour voir toutes les données Apple disponibles
      if (__DEV__) {
        const rawEvents = (workout.events || []) as any[];
        logger.info('[HealthKit] workout.uuid:', workout.uuid);
        logger.info('[HealthKit] workout.metadata keys:', Object.keys(workout.metadata || {}));
        logger.info('[HealthKit] workout.metadata values:', JSON.stringify(workout.metadata || {}));
        logger.info('[HealthKit] workout.events count:', rawEvents.length);
        if (rawEvents.length > 0) {
          logger.info('[HealthKit] workout.events[0] raw:', JSON.stringify(rawEvents[0]));
          // Log tous les events segment (type 7) pour voir si Apple y stocke des infos de zone
          const segmentEvents = rawEvents.filter((e: any) => e.type === 7);
          if (segmentEvents.length > 0) {
            logger.info('[HealthKit] Segment events (type 7):', JSON.stringify(segmentEvents));
          }
        }
      }

      // Duration
      const durationMs = new Date(workout.endDate).getTime() - new Date(workout.startDate).getTime();
      // Garder les secondes (ex: 32.933 min = 32 min 56 sec) pour afficher "0:32:56" comme Apple
      details.durationMinutes = durationMs / 60000;

      // Indoor
      details.isIndoor = workout.metadataIndoorWorkout ?? false;

      // Elevation — plusieurs noms possibles selon la version du SDK react-native-health
      const elevAscRaw = workout.metadataElevationAscended
        ?? workout.metadata?.HKElevationAscended
        ?? workout.metadata?.['HKMetadataKeyElevationAscended'];
      if (elevAscRaw != null) {
        const val = typeof elevAscRaw === 'object' ? elevAscRaw.quantity : Number(elevAscRaw);
        if (!isNaN(val) && val > 0) details.elevationAscended = Math.round(val);
      }
      const elevDescRaw = workout.metadataElevationDescended
        ?? workout.metadata?.HKElevationDescended
        ?? workout.metadata?.['HKMetadataKeyElevationDescended'];
      if (elevDescRaw != null) {
        const val = typeof elevDescRaw === 'object' ? elevDescRaw.quantity : Number(elevDescRaw);
        if (!isNaN(val) && val > 0) details.elevationDescended = Math.round(val);
      }

      // Météo (directement sur le sample HealthKit)
      if (workout.metadataWeatherTemperature) {
        details.weatherTemp = Math.round(workout.metadataWeatherTemperature.quantity * 10) / 10;
      }
      if (workout.metadataWeatherHumidity) {
        details.weatherHumidity = Math.round(workout.metadataWeatherHumidity.quantity);
      }
      if (workout.metadataWeatherCondition) {
        details.weatherCondition = String(workout.metadataWeatherCondition);
      }

      // Qualité de l'air (metadata custom Apple, pas toujours present)
      // Apple stocke l'AQI dans les metadata du workout si l'app Weather l'a enregistre
      const workoutMeta = workout.metadata || {};
      // Log les cles de metadata disponibles (debug)
      if (__DEV__ && Object.keys(workoutMeta).length > 0) {
        logger.info('[HealthKit] Metadata workout disponibles:', Object.keys(workoutMeta));
      }
      const rawAqi = workout.metadataWeatherAirQualityIndex
        ?? workoutMeta.HKWeatherAirQualityIndex
        ?? workoutMeta.HKMetadataKeyWeatherAirQualityIndex;
      if (rawAqi != null) {
        const aqi = Number(rawAqi);
        if (!isNaN(aqi) && aqi > 0) {
          details.airQualityIndex = aqi;
          if (aqi <= 50) details.airQualityCategory = 'Bon';
          else if (aqi <= 100) details.airQualityCategory = 'Modere';
          else if (aqi <= 150) details.airQualityCategory = 'Mauvais pour groupes sensibles';
          else if (aqi <= 200) details.airQualityCategory = 'Mauvais';
          else if (aqi <= 300) details.airQualityCategory = 'Tres mauvais';
          else details.airQualityCategory = 'Dangereux';
        }
      }

      // Stats (distance, calories) via getAllStatistics()
      try {
        if (typeof workout.getAllStatistics === 'function') {
          const stats = await workout.getAllStatistics();

          // Distance — couvre course/marche, vélo, natation, ski/snowboard
          const distStat = stats['HKQuantityTypeIdentifierDistanceWalkingRunning']
            || stats['HKQuantityTypeIdentifierDistanceCycling']
            || stats['HKQuantityTypeIdentifierDistanceSwimming']
            || stats['HKQuantityTypeIdentifierDistanceDownhillSnowSports'];
          if (distStat?.sumQuantity) {
            details.distanceKm = Math.round(distStat.sumQuantity.quantity / 1000 * 100) / 100;
          }

          // Calories actives
          const calStat = stats['HKQuantityTypeIdentifierActiveEnergyBurned'];
          if (calStat?.sumQuantity) {
            details.activeCalories = Math.round(calStat.sumQuantity.quantity);
          }

          // Calories totales (active + basal pendant le workout)
          const basalStat = stats['HKQuantityTypeIdentifierBasalEnergyBurned'];
          details.totalCalories = (details.activeCalories || 0) + Math.round(basalStat?.sumQuantity?.quantity || 0);

          // FC moy/min/max
          const hrStat = stats['HKQuantityTypeIdentifierHeartRate'];
          if (hrStat) {
            if (hrStat.averageQuantity) details.avgHeartRate = Math.round(hrStat.averageQuantity.quantity);
            if (hrStat.minimumQuantity) details.minHeartRate = Math.round(hrStat.minimumQuantity.quantity);
            if (hrStat.maximumQuantity) details.maxHeartRate = Math.round(hrStat.maximumQuantity.quantity);
          }
        }
      } catch (statsErr) {
        logger.warn('[HealthKit] Erreur getAllStatistics:', statsErr);
      }

      // Allure moyenne
      if (details.distanceKm && details.distanceKm > 0 && details.durationMinutes) {
        details.avgPaceSecondsPerKm = Math.round((details.durationMinutes * 60) / details.distanceKm);
      }

      // Route GPS via getWorkoutRoutes()
      let allGpsLocations: any[] = [];
      try {
        if (typeof workout.getWorkoutRoutes === 'function') {
          const routes = await workout.getWorkoutRoutes();
          if (routes && routes.length > 0) {
            const allLocations = routes.flatMap((r: any) => r.locations || []);
            allGpsLocations = allLocations;
            if (allLocations.length > 0) {
              details.routePoints = allLocations.map((loc: any) => ({
                latitude: loc.latitude,
                longitude: loc.longitude,
                altitude: loc.altitude,
                speed: loc.speed,
                timestamp: loc.date ? new Date(loc.date).toISOString() : undefined,
              }));

              // Bounding box
              const lats = allLocations.map((l: any) => l.latitude);
              const lons = allLocations.map((l: any) => l.longitude);
              details.routeBoundingBox = {
                minLat: Math.min(...lats),
                maxLat: Math.max(...lats),
                minLon: Math.min(...lons),
                maxLon: Math.max(...lons),
              };

              // Point de départ GPS (pour afficher la localisation même sans route complète)
              details.startLatitude = allLocations[0].latitude;
              details.startLongitude = allLocations[0].longitude;

              // Splits seront calcules apres HR (pour inclure avgHeartRate par split)
              if (details.distanceKm && details.distanceKm > 0.5) {
                details.splits = this.computeSplits(allLocations);
              }
            }
          }
        }
      } catch (routeErr) {
        logger.warn('[HealthKit] Erreur getWorkoutRoutes:', routeErr);
      }

      // FC echantillons detailles (pendant le workout)
      let rawHrSamples: any[] = [];
      try {
        const hrOptions = this.createQueryOptions(
          new Date(workout.startDate),
          new Date(workout.endDate),
          { limit: 0, ascending: true }
        );
        if (hrOptions) {
          const hrSamples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', hrOptions);
          if (hrSamples && hrSamples.length > 0) {
            rawHrSamples = hrSamples;
            details.heartRateSamples = hrSamples.map((s: any) => ({
              timestamp: new Date(s.startDate).toISOString(),
              bpm: Math.round(s.quantity),
            }));

            // Zones FC: lire le vrai maxHR personnel depuis les metadonnees Apple Watch du workout
            // Apple Watch ecrit HKMaximumHeartRate dans chaque workout = max HR personnel utilise pour calculer les zones
            let maxHR = 190; // fallback
            try {
              // 1. Priorite: lire HKMaximumHeartRate depuis les metadonnees du workout (ecrit par Apple Watch)
              const metaMaxHR = workoutMeta['HKMaximumHeartRate'];
              if (metaMaxHR != null) {
                const metaVal = typeof metaMaxHR === 'object'
                  ? ((metaMaxHR as any).quantity ?? (metaMaxHR as any).value ?? Number(metaMaxHR))
                  : Number(metaMaxHR);
                if (!isNaN(metaVal) && metaVal > 100 && metaVal < 250) {
                  maxHR = Math.round(metaVal);
                  logger.info('[HealthKit] maxHR lu depuis metadata workout:', maxHR);
                }
              } else {
                // 2. Fallback: date de naissance -> 220-age
                const dob = HealthKit.getDateOfBirth ? HealthKit.getDateOfBirth() : undefined;
                if (dob) {
                  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                  if (age > 10 && age < 100) maxHR = 220 - age;
                }
              }
            } catch (e) {
              logger.warn('[HealthKit] Impossible de lire maxHR:', e);
            }

            // Seuils zones Apple Fitness (identiques a Apple Sante/Forme):
            // Z1<63%  Z2:63-71%  Z3:71-79%  Z4:79-90%  Z5>90% de FCmax
            // Valide pour FCmax=190 → 120 / 135 / 150 / 171 BPM (= ce qu'Apple affiche)
            const z1Max = Math.round(maxHR * 0.63);
            const z2Max = Math.round(maxHR * 0.71);
            const z3Max = Math.round(maxHR * 0.79);
            const z4Max = Math.round(maxHR * 0.90);

            const zones = [
              { zone: 1, name: 'Z1 Recup', minBpm: 0, maxBpm: z1Max, durationSeconds: 0, color: '#94A3B8' },
              { zone: 2, name: 'Z2 Endurance', minBpm: z1Max, maxBpm: z2Max, durationSeconds: 0, color: '#22C55E' },
              { zone: 3, name: 'Z3 Tempo', minBpm: z2Max, maxBpm: z3Max, durationSeconds: 0, color: '#EAB308' },
              { zone: 4, name: 'Z4 Seuil', minBpm: z3Max, maxBpm: z4Max, durationSeconds: 0, color: '#F97316' },
              { zone: 5, name: 'Z5 Max', minBpm: z4Max, maxBpm: 250, durationSeconds: 0, color: '#EF4444' },
            ];

            // Durée dans chaque zone
            for (let i = 0; i < hrSamples.length - 1; i++) {
              const bpm = hrSamples[i].quantity;
              const gap = (new Date(hrSamples[i + 1].startDate).getTime() - new Date(hrSamples[i].startDate).getTime()) / 1000;
              if (gap > 0 && gap < 300) { // Max 5 min entre 2 echantillons
                for (const zone of zones) {
                  if (bpm >= zone.minBpm && bpm < zone.maxBpm) {
                    zone.durationSeconds += gap;
                    break;
                  }
                }
              }
            }

            details.heartRateZones = zones;
            details.cacheVersion = 5; // v5: AQI Open-Meteo + FC getStatistic

            // Recalculer splits avec avgHeartRate par split si on a des GPS locations
            if (allGpsLocations.length > 0 && details.distanceKm && details.distanceKm > 0.5) {
              details.splits = this.computeSplits(allGpsLocations, hrSamples);
            }
          }
        }
      } catch (hrErr) {
        logger.warn('[HealthKit] Erreur FC detaillee:', hrErr);
      }

      // Recovery HR: querier les HR samples dans les 3 min apres la fin du workout
      try {
        if (rawHrSamples.length > 0) {
          const workoutEndTime = new Date(workout.endDate).getTime();
          const recoveryEnd = new Date(workoutEndTime + 3 * 60 * 1000); // +3 min

          const recoveryOptions = this.createQueryOptions(
            new Date(workout.endDate),
            recoveryEnd,
            { limit: 0, ascending: true }
          );
          if (recoveryOptions) {
            const recoverySamples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', recoveryOptions);
            if (recoverySamples && recoverySamples.length > 0) {
              // FC a la fin du workout (dernier sample pendant le workout)
              const lastWorkoutHR = rawHrSamples[rawHrSamples.length - 1];
              const atEnd = Math.round(lastWorkoutHR.quantity);

              // FC apres 1 min
              const after1MinSample = recoverySamples.find((s: any) => {
                const t = new Date(s.startDate).getTime();
                return t >= workoutEndTime + 50 * 1000 && t <= workoutEndTime + 90 * 1000;
              });

              // FC apres 2 min
              const after2MinSample = recoverySamples.find((s: any) => {
                const t = new Date(s.startDate).getTime();
                return t >= workoutEndTime + 100 * 1000 && t <= workoutEndTime + 150 * 1000;
              });

              details.recoveryHR = {
                atEnd,
                after1Min: after1MinSample ? Math.round(after1MinSample.quantity) : undefined,
                after2Min: after2MinSample ? Math.round(after2MinSample.quantity) : undefined,
              };
            }
          }
        }
      } catch (recoveryErr) {
        logger.warn('[HealthKit] Erreur Recovery HR:', recoveryErr);
      }

      // Qualité de l'air via Open-Meteo (gratuit, sans clé) si pas dans metadata HK
      // Nécessite une localisation GPS (outdoor uniquement)
      if (details.airQualityIndex == null && details.startLatitude != null && details.startLongitude != null) {
        try {
          const workoutDate = new Date(workout.startDate);
          const dateStr = workoutDate.toISOString().split('T')[0];
          const hour = workoutDate.getHours();
          const lat = details.startLatitude.toFixed(4);
          const lon = details.startLongitude.toFixed(4);
          const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=us_aqi&start_date=${dateStr}&end_date=${dateStr}&timezone=auto`;
          const aqiRes = await Promise.race([
            fetch(aqiUrl),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
          ]) as Response;
          if (aqiRes.ok) {
            const aqiData = await aqiRes.json();
            const aqiValue = aqiData?.hourly?.us_aqi?.[hour];
            if (aqiValue != null && aqiValue >= 0) {
              details.airQualityIndex = aqiValue;
              if (aqiValue <= 50) details.airQualityCategory = 'Bon';
              else if (aqiValue <= 100) details.airQualityCategory = 'Modere';
              else if (aqiValue <= 150) details.airQualityCategory = 'Mauvais pour groupes sensibles';
              else if (aqiValue <= 200) details.airQualityCategory = 'Mauvais';
              else if (aqiValue <= 300) details.airQualityCategory = 'Tres mauvais';
              else details.airQualityCategory = 'Dangereux';
              logger.info('[HealthKit] AQI Open-Meteo:', aqiValue, details.airQualityCategory);
            }
          }
        } catch (aqiErr) {
          logger.warn('[HealthKit] Erreur fetch AQI Open-Meteo:', aqiErr);
        }
      }

      logger.info('[HealthKit] WorkoutDetails charge:', {
        hasRoute: !!details.routePoints?.length,
        hasHR: !!details.heartRateSamples?.length,
        hasSplits: !!details.splits?.length,
        hasMeteo: !!details.weatherTemp,
        hasAQI: details.airQualityIndex != null,
        hasRecoveryHR: !!details.recoveryHR,
      });

      return details;
    } catch (error) {
      logger.error('[HealthKit] Erreur getWorkoutDetailsByUUID:', error);
      return null;
    }
  }

  /**
   * Calculer les splits par km a partir des points GPS
   */
  private computeSplits(locations: any[], hrSamples?: any[]): WorkoutDetails['splits'] {
    if (locations.length < 2) return [];

    const splits: NonNullable<WorkoutDetails['splits']> = [];
    let kmCounter = 1;
    let distAccum = 0;
    let splitStartIdx = 0;

    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];

      // Distance Haversine simple
      const R = 6371000;
      const dLat = (curr.latitude - prev.latitude) * Math.PI / 180;
      const dLon = (curr.longitude - prev.longitude) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(prev.latitude * Math.PI / 180) * Math.cos(curr.latitude * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distAccum += d;

      if (distAccum >= 1000) {
        const startTime = new Date(locations[splitStartIdx].date).getTime();
        const endTime = new Date(curr.date).getTime();
        const splitSec = (endTime - startTime) / 1000;
        const elevGain = Math.max(0, (curr.altitude || 0) - (locations[splitStartIdx].altitude || 0));

        // Calculer avgHeartRate pour ce split depuis les HR samples
        let avgHeartRate: number | undefined;
        if (hrSamples && hrSamples.length > 0) {
          const splitHR = hrSamples.filter((s: any) => {
            const t = new Date(s.startDate).getTime();
            return t >= startTime && t <= endTime;
          });
          if (splitHR.length > 0) {
            avgHeartRate = Math.round(splitHR.reduce((sum: number, s: any) => sum + s.quantity, 0) / splitHR.length);
          }
        }

        splits.push({
          index: kmCounter,
          distanceKm: 1,
          paceSecondsPerKm: Math.round(splitSec),
          durationSeconds: Math.round(splitSec),
          elevationGain: Math.round(elevGain),
          avgHeartRate,
        });

        kmCounter++;
        distAccum -= 1000;
        splitStartIdx = i;
      }
    }

    return splits;
  }

  /**
   * Charge les details enrichis d'un workout HealthKit et les stocke en DB.
   * Appele en arriere-plan apres l'import d'un workout.
   */
  private async fetchAndStoreWorkoutDetails(healthkitUUID: string, trainingId: number, retries: number = 2, startDate?: string, durationMin?: number): Promise<void> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const details = await this.getWorkoutDetailsByUUID(healthkitUUID, startDate, durationMin);
        if (details) {
          // Limiter la taille du JSON (pas stocker des milliers de points GPS)
          const toStore = { ...details };
          if (toStore.routePoints && toStore.routePoints.length > 500) {
            const step = Math.ceil(toStore.routePoints.length / 500);
            toStore.routePoints = toStore.routePoints.filter((_, i) => i % step === 0);
          }
          if (toStore.heartRateSamples && toStore.heartRateSamples.length > 500) {
            const step = Math.ceil(toStore.heartRateSamples.length / 500);
            toStore.heartRateSamples = toStore.heartRateSamples.filter((_, i) => i % step === 0);
          }

          // Recalculer les zones HR avec les zones perso de l'utilisateur (ou défaut par âge)
          if (toStore.heartRateSamples && toStore.heartRateSamples.length > 1) {
            try {
              const effectiveZones = await getEffectiveHRZones();
              const computedZones = calcZoneDurations(toStore.heartRateSamples, effectiveZones);
              toStore.heartRateZones = computedZones;
            } catch {
              // Non bloquant : garder les zones HealthKit si calcul échoue
            }
          }

          const json = JSON.stringify(toStore);
          await updateTrainingDetails(trainingId, json);
          logger.info(`[HealthKit] Details enrichis stockes pour training #${trainingId} (${(json.length / 1024).toFixed(1)}KB)`);
          return; // Succes, sortir
        }
        // Pas de details dispo, HealthKit peut avoir besoin de temps
        if (attempt < retries) {
          logger.info(`[HealthKit] Details non dispo, retry ${attempt + 1}/${retries} dans 10s...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      } catch (error) {
        if (attempt < retries) {
          logger.warn(`[HealthKit] Erreur fetchAndStoreWorkoutDetails (retry ${attempt + 1}/${retries}):`, error);
          await new Promise(resolve => setTimeout(resolve, 10000));
        } else {
          logger.warn('[HealthKit] Erreur fetchAndStoreWorkoutDetails apres tous les retries:', error);
        }
      }
    }
  }

  // ============================================
  // HISTORICAL DATA (TRENDS)
  // ============================================

  async getHRVHistory(days: number = 0): Promise<Array<{ date: string; value: number }>> {
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch HRV history');
      return [];
    }

    try {
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);

      // FIX: Utiliser createQueryOptions pour passer des Date objects (pas timestamps)
      const queryOptions = this.createQueryOptions(fromDate, new Date(), { limit: 0, ascending: true });
      if (!queryOptions) {
        logger.error('[HealthKit] getHRVHistory: Impossible de creer les options de requete');
        return [];
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', queryOptions);

      logger.info('[HealthKit] getHRVHistory: echantillons bruts:', samples?.length || 0);

      if (samples && samples.length > 0) {
        const groupedByDay: { [key: string]: number[] } = {};

        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!groupedByDay[date]) {
            groupedByDay[date] = [];
          }
          groupedByDay[date].push(s.quantity);
        });

        const result = Object.keys(groupedByDay).map(date => ({
          date,
          value: Math.round(groupedByDay[date].reduce((a, b) => a + b, 0) / groupedByDay[date].length),
        })).sort((a, b) => a.date.localeCompare(b.date));

        logger.info('[HealthKit] getHRVHistory: resultat:', result.length, 'jours');
        return result;
      }
    } catch (error) {
      logger.error('Erreur lecture historique HRV:', error);
    }
    return [];
  }

  async getRestingHRHistory(days: number = 0): Promise<Array<{ date: string; value: number }>> {
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch resting HR history');
      return [];
    }

    try {
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);

      // FIX: Utiliser createQueryOptions pour passer des Date objects (pas timestamps)
      const queryOptions = this.createQueryOptions(fromDate, new Date(), { limit: 0, ascending: true });
      if (!queryOptions) {
        logger.error('[HealthKit] getRestingHRHistory: Impossible de creer les options de requete');
        return [];
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierRestingHeartRate', queryOptions);

      logger.info('[HealthKit] getRestingHRHistory: echantillons bruts:', samples?.length || 0);

      if (samples && samples.length > 0) {
        const groupedByDay: { [key: string]: number[] } = {};

        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!groupedByDay[date]) {
            groupedByDay[date] = [];
          }
          groupedByDay[date].push(s.quantity);
        });

        const result = Object.keys(groupedByDay).map(date => ({
          date,
          value: Math.round(groupedByDay[date].reduce((a, b) => a + b, 0) / groupedByDay[date].length),
        })).sort((a, b) => a.date.localeCompare(b.date));

        logger.info('[HealthKit] getRestingHRHistory: resultat:', result.length, 'jours');
        return result;
      }
    } catch (error) {
      logger.error('Erreur lecture historique Resting HR:', error);
    }
    return [];
  }

  async getHeartRateHistory(days: number = 0): Promise<Array<{ date: string; value: number; resting?: number }>> {
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch heart rate history');
      return [];
    }

    try {
      // days=0 → tout l'historique depuis l'an 2000 (illimité)
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);

      const queryOptions = this.createQueryOptions(fromDate, new Date(), { limit: 0, ascending: true });
      if (!queryOptions) {
        logger.error('[HealthKit] getHeartRateHistory: Impossible de creer les options de requete');
        return [];
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', queryOptions);

      logger.info('[HealthKit] getHeartRateHistory: echantillons bruts:', samples?.length || 0);

      if (samples && samples.length > 0) {
        const groupedByDay: { [key: string]: number[] } = {};

        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!groupedByDay[date]) {
            groupedByDay[date] = [];
          }
          groupedByDay[date].push(s.quantity);
        });

        const result = Object.keys(groupedByDay).map(date => ({
          date,
          value: Math.round(groupedByDay[date].reduce((a, b) => a + b, 0) / groupedByDay[date].length),
        })).sort((a, b) => a.date.localeCompare(b.date));

        logger.info('[HealthKit] getHeartRateHistory: resultat:', result.length, 'jours');
        return result;
      }
    } catch (error) {
      logger.error('Erreur lecture historique Heart Rate:', error);
    }
    return [];
  }

  async getOxygenSaturationHistory(days: number = 0): Promise<Array<{ date: string; value: number }>> {
    // Demo mode disabled

    // VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch SpO2 history');
      return [];
    }

    try {
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);

      const queryOptions = this.createQueryOptions(fromDate, new Date(), { ascending: true, limit: 0 });
      if (!queryOptions) return [];
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierOxygenSaturation', queryOptions);

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

  async getRespiratoryRateHistory(days: number = 0): Promise<Array<{ date: string; value: number }>> {
    if (!HealthKit) return [];
    try {
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);
      const queryOptions = this.createQueryOptions(fromDate, new Date(), { ascending: true, limit: 0 });
      if (!queryOptions) return [];
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierRespiratoryRate', queryOptions);
      if (samples && samples.length > 0) {
        const groupedByDay: { [key: string]: number[] } = {};
        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!groupedByDay[date]) groupedByDay[date] = [];
          groupedByDay[date].push(s.quantity);
        });
        return Object.keys(groupedByDay).map(date => ({
          date,
          value: Math.round(groupedByDay[date].reduce((a, b) => a + b, 0) / groupedByDay[date].length * 10) / 10,
        })).sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) {
      logger.error('Erreur lecture historique fréquence respiratoire:', error);
    }
    return [];
  }

  async getBodyTemperatureHistory(days: number = 0): Promise<Array<{ date: string; value: number }>> {
    // Demo mode disabled

    // VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch temperature history');
      return [];
    }

    try {
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);

      const queryOptions = this.createQueryOptions(fromDate, new Date(), { ascending: true, limit: 0 });
      if (!queryOptions) return [];
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyTemperature', queryOptions);

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

  async getWeightHistory(days: number = 0): Promise<Array<{ date: string; value: number; source?: string }>> {
    // Demo mode disabled

    // VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch weight history');
      return [];
    }

    try {
      // days=0 → tout l'historique depuis l'an 2000 (illimité)
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);

      logger.info('[HealthKit] getWeightHistory: depuis', fromDate.toISOString());

      const queryOptions = this.createQueryOptions(fromDate, new Date(), { ascending: true, limit: 5000 });
      if (!queryOptions) return [];
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', queryOptions);

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

  async getSleepHistory(days: number = 0): Promise<Array<{
    date: string;
    deep: number;
    rem: number;
    core: number;
    awake: number;
    total: number;
    duration?: number;
    source?: string; // NOUVEAU: Ajouter la source pour debug
  }>> {
    // Demo mode disabled

    // VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch sleep history');
      return [];
    }

    try {
      // days=0 → tout l'historique depuis l'an 2000 (illimité)
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);

      logger.info('[HealthKit] getSleepHistory: depuis', fromDate.toISOString());

      const sleepHistoryOptions = this.createQueryOptions(fromDate, new Date(), { limit: 5000 });
      if (!sleepHistoryOptions) {
        logger.error('[HealthKit] getSleepHistory: Impossible de créer les options de requête');
        return [];
      }
      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', sleepHistoryOptions);

      logger.info('[HealthKit] getSleepHistory: Échantillons bruts reçus:', samples?.length || 0);

      if (samples && samples.length > 0) {
        // Filtrer uniquement les apps tierces connues pour donner des mauvaises données
        // Garder tout le reste (Apple Watch, iPhone auto-estimates, apps tierces valides)
        const filteredSamples = samples.filter((s: any) => {
          const bundleId = s.sourceRevision?.source?.bundleIdentifier || '';
          if (bundleId.includes('sleep-analysis-time')) return false;
          return true;
        });

        logger.info('[HealthKit] getSleepHistory: bruts=', samples.length, ', filtres=', filteredSamples.length);

        const samplesToUse = filteredSamples;

        // Grouper par date - prendre les données brutes d'Apple Santé
        const sleepByDate: { [key: string]: {
          deep: number; rem: number; core: number; awake: number; total: number;
          hasDetailedPhases: boolean; asleepMinutes: number;
          startTime: string; endTime: string;
          sources: Set<string>;
        } } = {};

        samplesToUse.forEach((s: any) => {
          // Ignorer les échantillons InBed (value=0) :
          // ce sont des "temps au lit" pas des phases de sommeil réelles.
          // Ils peuvent commencer à 16h00 et fausser complètement l'heure de coucher.
          if (s.value === 0) return;

          const duration = (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
          if (duration <= 0) return;

          // Groupement par nuit : décaler de -12h pour que toutes les phases d'une même nuit
          // (ex: 22h36 → 8h01) tombent dans le même bucket même si elles traversent minuit local.
          // Avant: phase se terminant à 23h30 → "3 mars", phase à 00h30 → "4 mars" → nuit coupée.
          // Après: phase à 23h30 - 12h = 11h30 → "3 mars", phase à 00h30 - 12h = 12h30 → "3 mars".
          const endLocal = new Date(new Date(s.endDate).getTime() - 12 * 60 * 60 * 1000);
          const date = `${endLocal.getFullYear()}-${String(endLocal.getMonth() + 1).padStart(2, '0')}-${String(endLocal.getDate()).padStart(2, '0')}`;

          if (!sleepByDate[date]) {
            sleepByDate[date] = {
              deep: 0, rem: 0, core: 0, awake: 0, total: 0,
              hasDetailedPhases: false, asleepMinutes: 0,
              startTime: s.startDate, endTime: s.endDate,
              sources: new Set(),
            };
          }

          // Tracker min startTime et max endTime pour heure coucher/reveil
          // (uniquement sur les vraies phases, InBed déjà exclus plus haut)
          if (new Date(s.startDate) < new Date(sleepByDate[date].startTime)) {
            sleepByDate[date].startTime = s.startDate;
          }
          if (new Date(s.endDate) > new Date(sleepByDate[date].endTime)) {
            sleepByDate[date].endTime = s.endDate;
          }

          // Tracker la source
          const source = s.sourceRevision?.source?.name || s.device?.name || 'Unknown';
          sleepByDate[date].sources.add(source);

          switch (s.value) {
            case 1: // Asleep (total global - sera ignore si phases detaillees existent)
              sleepByDate[date].asleepMinutes += duration;
              break;
            case 2:
              sleepByDate[date].awake += duration;
              break;
            case 3: // Core
              sleepByDate[date].core += duration;
              sleepByDate[date].hasDetailedPhases = true;
              break;
            case 4: // Deep
              sleepByDate[date].deep += duration;
              sleepByDate[date].hasDetailedPhases = true;
              break;
            case 5: // REM
              sleepByDate[date].rem += duration;
              sleepByDate[date].hasDetailedPhases = true;
              break;
          }
        });

        // Calculer le total en evitant le double comptage
        Object.values(sleepByDate).forEach(day => {
          if (day.hasDetailedPhases) {
            // Si on a les phases detaillees, le total = somme des phases
            day.total = day.core + day.deep + day.rem;
          } else {
            // Sinon utiliser value=1 (Asleep)
            day.total = day.asleepMinutes;
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
            startTime: new Date(sleepByDate[date].startTime).toISOString(),
            endTime: new Date(sleepByDate[date].endTime).toISOString(),
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

  /**
   * Données de comparaison sommeil (style Apple Santé onglet "Comparaisons")
   * FC pendant le sommeil, freq respiratoire, temperature au poignet
   */
  async getSleepComparisonData(days: number = 7): Promise<{
    heartRate?: { min: number; max: number; avg: number };
    respiratoryRate?: { min: number; max: number; avg: number };
    wristTemperature?: { value: number };
    heartRateHistory?: { date: string; value: number }[];
    respiratoryRateHistory?: { date: string; value: number }[];
  }> {
    if (!HealthKit) return {};

    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);

      const result: {
        heartRate?: { min: number; max: number; avg: number };
        respiratoryRate?: { min: number; max: number; avg: number };
        wristTemperature?: { value: number };
        heartRateHistory?: { date: string; value: number }[];
        respiratoryRateHistory?: { date: string; value: number }[];
      } = {};

      // FC pendant le sommeil (entre 22h et 8h)
      try {
        const hrOptions = this.createQueryOptions(fromDate, new Date(), { limit: 0 });
        if (hrOptions) {
          const hrSamples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', hrOptions);
          if (hrSamples && hrSamples.length > 0) {
            // Filtrer pour les heures de sommeil (22h-8h)
            const sleepHR = hrSamples.filter((s: any) => {
              const hour = new Date(s.startDate).getHours();
              return hour >= 22 || hour < 8;
            });
            if (sleepHR.length > 0) {
              const bpms = sleepHR.map((s: any) => s.quantity || 0).filter((v: number) => v > 30 && v < 200);
              if (bpms.length > 0) {
                result.heartRate = {
                  min: Math.round(Math.min(...bpms)),
                  max: Math.round(Math.max(...bpms)),
                  avg: Math.round(bpms.reduce((a: number, b: number) => a + b, 0) / bpms.length),
                };
              }
              // Historique par nuit : FC moy par date (on attribue à la date du matin = lendemain si après minuit)
              const byDate: { [date: string]: number[] } = {};
              for (const s of sleepHR) {
                const bpm = s.quantity || 0;
                if (bpm < 30 || bpm > 200) continue;
                const d = new Date(s.startDate);
                // Si heure >= 22h, c'est la nuit du lendemain → date = demain
                const date = d.getHours() >= 22
                  ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString().split('T')[0]
                  : d.toISOString().split('T')[0];
                if (!byDate[date]) byDate[date] = [];
                byDate[date].push(bpm);
              }
              result.heartRateHistory = Object.keys(byDate).sort().map(date => ({
                date,
                value: Math.round(byDate[date].reduce((a, b) => a + b, 0) / byDate[date].length),
              }));
            }
          }
        }
      } catch (e) { /* FC may not be available */ }

      // Fréquence respiratoire
      try {
        const rrOptions = this.createQueryOptions(fromDate, new Date(), { limit: 0 });
        if (rrOptions) {
          const rrSamples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierRespiratoryRate', rrOptions);
          if (rrSamples && rrSamples.length > 0) {
            const rates = rrSamples.map((s: any) => s.quantity || 0).filter((v: number) => v > 5 && v < 50);
            if (rates.length > 0) {
              result.respiratoryRate = {
                min: Math.round(Math.min(...rates) * 10) / 10,
                max: Math.round(Math.max(...rates) * 10) / 10,
                avg: Math.round(rates.reduce((a: number, b: number) => a + b, 0) / rates.length * 10) / 10,
              };
            }
            // Historique par nuit
            const byDateRR: { [date: string]: number[] } = {};
            for (const s of rrSamples) {
              const rr = s.quantity || 0;
              if (rr < 5 || rr > 50) continue;
              const d = new Date(s.startDate);
              const date = d.toISOString().split('T')[0];
              if (!byDateRR[date]) byDateRR[date] = [];
              byDateRR[date].push(rr);
            }
            result.respiratoryRateHistory = Object.keys(byDateRR).sort().map(date => ({
              date,
              value: Math.round(byDateRR[date].reduce((a, b) => a + b, 0) / byDateRR[date].length * 10) / 10,
            }));
          }
        }
      } catch (e) { /* RR may not be available */ }

      // Temperature au poignet (Apple Watch Series 8+)
      try {
        const tempOptions = this.createQueryOptions(fromDate, new Date(), { limit: 10 });
        if (tempOptions) {
          const tempSamples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierAppleSleepingWristTemperature', tempOptions);
          if (tempSamples && tempSamples.length > 0) {
            const lastTemp = tempSamples[tempSamples.length - 1];
            if (lastTemp?.quantity !== undefined) {
              result.wristTemperature = { value: Math.round(lastTemp.quantity * 10) / 10 };
            }
          }
        }
      } catch (e) { /* Temperature requires Apple Watch Series 8+ */ }

      return result;
    } catch (error) {
      logger.error('Erreur lecture données comparaison sommeil:', error);
      return {};
    }
  }

  async getCaloriesHistory(days: number = 0): Promise<Array<{
    date: string;
    active: number;
    basal: number;
    total: number;
  }>> {
    // Demo mode disabled

    // VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch calories history');
      return [];
    }

    try {
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);

      // UTILISER Promise.allSettled POUR NE PAS BLOQUER SI 1 ÉCHOUE
      const calQueryOptions = this.createQueryOptions(fromDate, new Date());
      if (!calQueryOptions) return [];
      const results = await Promise.allSettled([
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', calQueryOptions),
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBasalEnergyBurned', calQueryOptions),
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

  async getVO2MaxHistory(days: number = 0): Promise<Array<{ date: string; value: number }>> {
    // Demo mode disabled

    // VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch VO2 Max history');
      return [];
    }

    try {
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);
      fromDate.setHours(0, 0, 0, 0);

      const queryOptions = this.createQueryOptions(fromDate, new Date(), { ascending: true });
      if (!queryOptions) return [];
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierVO2Max', queryOptions);

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

  async getStepsHistory(days: number = 0): Promise<Array<{ date: string; value: number }>> {
    // Demo mode disabled

    // VERIFIER QUE HealthKit EST CHARGE
    if (!HealthKit) {
      logger.warn('[HealthKit] Module not loaded, cannot fetch steps history');
      return [];
    }

    try {
      // Methode 1: queryStatisticsForQuantity par jour (dedoublonne par Apple)
      // LIMITE à 365 jours max : au-delà, 1 appel async par jour = trop lent (3650 jours = ~5 min).
      // Pour les grandes périodes (TOUT), on tombe directement sur le fallback bulk query.
      const loopDays = Math.min(days, 365);
      if (!isRunningInExpoGo && loopDays > 0) {
        try {
          const HK = require('@kingstinct/react-native-healthkit');
          if (typeof HK.queryStatisticsForQuantity === 'function') {
            const results: Array<{ date: string; value: number }> = [];
            for (let i = 0; i < loopDays; i++) {
              const dayStart = new Date();
              dayStart.setDate(dayStart.getDate() - i);
              dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(dayStart);
              dayEnd.setHours(23, 59, 59, 999);

              const stats = await HK.queryStatisticsForQuantity(
                'HKQuantityTypeIdentifierStepCount',
                ['cumulativeSum'],
                { filter: { date: { startDate: dayStart, endDate: dayEnd } } }
              );
              const total = stats?.sumQuantity?.quantity ?? 0;
              if (total > 0) {
                results.push({
                  date: dayStart.toISOString().split('T')[0],
                  value: Math.round(total),
                });
              }
            }
            if (results.length > 0) {
              return results.sort((a, b) => a.date.localeCompare(b.date));
            }
          }
        } catch (statsError) {
          logger.warn('[HealthKit] getStepsHistory: queryStatisticsForQuantity echoue, fallback');
        }
      }

      // Fallback: queryQuantitySamples (peut double-compter iPhone + Watch)
      // days=0 → tout l'historique depuis l'an 2000 (illimité)
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);

      const queryOptions = this.createQueryOptions(fromDate, new Date());
      if (!queryOptions) return [];
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', queryOptions);

      if (samples && samples.length > 0) {
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

  async getDistanceHistory(days: number = 0): Promise<Array<{ date: string; value: number }>> {
    if (!HealthKit) return [];
    try {
      const loopDays = Math.min(days, 365);
      if (!isRunningInExpoGo && loopDays > 0) {
        try {
          const HK = require('@kingstinct/react-native-healthkit');
          if (typeof HK.queryStatisticsForQuantity === 'function') {
            const results: Array<{ date: string; value: number }> = [];
            for (let i = 0; i < loopDays; i++) {
              const dayStart = new Date();
              dayStart.setDate(dayStart.getDate() - i);
              dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(dayStart);
              dayEnd.setHours(23, 59, 59, 999);
              const stats = await HK.queryStatisticsForQuantity(
                'HKQuantityTypeIdentifierDistanceWalkingRunning',
                ['cumulativeSum'],
                { filter: { date: { startDate: dayStart, endDate: dayEnd } } }
              );
              const total = stats?.sumQuantity?.quantity ?? 0;
              if (total > 0) {
                results.push({ date: dayStart.toISOString().split('T')[0], value: Math.round(total * 100) / 100 });
              }
            }
            if (results.length > 0) return results.sort((a, b) => a.date.localeCompare(b.date));
          }
        } catch (e) { logger.warn('[HealthKit] getDistanceHistory: queryStatistics echoue, fallback'); }
      }
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);
      const queryOptions = this.createQueryOptions(fromDate, new Date());
      if (!queryOptions) return [];
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierDistanceWalkingRunning', queryOptions);
      if (samples && samples.length > 0) {
        const byDate: { [key: string]: number } = {};
        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!byDate[date]) byDate[date] = 0;
          byDate[date] += s.quantity || 0;
        });
        return Object.keys(byDate).filter(d => byDate[d] > 0)
          .map(d => ({ date: d, value: Math.round(byDate[d] * 100) / 100 }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) { logger.error('Erreur lecture historique distance:', error); }
    return [];
  }

  async getExerciseMinutesHistory(days: number = 0): Promise<Array<{ date: string; value: number }>> {
    if (!HealthKit) return [];
    try {
      const loopDays = Math.min(days, 365);
      if (!isRunningInExpoGo && loopDays > 0) {
        try {
          const HK = require('@kingstinct/react-native-healthkit');
          if (typeof HK.queryStatisticsForQuantity === 'function') {
            const results: Array<{ date: string; value: number }> = [];
            for (let i = 0; i < loopDays; i++) {
              const dayStart = new Date();
              dayStart.setDate(dayStart.getDate() - i);
              dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(dayStart);
              dayEnd.setHours(23, 59, 59, 999);
              const stats = await HK.queryStatisticsForQuantity(
                'HKQuantityTypeIdentifierAppleExerciseTime',
                ['cumulativeSum'],
                { filter: { date: { startDate: dayStart, endDate: dayEnd } } }
              );
              const total = stats?.sumQuantity?.quantity ?? 0;
              if (total > 0) {
                results.push({ date: dayStart.toISOString().split('T')[0], value: Math.round(total) });
              }
            }
            if (results.length > 0) return results.sort((a, b) => a.date.localeCompare(b.date));
          }
        } catch (e) { logger.warn('[HealthKit] getExerciseMinutesHistory: queryStatistics echoue, fallback'); }
      }
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);
      const queryOptions = this.createQueryOptions(fromDate, new Date());
      if (!queryOptions) return [];
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierAppleExerciseTime', queryOptions);
      if (samples && samples.length > 0) {
        const byDate: { [key: string]: number } = {};
        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!byDate[date]) byDate[date] = 0;
          byDate[date] += s.quantity || 0;
        });
        return Object.keys(byDate).filter(d => byDate[d] > 0)
          .map(d => ({ date: d, value: Math.round(byDate[d]) }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) { logger.error('Erreur lecture historique exercise minutes:', error); }
    return [];
  }

  async getStandHoursHistory(days: number = 0): Promise<Array<{ date: string; value: number }>> {
    if (!HealthKit) return [];
    try {
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);
      const queryOptions = this.createQueryOptions(fromDate, new Date());
      if (!queryOptions) return [];
      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierAppleStandHour', queryOptions);
      if (samples && samples.length > 0) {
        const byDate: { [key: string]: number } = {};
        samples.forEach((s: any) => {
          const date = new Date(s.startDate).toISOString().split('T')[0];
          if (!byDate[date]) byDate[date] = 0;
          // value 0 = stood, value 1 = idle
          if (s.value === 0) byDate[date] += 1;
        });
        return Object.keys(byDate).filter(d => byDate[d] > 0)
          .map(d => ({ date: d, value: byDate[d] }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (error) { logger.error('Erreur lecture historique stand hours:', error); }
    return [];
  }

  /**
   * Wrapper pour ajouter un timeout aux promesses
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
    // Demo mode disabled for production

    try {
      // Vérifier si le module est disponible avant de lancer les requêtes
      const available = await this.isAvailable();
      if (!available) {
        return {
          weight: undefined, steps: undefined, sleep: undefined, hydration: undefined,
          heartRate: undefined, heartRateVariability: undefined, calories: undefined,
          distance: undefined, vo2Max: undefined, oxygenSaturation: undefined,
          respiratoryRate: undefined, bodyTemperature: undefined, bodyComposition: undefined,
          workouts: undefined, bloodPressure: undefined, bloodGlucose: undefined,
          height: undefined, floorsClimbed: undefined, mindfulMinutes: undefined,
        };
      }

      // LANCER TOUTES LES REQUÊTES AVEC TIMEOUT DE 5S CHACUNE
      const TIMEOUT_MS = 5000;
      const results = await Promise.allSettled([
        this.withTimeout(this.getLatestWeight(), TIMEOUT_MS),           // 0
        this.withTimeout(this.getTodaySteps(), TIMEOUT_MS),             // 1
        this.withTimeout(this.getLastSleep(), TIMEOUT_MS),              // 2
        this.withTimeout(this.getTodayHydration(), TIMEOUT_MS),         // 3
        this.withTimeout(this.getTodayHeartRate(), TIMEOUT_MS),         // 4
        this.withTimeout(this.getTodayHRV(), TIMEOUT_MS),               // 5
        this.withTimeout(this.getTodayCalories(), TIMEOUT_MS),          // 6
        this.withTimeout(this.getTodayDistance(), TIMEOUT_MS),          // 7
        this.withTimeout(this.getVO2Max(), TIMEOUT_MS),                 // 8
        this.withTimeout(this.getOxygenSaturation(), TIMEOUT_MS),       // 9
        this.withTimeout(this.getRespiratoryRate(), TIMEOUT_MS),        // 10
        this.withTimeout(this.getBodyTemperature(), TIMEOUT_MS),        // 11
        this.withTimeout(this.getBodyComposition(), TIMEOUT_MS),        // 12
        this.withTimeout(this.getWorkouts(), 120000),                   // 13 — 2 min pour les grandes bibliothèques
        this.withTimeout(this.getBloodPressure(), TIMEOUT_MS),          // 14
        this.withTimeout(this.getBloodGlucose(), TIMEOUT_MS),           // 15
        this.withTimeout(this.getHeight(), TIMEOUT_MS),                 // 16
        this.withTimeout(this.getFloorsClimbed(), TIMEOUT_MS),          // 17
        this.withTimeout(this.getMindfulMinutes(), TIMEOUT_MS),         // 18
      ]);

      const r = (i: number) => results[i].status === 'fulfilled' ? results[i].value : null;

      // Logger les échecs pour debugging (sans crasher)
      const dataTypes = ['weight', 'steps', 'sleep', 'hydration', 'heartRate', 'hrv',
        'calories', 'distance', 'vo2max', 'oxygenSat', 'respRate', 'temperature',
        'bodyComp', 'workouts', 'bloodPressure', 'bloodGlucose', 'height',
        'floorsClimbed', 'mindfulMinutes'];
      results.forEach((res, i) => {
        if (res.status === 'rejected') {
          logger.warn(`[HealthConnect] Failed to fetch ${dataTypes[i]}:`, res.reason);
        }
      });

      return {
        weight: r(0) ?? undefined,
        steps: r(1) ?? undefined,
        sleep: r(2) ?? undefined,
        hydration: r(3) ?? undefined,
        heartRate: r(4) ?? undefined,
        heartRateVariability: r(5) ?? undefined,
        calories: r(6) ?? undefined,
        distance: r(7) ?? undefined,
        vo2Max: r(8) ?? undefined,
        oxygenSaturation: r(9) ?? undefined,
        respiratoryRate: r(10) ?? undefined,
        bodyTemperature: r(11) ?? undefined,
        bodyComposition: r(12) ?? undefined,
        workouts: r(13) ?? undefined,
        bloodPressure: r(14) ?? undefined,
        bloodGlucose: r(15) ?? undefined,
        height: r(16) ?? undefined,
        floorsClimbed: r(17) ?? undefined,
        mindfulMinutes: r(18) ?? undefined,
      };
    } catch (error) {
      logger.error('[HealthConnect] Critical error in getAllHealthData:', error);
      return {
        weight: undefined, steps: undefined, sleep: undefined, hydration: undefined,
        heartRate: undefined, heartRateVariability: undefined, calories: undefined,
        distance: undefined, vo2Max: undefined, oxygenSaturation: undefined,
        respiratoryRate: undefined, bodyTemperature: undefined, bodyComposition: undefined,
        workouts: undefined, bloodPressure: undefined, bloodGlucose: undefined,
        height: undefined, floorsClimbed: undefined, mindfulMinutes: undefined,
      };
    }
  }

  async writeWeight(weight: number, unit: 'kg' | 'lbs' = 'kg'): Promise<boolean> {
    // VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.error('[HealthKit] Module not loaded - cannot write weight');
      throw new Error('HealthKit module not available');
    }

    const weightInKg = unit === 'lbs' ? weight * 0.453592 : weight;

    try {
      // CHECK FOR DUPLICATES: Prevent writing same weight twice on same day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dupCheckOptions = this.createQueryOptions(today, tomorrow, { limit: 10 });
      const existingWeights = dupCheckOptions
        ? await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', dupCheckOptions)
        : [];

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
      await HealthKit.saveQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg', weightInKg, new Date(), new Date());
      return true;
    } catch (error) {
      logger.error('Erreur écriture poids:', error);
      throw error; // THROW AU LIEU DE RETOURNER FALSE
    }
  }

  async writeHydration(amountMl: number): Promise<boolean> {
    // VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.error('[HealthKit] Module not loaded - cannot write hydration');
      throw new Error('HealthKit module not available');
    }

    // Apple Health attend des litres, on convertit
    const amountLiters = amountMl / 1000;

    try {
      await HealthKit.saveQuantitySample('HKQuantityTypeIdentifierDietaryWater', 'L', amountLiters, new Date(), new Date());
      return true;
    } catch (error) {
      logger.error('Erreur écriture hydratation:', error);
      throw error; // THROW AU LIEU DE RETOURNER FALSE
    }
  }

  async writeBodyFat(percentage: number): Promise<boolean> {
    // VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.error('[HealthKit] Module not loaded - cannot write body fat');
      throw new Error('HealthKit module not available');
    }

    try {
      // Apple Health attend un ratio (0-1), on convertit depuis le pourcentage
      const ratio = percentage / 100;

      // CHECK FOR DUPLICATES: Prevent writing same body fat twice on same day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const bfDupCheckOptions = this.createQueryOptions(today, tomorrow, { limit: 10 });
      const existingBodyFat = bfDupCheckOptions
        ? await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyFatPercentage', bfDupCheckOptions)
        : [];

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
      await HealthKit.saveQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', '%', ratio, new Date(), new Date());
      return true;
    } catch (error) {
      logger.error('Erreur écriture body fat:', error);
      throw error; // THROW AU LIEU DE RETOURNER FALSE
    }
  }

  async writeWorkout(workout: {
    activityType: string;
    startDate: Date;
    endDate: Date;
    distance?: number; // en km
    calories?: number; // en kcal
  }): Promise<boolean> {
    // VÉRIFIER QUE HealthKit EST CHARGÉ
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

      // SIMPLIFIER : UN SEUL NIVEAU DE TRY-CATCH
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
          // THROW UNE ERREUR SPÉCIALE AU LIEU DE REDEMANDER SILENCIEUSEMENT
          const permissionError = new Error('HEALTHKIT_PERMISSION_REQUIRED');
          (permissionError as any).originalError = saveError;
          (permissionError as any).dataType = 'workout';
          throw permissionError;
        }

        // Autres erreurs : remonter telles quelles
        throw saveError;
      }
    } catch (error: unknown) {
      logger.error('Erreur écriture workout:', error);

      // REMONTER L'ERREUR AU LIEU DE RETOURNER FALSE SILENCIEUSEMENT
      // Le caller pourra détecter le type d'erreur et afficher un message approprié
      throw error;
    }
  }

  /**
   * Synchronisation avec retry automatique (exponential backoff)
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
      // Verifier si HealthKit est quand meme disponible (permissions accordees via Reglages iOS)
      const available = await this.isAvailable();
      if (!available) {
        logger.warn('[syncAll] Non connecté et non disponible, abandon');
        return null;
      }
      logger.info('[syncAll] Non connecté mais HealthKit disponible, on continue');
    }

    try {
      logger.info('[syncAll] Synchronisation iOS en cours...');
      const data = await this.getAllHealthData();
      const today = new Date().toISOString().split('T')[0];
      const records: HealthDataRecord[] = [];
      let savedCount = 0;

      // ══════ POIDS → SQLite (table weights) ══════
      if (data.weight) {
        try {
          await addWeight({
            weight: data.weight.value,
            source: data.weight.source || 'apple_health',
            date: data.weight.date.split('T')[0],
          });
          savedCount++;
          logger.info(`[syncAll] Poids sauvegardé: ${data.weight.value} kg (source: ${data.weight.source})`);
        } catch (e) {
          // Doublon ou erreur, on continue
          logger.warn('[syncAll] Poids déjà existant ou erreur:', e);
        }
      }

      // ══════ PAS → SQLite (table health_data) ══════
      if (data.steps && data.steps.count > 0) {
        records.push({
          date: today,
          type: 'steps',
          value: data.steps.count,
          unit: 'count',
          source: data.steps.source || 'apple_health',
        });
        logger.info(`[syncAll] Pas: ${data.steps.count}`);
      }

      // ══════ CALORIES → SQLite ══════
      if (data.calories) {
        const calSource = data.calories.source || 'apple_health';
        if (data.calories.active > 0) {
          records.push({
            date: today,
            type: 'calories_active',
            value: Math.round(data.calories.active),
            unit: 'kcal',
            source: calSource,
          });
        }
        if (data.calories.basal > 0) {
          records.push({
            date: today,
            type: 'calories_basal',
            value: Math.round(data.calories.basal),
            unit: 'kcal',
            source: calSource,
          });
        }
        logger.info(`[syncAll] Calories: ${data.calories.active} actives + ${data.calories.basal} basales`);
      }

      // ══════ FRÉQUENCE CARDIAQUE → SQLite ══════
      if (data.heartRate && data.heartRate.average > 0) {
        records.push({
          date: today,
          type: 'heart_rate',
          value: Math.round(data.heartRate.average),
          value2: data.heartRate.min,
          value3: data.heartRate.max,
          unit: 'bpm',
          source: data.heartRate.source || 'apple_health',
        });
        logger.info(`[syncAll] FC: ${data.heartRate.average} moy, ${data.heartRate.min}-${data.heartRate.max}`);
      }

      // ══════ FC AU REPOS → SQLite ══════
      if (data.heartRate && data.heartRate.resting > 0) {
        records.push({
          date: today,
          type: 'heart_rate_resting',
          value: Math.round(data.heartRate.resting),
          unit: 'bpm',
          source: data.heartRate.source || 'apple_health',
        });
        logger.info(`[syncAll] FC repos: ${data.heartRate.resting}`);
      }

      // ══════ HRV → SQLite ══════
      if (data.heartRateVariability && data.heartRateVariability.value > 0) {
        records.push({
          date: today,
          type: 'hrv',
          value: Math.round(data.heartRateVariability.value),
          unit: 'ms',
          source: data.heartRateVariability.source || 'apple_health',
        });
      }

      // ══════ SOMMEIL → SQLite + sleepService ══════
      if (data.sleep && data.sleep.duration > 0) {
        records.push({
          date: today,
          type: 'sleep',
          value: Math.round(data.sleep.duration),
          value2: data.sleep.phases?.deep || 0,
          value3: data.sleep.phases?.rem || 0,
          value4: data.sleep.phases?.awake || 0,
          unit: 'min',
          source: data.sleep.source || 'apple_health',
          metadata: JSON.stringify({
            quality: data.sleep.quality,
            startTime: data.sleep.startTime,
            endTime: data.sleep.endTime,
            phases: data.sleep.phases,
          }),
        });

        // Bridge: ecrire aussi dans sleepService pour que sleep.tsx affiche les données
        try {
          const sleepDate = data.sleep.startTime
            ? new Date(data.sleep.startTime).toISOString().split('T')[0]
            : today;
          const bedTime = data.sleep.startTime
            ? new Date(data.sleep.startTime).toTimeString().slice(0, 5)
            : '23:00';
          const wakeTime = data.sleep.endTime
            ? new Date(data.sleep.endTime).toTimeString().slice(0, 5)
            : '07:00';

          const qualityMap: Record<string, number> = { poor: 1, fair: 2, good: 3, excellent: 5 };
          const qualityNum = qualityMap[data.sleep.quality || 'good'] || 3;

          await addSleepEntryFromHealthKit({
            date: sleepDate,
            bedTime,
            wakeTime,
            duration: Math.round(data.sleep.duration),
            quality: qualityNum,
            phases: data.sleep.phases,
          });
          logger.info(`[syncAll] Sommeil bridge sleepService: ${data.sleep.duration} min`);
        } catch (e) {
          logger.warn('[syncAll] Erreur bridge sommeil:', e);
        }

        logger.info(`[syncAll] Sommeil: ${data.sleep.duration} min (${data.sleep.quality})`);
      }

      // ══════ DISTANCE → SQLite ══════
      if (data.distance && data.distance.total > 0) {
        records.push({
          date: today,
          type: 'distance',
          value: Math.round(data.distance.total * 100) / 100,
          value2: data.distance.walking,
          value3: data.distance.running,
          unit: 'km',
          source: data.distance.source || 'apple_health',
        });
        logger.info(`[syncAll] Distance: ${data.distance.total} km`);
      }

      // ══════ VO2 MAX → SQLite ══════
      if (data.vo2Max && data.vo2Max.value > 0) {
        records.push({
          date: today,
          type: 'vo2max',
          value: Math.round(data.vo2Max.value * 10) / 10,
          unit: 'ml/kg/min',
          source: data.vo2Max.source || 'apple_health',
        });
      }

      // ══════ SpO2 → SQLite ══════
      if (data.oxygenSaturation && data.oxygenSaturation.value > 0) {
        records.push({
          date: today,
          type: 'spo2',
          value: Math.round(data.oxygenSaturation.value * 10) / 10,
          unit: '%',
          source: data.oxygenSaturation.source || 'apple_health',
        });
      }

      // ══════ COMPOSITION CORPORELLE → SQLite ══════
      if (data.bodyComposition) {
        const compSource = data.bodyComposition.source || 'apple_health';
        if (data.bodyComposition.bodyFatPercentage && data.bodyComposition.bodyFatPercentage > 0) {
          records.push({
            date: today,
            type: 'body_fat',
            value: Math.round(data.bodyComposition.bodyFatPercentage * 10) / 10,
            unit: '%',
            source: compSource,
          });
        }
        if (data.bodyComposition.leanBodyMass && data.bodyComposition.leanBodyMass > 0) {
          records.push({
            date: today,
            type: 'lean_mass',
            value: Math.round(data.bodyComposition.leanBodyMass * 10) / 10,
            unit: 'kg',
            source: compSource,
          });
        }
      }

      // ══════ PRESSION ARTÉRIELLE → SQLite ══════
      if (data.bloodPressure && data.bloodPressure.systolic > 0) {
        records.push({
          date: today,
          type: 'blood_pressure_systolic',
          value: data.bloodPressure.systolic,
          value2: data.bloodPressure.diastolic,
          unit: 'mmHg',
          source: data.bloodPressure.source || 'apple_health',
        });
        logger.info(`[syncAll] Pression artérielle: ${data.bloodPressure.systolic}/${data.bloodPressure.diastolic} mmHg`);
      }

      // ══════ GLYCÉMIE → SQLite ══════
      if (data.bloodGlucose && data.bloodGlucose.value > 0) {
        records.push({
          date: today,
          type: 'blood_glucose',
          value: data.bloodGlucose.value,
          unit: data.bloodGlucose.unit,
          source: data.bloodGlucose.source || 'apple_health',
        });
        logger.info(`[syncAll] Glycémie: ${data.bloodGlucose.value} ${data.bloodGlucose.unit}`);
      }

      // ══════ TAILLE → SQLite ══════
      if (data.height && data.height.value > 0) {
        records.push({
          date: today,
          type: 'height',
          value: data.height.value,
          unit: 'cm',
          source: data.height.source || 'apple_health',
        });
        logger.info(`[syncAll] Taille: ${data.height.value} cm`);
      }

      // ══════ ÉTAGES MONTÉS → SQLite ══════
      if (data.floorsClimbed && data.floorsClimbed.count > 0) {
        records.push({
          date: today,
          type: 'floors_climbed',
          value: data.floorsClimbed.count,
          unit: 'floors',
          source: data.floorsClimbed.source || 'apple_health',
        });
        logger.info(`[syncAll] Étages montés: ${data.floorsClimbed.count}`);
      }

      // ══════ PLEINE CONSCIENCE → SQLite ══════
      if (data.mindfulMinutes && data.mindfulMinutes.minutes > 0) {
        records.push({
          date: today,
          type: 'mindful_minutes',
          value: data.mindfulMinutes.minutes,
          unit: 'min',
          source: data.mindfulMinutes.source || 'apple_health',
        });
        logger.info(`[syncAll] Pleine conscience: ${data.mindfulMinutes.minutes} min`);
      }

      // ══════ WORKOUTS → SQLite (table trainings) ══════
      if (data.workouts && data.workouts.length > 0) {
        // Charger les fingerprints deja importes pour dedup
        let importedFingerprints: Set<string> = new Set();
        try {
          const saved = await AsyncStorage.getItem('@yoroi_imported_workouts');
          if (saved) importedFingerprints = new Set(JSON.parse(saved));
        } catch {}

        let workoutsSaved = 0;
        const detailsQueue: { uuid: string; trainingId: number; startDate?: string; durationMin?: number }[] = [];
        for (const workout of data.workouts) {
          const fingerprint = `${workout.startDate}_${workout.activityType}_${workout.duration}`;
          if (importedFingerprints.has(fingerprint)) continue;

          try {
            const sport = mapWorkoutType(workout.activityType);
            const trainingDate = new Date(workout.startDate).toISOString().split('T')[0];
            const startTime = new Date(workout.startDate).toTimeString().slice(0, 5);

            // Generer des notes lisibles avec les vrais details du workout
            const workoutLabel = getWorkoutLabel(workout.activityType);
            const noteParts: string[] = [];
            if (workout.duration > 0) noteParts.push(`${Math.round(workout.duration)} min`);
            if (workout.distance && workout.distance > 0) noteParts.push(`${workout.distance.toFixed(2)} km`);
            if (workout.calories && workout.calories > 0) noteParts.push(`${Math.round(workout.calories)} kcal`);
            if (workout.averageHeartRate && workout.averageHeartRate > 0) noteParts.push(`${Math.round(workout.averageHeartRate)} bpm`);
            const noteText = noteParts.length > 0 ? `${workoutLabel} (${noteParts.join(', ')})` : workoutLabel;

            const training: Training = {
              sport,
              session_type: getWorkoutLabel(workout.activityType),
              date: trainingDate,
              start_time: startTime,
              duration_minutes: workout.duration,
              distance: workout.distance ? parseFloat(workout.distance.toFixed(2)) : undefined,
              calories: workout.calories,
              heart_rate: workout.averageHeartRate,
              max_heart_rate: workout.maxHeartRate,
              source: workout.source ? normalizeSourceName(workout.source) : undefined,
              notes: noteText,
              healthkit_uuid: (workout as any).hkUUID || workout.id || undefined,
            };

            const trainingId = await addTraining(training);
            importedFingerprints.add(fingerprint);
            workoutsSaved++;

            // Collecter les details a charger en batch (pas fire-and-forget)
            const detailUUID = (workout as any).hkUUID || workout.id;
            if (detailUUID && trainingId) {
              detailsQueue.push({
                uuid: detailUUID,
                trainingId,
                startDate: workout.startDate, // Date ISO complete pour matching fiable
                durationMin: workout.duration,
              });
            }
          } catch (e) {
            logger.warn('[syncAll] Erreur sauvegarde workout:', e);
          }
        }

        // Sauvegarder les fingerprints (garder les 20000 derniers pour couvrir tout l'historique)
        const fingerprintsArray = Array.from(importedFingerprints).slice(-20000);
        await AsyncStorage.setItem('@yoroi_imported_workouts', JSON.stringify(fingerprintsArray));
        if (workoutsSaved > 0) {
          savedCount += workoutsSaved;
          logger.info(`[syncAll] ${workoutsSaved} workouts importes depuis Apple Health`);
          DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
        }

        // Charger les details enrichis par batch de 3 pour eviter de surcharger le device
        if (detailsQueue.length > 0) {
          logger.info(`[syncAll] Enrichissement de ${detailsQueue.length} workouts (batch de 3)...`);
          const BATCH_SIZE = 3;
          for (let i = 0; i < detailsQueue.length; i += BATCH_SIZE) {
            const batch = detailsQueue.slice(i, i + BATCH_SIZE);
            await Promise.allSettled(
              batch.map(({ uuid, trainingId: tid, startDate: sd, durationMin: dm }) =>
                this.fetchAndStoreWorkoutDetails(uuid, tid, 1, sd, dm).catch(e =>
                  logger.warn(`[syncAll] Enrichissement workout #${tid} echoue:`, e)
                )
              )
            );
          }
          logger.info(`[syncAll] Enrichissement termine`);
        }
      }

      // ══════ SAUVEGARDER TOUT EN BATCH dans SQLite ══════
      if (records.length > 0) {
        try {
          const batchSaved = await saveHealthDataBatch(records);
          savedCount += batchSaved;
          logger.info(`[syncAll] ${batchSaved} enregistrements sauvegardés dans SQLite`);
        } catch (batchError) {
          // Fallback: sauvegarder un par un
          logger.warn('[syncAll] Batch failed, sauvegarde individuelle:', batchError);
          for (const record of records) {
            try {
              await saveHealthData(record);
              savedCount++;
            } catch (e) {
              logger.warn(`[syncAll] Erreur sauvegarde ${record.type}:`, e);
            }
          }
        }
      }

      // ══════ IMPORT HISTORIQUE SOMMEIL ══════
      try {
        const hasSyncedSleepHistory = await AsyncStorage.getItem('@yoroi_sleep_history_synced');
        if (!hasSyncedSleepHistory) {
          // Import historique complet au premier démarrage
          const imported = await this.syncSleepHistory(730);
          if (imported > 0) {
            await AsyncStorage.setItem('@yoroi_sleep_history_synced', 'true');
            logger.info(`[syncAll] Historique sommeil importe: ${imported} nuits`);
          }
        } else {
          // Toujours resynchroniser les 14 derniers jours pour avoir les nuits récentes
          await this.syncSleepHistory(14);
          logger.info('[syncAll] Sync sommeil 14 jours effectue');
        }
      } catch (e) {
        logger.warn('[syncAll] Erreur import historique sommeil:', e);
      }

      // ══════ AUSSI sauvegarder dans AsyncStorage (cache rapide pour UI) ══════
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
        // Synchroniser aussi vers la clé utilisée par readinessService (@yoroi_hydration_YYYY-MM-DD)
        const todayKey = `@yoroi_hydration_${new Date().toISOString().split('T')[0]}`;
        await AsyncStorage.setItem(todayKey, String(data.hydration.amount));
      }
      if (data.heartRate && data.heartRate.resting > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_RESTING_HR, String(data.heartRate.resting));
      }
      if (data.heartRateVariability && data.heartRateVariability.value > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_HRV, String(data.heartRateVariability.value));
      }

      this.syncStatus.lastSync = new Date().toISOString();
      await this.saveSyncStatus();

      // ══════ STOCKER LA FRAICHEUR PAR SOURCE ══════
      try {
        const sourcesDetected = new Set<string>();
        if (data.weight?.source) sourcesDetected.add(data.weight.source);
        if (data.heartRate?.source) sourcesDetected.add(data.heartRate.source);
        if (data.heartRateVariability?.source) sourcesDetected.add(data.heartRateVariability.source);
        if (data.sleep?.source) sourcesDetected.add(data.sleep.source);
        if (data.bodyComposition?.source) sourcesDetected.add(data.bodyComposition.source);
        if (data.vo2Max?.source) sourcesDetected.add(data.vo2Max.source);

        if (sourcesDetected.size > 0) {
          const freshness: Record<string, string> = {};
          try {
            const existing = await AsyncStorage.getItem('@yoroi_source_freshness');
            if (existing) Object.assign(freshness, JSON.parse(existing));
          } catch {}
          const now = new Date().toISOString();
          for (const src of sourcesDetected) {
            freshness[src] = now;
          }
          await AsyncStorage.setItem('@yoroi_source_freshness', JSON.stringify(freshness));
        }
      } catch (e) {
        // Best-effort
      }

      logger.info(`[syncAll] Synchronisation terminée: ${savedCount} données sauvegardées dans SQLite`);
      return data;
    } catch (error) {
      logger.error('[syncAll] Erreur synchronisation:', error);
      throw error;
    }
  }

  // ============================================
  // IMPORT COMPLET DE TOUT L'HISTORIQUE APPLE SANTÉ
  // Séances, poids, sommeil, pas, calories, FC, distance — sans limite de date
  // ============================================

  async importFullHistory(
    onProgress?: (step: string, current: number, total: number) => void
  ): Promise<{ weights: number; sleep: number; steps: number; calories: number; heartRate: number; distance: number; workouts: number; healthkitFound: number; insertErrors: number }> {

    const result = { weights: 0, sleep: 0, steps: 0, calories: 0, heartRate: 0, distance: 0, workouts: 0, healthkitFound: 0, insertErrors: 0 };
    const TOTAL_STEPS = 7;
    let stepIndex = 0;

    const progress = (label: string) => {
      stepIndex++;
      onProgress?.(label, stepIndex, TOTAL_STEPS);
      DeviceEventEmitter.emit('YOROI_IMPORT_PROGRESS', { step: label, current: stepIndex, total: TOTAL_STEPS });
      logger.info(`[importFullHistory] ${label} (${stepIndex}/${TOTAL_STEPS})`);
    };

    DeviceEventEmitter.emit('YOROI_IMPORT_START');

    try {

      // ══════ 1. POIDS — toutes les pesées depuis l'an 2000 ══════
      progress('Poids');
      try {
        const weights = await this.getWeightHistory(); // days=0 = illimité
        for (const w of weights) {
          try {
            await addWeight({ weight: w.value, source: w.source || 'apple_health', date: w.date });
            result.weights++;
          } catch { /* doublon ou contrainte, on ignore */ }
        }
        logger.info(`[importFullHistory] Poids importés: ${result.weights}/${weights.length}`);
      } catch (e) { logger.warn('[importFullHistory] Erreur poids:', e); }

      // ══════ 2. SOMMEIL — toutes les nuits depuis l'an 2000 ══════
      progress('Sommeil');
      try {
        const sleepHistory = await this.getSleepHistory(); // illimité
        for (const night of sleepHistory) {
          try {
            const bedHour = Math.max(0, 22 - Math.round(night.total / 60));
            const wakeDate = new Date(`${night.date}T07:00:00`);
            await addSleepEntryFromHealthKit({
              date: night.date,
              bedTime: `${String(bedHour).padStart(2, '0')}:00`,
              wakeTime: `${String(wakeDate.getHours()).padStart(2, '0')}:00`,
              duration: night.total,
              quality: night.total >= 480 ? 5 : night.total >= 420 ? 4 : night.total >= 360 ? 3 : night.total >= 300 ? 2 : 1,
              phases: { deep: night.deep, rem: night.rem, core: night.core, awake: night.awake },
            });
            result.sleep++;
          } catch { /* doublon, on ignore */ }
        }
        logger.info(`[importFullHistory] Nuits importées: ${result.sleep}/${sleepHistory.length}`);
      } catch (e) { logger.warn('[importFullHistory] Erreur sommeil:', e); }

      // ══════ 3. PAS — tous les jours depuis l'an 2000 ══════
      progress('Pas');
      try {
        const stepsHistory = await this.getStepsHistory(); // illimité
        const stepsRecords: HealthDataRecord[] = stepsHistory.map(s => ({
          date: s.date, type: 'steps', value: s.value, unit: 'count', source: 'apple_health',
        }));
        if (stepsRecords.length > 0) result.steps = await saveHealthDataBatch(stepsRecords);
        logger.info(`[importFullHistory] Jours de pas importés: ${result.steps}`);
      } catch (e) { logger.warn('[importFullHistory] Erreur pas:', e); }

      // ══════ 4. CALORIES — tous les jours depuis l'an 2000 ══════
      progress('Calories');
      try {
        const calHistory = await this.getCaloriesHistory(); // illimité
        const calRecords: HealthDataRecord[] = [];
        for (const c of calHistory) {
          if (c.active > 0) calRecords.push({ date: c.date, type: 'calories_active', value: c.active, unit: 'kcal', source: 'apple_health' });
          if (c.basal > 0) calRecords.push({ date: c.date, type: 'calories_basal', value: c.basal, unit: 'kcal', source: 'apple_health' });
        }
        if (calRecords.length > 0) result.calories = await saveHealthDataBatch(calRecords);
        logger.info(`[importFullHistory] Jours de calories importés: ${calHistory.length}`);
      } catch (e) { logger.warn('[importFullHistory] Erreur calories:', e); }

      // ══════ 5. FRÉQUENCE CARDIAQUE — tous les jours depuis l'an 2000 ══════
      progress('Fréquence cardiaque');
      try {
        const hrHistory = await this.getHeartRateHistory(); // illimité
        const hrRecords: HealthDataRecord[] = hrHistory.map(h => ({
          date: h.date, type: 'heart_rate', value: h.value, unit: 'bpm', source: 'apple_health',
        }));
        if (hrRecords.length > 0) result.heartRate = await saveHealthDataBatch(hrRecords);
        logger.info(`[importFullHistory] Jours de FC importés: ${result.heartRate}`);
      } catch (e) { logger.warn('[importFullHistory] Erreur FC:', e); }

      // ══════ 6. DISTANCE — tous les jours depuis l'an 2000 ══════
      progress('Distance');
      try {
        const distHistory = await this.getDistanceHistory(); // illimité
        const distRecords: HealthDataRecord[] = distHistory.map(d => ({
          date: d.date, type: 'distance', value: d.value, unit: 'km', source: 'apple_health',
        }));
        if (distRecords.length > 0) result.distance = await saveHealthDataBatch(distRecords);
        logger.info(`[importFullHistory] Jours de distance importés: ${result.distance}`);
      } catch (e) { logger.warn('[importFullHistory] Erreur distance:', e); }

      // ══════ 7. SÉANCES — toutes depuis l'an 2000 ══════
      progress('Séances');
      let workoutsReturned = false;
      try {
        // Appel direct avec timeout long (5 min) pour les grandes bibliothèques
        const workouts = await this.withTimeout(this.getWorkouts(), 300000);
        if (workouts && workouts.length > 0) {
          workoutsReturned = true;
          result.healthkitFound = workouts.length;
          logger.info(`[importFullHistory] HealthKit a retourné ${workouts.length} séances`);

          // Dédup fiable par UUID HealthKit (évite les doublons après un re-import forcé)
          let existingUUIDs: Set<string> = new Set();
          try {
            existingUUIDs = await getExistingHealthkitUUIDs();
          } catch {}
          // Fingerprints pour les séances sans UUID
          let importedFingerprints: Set<string> = new Set();
          try {
            const saved = await AsyncStorage.getItem('@yoroi_imported_workouts');
            if (saved) importedFingerprints = new Set(JSON.parse(saved));
          } catch {}

          for (const workout of workouts) {
            const uuid = (workout as any).hkUUID || workout.id;
            // Ignorer si déjà en base par UUID
            if (uuid && existingUUIDs.has(uuid)) continue;
            const fingerprint = `${workout.startDate}_${workout.activityType}_${workout.duration}`;
            if (importedFingerprints.has(fingerprint)) continue;

            try {
              const sport = mapWorkoutType(workout.activityType);
              const trainingDate = new Date(workout.startDate).toISOString().split('T')[0];
              const startTime = new Date(workout.startDate).toTimeString().slice(0, 5);
              const workoutLabel = getWorkoutLabel(workout.activityType);
              const noteParts: string[] = [];
              if (workout.duration > 0) noteParts.push(`${Math.round(workout.duration)} min`);
              if (workout.distance && workout.distance > 0) noteParts.push(`${workout.distance.toFixed(2)} km`);
              if (workout.calories && workout.calories > 0) noteParts.push(`${Math.round(workout.calories)} kcal`);
              if (workout.averageHeartRate && workout.averageHeartRate > 0) noteParts.push(`${Math.round(workout.averageHeartRate)} bpm`);
              const noteText = noteParts.length > 0 ? `${workoutLabel} (${noteParts.join(', ')})` : workoutLabel;

              const training: Training = {
                sport,
                session_type: workoutLabel,
                date: trainingDate,
                start_time: startTime,
                duration_minutes: workout.duration,
                distance: workout.distance ? parseFloat(workout.distance.toFixed(2)) : undefined,
                calories: workout.calories,
                heart_rate: workout.averageHeartRate,
                max_heart_rate: workout.maxHeartRate,
                source: workout.source ? normalizeSourceName(workout.source) : undefined,
                notes: noteText,
                healthkit_uuid: uuid || undefined,
              };

              await addTraining(training);
              importedFingerprints.add(fingerprint);
              if (uuid) existingUUIDs.add(uuid);
              result.workouts++;
            } catch (insertErr) {
              result.insertErrors++;
              logger.warn('[importFullHistory] Erreur insertion séance:', insertErr);
            }
          }

          // Sauvegarder les fingerprints (garder les 20000 derniers)
          const fingerprintsArray = Array.from(importedFingerprints).slice(-20000);
          await AsyncStorage.setItem('@yoroi_imported_workouts', JSON.stringify(fingerprintsArray));
          logger.info(`[importFullHistory] Séances importées: ${result.workouts}/${workouts.length}, erreurs: ${result.insertErrors}`);
          DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
        } else {
          // HealthKit a retourné null ou tableau vide → permissions refusées ou aucune séance
          result.healthkitFound = 0;
          logger.warn('[importFullHistory] HealthKit a retourné 0 séances - permissions refusées ou aucune séance enregistrée');
          DeviceEventEmitter.emit('YOROI_WORKOUTS_PERMISSION_NEEDED');
        }
      } catch (e) { logger.warn('[importFullHistory] Erreur séances:', e); }

      await AsyncStorage.setItem('@yoroi_full_history_imported', 'true');
      // Toujours sauvegarder la version pour éviter les re-imports infinis
      await AsyncStorage.setItem('@yoroi_import_version', '3');
      logger.info('[importFullHistory] Import complet terminé', result);

      // Notifier tous les écrans : import terminé + données changées
      DeviceEventEmitter.emit('YOROI_IMPORT_DONE', result);
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');

    } catch (e) {
      logger.error('[importFullHistory] Erreur critique:', e);
      // Toujours notifier pour débloquer les spinners dans l'UI
      DeviceEventEmitter.emit('YOROI_IMPORT_DONE', result);
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
    }

    return result;
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
  // Intervalle de polling fallback (si subscribeToChanges non dispo)
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Traiter un nouveau workout detecte (shared entre observer et polling)
   */
  private async processNewWorkout(
    workout: NonNullable<HealthData['workouts']>[0],
    importedFingerprints: Set<string>
  ): Promise<{ trainingId?: number; fingerprint: string } | null> {
    const fingerprint = `${workout.startDate}_${workout.activityType}_${workout.duration}`;
    if (importedFingerprints.has(fingerprint)) return null;

    const sport = mapWorkoutType(workout.activityType);
    const trainingDate = new Date(workout.startDate).toISOString().split('T')[0];
    const startTime = new Date(workout.startDate).toTimeString().slice(0, 5);

    const workoutLabel = getWorkoutLabel(workout.activityType);
    const noteParts: string[] = [];
    if (workout.duration > 0) noteParts.push(`${Math.round(workout.duration)} min`);
    if (workout.distance && workout.distance > 0) noteParts.push(`${(workout.distance / 1000).toFixed(2)} km`);
    if (workout.calories && workout.calories > 0) noteParts.push(`${Math.round(workout.calories)} kcal`);
    if (workout.averageHeartRate && workout.averageHeartRate > 0) noteParts.push(`${Math.round(workout.averageHeartRate)} bpm`);
    const noteText = noteParts.length > 0 ? `${workoutLabel} (${noteParts.join(', ')})` : workoutLabel;

    const training: Training = {
      sport,
      session_type: workoutLabel,
      date: trainingDate,
      start_time: startTime,
      duration_minutes: workout.duration,
      distance: workout.distance ? parseFloat(workout.distance.toFixed(2)) : undefined,
      calories: workout.calories,
      heart_rate: workout.averageHeartRate,
      max_heart_rate: workout.maxHeartRate,
      source: workout.source ? normalizeSourceName(workout.source) : undefined,
      notes: noteText,
      healthkit_uuid: (workout as any).hkUUID || workout.id || undefined,
    };

    const trainingId = await addTraining(training);
    importedFingerprints.add(fingerprint);

    // Sauvegarder les fingerprints (garder les 5000 derniers)
    const fingerprintsArray = Array.from(importedFingerprints).slice(-5000);
    await AsyncStorage.setItem('@yoroi_imported_workouts', JSON.stringify(fingerprintsArray));

    // Charger les details enrichis en arriere-plan (avec retry + date pour matching fiable)
    const detailUUID = (workout as any).hkUUID || workout.id;
    if (detailUUID && trainingId) {
      this.fetchAndStoreWorkoutDetails(detailUUID, trainingId, 2, workout.startDate, workout.duration).catch(e =>
        logger.warn('[WorkoutObserver] Enrichissement workout echoue:', e)
      );
    }

    logger.info(`[WorkoutObserver] Workout sauvegarde: ${sport} ${workout.duration}min`);

    // Notification envoyée dans checkAndProcessNewWorkouts (avec cooldown anti-doublon)

    return { trainingId, fingerprint };
  }

  /**
   * Mode Strava: Observer les nouveaux workouts en background
   * Active le background delivery pour les workouts et envoie une notification
   * Fallback: polling toutes les 5 minutes si subscribeToChanges non disponible
   */
  async setupWorkoutObserver(): Promise<void> {
    if (!HealthKit) {
      logger.warn('[WorkoutObserver] HealthKit module not loaded');
      return;
    }

    try {
      // Activer le background delivery pour les workouts
      if (typeof HealthKit.enableBackgroundDelivery === 'function') {
        await HealthKit.enableBackgroundDelivery(
          'HKWorkoutTypeIdentifier',
          2 // UpdateFrequency.immediate = 2
        );
        logger.info('[WorkoutObserver] Background delivery active pour workouts');
      }

      // S'abonner aux changements de workouts
      if (typeof HealthKit.subscribeToChanges === 'function') {
        await HealthKit.subscribeToChanges('HKWorkoutTypeIdentifier', async () => {
          logger.info('[WorkoutObserver] Nouveau workout detecte !');
          await this.checkAndProcessNewWorkouts();
        });
        logger.info('[WorkoutObserver] Abonnement aux changements de workouts actif');
      } else {
        // Fallback: polling toutes les 5 minutes
        logger.info('[WorkoutObserver] subscribeToChanges non disponible - activation polling fallback');
        this.startWorkoutPolling();
      }
    } catch (error) {
      logger.error('[WorkoutObserver] Erreur setup observer, fallback polling:', error);
      this.startWorkoutPolling();
    }
  }

  /**
   * Demarrer le polling fallback pour detecter les nouveaux workouts
   * Toutes les 2 min pour une detection rapide (Garmin, Fitbit, Polar, etc.)
   */
  private startWorkoutPolling(): void {
    if (this.pollingInterval) return; // Deja en cours

    // Poll toutes les 2 minutes pour detection rapide
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkAndProcessNewWorkouts();
      } catch (e) {
        logger.warn('[WorkoutObserver/Polling] Erreur:', e);
      }
    }, 2 * 60 * 1000);

    // Premier check immediat
    this.checkAndProcessNewWorkouts().catch(() => {});
    logger.info('[WorkoutObserver] Polling fallback actif (toutes les 2 min)');
  }

  /**
   * Forcer un check immediat des nouveaux workouts
   * Appele quand l'app revient au premier plan (foreground)
   * pour detecter les séances terminees pendant que l'app etait fermee
   * (Garmin, Fitbit, Polar, Suunto, COROS, Withings, Apple Watch)
   */
  async checkNewWorkoutsNow(): Promise<void> {
    try {
      logger.info('[WorkoutObserver] Check immediat (retour foreground)');
      await this.checkAndProcessNewWorkouts();
    } catch (e) {
      logger.warn('[WorkoutObserver] Check foreground echoue:', e);
    }
  }

  /**
   * Verifier et traiter les nouveaux workouts (appele par observer ou polling)
   */
  private _isProcessingWorkouts = false;
  private _lastWorkoutNotifTime: Record<string, number> = {};

  private async checkAndProcessNewWorkouts(): Promise<void> {
    // Mutex: éviter le traitement concurrent (cause de notifications dupliquées)
    if (this._isProcessingWorkouts) return;
    this._isProcessingWorkouts = true;
    try {
      const recentWorkouts = await this.getIOSWorkouts(7);
      if (!recentWorkouts || recentWorkouts.length === 0) return;

      // Charger les fingerprints pour eviter les doublons
      let importedFingerprints: Set<string> = new Set();
      try {
        const saved = await AsyncStorage.getItem('@yoroi_imported_workouts');
        if (saved) importedFingerprints = new Set(JSON.parse(saved));
      } catch {}

      // Traiter les workouts recents (pas seulement le dernier, pour rattraper ceux manques)
      for (const workout of recentWorkouts.slice(0, 5)) {
        const result = await this.processNewWorkout(workout, importedFingerprints);
        if (result) {
          // Cooldown de 30s par workout pour éviter les notifications dupliquées
          const notifKey = result.fingerprint || result.trainingId?.toString() || '';
          const lastTime = this._lastWorkoutNotifTime[notifKey] || 0;
          if (Date.now() - lastTime > 30000) {
            this._lastWorkoutNotifTime[notifKey] = Date.now();
            // Envoyer notification Strava-like
            await this.sendWorkoutCompletionNotification(workout, result.trainingId);
          }
        }
      }
    } catch (e) {
      logger.error('[WorkoutObserver] Erreur traitement workouts:', e);
    } finally {
      this._isProcessingWorkouts = false;
    }
  }

  /**
   * Enregistrer la categorie de notification avec action "Partager"
   */
  private async registerNotificationCategory(): Promise<void> {
    try {
      const Notif = await import('expo-notifications');
      await Notif.setNotificationCategoryAsync('workout_complete', [
        {
          identifier: 'share',
          buttonTitle: 'Partager',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'view',
          buttonTitle: 'Voir',
          options: { opensAppToForeground: true },
        },
      ]);
    } catch (e) {
      // Best effort - categories may not be supported everywhere
    }
  }

  /**
   * Envoyer une notification Strava-like apres un workout
   * Titre personnalise + stats detaillees + action Partager
   */
  private async sendWorkoutCompletionNotification(
    workout: NonNullable<HealthData['workouts']>[0],
    trainingId?: number
  ): Promise<void> {
    try {
      const Notif = await import('expo-notifications');

      // S'assurer que la categorie est enregistree
      await this.registerNotificationCategory();

      const sportLabel = getWorkoutLabel(workout.activityType);
      const durationH = Math.floor(workout.duration / 60);
      const durationM = Math.round(workout.duration % 60);
      const durationStr = durationH > 0
        ? `${durationH}h${durationM > 0 ? `${String(durationM).padStart(2, '0')}` : ''}`
        : `${durationM} min`;

      // Source device
      const source = workout.source ? normalizeSourceName(workout.source) : '';
      const sourceLabel = source === 'garmin' ? 'Garmin'
        : source === 'apple_watch' ? 'Apple Watch'
        : source === 'samsung' ? 'Samsung'
        : source === 'fitbit' ? 'Fitbit'
        : source === 'polar' ? 'Polar'
        : source === 'suunto' ? 'Suunto'
        : source === 'coros' ? 'COROS'
        : '';

      // Titre personnalise selon le sport
      const titres: Record<string, string> = {
        'Course': 'Belle course !',
        'Trail': 'Beau trail !',
        'Marche': 'Belle marche !',
        'Musculation': 'Belle séance de muscu !',
        'HYROX': 'Séance HYROX terminee !',
        'JJB': 'Beau roulage !',
        'Boxe': 'Belle séance de boxe !',
        'Velo': 'Belle sortie velo !',
        'Natation': 'Belle nage !',
        'Yoga': 'Namaste ! Belle séance.',
        'Football': 'Beau match de foot !',
        'Basketball': 'Beau match de basket !',
        'Tennis': 'Belle partie de tennis !',
        'Cardio': 'Belle séance de cardio !',
        'Danse': 'Belle séance de danse !',
        'CrossFit': 'WOD termine !',
        'Pilates': 'Belle séance de Pilates !',
        'Escalade': 'Belle grimpe !',
        'Ski': 'Belle descente !',
        'Ski de fond': 'Belle session de fond !',
        'Rugby': 'Beau match de rugby !',
        'Handball': 'Beau match de hand !',
        'Golf': 'Belle partie de golf !',
        'Surf': 'Belle session de surf !',
        'Aviron': 'Belle rame !',
      };

      const title = titres[sportLabel] || `Bravo pour ta séance de ${sportLabel.toLowerCase()} !`;

      // Corps enrichi style Strava
      const lines: string[] = [];

      // Ligne 1: durée + distance
      const mainStats: string[] = [durationStr];
      if (workout.distance && workout.distance > 0) {
        const distKm = workout.distance > 100 ? workout.distance / 1000 : workout.distance;
        mainStats.push(`${distKm.toFixed(2)} km`);
      }
      lines.push(mainStats.join(' | '));

      // Ligne 2: calories + FC
      const secondaryStats: string[] = [];
      if (workout.calories && workout.calories > 0) secondaryStats.push(`${Math.round(workout.calories)} kcal`);
      if (workout.averageHeartRate && workout.averageHeartRate > 0) {
        let hrStr = `FC moy ${Math.round(workout.averageHeartRate)} bpm`;
        if (workout.maxHeartRate && workout.maxHeartRate > 0) {
          hrStr += ` (max ${Math.round(workout.maxHeartRate)})`;
        }
        secondaryStats.push(hrStr);
      }
      if (secondaryStats.length > 0) lines.push(secondaryStats.join(' | '));

      // Ligne 3: source device
      if (sourceLabel) lines.push(`Via ${sourceLabel}`);

      // Ligne 4: CTA
      lines.push('Tape pour partager ta séance !');

      const body = lines.join('\n');

      await Notif.scheduleNotificationAsync({
        content: {
          title,
          body,
          subtitle: sourceLabel || undefined,
          categoryIdentifier: 'workout_complete',
          data: {
            type: 'workout_complete',
            workoutId: trainingId?.toString() || workout.id,
            sport: mapWorkoutType(workout.activityType),
            duration: workout.duration,
            distance: workout.distance,
            calories: workout.calories,
          },
          sound: 'default',
        },
        trigger: null, // Immediate
      });

      // Sauvegarder dans l'historique
      saveNotification(title, body, 'workout_complete', {
        workoutId: trainingId?.toString() || workout.id,
        sport: mapWorkoutType(workout.activityType),
      }).catch(() => {});

      logger.info(`[WorkoutObserver] Notification Strava-like envoyee: ${title}`);
    } catch (e) {
      logger.warn('[WorkoutObserver] Erreur notification:', e);
    }
  }

  /**
   * Importer l'historique de sommeil HealthKit dans sleepService (dedup par date)
   */
  async syncSleepHistory(days: number = 30): Promise<number> {
    try {
      const history = await this.getSleepHistory(days);
      if (!history || history.length === 0) return 0;

      let imported = 0;
      for (const night of history) {
        if (night.total < 30) continue; // Ignorer les nuits trop courtes

        // Estimer bedTime/wakeTime depuis la date et la durée
        // Score qualité basé sur durée + pourcentage sommeil profond+REM (approche Apple Santé)
        const deepRem = night.deep + night.rem;
        const deepRemPct = night.total > 0 ? (deepRem / night.total) * 100 : 0;
        let qualityNum: number;
        if (night.total >= 420 && deepRemPct >= 25) qualityNum = 5;      // 7h+ avec 25%+ profond/REM
        else if (night.total >= 360 && deepRemPct >= 18) qualityNum = 4; // 6h+ avec 18%+
        else if (night.total >= 300 && (deepRemPct >= 12 || night.total >= 390)) qualityNum = 3; // 5h+ ou 6h30
        else if (night.total >= 240) qualityNum = 2;                      // 4h+
        else qualityNum = 1;                                               // < 4h
        const totalHours = Math.floor(night.total / 60);
        const bedHour = 24 - Math.min(totalHours, 10); // Estimation: coucher = minuit - durée
        const wakeHour = bedHour + totalHours;

        const result = await addSleepEntryFromHealthKit({
          date: night.date,
          bedTime: `${(bedHour % 24).toString().padStart(2, '0')}:00`,
          wakeTime: `${(wakeHour % 24).toString().padStart(2, '0')}:00`,
          duration: night.total,
          quality: qualityNum,
          phases: {
            deep: night.deep,
            rem: night.rem,
            core: night.core,
            awake: night.awake,
          },
        });
        if (result) imported++;
      }

      logger.info(`[syncSleepHistory] ${imported}/${history.length} nuits importees`);
      return imported;
    } catch (error) {
      logger.error('[syncSleepHistory] Erreur:', error);
      return 0;
    }
  }

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
   * Écrire des données de sommeil dans Apple Santé
   * Permet la saisie manuelle du sommeil
   */
  async writeSleepData(data: { startDate: Date; endDate: Date }): Promise<boolean> {
    try {
      if (!this.syncStatus.isConnected) {
        logger.info('[HealthKit] Not connected - skipping sleep data write (local save still works)');
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
      const result = await HealthKit.saveCategorySample('HKCategoryTypeIdentifierSleepAnalysis', 1, startDate, endDate);

      if (result) {
        logger.info('[HealthKit] Sleep data written successfully');
        return true;
      } else {
        logger.error('[HealthKit] Failed to write sleep data');
        return false;
      }
    } catch (error) {
      logger.error('[HealthKit] Error writing sleep data:', error);
      return false;
    }
  }

  /**
   * Récupérer les détails complets du sommeil (phases, interruptions, qualité)
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
      const sleepDetailOptions = this.createQueryOptions(fromDate, toDate, { limit: 1000, ascending: false });
      if (!sleepDetailOptions) {
        logger.error('[HealthKit] getSleepDetails: Impossible de créer les options de requête');
        return null;
      }
      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', sleepDetailOptions);

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
        // Valeurs possibles: numeriques (0-5) OU strings ('inBed', 'asleep', etc.)
        const value = sample.value;

        // Numeric: 0=InBed, 1=Asleep, 2=Awake, 3=Core, 4=Deep, 5=REM
        if (value === 0 || value === 'inBed' || value === 'InBed') {
          stages.inBed += durationMinutes;
        } else if (value === 1 || value === 'asleep' || value === 'Asleep' || value === 'asleepUnspecified') {
          stages.asleep += durationMinutes;
        } else if (value === 2 || value === 'awake' || value === 'Awake') {
          stages.awake += durationMinutes;
          interruptions++;
        } else if (value === 3 || value === 'core' || value === 'Core' || value === 'asleepCore') {
          stages.core += durationMinutes;
        } else if (value === 4 || value === 'deep' || value === 'Deep' || value === 'asleepDeep') {
          stages.deep += durationMinutes;
        } else if (value === 5 || value === 'rem' || value === 'REM' || value === 'asleepREM') {
          stages.rem += durationMinutes;
        } else {
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
          bloodPressure: false,
          bloodGlucose: false,
          height: false,
          floorsClimbed: false,
          mindfulMinutes: false,
        },
      };
      this.isInitialized = false;
      logger.info('Déconnexion Apple Health complète');
    } catch (error) {
      logger.error('Erreur déconnexion:', error);
    }
  }

  // ============================================
  // NOUVEAU: FONCTION DE DIAGNOSTIC COMPLÈTE
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
    wrapperDiagnostic: typeof healthKitDiagnostic;
  }> {
    const errors: string[] = [];
    const recommendations: string[] = [];

    logger.info('========================================');
    logger.info('[HealthKit] DEMARRAGE DIAGNOSTIC COMPLET');
    logger.info('========================================');

    // 0. Log wrapper diagnostic
    logger.info('[Diagnostic] Wrapper diagnostic:', JSON.stringify(healthKitDiagnostic, null, 2));

    if (healthKitDiagnostic.moduleError) {
      errors.push('Module HealthKit: ' + healthKitDiagnostic.moduleError);
    }
    if (isMockMode) {
      errors.push('HealthKit est en mode MOCK (module natif non disponible) - les données seront vides');
      recommendations.push('Installez l\'app via EAS Build (pas Expo Go) pour activer le module natif HealthKit');
    }
    if (healthKitDiagnostic.isExpoGo) {
      errors.push('Expo Go detecte - les modules natifs (HealthKit, NitroModules) ne fonctionnent pas dans Expo Go');
      recommendations.push('Utilisez un Development Build (npx expo run:ios ou EAS Build) pour tester HealthKit');
    }

    // 1. Verifier si HealthKit est disponible
    const healthKitAvailable = await this.isAvailable();
    logger.info('[Diagnostic] HealthKit disponible:', healthKitAvailable);

    if (!healthKitAvailable) {
      if (!errors.some(e => e.includes('Module HealthKit'))) {
        errors.push('HealthKit non disponible sur cet appareil');
      }
      recommendations.push('Verifiez que vous etes sur un appareil iOS physique (pas simulateur)');
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
      wrapperDiagnostic: { ...healthKitDiagnostic },
    };
  }
}

export const healthConnect = new HealthConnectService();

export const getProviderIcon = (): string => '';

export const getConnectionInstructions = (): string[] => [
  "1. YOROI va demander l'accès à l'app Santé",
  "2. Autorise l'accès au poids, aux pas, au sommeil et à l'hydratation",
  "3. Tes données seront synchronisées automatiquement",
];

export default healthConnect;
