// ============================================
// YOROI - SERVICE CHARGE D'ENTRAÎNEMENT (MÉTHODE FOSTER)
// ============================================
// Calcul de la charge d'entraînement basé sur RPE x Durée

import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { getTrainings, Training } from '@/lib/database';

// ============================================
// TYPES
// ============================================

export interface TrainingLoad {
  trainingId?: number;
  date: string;
  duration: number; // minutes
  rpe: number; // 1-10 (Rating of Perceived Exertion)
  load: number; // durée x RPE
  sport?: string;
  mode?: string; // Timer mode: musculation, combat, tabata, etc.
}

export interface SaveTrainingLoadParams {
  date: string;
  duration: number;
  rpe: number;
  load: number;
  mode?: string;
  sport?: string;
  trainingId?: number;
}

export interface WeeklyLoadStats {
  totalLoad: number;
  averageRPE: number;
  totalDuration: number;
  sessionsCount: number;
  dailyLoads: { date: string; load: number }[];
  trend: 'increasing' | 'stable' | 'decreasing';
  riskLevel: 'safe' | 'moderate' | 'high' | 'danger';
  advice: string;
}

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEY = '@yoroi_training_loads';

// Seuils de charge hebdomadaire (points Foster)
const LOAD_THRESHOLDS = {
  SAFE: 1500,      // < 1500 : Zone de confort
  MODERATE: 2000,  // 1500-2000 : Charge modérée
  HIGH: 2500,      // 2000-2500 : Charge élevée
  DANGER: 3000,    // > 2500 : Risque de blessure
};

// Descriptions RPE (échelle de Borg modifiée)
export const RPE_SCALE = [
  { value: 1, label: 'Très facile', emoji: '😌', description: 'Effort minimal' },
  { value: 2, label: 'Facile', emoji: '🙂', description: 'Récupération active' },
  { value: 3, label: 'Modéré', emoji: '😊', description: 'Conversation possible' },
  { value: 4, label: 'Assez dur', emoji: '😤', description: 'Respiration accélérée' },
  { value: 5, label: 'Dur', emoji: '💪', description: 'Effort soutenu' },
  { value: 6, label: 'Très dur', emoji: '🔥', description: 'Limite aérobie' },
  { value: 7, label: 'Intense', emoji: '😰', description: 'Parler difficile' },
  { value: 8, label: 'Très intense', emoji: '🥵', description: 'Effort maximal soutenu' },
  { value: 9, label: 'Extrême', emoji: '💀', description: 'À la limite' },
  { value: 10, label: 'Maximum', emoji: '☠️', description: 'Effort total, épuisement' },
];

// ============================================
// FONCTIONS
// ============================================

/**
 * Récupère toutes les charges d'entraînement
 */
export const getTrainingLoads = async (): Promise<TrainingLoad[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erreur lecture charges:', error);
    return [];
  }
};

/**
 * Calcule la charge d'une session
 */
export const calculateSessionLoad = (duration: number, rpe: number): number => {
  return duration * rpe;
};

/**
 * Sauvegarde une charge d'entraînement (surcharge pour accepter un objet ou des paramètres)
 */
export const saveTrainingLoad = async (
  params: SaveTrainingLoadParams | number,
  date?: string,
  duration?: number,
  rpe?: number,
  sport?: string
): Promise<TrainingLoad> => {
  try {
    const loads = await getTrainingLoads();
    
    let newLoad: TrainingLoad;
    
    // Support pour les deux signatures
    if (typeof params === 'object') {
      // Nouvelle signature avec objet
      newLoad = {
        trainingId: params.trainingId,
        date: params.date.split('T')[0], // Extraire juste la date
        duration: params.duration,
        rpe: params.rpe,
        load: params.load,
        sport: params.sport,
        mode: params.mode,
      };
    } else {
      // Ancienne signature avec paramètres séparés
      newLoad = {
        trainingId: params,
        date: date!,
        duration: duration!,
        rpe: rpe!,
        load: duration! * rpe!,
        sport: sport,
      };
    }
    
    // Si trainingId existe, remplacer sinon ajouter
    if (newLoad.trainingId !== undefined) {
      const existingIndex = loads.findIndex(l => l.trainingId === newLoad.trainingId);
      if (existingIndex >= 0) {
        loads[existingIndex] = newLoad;
      } else {
        loads.unshift(newLoad);
      }
    } else {
      loads.unshift(newLoad);
    }
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(loads));
    return newLoad;
  } catch (error) {
    console.error('Erreur sauvegarde charge:', error);
    throw error;
  }
};

