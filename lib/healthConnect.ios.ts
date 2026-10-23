// ============================================
// YOROI - SERVICE HEALTH CONNECT (iOS)
// ============================================
// Intégration Apple Health uniquement
// ============================================

import { Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '@/lib/security/secureStorage';
// Demo data removed - DEMO_MODE is disabled for production
import logger from '@/lib/security/logger';
import { demoActive } from '@/lib/v2/demo/garde';
import { vientDeLaMontre } from '@/lib/v2/montre/idsRecus';
import { getNativeWorkouts, runNativeDiagnostic, NativeDiagnosticResult, requestAllHealthPermissionsNative, requestHealthPermissionsForNative, getRequestStatusForNative, getTodayActivityRingsNative, getWorkoutEffortScoreNative, getNativeSleepSamples, getNativeSteps, getAppleWorkoutExtrasNative, getApplePreferredHeartRateZonesNative } from './yoroiHealthKit';
import { appleHumidity, appleTemperature, parseAppleZones, recoveryFromSamples, splitsFromDistance, trunc1 } from './v2/seances/appleExtras';
import type { AppleZones } from './v2/seances/appleExtras';
import { saveHealthDataBatch, saveHealthData, addWeight, getWeights, addTraining, updateTrainingDetails, getExistingHealthkitUUIDs, getTrainingsCount } from './database';
import { completerLieuImport } from '@/lib/v2/seances/importLieu';
import type { HealthDataRecord, Training } from './database';
import { addSleepEntryFromHealthKit, purgerNuitsHealthKit } from './sleepService';
import { calculerNuits, cleNuit, mesuresPendantNuit, nuitPourJour } from './v2/sante/nuit';
import type { EchantillonSommeil, MesureNuit, NuitCalculee } from './v2/sante/nuit';
import { signalerSeanceTerminee } from './v2/notifications/seanceTerminee';
import { getEffectiveHRZones, calcZoneDurations, ZONE_COLORS } from './hrZones';
import { syncAppleZones, backfillAppleZones } from './appleZonesSync';
import { mergeAppleZones, parseZoneTimes } from './v2/seances/appleZonesSync';
import type { AppleZoneTimes } from './v2/seances/appleZonesSync';
import { appleInt, appleKm, applePaceSec, hrStats, pausesFromEvents, simplifyRoute } from './v2/seances/workoutMath';

// ============================================
// MODE DÉMO - Active les fausses données
// ============================================
// ATTENTION: Mettre à FALSE pour utiliser les vraies données Apple Health
// PRODUCTION: Désactivé pour l'App Store
// NOTE: Désactivé - les données vides s'afficheront si non connecté à HealthKit
const DEMO_MODE = false;

// Apple HealthKit (iOS) - Safe wrapper with Expo Go fallback
import HealthKit, { isHealthKitAvailable, isRunningInExpoGo, healthKitDiagnostic, isMockMode } from './healthKit.wrapper';
// Type seulement : vérifie à la compilation que chaque identifiant demandé existe dans le module
import type { ObjectTypeIdentifier } from '@kingstinct/react-native-healthkit';
// 14 octobre 2026 (SANTÉ CONNEXION) : source unique des types demandés
import { IOS_ECRITURE_IPHONE, IOS_LECTURE_AVANCE, IOS_LECTURE_ESSENTIEL, ids } from './v2/sante/typesSante';
import type { StatutDemande } from './v2/sante/connexion';
import { traduire } from '@/lib/i18n/tr';

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

// Drapeau « rubriques complémentaires déjà proposées ». v2 (10 octobre 2026) : la liste a grandi,
// on la repropose une fois. iOS n'affiche que les rubriques jamais proposées.
const EXTENDED_ASKED_KEY = '@yoroi_health_extended_asked_v2';

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
    avgPowerWatts?: number;   // 14 octobre 2026 : puissance moyenne du kilomètre (course)
  }>;
  // 14 octobre 2026 (zones_apple) : zones lues chez Apple (iOS 27), à la seconde près
  appleZones?: AppleZones;
  // 14 octobre 2026 (ios27) : zones de puissance velo d'Apple (iOS 27), en watts
  applePowerZones?: AppleZoneTimes;
  // Effort estimé par la montre (pas saisi par toi)
  effortEstimated?: boolean;
  // Mesures de course, moyenne et plage comme Forme
  groundContactMs?: { avg: number; min?: number; max?: number };
  strideLengthM?: { avg: number; min?: number; max?: number };
  verticalOscCm?: { avg: number; min?: number; max?: number };
  // Météo brute (°C non arrondis, humidité telle que lue) pour vérifier l'affichage
  weatherTempRawC?: number;
  weatherHumidityRaw?: number;
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
  // Effort perçu (Apple Watch, 1-10)
  effortScore?: number;
  // Cadence moyenne (pas/min pour course/marche, tours/min pour vélo)
  cadence?: number;
  // Vitesse moyenne en km/h (vélo, natation, rameur)
  avgSpeedKmh?: number;
  // Puissance moyenne en watts (vélo, rameur)
  avgPowerWatts?: number;
  // VO2 Max (ml/kg/min), mesuré par Apple Watch lors des séances de course
  vo2Max?: number;
  // Nombre de pas pendant la séance (marche, course, randonnée)
  stepsCount?: number;
  // 14 octobre 2026 : valeurs exactes de l'entraînement Apple, pour afficher comme Forme
  workoutStart?: string;       // ISO, début exact
  workoutEnd?: string;         // ISO, fin exacte
  durationSeconds?: number;    // durée d'entraînement Apple (HKWorkout.duration, pauses exclues)
  distanceMeters?: number;     // distance brute en mètres
  pauses?: Array<{ start: string; end: string }>; // pauses (HKWorkoutEvent pause et reprise)
  city?: string;               // ville du départ, si le téléphone sait la nommer
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
  'Google Health': 'fitbit', 'Fitbit Air': 'fitbit', 'Pixel Watch': 'fitbit',
  // Xiaomi
  'Mi Fitness': 'xiaomi', 'Mi Fit': 'xiaomi', 'Zepp Life': 'xiaomi', // Zepp Life = ex Mi Fit (bracelets et balances Xiaomi)
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
  'Amazfit': 'amazfit', 'Zepp': 'amazfit',
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

// Identifiants de YOROI (app.json : iOS com.houari.yoroi, Android com.houari24.yoroi).
// Ce que YOROI écrit dans Apple Santé ne doit jamais revenir comme une pesée d'une autre source.
const YOROI_BUNDLE_IDS = ['com.houari.yoroi', 'com.houari24.yoroi'];

/** true si l'échantillon a été écrit par YOROI lui-même */
export const isYoroiSample = (sample: any): boolean => {
  // l'app Apple Watch YOROI (bundle ou identifiant externe d'une action deja recue) : deja dans YOROI
  if (vientDeLaMontre(sample)) return true;
  const bundle = String(sample?.sourceRevision?.source?.bundleIdentifier ?? sample?.sourceBundleId ?? '').toLowerCase();
  if (bundle && YOROI_BUNDLE_IDS.some((b) => bundle === b || bundle.startsWith(`${b}.`))) return true;
  const name = String(sample?.sourceRevision?.source?.name ?? sample?.sourceName ?? '');
  return /yoroi/i.test(name);
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
    barre_au_sol: traduire('Barre au sol'), stretching: 'Stretching', step_aerobic: 'Step',
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
    tennis: 'Tennis', tennis_de_table: traduire('Tennis de table'),
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
    athletisme: 'Athletisme', tir_a_larc: traduire('Tir a l\'arc'),
    bowling: 'Bowling', disc_golf: 'Disc Golf',
    // Divers
    récupération: traduire('Récupération'), triathlon: 'Triathlon',
    transition: 'Transition',
    jeu: traduire('Jeu'), chasse: 'Chasse', peche: 'Peche',
    autre: traduire('Séance'),
  };
  return labels[mapped] || traduire('Séance');
};

// Date locale AAAA-MM-JJ (toISOString donne la date UTC : décalage d'un jour la nuit ou hors d'Europe)
const localDateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Jour local d'un échantillon, ou le repli donné si la date manque ou est invalide */
const sampleDay = (d: string | Date | undefined | null, fallback: string): string => {
  if (!d) return fallback;
  const x = new Date(d);
  return isNaN(x.getTime()) ? fallback : localDateKey(x);
};

/** Instant à donner à un échantillon écrit pour le jour AAAA-MM-JJ : maintenant si c'est aujourd'hui, midi sinon */
const instantForDay = (day?: string): Date => {
  const now = new Date();
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day) || day === localDateKey(now)) return now;
  const [y, m, dd] = day.split('-').map(Number);
  const at = new Date(y, m - 1, dd, 12, 0, 0, 0);
  return at.getTime() > now.getTime() ? now : at;
};


