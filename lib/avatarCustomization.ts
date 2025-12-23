// ============================================
// YOROI - PERSONNALISATION AVATAR GUERRIER
// ============================================
// Elements deblocables pour l'avatar
// 100% Offline - AsyncStorage
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllMeasurements, getAllWorkouts, getUserSettings, Measurement } from './storage';
import { getCurrentRank, RANKS } from './ranks';

// ============================================
// CLES DE STOCKAGE
// ============================================

const STORAGE_KEY_AVATAR = '@yoroi_avatar_customization';
const STORAGE_KEY_UNLOCKED = '@yoroi_avatar_unlocked';

// ============================================
// TYPES
// ============================================

export type FrameType = 'none' | 'bronze' | 'silver' | 'gold' | 'diamond';
export type BackgroundType = 'black' | 'flames' | 'lightning' | 'cosmos' | 'dragon';
export type EffectType = 'none' | 'gold_particles' | 'blue_aura' | 'gold_aura' | 'fire_aura';

export interface AvatarCustomization {
  frame: FrameType;
  background: BackgroundType;
  effect: EffectType;
}

export interface UnlockCondition {
  type: 'streak' | 'rank' | 'trainings' | 'weight_loss' | 'goal_reached';
  value: number | string;
  description: string;
}

export interface AvatarElement {
  id: string;
  name: string;
  emoji: string;
  unlockCondition: UnlockCondition | null;
  color?: string;
  colors?: string[];
}

// ============================================
// CADRES DISPONIBLES
// ============================================

export const AVATAR_FRAMES: Record<FrameType, AvatarElement> = {
  none: {
    id: 'none',
    name: 'Aucun',
    emoji: '⭕',
    unlockCondition: null,
    color: 'transparent',
  },
  bronze: {
    id: 'bronze',
    name: 'Bronze',
    emoji: '🥉',
    unlockCondition: {
      type: 'streak',
      value: 30,
      description: '30 jours de streak',
    },
    color: '#CD7F32',
  },
  silver: {
    id: 'silver',
    name: 'Argent',
    emoji: '🥈',
    unlockCondition: {
      type: 'streak',
      value: 100,
      description: '100 jours de streak',
    },
    color: '#C0C0C0',
  },
  gold: {
    id: 'gold',
    name: 'Or',
    emoji: '🥇',
    unlockCondition: {
      type: 'streak',
      value: 365,
      description: '365 jours de streak',
    },
    color: '#FFD700',
  },
  diamond: {
    id: 'diamond',
    name: 'Diamant',
    emoji: '💎',
    unlockCondition: {
      type: 'goal_reached',
      value: 1,
      description: 'Objectif atteint',
    },
    color: '#B9F2FF',
  },
};

// ============================================
// FONDS DISPONIBLES
// ============================================

export const AVATAR_BACKGROUNDS: Record<BackgroundType, AvatarElement> = {
  black: {
    id: 'black',
    name: 'Noir',
    emoji: '⬛',
    unlockCondition: null,
    color: '#0D0D0F',
  },
  flames: {
    id: 'flames',
    name: 'Flammes',
    emoji: '🔥',
    unlockCondition: {
      type: 'rank',
      value: 'ashigaru',
      description: 'Rang Ashigaru',
    },
    colors: ['#FF6B35', '#FF0000', '#FF4500'],
  },
  lightning: {
    id: 'lightning',
    name: 'Eclairs',
    emoji: '⚡',
    unlockCondition: {
      type: 'rank',
      value: 'samurai',
      description: 'Rang Samourai',
    },
    colors: ['#3B82F6', '#60A5FA', '#1E40AF'],
  },
  cosmos: {
    id: 'cosmos',
    name: 'Cosmos',
    emoji: '🌌',
    unlockCondition: {
      type: 'rank',
      value: 'sensei',
      description: 'Rang Sensei',
    },
    colors: ['#4C1D95', '#7C3AED', '#C084FC'],
  },
  dragon: {
    id: 'dragon',
    name: 'Dragon',
    emoji: '🐉',
    unlockCondition: {
      type: 'rank',
      value: 'daimyo',
      description: 'Rang Daimyo',
    },
    colors: ['#DC2626', '#7F1D1D', '#FCA5A5'],
  },
};

// ============================================
// EFFETS DISPONIBLES
// ============================================

export const AVATAR_EFFECTS: Record<EffectType, AvatarElement> = {
  none: {
    id: 'none',
    name: 'Aucun',
    emoji: '✨',
    unlockCondition: null,
  },
  gold_particles: {
    id: 'gold_particles',
    name: 'Particules dorees',
    emoji: '🌟',
    unlockCondition: {
      type: 'trainings',
      value: 100,
      description: '100 entrainements',
    },
    color: '#FFD700',
  },
  blue_aura: {
    id: 'blue_aura',
    name: 'Aura bleue',
    emoji: '💙',
    unlockCondition: {
      type: 'weight_loss',
      value: 15,
      description: '-15 kg perdus',
    },
    color: '#3B82F6',
  },
  gold_aura: {
    id: 'gold_aura',
    name: 'Aura doree',
    emoji: '💛',
    unlockCondition: {
      type: 'weight_loss',
      value: 25,
      description: '-25 kg perdus',
    },
    color: '#FFD700',
  },
  fire_aura: {
    id: 'fire_aura',
    name: 'Aura de feu',
    emoji: '🔥',
    unlockCondition: {
      type: 'rank',
      value: 'daimyo',
      description: 'Rang Daimyo',
    },
    colors: ['#FF6B35', '#FF0000', '#FF4500'],
  },
};

