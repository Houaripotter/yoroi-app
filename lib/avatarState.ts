// ============================================
// YOROI - SYSTEME D'AVATAR DYNAMIQUE
// ============================================
// Calcule l'état du guerrier selon l'activité

import { getMeasurements, getTrainings } from './database';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type AvatarState =
  | 'legendary'  // streak >= 7 jours ET action aujourd'hui
  | 'strong'     // Pesée OU entraînement aujourd'hui
  | 'neutral'    // Pas d'action mais avant 14h
  | 'tired'      // 1-2 jours sans action
  | 'down';      // 3+ jours sans action

export interface AvatarStateInfo {
  state: AvatarState;
  message: string;
  messageJp: string;
  streak: number;
  daysSinceLastAction: number;
  hasActionToday: boolean;
}

// Type pour compatibilité avec l'ancien système (deprecated - ignoré par DynamicAvatar)
export interface UserActivityData {
  lastWeighDate?: string | null;
  lastWorkoutDate?: string | null;
  lastTrainingDate?: string | null;
  streak: number;
  hasWeighedToday?: boolean;
  hasTrainedToday?: boolean;
}

// ═══════════════════════════════════════════════
// IMAGES MAPPING
// ═══════════════════════════════════════════════

export const AVATAR_IMAGES: Record<AvatarState, any> = {
  legendary: require('@/assets/avatars/samurai/samurai_legendary.png'),
  strong: require('@/assets/avatars/samurai/samurai_strong.png'),
  neutral: require('@/assets/avatars/samurai/samurai_neutral.png'),
  tired: require('@/assets/avatars/samurai/samurai_tired.png'),
  down: require('@/assets/avatars/samurai/samurai_down.png'),
};

// ═══════════════════════════════════════════════
// MESSAGES PAR ETAT
// ═══════════════════════════════════════════════

export const AVATAR_MESSAGES: Record<AvatarState, { message: string; messageJp: string }> = {
  legendary: {
    message: 'Guerrier Légendaire !',
    messageJp: '伝説の戦士',
  },
  strong: {
    message: 'Force et discipline',
    messageJp: '力と規律',
  },
  neutral: {
    message: 'Nouveau jour, nouvelle bataille',
    messageJp: '新しい日、新しい戦い',
  },
  tired: {
    message: 'Le guerrier se repose...',
    messageJp: '戦士は休む',
  },
  down: {
    message: 'Relève-toi, guerrier !',
    messageJp: '立ち上がれ、戦士よ',
  },
};

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

/**
 * Vérifie si une date est aujourd'hui
 */
