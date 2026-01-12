// ============================================
// CARNET D'ENTRAINEMENT - SERVICE
// Gestion des Benchmarks (Stats) et Skills (Techniques)
// Jargon FR/EN valide - Style salle et dojo
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES
// ============================================

export type BenchmarkCategory = 'bodyweight' | 'force' | 'running' | 'trail' | 'hyrox' | 'custom';
export type BenchmarkUnit = 'kg' | 'lbs' | 'time' | 'reps' | 'meters' | 'km';
export type SkillStatus = 'to_learn' | 'in_progress' | 'mastered';
export type SkillCategory = 'jjb_garde' | 'jjb_passage' | 'jjb_soumission' | 'lutte' | 'striking' | 'other';

export interface BenchmarkEntry {
  id: string;
  value: number;
  reps?: number; // Mandatory for Force exercises
  date: string;
  rpe?: number; // Rate of Perceived Exertion 1-10
  notes?: string;
  duration?: number; // Duration in minutes
  calories?: number; // Estimated or user-entered calories
}

// Weight unit for Force exercises
export type WeightUnit = 'kg' | 'lbs';

// ============================================
// METs CONSTANTS FOR CALORIE CALCULATION
// ============================================
export const METS_VALUES: Record<BenchmarkCategory, number> = {
  force: 5,
  bodyweight: 6,
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
// STORAGE KEYS
// ============================================

const BENCHMARKS_KEY = 'yoroi_benchmarks_v2';
const SKILLS_KEY = 'yoroi_skills_v2';
const INITIALIZED_KEY = 'yoroi_carnet_initialized_v2';

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
  force: { label: 'Musculation', color: '#EF4444', iconName: 'dumbbell' },
  running: { label: 'Running', color: '#3B82F6', iconName: 'timer' },
  trail: { label: 'Trail', color: '#10B981', iconName: 'mountain' },
  hyrox: { label: 'Hyrox', color: '#F59E0B', iconName: 'flame' },
  custom: { label: 'Autre', color: '#6B7280', iconName: 'target' },
};

export const SKILL_CATEGORIES: Record<SkillCategory, { label: string; color: string; iconName: string }> = {
  jjb_garde: { label: 'JJB - Garde', color: '#8B5CF6', iconName: 'shield' },
  jjb_passage: { label: 'JJB - Passage', color: '#06B6D4', iconName: 'move' },
  jjb_soumission: { label: 'JJB - Soumission', color: '#EC4899', iconName: 'lock' },
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

// Format Force entry with weight × reps (e.g., "100 kg × 5")
export const formatForceEntry = (value: number, unit: BenchmarkUnit, reps?: number): string => {
  const weightStr = unit === 'kg' || unit === 'lbs' ? `${value} ${unit}` : formatValue(value, unit);
  if (reps && reps > 0) {
    return `${weightStr} × ${reps}`;
  }
  return weightStr;
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

    // Create default benchmarks
    const defaultBenchmarks: Benchmark[] = [
      ...BODYWEIGHT_BENCHMARKS, // Poids de Corps (essentiel pour combattants)
      ...FORCE_BENCHMARKS.slice(0, 4), // Squat, Dev Couché, Soulevé, Dev Militaire
      ...RUNNING_BENCHMARKS.slice(0, 3), // 5km, 10km, Semi
      ...HYROX_BENCHMARKS.slice(0, 3), // Roxzone, Sled Push, Sled Pull
    ].map(b => ({
      ...b,
      id: generateId(),
      entries: [],
      createdAt: new Date().toISOString(),
    }));

    await AsyncStorage.setItem(BENCHMARKS_KEY, JSON.stringify(defaultBenchmarks));

    // Skills are empty by default - user adds what they want
    await AsyncStorage.setItem(SKILLS_KEY, JSON.stringify([]));

    await AsyncStorage.setItem(INITIALIZED_KEY, 'true');
  } catch (error) {
    console.error('Error initializing starter pack:', error);
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
    console.error('Error getting benchmarks:', error);
    return [];
  }
};

export const createBenchmark = async (
  name: string,
  category: BenchmarkCategory,
  unit: BenchmarkUnit,
  iconName?: string,
  color?: string
): Promise<Benchmark | null> => {
  try {
    const benchmarks = await getBenchmarks();
    const newBenchmark: Benchmark = {
      id: generateId(),
      name,
      category,
      unit,
      iconName: iconName || BENCHMARK_CATEGORIES[category].iconName,
      color: color || BENCHMARK_CATEGORIES[category].color,
      entries: [],
      createdAt: new Date().toISOString(),
    };
    benchmarks.push(newBenchmark);
    await AsyncStorage.setItem(BENCHMARKS_KEY, JSON.stringify(benchmarks));
    return newBenchmark;
  } catch (error) {
    console.error('Error creating benchmark:', error);
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
  calories?: number
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
    };
    benchmarks[index].entries.push(entry);
    await AsyncStorage.setItem(BENCHMARKS_KEY, JSON.stringify(benchmarks));
    return entry;
  } catch (error) {
    console.error('Error adding benchmark entry:', error);
    return null;
  }
};

export const deleteBenchmark = async (benchmarkId: string): Promise<boolean> => {
  try {
    const benchmarks = await getBenchmarks();
    const filtered = benchmarks.filter(b => b.id !== benchmarkId);
    await AsyncStorage.setItem(BENCHMARKS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting benchmark:', error);
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
    console.error('Error deleting benchmark entry:', error);
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
    console.error('Error getting skills:', error);
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
    console.error('Error creating skill:', error);
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
    console.error('Error updating skill status:', error);
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
    console.error('Error adding skill note:', error);
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
    console.error('Error incrementing drill count:', error);
    return false;
  }
};

export const deleteSkill = async (skillId: string): Promise<boolean> => {
  try {
    const skills = await getSkills();
    const filtered = skills.filter(s => s.id !== skillId);
    await AsyncStorage.setItem(SKILLS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting skill:', error);
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
    console.error('Error deleting skill note:', error);
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
    console.error('Error updating skill video URL:', error);
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
    console.error('Error getting carnet stats:', error);
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
