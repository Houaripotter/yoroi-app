// ============================================
// YOROI - MODE SCREENSHOT POUR APP STORE
// ============================================
// Données de démonstration complètes et attrayantes pour les captures d'écran

import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDatabase, addWeight, addMeasurementRecord, resetDatabase, openDatabase } from './database';
import { format, subDays, addDays } from 'date-fns';
import logger from '@/lib/security/logger';
import { createBenchmark, addBenchmarkEntry, createSkill, resetCarnet } from './carnetService';
import type { BenchmarkCategory, BenchmarkUnit, SkillCategory, SkillStatus } from './carnetService';

// ============================================
// PROFILS DE DÉMONSTRATION DISPONIBLES
// ============================================
export const DEMO_PROFILES = {
  houari: {
    name: 'Houari',
    height_cm: 175,
    start_weight: 99.9,
    target_weight: 75.0,
    sport: 'musculation',
    mode: 'standard',
    description: 'Perte de poids - Transformation',
  },
};

export type DemoProfileKey = keyof typeof DEMO_PROFILES;

// Profil actif par defaut
let DEMO_PROFILE = {
  ...DEMO_PROFILES.houari,
  startDate: subDays(new Date(), 180),
};

// Fonction pour changer le profil actif
export const setActiveDemoProfile = (profileKey: DemoProfileKey) => {
  const profile = DEMO_PROFILES[profileKey];
  if (profile) {
    DEMO_PROFILE = {
      ...profile,
      startDate: subDays(new Date(), 180),
    };
    logger.info(`Profil demo change: ${profile.name}`);
  }
};

// ============================================
// GÉNÉRATION DES PESÉES (1 an) - TRANSFORMATION RÉALISTE GERMAIN
// ============================================
const generateWeights = () => {
  const weights = [];

  // Utiliser le profil actif
  const startWeight = DEMO_PROFILE.start_weight;
  const targetWeight = DEMO_PROFILE.target_weight;
  const totalLoss = startWeight - targetWeight;

  // Date de début: 1er janvier 2025
  const startDate = new Date('2025-01-01');
  const today = new Date();
  const totalDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Générer des pesées espacées de façon réaliste (pas tous les jours!)
  // En moyenne 3-4 pesées par semaine
  let lastWeightDate = startDate;
  let currentWeight = startWeight;

  for (let day = 0; day <= totalDays; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);

    // Espacer les pesées: 2-4 jours entre chaque
    const daysSinceLast = Math.floor((currentDate.getTime() - lastWeightDate.getTime()) / (1000 * 60 * 60 * 24));
    const shouldWeigh = daysSinceLast >= 2 && (daysSinceLast >= 4 || Math.random() > 0.4);

    if (shouldWeigh || day === 0 || day === totalDays) {
      const progress = day / Math.max(365, totalDays); // Progression sur 1 an

      // Courbe de perte réaliste avec phases
      let baseWeight;
      if (progress < 0.15) {
        // Phase rapide début (motivation haute) - perte de ~1kg/semaine
        baseWeight = startWeight - (totalLoss * progress * 1.5);
      } else if (progress < 0.5) {
        // Phase stable - perte constante ~0.7kg/semaine
        baseWeight = startWeight - (totalLoss * 0.225) - (totalLoss * (progress - 0.15) * 0.9);
      } else if (progress < 0.7) {
        // Petit plateau - perte ralentie
        baseWeight = startWeight - (totalLoss * 0.54) - (totalLoss * (progress - 0.5) * 0.5);
      } else {
        // Phase finale - perte modérée jusqu'à objectif
        baseWeight = startWeight - (totalLoss * 0.64) - (totalLoss * (progress - 0.7) * 1.2);
      }

      // Variations naturelles (fluctuations eau, digestion, etc.)
      const variation = (Math.sin(day * 0.3) * 0.6) + (Math.cos(day * 0.15) * 0.4) + (Math.random() - 0.5) * 0.4;
      currentWeight = Math.max(baseWeight + variation, targetWeight);

      // Progression composition corporelle
      const bodyFatStart = 32;
      const bodyFatEnd = 16;
      const muscleStart = 35;
      const muscleEnd = 44;

      weights.push({
        date: format(currentDate, 'yyyy-MM-dd'),
        weight: Math.round(currentWeight * 10) / 10,
        bodyFat: Math.round((bodyFatStart - (progress * (bodyFatStart - bodyFatEnd))) * 10) / 10,
        muscleMass: Math.round((muscleStart + (progress * (muscleEnd - muscleStart))) * 10) / 10,
        water: Math.round((50 + (progress * 10)) * 10) / 10,
        boneMass: Math.round((3.0 + (progress * 0.5)) * 10) / 10,
        visceralFat: Math.round(16 - (progress * 9)),
        bmr: Math.round(1650 + (progress * 350)),
        metabolicAge: Math.round(42 - (progress * 15)),
      });

      lastWeightDate = currentDate;
    }
  }

  return weights;
};

// ============================================
// GÉNÉRATION DES MENSURATIONS (12 mois - TRANSFORMATION TOTALE!)
// ============================================
const generateMeasurements = () => {
  const measurements = [];
  const months = 12; // 1 AN DE TRANSFORMATION!

  for (let i = 0; i <= months; i++) {
    const date = subDays(new Date(), (months - i) * 30);
    const progress = i / months;

    measurements.push({
      date: format(date, 'yyyy-MM-dd'),
      waist: Math.round((115 - progress * 30) * 10) / 10, // 115cm → 85cm (-30cm taille! DINGUE!)
      chest: Math.round((110 + progress * 8) * 10) / 10, // 110cm → 118cm (+8cm pecs MASSIFS!)
      hips: Math.round((118 - progress * 18) * 10) / 10, // 118cm → 100cm (-18cm)
      left_thigh: Math.round((72 - progress * 12) * 10) / 10, // 72cm → 60cm (-12cm)
      right_thigh: Math.round((72 - progress * 12) * 10) / 10, // 72cm → 60cm (-12cm)
      left_arm: Math.round((32 + progress * 8) * 10) / 10, // 32cm → 40cm (+8cm biceps! BRAS DE FOU!)
      right_arm: Math.round((32 + progress * 8) * 10) / 10, // 32cm → 40cm (+8cm biceps! BRAS DE FOU!)
      left_calf: Math.round((38 + progress * 4) * 10) / 10, // 38cm → 42cm (+4cm)
      right_calf: Math.round((38 + progress * 4) * 10) / 10, // 38cm → 42cm (+4cm)
      neck: Math.round((46 - progress * 6) * 10) / 10, // 46cm → 40cm (-6cm double menton disparu!)
    });
  }

  return measurements;
};

// ============================================
// GÉNÉRATION DES ENTRAÎNEMENTS (Planning complet)
// ============================================
// Planning diversifié avec 3 clubs FITNESS:
// - Run & Fit Marseille (Running)
// - Basic-Fit Marseille (Musculation)
// - Urban Street Workout (Calisthenics/Street Workout)
//
// Règles :
// - Max 2 entraînements par jour (matin + soir)
// - Mercredi : REPOS
// - Dimanche : REPOS OU Running léger
// - Samedi : Running longue distance
// ============================================
const generateTrainings = async (clubIds: ClubIds) => {
  const database = await openDatabase();
  let count = 0;

  const now = new Date();
  const days = 60; // 2 mois d'entraînements seulement
  const startDate = subDays(now, days);

  logger.info(`Génération des entraînements Houari (${days} derniers jours)`);

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay(); // 0=Dim, 1=Lun...

    // Sélection des jours de repos (3 par mois environ)
    // On prend le 15, le 28 et le 5 de chaque mois comme repos
    const dayOfMonth = date.getDate();
    if ([5, 15, 28].includes(dayOfMonth)) {
      continue; 
    }

    // --- SÉANCE DU MATIN (6h30 - 8h00) ---
    if (dayOfWeek === 0 || dayOfWeek === 3) {
      // Mercredi et Dimanche = RUNNING obligatoire
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes, distance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [null, 'running', 'Endurance', dateStr, '07:30', 60, 'Sortie matinale oxygénation', dayOfWeek === 0 ? 12.5 : 8.2]
      );
      count++;
    } else {
      // Autres jours : Muscu (Basic-Fit)
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, date, start_time, duration_minutes, muscles, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.basicFit, 'musculation', dateStr, '06:30', 75, 'Pectoraux, Bras', 'Séance force et volume']
      );
      count++;
    }

    // --- SÉANCE DU SOIR (18h30) --- 
    // On rajoute une 2ème séance 4 fois par semaine (Lun, Mar, Jeu, Ven)
    if ([1, 2, 4, 5].includes(dayOfWeek)) {
      // JJB (Gracie Barra) le soir
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.gracieBarra, 'jjb', 'Sparring', dateStr, '18:30', 90, 'Drills techniques + 5 rounds de 6min']
      );
      count++;
    }
  }

  logger.info(`TOTAL Houari : ${count} entraînements générés (MMA Spirit!)`);
  return count;
};

// ============================================
// GÉNÉRATION DES DONNÉES DE SOMMEIL
// ============================================
const generateSleepData = () => {
  const sleepEntries = [];
  const days = 180; // 6 MOIS DE DONNÉES!

  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), days - i);
    const dayOfWeek = date.getDay();

    // Sommeil plus long le weekend, plus court en semaine
    let baseDuration;
    let bedTime;
    let wakeTime;

    if ([0, 6].includes(dayOfWeek)) {
      // Weekend : 8h-9h de sommeil
      baseDuration = 8.5 * 60; // 8h30
      bedTime = '00:15';
      wakeTime = '08:45';
    } else {
      // Semaine : 7h30-8h de sommeil
      baseDuration = 7.75 * 60; // 7h45
      bedTime = '23:15';
      wakeTime = '07:00';
    }

    // Petites variations naturelles
    const variation = (Math.sin(i * 0.4) * 20) + (Math.random() - 0.5) * 20; // ±20-40min
    const duration = Math.max(420, Math.round(baseDuration + variation)); // Minimum 7h

    // Qualité : majoritairement 4-5 étoiles (bon sommeil)
    let quality;
    if (duration >= 480) {
      quality = 5; // 8h+ = 5 étoiles
    } else if (duration >= 450) {
      quality = Math.random() < 0.7 ? 5 : 4; // 7h30-8h = souvent 5
    } else if (duration >= 420) {
      quality = 4; // 7h-7h30 = 4 étoiles
    } else {
      quality = 3; // Moins de 7h = 3 étoiles
    }

    sleepEntries.push({
      id: `sleep_${date.getTime()}`,
      date: format(date, 'yyyy-MM-dd'),
      bedTime,
      wakeTime,
      duration,
      quality,
      notes: quality === 5 ? 'Sommeil récupérateur' : quality === 4 ? 'Bonne nuit' : '',
    });
  }

  return sleepEntries;
};

