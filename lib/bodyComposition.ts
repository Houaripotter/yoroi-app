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
import { format } from 'date-fns';
import logger from '@/lib/security/logger';

const BODY_COMP_KEY = '@yoroi_body_composition';
const MEASUREMENTS_KEY = '@yoroi_measurements';

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
  chest?: number;        // Poitrine cm
  waist?: number;        // Tour de taille cm
  hips?: number;         // Hanches cm
  // Bras
  rightArm?: number;     // Bras droit cm
  leftArm?: number;      // Bras gauche cm
  // Cuisses
  rightThigh?: number;   // Cuisse droite cm
  leftThigh?: number;    // Cuisse gauche cm
  // Mollets
  rightCalf?: number;    // Mollet droit cm
  leftCalf?: number;     // Mollet gauche cm
  // Autres
  neck?: number;         // Cou cm
  shoulders?: number;    // Épaules cm
}

// ============================================
// BODY COMPOSITION FUNCTIONS
// ============================================

export const getAllBodyCompositions = async (): Promise<BodyComposition[]> => {
  try {
    const stored = await AsyncStorage.getItem(BODY_COMP_KEY);
    if (!stored) return [];
    const data = JSON.parse(stored);
    return data.sort((a: BodyComposition, b: BodyComposition) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    logger.error('Error getting body compositions:', error);
    return [];
  }
};

export const getLatestBodyComposition = async (): Promise<BodyComposition | null> => {
  const all = await getAllBodyCompositions();
  return all.length > 0 ? all[0] : null;
};

export const addBodyComposition = async (data: Omit<BodyComposition, 'id'>): Promise<BodyComposition> => {
  try {
    const all = await getAllBodyCompositions();
    const newEntry: BodyComposition = {
      ...data,
      id: `bc_${Date.now()}`,
    };
    all.unshift(newEntry);
    await AsyncStorage.setItem(BODY_COMP_KEY, JSON.stringify(all));
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
      await AsyncStorage.setItem(BODY_COMP_KEY, JSON.stringify(all));
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
    await AsyncStorage.setItem(BODY_COMP_KEY, JSON.stringify(filtered));
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
    const stored = await AsyncStorage.getItem(MEASUREMENTS_KEY);
    if (!stored) return [];
    const data = JSON.parse(stored);
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
    await AsyncStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(all));
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
      await AsyncStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(all));
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
    await AsyncStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(filtered));
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
