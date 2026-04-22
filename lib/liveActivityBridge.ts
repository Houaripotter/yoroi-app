// ============================================
// LIVE ACTIVITY BRIDGE
// Wrapper TS du module Swift YoroiLiveActivityBridge.
// Permet de démarrer/mettre à jour/arrêter une Live Activity Dynamic Island
// pendant qu'une séance est en cours.
//
// Usage typique :
//   await startLiveActivity({ sportName: 'JJB', sportIcon: 'figure.boxing', sportColorHex: 'EF4444' });
//   const interval = setInterval(() => updateLiveActivity({ elapsedSeconds: ... }), 1000);
//   await endLiveActivity();
// ============================================

import { NativeModules, Platform } from 'react-native';
import { logger } from './security/logger';

const Bridge = NativeModules.YoroiLiveActivityBridge as
  | {
      startSession: (
        sportName: string,
        sportIcon: string,
        sportColorHex: string,
      ) => Promise<string | null>;
      updateSession: (
        elapsedSeconds: number,
        heartRate: number,
        calories: number,
        rounds: number,
      ) => Promise<boolean>;
      endSession: () => Promise<boolean>;
      isAvailable: () => Promise<boolean>;
    }
  | undefined;

export interface StartActivityOptions {
  sportName: string;
  /** Nom SF Symbol (ex. "figure.boxing", "figure.run", "dumbbell.fill") */
  sportIcon: string;
  /** Couleur en hex SANS le # (ex. "EF4444") */
  sportColorHex: string;
}

export interface UpdateActivityOptions {
  elapsedSeconds: number;
  heartRate?: number;
  calories?: number;
  rounds?: number;
}

/** Démarre une Live Activity. Retourne l'ID ou null si non supporté. */
export const startLiveActivity = async (
  opts: StartActivityOptions,
): Promise<string | null> => {
  if (Platform.OS !== 'ios' || !Bridge) return null;
  try {
    return await Bridge.startSession(opts.sportName, opts.sportIcon, opts.sportColorHex);
  } catch (e) {
    logger.warn('[LiveActivity] start error:', e);
    return null;
  }
};

/** Met à jour le contenu de la Live Activity en cours. */
export const updateLiveActivity = async (opts: UpdateActivityOptions): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !Bridge) return false;
  try {
    return await Bridge.updateSession(
      opts.elapsedSeconds,
      opts.heartRate ?? 0,
      opts.calories ?? 0,
      opts.rounds ?? 0,
    );
  } catch (e) {
    logger.warn('[LiveActivity] update error:', e);
    return false;
  }
};

/** Termine la Live Activity en cours. */
export const endLiveActivity = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !Bridge) return false;
  try {
    return await Bridge.endSession();
  } catch (e) {
    logger.warn('[LiveActivity] end error:', e);
    return false;
  }
};

/** Indique si Live Activities sont supportées (iOS 16.1+ et activées dans Réglages). */
export const isLiveActivityAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !Bridge) return false;
  try { return await Bridge.isAvailable(); }
  catch { return false; }
};