// ============================================
// GÉNÉRATION DES DONNÉES D'HYDRATATION
// ============================================
const generateHydrationData = async () => {
  const days = 30;

  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), days - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();

    // Hydratation basée sur les jours d'entraînement
    let baseHydration;

    if ([1, 2, 3, 5, 6].includes(dayOfWeek)) {
      // Jours d'entraînement : 2.8L - 3.5L
      baseHydration = 2800 + Math.random() * 700;
    } else {
      // Repos : 2.2L - 2.8L
      baseHydration = 2200 + Math.random() * 600;
    }

    // Petites variations pour réalisme
    const variation = (Math.sin(i * 0.5) * 200);
    const finalHydration = Math.round(baseHydration + variation);

    await AsyncStorage.setItem(`hydration_${dateStr}`, finalHydration.toString());
  }
};

// ============================================
// CLUBS DE SPORT - INSERTION SQLITE
// ============================================
interface ClubIds {
  gracieBarra: number;
  basicFit: number;
}

const createClubs = async (): Promise<ClubIds> => {
  const database = await openDatabase();

  // Gracie Barra (JJB)
  const gbResult = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    ['Gracie Barra Marseille', 'jjb', 'gracie-barra', '#EF4444']
  );

  // Basic Fit (Musculation)
  const bfResult = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    ['Basic-Fit Prado', 'musculation', 'basic-fit', '#FF6B00']
  );

  logger.info(`2 clubs créés avec logos: Gracie Barra (JJB), Basic-Fit (Muscu)`);

  return {
    gracieBarra: gbResult.lastInsertRowId,
    basicFit: bfResult.lastInsertRowId,
  };
};

