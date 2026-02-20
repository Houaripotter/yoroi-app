// ============================================
// BODY COMPOSITION - ANALYSE COMPLÈTE
// ============================================
// Composition corporelle complète:
// - Masse grasse (%)
// - Masse musculaire (kg)
// - Masse osseuse (kg)
// - Eau corporelle (%)
// - Graisse viscérale (1-59)
// - Âge métabolique
// - Métabolisme de base (kcal)
// - Analyse segmentaire (bras, jambes, tronc)
// Compatible avec: Withings, Xiaomi, Omron, etc.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
import secureStorage from '@/lib/security/secureStorage';
import { healthConnect } from '@/lib/healthConnect';

const BODY_COMP_KEY = '@yoroi_body_composition';
const MEASUREMENTS_KEY = '@yoroi_measurements';

// Migration flags
let bodyCompMigrationDone = false;
let measurementsMigrationDone = false;

/**
 * Migre les données de composition corporelle de AsyncStorage vers SecureStorage
 */
const migrateBodyCompFromAsyncStorage = async (): Promise<void> => {
  if (bodyCompMigrationDone) return;

  try {
    // Vérifier si des données existent déjà dans SecureStorage
    const secureData = await secureStorage.getItem(BODY_COMP_KEY);
    if (secureData && Array.isArray(secureData) && secureData.length > 0) {
      bodyCompMigrationDone = true;
      return;
    }

    // Essayer de récupérer les anciennes données depuis AsyncStorage
    const oldData = await AsyncStorage.getItem(BODY_COMP_KEY);
    if (oldData) {
      const parsed = JSON.parse(oldData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migrer vers SecureStorage
        await secureStorage.setItem(BODY_COMP_KEY, parsed);
        // Supprimer les anciennes données
        await AsyncStorage.removeItem(BODY_COMP_KEY);
        logger.info('[BodyComposition] Migration vers SecureStorage réussie');
      }
    }
  } catch (error) {
    logger.error('[BodyComposition] Erreur migration:', error);
  }

  bodyCompMigrationDone = true;
};

/**
 * Migre les mensurations de AsyncStorage vers SecureStorage
 */
const migrateMeasurementsFromAsyncStorage = async (): Promise<void> => {
  if (measurementsMigrationDone) return;

  try {
    // Vérifier si des données existent déjà dans SecureStorage
    const secureData = await secureStorage.getItem(MEASUREMENTS_KEY);
    if (secureData && Array.isArray(secureData) && secureData.length > 0) {
      measurementsMigrationDone = true;
      return;
    }

    // Essayer de récupérer les anciennes données depuis AsyncStorage
    const oldData = await AsyncStorage.getItem(MEASUREMENTS_KEY);
    if (oldData) {
      const parsed = JSON.parse(oldData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migrer vers SecureStorage
        await secureStorage.setItem(MEASUREMENTS_KEY, parsed);
        // Supprimer les anciennes données
        await AsyncStorage.removeItem(MEASUREMENTS_KEY);
        logger.info('[BodyComposition] Migration mensurations vers SecureStorage réussie');
      }
    }
  } catch (error) {
    logger.error('[BodyComposition] Erreur migration mensurations:', error);
  }

  measurementsMigrationDone = true;
};

// ============================================
// TYPES
// ============================================

export interface BodyComposition {
  id: string;
  date: string;
  weight: number;
  bodyFatPercent: number;        // Masse grasse %
  muscleMass: number;            // Masse musculaire kg
  boneMass: number;              // Masse osseuse kg
  waterPercent: number;          // Eau corporelle %
  visceralFat: number;           // Graisse viscérale (1-59)
  metabolicAge?: number;         // Âge métabolique
  bmr?: number;                  // Métabolisme de base kcal
  source?: string;               // Source normalisée (withings, garmin, manual, etc.)
  // Analyse segmentaire (optionnel)
  segments?: {
    rightArm?: { fatPercent: number; muscleRating: number };
    leftArm?: { fatPercent: number; muscleRating: number };
    rightLeg?: { fatPercent: number; muscleRating: number };
    leftLeg?: { fatPercent: number; muscleRating: number };
    trunk?: { fatPercent: number; muscleRating: number };
  };
}

