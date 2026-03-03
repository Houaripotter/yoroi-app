/**
 * WatchConnectivityProvider
 *
 * Provider global pour gérer la communication iPhone ↔ Apple Watch
 * Sync automatique des données: poids, hydratation, workouts, records
 *
 * AMÉLIORATIONS COMPLÈTES:
 * - Retry automatique avec exponential backoff
 * - Validation données avant envoi
 * - Gestion erreurs catégorisée
 * - Logging détaillé avec timestamps
 * - Optimisation taille megaPack
 * - UX feedback amélioré
 * - Queue locale persistante (NOUVEAU)
 * - Récupération Watch→iPhone au démarrage (NOUVEAU)
 * - Versioning des données (NOUVEAU)
 * - Throttling individuel par type (NOUVEAU)
 * - Gestion ordre des messages (NOUVEAU)
 */

import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Platform, Animated, View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { WatchConnectivity } from '@/lib/watchConnectivity.ios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';
import { addWeight, getProfile } from '@/lib/database';
import { getBenchmarks, addBenchmarkEntry } from '@/lib/carnetService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Device from 'expo-device';

// VERSIONING
const APP_VERSION = '2.0.0';
const MIN_WATCH_VERSION = '1.5.0';
const DATA_FORMAT_VERSION = '2.0';

// STORAGE KEYS
const STORAGE_KEYS = {
  PENDING_SYNCS: '@yoroi_pending_watch_syncs',
  MESSAGE_QUEUE: '@yoroi_watch_message_queue',
  PROCESSED_IDS: '@yoroi_processed_message_ids',
  LAST_SYNC_TIMESTAMPS: '@yoroi_last_sync_timestamps',
};

// THROTTLING
const MIN_SYNC_INTERVAL = 1000; // 1 seconde minimum entre syncs du même type

// Types
export interface WatchContextType {
  isWatchAvailable: boolean;
  isWatchReachable: boolean;
  lastError: string | null;
  lastSyncDate: Date | null;
  isSyncing: boolean;
  pendingSyncsCount: number;
  syncWeight: (weight: number) => Promise<void>;
  syncHydration: (waterIntake: number) => Promise<void>;
  syncWorkout: (workout: any) => Promise<void>;
  syncRecords: (records: any[]) => Promise<void>;
  syncAllData: () => Promise<void>;
  watchData: any;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
type ErrorCategory = 'network' | 'timeout' | 'data' | 'unavailable' | 'unknown';

interface PendingSync {
  type: 'weight' | 'hydration' | 'workout' | 'records';
  data: any;
  timestamp: number;
  retries: number;
}

interface QueuedMessage {
  id: string;
  message: any;
  timestamp: number;
  receivedAt: number;
}

const WatchContext = createContext<WatchContextType | null>(null);

// VALIDATION: Validation des données avant envoi
const validateSyncData = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Validation poids
  if (data.weight !== undefined) {
    const weight = parseFloat(data.weight);
    if (isNaN(weight) || weight <= 0 || weight > 300) {
      errors.push('Poids invalide (doit être entre 0 et 300kg)');
    }
  }

  // Validation hydratation
  if (data.waterIntake !== undefined) {
    const water = parseFloat(data.waterIntake);
    if (isNaN(water) || water < 0 || water > 10000) {
      errors.push('Hydratation invalide (doit être entre 0 et 10L)');
    }
  }

  // Validation streak
  if (data.streak !== undefined) {
    const streak = parseInt(data.streak);
    if (isNaN(streak) || streak < 0 || streak > 10000) {
      errors.push('Streak invalide');
    }
  }

  // Validation level
  if (data.level !== undefined) {
    const level = parseInt(data.level);
    if (isNaN(level) || level < 1 || level > 100) {
      errors.push('Niveau invalide (doit être entre 1 et 100)');
    }
  }

  return { valid: errors.length === 0, errors };
};

