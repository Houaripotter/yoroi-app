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
} from 'lucide-react-native';
import {
  getAllMeasurements,
  getAllWorkouts,
  getPhotosFromStorage,
  getUserSettings,
  Measurement,
  Workout,
} from './storage';

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
    id: 'on_fire',
    name: 'En feu',
    iconComponent: Flame,
    description: '30 jours de streak consecutifs',
    category: 'streak',
    requirement: 30,
    xpReward: 150,
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
    id: 'legendary_streak',
    name: 'Legendaire',
    iconComponent: Gem,
    description: '365 jours de streak consecutifs',
    category: 'streak',
    requirement: 365,
    xpReward: 2000,
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
    id: 'transformed',
    name: 'Transforme',
    iconComponent: Trophy,
    description: '20 kg perdus au total',
    category: 'weight',
    requirement: 20,
    xpReward: 500,
  },
  {
    id: 'goal_reached',
    name: 'Objectif atteint',
    iconComponent: Crown,
    description: 'Atteindre son objectif de poids',
    category: 'weight',
    requirement: 1, // Boolean check
    xpReward: 1000,
  },
];

// BADGES ENTRAINEMENT
export const TRAINING_BADGES: Badge[] = [
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
    name: 'Guerrier',
    iconComponent: Swords,
    description: '100 entrainements completes',
    category: 'training',
    requirement: 100,
    xpReward: 500,
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
];

// BADGES SPECIAUX
export const SPECIAL_BADGES: Badge[] = [
  {
    id: 'team_yoroi_member',
    name: 'Membre Team Yoroi',
    iconComponent: Swords,
    description: 'Tu fais partie de la famille. Bienvenue, guerrier.',
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
];

// TOUS LES BADGES
export const ALL_BADGES: Badge[] = [
  ...STREAK_BADGES,
  ...WEIGHT_BADGES,
  ...TRAINING_BADGES,
  ...SPECIAL_BADGES,
  ...TIME_BADGES,
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
    console.error('Erreur lecture badges:', error);
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
    console.error('Erreur lecture dates badges:', error);
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

    console.log('Badge debloque:', badgeId);
    return true;
  } catch (error) {
    console.error('Erreur deblocage badge:', error);
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
    console.error('Erreur enregistrement date:', error);
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

  // Entrainements
  totalWorkouts: number;

  // Special
  earlyMeasurements: number; // Avant 7h
  lateWorkouts: number; // Apres 21h
  totalPhotos: number;
  measurementsWithDetails: number; // Avec mensurations completes
  completeMeasurements: number; // Tous les champs remplis

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
 * Calculer toutes les statistiques pour les badges
 */
export const calculateBadgeStats = async (): Promise<BadgeStats> => {
  const measurements = await getAllMeasurements();
  const workouts = await getAllWorkouts();
  const photos = await getPhotosFromStorage();
  const settings = await getUserSettings();
  const firstUseDate = await getFirstUseDate();

  // Streak
  const streakInfo = calculateStreak(measurements);

  // Poids perdu
  const weightLost = calculateWeightLost(measurements);

  // Objectif atteint
  let goalReached = false;
  if (settings.weight_goal && measurements.length > 0) {
    const latestWeight = measurements[0].weight;
    goalReached = latestWeight <= settings.weight_goal;
  }

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
    totalWorkouts: workouts.length,
    earlyMeasurements: countEarlyMeasurements(measurements),
    lateWorkouts: countLateWorkouts(workouts),
    totalPhotos: photos.length,
    measurementsWithDetails: measurements.filter(m => m.measurements).length,
    completeMeasurements: countCompleteMeasurements(measurements),
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
      case 'anniversary':
        shouldUnlock = stats.isAnniversary;
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
      case 'on_fire':
      case 'inferno':
      case 'legendary_streak':
        currentProgress = Math.max(stats.currentStreak, stats.maxStreak);
        break;

      // POIDS
      case 'first_step':
        currentProgress = stats.totalMeasurements;
        break;
      case 'launched':
      case 'determined':
      case 'transformed':
        currentProgress = stats.weightLost;
        break;
      case 'goal_reached':
        currentProgress = stats.goalReached ? 1 : 0;
        break;

      // ENTRAINEMENT
      case 'beginner':
      case 'regular':
      case 'warrior':
      case 'master':
        currentProgress = stats.totalWorkouts;
        break;

      // SPECIAL
      case 'early_bird':
        currentProgress = stats.earlyMeasurements;
        break;
      case 'night_owl':
        currentProgress = stats.lateWorkouts;
        break;
      case 'photographer':
        currentProgress = stats.totalPhotos;
        break;
      case 'analyst':
        currentProgress = stats.measurementsWithDetails;
        break;
      case 'complete':
        currentProgress = stats.completeMeasurements;
        break;

      // TEMPS
      case 'one_month':
      case 'six_months':
      case 'one_year':
        currentProgress = stats.daysUsingApp;
        break;
      case 'anniversary':
        currentProgress = stats.isAnniversary ? 1 : 0;
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
