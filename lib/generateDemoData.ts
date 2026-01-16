// ============================================
// YOROI - GENERATEUR DE DONNEES DEMO V6
// ============================================
// DÉSACTIVÉ POUR PRODUCTION - Mode démo désactivé
// Ce fichier est conservé pour référence uniquement

import AsyncStorage from '@react-native-async-storage/async-storage';
import { openDatabase } from '@/lib/database';
import logger from '@/lib/security/logger';

// ═══════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════

const DEMO_CONFIG = {
  // Profil
  name: 'Houari',
  height: 178,
  
  // Poids
  startWeight: 95.0,
  endWeight: 77.0,
  targetWeight: 75.0,
  
  // Composition corporelle
  startBodyFat: 28,
  endBodyFat: 16,
  startMuscle: 35,
  endMuscle: 42,
  startWater: 48,
  endWater: 56,
  
  // Durée
  daysCount: 180, // 6 mois
};

// Points clés de la courbe de poids (réaliste avec plateaux et rechutes)
const WEIGHT_KEYPOINTS = [
  { day: 0, weight: 95.0 },
  { day: 7, weight: 93.2 },   // -1.8kg semaine 1 (perte d'eau)
  { day: 14, weight: 91.5 },
  { day: 21, weight: 90.0 },
  { day: 28, weight: 88.8 },
  { day: 35, weight: 87.5 },
  { day: 45, weight: 86.0 },
  { day: 55, weight: 84.8 },
  { day: 60, weight: 83.5 },
  { day: 65, weight: 84.2 },   // Rechute (week-end, fête...)
  { day: 70, weight: 84.5 },
  { day: 75, weight: 83.8 },
  { day: 80, weight: 82.5 },
  { day: 90, weight: 81.0 },
  { day: 100, weight: 80.0 },
  { day: 110, weight: 79.5 },  // Plateau
  { day: 120, weight: 79.0 },
  { day: 130, weight: 78.5 },
  { day: 140, weight: 78.0 },
  { day: 150, weight: 77.8 },
  { day: 160, weight: 77.5 },
  { day: 170, weight: 77.2 },
  { day: 180, weight: 77.0 },
];

// Mensurations de départ et d'arrivée
const MEASUREMENTS_START = {
  chest: 108,
  waist: 98,
  hips: 106,
  left_arm: 35,
  right_arm: 35.5,
  left_thigh: 62,
  right_thigh: 62.5,
  left_calf: 38,
  right_calf: 38.5,
  shoulders: 120,
  neck: 42,
};

const MEASUREMENTS_END = {
  chest: 102,
  waist: 82,
  hips: 96,
  left_arm: 36.5,
  right_arm: 37,
  left_thigh: 56,
  right_thigh: 56.5,
  left_calf: 37,
  right_calf: 37.5,
  shoulders: 118,
  neck: 39,
};

// ═══════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════

const getBaseWeight = (day: number): number => {
  let prevPoint = WEIGHT_KEYPOINTS[0];
  let nextPoint = WEIGHT_KEYPOINTS[WEIGHT_KEYPOINTS.length - 1];

  for (let i = 0; i < WEIGHT_KEYPOINTS.length - 1; i++) {
    if (day >= WEIGHT_KEYPOINTS[i].day && day <= WEIGHT_KEYPOINTS[i + 1].day) {
      prevPoint = WEIGHT_KEYPOINTS[i];
      nextPoint = WEIGHT_KEYPOINTS[i + 1];
      break;
    }
  }

  const dayRange = nextPoint.day - prevPoint.day;
  const weightRange = nextPoint.weight - prevPoint.weight;

  if (dayRange === 0) return prevPoint.weight;

  const progress = (day - prevPoint.day) / dayRange;
  const smoothProgress = (1 - Math.cos(progress * Math.PI)) / 2;

  return prevPoint.weight + weightRange * smoothProgress;
};

const interpolate = (start: number, end: number, progress: number): number => {
  return start + (end - start) * progress;
};

const randomVariation = (base: number, variance: number): number => {
  return base + (Math.random() - 0.5) * variance;
};

// ═══════════════════════════════════════════════
// EFFACER TOUTES LES DONNEES
// ═══════════════════════════════════════════════

