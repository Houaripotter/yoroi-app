export type BadgeId =
  // Débutant
  | 'first_step'
  | 'assidu'
  | 'bushi'
  | 'complete_profile'
  // Régularité
  | 'streak_7'
  | 'streak_30'
  | 'workout_month'
  // Progression
  | 'lost_1kg'
  | 'lost_5kg'
  | 'goal_reached'
  | 'herculean_strength'
  | 'data_master';

export type BadgeCategory = 'beginner' | 'consistency' | 'progress';

export interface Badge {
  id: BadgeId;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  color: string;
  requirement: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: BadgeId;
  unlocked_at: string;
}

export const BADGES: Record<BadgeId, Badge> = {
  // DÉBUTANT
  first_step: {
    id: 'first_step',
    name: 'Premier pas',
    description: 'Enregistrer sa première mesure',
    icon: '🎯',
    category: 'beginner',
    color: '#34D399',
    requirement: 'Ajouter votre première mesure de poids',
  },
  assidu: {
    id: 'assidu',
    name: 'Assidu',
    description: '10 mesures enregistrées',
    icon: '📈',
    category: 'beginner',
    color: '#F59E0B',
    requirement: 'Enregistrer 10 mesures de poids',
  },
  bushi: {
    id: 'bushi',
    name: 'Bushi',
    description: '10 entraînements enregistrés',
    icon: '🥋',
    category: 'beginner',
    color: '#3B82F6',
    requirement: 'Enregistrer 10 entraînements',
  },
  complete_profile: {
    id: 'complete_profile',
    name: 'Profil complet',
    description: 'Remplir toutes les infos du profil',
    icon: '👤',
    category: 'beginner',
    color: '#8B5CF6',
    requirement: 'Remplir votre profil (nom, taille, objectif)',
  },

  // RÉGULARITÉ
  streak_7: {
    id: 'streak_7',
    name: '7 jours consécutifs',
    description: 'Se peser 7 jours de suite',
    icon: '🔥',
    category: 'consistency',
    color: '#F59E0B',
    requirement: 'Se peser pendant 7 jours consécutifs',
  },
  streak_30: {
    id: 'streak_30',
    name: '30 jours consécutifs',
    description: 'Se peser 30 jours de suite',
    icon: '⭐',
    category: 'consistency',
    color: '#F59E0B',
    requirement: 'Se peser pendant 30 jours consécutifs',
  },
  workout_month: {
    id: 'workout_month',
    name: 'Sportif du mois',
    description: '20 entraînements dans le mois',
    icon: '🏅',
    category: 'consistency',
    color: '#EF4444',
    requirement: 'Effectuer 20 entraînements dans un mois',
  },

  // PROGRESSION
  lost_1kg: {
    id: 'lost_1kg',
    name: 'Premier kilo perdu',
    description: 'Perdre 1 kg',
    icon: '📉',
    category: 'progress',
    color: '#10B981',
    requirement: 'Perdre au moins 1 kg par rapport à votre poids initial',
  },
  lost_5kg: {
    id: 'lost_5kg',
    name: '5 kilos perdus',
    description: 'Perdre 5 kg',
    icon: '🎉',
    category: 'progress',
    color: '#10B981',
    requirement: 'Perdre au moins 5 kg par rapport à votre poids initial',
  },
  goal_reached: {
    id: 'goal_reached',
    name: 'Objectif atteint',
    description: 'Atteindre son poids cible',
    icon: '🏆',
    category: 'progress',
    color: '#FFD700',
    requirement: 'Atteindre votre poids objectif',
  },
  herculean_strength: {
    id: 'herculean_strength',
    name: 'Force Herculéenne',
    description: '50 entraînements enregistrés',
    icon: '🏋️',
    category: 'progress',
    color: '#DC2626',
    requirement: 'Enregistrer 50 entraînements',
  },
  data_master: {
    id: 'data_master',
    name: 'Maître des données',
    description: '100 mesures enregistrées',
    icon: '📊',
    category: 'progress',
    color: '#059669',
    requirement: 'Enregistrer 100 mesures de poids',
  },
};

export const BADGE_CATEGORIES: Record<BadgeCategory, { name: string; color: string }> = {
  beginner: {
    name: 'Débutant',
    color: '#34D399',
  },
  consistency: {
    name: 'Régularité',
    color: '#F59E0B',
  },
  progress: {
    name: 'Progression',
    color: '#10B981',
  },
};
