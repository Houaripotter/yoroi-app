// ============================================
// YOROI - SYSTEME DE BADGES COMPLET
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LucideIcon } from 'lucide-react-native';
import {
  Flame,
  Gem,
  Scale,
  TrendingDown,
  Target,
  Trophy,
  Crown,
  Dumbbell,
  Award,
  Swords,
  Shield,
  Sunrise,
  Brain,
  Camera,
  BarChart,
  Calendar,
  Cake,
  Droplet,
  Moon,
  Zap,
  Star,
  Medal,
  Mountain,
} from 'lucide-react-native';
import logger from '@/lib/security/logger';
import {
  getAllMeasurements,
  getAllWorkouts,
  getPhotosFromStorage,
  getUserSettings,
  getAllHydrationEntries,
  getHydrationSettings,
  Measurement,
  Workout,
} from './storage';
import { getProfile } from './database';
import { getSleepEntries } from './sleepService';

// ============================================
// TYPES
// ============================================

export type BadgeCategory =
  | 'streak'
  | 'weight'
  | 'training'
  | 'special'
  | 'time';

export interface Badge {
  id: string;
  name: string;
  iconComponent: LucideIcon;
  description: string;
  category: BadgeCategory;
  requirement: number; // Valeur requise pour debloquer
  xpReward: number; // XP gagnes
}

export interface UnlockedBadge {
  badgeId: string;
  unlockedAt: string;
}

export interface BadgeProgress {
  badge: Badge;
  isUnlocked: boolean;
  unlockedAt?: string;
  currentProgress: number;
  progressPercent: number;
}

// ============================================
// CLES DE STOCKAGE
// ============================================

const STORAGE_KEYS = {
  UNLOCKED_BADGES: '@yoroi_unlocked_badges',
  BADGE_UNLOCK_DATES: '@yoroi_badge_unlock_dates',
  FIRST_USE_DATE: '@yoroi_first_use_date',
} as const;

// ============================================
// DEFINITION DES BADGES
// ============================================

// BADGES STREAK
export const STREAK_BADGES: Badge[] = [
  {
    id: 'first_flame',
    name: 'Premiere flamme',
    iconComponent: Flame,
    description: '7 jours de streak consecutifs',
    category: 'streak',
    requirement: 7,
    xpReward: 50,
  },
  {
    id: 'fortnight_warrior',
    name: 'Athlète quinzaine',
    iconComponent: Flame,
    description: '14 jours de streak consecutifs',
    category: 'streak',
    requirement: 14,
    xpReward: 100,
  },
  {
    id: 'on_fire',
    name: 'En feu',
    iconComponent: Flame,
    description: '30 jours de streak consecutifs',
    category: 'streak',
    requirement: 30,
    xpReward: 150,
  },
  {
    id: 'fifty_days',
    name: 'Cinquante jours',
    iconComponent: Flame,
    description: '50 jours de streak consecutifs',
    category: 'streak',
    requirement: 50,
    xpReward: 250,
  },
  {
    id: 'inferno',
    name: 'Inferno',
    iconComponent: Flame,
    description: '100 jours de streak consecutifs',
    category: 'streak',
    requirement: 100,
    xpReward: 500,
  },
  {
    id: 'double_century',
    name: 'Double centenaire',
    iconComponent: Gem,
    description: '200 jours de streak consecutifs',
    category: 'streak',
    requirement: 200,
    xpReward: 1000,
  },
  {
    id: 'legendary_streak',
    name: 'Legendaire',
    iconComponent: Gem,
    description: '365 jours de streak consecutifs',
    category: 'streak',
    requirement: 365,
    xpReward: 2000,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    iconComponent: Star,
    description: '150 jours de streak consecutifs',
    category: 'streak',
    requirement: 150,
    xpReward: 750,
  },
];

// BADGES POIDS
export const WEIGHT_BADGES: Badge[] = [
  {
    id: 'first_step',
    name: 'Premier pas',
    iconComponent: Scale,
    description: 'Premiere pesee enregistree',
    category: 'weight',
    requirement: 1,
    xpReward: 25,
  },
  {
    id: 'first_three',
    name: 'Premiers kilos',
    iconComponent: TrendingDown,
    description: '3 kg perdus au total',
    category: 'weight',
    requirement: 3,
    xpReward: 75,
  },
  {
    id: 'launched',
    name: 'Lance',
    iconComponent: TrendingDown,
    description: '5 kg perdus au total',
    category: 'weight',
    requirement: 5,
    xpReward: 100,
  },
  {
    id: 'determined',
    name: 'Determine',
    iconComponent: Target,
    description: '10 kg perdus au total',
    category: 'weight',
    requirement: 10,
    xpReward: 250,
  },
  {
    id: 'halfway_hero',
    name: 'Heros mi-parcours',
    iconComponent: Target,
    description: '15 kg perdus au total',
    category: 'weight',
    requirement: 15,
    xpReward: 400,
  },
  {
    id: 'transformed',
    name: 'Transforme',
    iconComponent: Trophy,
    description: '20 kg perdus au total',
    category: 'weight',
    requirement: 20,
    xpReward: 500,
  },
  {
    id: 'super_transformed',
    name: 'Super transforme',
    iconComponent: Trophy,
    description: '25 kg perdus au total',
    category: 'weight',
    requirement: 25,
    xpReward: 750,
  },
  {
    id: 'ultimate_warrior',
    name: 'Athlète ultime',
    iconComponent: Crown,
    description: '30 kg perdus au total',
    category: 'weight',
    requirement: 30,
    xpReward: 1000,
  },
  {
    id: 'goal_reached',
    name: 'Objectif atteint',
    iconComponent: Crown,
    description: 'Atteindre ton objectif de poids',
    category: 'weight',
    requirement: 1, // Boolean check
    xpReward: 1000,
  },
  {
    id: 'first_kilo',
    name: 'Premier kilo',
    iconComponent: TrendingDown,
    description: '1 kg perdu au total',
    category: 'weight',
    requirement: 1,
    xpReward: 25,
  },
  {
    id: 'halfway_goal',
    name: 'Mi-chemin',
    iconComponent: Target,
    description: 'Atteindre 50% de ton objectif de poids',
    category: 'weight',
    requirement: 1, // Boolean check
    xpReward: 500,
  },
];

