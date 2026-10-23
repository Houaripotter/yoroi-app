// ============================================
// YOROI - YoroiHealthKit Native Module
// ============================================
// Contournement du bridge Nitro v13 + iOS 26 beta.
// Le module Swift retourne une String JSON pure.
// ============================================

import { NativeModules, Platform } from 'react-native';
import logger from '@/lib/security/logger';

const { YoroiHealthKitModule } = NativeModules;

export interface NativeWorkout {
  uuid: string;
  startDate: number;            // timestamp ms (JS)
  endDate: number;              // timestamp ms (JS)
  workoutActivityType: number;  // HKWorkoutActivityType raw value
  totalEnergyBurned: number;    // kcal
  totalDistance: number;        // mètres
  sourceName: string;
}

export interface NativeDiagnosticResult {
  authStatus: number;          // 0=notDetermined, 1=denied, 2=authorized
  sources: string[];           // noms des apps ayant des workouts (HKSourceQuery)
  sourceError?: string;
  nuclearTest: {               // requête sans predicate, limit 1
    found: boolean;
    count: number;
    activityType?: number;
    startDate?: number;        // ms
    sourceName?: string;
  };
  nuclearError?: string;
  predicateTest: {             // requête avec predicate 365 jours
    found: boolean;
    count: number;
  };
  predicateError?: string;
  predicateFrom?: number;      // unix seconds
  predicateTo?: number;        // unix seconds
  externalTest?: {             // TEST D : séances hors-Yoroi (Apple Watch, Fitness...)
    found: boolean;
    count: number;
    sourceName?: string;
    sourceBundle?: string;
  };
  externalError?: string;
  error?: string;
}

/**
 * Récupère les workouts HealthKit via le module natif Swift.
 * @param days - Nombre de jours d'historique (0 = tout l'historique)
 */
export async function getNativeWorkouts(days: number = 0): Promise<NativeWorkout[]> {
  if (Platform.OS !== 'ios') return [];

  logger.info('[YoroiHK-JS] getNativeWorkouts, days=' + days);

  if (!YoroiHealthKitModule?.getWorkoutsAsJSON) {
    logger.warn('[YoroiHK-JS] ERREUR: module natif non trouvé');
    logger.info('[YoroiHK-JS] Modules Yoroi dispo:', Object.keys(NativeModules).filter(k => k.toLowerCase().includes('yoroi')));
    return [];
  }

  try {
    const jsonString: string = await YoroiHealthKitModule.getWorkoutsAsJSON(days);
    logger.info('[YoroiHK-JS] Retour Swift (200 chars):', jsonString.substring(0, 200));
    const parsed = JSON.parse(jsonString) as NativeWorkout[];
    logger.info('[YoroiHK-JS] Workouts parsés:', parsed.length);
    return parsed;
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR getWorkoutsAsJSON:', e?.message);
    return [];
  }
}

/**
 * Re-demande la permission de LECTURE des workouts via Swift natif (bypass Nitro v13).
 * Retourne un string "count:N|sources:X,Y|authStatus:Z" ou "error:<msg>"
 */
export async function requestWorkoutReadAuthNative(): Promise<string> {
  if (Platform.OS !== 'ios') return 'error:not iOS';

  logger.info('[YoroiHK-JS] requestWorkoutReadAuthNative appelé');

  if (!YoroiHealthKitModule?.requestWorkoutReadAuth) {
    logger.warn('[YoroiHK-JS] requestWorkoutReadAuth non disponible, rebuild requis');
    return 'error:module absent';
  }

  try {
    const result: string = await YoroiHealthKitModule.requestWorkoutReadAuth();
    logger.info('[YoroiHK-JS] requestWorkoutReadAuth résultat:', result);
    return result;
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR requestWorkoutReadAuth:', e?.message);
    return `error:${e?.message}`;
  }
}

/**
 * Demande TOUTES les permissions HealthKit via Swift natif (bypass Nitro v13).
 * Retourne "ok:N" ou "error:<msg>"
 */
