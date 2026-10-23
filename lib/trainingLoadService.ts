// ============================================
// YOROI - SERVICE CHARGE D'ENTRAÎNEMENT (MÉTHODE FOSTER)
// ============================================
// Calcul de la charge d'entraînement basé sur RPE x Durée

import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays } from 'date-fns';
import logger from '@/lib/security/logger';
import { INTENSITES } from './v2/intensite';
import { traduire } from '@/lib/i18n/tr';

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
  { value: 1, label: traduire('Très facile'), emoji: '', description: 'Effort minimal' },
  { value: 2, label: 'Facile', emoji: '', description: traduire('Récupération active') },
  { value: 3, label: traduire('Modéré'), emoji: '', description: 'Conversation possible' },
  { value: 4, label: 'Assez dur', emoji: '', description: traduire('Respiration accélérée') },
  { value: 5, label: 'Dur', emoji: '', description: 'Effort soutenu' },
  { value: 6, label: traduire('Très dur'), emoji: '', description: traduire('Limite aérobie') },
  { value: 7, label: traduire('Intense'), emoji: '', description: 'Parler difficile' },
  { value: 8, label: traduire('Très intense'), emoji: '', description: 'Effort maximal soutenu' },
  { value: 9, label: traduire('Extrême'), emoji: '', description: traduire('À la limite') },
  { value: 10, label: 'Maximum', emoji: '', description: traduire('Effort total, épuisement') },
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
    logger.error('Erreur lecture charges:', error);
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
    logger.error('Erreur sauvegarde charge:', error);
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
    let advice = traduire('Charge optimale. Continue comme ça !');
    
    if (totalLoad > LOAD_THRESHOLDS.DANGER) {
      riskLevel = 'danger';
      advice = traduire('ATTENTION ! Charge critique, risque de blessure élevé. Repos obligatoire !');
    } else if (totalLoad > LOAD_THRESHOLDS.HIGH) {
      riskLevel = 'high';
      advice = traduire('Charge élevée. Prévois une séance légère ou un jour de repos.');
    } else if (totalLoad > LOAD_THRESHOLDS.MODERATE) {
      riskLevel = 'moderate';
      advice = traduire('Bonne charge. Attention à ne pas trop en rajouter.');
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
    logger.error('Erreur stats charge:', error);
    return {
      totalLoad: 0,
      averageRPE: 0,
      totalDuration: 0,
      sessionsCount: 0,
      dailyLoads: [],
      trend: 'stable',
      riskLevel: 'safe',
      advice: traduire('Pas de données disponibles.'),
    };
  }
};

/**
 * Obtient la couleur selon le niveau de risque
 */
export const getRiskColor = (riskLevel: string): string => {
  switch (riskLevel) {
    // Vague 32 : echelle d'intensite commune (lib/v2/intensite.ts), sans rouge
    case 'safe': return INTENSITES[1].fill;
    case 'moderate': return INTENSITES[2].fill;
    case 'high': return INTENSITES[3].fill;
    case 'danger': return INTENSITES[4].fill;
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

// Alias functions for backward compatibility
export const getWeeklyLoad = async (): Promise<number> => {
  const stats = await getWeeklyLoadStats();
  return stats.totalLoad;
};

export const getRiskLevel = (load: number): 'safe' | 'moderate' | 'high' | 'danger' => {
  if (load > 3000) return 'danger';
  if (load > 2500) return 'high';
  if (load > 2000) return 'moderate';
  return 'safe';
};

// ============================================
// ALERTE SURMENAGE AUTOMATIQUE
// ============================================

const OVERTRAINING_ALERT_KEY = '@yoroi_overtraining_alerted';

/**
 * Vérifie si la charge hebdomadaire dépasse le seuil DANGER et envoie
 * une notification locale si ce n'est pas déjà fait aujourd'hui.
 * Appeler cette fonction après chaque sauvegarde de séance.
 */
export const checkOvertrainingAlert = async (): Promise<void> => {
  try {
    const stats = await getWeeklyLoadStats();
    if (stats.riskLevel !== 'danger' && stats.riskLevel !== 'high') return;

    // Éviter de spammer : une seule alerte par jour
    const today = format(new Date(), 'yyyy-MM-dd');
    const lastAlerted = await AsyncStorage.getItem(OVERTRAINING_ALERT_KEY);
    if (lastAlerted === today) return;

    // Import dynamique pour éviter une dépendance circulaire
    const Notifications = await import('expo-notifications');

    const title = stats.riskLevel === 'danger'
      ? traduire('Ton corps demande du repos')
      : traduire('Charge élevée cette semaine');
    // Aucun chiffre de charge : la notification s'affiche sur l'écran verrouillé
    const body = stats.riskLevel === 'danger'
      ? traduire('Ta charge d’entraînement est haute cette semaine. Une vraie journée de récupération te fera du bien.')
      : traduire('Ta charge d’entraînement monte. Une séance légère ou un repos, à toi de voir.');

    await Notifications.default.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null, // Immédiat
    });

    await AsyncStorage.setItem(OVERTRAINING_ALERT_KEY, today);
    logger.info('[TrainingLoad] Alerte surmenage envoyée:', stats.riskLevel);
  } catch (e) {
    logger.warn('[TrainingLoad] Alerte surmenage échouée:', e);
  }
};

export default {
  getTrainingLoads,
  saveTrainingLoad,
  calculateSessionLoad,
  getWeeklyLoadStats,
  getWeeklyLoad,
  getRiskLevel,
  getRiskColor,
  formatLoad,
  checkOvertrainingAlert,
  RPE_SCALE,
};