// BADGES ENTRAINEMENT
export const TRAINING_BADGES: Badge[] = [
  {
    id: 'first_training',
    name: 'Premier combat',
    iconComponent: Dumbbell,
    description: '5 entrainements completes',
    category: 'training',
    requirement: 5,
    xpReward: 25,
  },
  {
    id: 'beginner',
    name: 'Debutant',
    iconComponent: Dumbbell,
    description: '10 entrainements completes',
    category: 'training',
    requirement: 10,
    xpReward: 50,
  },
  {
    id: 'committed',
    name: 'Engage',
    iconComponent: Award,
    description: '25 entrainements completes',
    category: 'training',
    requirement: 25,
    xpReward: 100,
  },
  {
    id: 'regular',
    name: 'Regulier',
    iconComponent: Award,
    description: '50 entrainements completes',
    category: 'training',
    requirement: 50,
    xpReward: 200,
  },
  {
    id: 'warrior',
    name: 'Athlète',
    iconComponent: Swords,
    description: '100 entrainements completes',
    category: 'training',
    requirement: 100,
    xpReward: 500,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    iconComponent: Swords,
    description: '200 entrainements completes',
    category: 'training',
    requirement: 200,
    xpReward: 800,
  },
  {
    id: 'elite',
    name: 'Elite',
    iconComponent: Shield,
    description: '300 entrainements completes',
    category: 'training',
    requirement: 300,
    xpReward: 1200,
  },
  {
    id: 'master',
    name: 'Maitre',
    iconComponent: Shield,
    description: '500 entrainements completes',
    category: 'training',
    requirement: 500,
    xpReward: 2000,
  },
  {
    id: 'legend',
    name: 'Legende',
    iconComponent: Crown,
    description: '1000 entrainements completes',
    category: 'training',
    requirement: 1000,
    xpReward: 5000,
  },
  {
    id: 'champion',
    name: 'Champion',
    iconComponent: Medal,
    description: '400 entrainements completes',
    category: 'training',
    requirement: 400,
    xpReward: 1500,
  },
  {
    id: 'unstoppable',
    name: 'Inarretable',
    iconComponent: Mountain,
    description: '750 entrainements completes',
    category: 'training',
    requirement: 750,
    xpReward: 3000,
  },
];