// ============================================
// PLANNING HEBDOMADAIRE - FITNESS TRANSFORMATION
// ============================================
const generateWeeklyPlan = async (clubIds: ClubIds): Promise<void> => {
  const database = await openDatabase();

  const plan = [
    { day: 1, club_id: clubIds.basicFit, sport: 'musculation', time: '06:30', duration: 75, muscles: 'pectoraux,triceps', is_rest: 0, session_type: 'Push' },
    { day: 1, club_id: clubIds.gracieBarra, sport: 'jjb', time: '18:30', duration: 90, is_rest: 0, session_type: 'Technique' },
    { day: 2, club_id: clubIds.basicFit, sport: 'musculation', time: '06:30', duration: 75, muscles: 'dos,biceps', is_rest: 0, session_type: 'Pull' },
    { day: 2, club_id: clubIds.gracieBarra, sport: 'jjb', time: '18:30', duration: 90, is_rest: 0, session_type: 'Sparring' },
    { day: 3, club_id: null, sport: 'running', time: '07:30', duration: 60, is_rest: 0, session_type: 'Cardio' },
    { day: 4, club_id: clubIds.basicFit, sport: 'musculation', time: '06:30', duration: 75, muscles: 'jambes', is_rest: 0, session_type: 'Legs' },
    { day: 4, club_id: clubIds.gracieBarra, sport: 'jjb', time: '18:30', duration: 90, is_rest: 0, session_type: 'Technique' },
    { day: 5, club_id: clubIds.basicFit, sport: 'musculation', time: '06:30', duration: 75, muscles: 'épaules', is_rest: 0, session_type: 'Shoulders' },
    { day: 5, club_id: clubIds.gracieBarra, sport: 'jjb', time: '18:30', duration: 90, is_rest: 0, session_type: 'Sparring' },
    { day: 6, club_id: clubIds.gracieBarra, sport: 'jjb', time: '10:00', duration: 120, is_rest: 0, session_type: 'Open Mat' },
    { day: 0, club_id: null, sport: 'running', time: '08:00', duration: 90, is_rest: 0, session_type: 'Long Run' },
  ];

  for (const item of plan) {
    await database.runAsync(
      `INSERT INTO weekly_plan (day_of_week, club_id, sport, time, duration_minutes, muscles, is_rest_day, session_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.day, item.club_id, item.sport, item.time, item.duration, (item as any).muscles || null, item.is_rest, item.session_type]
    );
  }

  logger.info(`Planning hebdomadaire créé: 10 séances/semaine avec 3 clubs FITNESS, AVEC LOGOS`);
};

// ============================================
// BADGES DÉBLOQUÉS (3 mois de progression)
// ============================================
const generateUnlockedBadges = () => {
  return [
    'first_weight',
    'first_week',
    'first_month',
    'three_months',
    'streak_7',
    'streak_14',
    'streak_30',
    'streak_60',
    'weight_lost_3kg',
    'weight_lost_5kg',
    'trainings_10',
    'trainings_25',
    'trainings_50',
    'trainings_75',
    'perfect_week',
    'perfect_month',
    'early_riser',
    'night_owl',
    'warrior',
    'consistent',
    'dedicated',
    'hydration_master',
    'sleep_champion',
    'transformation_started',
  ];
};

// ============================================
// GÉNÉRATION DES BLESSURES
// ============================================
const generateInjuries = () => {
  return [
    {
      id: '1',
      date: format(subDays(new Date(), 45), 'yyyy-MM-dd'),
      type: 'Contusion',
      location: 'Genou droit',
      severity: 'Légère',
      origin: 'Run & Fit Marseille - Sprint fractionné',
      status: 'Guérie',
      notes: 'Léger choc pendant entraînement intensif. Glace appliquée.',
      recoveryDays: 5,
    },
    {
      id: '2',
      date: format(subDays(new Date(), 20), 'yyyy-MM-dd'),
      type: 'Douleur musculaire',
      location: 'Épaule droite',
      severity: 'Légère',
      origin: 'Urban Street Workout - Muscle-up progressions',
      status: 'En rééducation',
      notes: 'Tendinite légère. Repos + étirements. Éviter mouvements au-dessus de la tête.',
      recoveryDays: 14,
    },
    {
      id: '3',
      date: format(subDays(new Date(), 8), 'yyyy-MM-dd'),
      type: 'Ampoule',
      location: 'Main droite',
      severity: 'Mineure',
      origin: 'Urban Street Workout - Tractions',
      status: 'Guérie',
      notes: 'Ampoule due aux barres de traction. Bandage + pansement.',
      recoveryDays: 3,
    },
  ];
};

// ============================================
// GÉNÉRATION DE LA CHARGE D'ENTRAÎNEMENT (Format quotidien pour le graphique)
// ============================================
const generateTrainingLoads = () => {
  const loads: any[] = [];
  const days = 14; // 2 semaines de données

  // Pattern équilibré pour charge hebdomadaire ~2000-2200 (niveau "Modéré" - vert)
  // Formule: charge = RPE x durée
  // Objectif semaine: 5 séances x ~400 = 2000 points
  const weekPattern = [
    { hasTraining: true, rpe: 7, duration: 60 },   // Lun - JJB (420)
    { hasTraining: true, rpe: 7, duration: 55 },   // Mar - MMA (385)
    { hasTraining: false, rpe: 0, duration: 0 },   // Mer - REPOS
    { hasTraining: true, rpe: 6, duration: 50 },   // Jeu - Muscu (300)
    { hasTraining: true, rpe: 7, duration: 60 },   // Ven - Grappling (420)
    { hasTraining: true, rpe: 5, duration: 60 },   // Sam - Open Mat (300)
    { hasTraining: false, rpe: 0, duration: 0 },   // Dim - REPOS
  ];
  // Total semaine: 420+385+300+420+300 = 1825 (~safe/modéré)

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayOfWeek = date.getDay(); // 0=Dim, 1=Lun, etc.

    // Convertir au format Lun=0, Mar=1, etc.
    const patternIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const pattern = weekPattern[patternIndex];

    if (pattern.hasTraining) {
      // Légère variation pour rendre le graphique naturel
      const rpeVariation = Math.round(Math.random() * 1 - 0.5); // -0.5 à +0.5
      const durationVariation = Math.round(Math.random() * 10 - 5); // -5 à +5 min

      const rpe = Math.max(1, Math.min(10, pattern.rpe + rpeVariation));
      const duration = Math.max(30, pattern.duration + durationVariation);
      const load = duration * rpe;

      loads.push({
        trainingId: 1000 + (days - i),
        date: format(date, 'yyyy-MM-dd'),
        duration,
        rpe,
        load,
        sport: patternIndex === 0 || patternIndex === 4 ? 'jjb' :
               patternIndex === 1 ? 'mma' :
               patternIndex === 3 ? 'musculation' : 'grappling',
        mode: 'combat',
      });

    }
  }

  return loads;
};

// Version legacy pour compatibilité
const generateTrainingLoad = () => {
  const weeks = [];
  const totalWeeks = 12;

  for (let i = 0; i < totalWeeks; i++) {
    const weekDate = subDays(new Date(), (totalWeeks - i - 1) * 7);
    const baseLoad = 250 + (i * 12);
    const variation = (Math.sin(i * 0.5) * 30) + (Math.random() - 0.5) * 20;
    const load = Math.round(baseLoad + variation);

    weeks.push({
      weekStart: format(weekDate, 'yyyy-MM-dd'),
      load,
      sessions: i < 4 ? 4 : 5,
      totalDuration: i < 4 ? 240 : 305,
      avgIntensity: 7.5 + (i * 0.08),
    });
  }

  return weeks;
};

// ============================================
// GÉNÉRATION DES DONNÉES DE CHARGE (BATTERIE)
// ============================================
const generateBatteryData = () => {
  const days = 180; // 6 MOIS DE DONNÉES!
  const batteryData = [];

  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), days - i - 1);
    const dayOfWeek = date.getDay();

    // Batterie basée sur le planning d'entraînement
    let batteryLevel;
    let sleepScore;
    let nutrition;
    let recovery;
    let stress;

    if (dayOfWeek === 0) {
      // Dimanche = REPOS COMPLET
      batteryLevel = 88 + Math.random() * 8; // 88-96%
      sleepScore = 8.5;
      nutrition = 90;
      recovery = 95;
      stress = 15;
    } else if ([1, 6].includes(dayOfWeek)) {
      // Lundi/Samedi = Journées doubles (JJB + Muscu)
      batteryLevel = 65 + Math.random() * 10; // 65-75%
      sleepScore = 7.5;
      nutrition = 85;
      recovery = 70;
      stress = 35;
    } else if ([2, 4].includes(dayOfWeek)) {
      // Mardi/Jeudi = Muscu seule
      batteryLevel = 75 + Math.random() * 10; // 75-85%
      sleepScore = 8.0;
      nutrition = 88;
      recovery = 80;
      stress = 25;
    } else {
      // Mercredi/Vendredi = JJB ou HYROX
      batteryLevel = 70 + Math.random() * 10; // 70-80%
      sleepScore = 7.8;
      nutrition = 86;
      recovery = 75;
      stress = 28;
    }

    batteryData.push({
      date: format(date, 'yyyy-MM-dd'),
      level: Math.round(batteryLevel),
      sleep: sleepScore,
      nutrition: Math.round(nutrition),
      recovery: Math.round(recovery),
      stress: Math.round(stress),
    });
  }

  return batteryData;
};

// ============================================
// GÉNÉRATION DES PHOTOS DE TRANSFORMATION
// ============================================
const generatePhotos = async (): Promise<void> => {
  const database = await openDatabase();

  // Photo de début (il y a 180 jours - 6 mois)
  const startDate = format(subDays(new Date(), 180), 'yyyy-MM-dd');
  await database.runAsync(
    `INSERT INTO photos (uri, weight, fat_percent, muscle_percent, date, is_blurred) VALUES (?, ?, ?, ?, ?, ?)`,
    ['demo_photo_start', 85.0, 20.0, 40.0, startDate, 1] // Floutée par défaut
  );

  // Photo intermédiaire (il y a 45 jours)
  const midDate = format(subDays(new Date(), 45), 'yyyy-MM-dd');
  await database.runAsync(
    `INSERT INTO photos (uri, weight, fat_percent, muscle_percent, date, is_blurred) VALUES (?, ?, ?, ?, ?, ?)`,
    ['demo_photo_mid', 81.5, 18.0, 41.5, midDate, 1]
  );

  // Photo actuelle (aujourd'hui)
  const currentDate = format(new Date(), 'yyyy-MM-dd');
  await database.runAsync(
    `INSERT INTO photos (uri, weight, fat_percent, muscle_percent, date, is_blurred) VALUES (?, ?, ?, ?, ?, ?)`,
    ['demo_photo_current', 78.2, 16.0, 43.0, currentDate, 1]
  );

  logger.info('3 photos de transformation ajoutées');
};

// ============================================
// GÉNÉRATION DES COMPÉTITIONS À VENIR
// ============================================
const generateCompetitions = async (): Promise<void> => {
  const database = await openDatabase();

  // S'assurer que la colonne type_evenement existe
  try {
    await database.execAsync(`ALTER TABLE competitions ADD COLUMN type_evenement TEXT;`);
  } catch (e) { /* colonne existe déjà */ }

  // Compétition 1 : Open de JJB dans 15 jours
  const comp1Date = format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  await database.runAsync(
    `INSERT INTO competitions (nom, date, lieu, sport, categorie_poids, statut, lien_inscription) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Open de Marseille JJB', comp1Date, 'Marseille', 'jjb', '-77kg', 'a_venir', 'https://smoothcomp.com']
  );

  // Compétition 2 : HYROX dans 45 jours
  const comp2Date = format(new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
  await database.runAsync(
    `INSERT INTO competitions (nom, date, lieu, sport, categorie_poids, statut, lien_inscription) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['HYROX Paris', comp2Date, 'Paris', 'autre', 'Open', 'a_venir', 'https://hyroxfrance.com']
  );

  logger.info('2 compétitions à venir ajoutées');
};

// ============================================
// GÉNÉRATION DES DONNÉES TEMPS RÉEL POUR ACCUEIL
// ============================================
const generateTodayData = async (): Promise<void> => {
  const today = format(new Date(), 'yyyy-MM-dd');

  // ============================================
  // OBJECTIF DE POIDS - Bien visible pour screenshots
  // ============================================
  // Poids départ: 98.5kg → Objectif: 76kg → Actuel: 76.8kg
  await AsyncStorage.setItem('@yoroi_start_weight', '98.5');
  await AsyncStorage.setItem('@yoroi_target_weight', '76.0');
  await AsyncStorage.setItem('@yoroi_current_weight', '76.8');
  // Poids perdu calculé: 98.5 - 76.8 = 21.7kg - TRANSFORMATION!
  await AsyncStorage.setItem('@yoroi_weight_lost', '21.7');
  // Reste à perdre: 76.8 - 76 = 0.8kg (presque au but!)
  await AsyncStorage.setItem('@yoroi_weight_remaining', '0.8');
  // Progression: (21.7 / 22.5) * 100 = 96.4% - PRESQUE LÀ!
  await AsyncStorage.setItem('@yoroi_weight_progress', '96.4');

  // ============================================
  // PAS QUOTIDIENS - 13567 pas - IMPRESSIONNANT!
  // ============================================
  await AsyncStorage.setItem('@yoroi_steps_today', '13567');
  await AsyncStorage.setItem('@yoroi_steps_goal', '10000');
  // Historique des pas sur 7 jours - VARIÉS ET IMPRESSIONNANTS
  const stepsHistoryShort = [
    { date: format(subDays(new Date(), 6), 'yyyy-MM-dd'), steps: 15234 },
    { date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), steps: 11456 },
    { date: format(subDays(new Date(), 4), 'yyyy-MM-dd'), steps: 18923 },
    { date: format(subDays(new Date(), 3), 'yyyy-MM-dd'), steps: 8234 },
    { date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), steps: 14567 },
    { date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), steps: 12890 },
    { date: today, steps: 13567 },
  ];
  await AsyncStorage.setItem('@yoroi_steps_history', JSON.stringify(stepsHistoryShort));

  // Hydratation d'aujourd'hui : 3.2L / 3.5L - CHAMPION!
  await AsyncStorage.setItem(`hydration_${today}`, '3200');
  await AsyncStorage.setItem('@yoroi_hydration_goal', '3500');
  await AsyncStorage.setItem('@yoroi_hydration_current', '3200');

  // Sommeil d'hier : 7h48, qualité 5/5 - RÉCUPÉRATION PARFAITE!
  const sleepEntries = [
    {
      id: `sleep_${Date.now()}`,
      date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      bedTime: '23:15',
      wakeTime: '07:03',
      duration: 468, // 7h48 en minutes
      quality: 5,
      deepSleepPercent: 26,
      remSleepPercent: 23,
      notes: 'Récupération optimale',
    }
  ];
  await AsyncStorage.setItem('@yoroi_sleep_entries', JSON.stringify(sleepEntries));
  await AsyncStorage.setItem('@yoroi_sleep_goal', '480'); // 8h
  await AsyncStorage.setItem('@yoroi_sleep_last_duration', '468');
  await AsyncStorage.setItem('@yoroi_sleep_quality', '89');

  // Charge actuelle : Optimal, niveau athlète!
  const batteryData = {
    date: today,
    level: 92, // Niveau élevé!
    sleep: 7.8,
    nutrition: 95,
    recovery: 88,
    stress: 15, // Stress bas = bonne gestion mentale
  };
  await AsyncStorage.setItem('@yoroi_battery_today', JSON.stringify(batteryData));

  // SpO2 et données vitales
  await AsyncStorage.setItem('@yoroi_spo2_current', '99');
  await AsyncStorage.setItem('@yoroi_resting_heart_rate', '54');
  await AsyncStorage.setItem('@yoroi_hrv_current', '62');

  // Événements sportifs sauvegardés dans le planning
  const savedEvents = [
    {
      id: 'event_1',
      title: 'IBJJF Paris Open',
      date_start: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      location: {
        city: 'Paris',
        country: 'France',
        full_address: 'Paris, France'
      },
      category: 'combat' as const,
      sport_tag: 'jjb' as const,
      registration_link: 'https://ibjjf.com',
      federation: 'IBJJF',
      image_logo_url: null,
    },
    {
      id: 'event_2',
      title: 'HYROX Marseille',
      date_start: format(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      location: {
        city: 'Marseille',
        country: 'France',
        full_address: 'Marseille, France'
      },
      category: 'endurance' as const,
      sport_tag: 'hyrox' as const,
      registration_link: 'https://hyroxfrance.com',
      federation: 'HYROX',
      image_logo_url: null,
    },
  ];
  await AsyncStorage.setItem('my_planning', JSON.stringify(savedEvents));

  logger.info('Données temps réel pour accueil ajoutées');
  logger.info('   • Hydratation: 2.8L / 3L');
  logger.info('   • Sommeil: 7.5h (qualité 5/5)');
  logger.info('   • Charge: Optimal (85%)');
  logger.info('   • Événements sauvegardés: 2');
};

// ============================================
// GÉNÉRATION DES AVATARS DÉBLOQUÉS
// ============================================
const generateAvatars = async () => {
  // Avatar sélectionné: Samurai (masculin)
  const selectedAvatar = {
    pack: 'samurai',
    gender: 'male',
  };
  await AsyncStorage.setItem('@yoroi_avatar_config', JSON.stringify(selectedAvatar));

  // Avatars débloqués (15 avatars variés)
  const unlockedAvatars = [
    'ninja', 'samurai', 'boxer', 'champion', 'emperor',
    'judoka', 'karateka', 'mma', 'oni', 'ronin',
    'shogun', 'wrestler', 'bjj', 'pack_combat', 'pack_femmes'
  ];
  await AsyncStorage.setItem('@yoroi_unlocked_avatars', JSON.stringify(unlockedAvatars));

  logger.info(`Avatar sélectionné: Samurai (masculin)`);
  logger.info(`${unlockedAvatars.length} avatars débloqués`);
};

// ============================================
// GÉNÉRATION DES DONNÉES APPLE HEALTH COMPLÈTES
// ============================================
const generateAppleHealthData = async () => {
  const days = 180; // 6 MOIS DE DONNÉES!

  // ============================================
  // PAS QUOTIDIENS (180 jours / 6 MOIS) - VERSION IMPRESSIONNANTE
  // ============================================
  const stepsHistory = [];
  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), days - i - 1);
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    const daysFromEnd = days - i - 1;

    // Variation basée sur le type de jour - AUGMENTÉE pour screenshots!
    let baseSteps;
    if ([1, 2, 4, 5].includes(dayOfWeek)) {
      // Jours d'entraînement: 9000-14000 pas (impressionnant!)
      baseSteps = 9000 + Math.random() * 5000;
    } else if (dayOfWeek === 6) {
      // Samedi: 12000-18000 pas (super actif!)
      baseSteps = 12000 + Math.random() * 6000;
    } else {
      // Dimanche/Mercredi repos: 6000-9000 pas (même au repos c'est bien!)
      baseSteps = 6000 + Math.random() * 3000;
    }

    // Dernière semaine: variations VISIBLES pour les screenshots
    if (daysFromEnd <= 7) {
      const weekPattern = [15234, 11456, 18923, 8234, 14567, 12890, 16432, 13567];
      baseSteps = weekPattern[7 - daysFromEnd] || baseSteps;
    }

    const variation = Math.sin(i * 0.3) * 800;
    const steps = Math.round(baseSteps + variation);

    stepsHistory.push({
      date: dateStr,
      steps,
    });
  }
  await AsyncStorage.setItem('@yoroi_steps_history', JSON.stringify(stepsHistory));
  // Set today's steps to a nice round impressive number
  await AsyncStorage.setItem('@yoroi_steps_today', '13567');
  await AsyncStorage.setItem('@yoroi_steps_goal', '10000');
  logger.info(`${days} jours de pas générés (6000-18000 pas/jour - IMPRESSIVE!)`);

  // ============================================
  // CALORIES BRÛLÉES (180 jours / 6 MOIS) - MONSTER BURNS!
  // ============================================
  const caloriesHistory = [];
  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), days - i - 1);
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    const daysFromEnd = days - i - 1;

    // Calories basées sur l'activité du jour - AUGMENTÉES!
    let baseCalories;
    if ([1, 2, 4, 5].includes(dayOfWeek)) {
      // Jours d'entraînement intensif: 650-950 kcal (double séances!)
      baseCalories = 650 + Math.random() * 300;
    } else if (dayOfWeek === 6) {
      // Samedi (Open Mat intense): 750-1100 kcal
      baseCalories = 750 + Math.random() * 350;
    } else {
      // Repos actif: 350-500 kcal
      baseCalories = 350 + Math.random() * 150;
    }

    // Dernière semaine: patterns impressionnants
    if (daysFromEnd <= 7) {
      const weekPattern = [923, 654, 1087, 412, 876, 745, 968, 832];
      baseCalories = weekPattern[7 - daysFromEnd] || baseCalories;
    }

    const variation = Math.sin(i * 0.4) * 80;
    const calories = Math.round(baseCalories + variation);

    caloriesHistory.push({
      date: dateStr,
      calories,
    });
  }
  await AsyncStorage.setItem('@yoroi_calories_history', JSON.stringify(caloriesHistory));
  await AsyncStorage.setItem('@yoroi_calories_today', '832');
  await AsyncStorage.setItem('@yoroi_calories_goal', '600');
  logger.info(`${days} jours de calories générés (350-1100 kcal/jour - BEAST MODE!)`);

  // ============================================
  // DISTANCE PARCOURUE (180 jours / 6 MOIS en km) - COUREUR!
  // ============================================
  const distanceHistory = [];
  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), days - i - 1);
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');
    const daysFromEnd = days - i - 1;

    // Distance basée sur les pas - AUGMENTÉE!
    let baseDistance;
    if ([1, 2, 4, 5].includes(dayOfWeek)) {
      // Jours d'entraînement: 7.5-12 km (running + training)
      baseDistance = 7.5 + Math.random() * 4.5;
    } else if (dayOfWeek === 6) {
      // Samedi: 10-15 km (longue sortie)
      baseDistance = 10.0 + Math.random() * 5.0;
    } else {
      // Repos actif: 5.0-8.0 km
      baseDistance = 5.0 + Math.random() * 3.0;
    }

    // Dernière semaine: patterns visibles
    if (daysFromEnd <= 7) {
      const weekPattern = [11.2, 8.4, 14.1, 6.2, 10.8, 9.5, 12.3, 10.1];
      baseDistance = weekPattern[7 - daysFromEnd] || baseDistance;
    }

    const variation = Math.sin(i * 0.3) * 0.8;
    const distance = Math.round((baseDistance + variation) * 10) / 10;

    distanceHistory.push({
      date: dateStr,
      distance,
    });
  }
  await AsyncStorage.setItem('@yoroi_distance_history', JSON.stringify(distanceHistory));
  await AsyncStorage.setItem('@yoroi_distance_today', '10.1');
  await AsyncStorage.setItem('@yoroi_distance_goal', '8.0');
  logger.info(`${days} jours de distance générés (5-15 km/jour - RUNNER!)`);

  // ============================================
  // FRÉQUENCE CARDIAQUE MOYENNE (30 jours récents) - ATHLÈTE PRO
  // ============================================
  const heartRateHistory = [];
  for (let i = 0; i < 30; i++) {
    const date = subDays(new Date(), 30 - i - 1);
    const dateStr = format(date, 'yyyy-MM-dd');

    // FC au repos: 52-58 bpm (niveau athlète élite!)
    const restingHR = 52 + Math.round(Math.random() * 6);
    // FC moyenne: 68-78 bpm (très efficient)
    const avgHR = 68 + Math.round(Math.random() * 10);
    // FC max du jour: 175-195 bpm (haute intensité!)
    const maxHR = 175 + Math.round(Math.random() * 20);

    heartRateHistory.push({
      date: dateStr,
      resting: restingHR,
      average: avgHR,
      max: maxHR,
    });
  }
  await AsyncStorage.setItem('@yoroi_heart_rate_history', JSON.stringify(heartRateHistory));
  await AsyncStorage.setItem('@yoroi_resting_heart_rate', '54'); // Niveau athlète!
  await AsyncStorage.setItem('@yoroi_current_heart_rate', '72');
  logger.info(`30 jours de fréquence cardiaque générés (repos: 52-58 bpm - ATHLÈTE!)`);

  // ============================================
  // SPO2 / SATURATION EN OXYGÈNE (30 jours) - NOUVEAU!
  // ============================================
  const spo2History = [];
  for (let i = 0; i < 30; i++) {
    const date = subDays(new Date(), 30 - i - 1);
    const dateStr = format(date, 'yyyy-MM-dd');

    // SpO2: 97-100% (excellente santé!)
    const spo2 = 97 + Math.round(Math.random() * 3);
    // SpO2 minimum nocturne: 94-97%
    const minSpo2 = 94 + Math.round(Math.random() * 3);

    spo2History.push({
      date: dateStr,
      average: spo2,
      min: minSpo2,
      max: 100,
    });
  }
  await AsyncStorage.setItem('@yoroi_spo2_history', JSON.stringify(spo2History));
  await AsyncStorage.setItem('@yoroi_spo2_current', '99'); // Parfait!
  logger.info(`30 jours de SpO2 générés (97-100% - SANTÉ PARFAITE!)`);

  // ============================================
  // VARIABILITÉ CARDIAQUE HRV (30 jours) - NOUVEAU!
  // ============================================
  const hrvHistory = [];
  for (let i = 0; i < 30; i++) {
    const date = subDays(new Date(), 30 - i - 1);
    const dateStr = format(date, 'yyyy-MM-dd');

    // HRV: 45-75 ms (bon niveau pour athlète)
    const hrv = 45 + Math.round(Math.random() * 30);

    hrvHistory.push({
      date: dateStr,
      hrv,
    });
  }
  await AsyncStorage.setItem('@yoroi_hrv_history', JSON.stringify(hrvHistory));
  await AsyncStorage.setItem('@yoroi_hrv_current', '62'); // Bon récupération!
  logger.info(`30 jours de HRV générés (45-75 ms - BONNE RÉCUPÉRATION!)`);

  // ============================================
  // DONNÉES SOMMEIL IMPRESSIONNANTES (30 jours)
  // ============================================
  const sleepHistory = [];
  for (let i = 0; i < 30; i++) {
    const date = subDays(new Date(), 30 - i - 1);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();

    // Durée sommeil: 7-9h selon le jour
    let sleepHours;
    if ([0, 6].includes(dayOfWeek)) {
      // Weekend: 8-9h de sommeil
      sleepHours = 8 + Math.random();
    } else {
      // Semaine: 7-8h de sommeil
      sleepHours = 7 + Math.random();
    }

    const sleepMinutes = Math.round(sleepHours * 60);
    // Qualité: 75-95%
    const quality = 75 + Math.round(Math.random() * 20);
    // Sommeil profond: 20-30%
    const deepSleep = 20 + Math.round(Math.random() * 10);
    // Sommeil REM: 20-25%
    const remSleep = 20 + Math.round(Math.random() * 5);

    sleepHistory.push({
      date: dateStr,
      duration: sleepMinutes,
      quality,
      deepSleepPercent: deepSleep,
      remSleepPercent: remSleep,
      lightSleepPercent: 100 - deepSleep - remSleep,
    });
  }
  await AsyncStorage.setItem('@yoroi_sleep_history', JSON.stringify(sleepHistory));
  await AsyncStorage.setItem('@yoroi_sleep_last_night', JSON.stringify({
    duration: 468, // 7h48
    quality: 89,
    deepSleepPercent: 26,
    remSleepPercent: 23,
    bedTime: '23:15',
    wakeTime: '07:03',
  }));
  logger.info(`30 jours de sommeil générés (7-9h, 75-95% qualité)`);
};

// ============================================
// GÉNÉRATION DU PALMARES (Compétitions passées)
// ============================================
const generatePalmares = async () => {
  const database = await openDatabase();

  // Ajouter les colonnes manquantes pour le palmares (si elles n'existent pas)
  const columnsToAdd = [
    'resultat TEXT',
    'placement TEXT',
    'adversaires INTEGER',
    'victoires INTEGER',
    'defaites INTEGER',
    'notes TEXT',
    'temps_total TEXT',
  ];

  for (const column of columnsToAdd) {
    try {
      await database.execAsync(`ALTER TABLE competitions ADD COLUMN ${column};`);
    } catch (e) {
      // Colonne existe déjà, on ignore
    }
  }

  const palmares = [
    {
      date: format(subDays(new Date(), 180), 'yyyy-MM-dd'),
      nom: 'Open de Nice JJB',
      lieu: 'Nice',
      sport: 'jjb',
      categorie_poids: '-82kg',
      resultat: 'Médaille de Bronze',
      placement: '3ème place',
      adversaires: 8,
      victoires: 3,
      defaites: 1,
      notes: 'Excellente performance. Soumission par triangle en quart de finale.',
      type_evenement: 'competition',
    },
    {
      date: format(subDays(new Date(), 120), 'yyyy-MM-dd'),
      nom: 'HYROX Lyon',
      lieu: 'Lyon',
      sport: 'autre',
      categorie_poids: 'Open Men',
      resultat: 'Terminé',
      placement: '45ème/250',
      temps_total: '1h18min',
      notes: 'Premier HYROX, temps honorable. Beaucoup progressé sur les Burpees Broad Jumps.',
      type_evenement: 'competition',
    },
    {
      date: format(subDays(new Date(), 60), 'yyyy-MM-dd'),
      nom: 'Open de Marseille JJB',
      lieu: 'Marseille',
      sport: 'jjb',
      categorie_poids: '-77kg',
      resultat: 'Médaille d\'Argent',
      placement: '2ème place',
      adversaires: 12,
      victoires: 5,
      defaites: 1,
      notes: 'Perdu en finale par avantages. Très belle compétition, technique solide.',
      type_evenement: 'competition',
    },
  ];

  for (const comp of palmares) {
    await database.runAsync(
      `INSERT INTO competitions (nom, date, lieu, sport, categorie_poids, statut, resultat, placement, adversaires, victoires, defaites, notes, type_evenement, temps_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        comp.nom,
        comp.date,
        comp.lieu,
        comp.sport,
        comp.categorie_poids,
        'terminee',
        comp.resultat,
        comp.placement,
        comp.adversaires || null,
        comp.victoires || null,
        comp.defaites || null,
        comp.notes,
        comp.type_evenement,
        comp.temps_total || null,
      ]
    );
  }

  logger.info(`3 compétitions passées ajoutées au palmares`);
  logger.info(`   • Open Nice: 🥉 Bronze (-82kg)`);
  logger.info(`   • HYROX Lyon: 45ème/250 (1h18)`);
  logger.info(`   • Open Marseille: 🥈 Argent (-77kg)`);
};

// ============================================
// GÉNÉRATION DES DÉFIS ET QUÊTES GAMIFICATION
// ============================================
const generateChallengesAndQuests = async () => {
  // ============================================
  // DÉFIS QUOTIDIENS
  // ============================================
  const dailyChallenges = [
    {
      id: 'daily_steps',
      title: '8000 pas',
      description: 'Atteindre 8000 pas aujourd\'hui',
      type: 'daily',
      progress: 7329,
      goal: 8000,
      completed: false,
      xpReward: 25,
      icon: 'footprints',
      color: '#3B82F6',
    },
    {
      id: 'daily_water',
      title: 'Hydratation',
      description: 'Boire 3L d\'eau',
      type: 'daily',
      progress: 2800,
      goal: 3000,
      completed: false,
      xpReward: 20,
      icon: 'droplet',
      color: '#06B6D4',
    },
    {
      id: 'daily_training',
      title: 'Entraînement',
      description: 'Compléter 1 séance',
      type: 'daily',
      progress: 1,
      goal: 1,
      completed: true,
      xpReward: 50,
      icon: 'dumbbell',
      color: '#10B981',
    },
  ];

  await AsyncStorage.setItem('@yoroi_daily_challenges', JSON.stringify(dailyChallenges));
  logger.info(`3 défis quotidiens générés (1/3 complété)`);

  // ============================================
  // DÉFIS HEBDOMADAIRES
  // ============================================
  const weeklyChallenges = [
    {
      id: 'weekly_trainings',
      title: 'Semaine intense',
      description: 'Compléter 5 entraînements cette semaine',
      type: 'weekly',
      progress: 4,
      goal: 5,
      completed: false,
      xpReward: 150,
      icon: 'flame',
      color: '#EF4444',
      daysRemaining: 2,
    },
    {
      id: 'weekly_weight',
      title: 'Régularité',
      description: 'Se peser 5 fois cette semaine',
      type: 'weekly',
      progress: 5,
      goal: 5,
      completed: true,
      xpReward: 100,
      icon: 'scale',
      color: '#8B5CF6',
      daysRemaining: 2,
    },
  ];

  await AsyncStorage.setItem('@yoroi_weekly_challenges', JSON.stringify(weeklyChallenges));
  logger.info(`2 défis hebdomadaires générés (1/2 complété)`);

  // ============================================
  // QUÊTES À LONG TERME
  // ============================================
  const quests = [
    {
      id: 'quest_weight_goal',
      title: 'Objectif de poids',
      description: 'Atteindre 77kg',
      type: 'quest',
      progress: 78.2,
      goal: 77.0,
      completed: false,
      xpReward: 500,
      icon: 'target',
      color: '#F59E0B',
      category: 'weight',
    },
    {
      id: 'quest_100_trainings',
      title: 'Centurion',
      description: 'Compléter 100 entraînements',
      type: 'quest',
      progress: 87,
      goal: 100,
      completed: false,
      xpReward: 750,
      icon: 'trophy',
      color: '#D4AF37',
      category: 'training',
    },
    {
      id: 'quest_streak_90',
      title: 'Semestre parfait',
      description: 'Maintenir un streak de 180 jours',
      type: 'quest',
      progress: 63,
      goal: 90,
      completed: false,
      xpReward: 1000,
      icon: 'flame',
      color: '#EF4444',
      category: 'streak',
    },
  ];

  await AsyncStorage.setItem('@yoroi_quests', JSON.stringify(quests));
  logger.info(`3 quêtes à long terme générées`);
};

// ============================================
// GÉNÉRATION DES DONNÉES DE JEÛNE INTERMITTENT
// ============================================
const generateFastingData = async () => {
  const fastingEntries = [];
  const days = 14; // 2 semaines de jeûne

  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), days - i - 1);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();

    // Type de jeûne: 16/8 en semaine, 18/6 le weekend
    let fastingType;
    let fastingHours;
    let eatingWindowStart;
    let eatingWindowEnd;
    let completed;

    if ([0, 6].includes(dayOfWeek)) {
      // Weekend: 18/6
      fastingType = '18:6';
      fastingHours = 18;
      eatingWindowStart = '12:00';
      eatingWindowEnd = '18:00';
      completed = true;
    } else {
      // Semaine: 16/8
      fastingType = '16:8';
      fastingHours = 16;
      eatingWindowStart = '12:00';
      eatingWindowEnd = '20:00';
      completed = Math.random() > 0.1; // 90% de réussite
    }

    // Dernière prise alimentaire la veille
    const lastMealTime = dayOfWeek === 1 ? '18:00' : '20:00'; // Dimanche soir à 18h, autres jours à 20h
    const firstMealTime = eatingWindowStart;

    fastingEntries.push({
      id: `fasting_${dateStr}`,
      date: dateStr,
      type: fastingType,
      fastingHours,
      startTime: lastMealTime,
      endTime: firstMealTime,
      eatingWindowStart,
      eatingWindowEnd,
      completed,
      note: completed ? 'Jeûne respecté' : 'Cassé plus tôt',
    });
  }

  await AsyncStorage.setItem('@yoroi_fasting_entries', JSON.stringify(fastingEntries));
  logger.info(`${days} jours de jeûne intermittent générés (16/8 et 18/6)`);
};

