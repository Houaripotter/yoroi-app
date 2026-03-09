// ============================================
// CARNET D'ENTRAÎNEMENT - SERVICE
// Gestion des Benchmarks (Stats) et Skills (Techniques)
// Jargon FR/EN valide - Style salle et dojo
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WatchConnectivity } from './watchConnectivity.ios';
import { logger } from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

export type BenchmarkCategory = 'bodyweight' | 'force' | 'musculation' | 'cardio' | 'street_workout' | 'running' | 'trail' | 'hyrox' | 'custom';
export type BenchmarkUnit = 'kg' | 'lbs' | 'time' | 'reps' | 'meters' | 'km';
export type SkillStatus = 'to_learn' | 'in_progress' | 'mastered';
export type SkillCategory = 'jjb_garde' | 'jjb_passage' | 'jjb_soumission' | 'jjb_nogi' | 'lutte' | 'striking' | 'other';

export interface BenchmarkEntry {
  id: string;
  value: number;
  reps?: number; // Mandatory for Force exercises
  date: string;
  rpe?: number; // Rate of Perceived Exertion 1-10
  notes?: string;
  duration?: number; // Duration in minutes
  calories?: number; // Estimated or user-entered calories
  // Advanced metrics for Cardio/Machines
  distance?: number; // in km
  incline?: number; // pente in %
  speed?: number; // in km/h
  pace?: string; // allure in min/km
  watts?: number; // power
  resistance?: number; // machine level/resistance
  level?: number; // machine level
}

// Weight unit for Force exercises
export type WeightUnit = 'kg' | 'lbs';

// ============================================
// METs CONSTANTS FOR CALORIE CALCULATION
// ============================================
export const METS_VALUES: Record<BenchmarkCategory, number> = {
  force: 5,
  musculation: 5,
  bodyweight: 6,
  cardio: 7,
  street_workout: 6,
  running: 9.8,
  trail: 8,
  hyrox: 8,
  custom: 5,
};

// Combat sports have higher METs
export const COMBAT_METS = 10;

// Calculate calories: Kcal = Duration(hours) * Weight(kg) * MET
export const calculateCalories = (
  durationMinutes: number,
  userWeightKg: number,
  category: BenchmarkCategory | 'combat'
): number => {
  const met = category === 'combat' ? COMBAT_METS : METS_VALUES[category] || 5;
  const durationHours = durationMinutes / 60;
  return Math.round(durationHours * userWeightKg * met);
};

export interface Benchmark {
  id: string;
  name: string;
  category: BenchmarkCategory;
  muscleGroup?: string; // NOUVEAU: pour trier la muscu par muscle ou cardio par appareil
  unit: BenchmarkUnit;
  iconName: string; // lucide icon name
  color: string;
  entries: BenchmarkEntry[];
  createdAt: string;
}

export interface SkillNote {
  id: string;
  text: string;
  date: string;
}

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  status: SkillStatus;
  drillCount: number;
  notes: SkillNote[];
  videoUrl?: string; // YouTube/Instagram video link
  duration?: number; // Duration in minutes for combat sessions
  calories?: number; // Estimated calories burned
  createdAt: string;
  updatedAt: string;
}

// ============================================
// WATCH EXERCISE TEMPLATES (230 exercises)
// ============================================

