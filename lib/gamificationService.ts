import { getAllMeasurements, getAllWorkouts, getUserSettings } from './storage';
import logger from '@/lib/security/logger';

// ============================================
// 🎖️ SYSTÈME DE GRADES YOROI
// ============================================

export interface Grade {
  id: string;
  name: string;
  japaneseName: string;
  icon: string;
  color: string;
  description: string;
  requirement: string;
}

export const GRADES: Grade[] = [
  {
    id: 'ashigaru',
    name: 'Fantassin',
    japaneseName: 'Ashigaru',
    icon: '', // Utiliser badge coloré à la place
    color: '#60A5FA',
    description: 'Tu débutes ton voyage vers la transformation.',
    requirement: 'Niveau de départ',
  },
  {
    id: 'bushi',
    name: 'Athlète',
    japaneseName: 'Bushi',
    icon: '', // Utiliser badge coloré à la place
    color: '#34D399',
    description: 'Tu as prouvé ton engagement au combat.',
    requirement: '10 séances OU 2 kg perdus',
  },
  {
    id: 'samurai',
    name: 'Élite',
    japaneseName: 'Samouraï',
    icon: '', // Utiliser badge coloré à la place
    color: '#D4AF37',
    description: 'Tu fais partie de l\'élite.',
    requirement: '30 séances OU 5 kg perdus',
  },
  {
    id: 'ronin',
    name: 'Maître',
    japaneseName: 'Rōnin',
    icon: '', // Utiliser badge coloré à la place
    color: '#A855F7',
    description: 'Tu domines ton corps et ton esprit.',
    requirement: '60 séances OU 10 kg perdus',
  },
  {
    id: 'shogun',
    name: 'Légende',
    japaneseName: 'Shōgun',
    icon: '', // Utiliser badge coloré à la place
    color: '#FFD700',
    description: 'Tu as atteint l\'excellence absolue.',
    requirement: 'Objectif de poids atteint',
  },
];

// ============================================
// RÉCOMPENSES VISUELLES (Objets réels)
// ============================================

export interface WeightReward {
  weightLoss: number;
  name: string;
  icon: string;
  description: string;
  color: string;
}

export const WEIGHT_REWARDS: WeightReward[] = [
  { weightLoss: 0.1, name: 'Une Pomme', icon: '🍎', description: 'Tu as perdu l\'équivalent d\'une pomme !', color: '#E74C3C' },
  { weightLoss: 0.5, name: 'Une Bouteille d\'eau', icon: '💧', description: '50cl d\'eau en moins sur ton corps !', color: '#3498DB' },
  { weightLoss: 1.0, name: 'Une Brique', icon: '🧱', description: 'Une brique de moins à porter chaque jour !', color: '#E67E22' },
  { weightLoss: 1.5, name: 'Des Rangers', icon: '🥾', description: 'Une paire de chaussures de marche !', color: '#8B4513' },
  { weightLoss: 2.0, name: 'Un Ordinateur portable', icon: '💻', description: 'Tu portes un PC en moins !', color: '#34495E' },
  { weightLoss: 3.0, name: 'Un Chat', icon: '🐱', description: 'L\'équivalent d\'un chat !', color: '#F39C12' },
  { weightLoss: 5.0, name: 'Un Gilet Lesté', icon: '🦺', description: 'Un gilet tactique en moins !', color: '#27AE60' },
  { weightLoss: 7.0, name: 'Un Bébé', icon: '👶', description: 'Tu portais l\'équivalent d\'un nouveau-né !', color: '#FFB6C1' },
  { weightLoss: 10.0, name: 'Un Pneu de voiture', icon: '🛞', description: 'Un pneu entier de moins !', color: '#2C3E50' },
  { weightLoss: 15.0, name: 'Un Vélo', icon: '🚲', description: 'Tu as perdu un vélo !', color: '#1ABC9C' },
  { weightLoss: 20.0, name: 'Un Chien moyen', icon: '🐕', description: 'L\'équivalent d\'un Labrador !', color: '#D4A574' },
];

// ============================================
// FONCTIONS DE CALCUL
// ============================================

export interface UserProgress {
  totalWorkouts: number;
  weightLost: number;
  currentGrade: Grade;
  nextGrade: Grade | null;
  progressToNextGrade: number;
  currentReward: WeightReward | null;
  nextReward: WeightReward | null;
  goalReached: boolean;
}

