// ============================================
// DEMO DATA SERVICE - Profil Heny
// Genere des données realistes pour screenshots App Store
//
// SECURITE : backup automatique des vraies données avant injection
// + restauration complete quand on desactive le mode demo
// Les données utilisateur ne sont JAMAIS perdues.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';
import secureStorage from './security/secureStorage';
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
  addInjury,
} from './database';
import { addCombat } from './fighterModeService';
import { setGoal } from './trainingGoalsService';

// ============================================
// BACKUP / RESTORE KEYS
// ============================================

const DEMO_ACTIVE_KEY = '@yoroi_demo_data_active';
const DEMO_BACKUP_SQLITE_KEY = '@yoroi_demo_backup_sqlite';
const DEMO_BACKUP_ASYNC_KEY = '@yoroi_demo_backup_async';

// All AsyncStorage keys that the demo modifies
// These will be backed up and restored
// Clés SecureStore touchées par la démo (backup/restore via secureStorage)
const DEMO_SECURE_KEYS = [
  '@yoroi_current_weight',
  '@yoroi_target_weight',
  '@yoroi_sleep_entries',
  '@yoroi_mood_log',
];

const DEMO_ASYNC_KEYS = [
  '@yoroi_user_settings',
  '@yoroi_user_height',
  '@yoroi_user_sport',
  '@yoroi_user_mode',
  '@yoroi_gender',
  '@yoroi_belt',
  '@yoroi_start_weight',
  '@yoroi_first_use_date',
  '@yoroi_user_clubs',
  '@yoroi_favorite_sports',
  '@yoroi_training_loads',
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
  '@yoroi_unlocked_badges',
  '@yoroi_badge_unlock_dates',
  '@yoroi_quests_state',
  '@yoroi_avatar_config',
  '@yoroi_weekly_challenge',
  '@yoroi_completed_challenges',
  '@yoroi_challenge_xp',
  '@yoroi_challenge_last_daily_reset',
  '@yoroi_challenge_last_weekly_reset',
  '@yoroi_challenge_last_monthly_reset',
  '@yoroi_personal_records',
  '@yoroi_health_daily_bonus',
  '@yoroi_health_bonus_history',
  '@yoroi_competitor_profile',
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
  // Backup SecureStore keys
  const secureBackup: Record<string, any> = {};
  for (const key of DEMO_SECURE_KEYS) {
    secureBackup[key] = await secureStorage.getItem(key);
  }
  await AsyncStorage.setItem(DEMO_BACKUP_ASYNC_KEY, JSON.stringify({ async: asyncBackup, secure: secureBackup }));

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

    // 3. Restore AsyncStorage + SecureStore keys from backup
    const asyncBackupStr = await AsyncStorage.getItem(DEMO_BACKUP_ASYNC_KEY);
    if (asyncBackupStr) {
      const parsed = JSON.parse(asyncBackupStr);
      // Support both old flat format and new { async, secure } format
      const asyncBackup: Record<string, string | null> = parsed.async ?? parsed;
      const secureBackup: Record<string, any> = parsed.secure ?? {};

      for (const key of DEMO_ASYNC_KEYS) {
        const value = asyncBackup[key];
        if (value !== null && value !== undefined) {
          await AsyncStorage.setItem(key, value);
        } else {
          await AsyncStorage.removeItem(key);
        }
      }

      for (const key of DEMO_SECURE_KEYS) {
        const value = secureBackup[key];
        if (value !== null && value !== undefined) {
          await secureStorage.setItem(key, value);
        } else {
          await secureStorage.removeItem(key);
        }
      }

      logger.info('[DemoData] AsyncStorage + SecureStore data restored.');
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
    name: 'Heny',
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
    username: 'Heny',
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
  await AsyncStorage.setItem('@yoroi_user_height', '178');
  await AsyncStorage.setItem('@yoroi_user_sport', 'jjb');
  await AsyncStorage.setItem('@yoroi_user_mode', 'fighter');
  await AsyncStorage.setItem('@yoroi_gender', 'male');
  await AsyncStorage.setItem('@yoroi_belt', 'bleue');
  await secureStorage.setItem('@yoroi_current_weight', '83.2');
  await AsyncStorage.setItem('@yoroi_start_weight', '87');
  await secureStorage.setItem('@yoroi_target_weight', '80');
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

  await secureStorage.setItem('@yoroi_sleep_entries', sleepEntries);
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
  await AsyncStorage.setItem('@yoroi_unified_total_points', '1220');
  await AsyncStorage.setItem('@yoroi_unified_breakdown', JSON.stringify({ activityPoints: 580, questsXp: 240, challengesXp: 180, challengeServiceXp: 120, healthBonus: 100, total: 1220 }));
  await AsyncStorage.setItem('@yoroi_current_streak', '23');
  await AsyncStorage.setItem('@yoroi_best_streak', '28');
  await AsyncStorage.setItem('@yoroi_current_charge', '78');

  // ========== 14. BADGES ==========
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  const unlockedBadges = [
    'first_flame',
    'fortnight_warrior',
    'first_training',
    'beginner',
    'committed',
    'regular',
    'warrior',
    'veteran',
    'first_step',
    'first_kilo',
    'first_three',
    'launched',
    'team_yoroi_member',
    'analyst',
  ];
  const badgeUnlockDates: Record<string, string> = {
    first_flame:       daysAgo(180),
    fortnight_warrior: daysAgo(150),
    first_training:    daysAgo(180),
    beginner:          daysAgo(160),
    committed:         daysAgo(120),
    regular:           daysAgo(90),
    warrior:           daysAgo(60),
    veteran:           daysAgo(30),
    first_step:        daysAgo(175),
    first_kilo:        daysAgo(140),
    first_three:       daysAgo(100),
    launched:          daysAgo(50),
    team_yoroi_member: daysAgo(180),
    analyst:           daysAgo(20),
  };
  await AsyncStorage.setItem('@yoroi_unlocked_badges', JSON.stringify(unlockedBadges));
  await AsyncStorage.setItem('@yoroi_badge_unlock_dates', JSON.stringify(badgeUnlockDates));

  // ========== 15. QUETES ==========
  const questsState = {
    daily: [
      { id: 'daily_train', title: 'Séance du jour', description: 'Compléter une séance d\'entraînement', xpReward: 30, target: 1, progress: 1, completed: true, type: 'daily' },
      { id: 'daily_hydration', title: 'Hydratation', description: 'Boire 2L d\'eau', xpReward: 15, target: 8, progress: 8, completed: true, type: 'daily' },
      { id: 'daily_steps', title: 'Objectif pas', description: 'Atteindre 8000 pas', xpReward: 20, target: 8000, progress: 8000, completed: true, type: 'daily' },
      { id: 'daily_sleep', title: 'Sommeil récupérateur', description: 'Dormir 7h ou plus', xpReward: 25, target: 7, progress: 7, completed: true, type: 'daily' },
      { id: 'daily_log', title: 'Journal du guerrier', description: 'Enregistrer une donnée de santé', xpReward: 10, target: 1, progress: 0, completed: false, type: 'daily' },
    ],
    weekly: [
      { id: 'weekly_sessions', title: 'Semaine active', description: '4 séances cette semaine', xpReward: 80, target: 4, progress: 3, completed: false, type: 'weekly' },
      { id: 'weekly_weight', title: 'Suivi du poids', description: 'Peser 3 fois cette semaine', xpReward: 40, target: 3, progress: 3, completed: true, type: 'weekly' },
      { id: 'weekly_bjj', title: 'Tapis de BJJ', description: '2 séances de BJJ', xpReward: 60, target: 2, progress: 2, completed: true, type: 'weekly' },
      { id: 'weekly_cardio', title: 'Cardio warrior', description: '1 séance cardio de 30min', xpReward: 50, target: 1, progress: 1, completed: true, type: 'weekly' },
      { id: 'weekly_streak', title: 'Sans relâche', description: 'Maintenir la série 7 jours', xpReward: 100, target: 7, progress: 5, completed: false, type: 'weekly' },
    ],
    monthly: [
      { id: 'monthly_sessions', title: 'Mois de guerrier', description: '16 séances ce mois', xpReward: 200, target: 16, progress: 14, completed: false, type: 'monthly' },
      { id: 'monthly_weight_loss', title: 'Perte de poids', description: 'Perdre 1kg ce mois', xpReward: 150, target: 1, progress: 1, completed: true, type: 'monthly' },
      { id: 'monthly_new_record', title: 'Record brisé', description: 'Battre un record personnel', xpReward: 120, target: 1, progress: 1, completed: true, type: 'monthly' },
      { id: 'monthly_consistency', title: 'Consistance', description: '20 jours actifs ce mois', xpReward: 180, target: 20, progress: 16, completed: false, type: 'monthly' },
      { id: 'monthly_scan', title: 'Analyse complète', description: 'Remplir toutes les métriques santé', xpReward: 100, target: 5, progress: 3, completed: false, type: 'monthly' },
    ],
    lastReset: { daily: daysAgo(0), weekly: daysAgo(2), monthly: daysAgo(10) },
  };
  await AsyncStorage.setItem('@yoroi_quests_state', JSON.stringify(questsState));

  // ========== 16. BLESSURES ==========
  await addInjury({ zone_id: 'shoulder_r', zone_view: 'front', pain_type: 'tendinite', cause: 'Surcharge en développé couché', eva_score: 3, notes: 'Douleur à la rotation externe, amélioration progressive', date: daysAgo(45), status: 'healing', fit_for_duty: 'restricted' });
  await addInjury({ zone_id: 'wrist_r', zone_view: 'front', pain_type: 'entorse', cause: 'Chute en sparring BJJ', eva_score: 2, notes: 'Légère instabilité, port de strapping recommandé', date: daysAgo(30), status: 'healing', fit_for_duty: 'restricted' });
  await addInjury({ zone_id: 'knee_l', zone_view: 'front', pain_type: 'entorse', cause: 'Shoot raté lors d\'un tournoi', eva_score: 5, notes: 'IRM en attente, éviter les shoots et takedowns', date: daysAgo(18), status: 'active', fit_for_duty: 'unfit' });
  await addInjury({ zone_id: 'spine_lower', zone_view: 'back', pain_type: 'lumbago', cause: 'Soulevé de terre charge excessive', eva_score: 4, notes: 'Séances kiné 2x/semaine, étirements quotidiens', date: daysAgo(60), status: 'healing', fit_for_duty: 'restricted' });
  await addInjury({ zone_id: 'hamstring_l', zone_view: 'back', pain_type: 'contracture', cause: 'Echauffement insuffisant', eva_score: 0, notes: 'Totalement rétabli, reprise progressive validée', date: daysAgo(90), status: 'healed', fit_for_duty: 'operational' });

  // ========== 17. AVATAR ==========
  await AsyncStorage.setItem('@yoroi_avatar_config', JSON.stringify({
    pack: 'bjj',
    packType: 'character',
    gender: 'male',
    level: 3,
    state: 'strong',
  }));

  // ========== 18. CHALLENGES ==========
  const challengeMonday = new Date(now);
  const challengeDayOfWeek = challengeMonday.getDay();
  const challengeDiffToMonday = challengeDayOfWeek === 0 ? -6 : 1 - challengeDayOfWeek;
  challengeMonday.setDate(challengeMonday.getDate() + challengeDiffToMonday);
  challengeMonday.setHours(0, 0, 0, 0);
  const challengeSunday = new Date(challengeMonday);
  challengeSunday.setDate(challengeSunday.getDate() + 6);
  challengeSunday.setHours(23, 59, 59, 999);

  await AsyncStorage.setItem('@yoroi_weekly_challenge', JSON.stringify({
    challenge: { id: 'warrior', name: 'Athlète', nameJp: '戦士', description: '4 entraînements cette semaine', target: 4, xpReward: 150, icon: '', color: '#EF4444' },
    weekStart: challengeMonday.toISOString(),
    weekEnd: challengeSunday.toISOString(),
    progress: 3,
    completed: false,
    xpClaimed: false,
  }));

  const makePastChallenge = (
    id: string, name: string, nameJp: string, desc: string,
    target: number, xp: number, color: string, weeksAgo: number
  ) => {
    const mon = new Date(now);
    mon.setDate(mon.getDate() - weeksAgo * 7 + challengeDiffToMonday);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon); sun.setDate(sun.getDate() + 6); sun.setHours(23, 59, 59, 999);
    const completedAt = new Date(sun); completedAt.setHours(20, 0, 0, 0);
    return {
      challenge: { id, name, nameJp, description: desc, target, xpReward: xp, icon: '', color },
      weekStart: mon.toISOString(),
      weekEnd: sun.toISOString(),
      progress: target,
      completed: true,
      completedAt: completedAt.toISOString(),
      xpClaimed: true,
    };
  };

  const completedChallenges = [
    makePastChallenge('regularity', 'Régularité', '規則性', '5 pesées cette semaine', 5, 100, '#3B82F6', 1),
    makePastChallenge('warrior', 'Athlète', '戦士', '4 entraînements cette semaine', 4, 150, '#EF4444', 2),
    makePastChallenge('complete', 'Complet', '完全', 'Pesée + mensurations + entraînement', 3, 200, '#8B5CF6', 3),
    makePastChallenge('streak', 'Série', '連続', '7 jours de suite', 7, 250, '#F59E0B', 4),
    makePastChallenge('warrior', 'Athlète', '戦士', '4 entraînements cette semaine', 4, 150, '#EF4444', 5),
    makePastChallenge('regularity', 'Régularité', '規則性', '5 pesées cette semaine', 5, 100, '#3B82F6', 6),
    makePastChallenge('complete', 'Complet', '完全', 'Pesée + mensurations + entraînement', 3, 200, '#8B5CF6', 7),
    makePastChallenge('photo', 'Photo', '写真', '1 photo de transformation', 1, 50, '#10B981', 8),
  ];
  await AsyncStorage.setItem('@yoroi_completed_challenges', JSON.stringify(completedChallenges));
  await AsyncStorage.setItem('@yoroi_challenge_xp', '1250');
  await AsyncStorage.setItem('@yoroi_challenge_last_daily_reset', daysAgo(0));
  await AsyncStorage.setItem('@yoroi_challenge_last_weekly_reset', challengeMonday.toISOString());
  await AsyncStorage.setItem('@yoroi_challenge_last_monthly_reset', daysAgo(10));

  // ========== 19. COMBATS BJJ ==========
  const combatsData = [
    { date: fmtDate(addDays(now, -5)),  resultat: 'victoire', methode: 'soumission', technique: 'Triangle',           round: 2, temps: '3:42', adversaire_nom: 'Lucas Fernandez',  adversaire_club: 'Alliance BJJ',          poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Belle entrée en triangle depuis la garde ouverte' },
    { date: fmtDate(addDays(now, -12)), resultat: 'victoire', methode: 'soumission', technique: 'Kimura',             round: 1, temps: '1:58', adversaire_nom: 'Rayan Benali',     adversaire_club: 'Gracie Barra Lyon',     poids_pesee: 82.0, poids_jour_j: 82.5, notes: 'Kimura depuis la garde fermée, bonne pression' },
    { date: fmtDate(addDays(now, -19)), resultat: 'defaite',  methode: 'points',     technique: null,                 round: 3, temps: '5:00', adversaire_nom: 'Marco Costa',      adversaire_club: 'Checkmat Paris',        poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Perdu aux points 8-4, à retravailler la garde' },
    { date: fmtDate(addDays(now, -26)), resultat: 'victoire', methode: 'soumission', technique: 'Rear Naked Choke',   round: 2, temps: '4:15', adversaire_nom: 'Sofiane Hadj',     adversaire_club: 'Team Nogueira',         poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Pris le dos depuis la demi-garde' },
    { date: fmtDate(addDays(now, -33)), resultat: 'victoire', methode: 'points',     technique: null,                 round: 3, temps: '5:00', adversaire_nom: 'Ahmed Touati',     adversaire_club: 'Metamoris France',      poids_pesee: 81.5, poids_jour_j: 82.0, notes: 'Victoire aux points 12-2, bonne gestion' },
    { date: fmtDate(addDays(now, -45)), resultat: 'nul',      methode: 'decision',   technique: null,                 round: 3, temps: '5:00', adversaire_nom: 'Pierre Moreau',    adversaire_club: 'Gracie Barra Paris',    poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Match très serré, tout dans la garde' },
    { date: fmtDate(addDays(now, -60)), resultat: 'victoire', methode: 'soumission', technique: 'Armbar',             round: 1, temps: '2:30', adversaire_nom: 'Yoann Petit',      adversaire_club: 'Basic-Fit BJJ',         poids_pesee: 82.0, poids_jour_j: 81.5, notes: 'Armbar depuis la garde montée' },
    { date: fmtDate(addDays(now, -75)), resultat: 'defaite',  methode: 'soumission', technique: 'Heel Hook',          round: 2, temps: '3:10', adversaire_nom: 'Mateus Silva',     adversaire_club: 'Atos Paris',            poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Heel hook inattendu, mieux défendre les jambes' },
    { date: fmtDate(addDays(now, -90)), resultat: 'victoire', methode: 'soumission', technique: 'Guillotine',         round: 1, temps: '1:22', adversaire_nom: 'Thomas Blanc',     adversaire_club: 'Tristar Paris',         poids_pesee: 81.5, poids_jour_j: 82.0, notes: 'Guillotine parfaite sur le takedown adverse' },
    { date: fmtDate(addDays(now, -110)),resultat: 'victoire', methode: 'points',     technique: null,                 round: 3, temps: '5:00', adversaire_nom: 'Karim Hadjadj',    adversaire_club: 'Lotus Club',            poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Bonne gestion, passage en side control dominant' },
    { date: fmtDate(addDays(now, -130)),resultat: 'defaite',  methode: 'points',     technique: null,                 round: 3, temps: '5:00', adversaire_nom: 'Julien Vasseur',   adversaire_club: 'Carlson Gracie Paris',  poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Perdu de justesse 4-6' },
    { date: fmtDate(addDays(now, -150)),resultat: 'victoire', methode: 'soumission', technique: 'Cross Collar Choke', round: 2, temps: '4:48', adversaire_nom: 'Nassim Boucharel', adversaire_club: 'Ribeiro Jiu-Jitsu',     poids_pesee: 82.5, poids_jour_j: 82.5, notes: 'Étranglement depuis la montée, bien travaillé' },
  ];
  for (const combat of combatsData) {
    try { await addCombat(combat as any); } catch { /* table déjà initialisée */ }
  }

  // ========== 20. OBJECTIFS ENTRAINEMENT ==========
  try {
    await setGoal('jjb', 3);
    await setGoal('musculation', 2);
    await setGoal('running', 1);
  } catch { /* ignore si déjà défini */ }

  // ========== 21. RECORDS PERSONNELS ==========
  const personalRecords = {
    lowestWeight:         { value: 81.2, date: fmtDate(addDays(now, -7)),   label: 'Plus bas poids' },
    startingWeight:       { value: 87.5, date: fmtDate(addDays(now, -180)), label: 'Poids de départ' },
    maxWeeklyLoss:        { value: 1.8,  date: fmtDate(addDays(now, -60)),  label: 'Perte semaine max' },
    maxMonthlyLoss:       { value: 2.5,  date: fmtDate(addDays(now, -90)),  label: 'Perte mois max' },
    totalWeightLoss:      6.3,
    longestStreak:        { value: 28, date: fmtDate(addDays(now, -30)),    label: 'Meilleure série' },
    currentStreak:        23,
    lowestWaist:          { value: 83, date: fmtDate(addDays(now, -14)),    label: 'Tour de taille min' },
    totalWaistLoss:       5,
    maxWeeklyWorkouts:    { value: 6, date: fmtDate(addDays(now, -45)),     label: 'Séances max/semaine' },
    totalWorkouts:        187,
    favoriteSport:        { type: 'jjb', count: 112 },
    bestMonthRegularity:  { value: 92, date: fmtDate(addDays(now, -60)),   label: 'Meilleure régularité' },
    totalMeasurements:    42,
    bestEnergyStreak:     { value: 14, date: fmtDate(addDays(now, -20)),   label: 'Série énergie haute' },
    lastUpdated:          now.toISOString(),
  };
  await AsyncStorage.setItem('@yoroi_personal_records', JSON.stringify(personalRecords));

  // ========== 22. MOOD / ENERGIE ==========
  const moodTypes = ['motivated', 'energized', 'focused', 'tired', 'motivated', 'stressed', 'motivated', 'energized', 'calm', 'focused'];
  const energyPattern = [4, 4, 3, 4, 5, 2, 4, 4, 3, 4, 4, 5, 3, 4, 4, 2, 4, 4, 5, 4, 3, 4, 4, 4, 5, 4, 3, 4, 4, 4];
  const moodEntries = Array.from({ length: 30 }, (_, i) => {
    const entryDate = addDays(now, -i);
    return {
      id: `demo-mood-${i}`,
      date: fmtDate(entryDate),
      mood: moodTypes[i % moodTypes.length],
      energy: energyPattern[i] ?? 4,
      timestamp: new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 8, 30).toISOString(),
    };
  });
  await secureStorage.setItem('@yoroi_mood_log', moodEntries);

  // ========== 23. BONUS SANTE ==========
  const healthBonusEntries = Array.from({ length: 60 }, (_, i) => {
    const hasSteps   = i % 4 !== 3;
    const hasSleep   = i % 5 !== 4;
    const hasCalories = i % 3 !== 2;
    return {
      date: fmtDate(addDays(now, -i)),
      stepsBonus:    hasSteps    ? 10 : 0,
      sleepBonus:    hasSleep    ? 10 : 0,
      caloriesBonus: hasCalories ? 5  : 0,
      total:         (hasSteps ? 10 : 0) + (hasSleep ? 10 : 0) + (hasCalories ? 5 : 0),
    };
  });
  const healthBonusTotal = healthBonusEntries.reduce((sum, e) => sum + e.total, 0);
  await AsyncStorage.setItem('@yoroi_health_daily_bonus', String(healthBonusTotal));
  await AsyncStorage.setItem('@yoroi_health_bonus_history', JSON.stringify({
    entries: healthBonusEntries,
    cumulativeTotal: healthBonusTotal,
  }));

  // ========== 24. PROFIL COMPETITEUR ==========
  await AsyncStorage.setItem('@yoroi_competitor_profile', JSON.stringify({
    gender: 'male',
    category: 'medium-heavy',
    belt: 'blue',
    currentWeight: 82.0,
  }));

  // ======= STEP 3: MARK DEMO AS ACTIVE =======
  await AsyncStorage.setItem(DEMO_ACTIVE_KEY, 'true');

  const benchmarkCount = benchmarks.reduce((acc, b) => acc + b.entries.length, 0);
  logger.info(`[DemoData] Heny profile generated: ${workoutCount} trainings, ${weightCount} weights, ${measurementCount} measurements, ${sleepCount} sleep, ${benchmarkCount} benchmarks, ${skills.length} skills, ${unlockedBadges.length} badges, 5 injuries, ${combatsData.length} combats, 8 challenges completed, 30 mood entries. Real data backed up.`);

  return {
    workouts: workoutCount,
    weights: weightCount,
    measurements: measurementCount,
    sleepEntries: sleepCount,
    benchmarks: benchmarkCount,
    skills: skills.length,
  };
};