const isToday = (dateString: string): boolean => {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Calcule le nombre de jours depuis une date
 */
const daysSince = (dateString: string): number => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Vérifie si c'est avant 14h (période de grâce)
 */
const isBeforeAfternoon = (): boolean => {
  const now = new Date();
  return now.getHours() < 14;
};

/**
 * Calcule le streak actuel (jours consécutifs avec au moins une action)
 */
const calculateStreak = (actionDates: string[]): number => {
  if (actionDates.length === 0) return 0;

  // Obtenir les dates uniques et les trier par ordre décroissant
  const uniqueDates = [...new Set(
    actionDates.map((d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.toISOString().split('T')[0];
    })
  )].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  let streak = 0;
  let currentDate = new Date(today);

  // Vérifier si action aujourd'hui
  const hasActionToday = uniqueDates.includes(todayStr);

  // Si pas d'action aujourd'hui et c'est après 14h, streak = 0
  if (!hasActionToday && !isBeforeAfternoon()) {
    return 0;
  }

  // Si pas d'action aujourd'hui mais c'est avant 14h, commencer à hier
  if (!hasActionToday) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Compter les jours consécutifs
  for (let i = 0; i < uniqueDates.length; i++) {
    const currentDateStr = currentDate.toISOString().split('T')[0];
    
    if (uniqueDates.includes(currentDateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      // Jour manqué, fin du streak
      break;
    }
  }

  return streak;
};

// ═══════════════════════════════════════════════
// CALCUL DE L'ETAT
// ═══════════════════════════════════════════════

/**
 * Calcule l'état actuel du guerrier basé sur l'activité
 */
export const calculateAvatarState = async (): Promise<AvatarStateInfo> => {
  try {
    // Récupérer les données depuis la base SQLite
    const measurements = await getMeasurements();
    const trainings = await getTrainings();

    // Collecter toutes les dates d'action
    const measurementDates = measurements.map((m) => m.date);
    const trainingDates = trainings.map((t) => t.date);
    const allActionDates = [...measurementDates, ...trainingDates];

    // Vérifier les actions d'aujourd'hui
    const hasWeighedToday = measurementDates.some(isToday);
    const hasTrainedToday = trainingDates.some(isToday);
    const hasActionToday = hasWeighedToday || hasTrainedToday;

    // Calculer le streak
    const streak = calculateStreak(allActionDates);

    // Trouver la dernière action
    let daysSinceLastAction = 999;
    if (allActionDates.length > 0) {
      const sortedDates = allActionDates
        .map((d) => new Date(d))
        .sort((a, b) => b.getTime() - a.getTime());
      daysSinceLastAction = daysSince(sortedDates[0].toISOString());
    }

    // Déterminer l'état
    let state: AvatarState;

    if (hasActionToday && streak >= 7) {
      // LEGENDARY: streak >= 7 jours ET action aujourd'hui
      state = 'legendary';
    } else if (hasActionToday) {
      // STRONG: Pesée OU entraînement aujourd'hui
      state = 'strong';
    } else if (isBeforeAfternoon() && daysSinceLastAction <= 1) {
      // NEUTRAL: Pas d'action mais avant 14h et actif récemment
      state = 'neutral';
    } else if (daysSinceLastAction >= 3) {
      // DOWN: 3+ jours sans action
      state = 'down';
    } else if (daysSinceLastAction >= 1) {
      // TIRED: 1-2 jours sans action
      state = 'tired';
    } else {
      // Par défaut (avant 14h, nouvel utilisateur)
      state = 'neutral';
    }

    const messages = AVATAR_MESSAGES[state];

    return {
      state,
      message: messages.message,
      messageJp: messages.messageJp,
      streak,
      daysSinceLastAction,
      hasActionToday,
    };
  } catch (error) {
    console.error('Erreur calcul état avatar:', error);
    return {
      state: 'neutral',
      message: AVATAR_MESSAGES.neutral.message,
      messageJp: AVATAR_MESSAGES.neutral.messageJp,
      streak: 0,
      daysSinceLastAction: 0,
      hasActionToday: false,
    };
  }
};

/**
 * Obtient l'image correspondant à un état
 */
export const getAvatarImage = (state: AvatarState): any => {
  return AVATAR_IMAGES[state];
};

/**
 * Obtient la couleur de bordure selon l'état
 */
export const getAvatarBorderColor = (state: AvatarState): string => {
  switch (state) {
    case 'legendary':
      return '#FFD700'; // Or brillant
    case 'strong':
      return '#4ECDC4'; // Turquoise
    case 'neutral':
      return '#9CA3AF'; // Gris
    case 'tired':
      return '#F59E0B'; // Orange
    case 'down':
      return '#EF4444'; // Rouge
    default:
      return '#D4AF37'; // Or par défaut
  }
};

/**
 * Obtient la couleur de glow selon l'état
 */
export const getAvatarGlowColor = (state: AvatarState): string => {
  switch (state) {
    case 'legendary':
      return 'rgba(255, 215, 0, 0.6)'; // Or brillant
    case 'strong':
      return 'rgba(78, 205, 196, 0.5)'; // Turquoise
    case 'neutral':
      return 'rgba(156, 163, 175, 0.3)'; // Gris
    case 'tired':
      return 'rgba(245, 158, 11, 0.4)'; // Orange
    case 'down':
      return 'rgba(239, 68, 68, 0.4)'; // Rouge
    default:
      return 'rgba(212, 175, 55, 0.4)'; // Or par défaut
  }
};

export default {
  calculateAvatarState,
  getAvatarImage,
  getAvatarBorderColor,
  getAvatarGlowColor,
  AVATAR_IMAGES,
  AVATAR_MESSAGES,
};