// GESTION ERREURS: Catégorisation des erreurs
const categorizeError = (error: any): { category: ErrorCategory; message: string; userMessage: string } => {
  const errorStr = String(error?.message || error || '').toLowerCase();

  if (errorStr.includes('not_reachable') || errorStr.includes('not reachable')) {
    return {
      category: 'unavailable',
      message: errorStr,
      userMessage: 'Apple Watch non accessible. Assurez-vous que la Watch est à proximité et déverrouillée.'
    };
  }

  if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
    return {
      category: 'timeout',
      message: errorStr,
      userMessage: 'Délai de connexion dépassé. Réessayez dans quelques instants.'
    };
  }

  if (errorStr.includes('not_activated') || errorStr.includes('not_supported')) {
    return {
      category: 'unavailable',
      message: errorStr,
      userMessage: 'Apple Watch non configurée. Vérifiez le jumelage dans l\'app Watch.'
    };
  }

  if (errorStr.includes('invalid') || errorStr.includes('validation')) {
    return {
      category: 'data',
      message: errorStr,
      userMessage: '' // Silencieux - pas de banner pour les erreurs de validation
    };
  }

  if (errorStr.includes('network') || errorStr.includes('connection')) {
    return {
      category: 'network',
      message: errorStr,
      userMessage: 'Problème de connexion. Vérifiez votre Bluetooth.'
    };
  }

  return {
    category: 'unknown',
    message: errorStr,
    userMessage: 'Erreur de synchronisation. Réessayez plus tard.'
  };
};

// VERSIONING: Comparaison de versions
const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

