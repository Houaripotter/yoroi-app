// ============================================
// YOROI - DETECTION DE PLATEAUX
// ============================================
// Detection automatique des plateaux de poids
// Suggestions locales - AUCUNE IA
// 100% Offline - AsyncStorage
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllMeasurements, Measurement } from './storage';

// ============================================
// TYPES
// ============================================

export interface PlateauSuggestion {
  id: string;
  title: string;
  text: string;
  icon: string;
  action?: {
    label: string;
    route: string;
  };
}

export interface PlateauResult {
  detected: boolean;
  duration: number; // en jours
  startDate: string;
  averageWeight: number;
  variation: number;
  suggestion: PlateauSuggestion;
  previousPlateaus: number;
  encouragement: string;
}

export interface PlateauHistory {
  id: string;
  startDate: string;
  endDate: string | null;
  duration: number;
  averageWeight: number;
  resolved: boolean;
  weightAfter?: number;
}

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEY_HISTORY = '@yoroi_plateau_history';
const STORAGE_KEY_DISMISSED = '@yoroi_plateau_dismissed';
const PLATEAU_THRESHOLD = 0.5; // kg - variation max pour considerer un plateau
const PLATEAU_MIN_DAYS = 10; // jours minimum pour detecter un plateau
const PLATEAU_CHECK_DAYS = 14; // periode d'analyse

// ============================================
// SUGGESTIONS LOCALES
// ============================================

export const PLATEAU_SUGGESTIONS: PlateauSuggestion[] = [
  {
    id: 'measurements',
    title: 'Verifie tes mensurations',
    text: 'Le poids peut stagner mais le corps change ! Prends tes mesures, tu as peut-etre perdu du tour de taille.',
    icon: '📏',
    action: {
      label: 'Prendre mes mensurations',
      route: '/entry',
    },
  },
  {
    id: 'training',
    title: 'Varie tes entrainements',
    text: 'Ton corps s\'est peut-etre habitue. Essaie un nouveau sport ou augmente l\'intensite.',
    icon: '💪',
    action: {
      label: 'Voir mes entrainements',
      route: '/add-training',
    },
  },
  {
    id: 'food',
    title: 'Revois ton alimentation',
    text: 'Parfois on sous-estime ce qu\'on mange. Tiens un journal alimentaire pendant 1 semaine.',
    icon: '🍽️',
  },
  {
    id: 'patience',
    title: 'Patience !',
    text: 'Les plateaux sont NORMAUX. Ton corps s\'adapte. Continue et les resultats reviendront.',
    icon: '⏳',
  },
  {
    id: 'sleep',
    title: 'Dors-tu assez ?',
    text: 'Le manque de sommeil peut bloquer la perte de poids. Vise 7-8h par nuit.',
    icon: '😴',
  },
  {
    id: 'recomposition',
    title: 'Recomposition corporelle',
    text: 'Tu perds peut-etre de la graisse ET tu prends du muscle. Le poids reste stable mais ton corps change !',
    icon: '🔄',
    action: {
      label: 'Voir ma composition',
      route: '/(tabs)/stats',
    },
  },
  {
    id: 'water',
    title: 'Hydratation',
    text: 'Bois-tu assez d\'eau ? La retention d\'eau peut masquer la perte de graisse. Vise 2-3L par jour.',
    icon: '💧',
    action: {
      label: 'Suivi hydratation',
      route: '/hydration',
    },
  },
  {
    id: 'stress',
    title: 'Gere ton stress',
    text: 'Le stress chronique augmente le cortisol et peut bloquer la perte de poids. Prends soin de ton mental !',
    icon: '🧘',
    action: {
      label: 'Mon journal',
      route: '/journal',
    },
  },
];

// Encouragements bases sur le nombre de plateaux traverses
const ENCOURAGEMENTS: string[] = [
  'C\'est ton premier plateau. Pas de panique, c\'est normal !',
  'Tu as deja traverse 1 plateau et tu l\'as depasse. Tu peux le refaire !',
  'Tu as deja traverse {count} plateaux et tu les as TOUS depasses ! Continue, guerrier !',
  'Veteran des plateaux ! Tu sais que ca passe. Reste focus.',
];

