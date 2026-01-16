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
// PROFIL DE DÉMONSTRATION
// ============================================
const DEMO_PROFILE = {
  name: 'Thomas Silva',
  height_cm: 175,
  start_weight: 85.0,
  target_weight: 77.0,
  sport: 'jjb', // Jiu-Jitsu Brésilien
  mode: 'competitor',
  startDate: subDays(new Date(), 90), // Il y a 3 mois
};

// ============================================
// GÉNÉRATION DES PESÉES (3 mois)
// ============================================
const generateWeights = () => {
  const weights = [];
  const days = 90;
  const startWeight = 85.0;
  const endWeight = 78.2;
  const totalLoss = startWeight - endWeight; // 6.8kg perdu sur 3 mois

  for (let i = 0; i <= days; i++) {
    const date = subDays(new Date(), days - i);

    // Progression réaliste : belle courbe descendante
    let progress;
    if (i < 30) {
      // Mois 1 : perte initiale rapide (eau + graisse)
      progress = (i / 30) * 0.45; // 45% de la perte totale
    } else if (i < 60) {
      // Mois 2 : progression steady
      progress = 0.45 + ((i - 30) / 30) * 0.35; // +35%
    } else {
      // Mois 3 : derniers kilos (plus difficiles mais constants)
      progress = 0.80 + ((i - 60) / 30) * 0.20; // +20%
    }

    const baseWeight = startWeight - (totalLoss * progress);

    // Petites variations naturelles (±0.3kg max)
    const dailyVariation = (Math.sin(i * 0.3) * 0.15) + (Math.cos(i * 0.2) * 0.1);
    const weight = baseWeight + dailyVariation;

    // Enregistrer 4-5 fois par semaine pour de beaux graphiques
    if (i % 2 === 0 || i % 3 === 1) {
      weights.push({
        date: format(date, 'yyyy-MM-dd'),
        weight: Math.round(weight * 10) / 10,
        bodyFat: Math.round((20 - (progress * 4)) * 10) / 10, // 20% → 16% (belle composition)
        muscleMass: Math.round((40 + (progress * 3)) * 10) / 10, // 40% → 43% (gain muscle)
        water: Math.round((54 + (progress * 2)) * 10) / 10, // 54% → 56%
        // Données de composition avancées pour screenshots
        boneMass: Math.round((3.1 + (progress * 0.2)) * 10) / 10, // 3.1kg → 3.3kg
        visceralFat: Math.round((10 - (progress * 3))), // 10 → 7 (amélioration)
        bmr: Math.round(1750 + (progress * 100)), // 1750 → 1850 kcal (métabolisme augmente)
        metabolicAge: Math.round(32 - (progress * 4)), // 32 → 28 ans (rajeunissement!)
      });
    }
  }

  return weights;
};

// ============================================
// GÉNÉRATION DES MENSURATIONS (3 mois - 7 zones)
// ============================================
const generateMeasurements = () => {
  const measurements = [];
  const months = 3;

  for (let i = 0; i <= months; i++) {
    const date = subDays(new Date(), (months - i) * 30);
    const progress = i / months;

    measurements.push({
      date: format(date, 'yyyy-MM-dd'),
      waist: Math.round((94 - progress * 10) * 10) / 10, // 94cm → 84cm (-10cm taille!)
      chest: Math.round((102 + progress * 3) * 10) / 10, // 102cm → 105cm (+3cm pecs!)
      hips: Math.round((100 - progress * 4) * 10) / 10, // 100cm → 96cm (-4cm)
      left_thigh: Math.round((58 - progress * 2) * 10) / 10, // 58cm → 56cm (-2cm)
      right_thigh: Math.round((58 - progress * 2) * 10) / 10, // 58cm → 56cm (-2cm)
      left_arm: Math.round((35 + progress * 2.5) * 10) / 10, // 35cm → 37.5cm (+2.5cm biceps!)
      right_arm: Math.round((35 + progress * 2.5) * 10) / 10, // 35cm → 37.5cm (+2.5cm biceps!)
      left_calf: Math.round((38.5 + progress * 0.5) * 10) / 10, // 38.5cm → 39cm
      right_calf: Math.round((38.5 + progress * 0.5) * 10) / 10, // 38.5cm → 39cm
      neck: Math.round((39.5 - progress * 1.5) * 10) / 10, // 39.5cm → 38cm (-1.5cm)
    });
  }

  return measurements;
};

