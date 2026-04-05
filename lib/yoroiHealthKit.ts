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
  externalTest?: {             // TEST D — séances hors-Yoroi (Apple Watch, Fitness...)
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
    logger.warn('[YoroiHK-JS] requestWorkoutReadAuth non disponible — rebuild requis');
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
    logger.warn('[YoroiHK-JS] requestAllHealthPermissions non disponible — rebuild requis');
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
    logger.warn('[YoroiHK-JS] getTodayActivityRings non disponible — rebuild requis');
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
    logger.warn('[YoroiHK-JS] saveDietaryWater non disponible — rebuild requis');
    return false;
  }

  try {
    await YoroiHealthKitModule.saveDietaryWater(amountMl);
    logger.info(`[YoroiHK-JS] saveDietaryWater OK — ${amountMl} ml`);
    return true;
  } catch (e: any) {
    logger.warn('[YoroiHK-JS] ERREUR saveDietaryWater:', e?.message);
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
    logger.warn('[YoroiHK-JS] getHeartZonesData non disponible — rebuild requis');
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
    logger.warn('[YoroiHK-JS] getWorkoutEffortScore non disponible — rebuild requis');
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

/**
 * Lance le diagnostic approfondi Swift (3 tests Gemini) :
 * - TEST A : HKSourceQuery — quelles apps ont des workouts ?
 * - TEST B : Requête nucléaire (predicate nil, limit 1) — OS bloque-t-il tout ?
 * - TEST C : Requête avec prédicat 365j — bug timestamps ?
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