// ============================================
// HELPERS
// ============================================

/**
 * Calculer le streak
 */
const calculateStreak = (measurements: Measurement[]): { current: number; max: number } => {
  if (measurements.length === 0) return { current: 0, max: 0 };

  const sorted = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const uniqueDates = [...new Set(sorted.map(m => m.date.split('T')[0]))];

  let currentStreak = 0;
  let maxStreak = 0;
  let tempStreak = 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDate = new Date(uniqueDates[0]);
  firstDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    currentStreak = 1;

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

  const sorted = [...measurements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const firstWeight = sorted[0].weight;
  const currentWeight = sorted[sorted.length - 1].weight;
  const weightLoss = firstWeight - currentWeight;

  return Math.max(0, weightLoss);
};

// ============================================
// GESTION DU STOCKAGE
// ============================================

/**
 * Obtenir la personnalisation actuelle
 */
export const getAvatarCustomization = async (): Promise<AvatarCustomization> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY_AVATAR);
    if (!data) {
      return {
        frame: 'none',
        background: 'black',
        effect: 'none',
      };
    }
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lecture avatar customization:', error);
    return {
      frame: 'none',
      background: 'black',
      effect: 'none',
    };
  }
};

/**
 * Sauvegarder la personnalisation
 */
export const saveAvatarCustomization = async (customization: AvatarCustomization): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_AVATAR, JSON.stringify(customization));
  } catch (error) {
    console.error('Erreur sauvegarde avatar customization:', error);
  }
};

// ============================================
// VERIFICATION DES DEBLOCAGES
// ============================================

export interface UnlockedElements {
  frames: FrameType[];
  backgrounds: BackgroundType[];
  effects: EffectType[];
}

export interface ElementUnlockStatus {
  id: string;
  isUnlocked: boolean;
  progress: number;
  currentValue: number;
  requiredValue: number | string;
}

/**
 * Verifier si une condition est remplie
 */