// BADGES SPECIAUX
export const SPECIAL_BADGES: Badge[] = [
  {
    id: 'team_yoroi_member',
    name: 'Membre Team Yoroi',
    iconComponent: Swords,
    description: 'Tu fais partie de la famille. Bienvenue, champion.',
    category: 'special',
    requirement: 0, // Donné automatiquement à l'inscription
    xpReward: 100,
  },
  {
    id: 'early_bird',
    name: 'Leve-tot',
    iconComponent: Sunrise,
    description: '10 pesees avant 7h du matin',
    category: 'special',
    requirement: 10,
    xpReward: 100,
  },
  {
    id: 'night_owl',
    name: 'Noctambule',
    iconComponent: Brain,
    description: '10 entrainements apres 21h',
    category: 'special',
    requirement: 10,
    xpReward: 100,
  },
  {
    id: 'photographer',
    name: 'Photographe',
    iconComponent: Camera,
    description: '10 photos de transformation',
    category: 'special',
    requirement: 10,
    xpReward: 100,
  },
  {
    id: 'photo_master',
    name: 'Maitre photo',
    iconComponent: Camera,
    description: '25 photos de transformation',
    category: 'special',
    requirement: 25,
    xpReward: 250,
  },
  {
    id: 'analyst',
    name: 'Analyste',
    iconComponent: BarChart,
    description: '50 mensurations prises',
    category: 'special',
    requirement: 50,
    xpReward: 150,
  },
  {
    id: 'complete',
    name: 'Complet',
    iconComponent: Award,
    description: 'Tous les champs remplis 30 fois',
    category: 'special',
    requirement: 30,
    xpReward: 300,
  },
  {
    id: 'double_session',
    name: 'Double session',
    iconComponent: Flame,
    description: '2 entrainements en 1 jour',
    category: 'special',
    requirement: 1,
    xpReward: 150,
  },
  {
    id: 'weekend_warrior',
    name: 'Athlète weekend',
    iconComponent: Calendar,
    description: 'Entrainement samedi et dimanche',
    category: 'special',
    requirement: 1,
    xpReward: 100,
  },
  {
    id: 'seven_days_straight',
    name: 'Semaine parfaite',
    iconComponent: Trophy,
    description: '7 jours entrainement consecutifs',
    category: 'special',
    requirement: 7,
    xpReward: 200,
  },
  {
    id: 'perfect_month',
    name: 'Mois parfait',
    iconComponent: Crown,
    description: '30 jours entrainement consecutifs',
    category: 'special',
    requirement: 30,
    xpReward: 500,
  },
  {
    id: 'hydration_master',
    name: 'Maitre hydratation',
    iconComponent: Droplet,
    description: 'Objectif hydratation 7 jours de suite',
    category: 'special',
    requirement: 7,
    xpReward: 100,
  },
  {
    id: 'super_photographer',
    name: 'Super photographe',
    iconComponent: Camera,
    description: '50 photos de transformation',
    category: 'special',
    requirement: 50,
    xpReward: 500,
  },
  {
    id: 'triple_session',
    name: 'Triple session',
    iconComponent: Zap,
    description: '3 entrainements en 1 jour',
    category: 'special',
    requirement: 1,
    xpReward: 300,
  },
  {
    id: 'sleep_master',
    name: 'Maitre du sommeil',
    iconComponent: Moon,
    description: '10 nuits avec 8h+ de sommeil',
    category: 'special',
    requirement: 10,
    xpReward: 150,
  },
  {
    id: 'hydration_legend',
    name: 'Legende hydratation',
    iconComponent: Droplet,
    description: 'Objectif hydratation 30 jours de suite',
    category: 'special',
    requirement: 30,
    xpReward: 300,
  },
];

// BADGES TEMPS
export const TIME_BADGES: Badge[] = [
  {
    id: 'one_month',
    name: '1 mois',
    iconComponent: Calendar,
    description: 'Utiliser l\'app pendant 1 mois',
    category: 'time',
    requirement: 30,
    xpReward: 100,
  },
  {
    id: 'six_months',
    name: '6 mois',
    iconComponent: Calendar,
    description: 'Utiliser l\'app pendant 6 mois',
    category: 'time',
    requirement: 180,
    xpReward: 300,
  },
  {
    id: 'one_year',
    name: '1 an',
    iconComponent: Calendar,
    description: 'Utiliser l\'app pendant 1 an',
    category: 'time',
    requirement: 365,
    xpReward: 1000,
  },
  {
    id: 'anniversary',
    name: 'Anniversaire',
    iconComponent: Cake,
    description: '1 an jour pour jour depuis la premiere utilisation',
    category: 'time',
    requirement: 365,
    xpReward: 500,
  },
  {
    id: 'two_years',
    name: '2 ans',
    iconComponent: Gem,
    description: 'Utiliser l\'app pendant 2 ans',
    category: 'time',
    requirement: 730,
    xpReward: 2000,
  },
];

// BADGES CHEVALIER
export const KNIGHT_BADGES: Badge[] = [
  {
    id: 'squire',
    name: 'Ecuyer',
    iconComponent: Shield,
    description: 'Premiers pas sur le chemin de la chevalerie',
    category: 'training',
    requirement: 5,
    xpReward: 50,
  },
  {
    id: 'knight',
    name: 'Chevalier',
    iconComponent: Swords,
    description: 'Adoube comme chevalier du royaume',
    category: 'training',
    requirement: 50,
    xpReward: 250,
  },
  {
    id: 'knight_gold',
    name: 'Chevalier d\'Or',
    iconComponent: Crown,
    description: 'Elite des chevaliers, armure doree',
    category: 'training',
    requirement: 100,
    xpReward: 500,
  },
  {
    id: 'paladin',
    name: 'Paladin',
    iconComponent: Award,
    description: 'Champion de la justice et de l\'honneur',
    category: 'training',
    requirement: 200,
    xpReward: 1000,
  },
  {
    id: 'crusader',
    name: 'Croise',
    iconComponent: Flame,
    description: 'En croisade pour ta transformation',
    category: 'streak',
    requirement: 7,
    xpReward: 150,
  },
  {
    id: 'guardian',
    name: 'Gardien',
    iconComponent: Shield,
    description: 'Gardien inebranlable de tes objectifs',
    category: 'streak',
    requirement: 30,
    xpReward: 300,
  },
  {
    id: 'templar',
    name: 'Templier',
    iconComponent: Star,
    description: 'Discipline de fer, corps d\'acier',
    category: 'special',
    requirement: 1, // 50 workouts + 5kg lost (combo)
    xpReward: 400,
  },
  {
    id: 'conqueror',
    name: 'Conquerant',
    iconComponent: Trophy,
    description: 'Tu as conquis ton objectif',
    category: 'weight',
    requirement: 1, // Boolean check
    xpReward: 750,
  },
  {
    id: 'lord',
    name: 'Seigneur',
    iconComponent: Crown,
    description: 'Seigneur de ton domaine',
    category: 'time',
    requirement: 100,
    xpReward: 500,
  },
  {
    id: 'legendary_king',
    name: 'Roi Legendaire',
    iconComponent: Gem,
    description: 'Regne absolu sur ta transformation',
    category: 'special',
    requirement: 1, // 365 days + goal reached
    xpReward: 2000,
  },
];

