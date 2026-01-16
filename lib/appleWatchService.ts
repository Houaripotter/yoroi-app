//
// appleWatchService.ts
// Service pour communiquer avec l'Apple Watch
//

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';

const WatchBridge = Platform.OS === 'ios' ? NativeModules.WatchBridge : null;
const watchEmitter = WatchBridge ? new NativeEventEmitter(WatchBridge) : null;

// ============================================
// TYPES
// ============================================

export interface WatchData {
  // Hydratation
  hydrationCurrent: number; // ml
  hydrationGoal: number; // ml

  // Poids
  currentWeight: number; // kg
  targetWeight: number; // kg

  // Sommeil
  sleepDuration: number; // minutes
  sleepQuality: number; // 1-5
  sleepBedTime: string; // "23:15"
  sleepWakeTime: string; // "06:45"

  // Pas
  stepsGoal: number;

  // Timestamp
  timestamp: number;
}

export interface WatchStatus {
  isReachable: boolean;
  isPaired: boolean;
  isWatchAppInstalled: boolean;
}

// ============================================
// APPLE WATCH SERVICE
// ============================================

class AppleWatchService {
  private listeners: Map<string, any> = new Map();

  // ============================================
  // INITIALISATION
  // ============================================

  /**
   * Initialiser le service et écouter les événements de la watch
   */
  init() {
    if (!watchEmitter) {
      logger.warn('WatchBridge non disponible (pas iOS ou module absent)');
      return;
    }

    logger.info('🎯 Initialisation AppleWatchService');

    // Écouter les messages de la watch
    this.listeners.set(
      'onWatchMessage',
      watchEmitter.addListener('onWatchMessage', (data) => {
        logger.info('📩 Message de la watch:', data);
        if (data.action === 'syncRequest') {
          // La watch demande une sync
          this.syncToWatch();
        }
      })
    );

    // Écouter les changements d'état
    this.listeners.set(
      'onWatchStateChanged',
      watchEmitter.addListener('onWatchStateChanged', (state) => {
        logger.info('🔄 État watch changé:', state);
      })
    );

    // Écouter l'ajout d'hydratation depuis la watch
    this.listeners.set(
      'onHydrationAdded',
      watchEmitter.addListener('onHydrationAdded', async (data) => {
        logger.info(`💧 Hydratation ajoutée depuis la watch: +${data.amount}ml`);
        await this.handleHydrationFromWatch(data.amount);
      })
    );

    // Écouter l'ajout de poids depuis la watch
    this.listeners.set(
      'onWeightAdded',
      watchEmitter.addListener('onWeightAdded', async (data) => {
        logger.info(`⚖️ Poids ajouté depuis la watch: ${data.weight}kg`);
        await this.handleWeightFromWatch(data.weight);
      })
    );

    // Sync initiale
    this.syncToWatch();
  }

  /**
   * Nettoyer les listeners
   */
  cleanup() {
    this.listeners.forEach((listener) => listener.remove());
    this.listeners.clear();
  }

  // ============================================
  // SYNCHRONISATION VERS LA WATCH
  // ============================================

  /**
   * Envoyer les données actuelles à la watch
   */
  async syncToWatch() {
    if (!WatchBridge) {
      return;
    }

    try {
      // Récupérer les données depuis AsyncStorage
      const watchData = await this.prepareWatchData();

      // Envoyer à la watch
      WatchBridge.syncDataToWatch(watchData);

      logger.info('✅ Données synchronisées vers la watch');
    } catch (error) {
      logger.error('❌ Erreur sync vers watch:', error);
    }
  }

  /**
   * Préparer les données à envoyer à la watch
   */
  private async prepareWatchData(): Promise<WatchData> {
    // Hydratation
    const today = new Date().toISOString().split('T')[0];
    const hydrationCurrent = parseInt(await AsyncStorage.getItem(`hydration_${today}`) || '0');
    const hydrationGoal = parseInt(await AsyncStorage.getItem('@yoroi_hydration_goal') || '3000');

    // Poids
    const currentWeight = parseFloat(await AsyncStorage.getItem('@yoroi_current_weight') || '78.2');
    const targetWeight = parseFloat(await AsyncStorage.getItem('@yoroi_target_weight') || '77.0');

    // Sommeil (dernière nuit)
    const sleepEntriesStr = await AsyncStorage.getItem('@yoroi_sleep_entries');
    let sleepData = {
      duration: 450, // 7h30 par défaut
      quality: 5,
      bedTime: '23:15',
      wakeTime: '06:45',
    };

    if (sleepEntriesStr) {
      const sleepEntries = JSON.parse(sleepEntriesStr);
      if (sleepEntries.length > 0) {
        const lastSleep = sleepEntries[0];
        sleepData = {
          duration: lastSleep.duration || 450,
          quality: lastSleep.quality || 5,
          bedTime: lastSleep.bedTime || '23:15',
          wakeTime: lastSleep.wakeTime || '06:45',
        };
      }
    }

    // Pas
    const stepsGoal = parseInt(await AsyncStorage.getItem('@yoroi_steps_goal') || '8000');

    return {
      hydrationCurrent,
      hydrationGoal,
      currentWeight,
      targetWeight,
      sleepDuration: sleepData.duration,
      sleepQuality: sleepData.quality,
      sleepBedTime: sleepData.bedTime,
      sleepWakeTime: sleepData.wakeTime,
      stepsGoal,
      timestamp: Date.now(),
    };
  }

  // ============================================
  // GESTION DES ACTIONS DEPUIS LA WATCH
  // ============================================

  /**
   * Gérer l'ajout d'hydratation depuis la watch
   */
  private async handleHydrationFromWatch(amount: number) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentStr = await AsyncStorage.getItem(`hydration_${today}`);
      const current = parseInt(currentStr || '0');
      const newTotal = current + amount;

      await AsyncStorage.setItem(`hydration_${today}`, newTotal.toString());

      logger.info(`💧 Hydratation mise à jour: ${current}ml → ${newTotal}ml`);

      // Re-sync vers la watch avec les nouvelles données
      await this.syncToWatch();
    } catch (error) {
      logger.error('❌ Erreur ajout hydratation:', error);
    }
  }

  /**
   * Gérer l'ajout de poids depuis la watch
   */
  private async handleWeightFromWatch(weight: number) {
    try {
      // TODO: Utiliser ta fonction addWeight() du database.ts
      // Pour l'instant, on met juste à jour le poids actuel
      await AsyncStorage.setItem('@yoroi_current_weight', weight.toString());

      logger.info(`⚖️ Poids mis à jour: ${weight}kg`);

      // Re-sync vers la watch
      await this.syncToWatch();
    } catch (error) {
      logger.error('❌ Erreur ajout poids:', error);
    }
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  /**
   * Vérifier si la watch est connectée
   */
  async checkWatchStatus(): Promise<WatchStatus | null> {
    if (!WatchBridge) {
      return null;
    }

    try {
      const status = await WatchBridge.isWatchReachable();
      return status;
    } catch (error) {
      logger.error('❌ Erreur vérification watch:', error);
      return null;
    }
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const appleWatchService = new AppleWatchService();
