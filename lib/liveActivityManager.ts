// ============================================
// YOROI - LIVE ACTIVITY MANAGER
// ============================================
// Interface TypeScript pour contrôler les Live Activities (Dynamic Island)
// ============================================

import { NativeModules, Platform } from 'react-native';
import logger from '@/lib/security/logger';

// Types
export interface LiveActivityData {
  activityName: string;    // Nom de l'activité (ex: "Course", "Musculation")
  elapsedSeconds: number;  // Temps écoulé en secondes
  isRunning: boolean;      // Timer en cours ou en pause
  heartRate?: number;      // Fréquence cardiaque (optionnel)
}

export interface LiveActivityResult {
  success: boolean;
  activityId?: string;
  error?: string;
}

// Module natif : absent dans Expo Go et parfois sur le simulateur.
// Dans ce cas NativeModules peut renvoyer undefined, null ou un objet sans methodes :
// on verifie chaque methode avant de l'appeler, sans jamais lever d'erreur.
type NativeLA = Record<string, unknown> | null | undefined;
function nativeModule(): NativeLA {
  try {
    return (NativeModules as Record<string, NativeLA>).YoroiLiveActivityManager;
  } catch {
    return undefined;
  }
}
function hasMethod(name: string): boolean {
  const m = nativeModule();
  return Platform.OS === 'ios' && !!m && typeof m[name] === 'function';
}
const YoroiLiveActivityManager = {
  call: async (name: string, ...args: unknown[]): Promise<any> => {
    const m = nativeModule();
    if (!m || typeof m[name] !== 'function') throw new Error('module natif absent');
    return (m[name] as (...a: unknown[]) => Promise<any>)(...args);
  },
  areActivitiesEnabled: () => YoroiLiveActivityManager.call('areActivitiesEnabled'),
  startActivity: (data: unknown) => YoroiLiveActivityManager.call('startActivity', data),
  updateActivity: (data: unknown) => YoroiLiveActivityManager.call('updateActivity', data),
  stopActivity: () => YoroiLiveActivityManager.call('stopActivity'),
  isActivityRunning: () => YoroiLiveActivityManager.call('isActivityRunning'),
};

class LiveActivityService {
  private get isAvailable(): boolean {
    return hasMethod('areActivitiesEnabled') && hasMethod('startActivity');
  }

  /**
   * Vérifier si les Live Activities sont disponibles sur cet appareil
   */
  async checkAvailability(): Promise<boolean> {
    // Expo Go, simulateur ou iOS trop ancien : pas d'ilot dynamique, en silence
    if (!this.isAvailable) return false;

    try {
      const result = await YoroiLiveActivityManager.areActivitiesEnabled();
      return !!result?.enabled;
    } catch {
      return false;
    }
  }

  /**
   * Démarrer une Live Activity
   * @param data - Données de l'activité
   */
  async start(data: LiveActivityData): Promise<LiveActivityResult> {
    if (!this.isAvailable) {
      return {
        success: false,
        error: 'Live Activities non disponibles',
      };
    }

    try {
      const result = await YoroiLiveActivityManager.startActivity(data);
      return {
        success: true,
        activityId: result?.activityId,
      };
    } catch (error: unknown) {
      logger.warn('Live Activity non démarrée:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Mettre à jour une Live Activity
   * @param data - Nouvelles données de l'activité
   */
  async update(data: Partial<LiveActivityData>): Promise<LiveActivityResult> {
    if (!this.isAvailable) {
      return {
        success: false,
        error: 'Live Activities non disponibles',
      };
    }

    try {
      await YoroiLiveActivityManager.updateActivity(data);
      return {
        success: true,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Arrêter une Live Activity
   */
  async stop(): Promise<LiveActivityResult> {
    if (!this.isAvailable) {
      return {
        success: false,
        error: 'Live Activities non disponibles',
      };
    }

    try {
      await YoroiLiveActivityManager.stopActivity();
      return {
        success: true,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Vérifier si une Live Activity est en cours
   */
  async isRunning(): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const result = await YoroiLiveActivityManager.isActivityRunning();
      return !!result?.isRunning;
    } catch {
      return false;
    }
  }
}

export const liveActivityManager = new LiveActivityService();
export default liveActivityManager;