// ============================================
// GÉNÉRATION DES ENTRAÎNEMENTS (Décembre complet)
// ============================================
// Planning diversifié avec 4 clubs :
// - Gracie Barra Les Olives (JJB)
// - Basic-Fit Marseille (Musculation)
// - Marseille Fight Club (MMA)
// - Team Sorel (Grappling/MMA)
//
// Règles :
// - Max 2 entraînements par jour (matin + soir)
// - Mercredi : REPOS
// - Dimanche : REPOS
// - Samedi après-midi : REPOS (matin uniquement)
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

  logger.info(`📅 Génération décembre (${daysInDec} jours) + janvier (${daysInJan} jours) avec 4 clubs`);
  logger.info(`🏢 Clubs: Gracie Barra, Basic-Fit, Marseille Fight Club, Team Sorel`);

  // Types de séances variées pour chaque club
  const jjbSessions = [
    { type: 'technique', notes: 'Passage de garde - Half guard sweeps' },
    { type: 'technique', notes: 'Contrôles - Mount & Back control' },
    { type: 'technique', notes: 'Soumissions - Armbars & Triangles' },
    { type: 'sparring', notes: 'Positional sparring - Guard retention' },
    { type: 'drilling', notes: 'Drilling escapes & transitions' },
  ];

  const mmaSessions = [
    { type: 'striking', notes: 'Striking - Combos pieds/poings' },
    { type: 'grappling', notes: 'Grappling - Takedowns & clinch' },
    { type: 'mma', notes: 'MMA - Transitions stand-up/ground' },
    { type: 'sparring', notes: 'Light sparring - 3 rounds x 5min' },
  ];

  const muscuSessions = [
    { muscles: 'pectoraux,triceps', notes: 'Push Day - Développé couché 5x5' },
    { muscles: 'dos,biceps', notes: 'Pull Day - Tractions + Rowing' },
    { muscles: 'jambes,fessiers', notes: 'Leg Day - Squat 5x5 + Fentes' },
    { muscles: 'epaules,abdos', notes: 'Shoulders & Core - Military press' },
  ];

  const teamSorelSessions = [
    { type: 'grappling', notes: 'No-Gi Grappling - Leg locks' },
    { type: 'technique', notes: 'Wrestling - Double & single leg' },
    { type: 'sparring', notes: 'Open mat - Rounds 6min' },
    { type: 'drilling', notes: 'Submission chains' },
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
    // LUNDI (1) = MATIN Basic-Fit + SOIR Gracie Barra
    // ======================================
    if (dayOfWeek === 1) {
      const muscuSession = muscuSessions[sessionIndex % muscuSessions.length];
      // MATIN : Basic-Fit
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, date, start_time, duration_minutes, muscles, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.basicFit, 'musculation', dateStr, '07:30', 65, muscuSession.muscles, muscuSession.notes]
      );
      count++;

      const jjbSession = jjbSessions[sessionIndex % jjbSessions.length];
      // SOIR : Gracie Barra JJB
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.gracieBarra, 'jjb', jjbSession.type, dateStr, '19:30', 90, jjbSession.notes]
      );
      count++;
    }

    // ======================================
    // MARDI (2) = MATIN Marseille Fight Club + SOIR Team Sorel
    // ======================================
    if (dayOfWeek === 2) {
      const mmaSession = mmaSessions[sessionIndex % mmaSessions.length];
      // MATIN : MFC - MMA
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.marseilleFightClub, 'mma', mmaSession.type, dateStr, '10:00', 75, mmaSession.notes]
      );
      count++;

      const sorelSession = teamSorelSessions[sessionIndex % teamSorelSessions.length];
      // SOIR : Team Sorel
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.teamSorel, 'grappling', sorelSession.type, dateStr, '20:00', 90, sorelSession.notes]
      );
      count++;
    }

    // ======================================
    // JEUDI (4) = MATIN Basic-Fit + SOIR Gracie Barra
    // ======================================
    if (dayOfWeek === 4) {
      const muscuSession = muscuSessions[(sessionIndex + 1) % muscuSessions.length];
      // MATIN : Basic-Fit
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, date, start_time, duration_minutes, muscles, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.basicFit, 'musculation', dateStr, '07:00', 60, muscuSession.muscles, muscuSession.notes]
      );
      count++;

      const jjbSession = jjbSessions[(sessionIndex + 2) % jjbSessions.length];
      // SOIR : Gracie Barra JJB
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.gracieBarra, 'jjb', jjbSession.type, dateStr, '19:00', 90, jjbSession.notes]
      );
      count++;
    }

    // ======================================
    // VENDREDI (5) = MATIN Team Sorel + SOIR Marseille Fight Club
    // ======================================
    if (dayOfWeek === 5) {
      const sorelSession = teamSorelSessions[(sessionIndex + 1) % teamSorelSessions.length];
      // MATIN : Team Sorel
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.teamSorel, 'grappling', sorelSession.type, dateStr, '10:30', 75, sorelSession.notes]
      );
      count++;

      const mmaSession = mmaSessions[(sessionIndex + 2) % mmaSessions.length];
      // SOIR : MFC - MMA
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.marseilleFightClub, 'mma', mmaSession.type, dateStr, '18:30', 90, mmaSession.notes]
      );
      count++;
    }

    // ======================================
    // SAMEDI (6) = MATIN SEULEMENT (Gracie Barra Open Mat)
    // Après-midi = REPOS
    // ======================================
    if (dayOfWeek === 6) {
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.gracieBarra, 'jjb', 'sparring', dateStr, '10:00', 120, 'Open Mat - Sparring libre avec tous niveaux']
      );
      count++;
    }

    sessionIndex++;
  }

  logger.info(`✅ Décembre : Généré ${count} entraînements`);

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

    // LUNDI (1) = MATIN Basic-Fit + SOIR Gracie Barra
    if (dayOfWeek === 1) {
      const muscuSession = muscuSessions[sessionIndex % muscuSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, date, start_time, duration_minutes, muscles, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.basicFit, 'musculation', dateStr, '07:30', 65, muscuSession.muscles, muscuSession.notes]
      );
      count++;

      const jjbSession = jjbSessions[sessionIndex % jjbSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.gracieBarra, 'jjb', jjbSession.type, dateStr, '19:30', 90, jjbSession.notes]
      );
      count++;
    }

    // MARDI (2) = MATIN Marseille Fight Club + SOIR Team Sorel
    if (dayOfWeek === 2) {
      const mmaSession = mmaSessions[sessionIndex % mmaSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.marseilleFightClub, 'mma', mmaSession.type, dateStr, '10:00', 75, mmaSession.notes]
      );
      count++;

      const sorelSession = teamSorelSessions[sessionIndex % teamSorelSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.teamSorel, 'grappling', sorelSession.type, dateStr, '20:00', 90, sorelSession.notes]
      );
      count++;
    }

    // JEUDI (4) = MATIN Basic-Fit + SOIR Gracie Barra
    if (dayOfWeek === 4) {
      const muscuSession = muscuSessions[(sessionIndex + 1) % muscuSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, date, start_time, duration_minutes, muscles, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.basicFit, 'musculation', dateStr, '07:00', 60, muscuSession.muscles, muscuSession.notes]
      );
      count++;

      const jjbSession = jjbSessions[(sessionIndex + 2) % jjbSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.gracieBarra, 'jjb', jjbSession.type, dateStr, '19:00', 90, jjbSession.notes]
      );
      count++;
    }

    // VENDREDI (5) = MATIN Team Sorel + SOIR Marseille Fight Club
    if (dayOfWeek === 5) {
      const sorelSession = teamSorelSessions[(sessionIndex + 1) % teamSorelSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.teamSorel, 'grappling', sorelSession.type, dateStr, '10:30', 75, sorelSession.notes]
      );
      count++;

      const mmaSession = mmaSessions[(sessionIndex + 2) % mmaSessions.length];
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.marseilleFightClub, 'mma', mmaSession.type, dateStr, '18:30', 90, mmaSession.notes]
      );
      count++;
    }

    // SAMEDI (6) = MATIN SEULEMENT (Gracie Barra Open Mat)
    if (dayOfWeek === 6) {
      await database.runAsync(
        `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [clubIds.gracieBarra, 'jjb', 'sparring', dateStr, '10:00', 120, 'Open Mat - Sparring libre avec tous niveaux']
      );
      count++;
    }

    sessionIndex++;
  }

  logger.info(`✅ TOTAL Décembre + Janvier : Généré ${count} entraînements`);
  logger.info(`📊 Planning : Lun/Mar/Jeu/Ven = 2 séances, Sam = 1 matin, Mer/Dim = REPOS`);
  return count;
};

// ============================================
// GÉNÉRATION DES DONNÉES DE SOMMEIL
// ============================================
const generateSleepData = () => {
  const sleepEntries = [];
  const days = 90; // 3 mois de données

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
      notes: quality === 5 ? 'Sommeil récupérateur ⭐' : quality === 4 ? 'Bonne nuit' : '',
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
  marseilleFightClub: number;
  teamSorel: number;
}

const createClubs = async (): Promise<ClubIds> => {
  const database = await openDatabase();

  // Gracie Barra (JJB) - Avec logo
  const gbResult = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    ['Gracie Barra Les Olives', 'jjb', 'graciebarra', '#C41E3A']
  );

  // Basic Fit (Musculation) - Avec logo
  const bfResult = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    ['Basic-Fit Marseille', 'musculation', 'basic-fit', '#FF6B00']
  );

  // Marseille Fight Club (MMA) - Avec logo
  const mfcResult = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    ['Marseille Fight Club', 'mma', 'marseille-fight-club', '#EF4444']
  );

  // Team Sorel (Grappling/JJB No-Gi) - Avec logo
  const tsResult = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    ['Team Sorel', 'grappling', 'teamsorel', '#10B981']
  );

  logger.info(`✅ 4 clubs créés avec logos: Gracie Barra Les Olives (JJB), Basic-Fit (Muscu), Marseille Fight Club (MMA), Team Sorel (Grappling)`);

  return {
    gracieBarra: gbResult.lastInsertRowId,
    basicFit: bfResult.lastInsertRowId,
    marseilleFightClub: mfcResult.lastInsertRowId,
    teamSorel: tsResult.lastInsertRowId,
  };
};

// ============================================
// PLANNING HEBDOMADAIRE
// ============================================
const generateWeeklyPlan = async (clubIds: ClubIds): Promise<void> => {
  const database = await openDatabase();

  // Planning complet avec les 4 clubs - 9 séances par semaine
  const plan = [
    // ======================================
    // LUNDI (1) = MATIN Basic-Fit + SOIR Gracie Barra
    // ======================================
    { day: 1, club_id: clubIds.basicFit, sport: 'musculation', time: '07:30', duration: 65, muscles: 'pectoraux,triceps,épaules', is_rest: 0, session_type: 'Push Day' },
    { day: 1, club_id: clubIds.gracieBarra, sport: 'jjb', time: '19:30', duration: 90, is_rest: 0, session_type: 'Technique' },

    // ======================================
    // MARDI (2) = MATIN Marseille Fight Club + SOIR Team Sorel
    // ======================================
    { day: 2, club_id: clubIds.marseilleFightClub, sport: 'mma', time: '10:00', duration: 75, is_rest: 0, session_type: 'Striking' },
    { day: 2, club_id: clubIds.teamSorel, sport: 'grappling', time: '20:00', duration: 90, is_rest: 0, session_type: 'No-Gi' },

    // ======================================
    // MERCREDI (3) = REPOS
    // ======================================
    { day: 3, club_id: null, sport: 'repos', time: null, duration: null, is_rest: 1, session_type: null },

    // ======================================
    // JEUDI (4) = MATIN Basic-Fit + SOIR Gracie Barra
    // ======================================
    { day: 4, club_id: clubIds.basicFit, sport: 'musculation', time: '07:00', duration: 60, muscles: 'dos,biceps', is_rest: 0, session_type: 'Pull Day' },
    { day: 4, club_id: clubIds.gracieBarra, sport: 'jjb', time: '19:00', duration: 90, is_rest: 0, session_type: 'Sparring' },

    // ======================================
    // VENDREDI (5) = MATIN Team Sorel + SOIR Marseille Fight Club
    // ======================================
    { day: 5, club_id: clubIds.teamSorel, sport: 'grappling', time: '10:30', duration: 75, is_rest: 0, session_type: 'Wrestling' },
    { day: 5, club_id: clubIds.marseilleFightClub, sport: 'mma', time: '18:30', duration: 90, is_rest: 0, session_type: 'MMA Complet' },

    // ======================================
    // SAMEDI (6) = MATIN Gracie Barra Open Mat
    // ======================================
    { day: 6, club_id: clubIds.gracieBarra, sport: 'jjb', time: '10:00', duration: 120, is_rest: 0, session_type: 'Open Mat' },

    // ======================================
    // DIMANCHE (0) = REPOS
    // ======================================
    { day: 0, club_id: null, sport: 'repos', time: null, duration: null, is_rest: 1, session_type: null },
  ];

  for (const item of plan) {
    await database.runAsync(
      `INSERT INTO weekly_plan (day_of_week, club_id, sport, time, duration_minutes, muscles, is_rest_day, session_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.day, item.club_id, item.sport, item.time, item.duration, (item as any).muscles || null, item.is_rest, item.session_type]
    );
  }

  logger.info(`✅ Planning hebdomadaire créé: 9 séances/semaine avec 4 clubs, AVEC LOGOS`);
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
      location: 'Côte gauche',
      severity: 'Légère',
      origin: 'Gracie Barra - Sparring',
      status: 'Guérie',
      notes: 'Coup de coude pendant le sparring. Glace appliquée.',
      recoveryDays: 5,
    },
    {
      id: '2',
      date: format(subDays(new Date(), 20), 'yyyy-MM-dd'),
      type: 'Douleur musculaire',
      location: 'Épaule droite',
      severity: 'Légère',
      origin: 'Basic Fit - Développé militaire',
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
      origin: 'Gracie Barra - Travail au gi',
      status: 'Guérie',
      notes: 'Ampoule due aux grips répétés. Bandage + pansement.',
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
  const days = 90; // 3 mois de données
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

  // Photo de début (il y a 90 jours)
  const startDate = format(subDays(new Date(), 90), 'yyyy-MM-dd');
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

  logger.info('✅ 3 photos de transformation ajoutées');
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

  logger.info('✅ 2 compétitions à venir ajoutées');
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
  await AsyncStorage.setItem('@yoroi_target_weight', '77.0');
  await AsyncStorage.setItem('@yoroi_current_weight', '78.2');
  // Poids perdu calculé: 85 - 78.2 = 6.8kg
  await AsyncStorage.setItem('@yoroi_weight_lost', '6.8');
  // Reste à perdre: 78.2 - 77 = 1.2kg
  await AsyncStorage.setItem('@yoroi_weight_remaining', '1.2');
  // Progression: (6.8 / 8) * 100 = 85%
  await AsyncStorage.setItem('@yoroi_weight_progress', '85');

  // ============================================
  // PAS QUOTIDIENS - 7329 pas
  // ============================================
  await AsyncStorage.setItem('@yoroi_steps_today', '7329');
  await AsyncStorage.setItem('@yoroi_steps_goal', '8000');
  // Historique des pas sur 7 jours
  const stepsHistory = [
    { date: format(subDays(new Date(), 6), 'yyyy-MM-dd'), steps: 6842 },
    { date: format(subDays(new Date(), 5), 'yyyy-MM-dd'), steps: 8156 },
    { date: format(subDays(new Date(), 4), 'yyyy-MM-dd'), steps: 7523 },
    { date: format(subDays(new Date(), 3), 'yyyy-MM-dd'), steps: 9012 },
    { date: format(subDays(new Date(), 2), 'yyyy-MM-dd'), steps: 5634 },
    { date: format(subDays(new Date(), 1), 'yyyy-MM-dd'), steps: 8245 },
    { date: today, steps: 7329 },
  ];
  await AsyncStorage.setItem('@yoroi_steps_history', JSON.stringify(stepsHistory));

  // Hydratation d'aujourd'hui : 2.8L / 3L
  await AsyncStorage.setItem(`hydration_${today}`, '2800');
  await AsyncStorage.setItem('@yoroi_hydration_goal', '3000');

  // Sommeil d'hier : 7.5h, qualité 5/5
  const sleepEntries = [
    {
      id: `sleep_${Date.now()}`,
      date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      bedTime: '23:15',
      wakeTime: '06:45',
      duration: 450, // 7.5h en minutes
      quality: 5,
      notes: 'Excellente nuit 🌙',
    }
  ];
  await AsyncStorage.setItem('@yoroi_sleep_entries', JSON.stringify(sleepEntries));
  await AsyncStorage.setItem('@yoroi_sleep_goal', '480'); // 8h

  // Charge actuelle : Optimal, 5 séances
  const batteryData = {
    date: today,
    level: 85,
    sleep: 7.5,
    nutrition: 90,
    recovery: 85,
    stress: 20,
  };
  await AsyncStorage.setItem('@yoroi_battery_today', JSON.stringify(batteryData));

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

  logger.info('✅ Données temps réel pour accueil ajoutées');
  logger.info('   • Hydratation: 2.8L / 3L');
  logger.info('   • Sommeil: 7.5h (qualité 5/5)');
  logger.info('   • Charge: Optimal (85%)');
  logger.info('   • Événements sauvegardés: 2');
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
    await addBenchmarkEntry(benchCouche.id, 80, 8, 'Nouveau PR! 💪', today, 6, 55, 340);
    count += 3;
    logger.info('   ✅ Développé Couché: 80kg × 6 reps (PR)');
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
    logger.info('   ✅ Squat: 100kg × 5 reps');
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
    await addBenchmarkEntry(running10k.id, 10, 8, 'PR! 3:36/km 🔥', today, undefined, 36, 550); // 36min = PR
    count += 3;
    logger.info('   ✅ 10km: 36min (allure 3:36/km) - PR!');
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
    logger.info('   ✅ Semi-Marathon: 1h45');
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
    await addBenchmarkEntry(deadlift.id, 140, 9, 'PR! 💪 Forme parfaite', subDays(today, 3), 3, 55, 420);
    count += 3;
    logger.info('   ✅ Soulevé de Terre: 140kg × 3 reps (PR)');
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
    await addBenchmarkEntry(pullups.id, 15, 9, 'Nouveau record! 🔥', subDays(today, 2), undefined, undefined, 120);
    count += 3;
    logger.info('   ✅ Tractions: 15 reps (PR)');
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
    logger.info('   ✅ Military Press: 60kg × 6 reps (PR)');
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
    logger.info('   ✅ Rowing Barre: 70kg × 8 reps');
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
    await addBenchmarkEntry(running5k.id, 5, 9, 'PR! Sub 20 🚀', subDays(today, 4), undefined, 19.5, 245); // 19:30
    count += 3;
    logger.info('   ✅ 5km: 19:30 (allure 3:54/km) - PR!');
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
    logger.info('   ✅ Trail 15km: 1h35 (Calanques)');
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
    logger.info('   ✅ Berimbolo: En cours');
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
    logger.info('   ✅ Triangle: Maîtrisé');
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
    logger.info('   ✅ Armbar: Maîtrisé');
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
    logger.info('   ✅ Passage Toreando: En cours');
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
    logger.info('   ✅ Kimura: Maîtrisé');
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
    logger.info('   ✅ Back Take: En cours');
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
    logger.info('   ✅ Scissor Sweep: Maîtrisé');
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
    logger.info('   ✅ Guillotine: En cours');
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
    logger.info('   ✅ Omoplata: À apprendre');
  }

  return count;
};

