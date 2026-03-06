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
import { Platform, AppState, AppStateStatus, DeviceEventEmitter } from 'react-native';
import { WatchConnectivity } from '@/lib/watchConnectivity.ios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';
import { addWeight, getProfile, getTrainings } from '@/lib/database';
import { getBenchmarks, addBenchmarkEntry, getOrCreateBenchmarkFromWatch, importWatchExercisesToPhone, getBenchmarkPR, getBenchmarkLast, syncCarnetToWatch } from '@/lib/carnetService';
import { getGlobalGoalStats } from '@/lib/trainingGoalsService';
import { saveNotification } from '@/lib/notificationHistoryService';
import * as Device from 'expo-device';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { themeColors, getTheme, ThemeColor } from '@/constants/themes';

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

// Compress profile image to 100x100 JPEG (~5-10KB, always fits in megaPack)
const compressProfileImage = async (uri: string): Promise<string> => {
  const result = await manipulateAsync(uri, [{ resize: { width: 100 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
  });
  const { readAsStringAsync, EncodingType } = require('expo-file-system/legacy');
  return readAsStringAsync(result.uri, { encoding: EncodingType.Base64 });
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

  // (plus de bannière — les événements importants vont dans le centre de notifications)

  // NOUVEAU : Refs pour throttling et queue
  const lastSyncTimestamps = useRef<Record<string, number>>({});
  const processedMessageIds = useRef<Set<string>>(new Set());
  const MAX_PROCESSED_IDS = 200;
  const syncDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Remplace le banner — enregistre silencieusement dans le centre de notifications
  const showSyncBanner = useCallback((message: string, type: 'info' | 'success' | 'error' | 'loading' = 'info') => {
    if (!message || message.trim() === '') return;
    // Seulement les événements significatifs (pas loading, pas info générique)
    if (type === 'loading') return;
    if (type === 'info' && (message.includes('plus tard') || message.includes('Synchronisat'))) return;
    // Nettoyer le message (retirer emojis)
    const clean = message.replace(/[\u{1F300}-\u{1FFFF}]/gu, '').replace(/[\u2600-\u27BF]/gu, '').trim();
    if (!clean) return;
    const title = type === 'error' ? 'Erreur Watch' : 'Watch';
    saveNotification(title, clean, 'watch_sync').catch(() => {});
  }, []);

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

        if (msg.action === 'updateStepsGoal' && msg.stepsGoal) {
          const goal = parseInt(msg.stepsGoal);
          if (goal >= 1000 && goal <= 30000) {
            await AsyncStorage.setItem('@yoroi_steps_goal', String(goal));
            DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
            logSync('handleWatchMessage - Steps goal updated from Watch', { goal });
          }
        }

        if (msg.action === 'updateHydrationGoal' && msg.hydrationGoal) {
          const goal = parseInt(msg.hydrationGoal);
          if (goal >= 500 && goal <= 6000) {
            await AsyncStorage.setItem('@yoroi_hydration_goal', String(goal));
            DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
            logSync('handleWatchMessage - Hydration goal updated from Watch', { goal });
          }
        }

        // Sync bidirectionnelle: hydratation Watch -> iPhone
        if (msg.action === 'addHydration' && msg.amount !== undefined) {
          const amount = typeof msg.amount === 'number' ? msg.amount : parseInt(msg.amount);
          if (Math.abs(amount) > 0 && Math.abs(amount) <= 2000) {
            try {
              // 1. Update waterIntake (ml, used by megaPack)
              const currentStr = await AsyncStorage.getItem('waterIntake');
              const current = currentStr ? parseInt(currentStr) : 0;
              const newTotalMl = Math.max(0, current + amount);
              await AsyncStorage.setItem('waterIntake', String(newTotalMl));

              // 2. Update hydration screen key (liters, JSON format)
              const today = new Date().toDateString();
              const newTotalL = newTotalMl / 1000;
              await AsyncStorage.setItem('@yoroi_hydration_today', JSON.stringify({ date: today, amount: newTotalL }));

              // 3. Update date-based key for home screen (ml)
              const todayISO = new Date().toISOString().split('T')[0];
              await AsyncStorage.setItem(`@yoroi_hydration_today_${todayISO}`, String(newTotalMl));

              // 4. Update hydration log for badges
              try {
                const logData = await AsyncStorage.getItem('@yoroi_hydration_log');
                const logEntries: { id: string; date: string; amount: number; timestamp: string }[] = logData ? JSON.parse(logData) : [];
                const existingIdx = logEntries.findIndex((e: any) => e.date === todayISO);
                const logEntry = { id: `watch_${todayISO}`, date: todayISO, amount: newTotalMl, timestamp: new Date().toISOString() };
                if (existingIdx >= 0) {
                  logEntries[existingIdx] = logEntry;
                } else {
                  logEntries.push(logEntry);
                }
                await AsyncStorage.setItem('@yoroi_hydration_log', JSON.stringify(logEntries));
              } catch { /* non bloquant */ }

              // 5. Notify home screen UI
              DeviceEventEmitter.emit('HYDRATION_AMOUNT_CHANGED', { amountMl: newTotalMl });

              // 6. Send updated total back to Watch
              try {
                await WatchConnectivity.sendHydrationUpdate(newTotalMl);
              } catch { /* non bloquant */ }

              showSyncBanner(`Hydratation ${amount > 0 ? '+' : ''}${amount}ml`, 'success');
              logSync('handleWatchMessage - Hydratation depuis Watch', { amount, total: newTotalMl });
            } catch (e) {
              logSync('handleWatchMessage - Erreur hydratation Watch', e);
            }
          }
        }

        // Sync bidirectionnelle: benchmark/record Watch -> iPhone
        if (msg.action === 'addBenchmarkEntry') {
          try {
            const watchId = msg.benchmarkId;
            const exerciseName = msg.exerciseName;
            const value = typeof msg.value === 'number' ? msg.value : parseFloat(msg.value || '0');
            const reps = typeof msg.reps === 'number' ? msg.reps : (parseInt(msg.reps || '0') || undefined);
            const rpe = typeof msg.rpe === 'number' ? msg.rpe : (parseInt(msg.rpe || '0') || undefined);
            if (watchId && value > 0) {
              const benchmark = await getOrCreateBenchmarkFromWatch(watchId, exerciseName);
              if (benchmark) {
                await addBenchmarkEntry(benchmark.id, value, rpe, 'Apple Watch', new Date(), reps);
                DeviceEventEmitter.emit('CARNET_UPDATED');
                DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
                showSyncBanner(`${benchmark.name} synchronise depuis la montre`, 'success');
                logSync('handleWatchMessage - Benchmark entry added from Watch', { watchId, exerciseName, value, reps });
                // Push updated benchmarks back to Watch immediately
                syncCarnetToWatch().catch(() => {});
              }
            }
          } catch (e) {
            logSync('handleWatchMessage - Erreur addBenchmarkEntry', e);
          }
        }

        // Sync bidirectionnelle: poids Watch -> iPhone
        if (msg.action === 'addWeight' && msg.weight) {
          const weight = typeof msg.weight === 'number' ? msg.weight : parseFloat(msg.weight);
          if (weight > 0 && weight <= 300) {
            await addWeight({
              weight,
              date: new Date().toISOString().split('T')[0],
              source: 'apple',
            });
            await AsyncStorage.setItem('currentWeight', String(weight));
            DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
            DeviceEventEmitter.emit('WEIGHT_UPDATED', { weight });
            showSyncBanner('Poids synchronise', 'success');
            logSync('handleWatchMessage - Poids ajoute depuis Watch', { weight });
          }
        }

        // Sync bidirectionnelle: theme mode Watch -> iPhone
        if (msg.action === 'changeThemeMode' && msg.themeMode) {
          const mode = msg.themeMode === 'light' ? 'light' : 'dark';
          await AsyncStorage.setItem('yoroi_theme_mode_v5', mode);
          DeviceEventEmitter.emit('WATCH_THEME_MODE_CHANGED', { mode });
          logSync('handleWatchMessage - Theme mode changed from Watch', { mode });
        }

        // Sync bidirectionnelle: unit system Watch -> iPhone
        if (msg.action === 'changeUnitSystem' && msg.unitSystem) {
          const unit = msg.unitSystem === 'lbs' ? 'lbs' : 'kg';
          try {
            const settingsStr = await AsyncStorage.getItem('@yoroi_settings');
            const settings = settingsStr ? JSON.parse(settingsStr) : {};
            settings.weight_unit = unit;
            await AsyncStorage.setItem('@yoroi_settings', JSON.stringify(settings));
            DeviceEventEmitter.emit('YOROI_DATA_CHANGED');
            logSync('handleWatchMessage - Unit system changed from Watch', { unit });
          } catch (e) {
            logSync('handleWatchMessage - Error changing unit', e);
          }
        }

        // Sync bidirectionnelle: timer preset Watch -> iPhone
        if (msg.action === 'changeTimerPreset' && msg.timerSeconds) {
          const seconds = typeof msg.timerSeconds === 'number' ? msg.timerSeconds : parseInt(msg.timerSeconds);
          if (seconds >= 10 && seconds <= 600) {
            await AsyncStorage.setItem('@yoroi_default_timer', String(seconds));
            logSync('handleWatchMessage - Timer preset changed from Watch', { seconds });
          }
        }

        if (msg.testSignal) {
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
      const [avatarConfig, level, rank, waterIntake, profileThemeColor, profileThemeMode] = await Promise.all([
        AsyncStorage.getItem('@yoroi_avatar_config'),
        AsyncStorage.getItem('@yoroi_level'),
        AsyncStorage.getItem('@yoroi_rank'),
        AsyncStorage.getItem('waterIntake'),
        AsyncStorage.getItem('yoroi_theme_color_v5'),
        AsyncStorage.getItem('yoroi_theme_mode_v5'),
      ]);

      // Theme colors - send full theme to Watch
      const profileThemeEntry = themeColors.find(t => t.id === (profileThemeColor || 'ocean'));
      const profileMode = profileThemeMode === 'light' ? 'light' : 'dark';
      const fullTheme = getTheme((profileThemeColor || 'ocean') as ThemeColor, profileMode);

      // OPTIMISATION: Format compact + VERSIONING
      const contextData: any = {
        v: DATA_FORMAT_VERSION,
        appVersion: APP_VERSION,
        un: profile?.name || undefined,
        lv: level ? parseInt(level) : 1,
        rk: rank || undefined,
        wi: parseFloat(waterIntake || '0'),
        themeAccent: profileThemeEntry?.color || '#3B82F6',
        themeCompanion: profileThemeEntry?.companion || '#FFFFFF',
        themeMode: profileMode,
        themeBg: fullTheme.colors.background,
        themeCardBg: fullTheme.colors.backgroundCard,
        themeTextPrimary: fullTheme.colors.textPrimary,
        themeTextSecondary: fullTheme.colors.textSecondary,
        themeDivider: fullTheme.colors.divider,
        themeTextOnAccent: fullTheme.colors.textOnAccent,
        ts: Date.now()
      };

      // VALIDATION
      const validation = validateSyncData({ level: contextData.lv, waterIntake: contextData.wi });
      if (!validation.valid) {
        logSync('syncProfileToWatch - Validation échouée', validation.errors);
        return;
      }

      // Photo de profil (compressee 100x100 JPEG ~5-10KB)
      if (profile?.profile_photo) {
        try {
          const base64Photo = await compressProfileImage(profile.profile_photo);
          contextData.profileImage = base64Photo;
          const photoSize = (base64Photo.length * 3) / 4;
          logSync('syncProfileToWatch - Photo compressee incluse', { size: `${Math.round(photoSize / 1024)}KB` });
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

          // Importer les exercices Watch manquants (une seule fois)
          const exercisesImported = await AsyncStorage.getItem('@yoroi_watch_exercises_imported');
          if (!exercisesImported) {
            await importWatchExercisesToPhone();
            await AsyncStorage.setItem('@yoroi_watch_exercises_imported', 'true');
          }

          // Sync iPhone → Watch
          syncAllData();
          syncProfileToWatch();
        }

        // Listeners
        let reachabilityDebounceTimer: ReturnType<typeof setTimeout> | null = null;
        reachabilityListener = WatchConnectivity.onReachabilityChanged(async (status) => {
          setIsReachable(status.isReachable);
          setIsAvailable(status.isPaired && status.isWatchAppInstalled);

          logSync('Reachability changé', status);

          // Debounce: ignorer les changements rapides (connexions/déconnexions en rafale)
          if (reachabilityDebounceTimer) clearTimeout(reachabilityDebounceTimer);
          reachabilityDebounceTimer = setTimeout(async () => {
            if (status.isReachable) {
              await retrieveWatchData();
              await processPendingSyncs();
              syncAllData();
              syncProfileToWatch();
            }
            // Pas de banner de déconnexion — trop intrusif
          }, 2000);
        });

        messageListener = WatchConnectivity.onMessageReceived((message) => {
          handleWatchMessage(message);
        });

        dataListener = WatchConnectivity.onDataReceived((data) => {
          if (data.data) {
            setWatchData(data.data);
            logSync('Données reçues', { size: JSON.stringify(data.data).length });

            // Process pending actions from Watch (sent via applicationContext when not reachable)
            const ctx = data.data;
            if (ctx.pendingAction && ctx.pendingData) {
              const actionMsg = { ...ctx.pendingData, action: ctx.pendingAction };
              handleWatchMessage(actionMsg);
            }
          }
        });

      } catch (e) {
        logSync('Erreur initialisation', e);
      }
    };

    init();

    // Observer AppState : sync bidirectionnelle au retour en foreground
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        logSync('App foreground - Sync bidirectionnelle');
        await processPendingSyncs();
        if (isReachable) {
          // Récupérer les données Watch → iPhone
          await retrieveWatchData();
          // Pousser les données iPhone → Watch (les changements faits pendant le background)
          syncAllData();
          syncProfileToWatch();
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
      const { getSleepStats, getSleepGoal, getTodaySleep } = require('@/lib/sleepService');
      const { getWeights, getTrainings } = require('@/lib/database');
      const [profile, weight, waterIntake, streak, avatarConfig, level, rank, benchmarksList, savedThemeColor, savedStepsGoal, savedHydrationGoal, sleepStatsData, sleepGoalData, todaySleep, savedThemeMode, savedSettings, savedTimerPreset, weightEntries, recentTrainings] = await Promise.all([
        getProfile(),
        AsyncStorage.getItem('currentWeight'),
        AsyncStorage.getItem('waterIntake'),
        AsyncStorage.getItem('streak'),
        AsyncStorage.getItem('@yoroi_avatar_config'),
        AsyncStorage.getItem('@yoroi_level'),
        AsyncStorage.getItem('@yoroi_rank'),
        getBenchmarks().catch(() => []),
        AsyncStorage.getItem('yoroi_theme_color_v5'),
        AsyncStorage.getItem('@yoroi_steps_goal'),
        AsyncStorage.getItem('@yoroi_hydration_goal'),
        getSleepStats().catch(() => null),
        getSleepGoal().catch(() => 480),
        getTodaySleep().catch(() => null),
        AsyncStorage.getItem('yoroi_theme_mode_v5'),
        AsyncStorage.getItem('@yoroi_settings'),
        AsyncStorage.getItem('@yoroi_default_timer'),
        getWeights(30).catch(() => []),
        getTrainings(7).catch(() => []),
      ]);

      // 1b. Stats entrainements annuels pour complications Watch
      let yearlyWorkouts = 0;
      let workoutYearGoal = 0;
      try {
        const currentYear = new Date().getFullYear();
        const { getTrainings: getAllTrainings } = require('@/lib/database');
        const allTrainings: any[] = await getAllTrainings().catch(() => []);
        const uniqueDays = new Set<string>();
        for (const t of allTrainings) {
          const dateStr = t.date ? String(t.date).split('T')[0] : '';
          if (dateStr.startsWith(String(currentYear))) {
            uniqueDays.add(dateStr);
          }
        }
        yearlyWorkouts = uniqueDays.size;
        const globalStats = await getGlobalGoalStats().catch(() => ({ totalWeeklyTarget: 0 }));
        workoutYearGoal = (globalStats.totalWeeklyTarget || 0) * 52;
      } catch { /* non bloquant */ }

      // 2. Construire megaPack OPTIMISÉ avec VERSIONING
      let parsedAvatar = avatarConfig ? JSON.parse(avatarConfig) : { pack: 'samurai' };
      if (parsedAvatar && !parsedAvatar.pack && parsedAvatar.id) {
        parsedAvatar.pack = parsedAvatar.id;
      }

      // Benchmarks compacts pour la montre (calculer PR et dernière valeur depuis les entries)
      const watchBenchmarks = (benchmarksList || []).slice(0, 50).map((b: any) => {
        const pr = getBenchmarkPR(b);
        const last = getBenchmarkLast(b);
        return {
          id: b.id,
          name: b.name,
          category: b.category || 'Force',
          sport: b.sport || b.muscleGroup || '',
          unit: b.unit || 'kg',
          pr: pr?.value || 0,
          prReps: pr?.reps || 0,
          prDate: pr?.date || '',
          lastValue: last?.value || 0,
          entryCount: b.entries?.length || 0,
        };
      });

      // Fetch health data from HealthKit
      let healthData: any = {};
      try {
        const healthConnect = require('@/lib/healthConnect.ios').default;
        const [heartRateData, caloriesData, distanceData, spo2Data, respiratoryData, exerciseMin, standHrs] = await Promise.all([
          healthConnect.getTodayHeartRate().catch(() => null),
          healthConnect.getTodayCalories().catch(() => null),
          healthConnect.getTodayDistance().catch(() => null),
          healthConnect.getOxygenSaturation().catch(() => null),
          healthConnect.getRespiratoryRate().catch(() => null),
          healthConnect.getTodayExerciseMinutes().catch(() => null),
          healthConnect.getTodayStandHours().catch(() => null),
        ]);
        if (heartRateData) {
          healthData.heartRate = heartRateData.current || heartRateData.average || 0;
          healthData.heartRateMin = heartRateData.min || 0;
          healthData.heartRateMax = heartRateData.max || 0;
          healthData.restingHeartRate = heartRateData.resting || 0;
        }
        if (caloriesData) healthData.activeCalories = caloriesData.active || 0;
        if (distanceData) healthData.distance = distanceData.total || 0;
        if (spo2Data) healthData.spo2 = spo2Data.value || 0;
        if (respiratoryData) healthData.respiratoryRate = respiratoryData.value || 0;
        if (exerciseMin != null) healthData.exerciseMinutes = exerciseMin;
        if (standHrs != null) healthData.standHours = standHrs;
        logSync('performSync - Health data fetched', healthData);
      } catch (healthError) {
        logSync('performSync - Health data fetch failed', healthError);
      }

      // Get current theme colors for Watch - send full theme
      const currentThemeEntry = themeColors.find(t => t.id === (savedThemeColor || 'ocean'));
      const themeAccent = currentThemeEntry?.color || '#3B82F6';
      const themeCompanion = currentThemeEntry?.companion || '#FFFFFF';
      const themeMode = savedThemeMode === 'light' ? 'light' : 'dark';
      const syncFullTheme = getTheme((savedThemeColor || 'ocean') as ThemeColor, themeMode as 'dark' | 'light');

      // Sleep data from sleepService (source unique de verite)
      const sleepGoalMinutes = sleepGoalData || 480;
      let sleepInfo: any = {};
      if (sleepStatsData) {
        const duration = Math.round(sleepStatsData.lastNightDuration || 0);
        sleepInfo.sleepDuration = duration; // minutes
        sleepInfo.sleepQuality = Math.round(sleepStatsData.lastNightQuality || 0); // 1-5
        sleepInfo.sleepDebt = sleepStatsData.sleepDebtHours || 0; // heures
        sleepInfo.sleepScore = Math.min(Math.round((duration / sleepGoalMinutes) * 100), 100); // 0-100
      }
      if (todaySleep) {
        sleepInfo.sleepBedTime = todaySleep.bedTime || '--:--';
        sleepInfo.sleepWakeTime = todaySleep.wakeTime || '--:--';
        if (todaySleep.phases) {
          sleepInfo.sleepPhaseDeep = todaySleep.phases.deep || 0;
          sleepInfo.sleepPhaseREM = todaySleep.phases.rem || 0;
          sleepInfo.sleepPhaseCore = todaySleep.phases.core || 0;
          sleepInfo.sleepPhaseAwake = todaySleep.phases.awake || 0;
        }
      }
      sleepInfo.sleepGoal = sleepGoalMinutes;

      // Competition & Readiness
      let competitionInfo: any = {};
      try {
        const { getNextCompetition } = require('@/lib/database');
        const { calculateReadinessScore } = require('@/lib/readinessService');
        const [nextComp, readiness] = await Promise.all([
          getNextCompetition().catch(() => null),
          calculateReadinessScore().catch(() => null),
        ]);
        if (nextComp) {
          const compDate = new Date(nextComp.date);
          const today = new Date();
          const daysLeft = Math.ceil((compDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft >= 0) {
            competitionInfo.nextCompName = nextComp.nom || nextComp.name || '';
            competitionInfo.nextCompDate = nextComp.date || '';
            competitionInfo.nextCompDaysLeft = daysLeft;
            competitionInfo.nextCompSport = nextComp.sport || '';
          }
        }
        if (readiness) {
          competitionInfo.readinessScore = readiness.score || 0;
          competitionInfo.readinessLevel = readiness.level || 'moderate';
          competitionInfo.readinessReco = readiness.recommendation || 'caution';
        }
      } catch { /* non bloquant */ }

      // Build hydration weekly data for Watch (last 7 days) — batch fetch
      let hydrationWeeklyData: { day: string; amount: number; goal: number }[] = [];
      try {
        const hydGoalMl = savedHydrationGoal ? parseInt(savedHydrationGoal) : 2500;
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return { iso: d.toISOString().split('T')[0], dayName: dayNames[d.getDay()] };
        });
        const keys = days.map(({ iso }) => `@yoroi_hydration_today_${iso}`);
        const results = await AsyncStorage.multiGet(keys);
        hydrationWeeklyData = results.map(([, value], idx) => ({
          day: days[idx].dayName,
          amount: value ? parseInt(value) : 0,
          goal: hydGoalMl,
        }));
      } catch { /* non bloquant */ }

      const megaPack: any = {
        v: DATA_FORMAT_VERSION,
        appVersion: APP_VERSION,
        // Weight (compact + full keys for Watch compatibility)
        w: parseFloat(weight || '0'),
        currentWeight: parseFloat(weight || '0'),
        targetWeight: profile?.target_weight || undefined,
        startWeight: profile?.start_weight || undefined,
        height: profile?.height_cm || undefined,
        // Hydration
        wi: parseFloat(waterIntake || '0'),
        hydrationCurrent: Math.round(parseFloat(waterIntake || '0')),
        hydrationWeekly: hydrationWeeklyData.length > 0 ? hydrationWeeklyData : undefined,
        // Profile
        un: profile?.name || undefined,
        lv: level ? parseInt(level) : 1,
        rk: rank || undefined,
        streak: parseInt(streak || '0'),
        // Benchmarks pour le carnet de la montre
        benchmarks: watchBenchmarks.length > 0 ? watchBenchmarks : undefined,
        // Objectifs (read from saved values)
        stepsGoal: savedStepsGoal ? parseInt(savedStepsGoal) : 10000,
        hydrationGoal: savedHydrationGoal ? parseInt(savedHydrationGoal) : 2500,
        caloriesGoal: 500,
        distanceGoal: 5.0,
        // Préférences
        unitSystem: (() => { try { return savedSettings ? JSON.parse(savedSettings).weight_unit || 'kg' : 'kg'; } catch { return 'kg'; } })(),
        defaultTimerSeconds: savedTimerPreset ? parseInt(savedTimerPreset) : 90,
        // Historique poids (evolution chart)
        weightHistory: (weightEntries || []).slice(0, 10).map((e: any) => ({ weight: e.weight, date: e.date || '' })),
        // Composition corporelle (dernière entrée)
        bodyFat: weightEntries?.[0]?.fat_percent || 0,
        muscleMass: weightEntries?.[0]?.muscle_percent || 0,
        waterPercent: weightEntries?.[0]?.water_percent || 0,
        // Séances récentes (dashboard)
        recentWorkouts: (recentTrainings || []).slice(0, 3).map((t: any) => ({
          type: t.sport || t.category || 'Entrainement',
          duration: t.duration_minutes || t.duration || 0,
          calories: t.calories || 0,
          date: t.date || '',
        })),
        // Stats annuelles pour complications Watch
        yearlyWorkouts,
        workoutYearGoal,
        // Sleep data
        ...sleepInfo,
        // Competition & Readiness
        ...competitionInfo,
        // Health data
        ...healthData,
        // Theme colors + mode for Watch
        themeAccent,
        themeCompanion,
        themeMode,
        themeBg: syncFullTheme.colors.background,
        themeCardBg: syncFullTheme.colors.backgroundCard,
        themeTextPrimary: syncFullTheme.colors.textPrimary,
        themeTextSecondary: syncFullTheme.colors.textSecondary,
        themeDivider: syncFullTheme.colors.divider,
        themeTextOnAccent: syncFullTheme.colors.textOnAccent,
        ts: Date.now(),
      };

      // VALIDATION complète
      const validation = validateSyncData({
        weight: megaPack.w,
        waterIntake: megaPack.wi,
        streak: megaPack.streak,
        level: megaPack.lv
      });

      if (!validation.valid) {
        throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
      }

      // Photo (compressee 100x100 JPEG ~5-10KB, toujours dans le megaPack)
      if (profile?.profile_photo) {
        try {
          const base64Photo = await compressProfileImage(profile.profile_photo);
          megaPack.profileImage = base64Photo;
          const estimatedSize = (base64Photo.length * 3) / 4;
          logSync('performSync - Photo compressee incluse', { size: `${Math.round(estimatedSize / 1024)}KB` });
        } catch (photoError) {
          logSync('performSync - Erreur compression photo', photoError);
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
        if (megaPack.profileImage) {
          delete megaPack.profileImage;
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

  // Sync complète avec debounce (1s pour une réactivité optimale)
  const syncAllData = useCallback((): Promise<void> => {
    if (syncDebounceTimer.current) {
      clearTimeout(syncDebounceTimer.current);
    }

    return new Promise<void>((resolve) => {
      syncDebounceTimer.current = setTimeout(() => {
        performSync().then(resolve).catch(resolve);
      }, 1000);
    });
  }, [performSync]);

  // ─── Sync automatique iPhone → Watch quand les données changent ───
  // Chaque fois que l'iPhone modifie une donnée (poids, hydratation, sommeil...),
  // YOROI_DATA_CHANGED est émis → megaPack poussé immédiatement à la montre.
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', () => {
      if (isReachable) syncAllData();
    });
    return () => sub.remove();
  }, [isReachable, syncAllData]);

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
    </WatchContext.Provider>
  );
}

export function useWatch() {
  const context = useContext(WatchContext);
  if (!context) throw new Error('useWatch must be used within WatchConnectivityProvider');
  return context;
}
