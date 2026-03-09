// ============================================
// DEMO DATA SERVICE - Profil Henry
// Genere des données realistes pour screenshots App Store
//
// SECURITE : backup automatique des vraies données avant injection
// + restauration complete quand on desactive le mode demo
// Les données utilisateur ne sont JAMAIS perdues.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';
import {
  saveProfile,
  addClub,
  addWeight,
  addMeasurementRecord,
  addTraining,
  addWeeklyPlanItem,
  upsertSlotOccurrence,
  addCompetition,
  saveHealthData,
  initDatabase,
  exportAllData,
  importData,
  resetDatabase,
} from './database';

// ============================================
// BACKUP / RESTORE KEYS
// ============================================

const DEMO_ACTIVE_KEY = '@yoroi_demo_data_active';
const DEMO_BACKUP_SQLITE_KEY = '@yoroi_demo_backup_sqlite';
const DEMO_BACKUP_ASYNC_KEY = '@yoroi_demo_backup_async';

// All AsyncStorage keys that the demo modifies
// These will be backed up and restored
const DEMO_ASYNC_KEYS = [
  '@yoroi_user_settings',
  '@yoroi_user_name',
  '@yoroi_user_height',
  '@yoroi_user_sport',
  '@yoroi_user_mode',
  '@yoroi_gender',
  '@yoroi_belt',
  '@yoroi_current_weight',
  '@yoroi_start_weight',
  '@yoroi_target_weight',
  '@yoroi_first_use_date',
  '@yoroi_user_clubs',
  '@yoroi_favorite_sports',
  '@yoroi_training_loads',
  '@yoroi_sleep_entries',
  '@yoroi_sleep_goal',
  '@yoroi_sleep_longest_streak',
  '@yoroi_resting_heart_rate',
  '@yoroi_hrv_current',
  '@yoroi_spo2_current',
  '@yoroi_steps_today',
  '@yoroi_steps_goal',
  '@yoroi_distance_today',
  '@yoroi_distance_goal',
  '@yoroi_calories_today',
  '@yoroi_calories_goal',
  '@yoroi_hydration_log',
  '@yoroi_hydration_goal',
  'yoroi_benchmarks_v2',
  'yoroi_skills_v2',
  '@yoroi_unified_total_points',
  '@yoroi_unified_breakdown',
  '@yoroi_current_streak',
  '@yoroi_best_streak',
  '@yoroi_current_charge',
];

// ============================================
// HELPERS
// ============================================