export async function requestAllHealthPermissionsNative(): Promise<string> {
  if (Platform.OS !== 'ios') return 'error:not iOS';

  logger.info('[YoroiHK-JS] requestAllHealthPermissionsNative appelé');

  if (!YoroiHealthKitModule?.requestAllHealthPermissions) {
    logger.warn('[YoroiHK-JS] requestAllHealthPermissions non disponible, rebuild requis');
    return 'error:module absent';
  }

  try {
    const result: string = await YoroiHealthKitModule.requestAllHealthPermissions();
    logger.info('[YoroiHK-JS] requestAllHealthPermissions résultat:', result);
    return result;
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR requestAllHealthPermissions:', e?.message);
    return `error:${e?.message}`;
  }
}

/**
 * Demande une liste précise de types (14 octobre 2026, SANTÉ CONNEXION). La liste vient de
 * lib/v2/sante/typesSante.ts. Retourne "ok:<lecture>:<écriture>", "error:module absent" (ancien build) ou "error:<msg>".
 */
export async function requestHealthPermissionsForNative(read: string[], share: string[]): Promise<string> {
  if (Platform.OS !== 'ios') return 'error:not iOS';
  if (!YoroiHealthKitModule?.requestHealthPermissionsFor) return 'error:module absent';
  try {
    const result: string = await YoroiHealthKitModule.requestHealthPermissionsFor(read, share);
    logger.info('[YoroiHK-JS] requestHealthPermissionsFor résultat:', result);
    return result;
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR requestHealthPermissionsFor:', e?.message);
    return `error:${e?.message}`;
  }
}