// ============================================
// GÉNÉRATION DE L'HISTORIQUE DU TIMER
// ============================================
const generateTimerHistory = async () => {
  const timerSessions = [
    {
      id: 'timer_1',
      date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      time: '19:45',
      type: 'Combat',
      rounds: 5,
      workDuration: 300, // 5min
      restDuration: 60, // 1min
      totalDuration: 1800, // 30min total
      completed: true,
      sport: 'jjb',
      notes: 'Sparring technique - 5 rounds de 5min',
    },
    {
      id: 'timer_2',
      date: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
      time: '07:15',
      type: 'Musculation',
      rounds: 4,
      workDuration: 45,
      restDuration: 90,
      totalDuration: 540, // 9min
      completed: true,
      sport: 'musculation',
      notes: 'Développé couché - 4 séries',
    },
    {
      id: 'timer_3',
      date: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
      time: '18:30',
      type: 'HIIT',
      rounds: 8,
      workDuration: 20,
      restDuration: 10,
      totalDuration: 240, // 4min (Tabata)
      completed: true,
      sport: 'autre',
      notes: 'Tabata Burpees',
    },
    {
      id: 'timer_4',
      date: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
      time: '10:00',
      type: 'EMOM',
      rounds: 10,
      workDuration: 60,
      restDuration: 0,
      totalDuration: 600, // 10min
      completed: true,
      sport: 'autre',
      notes: 'EMOM 10min - 10 Box Jumps',
    },
    {
      id: 'timer_5',
      date: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      time: '19:00',
      type: 'Combat',
      rounds: 3,
      workDuration: 300,
      restDuration: 60,
      totalDuration: 1080, // 18min
      completed: true,
      sport: 'mma',
      notes: 'MMA - 3 rounds de 5min',
    },
    {
      id: 'timer_6',
      date: format(subDays(new Date(), 8), 'yyyy-MM-dd'),
      time: '07:30',
      type: 'Musculation',
      rounds: 5,
      workDuration: 60,
      restDuration: 120,
      totalDuration: 900, // 15min
      completed: true,
      sport: 'musculation',
      notes: 'Squat - 5 séries de 5 reps',
    },
    {
      id: 'timer_7',
      date: format(subDays(new Date(), 10), 'yyyy-MM-dd'),
      time: '18:00',
      type: 'AMRAP',
      rounds: 1,
      workDuration: 1200, // 20min
      restDuration: 0,
      totalDuration: 1200,
      completed: true,
      sport: 'autre',
      notes: 'AMRAP 20min - Cindy',
    },
    {
      id: 'timer_8',
      date: format(subDays(new Date(), 12), 'yyyy-MM-dd'),
      time: '10:30',
      type: 'Tabata',
      rounds: 8,
      workDuration: 20,
      restDuration: 10,
      totalDuration: 240,
      completed: true,
      sport: 'autre',
      notes: 'Tabata Kettlebell Swings',
    },
  ];

  await AsyncStorage.setItem('@yoroi_timer_history', JSON.stringify(timerSessions));
  logger.info(`${timerSessions.length} sessions de timer générées (Combat, HIIT, EMOM, AMRAP, Tabata)`);
};

