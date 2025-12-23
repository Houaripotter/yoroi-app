// ============================================
// YOROI - PREDICTION DE POIDS
// ============================================
// Calculs mathematiques simples - AUCUNE IA
// Basé sur la tendance des 30 derniers jours
// 100% Offline
// ============================================

import { getAllMeasurements, getUserSettings, Measurement } from './storage';

// ============================================
// TYPES
// ============================================

export interface PredictionPoint {
  date: string;
  weight: number;
  isPrediction: boolean;
}

export interface ScenarioResult {
  label: string;
  weeklyLoss: number;
  weeksNeeded: number;
  predictedDate: Date;
  dateLabel: string;
}

export interface PredictionResult {
  // Donnees actuelles
  currentWeight: number;
  targetWeight: number;
  startWeight: number;
  remaining: number;
  alreadyLost: number;
  progressPercent: number;

  // Calculs de tendance
  weeklyLoss: number; // kg par semaine (positif = perte)
  dailyLoss: number;
  isLosingWeight: boolean;
  isGainingWeight: boolean;
  isStable: boolean;

  // Predictions
  weeksNeeded: number;
  predictedDate: Date | null;
  dateLabel: string;

  // Predictions intermediaires
  in1Week: number;
  in1Month: number;
  in3Months: number;
  in6Months: number;

  // Scenarios
  scenarios: ScenarioResult[];

  // Courbe de prediction
  historicalData: PredictionPoint[];
  predictionCurve: PredictionPoint[];

  // Avertissements
  warnings: string[];
  tips: string[];

  // Confiance
  confidence: 'low' | 'medium' | 'high';
  dataPoints: number;
}

// ============================================
// HELPERS
// ============================================

