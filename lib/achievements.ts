// ============================================
// ⚔️ YOROI - SYSTÈME DE BADGES/ACHIEVEMENTS
// ============================================

import type { LucideIcon } from 'lucide-react-native';
import {
  Award,
  Medal,
  Target,
  Flame,
  Calendar,
  Dumbbell,
  Infinity,
  Sunrise,
  Activity,
  Bot,
  Drama,
  Sun,
  Brain,
  Camera,
  BarChart3,
  Droplet,
  Swords,
} from 'lucide-react-native';

export interface Achievement {
  id: string;
  name: string;
  iconComponent: LucideIcon;
  description: string;
  category: 'weight' | 'streak' | 'sport' | 'special';
  condition: string;
  isUnlocked?: boolean;
  unlockedAt?: Date;
}

export const ACHIEVEMENTS: Achievement[] = [
  // === POIDS ===
  {
    id: 'first_kg',
    name: 'Premier Sang',
    iconComponent: Droplet,
    description: 'Premier kilo perdu',
    category: 'weight',
    condition: 'weightLost >= 1',
  },
  {
    id: 'five_kg',
    name: 'Guerrier',
    iconComponent: Swords,
    description: '5 kg perdus',
    category: 'weight',
    condition: 'weightLost >= 5',
  },
  {
    id: 'ten_kg',
    name: 'Vétéran',
    iconComponent: Medal,
    description: '10 kg perdus',
    category: 'weight',
    condition: 'weightLost >= 10',
  },
  {
    id: 'twenty_kg',
    name: 'Légende',
    iconComponent: Award,
    description: '20 kg perdus',
    category: 'weight',
    condition: 'weightLost >= 20',
  },
  {
    id: 'goal_reached',
    name: 'Mission Accomplie',
    iconComponent: Target,
    description: 'Objectif de poids atteint',
    category: 'weight',
    condition: 'goalReached',
  },

  // === STREAK ===
  {
    id: 'week_streak',
    name: 'Discipline',
    iconComponent: Calendar,
    description: '7 jours consécutifs',
    category: 'streak',
    condition: 'streak >= 7',
  },
  {
    id: 'month_streak',
    name: 'Détermination',
    iconComponent: Dumbbell,
    description: '30 jours consécutifs',
    category: 'streak',
    condition: 'streak >= 30',
  },
  {
    id: 'quarter_streak',
    name: 'Implacable',
    iconComponent: Flame,
    description: '90 jours consécutifs',
    category: 'streak',
    condition: 'streak >= 90',
  },
  {
    id: 'year_streak',
    name: 'Immortel',
    iconComponent: Infinity,
    description: '365 jours consécutifs',
    category: 'streak',
    condition: 'streak >= 365',
  },

  // === SPORT ===
  {
    id: 'first_training',
    name: 'Éveil',
    iconComponent: Sunrise,
    description: 'Premier entraînement',
    category: 'sport',
    condition: 'trainings >= 1',
  },
  {
    id: 'ten_trainings',
    name: 'Régulier',
    iconComponent: Activity,
    description: '10 entraînements',
    category: 'sport',
    condition: 'trainings >= 10',
  },
  {
    id: 'fifty_trainings',
    name: 'Athlète',
    iconComponent: Medal,
    description: '50 entraînements',
    category: 'sport',
    condition: 'trainings >= 50',
  },
  {
    id: 'hundred_trainings',
    name: 'Machine',
    iconComponent: Bot,
    description: '100 entraînements',
    category: 'sport',
    condition: 'trainings >= 100',
  },
  {
    id: 'multi_sport',
    name: 'Polyvalent',
    iconComponent: Drama,
    description: '3 sports différents pratiqués',
    category: 'sport',
    condition: 'sportsCount >= 3',
  },

  // === SPÉCIAUX ===
  {
    id: 'early_bird',
    name: 'Lève-tôt',
    iconComponent: Sun,
    description: 'Pesée avant 7h',
    category: 'special',
    condition: 'earlyWeighing',
  },
  {
    id: 'night_owl',
    name: 'Noctambule',
    iconComponent: Brain,
    description: 'Entraînement après 22h',
    category: 'special',
    condition: 'lateTraining',
  },
  {
    id: 'photo_warrior',
    name: 'Miroir',
    iconComponent: Camera,
    description: '10 photos de progression',
    category: 'special',
    condition: 'photos >= 10',
  },
  {
    id: 'consistency',
    name: 'Régularité',
    iconComponent: BarChart3,
    description: 'Pesée chaque jour pendant 30j',
    category: 'special',
    condition: 'dailyWeighing30',
  },
];

// Obtenir les achievements par catégorie
export const getAchievementsByCategory = (category: Achievement['category']): Achievement[] => {
  return ACHIEVEMENTS.filter(a => a.category === category);
};

// Obtenir le nombre total d'achievements
export const getTotalAchievements = (): number => ACHIEVEMENTS.length;

// Vérifier si un achievement est débloqué
export const checkAchievement = (
  achievementId: string,
  stats: {
    weightLost?: number;
    streak?: number;
    trainings?: number;
    photos?: number;
    sportsCount?: number;
    goalReached?: boolean;
    earlyWeighing?: boolean;
    lateTraining?: boolean;
    dailyWeighing30?: boolean;
  }
): boolean => {
  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
  if (!achievement) return false;

  switch (achievement.id) {
    case 'first_kg':
      return (stats.weightLost || 0) >= 1;
    case 'five_kg':
      return (stats.weightLost || 0) >= 5;
    case 'ten_kg':
      return (stats.weightLost || 0) >= 10;
    case 'twenty_kg':
      return (stats.weightLost || 0) >= 20;
    case 'goal_reached':
      return stats.goalReached || false;
    case 'week_streak':
      return (stats.streak || 0) >= 7;
    case 'month_streak':
      return (stats.streak || 0) >= 30;
    case 'quarter_streak':
      return (stats.streak || 0) >= 90;
    case 'year_streak':
      return (stats.streak || 0) >= 365;
    case 'first_training':
      return (stats.trainings || 0) >= 1;
    case 'ten_trainings':
      return (stats.trainings || 0) >= 10;
    case 'fifty_trainings':
      return (stats.trainings || 0) >= 50;
    case 'hundred_trainings':
      return (stats.trainings || 0) >= 100;
    case 'multi_sport':
      return (stats.sportsCount || 0) >= 3;
    case 'early_bird':
      return stats.earlyWeighing || false;
    case 'night_owl':
      return stats.lateTraining || false;
    case 'photo_warrior':
      return (stats.photos || 0) >= 10;
    case 'consistency':
      return stats.dailyWeighing30 || false;
    default:
      return false;
  }
};

export default ACHIEVEMENTS;
