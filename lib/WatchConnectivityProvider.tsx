/**
 * WatchConnectivityProvider
 *
 * Provider global pour gérer la communication iPhone ↔ Apple Watch
 * Sync automatique des données: poids, hydratation, workouts, records
 *
 * AMÉLIORATIONS:
 * - Retry automatique avec exponential backoff
 * - Validation données avant envoi
 * - Gestion erreurs catégorisée
 * - Logging détaillé avec timestamps
 * - Optimisation taille megaPack
 * - UX feedback amélioré
 */

import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Platform, Animated, View, Text, StyleSheet } from 'react-native';
import { WatchConnectivity } from '@/lib/watchConnectivity.ios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addWeight, getProfile } from '@/lib/database';
import { getBenchmarks, addBenchmarkEntry } from '@/lib/carnetService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Types
export interface WatchContextType {
  isWatchAvailable: boolean;
  isWatchReachable: boolean;
  lastError: string | null;
  lastSyncDate: Date | null;
  isSyncing: boolean;
  syncWeight: (weight: number) => Promise<void>;
  syncHydration: (waterIntake: number) => Promise<void>;
  syncWorkout: (workout: any) => Promise<void>;
  syncRecords: (records: any[]) => Promise<void>;
  syncAllData: () => Promise<void>;
  watchData: any;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';
type ErrorCategory = 'network' | 'timeout' | 'data' | 'unavailable' | 'unknown';

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
      userMessage: 'Données invalides. Vérifiez vos informations.'
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

export function WatchConnectivityProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isReachable, setIsReachable] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [watchData, setWatchData] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isSyncing, setIsSyncing] = useState(false);

  // Animation de la bannière
  const bannerAnim = useRef(new Animated.Value(-100)).current;
  const [syncMessage, setSyncMessage] = useState('');
  const [bannerIcon, setBannerIcon] = useState('watch');
  const [bannerColor, setBannerColor] = useState('#4ade80');

  // UX FEEDBACK: Bannière améliorée avec icônes et couleurs
  const showSyncBanner = useCallback((message: string, type: 'info' | 'success' | 'error' | 'loading' = 'info') => {
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
      Animated.delay(type === 'error' ? 3000 : 2000), // Erreurs affichées plus longtemps
      Animated.timing(bannerAnim, { toValue: -100, duration: 500, useNativeDriver: true })
    ]).start();
  }, [bannerAnim]);

  // LOGGING: Logger détaillé avec timestamps
  const logSync = useCallback((action: string, details?: any) => {
    const timestamp = new Date().toISOString();
    const log = `[Watch ${timestamp}] ${action}`;

    if (details) {
      console.log(log, details);
    } else {
      console.log(log);
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
        const { category, userMessage } = categorizeError(error);

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

      // OPTIMISATION: Format compact pour réduire la taille
      const contextData: any = {
        ac: avatarConfig ? JSON.parse(avatarConfig) : { name: 'samurai' }, // avatarConfig → ac
        un: profile?.name || 'Guerrier', // userName → un
        lv: level ? parseInt(level) : 1, // level → lv
        rk: rank || 'Novice', // rank → rk
        wi: parseFloat(waterIntake || '0'), // waterIntake → wi
        ts: Date.now() // timestamp → ts
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
            contextData.pp = base64Photo; // profilePhotoBase64 → pp
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

  // Handler pour les messages de la Watch
  const handleWatchMessage = useCallback(async (message: any) => {
    try {
      logSync('handleWatchMessage - Message reçu', { keys: Object.keys(message) });

      if (message.weightUpdate) {
        showSyncBanner('⚖️ Poids synchronisé', 'success');
        const weight = typeof message.weightUpdate === 'number' ? message.weightUpdate : message.weightUpdate.weight;

        // VALIDATION
        if (weight > 0 && weight <= 300) {
          await addWeight(weight);
          await AsyncStorage.setItem('currentWeight', String(weight));
          logSync('handleWatchMessage - Poids sauvegardé', { weight });
        } else {
          logSync('handleWatchMessage - Poids invalide', { weight });
        }
      }

      if (message.hydrationUpdate) {
        showSyncBanner('💧 Hydratation mise à jour', 'success');
        logSync('handleWatchMessage - Hydratation reçue');
      }

      if (message.newRecordFromWatch) {
        showSyncBanner('🏆 Record enregistré', 'success');
        try {
          const record = typeof message.newRecordFromWatch === 'string'
            ? JSON.parse(message.newRecordFromWatch)
            : message.newRecordFromWatch;

          const benchmarks = await getBenchmarks();
          let target = benchmarks.find(b => b.name.toLowerCase() === record.exercise.toLowerCase());

          if (target) {
            await addBenchmarkEntry(target.id, record.weight, 5, 'Apple Watch', new Date(record.date), record.reps);
            logSync('handleWatchMessage - Record sauvegardé', { exercise: record.exercise });
          }
        } catch (e) {
          logSync('handleWatchMessage - Erreur record', e);
        }
      }

      if (message.testSignal) {
        showSyncBanner('⌚ Apple Watch connectée', 'info');
        logSync('handleWatchMessage - Test signal reçu');
      }

      if (message.ping) {
        WatchConnectivity.sendMessageToWatch({ pong: true, timestamp: Date.now() }).catch(() => {});
        logSync('handleWatchMessage - Pong envoyé');
      }
    } catch (error) {
      logSync('handleWatchMessage - Erreur', error);
    }
  }, [showSyncBanner, logSync]);

  // Debounce timer
  const syncDebounceTimer = useRef<NodeJS.Timeout | null>(null);

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
          syncAllData();
          syncProfileToWatch();
        }

        // Listeners
        reachabilityListener = WatchConnectivity.onReachabilityChanged((status) => {
          setIsReachable(status.isReachable);
          setIsAvailable(status.isPaired && status.isWatchAppInstalled);

          logSync('Reachability changé', status);

          if (status.isReachable) {
            showSyncBanner('⌚ Watch connectée', 'info');
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

    // CLEANUP
    return () => {
      if (reachabilityListener) reachabilityListener.remove();
      if (messageListener) messageListener.remove();
      if (dataListener) dataListener.remove();
      if (syncDebounceTimer.current) clearTimeout(syncDebounceTimer.current);
      logSync('Cleanup listeners terminé');
    };
  }, [handleWatchMessage, syncProfileToWatch, logSync, showSyncBanner]);

  // Sync spécifiques
  const syncWeight = async (weight: number) => {
    if (!isAvailable) return;

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
    }
  };

  const syncHydration = async (amount: number) => {
    if (!isAvailable) return;

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
    }
  };

  const syncWorkout = async (workout: any) => {
    if (!isAvailable) return;

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
    }
  };

  const syncRecords = async (records: any[]) => {
    if (!isAvailable) return;

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
      const [profile, weight, waterIntake, streak, avatarConfig, level, rank] = await Promise.all([
        getProfile(),
        AsyncStorage.getItem('currentWeight'),
        AsyncStorage.getItem('waterIntake'),
        AsyncStorage.getItem('streak'),
        AsyncStorage.getItem('@yoroi_avatar_config'),
        AsyncStorage.getItem('@yoroi_level'),
        AsyncStorage.getItem('@yoroi_rank'),
      ]);

      // 2. Construire megaPack OPTIMISÉ (clés courtes)
      let parsedAvatar = avatarConfig ? JSON.parse(avatarConfig) : { pack: 'samurai' };
      if (parsedAvatar && !parsedAvatar.pack && parsedAvatar.id) {
        parsedAvatar.pack = parsedAvatar.id;
      }

      const megaPack: any = {
        // Clés courtes pour réduire taille (compatibilité Watch)
        w: parseFloat(weight || '0'), // weight
        wi: parseFloat(waterIntake || '0'), // waterIntake
        s: parseInt(streak || '0'), // streak
        un: profile?.name || 'Guerrier', // userName
        ac: parsedAvatar, // avatarConfig
        lv: level ? parseInt(level) : 1, // level
        rk: rank || 'Novice', // rank
        ts: Date.now(), // timestamp
        fr: true // forceRefresh
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
            megaPack.pp = base64Photo; // profilePhotoBase64
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
            2, // Moins de retries pour message direct
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

      showSyncBanner(`❌ ${userMessage}`, 'error');
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
    syncWeight,
    syncHydration,
    syncWorkout,
    syncRecords,
    syncAllData,
    watchData,
  }), [isAvailable, isReachable, lastError, lastSyncDate, isSyncing, syncWeight, syncHydration, syncWorkout, syncRecords, syncAllData, watchData]);

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
