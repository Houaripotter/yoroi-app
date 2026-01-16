// ============================================
// YOROI - MODE SCREENSHOT POUR APP STORE
// ============================================
// Données de démonstration complètes et attrayantes pour les captures d'écran

import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDatabase, addWeight, addMeasurementRecord, addTraining, resetDatabase, openDatabase } from './database';
import { format, subDays, addDays } from 'date-fns';
import logger from '@/lib/security/logger';
import { createBenchmark, addBenchmarkEntry, createSkill } from './carnetService';
import type { BenchmarkCategory, BenchmarkUnit, SkillCategory, SkillStatus } from './carnetService';

// ============================================
// PROFIL DE DÉMONSTRATION - TRANSFORMATION INCROYABLE!
// ============================================
const DEMO_PROFILE = {
  name: 'Thomas Silva',
  height_cm: 178,
  start_weight: 120.0, // Poids de départ - OBÉSITÉ
  target_weight: 82.0, // Objectif final
  sport: 'running', // Running + Street Workout
  mode: 'competitor',
  startDate: subDays(new Date(), 365), // Il y a 1 AN - TRANSFORMATION FOLLE!
};

// ============================================
// GÉNÉRATION DES PESÉES (12 mois) - TRANSFORMATION EXTRÊME!
// ============================================
const generateWeights = () => {
  const weights = [];
  const days = 365; // 1 AN DE DONNÉES - TRANSFORMATION COMPLÈTE!
  const startWeight = 120.0; // Poids de départ - OBÉSITÉ
  const endWeight = 85.0; // Transformation incroyable!
  const totalLoss = startWeight - endWeight; // 35kg perdu en 1 an - TRANSFORMATION DE MALADE!

  for (let i = 0; i <= days; i++) {
    const date = subDays(new Date(), days - i);

    // Progression réaliste sur 12 mois : COURBE DE TRANSFORMATION ÉPIQUE!
    let progress;
    if (i < 30) {
      // Mois 1 : perte initiale MASSIVE (eau + graisse) - 15% de la perte
      progress = (i / 30) * 0.15;
    } else if (i < 60) {
      // Mois 2 : motivation max - 12%
      progress = 0.15 + ((i - 30) / 30) * 0.12;
    } else if (i < 90) {
      // Mois 3 : continuation forte - 10%
      progress = 0.27 + ((i - 60) / 30) * 0.10;
    } else if (i < 120) {
      // Mois 4 : léger plateau puis reprise - 8%
      progress = 0.37 + ((i - 90) / 30) * 0.08;
    } else if (i < 150) {
      // Mois 5 : reprise forte - 9%
      progress = 0.45 + ((i - 120) / 30) * 0.09;
    } else if (i < 180) {
      // Mois 6 : milieu du parcours - 8%
      progress = 0.54 + ((i - 150) / 30) * 0.08;
    } else if (i < 210) {
      // Mois 7 : deuxième souffle - 8%
      progress = 0.62 + ((i - 180) / 30) * 0.08;
    } else if (i < 240) {
      // Mois 8 : progression constante - 7%
      progress = 0.70 + ((i - 210) / 30) * 0.07;
    } else if (i < 270) {
      // Mois 9 : accélération - 7%
      progress = 0.77 + ((i - 240) / 30) * 0.07;
    } else if (i < 300) {
      // Mois 10 : dernière ligne droite - 7%
      progress = 0.84 + ((i - 270) / 30) * 0.07;
    } else if (i < 330) {
      // Mois 11 : finition - 6%
      progress = 0.91 + ((i - 300) / 30) * 0.06;
    } else {
      // Mois 12 : OBJECTIF PRESQUE ATTEINT! - 3%
      progress = 0.97 + ((i - 330) / 35) * 0.03;
    }

    const baseWeight = startWeight - (totalLoss * progress);

    // VARIATIONS DRAMATIQUES pour screenshots (jusqu'à ±1.5kg!)
    // Les 7 derniers jours ont des variations impressionnantes
    let dailyVariation;
    const daysFromEnd = days - i;
    if (daysFromEnd <= 7) {
      // Semaine récente : variations visibles pour montrer la fluctuation
      const dramaticPattern = [
        1.8,   // J-7: +1.8kg (après gros repas)
        0.2,   // J-6: léger
        -0.8,  // J-5: descente
        -1.5,  // J-4: grosse perte (après compétition/jeûne)
        -0.3,  // J-3: stabilisation
        0.5,   // J-2: légère remontée
        0.0,   // J-1: stable
        -0.4,  // Aujourd'hui: léger déficit
      ];
      dailyVariation = dramaticPattern[7 - daysFromEnd] || 0;
    } else {
      // Avant: variations normales
      dailyVariation = (Math.sin(i * 0.3) * 0.4) + (Math.cos(i * 0.2) * 0.3);
    }

    const weight = baseWeight + dailyVariation;

    // Enregistrer TOUS les jours pour des graphiques ÉPIQUES
    weights.push({
      date: format(date, 'yyyy-MM-dd'),
      weight: Math.round(weight * 10) / 10,
      bodyFat: Math.round((35 - (progress * 17)) * 10) / 10, // 35% → 18% (TRANSFORMATION FOLLE!)
      muscleMass: Math.round((30 + (progress * 12)) * 10) / 10, // 30% → 42% (GAINS MASSIFS!)
      water: Math.round((45 + (progress * 10)) * 10) / 10, // 45% → 55%
      // Données de composition avancées pour screenshots
      boneMass: Math.round((2.8 + (progress * 0.5)) * 10) / 10, // 2.8kg → 3.3kg
      visceralFat: Math.round((18 - (progress * 10))), // 18 → 8 (ÉNORME amélioration santé!)
      bmr: Math.round(1500 + (progress * 400)), // 1500 → 1900 kcal (métabolisme BOOSTÉ!)
      metabolicAge: Math.round(45 - (progress * 17)), // 45 → 28 ans (RAJEUNI DE 17 ANS!)
    });
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

  // DÉCEMBRE PASSÉ + JANVIER COURANT
  // Si nous sommes en janvier, décembre = année précédente
  // Si nous sommes après janvier, décembre = année courante
  const now = new Date();
  const currentMonth = now.getMonth(); // 0 = janvier
  const currentYear = now.getFullYear();

  // Décembre de l'année précédente si on est en janvier, sinon décembre de l'année courante
  const decYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const janYear = currentMonth === 0 ? currentYear : currentYear + 1;

  // Décembre complet (1-31)
  const decStart = new Date(decYear, 11, 1); // 1er décembre
  const decEnd = new Date(decYear, 11, 31); // 31 décembre

  // Janvier complet (1-31)
  const janStart = new Date(janYear, 0, 1); // 1er janvier
  const janEnd = new Date(janYear, 0, 31); // 31 janvier

  const daysInDec = Math.floor((decEnd.getTime() - decStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysInJan = Math.floor((janEnd.getTime() - janStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  logger.info(`Génération décembre (${daysInDec} jours) + janvier (${daysInJan} jours) avec 3 clubs FITNESS`);
  logger.info(`🏢 Clubs: Run & Fit (Running), Basic-Fit (Muscu), Urban Street Workout (Calisthenics)`);

  // Types de séances variées pour chaque club
  const runningSessions = [
    { type: 'endurance', notes: 'Footing 45min - Zone 2 cardio', distance: 8 },
    { type: 'interval', notes: 'Fractionné 10x400m - Récup 1min30', distance: 6 },
    { type: 'tempo', notes: 'Tempo Run 30min - Allure semi-marathon', distance: 7 },
    { type: 'long', notes: 'Sortie longue - Exploration nouveaux parcours', distance: 15 },
    { type: 'recovery', notes: 'Footing récup - Régénération active', distance: 5 },
  ];

  const calisthenicsSessions = [
    { type: 'upper', notes: 'Upper Body - Dips, Tractions, Push-ups' },
    { type: 'lower', notes: 'Lower Body - Pistol squats, Lunges' },
    { type: 'skills', notes: 'Skills - Muscle-up progressions, Handstand' },
    { type: 'full', notes: 'Full Body Circuit - 5 rounds AMRAP' },
    { type: 'core', notes: 'Core & Abs - L-sit, Dragon flags, Planks' },
  ];

  const muscuSessions = [
    { muscles: 'pectoraux,triceps', notes: 'Push Day - Développé couché 5x5' },
    { muscles: 'dos,biceps', notes: 'Pull Day - Tractions + Rowing' },
    { muscles: 'jambes,fessiers', notes: 'Leg Day - Squat 5x5 + Fentes' },
    { muscles: 'epaules,abdos', notes: 'Shoulders & Core - Military press' },
  ];

  let sessionIndex = 0;

  for (let dayOffset = 0; dayOffset < daysInDec; dayOffset++) {
    const date = addDays(decStart, dayOffset);
    const dayOfWeek = date.getDay(); // 0=Dim, 1=Lun, ..., 6=Sam
    const dateStr = format(date, 'yyyy-MM-dd');

    // ======================================
    // MERCREDI (3) = REPOS COMPLET
    // ======================================
    if (dayOfWeek === 3) {
      continue;
    }

    // ======================================
    // DIMANCHE (0) = REPOS COMPLET
    // ======================================
    if (dayOfWeek === 0) {
      continue;
    }

    // ======================================
    // LUNDI (1) = MATIN Running + SOIR Basic-Fit
    // ======================================
    if (dayOfWeek === 1) {
      const runSession = runningSessions[sessionIndex % runningSessions.length];
      // MATIN : Run & Fit - Running
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.runAndFit, 'running', runSession.type, dateStr, '06:30', 50, runSession.notes]
      );
      count++;

      const muscuSession = muscuSessions[sessionIndex % muscuSessions.length];
      // SOIR : Basic-Fit Musculation
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, date, start_time, duration_minutes, muscles, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.basicFit, 'musculation', dateStr, '18:30', 75, muscuSession.muscles, muscuSession.notes]
      );
      count++;
    }

    // ======================================
    // MARDI (2) = MATIN Street Workout + SOIR Running
    // ======================================
    if (dayOfWeek === 2) {
      const calisthenicsSession = calisthenicsSessions[sessionIndex % calisthenicsSessions.length];
      // MATIN : Urban Street Workout
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.urbanStreetWorkout, 'calisthenics', calisthenicsSession.type, dateStr, '07:00', 60, calisthenicsSession.notes]
      );
      count++;

      const runSession = runningSessions[(sessionIndex + 1) % runningSessions.length];
      // SOIR : Run & Fit - Running
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.runAndFit, 'running', runSession.type, dateStr, '19:00', 45, runSession.notes]
      );
      count++;
    }

    // ======================================
    // JEUDI (4) = MATIN Basic-Fit + SOIR Street Workout
    // ======================================
    if (dayOfWeek === 4) {
      const muscuSession = muscuSessions[(sessionIndex + 1) % muscuSessions.length];
      // MATIN : Basic-Fit
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, date, start_time, duration_minutes, muscles, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.basicFit, 'musculation', dateStr, '07:00', 60, muscuSession.muscles, muscuSession.notes]
      );
      count++;

      const calisthenicsSession = calisthenicsSessions[(sessionIndex + 2) % calisthenicsSessions.length];
      // SOIR : Urban Street Workout
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.urbanStreetWorkout, 'calisthenics', calisthenicsSession.type, dateStr, '18:00', 70, calisthenicsSession.notes]
      );
      count++;
    }

    // ======================================
    // VENDREDI (5) = MATIN Running Fractionné + SOIR Basic-Fit
    // ======================================
    if (dayOfWeek === 5) {
      const runSession = runningSessions[1]; // Fractionné
      // MATIN : Run & Fit - Interval
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.runAndFit, 'running', 'interval', dateStr, '06:30', 55, runSession.notes]
      );
      count++;

      const muscuSession = muscuSessions[(sessionIndex + 2) % muscuSessions.length];
      // SOIR : Basic-Fit
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, date, start_time, duration_minutes, muscles, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.basicFit, 'musculation', dateStr, '17:30', 70, muscuSession.muscles, muscuSession.notes]
      );
      count++;
    }

    // ======================================
    // SAMEDI (6) = MATIN Running longue distance + Street Workout
    // ======================================
    if (dayOfWeek === 6) {
      // MATIN : Run & Fit - Sortie longue
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.runAndFit, 'running', 'long', dateStr, '08:00', 90, 'Sortie longue 15km - Préparation semi-marathon']
      );
      count++;

      // APRÈS-MIDI : Urban Street Workout - Session skills
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.urbanStreetWorkout, 'calisthenics', 'skills', dateStr, '14:00', 60, 'Skills training - Muscle-up & Handstand work']
      );
      count++;
    }

    sessionIndex++;
  }

  logger.info(`Décembre : Généré ${count} entraînements`);

  // ============================================
  // JANVIER COMPLET (1-31)
  // ============================================
  for (let dayOffset = 0; dayOffset < daysInJan; dayOffset++) {
    const date = addDays(janStart, dayOffset);
    const dayOfWeek = date.getDay(); // 0=Dim, 1=Lun, ..., 6=Sam
    const dateStr = format(date, 'yyyy-MM-dd');

    // MERCREDI (3) = REPOS COMPLET
    if (dayOfWeek === 3) {
      continue;
    }

    // DIMANCHE (0) = REPOS COMPLET
    if (dayOfWeek === 0) {
      continue;
    }

    // LUNDI (1) = MATIN Running + SOIR Basic-Fit
    if (dayOfWeek === 1) {
      const runSession = runningSessions[sessionIndex % runningSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.runAndFit, 'running', runSession.type, dateStr, '06:30', 50, runSession.notes]
      );
      count++;

      const muscuSession = muscuSessions[sessionIndex % muscuSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, date, start_time, duration_minutes, muscles, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.basicFit, 'musculation', dateStr, '18:30', 75, muscuSession.muscles, muscuSession.notes]
      );
      count++;
    }

    // MARDI (2) = MATIN Street Workout + SOIR Running
    if (dayOfWeek === 2) {
      const calisthenicsSession = calisthenicsSessions[sessionIndex % calisthenicsSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.urbanStreetWorkout, 'calisthenics', calisthenicsSession.type, dateStr, '07:00', 60, calisthenicsSession.notes]
      );
      count++;

      const runSession = runningSessions[(sessionIndex + 1) % runningSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.runAndFit, 'running', runSession.type, dateStr, '19:00', 45, runSession.notes]
      );
      count++;
    }

    // JEUDI (4) = MATIN Basic-Fit + SOIR Street Workout
    if (dayOfWeek === 4) {
      const muscuSession = muscuSessions[(sessionIndex + 1) % muscuSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, date, start_time, duration_minutes, muscles, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.basicFit, 'musculation', dateStr, '07:00', 60, muscuSession.muscles, muscuSession.notes]
      );
      count++;

      const calisthenicsSession = calisthenicsSessions[(sessionIndex + 2) % calisthenicsSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.urbanStreetWorkout, 'calisthenics', calisthenicsSession.type, dateStr, '18:00', 70, calisthenicsSession.notes]
      );
      count++;
    }

    // VENDREDI (5) = MATIN Running Fractionné + SOIR Basic-Fit
    if (dayOfWeek === 5) {
      const runSession = runningSessions[1]; // Fractionné
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.runAndFit, 'running', 'interval', dateStr, '06:30', 55, runSession.notes]
      );
      count++;

      const muscuSession = muscuSessions[(sessionIndex + 2) % muscuSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, date, start_time, duration_minutes, muscles, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.basicFit, 'musculation', dateStr, '17:30', 70, muscuSession.muscles, muscuSession.notes]
      );
      count++;
    }

    // SAMEDI (6) = MATIN Running longue distance + Street Workout
    if (dayOfWeek === 6) {
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.runAndFit, 'running', 'long', dateStr, '08:00', 90, 'Sortie longue 15km - Préparation semi-marathon']
      );
      count++;

      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.urbanStreetWorkout, 'calisthenics', 'skills', dateStr, '14:00', 60, 'Skills training - Muscle-up & Handstand work']
      );
      count++;
    }

    sessionIndex++;
  }

  logger.info(`TOTAL Décembre + Janvier : Généré ${count} entraînements`);
  logger.info(`Planning : Lun/Mar/Jeu/Ven = 2 séances, Sam = 2 séances, Mer/Dim = REPOS`);
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
  runAndFit: number;
  basicFit: number;
  urbanStreetWorkout: number;
}