/** "shouldRequest" | "unnecessary" | "unknown" ("unknown" aussi sur un ancien build) */
export async function getRequestStatusForNative(read: string[], share: string[]): Promise<'shouldRequest' | 'unnecessary' | 'unknown'> {
  if (Platform.OS !== 'ios' || !YoroiHealthKitModule?.getRequestStatusFor) return 'unknown';
  try {
    const r: string = await YoroiHealthKitModule.getRequestStatusFor(read, share);
    return r === 'shouldRequest' || r === 'unnecessary' ? r : 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Récupère les anneaux d'activité du jour via HKActivitySummaryQuery (Swift natif).
 * Bypass Nitro qui ne supporte pas HKActivitySummaryQuery.
 */
export async function getTodayActivityRingsNative(): Promise<{
  exerciseMinutes: number | null;
  standHours: number | null;
  activeCalories: number | null;
} | null> {
  if (Platform.OS !== 'ios') return null;

  if (!YoroiHealthKitModule?.getTodayActivityRings) {
    logger.warn('[YoroiHK-JS] getTodayActivityRings non disponible, rebuild requis');
    return null;
  }

  try {
    const json: string = await YoroiHealthKitModule.getTodayActivityRings();
    const parsed = JSON.parse(json);
    return {
      exerciseMinutes: parsed.exerciseMinutes ?? null,
      standHours: parsed.standHours ?? null,
      activeCalories: parsed.activeCalories ?? null,
    };
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR getTodayActivityRings:', e?.message);
    return null;
  }
}

/**
 * Enregistre une quantité d'eau dans Apple Health (HKQuantityTypeIdentifierDietaryWater).
 * @param amountMl - Quantité en millilitres
 */
export async function saveDietaryWaterNative(amountMl: number): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;

  if (!YoroiHealthKitModule?.saveDietaryWater) {
    logger.warn('[YoroiHK-JS] saveDietaryWater non disponible, rebuild requis');
    return false;
  }

  try {
    await YoroiHealthKitModule.saveDietaryWater(amountMl);
    logger.info(`[YoroiHK-JS] saveDietaryWater OK : ${amountMl} ml`);
    return true;
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR saveDietaryWater:', e?.message);
    return false;
  }
}

/**
 * Un verre dans Apple Health avec son id (HKMetadataKeyExternalUUID) : jamais deux fois le meme id.
 * Renvoie null si la methode native manque (binaire sans rebuild) ou hors iOS.
 */
export async function saveDietaryWaterAvecIdNative(amountMl: number, externalId: string, date: Date): Promise<boolean | null> {
  if (Platform.OS !== 'ios' || !YoroiHealthKitModule?.saveDietaryWaterWithId) return null;
  try {
    return (await YoroiHealthKitModule.saveDietaryWaterWithId(amountMl, externalId, date.getTime())) === true;
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR saveDietaryWaterWithId:', e?.message);
    return false;
  }
}

/**
 * Retire un verre ecrit par YOROI dans Apple Health le jour de date.
 * true : retire ; false : rien a retirer ou refuse ; null : methode native absente ou hors iOS.
 */
export async function retirerEauNative(amountMl: number, date: Date): Promise<boolean | null> {
  if (Platform.OS !== 'ios' || !YoroiHealthKitModule?.removeDietaryWater) return null;
  try {
    return (await YoroiHealthKitModule.removeDietaryWater(amountMl, date.getTime())) === true;
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR removeDietaryWater:', e?.message);
    return false;
  }
}

/**
 * Lit la FC repos + FC max réelle depuis HealthKit pour calculer les zones Karvonen.
 * Même méthode qu'Apple Santé : FCmax = max absolu des samples HR sur 180 jours.
 */
export async function getHeartZonesDataNative(): Promise<{
  restingHR: number;
  maxHR: number;
  source: string;
} | null> {
  if (Platform.OS !== 'ios') return null;

  if (!YoroiHealthKitModule?.getHeartZonesData) {
    logger.warn('[YoroiHK-JS] getHeartZonesData non disponible, rebuild requis');
    return null;
  }

  try {
    const json: string = await YoroiHealthKitModule.getHeartZonesData();
    return JSON.parse(json);
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR getHeartZonesData:', e?.message);
    return null;
  }
}

/**
 * Récupère l'effort perçu d'un workout Apple Watch (watchOS 10+ / iOS 17+).
 * Lit HKMetadataKeyWorkoutEffortScore depuis les metadata, puis les samples HealthKit.
 * @param workoutUUID - UUID du workout HealthKit
 * @returns effort 1-10 ou -1 si non disponible
 */
export async function getWorkoutEffortScoreNative(workoutUUID: string): Promise<number> {
  if (Platform.OS !== 'ios') return -1;

  if (!YoroiHealthKitModule?.getWorkoutEffortScore) {
    logger.warn('[YoroiHK-JS] getWorkoutEffortScore non disponible, rebuild requis');
    return -1;
  }

  try {
    const score: number = await YoroiHealthKitModule.getWorkoutEffortScore(workoutUUID);
    return typeof score === 'number' ? score : -1;
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR getWorkoutEffortScore:', e?.message);
    return -1;
  }
}

export interface NativeSleepSample {
  startDate: number;       // timestamp ms
  endDate: number;         // timestamp ms
  value: number;           // HKCategoryValueSleepAnalysis: 0=InBed, 1=Asleep, 2=Awake, 3=Core, 4=Deep, 5=REM
  sourceName: string;
  sourceBundleId: string;
  deviceName: string;
}

/**
 * Récupère les échantillons de sommeil via Swift natif (bypass Nitro v13).
 * Même pattern que getNativeWorkouts, Nitro échoue silencieusement sur iOS 26.
 * @param days - Nombre de jours d'historique (0 = tout l'historique)
 */
export async function getNativeSleepSamples(days: number = 0): Promise<NativeSleepSample[] | null> {
  if (Platform.OS !== 'ios') return null;

  if (!YoroiHealthKitModule?.getSleepSamplesAsJSON) {
    logger.warn('[YoroiHK-JS] getSleepSamplesAsJSON non disponible, rebuild requis');
    return null; // null = module absent, l'appelant peut fallback sur Nitro
  }

  try {
    const jsonString: string = await YoroiHealthKitModule.getSleepSamplesAsJSON(days);
    const parsed = JSON.parse(jsonString) as NativeSleepSample[];
    logger.info('[YoroiHK-JS] Sommeil natif:', parsed.length, 'échantillons');
    return parsed;
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR getSleepSamplesAsJSON:', e?.message);
    return null;
  }
}

export interface NativeStepsDay {
  date: string;   // YYYY-MM-DD
  steps: number;
}

/**
 * Récupère les pas par jour via HKStatisticsCollectionQuery natif (bypass Nitro).
 * Évite le double-comptage iPhone + Watch (même méthode qu'Apple Santé).
 * @param days - Nombre de jours (1 = aujourd'hui seulement)
 */
export async function getNativeSteps(days: number = 1): Promise<NativeStepsDay[] | null> {
  if (Platform.OS !== 'ios') return null;

  if (!YoroiHealthKitModule?.getStepsAsJSON) {
    logger.warn('[YoroiHK-JS] getStepsAsJSON non disponible, rebuild requis');
    return null;
  }

  try {
    const jsonString: string = await YoroiHealthKitModule.getStepsAsJSON(days);
    const parsed = JSON.parse(jsonString) as NativeStepsDay[];
    logger.info('[YoroiHK-JS] Pas natifs:', parsed.length, 'jours');
    return parsed;
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR getStepsAsJSON:', e?.message);
    return null;
  }
}

/**
 * Lance le diagnostic approfondi Swift (3 tests Gemini) :
 * - TEST A : HKSourceQuery, quelles apps ont des workouts ?
 * - TEST B : Requête nucléaire (predicate nil, limit 1), OS bloque-t-il tout ?
 * - TEST C : Requête avec prédicat 365j, bug timestamps ?
 */
export async function runNativeDiagnostic(): Promise<NativeDiagnosticResult | null> {
  if (Platform.OS !== 'ios') return null;

  logger.info('[YoroiHK-JS] runNativeDiagnostic appelé');

  if (!YoroiHealthKitModule?.runDiagnosticAsJSON) {
    logger.warn('[YoroiHK-JS] ERREUR: runDiagnosticAsJSON non disponible');
    return null;
  }

  try {
    const jsonString: string = await YoroiHealthKitModule.runDiagnosticAsJSON();
    logger.info('[YoroiHK-JS] Diagnostic brut:', jsonString);
    const result = JSON.parse(jsonString) as NativeDiagnosticResult;
    return result;
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR runDiagnosticAsJSON:', e?.message);
    return null;
  }
}

// ============================================
// 14 octobre 2026 (zones_apple) : zones et effort tels qu'Apple les calcule
// ============================================

export interface AppleWorkoutExtras {
  found: boolean;
  /** true si l'app tourne sur iOS 27 et a ete compilee avec Xcode 27 */
  ios27: boolean;
  heartRateZones?: { source?: string; zones?: { index: number; min?: number; max?: number; seconds?: number }[] };
  /** 14 octobre 2026 (ios27) : zones de puissance velo d'Apple, en watts (iOS 27) */
  cyclingPowerZones?: { source?: string; zones?: { index: number; min?: number; max?: number; seconds?: number }[] };
  effort?: { user?: number; estimated?: number };
  error?: string;
  /** module natif absent : l'app installee date d'avant cette version */
  missing?: boolean;
}

/** Zones d'Apple (iOS 27) et effort (iOS 18) d'une seance, par son UUID HealthKit. */
export async function getAppleWorkoutExtrasNative(workoutUUID: string): Promise<AppleWorkoutExtras> {
  if (Platform.OS !== 'ios') return { found: false, ios27: false, missing: true };
  if (!YoroiHealthKitModule?.getAppleWorkoutExtrasAsJSON) return { found: false, ios27: false, missing: true };
  try {
    const json: string = await YoroiHealthKitModule.getAppleWorkoutExtrasAsJSON(workoutUUID);
    return { found: false, ios27: false, ...(JSON.parse(json) as Partial<AppleWorkoutExtras>) };
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] getAppleWorkoutExtrasAsJSON:', e?.message);
    return { found: false, ios27: false, error: String(e?.message ?? e) };
  }
}

export interface ApplePreferredZones {
  ios27: boolean;
  source?: string;
  zones?: { index: number; min?: number; max?: number }[];
  empty?: boolean;
  error?: string;
  missing?: boolean;
}

/** Tes zones de Reglages Sante (iOS 27) : manuelles si tu en as saisi, sinon celles du systeme. */
export async function getApplePreferredHeartRateZonesNative(): Promise<ApplePreferredZones> {
  if (Platform.OS !== 'ios') return { ios27: false, missing: true };
  if (!YoroiHealthKitModule?.getApplePreferredHeartRateZonesAsJSON) return { ios27: false, missing: true };
  try {
    const json: string = await YoroiHealthKitModule.getApplePreferredHeartRateZonesAsJSON();
    return { ios27: false, ...(JSON.parse(json) as Partial<ApplePreferredZones>) };
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] getApplePreferredHeartRateZonesAsJSON:', e?.message);
    return { ios27: false, error: String(e?.message ?? e) };
  }
}