export interface BodyMeasurement {
  id: string;
  date: string;
  // Mensurations principales
  chest?: number;        // Tour de poitrine cm
  waist?: number;        // Tour de taille cm
  navel?: number;        // Tour de nombril cm
  hips?: number;         // Tour de hanches cm
  // Bras
  rightArm?: number;     // Tour de bras droit cm
  leftArm?: number;      // Tour de bras gauche cm
  // Cuisses
  rightThigh?: number;   // Tour de cuisse droite cm
  leftThigh?: number;    // Tour de cuisse gauche cm
  // Mollets
  rightCalf?: number;    // Tour de mollet droit cm
  leftCalf?: number;     // Tour de mollet gauche cm
  // Autres
  neck?: number;         // Tour de cou cm
  shoulders?: number;    // Tour d'épaules cm
}

// ============================================
// BODY COMPOSITION FUNCTIONS
// ============================================

export const getAllBodyCompositions = async (): Promise<BodyComposition[]> => {
  try {
    // Assurer la migration au premier accès
    await migrateBodyCompFromAsyncStorage();

    const data = await secureStorage.getItem(BODY_COMP_KEY);
    if (!data || !Array.isArray(data)) return [];
    return data.sort((a: BodyComposition, b: BodyComposition) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    logger.error('Error getting body compositions:', error);
    return [];
  }
};

// ✅ FIX: Lire aussi depuis Apple Health et fusionner les données
export const getLatestBodyComposition = async (): Promise<BodyComposition | null> => {
  try {
    // 1. Récupérer les données locales (SecureStorage)
    const all = await getAllBodyCompositions();
    const localData = all.length > 0 ? all[0] : null;

    // 2. ✅ NOUVEAU: Récupérer les données Apple Health
    let healthKitData: { bodyFatPercentage?: number; leanBodyMass?: number; date?: string; source?: string } | null = null;
    try {
      healthKitData = await healthConnect.getBodyComposition();
      if (healthKitData) {
        logger.info('[BodyComposition] Apple Health data:', healthKitData);
      }
    } catch (healthKitError) {
      logger.info('[BodyComposition] Apple Health non disponible');
    }

    // 3. Si pas de données locales mais données HealthKit, créer une entrée
    if (!localData && healthKitData) {
      return {
        id: `hk_${Date.now()}`,
        date: healthKitData.date || new Date().toISOString(),
        weight: 0, // Non disponible depuis HealthKit directement ici
        bodyFatPercent: healthKitData.bodyFatPercentage || 0,
        muscleMass: healthKitData.leanBodyMass || 0,
        boneMass: 0,
        waterPercent: 0,
        visceralFat: 0,
        source: healthKitData.source || 'apple_health',
      };
    }

    // 4. Si données locales ET HealthKit, fusionner (HealthKit prioritaire si plus récent)
    if (localData && healthKitData) {
      const localDate = new Date(localData.date).getTime();
      const healthKitDate = healthKitData.date ? new Date(healthKitData.date).getTime() : 0;

      // HealthKit est plus récent ? Utiliser ses valeurs
      if (healthKitDate > localDate) {
        logger.info('[BodyComposition] Utilisation données Apple Health (plus récentes)');
        return {
          ...localData,
          bodyFatPercent: healthKitData.bodyFatPercentage ?? localData.bodyFatPercent,
          muscleMass: healthKitData.leanBodyMass ?? localData.muscleMass,
          date: healthKitData.date || localData.date,
          source: healthKitData.source || 'apple_health',
        };
      }

      // Sinon, enrichir les données locales avec HealthKit si valeurs manquantes
      return {
        ...localData,
        bodyFatPercent: localData.bodyFatPercent || healthKitData.bodyFatPercentage || 0,
        muscleMass: localData.muscleMass || healthKitData.leanBodyMass || 0,
      };
    }

    return localData;
  } catch (error) {
    logger.error('[BodyComposition] Erreur:', error);
    const all = await getAllBodyCompositions();
    return all.length > 0 ? all[0] : null;
  }
};

// ✅ FIX: Écrire aussi dans Apple Health
export const addBodyComposition = async (data: Omit<BodyComposition, 'id'>): Promise<BodyComposition> => {
  try {
    const all = await getAllBodyCompositions();
    const newEntry: BodyComposition = {
      ...data,
      id: `bc_${Date.now()}`,
    };
    all.unshift(newEntry);
    await secureStorage.setItem(BODY_COMP_KEY, all);

    // ✅ NOUVEAU: Écrire dans Apple Health
    if (data.bodyFatPercent && data.bodyFatPercent > 0) {
      try {
        await healthConnect.writeBodyFat(data.bodyFatPercent);
        logger.info(`[BodyComposition] Body fat ${data.bodyFatPercent}% écrit dans Apple Health`);
      } catch (healthKitError) {
        logger.info('[BodyComposition] Écriture Apple Health échouée (permissions?)');
      }
    }

    return newEntry;
  } catch (error) {
    logger.error('Error adding body composition:', error);
    throw error;
  }
};

export const updateBodyComposition = async (id: string, data: Partial<BodyComposition>): Promise<void> => {
  try {
    const all = await getAllBodyCompositions();
    const index = all.findIndex(item => item.id === id);
    if (index !== -1) {
      all[index] = { ...all[index], ...data };
      await secureStorage.setItem(BODY_COMP_KEY, all);
    }
  } catch (error) {
    logger.error('Error updating body composition:', error);
    throw error;
  }
};

export const deleteBodyComposition = async (id: string): Promise<void> => {
  try {
    const all = await getAllBodyCompositions();
    const filtered = all.filter(item => item.id !== id);
    await secureStorage.setItem(BODY_COMP_KEY, filtered);
  } catch (error) {
    logger.error('Error deleting body composition:', error);
    throw error;
  }
};

// ============================================
// BODY MEASUREMENTS FUNCTIONS
// ============================================

export const getAllMeasurements = async (): Promise<BodyMeasurement[]> => {
  try {
    // Assurer la migration au premier accès
    await migrateMeasurementsFromAsyncStorage();

    const data = await secureStorage.getItem(MEASUREMENTS_KEY);
    if (!data || !Array.isArray(data)) return [];
    return data.sort((a: BodyMeasurement, b: BodyMeasurement) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    logger.error('Error getting measurements:', error);
    return [];
  }
};

export const getLatestMeasurement = async (): Promise<BodyMeasurement | null> => {
  const all = await getAllMeasurements();
  return all.length > 0 ? all[0] : null;
};

export const addMeasurement = async (data: Omit<BodyMeasurement, 'id'>): Promise<BodyMeasurement> => {
  try {
    const all = await getAllMeasurements();
    const newEntry: BodyMeasurement = {
      ...data,
      id: `m_${Date.now()}`,
    };
    all.unshift(newEntry);
    await secureStorage.setItem(MEASUREMENTS_KEY, all);
    return newEntry;
  } catch (error) {
    logger.error('Error adding measurement:', error);
    throw error;
  }
};

export const updateMeasurement = async (id: string, data: Partial<BodyMeasurement>): Promise<void> => {
  try {
    const all = await getAllMeasurements();
    const index = all.findIndex(item => item.id === id);
    if (index !== -1) {
      all[index] = { ...all[index], ...data };
      await secureStorage.setItem(MEASUREMENTS_KEY, all);
    }
  } catch (error) {
    logger.error('Error updating measurement:', error);
    throw error;
  }
};

export const deleteMeasurement = async (id: string): Promise<void> => {
  try {
    const all = await getAllMeasurements();
    const filtered = all.filter(item => item.id !== id);
    await secureStorage.setItem(MEASUREMENTS_KEY, filtered);
  } catch (error) {
    logger.error('Error deleting measurement:', error);
    throw error;
  }
};

// ============================================
// ANALYSIS & HELPERS
// ============================================

export interface BodyCompositionAnalysis {
  bodyFatStatus: 'low' | 'healthy' | 'high' | 'very_high';
  muscleMassStatus: 'low' | 'normal' | 'high';
  waterStatus: 'low' | 'normal' | 'high';
  visceralFatStatus: 'healthy' | 'caution' | 'high';
  overallScore: number; // 0-100
}

export const analyzeBodyComposition = (
  data: BodyComposition,
  gender: 'male' | 'female' = 'male',
  age: number = 30
): BodyCompositionAnalysis => {
  // Body fat ranges
  const bodyFatRanges = gender === 'male'
    ? { low: 6, healthy: 24, high: 30 }
    : { low: 14, healthy: 31, high: 37 };

  let bodyFatStatus: BodyCompositionAnalysis['bodyFatStatus'] = 'healthy';
  if (data.bodyFatPercent < bodyFatRanges.low) bodyFatStatus = 'low';
  else if (data.bodyFatPercent <= bodyFatRanges.healthy) bodyFatStatus = 'healthy';
  else if (data.bodyFatPercent <= bodyFatRanges.high) bodyFatStatus = 'high';
  else bodyFatStatus = 'very_high';

  // Muscle mass (rough estimate based on weight)
  const muscleRatio = data.muscleMass / data.weight;
  let muscleMassStatus: BodyCompositionAnalysis['muscleMassStatus'] = 'normal';
  if (muscleRatio < 0.35) muscleMassStatus = 'low';
  else if (muscleRatio > 0.45) muscleMassStatus = 'high';

  // Water percentage (healthy: 50-65% for women, 55-65% for men)
  const waterRanges = gender === 'male' ? { low: 55, high: 65 } : { low: 50, high: 65 };
  let waterStatus: BodyCompositionAnalysis['waterStatus'] = 'normal';
  if (data.waterPercent < waterRanges.low) waterStatus = 'low';
  else if (data.waterPercent > waterRanges.high) waterStatus = 'high';

  // Visceral fat (1-12: healthy, 13-59: excess)
  let visceralFatStatus: BodyCompositionAnalysis['visceralFatStatus'] = 'healthy';
  if (data.visceralFat >= 13 && data.visceralFat <= 20) visceralFatStatus = 'caution';
  else if (data.visceralFat > 20) visceralFatStatus = 'high';

  // Calculate overall score
  let score = 100;

  // Body fat impact (-30 max)
  if (bodyFatStatus === 'high') score -= 15;
  else if (bodyFatStatus === 'very_high') score -= 30;
  else if (bodyFatStatus === 'low') score -= 10;

  // Muscle mass impact (-20 max)
  if (muscleMassStatus === 'low') score -= 20;
  else if (muscleMassStatus === 'high') score += 5;

  // Water impact (-15 max)
  if (waterStatus === 'low') score -= 15;

  // Visceral fat impact (-25 max)
  if (visceralFatStatus === 'caution') score -= 10;
  else if (visceralFatStatus === 'high') score -= 25;

  return {
    bodyFatStatus,
    muscleMassStatus,
    waterStatus,
    visceralFatStatus,
    overallScore: Math.max(0, Math.min(100, score)),
  };
};

// Calculate changes between two compositions
export const calculateChanges = (
  current: BodyComposition,
  previous: BodyComposition
): Record<string, number> => {
  return {
    weight: current.weight - previous.weight,
    bodyFatPercent: current.bodyFatPercent - previous.bodyFatPercent,
    muscleMass: current.muscleMass - previous.muscleMass,
    boneMass: current.boneMass - previous.boneMass,
    waterPercent: current.waterPercent - previous.waterPercent,
    visceralFat: current.visceralFat - previous.visceralFat,
    metabolicAge: (current.metabolicAge || 0) - (previous.metabolicAge || 0),
    bmr: (current.bmr || 0) - (previous.bmr || 0),
  };
};

// Estimate body fat percentage from measurements (Navy method)
export const estimateBodyFatFromMeasurements = (
  measurement: BodyMeasurement,
  height: number,
  gender: 'male' | 'female'
): number | null => {
  if (!measurement.waist || !measurement.neck) return null;

  if (gender === 'male') {
    // Male formula: 495 / (1.0324 - 0.19077 * log10(waist - neck) + 0.15456 * log10(height)) - 450
    const logDiff = Math.log10(measurement.waist - measurement.neck);
    const logHeight = Math.log10(height);
    const bodyFat = 495 / (1.0324 - 0.19077 * logDiff + 0.15456 * logHeight) - 450;
    return Math.max(0, Math.min(60, bodyFat));
  } else {
    // Female formula requires hips
    if (!measurement.hips) return null;
    const logSum = Math.log10(measurement.waist + measurement.hips - measurement.neck);
    const logHeight = Math.log10(height);
    const bodyFat = 495 / (1.29579 - 0.35004 * logSum + 0.22100 * logHeight) - 450;
    return Math.max(0, Math.min(60, bodyFat));
  }
};

// Calculate BMR using Mifflin-St Jeor equation
export const calculateBMR = (
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female'
): number => {
  if (gender === 'male') {
    return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  } else {
    return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }
};

// Get chart data for a specific metric
export const getChartData = async (
  metric: keyof BodyComposition,
  days: number = 30
): Promise<{ date: string; value: number }[]> => {
  const all = await getAllBodyCompositions();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return all
    .filter(item => new Date(item.date) >= cutoffDate)
    .map(item => ({
      date: item.date,
      value: item[metric] as number,
    }))
    .reverse();
};

// Get measurement chart data
export const getMeasurementChartData = async (
  metric: keyof BodyMeasurement,
  days: number = 30
): Promise<{ date: string; value: number }[]> => {
  const all = await getAllMeasurements();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return all
    .filter(item => new Date(item.date) >= cutoffDate && item[metric] !== undefined)
    .map(item => ({
      date: item.date,
      value: item[metric] as number,
    }))
    .reverse();
};
