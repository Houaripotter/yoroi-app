/**
 * WatchConnectivity - Bridge React Native ↔ Apple Watch
 *
 * Permet la communication bidirectionnelle entre l'iPhone et l'Apple Watch
 *
 * Usage:
 * ```typescript
 * import { WatchConnectivity } from '@/lib/watchConnectivity.ios';
 *
 * // Vérifier si Watch disponible
 * const available = await WatchConnectivity.isWatchAvailable();
 *
 * // Envoyer des données à la Watch
 * await WatchConnectivity.sendToWatch({ weight: 78.5, date: new Date().toISOString() });
 *
 * // Écouter les données de la Watch
 * WatchConnectivity.onReceiveFromWatch((data) => {
 *   logger.info('Reçu de la Watch:', data);
 * });
 * ```
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { logger } from '@/lib/security/logger';

// ✅ DIAGNOSTIC: Logger l'état du module au chargement
const isModuleAvailable = !!NativeModules.WatchConnectivityBridge;
logger.info('========================================');
logger.info('[WatchConnectivity] Module natif disponible:', isModuleAvailable);
logger.info('[WatchConnectivity] Platform:', Platform.OS);
if (!isModuleAvailable && Platform.OS === 'ios') {
  logger.warn('[WatchConnectivity] ⚠️ ATTENTION: Module WatchConnectivityBridge NON CHARGÉ sur iOS!');
  logger.warn('[WatchConnectivity] La communication iPhone ↔ Watch ne fonctionnera PAS.');
  logger.warn('[WatchConnectivity] Vérifiez que le module natif est correctement linké.');
}
logger.info('========================================');

const WatchConnectivityModule = isModuleAvailable
  ? NativeModules.WatchConnectivityBridge
  : {
      // Module stub qui retourne des valeurs par défaut au lieu de crasher
      isWatchAvailable: () => {
        logger.warn('[WatchConnectivity] Stub: isWatchAvailable() appelé - module non disponible');
        return Promise.resolve(false);
      },
      isWatchReachable: () => {
        logger.warn('[WatchConnectivity] Stub: isWatchReachable() appelé - module non disponible');
        return Promise.resolve(false);
      },
      sendMessageToWatch: () => {
        return Promise.resolve(false);
      },
      updateApplicationContext: () => {
        return Promise.resolve(false);
      },
      transferUserInfo: () => Promise.resolve(false),
      getReceivedApplicationContext: () => Promise.resolve({}),
      activateSession: () => Promise.resolve(true),
      transferFile: () => Promise.reject(new Error('Module not available')),
      // ✅ NOUVEAU: Fonction ping pour diagnostic
      ping: () => Promise.resolve({
        supported: false,
        paired: false,
        installed: false,
        reachable: false,
        state: 'module_not_available',
        pendingMessages: 0,
      }),
    };

const watchEventEmitter = isModuleAvailable
  ? new NativeEventEmitter(WatchConnectivityModule)
  : {
      addListener: () => ({ remove: () => {} }),
      removeAllListeners: () => {},
    } as any;

// MARK: - Types

export interface WatchStatus {
  isReachable: boolean;
  isPaired: boolean;
  isWatchAppInstalled: boolean;
}

export interface WatchActivationStatus extends WatchStatus {
  state: 'activated' | 'inactive' | 'notActivated' | 'unknown';
  error?: string;
}

export interface WatchMessage {
  [key: string]: any;
}

export interface WatchDataEvent {
  type?: 'applicationContext' | 'userInfo';
  data: any;
  size?: number;
}

export interface WatchErrorEvent {
  type: string;
  error: string;
}

export type WatchEventType =
  | 'onWatchReachabilityChanged'
  | 'onWatchDataReceived'
  | 'onWatchMessageReceived'
  | 'onWatchActivationCompleted'
  | 'onWatchError';

// MARK: - API

export const WatchConnectivity = {
  /**
   * Vérifie si une Apple Watch est appairée et l'app Watch installée
   */
  isWatchAvailable: async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false;
    try {
      return await WatchConnectivityModule.isWatchAvailable();
    } catch (error) {
      logger.error('Error checking watch availability:', error);
      return false;
    }
  },

  /**
   * Vérifie si la Watch est à portée (Bluetooth actif)
   */
  isWatchReachable: async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false;
    try {
      return await WatchConnectivityModule.isWatchReachable();
    } catch (error) {
      logger.error('Error checking watch reachability:', error);
      return false;
    }
  },

  /**
   * Envoie un message à la Watch (requiert que la Watch soit reachable)
   * Retourne la réponse de la Watch
   */
  sendMessageToWatch: async (message: WatchMessage): Promise<WatchMessage> => {
    if (Platform.OS !== 'ios') {
      throw new Error('WatchConnectivity is only available on iOS');
    }
    return await WatchConnectivityModule.sendMessageToWatch(message);
  },

  /**
   * Met à jour le contexte applicatif (données persistantes)
   * La Watch recevra ces données même si elle n'est pas reachable
   */
  updateApplicationContext: async (context: WatchMessage): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      throw new Error('WatchConnectivity is only available on iOS');
    }
    return await WatchConnectivityModule.updateApplicationContext(context);
  },

  /**
   * Transfert un fichier vers la Watch
   */
  transferFile: async (
    fileURL: string,
    metadata?: Record<string, any>
  ): Promise<{ transferID: string }> => {
    if (Platform.OS !== 'ios') {
      throw new Error('WatchConnectivity is only available on iOS');
    }
    return await WatchConnectivityModule.transferFile(fileURL, metadata || null);
  },

  /**
   * Transfert de UserInfo (en arrière-plan, queueable)
   */
  transferUserInfo: async (
    userInfo: WatchMessage
  ): Promise<{ transferring: boolean }> => {
    if (Platform.OS !== 'ios') {
      throw new Error('WatchConnectivity is only available on iOS');
    }
    return await WatchConnectivityModule.transferUserInfo(userInfo);
  },

  /**
   * Récupère le dernier contexte applicatif reçu de la Watch
   */
  getReceivedApplicationContext: async (): Promise<WatchMessage> => {
    if (Platform.OS !== 'ios') {
      throw new Error('WatchConnectivity is only available on iOS');
    }
    return await WatchConnectivityModule.getReceivedApplicationContext();
  },

  /**
   * Active manuellement la session WatchConnectivity
   * (généralement activée automatiquement au démarrage)
   */
  activateSession: async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      throw new Error('WatchConnectivity is only available on iOS');
    }
    return await WatchConnectivityModule.activateSession();
  },

  // MARK: - Event Listeners

  /**
   * Écoute les changements de statut de la Watch (reachable/unreachable)
   */
  onReachabilityChanged: (callback: (status: WatchStatus) => void) => {
    if (Platform.OS !== 'ios') return { remove: () => {} };
    return watchEventEmitter.addListener('onWatchReachabilityChanged', callback);
  },

  /**
   * Écoute les données reçues de la Watch
   */
  onDataReceived: (callback: (data: WatchDataEvent) => void) => {
    if (Platform.OS !== 'ios') return { remove: () => {} };
    return watchEventEmitter.addListener('onWatchDataReceived', callback);
  },

  /**
   * Écoute les messages reçus de la Watch
   */
  onMessageReceived: (callback: (message: WatchMessage) => void) => {
    if (Platform.OS !== 'ios') return { remove: () => {} };
    return watchEventEmitter.addListener('onWatchMessageReceived', (event: any) => {
      // Si le message requiert une réponse, on peut le gérer ici
      callback(event.message || event);
    });
  },

  /**
   * Écoute la complétion de l'activation de la session
   */
  onActivationCompleted: (callback: (status: WatchActivationStatus) => void) => {
    if (Platform.OS !== 'ios') return { remove: () => {} };
    return watchEventEmitter.addListener('onWatchActivationCompleted', callback);
  },

  /**
   * Écoute les erreurs WatchConnectivity
   */
  onError: (callback: (error: WatchErrorEvent) => void) => {
    if (Platform.OS !== 'ios') return { remove: () => {} };
    return watchEventEmitter.addListener('onWatchError', callback);
  },

  // MARK: - Helper Methods

  /**
   * Envoie les données de poids à la Watch
   */
  sendWeightUpdate: async (weight: number, date: Date = new Date()): Promise<void> => {
    try {
      await WatchConnectivity.updateApplicationContext({
        weightUpdate: {
          weight,
          date: date.toISOString(),
          timestamp: Date.now(),
        },
      });
      logger.info('✅ Weight update sent to Watch:', weight);
    } catch (error) {
      logger.error('❌ Error sending weight to Watch:', error);
      throw error;
    }
  },

  /**
   * Envoie les données d'hydratation à la Watch
   */
  sendHydrationUpdate: async (waterIntake: number, date: Date = new Date()): Promise<void> => {
    try {
      await WatchConnectivity.updateApplicationContext({
        hydrationUpdate: {
          waterIntake,
          date: date.toISOString(),
          timestamp: Date.now(),
        },
      });
      logger.info('✅ Hydration update sent to Watch:', waterIntake);
    } catch (error) {
      logger.error('❌ Error sending hydration to Watch:', error);
      throw error;
    }
  },

  /**
   * Envoie une session d'entraînement à la Watch
   */
  sendWorkoutSession: async (workout: {
    type: string;
    duration: number;
    calories: number;
    date: Date;
  }): Promise<void> => {
    try {
      await WatchConnectivity.updateApplicationContext({
        workoutSession: {
          ...workout,
          date: workout.date.toISOString(),
          timestamp: Date.now(),
        },
      });
      logger.info('✅ Workout session sent to Watch');
    } catch (error) {
      logger.error('❌ Error sending workout to Watch:', error);
      throw error;
    }
  },

  /**
   * Envoie tous les records à la Watch
   */
  sendRecordsUpdate: async (records: Array<{
    exercise: string;
    weight: number;
    reps: number;
    date: string;
  }>): Promise<void> => {
    try {
      await WatchConnectivity.updateApplicationContext({
        recordsUpdate: {
          records,
          timestamp: Date.now(),
        },
      });
      logger.info('✅ Records sent to Watch:', records.length);
    } catch (error) {
      logger.error('❌ Error sending records to Watch:', error);
      throw error;
    }
  },

  // ============================================
  // ✅ NOUVEAU: FONCTION DE DIAGNOSTIC WATCH
  // ============================================
  runDiagnostic: async (): Promise<{
    moduleAvailable: boolean;
    platform: string;
    isAvailable: boolean;
    isReachable: boolean;
    pingResult: any;
    errors: string[];
    recommendations: string[];
  }> => {
    logger.info('========================================');
    logger.info('[WatchConnectivity] DÉMARRAGE DIAGNOSTIC');
    logger.info('========================================');

    const errors: string[] = [];
    const recommendations: string[] = [];

    // 1. Vérifier le module natif
    logger.info('[Diagnostic] Module natif disponible:', isModuleAvailable);
    if (!isModuleAvailable) {
      errors.push('Module natif WatchConnectivityBridge non chargé');
      recommendations.push('Vérifiez que le module natif est correctement compilé dans Xcode');
      recommendations.push('Faites un clean build: cd ios && pod install && cd .. && npx expo run:ios');
    }

    // 2. Vérifier la plateforme
    logger.info('[Diagnostic] Plateforme:', Platform.OS);
    if (Platform.OS !== 'ios') {
      errors.push('WatchConnectivity n\'est disponible que sur iOS');
    }

    // 3. Tester isWatchAvailable
    let isAvailable = false;
    try {
      isAvailable = await WatchConnectivity.isWatchAvailable();
      logger.info('[Diagnostic] Watch disponible:', isAvailable);

      if (!isAvailable) {
        errors.push('Apple Watch non disponible');
        recommendations.push('Vérifiez que votre Apple Watch est jumelée avec cet iPhone');
        recommendations.push('Vérifiez que l\'app Yoroi Watch est installée sur votre Apple Watch');
      }
    } catch (e) {
      errors.push('Erreur isWatchAvailable: ' + (e as Error).message);
    }

    // 4. Tester isWatchReachable
    let isReachable = false;
    try {
      isReachable = await WatchConnectivity.isWatchReachable();
      logger.info('[Diagnostic] Watch reachable:', isReachable);

      if (!isReachable && isAvailable) {
        recommendations.push('Votre Watch est jumelée mais pas à portée');
        recommendations.push('Activez le Bluetooth et rapprochez les appareils');
      }
    } catch (e) {
      errors.push('Erreur isWatchReachable: ' + (e as Error).message);
    }

    // 5. Ping (si disponible)
    let pingResult = null;
    try {
      if (WatchConnectivityModule.ping) {
        pingResult = await WatchConnectivityModule.ping();
        logger.info('[Diagnostic] Ping result:', pingResult);
      }
    } catch (e) {
      logger.info('[Diagnostic] Ping non disponible ou échoué');
    }

    logger.info('========================================');
    logger.info('[WatchConnectivity] FIN DIAGNOSTIC');
    logger.info('Erreurs:', errors.length);
    logger.info('Recommandations:', recommendations.length);
    logger.info('========================================');

    return {
      moduleAvailable: isModuleAvailable,
      platform: Platform.OS,
      isAvailable,
      isReachable,
      pingResult,
      errors,
      recommendations,
    };
  },
};

