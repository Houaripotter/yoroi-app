// ============================================
// YOROI - DONNÉES DE DÉMO POUR APPLE HEALTH
// ============================================
// Génère des données fictives réalistes pour tester l'UI
// ============================================

import { type HealthData } from './healthConnect';

// ============================================
// GÉNÉRATEURS DE DONNÉES
// ============================================

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDateNDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

// ============================================
// DONNÉES ACTUELLES
// ============================================

export function getDemoHealthData(): HealthData {
  return {
    heartRate: {
      current: randomBetween(70, 85),
      average: randomBetween(72, 78),
      min: randomBetween(55, 65),
      max: randomBetween(140, 165),
      resting: randomBetween(52, 62),
    },
    heartRateVariability: {
      value: randomBetween(45, 75),
      date: new Date().toISOString(),
    },
    oxygenSaturation: {
      value: randomBetween(96, 99),
      date: new Date().toISOString(),
    },
    respiratoryRate: {
      value: randomBetween(14, 18),
      date: new Date().toISOString(),
    },
    bodyTemperature: {
      value: parseFloat((36.5 + Math.random() * 0.5).toFixed(1)),
      date: new Date().toISOString(),
    },
    vo2Max: {
      value: randomBetween(38, 48),
      date: new Date().toISOString(),
    },
    bodyComposition: {
      bodyFatPercentage: parseFloat((15 + Math.random() * 10).toFixed(1)),
      leanBodyMass: parseFloat((60 + Math.random() * 15).toFixed(1)),
      date: new Date().toISOString(),
    },
    sleep: {
      duration: randomBetween(380, 490), // 6h20 - 8h10
      phases: {
        deep: randomBetween(80, 120),
        rem: randomBetween(70, 110),
        core: randomBetween(180, 240),
        awake: randomBetween(10, 40),
        inBed: randomBetween(400, 510),
      },
      // Note: startDate/endDate removed - use startTime/endTime instead
      startTime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      endTime: new Date().toISOString(),
    },
    calories: {
      active: randomBetween(450, 750),
      basal: randomBetween(1500, 1800),
      total: 0, // Calculé automatiquement
    },
    distance: {
      walking: parseFloat((3 + Math.random() * 4).toFixed(2)),
      running: parseFloat((Math.random() * 5).toFixed(2)),
      total: 0, // Calculé automatiquement
      unit: 'km',
    },
    steps: {
      count: randomBetween(6000, 14000),
      date: new Date().toISOString(),
    },
    workouts: [
      {
        id: 'demo-workout-1',
        activityType: 'JJB',
        duration: 90,
        startDate: getDateNDaysAgo(0),
        endDate: getDateNDaysAgo(0),
        calories: 620,
        distance: undefined,
        averageHeartRate: 142,
      },
      {
        id: 'demo-workout-2',
        activityType: 'Course',
        duration: 35,
        startDate: getDateNDaysAgo(1),
        endDate: getDateNDaysAgo(1),
        calories: 340,
        distance: 5.2,
        averageHeartRate: 155,
      },
      {
        id: 'demo-workout-3',
        activityType: 'Musculation',
        duration: 60,
        startDate: getDateNDaysAgo(2),
        endDate: getDateNDaysAgo(2),
        calories: 280,
        distance: undefined,
        averageHeartRate: 128,
      },
    ],
  };
}

// ============================================
// HISTORIQUES
// ============================================

export function getDemoHRVHistory(days: number): Array<{ date: string; value: number }> {
  const data: Array<{ date: string; value: number }> = [];
  const baseHRV = 55;

  for (let i = days - 1; i >= 0; i--) {
    const trend = (days - i) * 0.3; // Tendance à la hausse
    const noise = (Math.random() - 0.5) * 10; // Variabilité
    const value = Math.max(30, Math.min(80, baseHRV + trend + noise));

    data.push({
      date: getDateNDaysAgo(i),
      value: Math.round(value),
    });
  }

  return data;
}

export function getDemoRestingHRHistory(days: number): Array<{ date: string; value: number }> {
  const data: Array<{ date: string; value: number }> = [];
  const baseHR = 60;

  for (let i = days - 1; i >= 0; i--) {
    const trend = -(days - i) * 0.1; // Tendance à la baisse (meilleure forme)
    const noise = (Math.random() - 0.5) * 4;
    const value = Math.max(50, Math.min(70, baseHR + trend + noise));

    data.push({
      date: getDateNDaysAgo(i),
      value: Math.round(value),
    });
  }

  return data;
}