// TOUS LES BADGES
export const ALL_BADGES: Badge[] = [
  ...STREAK_BADGES,
  ...WEIGHT_BADGES,
  ...TRAINING_BADGES,
  ...SPECIAL_BADGES,
  ...TIME_BADGES,
  ...KNIGHT_BADGES,
];

// ============================================
// FONCTIONS DE STOCKAGE
// ============================================

/**
 * Obtenir tous les badges debloques
 */
export const getUnlockedBadges = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.UNLOCKED_BADGES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logger.error('Erreur lecture badges:', error);
    return [];
  }
};

/**
 * Obtenir les dates de deblocage des badges
 */
export const getBadgeUnlockDates = async (): Promise<Record<string, string>> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.BADGE_UNLOCK_DATES);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    logger.error('Erreur lecture dates badges:', error);
    return {};
  }
};

/**
 * Debloquer un badge
 */
export const unlockBadge = async (badgeId: string): Promise<boolean> => {
  try {
    const unlockedBadges = await getUnlockedBadges();

    // Deja debloque
    if (unlockedBadges.includes(badgeId)) {
      return false;
    }

    // Ajouter le badge
    unlockedBadges.push(badgeId);
    await AsyncStorage.setItem(
      STORAGE_KEYS.UNLOCKED_BADGES,
      JSON.stringify(unlockedBadges)
    );

    // Enregistrer la date
    const dates = await getBadgeUnlockDates();
    dates[badgeId] = new Date().toISOString();
    await AsyncStorage.setItem(
      STORAGE_KEYS.BADGE_UNLOCK_DATES,
      JSON.stringify(dates)
    );

    logger.info('Badge debloque:', badgeId);
    return true;
  } catch (error) {
    logger.error('Erreur deblocage badge:', error);
    return false;
  }
};

/**
 * Verifier si un badge est debloque
 */
export const isBadgeUnlocked = async (badgeId: string): Promise<boolean> => {
  const unlockedBadges = await getUnlockedBadges();
  return unlockedBadges.includes(badgeId);
};

/**
 * Obtenir la date de premiere utilisation
 */
export const getFirstUseDate = async (): Promise<string | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_USE_DATE);
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Enregistrer la date de premiere utilisation
 */
export const setFirstUseDate = async (): Promise<void> => {
  try {
    const existing = await getFirstUseDate();
    if (!existing) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.FIRST_USE_DATE,
        new Date().toISOString()
      );
    }
  } catch (error) {
    logger.error('Erreur enregistrement date:', error);
  }
};

// ============================================
// CALCUL DES STATISTIQUES
// ============================================

export interface BadgeStats {
  // Streak
  currentStreak: number;
  maxStreak: number;

  // Poids
  totalMeasurements: number;
  weightLost: number;
  goalReached: boolean;
  halfwayGoalReached: boolean;

  // Entrainements
  totalWorkouts: number;

  // Special
  earlyMeasurements: number; // Avant 7h
  lateWorkouts: number; // Apres 21h
  totalPhotos: number;
  measurementsWithDetails: number; // Avec mensurations completes
  completeMeasurements: number; // Tous les champs remplis

  // Sessions multiples
  hasDoubleSession: boolean; // 2 entraînements en 1 jour
  hasTripleSession: boolean; // 3 entraînements en 1 jour
  hasWeekendWarrior: boolean; // Samedi + dimanche même weekend

  // Hydratation
  hydrationStreak: number; // Jours consécutifs objectif hydratation atteint

  // Sommeil
  goodSleepNights: number; // Nombre de nuits avec 8h+ de sommeil

  // Temps
  daysUsingApp: number;
  isAnniversary: boolean;
}

/**
 * Calculer le streak actuel
 */
const calculateStreak = (measurements: Measurement[]): { current: number; max: number } => {
  if (measurements.length === 0) return { current: 0, max: 0 };

  // Trier par date decroissante
  const sorted = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Obtenir les dates uniques
  const uniqueDates = [...new Set(sorted.map(m => m.date.split('T')[0]))];

  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDate = new Date(uniqueDates[0]);
  firstDate.setHours(0, 0, 0, 0);

  // Verifier si la derniere mesure est aujourd'hui ou hier
  const diffDays = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    currentStreak = 1;

    // Compter le streak
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diff === 1) {
        tempStreak++;
        currentStreak = tempStreak;
      } else {
        maxStreak = Math.max(maxStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }

  maxStreak = Math.max(maxStreak, tempStreak, currentStreak);

  return { current: currentStreak, max: maxStreak };
};

/**
 * Calculer le poids perdu
 */
