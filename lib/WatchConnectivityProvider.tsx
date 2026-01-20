/**
 * WatchConnectivityProvider
 *
 * Provider global pour gérer la communication iPhone ↔ Apple Watch
 * Sync automatique des données: poids, hydratation, workouts, records
 */

import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { Platform, Animated, View, Text, StyleSheet } from 'react-native';
import { WatchConnectivity } from '@/lib/watchConnectivity.ios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addWeight, getProfile } from '@/lib/database';
import { getBenchmarks, addBenchmarkEntry } from '@/lib/carnetService';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export interface WatchContextType {
  isWatchAvailable: boolean;
  isWatchReachable: boolean;
  lastError: string | null;
  lastSyncDate: Date | null;
  syncWeight: (weight: number) => Promise<void>;
  syncHydration: (waterIntake: number) => Promise<void>;
  syncWorkout: (workout: any) => Promise<void>;
  syncRecords: (records: any[]) => Promise<void>;
  syncAllData: () => Promise<void>;
  watchData: any;
}

const WatchContext = createContext<WatchContextType | null>(null);

export function WatchConnectivityProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isReachable, setIsReachable] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [watchData, setWatchData] = useState<any>(null);
  
  // Animation de la bannière
  const bannerAnim = useRef(new Animated.Value(-100)).current;
  const [syncMessage, setSyncMessage] = useState('');

  const showSyncBanner = (message: string) => {
    setSyncMessage(message);
    Animated.sequence([
      Animated.spring(bannerAnim, { toValue: 50, useNativeDriver: true, speed: 12 }),
      Animated.delay(2000),
      Animated.timing(bannerAnim, { toValue: -100, duration: 500, useNativeDriver: true })
    ]).start();
  };

  // Synchroniser les infos de profil immédiatement si possible
  const syncProfileToWatch = useCallback(async () => {
    try {
      const profile = await getProfile();
      if (profile) {
        // Récupérer les données de gamification depuis AsyncStorage
        const [avatarId, level, rank] = await Promise.all([
          AsyncStorage.getItem('@yoroi_avatar_id'),
          AsyncStorage.getItem('@yoroi_level'),
          AsyncStorage.getItem('@yoroi_rank'),
        ]);

        await WatchConnectivity.updateApplicationContext({
          avatarConfig: {
            name: avatarId || 'samurai',
            level: level ? parseInt(level) : 1,
            rank: rank || 'Novice'
          },
          userName: profile.name || 'Guerrier',
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.log('⚠️ Erreur sync profil vers watch:', e);
    }
  }, []);

  // Handler pour les messages de la Watch
  const handleWatchMessage = useCallback(async (message: any) => {
    try {
      if (message.weightUpdate) {
        showSyncBanner('⚖️ Poids synchronisé');
        const weight = typeof message.weightUpdate === 'number' ? message.weightUpdate : message.weightUpdate.weight;
        await addWeight(weight);
        await AsyncStorage.setItem('currentWeight', String(weight));
      }

      if (message.hydrationUpdate) {
        showSyncBanner('💧 Hydratation mise à jour');
      }
      
      if (message.newRecordFromWatch) {
        showSyncBanner('🏆 Record enregistré');
        try {
          const record = typeof message.newRecordFromWatch === 'string' 
            ? JSON.parse(message.newRecordFromWatch) 
            : message.newRecordFromWatch;
          const benchmarks = await getBenchmarks();
          let target = benchmarks.find(b => b.name.toLowerCase() === record.exercise.toLowerCase());
          if (target) {
            await addBenchmarkEntry(target.id, record.weight, 5, 'Apple Watch', new Date(record.date), record.reps);
          }
        } catch (e) {}
      }

      if (message.testSignal) {
        showSyncBanner('⌚ Apple Watch connectée');
      }

      if (message.ping) {
        WatchConnectivity.sendMessageToWatch({ pong: true, timestamp: Date.now() }).catch(() => {});
      }
    } catch (error) {
      console.error('❌ Erreur handling watch message:', error);
    }
  }, []);

  // Initialisation
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const init = async () => {
      try {
        await WatchConnectivity.activateSession();
        const available = await WatchConnectivity.isWatchAvailable();
        const reachable = await WatchConnectivity.isWatchReachable();
        setIsAvailable(available);
        setIsReachable(reachable);

        if (available) {
          syncAllData();
          syncProfileToWatch();
        }

        // Listeners
        WatchConnectivity.onReachabilityChanged((status) => {
          setIsReachable(status.isReachable);
          setIsAvailable(status.isPaired && status.isWatchAppInstalled);
          if (status.isReachable) {
            syncAllData();
            syncProfileToWatch();
          }
        });

        WatchConnectivity.onMessageReceived((message) => {
          handleWatchMessage(message);
        });

        WatchConnectivity.onDataReceived((data) => {
          if (data.data) setWatchData(data.data);
        });

      } catch (e) {
        console.error('Watch init error:', e);
      }
    };

    init();
  }, [handleWatchMessage, syncProfileToWatch]);

  const syncWeight = async (weight: number) => {
    if (isAvailable) await WatchConnectivity.sendWeightUpdate(weight);
  };

  const syncHydration = async (amount: number) => {
    if (isAvailable) await WatchConnectivity.sendHydrationUpdate(amount);
  };

  const syncWorkout = async (workout: any) => {
    if (isAvailable) await WatchConnectivity.sendWorkoutSession(workout);
  };

  const syncRecords = async (records: any[]) => {
    if (isAvailable) await WatchConnectivity.sendRecordsUpdate(records);
  };

  const syncAllData = async () => {
    if (!isAvailable) return;
    try {
      const [weight, waterIntake, streak] = await Promise.all([
        AsyncStorage.getItem('currentWeight'),
        AsyncStorage.getItem('waterIntake'),
        AsyncStorage.getItem('streak'),
      ]);
      await WatchConnectivity.updateApplicationContext({
        weight: parseFloat(weight || '0'),
        waterIntake: parseInt(waterIntake || '0'),
        streak: parseInt(streak || '0'),
        timestamp: Date.now(),
      });
      setLastSyncDate(new Date());
    } catch (e) {}
  };

  return (
    <WatchContext.Provider
      value={{
        isWatchAvailable: isAvailable,
        isWatchReachable: isReachable,
        lastError,
        lastSyncDate,
        syncWeight,
        syncHydration,
        syncWorkout,
        syncRecords,
        syncAllData,
        watchData,
      }}
    >
      {children}
      
      <Animated.View style={[styles.banner, { transform: [{ translateY: bannerAnim }] }]}>
        <View style={styles.bannerContent}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="watch" size={20} color="#000" />
          </View>
          <Text style={styles.bannerText}>{syncMessage}</Text>
        </View>
      </Animated.View>
    </WatchContext.Provider>
  );
}

const styles = StyleSheet.create({
  banner: { position: 'absolute', top: 0, left: 20, right: 20, zIndex: 9999, alignItems: 'center' },
  bannerContent: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4ade80', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 25, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  iconContainer: { width: 28, height: 28, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bannerText: { color: '#000', fontWeight: '800', fontSize: 14 }
});

export function useWatch() {
  const context = useContext(WatchContext);
  if (!context) throw new Error('useWatch must be used within WatchConnectivityProvider');
  return context;
}