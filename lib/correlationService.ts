import { getTrainings } from './database';
import { getTrainingLoads } from './trainingLoadService';
import { getSleepEntries } from './sleepService';
import { getHydrationHistory, getAverageHydration } from './storage';
import { startOfDay, subDays, differenceInDays } from 'date-fns';
import logger from '@/lib/security/logger';

/**
 * Correlation Analysis Service
 * Analyzes patterns between sleep, hydration, training volume, and performance
 * to generate actionable insights for the user.
 */

export interface Insight {
  id: string;
  type: 'positive' | 'warning' | 'tip';
  category: 'sleep' | 'hydration' | 'training' | 'recovery';
  title: string;
  message: string;
  confidence: number; // 0-100
  dataPoints: number; // How many data points used
}

interface CorrelationData {
  sleepVsTraining: number;
  hydrationVsPerformance: number;
  loadVsRecovery: number;
  consistencyScore: number;
}

/**
 * Calculate correlation coefficient between two arrays
 * Returns value between -1 (negative correlation) and 1 (positive correlation)
 */
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Analyze sleep vs training frequency correlation
 */
async function analyzeSleepTrainingCorrelation(): Promise<{ correlation: number; dataPoints: number }> {
  try {
    const sleepEntries = await getSleepEntries();
    const trainings = await getTrainings(30);

    // Filter to last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentSleep = sleepEntries.filter(s => new Date(s.date) >= thirtyDaysAgo);

    if (recentSleep.length < 7 || trainings.length < 3) {
      return { correlation: 0, dataPoints: 0 };
    }

    // Group trainings by day
    const trainingsByDay: { [date: string]: number } = {};
    trainings.forEach(t => {
      const dateKey = startOfDay(new Date(t.date)).toISOString().split('T')[0];
      trainingsByDay[dateKey] = (trainingsByDay[dateKey] || 0) + 1;
    });

    // Create aligned arrays for correlation
    const sleepDurations: number[] = [];
    const trainingCounts: number[] = [];

    recentSleep.forEach(sleep => {
      const dateKey = new Date(sleep.date).toISOString().split('T')[0];
      const trainingCount = trainingsByDay[dateKey] || 0;

      sleepDurations.push(sleep.duration);
      trainingCounts.push(trainingCount);
    });

    const correlation = calculateCorrelation(sleepDurations, trainingCounts);
    return { correlation, dataPoints: sleepDurations.length };
  } catch (error) {
    logger.error('Error analyzing sleep-training correlation:', error);
    return { correlation: 0, dataPoints: 0 };
  }
}

/**
 * Analyze hydration vs training load correlation
 */
async function analyzeHydrationLoadCorrelation(): Promise<{ correlation: number; dataPoints: number }> {
  try {
    const hydrationHistory = await getHydrationHistory(30);
    const allLoads = await getTrainingLoads();

    // Filter to last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30);
    const loads = allLoads.filter(l => new Date(l.date) >= thirtyDaysAgo);

    if (hydrationHistory.length < 7 || loads.length < 3) {
      return { correlation: 0, dataPoints: 0 };
    }

    // Group loads by day
    const loadsByDay: { [date: string]: number } = {};
    loads.forEach(load => {
      const dateKey = new Date(load.date).toISOString().split('T')[0];
      loadsByDay[dateKey] = (loadsByDay[dateKey] || 0) + load.load;
    });

    // Create aligned arrays
    const hydrationAmounts: number[] = [];
    const trainingLoads: number[] = [];

    hydrationHistory.forEach(hydro => {
      const dateKey = hydro.date;
      const load = loadsByDay[dateKey] || 0;

      if (load > 0) { // Only consider days with training
        hydrationAmounts.push(hydro.totalAmount);
        trainingLoads.push(load);
      }
    });

    if (hydrationAmounts.length < 3) {
      return { correlation: 0, dataPoints: 0 };
    }

    const correlation = calculateCorrelation(hydrationAmounts, trainingLoads);
    return { correlation, dataPoints: hydrationAmounts.length };
  } catch (error) {
    logger.error('Error analyzing hydration-load correlation:', error);
    return { correlation: 0, dataPoints: 0 };
  }
}

/**
 * Analyze training load vs recovery patterns
 */
async function analyzeLoadRecoveryPattern(): Promise<{ avgRecoveryDays: number; dataPoints: number }> {
  try {
    const trainings = await getTrainings(60);

    if (trainings.length < 5) {
      return { avgRecoveryDays: 0, dataPoints: 0 };
    }

    // Sort by date
    const sorted = trainings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate gaps between trainings
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const daysBetween = differenceInDays(new Date(sorted[i].date), new Date(sorted[i - 1].date));
      if (daysBetween > 0) {
        gaps.push(daysBetween);
      }
    }

    if (gaps.length === 0) {
      return { avgRecoveryDays: 0, dataPoints: 0 };
    }

    const avgRecoveryDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return { avgRecoveryDays, dataPoints: gaps.length };
  } catch (error) {
    logger.error('Error analyzing load-recovery pattern:', error);
    return { avgRecoveryDays: 0, dataPoints: 0 };
  }
}