const calculateWeightLost = (measurements: Measurement[]): number => {
  if (measurements.length < 2) return 0;

  // Trier par date
  const sorted = [...measurements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const firstWeight = sorted[0].weight;
  const lastWeight = sorted[sorted.length - 1].weight;

  // Retourner la perte (positif = perte, negatif = gain)
  const lost = firstWeight - lastWeight;
  return Math.max(0, lost);
};

/**
 * Compter les pesees avant 7h
 */
const countEarlyMeasurements = (measurements: Measurement[]): number => {
  return measurements.filter(m => {
    const date = new Date(m.created_at || m.date);
    return date.getHours() < 7;
  }).length;
};

/**
 * Compter les entrainements apres 21h
 */
const countLateWorkouts = (workouts: Workout[]): number => {
  return workouts.filter(w => {
    const date = new Date(w.created_at || w.date);
    return date.getHours() >= 21;
  }).length;
};

/**
 * Compter les mesures avec mensurations completes
 */
const countCompleteMeasurements = (measurements: Measurement[]): number => {
  return measurements.filter(m => {
    const hasBasic = m.weight != null;
    const hasBody = m.body_fat != null || m.bodyFat != null;
    const hasMeasurements = m.measurements && (
      m.measurements.chest != null ||
      m.measurements.waist != null ||
      m.measurements.hips != null
    );
    return hasBasic && hasBody && hasMeasurements;
  }).length;
};

/**
 * Vérifier si l'utilisateur a eu 2 ou 3 entraînements en 1 jour
 */
const checkMultipleSessions = (workouts: Workout[]): { hasDouble: boolean; hasTriple: boolean } => {
  // Compter les entraînements par date
  const workoutsByDate: Record<string, number> = {};

  for (const workout of workouts) {
    const dateKey = workout.date.split('T')[0];
    workoutsByDate[dateKey] = (workoutsByDate[dateKey] || 0) + 1;
  }

  let hasDouble = false;
  let hasTriple = false;

  for (const count of Object.values(workoutsByDate)) {
    if (count >= 2) hasDouble = true;
    if (count >= 3) hasTriple = true;
  }

  return { hasDouble, hasTriple };
};

/**
 * Vérifier si l'utilisateur s'est entraîné samedi ET dimanche du même weekend
 */
const checkWeekendWarrior = (workouts: Workout[]): boolean => {
  // Grouper par semaine (du lundi au dimanche)
  const weekends: Record<string, { saturday: boolean; sunday: boolean }> = {};

  for (const workout of workouts) {
    const date = new Date(workout.date);
    const dayOfWeek = date.getDay(); // 0 = dimanche, 6 = samedi

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Trouver le début de la semaine (lundi)
      const weekStart = new Date(date);
      const diff = date.getDay() === 0 ? -6 : 1 - date.getDay();
      weekStart.setDate(date.getDate() + diff);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weekends[weekKey]) {
        weekends[weekKey] = { saturday: false, sunday: false };
      }

      if (dayOfWeek === 6) weekends[weekKey].saturday = true;
      if (dayOfWeek === 0) weekends[weekKey].sunday = true;
    }
  }

  // Vérifier s'il existe un weekend avec samedi ET dimanche
  return Object.values(weekends).some(w => w.saturday && w.sunday);
};

/**
 * Calculer le streak d'hydratation (jours consécutifs objectif atteint)
 */
const calculateHydrationStreak = async (): Promise<number> => {
  try {
    const entries = await getAllHydrationEntries();
    const settings = await getHydrationSettings();

    if (entries.length === 0) return 0;

    // Objectif en ml (customGoal ou dailyGoal * 1000)
    const goalMl = settings.customGoal || (settings.dailyGoal * 1000);
    if (!goalMl || goalMl <= 0) return 0;

    // Grouper par date
    const hydrationByDate: Record<string, number> = {};
    for (const entry of entries) {
      const dateKey = entry.date;
      hydrationByDate[dateKey] = (hydrationByDate[dateKey] || 0) + entry.amount;
    }

    // Calculer le streak depuis aujourd'hui
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];

      const totalForDay = hydrationByDate[dateKey] || 0;

      if (totalForDay >= goalMl) {
        streak++;
      } else {
        // Streak cassé
        break;
      }
    }

    return streak;
  } catch (error) {
    logger.error('Erreur calcul streak hydratation:', error);
    return 0;
  }
};

/**
 * Compter le nombre de nuits avec 8h+ de sommeil
 */
const countGoodSleepNights = async (): Promise<number> => {
  try {
    const entries = await getSleepEntries();
    // 8h = 480 minutes
    return entries.filter(e => e.duration >= 480).length;
  } catch (error) {
    logger.error('Erreur comptage nuits sommeil:', error);
    return 0;
  }
};

/**
 * Calculer toutes les statistiques pour les badges
 */