export const clearAllData = async (): Promise<void> => {
  logger.info('🗑️ Suppression de toutes les données...');

  const database = await openDatabase();

  // Supprimer les données SQLite
  await database.runAsync('DELETE FROM trainings');
  await database.runAsync('DELETE FROM weights');
  await database.runAsync('DELETE FROM clubs');
  await database.runAsync('DELETE FROM measurements');
  await database.runAsync('DELETE FROM achievements');
  await database.runAsync('DELETE FROM photos');
  await database.runAsync('DELETE FROM weekly_plan');
  await database.runAsync('DELETE FROM profile');
  
  // Tables YOROI MEDIC
  try {
    await database.runAsync('DELETE FROM treatment_reminders');
    await database.runAsync('DELETE FROM injury_treatments');
    await database.runAsync('DELETE FROM injury_eva_history');
    await database.runAsync('DELETE FROM injuries');
  } catch (e) {
    // Tables might not exist
  }

  // Supprimer les données AsyncStorage
  const keys = await AsyncStorage.getAllKeys();
  const yoroiKeys = keys.filter(key =>
    key.startsWith('@yoroi') ||
    key.startsWith('measurements') ||
    key.startsWith('userSettings')
  );
  if (yoroiKeys.length > 0) {
    await AsyncStorage.multiRemove(yoroiKeys);
  }

  logger.info('Toutes les données supprimées !');
};

// ═══════════════════════════════════════════════
// CREER LE PROFIL
// ═══════════════════════════════════════════════

const createProfile = async (): Promise<void> => {
  const database = await openDatabase();
  const startDate = new Date(Date.now() - DEMO_CONFIG.daysCount * 24 * 60 * 60 * 1000);

  await database.runAsync(
    `INSERT INTO profile (name, height_cm, target_weight, start_weight, start_date, avatar_gender)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      DEMO_CONFIG.name,
      DEMO_CONFIG.height,
      DEMO_CONFIG.targetWeight,
      DEMO_CONFIG.startWeight,
      startDate.toISOString().split('T')[0],
      'homme'
    ]
  );

  logger.info(`Profil créé: ${DEMO_CONFIG.name}, ${DEMO_CONFIG.height}cm, objectif ${DEMO_CONFIG.targetWeight}kg`);
};

// ═══════════════════════════════════════════════
// CREER LES CLUBS AVEC LOGOS
// ═══════════════════════════════════════════════

interface ClubIds {
  gracieBarra: number;
  basicFit: number;
  marseilleFightClub: number;
}

const createClubs = async (): Promise<ClubIds> => {
  const database = await openDatabase();

  // Gracie Barra (JJB) - Logo rouge/noir
  const gbResult = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    ['Gracie Barra', 'jjb', 'gracie-barra', '#C41E3A']
  );

  // Basic Fit (Musculation) - Logo orange
  const bfResult = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    ['Basic Fit', 'musculation', 'basic-fit', '#FF6B00']
  );

  // Marseille Fight Club (MMA) - Logo rouge
  const mfcResult = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    ['Marseille Fight Club', 'mma', 'marseille-fight-club', '#EF4444']
  );

  logger.info(`3 clubs créés avec logos: Gracie Barra, Basic Fit, Marseille Fight Club`);

  return {
    gracieBarra: gbResult.lastInsertRowId,
    basicFit: bfResult.lastInsertRowId,
    marseilleFightClub: mfcResult.lastInsertRowId,
  };
};

// ═══════════════════════════════════════════════
// GENERER LES PESEES (6 mois)
// ═══════════════════════════════════════════════

const generateWeights = async (): Promise<number> => {
  const database = await openDatabase();
  const today = new Date();
  let count = 0;

  for (let day = 0; day <= DEMO_CONFIG.daysCount; day++) {
    // Sauter certains jours (réaliste - pas de pesée tous les jours)
    const isKeyDay = WEIGHT_KEYPOINTS.some(kp => kp.day === day);
    if (!isKeyDay && Math.random() < 0.15) continue; // 85% de chance de se peser

    const date = new Date(today);
    date.setDate(date.getDate() - (DEMO_CONFIG.daysCount - day));
    const dateStr = date.toISOString().split('T')[0];

    // Poids avec variations quotidiennes
    const dayOfWeek = date.getDay();
    let weight = getBaseWeight(day);
    weight += (Math.random() - 0.5) * 0.6; // Variation quotidienne ±0.3kg
    if (dayOfWeek === 1) weight += 0.3; // Lundi = plus lourd (week-end)
    if (dayOfWeek === 5) weight -= 0.2; // Vendredi = plus léger

    // Forcer les valeurs exactes pour le premier et dernier jour
    if (day === 0) weight = DEMO_CONFIG.startWeight;
    if (day === DEMO_CONFIG.daysCount) weight = DEMO_CONFIG.endWeight;

    weight = Math.round(weight * 10) / 10;

    // Composition corporelle (progression linéaire avec variations)
    const progress = day / DEMO_CONFIG.daysCount;

    let fatPercent = interpolate(DEMO_CONFIG.startBodyFat, DEMO_CONFIG.endBodyFat, progress);
    let musclePercent = interpolate(DEMO_CONFIG.startMuscle, DEMO_CONFIG.endMuscle, progress);
    let waterPercent = interpolate(DEMO_CONFIG.startWater, DEMO_CONFIG.endWater, progress);

    // Variations quotidiennes
    fatPercent = randomVariation(fatPercent, 1.0);
    musclePercent = randomVariation(musclePercent, 0.8);
    waterPercent = randomVariation(waterPercent, 1.5);

    fatPercent = Math.round(fatPercent * 10) / 10;
    musclePercent = Math.round(musclePercent * 10) / 10;
    waterPercent = Math.round(waterPercent * 10) / 10;

    // Données de composition corporelle avancées
    const boneMass = Math.round((2.8 + progress * 0.4 + (Math.random() - 0.5) * 0.2) * 10) / 10;
    const visceralFat = Math.max(1, Math.round(18 - progress * 10 + (Math.random() - 0.5) * 2));
    const metabolicAge = Math.max(25, Math.round(45 - progress * 18 + (Math.random() - 0.5) * 2));
    const bmr = Math.round(1650 + progress * 200 + (Math.random() - 0.5) * 50);

    await database.runAsync(
      `INSERT INTO weights (weight, fat_percent, muscle_percent, water_percent, bone_mass, visceral_fat, metabolic_age, bmr, date, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [weight, fatPercent, musclePercent, waterPercent, boneMass, visceralFat, metabolicAge, bmr, dateStr, 'demo']
    );

    count++;
  }

  logger.info(`${count} pesées générées (${DEMO_CONFIG.startWeight}kg → ${DEMO_CONFIG.endWeight}kg)`);
  return count;
};

