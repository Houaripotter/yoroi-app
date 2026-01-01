// ============================================
// YOROI - DÉBLOCAGE DES THÈMES
// ============================================
// Vérifie les conditions de déblocage des thèmes
// 100% Offline - AsyncStorage
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FullThemeKey, FULL_THEMES, UnlockCondition } from './theme';
import { getAllMeasurements, getAllWorkouts, Measurement } from './storage';
import { getCurrentRank, RANKS } from './ranks';
import logger from '@/lib/security/logger';

// ============================================
// CLÉS DE STOCKAGE
// ============================================

const STORAGE_KEY_UNLOCKED_THEMES = '@yoroi_unlocked_themes';
const STORAGE_KEY_NEWLY_UNLOCKED = '@yoroi_newly_unlocked_theme';

// ============================================
// TYPES
// ============================================

export interface ThemeUnlockStatus {
  themeId: FullThemeKey;
  isUnlocked: boolean;
  progress: number; // 0-100
  currentValue: number;
  requiredValue: number | string;
  description: string;
}

export interface ThemeUnlockResult {
  unlockedThemes: FullThemeKey[];
  newlyUnlocked: FullThemeKey | null;
  statuses: ThemeUnlockStatus[];
}

// ============================================
// HELPERS
// ============================================

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

  // Verifier si le streak est actif (derniere mesure aujourd'hui ou hier)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDate = new Date(uniqueDates[0]);
  firstDate.setHours(0, 0, 0, 0);
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
 * Calculer la perte de poids
 */
const calculateWeightLoss = (measurements: Measurement[]): number => {
  if (measurements.length < 2) return 0;

  // Trier par date croissante
  const sorted = [...measurements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const firstWeight = sorted[0].weight;
  const currentWeight = sorted[sorted.length - 1].weight;
  const weightLoss = firstWeight - currentWeight;

  return Math.max(0, weightLoss);
};

// ============================================
// GESTION DES THÈMES DÉBLOQUÉS
// ============================================

/**
 * Obtenir la liste des thèmes débloqués
 * 🎁 TOUT GRATUIT POUR LES TESTS !
 */
export const getUnlockedThemes = async (): Promise<FullThemeKey[]> => {
  // 🎁 Retourner TOUS les thèmes disponibles !
  return Object.keys(FULL_THEMES) as FullThemeKey[];
};

/**
 * Sauvegarder les thèmes débloqués
 */
const saveUnlockedThemes = async (themes: FullThemeKey[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_UNLOCKED_THEMES, JSON.stringify(themes));
  } catch (error) {
    logger.error('Erreur sauvegarde thèmes débloqués:', error);
  }
};

/**
 * Obtenir le thème nouvellement débloqué (pour animation)
 */
export const getNewlyUnlockedTheme = async (): Promise<FullThemeKey | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_NEWLY_UNLOCKED);
    return data ? (data as FullThemeKey) : null;
  } catch (error) {
    return null;
  }
};

/**
 * Effacer le thème nouvellement débloqué (après affichage animation)
 */
export const clearNewlyUnlockedTheme = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_NEWLY_UNLOCKED);
  } catch (error) {
    logger.error('Erreur clear newly unlocked:', error);
  }
};

/**
 * Marquer un thème comme nouvellement débloqué
 */
const setNewlyUnlockedTheme = async (themeId: FullThemeKey): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_NEWLY_UNLOCKED, themeId);
  } catch (error) {
    logger.error('Erreur set newly unlocked:', error);
  }
};

// ============================================
// VÉRIFICATION DES CONDITIONS
// ============================================

/**
 * Vérifier une condition de déblocage
 */