const formatDateLabel = (date: Date): string => {
  const months = [
    'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const addWeeks = (date: Date, weeks: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + Math.round(weeks * 7));
  return result;
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const daysBetween = (date1: Date, date2: Date): number => {
  const diff = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const formatWeeksToReadable = (weeks: number): string => {
  if (weeks < 0) return 'Objectif depasse !';
  if (weeks < 1) return 'Moins d\'une semaine';
  if (weeks < 4) return `~${Math.round(weeks)} semaine${weeks >= 2 ? 's' : ''}`;

  const months = weeks / 4.33;
  if (months < 12) return `~${Math.round(months)} mois`;

  const years = months / 12;
  return `~${years.toFixed(1)} an${years >= 2 ? 's' : ''}`;
};

// ============================================
// CALCUL DE REGRESSION LINEAIRE
// ============================================

interface RegressionResult {
  slope: number; // Pente (kg par jour)
  intercept: number;
  r2: number; // Coefficient de determination
}

const linearRegression = (data: { x: number; y: number }[]): RegressionResult => {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const point of data) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumX2 += point.x * point.x;
    sumY2 += point.y * point.y;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculer R²
  const yMean = sumY / n;
  let ssRes = 0;
  let ssTot = 0;

  for (const point of data) {
    const yPred = slope * point.x + intercept;
    ssRes += (point.y - yPred) ** 2;
    ssTot += (point.y - yMean) ** 2;
  }

  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, r2 };
};

// ============================================
// FONCTION PRINCIPALE DE PREDICTION
// ============================================

export const calculatePrediction = async (): Promise<PredictionResult | null> => {
  try {
    // Recuperer les donnees
    const [measurements, settings] = await Promise.all([
      getAllMeasurements(),
      getUserSettings(),
    ]);

    if (measurements.length < 3) {
      return null; // Pas assez de donnees
    }

    const targetWeight = settings.weight_goal || settings.targetWeight;
    if (!targetWeight) {
      return null; // Pas d'objectif defini
    }

    // Trier par date croissante
    const sorted = [...measurements].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const currentWeight = sorted[sorted.length - 1].weight;
    const startWeight = sorted[0].weight;
    const remaining = currentWeight - targetWeight;
    const alreadyLost = startWeight - currentWeight;
    const progressPercent = alreadyLost > 0 && (startWeight - targetWeight) > 0
      ? (alreadyLost / (startWeight - targetWeight)) * 100
      : 0;

    // Filtrer les 30 derniers jours pour la tendance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMeasurements = sorted.filter(
      m => new Date(m.date) >= thirtyDaysAgo
    );

    // Utiliser au moins les 7 dernieres pesees si pas assez dans les 30 jours
    const dataForRegression = recentMeasurements.length >= 5
      ? recentMeasurements
      : sorted.slice(-Math.min(10, sorted.length));

    // Preparer les donnees pour la regression
    const firstDate = new Date(dataForRegression[0].date);
    const regressionData = dataForRegression.map(m => ({
      x: daysBetween(firstDate, new Date(m.date)),
      y: m.weight,
    }));

    // Calculer la regression lineaire
    const regression = linearRegression(regressionData);

    // Pente negative = perte de poids
    const dailyLoss = -regression.slope; // Inverser pour que positif = perte
    const weeklyLoss = dailyLoss * 7;

    const isLosingWeight = weeklyLoss > 0.1;
    const isGainingWeight = weeklyLoss < -0.1;
    const isStable = !isLosingWeight && !isGainingWeight;

    // Calculer la date prevue
    let weeksNeeded = 0;
    let predictedDate: Date | null = null;
    let dateLabel = '';

    if (isLosingWeight && remaining > 0) {
      weeksNeeded = remaining / weeklyLoss;
      predictedDate = addWeeks(new Date(), weeksNeeded);
      dateLabel = formatDateLabel(predictedDate);
    } else if (remaining <= 0) {
      dateLabel = 'Objectif atteint !';
    } else if (isGainingWeight) {
      dateLabel = 'Tendance a inverser';
    } else {
      dateLabel = 'Progression stable';
    }

    // Predictions intermediaires
    const in1Week = currentWeight - (weeklyLoss * 1);
    const in1Month = currentWeight - (weeklyLoss * 4.33);
    const in3Months = currentWeight - (weeklyLoss * 13);
    const in6Months = currentWeight - (weeklyLoss * 26);

    // Generer les scenarios
    const scenarios: ScenarioResult[] = [];

    if (remaining > 0) {
      // Scenario optimiste (+50% perte)
      const optimisticLoss = Math.max(weeklyLoss * 1.5, 0.5);
      const optimisticWeeks = remaining / optimisticLoss;
      scenarios.push({
        label: 'Optimiste',
        weeklyLoss: optimisticLoss,
        weeksNeeded: optimisticWeeks,
        predictedDate: addWeeks(new Date(), optimisticWeeks),
        dateLabel: formatDateLabel(addWeeks(new Date(), optimisticWeeks)),
      });

      // Scenario actuel
      if (weeklyLoss > 0) {
        scenarios.push({
          label: 'Actuel',
          weeklyLoss,
          weeksNeeded,
          predictedDate: predictedDate!,
          dateLabel,
        });
      }

      // Scenario prudent (-50% perte)
      const prudentLoss = Math.max(weeklyLoss * 0.5, 0.2);
      const prudentWeeks = remaining / prudentLoss;
      scenarios.push({
        label: 'Prudent',
        weeklyLoss: prudentLoss,
        weeksNeeded: prudentWeeks,
        predictedDate: addWeeks(new Date(), prudentWeeks),
        dateLabel: formatDateLabel(addWeeks(new Date(), prudentWeeks)),
      });
    }

    // Generer la courbe historique
    const historicalData: PredictionPoint[] = sorted.slice(-60).map(m => ({
      date: m.date,
      weight: m.weight,
      isPrediction: false,
    }));

    // Generer la courbe de prediction (6 mois)
    const predictionCurve: PredictionPoint[] = [];
    const today = new Date();

    if (weeklyLoss > 0 && remaining > 0) {
      for (let week = 1; week <= 26; week++) {
        const predDate = addWeeks(today, week);
        const predWeight = Math.max(currentWeight - (weeklyLoss * week), targetWeight);

        predictionCurve.push({
          date: predDate.toISOString().split('T')[0],
          weight: Math.round(predWeight * 10) / 10,
          isPrediction: true,
        });

        // Arreter si objectif atteint
        if (predWeight <= targetWeight) break;
      }
    }

    // Generer les avertissements
    const warnings: string[] = [];
    const tips: string[] = [];

    if (weeklyLoss > 1) {
      warnings.push('Attention, cette perte est peut-etre trop rapide (> 1 kg/sem). Risque d\'effet yoyo.');
    }

    if (weeklyLoss > 1.5) {
      warnings.push('Perte excessive ! Consulte un professionnel de sante.');
    }

    if (isGainingWeight) {
      warnings.push('Tu reprends du poids. Pas de panique, analysons ensemble.');
      tips.push('Revoir ton alimentation et ton activite physique');
      tips.push('Verifier si tu bois assez d\'eau');
    }

    if (isStable && remaining > 0) {
      tips.push('Ta progression stagne. Essaie de varier tes entrainements !');
      tips.push('Un leger deficit calorique peut relancer la perte');
    }

    if (weeklyLoss > 0 && weeklyLoss < 0.3) {
      tips.push('Progression lente mais sure ! C\'est durable.');
    }

    if (weeklyLoss >= 0.5 && weeklyLoss <= 0.8) {
      tips.push('Rythme ideal pour une perte durable !');
    }

    if (regression.r2 < 0.3 && dataForRegression.length >= 7) {
      tips.push('Tes pesees varient beaucoup. Pese-toi toujours dans les memes conditions.');
    }

    // Determiner la confiance
    let confidence: 'low' | 'medium' | 'high' = 'low';
    if (dataForRegression.length >= 14 && regression.r2 > 0.5) {
      confidence = 'high';
    } else if (dataForRegression.length >= 7 && regression.r2 > 0.3) {
      confidence = 'medium';
    }

    return {
      currentWeight,
      targetWeight,
      startWeight,
      remaining: Math.max(0, remaining),
      alreadyLost,
      progressPercent: Math.min(100, Math.max(0, progressPercent)),

      weeklyLoss: Math.round(weeklyLoss * 100) / 100,
      dailyLoss: Math.round(dailyLoss * 1000) / 1000,
      isLosingWeight,
      isGainingWeight,
      isStable,

      weeksNeeded: Math.round(weeksNeeded * 10) / 10,
      predictedDate,
      dateLabel,

      in1Week: Math.round(in1Week * 10) / 10,
      in1Month: Math.round(in1Month * 10) / 10,
      in3Months: Math.round(in3Months * 10) / 10,
      in6Months: Math.round(in6Months * 10) / 10,

      scenarios,
      historicalData,
      predictionCurve,

      warnings,
      tips,

      confidence,
      dataPoints: dataForRegression.length,
    };
  } catch (error) {
    console.error('Erreur calcul prediction:', error);
    return null;
  }
};

// ============================================
// FONCTION POUR OBTENIR UN RESUME SIMPLE
// ============================================

export const getPredictionSummary = async (): Promise<{
  weeklyLoss: number;
  predictedDate: string;
  remaining: number;
  weeksNeeded: number;
} | null> => {
  const prediction = await calculatePrediction();
  if (!prediction) return null;

  return {
    weeklyLoss: prediction.weeklyLoss,
    predictedDate: prediction.dateLabel,
    remaining: prediction.remaining,
    weeksNeeded: prediction.weeksNeeded,
  };
};

// ============================================
// FONCTION POUR CALCULER UNE DATE CIBLE
// ============================================

export const calculateWeeklyLossNeeded = (
  currentWeight: number,
  targetWeight: number,
  targetDate: Date
): number => {
  const remaining = currentWeight - targetWeight;
  if (remaining <= 0) return 0;

  const weeksUntilTarget = daysBetween(new Date(), targetDate) / 7;
  if (weeksUntilTarget <= 0) return remaining; // Impossible

  return remaining / weeksUntilTarget;
};

// ============================================
// EXPORT PAR DEFAUT
// ============================================

export default {
  calculatePrediction,
  getPredictionSummary,
  calculateWeeklyLossNeeded,
};