const generateId = (): string =>
  `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const rand = (min: number, max: number, decimals = 1): number =>
  parseFloat((min + Math.random() * (max - min)).toFixed(decimals));

const randInt = (min: number, max: number): number =>
  Math.floor(min + Math.random() * (max - min + 1));

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const fmtDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (d: Date, n: number): Date => {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
};

const dow = (d: Date): number => d.getDay();

const fmtTime = (h: number, m: number): string =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

const JJB_THEMES = [
  'Passage de garde', 'Balayage', 'Triangle depuis garde fermee',
  'Kimura', 'Demi-garde', 'De la Riva', 'Takedowns', 'Back take',
  'Mount escapes', 'Side control', 'Knee cut', 'Etranglement arriere',
  'Arm drag', 'X-Guard', 'Berimbolo', 'Omoplata', 'Leg locks',
  'Guillotine', 'Darce choke', 'Anaconda', 'Open mat',
];

const MUSCU_MUSCLES: Record<string, string[]> = {
  'Push': ['chest', 'shoulders', 'triceps'],
  'Pull': ['back', 'biceps', 'forearms'],
  'Legs': ['quadriceps', 'hamstrings', 'glutes', 'calves'],
  'Full Body': ['chest', 'back', 'shoulders', 'quadriceps', 'core'],
};

// ============================================
// CHECK IF DEMO IS ACTIVE
// ============================================

export const isDemoDataActive = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(DEMO_ACTIVE_KEY);
  return val === 'true';
};

// ============================================
// BACKUP REAL DATA (before demo injection)
// ============================================

const backupRealData = async (): Promise<void> => {
  logger.info('[DemoData] Backing up real user data...');

  // 1. Backup SQLite via exportAllData
  const sqliteData = await exportAllData();
  await AsyncStorage.setItem(DEMO_BACKUP_SQLITE_KEY, JSON.stringify(sqliteData));

  // 2. Backup all AsyncStorage keys that demo will touch
  const asyncBackup: Record<string, string | null> = {};
  for (const key of DEMO_ASYNC_KEYS) {
    asyncBackup[key] = await AsyncStorage.getItem(key);
  }
  await AsyncStorage.setItem(DEMO_BACKUP_ASYNC_KEY, JSON.stringify(asyncBackup));

  logger.info('[DemoData] Backup complete.');
};

// ============================================
// RESTORE REAL DATA (when disabling demo)
// ============================================

export const restoreRealData = async (): Promise<boolean> => {
  const isActive = await isDemoDataActive();
  if (!isActive) {
    logger.info('[DemoData] No demo data active, nothing to restore.');
    return false;
  }

  logger.info('[DemoData] Restoring real user data...');

  try {
    // 1. Reset all SQLite tables (clears demo data)
    await resetDatabase();

    // 2. Restore SQLite data from backup
    const sqliteBackupStr = await AsyncStorage.getItem(DEMO_BACKUP_SQLITE_KEY);
    if (sqliteBackupStr) {
      await importData(sqliteBackupStr);
      logger.info('[DemoData] SQLite data restored.');
    }

    // 3. Restore AsyncStorage keys from backup
    const asyncBackupStr = await AsyncStorage.getItem(DEMO_BACKUP_ASYNC_KEY);
    if (asyncBackupStr) {
      const asyncBackup: Record<string, string | null> = JSON.parse(asyncBackupStr);
      for (const key of DEMO_ASYNC_KEYS) {
        const value = asyncBackup[key];
        if (value !== null && value !== undefined) {
          await AsyncStorage.setItem(key, value);
        } else {
          await AsyncStorage.removeItem(key);
        }
      }
      logger.info('[DemoData] AsyncStorage data restored.');
    }

    // 4. Clean up backup keys and flag
    await AsyncStorage.multiRemove([
      DEMO_ACTIVE_KEY,
      DEMO_BACKUP_SQLITE_KEY,
      DEMO_BACKUP_ASYNC_KEY,
    ]);

    logger.info('[DemoData] Restore complete. Real data is back.');
    return true;
  } catch (error) {
    logger.error('[DemoData] Restore failed:', error);
    throw error;
  }
};

// ============================================
// MAIN GENERATOR
// ============================================

export const generateHenryDemoData = async (): Promise<{
  workouts: number;
  weights: number;
  measurements: number;
  sleepEntries: number;
  benchmarks: number;
  skills: number;
}> => {
  await initDatabase();

  // ======= STEP 0: BACKUP REAL DATA =======
  const alreadyActive = await isDemoDataActive();
  if (!alreadyActive) {
    // Only backup if not already in demo mode (avoid backing up demo data)
    await backupRealData();
  }

  // ======= STEP 1: CLEAR EXISTING DATA =======
  await resetDatabase();
  // Clear AsyncStorage keys that demo will write to
  for (const key of DEMO_ASYNC_KEYS) {
    await AsyncStorage.removeItem(key);
  }

  // ======= STEP 2: INJECT DEMO DATA =======
  const startDate = new Date(2026, 2, 1);
  const endDate = new Date(2026, 11, 31);
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  let workoutCount = 0;
  let weightCount = 0;
  let measurementCount = 0;
  let sleepCount = 0;

  // ========== 1. PROFILE ==========
  await saveProfile({
    name: 'Henry',
    height_cm: 178,
    target_weight: 80,
    start_weight: 87,
    start_date: fmtDate(startDate),
    avatar_gender: 'homme',
    weight_goal: 'lose',
    age: 30,
    birth_date: '1996-05-15',
  });

  await AsyncStorage.setItem('@yoroi_user_settings', JSON.stringify({
    username: 'Henry',
    height: 178,
    weight_unit: 'kg',
    measurement_unit: 'cm',
    goal: 'lose_weight',
    targetWeight: 80,
    startWeight: 87,
    gender: 'male',
    onboardingCompleted: true,
    citationStyle: 'warrior',
  }));
  await AsyncStorage.setItem('@yoroi_user_name', 'Henry');
  await AsyncStorage.setItem('@yoroi_user_height', '178');
  await AsyncStorage.setItem('@yoroi_user_sport', 'jjb');
  await AsyncStorage.setItem('@yoroi_user_mode', 'fighter');
  await AsyncStorage.setItem('@yoroi_gender', 'male');
  await AsyncStorage.setItem('@yoroi_belt', 'bleue');
  await AsyncStorage.setItem('@yoroi_current_weight', '83.2');
  await AsyncStorage.setItem('@yoroi_start_weight', '87');
  await AsyncStorage.setItem('@yoroi_target_weight', '80');
  await AsyncStorage.setItem('@yoroi_first_use_date', startDate.toISOString());

  // ========== 2. CLUBS ==========
  const gbClubId = await addClub({ name: 'Gracie Barra Les Olives', sport: 'jjb', color: '#EF4444', sessions_per_week: 4, logo_uri: 'graciebarra' });
  const bfClubId = await addClub({ name: 'Basic-Fit Prado', sport: 'musculation', color: '#3B82F6', sessions_per_week: 3, logo_uri: 'basic-fit' });

  await AsyncStorage.setItem('@yoroi_user_clubs', JSON.stringify([
    { id: gbClubId, name: 'Gracie Barra Les Olives', sport: 'jjb', color: '#EF4444', sessions_per_week: 4, logo_uri: 'graciebarra' },
    { id: bfClubId, name: 'Basic-Fit Prado', sport: 'musculation', color: '#3B82F6', sessions_per_week: 3, logo_uri: 'basic-fit' },
  ]));
  await AsyncStorage.setItem('@yoroi_favorite_sports', JSON.stringify(['jjb', 'musculation']));

  // ========== 3. EMPLOI DU TEMPS ==========
  const slotId1 = await addWeeklyPlanItem({ day_of_week: 0, club_id: gbClubId, sport: 'jjb', time: '19:00', duration_minutes: 90, session_type: 'Cours', label: 'JJB lundi soir' });
  const slotId2 = await addWeeklyPlanItem({ day_of_week: 1, club_id: bfClubId, sport: 'musculation', time: '12:00', duration_minutes: 70, session_type: 'Push', label: 'Muscu mardi midi' });
  const slotId3 = await addWeeklyPlanItem({ day_of_week: 2, club_id: gbClubId, sport: 'jjb', time: '19:00', duration_minutes: 90, session_type: 'Sparring' });
  const slotId4 = await addWeeklyPlanItem({ day_of_week: 3, club_id: bfClubId, sport: 'musculation', time: '12:00', duration_minutes: 70, session_type: 'Pull' });
  const slotId5 = await addWeeklyPlanItem({ day_of_week: 4, club_id: gbClubId, sport: 'jjb', time: '19:00', duration_minutes: 90, session_type: 'Drilling' });
  const slotId6 = await addWeeklyPlanItem({ day_of_week: 5, club_id: gbClubId, sport: 'jjb', time: '10:00', duration_minutes: 120, session_type: 'Open Mat' });
  const slotId7 = await addWeeklyPlanItem({ day_of_week: 5, club_id: bfClubId, sport: 'musculation', time: '15:00', duration_minutes: 60, session_type: 'Legs' });
  await addWeeklyPlanItem({ day_of_week: 6, sport: 'repos', is_rest_day: true });

  // ========== 3b. SLOT OCCURRENCES DEMO ==========
  // Calculer les 4 derniers lundis pour creer des occurrences variees
  const now = new Date();
  const jsDay = now.getDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diffToMonday);

  const weekStarts = [];
  for (let i = 0; i < 4; i++) {
    const ws = new Date(thisMonday);
    ws.setDate(thisMonday.getDate() - i * 7);
    weekStarts.push(ws.toISOString().split('T')[0]);
  }

  // Semaine courante: quelques valides, quelques en attente
  await upsertSlotOccurrence({ weekly_plan_id: slotId1, week_start: weekStarts[0], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId2, week_start: weekStarts[0], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId3, week_start: weekStarts[0], status: 'pending' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId4, week_start: weekStarts[0], status: 'pending' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId5, week_start: weekStarts[0], status: 'pending' });

  // Semaine -1: tout valide sauf 1 annule
  await upsertSlotOccurrence({ weekly_plan_id: slotId1, week_start: weekStarts[1], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId2, week_start: weekStarts[1], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId3, week_start: weekStarts[1], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId4, week_start: weekStarts[1], status: 'cancelled', cancel_reason: 'Fatigue' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId5, week_start: weekStarts[1], status: 'validated' });

  // Semaine -2: valide
  await upsertSlotOccurrence({ weekly_plan_id: slotId1, week_start: weekStarts[2], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId2, week_start: weekStarts[2], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId3, week_start: weekStarts[2], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId4, week_start: weekStarts[2], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId5, week_start: weekStarts[2], status: 'validated' });

  // Semaine -3: quelques annules (blessure)
  await upsertSlotOccurrence({ weekly_plan_id: slotId1, week_start: weekStarts[3], status: 'cancelled', cancel_reason: 'Blessure genou' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId2, week_start: weekStarts[3], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId3, week_start: weekStarts[3], status: 'cancelled', cancel_reason: 'Blessure genou' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId4, week_start: weekStarts[3], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId5, week_start: weekStarts[3], status: 'skipped' });

  // ========== 4. TRAININGS ==========
  let current = new Date(startDate);
  const trainingLoads: any[] = [];

  while (current <= endDate) {
    const d = dow(current);
    const dateStr = fmtDate(current);
    const dayIdx = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const progress = dayIdx / totalDays;

    // JJB: Lun(1), Mer(3), Ven(5) 19h
    if (d === 1 || d === 3 || d === 5) {
      if (Math.random() > 0.1) {
        const duration = randInt(75, 95);
        const intensity = randInt(6, 9);
        await addTraining({
          club_id: gbClubId, sport: 'jjb',
          session_type: pick(['cours', 'cours', 'cours', 'drilling', 'sparring']),
          date: dateStr, start_time: '19:00', duration_minutes: duration, intensity,
          technical_theme: pick(JJB_THEMES),
          calories: Math.round(duration * rand(8, 12, 0)),
          heart_rate: randInt(125, 155), max_heart_rate: randInt(165, 185),
          technique_rating: randInt(2, 5), source: 'manual',
        });
        workoutCount++;
        trainingLoads.push({ date: dateStr, duration, rpe: intensity, load: duration * intensity, sport: 'jjb' });
      }
    }

    // JJB: Sam(6) 10h open mat
    if (d === 6 && Math.random() > 0.2) {
      const duration = randInt(90, 130);
      const intensity = randInt(7, 10);
      await addTraining({
        club_id: gbClubId, sport: 'jjb', session_type: 'open_mat',
        date: dateStr, start_time: '10:00', duration_minutes: duration, intensity,
        technical_theme: 'Open mat',
        calories: Math.round(duration * rand(9, 13, 0)),
        heart_rate: randInt(135, 160), max_heart_rate: randInt(170, 190),
        technique_rating: randInt(3, 5), rounds: randInt(6, 12), round_duration: 5, source: 'manual',
      });
      workoutCount++;
      trainingLoads.push({ date: dateStr, duration, rpe: intensity, load: duration * intensity, sport: 'jjb' });
    }

    // Musculation: Mar(2), Jeu(4) 12h
    if (d === 2 || d === 4) {
      if (Math.random() > 0.08) {
        const mg = pick(Object.keys(MUSCU_MUSCLES));
        const duration = randInt(55, 75);
        const intensity = randInt(6, 9);
        await addTraining({
          club_id: bfClubId, sport: 'musculation', session_type: 'entraînement',
          date: dateStr, start_time: '12:00', duration_minutes: duration, intensity,
          muscles: JSON.stringify(MUSCU_MUSCLES[mg]), notes: mg,
          calories: Math.round(duration * rand(6, 10, 0)),
          heart_rate: randInt(105, 135), max_heart_rate: randInt(150, 170), source: 'manual',
        });
        workoutCount++;
        trainingLoads.push({ date: dateStr, duration, rpe: intensity, load: duration * intensity, sport: 'musculation' });
      }
    }

    // Musculation: Sam(6) 15h
    if (d === 6 && Math.random() > 0.3) {
      const mg = pick(Object.keys(MUSCU_MUSCLES));
      const duration = randInt(50, 65);
      const intensity = randInt(6, 8);
      await addTraining({
        club_id: bfClubId, sport: 'musculation', session_type: 'entraînement',
        date: dateStr, start_time: '15:00', duration_minutes: duration, intensity,
        muscles: JSON.stringify(MUSCU_MUSCLES[mg]), notes: mg,
        calories: Math.round(duration * rand(6, 10, 0)),
        heart_rate: randInt(110, 140), max_heart_rate: randInt(155, 175), source: 'manual',
      });
      workoutCount++;
      trainingLoads.push({ date: dateStr, duration, rpe: intensity, load: duration * intensity, sport: 'musculation' });
    }

    current = addDays(current, 1);
  }

  await AsyncStorage.setItem('@yoroi_training_loads', JSON.stringify(trainingLoads));

  // ========== 5. PESEES ==========
  current = new Date(startDate);
  while (current <= endDate) {
    const d = dow(current);
    if (d === 1 || d === 3 || d === 5) {
      const dayIdx = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const progress = dayIdx / totalDays;
      const weight = parseFloat((87 - progress * 6 + rand(-0.4, 0.4)).toFixed(1));
      await addWeight({
        weight,
        fat_percent: parseFloat((22 - progress * 6 + rand(-0.3, 0.3)).toFixed(1)),
        muscle_percent: parseFloat((38 + progress * 4 + rand(-0.2, 0.2)).toFixed(1)),
        water_percent: parseFloat((55 + progress * 5 + rand(-0.5, 0.5)).toFixed(1)),
        bone_mass: parseFloat((3.2 + progress * 0.2 + rand(-0.05, 0.05)).toFixed(1)),
        visceral_fat: Math.round(12 - progress * 3),
        metabolic_age: Math.round(32 - progress * 4),
        bmr: Math.round(1750 + progress * 70 + randInt(-10, 10)),
        date: fmtDate(current), source: 'manual',
      });
      weightCount++;
    }
    current = addDays(current, 1);
  }

  // ========== 6. MENSURATIONS ==========
  for (let m = 0; m < 10; m++) {
    const monthDate = new Date(2026, 2 + m, 1);
    while (monthDate.getDay() !== 1) monthDate.setDate(monthDate.getDate() + 1);
    const progress = m / 9;
    await addMeasurementRecord({
      chest: parseFloat((102 + progress * 3 + rand(-0.5, 0.5)).toFixed(1)),
      waist: parseFloat((90 - progress * 7 + rand(-0.3, 0.3)).toFixed(1)),
      navel: parseFloat((95 - progress * 8 + rand(-0.3, 0.3)).toFixed(1)),
      hips: parseFloat((100 - progress * 3 + rand(-0.3, 0.3)).toFixed(1)),
      shoulders: parseFloat((118 + progress * 2 + rand(-0.3, 0.3)).toFixed(1)),
      left_arm: parseFloat((35 + progress * 1.5 + rand(-0.2, 0.2)).toFixed(1)),
      right_arm: parseFloat((35.5 + progress * 1.5 + rand(-0.2, 0.2)).toFixed(1)),
      left_thigh: parseFloat((58 - progress * 1 + rand(-0.3, 0.3)).toFixed(1)),
      right_thigh: parseFloat((58.5 - progress * 1 + rand(-0.3, 0.3)).toFixed(1)),
      left_calf: parseFloat((37 + progress * 0.5 + rand(-0.2, 0.2)).toFixed(1)),
      right_calf: parseFloat((37.2 + progress * 0.5 + rand(-0.2, 0.2)).toFixed(1)),
      neck: parseFloat((39 - progress * 0.5 + rand(-0.2, 0.2)).toFixed(1)),
      date: fmtDate(monthDate),
    });
    measurementCount++;
  }

  // ========== 7. SOMMEIL ==========
  const sleepEntries: any[] = [];
  current = new Date(startDate);
  while (current <= endDate) {
    const dayIdx = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const progress = dayIdx / totalDays;
    const d = dow(current);
    const dateStr = fmtDate(current);
    if (Math.random() < 0.05) { current = addDays(current, 1); continue; }

    const baseBedHour = d === 5 || d === 6 ? 23.5 : 22.5;
    const bedHourDecimal = baseBedHour + rand(-0.5, 1.0) - progress * 0.3;
    const bedH = Math.floor(bedHourDecimal >= 24 ? bedHourDecimal - 24 : bedHourDecimal);
    const bedM = Math.round((bedHourDecimal % 1) * 60 / 15) * 15;
    const bedTime = fmtTime(bedH, Math.min(bedM, 45));

    const baseDuration = d === 0 || d === 6 ? 8.0 : 7.0;
    const durationHours = baseDuration + progress * 0.5 + rand(-0.5, 0.5);
    const durationMin = Math.round(Math.max(300, Math.min(600, durationHours * 60)));

    const wakeHourDecimal = bedHourDecimal + durationHours;
    const wakeH = Math.floor(wakeHourDecimal >= 24 ? wakeHourDecimal - 24 : wakeHourDecimal);
    const wakeM = Math.round(((wakeHourDecimal % 1) * 60) / 15) * 15;
    const wakeTime = fmtTime(wakeH, Math.min(wakeM, 45));

    const quality = Math.min(5, Math.max(1, Math.round(3 + progress * 1.5 + rand(-0.8, 0.8))));
    const deepMin = Math.round(durationMin * rand(0.13, 0.20));
    const remMin = Math.round(durationMin * rand(0.18, 0.25));
    const awakeMin = Math.round(durationMin * rand(0.03, 0.08));
    const coreMin = durationMin - deepMin - remMin - awakeMin;

    sleepEntries.push({
      id: `sleep_demo_${dateStr}`, date: dateStr, bedTime, wakeTime, duration: durationMin, quality,
      phases: { deep: deepMin, rem: remMin, core: coreMin, awake: awakeMin, inBed: durationMin + awakeMin + randInt(5, 20) },
      source: 'demo', efficiency: Math.round((durationMin / (durationMin + awakeMin + randInt(5, 15))) * 100),
      interruptions: randInt(0, 3),
      sleepHeartRate: { min: randInt(48, 55), max: randInt(68, 78), avg: randInt(56, 64) },
      respiratoryRate: { min: rand(12, 14), max: rand(16, 19), avg: rand(14, 16) },
      wristTemperature: rand(-0.3, 0.3),
    });
    sleepCount++;
    current = addDays(current, 1);
  }

  await AsyncStorage.setItem('@yoroi_sleep_entries', JSON.stringify(sleepEntries));
  await AsyncStorage.setItem('@yoroi_sleep_goal', '480');
  await AsyncStorage.setItem('@yoroi_sleep_longest_streak', '21');

  // ========== 8. HEALTH DATA ==========
  current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = fmtDate(current);
    const dayIdx = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const progress = dayIdx / totalDays;
    const d = dow(current);
    const isTrainingDay = d >= 1 && d <= 6;

    const steps = isTrainingDay ? randInt(8000, 14000) : randInt(4000, 8000);
    await saveHealthData({ date: dateStr, type: 'steps', value: steps, unit: 'count', source: 'demo' });
    await saveHealthData({ date: dateStr, type: 'distance', value: parseFloat((steps * 0.00075).toFixed(2)), unit: 'km', source: 'demo' });
    await saveHealthData({ date: dateStr, type: 'calories_active', value: isTrainingDay ? randInt(400, 800) : randInt(200, 400), unit: 'kcal', source: 'demo' });
    await saveHealthData({ date: dateStr, type: 'heart_rate_resting', value: Math.round(68 - progress * 10 + rand(-2, 2)), unit: 'bpm', source: 'demo' });
    await saveHealthData({ date: dateStr, type: 'hrv', value: Math.round(35 + progress * 20 + rand(-5, 5)), unit: 'ms', source: 'demo' });
    await saveHealthData({ date: dateStr, type: 'spo2', value: rand(96, 99, 0), unit: '%', source: 'demo' });
    await saveHealthData({ date: dateStr, type: 'respiratory_rate', value: rand(13, 17), unit: 'brpm', source: 'demo' });

    current = addDays(current, 1);
  }

  await AsyncStorage.setItem('@yoroi_resting_heart_rate', '60');
  await AsyncStorage.setItem('@yoroi_hrv_current', '50');
  await AsyncStorage.setItem('@yoroi_spo2_current', '98');
  await AsyncStorage.setItem('@yoroi_steps_today', '10542');
  await AsyncStorage.setItem('@yoroi_steps_goal', '10000');
  await AsyncStorage.setItem('@yoroi_distance_today', '7.9');
  await AsyncStorage.setItem('@yoroi_distance_goal', '8.0');
  await AsyncStorage.setItem('@yoroi_calories_today', '580');
  await AsyncStorage.setItem('@yoroi_calories_goal', '600');

  // ========== 9. HYDRATATION ==========
  const hydrationLog: any[] = [];
  current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = fmtDate(current);
    const d = dow(current);
    const numEntries = randInt(2, d >= 1 && d <= 6 ? 5 : 3);
    for (let i = 0; i < numEntries; i++) {
      hydrationLog.push({
        date: dateStr,
        quantite_ml: pick([250, 300, 350, 500]),
        type: i === 0 && Math.random() > 0.6 ? 'cafe' : 'eau',
        time: fmtTime(randInt(7, 21), randInt(0, 59)),
      });
    }
    current = addDays(current, 1);
  }
  await AsyncStorage.setItem('@yoroi_hydration_log', JSON.stringify(hydrationLog));
  await AsyncStorage.setItem('@yoroi_hydration_goal', '2500');

  // ========== 10. COMPETITIONS ==========
  await addCompetition({ nom: 'Open de Marseille JJB', date: '2026-04-18', lieu: 'Palais des Sports, Marseille', sport: 'jjb', type_evenement: 'competition', categorie_poids: '-82.3kg', poids_max: 82.3, statut: 'a_venir', rappels_actifs: true });
  await addCompetition({ nom: 'IBJJF Paris Open', date: '2026-06-20', lieu: 'Paris Expo, Paris', sport: 'jjb', type_evenement: 'competition', categorie_poids: '-82.3kg', poids_max: 82.3, statut: 'a_venir', rappels_actifs: true });
  await addCompetition({ nom: 'Coupe de France Grappling', date: '2026-09-12', lieu: 'INSEP, Paris', sport: 'jjb', type_evenement: 'competition', categorie_poids: '-80kg', poids_max: 80, statut: 'a_venir', rappels_actifs: true });
  await addCompetition({ nom: 'Championnat Regional PACA', date: '2026-11-07', lieu: 'Gymnase Borely, Marseille', sport: 'jjb', type_evenement: 'competition', categorie_poids: '-80kg', poids_max: 80, statut: 'a_venir', rappels_actifs: true });

  // ========== 11. BENCHMARKS ==========
  const benchmarks: any[] = [];
  const makeEntries = (startVal: number, endVal: number, unit: string, monthlyEntries = 3) => {
    const entries: any[] = [];
    for (let m = 0; m < 10; m++) {
      for (let e = 0; e < monthlyEntries; e++) {
        const progress = (m * monthlyEntries + e) / (10 * monthlyEntries);
        const value = unit === 'time'
          ? Math.round(startVal - progress * (startVal - endVal))
          : parseFloat((startVal + progress * (endVal - startVal)).toFixed(1));
        entries.push({ id: generateId(), value, reps: unit === 'reps' ? value : (unit === 'kg' ? randInt(1, 5) : undefined), date: fmtDate(new Date(2026, 2 + m, randInt(1, 28))), rpe: randInt(6, 10) });
      }
    }
    return entries;
  };

  benchmarks.push({ id: generateId(), name: 'Squat', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444', entries: makeEntries(100, 130, 'kg'), createdAt: startDate.toISOString() });
  benchmarks.push({ id: generateId(), name: 'Developpe Couche', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444', entries: makeEntries(80, 100, 'kg'), createdAt: startDate.toISOString() });
  benchmarks.push({ id: generateId(), name: 'Souleve de Terre', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444', entries: makeEntries(120, 160, 'kg'), createdAt: startDate.toISOString() });
  benchmarks.push({ id: generateId(), name: 'Tractions', category: 'force', unit: 'reps', iconName: 'dumbbell', color: '#EF4444', entries: makeEntries(8, 16, 'reps', 2), createdAt: startDate.toISOString() });
  benchmarks.push({ id: generateId(), name: 'Poids de Corps', category: 'bodyweight', unit: 'kg', iconName: 'scale', color: '#8B5CF6', entries: makeEntries(87, 81, 'kg', 4), createdAt: startDate.toISOString() });
  benchmarks.push({ id: generateId(), name: '5km', category: 'running', unit: 'time', iconName: 'timer', color: '#3B82F6', entries: makeEntries(1680, 1440, 'time', 2), createdAt: startDate.toISOString() });
  benchmarks.push({ id: generateId(), name: '10km', category: 'running', unit: 'time', iconName: 'timer', color: '#3B82F6', entries: makeEntries(3600, 3180, 'time', 1), createdAt: startDate.toISOString() });
  await AsyncStorage.setItem('yoroi_benchmarks_v2', JSON.stringify(benchmarks));

  // ========== 12. TECHNIQUES BJJ ==========
  const skills: any[] = [];
  const nowIso = new Date().toISOString();
  const makeSkill = (name: string, cat: string, status: 'mastered' | 'in_progress' | 'to_learn', drills: number) => ({
    id: generateId(), name, category: cat, status, drillCount: drills, notes: [], createdAt: startDate.toISOString(), updatedAt: nowIso,
  });
  skills.push(makeSkill('Garde Fermee', 'jjb_garde', 'mastered', randInt(40, 60)));
  skills.push(makeSkill('Demi-Garde', 'jjb_garde', 'mastered', randInt(35, 55)));
  skills.push(makeSkill('Triangle', 'jjb_soumission', 'mastered', randInt(30, 50)));
  skills.push(makeSkill('Kimura', 'jjb_soumission', 'mastered', randInt(25, 45)));
  skills.push(makeSkill('Single Leg', 'lutte', 'mastered', randInt(20, 40)));
  skills.push(makeSkill('De la Riva', 'jjb_garde', 'in_progress', randInt(10, 25)));
  skills.push(makeSkill('Knee Cut', 'jjb_passage', 'in_progress', randInt(12, 22)));
  skills.push(makeSkill('Cle de Bras (Armbar)', 'jjb_soumission', 'in_progress', randInt(15, 28)));
  skills.push(makeSkill('Etranglement Arriere (RNC)', 'jjb_soumission', 'in_progress', randInt(8, 18)));
  skills.push(makeSkill('Heel Hook', 'jjb_nogi', 'in_progress', randInt(5, 15)));
  skills.push(makeSkill('Double Leg', 'lutte', 'in_progress', randInt(10, 20)));
  skills.push(makeSkill('X-Guard', 'jjb_garde', 'to_learn', 0));
  skills.push(makeSkill('Body Lock Pass', 'jjb_passage', 'to_learn', 0));
  skills.push(makeSkill('Omoplata', 'jjb_soumission', 'to_learn', 0));
  skills.push(makeSkill('Darce Choke', 'jjb_nogi', 'to_learn', 0));
  await AsyncStorage.setItem('yoroi_skills_v2', JSON.stringify(skills));

  // ========== 13. GAMIFICATION ==========
  await AsyncStorage.setItem('@yoroi_unified_total_points', '850');
  await AsyncStorage.setItem('@yoroi_unified_breakdown', JSON.stringify({ activityPoints: 450, questsXp: 150, challengesXp: 120, challengeServiceXp: 80, healthBonus: 50, total: 850 }));
  await AsyncStorage.setItem('@yoroi_current_streak', '12');
  await AsyncStorage.setItem('@yoroi_best_streak', '28');
  await AsyncStorage.setItem('@yoroi_current_charge', '78');

  // ======= STEP 3: MARK DEMO AS ACTIVE =======
  await AsyncStorage.setItem(DEMO_ACTIVE_KEY, 'true');

  const benchmarkCount = benchmarks.reduce((acc, b) => acc + b.entries.length, 0);
  logger.info(`[DemoData] Henry profile generated: ${workoutCount} trainings, ${weightCount} weights, ${measurementCount} measurements, ${sleepCount} sleep, ${benchmarkCount} benchmark entries, ${skills.length} skills. Real data backed up.`);

  return {
    workouts: workoutCount,
    weights: weightCount,
    measurements: measurementCount,
    sleepEntries: sleepCount,
    benchmarks: benchmarkCount,
    skills: skills.length,
  };
};
