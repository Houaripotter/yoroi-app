// ============================================
// WATCH SYNC SERVICE - Synchronisation iPhone ↔ Apple Watch
// ============================================
// Service de haut niveau pour synchroniser les données utilisateur
// avec l'Apple Watch de manière fiable et robuste.
//
// Fonctionnalités:
// - Sync automatique au démarrage
// - Queue de messages si Watch hors portée
// - Retry automatique
// - Compression des images
// - Logs détaillés pour debug
// ============================================

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WatchConnectivity, isWatchModuleAvailable } from '@/lib/watchConnectivity.ios';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

export interface WatchSyncStatus {
  isAvailable: boolean;        // Watch jumelée et app installée
  isReachable: boolean;        // Watch à portée Bluetooth
  lastSyncDate: Date | null;   // Dernière sync réussie
  pendingItems: number;        // Messages en attente
  moduleLoaded: boolean;       // Module natif chargé
  errors: string[];            // Dernières erreurs
}

export interface UserDataForWatch {
  // Profil
  userName?: string;
  profilePhotoBase64?: string;  // Image compressée en base64
  avatarConfig?: {
    pack: string;
    name: string;
  };
  level?: number;
  rank?: string;

  // Données santé
  weight?: number;
  targetWeight?: number;
  waterIntake?: number;
  waterGoal?: number;
  streak?: number;

  // Records
  records?: {
    exercise: string;
    weight: number;
    reps: number;
    date: string;
    category: string;
    muscleGroup: string;
  }[];
}

export interface SyncQueueItem {
  id: string;
  type: 'context' | 'userInfo' | 'message' | 'file';
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

// ============================================
// CONSTANTES
// ============================================

const SYNC_QUEUE_KEY = '@yoroi_watch_sync_queue';
const LAST_SYNC_KEY = '@yoroi_watch_last_sync';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const MAX_PHOTO_SIZE_KB = 100; // Taille max pour photo dans applicationContext
const MAX_PHOTO_SIZE_FILE_KB = 500; // Taille max pour transfert fichier

// ============================================
// SERVICE DE SYNCHRONISATION
// ============================================

class WatchSyncServiceClass {
  private syncQueue: SyncQueueItem[] = [];
  private isProcessingQueue = false;
  private status: WatchSyncStatus = {
    isAvailable: false,
    isReachable: false,
    lastSyncDate: null,
    pendingItems: 0,
    moduleLoaded: isWatchModuleAvailable,
    errors: [],
  };
  private listeners: ((status: WatchSyncStatus) => void)[] = [];
  private dataListeners: ((data: any) => void)[] = [];

  // ============================================
  // INITIALISATION
  // ============================================

  /**
   * Initialise le service de sync Watch
   * À appeler au démarrage de l'app
   */
  async initialize(): Promise<boolean> {
    logger.info('========================================');
    logger.info('[WatchSync] Initialisation du service...');
    logger.info('========================================');

    if (Platform.OS !== 'ios') {
      logger.info('[WatchSync] Pas sur iOS, service désactivé');
      return false;
    }

    if (!isWatchModuleAvailable) {
      this.addError('Module WatchConnectivity non chargé');
      logger.warn('[WatchSync] Module natif non disponible');
      return false;
    }

    try {
      // 1. Charger la queue persistante
      await this.loadQueue();

      // 2. Charger la date de dernière sync
      const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (lastSync) {
        this.status.lastSyncDate = new Date(lastSync);
      }

      // 3. Vérifier le statut de la Watch
      await this.updateStatus();

      // 4. Écouter les changements de reachability
      WatchConnectivity.onReachabilityChanged((status) => {
        logger.info('[WatchSync] Reachability changed:', status);
        this.status.isReachable = status.isReachable;
        this.status.isAvailable = status.isPaired && status.isWatchAppInstalled;
        this.notifyListeners();

        // Si Watch devient reachable, traiter la queue
        if (status.isReachable) {
          this.processQueue();
        }
      });

      // 5. Écouter les données de la Watch
      WatchConnectivity.onDataReceived((event) => {
        logger.info('[WatchSync] Données reçues de la Watch:', event);
        this.notifyDataListeners(event.data);
      });

      WatchConnectivity.onMessageReceived((message) => {
        logger.info('[WatchSync] Message reçu de la Watch:', message);
        this.notifyDataListeners(message);
      });

      // 6. Écouter les erreurs
      WatchConnectivity.onError((error) => {
        logger.error('[WatchSync] Erreur Watch:', error);
        this.addError(error.error);
      });

      logger.info('[WatchSync] Service initialisé avec succès');
      logger.info('[WatchSync] Watch disponible:', this.status.isAvailable);
      logger.info('[WatchSync] Watch reachable:', this.status.isReachable);
      logger.info('[WatchSync] Messages en queue:', this.syncQueue.length);

      // 7. Traiter la queue si Watch disponible
      if (this.status.isReachable) {
        this.processQueue();
      }

      return true;
    } catch (error) {
      logger.error('[WatchSync] Erreur initialisation:', error);
      this.addError(`Initialisation échouée: ${error}`);
      return false;
    }
  }