export const calculateBadgeStats = async (): Promise<BadgeStats> => {
  const measurements = await getAllMeasurements();
  const workouts = await getAllWorkouts();
  const photos = await getPhotosFromStorage();
  const settings = await getUserSettings();
  const profile = await getProfile();
  const firstUseDate = await getFirstUseDate();

  // Streak
  const streakInfo = calculateStreak(measurements);

  // Poids perdu
  const weightLost = calculateWeightLost(measurements);

  // Objectif atteint
  let goalReached = false;
  let halfwayGoalReached = false;

  if (settings.weight_goal && measurements.length > 0) {
    const latestWeight = measurements[0].weight;
    goalReached = latestWeight <= settings.weight_goal;

    // Calculer 50% de l'objectif
    // On utilise le poids de départ du profil ou le premier poids enregistré
    const startWeight = profile?.start_weight ||
      (measurements.length > 0
        ? [...measurements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].weight
        : 0);

    if (startWeight > settings.weight_goal) {
      // L'utilisateur veut perdre du poids
      const totalToLose = startWeight - settings.weight_goal;
      const actuallyLost = startWeight - latestWeight;
      halfwayGoalReached = actuallyLost >= totalToLose * 0.5;
    } else if (startWeight < settings.weight_goal) {
      // L'utilisateur veut prendre du poids
      const totalToGain = settings.weight_goal - startWeight;
      const actuallyGained = latestWeight - startWeight;
      halfwayGoalReached = actuallyGained >= totalToGain * 0.5;
    }
  }

  // Sessions multiples (2 ou 3 entraînements/jour)
  const { hasDouble, hasTriple } = checkMultipleSessions(workouts);

  // Weekend warrior (samedi + dimanche)
  const hasWeekendWarrior = checkWeekendWarrior(workouts);

  // Hydratation streak
  const hydrationStreak = await calculateHydrationStreak();

  // Nuits avec 8h+ de sommeil
  const goodSleepNights = await countGoodSleepNights();

  // Jours depuis premiere utilisation
  let daysUsingApp = 0;
  let isAnniversary = false;

  if (firstUseDate) {
    const firstDate = new Date(firstUseDate);
    const now = new Date();
    daysUsingApp = Math.floor((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

    // Verifier anniversaire (meme jour et mois, 1 an apres)
    isAnniversary = daysUsingApp >= 365 &&
      firstDate.getMonth() === now.getMonth() &&
      firstDate.getDate() === now.getDate();
  }

  return {
    currentStreak: streakInfo.current,
    maxStreak: streakInfo.max,
    totalMeasurements: measurements.length,
    weightLost,
    goalReached,
    halfwayGoalReached,
    totalWorkouts: workouts.length,
    earlyMeasurements: countEarlyMeasurements(measurements),
    lateWorkouts: countLateWorkouts(workouts),
    totalPhotos: photos.length,
    measurementsWithDetails: measurements.filter(m => m.measurements).length,
    completeMeasurements: countCompleteMeasurements(measurements),
    hasDoubleSession: hasDouble,
    hasTripleSession: hasTriple,
    hasWeekendWarrior,
    hydrationStreak,
    goodSleepNights,
    daysUsingApp,
    isAnniversary,
  };
};

// ============================================
// VERIFICATION DES BADGES
// ============================================

/**
 * Verifier quels badges peuvent etre debloques
 * Retourne la liste des nouveaux badges debloques
 */
export const checkAndUnlockBadges = async (): Promise<Badge[]> => {
  const stats = await calculateBadgeStats();
  const unlockedBadges = await getUnlockedBadges();
  const newlyUnlocked: Badge[] = [];

  // Verifier chaque badge
  for (const badge of ALL_BADGES) {
    // Deja debloque
    if (unlockedBadges.includes(badge.id)) continue;

    let shouldUnlock = false;

    switch (badge.id) {
      // STREAK
      case 'first_flame':
        shouldUnlock = stats.currentStreak >= 7 || stats.maxStreak >= 7;
        break;
      case 'on_fire':
        shouldUnlock = stats.currentStreak >= 30 || stats.maxStreak >= 30;
        break;
      case 'inferno':
        shouldUnlock = stats.currentStreak >= 100 || stats.maxStreak >= 100;
        break;
      case 'legendary_streak':
        shouldUnlock = stats.currentStreak >= 365 || stats.maxStreak >= 365;
        break;

      // POIDS
      case 'first_step':
        shouldUnlock = stats.totalMeasurements >= 1;
        break;
      case 'launched':
        shouldUnlock = stats.weightLost >= 5;
        break;
      case 'determined':
        shouldUnlock = stats.weightLost >= 10;
        break;
      case 'transformed':
        shouldUnlock = stats.weightLost >= 20;
        break;
      case 'goal_reached':
        shouldUnlock = stats.goalReached;
        break;

      // ENTRAINEMENT
      case 'beginner':
        shouldUnlock = stats.totalWorkouts >= 10;
        break;
      case 'regular':
        shouldUnlock = stats.totalWorkouts >= 50;
        break;
      case 'warrior':
        shouldUnlock = stats.totalWorkouts >= 100;
        break;
      case 'master':
        shouldUnlock = stats.totalWorkouts >= 500;
        break;

      // SPECIAL
      case 'early_bird':
        shouldUnlock = stats.earlyMeasurements >= 10;
        break;
      case 'night_owl':
        shouldUnlock = stats.lateWorkouts >= 10;
        break;
      case 'photographer':
        shouldUnlock = stats.totalPhotos >= 10;
        break;
      case 'analyst':
        shouldUnlock = stats.measurementsWithDetails >= 50;
        break;
      case 'complete':
        shouldUnlock = stats.completeMeasurements >= 30;
        break;

      // NOUVEAUX BADGES STREAK
      case 'centurion':
        shouldUnlock = stats.currentStreak >= 150 || stats.maxStreak >= 150;
        break;
      case 'fortnight_warrior':
        shouldUnlock = stats.currentStreak >= 14 || stats.maxStreak >= 14;
        break;
      case 'fifty_days':
        shouldUnlock = stats.currentStreak >= 50 || stats.maxStreak >= 50;
        break;
      case 'double_century':
        shouldUnlock = stats.currentStreak >= 200 || stats.maxStreak >= 200;
        break;

      // NOUVEAUX BADGES POIDS
      case 'first_kilo':
        shouldUnlock = stats.weightLost >= 1;
        break;
      case 'first_three':
        shouldUnlock = stats.weightLost >= 3;
        break;
      case 'halfway_hero':
        shouldUnlock = stats.weightLost >= 15;
        break;
      case 'super_transformed':
        shouldUnlock = stats.weightLost >= 25;
        break;
      case 'ultimate_warrior':
        shouldUnlock = stats.weightLost >= 30;
        break;
      case 'halfway_goal':
        shouldUnlock = stats.halfwayGoalReached;
        break;

      // NOUVEAUX BADGES ENTRAINEMENT
      case 'first_training':
        shouldUnlock = stats.totalWorkouts >= 5;
        break;
      case 'committed':
        shouldUnlock = stats.totalWorkouts >= 25;
        break;
      case 'veteran':
        shouldUnlock = stats.totalWorkouts >= 200;
        break;
      case 'elite':
        shouldUnlock = stats.totalWorkouts >= 300;
        break;
      case 'champion':
        shouldUnlock = stats.totalWorkouts >= 400;
        break;
      case 'unstoppable':
        shouldUnlock = stats.totalWorkouts >= 750;
        break;

      // NOUVEAUX BADGES SPECIAUX
      case 'team_yoroi_member':
        shouldUnlock = true; // Auto-débloqué
        break;
      case 'photo_master':
        shouldUnlock = stats.totalPhotos >= 25;
        break;
      case 'super_photographer':
        shouldUnlock = stats.totalPhotos >= 50;
        break;
      case 'double_session':
        shouldUnlock = stats.hasDoubleSession;
        break;
      case 'triple_session':
        shouldUnlock = stats.hasTripleSession;
        break;
      case 'weekend_warrior':
        shouldUnlock = stats.hasWeekendWarrior;
        break;
      case 'seven_days_straight':
        shouldUnlock = stats.currentStreak >= 7;
        break;
      case 'perfect_month':
        shouldUnlock = stats.currentStreak >= 30;
        break;
      case 'hydration_master':
        shouldUnlock = stats.hydrationStreak >= 7;
        break;
      case 'hydration_legend':
        shouldUnlock = stats.hydrationStreak >= 30;
        break;
      case 'sleep_master':
        shouldUnlock = stats.goodSleepNights >= 10;
        break;

      // TEMPS
      case 'one_month':
        shouldUnlock = stats.daysUsingApp >= 30;
        break;
      case 'six_months':
        shouldUnlock = stats.daysUsingApp >= 180;
        break;
      case 'one_year':
        shouldUnlock = stats.daysUsingApp >= 365;
        break;
      case 'two_years':
        shouldUnlock = stats.daysUsingApp >= 730;
        break;
      case 'anniversary':
        shouldUnlock = stats.isAnniversary;
        break;

      // BADGES CHEVALIER
      case 'squire':
        shouldUnlock = stats.totalWorkouts >= 5;
        break;
      case 'knight':
        shouldUnlock = stats.totalWorkouts >= 50;
        break;
      case 'knight_gold':
        shouldUnlock = stats.totalWorkouts >= 100;
        break;
      case 'paladin':
        shouldUnlock = stats.totalWorkouts >= 200;
        break;
      case 'crusader':
        shouldUnlock = stats.currentStreak >= 7 || stats.maxStreak >= 7;
        break;
      case 'guardian':
        shouldUnlock = stats.currentStreak >= 30 || stats.maxStreak >= 30;
        break;
      case 'templar':
        shouldUnlock = stats.totalWorkouts >= 50 && stats.weightLost >= 5;
        break;
      case 'conqueror':
        shouldUnlock = stats.goalReached;
        break;
      case 'lord':
        shouldUnlock = stats.daysUsingApp >= 100;
        break;
      case 'legendary_king':
        shouldUnlock = stats.daysUsingApp >= 365 && stats.goalReached;
        break;
    }

    if (shouldUnlock) {
      const unlocked = await unlockBadge(badge.id);
      if (unlocked) {
        newlyUnlocked.push(badge);
      }
    }
  }

  return newlyUnlocked;
};

// ============================================
// HELPERS
// ============================================

/**
 * Obtenir un badge par son ID
 */
export const getBadgeById = (badgeId: string): Badge | undefined => {
  return ALL_BADGES.find(b => b.id === badgeId);
};

/**
 * Obtenir les badges par categorie
 */
export const getBadgesByCategory = (category: BadgeCategory): Badge[] => {
  return ALL_BADGES.filter(b => b.category === category);
};

/**
 * Obtenir le nombre total de badges
 */
export const getTotalBadgesCount = (): number => ALL_BADGES.length;

/**
 * Obtenir la progression complete de tous les badges
 */
export const getAllBadgesProgress = async (): Promise<BadgeProgress[]> => {
  const stats = await calculateBadgeStats();
  const unlockedBadges = await getUnlockedBadges();
  const unlockDates = await getBadgeUnlockDates();

  return ALL_BADGES.map(badge => {
    const isUnlocked = unlockedBadges.includes(badge.id);
    let currentProgress = 0;

    switch (badge.id) {
      // STREAK
      case 'first_flame':
      case 'fortnight_warrior':
      case 'on_fire':
      case 'fifty_days':
      case 'inferno':
      case 'centurion':
      case 'double_century':
      case 'legendary_streak':
        currentProgress = Math.max(stats.currentStreak, stats.maxStreak);
        break;

      // POIDS
      case 'first_step':
        currentProgress = stats.totalMeasurements;
        break;
      case 'first_kilo':
      case 'first_three':
      case 'launched':
      case 'determined':
      case 'halfway_hero':
      case 'transformed':
      case 'super_transformed':
      case 'ultimate_warrior':
        currentProgress = stats.weightLost;
        break;
      case 'goal_reached':
        currentProgress = stats.goalReached ? 1 : 0;
        break;
      case 'halfway_goal':
        currentProgress = stats.halfwayGoalReached ? 1 : 0;
        break;

      // ENTRAINEMENT
      case 'first_training':
      case 'beginner':
      case 'committed':
      case 'regular':
      case 'warrior':
      case 'veteran':
      case 'elite':
      case 'champion':
      case 'master':
      case 'unstoppable':
      case 'legend':
        currentProgress = stats.totalWorkouts;
        break;

      // SPECIAL
      case 'team_yoroi_member':
        currentProgress = 1;
        break;
      case 'early_bird':
        currentProgress = stats.earlyMeasurements;
        break;
      case 'night_owl':
        currentProgress = stats.lateWorkouts;
        break;
      case 'photographer':
      case 'photo_master':
      case 'super_photographer':
        currentProgress = stats.totalPhotos;
        break;
      case 'analyst':
        currentProgress = stats.measurementsWithDetails;
        break;
      case 'complete':
        currentProgress = stats.completeMeasurements;
        break;
      case 'double_session':
        currentProgress = stats.hasDoubleSession ? 1 : 0;
        break;
      case 'triple_session':
        currentProgress = stats.hasTripleSession ? 1 : 0;
        break;
      case 'weekend_warrior':
        currentProgress = stats.hasWeekendWarrior ? 1 : 0;
        break;
      case 'seven_days_straight':
      case 'perfect_month':
        currentProgress = stats.currentStreak;
        break;
      case 'hydration_master':
      case 'hydration_legend':
        currentProgress = stats.hydrationStreak;
        break;
      case 'sleep_master':
        currentProgress = stats.goodSleepNights;
        break;

      // TEMPS
      case 'one_month':
      case 'six_months':
      case 'one_year':
      case 'two_years':
        currentProgress = stats.daysUsingApp;
        break;
      case 'anniversary':
        currentProgress = stats.isAnniversary ? 1 : 0;
        break;

      // BADGES CHEVALIER
      case 'squire':
      case 'knight':
      case 'knight_gold':
      case 'paladin':
        currentProgress = stats.totalWorkouts;
        break;
      case 'crusader':
      case 'guardian':
        currentProgress = Math.max(stats.currentStreak, stats.maxStreak);
        break;
      case 'templar':
        // Progression combinée (50 workouts + 5kg)
        const workoutProgress = Math.min(stats.totalWorkouts / 50, 1);
        const weightProgress = Math.min(stats.weightLost / 5, 1);
        currentProgress = (workoutProgress + weightProgress) / 2;
        break;
      case 'conqueror':
        currentProgress = stats.goalReached ? 1 : 0;
        break;
      case 'lord':
        currentProgress = stats.daysUsingApp;
        break;
      case 'legendary_king':
        // Progression combinée (365 jours + objectif)
        const daysProgress = Math.min(stats.daysUsingApp / 365, 1);
        const goalProgress = stats.goalReached ? 1 : 0;
        currentProgress = (daysProgress + goalProgress) / 2;
        break;
    }

    const progressPercent = Math.min(100, (currentProgress / badge.requirement) * 100);

    return {
      badge,
      isUnlocked,
      unlockedAt: unlockDates[badge.id],
      currentProgress,
      progressPercent,
    };
  });
};

/**
 * Calculer le total d'XP des badges debloques
 */
export const getTotalBadgeXP = async (): Promise<number> => {
  const unlockedBadges = await getUnlockedBadges();
  return ALL_BADGES
    .filter(b => unlockedBadges.includes(b.id))
    .reduce((total, badge) => total + badge.xpReward, 0);
};

export default ALL_BADGES;