// ============================================
// GÉNÉRATION DES DONNÉES DU CARNET D'ENTRAÎNEMENT
// ============================================
const generateCarnetData = async (): Promise<number> => {
  let count = 0;
  const today = new Date();
  const yesterday = subDays(today, 1);
  const twoDaysAgo = subDays(today, 2);

  // 1. DÉVELOPPÉ COUCHÉ - 80kg x 6 reps (PR!)
  const benchCouche = await createBenchmark(
    'Développé Couché',
    'force' as BenchmarkCategory,
    'kg' as BenchmarkUnit,
    'dumbbell',
    '#EF4444'
  );
  if (benchCouche) {
    // Progression sur 3 entrées
    await addBenchmarkEntry(benchCouche.id, 70, 7, 'Première séance', subDays(today, 14), 8, 45, 280);
    await addBenchmarkEntry(benchCouche.id, 75, 8, 'Bonne progression', subDays(today, 7), 6, 50, 310);
    await addBenchmarkEntry(benchCouche.id, 80, 8, 'Nouveau PR!', today, 6, 55, 340);
    count += 3;
    logger.info('   Développé Couché: 80kg × 6 reps (PR)');
  }

  // 2. SQUAT - 100kg x 5 reps
  const squat = await createBenchmark(
    'Squat',
    'force' as BenchmarkCategory,
    'kg' as BenchmarkUnit,
    'dumbbell',
    '#EF4444'
  );
  if (squat) {
    await addBenchmarkEntry(squat.id, 90, 7, '', subDays(today, 10), 6, 40, 320);
    await addBenchmarkEntry(squat.id, 95, 8, '', subDays(today, 5), 5, 45, 350);
    await addBenchmarkEntry(squat.id, 100, 9, 'Lourd mais propre', yesterday, 5, 50, 380);
    count += 3;
    logger.info('   Squat: 100kg × 5 reps');
  }

  // 3. RUNNING 10KM - 36 minutes (pace: 3:36/km)
  const running10k = await createBenchmark(
    '10km',
    'running' as BenchmarkCategory,
    'km' as BenchmarkUnit,
    'footprints',
    '#3B82F6'
  );
  if (running10k) {
    // 36 minutes = 2160 seconds, distance = 10km
    // Pace = 2160/10 = 216 sec/km = 3:36/km
    await addBenchmarkEntry(running10k.id, 10, 7, 'Première sortie', subDays(today, 21), undefined, 42, 620); // 42min
    await addBenchmarkEntry(running10k.id, 10, 8, 'Bonne allure', subDays(today, 10), undefined, 38, 580); // 38min
    await addBenchmarkEntry(running10k.id, 10, 8, 'PR! 3:36/km', today, undefined, 36, 550); // 36min = PR
    count += 3;
    logger.info('   10km: 36min (allure 3:36/km) - PR!');
  }

  // 4. SEMI-MARATHON - 1h45
  const semiMarathon = await createBenchmark(
    'Semi-Marathon',
    'running' as BenchmarkCategory,
    'km' as BenchmarkUnit,
    'footprints',
    '#3B82F6'
  );
  if (semiMarathon) {
    await addBenchmarkEntry(semiMarathon.id, 21.1, 9, 'Semi de Marseille', subDays(today, 30), undefined, 105, 1450);
    count += 1;
    logger.info('   Semi-Marathon: 1h45');
  }

  // ============================================
  // NOUVEAUX BENCHMARKS MUSCULATION
  // ============================================

  // 5. SOULEVÉ DE TERRE - 140kg x 3 reps (PR!)
  const deadlift = await createBenchmark(
    'Soulevé de Terre',
    'force' as BenchmarkCategory,
    'kg' as BenchmarkUnit,
    'dumbbell',
    '#EF4444'
  );
  if (deadlift) {
    await addBenchmarkEntry(deadlift.id, 120, 7, 'Reprise après pause', subDays(today, 21), 5, 45, 350);
    await addBenchmarkEntry(deadlift.id, 130, 8, 'Bonne forme', subDays(today, 14), 4, 50, 380);
    await addBenchmarkEntry(deadlift.id, 140, 9, 'PR! Forme parfaite', subDays(today, 3), 3, 55, 420);
    count += 3;
    logger.info('   Soulevé de Terre: 140kg × 3 reps (PR)');
  }

  // 6. TRACTIONS - 15 reps (bodyweight)
  const pullups = await createBenchmark(
    'Tractions',
    'force' as BenchmarkCategory,
    'reps' as BenchmarkUnit,
    'dumbbell',
    '#EF4444'
  );
  if (pullups) {
    await addBenchmarkEntry(pullups.id, 10, 7, 'Série propre', subDays(today, 20), undefined, undefined, 80);
    await addBenchmarkEntry(pullups.id, 12, 8, 'Progression!', subDays(today, 10), undefined, undefined, 95);
    await addBenchmarkEntry(pullups.id, 15, 9, 'Nouveau record!', subDays(today, 2), undefined, undefined, 120);
    count += 3;
    logger.info('   Tractions: 15 reps (PR)');
  }

  // 7. MILITARY PRESS - 60kg x 6 reps
  const militaryPress = await createBenchmark(
    'Military Press',
    'force' as BenchmarkCategory,
    'kg' as BenchmarkUnit,
    'dumbbell',
    '#EF4444'
  );
  if (militaryPress) {
    await addBenchmarkEntry(militaryPress.id, 50, 7, '', subDays(today, 18), 8, 35, 200);
    await addBenchmarkEntry(militaryPress.id, 55, 8, 'Bon contrôle', subDays(today, 8), 6, 40, 230);
    await addBenchmarkEntry(militaryPress.id, 60, 8, 'PR épaules!', yesterday, 6, 42, 260);
    count += 3;
    logger.info('   Military Press: 60kg × 6 reps (PR)');
  }

  // 8. ROWING BARRE - 70kg x 8 reps
  const rowingBarre = await createBenchmark(
    'Rowing Barre',
    'force' as BenchmarkCategory,
    'kg' as BenchmarkUnit,
    'dumbbell',
    '#EF4444'
  );
  if (rowingBarre) {
    await addBenchmarkEntry(rowingBarre.id, 60, 7, '', subDays(today, 15), 10, 30, 180);
    await addBenchmarkEntry(rowingBarre.id, 65, 8, '', subDays(today, 7), 8, 35, 210);
    await addBenchmarkEntry(rowingBarre.id, 70, 8, 'Dos bien contracté', twoDaysAgo, 8, 38, 240);
    count += 3;
    logger.info('   Rowing Barre: 70kg × 8 reps');
  }

  // ============================================
  // NOUVEAUX BENCHMARKS RUNNING
  // ============================================

  // 9. 5KM - 19:30 (pace: 3:54/km)
  const running5k = await createBenchmark(
    '5km',
    'running' as BenchmarkCategory,
    'km' as BenchmarkUnit,
    'footprints',
    '#3B82F6'
  );
  if (running5k) {
    await addBenchmarkEntry(running5k.id, 5, 7, 'Sortie facile', subDays(today, 25), undefined, 22, 280); // 22min
    await addBenchmarkEntry(running5k.id, 5, 8, 'Tempo run', subDays(today, 12), undefined, 20, 260); // 20min
    await addBenchmarkEntry(running5k.id, 5, 9, 'PR! Sub 20', subDays(today, 4), undefined, 19.5, 245); // 19:30
    count += 3;
    logger.info('   5km: 19:30 (allure 3:54/km) - PR!');
  }

  // 10. TRAIL 15KM - 1h35
  const trail15k = await createBenchmark(
    'Trail 15km',
    'running' as BenchmarkCategory,
    'km' as BenchmarkUnit,
    'mountain',
    '#10B981'
  );
  if (trail15k) {
    await addBenchmarkEntry(trail15k.id, 15, 8, 'Calanques de Marseille 🏔️', subDays(today, 20), undefined, 95, 980);
    count += 1;
    logger.info('   Trail 15km: 1h35 (Calanques)');
  }

  // ============================================
  // TECHNIQUES JJB (existantes + nouvelles)
  // ============================================

  // 5. TECHNIQUES JJB

  // Berimbolo - En cours
  const berimbolo = await createSkill(
    'Berimbolo',
    'jjb_garde' as SkillCategory,
    'in_progress' as SkillStatus,
    'Travail sur le timing de l\'inversion. Focus sur le contrôle des hanches.'
  );
  if (berimbolo) {
    count++;
    logger.info('   Berimbolo: En cours');
  }

  // Triangle - Maîtrisé
  const triangle = await createSkill(
    'Triangle',
    'jjb_soumission' as SkillCategory,
    'mastered' as SkillStatus,
    'Maîtrisé depuis la garde fermée et la garde araignée. Bon angle de coupe.'
  );
  if (triangle) {
    count++;
    logger.info('   Triangle: Maîtrisé');
  }

  // Armbar - Maîtrisé
  const armbar = await createSkill(
    'Armbar (Juji Gatame)',
    'jjb_soumission' as SkillCategory,
    'mastered' as SkillStatus,
    'Transition fluide depuis le mount et la garde.'
  );
  if (armbar) {
    count++;
    logger.info('   Armbar: Maîtrisé');
  }

  // Passage de garde - En cours
  const passageGarde = await createSkill(
    'Passage Toreando',
    'jjb_passage' as SkillCategory,
    'in_progress' as SkillStatus,
    'Travail sur la pression et le timing. Enchaîner avec knee slide.'
  );
  if (passageGarde) {
    count++;
    logger.info('   Passage Toreando: En cours');
  }

  // Kimura - Maîtrisé
  const kimura = await createSkill(
    'Kimura',
    'jjb_soumission' as SkillCategory,
    'mastered' as SkillStatus,
    'Maîtrisée depuis la side control et la garde. Bonne grip et rotation.'
  );
  if (kimura) {
    count++;
    logger.info('   Kimura: Maîtrisé');
  }

  // Back Take - En cours
  const backTake = await createSkill(
    'Back Take',
    'jjb_garde' as SkillCategory,
    'in_progress' as SkillStatus,
    'Travail sur les transitions depuis la side control. Focus sur les crochets.'
  );
  if (backTake) {
    count++;
    logger.info('   Back Take: En cours');
  }

  // Scissor Sweep - Maîtrisé
  const scissorSweep = await createSkill(
    'Scissor Sweep',
    'jjb_passage' as SkillCategory,
    'mastered' as SkillStatus,
    'Sweep de base efficace. Bon timing sur le déséquilibre.'
  );
  if (scissorSweep) {
    count++;
    logger.info('   Scissor Sweep: Maîtrisé');
  }

  // Guillotine - En cours
  const guillotine = await createSkill(
    'Guillotine',
    'jjb_soumission' as SkillCategory,
    'in_progress' as SkillStatus,
    'Travail sur la finition et la pression du bras. Version arm-in à perfectionner.'
  );
  if (guillotine) {
    count++;
    logger.info('   Guillotine: En cours');
  }

  // Omoplata - À apprendre
  const omoplata = await createSkill(
    'Omoplata',
    'jjb_soumission' as SkillCategory,
    'to_learn' as SkillStatus,
    'Objectif prochain: maîtriser la position et les transitions.'
  );
  if (omoplata) {
    count++;
    logger.info('   Omoplata: À apprendre');
  }

  return count;
};