// ═══════════════════════════════════════════════
// GENERER LES MENSURATIONS (1x par semaine)
// ═══════════════════════════════════════════════

const generateMeasurements = async (): Promise<number> => {
  const database = await openDatabase();
  const today = new Date();
  let count = 0;

  // Une mensuration par semaine (26 semaines sur 6 mois)
  const totalWeeks = Math.floor(DEMO_CONFIG.daysCount / 7);

  for (let week = 0; week <= totalWeeks; week++) {
    const day = week * 7;
    const date = new Date(today);
    date.setDate(date.getDate() - (DEMO_CONFIG.daysCount - day));
    const dateStr = date.toISOString().split('T')[0];

    const progress = day / DEMO_CONFIG.daysCount;

    // Interpoler chaque mesure
    const chest = Math.round(interpolate(MEASUREMENTS_START.chest, MEASUREMENTS_END.chest, progress) * 10) / 10;
    const waist = Math.round(interpolate(MEASUREMENTS_START.waist, MEASUREMENTS_END.waist, progress) * 10) / 10;
    const hips = Math.round(interpolate(MEASUREMENTS_START.hips, MEASUREMENTS_END.hips, progress) * 10) / 10;
    const left_arm = Math.round(interpolate(MEASUREMENTS_START.left_arm, MEASUREMENTS_END.left_arm, progress) * 10) / 10;
    const right_arm = Math.round(interpolate(MEASUREMENTS_START.right_arm, MEASUREMENTS_END.right_arm, progress) * 10) / 10;
    const left_thigh = Math.round(interpolate(MEASUREMENTS_START.left_thigh, MEASUREMENTS_END.left_thigh, progress) * 10) / 10;
    const right_thigh = Math.round(interpolate(MEASUREMENTS_START.right_thigh, MEASUREMENTS_END.right_thigh, progress) * 10) / 10;
    const left_calf = Math.round(interpolate(MEASUREMENTS_START.left_calf, MEASUREMENTS_END.left_calf, progress) * 10) / 10;
    const right_calf = Math.round(interpolate(MEASUREMENTS_START.right_calf, MEASUREMENTS_END.right_calf, progress) * 10) / 10;
    const shoulders = Math.round(interpolate(MEASUREMENTS_START.shoulders, MEASUREMENTS_END.shoulders, progress) * 10) / 10;
    const neck = Math.round(interpolate(MEASUREMENTS_START.neck, MEASUREMENTS_END.neck, progress) * 10) / 10;

    await database.runAsync(
      `INSERT INTO measurements (chest, waist, hips, left_arm, right_arm, left_thigh, right_thigh, left_calf, right_calf, shoulders, neck, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [chest, waist, hips, left_arm, right_arm, left_thigh, right_thigh, left_calf, right_calf, shoulders, neck, dateStr]
    );

    count++;
  }

  logger.info(`${count} mensurations générées (tour de taille: ${MEASUREMENTS_START.waist}cm → ${MEASUREMENTS_END.waist}cm)`);
  return count;
};

// ═══════════════════════════════════════════════
// GENERER LES ENTRAINEMENTS (6 mois)
// ═══════════════════════════════════════════════

const generateTrainings = async (clubIds: ClubIds): Promise<number> => {
  const database = await openDatabase();
  const today = new Date();
  let count = 0;

  // Planning hebdomadaire réaliste (5-6 entraînements par semaine)
  // Lundi: JJB (Gracie Barra)
  // Mardi: Musculation (Basic Fit)
  // Mercredi: MMA (Marseille Fight Club)
  // Jeudi: JJB (Gracie Barra)
  // Vendredi: Musculation (Basic Fit)
  // Samedi: MMA ou repos

  for (let day = 0; day <= DEMO_CONFIG.daysCount; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (DEMO_CONFIG.daysCount - day));
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay(); // 0=Dimanche, 1=Lundi...

    // Probabilité d'entraînement (varie selon la progression)
    const progress = day / DEMO_CONFIG.daysCount;
    let trainingProb = 0.80; // 80% de base
    
    // Moins motivé au début, très motivé au milieu, légère baisse à la fin
    if (progress < 0.1) trainingProb = 0.65;
    if (progress > 0.3 && progress < 0.7) trainingProb = 0.90;
    if (progress > 0.9) trainingProb = 0.75;

    // Lundi & Jeudi : JJB - Gracie Barra
    if ((dayOfWeek === 1 || dayOfWeek === 4) && Math.random() < trainingProb) {
      const duration = 75 + Math.floor(Math.random() * 30); // 75-105 min
      const sessionTypes = ['technique', 'sparring', 'compétition', 'open_mat'];
      const sessionType = sessionTypes[Math.floor(Math.random() * sessionTypes.length)];
      
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)`,
        [clubIds.gracieBarra, 'jjb', sessionType, dateStr, '19:00', duration]
      );
      count++;
    }

    // Mardi & Vendredi : Musculation - Basic Fit
    if ((dayOfWeek === 2 || dayOfWeek === 5) && Math.random() < trainingProb) {
      const duration = 50 + Math.floor(Math.random() * 30); // 50-80 min
      const muscleGroups = [
        'pectoraux,triceps',
        'dos,biceps',
        'épaules,trapèzes',
        'jambes,fessiers',
        'full_body'
      ];
      const muscles = muscleGroups[Math.floor(Math.random() * muscleGroups.length)];
      
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, date, start_time, duration_minutes, muscles) VALUES (?, ?, ?, ?, ?, ?)`,
        [clubIds.basicFit, 'musculation', dateStr, '12:00', duration, muscles]
      );
      count++;
    }

    // Mercredi : MMA - Marseille Fight Club
    if (dayOfWeek === 3 && Math.random() < trainingProb) {
      const duration = 60 + Math.floor(Math.random() * 30); // 60-90 min
      const sessionTypes = ['striking', 'grappling', 'MMA', 'sparring'];
      const sessionType = sessionTypes[Math.floor(Math.random() * sessionTypes.length)];
      
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)`,
        [clubIds.marseilleFightClub, 'mma', sessionType, dateStr, '19:30', duration]
      );
      count++;
    }

    // Samedi : MMA ou repos (50% de chance)
    if (dayOfWeek === 6 && Math.random() < 0.5) {
      const duration = 60 + Math.floor(Math.random() * 30);
      
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)`,
        [clubIds.marseilleFightClub, 'mma', 'sparring', dateStr, '10:00', duration]
      );
      count++;
    }
  }

  logger.info(`${count} entraînements générés (JJB + Musculation + MMA)`);
  return count;
};

// ═══════════════════════════════════════════════
// GENERER LE PLANNING HEBDOMADAIRE
// ═══════════════════════════════════════════════

const generateWeeklyPlan = async (clubIds: ClubIds): Promise<number> => {
  const database = await openDatabase();

  const plan = [
    { day: 1, club_id: clubIds.gracieBarra, sport: 'jjb', time: '19:00', duration: 90, is_rest: 0 },
    { day: 2, club_id: clubIds.basicFit, sport: 'musculation', time: '12:00', duration: 60, muscles: 'pectoraux,triceps', is_rest: 0 },
    { day: 3, club_id: clubIds.marseilleFightClub, sport: 'mma', time: '19:30', duration: 75, is_rest: 0 },
    { day: 4, club_id: clubIds.gracieBarra, sport: 'jjb', time: '19:00', duration: 90, is_rest: 0 },
    { day: 5, club_id: clubIds.basicFit, sport: 'musculation', time: '12:00', duration: 60, muscles: 'dos,biceps', is_rest: 0 },
    { day: 6, club_id: clubIds.marseilleFightClub, sport: 'mma', time: '10:00', duration: 75, is_rest: 0 },
    { day: 0, club_id: null, sport: 'repos', time: null, duration: null, is_rest: 1 }, // Dimanche = repos
  ];

  for (const item of plan) {
    await database.runAsync(
      `INSERT INTO weekly_plan (day_of_week, club_id, sport, time, duration_minutes, muscles, is_rest_day) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.day, item.club_id, item.sport, item.time, item.duration, (item as any).muscles || null, item.is_rest]
    );
  }

  logger.info(`Planning hebdomadaire créé (6 jours d'entraînement + 1 repos)`);
  return plan.length;
};