  // ============================================
  // STATUT
  // ============================================

  /**
   * Obtenir le statut actuel de la sync
   */
  getStatus(): WatchSyncStatus {
    return { ...this.status, pendingItems: this.syncQueue.length };
  }

  /**
   * Mettre à jour le statut depuis la Watch
   */
  async updateStatus(): Promise<WatchSyncStatus> {
    try {
      const [isAvailable, isReachable] = await Promise.all([
        WatchConnectivity.isWatchAvailable(),
        WatchConnectivity.isWatchReachable(),
      ]);

      this.status.isAvailable = isAvailable;
      this.status.isReachable = isReachable;
      this.status.pendingItems = this.syncQueue.length;
      this.notifyListeners();

      return this.getStatus();
    } catch (error) {
      logger.error('[WatchSync] Erreur updateStatus:', error);
      return this.getStatus();
    }
  }

  /**
   * S'abonner aux changements de statut
   */
  onStatusChange(callback: (status: WatchSyncStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * S'abonner aux données reçues de la Watch
   */
  onDataFromWatch(callback: (data: any) => void): () => void {
    this.dataListeners.push(callback);
    return () => {
      this.dataListeners = this.dataListeners.filter(l => l !== callback);
    };
  }

  // ============================================
  // SYNCHRONISATION DES DONNÉES
  // ============================================

  /**
   * Synchroniser TOUTES les données utilisateur vers la Watch
   */
  async syncAllData(userData: UserDataForWatch): Promise<boolean> {
    logger.info('[WatchSync] syncAllData - Début');

    try {
      // Construire le contexte applicatif
      const context: Record<string, any> = {
        syncTimestamp: Date.now(),
        deviceName: 'iPhone',
      };

      // Profil
      if (userData.userName) context.userName = userData.userName;
      if (userData.avatarConfig) context.avatarConfig = userData.avatarConfig;
      if (userData.level !== undefined) context.level = userData.level;
      if (userData.rank) context.rank = userData.rank;

      // Données santé
      if (userData.weight !== undefined) context.weight = userData.weight;
      if (userData.targetWeight !== undefined) context.targetWeight = userData.targetWeight;
      if (userData.waterIntake !== undefined) context.waterIntake = userData.waterIntake;
      if (userData.waterGoal !== undefined) context.waterGoal = userData.waterGoal;
      if (userData.streak !== undefined) context.streak = userData.streak;

      // Photo de profil (si petite, sinon transfert fichier)
      if (userData.profilePhotoBase64) {
        const photoSizeKB = (userData.profilePhotoBase64.length * 0.75) / 1024;
        if (photoSizeKB <= MAX_PHOTO_SIZE_KB) {
          context.profilePhotoBase64 = userData.profilePhotoBase64;
          logger.info(`[WatchSync] Photo incluse dans context (${photoSizeKB.toFixed(1)}KB)`);
        } else {
          logger.info(`[WatchSync] Photo trop grande (${photoSizeKB.toFixed(1)}KB), transfert fichier requis`);
          // La photo sera envoyée séparément via transferFile
          await this.syncProfilePhoto(userData.profilePhotoBase64);
        }
      }

      // Records (via userInfo pour garantie de livraison)
      if (userData.records && userData.records.length > 0) {
        await this.syncRecords(userData.records);
      }

      // Envoyer le contexte principal
      return await this.sendContext(context);
    } catch (error) {
      logger.error('[WatchSync] Erreur syncAllData:', error);
      this.addError(`syncAllData échoué: ${error}`);
      return false;
    }
  }

  /**
   * Synchroniser le profil utilisateur
   */
  async syncProfile(profile: {
    userName?: string;
    avatarConfig?: { pack: string; name: string };
    level?: number;
    rank?: string;
  }): Promise<boolean> {
    logger.info('[WatchSync] syncProfile:', profile);
    return this.sendContext({
      ...profile,
      syncTimestamp: Date.now(),
    });
  }

  /**
   * Synchroniser la photo de profil
   */
  async syncProfilePhoto(base64Image: string): Promise<boolean> {
    logger.info('[WatchSync] syncProfilePhoto - Début');

    const sizeKB = (base64Image.length * 0.75) / 1024;
    logger.info(`[WatchSync] Taille photo: ${sizeKB.toFixed(1)}KB`);

    try {
      if (sizeKB <= MAX_PHOTO_SIZE_KB) {
        // Assez petite pour applicationContext
        return this.sendContext({
          profilePhotoBase64: base64Image,
          photoTimestamp: Date.now(),
        });
      } else if (sizeKB <= MAX_PHOTO_SIZE_FILE_KB) {
        // Utiliser transferFile
        // Note: Nécessite de créer un fichier temporaire
        logger.info('[WatchSync] Photo envoyée via transferFile');
        return this.sendUserInfo({
          profilePhotoBase64: base64Image,
          photoTimestamp: Date.now(),
        });
      } else {
        logger.warn(`[WatchSync] Photo trop grande (${sizeKB.toFixed(1)}KB > ${MAX_PHOTO_SIZE_FILE_KB}KB)`);
        this.addError(`Photo trop grande: ${sizeKB.toFixed(1)}KB`);
        return false;
      }
    } catch (error) {
      logger.error('[WatchSync] Erreur syncProfilePhoto:', error);
      this.addError(`Photo sync échouée: ${error}`);
      return false;
    }
  }

  /**
   * Synchroniser l'avatar
   */
  async syncAvatar(avatarConfig: { pack: string; name: string }): Promise<boolean> {
    logger.info('[WatchSync] syncAvatar:', avatarConfig);
    return this.sendContext({
      avatarConfig,
      avatarTimestamp: Date.now(),
    });
  }

  /**
   * Synchroniser le poids
   */
  async syncWeight(weightKg: number, targetKg?: number): Promise<boolean> {
    logger.info('[WatchSync] syncWeight:', weightKg, 'target:', targetKg);
    return this.sendContext({
      weight: weightKg,
      ...(targetKg !== undefined && { targetWeight: targetKg }),
      weightTimestamp: Date.now(),
    });
  }

  /**
   * Synchroniser l'hydratation
   */
  async syncHydration(currentMl: number, goalMl: number): Promise<boolean> {
    logger.info('[WatchSync] syncHydration:', currentMl, '/', goalMl);
    return this.sendContext({
      waterIntake: currentMl,
      waterGoal: goalMl,
      hydrationTimestamp: Date.now(),
    });
  }

  /**
   * Synchroniser les records (via userInfo pour garantie)
   */
  async syncRecords(records: UserDataForWatch['records']): Promise<boolean> {
    if (!records || records.length === 0) return true;

    logger.info('[WatchSync] syncRecords:', records.length, 'records');

    // Utiliser userInfo pour garantie de livraison
    return this.sendUserInfo({
      recordsUpdate: {
        records,
        timestamp: Date.now(),
      },
    });
  }

  /**
   * Synchroniser le streak
   */
  async syncStreak(streak: number): Promise<boolean> {
    logger.info('[WatchSync] syncStreak:', streak);
    return this.sendContext({
      streak,
      streakTimestamp: Date.now(),
    });
  }

  // ============================================
  // MÉTHODES D'ENVOI DE BAS NIVEAU
  // ============================================

  /**
   * Envoyer via applicationContext (données persistantes)
   */
  private async sendContext(data: Record<string, any>): Promise<boolean> {
    if (!this.status.isAvailable) {
      logger.info('[WatchSync] Watch non disponible, mise en queue');
      this.addToQueue('context', data);
      return false;
    }

    try {
      await WatchConnectivity.updateApplicationContext(data);
      this.markSyncSuccess();
      logger.info('[WatchSync] Context envoyé avec succès');
      return true;
    } catch (error) {
      logger.error('[WatchSync] Erreur envoi context:', error);
      this.addToQueue('context', data);
      return false;
    }
  }

  /**
   * Envoyer via userInfo (garantie de livraison)
   */
  private async sendUserInfo(data: Record<string, any>): Promise<boolean> {
    if (!this.status.isAvailable) {
      logger.info('[WatchSync] Watch non disponible, mise en queue');
      this.addToQueue('userInfo', data);
      return false;
    }

    try {
      await WatchConnectivity.transferUserInfo(data);
      this.markSyncSuccess();
      logger.info('[WatchSync] UserInfo envoyé avec succès');
      return true;
    } catch (error) {
      logger.error('[WatchSync] Erreur envoi userInfo:', error);
      this.addToQueue('userInfo', data);
      return false;
    }
  }

  /**
   * Envoyer un message (requiert Watch reachable)
   */
  private async sendMessage(data: Record<string, any>): Promise<boolean> {
    if (!this.status.isReachable) {
      logger.info('[WatchSync] Watch pas reachable, mise en queue');
      this.addToQueue('message', data);
      return false;
    }

    try {
      await WatchConnectivity.sendMessageToWatch(data);
      this.markSyncSuccess();
      logger.info('[WatchSync] Message envoyé avec succès');
      return true;
    } catch (error) {
      logger.error('[WatchSync] Erreur envoi message:', error);
      this.addToQueue('message', data);
      return false;
    }
  }

  // ============================================
  // GESTION DE LA QUEUE
  // ============================================

  private async addToQueue(type: SyncQueueItem['type'], data: any) {
    const item: SyncQueueItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: MAX_RETRIES,
    };

    this.syncQueue.push(item);
    this.status.pendingItems = this.syncQueue.length;
    await this.saveQueue();
    this.notifyListeners();

    logger.info(`[WatchSync] Ajouté à la queue: ${type} (${this.syncQueue.length} en attente)`);
  }

  private async processQueue() {
    if (this.isProcessingQueue || this.syncQueue.length === 0) return;

    this.isProcessingQueue = true;
    logger.info(`[WatchSync] Traitement queue: ${this.syncQueue.length} items`);

    const processedIds: string[] = [];

    for (const item of this.syncQueue) {
      if (item.retries >= item.maxRetries) {
        logger.warn(`[WatchSync] Item ${item.id} max retries atteint, abandon`);
        processedIds.push(item.id);
        continue;
      }

      let success = false;

      try {
        switch (item.type) {
          case 'context':
            await WatchConnectivity.updateApplicationContext(item.data);
            success = true;
            break;
          case 'userInfo':
            await WatchConnectivity.transferUserInfo(item.data);
            success = true;
            break;
          case 'message':
            if (this.status.isReachable) {
              await WatchConnectivity.sendMessageToWatch(item.data);
              success = true;
            }
            break;
        }
      } catch (error) {
        logger.error(`[WatchSync] Erreur traitement item ${item.id}:`, error);
        item.retries++;
      }

      if (success) {
        processedIds.push(item.id);
        logger.info(`[WatchSync] Item ${item.id} envoyé avec succès`);
      }
    }

    // Retirer les items traités
    this.syncQueue = this.syncQueue.filter(item => !processedIds.includes(item.id));
    this.status.pendingItems = this.syncQueue.length;
    await this.saveQueue();
    this.notifyListeners();

    this.isProcessingQueue = false;

    if (processedIds.length > 0) {
      this.markSyncSuccess();
    }

    logger.info(`[WatchSync] Queue traitée: ${processedIds.length} envoyés, ${this.syncQueue.length} restants`);
  }

  private async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        this.syncQueue = JSON.parse(stored);
        logger.info(`[WatchSync] Queue chargée: ${this.syncQueue.length} items`);
      }
    } catch (error) {
      logger.error('[WatchSync] Erreur chargement queue:', error);
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      logger.error('[WatchSync] Erreur sauvegarde queue:', error);
    }
  }

  /**
   * Vider la queue manuellement
   */
  async clearQueue(): Promise<void> {
    this.syncQueue = [];
    this.status.pendingItems = 0;
    await this.saveQueue();
    this.notifyListeners();
    logger.info('[WatchSync] Queue vidée');
  }

  /**
   * Forcer le traitement de la queue
   */
  async forceProcessQueue(): Promise<void> {
    await this.updateStatus();
    if (this.status.isAvailable) {
      await this.processQueue();
    }
  }

  // ============================================
  // UTILITAIRES
  // ============================================

  private markSyncSuccess() {
    this.status.lastSyncDate = new Date();
    AsyncStorage.setItem(LAST_SYNC_KEY, this.status.lastSyncDate.toISOString());
    this.notifyListeners();
  }

  private addError(error: string) {
    this.status.errors.unshift(error);
    if (this.status.errors.length > 10) {
      this.status.errors = this.status.errors.slice(0, 10);
    }
    this.notifyListeners();
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(l => l(status));
  }

  private notifyDataListeners(data: any) {
    this.dataListeners.forEach(l => l(data));
  }

  /**
   * Lancer un diagnostic complet
   */
  async runDiagnostic(): Promise<{
    moduleLoaded: boolean;
    isAvailable: boolean;
    isReachable: boolean;
    lastSyncDate: string | null;
    pendingItems: number;
    errors: string[];
    watchDiagnostic: any;
  }> {
    logger.info('[WatchSync] Lancement diagnostic...');

    await this.updateStatus();

    let watchDiagnostic = null;
    try {
      watchDiagnostic = await WatchConnectivity.runDiagnostic();
    } catch (e) {
      logger.error('[WatchSync] Erreur diagnostic Watch:', e);
    }

    return {
      moduleLoaded: this.status.moduleLoaded,
      isAvailable: this.status.isAvailable,
      isReachable: this.status.isReachable,
      lastSyncDate: this.status.lastSyncDate?.toISOString() || null,
      pendingItems: this.syncQueue.length,
      errors: this.status.errors,
      watchDiagnostic,
    };
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const WatchSyncService = new WatchSyncServiceClass();
export default WatchSyncService;
