//
// appleWatchService.ts
// Service pour communiquer avec l'Apple Watch via WatchConnectivityBridge
//

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';
import { addWeight } from './database';

// CORRECTION: Utiliser WatchConnectivityBridge au lieu de WatchBridge qui n'existe pas!
const WatchConnectivityBridge = Platform.OS === 'ios' ? NativeModules.WatchConnectivityBridge : null;
const watchEmitter = WatchConnectivityBridge ? new NativeEventEmitter(WatchConnectivityBridge) : null;

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

  // Avatar et Profil
  userName?: string;
  avatarConfig?: any;
  profilePhotoBase64?: string;
  level?: number;
  rank?: string;

  // Timestamp
  timestamp: number;
}

export interface WatchStatus {
  isReachable: boolean;
  isPaired: boolean;
  isWatchAppInstalled: boolean;
}

// ============================================
// DEDUPLICATION KEYS
// ============================================

const LAST_HYDRATION_KEY = '@yoroi_watch_last_hydration_ts';
const LAST_WEIGHT_KEY = '@yoroi_watch_last_weight_ts';
const DEDUP_WINDOW_MS = 5000; // 5 secondes de fenetre anti-doublon

// ============================================
// APPLE WATCH SERVICE
// ============================================

class AppleWatchService {
  private listeners: Map<string, any> = new Map();
  private processingHydration = false;
  private processingWeight = false;
  private syncInterval: NodeJS.Timeout | null = null;

  // ============================================
  // INITIALISATION
  // ============================================

  /**
   * Initialiser le service et écouter les événements de la watch
   */
  async init() {
    if (!WatchConnectivityBridge) {
      logger.warn('⚠️ WatchConnectivityBridge non disponible (pas iOS ou module absent)');
      return;
    }

    logger.info('🎯 Initialisation AppleWatchService avec WatchConnectivityBridge');

    try {
      // Activer la session WatchConnectivity
      const activated = await WatchConnectivityBridge.activateSession();
      if (activated) {
        logger.info('✅ WatchConnectivity session activée');
      }

      // Vérifier si Watch disponible
      const isAvailable = await WatchConnectivityBridge.isWatchAvailable();
      logger.info(`📱 Watch disponible: ${isAvailable}`);

      // Écouter les changements de reachability
      this.listeners.set(
        'onWatchReachabilityChanged',
        watchEmitter?.addListener('onWatchReachabilityChanged', (status: WatchStatus) => {
          logger.info('🔄 État watch changé:', status);
          if (status.isReachable) {
            // Watch à portée, sync immédiate!
            this.syncToWatch();
          }
        })
      );

      // Écouter les messages de la watch
      this.listeners.set(
        'onWatchMessageReceived',
        watchEmitter?.addListener('onWatchMessageReceived', async (message: any) => {
          logger.info('📩 Message reçu de la watch:', message);

          // Traiter les actions depuis la watch
          if (message.action === 'syncRequest') {
            await this.syncToWatch();
          } else if (message.action === 'addHydration') {
            await this.handleHydrationFromWatch(message.amount, message.timestamp);
          } else if (message.action === 'addWeight') {
            await this.handleWeightFromWatch(message.weight, message.timestamp);
          }
        })
      );

      // Écouter les données reçues
      this.listeners.set(
        'onWatchDataReceived',
        watchEmitter?.addListener('onWatchDataReceived', async (event: any) => {
          logger.info('📦 Données reçues de la watch:', event);
        })
      );

      // Écouter les erreurs
      this.listeners.set(
        'onWatchError',
        watchEmitter?.addListener('onWatchError', (error: any) => {
          logger.error('❌ Erreur WatchConnectivity:', error);
        })
      );

      // Sync initiale
      await this.syncToWatch();

      // Auto-sync toutes les 30 secondes si Watch reachable
      this.syncInterval = setInterval(async () => {
        try {
          const isReachable = await WatchConnectivityBridge.isWatchReachable();
          if (isReachable) {
            await this.syncToWatch();
          }
        } catch (error) {
          // Ignore errors during auto-sync
        }
      }, 30000);

      logger.info('✅ AppleWatchService initialisé avec succès');
    } catch (error) {
      logger.error('❌ Erreur initialisation AppleWatchService:', error);
    }
  }