// ============================================
// FONCTION PRINCIPALE : CHARGER LES DONNÉES
// ============================================
export const loadScreenshotDemoData = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    logger.info('🎬 Chargement des données de démonstration pour screenshots...');

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
    logger.info('✅ Profil créé dans la base de données:');
    logger.info(`   • Nom: ${DEMO_PROFILE.name}`);
    logger.info(`   • Poids départ: ${DEMO_PROFILE.start_weight}kg`);
    logger.info(`   • Objectif: ${DEMO_PROFILE.target_weight}kg`);
    logger.info(`   • Sport: ${DEMO_PROFILE.sport}`);

    // 3. Générer et insérer les pesées avec composition corporelle complète
    logger.info('📊 Génération des pesées...');
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
    logger.info(`✅ ${weights.length} pesées ajoutées avec composition corporelle complète`);

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
    logger.info(`✅ ${measurements.length} mensurations ajoutées`);

    // 5. Créer les clubs avec logos
    logger.info('🏢 Création des clubs avec logos...');
    const clubIds = await createClubs();

    // 6. Générer et insérer les entraînements
    logger.info('🥋 Génération des entraînements...');
    const trainingsCount = await generateTrainings(clubIds);
    logger.info(`✅ ${trainingsCount} entraînements ajoutés`);

    // 7. Générer le planning hebdomadaire
    logger.info('📅 Génération du planning hebdomadaire...');
    await generateWeeklyPlan(clubIds);

    // 8. Générer les photos de transformation
    logger.info('📸 Génération des photos...');
    await generatePhotos();

    // 9. Générer les données de sommeil
    logger.info('😴 Génération des données de sommeil...');
    const sleepEntries = generateSleepData();
    await AsyncStorage.setItem('@yoroi_sleep_entries', JSON.stringify(sleepEntries));
    await AsyncStorage.setItem('@yoroi_sleep_goal', '480'); // 8h
    logger.info(`✅ ${sleepEntries.length} nuits de sommeil ajoutées`);

    // 10. Générer l'hydratation
    logger.info('💧 Génération de l\'hydratation...');
    await generateHydrationData();
    await AsyncStorage.setItem('@yoroi_hydration_goal', '2500'); // 2.5L
    logger.info('✅ Données d\'hydratation ajoutées');

    // 11. Débloquer les badges
    logger.info('🏆 Déblocage des badges...');
    const badges = generateUnlockedBadges();
    await AsyncStorage.setItem('@yoroi_unlocked_badges', JSON.stringify(badges));
    logger.info(`✅ ${badges.length} badges débloqués`);

    // 12. Sauvegarder les blessures
    logger.info('🏥 Génération des blessures...');
    const injuries = generateInjuries();
    await AsyncStorage.setItem('@yoroi_injuries', JSON.stringify(injuries));
    logger.info(`✅ ${injuries.length} blessures ajoutées`);

    // 13. Sauvegarder la charge d'entraînement (format quotidien pour le graphique)
    logger.info('📊 Génération de la charge d\'entraînement...');
    const trainingLoads = generateTrainingLoads();
    await AsyncStorage.setItem('@yoroi_training_loads', JSON.stringify(trainingLoads)); // Clé avec 's' pour le service
    const trainingLoad = generateTrainingLoad(); // Legacy
    await AsyncStorage.setItem('@yoroi_training_load', JSON.stringify(trainingLoad));
    logger.info(`✅ ${trainingLoads.length} charges quotidiennes + ${trainingLoad.length} semaines ajoutées`);

    // 14. Sauvegarder les données de batterie
    logger.info('🔋 Génération des données de batterie...');
    const batteryData = generateBatteryData();
    await AsyncStorage.setItem('@yoroi_battery_history', JSON.stringify(batteryData));
    logger.info(`✅ ${batteryData.length} jours de batterie ajoutés`);

    // 15. Générer les compétitions à venir
    logger.info('🏆 Génération des compétitions...');
    await generateCompetitions();

    // 16. Générer les données temps réel pour l'accueil
    logger.info('📱 Génération des données temps réel...');
    await generateTodayData();

    // 17. Générer les données du Carnet d'Entraînement
    logger.info('📓 Génération du Carnet d\'Entraînement...');
    const carnetCount = await generateCarnetData();
    logger.info(`✅ ${carnetCount} éléments ajoutés au carnet`);

    // 18. Définir des objectifs et paramètres
    await AsyncStorage.setItem('@yoroi_steps_goal', '8000');
    await AsyncStorage.setItem('@yoroi_calories_goal', '400');
    await AsyncStorage.setItem('@yoroi_current_level', '12');
    await AsyncStorage.setItem('@yoroi_total_xp', '2850');
    await AsyncStorage.setItem('@yoroi_current_streak', '63');
    await AsyncStorage.setItem('@yoroi_best_streak', '63');

    // 19. Activer le mode screenshot
    await AsyncStorage.setItem('@yoroi_screenshot_mode', 'true');

    logger.info('🎉 Mode Screenshot activé avec succès !');
    logger.info('📸 Prêt pour les captures d\'écran App Store');
    logger.info('');
    logger.info('📊 Résumé des données générées:');
    logger.info(`   • Profil: Thomas Silva (175cm, 85kg → 78.2kg, objectif: 77kg)`);
    logger.info(`   • Pesées: ${weights.length} entrées (poids actuel: 78.2kg)`);
    logger.info(`   • Composition corporelle: 16% graisse, 43% muscle, 55% eau`);
    logger.info(`   • Mensurations: ${measurements.length} entrées`);
    logger.info(`   • Entraînements: ${trainingsCount} sessions (Décembre + Janvier complets, max 2/jour)`);
    logger.info(`   • Clubs AVEC LOGOS: Gracie Barra 🥋 + Basic-Fit 💪 + Marseille Fight Club 🥊 + Team Sorel 🤼`);
    logger.info(`   • Photos: 3 photos de transformation`);
    logger.info(`   • Sommeil: ${sleepEntries.length} nuits (hier: 7.5h, qualité 5/5)`);
    logger.info(`   • Hydratation: 2.8L / 3L aujourd'hui`);
    logger.info(`   • Charge: Optimal (85%), 9 séances/semaine`);
    logger.info(`   • Vitalité: 90 jours de batterie/récupération`);
    logger.info(`   • Compétitions: 2 à venir (Open de Marseille JJB J-15, HYROX Paris J-45)`);
    logger.info(`   • Événements sauvegardés: 2 (IBJJF Paris, HYROX Marseille)`);
    logger.info(`   • Carnet: ${carnetCount} éléments (Dév Couché 80kg×6, 10km 36min, Berimbolo, Triangle...)`);
    logger.info(`   • Badges: ${badges.length} débloqués`);
    logger.info(`   • Streak: 63 jours 🔥`);
    logger.info(`   • Niveau: 12`);
    logger.info('');
    logger.info('📅 Planning type (9 séances/semaine - max 2/jour):');
    logger.info('   Lun: Basic-Fit (Muscu) 07h30 + Gracie Barra (JJB) 19h30');
    logger.info('   Mar: Marseille Fight Club (MMA) 10h + Team Sorel (Grappling) 20h');
    logger.info('   Mer: REPOS');
    logger.info('   Jeu: Basic-Fit (Muscu) 07h + Gracie Barra (JJB) 19h');
    logger.info('   Ven: Team Sorel (Grappling) 10h30 + Marseille Fight Club (MMA) 18h30');
    logger.info('   Sam: Gracie Barra (Open Mat) 10h - Après-midi REPOS');
    logger.info('   Dim: REPOS');

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
      logger.info('✅ Base SQLite vidée');
    } catch (dbError) {
      logger.warn('⚠️ Erreur reset SQLite:', dbError);
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

    logger.info('✅ Données de démonstration TOTALEMENT effacées');
    logger.info('✅ Mode Screenshot désactivé');

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
    logger.info('🔥 RESET COMPLET DE LA BASE DE DONNÉES...');

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
      logger.info(`✅ ${yoroiKeys.length} clés AsyncStorage supprimées`);
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

      logger.info(`📊 AVANT RESET: ${deletedCount.trainings} entraînements, ${deletedCount.clubs} clubs, ${deletedCount.weights} pesées`);

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

      logger.info('✅ Toutes les tables SQLite vidées');
    } catch (dbError) {
      logger.warn('⚠️ Impossible de vider SQLite (sera recréée au prochain lancement):', dbError);
      // On continue quand même - AsyncStorage a été vidé
    }

    logger.info('✅ Reset complet terminé');

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

    logger.info(`📊 Entraînements avant nettoyage: ${beforeCount}`);

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
      const mfc = await database.getFirstAsync<{ id: number }>(`SELECT id FROM clubs WHERE sport = 'mma' LIMIT 1`);
      const ts = await database.getFirstAsync<{ id: number }>(`SELECT id FROM clubs WHERE sport = 'grappling' LIMIT 1`);

      clubIds = {
        gracieBarra: gb?.id || 1,
        basicFit: bf?.id || 2,
        marseilleFightClub: mfc?.id || 3,
        teamSorel: ts?.id || 4,
      };
    }

    // Regénérer les entraînements propres
    logger.info('🏋️ Régénération des entraînements propres...');
    const newCount = await generateTrainings(clubIds);

    logger.info(`✅ Nettoyage terminé: ${beforeCount} → ${newCount} entraînements`);
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