export const calculateUserProgress = async (): Promise<UserProgress> => {
  try {
    const workouts = await getAllWorkouts();
    const measurements = await getAllMeasurements();
    const settings = await getUserSettings();
    
    const totalWorkouts = workouts.length;
    
    // Calculer la perte de poids
    let weightLost = 0;
    let startWeight = 0;
    let currentWeight = 0;
    
    if (measurements.length > 0) {
      // Premier poids enregistré (le plus ancien)
      startWeight = measurements[measurements.length - 1].weight;
      // Poids actuel (le plus récent)
      currentWeight = measurements[0].weight;
      weightLost = Math.max(0, startWeight - currentWeight);
    }
    
    const goalWeight = settings.weight_goal || 75;
    const goalReached = currentWeight > 0 && currentWeight <= goalWeight;
    
    // Déterminer le grade actuel
    let currentGradeIndex = 0;

    if (goalReached) {
      currentGradeIndex = 4; // Shōgun
    } else if (totalWorkouts >= 60 || weightLost >= 10) {
      currentGradeIndex = 3; // Rōnin
    } else if (totalWorkouts >= 30 || weightLost >= 5) {
      currentGradeIndex = 2; // Samouraï
    } else if (totalWorkouts >= 10 || weightLost >= 2) {
      currentGradeIndex = 1; // Bushi
    }
    
    const currentGrade = GRADES[currentGradeIndex];
    const nextGrade = currentGradeIndex < GRADES.length - 1 ? GRADES[currentGradeIndex + 1] : null;
    
    // Calculer la progression vers le prochain grade
    let progressToNextGrade = 100;
    if (nextGrade && !goalReached) {
      const workoutThresholds = [0, 10, 30, 60, Infinity];
      const weightThresholds = [0, 2, 5, 10, Infinity];
      
      const nextWorkoutThreshold = workoutThresholds[currentGradeIndex + 1];
      const nextWeightThreshold = weightThresholds[currentGradeIndex + 1];
      const currentWorkoutThreshold = workoutThresholds[currentGradeIndex];
      const currentWeightThreshold = weightThresholds[currentGradeIndex];
      
      const workoutProgress = Math.min(100, ((totalWorkouts - currentWorkoutThreshold) / (nextWorkoutThreshold - currentWorkoutThreshold)) * 100);
      const weightProgress = Math.min(100, ((weightLost - currentWeightThreshold) / (nextWeightThreshold - currentWeightThreshold)) * 100);
      
      progressToNextGrade = Math.max(workoutProgress, weightProgress);
    }
    
    // Déterminer la récompense actuelle
    let currentReward: WeightReward | null = null;
    let nextReward: WeightReward | null = null;
    
    for (let i = WEIGHT_REWARDS.length - 1; i >= 0; i--) {
      if (weightLost >= WEIGHT_REWARDS[i].weightLoss) {
        currentReward = WEIGHT_REWARDS[i];
        nextReward = i < WEIGHT_REWARDS.length - 1 ? WEIGHT_REWARDS[i + 1] : null;
        break;
      }
    }
    
    if (!currentReward && WEIGHT_REWARDS.length > 0) {
      nextReward = WEIGHT_REWARDS[0];
    }
    
    return {
      totalWorkouts,
      weightLost,
      currentGrade,
      nextGrade,
      progressToNextGrade,
      currentReward,
      nextReward,
      goalReached,
    };
  } catch (error) {
    logger.error('Erreur calcul progression:', error);
    return {
      totalWorkouts: 0,
      weightLost: 0,
      currentGrade: GRADES[0],
      nextGrade: GRADES[1],
      progressToNextGrade: 0,
      currentReward: null,
      nextReward: WEIGHT_REWARDS[0],
      goalReached: false,
    };
  }
};

// ============================================
// COULEURS SELON OBJECTIF
// ============================================

export const getProgressColor = (progress: number): string => {
  if (progress >= 100) return '#F1C40F'; // Or - Objectif atteint
  if (progress >= 75) return '#27AE60';  // Vert - Excellent
  if (progress >= 50) return '#3498DB';  // Bleu - Bien
  if (progress >= 25) return '#F39C12';  // Orange - En cours
  return '#4ECDC4';                       // Teal - Début
};

export const getGradientForProgress = (progress: number): [string, string] => {
  if (progress >= 100) return ['#F1C40F', '#F39C12']; // Or
  if (progress >= 75) return ['#27AE60', '#2ECC71'];  // Vert
  if (progress >= 50) return ['#3498DB', '#5DADE2']; // Bleu
  if (progress >= 25) return ['#F39C12', '#F5B041']; // Orange
  return ['#4ECDC4', '#44A08D'];                      // Teal
};
