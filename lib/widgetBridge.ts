// ============================================
// WIDGET BRIDGE
// Wrapper TypeScript autour du module natif Swift YoroiWidgetBridge.
// Permet de mettre à jour les données affichées dans le Widget iOS.
//
// Usage :
//   await updateWidgetStats({ weeklyTrainings: 4, streakDays: 7, ... });
//
// IMPORTANT : ne marche que sur iOS (Android : no-op silencieux).
// L'App Group "group.com.houari.yoroi" doit être configuré dans Xcode
// pour que les data passent bien entre l'app et le Widget.
// ============================================

import { NativeModules, Platform } from 'react-native';
import { logger } from './security/logger';

const Bridge = NativeModules.YoroiWidgetBridge as
  | {
      updateStats: (
        weeklyTrainings: number,
        streakDays: number,
        latestWeightKg: number,
        weightTrend: string,
        weeklyMinutes: number,
      ) => Promise<boolean>;
      isAvailable: () => Promise<boolean>;
      reloadWidgets: () => Promise<boolean>;
    }
  | undefined;

export interface WidgetStats {
  weeklyTrainings: number;
  streakDays: number;
  latestWeightKg: number;
  weightTrend: 'up' | 'down' | 'flat';
  weeklyMinutes: number;
}

/**
 * Met à jour les stats affichées sur le Widget iOS.
 * No-op sur Android ou si le module natif n'est pas linké.
 */
export const updateWidgetStats = async (stats: WidgetStats): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;
  if (!Bridge) {
    logger.info('[Widget] Module natif non disponible (Widget non installé ou pas iOS 14+)');
    return false;
  }
  try {
    return await Bridge.updateStats(
      stats.weeklyTrainings,
      stats.streakDays,
      stats.latestWeightKg,
      stats.weightTrend,
      stats.weeklyMinutes,
    );
  } catch (e) {
    logger.warn('[Widget] Erreur mise à jour stats:', e);
    return false;
  }
};

/**
 * Vérifie que le widget est dispo (App Group entitlement présent).
 */
export const isWidgetAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !Bridge) return false;
  try {
    return await Bridge.isAvailable();
  } catch {
    return false;
  }
};

/**
 * Force le refresh manuel des widgets visibles.
 */
export const reloadWidgets = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios' || !Bridge) return false;
  try {
    return await Bridge.reloadWidgets();
  } catch {
    return false;
  }
};