// ═══════════════════════════════════════════════
// GENERER QUELQUES BADGES
// ═══════════════════════════════════════════════

const generateAchievements = async (): Promise<number> => {
  const database = await openDatabase();
  const today = new Date();

  const achievements = [
    { id: 'first_weight', daysAgo: 180 },
    { id: 'streak_7', daysAgo: 170 },
    { id: 'streak_30', daysAgo: 140 },
    { id: 'lost_5kg', daysAgo: 150 },
    { id: 'lost_10kg', daysAgo: 100 },
    { id: 'lost_15kg', daysAgo: 30 },
    { id: 'training_10', daysAgo: 160 },
    { id: 'training_50', daysAgo: 90 },
    { id: 'training_100', daysAgo: 30 },
    { id: 'early_bird', daysAgo: 120 },
    { id: 'night_owl', daysAgo: 100 },
  ];

  for (const achievement of achievements) {
    const date = new Date(today);
    date.setDate(date.getDate() - achievement.daysAgo);
    
    await database.runAsync(
      `INSERT OR IGNORE INTO achievements (id, unlocked_at) VALUES (?, ?)`,
      [achievement.id, date.toISOString()]
    );
  }

  logger.info(`${achievements.length} badges débloqués`);
  return achievements.length;
};

// ═══════════════════════════════════════════════
// SAUVEGARDER DANS ASYNCSTORAGE
// ═══════════════════════════════════════════════

