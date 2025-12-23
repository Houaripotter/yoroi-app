// ============================================
// YOROI - ESTIMATION DATE OBJECTIF POIDS
// ============================================
// Calcule la date estimée d'atteinte de l'objectif

export interface WeightProgress {
  currentWeight: number;
  targetWeight: number;
  startWeight: number;
  weightLost: number;
  weightRemaining: number;
  progressPercent: number;
  estimatedDate: string;
  weeksRemaining: number;
  dailyChange: number;
  weeklyAverage: number;
  isGaining: boolean; // true si objectif = prise de poids
}

/**
 * Calcule la date estimée d'atteinte de l'objectif
 * @param currentWeight - Poids actuel en kg
 * @param targetWeight - Poids objectif en kg
 * @param weeklyChangeAverage - Variation moyenne par semaine (positif = perte, négatif = gain)
 * @returns Date estimée formatée
 */
export const calculateEstimatedDate = (
  currentWeight: number,
  targetWeight: number,
  weeklyChangeAverage: number
): string => {
  const isGaining = targetWeight > currentWeight;
  const remaining = Math.abs(currentWeight - targetWeight);

  if (remaining <= 0) {
    return "Objectif atteint ! 🎉";
  }

  if (weeklyChangeAverage === 0) {
    return "Continue tes efforts !";
  }

  // Si perte de poids mais moyenne positive, ou gain mais moyenne négative
  const effectiveWeeklyChange = Math.abs(weeklyChangeAverage);
  if (effectiveWeeklyChange < 0.1) {
    return "Continue tes efforts !";
  }

  const weeksNeeded = remaining / effectiveWeeklyChange;

  if (weeksNeeded > 52 * 2) {
    return "Plus d'un an";
  }

  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + Math.ceil(weeksNeeded * 7));

  return estimatedDate.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Calcule toutes les statistiques de progression
 */
export const calculateWeightProgress = (
  currentWeight: number,
  targetWeight: number,
  startWeight: number,
  previousWeight: number | null,
  weeklyAverage: number
): WeightProgress => {
  const isGaining = targetWeight > startWeight;

  let weightLost: number;
  let weightRemaining: number;
  let progressPercent: number;

  if (isGaining) {
    // Objectif = prise de poids
    weightLost = currentWeight - startWeight; // Ce qu'on a pris
    weightRemaining = targetWeight - currentWeight; // Ce qu'il reste à prendre
    const totalToGain = targetWeight - startWeight;
    progressPercent = totalToGain > 0 ? (weightLost / totalToGain) * 100 : 0;
  } else {
    // Objectif = perte de poids
    weightLost = startWeight - currentWeight; // Ce qu'on a perdu
    weightRemaining = currentWeight - targetWeight; // Ce qu'il reste à perdre
    const totalToLose = startWeight - targetWeight;
    progressPercent = totalToLose > 0 ? (weightLost / totalToLose) * 100 : 0;
  }

  // Borner entre 0 et 100
  progressPercent = Math.max(0, Math.min(100, progressPercent));

  // Variation quotidienne
  const dailyChange = previousWeight ? currentWeight - previousWeight : 0;

  // Estimation date
  const estimatedDate = calculateEstimatedDate(
    currentWeight,
    targetWeight,
    weeklyAverage
  );

  // Semaines restantes
  const weeksRemaining =
    weeklyAverage > 0 ? Math.ceil(Math.abs(weightRemaining) / weeklyAverage) : 0;

  return {
    currentWeight,
    targetWeight,
    startWeight,
    weightLost,
    weightRemaining,
    progressPercent,
    estimatedDate,
    weeksRemaining,
    dailyChange,
    weeklyAverage,
    isGaining,
  };
};

/**
 * Formate un nombre de kg avec signe
 */
export const formatWeightChange = (change: number, showPlus = true): string => {
  if (change === 0) return "0 kg";
  const sign = change > 0 ? (showPlus ? "+" : "") : "";
  return `${sign}${change.toFixed(1)} kg`;
};

/**
 * Formate un pourcentage
 */
export const formatPercent = (percent: number): string => {
  return `${Math.round(percent)}%`;
};
