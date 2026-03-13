// ============================================
// YOROI - YoroiHealthKit Native Module
// ============================================
// Contournement du bridge Nitro v13 + iOS 26 beta.
// Le module Swift retourne une String JSON pure.
// console.log utilisé (pas logger) pour visibilité en Release.
// ============================================

import { NativeModules, Platform } from 'react-native';

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

  console.log('[YoroiHK-JS] getNativeWorkouts, days=' + days);
  console.log('[YoroiHK-JS] Module dispo:', !!YoroiHealthKitModule);

  if (!YoroiHealthKitModule?.getWorkoutsAsJSON) {
    console.log('[YoroiHK-JS] ERREUR: module natif non trouvé');
    console.log('[YoroiHK-JS] Modules Yoroi dispo:', Object.keys(NativeModules).filter(k => k.toLowerCase().includes('yoroi')));
    return [];
  }

  try {
    const jsonString: string = await YoroiHealthKitModule.getWorkoutsAsJSON(days);
    console.log('[YoroiHK-JS] Retour Swift (200 chars):', jsonString.substring(0, 200));
    const parsed = JSON.parse(jsonString) as NativeWorkout[];
    console.log('[YoroiHK-JS] Workouts parsés:', parsed.length);
    return parsed;
  } catch (e: any) {
    console.log('[YoroiHK-JS] ERREUR getWorkoutsAsJSON:', e?.message);
    return [];
  }
}

/**
 * Re-demande la permission de LECTURE des workouts via Swift natif (bypass Nitro v13).
 * Retourne un string "count:N|sources:X,Y|authStatus:Z" ou "error:<msg>"
 */
export async function requestWorkoutReadAuthNative(): Promise<string> {
  if (Platform.OS !== 'ios') return 'error:not iOS';

  console.log('[YoroiHK-JS] requestWorkoutReadAuthNative appelé');

  if (!YoroiHealthKitModule?.requestWorkoutReadAuth) {
    console.log('[YoroiHK-JS] requestWorkoutReadAuth non disponible — rebuild requis');
    return 'error:module absent';
  }

  try {
    const result: string = await YoroiHealthKitModule.requestWorkoutReadAuth();
    console.log('[YoroiHK-JS] requestWorkoutReadAuth résultat:', result);
    return result;
  } catch (e: any) {
    console.log('[YoroiHK-JS] ERREUR requestWorkoutReadAuth:', e?.message);
    return `error:${e?.message}`;
  }
}

/**
 * Demande TOUTES les permissions HealthKit via Swift natif (bypass Nitro v13).
 * Retourne "ok:N" ou "error:<msg>"
 */
export async function requestAllHealthPermissionsNative(): Promise<string> {
  if (Platform.OS !== 'ios') return 'error:not iOS';

  console.log('[YoroiHK-JS] requestAllHealthPermissionsNative appelé');

  if (!YoroiHealthKitModule?.requestAllHealthPermissions) {
    console.log('[YoroiHK-JS] requestAllHealthPermissions non disponible — rebuild requis');
    return 'error:module absent';
  }

  try {
    const result: string = await YoroiHealthKitModule.requestAllHealthPermissions();
    console.log('[YoroiHK-JS] requestAllHealthPermissions résultat:', result);
    return result;
  } catch (e: any) {
    console.log('[YoroiHK-JS] ERREUR requestAllHealthPermissions:', e?.message);
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
    console.log('[YoroiHK-JS] getTodayActivityRings non disponible — rebuild requis');
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
    console.log('[YoroiHK-JS] ERREUR getTodayActivityRings:', e?.message);
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
    console.log('[YoroiHK-JS] saveDietaryWater non disponible — rebuild requis');
    return false;
  }

  try {
    await YoroiHealthKitModule.saveDietaryWater(amountMl);
    console.log(`[YoroiHK-JS] saveDietaryWater OK — ${amountMl} ml`);
    return true;
  } catch (e: any) {
    console.log('[YoroiHK-JS] ERREUR saveDietaryWater:', e?.message);
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
    console.log('[YoroiHK-JS] getHeartZonesData non disponible — rebuild requis');
    return null;
  }

  try {
    const json: string = await YoroiHealthKitModule.getHeartZonesData();
    return JSON.parse(json);
  } catch (e: any) {
    console.log('[YoroiHK-JS] ERREUR getHeartZonesData:', e?.message);
    return null;
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

  console.log('[YoroiHK-JS] runNativeDiagnostic appelé');

  if (!YoroiHealthKitModule?.runDiagnosticAsJSON) {
    console.log('[YoroiHK-JS] ERREUR: runDiagnosticAsJSON non disponible');
    return null;
  }

  try {
    const jsonString: string = await YoroiHealthKitModule.runDiagnosticAsJSON();
    console.log('[YoroiHK-JS] Diagnostic brut:', jsonString);
    const result = JSON.parse(jsonString) as NativeDiagnosticResult;
    return result;
  } catch (e: any) {
    console.log('[YoroiHK-JS] ERREUR runDiagnosticAsJSON:', e?.message);
    return null;
  }
}