const checkCondition = async (
  condition: UnlockCondition,
  measurements: Measurement[],
  trainingsCount: number,
  streakInfo: { current: number; max: number },
  goalReached: boolean
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

    case 'rank': {
      const requiredRankId = condition.value as string;
      const streakDays = Math.max(streakInfo.current, streakInfo.max);
      const currentRank = getCurrentRank(streakDays);

      const requiredRankIndex = RANKS.findIndex(r => r.id === requiredRankId);
      const currentRankIndex = RANKS.findIndex(r => r.id === currentRank.id);

      const isUnlocked = currentRankIndex >= requiredRankIndex;

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

    case 'trainings': {
      const required = condition.value as number;
      return {
        isUnlocked: trainingsCount >= required,
        progress: Math.min(100, (trainingsCount / required) * 100),
        currentValue: trainingsCount,
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

    case 'goal_reached': {
      return {
        isUnlocked: goalReached,
        progress: goalReached ? 100 : 0,
        currentValue: goalReached ? 1 : 0,
      };
    }

    default:
      return { isUnlocked: false, progress: 0, currentValue: 0 };
  }
};

/**
 * Verifier tous les elements et retourner les deblocages
 * @param isPro - Mode Créateur activé (débloque tout)
 */
export const checkAllUnlocks = async (isPro: boolean = false): Promise<{
  unlocked: UnlockedElements;
  statuses: {
    frames: Record<FrameType, ElementUnlockStatus>;
    backgrounds: Record<BackgroundType, ElementUnlockStatus>;
    effects: Record<EffectType, ElementUnlockStatus>;
  };
}> => {
  try {
    // Si Mode Créateur activé, débloquer tout
    if (isPro) {
      const allUnlocked: UnlockedElements = {
        frames: Object.keys(AVATAR_FRAMES) as FrameType[],
        backgrounds: Object.keys(AVATAR_BACKGROUNDS) as BackgroundType[],
        effects: Object.keys(AVATAR_EFFECTS) as EffectType[],
      };

      const allStatuses = {
        frames: {} as Record<FrameType, ElementUnlockStatus>,
        backgrounds: {} as Record<BackgroundType, ElementUnlockStatus>,
        effects: {} as Record<EffectType, ElementUnlockStatus>,
      };

      // Créer des statuses "débloqués" pour tous les éléments
      Object.keys(AVATAR_FRAMES).forEach((key) => {
        allStatuses.frames[key as FrameType] = {
          id: key,
          isUnlocked: true,
          progress: 100,
          currentValue: 0,
          requiredValue: 0,
        };
      });

      Object.keys(AVATAR_BACKGROUNDS).forEach((key) => {
        allStatuses.backgrounds[key as BackgroundType] = {
          id: key,
          isUnlocked: true,
          progress: 100,
          currentValue: 0,
          requiredValue: 0,
        };
      });

      Object.keys(AVATAR_EFFECTS).forEach((key) => {
        allStatuses.effects[key as EffectType] = {
          id: key,
          isUnlocked: true,
          progress: 100,
          currentValue: 0,
          requiredValue: 0,
        };
      });

      return { unlocked: allUnlocked, statuses: allStatuses };
    }

    // Recuperer les donnees
    const measurements = await getAllMeasurements();
    const workouts = await getAllWorkouts();
    const settings = await getUserSettings();
    const trainingsCount = workouts.length;
    const streakInfo = calculateStreak(measurements);

    // Verifier si objectif atteint
    let goalReached = false;
    if (settings.weight_goal && measurements.length > 0) {
      const sorted = [...measurements].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const currentWeight = sorted[0].weight;
      goalReached = currentWeight <= settings.weight_goal;
    }

    const unlocked: UnlockedElements = {
      frames: ['none'],
      backgrounds: ['black'],
      effects: ['none'],
    };

    const statuses = {
      frames: {} as Record<FrameType, ElementUnlockStatus>,
      backgrounds: {} as Record<BackgroundType, ElementUnlockStatus>,
      effects: {} as Record<EffectType, ElementUnlockStatus>,
    };

    // Verifier les cadres
    for (const [key, frame] of Object.entries(AVATAR_FRAMES)) {
      const frameKey = key as FrameType;

      if (!frame.unlockCondition) {
        statuses.frames[frameKey] = {
          id: frameKey,
          isUnlocked: true,
          progress: 100,
          currentValue: 0,
          requiredValue: 0,
        };
        continue;
      }

      const result = await checkCondition(
        frame.unlockCondition,
        measurements,
        trainingsCount,
        streakInfo,
        goalReached
      );

      if (result.isUnlocked) {
        unlocked.frames.push(frameKey);
      }

      statuses.frames[frameKey] = {
        id: frameKey,
        isUnlocked: result.isUnlocked,
        progress: result.progress,
        currentValue: result.currentValue,
        requiredValue: frame.unlockCondition.value,
      };
    }

    // Verifier les fonds
    for (const [key, bg] of Object.entries(AVATAR_BACKGROUNDS)) {
      const bgKey = key as BackgroundType;

      if (!bg.unlockCondition) {
        statuses.backgrounds[bgKey] = {
          id: bgKey,
          isUnlocked: true,
          progress: 100,
          currentValue: 0,
          requiredValue: 0,
        };
        continue;
      }

      const result = await checkCondition(
        bg.unlockCondition,
        measurements,
        trainingsCount,
        streakInfo,
        goalReached
      );

      if (result.isUnlocked) {
        unlocked.backgrounds.push(bgKey);
      }

      statuses.backgrounds[bgKey] = {
        id: bgKey,
        isUnlocked: result.isUnlocked,
        progress: result.progress,
        currentValue: result.currentValue,
        requiredValue: bg.unlockCondition.value,
      };
    }

    // Verifier les effets
    for (const [key, effect] of Object.entries(AVATAR_EFFECTS)) {
      const effectKey = key as EffectType;

      if (!effect.unlockCondition) {
        statuses.effects[effectKey] = {
          id: effectKey,
          isUnlocked: true,
          progress: 100,
          currentValue: 0,
          requiredValue: 0,
        };
        continue;
      }

      const result = await checkCondition(
        effect.unlockCondition,
        measurements,
        trainingsCount,
        streakInfo,
        goalReached
      );

      if (result.isUnlocked) {
        unlocked.effects.push(effectKey);
      }

      statuses.effects[effectKey] = {
        id: effectKey,
        isUnlocked: result.isUnlocked,
        progress: result.progress,
        currentValue: result.currentValue,
        requiredValue: effect.unlockCondition.value,
      };
    }

    return { unlocked, statuses };
  } catch (error) {
    console.error('Erreur verification deblocages avatar:', error);
    return {
      unlocked: {
        frames: ['none'],
        backgrounds: ['black'],
        effects: ['none'],
      },
      statuses: {
        frames: {} as Record<FrameType, ElementUnlockStatus>,
        backgrounds: {} as Record<BackgroundType, ElementUnlockStatus>,
        effects: {} as Record<EffectType, ElementUnlockStatus>,
      },
    };
  }
};

// ============================================
// EXPORT PAR DEFAUT
// ============================================

export default {
  getAvatarCustomization,
  saveAvatarCustomization,
  checkAllUnlocks,
  AVATAR_FRAMES,
  AVATAR_BACKGROUNDS,
  AVATAR_EFFECTS,
};
