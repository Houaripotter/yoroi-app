// ============================================
// DEMO DATA SERVICE - Profil Hery
// Genere des donnees realistes pour screenshots App Store
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import secureStorage from './security/secureStorage';
import logger from './security/logger';

// ============================================
// HELPERS
// ============================================

const generateId = (): string =>
  `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/** Random float between min and max with 1 decimal */
const rand = (min: number, max: number, decimals = 1): number =>
  parseFloat((min + Math.random() * (max - min)).toFixed(decimals));

/** Random int between min and max (inclusive) */
const randInt = (min: number, max: number): number =>
  Math.floor(min + Math.random() * (max - min + 1));

/** Format date as YYYY-MM-DD */
const formatDate = (d: Date): string => d.toISOString().split('T')[0];

/** Add days to a date */
const addDays = (d: Date, n: number): Date => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** Get day of week (0=Sun, 1=Mon, ...) */
const dow = (d: Date): number => d.getDay();

// ============================================
// MAIN GENERATOR
// ============================================

export const generateHeryDemoData = async (): Promise<{
  workouts: number;
  measurements: number;
  benchmarks: number;
  skills: number;
}> => {
  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-12-31');

  // ========== PROFILE ==========
  const userSettings = {
    username: 'Hery',
    height: 178,
    weight_unit: 'kg' as const,
    measurement_unit: 'cm' as const,
    goal: 'lose_weight' as const,
    targetWeight: 80,
    gender: 'male' as const,
    onboardingCompleted: true,
    citationStyle: 'warrior' as const,
    userClubs: [
      {
        id: 'club-gb-olives',
        name: 'Gracie Barra Les Olives',
        type: 'gracie_barra' as const,
        logoUri: null,
        created_at: startDate.toISOString(),
      },
      {
        id: 'club-bf-prado',
        name: 'Basic-Fit Prado',
        type: 'basic_fit' as const,
        logoUri: null,
        created_at: startDate.toISOString(),
      },
    ],
  };
  await AsyncStorage.setItem('@yoroi_user_settings', JSON.stringify(userSettings));

  // ========== WORKOUTS ==========
  const workouts: any[] = [];
  let current = new Date(startDate);

  while (current <= endDate) {
    const d = dow(current);
    const dateStr = formatDate(current);

    // JJB: Lun(1), Mer(3), Ven(5) 19h + Sam(6) 10h open mat
    if (d === 1 || d === 3 || d === 5) {
      // ~10% chance de rater un cours
      if (Math.random() > 0.1) {
        workouts.push({
          id: generateId(),
          date: dateStr,
          type: 'jjb',
          club_id: 'club-gb-olives',
          created_at: new Date(current.getFullYear(), current.getMonth(), current.getDate(), 19, 0).toISOString(),
        });
      }
    }
    if (d === 6) {
      // Open mat samedi matin - 80% presence
      if (Math.random() > 0.2) {
        workouts.push({
          id: generateId(),
          date: dateStr,
          type: 'jjb',
          club_id: 'club-gb-olives',
          created_at: new Date(current.getFullYear(), current.getMonth(), current.getDate(), 10, 0).toISOString(),
        });
      }
    }

    // Musculation: Mar(2), Jeu(4) 12h + Sam(6) 15h
    if (d === 2 || d === 4) {
      if (Math.random() > 0.08) {
        workouts.push({
          id: generateId(),
          date: dateStr,
          type: 'musculation',
          club_id: 'club-bf-prado',
          created_at: new Date(current.getFullYear(), current.getMonth(), current.getDate(), 12, 0).toISOString(),
        });
      }
    }
    if (d === 6) {
      // Muscu samedi aprem - 70% presence
      if (Math.random() > 0.3) {
        workouts.push({
          id: generateId(),
          date: dateStr,
          type: 'musculation',
          club_id: 'club-bf-prado',
          created_at: new Date(current.getFullYear(), current.getMonth(), current.getDate(), 15, 0).toISOString(),
        });
      }
    }

    current = addDays(current, 1);
  }

  await AsyncStorage.setItem('@yoroi_workouts', JSON.stringify(workouts));

  // ========== MEASUREMENTS (pesees 3x/semaine + compo) ==========
  const measurements: any[] = [];
  current = new Date(startDate);
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  while (current <= endDate) {
    const d = dow(current);
    // Pesee: Lun, Mer, Ven
    if (d === 1 || d === 3 || d === 5) {
      const dayIdx = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const progress = dayIdx / totalDays; // 0 -> 1

      // Poids: 87 -> 81 avec fluctuations
      const targetWeight = 87 - progress * 6;
      const weight = parseFloat((targetWeight + rand(-0.4, 0.4)).toFixed(1));

      // Body fat: 22% -> 16%
      const bodyFat = parseFloat((22 - progress * 6 + rand(-0.3, 0.3)).toFixed(1));
      // Muscle: 38% -> 42%
      const muscle = parseFloat((38 + progress * 4 + rand(-0.2, 0.2)).toFixed(1));
      // Water: 55% -> 60%
      const water = parseFloat((55 + progress * 5 + rand(-0.5, 0.5)).toFixed(1));

      const dateStr = formatDate(current);

      // Mensurations mensuelles (1er lundi du mois)
      const isFirstWeek = current.getDate() <= 7;
      const bodyMeasurements = (d === 1 && isFirstWeek) ? {
        chest: parseFloat((102 + progress * 3 + rand(-0.5, 0.5)).toFixed(1)),
        waist: parseFloat((90 - progress * 7 + rand(-0.3, 0.3)).toFixed(1)),
        navel: parseFloat((95 - progress * 8 + rand(-0.3, 0.3)).toFixed(1)),
        hips: parseFloat((100 - progress * 3 + rand(-0.3, 0.3)).toFixed(1)),
        shoulder: parseFloat((118 + progress * 2 + rand(-0.3, 0.3)).toFixed(1)),
        left_arm: parseFloat((35 + progress * 1.5 + rand(-0.2, 0.2)).toFixed(1)),
        right_arm: parseFloat((35.5 + progress * 1.5 + rand(-0.2, 0.2)).toFixed(1)),
        left_thigh: parseFloat((58 - progress * 1 + rand(-0.3, 0.3)).toFixed(1)),
        right_thigh: parseFloat((58.5 - progress * 1 + rand(-0.3, 0.3)).toFixed(1)),
      } : undefined;

      measurements.push({
        id: generateId(),
        date: dateStr,
        weight,
        body_fat: bodyFat,
        bodyFat,
        muscle_mass: muscle,
        muscle,
        water,
        visceral_fat: Math.round(12 - progress * 3),
        metabolic_age: Math.round(32 - progress * 4),
        bmi: parseFloat((weight / (1.78 * 1.78)).toFixed(1)),
        measurements: bodyMeasurements,
        created_at: current.toISOString(),
      });
    }
    current = addDays(current, 1);
  }

  await secureStorage.setItem('@yoroi_measurements', measurements);

  // ========== BENCHMARKS (Carnet - Records) ==========
  const benchmarks: any[] = [];

  // Helper: generate progressive entries for a benchmark
  const makeEntries = (
    startVal: number,
    endVal: number,
    unit: string,
    monthlyEntries: number = 3,
  ) => {
    const entries: any[] = [];
    for (let m = 0; m < 10; m++) {
      const monthDate = new Date(2026, 2 + m, 1); // March=2 to December=11
      for (let e = 0; e < monthlyEntries; e++) {
        const day = randInt(1, 28);
        const progress = (m * monthlyEntries + e) / (10 * monthlyEntries);
        const value = unit === 'time'
          ? Math.round(startVal - progress * (startVal - endVal)) // time decreases
          : parseFloat((startVal + progress * (endVal - startVal)).toFixed(1));
        entries.push({
          id: generateId(),
          value,
          reps: unit === 'reps' ? value : (unit === 'kg' ? randInt(1, 5) : undefined),
          date: formatDate(new Date(2026, 2 + m, day)),
          rpe: randInt(6, 10),
        });
      }
    }
    return entries;
  };

  // Squat: 100kg -> 130kg
  benchmarks.push({
    id: generateId(),
    name: 'Squat',
    category: 'force',
    unit: 'kg',
    iconName: 'dumbbell',
    color: '#EF4444',
    entries: makeEntries(100, 130, 'kg'),
    createdAt: startDate.toISOString(),
  });

  // Developpe Couche: 80kg -> 100kg
  benchmarks.push({
    id: generateId(),
    name: 'Developpe Couche',
    category: 'force',
    unit: 'kg',
    iconName: 'dumbbell',
    color: '#EF4444',
    entries: makeEntries(80, 100, 'kg'),
    createdAt: startDate.toISOString(),
  });

  // Souleve de Terre: 120kg -> 160kg
  benchmarks.push({
    id: generateId(),
    name: 'Souleve de Terre',
    category: 'force',
    unit: 'kg',
    iconName: 'dumbbell',
    color: '#EF4444',
    entries: makeEntries(120, 160, 'kg'),
    createdAt: startDate.toISOString(),
  });

  // Tractions: 8 -> 16 reps
  benchmarks.push({
    id: generateId(),
    name: 'Tractions',
    category: 'force',
    unit: 'reps',
    iconName: 'dumbbell',
    color: '#EF4444',
    entries: makeEntries(8, 16, 'reps', 2),
    createdAt: startDate.toISOString(),
  });

  // Poids de Corps (suivi)
  benchmarks.push({
    id: generateId(),
    name: 'Poids de Corps',
    category: 'bodyweight',
    unit: 'kg',
    iconName: 'scale',
    color: '#8B5CF6',
    entries: makeEntries(87, 81, 'kg', 4),
    createdAt: startDate.toISOString(),
  });

  // 5km: 28min -> 24min (in seconds: 1680 -> 1440)
  benchmarks.push({
    id: generateId(),
    name: '5km',
    category: 'running',
    unit: 'time',
    iconName: 'timer',
    color: '#3B82F6',
    entries: makeEntries(1680, 1440, 'time', 2),
    createdAt: startDate.toISOString(),
  });

  // 10km: 60min -> 53min (in seconds: 3600 -> 3180)
  benchmarks.push({
    id: generateId(),
    name: '10km',
    category: 'running',
    unit: 'time',
    iconName: 'timer',
    color: '#3B82F6',
    entries: makeEntries(3600, 3180, 'time', 1),
    createdAt: startDate.toISOString(),
  });

  await AsyncStorage.setItem('yoroi_benchmarks_v2', JSON.stringify(benchmarks));

  // ========== SKILLS (Techniques BJJ) ==========
  const skills: any[] = [];
  const now = new Date().toISOString();

  const makeSkill = (
    name: string,
    category: string,
    status: 'mastered' | 'in_progress' | 'to_learn',
    drillCount: number,
  ) => ({
    id: generateId(),
    name,
    category,
    status,
    drillCount,
    notes: [],
    createdAt: startDate.toISOString(),
    updatedAt: now,
  });

  // Maitrisees
  skills.push(makeSkill('Garde Fermee', 'jjb_garde', 'mastered', randInt(40, 60)));
  skills.push(makeSkill('Demi-Garde', 'jjb_garde', 'mastered', randInt(35, 55)));
  skills.push(makeSkill('Triangle', 'jjb_soumission', 'mastered', randInt(30, 50)));
  skills.push(makeSkill('Kimura', 'jjb_soumission', 'mastered', randInt(25, 45)));
  skills.push(makeSkill('Single Leg', 'lutte', 'mastered', randInt(20, 40)));

  // En cours
  skills.push(makeSkill('De la Riva', 'jjb_garde', 'in_progress', randInt(10, 25)));
  skills.push(makeSkill('Knee Cut', 'jjb_passage', 'in_progress', randInt(12, 22)));
  skills.push(makeSkill('Cle de Bras (Armbar)', 'jjb_soumission', 'in_progress', randInt(15, 28)));
  skills.push(makeSkill('Etranglement Arriere (RNC)', 'jjb_soumission', 'in_progress', randInt(8, 18)));
  skills.push(makeSkill('Heel Hook', 'jjb_nogi', 'in_progress', randInt(5, 15)));
  skills.push(makeSkill('Double Leg', 'lutte', 'in_progress', randInt(10, 20)));

  // A apprendre
  skills.push(makeSkill('X-Guard', 'jjb_garde', 'to_learn', 0));
  skills.push(makeSkill('Body Lock Pass', 'jjb_passage', 'to_learn', 0));
  skills.push(makeSkill('Omoplata', 'jjb_soumission', 'to_learn', 0));
  skills.push(makeSkill('Darce Choke', 'jjb_nogi', 'to_learn', 0));

  await AsyncStorage.setItem('yoroi_skills_v2', JSON.stringify(skills));

  // ========== GAMIFICATION ==========
  await AsyncStorage.setItem('@yoroi_unified_total_points', '850');
  await AsyncStorage.setItem('@yoroi_unified_breakdown', JSON.stringify({
    activityPoints: 450,
    questsXp: 150,
    challengesXp: 120,
    challengeServiceXp: 80,
    healthBonus: 50,
    total: 850,
  }));

  logger.info(`[DemoData] Hery profile generated: ${workouts.length} workouts, ${measurements.length} measurements, ${benchmarks.length} benchmarks, ${skills.length} skills`);

  return {
    workouts: workouts.length,
    measurements: measurements.length,
    benchmarks: benchmarks.length,
    skills: skills.length,
  };
};