  /**
   * Nettoyer les listeners
   */
  cleanup() {
    this.listeners.forEach((listener) => listener?.remove());
    this.listeners.clear();

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // ============================================
  // SYNCHRONISATION VERS LA WATCH
  // ============================================

  /**
   * Envoyer les données actuelles à la watch
   */
  async syncToWatch() {
    if (!WatchConnectivityBridge) {
      return;
    }

    try {
      // Récupérer les données depuis AsyncStorage
      const watchData = await this.prepareWatchData();

      // IMPORTANT: Utiliser updateApplicationContext pour sync robuste
      // Les données seront reçues par la Watch même si elle est hors de portée
      const success = await WatchConnectivityBridge.updateApplicationContext(watchData);

      if (success) {
        logger.info('✅ Données synchronisées vers la watch via updateApplicationContext');
        logger.info(`   - Poids: ${watchData.currentWeight}kg`);
        logger.info(`   - Hydratation: ${watchData.hydrationCurrent}/${watchData.hydrationGoal}ml`);
        logger.info(`   - User: ${watchData.userName || 'N/A'}`);
      }
    } catch (error) {
      logger.error('❌ Erreur sync vers watch:', error);
    }
  }

  /**
   * Préparer les données à envoyer à la watch (MEGA-PACK complet)
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
      try {
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
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Pas
    const stepsGoal = parseInt(await AsyncStorage.getItem('@yoroi_steps_goal') || '8000');

    // Avatar et Profil
    const userName = await AsyncStorage.getItem('@yoroi_user_name') || undefined;
    const avatarConfigStr = await AsyncStorage.getItem('@yoroi_avatar_config');
    const avatarConfig = avatarConfigStr ? JSON.parse(avatarConfigStr) : undefined;
    const profilePhotoBase64 = await AsyncStorage.getItem('@yoroi_profile_photo_base64') || undefined;
    const level = parseInt(await AsyncStorage.getItem('@yoroi_user_level') || '1');
    const rank = await AsyncStorage.getItem('@yoroi_user_rank') || 'Débutant';

    return {
      // Santé
      hydrationCurrent,
      hydrationGoal,
      currentWeight,
      targetWeight,
      sleepDuration: sleepData.duration,
      sleepQuality: sleepData.quality,
      sleepBedTime: sleepData.bedTime,
      sleepWakeTime: sleepData.wakeTime,
      stepsGoal,

      // Profil
      userName,
      avatarConfig,
      profilePhotoBase64,
      level,
      rank,

      timestamp: Date.now(),
    };
  }

  // ============================================
  // GESTION DES ACTIONS DEPUIS LA WATCH
  // ============================================

  /**
   * Gerer l'ajout d'hydratation depuis la watch avec deduplication
   */
  private async handleHydrationFromWatch(amount: number, timestamp?: number) {
    // Anti-double traitement simultane
    if (this.processingHydration) {
      logger.warn('Hydratation en cours de traitement, ignore');
      return;
    }

    try {
      this.processingHydration = true;
      const now = Date.now();
      const eventTs = timestamp || now;

      // Verifier la deduplication par timestamp
      const lastTsStr = await AsyncStorage.getItem(LAST_HYDRATION_KEY);
      const lastTs = lastTsStr ? parseInt(lastTsStr) : 0;

      // Si le meme evenement dans la fenetre de dedup, ignorer
      if (eventTs <= lastTs || (now - lastTs) < DEDUP_WINDOW_MS) {
        logger.warn(`Doublon hydratation detecte (lastTs=${lastTs}, eventTs=${eventTs}), ignore`);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const currentStr = await AsyncStorage.getItem(`hydration_${today}`);
      const current = parseInt(currentStr || '0');
      const newTotal = current + amount;

      // Sauvegarder avec le timestamp pour deduplication
      await AsyncStorage.setItem(`hydration_${today}`, newTotal.toString());
      await AsyncStorage.setItem(LAST_HYDRATION_KEY, now.toString());

      logger.info(`✅ Hydratation mise a jour: ${current}ml -> ${newTotal}ml`);

      // Re-sync vers la watch avec les nouvelles donnees
      await this.syncToWatch();
    } catch (error) {
      logger.error('❌ Erreur ajout hydratation:', error);
    } finally {
      this.processingHydration = false;
    }
  }

  /**
   * Gerer l'ajout de poids depuis la watch avec deduplication
   */
  private async handleWeightFromWatch(weight: number, timestamp?: number) {
    // Anti-double traitement simultane
    if (this.processingWeight) {
      logger.warn('Poids en cours de traitement, ignore');
      return;
    }

    try {
      this.processingWeight = true;
      const now = Date.now();
      const eventTs = timestamp || now;

      // Verifier la deduplication par timestamp
      const lastTsStr = await AsyncStorage.getItem(LAST_WEIGHT_KEY);
      const lastTs = lastTsStr ? parseInt(lastTsStr) : 0;

      // Si le meme evenement dans la fenetre de dedup, ignorer
      if (eventTs <= lastTs || (now - lastTs) < DEDUP_WINDOW_MS) {
        logger.warn(`Doublon poids detecte (lastTs=${lastTs}, eventTs=${eventTs}), ignore`);
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Sauvegarder dans la base de donnees SQLite
      await addWeight({
        weight,
        source: 'apple',
        date: today,
      });

      // Aussi mettre a jour le cache AsyncStorage pour acces rapide
      await AsyncStorage.setItem('@yoroi_current_weight', weight.toString());
      await AsyncStorage.setItem(LAST_WEIGHT_KEY, now.toString());

      logger.info(`✅ Poids sauvegarde dans la DB: ${weight}kg`);

      // Re-sync vers la watch
      await this.syncToWatch();
    } catch (error) {
      logger.error('❌ Erreur ajout poids:', error);
    } finally {
      this.processingWeight = false;
    }
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  /**
   * Vérifier si la watch est connectée
   */
  async checkWatchStatus(): Promise<WatchStatus | null> {
    if (!WatchConnectivityBridge) {
      return null;
    }

    try {
      const isReachable = await WatchConnectivityBridge.isWatchReachable();
      const isAvailable = await WatchConnectivityBridge.isWatchAvailable();

      return {
        isReachable,
        isPaired: isAvailable,
        isWatchAppInstalled: isAvailable,
      };
    } catch (error) {
      logger.error('❌ Erreur vérification watch:', error);
      return null;
    }
  }

  /**
   * Force la synchronisation immédiate (pour les settings de la Watch par exemple)
   */
  async forceSyncNow() {
    logger.info('🔄 Force sync demandée');
    await this.syncToWatch();
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const appleWatchService = new AppleWatchService();
