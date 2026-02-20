// ============================================
// YOROI - HOOK LIVE ACTIVITY
// ============================================
// Hook React pour gérer les Live Activities facilement
// ============================================

import { useEffect, useState, useCallback, useRef } from 'react';
import liveActivityManager, { LiveActivityData } from '@/lib/liveActivityManager';
import logger from '@/lib/security/logger';

interface UseLiveActivityReturn {
  isAvailable: boolean;
  isRunning: boolean;
  startActivity: (activityName: string) => Promise<boolean>;
  stopActivity: () => Promise<boolean>;
  updateHeartRate: (heartRate: number) => Promise<void>;
  updateActivity: (data: Partial<LiveActivityData>) => Promise<void>;
  elapsedSeconds: number;
}

/**
 * Hook pour gérer une Live Activity avec Timer automatique
 *
 * Exemple d'utilisation :
 * ```
 * const { isAvailable, isRunning, startActivity, stopActivity, elapsedSeconds } = useLiveActivity();
 *
 * // Démarrer
 * await startActivity('Course');
 *
 * // Arrêter
 * await stopActivity();
 * ```
 */
export function useLiveActivity(): UseLiveActivityReturn {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Référence pour l'interval du timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Vérifier la disponibilité au montage
  useEffect(() => {
    checkAvailability();

    return () => {
      // Cleanup : arrêter le timer si le composant est démonté
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const checkAvailability = async () => {
    const available = await liveActivityManager.checkAvailability();
    setIsAvailable(available);
  };

  /**
   * Démarrer une Live Activity avec timer automatique
   */
  const startActivity = useCallback(async (activityName: string): Promise<boolean> => {
    try {
      // Vérifier si une activité est déjà en cours
      const running = await liveActivityManager.isRunning();
      if (running) {
        logger.warn('Une Live Activity est déjà en cours');
        return false;
      }

      // Démarrer l'activité
      const result = await liveActivityManager.start({
        activityName,
        elapsedSeconds: 0,
        isRunning: true,
      });

      if (!result.success) {
        logger.error('Échec démarrage Live Activity:', result.error);
        return false;
      }

      // Démarrer le timer local
      setElapsedSeconds(0);
      setIsRunning(true);

      // Mettre à jour toutes les secondes
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const newSeconds = prev + 1;

          // Mettre à jour la Live Activity
          liveActivityManager.update({
            elapsedSeconds: newSeconds,
            isRunning: true,
          });

          return newSeconds;
        });
      }, 1000);

      logger.info('Live Activity démarrée avec succès:', activityName);
      return true;
    } catch (error) {
      logger.error('Erreur démarrage Live Activity:', error);
      return false;
    }
  }, []);

  /**
   * Arrêter la Live Activity et le timer
   */
  const stopActivity = useCallback(async (): Promise<boolean> => {
    try {
      // Arrêter le timer local
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Arrêter la Live Activity
      const result = await liveActivityManager.stop();

      if (!result.success) {
        logger.error('Échec arrêt Live Activity:', result.error);
        return false;
      }

      setIsRunning(false);
      logger.info('Live Activity arrêtée avec succès');
      return true;
    } catch (error) {
      logger.error('Erreur arrêt Live Activity:', error);
      return false;
    }
  }, []);

  /**
   * Mettre à jour la fréquence cardiaque affichée
   */
  const updateHeartRate = useCallback(async (heartRate: number): Promise<void> => {
    if (!isRunning) return;

    try {
      await liveActivityManager.update({
        heartRate,
      });
    } catch (error) {
      logger.error('Erreur mise à jour FC:', error);
    }
  }, [isRunning]);

  const updateActivity = useCallback(async (data: Partial<LiveActivityData>): Promise<void> => {
    if (!isRunning) return;
    try {
      await liveActivityManager.update(data);
    } catch (error) {
      logger.error('Erreur mise à jour activité:', error);
    }
  }, [isRunning]);

  return {
    isAvailable,
    isRunning,
    startActivity,
    stopActivity,
    updateHeartRate,
    updateActivity,
    elapsedSeconds,
  };
}

/**
 * Version simplifiée sans timer automatique
 * Pour un contrôle manuel complet
 */
export function useLiveActivityManual() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    const available = await liveActivityManager.checkAvailability();
    setIsAvailable(available);
  };

  const start = useCallback(async (data: LiveActivityData) => {
    const result = await liveActivityManager.start(data);
    if (result.success) {
      setIsRunning(true);
    }
    return result;
  }, []);

  const update = useCallback(async (data: Partial<LiveActivityData>) => {
    return await liveActivityManager.update(data);
  }, []);

  const stop = useCallback(async () => {
    const result = await liveActivityManager.stop();
    if (result.success) {
      setIsRunning(false);
    }
    return result;
  }, []);

  return {
    isAvailable,
    isRunning,
    start,
    update,
    stop,
  };
}