/** Interieur ou dehors d'apres les metadonnees Apple (HKIndoorWorkout), sinon inconnu */
function indoorDe(workout: any): boolean | undefined {
  const raw = workout?.metadataIndoorWorkout ?? workout?.metadata?.HKIndoorWorkout ?? workout?.metadata?.HKMetadataKeyIndoorWorkout;
  if (raw === true || raw === 1 || raw === '1') return true;
  if (raw === false || raw === 0 || raw === '0') return false;
  return undefined;
}

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
    return traduire('App Santé');
  }

  /**
   * Simple requestAuthorization - sans tester les permissions après.
   * Sur iOS, Apple ne révèle pas ce que l'utilisateur a choisi.
   */
  private async requestIOSPermissionsSimple(): Promise<void> {
    if (!HealthKit) throw new Error('HealthKit module not available');

    // 14 octobre 2026 (SANTÉ CONNEXION) : mêmes listes que la demande native (lib/v2/sante/typesSante.ts)
    const toRead = ids(IOS_LECTURE_ESSENTIEL) as ObjectTypeIdentifier[];
    const toShare = ids(IOS_ECRITURE_IPHONE) as any[];

    await HealthKit.requestAuthorization({ toRead, toShare });
  }

  private async requestIOSPermissions(): Promise<HealthPermissions> {
    try {
      // VÉRIFIER QUE LE MODULE HEALTHKIT EST CHARGÉ
      if (!HealthKit) {
        logger.error('[HealthKit] Module not loaded - cannot request permissions');
        throw new Error('HealthKit module not available');
      }

      // 14 octobre 2026 (SANTÉ CONNEXION) : mêmes listes que la demande native
      const toRead = ids(IOS_LECTURE_ESSENTIEL) as ObjectTypeIdentifier[];
      const toShare = ids(IOS_ECRITURE_IPHONE) as any[];

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

  /**
   * 14 octobre 2026 (SANTÉ CONNEXION) : une seule connexion à la fois. Le lancement, l'onboarding et les
   * Réglages ne demandent plus en parallèle (deux fenêtres, deux synchros, roue qui tourne sans fin).
   */
  private connectEnCours: Promise<boolean> | null = null;
  /** Zones d'Apple lues pendant la connexion, attendues par l'import (les séances les utilisent) */
  private zonesAvantImport: Promise<unknown> | null = null;

  /**
   * sansSync : la connexion rend la main dès la fenêtre répondue (écrans avec une roue). L'import est
   * lancé à part (lib/v2/sante/connecter.ts). Sans option : comportement d'avant (lancement de l'app).
   */
  async connect(opts?: { sansSync?: boolean }): Promise<boolean> {
    // Une connexion du lancement est en cours (avec sa synchro) : un écran avec une roue n'attend que la fenêtre
    if (this.connectEnCours) return opts?.sansSync && this.demandeEnCours ? this.demandeEnCours : this.connectEnCours;
    let signal: (v: boolean) => void = () => {};
    this.demandeEnCours = new Promise<boolean>((res) => (signal = res));
    this.connectEnCours = this.connectUneFois(opts, (v) => signal(v))
      .then((v) => {
        signal(v);
        return v;
      })
      .finally(() => {
        this.connectEnCours = null;
        this.demandeEnCours = null;
      });
    return this.connectEnCours;
  }

  /** Se résout dès la fenêtre répondue, sans attendre la synchro */
  private demandeEnCours: Promise<boolean> | null = null;

  private async connectUneFois(opts?: { sansSync?: boolean }, demandeFaite?: (v: boolean) => void): Promise<boolean> {
    // Mode démo : simuler une connexion réussie
    if (DEMO_MODE && __DEV__) {
      this.syncStatus.isConnected = true;
      this.syncStatus.lastSync = new Date().toISOString();
      delete this.syncStatus.failureReason;
      await this.saveSyncStatus();
      return true;
    }

    // 14 octobre 2026 (ios27) : premiere connexion (onboarding, reglage Sante) ou simple reconnexion au lancement
    const wasConnected = this.syncStatus.isConnected === true;
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

      // Demande native (bypass Nitro v13 qui échoue sur iOS 26) avec la liste exacte de lib/v2/sante/typesSante.ts :
      // seulement ce que YOROI lit ou écrit. Les mesures avancées sont demandées à part, sur appui.
      let nativePermResult = await requestHealthPermissionsForNative(ids(IOS_LECTURE_ESSENTIEL), ids(IOS_ECRITURE_IPHONE)).catch(() => 'error:native failed');
      logger.info('[HealthConnect] requestHealthPermissionsForNative:', nativePermResult);
      if (nativePermResult.startsWith('error:module absent')) {
        // Build natif plus ancien : ancienne demande native, puis Nitro
        nativePermResult = await requestAllHealthPermissionsNative().catch(() => 'error:native failed');
        if (nativePermResult.startsWith('error:module absent')) {
          try {
            await this.requestIOSPermissionsSimple();
            logger.info('[HealthConnect] requestAuthorization Nitro réussi (fallback)');
          } catch (permError) {
            logger.warn('[HealthConnect] requestAuthorization Nitro a échoué (fallback):', permError);
          }
        }
      }

      logger.info('[HealthConnect] Marquage comme connecté');

      // iOS ne dit jamais si la lecture est refusée : « connecté » veut dire « fenêtre répondue ».
      // L'écran vérifie ensuite par une vraie lecture (lectureReelle) avant d'afficher que c'est relié.
      this.syncStatus.isConnected = true;
      this.syncStatus.lastSync = new Date().toISOString();
      delete this.syncStatus.failureReason;

      await this.saveSyncStatus();
      demandeFaite?.(true);

      logger.info('[HealthConnect] Connexion HealthKit réussie');

      // 14 octobre 2026 (ios27) : sur iOS 27, tes zones d'Apple Sante deviennent tes zones actives, sans rien
      // toucher (jamais si tu as saisi les tiennes). Avant l'import, pour que les seances les utilisent.
      const zones = syncAppleZones({ force: !wasConnected })
        .then((r) => logger.info('[HealthConnect] Zones Apple:', r))
        .catch((zErr) => logger.warn('[HealthConnect] Zones Apple ignorées:', zErr));

      if (opts?.sansSync) {
        // L'écran n'attend ni les zones ni la synchro : l'import les attend (importFullHistory)
        this.zonesAvantImport = zones;
        return true;
      }

      await zones;
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

  /**
   * 14 octobre 2026 (SANTÉ CONNEXION) : la fenêtre d'Apple a-t-elle été répondue pour les types essentiels ?
   * 'a_demander' : jamais répondue (quittée, ou nouveaux types). 'repondu' : répondue (Apple ne dit pas oui ou non).
   */
  async statutDemande(): Promise<StatutDemande> {
    if (!isHealthKitAvailable || isRunningInExpoGo) return 'inconnu';
    const read = ids(IOS_LECTURE_ESSENTIEL);
    const share = ids(IOS_ECRITURE_IPHONE);
    let r = await getRequestStatusForNative(read, share).catch(() => 'unknown' as const);
    if (r === 'unknown' && HealthKit && typeof (HealthKit as any).getRequestStatusForAuthorization === 'function') {
      try {
        // @kingstinct v13 : 0 inconnu, 1 à demander, 2 inutile
        const n = Number(await (HealthKit as any).getRequestStatusForAuthorization({ toRead: read, toShare: share }));
        r = n === 1 ? 'shouldRequest' : n === 2 ? 'unnecessary' : 'unknown';
      } catch {
        r = 'unknown';
      }
    }
    return r === 'shouldRequest' ? 'a_demander' : r === 'unnecessary' ? 'repondu' : 'inconnu';
  }

  /**
   * 14 octobre 2026 (SANTÉ CONNEXION) : essai de lecture réel sur 60 jours (poids, pas, FC, séances, sommeil).
   * Vrai seulement si au moins une donnée revient : c'est la seule preuve que l'accès est ouvert sur iOS.
   */
  async lectureReelle(): Promise<boolean> {
    if (!HealthKit || !isHealthKitAvailable || isRunningInExpoGo) return false;
    const fin = new Date();
    const debut = new Date(fin.getTime() - 60 * 24 * 60 * 60 * 1000);
    const opts = this.createQueryOptions(debut, fin, { limit: 1 });
    if (!opts) return false;
    const essais: Array<() => Promise<unknown[] | null | undefined>> = [
      () => HealthKit!.queryQuantitySamples('HKQuantityTypeIdentifierStepCount', opts),
      () => HealthKit!.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', opts),
      () => HealthKit!.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', opts),
      () => HealthKit!.queryQuantitySamples('HKQuantityTypeIdentifierActiveEnergyBurned', opts),
      () => HealthKit!.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', opts),
      () => HealthKit!.queryWorkoutSamples({ filter: { date: { startDate: debut, endDate: fin } }, limit: 1 } as any),
    ];
    for (const essai of essais) {
      try {
        const r = await this.withTimeout(Promise.resolve(essai()), 4000);
        if (Array.isArray(r) && r.length > 0) return true;
      } catch {
        /* type refusé ou vide : on essaie le suivant */
      }
    }
    return false;
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
    // Unité explicite (sinon HealthKit renvoie l'unité préférée de l'utilisateur, ex : livres)
    if (cleanOptions.unit) result.unit = cleanOptions.unit;
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

      // Plusieurs échantillons : on saute ceux écrits par YOROI (pesée manuelle recopiée)
      const queryOptions = this.createQueryOptions(fromDate, new Date(), {
        limit: 30,
        ascending: false,
        unit: 'kg',
      });
      if (!queryOptions) {
        return null;
      }

      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', queryOptions);
      const latest = (samples ?? []).find((x: any) => !isYoroiSample(x));

      if (latest) {
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
        // 1. Chemin natif Swift en PRIORITÉ (HKStatisticsCollectionQuery, dédoublonné,
        //    fiable sur iOS 26, même pattern que getNativeWorkouts)
        const nativeSteps = await getNativeSteps(1).catch(() => null);
        if (nativeSteps !== null && nativeSteps.length > 0) {
          const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          const todayEntry = nativeSteps.find(d => d.date === todayKey);
          if (todayEntry && todayEntry.steps > 0) {
            logger.info('[HealthKit] Pas via Swift natif:', todayEntry.steps);
            return {
              count: Math.min(todayEntry.steps, 100000),
              date: today.toISOString(),
            };
          }
        }

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

  /**
   * Récupère les échantillons de sommeil : Swift natif en PRIORITÉ (fiable sur iOS 26),
   * fallback Nitro si le module natif est absent (build sans rebuild natif).
   * Retourne les samples au format Nitro pour compatibilité avec le code existant.
   */
  private async querySleepSamplesUnified(fromDate: Date, toDate: Date, limit: number = 5000): Promise<any[] | null> {
    // 1. Chemin natif Swift, même pattern que getNativeWorkouts (bypass Nitro v13)
    const daysSpan = Math.max(1, Math.ceil((Date.now() - fromDate.getTime()) / 86400000));
    const native = await getNativeSleepSamples(daysSpan).catch(() => null);
    if (native !== null) {
      const fromMs = fromDate.getTime();
      const toMs = toDate.getTime();
      const mapped = native
        .filter(s => s.endDate >= fromMs && s.startDate <= toMs)
        .map(s => ({
          startDate: new Date(s.startDate),
          endDate: new Date(s.endDate),
          value: s.value,
          sourceRevision: { source: { name: s.sourceName, bundleIdentifier: s.sourceBundleId } },
          device: { name: s.deviceName },
        }));
      logger.info('[HealthKit] Sommeil via Swift natif:', mapped.length, 'échantillons');
      return mapped;
    }

    // 2. Fallback Nitro (ancien chemin, peut échouer silencieusement sur iOS 26)
    logger.warn('[HealthKit] Module natif sommeil absent, fallback Nitro');
    if (!HealthKit) return null;
    const options = this.createQueryOptions(fromDate, toDate, { limit });
    if (!options) return null;
    try {
      const samples = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', options);
      return samples ? [...samples] : null;
    } catch (e) {
      logger.warn('[HealthKit] Fallback Nitro sommeil échoué:', e);
      return null;
    }
  }

  /** Echantillons de sommeil (format Nitro ou natif) vers le format du calcul de nuit */
  private versEchantillonsSommeil(samples: any[]): EchantillonSommeil[] {
    const VAL: Record<string, number> = { inBed: 0, InBed: 0, asleep: 1, Asleep: 1, asleepUnspecified: 1, awake: 2, Awake: 2, core: 3, Core: 3, asleepCore: 3, deep: 4, Deep: 4, asleepDeep: 4, rem: 5, REM: 5, asleepREM: 5 };
    const out: EchantillonSommeil[] = [];
    for (const s of samples || []) {
      const debut = new Date(s.startDate).getTime();
      const fin = new Date(s.endDate).getTime();
      const valeur = typeof s.value === 'number' ? s.value : VAL[String(s.value)];
      if (!Number.isFinite(debut) || !Number.isFinite(fin) || valeur === undefined) continue;
      out.push({
        debut,
        fin,
        valeur,
        source: s.sourceRevision?.source?.name || s.sourceName || '',
        bundle: s.sourceRevision?.source?.bundleIdentifier || '',
        appareil: s.device?.name || s.device?.model || '',
      });
    }
    return out;
  }

  /**
   * Derniere nuit, calculee comme l'app Sante (lib/v2/sante/nuit.ts, 16 octobre 2026) :
   * une seule source (montre d'abord), chevauchements comptes une fois, eveils entre le premier et le dernier sommeil,
   * somme en millisecondes et arrondi une seule fois.
   */
  private async getIOSSleep(): Promise<HealthData['sleep'] | null> {
    return this.queryHealthKit(async () => {
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const samples = await this.querySleepSamplesUnified(twoDaysAgo, now, 500);
      logger.info('[HealthKit] Échantillons sommeil bruts:', samples?.length || 0);
      if (!samples || samples.length === 0) {
        logger.info('[HealthKit] Aucune donnée de sommeil trouvée');
        return null;
      }
      const nuits = calculerNuits(this.versEchantillonsSommeil(samples)).filter((n) => n.totalMinutes >= 30 && n.totalMinutes <= 960);
      const n = nuits[nuits.length - 1];
      if (!n) return null;
      logger.info('[HealthKit] Sommeil calculé:', { cle: n.cle, total: n.totalMinutes, minutes: n.minutes, source: n.source });
      return {
        startTime: new Date(n.debut).toISOString(),
        endTime: new Date(n.fin).toISOString(),
        duration: n.totalMinutes,
        quality: this.getSleepQuality(n.totalMinutes),
        source: n.source,
        phases: {
          deep: n.minutes.profond,
          rem: n.minutes.paradoxal,
          core: n.minutes.leger + n.minutes.endormi,
          awake: n.minutes.eveil,
          inBed: n.auLitMinutes,
        },
      };
    }, 'sleep');
  }

  /**
   * Une nuit en detail pour l'ecran « Ta nuit » : phases a la seconde, et pendant le sommeil
   * le coeur, la respiration et la temperature du poignet (du premier au dernier echantillon de sommeil).
   * jour : AAAA-MM-JJ du reveil ; coucher : HH:MM note, pour retrouver une nuit rangee sous l'ancienne cle.
   */
  async getSleepNight(jour: string, coucher?: string): Promise<{ nuit: NuitCalculee; coeur: MesureNuit | null; respiration: MesureNuit | null; temperature: MesureNuit | null } | null> {
    try {
      const base = new Date(jour.slice(0, 10) + 'T12:00:00');
      if (isNaN(base.getTime())) return null;
      const from = new Date(base);
      from.setDate(from.getDate() - 2);
      from.setHours(18, 0, 0, 0);
      const to = new Date(base);
      to.setDate(to.getDate() + 1);
      to.setHours(18, 0, 0, 0);
      const now = new Date();
      const raw = await this.querySleepSamplesUnified(from, to > now ? now : to, 5000);
      if (!raw || raw.length === 0) return null;
      const nuit = nuitPourJour(calculerNuits(this.versEchantillonsSommeil(raw)), jour.slice(0, 10), coucher);
      if (!nuit) return null;
      const [coeur, respiration, temperature] = await Promise.all([
        this.mesuresDeLaNuit('HKQuantityTypeIdentifierHeartRate', 'count/min', nuit, { min: 25, max: 230 }),
        this.mesuresDeLaNuit('HKQuantityTypeIdentifierRespiratoryRate', 'count/min', nuit, { min: 4, max: 60, decimales: 1 }),
        this.mesuresDeLaNuit('HKQuantityTypeIdentifierAppleSleepingWristTemperature', 'degC', nuit, { min: 25, max: 45, decimales: 1 }),
      ]);
      return { nuit, coeur, respiration, temperature };
    } catch (e) {
      logger.warn('[HealthKit] getSleepNight impossible:', e);
      return null;
    }
  }

  private async mesuresDeLaNuit(id: string, unit: string, nuit: NuitCalculee, opts: { min: number; max: number; decimales?: number }): Promise<MesureNuit | null> {
    if (!HealthKit) return null;
    try {
      const o = this.createQueryOptions(new Date(nuit.debut), new Date(nuit.fin), { limit: 0, ascending: true, unit });
      if (!o) return null;
      const r: any[] = (await HealthKit.queryQuantitySamples(id as any, o)) || [];
      const ech = r.map((x: any) => ({
        debut: new Date(x.startDate).getTime(),
        valeur: Number(x.quantity),
        source: x.sourceRevision?.source?.name || '',
        bundle: x.sourceRevision?.source?.bundleIdentifier || '',
        appareil: x.device?.name || x.device?.model || '',
      }));
      return mesuresPendantNuit(ech, nuit.debut, nuit.fin, opts);
    } catch {
      return null;
    }
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
      const dateStr = localDateKey(d);
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
          const d = s.startDate ? localDateKey(new Date(s.startDate)) : '';
          const entry = days.find(x => x.date === d);
          if (entry) entry.calories += Math.round(s.quantity || 0);
        }
      }
      if (exRes.status === 'fulfilled' && exRes.value) {
        for (const s of exRes.value) {
          const d = s.startDate ? localDateKey(new Date(s.startDate)) : '';
          const entry = days.find(x => x.date === d);
          if (entry) entry.exerciseMin += Math.round(s.quantity || 0);
        }
      }
      if (stRes.status === 'fulfilled' && stRes.value) {
        for (const s of stRes.value) {
          const d = s.startDate ? localDateKey(new Date(s.startDate)) : '';
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

      // Toutes les sources (Withings, Health Mate, autres balances), sauf ce que YOROI a écrit
      const queryOptions = this.createQueryOptions(fromDate, new Date(), {
        limit: 30,
        ascending: false,
      });
      if (!queryOptions) {
        return null;
      }
      const leanOptions = this.createQueryOptions(fromDate, new Date(), {
        limit: 30,
        ascending: false,
        unit: 'kg',
      });

      // UTILISER Promise.allSettled POUR NE PAS BLOQUER SI 1 ÉCHOUE
      const results = await Promise.allSettled([
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyFatPercentage', queryOptions),
        HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierLeanBodyMass', leanOptions ?? queryOptions),
      ]);

      const fatSamples: any[] = results[0].status === 'fulfilled' ? (results[0].value as any[]) ?? [] : [];
      const leanSamples: any[] = results[1].status === 'fulfilled' ? (results[1].value as any[]) ?? [] : [];
      const fat = fatSamples.find((x: any) => !isYoroiSample(x));
      const lean = leanSamples.find((x: any) => !isYoroiSample(x));

      // Apple Santé donne un ratio (0,184) : 18,4 % au dixième près
      const bodyFatPercentage = fat && Number.isFinite(Number(fat.quantity))
        ? Math.round(Number(fat.quantity) * 1000) / 10
        : undefined;

      const leanBodyMass = lean && Number.isFinite(Number(lean.quantity))
        ? Math.round(Number(lean.quantity) * 10) / 10
        : undefined;

      if (bodyFatPercentage !== undefined || leanBodyMass !== undefined) {
        // Source et date : celles de l'échantillon de masse grasse, sinon de masse maigre
        const sourceSample = fat ?? lean ?? null;
        const sampleDate = sourceSample?.startDate ? new Date(sourceSample.startDate) : null;
        return {
          bodyFatPercentage,
          leanBodyMass,
          date: sampleDate && !isNaN(sampleDate.getTime()) ? sampleDate.toISOString() : new Date().toISOString(),
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
        const date = localDateKey(new Date(s.startDate));
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
        // Les séances que YOROI a lui-même écrites dans Apple Santé sont déjà dans YOROI :
        // les réimporter créait un doublon dans ton historique (même séance, autre identifiant)
        if (isYoroiSample(workout)) continue;
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
            // Identifiant complet : « heartRate » seul n'existe pas en v13 et faisait échouer l'appel (FC jamais importée)
            const hrStat = await workout.getStatistic('HKQuantityTypeIdentifierHeartRate', 'count/min');
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
          distance: distanceMeters != null ? appleKm(distanceMeters) : undefined,
          calories: caloriesKcal != null ? appleInt(caloriesKcal) : undefined,
          averageHeartRate: hrAvg,
          maxHeartRate: hrMax,
          source: workout.sourceRevision?.source?.name || undefined,
          // 17 octobre 2026 : seance en interieur ou dehors selon Apple (absent : inconnu)
          indoor: indoorDe(workout),
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
        logger.info('[getIOSWorkouts] M1 queryWorkoutSamples →', rawWorkouts.length, 'workout(s)');
      } catch (e: any) {
        logger.warn('[getIOSWorkouts] M1 erreur:', e?.message);
      }

      // === MÉTHODE 2: queryWorkoutSamplesWithAnchor (fallback si méthode 1 retourne 0) ===
      if (rawWorkouts.length === 0) {
        try {
          const opts: any = { limit: 0 };
          if (filter) opts.filter = filter;
          const anchorResult = await HealthKit.queryWorkoutSamplesWithAnchor(opts);
          if (anchorResult?.workouts?.length > 0) {
            rawWorkouts = anchorResult.workouts;
            logger.info('[getIOSWorkouts] M2 queryWorkoutSamplesWithAnchor →', rawWorkouts.length, 'workout(s)');
          } else {
            logger.info('[getIOSWorkouts] M2 → 0 workout(s)');
          }
        } catch (e: any) {
          logger.warn('[getIOSWorkouts] M2 erreur:', e?.message);
        }
      }

      // === MÉTHODE 3: Module natif Swift direct (contournement total du bridge Nitro) ===
      if (rawWorkouts.length === 0) {
        try {
          const daysParam = days ?? 0;
          logger.info('[getIOSWorkouts] M3 module Swift natif, days=' + daysParam);
          const nativeWorkouts = await getNativeWorkouts(daysParam);
          logger.info('[getIOSWorkouts] M3 résultat:', nativeWorkouts.length, 'workout(s)');
          if (nativeWorkouts.length > 0) {
            rawWorkouts = nativeWorkouts.map(w => ({
              uuid: w.uuid,
              startDate: new Date(w.startDate),  // timestamp ms → Date
              endDate: new Date(w.endDate),
              workoutActivityType: w.workoutActivityType,
              totalDistance: w.totalDistance > 0 ? { quantity: w.totalDistance, unit: 'm' } : undefined,
              totalEnergyBurned: w.totalEnergyBurned > 0 ? { quantity: w.totalEnergyBurned, unit: 'kcal' } : undefined,
              sourceRevision: { source: { name: w.sourceName, bundleIdentifier: (w as any).sourceBundleId } },
            }));
          }
        } catch (e: any) {
          logger.warn('[getIOSWorkouts] M3 erreur:', e?.message);
        }
      }

      if (rawWorkouts.length === 0) {
        logger.warn('[getIOSWorkouts] TOUTES LES MÉTHODES ont retourné 0 workout');
        return null;
      }

      const mapped = await this.mapRawWorkouts(rawWorkouts);
      logger.info('[getIOSWorkouts] ', mapped.length, 'workout(s) mappés avec succès');
      return mapped.length > 0 ? mapped : null;
    }, 'workouts');
  }

  async getWorkouts(): Promise<HealthData['workouts'] | null> {
    return this.getIOSWorkouts();
  }

  /**
   * 16 octobre 2026 (SEANCES AVATAR) : seances d'Apple Sante sur une periode, pour « Importer mes seances »
   * de l'onglet Seances. Memes champs que l'import complet ; les seances ecrites par YOROI ou sa montre sont
   * deja ecartees par mapRawWorkouts (isYoroiSample). null si rien n'est lisible (acces coupe ou vide).
   * Le choix de ce qui est ajoute (doublons, identifiants deja connus) est dans lib/v2/seances/importPlan.ts.
   */
  async lireSeancesPourImport(days?: number | null): Promise<Array<{ training: Training; empreinte: string; debutIso: string }> | null> {
    let workouts: HealthData['workouts'] | null = null;
    try {
      workouts = await this.withTimeout(this.getIOSWorkouts(days && days > 0 ? days : undefined), 300000);
    } catch (e) {
      logger.warn('[lireSeancesPourImport] lecture impossible', e);
      return null;
    }
    if (!workouts || workouts.length === 0) return null;
    const out: Array<{ training: Training; empreinte: string; debutIso: string }> = [];
    for (const workout of workouts) {
      try {
        const uuid = (workout as any).hkUUID || workout.id;
        const workoutLabel = getWorkoutLabel(workout.activityType);
        const noteParts: string[] = [];
        if (workout.duration > 0) noteParts.push(`${Math.round(workout.duration)} min`);
        if (workout.distance && workout.distance > 0) noteParts.push(`${workout.distance.toFixed(2)} km`);
        if (workout.calories && workout.calories > 0) noteParts.push(`${Math.round(workout.calories)} kcal`);
        if (workout.averageHeartRate && workout.averageHeartRate > 0) noteParts.push(`${Math.round(workout.averageHeartRate)} bpm`);
        out.push({
          empreinte: `${workout.startDate}_${workout.activityType}_${workout.duration}`,
          debutIso: workout.startDate,
          training: {
            sport: mapWorkoutType(workout.activityType),
            session_type: workoutLabel,
            date: localDateKey(new Date(workout.startDate)),
            start_time: new Date(workout.startDate).toTimeString().slice(0, 5),
            duration_minutes: workout.duration,
            distance: workout.distance ? parseFloat(workout.distance.toFixed(2)) : undefined,
            calories: workout.calories,
            heart_rate: workout.averageHeartRate,
            max_heart_rate: workout.maxHeartRate,
            source: workout.source ? normalizeSourceName(workout.source) : undefined,
            notes: noteParts.length > 0 ? `${workoutLabel} (${noteParts.join(', ')})` : workoutLabel,
            healthkit_uuid: uuid || undefined,
            is_outdoor: (workout as any).indoor === false || undefined,
          },
        });
      } catch (e) {
        logger.warn('[lireSeancesPourImport] seance ignoree', e);
      }
    }
    return out;
  }

  /** 16 octobre 2026 (SEANCES AVATAR) : details (FC, zones, trace) d'une seance que tu viens d'importer */
  async enrichirSeanceImportee(uuid: string, trainingId: number, debutIso?: string, dureeMin?: number): Promise<void> {
    if (!uuid || !trainingId) return;
    await this.fetchAndStoreWorkoutDetails(uuid, trainingId, 1, debutIso, dureeMin);
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
      diag.authStatus = traduire("erreur: {0}", e?.message);
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
      logger.warn('[HealthConnect] runNativeDiagnostic timeout/erreur:', e?.message);
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

      // Events du workout (laps, pauses, etc.), accessible globalement pour les splits
      const workoutEvents = (workout.events || []) as any[];

      // LOG DEBUG: dump brut du workout pour voir toutes les données Apple disponibles
      if (__DEV__) {
        const rawEvents = workoutEvents;
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

      // Durée : celle de l'entraînement Apple (HKWorkout.duration, pauses exclues), au lieu de fin moins début
      const durationMs = new Date(workout.endDate).getTime() - new Date(workout.startDate).getTime();
      details.workoutStart = new Date(workout.startDate).toISOString();
      details.workoutEnd = new Date(workout.endDate).toISOString();
      details.pauses = pausesFromEvents(workoutEvents, details.workoutEnd);
      const pausedMs = details.pauses.reduce((a, p) => a + (new Date(p.end).getTime() - new Date(p.start).getTime()), 0);
      const hkDurationSec = this.extractQuantityValue(workout.duration);
      details.durationSeconds = hkDurationSec != null && hkDurationSec > 0 ? hkDurationSec : Math.max(0, (durationMs - pausedMs) / 1000);
      details.durationMinutes = details.durationSeconds / 60;

      // Indoor
      // 17 octobre 2026 : sans l'info d'Apple, inconnu (ni dedans ni dehors), jamais « dedans » par defaut
      details.isIndoor = typeof workout.metadataIndoorWorkout === 'boolean' ? workout.metadataIndoorWorkout : undefined;

      // Elevation, plusieurs noms possibles selon la version du SDK react-native-health
      const elevAscRaw = workout.metadataElevationAscended
        ?? workout.metadata?.HKElevationAscended
        ?? workout.metadata?.['HKMetadataKeyElevationAscended'];
      if (elevAscRaw != null) {
        const val = typeof elevAscRaw === 'object' ? elevAscRaw.quantity : Number(elevAscRaw);
        if (!isNaN(val) && val > 0) details.elevationAscended = appleInt(val); // Forme tronque : 12,9 m affiche 12 m
      }
      const elevDescRaw = workout.metadataElevationDescended
        ?? workout.metadata?.HKElevationDescended
        ?? workout.metadata?.['HKMetadataKeyElevationDescended'];
      if (elevDescRaw != null) {
        const val = typeof elevDescRaw === 'object' ? elevDescRaw.quantity : Number(elevDescRaw);
        if (!isNaN(val) && val > 0) details.elevationDescended = appleInt(val);
      }

      // Météo (directement sur le sample HealthKit)
      // 14 octobre 2026 : degrés et humidité tronqués comme Forme (28,6 °C affiche 28, plus 29)
      if (workout.metadataWeatherTemperature && Number.isFinite(workout.metadataWeatherTemperature.quantity)) {
        details.weatherTempRawC = workout.metadataWeatherTemperature.quantity;
        details.weatherTemp = appleTemperature(workout.metadataWeatherTemperature.quantity);
      }
      if (workout.metadataWeatherHumidity && Number.isFinite(workout.metadataWeatherHumidity.quantity)) {
        details.weatherHumidityRaw = workout.metadataWeatherHumidity.quantity;
        details.weatherHumidity = appleHumidity(workout.metadataWeatherHumidity.quantity);
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
      // Effort perçu Apple Watch (HKWorkoutEffortScore, 1-10)
      const rawEffort = workoutMeta['HKMetadataKeyWorkoutEffortScore']
        ?? workoutMeta['HKWorkoutEffortScore']
        ?? workoutMeta.HKMetadataKeyWorkoutEffortScore;
      if (rawEffort != null) {
        const effort = Number(rawEffort);
        if (!isNaN(effort) && effort >= 1 && effort <= 10) {
          details.effortScore = effort;
        }
      }

      const rawAqi = workout.metadataWeatherAirQualityIndex
        ?? workoutMeta.HKWeatherAirQualityIndex
        ?? workoutMeta.HKMetadataKeyWeatherAirQualityIndex;
      if (rawAqi != null) {
        const aqi = Number(rawAqi);
        if (!isNaN(aqi) && aqi > 0) {
          details.airQualityIndex = aqi;
          if (aqi <= 50) details.airQualityCategory = traduire('Bon');
          else if (aqi <= 100) details.airQualityCategory = 'Modere';
          else if (aqi <= 150) details.airQualityCategory = traduire('Mauvais pour groupes sensibles');
          else if (aqi <= 200) details.airQualityCategory = 'Mauvais';
          else if (aqi <= 300) details.airQualityCategory = 'Tres mauvais';
          else details.airQualityCategory = 'Dangereux';
        }
      }

      // Statistiques de l'entraînement, une par une avec leur unité (14 octobre 2026).
      // Avant : getAllStatistics() sans unité. Le module demande alors l'unité préférée de CHAQUE type
      // présent dans la séance (foulée, oscillation, effort...) et, si un seul type n'est pas autorisé,
      // tout l'appel échoue : plus de FC moyenne (« 0 bpm en moyenne »), ni distance, ni calories exactes.
      const stat = async (id: string, unit: string): Promise<any | undefined> => {
        try {
          if (typeof workout.getStatistic !== 'function') return undefined;
          return (await workout.getStatistic(id, unit)) ?? undefined;
        } catch {
          return undefined;
        }
      };
      const val = (q: any) => this.extractQuantityValue(q);
      try {
        // Distance, couvre course/marche, vélo, natation, ski/snowboard
        let meters: number | undefined;
        for (const id of ['HKQuantityTypeIdentifierDistanceWalkingRunning', 'HKQuantityTypeIdentifierDistanceCycling', 'HKQuantityTypeIdentifierDistanceSwimming', 'HKQuantityTypeIdentifierDistanceDownhillSnowSports']) {
          const v = val((await stat(id, 'm'))?.sumQuantity);
          if (v != null && v > 0) { meters = v; break; }
        }
        // Repli : totalDistance de l'entraînement (tapis, intérieur)
        if (!meters) {
          const raw = val(workout.totalDistance ?? workout.distance);
          if (raw != null && raw > 0) meters = raw > 100 ? raw : raw * 1000;
        }
        if (meters && meters > 0) {
          details.distanceMeters = meters;
          details.distanceKm = appleKm(meters); // Forme tronque : 2 261 m affiche 2,26 km
        }

        // Calories actives, puis repli totalEnergyBurned
        let active = val((await stat('HKQuantityTypeIdentifierActiveEnergyBurned', 'kcal'))?.sumQuantity);
        if (!(active != null && active > 0)) active = val(workout.totalEnergyBurned);
        if (active != null && active > 0) details.activeCalories = appleInt(active);
        const basal = val((await stat('HKQuantityTypeIdentifierBasalEnergyBurned', 'kcal'))?.sumQuantity) ?? 0;
        if (active != null && active > 0) details.totalCalories = appleInt(active + basal);

        // FC moyenne, min et max : la statistique de l'entraînement, comme Forme
        const hr = await stat('HKQuantityTypeIdentifierHeartRate', 'count/min');
        const hrAvg = val(hr?.averageQuantity);
        const hrMin = val(hr?.minimumQuantity);
        const hrMax = val(hr?.maximumQuantity);
        if (hrAvg != null && hrAvg > 0) details.avgHeartRate = Math.round(hrAvg);
        if (hrMin != null && hrMin > 0) details.minHeartRate = Math.round(hrMin);
        if (hrMax != null && hrMax > 0) details.maxHeartRate = Math.round(hrMax);
        // Repli : HKStatistics sur l'intervalle de la séance
        if (!details.avgHeartRate && typeof HealthKit.queryStatisticsForQuantity === 'function') {
          try {
            const st = await HealthKit.queryStatisticsForQuantity(
              'HKQuantityTypeIdentifierHeartRate',
              ['discreteAverage', 'discreteMin', 'discreteMax'],
              { filter: { date: { startDate: new Date(workout.startDate), endDate: new Date(workout.endDate) } }, unit: 'count/min' },
            );
            const a2 = val(st?.averageQuantity);
            if (a2 != null && a2 > 0) details.avgHeartRate = Math.round(a2);
            const n2 = val(st?.minimumQuantity);
            if (n2 != null && n2 > 0 && !details.minHeartRate) details.minHeartRate = Math.round(n2);
            const x2 = val(st?.maximumQuantity);
            if (x2 != null && x2 > 0 && !details.maxHeartRate) details.maxHeartRate = Math.round(x2);
          } catch (e) {
            logger.warn('[HealthKit] Statistique FC sur l\'intervalle impossible:', e);
          }
        }

        // Nombre de pas, et cadence de course (pas par minute sur la durée d'entraînement, comme Forme)
        const steps = val((await stat('HKQuantityTypeIdentifierStepCount', 'count'))?.sumQuantity);
        if (steps != null && steps > 0) details.stepsCount = Math.round(steps);
        const cyc = val((await stat('HKQuantityTypeIdentifierCyclingCadence', 'count/min'))?.averageQuantity);
        if (cyc != null && cyc > 0) details.cadence = Math.round(cyc);
        else if (steps && steps > 0 && details.durationSeconds && details.durationSeconds > 60 && meters && meters > 0) {
          details.cadence = Math.round(steps / (details.durationSeconds / 60));
        }

        // Vitesse moyenne (m/s vers km/h)
        for (const id of ['HKQuantityTypeIdentifierCyclingSpeed', 'HKQuantityTypeIdentifierRunningSpeed']) {
          const v = val((await stat(id, 'm/s'))?.averageQuantity);
          if (v != null && v > 0) { details.avgSpeedKmh = Math.round(v * 3.6 * 10) / 10; break; }
        }

        // Puissance moyenne : course (Apple Watch, iOS 16 et plus) ou vélo
        for (const id of ['HKQuantityTypeIdentifierRunningPower', 'HKQuantityTypeIdentifierCyclingPower']) {
          const v = val((await stat(id, 'W'))?.averageQuantity);
          if (v != null && v > 0) { details.avgPowerWatts = Math.round(v); break; }
        }

        // 14 octobre 2026 : mesures de course de la montre, comme Forme (moyenne et plage, valeurs tronquées)
        const dyn = async (id: string, unit: string, f: (x: number) => number) => {
          const st = await stat(id, unit);
          const avg = val(st?.averageQuantity);
          if (avg == null || !(avg > 0)) return undefined;
          const mn = val(st?.minimumQuantity);
          const mx = val(st?.maximumQuantity);
          return { avg: f(avg), min: mn != null && mn > 0 ? f(mn) : undefined, max: mx != null && mx > 0 ? f(mx) : undefined };
        };
        details.groundContactMs = await dyn('HKQuantityTypeIdentifierRunningGroundContactTime', 'ms', appleInt);
        details.strideLengthM = await dyn('HKQuantityTypeIdentifierRunningStrideLength', 'm', trunc1);
        details.verticalOscCm = await dyn('HKQuantityTypeIdentifierRunningVerticalOscillation', 'cm', trunc1);
      } catch (statsErr) {
        logger.warn('[HealthKit] Erreur statistiques de séance:', statsErr);
      }

      // Allure moyenne + vitesse calculée si pas dans les stats
      if (details.distanceKm && details.distanceKm > 0 && details.durationMinutes) {
        // Allure sur la durée d'entraînement et la distance brute, tronquée à la seconde comme Forme
        details.avgPaceSecondsPerKm = applePaceSec(details.durationSeconds ?? details.durationMinutes * 60, details.distanceMeters ?? details.distanceKm * 1000);
        if (!details.avgSpeedKmh) {
          details.avgSpeedKmh = Math.round(details.distanceKm / (details.durationMinutes / 60) * 10) / 10;
        }
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
              // Trace simplifiée (Douglas Peucker, 3 m, 600 points au plus) : la forme du parcours
              // est gardée, la séance reste légère à stocker (14 octobre 2026)
              details.routePoints = simplifyRoute(
                allLocations
                  .filter((loc: any) => Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude))
                  .map((loc: any) => ({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    altitude: loc.altitude,
                    speed: loc.speed,
                    timestamp: loc.date ? new Date(loc.date).toISOString() : undefined,
                  })),
                3,
                600,
              );

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
              // Ville du départ (géocodage inverse du téléphone, sans service tiers)
              try {
                const Location = require('expo-location');
                if (Location?.reverseGeocodeAsync) {
                  const places = await Promise.race([
                    Location.reverseGeocodeAsync({ latitude: details.startLatitude, longitude: details.startLongitude }),
                    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
                  ]);
                  const pl = Array.isArray(places) ? places[0] : null;
                  const city = pl?.city || pl?.subregion || pl?.region;
                  if (city) details.city = String(city);
                }
              } catch {
                // pas de ville : la carte s'affiche quand même
              }

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
                  // Persister pour hrZones.ts et le reste de l'app
                  try {
                    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                    const stored = await AsyncStorage.getItem('@yoroi_health_max_hr');
                    const storedVal = stored ? Number(stored) : 0;
                    // Mettre a jour seulement si la nouvelle valeur est differente (evite les ecritures inutiles)
                    if (Math.abs(storedVal - maxHR) > 1) {
                      await AsyncStorage.setItem('@yoroi_health_max_hr', String(maxHR));
                    }
                  } catch (_) {}
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

            // Zones : méthode commune (lib/v2/seances/workoutMath), sur l'intervalle exact de la séance,
            // pauses exclues, avec tes zones (perso, sinon depuis ta FC max)
            let zones: NonNullable<WorkoutDetails['heartRateZones']> = [];
            try {
              const eff = await getEffectiveHRZones();
              zones = calcZoneDurations(details.heartRateSamples!, eff, details.workoutStart, details.workoutEnd, details.pauses)
                .map((z) => ({ zone: z.zone, name: z.name, minBpm: z.minBpm, maxBpm: z.maxBpm, durationSeconds: z.durationSeconds, color: z.color }));
            } catch {
              zones = [];
            }
            void maxHR;

            details.heartRateZones = zones;

            // Dernier repli si aucune statistique n'a répondu : moyenne pondérée par le temps des mesures
            if (!details.avgHeartRate || !details.minHeartRate || !details.maxHeartRate) {
              const st = hrStats(details.heartRateSamples!, { start: details.workoutStart, end: details.workoutEnd, pauses: details.pauses });
              if (st) {
                if (!details.avgHeartRate) details.avgHeartRate = Math.round(st.avg);
                if (!details.minHeartRate) details.minHeartRate = Math.round(st.min);
                if (!details.maxHeartRate) details.maxHeartRate = Math.round(st.max);
              }
            }

            // Splits depuis GPS si disponibles
            if (allGpsLocations.length > 0 && details.distanceKm && details.distanceKm > 0.5) {
              details.splits = this.computeSplits(allGpsLocations, hrSamples);
            }

            // Splits depuis les laps Apple Watch (type 1) si pas de GPS
            if (!details.splits?.length) {
              try {
                const lapEvents = workoutEvents.filter((e: any) => e.type === 3); // 3 = tour (1 = pause)
                if (lapEvents.length > 0) {
                  const validLaps = lapEvents.filter((lap: any) => {
                    const s = new Date(lap.dateInterval?.startDate ?? lap.startDate ?? workout.startDate).getTime();
                    const end = new Date(lap.dateInterval?.endDate ?? lap.endDate ?? workout.startDate).getTime();
                    return Math.round((end - s) / 1000) > 5;
                  });
                  if (validLaps.length > 0) {
                    const lapDistKm = (details.distanceKm && details.distanceKm > 0)
                      ? Math.round((details.distanceKm / validLaps.length) * 100) / 100
                      : 1;
                    details.splits = validLaps.map((lap: any, i: number) => {
                      const lapStartMs = new Date(lap.dateInterval?.startDate ?? lap.startDate ?? workout.startDate).getTime();
                      const lapEndMs = new Date(lap.dateInterval?.endDate ?? lap.endDate ?? workout.startDate).getTime();
                      const lapDurSec = Math.round((lapEndMs - lapStartMs) / 1000);
                      const lapHrSamples = hrSamples.filter((s: any) => {
                        const t = new Date(s.startDate).getTime();
                        return t >= lapStartMs && t <= lapEndMs;
                      });
                      const lapAvgHR = lapHrSamples.length > 0
                        ? Math.round(lapHrSamples.reduce((acc: number, s: any) => acc + s.quantity, 0) / lapHrSamples.length)
                        : undefined;
                      return {
                        index: i + 1,
                        durationSeconds: lapDurSec,
                        distanceKm: lapDistKm,
                        paceSecondsPerKm: lapDistKm > 0 ? Math.round(lapDurSec / lapDistKm) : 0,
                        avgHeartRate: lapAvgHR,
                        elevationGain: 0,
                      };
                    });
                  }
                }
              } catch (lapErr) {
                logger.warn('[HealthKit] Erreur lecture laps:', lapErr);
              }
            }
          }
        }
      } catch (hrErr) {
        logger.warn('[HealthKit] Erreur FC detaillee:', hrErr);
      }

      // 14 octobre 2026 : intermédiaires comme Forme, depuis les échantillons de distance de la montre
      // (durée, allure, FC et puissance par kilomètre). Repli : l'ancien calcul GPS ou les tours.
      try {
        if (details.distanceMeters && details.distanceMeters > 500 && details.workoutStart && details.workoutEnd) {
          const qs = async (id: string, unit: string) => {
            const o = this.createQueryOptions(new Date(workout.startDate), new Date(workout.endDate), { limit: 0, ascending: true, unit });
            if (!o) return [];
            const r = (await HealthKit.queryQuantitySamples(id as any, o)) || [];
            return r.map((x: any) => ({ start: new Date(x.startDate).toISOString(), end: new Date(x.endDate ?? x.startDate).toISOString(), value: Number(x.quantity) }));
          };
          const dist = await qs('HKQuantityTypeIdentifierDistanceWalkingRunning', 'm');
          if (dist.length > 1) {
            let power: { start: string; end: string; value: number }[] = [];
            try { power = await qs('HKQuantityTypeIdentifierRunningPower', 'W'); } catch { power = []; }
            const km = splitsFromDistance(dist, { start: details.workoutStart, pauses: details.pauses, hr: details.heartRateSamples, power });
            if (km.length) details.splits = km;
          }
        }
      } catch (splitErr) {
        logger.warn('[HealthKit] Intermédiaires depuis la distance impossibles:', splitErr);
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
              // 14 octobre 2026 : comme sous le graphique de Forme (première mesure à la fin,
              // puis la mesure la plus proche de 1 min et 2 min), à confirmer avec le fichier de diagnostic
              const rec = recoveryFromSamples(
                rawHrSamples.map((x: any) => ({ timestamp: new Date(x.startDate).toISOString(), bpm: Number(x.quantity) })),
                recoverySamples.map((x: any) => ({ timestamp: new Date(x.startDate).toISOString(), bpm: Number(x.quantity) })),
                new Date(workout.endDate).toISOString(),
              );
              if (rec) details.recoveryHR = rec;
            }
          }
        }
      } catch (recoveryErr) {
        logger.warn('[HealthKit] Erreur Recovery HR:', recoveryErr);
      }

      // VO2 Max, mesuré par Apple Watch lors des séances de course (valeur dans les 7j autour du workout)
      try {
        const workoutEnd = new Date(workout.endDate);
        const vo2Options = this.createQueryOptions(
          new Date(workoutEnd.getTime() - 7 * 24 * 60 * 60 * 1000),
          new Date(workoutEnd.getTime() + 24 * 60 * 60 * 1000),
          { limit: 1, ascending: false }
        );
        if (vo2Options) {
          const vo2Samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierVO2Max', vo2Options);
          if (vo2Samples && vo2Samples.length > 0) {
            const raw = this.extractQuantityValue(vo2Samples[0]);
            if (raw != null && raw > 10 && raw < 100) {
              details.vo2Max = Math.round(raw * 10) / 10;
            }
          }
        }
      } catch (vo2Err) {
        logger.warn('[HealthKit] Erreur VO2Max:', vo2Err);
      }

      // Effort perçu, fallback natif Swift si metadata n'a pas retourné de valeur
      if (!details.effortScore && workout.uuid) {
        try {
          const nativeScore = await getWorkoutEffortScoreNative(workout.uuid);
          if (nativeScore >= 1 && nativeScore <= 10) {
            details.effortScore = nativeScore;
          }
        } catch (effortErr) {
          logger.warn('[HealthKit] Erreur getWorkoutEffortScore natif:', effortErr);
        }
      }

      // 14 octobre 2026 (zones_apple) : zones calculées par Apple (iOS 27) et effort lié à la séance (iOS 18)
      if (workout.uuid) {
        try {
          const ex = await getAppleWorkoutExtrasNative(String(workout.uuid));
          const az = parseAppleZones(ex.heartRateZones);
          if (az) details.appleZones = az;
          // 14 octobre 2026 (ios27) : temps d'Apple aussi dans heartRateZones (carte, planning, statistiques)
          // et marque de cache versionnee, pour que la tache de fond ne relise pas cette seance
          if (ex.found && ex.ios27) Object.assign(details, mergeAppleZones(details, az, new Date(), ZONE_COLORS));
          const pz = parseZoneTimes(ex.cyclingPowerZones);
          if (pz) details.applePowerZones = pz;
          const user = ex.effort?.user;
          const est = ex.effort?.estimated;
          if (user != null && user >= 1 && user <= 10) {
            details.effortScore = Math.round(user);
            details.effortEstimated = false;
          } else if (!details.effortScore && est != null && est >= 1 && est <= 10) {
            details.effortScore = Math.round(est);
            details.effortEstimated = true;
          }
        } catch (exErr) {
          logger.warn('[HealthKit] Zones et effort Apple illisibles:', exErr);
        }
      }

      // Qualité de l'air via Open-Meteo (gratuit, sans clé) si pas dans metadata HK
      // Nécessite une localisation GPS (outdoor uniquement)
      if (details.airQualityIndex == null && details.startLatitude != null && details.startLongitude != null) {
        try {
          const workoutDate = new Date(workout.startDate);
          const dateStr = localDateKey(workoutDate); // jour local (timezone=auto côté Open-Meteo)
          const hour = workoutDate.getHours();
          // Position arrondie a 2 decimales (environ 1 km) : assez pour la qualite de l'air,
          // sans envoyer a Open-Meteo l'endroit exact de la seance (13 octobre 2026)
          const lat = details.startLatitude.toFixed(2);
          const lon = details.startLongitude.toFixed(2);
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
              if (aqiValue <= 50) details.airQualityCategory = traduire('Bon');
              else if (aqiValue <= 100) details.airQualityCategory = 'Modere';
              else if (aqiValue <= 150) details.airQualityCategory = traduire('Mauvais pour groupes sensibles');
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

      // v9 (14 octobre 2026) : statistiques une par une, durée Apple, pauses, trace simplifiée, ville
      // v10 (14 octobre 2026, zones_apple) : zones Apple iOS 27, météo tronquée, intermédiaires par la distance,
      // mesures de course, effort lié, récupération comme Forme
      details.cacheVersion = 10;

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
   * 14 octobre 2026 (zones_apple) : fichier de diagnostic des séances Apple des derniers jours.
   * Données brutes (mesures cardiaques avec début et fin, événements, métadonnées, distance, puissance),
   * zones et temps calculés par Yoroi, zones d'Apple si iOS 27, pour caler le calcul sur Forme.
   * Pas de trace GPS. Renvoie le chemin du fichier JSON, ou null.
   */
  async exportRawWorkoutsForDiagnostic(days: number = 30): Promise<{ path: string; count: number } | null> {
    if (!HealthKit || isRunningInExpoGo) return null;
    const FileSystem = require('expo-file-system/legacy');
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 3600 * 1000);
    const list: any[] = (await HealthKit.queryWorkoutSamples({ filter: { date: { startDate: from, endDate: now } }, limit: 200 })) || [];
    const eff = await getEffectiveHRZones().catch(() => null);
    const preferred = await getApplePreferredHeartRateZonesNative().catch((e: any) => ({ ios27: false, error: String(e) }));
    const raw = async (id: string, a: Date, b: Date, unit: string) => {
      try {
        const o = this.createQueryOptions(a, b, { limit: 0, ascending: true, unit });
        if (!o) return [];
        const r = (await HealthKit.queryQuantitySamples(id as any, o)) || [];
        return r.map((x: any) => [new Date(x.startDate).toISOString(), new Date(x.endDate ?? x.startDate).toISOString(), Number(x.quantity)]);
      } catch (e) {
        return [['erreur', String(e), 0]];
      }
    };
    const out: any[] = [];
    for (const w of list) {
      try {
        const a = new Date(w.startDate);
        const b = new Date(w.endDate);
        const hr = await raw('HKQuantityTypeIdentifierHeartRate', a, b, 'count/min');
        const hrAfter = await raw('HKQuantityTypeIdentifierHeartRate', b, new Date(b.getTime() + 3 * 60000), 'count/min');
        const events = ((w.events || []) as any[]).map((e: any) => ({ type: e.type, start: e.startDate ? new Date(e.startDate).toISOString() : e.dateInterval?.startDate, end: e.endDate ? new Date(e.endDate).toISOString() : e.dateInterval?.endDate }));
        const pauses = pausesFromEvents(w.events || [], b.toISOString());
        const samples = (hr as any[]).filter((x) => x[0] !== 'erreur').map((x) => ({ timestamp: x[0], bpm: Math.round(x[2]) }));
        const appZones = eff && samples.length ? calcZoneDurations(samples, eff, a.toISOString(), b.toISOString(), pauses).map((z) => ({ zone: z.zone, min: z.minBpm, seconds: z.durationSeconds })) : null;
        let hrStat: any = null;
        try {
          const st = typeof w.getStatistic === 'function' ? await w.getStatistic('HKQuantityTypeIdentifierHeartRate', 'count/min') : null;
          hrStat = st ? { avg: this.extractQuantityValue(st.averageQuantity), min: this.extractQuantityValue(st.minimumQuantity), max: this.extractQuantityValue(st.maximumQuantity) } : null;
        } catch { hrStat = null; }
        out.push({
          uuid: w.uuid,
          activityType: w.workoutActivityType,
          start: a.toISOString(),
          end: b.toISOString(),
          startLocal: a.toString(),
          durationSec: this.extractQuantityValue(w.duration),
          source: w.sourceRevision?.source?.name ?? w.sourceRevision?.source?.bundleIdentifier ?? null,
          metadata: w.metadata ?? null,
          weather: { temperatureC: w.metadataWeatherTemperature ?? null, humidity: w.metadataWeatherHumidity ?? null },
          events,
          pauses,
          heartRateStat: hrStat,
          heartRate: hr,
          heartRateAfter: hrAfter,
          distance: await raw('HKQuantityTypeIdentifierDistanceWalkingRunning', a, b, 'm'),
          runningPower: await raw('HKQuantityTypeIdentifierRunningPower', a, b, 'W'),
          appleExtras: w.uuid ? await getAppleWorkoutExtrasNative(String(w.uuid)) : null,
          yoroiZones: appZones,
        });
      } catch (e) {
        out.push({ uuid: w?.uuid, erreur: String(e) });
      }
    }
    const payload = { kind: 'yoroi_diagnostic_seances', version: 1, exportedAt: now.toISOString(), timezoneOffsetMin: now.getTimezoneOffset(), days, yoroiSettingsZones: eff, applePreferredZones: preferred, workouts: out };
    const path = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}yoroi_diagnostic_seances_${now.toISOString().slice(0, 10)}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(payload));
    return { path, count: out.length };
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
          if (toStore.routePoints && toStore.routePoints.length > 800) {
            const step = Math.ceil(toStore.routePoints.length / 800);
            toStore.routePoints = toStore.routePoints.filter((_, i) => i % step === 0);
          }
          if (toStore.heartRateSamples && toStore.heartRateSamples.length > 3000) {
            const step = Math.ceil(toStore.heartRateSamples.length / 3000);
            toStore.heartRateSamples = toStore.heartRateSamples.filter((_, i) => i % step === 0);
          }

          // Recalculer les zones HR avec les zones perso de l'utilisateur (ou défaut par âge)
          if (toStore.heartRateSamples && toStore.heartRateSamples.length > 1) {
            try {
              const effectiveZones = await getEffectiveHRZones();
              // Utilise startDate/endDate du training (params de la fonction) car
              // `workout` n'existe pas dans ce scope. Fallback sur les samples HR.
              const wStart = toStore.workoutStart || startDate || (toStore.heartRateSamples?.[0]?.timestamp);
              const wEnd = toStore.workoutEnd ? toStore.workoutEnd : wStart && durationMin
                ? new Date(new Date(wStart).getTime() + durationMin * 60000).toISOString()
                : (toStore.heartRateSamples?.[toStore.heartRateSamples.length - 1]?.timestamp);
              const computedZones = calcZoneDurations(
                toStore.heartRateSamples,
                effectiveZones,
                wStart,
                wEnd,
                toStore.pauses,
              );
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
          const date = localDateKey(new Date(s.startDate));
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
          const date = localDateKey(new Date(s.startDate));
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
          const date = localDateKey(new Date(s.startDate));
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
          const date = localDateKey(new Date(s.startDate));
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
          const date = localDateKey(new Date(s.startDate));
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
          const date = localDateKey(new Date(s.startDate));
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

      const queryOptions = this.createQueryOptions(fromDate, new Date(), { ascending: true, limit: 5000, unit: 'kg' });
      if (!queryOptions) return [];
      const samples = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', queryOptions);

      logger.info('[HealthKit] getWeightHistory: Échantillons reçus:', samples?.length || 0);

      if (samples && samples.length > 0) {
        // Les pesées recopiées par YOROI dans Apple Santé sont déjà dans YOROI : on les ignore
        const result = samples.filter((s: any) => !isYoroiSample(s)).map((s: any) => ({
          date: localDateKey(new Date(s.startDate)),
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
    startTime?: string; // ISO string, heure de coucher
    endTime?: string;   // ISO string, heure de réveil
  }>> {
    // Demo mode disabled

    try {
      // days=0 → tout l'historique depuis l'an 2000 (illimité)
      const fromDate = days > 0
        ? (() => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; })()
        : new Date(2000, 0, 1);

      logger.info('[HealthKit] getSleepHistory: depuis', fromDate.toISOString());

      // Swift natif en priorité (fiable sur iOS 26), fallback Nitro
      const samples = await this.querySleepSamplesUnified(fromDate, new Date(), 5000);

      logger.info('[HealthKit] getSleepHistory: Échantillons bruts reçus:', samples?.length || 0);

      if (samples && samples.length > 0) {
        // 16 octobre : meme calcul que l'app Sante (lib/v2/sante/nuit.ts). Une nuit par jour de reveil,
        // une seule source (montre d'abord), secondes gardees, arrondi une seule fois.
        const nuits = calculerNuits(this.versEchantillonsSommeil(samples));
        const result = nuits
          .filter((n) => n.totalMinutes > 0)
          .map((n) => ({
            date: n.cle,
            deep: n.minutes.profond,
            rem: n.minutes.paradoxal,
            core: n.minutes.leger + n.minutes.endormi,
            awake: n.minutes.eveil,
            total: n.totalMinutes,
            duration: n.totalMinutes,
            startTime: new Date(n.debut).toISOString(),
            endTime: new Date(n.fin).toISOString(),
            source: n.source,
          }));
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
                  ? localDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))
                  : localDateKey(d);
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
              const date = localDateKey(d);
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
        const date = localDateKey(new Date(s.startDate));
        if (!caloriesByDate[date]) {
          caloriesByDate[date] = { active: 0, basal: 0 };
        }
        caloriesByDate[date].active += s.quantity;
      });

      basalSamples?.forEach((s: any) => {
        const date = localDateKey(new Date(s.startDate));
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
          date: localDateKey(new Date(s.startDate)),
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
                  date: localDateKey(dayStart),
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
          const date = localDateKey(new Date(s.startDate));
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
                results.push({ date: localDateKey(dayStart), value: Math.round(total * 100) / 100 });
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
          const date = localDateKey(new Date(s.startDate));
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
                results.push({ date: localDateKey(dayStart), value: Math.round(total) });
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
          const date = localDateKey(new Date(s.startDate));
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
          const date = localDateKey(new Date(s.startDate));
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
        this.withTimeout(this.getWorkouts(), 120000),                   // 13, 2 min pour les grandes bibliothèques
        this.withTimeout(this.getBloodPressure(), TIMEOUT_MS),          // 14
        this.withTimeout(this.getBloodGlucose(), TIMEOUT_MS),           // 15
        this.withTimeout(this.getHeight(), TIMEOUT_MS),                 // 16
        this.withTimeout(this.getFloorsClimbed(), TIMEOUT_MS),          // 17
        this.withTimeout(this.getMindfulMinutes(), TIMEOUT_MS),         // 18
      ]);

      const r = (i: number): any => results[i].status === 'fulfilled' ? results[i].value : null;

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

  /**
   * Range une pesée lue dans Apple Santé, sauf si YOROI a déjà ce poids ce jour-là (quelle que soit la source).
   * known : pesées déjà connues, complétée au fil de l'import pour éviter de relire la base à chaque ligne.
   */
  private async saveImportedWeight(
    date: string,
    value: number,
    source: string,
    known?: Array<{ date: string; weight: number }>,
  ): Promise<boolean> {
    if (!date || !(value > 20 && value < 400)) return false;
    const rows: Array<{ date: string; weight: number }> = known ?? (await getWeights(400).catch(() => []));
    if (rows.some((w) => String(w.date).slice(0, 10) === date && Math.abs(Number(w.weight) - value) < 0.05)) return false;
    await addWeight({ weight: value, source, date });
    known?.push({ date, weight: value });
    return true;
  }

  /** Autorisations d'écriture déjà accordées (aucune fenêtre iOS n'est ouverte ici) */
  async canWriteBodyMeasures(): Promise<{ weight: boolean; bodyFat: boolean }> {
    const out = { weight: false, bodyFat: false };
    if (!HealthKit || isRunningInExpoGo || !isHealthKitAvailable) return out;
    const SHARING_AUTHORIZED = 2;
    try {
      out.weight = Number(await HealthKit.authorizationStatusFor('HKQuantityTypeIdentifierBodyMass')) === SHARING_AUTHORIZED;
    } catch {}
    try {
      out.bodyFat = Number(await HealthKit.authorizationStatusFor('HKQuantityTypeIdentifierBodyFatPercentage')) === SHARING_AUTHORIZED;
    } catch {}
    return out;
  }

  async writeWeight(weight: number, unit: 'kg' | 'lbs' = 'kg', day?: string): Promise<boolean> {
    // VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.error('[HealthKit] Module not loaded - cannot write weight');
      throw new Error('HealthKit module not available');
    }

    const weightInKg = unit === 'lbs' ? weight * 0.453592 : weight;
    const at = instantForDay(day);

    try {
      // CHECK FOR DUPLICATES: Prevent writing same weight twice on same day
      const today = new Date(at);
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dupCheckOptions = this.createQueryOptions(today, tomorrow, { limit: 10, unit: 'kg' });
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
      await HealthKit.saveQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg', weightInKg, at, at);
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

  async writeBodyFat(percentage: number, day?: string): Promise<boolean> {
    // VÉRIFIER QUE HealthKit EST CHARGÉ
    if (!HealthKit) {
      logger.error('[HealthKit] Module not loaded - cannot write body fat');
      throw new Error('HealthKit module not available');
    }

    try {
      // Apple Health attend un ratio (0-1), on convertit depuis le pourcentage
      const ratio = percentage / 100;
      const at = instantForDay(day);

      // CHECK FOR DUPLICATES: Prevent writing same body fat twice on same day
      const today = new Date(at);
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
      await HealthKit.saveQuantitySample('HKQuantityTypeIdentifierBodyFatPercentage', '%', ratio, at, at);
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
        'Muay-thaï': WorkoutActivityType.kickboxing,
        'Boxe anglaise': WorkoutActivityType.boxing,
        'Jiu-jitsu brésilien': WorkoutActivityType.martialArts,
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

  // ============================================
  // LECTURE ÉTENDUE (refonte Santé du 9 octobre 2026)
  // Types que le module HealthKit sait déjà lire mais que l'app n'exploitait pas.
  // Chaque appel est protégé : en cas d'échec on renvoie une liste vide.
  // ============================================

  /**
   * Types demandés en complément de la demande native (identifiants connus de @kingstinct v13).
   * Typés ObjectTypeIdentifier : un identifiant inconnu du module ferait échouer toute la demande,
   * le compilateur le refuse donc. Santé reproductive et activité sexuelle volontairement absentes.
   */
  // 14 octobre 2026 (SANTÉ CONNEXION) : mesures avancées, facultatives, demandées seulement sur appui
  // (Santé, Ta montre : « Autoriser les mesures avancées »). Liste dans lib/v2/sante/typesSante.ts.
  private static readonly EXTRA_READ_TYPES: ObjectTypeIdentifier[] = ids(IOS_LECTURE_AVANCE) as ObjectTypeIdentifier[];

  /** Types d'événements (catégories) : une liste datée plutôt qu'une courbe */
  private static readonly EXT_EVENTS: Record<string, { id: string; title: (value: number) => string }> = {
    'fc-haute': { id: 'HKCategoryTypeIdentifierHighHeartRateEvent', title: () => traduire('Fréquence élevée au repos') },
    'fc-basse': { id: 'HKCategoryTypeIdentifierLowHeartRateEvent', title: () => traduire('Fréquence basse') },
    'rythme-irregulier': { id: 'HKCategoryTypeIdentifierIrregularHeartRhythmEvent', title: () => traduire('Rythme irrégulier détecté') },
    'cardio-faible': { id: 'HKCategoryTypeIdentifierLowCardioFitnessEvent', title: () => traduire('Cardio faible pour ton âge') },
    apnees: { id: 'HKCategoryTypeIdentifierSleepApneaEvent', title: () => traduire('Respiration souvent perturbée la nuit') },
    'alerte-stabilite': {
      id: 'HKCategoryTypeIdentifierAppleWalkingSteadinessEvent',
      title: (v) => (v === 2 ? traduire('Stabilité très basse') : v === 3 ? traduire('Stabilité toujours basse') : v === 4 ? traduire('Stabilité toujours très basse') : traduire('Stabilité basse')),
    },
    'alerte-son-casque': { id: 'HKCategoryTypeIdentifierHeadphoneAudioExposureEvent', title: () => traduire('Dose de son au casque dépassée sur 7 jours') },
    'alerte-son-ambiant': { id: 'HKCategoryTypeIdentifierEnvironmentalAudioExposureEvent', title: () => 'Bruit ambiant trop fort' },
  };

  /** Clé YOROI vers type HealthKit, manière de cumuler la journée, unité demandée et facteur */
  private static readonly EXT_QUANTITY: Record<string, { id: string; agg: 'sum' | 'avg' | 'max'; unit?: string; scale?: number }> = {
    'temperature-poignet': { id: 'HKQuantityTypeIdentifierAppleSleepingWristTemperature', agg: 'avg', unit: 'degC' },
    'lumiere-du-jour': { id: 'HKQuantityTypeIdentifierTimeInDaylight', agg: 'sum', unit: 'min' },
    'fc-marche': { id: 'HKQuantityTypeIdentifierWalkingHeartRateAverage', agg: 'avg', unit: 'count/min' },
    'recuperation-cardiaque': { id: 'HKQuantityTypeIdentifierHeartRateRecoveryOneMinute', agg: 'avg', unit: 'count/min' },
    'perturbations-respiratoires': { id: 'HKQuantityTypeIdentifierAppleSleepingBreathingDisturbances', agg: 'avg', unit: 'count' },
    electrodermale: { id: 'HKQuantityTypeIdentifierElectrodermalActivity', agg: 'avg', unit: 'mcS' },
    effort: { id: 'HKQuantityTypeIdentifierPhysicalEffort', agg: 'max' },
    'distance-velo': { id: 'HKQuantityTypeIdentifierDistanceCycling', agg: 'sum', unit: 'km' },
    'distance-nage': { id: 'HKQuantityTypeIdentifierDistanceSwimming', agg: 'sum', unit: 'm' },
    puissance: { id: 'HKQuantityTypeIdentifierCyclingPower', agg: 'avg', unit: 'W' },
    'cadence-velo': { id: 'HKQuantityTypeIdentifierCyclingCadence', agg: 'avg', unit: 'count/min' },
    'puissance-course': { id: 'HKQuantityTypeIdentifierRunningPower', agg: 'avg', unit: 'W' },
    vitesse: { id: 'HKQuantityTypeIdentifierRunningSpeed', agg: 'avg', unit: 'm/s', scale: 3.6 },
    eau: { id: 'HKQuantityTypeIdentifierDietaryWater', agg: 'sum', unit: 'mL' },
    'calories-mangees': { id: 'HKQuantityTypeIdentifierDietaryEnergyConsumed', agg: 'sum', unit: 'kcal' },
    proteines: { id: 'HKQuantityTypeIdentifierDietaryProtein', agg: 'sum', unit: 'g' },
    glucides: { id: 'HKQuantityTypeIdentifierDietaryCarbohydrates', agg: 'sum', unit: 'g' },
    lipides: { id: 'HKQuantityTypeIdentifierDietaryFatTotal', agg: 'sum', unit: 'g' },
    cafeine: { id: 'HKQuantityTypeIdentifierDietaryCaffeine', agg: 'sum', unit: 'mg' },
    'tour-de-taille': { id: 'HKQuantityTypeIdentifierWaistCircumference', agg: 'avg', unit: 'cm' },
    imc: { id: 'HKQuantityTypeIdentifierBodyMassIndex', agg: 'avg', unit: 'count' },
    etages: { id: 'HKQuantityTypeIdentifierFlightsClimbed', agg: 'sum', unit: 'count' },
    'masse-grasse': { id: 'HKQuantityTypeIdentifierBodyFatPercentage', agg: 'avg', unit: '%', scale: 100 },
    'masse-maigre': { id: 'HKQuantityTypeIdentifierLeanBodyMass', agg: 'avg', unit: 'kg' },
    // Ajouts du 10 octobre 2026 (vague 12)
    'temps-mouvement': { id: 'HKQuantityTypeIdentifierAppleMoveTime', agg: 'sum', unit: 'min' },
    'vitesse-velo': { id: 'HKQuantityTypeIdentifierCyclingSpeed', agg: 'avg', unit: 'm/s', scale: 3.6 },
    ftp: { id: 'HKQuantityTypeIdentifierCyclingFunctionalThresholdPower', agg: 'avg', unit: 'W' },
    foulee: { id: 'HKQuantityTypeIdentifierRunningStrideLength', agg: 'avg', unit: 'm' },
    oscillation: { id: 'HKQuantityTypeIdentifierRunningVerticalOscillation', agg: 'avg', unit: 'cm' },
    'contact-sol': { id: 'HKQuantityTypeIdentifierRunningGroundContactTime', agg: 'avg', unit: 'ms' },
    'mouvements-nage': { id: 'HKQuantityTypeIdentifierSwimmingStrokeCount', agg: 'sum', unit: 'count' },
    profondeur: { id: 'HKQuantityTypeIdentifierUnderwaterDepth', agg: 'max', unit: 'm' },
    'temperature-eau': { id: 'HKQuantityTypeIdentifierWaterTemperature', agg: 'avg', unit: 'degC' },
    'distance-rame': { id: 'HKQuantityTypeIdentifierDistanceRowing', agg: 'sum', unit: 'm' },
    'vitesse-rame': { id: 'HKQuantityTypeIdentifierRowingSpeed', agg: 'avg', unit: 'm/s', scale: 3.6 },
    'distance-pagaie': { id: 'HKQuantityTypeIdentifierDistancePaddleSports', agg: 'sum', unit: 'km' },
    'vitesse-pagaie': { id: 'HKQuantityTypeIdentifierPaddleSportsSpeed', agg: 'avg', unit: 'm/s', scale: 3.6 },
    'distance-ski': { id: 'HKQuantityTypeIdentifierDistanceDownhillSnowSports', agg: 'sum', unit: 'km' },
    'distance-ski-fond': { id: 'HKQuantityTypeIdentifierDistanceCrossCountrySkiing', agg: 'sum', unit: 'km' },
    'vitesse-ski-fond': { id: 'HKQuantityTypeIdentifierCrossCountrySkiingSpeed', agg: 'avg', unit: 'm/s', scale: 3.6 },
    'distance-glisse': { id: 'HKQuantityTypeIdentifierDistanceSkatingSports', agg: 'sum', unit: 'km' },
    'poussees-fauteuil': { id: 'HKQuantityTypeIdentifierPushCount', agg: 'sum', unit: 'count' },
    'distance-fauteuil': { id: 'HKQuantityTypeIdentifierDistanceWheelchair', agg: 'sum', unit: 'km' },
    'effort-seance': { id: 'HKQuantityTypeIdentifierWorkoutEffortScore', agg: 'max' },
    'effort-estime': { id: 'HKQuantityTypeIdentifierEstimatedWorkoutEffortScore', agg: 'max' },
    'vitesse-marche': { id: 'HKQuantityTypeIdentifierWalkingSpeed', agg: 'avg', unit: 'm/s', scale: 3.6 },
    'longueur-pas': { id: 'HKQuantityTypeIdentifierWalkingStepLength', agg: 'avg', unit: 'cm' },
    'asymetrie-marche': { id: 'HKQuantityTypeIdentifierWalkingAsymmetryPercentage', agg: 'avg', unit: '%', scale: 100 },
    'double-appui': { id: 'HKQuantityTypeIdentifierWalkingDoubleSupportPercentage', agg: 'avg', unit: '%', scale: 100 },
    'stabilite-marche': { id: 'HKQuantityTypeIdentifierAppleWalkingSteadiness', agg: 'avg', unit: '%', scale: 100 },
    'vitesse-montee': { id: 'HKQuantityTypeIdentifierStairAscentSpeed', agg: 'avg', unit: 'm/s' },
    'vitesse-descente': { id: 'HKQuantityTypeIdentifierStairDescentSpeed', agg: 'avg', unit: 'm/s' },
    'marche-6-min': { id: 'HKQuantityTypeIdentifierSixMinuteWalkTestDistance', agg: 'avg', unit: 'm' },
    chutes: { id: 'HKQuantityTypeIdentifierNumberOfTimesFallen', agg: 'sum', unit: 'count' },
    fibrillation: { id: 'HKQuantityTypeIdentifierAtrialFibrillationBurden', agg: 'avg', unit: '%', scale: 100 },
    perfusion: { id: 'HKQuantityTypeIdentifierPeripheralPerfusionIndex', agg: 'avg', unit: '%', scale: 100 },
    'capacite-vitale': { id: 'HKQuantityTypeIdentifierForcedVitalCapacity', agg: 'avg', unit: 'L' },
    'debit-expiratoire': { id: 'HKQuantityTypeIdentifierPeakExpiratoryFlowRate', agg: 'avg', unit: 'L/min' },
    'son-casque': { id: 'HKQuantityTypeIdentifierHeadphoneAudioExposure', agg: 'avg', unit: 'dBASPL' },
    'son-ambiant': { id: 'HKQuantityTypeIdentifierEnvironmentalAudioExposure', agg: 'avg', unit: 'dBASPL' },
    uv: { id: 'HKQuantityTypeIdentifierUVExposure', agg: 'max', unit: 'count' },
    // fraction de sang (0,0005) vers grammes par litre (0,5 g/L)
    'alcool-sang': { id: 'HKQuantityTypeIdentifierBloodAlcoholContent', agg: 'avg', unit: '%', scale: 1000 },
    insuline: { id: 'HKQuantityTypeIdentifierInsulinDelivery', agg: 'sum', unit: 'IU' },
    'boissons-alcool': { id: 'HKQuantityTypeIdentifierNumberOfAlcoholicBeverages', agg: 'sum', unit: 'count' },
    fibres: { id: 'HKQuantityTypeIdentifierDietaryFiber', agg: 'sum', unit: 'g' },
    sucres: { id: 'HKQuantityTypeIdentifierDietarySugar', agg: 'sum', unit: 'g' },
    'graisses-saturees': { id: 'HKQuantityTypeIdentifierDietaryFatSaturated', agg: 'sum', unit: 'g' },
    'graisses-mono': { id: 'HKQuantityTypeIdentifierDietaryFatMonounsaturated', agg: 'sum', unit: 'g' },
    'graisses-poly': { id: 'HKQuantityTypeIdentifierDietaryFatPolyunsaturated', agg: 'sum', unit: 'g' },
    cholesterol: { id: 'HKQuantityTypeIdentifierDietaryCholesterol', agg: 'sum', unit: 'mg' },
    sodium: { id: 'HKQuantityTypeIdentifierDietarySodium', agg: 'sum', unit: 'mg' },
    potassium: { id: 'HKQuantityTypeIdentifierDietaryPotassium', agg: 'sum', unit: 'mg' },
    calcium: { id: 'HKQuantityTypeIdentifierDietaryCalcium', agg: 'sum', unit: 'mg' },
    magnesium: { id: 'HKQuantityTypeIdentifierDietaryMagnesium', agg: 'sum', unit: 'mg' },
    fer: { id: 'HKQuantityTypeIdentifierDietaryIron', agg: 'sum', unit: 'mg' },
    zinc: { id: 'HKQuantityTypeIdentifierDietaryZinc', agg: 'sum', unit: 'mg' },
    phosphore: { id: 'HKQuantityTypeIdentifierDietaryPhosphorus', agg: 'sum', unit: 'mg' },
    iode: { id: 'HKQuantityTypeIdentifierDietaryIodine', agg: 'sum', unit: 'mcg' },
    selenium: { id: 'HKQuantityTypeIdentifierDietarySelenium', agg: 'sum', unit: 'mcg' },
    cuivre: { id: 'HKQuantityTypeIdentifierDietaryCopper', agg: 'sum', unit: 'mg' },
    manganese: { id: 'HKQuantityTypeIdentifierDietaryManganese', agg: 'sum', unit: 'mg' },
    chrome: { id: 'HKQuantityTypeIdentifierDietaryChromium', agg: 'sum', unit: 'mcg' },
    molybdene: { id: 'HKQuantityTypeIdentifierDietaryMolybdenum', agg: 'sum', unit: 'mcg' },
    chlorure: { id: 'HKQuantityTypeIdentifierDietaryChloride', agg: 'sum', unit: 'mg' },
    'vitamine-a': { id: 'HKQuantityTypeIdentifierDietaryVitaminA', agg: 'sum', unit: 'mcg' },
    'vitamine-b1': { id: 'HKQuantityTypeIdentifierDietaryThiamin', agg: 'sum', unit: 'mg' },
    'vitamine-b2': { id: 'HKQuantityTypeIdentifierDietaryRiboflavin', agg: 'sum', unit: 'mg' },
    'vitamine-b3': { id: 'HKQuantityTypeIdentifierDietaryNiacin', agg: 'sum', unit: 'mg' },
    'vitamine-b5': { id: 'HKQuantityTypeIdentifierDietaryPantothenicAcid', agg: 'sum', unit: 'mg' },
    'vitamine-b8': { id: 'HKQuantityTypeIdentifierDietaryBiotin', agg: 'sum', unit: 'mcg' },
    'vitamine-b9': { id: 'HKQuantityTypeIdentifierDietaryFolate', agg: 'sum', unit: 'mcg' },
    'vitamine-c': { id: 'HKQuantityTypeIdentifierDietaryVitaminC', agg: 'sum', unit: 'mg' },
    'vitamine-d': { id: 'HKQuantityTypeIdentifierDietaryVitaminD', agg: 'sum', unit: 'mcg' },
    'vitamine-e': { id: 'HKQuantityTypeIdentifierDietaryVitaminE', agg: 'sum', unit: 'mg' },
    'vitamine-k': { id: 'HKQuantityTypeIdentifierDietaryVitaminK', agg: 'sum', unit: 'mcg' },
  };

  /** Mesures lisibles par getExtendedHistory sur iPhone */
  getExtendedKeys(): string[] {
    return [...Object.keys(HealthConnectService.EXT_QUANTITY), 'tension', 'pleine-conscience', ...Object.keys(HealthConnectService.EXT_EVENTS), 'ecg', 'humeur'];
  }

  /**
   * Demande la lecture des types ajoutés (une seule fenêtre iOS, qui ne liste que les types jamais proposés).
   * Sans effet dans Expo Go. Ne lève jamais d'erreur.
   */
  async requestExtendedPermissions(): Promise<boolean> {
    if (!HealthKit || isRunningInExpoGo || !isHealthKitAvailable) return false;
    // Une seule proposition : même si iOS refuse la demande, on ne la repropose pas en boucle
    try {
      await AsyncStorage.setItem(EXTENDED_ASKED_KEY, new Date().toISOString());
    } catch {}
    try {
      // Demande native d'abord (Nitro v13 échoue sur iOS 26), Nitro en secours sur un ancien build.
      // Délai large : la fenêtre liste beaucoup de types, il faut le temps de la lire.
      const natif = await this.withTimeout(requestHealthPermissionsForNative(HealthConnectService.EXTRA_READ_TYPES as string[], []), 180000);
      if (natif.startsWith('error:module absent')) {
        await this.withTimeout(
          Promise.resolve(HealthKit.requestAuthorization({ toRead: HealthConnectService.EXTRA_READ_TYPES, toShare: [] })),
          180000,
        );
      }
      try {
        await AsyncStorage.setItem(EXTENDED_ASKED_KEY, new Date().toISOString());
      } catch {}
      return true;
    } catch (e) {
      logger.warn('[HealthKit] Autorisation complémentaire impossible:', e);
      return false;
    }
  }

  /** true si la demande complémentaire a déjà été faite */
  async hasAskedExtendedPermissions(): Promise<boolean> {
    try {
      return !!(await AsyncStorage.getItem(EXTENDED_ASKED_KEY));
    } catch {
      return false;
    }
  }

  /** Une valeur par jour local pour un type de quantité */
  private async getQuantityDaily(
    id: string,
    agg: 'sum' | 'avg' | 'max',
    days: number,
    unit?: string,
    scale = 1,
    opts: { excludeOwn?: boolean; latest?: boolean } = {},
  ): Promise<Array<{ date: string; value: number }>> {
    if (!HealthKit || isRunningInExpoGo) return [];
    // Sans les écritures de YOROI ou avec la dernière valeur du jour : il faut les échantillons
    const needSamples = !!(opts.excludeOwn || opts.latest);
    const safeDays = Math.max(1, Math.min(Math.floor(days || 1), 3650));
    const from = new Date();
    from.setDate(from.getDate() - (safeDays - 1));
    from.setHours(0, 0, 0, 0);
    const to = new Date();

    // 1. Statistiques par jour calculées par Apple (dédoublonnées entre iPhone et montre)
    try {
      const HK = require('@kingstinct/react-native-healthkit');
      if (!needSamples && typeof HK.queryStatisticsCollectionForQuantity === 'function') {
        const opts: any = { filter: { date: { startDate: from, endDate: to } } };
        if (unit) opts.unit = unit;
        const stat = agg === 'sum' ? 'cumulativeSum' : agg === 'max' ? 'discreteMax' : 'discreteAverage';
        const rows: any[] = await this.withTimeout(
          Promise.resolve(HK.queryStatisticsCollectionForQuantity(id, [stat], from, { day: 1 }, opts)),
          15000,
        );
        const out: Array<{ date: string; value: number }> = [];
        for (const r of rows ?? []) {
          const q = agg === 'sum' ? r?.sumQuantity : agg === 'max' ? r?.maximumQuantity : r?.averageQuantity;
          const v = Number(q?.quantity);
          if (r?.startDate && Number.isFinite(v) && v > 0) {
            out.push({ date: localDateKey(new Date(r.startDate)), value: v * scale });
          }
        }
        if (out.length > 0) return out.sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (e) {
      logger.info(`[HealthKit] statistiques ${id} indisponibles, lecture des échantillons`);
    }

    // 2. Repli : échantillons bruts regroupés par jour local
    try {
      const options = this.createQueryOptions(from, to, { limit: 0, ascending: true, unit });
      if (!options) return [];
      const samples: any[] = await this.withTimeout(Promise.resolve(HealthKit.queryQuantitySamples(id, options)), 15000);
      const groups: Record<string, number[]> = {};
      const sorted = [...(samples ?? [])].sort((a, b) => new Date(a?.startDate).getTime() - new Date(b?.startDate).getTime());
      for (const s of sorted) {
        const v = Number(s?.quantity);
        if (!s?.startDate || !Number.isFinite(v)) continue;
        if (opts.excludeOwn && isYoroiSample(s)) continue;
        const d = localDateKey(new Date(s.startDate));
        (groups[d] = groups[d] ?? []).push(v * scale);
      }
      return Object.keys(groups)
        .map((d) => {
          const vals = groups[d];
          if (opts.latest) return { date: d, value: vals[vals.length - 1] };
          const value = agg === 'sum' ? vals.reduce((a, b) => a + b, 0) : agg === 'max' ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0) / vals.length;
          return { date: d, value };
        })
        .filter((p) => p.value > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (e) {
      logger.warn(`[HealthKit] lecture ${id} impossible:`, e);
      return [];
    }
  }

  /** Historique jour par jour d'une mesure étendue (clé YOROI). v2 : chiffre bas de la tension. */
  async getExtendedHistory(
    key: string,
    days: number = 30,
    opts: { excludeOwn?: boolean; latest?: boolean } = {},
  ): Promise<Array<{ date: string; value: number; v2?: number }>> {
    if (!HealthKit || isRunningInExpoGo) return [];
    try {
      const spec = HealthConnectService.EXT_QUANTITY[key];
      if (spec) return await this.getQuantityDaily(spec.id, spec.agg, days, spec.unit, spec.scale ?? 1, opts);

      const from = new Date();
      from.setDate(from.getDate() - (Math.max(1, days) - 1));
      from.setHours(0, 0, 0, 0);

      if (key === 'tension') {
        const options = this.createQueryOptions(from, new Date(), { limit: 0, ascending: true, unit: 'mmHg' });
        if (!options) return [];
        const [sys, dia] = await Promise.allSettled([
          HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBloodPressureSystolic', options),
          HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierBloodPressureDiastolic', options),
        ]);
        const g: Record<string, { s: number[]; d: number[] }> = {};
        const add = (rows: any[], k: 's' | 'd') => {
          for (const r of rows ?? []) {
            const v = Number(r?.quantity);
            if (!r?.startDate || !(v > 0)) continue;
            const day = localDateKey(new Date(r.startDate));
            (g[day] = g[day] ?? { s: [], d: [] })[k].push(v);
          }
        };
        if (sys.status === 'fulfilled') add(sys.value as any[], 's');
        if (dia.status === 'fulfilled') add(dia.value as any[], 'd');
        const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
        return Object.keys(g)
          .map((day) => ({ date: day, value: Math.round(avg(g[day].s)), v2: Math.round(avg(g[day].d)) || undefined }))
          .filter((p) => p.value > 0)
          .sort((a, b) => a.date.localeCompare(b.date));
      }

      if (key === 'pleine-conscience') {
        const options = this.createQueryOptions(from, new Date(), { limit: 0, ascending: true });
        if (!options) return [];
        const rows: any[] = await HealthKit.queryCategorySamples('HKCategoryTypeIdentifierMindfulSession', options);
        const g: Record<string, number> = {};
        for (const r of rows ?? []) {
          if (!r?.startDate || !r?.endDate) continue;
          const min = (new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 60000;
          if (!(min > 0) || min > 600) continue;
          const day = localDateKey(new Date(r.startDate));
          g[day] = (g[day] ?? 0) + min;
        }
        return Object.keys(g)
          .map((day) => ({ date: day, value: Math.round(g[day]) }))
          .filter((p) => p.value > 0)
          .sort((a, b) => a.date.localeCompare(b.date));
      }

      // Événements (alertes, ECG, humeur) : un compte par jour, ou la moyenne de l'humeur
      if (HealthConnectService.EXT_EVENTS[key] || key === 'ecg' || key === 'humeur') {
        const events = await this.getEventSamples(key, days);
        const g: Record<string, number[]> = {};
        for (const ev of events) {
          const day = localDateKey(new Date(ev.date));
          (g[day] = g[day] ?? []).push(ev.value ?? 1);
        }
        return Object.keys(g)
          .map((day) => ({
            date: day,
            value: key === 'humeur' ? g[day].reduce((a, b) => a + b, 0) / g[day].length : g[day].length,
          }))
          .filter((p) => p.value > 0)
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    } catch (e) {
      logger.warn(`[HealthKit] getExtendedHistory ${key}:`, e);
    }
    return [];
  }

  /**
   * Liste datée des événements d'une mesure (chutes, alertes du cœur, ECG, humeur...), du plus récent au plus ancien.
   * value : nombre de chutes, fréquence moyenne de l'ECG, humeur de 1 à 7. Ne lève jamais d'erreur.
   */
  async getEventSamples(
    key: string,
    days: number = 90,
  ): Promise<Array<{ date: string; end?: string; title: string; detail?: string; value?: number }>> {
    if (!HealthKit || isRunningInExpoGo) return [];
    const from = new Date();
    from.setDate(from.getDate() - (Math.max(1, Math.min(days, 3650)) - 1));
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    const iso = (d: unknown) => {
      const t = new Date(d as any);
      return Number.isFinite(t.getTime()) ? t.toISOString() : '';
    };
    const minutes = (a: unknown, b: unknown) => {
      const m = (new Date(b as any).getTime() - new Date(a as any).getTime()) / 60000;
      return Number.isFinite(m) && m >= 1 ? Math.round(m) : 0;
    };
    try {
      const HK = require('@kingstinct/react-native-healthkit');
      const options = this.createQueryOptions(from, to, { limit: 200, ascending: false });
      if (!options) return [];

      const cat = HealthConnectService.EXT_EVENTS[key];
      if (cat) {
        const rows: any[] = await this.withTimeout(Promise.resolve(HealthKit.queryCategorySamples(cat.id, options)), 15000);
        return (rows ?? [])
          .filter((r) => r?.startDate)
          .map((r) => {
            const md = r?.metadata ?? {};
            const th = md?.HKHeartRateEventThreshold;
            const threshold = typeof th === 'number' ? th : Number(th?.quantity);
            const bits: string[] = [];
            if ((key === 'fc-haute' || key === 'fc-basse') && Number.isFinite(threshold) && threshold > 0) bits.push(`seuil ${Math.round(threshold)} bpm`);
            const dur = minutes(r.startDate, r.endDate);
            if (dur > 0 && key !== 'apnees' && key !== 'cardio-faible' && key !== 'alerte-stabilite') bits.push(`${dur} min`);
            return { date: iso(r.startDate), end: iso(r.endDate) || undefined, title: cat.title(Number(r?.value)), detail: bits.join(', ') || undefined };
          })
          .filter((e) => !!e.date);
      }

      if (key === 'chutes') {
        const rows: any[] = await this.withTimeout(
          Promise.resolve(HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierNumberOfTimesFallen', { ...options, unit: 'count' })),
          15000,
        );
        return (rows ?? [])
          .filter((r) => r?.startDate && Number(r?.quantity) > 0)
          .map((r) => {
            const n = Math.round(Number(r.quantity));
            return { date: iso(r.startDate), title: n > 1 ? traduire("{0} chutes détectées", n) : traduire('Chute détectée'), value: n };
          })
          .filter((e) => !!e.date);
      }

      if (key === 'ecg' && typeof HK.queryElectrocardiogramSamples === 'function') {
        const rows: any[] = await this.withTimeout(Promise.resolve(HK.queryElectrocardiogramSamples({ ...options, includeVoltages: false })), 15000);
        const LABEL: Record<string, string> = {
          sinusRhythm: 'Rythme sinusal',
          atrialFibrillation: traduire('Signes de fibrillation auriculaire'),
          inconclusiveLowHeartRate: traduire('Non concluant, fréquence basse'),
          inconclusiveHighHeartRate: traduire('Non concluant, fréquence élevée'),
          inconclusivePoorReading: traduire('Non concluant, enregistrement de mauvaise qualité'),
          inconclusiveOther: traduire('Non concluant'),
          notSet: traduire('Résultat non renseigné'),
        };
        return (rows ?? [])
          .filter((r) => r?.startDate)
          .map((r) => {
            const bpm = Number(r?.averageHeartRateBpm);
            const bits: string[] = [];
            if (Number.isFinite(bpm) && bpm > 0) bits.push(`${Math.round(bpm)} bpm en moyenne`);
            if (r?.symptomsStatus === 'present') bits.push(traduire('symptômes notés'));
            return { date: iso(r.startDate), title: LABEL[String(r?.classification)] ?? traduire('Électrocardiogramme'), detail: bits.join(', ') || undefined, value: 1 };
          })
          .filter((e) => !!e.date);
      }

      if (key === 'humeur' && typeof HK.queryStateOfMindSamples === 'function') {
        const rows: any[] = await this.withTimeout(Promise.resolve(HK.queryStateOfMindSamples(options)), 15000);
        const VALENCE = ['', traduire('Très désagréable'), traduire('Désagréable'), traduire('Un peu désagréable'), 'Neutre', traduire('Un peu agréable'), traduire('Agréable'), traduire('Très agréable')];
        const LABELS: Record<number, string> = {
          1: traduire('émerveillé'), 2: traduire('amusé'), 3: traduire('en colère'), 4: 'anxieux', 5: 'honteux', 6: 'courageux', 7: 'calme', 8: 'content',
          9: traduire('déçu'), 10: traduire('découragé'), 11: traduire('dégoûté'), 12: traduire('gêné'), 13: 'enthousiaste', 14: traduire('frustré'), 15: 'reconnaissant',
          16: 'coupable', 17: 'heureux', 18: traduire('désespéré'), 19: traduire('irrité'), 20: 'jaloux', 21: 'joyeux', 22: 'seul', 23: traduire('passionné'),
          24: 'serein', 25: 'fier', 26: traduire('soulagé'), 27: 'triste', 28: traduire('effrayé'), 29: traduire('stressé'), 30: 'surpris', 31: 'inquiet',
          32: traduire('agacé'), 33: 'confiant', 34: traduire('épuisé'), 35: 'plein d’espoir', 36: traduire('indifférent'), 37: traduire('débordé'), 38: 'satisfait',
        };
        return (rows ?? [])
          .filter((r) => r?.startDate && Number(r?.valenceClassification) >= 1)
          .map((r) => {
            const v = Math.max(1, Math.min(7, Math.round(Number(r.valenceClassification))));
            const words = (Array.isArray(r?.labels) ? r.labels : []).map((l: number) => LABELS[Number(l)]).filter(Boolean).slice(0, 3);
            const kind = Number(r?.kind) === 2 ? traduire('Humeur de la journée') : traduire('Émotion du moment');
            return { date: iso(r.startDate), title: VALENCE[v], detail: [kind, ...words].join(', '), value: v };
          })
          .filter((e) => !!e.date);
      }
    } catch (e) {
      logger.warn(`[HealthKit] getEventSamples ${key}:`, e);
    }
    return [];
  }

  /**
   * Garde en base les derniers jours des mesures étendues (type « x_<clé> »),
   * pour que l'écran Santé les montre même hors connexion ou dans Expo Go.
   */
  private async storeExtendedRecent(days: number = 3): Promise<number> {
    if (!HealthKit || isRunningInExpoGo) return 0;
    const keys = this.getExtendedKeys().filter((k) => k !== 'masse-grasse' && k !== 'masse-maigre' && k !== 'etages');
    // Six lectures à la fois : plus de cent rubriques depuis le 10 octobre 2026, Santé ne doit pas saturer
    const results: PromiseSettledResult<Array<{ date: string; value: number; v2?: number }>>[] = new Array(keys.length);
    let next = 0;
    const worker = async () => {
      while (next < keys.length) {
        const i = next++;
        try {
          results[i] = { status: 'fulfilled', value: await this.withTimeout(this.getExtendedHistory(keys[i], days), 20000) };
        } catch (reason) {
          results[i] = { status: 'rejected', reason };
        }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    const records: HealthDataRecord[] = [];
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled') return;
      for (const p of r.value) {
        if (!(p.value > 0)) continue;
        records.push({
          date: p.date,
          type: `x_${keys[i]}` as HealthDataRecord['type'],
          value: Math.round(p.value * 100) / 100,
          value2: p.v2,
          source: 'apple_health',
        });
      }
    });
    if (records.length === 0) return 0;
    try {
      return await saveHealthDataBatch(records);
    } catch (e) {
      logger.warn('[syncAll] mesures étendues non enregistrées:', e);
      return 0;
    }
  }

  async syncAll(): Promise<HealthData | null> {
    if (await demoActive()) { logger.info('[Sante] mode démo : rien n’est lu ni importé'); return null; }
    if (!this.syncStatus.isConnected) {
      // Verifier si HealthKit est quand meme disponible (permissions accordees via Reglages iOS)
      const available = await this.isAvailable();
      if (!available) {
        logger.warn('[syncAll] Non connecté et non disponible, abandon');
        return null;
      }
      logger.info('[syncAll] Non connecté mais HealthKit disponible, on continue');
    }

    // 14 octobre 2026 (ios27) : zones d'Apple relues au plus une fois par jour
    await syncAppleZones().catch(() => 'indisponible');

    try {
      logger.info('[syncAll] Synchronisation iOS en cours...');
      const data = await this.getAllHealthData();
      const today = localDateKey(new Date());
      const dayOf = (x: unknown) => sampleDay((x as { date?: string | Date } | null | undefined)?.date, today);
      const records: HealthDataRecord[] = [];
      let savedCount = 0;

      // ══════ POIDS → SQLite (table weights) ══════
      if (data.weight) {
        try {
          // Date locale de la pesée (une pesée à 7 h en France est à 5 h UTC : split('T') pouvait la ranger la veille)
          const added = await this.saveImportedWeight(
            sampleDay(data.weight.date, today),
            data.weight.value,
            data.weight.source || 'apple_health',
          );
          if (added) savedCount++;
          logger.info(`[syncAll] Poids ${added ? 'sauvegardé' : 'déjà présent'}: ${data.weight.value} kg (source: ${data.weight.source})`);
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
          date: dayOf(data.heartRateVariability),
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
          // 16 octobre : jour du reveil, comme Sante et comme la saisie manuelle (avant : jour du coucher)
          const sleepDate = data.sleep.endTime
            ? cleNuit(new Date(data.sleep.endTime).getTime())
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
          date: dayOf(data.vo2Max),
          type: 'vo2max',
          value: Math.round(data.vo2Max.value * 10) / 10,
          unit: 'ml/kg/min',
          source: data.vo2Max.source || 'apple_health',
        });
      }

      // ══════ SpO2 → SQLite ══════
      if (data.oxygenSaturation && data.oxygenSaturation.value > 0) {
        records.push({
          date: dayOf(data.oxygenSaturation),
          type: 'spo2',
          value: Math.round(data.oxygenSaturation.value * 10) / 10,
          unit: '%',
          source: data.oxygenSaturation.source || 'apple_health',
        });
      }

      // ══════ COMPOSITION CORPORELLE → SQLite ══════
      if (data.bodyComposition) {
        const compSource = data.bodyComposition.source || 'apple_health';
        // Jour de la mesure de la balance, pas celui de la synchronisation
        const compDay = dayOf(data.bodyComposition);
        if (data.bodyComposition.bodyFatPercentage && data.bodyComposition.bodyFatPercentage > 0) {
          records.push({
            date: compDay,
            type: 'body_fat',
            value: Math.round(data.bodyComposition.bodyFatPercentage * 10) / 10,
            unit: '%',
            source: compSource,
          });
        }
        if (data.bodyComposition.leanBodyMass && data.bodyComposition.leanBodyMass > 0) {
          records.push({
            date: compDay,
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
          date: dayOf(data.bloodPressure),
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
          date: dayOf(data.bloodGlucose),
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
          date: dayOf(data.height),
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

      // ══════ RESPIRATION ET TEMPÉRATURE → SQLite (lues mais jamais gardées avant le 9 octobre 2026) ══════
      if (data.respiratoryRate && data.respiratoryRate.value > 0) {
        records.push({
          date: data.respiratoryRate.date ? localDateKey(new Date(data.respiratoryRate.date)) : today,
          type: 'respiratory_rate',
          value: Math.round(data.respiratoryRate.value * 10) / 10,
          unit: 'resp/min',
          source: data.respiratoryRate.source || 'apple_health',
        });
      }
      if (data.bodyTemperature && data.bodyTemperature.value > 0) {
        records.push({
          date: data.bodyTemperature.date ? localDateKey(new Date(data.bodyTemperature.date)) : today,
          type: 'body_temp',
          value: Math.round(data.bodyTemperature.value * 10) / 10,
          unit: '°C',
          source: data.bodyTemperature.source || 'apple_health',
        });
      }

      // ══════ MESURES ÉTENDUES → SQLite (3 derniers jours, best effort) ══════
      try {
        const extSaved = await this.storeExtendedRecent(3);
        if (extSaved > 0) logger.info(`[syncAll] Mesures étendues: ${extSaved}`);
      } catch (e) {
        logger.warn('[syncAll] Mesures étendues ignorées:', e);
      }

      // ══════ WORKOUTS → SQLite (table trainings) ══════
      if (data.workouts && data.workouts.length > 0) {
        // Charger les fingerprints ET les UUID déjà en base pour dédup fiable
        let importedFingerprints: Set<string> = new Set();
        try {
          const saved = await AsyncStorage.getItem('@yoroi_imported_workouts');
          if (saved) importedFingerprints = new Set(JSON.parse(saved));
        } catch {}
        // UUID en base (source de vérité, résiste au vidage d'AsyncStorage)
        let existingUUIDs: Set<string> = new Set();
        try { existingUUIDs = await getExistingHealthkitUUIDs(); } catch {}

        let workoutsSaved = 0;
        const detailsQueue: { uuid: string; trainingId: number; startDate?: string; durationMin?: number }[] = [];
        for (const workout of data.workouts) {
          const uuid = (workout as any).hkUUID || workout.id;
          // Dédup par UUID (fiable)
          if (uuid && existingUUIDs.has(uuid)) continue;
          const fingerprint = `${workout.startDate}_${workout.activityType}_${workout.duration}`;
          // Dédup par empreinte (fallback si pas d'UUID)
          if (importedFingerprints.has(fingerprint)) continue;

          try {
            const sport = mapWorkoutType(workout.activityType);
            const trainingDate = localDateKey(new Date(workout.startDate)); // date locale (pas UTC)
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
              is_outdoor: (workout as any).indoor === false || undefined,
            };

            const trainingId = await addTraining(await completerLieuImport(training));
            importedFingerprints.add(fingerprint);
            if (uuid) existingUUIDs.add(uuid); // Mettre à jour le cache local
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
      // v2 : déduplication par source (Apple Watch prioritaire) pour éviter double-comptage
      const SLEEP_SYNC_VERSION = 'v3'; // v3 (16 octobre) : calcul comme Sante, nuit rangee au jour du reveil
      try {
        const hasSyncedSleepHistory = await AsyncStorage.getItem('@yoroi_sleep_history_synced');
        if (!hasSyncedSleepHistory || hasSyncedSleepHistory !== SLEEP_SYNC_VERSION) {
          // Import historique complet (premier démarrage ou mise à jour de l'algorithme)
          const imported = await this.syncSleepHistory(730);
          if (imported > 0) {
            await AsyncStorage.setItem('@yoroi_sleep_history_synced', SLEEP_SYNC_VERSION);
            logger.info(`[syncAll] Historique sommeil importe (${SLEEP_SYNC_VERSION}): ${imported} nuits`);
          }
        } else {
          // Toujours resynchroniser les 14 derniers jours pour avoir les nuits récentes
          await this.syncSleepHistory(14);
          logger.info('[syncAll] Sync sommeil 14 jours effectue');
        }
      } catch (e) {
        logger.warn('[syncAll] Erreur import historique sommeil:', e);
      }

      // ══════ SECURITY: Store weight in SecureStore instead of AsyncStorage ══════
      if (data.weight) {
        await secureStorage.setItem(STORAGE_KEYS.LAST_WEIGHT, data.weight);
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
        const todayKey = `@yoroi_hydration_${localDateKey(new Date())}`;
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
      // 14 octobre 2026 (ios27) : seances deja importees completees avec les temps par zone d'Apple, en fond
      backfillAppleZones().catch(() => 0);
      return data;
    } catch (error) {
      logger.error('[syncAll] Erreur synchronisation:', error);
      throw error;
    }
  }

  // ============================================
  // IMPORT COMPLET DE TOUT L'HISTORIQUE APPLE SANTÉ
  // Séances, poids, sommeil, pas, calories, FC, distance, sans limite de date
  // ============================================

  async importFullHistory(
    onProgress?: (step: string, current: number, total: number) => void
  ): Promise<{ weights: number; sleep: number; steps: number; calories: number; heartRate: number; distance: number; workouts: number; healthkitFound: number; insertErrors: number }> {

    const result = { weights: 0, sleep: 0, steps: 0, calories: 0, heartRate: 0, distance: 0, workouts: 0, healthkitFound: 0, insertErrors: 0 };
    // 17 octobre : rien n'est importe pendant la demo (profil Heny)
    if (await demoActive()) return result;
    const TOTAL_STEPS = 7;
    let stepIndex = 0;

    const progress = (label: string) => {
      stepIndex++;
      onProgress?.(label, stepIndex, TOTAL_STEPS);
      // 14 octobre 2026 (SANTÉ CONNEXION) : les comptes déjà importés, pour « Import en cours : 120 pesées, 45 séances »
      DeviceEventEmitter.emit('YOROI_IMPORT_PROGRESS', { step: label, current: stepIndex, total: TOTAL_STEPS, compte: { ...result } });
      logger.info(`[importFullHistory] ${label} (${stepIndex}/${TOTAL_STEPS})`);
    };

    DeviceEventEmitter.emit('YOROI_IMPORT_START');

    // Zones d'Apple lues pendant la connexion : les séances importées les utilisent (au plus 15 s d'attente)
    if (this.zonesAvantImport) {
      try {
        await this.withTimeout(this.zonesAvantImport, 15000);
      } catch {}
      this.zonesAvantImport = null;
    }

    try {

      // ══════ 1. POIDS, toutes les pesées depuis l'an 2000 ══════
      progress('Poids');
      try {
        const weights = await this.getWeightHistory(); // days=0 = illimité, sans les écritures de YOROI
        // Pesées déjà en base (toutes sources) : ni doublon avec la synchro, ni avec une saisie manuelle
        const known = await getWeights().catch(() => []);
        for (const w of weights) {
          try {
            const added = await this.saveImportedWeight(w.date, w.value, normalizeSourceName(w.source || 'apple_health'), known);
            if (added) result.weights++;
          } catch { /* doublon ou contrainte, on ignore */ }
        }
        logger.info(`[importFullHistory] Poids importés: ${result.weights}/${weights.length}`);
      } catch (e) { logger.warn('[importFullHistory] Erreur poids:', e); }

      // ══════ 2. SOMMEIL, toutes les nuits depuis l'an 2000 ══════
      progress(traduire('Sommeil'));
      try {
        const sleepHistory = await this.getSleepHistory(); // illimité
        for (const night of sleepHistory) {
          try {
            // Utiliser les vraies heures HealthKit (startTime/endTime en ISO UTC)
            const toHHMM = (iso: string) => {
              const d = new Date(iso);
              return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            };
            const bedTime = night.startTime ? toHHMM(night.startTime) : '22:00';
            const wakeTime = night.endTime ? toHHMM(night.endTime) : '07:00';
            await addSleepEntryFromHealthKit({
              date: night.date,
              bedTime,
              wakeTime,
              duration: night.total,
              quality: night.total >= 480 ? 5 : night.total >= 420 ? 4 : night.total >= 360 ? 3 : night.total >= 300 ? 2 : 1,
              phases: { deep: night.deep, rem: night.rem, core: night.core, awake: night.awake },
            });
            result.sleep++;
          } catch { /* doublon, on ignore */ }
        }
        logger.info(`[importFullHistory] Nuits importées: ${result.sleep}/${sleepHistory.length}`);
      } catch (e) { logger.warn('[importFullHistory] Erreur sommeil:', e); }

      // ══════ 3. PAS, tous les jours depuis l'an 2000 ══════
      progress(traduire('Pas'));
      try {
        const stepsHistory = await this.getStepsHistory(); // illimité
        const stepsRecords: HealthDataRecord[] = stepsHistory.map(s => ({
          date: s.date, type: 'steps', value: s.value, unit: 'count', source: 'apple_health',
        }));
        if (stepsRecords.length > 0) result.steps = await saveHealthDataBatch(stepsRecords);
        logger.info(`[importFullHistory] Jours de pas importés: ${result.steps}`);
      } catch (e) { logger.warn('[importFullHistory] Erreur pas:', e); }

      // ══════ 4. CALORIES, tous les jours depuis l'an 2000 ══════
      progress(traduire('Calories'));
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

      // ══════ 5. FRÉQUENCE CARDIAQUE, tous les jours depuis l'an 2000 ══════
      progress(traduire('Fréquence cardiaque'));
      try {
        const hrHistory = await this.getHeartRateHistory(); // illimité
        const hrRecords: HealthDataRecord[] = hrHistory.map(h => ({
          date: h.date, type: 'heart_rate', value: h.value, unit: 'bpm', source: 'apple_health',
        }));
        if (hrRecords.length > 0) result.heartRate = await saveHealthDataBatch(hrRecords);
        logger.info(`[importFullHistory] Jours de FC importés: ${result.heartRate}`);
      } catch (e) { logger.warn('[importFullHistory] Erreur FC:', e); }

      // ══════ 6. DISTANCE, tous les jours depuis l'an 2000 ══════
      progress('Distance');
      try {
        const distHistory = await this.getDistanceHistory(); // illimité
        const distRecords: HealthDataRecord[] = distHistory.map(d => ({
          date: d.date, type: 'distance', value: d.value, unit: 'km', source: 'apple_health',
        }));
        if (distRecords.length > 0) result.distance = await saveHealthDataBatch(distRecords);
        logger.info(`[importFullHistory] Jours de distance importés: ${result.distance}`);
      } catch (e) { logger.warn('[importFullHistory] Erreur distance:', e); }

      // ══════ 7. SÉANCES, toutes depuis l'an 2000 ══════
      progress(traduire('Séances'));
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
              const trainingDate = localDateKey(new Date(workout.startDate)); // date locale (pas UTC)
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
                is_outdoor: (workout as any).indoor === false || undefined,
              };

              await addTraining(await completerLieuImport(training));
              importedFingerprints.add(fingerprint);
              if (uuid) existingUUIDs.add(uuid);
              result.workouts++;
              if (result.workouts % 10 === 0) {
                DeviceEventEmitter.emit('YOROI_IMPORT_PROGRESS', { step: 'Séances', current: stepIndex, total: TOTAL_STEPS, compte: { ...result } });
              }
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
    const trainingDate = localDateKey(new Date(workout.startDate)); // date locale (pas UTC)
    const startTime = new Date(workout.startDate).toTimeString().slice(0, 5);

    const workoutLabel = getWorkoutLabel(workout.activityType);
    const noteParts: string[] = [];
    if (workout.duration > 0) noteParts.push(`${Math.round(workout.duration)} min`);
    if (workout.distance && workout.distance > 0) noteParts.push(`${(workout.distance > 100 ? workout.distance / 1000 : workout.distance).toFixed(2)} km`);
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
      is_outdoor: (workout as any).indoor === false || undefined,
    };

    const trainingId = await addTraining(await completerLieuImport(training));
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
    if (await demoActive()) return;
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
        // 18 octobre 2026 : la notification ne part que pour une séance qui vient de finir, une seule fois par séance
        // (mémoire durable, regroupement) : lib/v2/notifications/seanceTerminee.ts. Une séance écartée (id 0) n'en a pas.
        if (result && result.trainingId && result.trainingId > 0) {
          await this.sendWorkoutCompletionNotification(workout, result.trainingId);
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
          buttonTitle: traduire('Partager'),
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'view',
          buttonTitle: traduire('Voir'),
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
      if (!trainingId || trainingId <= 0) return;
      // S'assurer que la categorie est enregistree
      await this.registerNotificationCategory();

      const sportLabel = getWorkoutLabel(workout.activityType);

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
        'Course': 'Belle course',
        'Trail': 'Beau trail',
        'Marche': 'Belle marche',
        'Musculation': traduire('Belle séance de muscu'),
        'HYROX': traduire('Séance HYROX terminée'),
        'JJB': 'Beau roulage',
        'Boxe': traduire('Belle séance de boxe'),
        'Velo': traduire('Belle sortie à vélo'),
        'Natation': 'Belle nage',
        'Yoga': traduire('Belle séance de yoga'),
        'Football': traduire('Beau match de foot'),
        'Basketball': traduire('Beau match de basket'),
        'Tennis': traduire('Belle partie de tennis'),
        'Cardio': traduire('Belle séance de cardio'),
        'Danse': traduire('Belle séance de danse'),
        'CrossFit': traduire('WOD terminé'),
        'Pilates': traduire('Belle séance de Pilates'),
        'Escalade': 'Belle grimpe',
        'Ski': 'Belle descente',
        'Ski de fond': traduire('Belle session de fond'),
        'Rugby': traduire('Beau match de rugby'),
        'Handball': traduire('Beau match de hand'),
        'Golf': traduire('Belle partie de golf'),
        'Surf': traduire('Belle session de surf'),
        'Aviron': 'Belle sortie d’aviron',
      };

      const title = titres[sportLabel] || traduire("Belle séance de {0}", sportLabel.toLowerCase());

      // Envoi, regroupement, mémoire et réglages : lib/v2/notifications/seanceTerminee.ts (le corps y est construit,
      // sans valeur de santé, et les données portent l'id de la séance pour ouvrir sa carte)
      signalerSeanceTerminee({
        trainingId,
        titre: title,
        debutIso: workout.startDate,
        finIso: (workout as any).endDate,
        dureeMin: workout.duration,
        uuid: (workout as any).hkUUID || workout.id || undefined,
        source: sourceLabel || undefined,
        sport: mapWorkoutType(workout.activityType),
      });
      logger.info(`[WorkoutObserver] Séance signalée pour notification: ${title}`);
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
        // Utiliser les vraies heures HealthKit
        const toHHMM = (iso: string) => {
          const d = new Date(iso);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        };
        const bedTime = night.startTime ? toHHMM(night.startTime) : '22:00';
        const wakeTime = night.endTime ? toHHMM(night.endTime) : '07:00';

        const result = await addSleepEntryFromHealthKit({
          date: night.date,
          bedTime,
          wakeTime,
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

      // Les nuits HealthKit rangees sous l'ancienne cle (jour du coucher) disparaissent : sinon une nuit compterait deux fois
      try {
        const debut = history.reduce((m, n) => (n.date < m ? n.date : m), history[0].date);
        await purgerNuitsHealthKit(new Set(history.filter((n) => n.total >= 30).map((n) => n.date)), debut);
      } catch (e) {
        logger.warn('[syncSleepHistory] purge des anciennes cles impossible:', e);
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
        STORAGE_KEYS.LAST_HYDRATION,
      ]);
      // SECURITY: Also remove weight from SecureStore
      await secureStorage.removeItem(STORAGE_KEYS.LAST_WEIGHT);
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
      errors.push(traduire('HealthKit est en mode MOCK (module natif non disponible) - les données seront vides'));
      recommendations.push(traduire('Installez l\'app via EAS Build (pas Expo Go) pour activer le module natif HealthKit'));
    }
    if (healthKitDiagnostic.isExpoGo) {
      errors.push(traduire('Expo Go detecte - les modules natifs (HealthKit, NitroModules) ne fonctionnent pas dans Expo Go'));
      recommendations.push(traduire('Utilisez un Development Build (npx expo run:ios ou EAS Build) pour tester HealthKit'));
    }

    // 1. Verifier si HealthKit est disponible
    const healthKitAvailable = await this.isAvailable();
    logger.info('[Diagnostic] HealthKit disponible:', healthKitAvailable);

    if (!healthKitAvailable) {
      if (!errors.some(e => e.includes('Module HealthKit'))) {
        errors.push(traduire('HealthKit non disponible sur cet appareil'));
      }
      recommendations.push(traduire('Verifiez que vous etes sur un appareil iOS physique (pas simulateur)'));
    }

    // 2. Vérifier la connexion
    const isConnected = this.syncStatus.isConnected;
    logger.info('[Diagnostic] Connecté:', isConnected);

    if (!isConnected) {
      errors.push(traduire('Non connecté à Apple Health'));
      recommendations.push(traduire('Allez dans Réglages > Confidentialité > Santé > Yoroi et activez toutes les permissions'));
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
        errors.push(traduire('Aucune donnée de sommeil trouvée sur 30 jours'));
        recommendations.push(traduire('Portez votre Apple Watch la nuit pour enregistrer le sommeil'));
        recommendations.push(traduire('Vérifiez que le Suivi du sommeil est activé sur votre Apple Watch'));
      }
    } catch (e) {
      errors.push(traduire('Erreur lecture sommeil: ') + (e as Error).message);
    }

    try {
      // Test poids (90 jours)
      const weightHistory = await this.getWeightHistory(90);
      weightCount = weightHistory.length;
      logger.info('[Diagnostic] Poids trouvé:', weightCount, 'mesures');

      if (weightCount === 0) {
        errors.push(traduire('Aucune donnée de poids trouvée sur 90 jours'));
        recommendations.push(traduire('Ajoutez votre poids manuellement dans Apple Santé ou utilisez une balance connectée'));
      }
    } catch (e) {
      errors.push(traduire('Erreur lecture poids: ') + (e as Error).message);
    }

    try {
      // Test pas (aujourd'hui)
      const steps = await this.getTodaySteps();
      stepsCount = steps?.count || 0;
      logger.info('[Diagnostic] Pas aujourd\'hui:', stepsCount);
    } catch (e) {
      errors.push(traduire('Erreur lecture pas: ') + (e as Error).message);
    }

    try {
      // Test fréquence cardiaque
      const heartRate = await this.getTodayHeartRate();
      heartRateCount = heartRate?.average || 0;
      logger.info('[Diagnostic] FC moyenne:', heartRateCount);

      if (heartRateCount === 0) {
        recommendations.push(traduire('Portez votre Apple Watch pour enregistrer la fréquence cardiaque'));
      }
    } catch (e) {
      errors.push(traduire('Erreur lecture FC: ') + (e as Error).message);
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
  traduire("1. YOROI va demander l'accès à l'app Santé"),
  traduire("2. Autorise l'accès au poids, aux pas, au sommeil et à l'hydratation"),
  traduire("3. Tes données seront synchronisées automatiquement"),
];

export default healthConnect;