// ============================================
// GÉNÉRATION DES ENTRÉES DU JOURNAL (HUMEUR)
// ============================================
const generateJournalEntries = async () => {
  const entries = [
    {
      id: 'journal_1',
      date: format(new Date(), 'yyyy-MM-dd'),
      mood: 'excellent',
      note: "Séance incroyable ce matin ! J'ai battu mon record personnel sur le squat. L'énergie était au rendez-vous. 🚀",
      createdAt: new Date().toISOString(),
    },
    {
      id: 'journal_2',
      date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      mood: 'good',
      note: "Bonne récupération. J'ai bien dormi et je me sens prêt pour la semaine. Focus sur l'hydratation aujourd'hui.",
      createdAt: subDays(new Date(), 1).toISOString(),
    },
    {
      id: 'journal_3',
      date: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
      mood: 'good',
      note: "Séance de cardio intense. Difficile au début mais fini en force. La discipline paie toujours.",
      createdAt: subDays(new Date(), 2).toISOString(),
    },
    {
      id: 'journal_4',
      date: format(subDays(new Date(), 3), 'yyyy-MM-dd'),
      mood: 'neutral',
      note: "Journée de repos actif. Quelques étirements et marche légère.",
      createdAt: subDays(new Date(), 3).toISOString(),
    },
    {
      id: 'journal_5',
      date: format(subDays(new Date(), 4), 'yyyy-MM-dd'),
      mood: 'excellent',
      note: "Super sensation au JJB ce soir. J'ai réussi à passer le triangle que je bosse depuis 2 semaines !",
      createdAt: subDays(new Date(), 4).toISOString(),
    }
  ];

  await AsyncStorage.setItem('@yoroi_journal_entries', JSON.stringify(entries));
  logger.info(`${entries.length} entrées de journal générées`);
};

