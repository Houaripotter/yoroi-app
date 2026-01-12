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

// Module natif
const { YoroiLiveActivityManager } = NativeModules;

class LiveActivityService {
  private isAvailable = Platform.OS === 'ios' && YoroiLiveActivityManager !== undefined;

  /**
   * Vérifier si les Live Activities sont disponibles sur cet appareil
   */
  async checkAvailability(): Promise<boolean> {
    if (!this.isAvailable) {
      logger.info('Live Activities non disponibles (iOS 16.1+ requis)');
      return false;
    }

    try {
      const result = await YoroiLiveActivityManager.areActivitiesEnabled();
      return result.enabled;
    } catch (error) {
      logger.error('Erreur vérification Live Activities:', error);
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
      logger.info('Live Activity démarrée:', result);
      return {
        success: true,
        activityId: result.activityId,
      };
    } catch (error: any) {
      logger.error('Erreur démarrage Live Activity:', error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue',
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
    } catch (error: any) {
      logger.error('Erreur mise à jour Live Activity:', error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue',
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
      logger.info('Live Activity arrêtée');
      return {
        success: true,
      };
    } catch (error: any) {
      logger.error('Erreur arrêt Live Activity:', error);
      return {
        success: false,
        error: error.message || 'Erreur inconnue',
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
      return result.isRunning;
    } catch (error) {
      logger.error('Erreur vérification Live Activity:', error);
      return false;
    }
  }
}

export const liveActivityManager = new LiveActivityService();
export default liveActivityManager;