const saveToAsyncStorage = async (): Promise<void> => {
  const database = await openDatabase();

  // Récupérer les poids depuis SQLite
  const weights = await database.getAllAsync<any>('SELECT * FROM weights ORDER BY date ASC');

  // Convertir en format AsyncStorage
  const measurements = weights.map((w: any) => ({
    id: w.id.toString(),
    date: w.date,
    weight: w.weight,
    bodyFat: w.fat_percent,
    body_fat: w.fat_percent,
    muscle: w.muscle_percent,
    muscle_mass: w.muscle_percent,
    water: w.water_percent,
    created_at: w.created_at,
  }));

  await AsyncStorage.setItem('measurements', JSON.stringify(measurements));

  // Sauvegarder les settings
  const settings = {
    weight_goal: DEMO_CONFIG.targetWeight,
    username: DEMO_CONFIG.name,
    height: DEMO_CONFIG.height,
    gender: 'male',
    goal: 'lose_weight',
    targetWeight: DEMO_CONFIG.targetWeight,
    notifications_enabled: true,
    theme: 'ocean',
  };

  await AsyncStorage.setItem('userSettings', JSON.stringify(settings));

  logger.info('Données synchronisées avec AsyncStorage');
};

// ═══════════════════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════════════════

export interface DemoDataResult {
  success: boolean;
  weightsCount: number;
  trainingsCount: number;
  measurementsCount: number;
  achievementsCount: number;
  error?: string;
}

export const generateAllDemoData = async (): Promise<DemoDataResult> => {
  // DÉSACTIVÉ POUR PRODUCTION - Mode démo désactivé
  logger.warn('Génération de données démo DÉSACTIVÉE pour la production');
  logger.warn('Ce fichier est conservé pour référence uniquement');

  return {
    success: false,
    weightsCount: 0,
    trainingsCount: 0,
    measurementsCount: 0,
    achievementsCount: 0,
    error: 'Mode démo désactivé pour la production',
  };
};

export const resetAndGenerateDemoData = async (): Promise<DemoDataResult> => {
  return generateAllDemoData();
};

export default {
  generateAllDemoData,
  clearAllData,
  resetAndGenerateDemoData,
};