export const WATCH_EXERCISE_TEMPLATES: {
  id: string;
  name: string;
  category: BenchmarkCategory;
  unit: BenchmarkUnit;
  muscleGroup?: string;
  iconName: string;
  color: string;
}[] = [
  // ─── PECTORAUX (20) ────────────────────────────────────────────────────────
  { id: 'bench-press', name: 'Développé Couché (Barre)', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'incline-bench-press', name: 'Développé Incliné (Barre)', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'decline-bench-press', name: 'Développé Décliné (Barre)', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'dumbbell-bench-press', name: 'Développé Haltères', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'incline-dumbbell-press', name: 'Développé Haltères Incliné', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'decline-dumbbell-press', name: 'Développé Haltères Décliné', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'chest-fly', name: 'Ecarté Couché (Haltères)', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'incline-fly', name: 'Ecarté Incliné (Haltères)', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'cable-crossover', name: 'Croisé Câble Haut', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'cable-crossover-low', name: 'Croisé Câble Bas', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'cable-crossover-mid', name: 'Croisé Câble Milieu', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'chest-press-machine-pec', name: 'Chest Press Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'pec-deck', name: 'Pec Deck (Butterfly)', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'dips-chest', name: 'Dips (Focus Pectoraux)', category: 'musculation', unit: 'reps', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'weighted-push-up', name: 'Pompes Lestées', category: 'musculation', unit: 'reps', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'pullover-dumbbell', name: 'Pull-Over Haltère', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'floor-press', name: 'Développé Sol (Floor Press)', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'svend-press', name: 'Compression Pecto (Svend Press)', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'landmine-press-chest', name: 'Landmine Press', category: 'musculation', unit: 'kg', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },
  { id: 'push-up-standard', name: 'Pompes (Poids de Corps)', category: 'musculation', unit: 'reps', muscleGroup: 'Pectoraux', iconName: 'dumbbell', color: '#EF4444' },

  // ─── DOS (22) ──────────────────────────────────────────────────────────────
  { id: 'deadlift', name: 'Soulevé de Terre', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'deadlift-romanian', name: 'Deadlift Roumain', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'deadlift-sumo', name: 'Deadlift Sumo', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'pull-up', name: 'Tractions Pronation', category: 'musculation', unit: 'reps', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'pull-up-supination', name: 'Tractions Supination', category: 'musculation', unit: 'reps', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'pull-up-wide', name: 'Tractions Larges', category: 'musculation', unit: 'reps', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'pull-up-neutral', name: 'Tractions Prises Neutres', category: 'musculation', unit: 'reps', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'lat-pulldown', name: 'Tirage Poulie Haute', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'lat-pulldown-close', name: 'Tirage Serré V-Bar', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'lat-pulldown-neck', name: 'Tirage Nuque', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'lat-pulldown-unilateral', name: 'Tirage Unilatéral', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'barbell-row', name: 'Rowing Barre', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'pendlay-row', name: 'Rowing Pendlay', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'dumbbell-row', name: 'Rowing Haltère (One Arm)', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'seated-cable-row', name: 'Rowing Câble Assis', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 't-bar-row', name: 'Rowing T-Bar', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'seal-row', name: 'Rowing Plat-Ventre (Seal Row)', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'chest-supported-row', name: 'Rowing Soutenu (Banc)', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'low-row-machine-dos', name: 'Low Row Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'face-pull', name: 'Tirage Visage (Face Pull)', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'hyperextensions', name: 'Hyperextensions', category: 'musculation', unit: 'reps', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },
  { id: 'good-morning', name: 'Inclinaison Barre (Good Morning)', category: 'musculation', unit: 'kg', muscleGroup: 'Dos', iconName: 'dumbbell', color: '#3B82F6' },

  // ─── EPAULES (16) ──────────────────────────────────────────────────────────
  { id: 'military-press', name: 'Développé Militaire (Barre)', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'dumbbell-shoulder-press', name: 'Développé Haltères Assis', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'dumbbell-shoulder-press-stand', name: 'Développé Haltères Debout', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'arnold-press', name: 'Arnold Press', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'lateral-raise', name: 'Elévations Latérales', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'cable-lateral-raise', name: 'Elévations Latérales Câble', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'lateral-raise-machine', name: 'Elévations Latérales Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'front-raise', name: 'Elévations Frontales', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'rear-delt-fly', name: 'Oiseau (Deltoïdes Postérieurs)', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'rear-delt-machine', name: 'Oiseau Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'upright-row', name: 'Rowing Menton', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'shoulder-press-machine', name: 'Développé Epaules Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'bradford-press', name: 'Bradford Press', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'w-raise', name: 'W-Raise (YTW)', category: 'musculation', unit: 'kg', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'band-pull-apart', name: 'Écartement Élastique (Band Pull-Apart)', category: 'musculation', unit: 'reps', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'pike-push-up', name: 'Pompes Pike', category: 'musculation', unit: 'reps', muscleGroup: 'Epaules', iconName: 'dumbbell', color: '#F59E0B' },

  // ─── BRAS (18) ─────────────────────────────────────────────────────────────
  { id: 'barbell-curl', name: 'Curl Barre', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'dumbbell-curl', name: 'Curl Haltères', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'hammer-curl', name: 'Curl Marteau', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'preacher-curl', name: 'Curl Pupitre (Larry Scott)', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'concentration-curl', name: 'Curl Concentré', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'cable-curl', name: 'Curl Câble Bas', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'incline-curl', name: 'Curl Incliné (Haltères)', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'spider-curl', name: 'Curl Araignée (Spider Curl)', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'reverse-curl', name: 'Curl Inversé (Pronation)', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'tricep-pushdown', name: 'Extension Triceps Poulie', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'tricep-pushdown-rope', name: 'Extension Triceps Corde', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'skull-crusher', name: 'Barre au Front (Skull Crusher)', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'close-grip-bench-press', name: 'Développé Serré (Triceps)', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'overhead-tricep-extension', name: 'Extension Triceps Nuque', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'dips-triceps', name: 'Dips (Focus Triceps)', category: 'musculation', unit: 'reps', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'tricep-kickback', name: 'Kickback Triceps', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'wrist-curl', name: 'Curl Poignets', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },
  { id: 'curl-21s', name: '21s Biceps', category: 'musculation', unit: 'kg', muscleGroup: 'Bras', iconName: 'dumbbell', color: '#EC4899' },

  // ─── JAMBES (20) ───────────────────────────────────────────────────────────
  { id: 'squat', name: 'Squat (Barre)', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'front-squat', name: 'Squat Avant', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'hack-squat', name: 'Hack Squat (Machine)', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'goblet-squat', name: 'Squat Coupe (Goblet Squat)', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'box-squat', name: 'Squat sur Boîte (Box Squat)', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'bulgarian-split-squat', name: 'Squat Bulgare', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'leg-press', name: 'Presse à Cuisses', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'lunges', name: 'Fentes Avant', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'reverse-lunges', name: 'Fentes Arrière', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'walking-lunges', name: 'Fentes Marchées', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'leg-extension', name: 'Leg Extension', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'leg-curl', name: 'Leg Curl Allongé', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'leg-curl-seated', name: 'Leg Curl Assis', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'standing-calf-raise', name: 'Mollets Debout', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'seated-calf-raise', name: 'Mollets Assis', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'hip-thrust', name: 'Poussée de Hanche (Hip Thrust)', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'glute-kickback', name: 'Glute Kickback Câble', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'hip-abductor', name: 'Abducteur Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'hip-adductor', name: 'Adducteur Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },
  { id: 'nordic-curl', name: 'Curl Nordique (Ischio)', category: 'musculation', unit: 'reps', muscleGroup: 'Jambes', iconName: 'dumbbell', color: '#10B981' },

  // ─── ABDOS (14) ────────────────────────────────────────────────────────────
  { id: 'crunch', name: 'Crunch', category: 'musculation', unit: 'reps', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'crunch-decline', name: 'Crunch Décliné', category: 'musculation', unit: 'reps', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'sit-up', name: 'Sit-Up', category: 'musculation', unit: 'reps', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'plank', name: 'Gainage (Planche)', category: 'musculation', unit: 'time', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'side-plank', name: 'Gainage Latéral', category: 'musculation', unit: 'time', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'ab-wheel', name: 'Roue Abdominale', category: 'musculation', unit: 'reps', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'hanging-leg-raise', name: 'Relevé de Jambes Suspendu', category: 'musculation', unit: 'reps', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'hanging-knee-raise', name: 'Relevé de Genoux Suspendu', category: 'musculation', unit: 'reps', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'russian-twist', name: 'Rotation Russe', category: 'musculation', unit: 'reps', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'cable-crunch', name: 'Crunch Câble', category: 'musculation', unit: 'kg', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'bicycle-crunch', name: 'Crunch Vélo', category: 'musculation', unit: 'reps', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'dragon-flag', name: 'Dragon Flag', category: 'musculation', unit: 'reps', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'pallof-press', name: 'Pallof Press', category: 'musculation', unit: 'kg', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },
  { id: 'dead-bug', name: 'Gainage Sol (Dead Bug)', category: 'musculation', unit: 'reps', muscleGroup: 'Abdos', iconName: 'dumbbell', color: '#8B5CF6' },

  // ─── MACHINES (12) ─────────────────────────────────────────────────────────
  { id: 'chest-press-machine', name: 'Presse Pectoraux Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Machines', iconName: 'dumbbell', color: '#6B7280' },
  { id: 'shoulder-press-machine-m', name: 'Développé Epaules Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Machines', iconName: 'dumbbell', color: '#6B7280' },
  { id: 'lat-pulldown-machine', name: 'Tirage Dorsal Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Machines', iconName: 'dumbbell', color: '#6B7280' },
  { id: 'low-row-machine', name: 'Rowing Bas Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Machines', iconName: 'dumbbell', color: '#6B7280' },
  { id: 'leg-press-machine', name: 'Presse Jambes Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Machines', iconName: 'dumbbell', color: '#6B7280' },
  { id: 'leg-extension-machine', name: 'Leg Extension Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Machines', iconName: 'dumbbell', color: '#6B7280' },
  { id: 'leg-curl-machine', name: 'Leg Curl Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Machines', iconName: 'dumbbell', color: '#6B7280' },
  { id: 'hip-abductor-m', name: 'Abducteur Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Machines', iconName: 'dumbbell', color: '#6B7280' },
  { id: 'hip-adductor-m', name: 'Adducteur Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Machines', iconName: 'dumbbell', color: '#6B7280' },
  { id: 'back-extension-machine', name: 'Extension Lombaires', category: 'musculation', unit: 'kg', muscleGroup: 'Machines', iconName: 'dumbbell', color: '#6B7280' },
  { id: 'curl-machine', name: 'Curl Biceps Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Machines', iconName: 'dumbbell', color: '#6B7280' },
  { id: 'tricep-machine', name: 'Extension Triceps Machine', category: 'musculation', unit: 'kg', muscleGroup: 'Machines', iconName: 'dumbbell', color: '#6B7280' },

  // ─── HALTÉROPHILIE OLYMPIQUE (12) ──────────────────────────────────────────
  { id: 'snatch', name: 'Arraché', category: 'musculation', unit: 'kg', muscleGroup: 'Olympique', iconName: 'dumbbell', color: '#DC2626' },
  { id: 'clean-and-jerk', name: 'Epaulé-Jeté', category: 'musculation', unit: 'kg', muscleGroup: 'Olympique', iconName: 'dumbbell', color: '#DC2626' },
  { id: 'power-clean', name: 'Power Clean', category: 'musculation', unit: 'kg', muscleGroup: 'Olympique', iconName: 'dumbbell', color: '#DC2626' },
  { id: 'hang-clean', name: 'Hang Clean', category: 'musculation', unit: 'kg', muscleGroup: 'Olympique', iconName: 'dumbbell', color: '#DC2626' },
  { id: 'hang-snatch', name: 'Hang Snatch', category: 'musculation', unit: 'kg', muscleGroup: 'Olympique', iconName: 'dumbbell', color: '#DC2626' },
  { id: 'power-snatch', name: 'Power Snatch', category: 'musculation', unit: 'kg', muscleGroup: 'Olympique', iconName: 'dumbbell', color: '#DC2626' },
  { id: 'push-press', name: 'Push Press', category: 'musculation', unit: 'kg', muscleGroup: 'Olympique', iconName: 'dumbbell', color: '#DC2626' },
  { id: 'push-jerk', name: 'Push Jerk', category: 'musculation', unit: 'kg', muscleGroup: 'Olympique', iconName: 'dumbbell', color: '#DC2626' },
  { id: 'split-jerk', name: 'Split Jerk', category: 'musculation', unit: 'kg', muscleGroup: 'Olympique', iconName: 'dumbbell', color: '#DC2626' },
  { id: 'clean-pull', name: 'Tirage Epaulé', category: 'musculation', unit: 'kg', muscleGroup: 'Olympique', iconName: 'dumbbell', color: '#DC2626' },
  { id: 'block-clean', name: 'Clean sur Blocs', category: 'musculation', unit: 'kg', muscleGroup: 'Olympique', iconName: 'dumbbell', color: '#DC2626' },
  { id: 'snatch-squat', name: 'Squat Arraché', category: 'musculation', unit: 'kg', muscleGroup: 'Olympique', iconName: 'dumbbell', color: '#DC2626' },

  // ─── STRONGMAN (12) ────────────────────────────────────────────────────────
  { id: 'atlas-stone', name: 'Pierre d\'Atlas (Atlas Stone)', category: 'musculation', unit: 'kg', muscleGroup: 'Strongman', iconName: 'dumbbell', color: '#B91C1C' },
  { id: 'tire-flip', name: 'Retournement de Pneu (Tire Flip)', category: 'musculation', unit: 'reps', muscleGroup: 'Strongman', iconName: 'dumbbell', color: '#B91C1C' },
  { id: 'farmers-walk', name: 'Marche du Fermier (Farmers Walk)', category: 'musculation', unit: 'kg', muscleGroup: 'Strongman', iconName: 'dumbbell', color: '#B91C1C' },
  { id: 'log-press', name: 'Développé à la Bûche (Log Press)', category: 'musculation', unit: 'kg', muscleGroup: 'Strongman', iconName: 'dumbbell', color: '#B91C1C' },
  { id: 'yoke-walk', name: 'Marche au Joug (Yoke Walk)', category: 'musculation', unit: 'kg', muscleGroup: 'Strongman', iconName: 'dumbbell', color: '#B91C1C' },
  { id: 'keg-toss', name: 'Lancer de Tonneau', category: 'musculation', unit: 'kg', muscleGroup: 'Strongman', iconName: 'dumbbell', color: '#B91C1C' },
  { id: 'axle-deadlift', name: 'Deadlift Axle', category: 'musculation', unit: 'kg', muscleGroup: 'Strongman', iconName: 'dumbbell', color: '#B91C1C' },
  { id: 'conan-wheel', name: 'Roue de Conan', category: 'musculation', unit: 'kg', muscleGroup: 'Strongman', iconName: 'dumbbell', color: '#B91C1C' },
  { id: 'sandbag-carry', name: 'Portée Sac de Sable', category: 'musculation', unit: 'kg', muscleGroup: 'Strongman', iconName: 'dumbbell', color: '#B91C1C' },
  { id: 'viking-press', name: 'Viking Press', category: 'musculation', unit: 'kg', muscleGroup: 'Strongman', iconName: 'dumbbell', color: '#B91C1C' },
  { id: 'arm-over-arm-pull', name: 'Tirage Bras-sur-Bras', category: 'musculation', unit: 'time', muscleGroup: 'Strongman', iconName: 'dumbbell', color: '#B91C1C' },
  { id: 'car-deadlift', name: 'Deadlift Voiture', category: 'musculation', unit: 'kg', muscleGroup: 'Strongman', iconName: 'dumbbell', color: '#B91C1C' },

  // ─── CROSSFIT WODs (20) ────────────────────────────────────────────────────
  { id: 'murph', name: 'Murph', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'fran', name: 'Fran', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'cindy', name: 'Cindy', category: 'custom', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'grace', name: 'Grace', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'helen', name: 'Helen', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'annie', name: 'Annie', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'karen', name: 'Karen', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'jackie', name: 'Jackie', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'diane', name: 'Diane', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'elizabeth', name: 'Elizabeth', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'amanda', name: 'Amanda', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'isabel', name: 'Isabel', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'mary', name: 'Mary', category: 'custom', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'linda', name: 'Linda', category: 'custom', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'chelsea', name: 'Chelsea', category: 'custom', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'barbara', name: 'Barbara', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'nancy', name: 'Nancy', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'kelly', name: 'Kelly', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'eva', name: 'Eva', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'filthy-fifty', name: 'Filthy Fifty', category: 'custom', unit: 'time', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  // CrossFit Movements (20)
  { id: 'thruster', name: 'Thruster (Squat + Développé)', category: 'hyrox', unit: 'kg', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'wall-ball', name: 'Lancer au Mur (Wall Ball)', category: 'hyrox', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'box-jump', name: 'Saut sur Boîte (Box Jump)', category: 'hyrox', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'double-under', name: 'Double Saut Corde (Double Under)', category: 'hyrox', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'toes-to-bar', name: 'Pieds à la Barre (Toes to Bar)', category: 'hyrox', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'kipping-pull-up', name: 'Traction Kipping', category: 'hyrox', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'butterfly-pull-up', name: 'Traction Papillon (Butterfly)', category: 'hyrox', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'muscle-up', name: 'Muscle Up Barre', category: 'hyrox', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'ring-muscle-up', name: 'Muscle Up Anneaux', category: 'hyrox', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'handstand-push-up', name: 'Pompes en Équilibre (HSPU)', category: 'hyrox', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'handstand-walk', name: 'Marche sur les Mains', category: 'hyrox', unit: 'meters', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'rope-climb', name: 'Corde Lisse', category: 'hyrox', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'burpee', name: 'Burpee', category: 'hyrox', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'kettlebell-swing', name: 'Kettlebell Swing Russe', category: 'hyrox', unit: 'kg', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'american-kb-swing', name: 'Balancé KB Américain', category: 'hyrox', unit: 'kg', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'goblet-squat-kb', name: 'Squat Coupe Kettlebell', category: 'hyrox', unit: 'kg', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'devil-press', name: 'Devil Press (Sol + Développé)', category: 'hyrox', unit: 'kg', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'dumbbell-snatch', name: 'Arraché Haltère', category: 'hyrox', unit: 'kg', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'single-leg-deadlift', name: 'Deadlift Unijambiste', category: 'hyrox', unit: 'kg', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },
  { id: 'assault-bike-cal', name: 'Vélo Air (Calories)', category: 'hyrox', unit: 'reps', muscleGroup: 'CrossFit', iconName: 'flame', color: '#F59E0B' },

  // ─── HYROX (12) ────────────────────────────────────────────────────────────
  { id: 'hyrox-sled-push', name: 'Poussée Traîneau (Sled Push)', category: 'hyrox', unit: 'time', muscleGroup: 'Hyrox', iconName: 'flame', color: '#D97706' },
  { id: 'hyrox-sled-pull', name: 'Tirage Traîneau (Sled Pull)', category: 'hyrox', unit: 'time', muscleGroup: 'Hyrox', iconName: 'flame', color: '#D97706' },
  { id: 'hyrox-skierg', name: 'SkiErg 1000m', category: 'hyrox', unit: 'time', muscleGroup: 'Hyrox', iconName: 'flame', color: '#D97706' },
  { id: 'hyrox-row', name: 'Rameur 1000m', category: 'hyrox', unit: 'time', muscleGroup: 'Hyrox', iconName: 'flame', color: '#D97706' },
  { id: 'hyrox-farmers-carry', name: 'Portée de Fermier (Farmers Carry)', category: 'hyrox', unit: 'time', muscleGroup: 'Hyrox', iconName: 'flame', color: '#D97706' },
  { id: 'hyrox-sandbag-lunges', name: 'Fentes Sac de Sable', category: 'hyrox', unit: 'time', muscleGroup: 'Hyrox', iconName: 'flame', color: '#D97706' },
  { id: 'hyrox-wall-balls', name: 'Lancers au Mur 100 reps', category: 'hyrox', unit: 'time', muscleGroup: 'Hyrox', iconName: 'flame', color: '#D97706' },
  { id: 'hyrox-burpees', name: 'Burpees Grand Saut', category: 'hyrox', unit: 'time', muscleGroup: 'Hyrox', iconName: 'flame', color: '#D97706' },
  { id: 'hyrox-run-1k', name: 'Run 1km (entre stations)', category: 'hyrox', unit: 'time', muscleGroup: 'Hyrox', iconName: 'flame', color: '#D97706' },
  { id: 'hyrox-full', name: 'Hyrox Complet', category: 'hyrox', unit: 'time', muscleGroup: 'Hyrox', iconName: 'flame', color: '#D97706' },
  { id: 'hyrox-simulator', name: 'Hyrox Simul. 4 Stations', category: 'hyrox', unit: 'time', muscleGroup: 'Hyrox', iconName: 'flame', color: '#D97706' },
  { id: 'hyrox-open', name: 'Hyrox Open (Solo)', category: 'hyrox', unit: 'time', muscleGroup: 'Hyrox', iconName: 'flame', color: '#D97706' },

  // ─── RUNNING (15) ──────────────────────────────────────────────────────────
  { id: 'run-100m', name: '100m', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'run-200m', name: '200m', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'run-400m', name: '400m', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'run-800m', name: '800m', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'run-1500m', name: '1500m', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'run-3k', name: '3km', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'run-5k', name: '5km', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'run-10k', name: '10km', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'run-15k', name: '15km', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'half-marathon', name: 'Semi-Marathon (21km)', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'marathon', name: 'Marathon (42km)', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'vma-interval', name: 'Fractionné VMA', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'tempo-run', name: 'Allure au Seuil', category: 'running', unit: 'time', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'long-run', name: 'Sortie Longue', category: 'running', unit: 'km', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },
  { id: 'trail-run', name: 'Trail', category: 'trail', unit: 'km', muscleGroup: 'Running', iconName: 'timer', color: '#3B82F6' },

  // ─── CARDIO APPAREILS (14) ─────────────────────────────────────────────────
  { id: 'bike-ergometer', name: 'Vélo Ergomètre', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'spinning', name: 'Spinning / Biking', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'assault-bike', name: 'Assault Bike (AirBike)', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'ski-erg', name: 'SkiErg Technogym', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'rowing-machine', name: 'Rameur Concept2', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'treadmill', name: 'Tapis Roulant', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'treadmill-incline', name: 'Tapis Incliné (Marche)', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'elliptical', name: 'Elliptique / Vario', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'stairmaster', name: 'Stepper / Stairmaster', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'jump-rope', name: 'Corde à Sauter', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'cycling', name: 'Cyclisme (Vélo de Route)', category: 'cardio', unit: 'km', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'swimming', name: 'Natation', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'swimming-50m', name: 'Nage 50m', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },
  { id: 'hiit-session', name: 'Séance HIIT (Fractionné Intensif)', category: 'cardio', unit: 'time', muscleGroup: 'Cardio', iconName: 'activity', color: '#06B6D4' },

  // ─── COMBAT / MMA (15) ─────────────────────────────────────────────────────
  { id: 'bjj-gi', name: 'BJJ Kimono', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'bjj-nogi', name: 'BJJ No-Gi / Grappling', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'boxing', name: 'Boxe Anglaise', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'muay-thai', name: 'Muay Thai', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'savate', name: 'Savate / Boxe Française', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'kickboxing', name: 'Kickboxing / K-1', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'wrestling', name: 'Lutte (Wrestling)', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'judo', name: 'Judo', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'mma', name: 'MMA', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'sparring', name: 'Sparring (Assaut Libre)', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'padwork', name: 'Travail aux Pattes', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'bag-work', name: 'Sac de Frappe', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'shadow-boxing', name: 'Boxe à l\'Ombre (Shadow Boxing)', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'catch-wrestling', name: 'Lutte avec Soumissions (Catch)', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },
  { id: 'competition', name: 'Compétition', category: 'custom', unit: 'time', muscleGroup: 'Combat', iconName: 'target', color: '#8B5CF6' },

  // ─── STREET WORKOUT (15) ───────────────────────────────────────────────────
  { id: 'street-pull-up', name: 'Tractions Max', category: 'street_workout', unit: 'reps', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'street-pull-up-wide', name: 'Tractions Larges', category: 'street_workout', unit: 'reps', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'street-dips', name: 'Dips Barres Parallèles', category: 'street_workout', unit: 'reps', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'push-up-max', name: 'Pompes Max en 1 set', category: 'street_workout', unit: 'reps', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'muscle-up-bar', name: 'Muscle Up Barre (Max)', category: 'street_workout', unit: 'reps', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'muscle-up-rings', name: 'Muscle Up Anneaux', category: 'street_workout', unit: 'reps', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'front-lever', name: 'Levier Avant (Front Lever)', category: 'street_workout', unit: 'time', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'back-lever', name: 'Levier Arrière (Back Lever)', category: 'street_workout', unit: 'time', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'planche', name: 'Planche Tenue', category: 'street_workout', unit: 'time', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'tuck-planche', name: 'Planche Regroupée (Tuck Planche)', category: 'street_workout', unit: 'time', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'human-flag', name: 'Drapeau (Human Flag)', category: 'street_workout', unit: 'time', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'l-sit', name: 'L-Sit sur Barres', category: 'street_workout', unit: 'time', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'pistol-squat', name: 'Squat Unijambiste (Max)', category: 'street_workout', unit: 'reps', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'skin-the-cat', name: 'Tour de Barre (Skin the Cat)', category: 'street_workout', unit: 'reps', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
  { id: 'dead-hang', name: 'Dead Hang (Suspension)', category: 'street_workout', unit: 'time', muscleGroup: 'Street Workout', iconName: 'dumbbell', color: '#F59E0B' },
];

// ============================================
// STORAGE KEYS
// ============================================

const BENCHMARKS_KEY = 'yoroi_benchmarks_v2';
const SKILLS_KEY = 'yoroi_skills_v2';
const INITIALIZED_KEY = 'yoroi_carnet_initialized_v2';
const TRASH_BENCHMARKS_KEY = 'yoroi_trash_benchmarks_v2';
const TRASH_SKILLS_KEY = 'yoroi_trash_skills_v2';

// ============================================
// JARGON VALIDE - STARTER PACK
// ============================================

// POIDS DE CORPS - Suivi du poids (essentiel pour les combattants)
export const BODYWEIGHT_BENCHMARKS: Omit<Benchmark, 'id' | 'entries' | 'createdAt'>[] = [
  { name: 'Poids de Corps', category: 'bodyweight', unit: 'kg', iconName: 'scale', color: '#8B5CF6' },
];

// FORCE - Jargon salle de muscu FR (avec accents corrects)
export const FORCE_BENCHMARKS: Omit<Benchmark, 'id' | 'entries' | 'createdAt'>[] = [
  { name: 'Squat', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444' },
  { name: 'Développé Couché', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444' },
  { name: 'Soulevé de Terre', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444' },
  { name: 'Développé Militaire', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444' },
  { name: 'Tractions', category: 'force', unit: 'reps', iconName: 'dumbbell', color: '#EF4444' },
  { name: 'Dips', category: 'force', unit: 'reps', iconName: 'dumbbell', color: '#EF4444' },
  { name: 'Presse à Cuisses', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444' },
];

// RUNNING - Les classiques
export const RUNNING_BENCHMARKS: Omit<Benchmark, 'id' | 'entries' | 'createdAt'>[] = [
  { name: '5km', category: 'running', unit: 'time', iconName: 'timer', color: '#3B82F6' },
  { name: '10km', category: 'running', unit: 'time', iconName: 'timer', color: '#3B82F6' },
  { name: 'Semi-Marathon', category: 'running', unit: 'time', iconName: 'timer', color: '#3B82F6' },
  { name: 'Marathon', category: 'running', unit: 'time', iconName: 'timer', color: '#3B82F6' },
  { name: 'Fractionné (VMA)', category: 'running', unit: 'time', iconName: 'timer', color: '#3B82F6' },
];

// TRAIL
export const TRAIL_BENCHMARKS: Omit<Benchmark, 'id' | 'entries' | 'createdAt'>[] = [
  { name: 'Sortie Longue', category: 'trail', unit: 'km', iconName: 'mountain', color: '#10B981' },
  { name: 'Dénivelé (D+)', category: 'trail', unit: 'meters', iconName: 'mountain', color: '#10B981' },
  { name: 'Trail Court', category: 'trail', unit: 'time', iconName: 'mountain', color: '#10B981' },
  { name: 'Ultra Trail', category: 'trail', unit: 'time', iconName: 'mountain', color: '#10B981' },
];

// HYROX & CROSSFIT - Termes internationaux
export const HYROX_BENCHMARKS: Omit<Benchmark, 'id' | 'entries' | 'createdAt'>[] = [
  { name: 'Roxzone', category: 'hyrox', unit: 'time', iconName: 'flame', color: '#F59E0B' },
  { name: 'Sled Push', category: 'hyrox', unit: 'time', iconName: 'flame', color: '#F59E0B' },
  { name: 'Sled Pull', category: 'hyrox', unit: 'time', iconName: 'flame', color: '#F59E0B' },
  { name: 'Wall Balls', category: 'hyrox', unit: 'reps', iconName: 'flame', color: '#F59E0B' },
  { name: 'Burpees', category: 'hyrox', unit: 'reps', iconName: 'flame', color: '#F59E0B' },
  { name: 'SkiErg 1000m', category: 'hyrox', unit: 'time', iconName: 'flame', color: '#F59E0B' },
  { name: 'Rameur 1000m', category: 'hyrox', unit: 'time', iconName: 'flame', color: '#F59E0B' },
];

// JJB - GARDE (Mix FR/EN avec accents)
export const JJB_GARDE_SKILLS: Omit<Skill, 'id' | 'drillCount' | 'notes' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Garde Fermée', category: 'jjb_garde', status: 'to_learn' },
  { name: 'Demi-Garde', category: 'jjb_garde', status: 'to_learn' },
  { name: 'De la Riva', category: 'jjb_garde', status: 'to_learn' },
  { name: 'Spider Guard', category: 'jjb_garde', status: 'to_learn' },
  { name: 'Papillon', category: 'jjb_garde', status: 'to_learn' },
  { name: 'Lasso Guard', category: 'jjb_garde', status: 'to_learn' },
  { name: 'X-Guard', category: 'jjb_garde', status: 'to_learn' },
];

// JJB - PASSAGE
export const JJB_PASSAGE_SKILLS: Omit<Skill, 'id' | 'drillCount' | 'notes' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Knee Cut', category: 'jjb_passage', status: 'to_learn' },
  { name: 'Torreando', category: 'jjb_passage', status: 'to_learn' },
  { name: 'Passage Smash', category: 'jjb_passage', status: 'to_learn' },
  { name: 'Body Lock Pass', category: 'jjb_passage', status: 'to_learn' },
  { name: 'Leg Drag', category: 'jjb_passage', status: 'to_learn' },
  { name: 'Stack Pass', category: 'jjb_passage', status: 'to_learn' },
];

// JJB - SOUMISSION (avec accents corrects)
export const JJB_SOUMISSION_SKILLS: Omit<Skill, 'id' | 'drillCount' | 'notes' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Triangle', category: 'jjb_soumission', status: 'to_learn' },
  { name: 'Clé de Bras (Armbar)', category: 'jjb_soumission', status: 'to_learn' },
  { name: 'Kimura', category: 'jjb_soumission', status: 'to_learn' },
  { name: 'Étranglement Arrière (RNC)', category: 'jjb_soumission', status: 'to_learn' },
  { name: 'Clé de Cheville', category: 'jjb_soumission', status: 'to_learn' },
  { name: 'Guillotine', category: 'jjb_soumission', status: 'to_learn' },
  { name: 'Americana', category: 'jjb_soumission', status: 'to_learn' },
  { name: 'Omoplata', category: 'jjb_soumission', status: 'to_learn' },
];

// JJB - NO GI (Sans Kimono)
export const JJB_NOGI_SKILLS: Omit<Skill, 'id' | 'drillCount' | 'notes' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Heel Hook', category: 'jjb_nogi', status: 'to_learn' },
  { name: 'Toe Hold', category: 'jjb_nogi', status: 'to_learn' },
  { name: 'Knee Bar', category: 'jjb_nogi', status: 'to_learn' },
  { name: 'Calf Slicer', category: 'jjb_nogi', status: 'to_learn' },
  { name: 'Saddle (Ashi Garami)', category: 'jjb_nogi', status: 'to_learn' },
  { name: 'Inside Sankaku', category: 'jjb_nogi', status: 'to_learn' },
  { name: '50/50 Guard', category: 'jjb_nogi', status: 'to_learn' },
  { name: 'Darce Choke', category: 'jjb_nogi', status: 'to_learn' },
  { name: 'Anaconda Choke', category: 'jjb_nogi', status: 'to_learn' },
  { name: 'Arm-In Guillotine', category: 'jjb_nogi', status: 'to_learn' },
  { name: 'Front Headlock', category: 'jjb_nogi', status: 'to_learn' },
  { name: 'Body Lock Takedown', category: 'jjb_nogi', status: 'to_learn' },
];

// LUTTE & GRAPPLING
export const LUTTE_SKILLS: Omit<Skill, 'id' | 'drillCount' | 'notes' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Single Leg', category: 'lutte', status: 'to_learn' },
  { name: 'Double Leg', category: 'lutte', status: 'to_learn' },
  { name: 'Sprawl', category: 'lutte', status: 'to_learn' },
  { name: 'Arm Drag', category: 'lutte', status: 'to_learn' },
  { name: 'Snap Down', category: 'lutte', status: 'to_learn' },
  { name: 'Ankle Pick', category: 'lutte', status: 'to_learn' },
];

// STRIKING (Boxe/Muay Thai)
export const STRIKING_SKILLS: Omit<Skill, 'id' | 'drillCount' | 'notes' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Jab-Cross', category: 'striking', status: 'to_learn' },
  { name: 'Crochet', category: 'striking', status: 'to_learn' },
  { name: 'Uppercut', category: 'striking', status: 'to_learn' },
  { name: 'Low Kick', category: 'striking', status: 'to_learn' },
  { name: 'Middle Kick', category: 'striking', status: 'to_learn' },
  { name: 'Teep (Push Kick)', category: 'striking', status: 'to_learn' },
  { name: 'Clinch', category: 'striking', status: 'to_learn' },
  { name: 'Esquive', category: 'striking', status: 'to_learn' },
];

// ============================================
// CATEGORY CONFIG (NO EMOJIS - Icons only)
// ============================================

export const BENCHMARK_CATEGORIES: Record<BenchmarkCategory, { label: string; color: string; iconName: string }> = {
  bodyweight: { label: 'Poids de Corps', color: '#8B5CF6', iconName: 'scale' },
  force: { label: 'Force', color: '#EF4444', iconName: 'dumbbell' },
  musculation: { label: 'Musculation', color: '#EF4444', iconName: 'dumbbell' },
  cardio: { label: 'Cardio Appareils', color: '#10B981', iconName: 'activity' },
  street_workout: { label: 'Street Workout', color: '#F59E0B', iconName: 'arm-flex' },
  running: { label: 'Running', color: '#3B82F6', iconName: 'timer' },
  trail: { label: 'Trail', color: '#10B981', iconName: 'mountain' },
  hyrox: { label: 'Hyrox', color: '#F59E0B', iconName: 'flame' },
  custom: { label: 'Autre', color: '#6B7280', iconName: 'target' },
};

export const SKILL_CATEGORIES: Record<SkillCategory, { label: string; color: string; iconName: string }> = {
  jjb_garde: { label: 'JJB - Garde', color: '#8B5CF6', iconName: 'shield' },
  jjb_passage: { label: 'JJB - Passage', color: '#06B6D4', iconName: 'move' },
  jjb_soumission: { label: 'JJB - Soumission', color: '#EC4899', iconName: 'lock' },
  jjb_nogi: { label: 'JJB - No Gi', color: '#F97316', iconName: 'flame' },
  lutte: { label: 'Lutte', color: '#F59E0B', iconName: 'users' },
  striking: { label: 'Striking', color: '#EF4444', iconName: 'zap' },
  other: { label: 'Autre', color: '#6B7280', iconName: 'book-open' },
};

export const SKILL_STATUS_CONFIG: Record<SkillStatus, { label: string; color: string; bgColor: string }> = {
  to_learn: { label: 'À apprendre', color: '#EF4444', bgColor: '#EF444420' },
  in_progress: { label: 'En cours', color: '#F59E0B', bgColor: '#F59E0B20' },
  mastered: { label: 'Maîtrisé', color: '#10B981', bgColor: '#10B98120' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateId = (): string => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const parseTimeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseInt(timeStr) || 0;
};

export const formatValue = (value: number, unit: BenchmarkUnit): string => {
  switch (unit) {
    case 'time':
      return formatTime(value);
    case 'kg':
      return `${value} kg`;
    case 'lbs':
      return `${value} lbs`;
    case 'reps':
      return `${value} reps`;
    case 'meters':
      return `${value} m`;
    case 'km':
      return `${value} km`;
    default:
      return `${value}`;
  }
};

// Format Force entry with weight × reps (e.g., "100 kg × 5 REPS")
export const formatForceEntry = (value: number, unit: BenchmarkUnit, reps?: number): string => {
  if (unit === 'kg' || unit === 'lbs') {
    if (reps && reps > 0) return `${value} ${unit} × ${reps} REPS`;
    return `${value} ${unit}`;
  }
  // Pour les exercices au poids du corps (reps-unit)
  if (reps && reps > 0) return `${value} × ${reps} REPS`;
  return `${value} REPS`;
};

// ============================================
// RUNNING PACE CALCULATION
// ============================================

// Calculate pace in min/km from time (seconds) and distance (km)
export const calculatePace = (timeSeconds: number, distanceKm: number): string => {
  if (distanceKm <= 0 || timeSeconds <= 0) return '--:--';

  const paceSecondsPerKm = timeSeconds / distanceKm;
  const paceMinutes = Math.floor(paceSecondsPerKm / 60);
  const paceSeconds = Math.floor(paceSecondsPerKm % 60);

  return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}`;
};

// Format duration for display (e.g., "55min 20s" or "1h 23min")
export const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    if (secs > 0) {
      return `${mins}min ${secs}s`;
    }
    return `${mins}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (mins > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${hours}h`;
};

// Format distance for display (e.g., "10.0 km" or "5.5 km")
export const formatDistance = (km: number): string => {
  if (km >= 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${km.toFixed(2)} km`;
};

export const getRPELabel = (rpe: number): string => {
  if (rpe <= 3) return 'Facile';
  if (rpe <= 5) return 'Modere';
  if (rpe <= 7) return 'Difficile';
  if (rpe <= 9) return 'Tres dur';
  return 'Max';
};

export const getRPEColor = (rpe: number): string => {
  if (rpe <= 3) return '#10B981';
  if (rpe <= 5) return '#3B82F6';
  if (rpe <= 7) return '#F59E0B';
  if (rpe <= 9) return '#EF4444';
  return '#DC2626';
};

// ============================================
// INITIALIZATION
// ============================================

export const initializeStarterPack = async (): Promise<void> => {
  try {
    const initialized = await AsyncStorage.getItem(INITIALIZED_KEY);
    if (initialized === 'true') return;

    // DÉSACTIVÉ POUR PRODUCTION - Démarrage propre sans données pré-remplies
    // L'utilisateur crée ses propres benchmarks et skills

    // Initialize with empty arrays
    await AsyncStorage.setItem(BENCHMARKS_KEY, JSON.stringify([]));
    await AsyncStorage.setItem(SKILLS_KEY, JSON.stringify([]));

    await AsyncStorage.setItem(INITIALIZED_KEY, 'true');
  } catch (error) {
    logger.error('Error initializing starter pack:', error);
  }
};

// ============================================
// BENCHMARK FUNCTIONS
// ============================================

export const getBenchmarks = async (): Promise<Benchmark[]> => {
  try {
    await initializeStarterPack();
    const data = await AsyncStorage.getItem(BENCHMARKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logger.error('Error getting benchmarks:', error);
    return [];
  }
};

export const createBenchmark = async (
  name: string,
  category: BenchmarkCategory,
  unit: BenchmarkUnit,
  iconName?: string,
  color?: string,
  muscleGroup?: string,
  forcedId?: string
): Promise<Benchmark | null> => {
  try {
    const benchmarks = await getBenchmarks();
    const newBenchmark: Benchmark = {
      id: forcedId || generateId(),
      name,
      category,
      muscleGroup,
      unit,
      iconName: iconName || BENCHMARK_CATEGORIES[category].iconName,
      color: color || BENCHMARK_CATEGORIES[category].color,
      entries: [],
      createdAt: new Date().toISOString(),
    };
    benchmarks.push(newBenchmark);
    await AsyncStorage.setItem(BENCHMARKS_KEY, JSON.stringify(benchmarks));
    
    // Sync Watch
    setTimeout(() => syncCarnetToWatch(), 100);
    
    return newBenchmark;
  } catch (error) {
    logger.error('Error creating benchmark:', error);
    return null;
  }
};

export const addBenchmarkEntry = async (
  benchmarkId: string,
  value: number,
  rpe?: number,
  notes?: string,
  customDate?: Date,
  reps?: number,
  duration?: number,
  calories?: number,
  advancedMetrics?: {
    distance?: number;
    incline?: number;
    speed?: number;
    pace?: string;
    watts?: number;
    resistance?: number;
    level?: number;
  }
): Promise<BenchmarkEntry | null> => {
  try {
    const benchmarks = await getBenchmarks();
    const index = benchmarks.findIndex(b => b.id === benchmarkId);
    if (index === -1) return null;

    const entry: BenchmarkEntry = {
      id: generateId(),
      value,
      reps,
      date: customDate ? customDate.toISOString() : new Date().toISOString(),
      rpe,
      notes,
      duration,
      calories,
      ...advancedMetrics,
    };
    benchmarks[index].entries.push(entry);
    await AsyncStorage.setItem(BENCHMARKS_KEY, JSON.stringify(benchmarks));
    
    // Sync Watch
    setTimeout(() => syncCarnetToWatch(), 100);
    
    return entry;
  } catch (error) {
    logger.error('Error adding benchmark entry:', error);
    return null;
  }
};

export const deleteBenchmark = async (benchmarkId: string): Promise<boolean> => {
  try {
    const benchmarks = await getBenchmarks();
    const benchmark = benchmarks.find(b => b.id === benchmarkId);
    if (!benchmark) return false;

    // Déplacer vers la corbeille
    const trashItems = await getTrashBenchmarks();
    trashItems.push({
      item: benchmark,
      deletedAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(TRASH_BENCHMARKS_KEY, JSON.stringify(trashItems));

    // Retirer de la liste active
    const filtered = benchmarks.filter(b => b.id !== benchmarkId);
    await AsyncStorage.setItem(BENCHMARKS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    logger.error('Error deleting benchmark:', error);
    return false;
  }
};

export const deleteBenchmarkEntry = async (benchmarkId: string, entryId: string): Promise<boolean> => {
  try {
    const benchmarks = await getBenchmarks();
    const index = benchmarks.findIndex(b => b.id === benchmarkId);
    if (index === -1) return false;

    benchmarks[index].entries = benchmarks[index].entries.filter(e => e.id !== entryId);
    await AsyncStorage.setItem(BENCHMARKS_KEY, JSON.stringify(benchmarks));
    return true;
  } catch (error) {
    logger.error('Error deleting benchmark entry:', error);
    return false;
  }
};

export const getBenchmarkPR = (benchmark: Benchmark): BenchmarkEntry | null => {
  if (benchmark.entries.length === 0) return null;

  // For time-based benchmarks, lower is better (PR)
  if (benchmark.unit === 'time') {
    return benchmark.entries.reduce((min, entry) =>
      entry.value < min.value ? entry : min
    );
  }
  // For others, higher is better
  return benchmark.entries.reduce((max, entry) =>
    entry.value > max.value ? entry : max
  );
};

export const getBenchmarkLast = (benchmark: Benchmark): BenchmarkEntry | null => {
  if (benchmark.entries.length === 0) return null;
  return benchmark.entries.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
};

// ============================================
// SKILL FUNCTIONS
// ============================================

export const getSkills = async (): Promise<Skill[]> => {
  try {
    await initializeStarterPack();
    const data = await AsyncStorage.getItem(SKILLS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logger.error('Error getting skills:', error);
    return [];
  }
};

export const createSkill = async (
  name: string,
  category: SkillCategory,
  status: SkillStatus = 'to_learn',
  initialNote?: string
): Promise<Skill | null> => {
  try {
    const skills = await getSkills();
    const now = new Date().toISOString();
    const notes: SkillNote[] = [];

    // Add initial note if provided
    if (initialNote && initialNote.trim()) {
      notes.push({
        id: generateId(),
        text: initialNote.trim(),
        date: now,
      });
    }

    const newSkill: Skill = {
      id: generateId(),
      name,
      category,
      status,
      drillCount: 0,
      notes,
      createdAt: now,
      updatedAt: now,
    };
    skills.push(newSkill);
    await AsyncStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
    return newSkill;
  } catch (error) {
    logger.error('Error creating skill:', error);
    return null;
  }
};

export const updateSkillStatus = async (
  skillId: string,
  status: SkillStatus
): Promise<boolean> => {
  try {
    const skills = await getSkills();
    const index = skills.findIndex(s => s.id === skillId);
    if (index === -1) return false;

    skills[index].status = status;
    skills[index].updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
    return true;
  } catch (error) {
    logger.error('Error updating skill status:', error);
    return false;
  }
};

export const addSkillNote = async (
  skillId: string,
  text: string
): Promise<boolean> => {
  try {
    const skills = await getSkills();
    const index = skills.findIndex(s => s.id === skillId);
    if (index === -1) return false;

    const note: SkillNote = {
      id: generateId(),
      text,
      date: new Date().toISOString(),
    };
    skills[index].notes.push(note);
    skills[index].updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
    return true;
  } catch (error) {
    logger.error('Error adding skill note:', error);
    return false;
  }
};

export const incrementDrillCount = async (
  skillId: string,
  amount: number = 1
): Promise<boolean> => {
  try {
    const skills = await getSkills();
    const index = skills.findIndex(s => s.id === skillId);
    if (index === -1) return false;

    skills[index].drillCount += amount;
    skills[index].updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
    return true;
  } catch (error) {
    logger.error('Error incrementing drill count:', error);
    return false;
  }
};

export const deleteSkill = async (skillId: string): Promise<boolean> => {
  try {
    const skills = await getSkills();
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return false;

    // Déplacer vers la corbeille
    const trashItems = await getTrashSkills();
    trashItems.push({
      item: skill,
      deletedAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(TRASH_SKILLS_KEY, JSON.stringify(trashItems));

    // Retirer de la liste active
    const filtered = skills.filter(s => s.id !== skillId);
    await AsyncStorage.setItem(SKILLS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    logger.error('Error deleting skill:', error);
    return false;
  }
};

export const deleteSkillNote = async (
  skillId: string,
  noteId: string
): Promise<boolean> => {
  try {
    const skills = await getSkills();
    const index = skills.findIndex(s => s.id === skillId);
    if (index === -1) return false;

    skills[index].notes = skills[index].notes.filter(n => n.id !== noteId);
    skills[index].updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
    return true;
  } catch (error) {
    logger.error('Error deleting skill note:', error);
    return false;
  }
};

export const updateSkillVideoUrl = async (
  skillId: string,
  videoUrl: string | undefined
): Promise<boolean> => {
  try {
    const skills = await getSkills();
    const index = skills.findIndex(s => s.id === skillId);
    if (index === -1) return false;

    skills[index].videoUrl = videoUrl?.trim() || undefined;
    skills[index].updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(SKILLS_KEY, JSON.stringify(skills));
    return true;
  } catch (error) {
    logger.error('Error updating skill video URL:', error);
    return false;
  }
};

// ============================================
// PRESET SKILLS LIBRARY
// ============================================

export const getPresetSkills = (category: SkillCategory): string[] => {
  switch (category) {
    case 'jjb_garde':
      return JJB_GARDE_SKILLS.map(s => s.name);
    case 'jjb_passage':
      return JJB_PASSAGE_SKILLS.map(s => s.name);
    case 'jjb_soumission':
      return JJB_SOUMISSION_SKILLS.map(s => s.name);
    case 'jjb_nogi':
      return JJB_NOGI_SKILLS.map(s => s.name);
    case 'lutte':
      return LUTTE_SKILLS.map(s => s.name);
    case 'striking':
      return STRIKING_SKILLS.map(s => s.name);
    default:
      return [];
  }
};

export const getPresetBenchmarks = (category: BenchmarkCategory): Omit<Benchmark, 'id' | 'entries' | 'createdAt'>[] => {
  switch (category) {
    case 'bodyweight':
      return BODYWEIGHT_BENCHMARKS;
    case 'force':
      return FORCE_BENCHMARKS;
    case 'running':
      return RUNNING_BENCHMARKS;
    case 'trail':
      return TRAIL_BENCHMARKS;
    case 'hyrox':
      return HYROX_BENCHMARKS;
    default:
      return [];
  }
};

// ============================================
// STATS FUNCTIONS
// ============================================

export const getCarnetStats = async (): Promise<{
  totalBenchmarks: number;
  totalPRs: number;
  totalSkills: number;
  skillsMastered: number;
  skillsInProgress: number;
  totalDrills: number;
}> => {
  try {
    const benchmarks = await getBenchmarks();
    const skills = await getSkills();

    return {
      totalBenchmarks: benchmarks.length,
      totalPRs: benchmarks.filter(b => b.entries.length > 0).length,
      totalSkills: skills.length,
      skillsMastered: skills.filter(s => s.status === 'mastered').length,
      skillsInProgress: skills.filter(s => s.status === 'in_progress').length,
      totalDrills: skills.reduce((sum, s) => sum + s.drillCount, 0),
    };
  } catch (error) {
    logger.error('Error getting carnet stats:', error);
    return {
      totalBenchmarks: 0,
      totalPRs: 0,
      totalSkills: 0,
      skillsMastered: 0,
      skillsInProgress: 0,
      totalDrills: 0,
    };
  }
};

// Reset function for testing
export const resetCarnet = async (): Promise<void> => {
  await AsyncStorage.removeItem(BENCHMARKS_KEY);
  await AsyncStorage.removeItem(SKILLS_KEY);
  await AsyncStorage.removeItem(INITIALIZED_KEY);
};

// ============================================
// CORBEILLE - TRASH SYSTEM
// ============================================

export interface TrashItem<T> {
  item: T;
  deletedAt: string;
}

/**
 * Récupère les benchmarks dans la corbeille
 */
export const getTrashBenchmarks = async (): Promise<TrashItem<Benchmark>[]> => {
  try {
    const data = await AsyncStorage.getItem(TRASH_BENCHMARKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logger.error('Error getting trash benchmarks:', error);
    return [];
  }
};

/**
 * Récupère les skills dans la corbeille
 */
export const getTrashSkills = async (): Promise<TrashItem<Skill>[]> => {
  try {
    const data = await AsyncStorage.getItem(TRASH_SKILLS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logger.error('Error getting trash skills:', error);
    return [];
  }
};

/**
 * Restaure un benchmark depuis la corbeille
 */
export const restoreBenchmark = async (benchmarkId: string): Promise<boolean> => {
  try {
    const trashItems = await getTrashBenchmarks();
    const item = trashItems.find(t => t.item.id === benchmarkId);
    if (!item) return false;

    // Ajouter le benchmark restauré
    const benchmarks = await getBenchmarks();
    benchmarks.push(item.item);
    await AsyncStorage.setItem(BENCHMARKS_KEY, JSON.stringify(benchmarks));

    // Retirer de la corbeille
    const filtered = trashItems.filter(t => t.item.id !== benchmarkId);
    await AsyncStorage.setItem(TRASH_BENCHMARKS_KEY, JSON.stringify(filtered));

    return true;
  } catch (error) {
    logger.error('Error restoring benchmark:', error);
    return false;
  }
};

/**
 * Restaure une skill depuis la corbeille
 */
export const restoreSkill = async (skillId: string): Promise<boolean> => {
  try {
    const trashItems = await getTrashSkills();
    const item = trashItems.find(t => t.item.id === skillId);
    if (!item) return false;

    // Ajouter la skill restaurée
    const skills = await getSkills();
    skills.push(item.item);
    await AsyncStorage.setItem(SKILLS_KEY, JSON.stringify(skills));

    // Retirer de la corbeille
    const filtered = trashItems.filter(t => t.item.id !== skillId);
    await AsyncStorage.setItem(TRASH_SKILLS_KEY, JSON.stringify(filtered));

    return true;
  } catch (error) {
    logger.error('Error restoring skill:', error);
    return false;
  }
};

/**
 * Vide complètement la corbeille (suppression définitive)
 */
export const emptyTrash = async (): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove([TRASH_BENCHMARKS_KEY, TRASH_SKILLS_KEY]);
    return true;
  } catch (error) {
    logger.error('Error emptying trash:', error);
    return false;
  }
};

/**
 * Obtient le nombre total d'éléments dans la corbeille
 */
export const getTrashCount = async (): Promise<number> => {
  try {
    const [benchmarks, skills] = await Promise.all([
      getTrashBenchmarks(),
      getTrashSkills(),
    ]);
    return benchmarks.length + skills.length;
  } catch (error) {
    logger.error('Error getting trash count:', error);
    return 0;
  }
};

/**
 * NETTOYAGE INITIAL - Supprime les 11 benchmarks de démo
 * À utiliser UNE SEULE FOIS pour nettoyer l'app
 */
export const cleanDemoData = async (): Promise<{ removed: number; message: string }> => {
  try {
    const benchmarks = await getBenchmarks();

    // Identifier les benchmarks de démo (ceux sans entries ou créés automatiquement)
    const demoBenchmarks = benchmarks.filter(b =>
      b.entries.length === 0 &&
      (b.name === 'Poids de Corps' ||
       b.name === 'Squat' ||
       b.name === 'Développé Couché' ||
       b.name === 'Soulevé de Terre' ||
       b.name === 'Développé Militaire' ||
       b.name === '5km' ||
       b.name === '10km' ||
       b.name === 'Semi-Marathon' ||
       b.name === 'Roxzone' ||
       b.name === 'Sled Push' ||
       b.name === 'Sled Pull')
    );

    if (demoBenchmarks.length === 0) {
      return {
        removed: 0,
        message: 'Aucune donnée de démo à nettoyer',
      };
    }

    // Garder seulement les benchmarks qui ne sont pas de démo
    const filtered = benchmarks.filter(b => !demoBenchmarks.find(d => d.id === b.id));
    await AsyncStorage.setItem(BENCHMARKS_KEY, JSON.stringify(filtered));

    return {
      removed: demoBenchmarks.length,
      message: `${demoBenchmarks.length} record(s) de démo supprimé(s)`,
    };
  } catch (error) {
    logger.error('Error cleaning demo data:', error);
    return {
      removed: 0,
      message: 'Erreur lors du nettoyage',
    };
  }
};

/**
 * Importe tous les exercices watch manquants dans le carnet téléphone.
 * Exécuter une seule fois au démarrage (contrôlé par flag AsyncStorage).
 * Retourne le nombre de nouveaux benchmarks créés.
 */
export const importWatchExercisesToPhone = async (): Promise<number> => {
  try {
    const benchmarks = await getBenchmarks();
    const existingIds = new Set(benchmarks.map(b => b.id));
    const existingNames = new Set(benchmarks.map(b => b.name.toLowerCase()));

    let created = 0;
    for (const template of WATCH_EXERCISE_TEMPLATES) {
      if (!existingIds.has(template.id) && !existingNames.has(template.name.toLowerCase())) {
        const newBenchmark: Benchmark = {
          id: template.id,
          name: template.name,
          category: template.category,
          muscleGroup: template.muscleGroup,
          unit: template.unit,
          iconName: template.iconName,
          color: template.color,
          entries: [],
          createdAt: new Date().toISOString(),
        };
        benchmarks.push(newBenchmark);
        existingIds.add(template.id);
        existingNames.add(template.name.toLowerCase());
        created++;
      }
    }

    if (created > 0) {
      await AsyncStorage.setItem(BENCHMARKS_KEY, JSON.stringify(benchmarks));
      setTimeout(() => syncCarnetToWatch(), 200);
      logger.info(`Watch exercises imported: ${created} new benchmarks created`);
    }

    return created;
  } catch (error) {
    logger.error('Error importing watch exercises:', error);
    return 0;
  }
};

/**
 * Normalise un nom en supprimant les accents et en passant en minuscules.
 * Ex: "Développé Couché" → "developpe couche"
 */
const normalizeName = (name: string): string =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * Trouve ou crée un benchmark à partir d'un exercice reçu de la montre.
 * Recherche par ID, puis par nom (accent-insensitive), puis depuis les templates, puis crée.
 */
export const getOrCreateBenchmarkFromWatch = async (
  watchId: string,
  exerciseName?: string
): Promise<Benchmark | null> => {
  try {
    const benchmarks = await getBenchmarks();

    // 1. Recherche par ID exact (match direct ou benchmark créé depuis le même template)
    const byId = benchmarks.find(b => b.id === watchId);
    if (byId) return byId;

    // 2. Recherche par nom exact (case-insensitive)
    if (exerciseName) {
      const byName = benchmarks.find(b => b.name.toLowerCase() === exerciseName.toLowerCase());
      if (byName) return byName;
    }

    // 3. Recherche par nom normalisé (accents-insensitive) - crucial pour montre→téléphone
    if (exerciseName) {
      const normalized = normalizeName(exerciseName);
      const byNormalized = benchmarks.find(b => normalizeName(b.name) === normalized);
      if (byNormalized) return byNormalized;
    }

    // 4. Créer depuis le template watch correspondant par ID
    const templateById = WATCH_EXERCISE_TEMPLATES.find(t => t.id === watchId);
    if (templateById) {
      // Vérifier si un benchmark existe déjà avec le nom du template (normalisé)
      const templateNorm = normalizeName(templateById.name);
      const existingByTemplateName = benchmarks.find(b => normalizeName(b.name) === templateNorm);
      if (existingByTemplateName) return existingByTemplateName;

      return await createBenchmark(
        templateById.name,
        templateById.category,
        templateById.unit,
        templateById.iconName,
        templateById.color,
        templateById.muscleGroup,
        templateById.id
      );
    }

    // 5. Trouver un template par nom normalisé (montre envoie un ID inconnu mais un nom connu)
    if (exerciseName) {
      const normalized = normalizeName(exerciseName);
      const templateByName = WATCH_EXERCISE_TEMPLATES.find(t => normalizeName(t.name) === normalized);
      if (templateByName) {
        // Vérifier si un benchmark existe déjà avec ce template
        const existingByTemplate = benchmarks.find(b => normalizeName(b.name) === normalizeName(templateByName.name));
        if (existingByTemplate) return existingByTemplate;

        return await createBenchmark(
          templateByName.name,
          templateByName.category,
          templateByName.unit,
          templateByName.iconName,
          templateByName.color,
          templateByName.muscleGroup,
          templateByName.id
        );
      }
    }

    // 6. Créer depuis le nom fourni (exercice inconnu)
    if (exerciseName) {
      return await createBenchmark(
        exerciseName,
        'custom',
        'kg',
        'target',
        '#6B7280',
        undefined,
        watchId
      );
    }

    return null;
  } catch (error) {
    logger.error('Error in getOrCreateBenchmarkFromWatch:', error);
    return null;
  }
};

/**
 * Helper interne pour synchroniser le carnet vers la montre
 */
export const syncCarnetToWatch = async () => {
  try {
    const data = await AsyncStorage.getItem('yoroi_benchmarks_v2');
    if (!data) return;
    const benchmarks: Benchmark[] = JSON.parse(data);

    // Format attendu par WatchSessionManager.applyData() : clé "benchmarks"
    const watchBenchmarks = benchmarks.slice(0, 50).map((b) => {
      const pr = getBenchmarkPR(b);
      const last = getBenchmarkLast(b);
      return {
        id: b.id,
        name: b.name,
        category: b.category || 'Force',
        sport: (b as any).sport || b.muscleGroup || '',
        unit: b.unit || 'kg',
        pr: pr?.value || 0,
        prReps: pr?.reps || 0,
        prDate: pr?.date || '',
        lastValue: last?.value || 0,
        entryCount: b.entries?.length || 0,
      };
    });

    // Méthode 1: updateApplicationContext (sync immédiate si Watch à portée)
    await WatchConnectivity.updateApplicationContext({
      benchmarks: watchBenchmarks,
      benchmarksTimestamp: Date.now(),
    });

    // Méthode 2: transferUserInfo (garantie de livraison, même si Watch hors portée)
    try {
      await WatchConnectivity.transferUserInfo({
        benchmarks: watchBenchmarks,
        benchmarksTimestamp: Date.now(),
      });
    } catch (transferError) {
      logger.info('transferUserInfo error (non-blocking):', transferError);
    }

    logger.info(`Carnet synchronise vers Apple Watch (${watchBenchmarks.length} benchmarks)`);
  } catch (e) {
    logger.warn('Echec sync carnet vers Watch:', e);
  }
};