export function getDemoHeartRateHistory(days: number): Array<{ date: string; value: number }> {
  const data: Array<{ date: string; value: number }> = [];
  const baseHR = 75;

  for (let i = days - 1; i >= 0; i--) {
    const trend = -(days - i) * 0.08; // Tendance légère à la baisse (amélioration cardio)
    const noise = (Math.random() - 0.5) * 6;
    const value = Math.max(65, Math.min(85, baseHR + trend + noise));

    data.push({
      date: getDateNDaysAgo(i),
      value: Math.round(value),
    });
  }

  return data;
}

export function getDemoOxygenSaturationHistory(days: number): Array<{ date: string; value: number }> {
  const data: Array<{ date: string; value: number }> = [];
  const baseSpO2 = 97;

  for (let i = days - 1; i >= 0; i--) {
    const trend = (days - i) * 0.01; // Tendance très légère à la hausse
    const noise = (Math.random() - 0.5) * 1.5;
    const value = Math.max(94, Math.min(100, baseSpO2 + trend + noise));

    data.push({
      date: getDateNDaysAgo(i),
      value: Math.round(value),
    });
  }

  return data;
}

export function getDemoBodyTemperatureHistory(days: number): Array<{ date: string; value: number }> {
  const data: Array<{ date: string; value: number }> = [];
  const baseTemp = 36.6;

  for (let i = days - 1; i >= 0; i--) {
    const noise = (Math.random() - 0.5) * 0.4;
    const value = Math.max(36.2, Math.min(37.2, baseTemp + noise));

    data.push({
      date: getDateNDaysAgo(i),
      value: parseFloat(value.toFixed(1)),
    });
  }

  return data;
}

export function getDemoWeightHistory(days: number): Array<{ date: string; value: number }> {
  const data: Array<{ date: string; value: number }> = [];
  const startWeight = 85;

  for (let i = days - 1; i >= 0; i--) {
    const trend = -(days - i) * 0.05; // Perte de ~1.5kg par mois
    const noise = (Math.random() - 0.5) * 0.4; // Variabilité quotidienne
    const value = startWeight + trend + noise;

    data.push({
      date: getDateNDaysAgo(i),
      value: parseFloat(value.toFixed(1)),
    });
  }

  return data;
}

export function getDemoVO2MaxHistory(days: number): Array<{ date: string; value: number }> {
  const data: Array<{ date: string; value: number }> = [];
  const baseVO2 = 40;

  for (let i = days - 1; i >= 0; i--) {
    const trend = (days - i) * 0.08; // Amélioration progressive
    const noise = (Math.random() - 0.5) * 2;
    const value = Math.max(35, Math.min(50, baseVO2 + trend + noise));

    data.push({
      date: getDateNDaysAgo(i),
      value: parseFloat(value.toFixed(1)),
    });
  }

  return data;
}

export function getDemoStepsHistory(days: number): Array<{ date: string; value: number }> {
  const data: Array<{ date: string; value: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayOfWeek = new Date(getDateNDaysAgo(i)).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const base = isWeekend ? 8000 : 11000;
    const noise = randomBetween(-2000, 3000);

    data.push({
      date: getDateNDaysAgo(i),
      value: Math.max(3000, base + noise),
    });
  }

  return data;
}

export function getDemoSleepHistory(days: number): Array<{
  date: string;
  deep: number;
  rem: number;
  core: number;
  awake: number;
  total: number;
}> {
  const data: Array<{
    date: string;
    deep: number;
    rem: number;
    core: number;
    awake: number;
    total: number;
  }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const deep = randomBetween(70, 120);
    const rem = randomBetween(60, 100);
    const core = randomBetween(180, 250);
    const awake = randomBetween(10, 45);
    const total = deep + rem + core + awake;

    data.push({
      date: getDateNDaysAgo(i),
      deep,
      rem,
      core,
      awake,
      total,
    });
  }

  return data;
}

export function getDemoCaloriesHistory(days: number): Array<{
  date: string;
  active: number;
  basal: number;
  total: number;
}> {
  const data: Array<{
    date: string;
    active: number;
    basal: number;
    total: number;
  }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayOfWeek = new Date(getDateNDaysAgo(i)).getDay();
    const isRestDay = dayOfWeek === 0; // Dimanche = repos

    const active = isRestDay
      ? randomBetween(200, 400)
      : randomBetween(500, 800);
    const basal = randomBetween(1500, 1700);
    const total = active + basal;

    data.push({
      date: getDateNDaysAgo(i),
      active,
      basal,
      total,
    });
  }

  return data;
}