// ============================================
// FONCTION PRINCIPALE : CHARGER LES DONNÉES
// ============================================
export const generateScreenshotDemoData = async (): Promise<{ success: boolean; error?: string }> => {
  let currentStep = 'init';
  try {
    logger.info('Génération du mode Houari (Screenshot)...');

    // 1. Initialiser la base de données
    currentStep = '1. initDatabase';
    await initDatabase();

    // 1a. Reset complet de la base pour éviter les conflits
    currentStep = '1a. resetDatabase';
    await resetDatabase();

    const database = await openDatabase();

    // 1b. Forcer les migrations critiques pour trainings
    const criticalMigrations = [
      'ALTER TABLE trainings ADD COLUMN distance REAL;',
      'ALTER TABLE trainings ADD COLUMN calories INTEGER;',
      'ALTER TABLE trainings ADD COLUMN intensity INTEGER;',
      'ALTER TABLE trainings ADD COLUMN rounds INTEGER;',
      'ALTER TABLE trainings ADD COLUMN round_duration INTEGER;',
      'ALTER TABLE trainings ADD COLUMN is_outdoor INTEGER DEFAULT 0;',
      'ALTER TABLE trainings ADD COLUMN pente REAL;',
      'ALTER TABLE trainings ADD COLUMN speed REAL;',
      'ALTER TABLE trainings ADD COLUMN session_types TEXT;',
      'ALTER TABLE trainings ADD COLUMN technical_theme TEXT;',
    ];
    for (const migration of criticalMigrations) {
      try {
        await database.execAsync(migration);
      } catch (e) { /* colonne existe déjà */ }
    }
    logger.info('Migrations trainings vérifiées');

    // 2. Sauvegarder le profil dans AsyncStorage
    currentStep = '2. profil AsyncStorage';
    await AsyncStorage.removeItem('@yoroi_user_name');
    await AsyncStorage.removeItem('@yoroi_user_settings');

    await AsyncStorage.setItem('@yoroi_user_name', DEMO_PROFILE.name);
    await AsyncStorage.setItem('@yoroi_user_height', DEMO_PROFILE.height_cm.toString());
    await AsyncStorage.setItem('@yoroi_start_weight', DEMO_PROFILE.start_weight.toString());
    await AsyncStorage.setItem('@yoroi_target_weight', DEMO_PROFILE.target_weight.toString());
    await AsyncStorage.setItem('@yoroi_user_sport', DEMO_PROFILE.sport);
    await AsyncStorage.setItem('@yoroi_user_mode', DEMO_PROFILE.mode);

    // 2b. Sauvegarder le profil dans la base de données SQLite
    currentStep = '2b. profil SQLite';
    const startDate = format(DEMO_PROFILE.startDate, 'yyyy-MM-dd');
    await database.runAsync(`DELETE FROM profile`);
    await database.runAsync(
      `INSERT INTO profile (name, height_cm, start_weight, target_weight, start_date, avatar_gender) VALUES (?, ?, ?, ?, ?, ?)`,
      [DEMO_PROFILE.name, DEMO_PROFILE.height_cm, DEMO_PROFILE.start_weight, DEMO_PROFILE.target_weight, startDate, 'homme']
    );
    
    // Synchroniser avec les paramètres utilisateur globaux avec emploi du temps
    const weeklyRoutine = {
      'Lundi': [
        { time: '06:30', activity: 'Cardio à jeun (30min)' },
        { time: '12:00', activity: 'Musculation - Pecs/Triceps' },
        { time: '19:00', activity: 'MMA - Sparring' },
      ],
      'Mardi': [
        { time: '07:00', activity: 'Course à pied (8km)' },
        { time: '18:30', activity: 'JJB - Technique' },
      ],
      'Mercredi': [
        { time: '06:30', activity: 'HIIT - Circuit' },
        { time: '12:00', activity: 'Musculation - Dos/Biceps' },
        { time: '20:00', activity: 'Boxe - Sac' },
      ],
      'Jeudi': [
        { time: '07:00', activity: 'Natation (1h)' },
        { time: '19:00', activity: 'MMA - Wrestling' },
      ],
      'Vendredi': [
        { time: '06:30', activity: 'Cardio - Vélo' },
        { time: '12:00', activity: 'Musculation - Jambes' },
        { time: '18:30', activity: 'JJB - Roulades' },
      ],
      'Samedi': [
        { time: '09:00', activity: 'MMA - Sparring complet' },
        { time: '15:00', activity: 'Récupération - Stretching' },
      ],
      'Dimanche': [
        { time: '10:00', activity: 'Récupération active - Marche' },
        { time: '18:00', activity: 'Mobilité & Yoga' },
      ],
    };

    await AsyncStorage.setItem('@yoroi_user_settings', JSON.stringify({
      username: DEMO_PROFILE.name,
      gender: 'male',
      height: DEMO_PROFILE.height_cm,
      targetWeight: DEMO_PROFILE.target_weight,
      onboardingCompleted: true,
      weekly_routine: weeklyRoutine,
    }));

    logger.info(`Profil créé: ${DEMO_PROFILE.name}`);

    // 3. Générer et insérer les pesées avec composition corporelle complète
    currentStep = '3. pesées';
    logger.info('Génération des pesées...');
    const weights = generateWeights();
    for (const w of weights) {
      await addWeight({
        weight: w.weight,
        date: w.date,
        fat_percent: w.bodyFat,
        muscle_percent: w.muscleMass,
        water_percent: w.water,
        bone_mass: w.boneMass,
        visceral_fat: w.visceralFat,
        bmr: w.bmr,
        metabolic_age: w.metabolicAge,
        source: 'manual',
      });
    }
    logger.info(`${weights.length} pesées ajoutées avec composition corporelle complète`);

    // 4. Générer et insérer les mensurations
    currentStep = '4. mensurations';
    logger.info('📏 Génération des mensurations...');
    const measurements = generateMeasurements();
    for (const m of measurements) {
      await addMeasurementRecord({
        date: m.date,
        waist: m.waist,
        chest: m.chest,
        hips: m.hips,
        left_thigh: m.left_thigh,
        right_thigh: m.right_thigh,
        left_arm: m.left_arm,
        right_arm: m.right_arm,
        left_calf: m.left_calf,
        right_calf: m.right_calf,
        neck: m.neck,
      });
    }
    logger.info(`${measurements.length} mensurations ajoutées`);

    // 5. Créer les clubs avec logos
    currentStep = '5. clubs';
    logger.info('🏢 Création des clubs avec logos...');
    const clubIds = await createClubs();

    // 6. Générer et insérer les entraînements
    currentStep = '6. entraînements';
    logger.info('Génération des entraînements...');
    const trainingsCount = await generateTrainings(clubIds);
    logger.info(`${trainingsCount} entraînements ajoutés`);

    // 7. Générer le planning hebdomadaire
    currentStep = '7. planning';
    logger.info('Génération du planning hebdomadaire...');
    await generateWeeklyPlan(clubIds);

    // 8. Générer les photos de transformation
    currentStep = '8. photos';
    logger.info('📸 Génération des photos...');
    await generatePhotos();

    // 9. Générer les données de sommeil
    currentStep = '9. sommeil';
    logger.info('😴 Génération des données de sommeil...');
    const sleepEntries = generateSleepData();
    await AsyncStorage.setItem('@yoroi_sleep_entries', JSON.stringify(sleepEntries));
    await AsyncStorage.setItem('@yoroi_sleep_goal', '480'); // 8h
    logger.info(`${sleepEntries.length} nuits de sommeil ajoutées`);

    // 10. Générer l'hydratation
    currentStep = '10. hydratation';
    logger.info('💧 Génération de l\'hydratation...');
    await generateHydrationData();
    await AsyncStorage.setItem('@yoroi_hydration_goal', '2500'); // 2.5L
    logger.info('Données d\'hydratation ajoutées');

    // 11. Débloquer les badges
    currentStep = '11. badges';
    logger.info('Déblocage des badges...');
    const badges = generateUnlockedBadges();
    await AsyncStorage.setItem('@yoroi_unlocked_badges', JSON.stringify(badges));
    logger.info(`${badges.length} badges débloqués`);

    // 12. Sauvegarder les blessures
    currentStep = '12. blessures';
    logger.info('🏥 Génération des blessures...');
    const injuries = generateInjuries();
    await AsyncStorage.setItem('@yoroi_injuries', JSON.stringify(injuries));
    logger.info(`${injuries.length} blessures ajoutées`);

    // 13. Sauvegarder la charge d'entraînement (format quotidien pour le graphique)
    currentStep = '13. charge';
    logger.info('Génération de la charge d\'entraînement...');
    const trainingLoads = generateTrainingLoads();
    await AsyncStorage.setItem('@yoroi_training_loads', JSON.stringify(trainingLoads)); // Clé avec 's' pour le service
    const trainingLoad = generateTrainingLoad(); // Legacy
    await AsyncStorage.setItem('@yoroi_training_load', JSON.stringify(trainingLoad));
    logger.info(`${trainingLoads.length} charges quotidiennes + ${trainingLoad.length} semaines ajoutées`);

    // 14. Sauvegarder les données de batterie
    currentStep = '14. batterie';
    logger.info('🔋 Génération des données de batterie...');
    const batteryData = generateBatteryData();
    await AsyncStorage.setItem('@yoroi_battery_history', JSON.stringify(batteryData));
    logger.info(`${batteryData.length} jours de batterie ajoutés`);

    // 15. Générer les compétitions à venir
    currentStep = '15. compétitions';
    logger.info('Génération des compétitions...');
    await generateCompetitions();

    // 16. Générer les données temps réel pour l'accueil
    currentStep = '16. données accueil';
    logger.info('Génération des données temps réel...');
    await generateTodayData();

    // 17. Générer les données du Carnet d'Entraînement
    currentStep = '17. carnet';
    logger.info('📓 Génération du Carnet d\'Entraînement...');
    await resetCarnet(); // Clear existing benchmarks/skills first
    const carnetCount = await generateCarnetData();
    logger.info(`${carnetCount} éléments ajoutés au carnet`);

    // 18. Générer les avatars débloqués
    currentStep = '18. avatars';
    logger.info('🎭 Génération des avatars...');
    await generateAvatars();

    // 19. Générer les données Apple Health complètes
    currentStep = '19. apple health';
    logger.info('❤️ Génération des données Apple Health...');
    await generateAppleHealthData();

    // 20. Générer le palmares
    currentStep = '20. palmares';
    logger.info('🏆 Génération du palmares...');
    await generatePalmares();

    // 21. Générer les défis et quêtes
    currentStep = '21. défis/quêtes';
    logger.info('⚔️ Génération des défis et quêtes...');
    await generateChallengesAndQuests();

    // 22. Générer les données de jeûne
    currentStep = '22. jeûne';
    logger.info('🍽️ Génération du jeûne intermittent...');
    await generateFastingData();

    // 23. Générer l'historique du timer
    currentStep = '23. timer';
    logger.info('⏱️ Génération de l\'historique timer...');
    await generateTimerHistory();

    // 24. Définir des objectifs et paramètres - 6 MOIS DE DONNÉES!
    currentStep = '24. objectifs';
    await AsyncStorage.setItem('@yoroi_steps_goal', '10000');
    await AsyncStorage.setItem('@yoroi_calories_goal', '600');
    await AsyncStorage.setItem('@yoroi_distance_goal', '8.0');
    await AsyncStorage.setItem('@yoroi_current_level', '24'); // Niveau très élevé après 6 mois!
    await AsyncStorage.setItem('@yoroi_total_xp', '9850'); // Beaucoup de XP!
    await AsyncStorage.setItem('@yoroi_current_streak', '178'); // Presque 6 mois de streak!
    await AsyncStorage.setItem('@yoroi_best_streak', '178');

    // Grade/Rang: Empereur (niveau 7, 178 jours) - RANG LÉGENDAIRE!
    await AsyncStorage.setItem('@yoroi_current_rank', JSON.stringify({
      id: 'emperor',
      name: 'Empereur',
      nameFemale: 'Impératrice',
      nameJp: '天皇 (Tennō)',
      level: 7,
      color: '#FFD700',
      streak: 178,
    }));

    // 25. Générer les entrées du Journal (Humeur/Notes)
    currentStep = '25. journal humeur';
    logger.info('📔 Génération du Journal (Humeur)...');
    await generateJournalEntries();

    // 26. Activer le mode screenshot
    currentStep = '26. finalisation';
    await AsyncStorage.setItem('@yoroi_screenshot_mode', 'true');

    logger.info('Mode Screenshot activé avec succès !');
    logger.info('📸 Prêt pour les captures d\'écran App Store');
    logger.info('');
    logger.info('==========================================');
    logger.info('RÉSUMÉ COMPLET DES DONNÉES GÉNÉRÉES');
    logger.info('==========================================');
    logger.info('');
    logger.info('👤 PROFIL & GAMIFICATION - 6 MOIS DE TRANSFORMATION!');
    logger.info(`   • Profil: ${DEMO_PROFILE.name} (${DEMO_PROFILE.height_cm}cm, ${DEMO_PROFILE.start_weight}kg → 76.2kg, objectif: ${DEMO_PROFILE.target_weight}kg)`);
    logger.info(`   • Perte de poids: -22kg en 6 mois! 🔥 ATHLÈTE ÉLITE`);
    logger.info(`   • Grade: Empereur (天皇) - Niveau 7 - LÉGENDAIRE!`);
    logger.info(`   • Streak: 178 jours consécutifs! 💪💪`);
    logger.info(`   • XP: 9850 points - Niveau 24`);
    logger.info(`   • Avatar: Samurai (masculin) + 14 autres débloqués`);
    logger.info(`   • Badges: ${badges.length} débloqués`);
    logger.info('');
    logger.info('📊 STATS (6 onglets) - 6 MOIS DE DONNÉES!');
    logger.info(`   • Poids: ${weights.length} pesées sur 180 jours (98kg → 76kg)`);
    logger.info(`   • Composition: 14.5% graisse, 44% muscle, 60% eau - SANS TROU`);
    logger.info(`   • Mensurations: ${measurements.length} entrées - Taille affinée, Biceps massifs!`);
    logger.info(`   • Discipline: ${trainingsCount} entraînements (Basic-Fit + Gracie Barra)`);
    logger.info(`   • Performance: PRs enregistrés (Dév Couché 80kg×6, 10km 36min)`);
    logger.info(`   • Vitalité: SpO2 99%, HRV 62ms, FC repos 54 bpm - ATHLÈTE!`);
    logger.info('');
    logger.info('🏋️ ENTRAÎNEMENT & PLANNING');
    logger.info(`   • Clubs: Basic-Fit (Muscu), Gracie Barra (JJB), Running (Solo)`);
    logger.info(`   • Planning: 10-12 séances/semaine (MMA Spirit!)`);
    logger.info(`   • Carnet: Benchmarks muscu, running et 9 techniques JJB`);
    logger.info('');
    logger.info('🏆 COMPÉTITION');
    logger.info(`   • À venir: Open Marseille JJB (J-15), HYROX Paris (J-45)`);
    logger.info(`   • Palmares: 3 compétitions passées`);
    logger.info('');
    logger.info('🎮 GAMIFICATION');
    logger.info(`   • Défis quotidiens: 3, Défis hebdomadaires: 2, Quêtes: 3`);
    logger.info('');
    logger.info('==========================================');
    logger.info('✅ MODE GERMAIN DEL JARRET 100% OPÉRATIONNEL');
    logger.info('==========================================');

    return {
      success: true,
    };
  } catch (error) {
    logger.error(`❌ Erreur à l'étape ${currentStep}:`, error);
    return {
      success: false,
      error: `Erreur étape ${currentStep}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
    };
  }
};

// ============================================
// EFFACER LES DONNÉES DE DÉMONSTRATION
// ============================================
export const clearScreenshotDemoData = async (): Promise<{ success: boolean; message: string }> => {
  try {
    logger.info('🧹 Nettoyage COMPLET des données de démonstration...');

    // 1. Réinitialiser complètement la base de données SQLite
    try {
      await resetDatabase();
      logger.info('Base SQLite vidée');
    } catch (dbError) {
      logger.warn('Erreur reset SQLite:', dbError);
    }

    // 2. Effacer TOUTES les clés AsyncStorage liées à Yoroi
    const keys = await AsyncStorage.getAllKeys();
    const yoroiKeys = keys.filter(key =>
      key.startsWith('@yoroi') ||
      key.startsWith('yoroi_') ||
      key.startsWith('hydration_') ||
      key.startsWith('hydration') ||
      key.startsWith('sleep_') ||
      key.startsWith('sleep') ||
      key.includes('weight') ||
      key.includes('training') ||
      key.includes('badge') ||
      key.includes('xp') ||
      key.includes('streak') ||
      key.includes('level') ||
      key.includes('quest') ||
      key.includes('battery') ||
      key.includes('charge') ||
      key.includes('injury') ||
      key.includes('composition') ||
      key.includes('measurements') ||
      key.includes('carnet') ||
      key === 'my_planning'
    );

    logger.info(`📦 Suppression de ${yoroiKeys.length} clés AsyncStorage...`);
    await AsyncStorage.multiRemove(yoroiKeys);

    // 3. Désactiver le mode screenshot
    await AsyncStorage.setItem('@yoroi_screenshot_mode', 'false');

    logger.info('Données de démonstration TOTALEMENT effacées');
    logger.info('Mode Screenshot désactivé');

    return {
      success: true,
      message: `Supprimé: ${yoroiKeys.length} clés AsyncStorage + Base SQLite`,
    };
  } catch (error) {
    logger.error('❌ Erreur lors du nettoyage:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
};

// ============================================
// VÉRIFIER SI LE MODE SCREENSHOT EST ACTIVÉ
// ============================================
export const isScreenshotModeEnabled = async (): Promise<boolean> => {
  try {
    const mode = await AsyncStorage.getItem('@yoroi_screenshot_mode');
    return mode === 'true';
  } catch (error) {
    logger.error('Erreur vérification mode screenshot:', error);
    return false;
  }
};

// ============================================
// RESET COMPLET DE LA BASE DE DONNÉES
// ============================================
export const resetCompleteDatabase = async (): Promise<{ success: boolean; message: string }> => {
  try {
    logger.info('RESET COMPLET DE LA BASE DE DONNÉES...');

    // 1. D'abord, effacer AsyncStorage (ne dépend pas de SQLite)
    const keys = await AsyncStorage.getAllKeys();
    const yoroiKeys = keys.filter(key =>
      key.startsWith('@yoroi_') ||
      key.startsWith('hydration_') ||
      key.startsWith('sleep_') ||
      key.startsWith('@onboarding') ||
      key.includes('yoroi')
    );
    if (yoroiKeys.length > 0) {
      await AsyncStorage.multiRemove(yoroiKeys);
      logger.info(`${yoroiKeys.length} clés AsyncStorage supprimées`);
    }

    // 2. Tenter d'ouvrir et vider la base SQLite
    let deletedCount = { trainings: 0, clubs: 0, weights: 0 };

    try {
      const database = await openDatabase();

      // Compter AVANT suppression
      const trainingsCount = await database.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM trainings`);
      const clubsCount = await database.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM clubs`);
      const weightsCount = await database.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM weights`);

      deletedCount = {
        trainings: trainingsCount?.count || 0,
        clubs: clubsCount?.count || 0,
        weights: weightsCount?.count || 0,
      };

      logger.info(`AVANT RESET: ${deletedCount.trainings} entraînements, ${deletedCount.clubs} clubs, ${deletedCount.weights} pesées`);

      // Supprimer TOUTES les tables
      await database.runAsync(`DELETE FROM trainings`);
      await database.runAsync(`DELETE FROM clubs`);
      await database.runAsync(`DELETE FROM weights`);
      await database.runAsync(`DELETE FROM measurements`);
      await database.runAsync(`DELETE FROM profile`);
      await database.runAsync(`DELETE FROM competitions`);
      await database.runAsync(`DELETE FROM photos`);
      await database.runAsync(`DELETE FROM achievements`);
      await database.runAsync(`DELETE FROM weekly_plan`);

      logger.info('Toutes les tables SQLite vidées');
    } catch (dbError) {
      logger.warn('Impossible de vider SQLite (sera recréée au prochain lancement):', dbError);
      // On continue quand même - AsyncStorage a été vidé
    }

    logger.info('Reset complet terminé');

    return {
      success: true,
      message: `Tout effacé : ${deletedCount.trainings} entraînements, ${deletedCount.clubs} clubs, ${deletedCount.weights} pesées`,
    };
  } catch (error) {
    logger.error('❌ Erreur lors du reset:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
};

// ============================================
// NETTOYER LES ENTRAÎNEMENTS EN DOUBLE
// ============================================
export const cleanDuplicateTrainings = async (): Promise<{ success: boolean; removed: number }> => {
  try {
    logger.info('🧹 Nettoyage des entraînements en double...');

    const database = await openDatabase();

    // Compter les entraînements avant
    const beforeResult = await database.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM trainings`);
    const beforeCount = beforeResult?.count || 0;

    logger.info(`Entraînements avant nettoyage: ${beforeCount}`);

    // Supprimer TOUS les entraînements
    await database.runAsync(`DELETE FROM trainings`);

    // Vérifier que la suppression a bien fonctionné
    const afterDeleteResult = await database.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM trainings`);
    const afterDeleteCount = afterDeleteResult?.count || 0;
    logger.info(`🗑️ Entraînements après suppression: ${afterDeleteCount}`);

    // Récréer les clubs si nécessaire
    const clubsResult = await database.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM clubs`);
    const clubsCount = clubsResult?.count || 0;

    let clubIds: ClubIds;

    if (clubsCount === 0) {
      // Recréer les clubs
      clubIds = await createClubs();
    } else {
      // Récupérer les IDs des clubs existants
      const gb = await database.getFirstAsync<{ id: number }>(`SELECT id FROM clubs WHERE sport = 'jjb' LIMIT 1`);
      const bf = await database.getFirstAsync<{ id: number }>(`SELECT id FROM clubs WHERE sport = 'musculation' LIMIT 1`);

      clubIds = {
        gracieBarra: gb?.id || 1,
        basicFit: bf?.id || 2,
      };
    }

    // Regénérer les entraînements propres
    logger.info('Régénération des entraînements propres...');
    const newCount = await generateTrainings(clubIds);

    logger.info(`Nettoyage terminé: ${beforeCount} → ${newCount} entraînements`);
    logger.info(`🗑️ ${beforeCount - newCount} entraînements supprimés`);

    return {
      success: true,
      removed: beforeCount - newCount,
    };
  } catch (error) {
    logger.error('❌ Erreur lors du nettoyage:', error);
    return {
      success: false,
      removed: 0,
    };
  }
};
