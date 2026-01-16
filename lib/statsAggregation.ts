// ============================================
// STATS AGGREGATION SERVICE
// Fonctions d'agrégation des données par période (7j/30j/90j)
// Calcul de moyennes, tendances, min/max
// ============================================

import { getWeights, Weight, getTrainings, Training, getMeasurements, Measurement } from './database';
import { getWeeklyLoadStats } from './trainingLoadService';
import logger from './security/logger';

export type Period = '7j' | '30j' | '90j' | '6m' | '1a' | 'tout';

export interface AggregatedStats {
  period: Period;
  metric: string;
  values: Array<{ date: string; value: number }>;
  average: number;
  min: number;
  max: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

// ============================================
// HELPERS
// ============================================

const getPeriodDays = (period: Period): number => {
  switch (period) {
    case '7j': return 7;
    case '30j': return 30;
    case '90j': return 90;
    case '6m': return 180;
    case '1a': return 365;
    case 'tout': return 3650; // ~10 ans = toutes les données
    default: return 30;
  }
};

const calculateTrend = (values: number[]): 'up' | 'down' | 'stable' => {
  if (values.length < 2) return 'stable';

  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const avgFirst = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

  const diff = avgSecond - avgFirst;
  const threshold = avgFirst * 0.05; // 5% threshold

  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
};

const calculateChangePercent = (values: number[]): number => {
  if (values.length < 2) return 0;

  const first = values[0];
  const last = values[values.length - 1];

  if (first === 0) return 0;
  return ((last - first) / first) * 100;
};

// ============================================
// POIDS
// ============================================

export const aggregateWeightData = async (period: Period): Promise<AggregatedStats | null> => {
  try {
    const days = getPeriodDays(period);
    const weights = await getWeights();

    if (!weights || weights.length === 0) return null;

    // Filtrer par période
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filtered = weights.filter(w => new Date(w.date) >= cutoffDate);

    if (filtered.length === 0) return null;

    // Trier par date
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const values = filtered.map(w => ({ date: w.date, value: w.weight }));
    const numericValues = filtered.map(w => w.weight);

    return {
      period,
      metric: 'weight',
      values,
      average: numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length,
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      trend: calculateTrend(numericValues),
      changePercent: calculateChangePercent(numericValues),
    };
  } catch (error) {
    logger.error('Error aggregating weight data:', error);
    return null;
  }
};

// ============================================
// COMPOSITION CORPORELLE
// ============================================

export const aggregateCompositionData = async (period: Period): Promise<{
  bodyFat?: AggregatedStats;
  muscle?: AggregatedStats;
  water?: AggregatedStats;
} | null> => {
  try {
    const days = getPeriodDays(period);
    const weights = await getWeights();

    if (!weights || weights.length === 0) return null;

    // Filtrer par période
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filtered = weights.filter(w => new Date(w.date) >= cutoffDate);

    if (filtered.length === 0) return null;

    // Trier par date
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const result: any = {};

    // Masse grasse
    const bodyFatData = filtered.filter(w => w.fat_percent !== undefined && w.fat_percent !== null);
    if (bodyFatData.length > 0) {
      const values = bodyFatData.map(w => ({ date: w.date, value: w.fat_percent! }));
      const numericValues = bodyFatData.map(w => w.fat_percent!);

      result.bodyFat = {
        period,
        metric: 'bodyFat',
        values,
        average: numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        trend: calculateTrend(numericValues),
        changePercent: calculateChangePercent(numericValues),
      };
    }

    // Masse musculaire
    const muscleData = filtered.filter(w => w.muscle_percent !== undefined && w.muscle_percent !== null);
    if (muscleData.length > 0) {
      const values = muscleData.map(w => ({ date: w.date, value: w.muscle_percent! }));
      const numericValues = muscleData.map(w => w.muscle_percent!);

      result.muscle = {
        period,
        metric: 'muscle',
        values,
        average: numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        trend: calculateTrend(numericValues),
        changePercent: calculateChangePercent(numericValues),
      };
    }

    // Hydratation
    const waterData = filtered.filter(w => w.water_percent !== undefined && w.water_percent !== null);
    if (waterData.length > 0) {
      const values = waterData.map(w => ({ date: w.date, value: w.water_percent! }));
      const numericValues = waterData.map(w => w.water_percent!);

      result.water = {
        period,
        metric: 'water',
        values,
        average: numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        trend: calculateTrend(numericValues),
        changePercent: calculateChangePercent(numericValues),
      };
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (error) {
    logger.error('Error aggregating composition data:', error);
    return null;
  }
};

// ============================================
// ENTRAÎNEMENT
// ============================================

export const aggregateTrainingData = async (period: Period): Promise<{
  count: number;
  totalDuration: number;
  averageIntensity: number;
  weeklyLoad?: number;
} | null> => {
  try {
    const days = getPeriodDays(period);
    const trainings = await getTrainings(days);

    if (!trainings || trainings.length === 0) return null;

    const totalDuration = trainings.reduce((sum, t) => sum + (t.duration || 0), 0);
    const intensities = trainings.filter(t => t.intensity).map(t => t.intensity!);
    const averageIntensity = intensities.length > 0
      ? intensities.reduce((sum, i) => sum + i, 0) / intensities.length
      : 0;

    // Charge hebdomadaire (si période >= 7j)
    let weeklyLoad;
    if (days >= 7) {
      const loadStats = await getWeeklyLoadStats();
      weeklyLoad = loadStats?.totalLoad;
    }

    return {
      count: trainings.length,
      totalDuration,
      averageIntensity,
      weeklyLoad,
    };
  } catch (error) {
    logger.error('Error aggregating training data:', error);
    return null;
  }
};

// ============================================
// MENSURATIONS
// ============================================

export const aggregateMeasurementData = async (period: Period, field: string): Promise<AggregatedStats | null> => {
  try {
    const days = getPeriodDays(period);
    const measurements = await getMeasurements();

    if (!measurements || measurements.length === 0) return null;

    // Filtrer par période
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filtered = measurements.filter(m => new Date(m.date) >= cutoffDate);

    if (filtered.length === 0) return null;

    // Filtrer les mesures qui ont la valeur du champ demandé
    const withValue = filtered.filter(m => {
      const value = (m as any)[field];
      return value !== undefined && value !== null && value > 0;
    });

    if (withValue.length === 0) return null;

    // Trier par date
    withValue.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const values = withValue.map(m => ({ date: m.date, value: (m as any)[field] }));
    const numericValues = withValue.map(m => (m as any)[field]);

    return {
      period,
      metric: field,
      values,
      average: numericValues.reduce((sum, v) => sum + v, 0) / numericValues.length,
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      trend: calculateTrend(numericValues),
      changePercent: calculateChangePercent(numericValues),
    };
  } catch (error) {
    logger.error(`Error aggregating measurement data for ${field}:`, error);
    return null;
  }
};

// ============================================
// CORRÉLATIONS
// ============================================

export const calculateCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;

  return numerator / denominator;
};
