// ============================================
// YOROI - SERVICE LIVE ACTIVITY (Dynamic Island)
// ============================================
// Interface TypeScript pour contrôler les Live Activities iOS

import { NativeModules, Platform } from 'react-native';

const { TimerActivityModule } = NativeModules;

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface LiveActivityState {
  timeRemaining: number;
  totalTime: number;
  currentRound: number;
  totalRounds: number;
  isRest: boolean;
  isPaused: boolean;
}

// ═══════════════════════════════════════════════
// FONCTIONS
// ═══════════════════════════════════════════════

/**
 * Vérifie si les Live Activities sont supportées
 */
export const isLiveActivitySupported = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;

  try {
    if (!TimerActivityModule) return false;
    return await TimerActivityModule.isSupported();
  } catch (error) {
    console.log('Live Activities non supportées:', error);
    return false;
  }
};

/**
 * Démarre une Live Activity pour le timer
 */
export const startTimerLiveActivity = async (
  mode: 'combat' | 'repos',
  state: LiveActivityState
): Promise<string | null> => {
  if (Platform.OS !== 'ios' || !TimerActivityModule) {
    return null;
  }

  try {
    const activityId = await TimerActivityModule.startActivity(
      mode,
      state.timeRemaining,
      state.totalTime,
      state.currentRound,
      state.totalRounds,
      state.isRest
    );
    console.log('Live Activity démarrée:', activityId);
    return activityId;
  } catch (error) {
    console.error('Erreur démarrage Live Activity:', error);
    return null;
  }
};

/**
 * Met à jour la Live Activity
 */
export const updateTimerLiveActivity = async (
  state: LiveActivityState
): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !TimerActivityModule) {
    return false;
  }

  try {
    await TimerActivityModule.updateActivity(
      state.timeRemaining,
      state.totalTime,
      state.currentRound,
      state.totalRounds,
      state.isRest,
      state.isPaused
    );
    return true;
  } catch (error) {
    // Silencieux - l'activité peut ne plus exister
    return false;
  }
};

/**
 * Arrête la Live Activity
 */
export const stopTimerLiveActivity = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !TimerActivityModule) {
    return false;
  }

  try {
    await TimerActivityModule.stopActivity();
    console.log('Live Activity arrêtée');
    return true;
  } catch (error) {
    console.error('Erreur arrêt Live Activity:', error);
    return false;
  }
};

export default {
  isLiveActivitySupported,
  startTimerLiveActivity,
  updateTimerLiveActivity,
  stopTimerLiveActivity,
};