const checkCondition = async (
  condition: UnlockCondition,
  measurements: Measurement[],
  trainingsCount: number,
  streakInfo: { current: number; max: number }
): Promise<{ isUnlocked: boolean; progress: number; currentValue: number }> => {
  switch (condition.type) {
    case 'streak': {
      const required = condition.value as number;
      const current = Math.max(streakInfo.current, streakInfo.max);
      return {
        isUnlocked: current >= required,
        progress: Math.min(100, (current / required) * 100),
        currentValue: current,
      };
    }

    case 'weight_loss': {
      const required = condition.value as number;
      const current = calculateWeightLoss(measurements);
      return {
        isUnlocked: current >= required,
        progress: Math.min(100, (current / required) * 100),
        currentValue: Math.round(current * 10) / 10,
      };
    }

    case 'trainings': {
      const required = condition.value as number;
      return {
        isUnlocked: trainingsCount >= required,
        progress: Math.min(100, (trainingsCount / required) * 100),
        currentValue: trainingsCount,
      };
    }

    case 'measurements': {
      const required = condition.value as number;
      return {
        isUnlocked: measurements.length >= required,
        progress: Math.min(100, (measurements.length / required) * 100),
        currentValue: measurements.length,
      };
    }

    case 'rank': {
      const requiredRankId = condition.value as string;
      const streakDays = Math.max(streakInfo.current, streakInfo.max);
      const currentRank = getCurrentRank(streakDays);

      // Trouver l'index du rang requis et actuel
      const requiredRankIndex = RANKS.findIndex(r => r.id === requiredRankId);
      const currentRankIndex = RANKS.findIndex(r => r.id === currentRank.id);

      const isUnlocked = currentRankIndex >= requiredRankIndex;

      // Calculer la progression
      let progress = 0;
      if (requiredRankIndex >= 0) {
        const requiredRank = RANKS[requiredRankIndex];
        progress = Math.min(100, (streakDays / requiredRank.minDays) * 100);
      }

      return {
        isUnlocked,
        progress,
        currentValue: streakDays,
      };
    }

    default:
      return { isUnlocked: false, progress: 0, currentValue: 0 };
  }
};

// ============================================
// VÉRIFICATION GLOBALE
// ============================================

/**
 * Vérifier tous les thèmes et retourner le statut de déblocage
 */
export const checkAllThemeUnlocks = async (): Promise<ThemeUnlockResult> => {
  try {
    // Récupérer les données
    const measurements = await getAllMeasurements();
    const workouts = await getAllWorkouts();
    const trainingsCount = workouts.length;
    const streakInfo = calculateStreak(measurements);

    // Récupérer les thèmes déjà débloqués
    const previouslyUnlocked = await getUnlockedThemes();

    const unlockedThemes: FullThemeKey[] = ['default'];
    const statuses: ThemeUnlockStatus[] = [];
    let newlyUnlocked: FullThemeKey | null = null;

    // Vérifier chaque thème
    for (const [themeId, theme] of Object.entries(FULL_THEMES)) {
      const key = themeId as FullThemeKey;

      // Thème par défaut toujours débloqué
      if (!theme.unlockCondition) {
        statuses.push({
          themeId: key,
          isUnlocked: true,
          progress: 100,
          currentValue: 0,
          requiredValue: 0,
          description: 'Toujours disponible',
        });
        continue;
      }

      // Vérifier la condition
      const result = await checkCondition(
        theme.unlockCondition,
        measurements,
        trainingsCount,
        streakInfo
      );

      if (result.isUnlocked) {
        unlockedThemes.push(key);

        // Vérifier si c'est un nouveau déblocage
        if (!previouslyUnlocked.includes(key)) {
          newlyUnlocked = key;
          await setNewlyUnlockedTheme(key);
        }
      }

      statuses.push({
        themeId: key,
        isUnlocked: result.isUnlocked,
        progress: result.progress,
        currentValue: result.currentValue,
        requiredValue: theme.unlockCondition.value,
        description: theme.unlockCondition.description,
      });
    }

    // Sauvegarder les thèmes débloqués
    await saveUnlockedThemes(unlockedThemes);

    return {
      unlockedThemes,
      newlyUnlocked,
      statuses,
    };
  } catch (error) {
    logger.error('Erreur vérification déblocages thèmes:', error);
    return {
      unlockedThemes: ['default'],
      newlyUnlocked: null,
      statuses: [],
    };
  }
};

/**
 * Vérifier si un thème spécifique est débloqué
 * 🎁 TOUT GRATUIT POUR LES TESTS !
 */
export const isThemeUnlocked = async (themeId: FullThemeKey): Promise<boolean> => {
  return true; // 🎁 Tous les thèmes débloqués !
};

/**
 * Forcer le déblocage d'un thème (pour tests/dev)
 */
export const forceUnlockTheme = async (themeId: FullThemeKey): Promise<void> => {
  const unlocked = await getUnlockedThemes();
  if (!unlocked.includes(themeId)) {
    unlocked.push(themeId);
    await saveUnlockedThemes(unlocked);
  }
};

/**
 * Réinitialiser tous les déblocages (pour tests/dev)
 */
export const resetThemeUnlocks = async (): Promise<void> => {
  await saveUnlockedThemes(['default']);
  await clearNewlyUnlockedTheme();
};

// ============================================
// EXPORT PAR DEFAUT
// ============================================

export default {
  checkAllThemeUnlocks,
  getUnlockedThemes,
  isThemeUnlocked,
  getNewlyUnlockedTheme,
  clearNewlyUnlockedTheme,
  forceUnlockTheme,
  resetThemeUnlocks,
};