// ============================================
// HELPERS
// ============================================

const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

const daysBetween = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const average = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

const getRandomSuggestion = (excludeId?: string): PlateauSuggestion => {
  const available = excludeId
    ? PLATEAU_SUGGESTIONS.filter(s => s.id !== excludeId)
    : PLATEAU_SUGGESTIONS;
  return available[Math.floor(Math.random() * available.length)];
};

// ============================================
// HISTORIQUE DES PLATEAUX
// ============================================

export const getPlateauHistory = async (): Promise<PlateauHistory[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erreur lecture historique plateaux:', error);
    return [];
  }
};

const savePlateauHistory = async (history: PlateauHistory[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Erreur sauvegarde historique plateaux:', error);
  }
};

export const addPlateauToHistory = async (plateau: Omit<PlateauHistory, 'id'>): Promise<void> => {
  const history = await getPlateauHistory();
  const newPlateau: PlateauHistory = {
    ...plateau,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  history.push(newPlateau);
  await savePlateauHistory(history);
};

export const resolvePlateau = async (plateauId: string, weightAfter: number): Promise<void> => {
  const history = await getPlateauHistory();
  const index = history.findIndex(p => p.id === plateauId);

  if (index >= 0) {
    history[index].resolved = true;
    history[index].endDate = getToday();
    history[index].weightAfter = weightAfter;
    await savePlateauHistory(history);
  }
};

export const getResolvedPlateausCount = async (): Promise<number> => {
  const history = await getPlateauHistory();
  return history.filter(p => p.resolved).length;
};

// ============================================
// GESTION DU DISMISS
// ============================================

interface DismissedPlateau {
  date: string;
  averageWeight: number;
}

export const isDismissed = async (): Promise<boolean> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_DISMISSED);
    if (!data) return false;

    const dismissed: DismissedPlateau = JSON.parse(data);
    const today = getToday();

    // Reset si plus de 7 jours depuis le dismiss
    if (daysBetween(dismissed.date, today) > 7) {
      await AsyncStorage.removeItem(STORAGE_KEY_DISMISSED);
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export const dismissPlateau = async (averageWeight: number): Promise<void> => {
  try {
    const dismissed: DismissedPlateau = {
      date: getToday(),
      averageWeight,
    };
    await AsyncStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(dismissed));
  } catch (error) {
    console.error('Erreur dismiss plateau:', error);
  }
};

// ============================================
// DETECTION DE PLATEAU
// ============================================