export function WatchConnectivityProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isReachable, setIsReachable] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [watchData, setWatchData] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncsCount, setPendingSyncsCount] = useState(0);

  // Animation de la bannière
  const bannerAnim = useRef(new Animated.Value(-100)).current;
  const [syncMessage, setSyncMessage] = useState('');
  const [bannerIcon, setBannerIcon] = useState('watch');
  const [bannerColor, setBannerColor] = useState('#4ade80');

  // NOUVEAU : Refs pour throttling et queue
  const lastSyncTimestamps = useRef<Record<string, number>>({});
  const processedMessageIds = useRef<Set<string>>(new Set());
  const MAX_PROCESSED_IDS = 200;
  const syncDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // UX FEEDBACK: Bannière améliorée avec icônes et couleurs
  const showSyncBanner = useCallback((message: string, type: 'info' | 'success' | 'error' | 'loading' = 'info') => {
    if (!message || message.trim() === '') return; // Ne pas afficher de banner vide
    setSyncMessage(message);

    // Icônes et couleurs selon le type
    switch (type) {
      case 'loading':
        setBannerIcon('sync');
        setBannerColor('#3b82f6'); // Bleu
        break;
      case 'success':
        setBannerIcon('check-circle');
        setBannerColor('#4ade80'); // Vert
        break;
      case 'error':
        setBannerIcon('alert-circle');
        setBannerColor('#ef4444'); // Rouge
        break;
      default:
        setBannerIcon('watch');
        setBannerColor('#8b5cf6'); // Violet
    }

    Animated.sequence([
      Animated.spring(bannerAnim, { toValue: 50, useNativeDriver: true, speed: 12 }),
      Animated.delay(type === 'error' ? 3000 : 2000),
      Animated.timing(bannerAnim, { toValue: -100, duration: 500, useNativeDriver: true })
    ]).start();
  }, [bannerAnim]);

  // LOGGING: Logger détaillé avec timestamps
  const logSync = useCallback((action: string, details?: any) => {
    const timestamp = new Date().toISOString();
    const log = `[Watch ${timestamp}] ${action}`;

    if (details) {
      logger.info(log, details);
    } else {
      logger.info(log);
    }
  }, []);

  // RETRY: Tentative avec exponential backoff
  const retryWithBackoff = useCallback(async <T,>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    operation: string = 'operation'
  ): Promise<T> => {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logSync(`${operation} - Tentative ${attempt}/${maxRetries}`);
        const result = await fn();

        if (attempt > 1) {
          logSync(`${operation} - Réussi après ${attempt} tentatives`);
        }

        return result;
      } catch (error) {
        lastError = error;
        const { category } = categorizeError(error);

        logSync(`${operation} - Échec tentative ${attempt}`, { error: category });

        // Ne pas retry si l'erreur n'est pas liée au réseau/timeout
        if (category === 'data' || category === 'unavailable') {
          throw error;
        }

        // Dernier essai échoué
        if (attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        logSync(`${operation} - Attente ${delay}ms avant retry`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }, [logSync]);

  // NOUVEAU : Gestion queue locale persistante
  const loadPendingSyncs = useCallback(async (): Promise<PendingSync[]> => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNCS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logSync('loadPendingSyncs - Erreur', error);
      return [];
    }
  }, [logSync]);

  const savePendingSync = useCallback(async (sync: PendingSync) => {
    try {
      const syncs = await loadPendingSyncs();
      syncs.push(sync);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNCS, JSON.stringify(syncs));
      setPendingSyncsCount(syncs.length);
      logSync('savePendingSync', { type: sync.type, count: syncs.length });
    } catch (error) {
      logSync('savePendingSync - Erreur', error);
    }
  }, [loadPendingSyncs, logSync]);

  const processPendingSyncs = useCallback(async () => {
    try {
      const syncs = await loadPendingSyncs();
      if (syncs.length === 0) return;

      logSync('processPendingSyncs - Début', { count: syncs.length });

      const remainingSyncs: PendingSync[] = [];

      for (const sync of syncs) {
        try {
          // Retry avec limite de 5 tentatives
          if (sync.retries >= 5) {
            logSync('processPendingSyncs - Max retries atteint', { type: sync.type });
            continue;
          }

          // Traiter selon le type
          switch (sync.type) {
            case 'weight':
              await syncWeight(sync.data);
              break;
            case 'hydration':
              await syncHydration(sync.data);
              break;
            case 'workout':
              await syncWorkout(sync.data);
              break;
            case 'records':
              await syncRecords(sync.data);
              break;
          }

          logSync('processPendingSyncs - Sync réussi', { type: sync.type });
        } catch (error) {
          logSync('processPendingSyncs - Échec', { type: sync.type, error });
          sync.retries++;
          remainingSyncs.push(sync);
        }
      }

      // Sauvegarder syncs restants
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNCS, JSON.stringify(remainingSyncs));
      setPendingSyncsCount(remainingSyncs.length);

      logSync('processPendingSyncs - Terminé', { processed: syncs.length - remainingSyncs.length, remaining: remainingSyncs.length });
    } catch (error) {
      logSync('processPendingSyncs - Erreur', error);
    }
  }, [loadPendingSyncs, logSync]);

  // NOUVEAU : Récupération Watch→iPhone au démarrage
  const retrieveWatchData = useCallback(async () => {
    try {
      logSync('retrieveWatchData - Début');

      const context = await WatchConnectivity.getReceivedApplicationContext();

      if (!context || Object.keys(context).length === 0) {
        logSync('retrieveWatchData - Aucune donnée');
        return;
      }

      logSync('retrieveWatchData - Context reçu', { keys: Object.keys(context) });

      // Traiter workouts en attente
      if (context.pendingWorkouts && Array.isArray(context.pendingWorkouts)) {
        for (const workout of context.pendingWorkouts) {
          await handleWatchMessage({ workoutCompleted: workout });
        }
        logSync('retrieveWatchData - Workouts traités', { count: context.pendingWorkouts.length });
      }

      // Traiter autres données
      if (context.weight) {
        await handleWatchMessage({ weightUpdate: context.weight });
      }

      if (context.hydration) {
        await handleWatchMessage({ hydrationUpdate: context.hydration });
      }

      // Vérifier version Watch
      if (context.watchAppVersion) {
        const watchVersion = context.watchAppVersion;
        if (compareVersions(watchVersion, MIN_WATCH_VERSION) < 0) {
          setLastError(`Version Watch obsolète (${watchVersion}). Mettez à jour l'app Watch.`);
          showSyncBanner('⚠️ Mettez à jour l\'app Watch', 'error');
          logSync('retrieveWatchData - Version obsolète', { watchVersion, minVersion: MIN_WATCH_VERSION });
        } else {
          logSync('retrieveWatchData - Version compatible', { watchVersion });
        }
      }

    } catch (error) {
      logSync('retrieveWatchData - Erreur', error);
    }
  }, [logSync, showSyncBanner]);

  // NOUVEAU : Throttling individuel
  const canSync = useCallback((type: string): boolean => {
    const now = Date.now();
    const lastSync = lastSyncTimestamps.current[type] || 0;

    if (now - lastSync < MIN_SYNC_INTERVAL) {
      logSync(`canSync - Throttled (${type})`, { elapsed: now - lastSync });
      return false;
    }

    lastSyncTimestamps.current[type] = now;
    return true;
  }, [logSync]);

  // NOUVEAU : Gestion ordre des messages
  const handleWatchMessage = useCallback(async (message: any) => {
    try {
      // Générer ID unique
      const messageId = message.id || `${message.type || 'unknown'}_${message.timestamp || Date.now()}`;

      // Vérifier si déjà traité
      if (processedMessageIds.current.has(messageId)) {
        logSync('handleWatchMessage - Déjà traité', { id: messageId });
        return;
      }

      // Borner la taille du Set pour eviter une croissance memoire illimitee
      if (processedMessageIds.current.size >= MAX_PROCESSED_IDS) {
        const idsArray = Array.from(processedMessageIds.current);
        processedMessageIds.current = new Set(idsArray.slice(-100));
      }
      processedMessageIds.current.add(messageId);

      // Stocker dans queue avec timestamp
      const queueData = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGE_QUEUE);
      const queue: QueuedMessage[] = queueData ? JSON.parse(queueData) : [];

      queue.push({
        id: messageId,
        message,
        timestamp: message.timestamp || Date.now(),
        receivedAt: Date.now()
      });

      // TRIER par timestamp
      queue.sort((a, b) => a.timestamp - b.timestamp);

      logSync('handleWatchMessage - Message ajouté à la queue', {
        id: messageId,
        keys: Object.keys(message),
        queueSize: queue.length
      });

      // Traiter dans l'ordre
      for (const item of queue) {
        const msg = item.message;

        if (msg.weightUpdate) {
          showSyncBanner('⚖️ Poids synchronisé', 'success');
          const weight = typeof msg.weightUpdate === 'number' ? msg.weightUpdate : msg.weightUpdate.weight;

          // VALIDATION
          if (weight > 0 && weight <= 300) {
            await addWeight({
              weight,
              date: new Date().toISOString().split('T')[0],
              source: 'apple',
            });
            await AsyncStorage.setItem('currentWeight', String(weight));
            logSync('handleWatchMessage - Poids sauvegardé', { weight });
          } else {
            logSync('handleWatchMessage - Poids invalide', { weight });
          }
        }

        if (msg.hydrationUpdate) {
          showSyncBanner('💧 Hydratation mise à jour', 'success');
          logSync('handleWatchMessage - Hydratation reçue');
        }

        if (msg.newRecordFromWatch || msg.workoutCompleted) {
          showSyncBanner('🏆 Record enregistré', 'success');
          try {
            const record = msg.newRecordFromWatch || msg.workoutCompleted;
            const recordData = typeof record === 'string' ? JSON.parse(record) : record;

            const benchmarks = await getBenchmarks();
            let target = benchmarks.find(b => b.name.toLowerCase() === recordData.exercise.toLowerCase());

            if (target) {
              await addBenchmarkEntry(target.id, recordData.weight, 5, 'Apple Watch', new Date(recordData.date), recordData.reps);
              logSync('handleWatchMessage - Record sauvegardé', { exercise: recordData.exercise });
            }
          } catch (e) {
            logSync('handleWatchMessage - Erreur record', e);
          }
        }

        if (msg.testSignal) {
          showSyncBanner('⌚ Apple Watch connectée', 'info');
          logSync('handleWatchMessage - Test signal reçu');
        }

        if (msg.ping) {
          WatchConnectivity.sendMessageToWatch({ pong: true, timestamp: Date.now(), appVersion: APP_VERSION }).catch(() => {});
          logSync('handleWatchMessage - Pong envoyé');
        }
      }

      // Nettoyer queue après succès
      await AsyncStorage.removeItem(STORAGE_KEYS.MESSAGE_QUEUE);

      // Nettoyer IDs anciens (garder seulement les 1000 derniers)
      if (processedMessageIds.current.size > 1000) {
        const ids = Array.from(processedMessageIds.current);
        processedMessageIds.current = new Set(ids.slice(-1000));
      }

    } catch (error) {
      logSync('handleWatchMessage - Erreur', error);
    }
  }, [showSyncBanner, logSync]);

  // Synchroniser les infos de profil
  const syncProfileToWatch = useCallback(async () => {
    const startTime = Date.now();

    try {
      logSync('syncProfileToWatch - Début');

      const profile = await getProfile();
      const [avatarConfig, level, rank, waterIntake] = await Promise.all([
        AsyncStorage.getItem('@yoroi_avatar_config'),
        AsyncStorage.getItem('@yoroi_level'),
        AsyncStorage.getItem('@yoroi_rank'),
        AsyncStorage.getItem('waterIntake'),
      ]);

      // OPTIMISATION: Format compact + VERSIONING
      const contextData: any = {
        v: DATA_FORMAT_VERSION, // ← NOUVEAU: Version du format
        appVersion: APP_VERSION, // ← NOUVEAU: Version de l'app
        ac: avatarConfig ? JSON.parse(avatarConfig) : undefined,
        un: profile?.name || undefined,
        lv: level ? parseInt(level) : 1,
        rk: rank || undefined,
        wi: parseFloat(waterIntake || '0'),
        ts: Date.now()
      };

      // VALIDATION
      const validation = validateSyncData({ level: contextData.lv, waterIntake: contextData.wi });
      if (!validation.valid) {
        logSync('syncProfileToWatch - Validation échouée', validation.errors);
        return;
      }

      // Photo de profil (si petite)
      if (profile?.profile_photo) {
        try {
          const FileSystem = require('expo-file-system').default;
          const base64Photo = await FileSystem.readAsStringAsync(profile.profile_photo, {
            encoding: FileSystem.EncodingType.Base64
          });

          const photoSize = (base64Photo.length * 3) / 4;

          if (photoSize < 50000) { // 50KB max pour profil sync
            contextData.pp = base64Photo;
            logSync('syncProfileToWatch - Photo incluse', { size: `${Math.round(photoSize / 1024)}KB` });
          }
        } catch (photoError) {
          logSync('syncProfileToWatch - Erreur photo', photoError);
        }
      }

      // LOGGING: Taille totale
      const dataSize = JSON.stringify(contextData).length;
      logSync('syncProfileToWatch - Données préparées', { size: `${Math.round(dataSize / 1024)}KB` });

      await retryWithBackoff(
        () => WatchConnectivity.updateApplicationContext(contextData),
        3,
        'syncProfileToWatch'
      );

      const duration = Date.now() - startTime;
      logSync('syncProfileToWatch - Succès', { duration: `${duration}ms` });
    } catch (e) {
      const duration = Date.now() - startTime;
      const { userMessage } = categorizeError(e);
      logSync('syncProfileToWatch - Erreur finale', { duration: `${duration}ms`, error: e });
      setLastError(userMessage);
    }
  }, [logSync, retryWithBackoff]);

  // Initialisation
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    let reachabilityListener: any;
    let messageListener: any;
    let dataListener: any;

    const init = async () => {
      try {
        logSync('Initialisation WatchConnectivity');

        await WatchConnectivity.activateSession();
        const available = await WatchConnectivity.isWatchAvailable();
        const reachable = await WatchConnectivity.isWatchReachable();

        setIsAvailable(available);
        setIsReachable(reachable);

        logSync('État initial', { available, reachable });

        if (available) {
          // NOUVEAU : Récupérer données Watch en attente
          await retrieveWatchData();

          // NOUVEAU : Traiter syncs en attente
          await processPendingSyncs();

          // Sync iPhone → Watch
          syncAllData();
          syncProfileToWatch();
        }

        // Listeners
        reachabilityListener = WatchConnectivity.onReachabilityChanged(async (status) => {
          setIsReachable(status.isReachable);
          setIsAvailable(status.isPaired && status.isWatchAppInstalled);

          logSync('Reachability changé', status);

          if (status.isReachable) {
            showSyncBanner('⌚ Watch connectée', 'info');

            // NOUVEAU : Récupérer données en attente
            await retrieveWatchData();

            // NOUVEAU : Traiter syncs en attente
            await processPendingSyncs();

            // Sync iPhone → Watch
            syncAllData();
            syncProfileToWatch();
          } else {
            showSyncBanner('⌚ Watch déconnectée', 'error');
          }
        });

        messageListener = WatchConnectivity.onMessageReceived((message) => {
          handleWatchMessage(message);
        });

        dataListener = WatchConnectivity.onDataReceived((data) => {
          if (data.data) {
            setWatchData(data.data);
            logSync('Données reçues', { size: JSON.stringify(data.data).length });
          }
        });

      } catch (e) {
        logSync('Erreur initialisation', e);
      }
    };

    init();

    // Observer AppState pour traiter syncs au retour en foreground
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        logSync('App foreground - Traitement syncs');
        await processPendingSyncs();
        if (isReachable) {
          await retrieveWatchData();
        }
      }
      appState.current = nextAppState;
    });

    // CLEANUP
    return () => {
      if (reachabilityListener) reachabilityListener.remove();
      if (messageListener) messageListener.remove();
      if (dataListener) dataListener.remove();
      if (syncDebounceTimer.current) clearTimeout(syncDebounceTimer.current);
      appStateSubscription.remove();
      logSync('Cleanup listeners terminé');
    };
  }, [handleWatchMessage, syncProfileToWatch, logSync, showSyncBanner, retrieveWatchData, processPendingSyncs, isReachable]);

  // Sync spécifiques avec THROTTLING et QUEUE
  const syncWeight = async (weight: number) => {
    // NOUVEAU : Throttling
    if (!canSync('weight')) {
      return;
    }

    if (!isAvailable) {
      // NOUVEAU : Queue si Watch indisponible
      await savePendingSync({ type: 'weight', data: weight, timestamp: Date.now(), retries: 0 });
      showSyncBanner('⚖️ Sera synchronisé avec la Watch plus tard', 'info');
      return;
    }

    logSync('syncWeight', { weight });

    try {
      await retryWithBackoff(
        () => WatchConnectivity.sendWeightUpdate(weight),
        3,
        'syncWeight'
      );
      showSyncBanner('⚖️ Poids envoyé', 'success');
    } catch (e) {
      const { userMessage } = categorizeError(e);
      showSyncBanner(userMessage, 'error');

      // NOUVEAU : Queue en cas d'erreur
      await savePendingSync({ type: 'weight', data: weight, timestamp: Date.now(), retries: 0 });
    }
  };

  const syncHydration = async (amount: number) => {
    if (!canSync('hydration')) return;

    if (!isAvailable) {
      await savePendingSync({ type: 'hydration', data: amount, timestamp: Date.now(), retries: 0 });
      showSyncBanner('💧 Sera synchronisé avec la Watch plus tard', 'info');
      return;
    }

    logSync('syncHydration', { amount });

    try {
      await retryWithBackoff(
        () => WatchConnectivity.sendHydrationUpdate(amount),
        3,
        'syncHydration'
      );
      showSyncBanner('💧 Hydratation envoyée', 'success');
    } catch (e) {
      const { userMessage } = categorizeError(e);
      showSyncBanner(userMessage, 'error');
      await savePendingSync({ type: 'hydration', data: amount, timestamp: Date.now(), retries: 0 });
    }
  };

  const syncWorkout = async (workout: any) => {
    if (!canSync('workout')) return;

    if (!isAvailable) {
      await savePendingSync({ type: 'workout', data: workout, timestamp: Date.now(), retries: 0 });
      showSyncBanner('🏋️ Sera synchronisé avec la Watch plus tard', 'info');
      return;
    }

    logSync('syncWorkout', { type: workout.type });

    try {
      await retryWithBackoff(
        () => WatchConnectivity.sendWorkoutSession(workout),
        3,
        'syncWorkout'
      );
      showSyncBanner('🏋️ Workout envoyé', 'success');
    } catch (e) {
      const { userMessage } = categorizeError(e);
      showSyncBanner(userMessage, 'error');
      await savePendingSync({ type: 'workout', data: workout, timestamp: Date.now(), retries: 0 });
    }
  };

  const syncRecords = async (records: any[]) => {
    if (!canSync('records')) return;

    if (!isAvailable) {
      await savePendingSync({ type: 'records', data: records, timestamp: Date.now(), retries: 0 });
      showSyncBanner('🏆 Sera synchronisé avec la Watch plus tard', 'info');
      return;
    }

    logSync('syncRecords', { count: records.length });

    try {
      await retryWithBackoff(
        () => WatchConnectivity.sendRecordsUpdate(records),
        3,
        'syncRecords'
      );
      showSyncBanner('🏆 Records envoyés', 'success');
    } catch (e) {
      const { userMessage } = categorizeError(e);
      showSyncBanner(userMessage, 'error');
      await savePendingSync({ type: 'records', data: records, timestamp: Date.now(), retries: 0 });
    }
  };

  // Fonction interne de sync
  const performSync = useCallback(async () => {
    if (!isAvailable || Platform.OS !== 'ios') return;

    const startTime = Date.now();
    setIsSyncing(true);
    setSyncStatus('syncing');
    showSyncBanner('🔄 Synchronisation...', 'loading');

    try {
      logSync('performSync - Début');

      // 1. Récupérer données
      const [profile, weight, waterIntake, streak, avatarConfig, level, rank, benchmarksList] = await Promise.all([
        getProfile(),
        AsyncStorage.getItem('currentWeight'),
        AsyncStorage.getItem('waterIntake'),
        AsyncStorage.getItem('streak'),
        AsyncStorage.getItem('@yoroi_avatar_config'),
        AsyncStorage.getItem('@yoroi_level'),
        AsyncStorage.getItem('@yoroi_rank'),
        getBenchmarks().catch(() => []),
      ]);

      // 2. Construire megaPack OPTIMISÉ avec VERSIONING
      let parsedAvatar = avatarConfig ? JSON.parse(avatarConfig) : { pack: 'samurai' };
      if (parsedAvatar && !parsedAvatar.pack && parsedAvatar.id) {
        parsedAvatar.pack = parsedAvatar.id;
      }

      // Benchmarks compacts pour la montre
      const watchBenchmarks = (benchmarksList || []).slice(0, 50).map((b: any) => ({
        id: b.id || b.exerciseId,
        name: b.name || b.exerciseName,
        category: b.category || 'Force',
        unit: b.unit || 'kg',
        pr: b.pr || b.personalRecord || 0,
        prReps: b.prReps || 0,
        prDate: b.prDate || '',
        lastValue: b.lastValue || 0,
        entryCount: b.entryCount || 0,
      }));

      const megaPack: any = {
        v: DATA_FORMAT_VERSION,
        appVersion: APP_VERSION,
        w: parseFloat(weight || '0'),
        wi: parseFloat(waterIntake || '0'),
        s: parseInt(streak || '0'),
        un: profile?.name || undefined,
        ac: parsedAvatar,
        lv: level ? parseInt(level) : 1,
        rk: rank || undefined,
        ts: Date.now(),
        fr: true,
        deviceName: Device.modelName || 'iPhone',
        // Benchmarks pour le carnet de la montre
        benchmarks: watchBenchmarks.length > 0 ? watchBenchmarks : undefined,
        // Objectifs
        stepsGoal: 10000,
        hydrationGoal: 2500,
      };

      // VALIDATION complète
      const validation = validateSyncData({
        weight: megaPack.w,
        waterIntake: megaPack.wi,
        streak: megaPack.s,
        level: megaPack.lv
      });

      if (!validation.valid) {
        throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
      }

      // Photo (si petite)
      if (profile?.profile_photo) {
        try {
          const FileSystem = require('expo-file-system').default;
          const base64Photo = await FileSystem.readAsStringAsync(profile.profile_photo, {
            encoding: FileSystem.EncodingType.Base64
          });

          const estimatedSize = (base64Photo.length * 3) / 4;

          if (estimatedSize < 75000) {
            megaPack.pp = base64Photo;
            logSync('performSync - Photo incluse', { size: `${Math.round(estimatedSize / 1024)}KB` });
          } else {
            logSync('performSync - Photo trop volumineuse', { size: `${Math.round(estimatedSize / 1024)}KB` });

            // Envoi séparé via transferFile
            try {
              await WatchConnectivity.transferFile(profile.profile_photo, {
                type: 'profilePhoto',
                timestamp: Date.now()
              });
              logSync('performSync - Photo envoyée via transferFile');
            } catch (transferError) {
              logSync('performSync - Erreur transferFile', transferError);
            }
          }
        } catch (photoError) {
          logSync('performSync - Erreur lecture photo', photoError);
        }
      }

      // LOGGING taille finale
      const megaPackSize = JSON.stringify(megaPack).length;
      logSync('performSync - MegaPack préparé', {
        size: `${Math.round(megaPackSize / 1024)}KB`,
        limit: '256KB'
      });

      // Vérifier limite 256KB
      if (megaPackSize > 256000) {
        logSync('performSync - ATTENTION: MegaPack dépasse 256KB!', { size: megaPackSize });
        // Retirer la photo si présente
        if (megaPack.pp) {
          delete megaPack.pp;
          logSync('performSync - Photo retirée pour respecter limite');
        }
      }

      // 3. Envoi avec retry
      await retryWithBackoff(
        () => WatchConnectivity.updateApplicationContext(megaPack),
        3,
        'updateApplicationContext'
      );

      // Message direct si reachable
      if (isReachable) {
        try {
          await retryWithBackoff(
            () => WatchConnectivity.sendMessageToWatch(megaPack),
            2,
            'sendMessageToWatch'
          );
        } catch (e) {
          // Non bloquant si message direct échoue
          logSync('performSync - Message direct échoué (non bloquant)', e);
        }
      }

      const duration = Date.now() - startTime;
      setLastSyncDate(new Date());
      setSyncStatus('success');

      logSync('performSync - Succès', { duration: `${duration}ms` });
      showSyncBanner('✅ Montre synchronisée', 'success');

    } catch (e) {
      const duration = Date.now() - startTime;
      const { category, userMessage } = categorizeError(e);

      setSyncStatus('error');
      setLastError(userMessage);

      logSync('performSync - Erreur finale', {
        duration: `${duration}ms`,
        category,
        error: e
      });

      if (userMessage) showSyncBanner(userMessage, 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [isAvailable, isReachable, showSyncBanner, logSync, retryWithBackoff]);

  // Sync complète avec debounce
  const syncAllData = useCallback(() => {
    if (syncDebounceTimer.current) {
      clearTimeout(syncDebounceTimer.current);
    }

    syncDebounceTimer.current = setTimeout(() => {
      performSync();
    }, 2000);
  }, [performSync]);

  // Context value
  const contextValue = useMemo(() => ({
    isWatchAvailable: isAvailable,
    isWatchReachable: isReachable,
    lastError,
    lastSyncDate,
    isSyncing,
    pendingSyncsCount,
    syncWeight,
    syncHydration,
    syncWorkout,
    syncRecords,
    syncAllData,
    watchData,
  }), [isAvailable, isReachable, lastError, lastSyncDate, isSyncing, pendingSyncsCount, syncWeight, syncHydration, syncWorkout, syncRecords, syncAllData, watchData]);

  return (
    <WatchContext.Provider value={contextValue}>
      {children}

      <Animated.View style={[styles.banner, { transform: [{ translateY: bannerAnim }] }]}>
        <View style={[styles.bannerContent, { backgroundColor: bannerColor }]}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name={bannerIcon as any} size={20} color="#000" />
          </View>
          <Text style={styles.bannerText}>{syncMessage}</Text>
        </View>
      </Animated.View>
    </WatchContext.Provider>
  );
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', top: 0, left: 20, right: 20, zIndex: 9999, alignItems: 'center' },
  bannerContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 25, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  iconContainer: { width: 28, height: 28, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bannerText: { color: '#000', fontWeight: '800', fontSize: 14 }
});

export function useWatch() {
  const context = useContext(WatchContext);
  if (!context) throw new Error('useWatch must be used within WatchConnectivityProvider');
  return context;
}
