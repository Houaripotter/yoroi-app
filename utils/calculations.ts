interface WeightEntry {
  date: string;
  weight: number;
}

export function calculateMovingAverage(
  entries: WeightEntry[],
  days: number = 7
): number {
  if (entries.length === 0) return 0;

  const recentEntries = entries.slice(0, Math.min(days, entries.length));
  const sum = recentEntries.reduce((acc, entry) => acc + entry.weight, 0);
  return sum / recentEntries.length;
}

export function getTrend(
  current: number,
  previous: number
): 'up' | 'down' | 'stable' | undefined {
  if (!current || !previous) return undefined;

  const diff = current - previous;
  const threshold = 0.1;

  if (Math.abs(diff) < threshold) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Sous-poids';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Surpoids';
  return 'Obésité';
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function convertKgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function convertLbsToKg(lbs: number): number {
  return lbs / 2.20462;
}

export function convertCmToIn(cm: number): number {
  return cm / 2.54;
}

export function convertInToCm(inches: number): number {
  return inches * 2.54;
}