export const detectPlateau = async (): Promise<PlateauResult | null> => {
  try {
    // Verifier si deja dismiss recemment
    if (await isDismissed()) {
      return null;
    }

    // Recuperer les mesures
    const measurements = await getAllMeasurements();

    if (measurements.length < PLATEAU_MIN_DAYS) {
      return null; // Pas assez de donnees
    }

    // Trier par date croissante
    const sorted = [...measurements].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Prendre les N derniers jours
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - PLATEAU_CHECK_DAYS);

    const recentMeasurements = sorted.filter(
      m => new Date(m.date) >= cutoffDate
    );

    // Il faut au moins PLATEAU_MIN_DAYS mesures dans la periode
    if (recentMeasurements.length < PLATEAU_MIN_DAYS) {
      return null;
    }

    // Extraire les poids
    const weights = recentMeasurements.map(m => m.weight);

    // Calculer variation
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const variation = maxWeight - minWeight;

    // Detection plateau : variation < seuil
    if (variation >= PLATEAU_THRESHOLD) {
      return null; // Pas de plateau, il y a des variations
    }

    // Calculer la duree du plateau (depuis quand ca stagne)
    const avgWeight = average(weights);
    let plateauStartDate = recentMeasurements[0].date;
    let duration = daysBetween(plateauStartDate, getToday());

    // Chercher plus loin si le plateau a commence avant
    for (let i = sorted.length - recentMeasurements.length - 1; i >= 0; i--) {
      const m = sorted[i];
      if (Math.abs(m.weight - avgWeight) <= PLATEAU_THRESHOLD) {
        plateauStartDate = m.date;
        duration = daysBetween(plateauStartDate, getToday());
      } else {
        break;
      }
    }

    // Compter les plateaux precedents resolus
    const previousPlateaus = await getResolvedPlateausCount();

    // Generer l'encouragement
    let encouragement = ENCOURAGEMENTS[0];
    if (previousPlateaus === 1) {
      encouragement = ENCOURAGEMENTS[1];
    } else if (previousPlateaus >= 2) {
      encouragement = ENCOURAGEMENTS[2].replace('{count}', String(previousPlateaus));
    }
    if (previousPlateaus >= 5) {
      encouragement = ENCOURAGEMENTS[3];
    }

    // Choisir une suggestion aleatoire
    const suggestion = getRandomSuggestion();

    return {
      detected: true,
      duration,
      startDate: plateauStartDate,
      averageWeight: Math.round(avgWeight * 10) / 10,
      variation: Math.round(variation * 100) / 100,
      suggestion,
      previousPlateaus,
      encouragement,
    };
  } catch (error) {
    console.error('Erreur detection plateau:', error);
    return null;
  }
};

// ============================================
// VERIFIER SI LE PLATEAU EST TERMINE
// ============================================

export const checkPlateauResolved = async (): Promise<{
  resolved: boolean;
  weightChange?: number;
} | null> => {
  try {
    const measurements = await getAllMeasurements();
    if (measurements.length < 3) return null;

    // Trier par date
    const sorted = [...measurements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Verifier s'il y avait un plateau en cours
    const history = await getPlateauHistory();
    const activePlateau = history.find(p => !p.resolved);

    if (!activePlateau) return null;

    // Comparer le poids actuel avec la moyenne du plateau
    const currentWeight = sorted[0].weight;
    const weightChange = currentWeight - activePlateau.averageWeight;

    // Si perte de plus de 0.5 kg depuis le plateau, c'est resolu !
    if (weightChange < -0.5) {
      await resolvePlateau(activePlateau.id, currentWeight);
      return {
        resolved: true,
        weightChange: Math.abs(weightChange),
      };
    }

    return { resolved: false };
  } catch (error) {
    console.error('Erreur verification resolution plateau:', error);
    return null;
  }
};

// ============================================
// OBTENIR UNE NOUVELLE SUGGESTION
// ============================================

export const getNewSuggestion = (currentSuggestionId?: string): PlateauSuggestion => {
  return getRandomSuggestion(currentSuggestionId);
};

// ============================================
// STATISTIQUES DES PLATEAUX
// ============================================

export const getPlateauStats = async (): Promise<{
  totalPlateaus: number;
  resolvedPlateaus: number;
  averageDuration: number;
  longestPlateau: number;
  totalDaysInPlateau: number;
} | null> => {
  try {
    const history = await getPlateauHistory();

    if (history.length === 0) return null;

    const resolved = history.filter(p => p.resolved);
    const durations = history.map(p => p.duration);

    return {
      totalPlateaus: history.length,
      resolvedPlateaus: resolved.length,
      averageDuration: Math.round(average(durations)),
      longestPlateau: Math.max(...durations),
      totalDaysInPlateau: durations.reduce((a, b) => a + b, 0),
    };
  } catch (error) {
    console.error('Erreur stats plateaux:', error);
    return null;
  }
};

// ============================================
// EXPORT PAR DEFAUT
// ============================================

export default {
  detectPlateau,
  dismissPlateau,
  isDismissed,
  getPlateauHistory,
  addPlateauToHistory,
  resolvePlateau,
  checkPlateauResolved,
  getNewSuggestion,
  getPlateauStats,
  getResolvedPlateausCount,
  PLATEAU_SUGGESTIONS,
};