/**
 * Calculate training consistency score (0-100)
 */
async function calculateConsistencyScore(): Promise<{ score: number; dataPoints: number }> {
  try {
    const trainings = await getTrainings(30);

    if (trainings.length < 3) {
      return { score: 0, dataPoints: 0 };
    }

    // Calculate training frequency
    const frequency = trainings.length / 30; // trainings per day

    // Calculate variance in training gaps
    const sorted = trainings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const gaps: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const daysBetween = differenceInDays(new Date(sorted[i].date), new Date(sorted[i - 1].date));
      gaps.push(daysBetween);
    }

    if (gaps.length === 0) {
      return { score: 50, dataPoints: trainings.length };
    }

    // Lower variance = higher consistency
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);

    // Score: high frequency + low variance = high score
    const frequencyScore = Math.min(frequency * 100, 100);
    const varianceScore = Math.max(0, 100 - (stdDev * 20));

    const score = Math.round((frequencyScore * 0.6 + varianceScore * 0.4));

    return { score: Math.min(100, Math.max(0, score)), dataPoints: trainings.length };
  } catch (error) {
    logger.error('Error calculating consistency score:', error);
    return { score: 0, dataPoints: 0 };
  }
}

/**
 * Generate insights based on correlation analysis
 */
export async function generateInsights(): Promise<Insight[]> {
  const insights: Insight[] = [];

  try {
    // Analyze all correlations
    const sleepTraining = await analyzeSleepTrainingCorrelation();
    const hydrationLoad = await analyzeHydrationLoadCorrelation();
    const loadRecovery = await analyzeLoadRecoveryPattern();
    const consistency = await calculateConsistencyScore();

    // Sleep-Training Insights
    if (sleepTraining.dataPoints >= 7) {
      if (sleepTraining.correlation < -0.3) {
        // Negative correlation: less sleep = less training
        insights.push({
          id: 'sleep-training-negative',
          type: 'warning',
          category: 'sleep',
          title: 'Sommeil et Performance',
          message: `Vos données montrent que lorsque vous dormez moins, vous vous entraînez moins (-${Math.abs(Math.round(sleepTraining.correlation * 100))}% de corrélation). Priorisez le sommeil pour maintenir ton rythme.`,
          confidence: Math.min(100, sleepTraining.dataPoints * 3),
          dataPoints: sleepTraining.dataPoints,
        });
      } else if (sleepTraining.correlation > 0.3) {
        // Positive correlation: good sleep supports training
        insights.push({
          id: 'sleep-training-positive',
          type: 'positive',
          category: 'sleep',
          title: 'Sommeil Optimal',
          message: `Excellent ! Vos nuits de qualité soutiennent bien ton entraînement (+${Math.round(sleepTraining.correlation * 100)}% de corrélation). Continuez sur cette lancée.`,
          confidence: Math.min(100, sleepTraining.dataPoints * 3),
          dataPoints: sleepTraining.dataPoints,
        });
      }
    }

    // Hydration-Load Insights
    if (hydrationLoad.dataPoints >= 5) {
      if (hydrationLoad.correlation < 0.3) {
        // Low correlation: not adapting hydration to training load
        insights.push({
          id: 'hydration-load-low',
          type: 'tip',
          category: 'hydration',
          title: 'Hydratation Variable',
          message: `Pensez à augmenter ton hydratation les jours d'entraînement intense. Cible : +0.5L par heure d'effort.`,
          confidence: Math.min(100, hydrationLoad.dataPoints * 5),
          dataPoints: hydrationLoad.dataPoints,
        });
      } else if (hydrationLoad.correlation > 0.5) {
        insights.push({
          id: 'hydration-load-good',
          type: 'positive',
          category: 'hydration',
          title: 'Hydratation Adaptée',
          message: `Vous adaptez bien ton hydratation à ton charge d'entraînement. C'est une excellente habitude !`,
          confidence: Math.min(100, hydrationLoad.dataPoints * 5),
          dataPoints: hydrationLoad.dataPoints,
        });
      }
    }

    // Recovery Pattern Insights
    if (loadRecovery.dataPoints >= 5) {
      if (loadRecovery.avgRecoveryDays < 1) {
        insights.push({
          id: 'recovery-insufficient',
          type: 'warning',
          category: 'recovery',
          title: 'Récupération Limitée',
          message: `Vous vous entraînez presque tous les jours (${loadRecovery.avgRecoveryDays.toFixed(1)}j de repos en moyenne). Intégrez plus de jours de récupération pour éviter le surentraînement.`,
          confidence: Math.min(100, loadRecovery.dataPoints * 4),
          dataPoints: loadRecovery.dataPoints,
        });
      } else if (loadRecovery.avgRecoveryDays >= 1 && loadRecovery.avgRecoveryDays <= 2) {
        insights.push({
          id: 'recovery-optimal',
          type: 'positive',
          category: 'recovery',
          title: 'Récupération Équilibrée',
          message: `Votre rythme de ${loadRecovery.avgRecoveryDays.toFixed(1)}j entre séances est optimal pour la progression et la récupération.`,
          confidence: Math.min(100, loadRecovery.dataPoints * 4),
          dataPoints: loadRecovery.dataPoints,
        });
      } else if (loadRecovery.avgRecoveryDays > 3) {
        insights.push({
          id: 'recovery-excessive',
          type: 'tip',
          category: 'training',
          title: 'Fréquence d\'Entraînement',
          message: `${loadRecovery.avgRecoveryDays.toFixed(1)}j entre séances : vous pourriez augmenter la fréquence pour progresser plus rapidement.`,
          confidence: Math.min(100, loadRecovery.dataPoints * 4),
          dataPoints: loadRecovery.dataPoints,
        });
      }
    }

    // Consistency Insights
    if (consistency.dataPoints >= 5) {
      if (consistency.score >= 75) {
        insights.push({
          id: 'consistency-excellent',
          type: 'positive',
          category: 'training',
          title: 'Discipline Exemplaire',
          message: `Score de régularité : ${consistency.score}/100. Votre constance est la clé de ton progression !`,
          confidence: Math.min(100, consistency.dataPoints * 3),
          dataPoints: consistency.dataPoints,
        });
      } else if (consistency.score >= 50) {
        insights.push({
          id: 'consistency-moderate',
          type: 'tip',
          category: 'training',
          title: 'Régularité à Améliorer',
          message: `Score de régularité : ${consistency.score}/100. Essayez de planifier tes séances à des jours fixes pour créer une routine.`,
          confidence: Math.min(100, consistency.dataPoints * 3),
          dataPoints: consistency.dataPoints,
        });
      } else {
        insights.push({
          id: 'consistency-low',
          type: 'warning',
          category: 'training',
          title: 'Manque de Régularité',
          message: `Score de régularité : ${consistency.score}/100. La constance est plus importante que l'intensité. Fixez-vous 2-3 jours fixes par semaine.`,
          confidence: Math.min(100, consistency.dataPoints * 3),
          dataPoints: consistency.dataPoints,
        });
      }
    }

    // General hydration check
    const avgHydration = await getAverageHydration(7);
    if (avgHydration > 0) {
      if (avgHydration < 2.0) {
        insights.push({
          id: 'hydration-low',
          type: 'warning',
          category: 'hydration',
          title: 'Hydratation Insuffisante',
          message: `Moyenne : ${avgHydration.toFixed(1)}L/jour. Cible : 2.5-3L pour un pratiquant actif. L'eau améliore récupération et performance.`,
          confidence: 90,
          dataPoints: 7,
        });
      } else if (avgHydration >= 2.5 && avgHydration <= 3.5) {
        insights.push({
          id: 'hydration-optimal',
          type: 'positive',
          category: 'hydration',
          title: 'Hydratation Optimale',
          message: `Moyenne : ${avgHydration.toFixed(1)}L/jour. Tu es dans la zone optimale pour un athlète !`,
          confidence: 90,
          dataPoints: 7,
        });
      }
    }

    // Sort by confidence (highest first)
    insights.sort((a, b) => b.confidence - a.confidence);

    // Return top 5 most confident insights
    return insights.slice(0, 5);

  } catch (error) {
    logger.error('Error generating insights:', error);
    return [];
  }
}

/**
 * Get specific insight by category
 */
export async function getInsightsByCategory(category: 'sleep' | 'hydration' | 'training' | 'recovery'): Promise<Insight[]> {
  const allInsights = await generateInsights();
  return allInsights.filter(insight => insight.category === category);
}

/**
 * Get correlation data for advanced analytics
 */
export async function getCorrelationData(): Promise<CorrelationData> {
  const sleepTraining = await analyzeSleepTrainingCorrelation();
  const hydrationLoad = await analyzeHydrationLoadCorrelation();
  const loadRecovery = await analyzeLoadRecoveryPattern();
  const consistency = await calculateConsistencyScore();

  return {
    sleepVsTraining: sleepTraining.correlation,
    hydrationVsPerformance: hydrationLoad.correlation,
    loadVsRecovery: loadRecovery.avgRecoveryDays,
    consistencyScore: consistency.score,
  };
}