const createClubs = async (): Promise<ClubIds> => {
  const database = await openDatabase();

  // Run & Fit Marseille (Running) - Club de course à pied avec logo running
  const rfResult = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    ['Run & Fit Marseille', 'running', 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=200&h=200&fit=crop&auto=format', '#3B82F6']
  );

  // Basic Fit (Musculation) - Avec logo Basic-Fit local
  const bfResult = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    ['Basic-Fit Marseille', 'musculation', 'basic-fit', '#FF6B00']
  );

  // Urban Street Workout (Calisthenics) - Street Workout avec logo calisthenics
  const uswResult = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    ['Urban Street Workout', 'calisthenics', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop&auto=format', '#10B981']
  );

  logger.info(`3 clubs créés avec logos: Run & Fit Marseille (Running), Basic-Fit (Muscu), Urban Street Workout (Calisthenics)`);

  return {
    runAndFit: rfResult.lastInsertRowId,
    basicFit: bfResult.lastInsertRowId,
    urbanStreetWorkout: uswResult.lastInsertRowId,
  };
};

// ============================================
// PLANNING HEBDOMADAIRE - FITNESS TRANSFORMATION
// ============================================
const generateWeeklyPlan = async (clubIds: ClubIds): Promise<void> => {
  const database = await openDatabase();

  // Planning complet avec 3 clubs FITNESS - 10 séances par semaine
  const plan = [
    // ======================================
    // LUNDI (1) = MATIN Running + SOIR Basic-Fit
    // ======================================
    { day: 1, club_id: clubIds.runAndFit, sport: 'running', time: '06:30', duration: 50, is_rest: 0, session_type: 'Endurance' },
    { day: 1, club_id: clubIds.basicFit, sport: 'musculation', time: '18:30', duration: 75, muscles: 'pectoraux,triceps,épaules', is_rest: 0, session_type: 'Push Day' },

    // ======================================
    // MARDI (2) = MATIN Street Workout + SOIR Running
    // ======================================
    { day: 2, club_id: clubIds.urbanStreetWorkout, sport: 'calisthenics', time: '07:00', duration: 60, is_rest: 0, session_type: 'Upper Body' },
    { day: 2, club_id: clubIds.runAndFit, sport: 'running', time: '19:00', duration: 45, is_rest: 0, session_type: 'Tempo' },

    // ======================================
    // MERCREDI (3) = REPOS
    // ======================================
    { day: 3, club_id: null, sport: 'repos', time: null, duration: null, is_rest: 1, session_type: null },

    // ======================================
    // JEUDI (4) = MATIN Basic-Fit + SOIR Street Workout
    // ======================================
    { day: 4, club_id: clubIds.basicFit, sport: 'musculation', time: '07:00', duration: 60, muscles: 'dos,biceps', is_rest: 0, session_type: 'Pull Day' },
    { day: 4, club_id: clubIds.urbanStreetWorkout, sport: 'calisthenics', time: '18:00', duration: 70, is_rest: 0, session_type: 'Skills' },

    // ======================================
    // VENDREDI (5) = MATIN Running Fractionné + SOIR Basic-Fit
    // ======================================
    { day: 5, club_id: clubIds.runAndFit, sport: 'running', time: '06:30', duration: 55, is_rest: 0, session_type: 'Interval' },
    { day: 5, club_id: clubIds.basicFit, sport: 'musculation', time: '17:30', duration: 70, muscles: 'jambes,fessiers', is_rest: 0, session_type: 'Leg Day' },

    // ======================================
    // SAMEDI (6) = MATIN Running longue distance + Street Workout
    // ======================================
    { day: 6, club_id: clubIds.runAndFit, sport: 'running', time: '08:00', duration: 90, is_rest: 0, session_type: 'Long Run' },
    { day: 6, club_id: clubIds.urbanStreetWorkout, sport: 'calisthenics', time: '14:00', duration: 60, is_rest: 0, session_type: 'Full Body' },

    // ======================================
    // DIMANCHE (0) = REPOS ou Running léger
    // ======================================
    { day: 0, club_id: null, sport: 'repos', time: null, duration: null, is_rest: 1, session_type: null },
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
  // Poids départ: 85kg → Objectif: 77kg → Actuel: 78.2kg
  // Perdu: 6.8kg | Reste: 1.2kg
  await AsyncStorage.setItem('@yoroi_start_weight', '85.0');
  await AsyncStorage.setItem('@yoroi_target_weight', '76.0');
  await AsyncStorage.setItem('@yoroi_current_weight', '76.8');
  // Poids perdu calculé: 85 - 76.8 = 8.2kg - TRANSFORMATION!
  await AsyncStorage.setItem('@yoroi_weight_lost', '8.2');
  // Reste à perdre: 76.8 - 76 = 0.8kg (presque au but!)
  await AsyncStorage.setItem('@yoroi_weight_remaining', '0.8');
  // Progression: (8.2 / 9) * 100 = 91% - PRESQUE LÀ!
  await AsyncStorage.setItem('@yoroi_weight_progress', '91');

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
// FONCTION PRINCIPALE : CHARGER LES DONNÉES
// ============================================
export const loadScreenshotDemoData = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    logger.info('Chargement des données de démonstration pour screenshots...');

    // 1. Initialiser la base de données
    await initDatabase();
    const database = await openDatabase();

    // 2. Sauvegarder le profil dans AsyncStorage
    await AsyncStorage.setItem('@yoroi_user_name', DEMO_PROFILE.name);
    await AsyncStorage.setItem('@yoroi_user_height', DEMO_PROFILE.height_cm.toString());
    await AsyncStorage.setItem('@yoroi_start_weight', DEMO_PROFILE.start_weight.toString());
    await AsyncStorage.setItem('@yoroi_target_weight', DEMO_PROFILE.target_weight.toString());
    await AsyncStorage.setItem('@yoroi_user_sport', DEMO_PROFILE.sport);
    await AsyncStorage.setItem('@yoroi_user_mode', DEMO_PROFILE.mode);

    // 2b. Sauvegarder le profil dans la base de données SQLite
    // D'abord supprimer tout profil existant pour éviter les conflits
    const startDate = format(DEMO_PROFILE.startDate, 'yyyy-MM-dd');
    await database.runAsync(`DELETE FROM profile`);
    await database.runAsync(
      `INSERT INTO profile (name, height_cm, start_weight, target_weight, start_date, avatar_gender) VALUES (?, ?, ?, ?, ?, ?)`,
      [DEMO_PROFILE.name, DEMO_PROFILE.height_cm, DEMO_PROFILE.start_weight, DEMO_PROFILE.target_weight, startDate, 'homme']
    );
    logger.info('Profil créé dans la base de données:');
    logger.info(`   • Nom: ${DEMO_PROFILE.name}`);
    logger.info(`   • Poids départ: ${DEMO_PROFILE.start_weight}kg`);
    logger.info(`   • Objectif: ${DEMO_PROFILE.target_weight}kg`);
    logger.info(`   • Sport: ${DEMO_PROFILE.sport}`);

    // 3. Générer et insérer les pesées avec composition corporelle complète
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
    logger.info('🏢 Création des clubs avec logos...');
    const clubIds = await createClubs();

    // 6. Générer et insérer les entraînements
    logger.info('Génération des entraînements...');
    const trainingsCount = await generateTrainings(clubIds);
    logger.info(`${trainingsCount} entraînements ajoutés`);

    // 7. Générer le planning hebdomadaire
    logger.info('Génération du planning hebdomadaire...');
    await generateWeeklyPlan(clubIds);

    // 8. Générer les photos de transformation
    logger.info('📸 Génération des photos...');
    await generatePhotos();

    // 9. Générer les données de sommeil
    logger.info('😴 Génération des données de sommeil...');
    const sleepEntries = generateSleepData();
    await AsyncStorage.setItem('@yoroi_sleep_entries', JSON.stringify(sleepEntries));
    await AsyncStorage.setItem('@yoroi_sleep_goal', '480'); // 8h
    logger.info(`${sleepEntries.length} nuits de sommeil ajoutées`);

    // 10. Générer l'hydratation
    logger.info('💧 Génération de l\'hydratation...');
    await generateHydrationData();
    await AsyncStorage.setItem('@yoroi_hydration_goal', '2500'); // 2.5L
    logger.info('Données d\'hydratation ajoutées');

    // 11. Débloquer les badges
    logger.info('Déblocage des badges...');
    const badges = generateUnlockedBadges();
    await AsyncStorage.setItem('@yoroi_unlocked_badges', JSON.stringify(badges));
    logger.info(`${badges.length} badges débloqués`);

    // 12. Sauvegarder les blessures
    logger.info('🏥 Génération des blessures...');
    const injuries = generateInjuries();
    await AsyncStorage.setItem('@yoroi_injuries', JSON.stringify(injuries));
    logger.info(`${injuries.length} blessures ajoutées`);

    // 13. Sauvegarder la charge d'entraînement (format quotidien pour le graphique)
    logger.info('Génération de la charge d\'entraînement...');
    const trainingLoads = generateTrainingLoads();
    await AsyncStorage.setItem('@yoroi_training_loads', JSON.stringify(trainingLoads)); // Clé avec 's' pour le service
    const trainingLoad = generateTrainingLoad(); // Legacy
    await AsyncStorage.setItem('@yoroi_training_load', JSON.stringify(trainingLoad));
    logger.info(`${trainingLoads.length} charges quotidiennes + ${trainingLoad.length} semaines ajoutées`);

    // 14. Sauvegarder les données de batterie
    logger.info('🔋 Génération des données de batterie...');
    const batteryData = generateBatteryData();
    await AsyncStorage.setItem('@yoroi_battery_history', JSON.stringify(batteryData));
    logger.info(`${batteryData.length} jours de batterie ajoutés`);

    // 15. Générer les compétitions à venir
    logger.info('Génération des compétitions...');
    await generateCompetitions();

    // 16. Générer les données temps réel pour l'accueil
    logger.info('Génération des données temps réel...');
    await generateTodayData();

    // 17. Générer les données du Carnet d'Entraînement
    logger.info('📓 Génération du Carnet d\'Entraînement...');
    const carnetCount = await generateCarnetData();
    logger.info(`${carnetCount} éléments ajoutés au carnet`);

    // 18. Générer les avatars débloqués
    logger.info('🎭 Génération des avatars...');
    await generateAvatars();

    // 19. Générer les données Apple Health complètes
    logger.info('❤️ Génération des données Apple Health...');
    await generateAppleHealthData();

    // 20. Générer le palmares
    logger.info('🏆 Génération du palmares...');
    await generatePalmares();

    // 21. Générer les défis et quêtes
    logger.info('⚔️ Génération des défis et quêtes...');
    await generateChallengesAndQuests();

    // 22. Générer les données de jeûne
    logger.info('🍽️ Génération du jeûne intermittent...');
    await generateFastingData();

    // 23. Générer l'historique du timer
    logger.info('⏱️ Génération de l\'historique timer...');
    await generateTimerHistory();

    // 24. Définir des objectifs et paramètres - 6 MOIS DE DONNÉES!
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

    // 25. Activer le mode screenshot
    await AsyncStorage.setItem('@yoroi_screenshot_mode', 'true');

    logger.info('Mode Screenshot activé avec succès !');
    logger.info('📸 Prêt pour les captures d\'écran App Store');
    logger.info('');
    logger.info('==========================================');
    logger.info('RÉSUMÉ COMPLET DES DONNÉES GÉNÉRÉES');
    logger.info('==========================================');
    logger.info('');
    logger.info('👤 PROFIL & GAMIFICATION - 1 AN DE TRANSFORMATION!');
    logger.info(`   • Profil: Thomas Silva (178cm, 120kg → 85kg, objectif: 82kg)`);
    logger.info(`   • Perte de poids: -35kg en 1 an! 🔥🔥🔥 INCROYABLE!`);
    logger.info(`   • Grade: Empereur (天皇) - Niveau 7 - LÉGENDAIRE!`);
    logger.info(`   • Streak: 365 jours consécutifs! 💪💪`);
    logger.info(`   • XP: 9850 points - Niveau 24`);
    logger.info(`   • Avatar: Samurai (masculin) + 14 autres débloqués`);
    logger.info(`   • Badges: ${badges.length} débloqués`);
    logger.info('');
    logger.info('📊 STATS (6 onglets) - 1 AN DE DONNÉES!');
    logger.info(`   • Poids: ${weights.length} pesées sur 365 jours (120kg → 85kg = -35kg!)`);
    logger.info(`   • Composition: 18% graisse (-17%), 42% muscle (+12%), 58% eau, âge méta 28 ans (-17 ans!)`);
    logger.info(`   • Mensurations: ${measurements.length} entrées - Taille -10cm, Biceps +2.5cm!`);
    logger.info(`   • Discipline: ${trainingsCount} entraînements (3 clubs avec logos)`);
    logger.info(`   • Performance: ${carnetCount} éléments (Dév Couché 80kg×6, 10km 36min)`);
    logger.info(`   • Vitalité: SpO2 99%, HRV 62ms, FC repos 54 bpm - ATHLÈTE!`);
    logger.info('');
    logger.info('🏋️ ENTRAÎNEMENT & PLANNING');
    logger.info(`   • Clubs: Run & Fit Marseille (Running), Basic-Fit (Muscu), Urban Street Workout (Calisthenics)`);
    logger.info(`   • Planning: 6 séances/semaine (max 2/jour, Mer/Dim repos)`);
    logger.info(`   • Carnet: Benchmarks muscu (Dév Couché, Squat, Soulevé, Tractions...)`);
    logger.info(`   • Carnet: Benchmarks running (5km, 10km, Semi, Trail)`);
    logger.info(`   • Carnet: 9 techniques JJB (Berimbolo, Triangle, Armbar, Kimura...)`);
    logger.info('');
    logger.info('🏆 COMPÉTITION');
    logger.info(`   • À venir: Open Marseille JJB (J-15), HYROX Paris (J-45)`);
    logger.info(`   • Palmares: 3 compétitions passées`);
    logger.info(`     - Open Nice JJB: 🥉 Bronze (-82kg)`);
    logger.info(`     - HYROX Lyon: 45ème/250 (1h18)`);
    logger.info(`     - Open Marseille JJB: 🥈 Argent (-77kg)`);
    logger.info('');
    logger.info('🎮 GAMIFICATION');
    logger.info(`   • Défis quotidiens: 3 (8000 pas, Hydratation, Entraînement)`);
    logger.info(`   • Défis hebdomadaires: 2 (5 entraînements, 5 pesées)`);
    logger.info(`   • Quêtes: 3 (Objectif poids, 100 entraînements, Streak 90j)`);
    logger.info('');
    logger.info('🍽️ NUTRITION & JEÛNE');
    logger.info(`   • Jeûne intermittent: 14 jours (16/8 en semaine, 18/6 weekend)`);
    logger.info('');
    logger.info('⏱️ OUTILS');
    logger.info(`   • Timer: 8 sessions (Combat, HIIT, EMOM, AMRAP, Tabata)`);
    logger.info(`   • Calculateurs: IMC, IMG, TDEE disponibles`);
    logger.info('');
    logger.info('❤️ APPLE HEALTH - 6 MOIS - NIVEAU ATHLÈTE ÉLITE!');
    logger.info(`   • Pas: 180 jours (6000-18000 pas/jour, aujourd'hui: 13567!) 🚀`);
    logger.info(`   • Calories: 180 jours (350-1100 kcal/jour - BEAST MODE!)`);
    logger.info(`   • Distance: 180 jours (5-15 km/jour, aujourd'hui: 10.1km)`);
    logger.info(`   • FC repos: 52-58 bpm (NIVEAU ATHLÈTE!), max 175-195 bpm`);
    logger.info(`   • SpO2: 97-100% (santé parfaite!), HRV: 45-75ms`);
    logger.info('');
    logger.info('📸 TRANSFORMATION VISUELLE');
    logger.info(`   • Photos: 3 photos (début, milieu, actuelle)`);
    logger.info(`   • Poids: Variations dramatiques visibles sur graphiques!`);
    logger.info(`   • Cartes de partage: Disponibles pour réseaux sociaux`);
    logger.info('');
    logger.info('💤 VITALITÉ - RÉCUPÉRATION OPTIMALE');
    logger.info(`   • Sommeil: 30 nuits (7-9h, 26% profond, 23% REM, qualité 89%)`);
    logger.info(`   • Hydratation: 30 jours (aujourd'hui: 3.2L/3.5L - CHAMPION!)`);
    logger.info(`   • Charge: Niveau 92%, Stress 15% - GESTION PARFAITE!`);
    logger.info(`   • Charge: 14 jours + 12 semaines (optimal 85%)`);
    logger.info(`   • Batterie: 180 jours (récupération, nutrition, stress)`);
    logger.info('');
    logger.info('🗓️ PLANNING HEBDOMADAIRE TYPE');
    logger.info('   Lun: Run & Fit (Endurance) 07h00 + Basic-Fit (Muscu) 18h30');
    logger.info('   Mar: Urban Street Workout (Upper Body) 10h');
    logger.info('   Mer: REPOS');
    logger.info('   Jeu: Run & Fit (Fractionné) 07h00 + Basic-Fit (Muscu) 18h30');
    logger.info('   Ven: Urban Street Workout (Skills) 10h');
    logger.info('   Sam: Run & Fit (Long Run) 08h00 - Après-midi REPOS');
    logger.info('   Dim: REPOS');
    logger.info('');
    logger.info('==========================================');
    logger.info('✅ MODE SCREENSHOT 100% COMPLET');
    logger.info('==========================================');

    return {
      success: true,
    };
  } catch (error) {
    logger.error('❌ Erreur lors du chargement des données de démonstration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
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
      const rf = await database.getFirstAsync<{ id: number }>(`SELECT id FROM clubs WHERE sport = 'running' LIMIT 1`);
      const bf = await database.getFirstAsync<{ id: number }>(`SELECT id FROM clubs WHERE sport = 'musculation' LIMIT 1`);
      const usw = await database.getFirstAsync<{ id: number }>(`SELECT id FROM clubs WHERE sport = 'calisthenics' LIMIT 1`);

      clubIds = {
        runAndFit: rf?.id || 1,
        basicFit: bf?.id || 2,
        urbanStreetWorkout: usw?.id || 3,
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