/**
 * Calcule les statistiques de charge hebdomadaire
 */
export const getWeeklyLoadStats = async (): Promise<WeeklyLoadStats> => {
  try {
    const loads = await getTrainingLoads();
    
    // Charges des 7 derniers jours
    const last7Days: TrainingLoad[] = [];
    const dailyLoads: { date: string; load: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayLoads = loads.filter(l => l.date === date);
      const dayTotal = dayLoads.reduce((sum, l) => sum + l.load, 0);
      
      dailyLoads.push({ date, load: dayTotal });
      last7Days.push(...dayLoads);
    }
    
    // Totaux
    const totalLoad = last7Days.reduce((sum, l) => sum + l.load, 0);
    const totalDuration = last7Days.reduce((sum, l) => sum + l.duration, 0);
    const averageRPE = last7Days.length > 0
      ? last7Days.reduce((sum, l) => sum + l.rpe, 0) / last7Days.length
      : 0;
    
    // Tendance (comparer cette semaine vs semaine précédente)
    const prevWeekLoads: TrainingLoad[] = [];
    for (let i = 13; i >= 7; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      prevWeekLoads.push(...loads.filter(l => l.date === date));
    }
    const prevWeekTotal = prevWeekLoads.reduce((sum, l) => sum + l.load, 0);
    
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (totalLoad > prevWeekTotal * 1.15) trend = 'increasing';
    else if (totalLoad < prevWeekTotal * 0.85) trend = 'decreasing';
    
    // Niveau de risque
    let riskLevel: 'safe' | 'moderate' | 'high' | 'danger' = 'safe';
    let advice = 'Charge optimale. Continue comme ça ! 💪';
    
    if (totalLoad > LOAD_THRESHOLDS.DANGER) {
      riskLevel = 'danger';
      advice = '🚨 ATTENTION ! Charge critique, risque de blessure élevé. Repos obligatoire !';
    } else if (totalLoad > LOAD_THRESHOLDS.HIGH) {
      riskLevel = 'high';
      advice = '⚠️ Charge élevée. Prévois une séance légère ou un jour de repos.';
    } else if (totalLoad > LOAD_THRESHOLDS.MODERATE) {
      riskLevel = 'moderate';
      advice = '👍 Bonne charge. Attention à ne pas trop en rajouter.';
    }
    
    return {
      totalLoad,
      averageRPE: Math.round(averageRPE * 10) / 10,
      totalDuration,
      sessionsCount: last7Days.length,
      dailyLoads,
      trend,
      riskLevel,
      advice,
    };
  } catch (error) {
    console.error('Erreur stats charge:', error);
    return {
      totalLoad: 0,
      averageRPE: 0,
      totalDuration: 0,
      sessionsCount: 0,
      dailyLoads: [],
      trend: 'stable',
      riskLevel: 'safe',
      advice: 'Pas de données disponibles.',
    };
  }
};

/**
 * Obtient la couleur selon le niveau de risque
 */
export const getRiskColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'safe': return '#10B981';
    case 'moderate': return '#F59E0B';
    case 'high': return '#F97316';
    case 'danger': return '#EF4444';
    default: return '#6B7280';
  }
};

/**
 * Formate la charge en texte lisible
 */
export const formatLoad = (load: number): string => {
  if (load >= 1000) {
    return `${(load / 1000).toFixed(1)}K`;
  }
  return load.toString();
};

export default {
  getTrainingLoads,
  saveTrainingLoad,
  calculateSessionLoad,
  getWeeklyLoadStats,
  getRiskColor,
  formatLoad,
  RPE_SCALE,
};