// MARK: - Hook React

/**
 * Hook React pour utiliser WatchConnectivity
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isAvailable, isReachable, sendToWatch } = useWatchConnectivity();
 *
 *   useEffect(() => {
 *     if (isAvailable) {
 *       sendToWatch({ hello: 'Watch!' });
 *     }
 *   }, [isAvailable]);
 *
 *   return <Text>Watch: {isReachable ? 'Connected' : 'Disconnected'}</Text>;
 * }
 * ```
 */
export function useWatchConnectivity() {
  const [isAvailable, setIsAvailable] = React.useState(false);
  const [isReachable, setIsReachable] = React.useState(false);
  const [lastError, setLastError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Vérifier disponibilité au mount
    WatchConnectivity.isWatchAvailable().then(setIsAvailable).catch(() => {});
    WatchConnectivity.isWatchReachable().then(setIsReachable).catch(() => {});

    // Écouter les changements de reachability
    const reachabilityListener = WatchConnectivity.onReachabilityChanged((status) => {
      setIsReachable(status.isReachable);
      setIsAvailable(status.isPaired && status.isWatchAppInstalled);
    });

    // Écouter les erreurs
    const errorListener = WatchConnectivity.onError((error) => {
      setLastError(error.error);
    });

    return () => {
      reachabilityListener.remove();
      errorListener.remove();
    };
  }, []);

  return {
    isAvailable,
    isReachable,
    lastError,
    sendToWatch: WatchConnectivity.sendMessageToWatch,
    updateContext: WatchConnectivity.updateApplicationContext,
    sendWeight: WatchConnectivity.sendWeightUpdate,
    sendHydration: WatchConnectivity.sendHydrationUpdate,
    sendWorkout: WatchConnectivity.sendWorkoutSession,
    sendRecords: WatchConnectivity.sendRecordsUpdate,
  };
}

// Pour les imports named
import React from 'react';

// ✅ NOUVEAU: Exports pour diagnostic
export const isWatchModuleAvailable = isModuleAvailable;
export const getWatchModuleStatus = () => ({
  available: isModuleAvailable,
  platform: Platform.OS,
  nativeModule: !!NativeModules.WatchConnectivityBridge,
});

export default WatchConnectivity;
