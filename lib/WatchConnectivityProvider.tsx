/**
 * WatchConnectivityProvider
 *
 * Provider global pour gérer la communication iPhone ↔ Apple Watch
 * Sync automatique des données: poids, hydratation, workouts, records
 */

import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { WatchConnectivity } from '@/lib/watchConnectivity.ios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addWeight } from '@/lib/database';
import { getBenchmarks, addBenchmarkEntry } from '@/lib/carnetService';
import { appleWatchService } from '@/lib/appleWatchService';

interface WatchContextType {
  // Statut
  isWatchAvailable: boolean;
  isWatchReachable: boolean;
  lastError: string | null;
  lastSyncDate: Date | null;

  // Actions de sync
  syncWeight: (weight: number) => Promise<void>;
  syncHydration: (waterIntake: number) => Promise<void>;
  syncWorkout: (workout: any) => Promise<void>;
  syncRecords: (records: any[]) => Promise<void>;
  syncAllData: () => Promise<void>;

  // Données reçues de la Watch
  watchData: any;
}

const WatchContext = createContext<WatchContextType | null>(null);

export function WatchConnectivityProvider({ children }: { children: ReactNode }) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isReachable, setIsReachable] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSyncDate, setLastSyncDate] = useState<Date | null>(null);
  const [watchData, setWatchData] = useState<any>(null);

  // Initialisation au montage
  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    initializeWatchConnectivity();

    return () => {
      // Cleanup listeners
    };
  }, []);

  const initializeWatchConnectivity = async () => {
    try {
      console.log('📡 Tentative d\'activation WatchConnectivity...');
      
      // Activer la session explicitement
      await WatchConnectivity.activateSession();
      
      // Vérifier disponibilité
      const available = await WatchConnectivity.isWatchAvailable();
      const reachable = await WatchConnectivity.isWatchReachable();

      setIsAvailable(available);
      setIsReachable(reachable);

      if (available) {
        console.log('✅ Apple Watch détectée et configurée');

        // Sync initiale si Watch disponible
        await syncAllData();
      }

      // Écouter les changements de reachability
      const reachabilityListener = WatchConnectivity.onReachabilityChanged((status) => {
        console.log('📡 Watch reachability changed:', status.isReachable);

        setIsReachable(status.isReachable);
        setIsAvailable(status.isPaired && status.isWatchAppInstalled);

        // Si Watch revient à portée, sync automatique
        if (status.isReachable) {
          console.log('✅ Watch reconnectée - sync des données automatique...');
          // Petit délai pour laisser la session se stabiliser
          setTimeout(() => syncAllData(), 1000);
        }
      });

      // Écouter les messages de la Watch
      const messageListener = WatchConnectivity.onMessageReceived((message) => {
        console.log('📩 Message reçu de la Watch:', message);
        handleWatchMessage(message);
      });

      // Écouter les données de la Watch
      const dataListener = WatchConnectivity.onDataReceived((data) => {
        console.log('📦 Données reçues de la Watch:', data.type);
        setWatchData(data.data);
        handleWatchData(data);
      });

      // Écouter les erreurs
      const errorListener = WatchConnectivity.onError((error) => {
        console.error('❌ Erreur WatchConnectivity:', error.error);
        setLastError(error.error);

        // Clear error après 5 secondes
        setTimeout(() => setLastError(null), 5000);
      });

      // Écouter l'activation
      const activationListener = WatchConnectivity.onActivationCompleted((status) => {
        console.log('✅ WatchConnectivity activée:', status.state);

        if (status.error) {
          setLastError(status.error);
        }
      });

    } catch (error) {
      console.error('❌ Erreur initialisation WatchConnectivity:', error);
    }
  };

  // Handler pour les messages de la Watch
  const handleWatchMessage = useCallback(async (message: any) => {
    try {
      // Workout complété sur la Watch
      if (message.workoutCompleted) {
        console.log('🏋️ Workout reçu de la Watch:', message.workoutCompleted);
        await AsyncStorage.setItem('lastWatchWorkout', JSON.stringify(message.workoutCompleted));
      }

      // Poids mis à jour depuis la Watch
      if (message.weightUpdate) {
        const weight = typeof message.weightUpdate === 'number' ? message.weightUpdate : message.weightUpdate.weight;
        console.log('⚖️ Poids mis à jour depuis la Watch:', weight);
        
        // Sauvegarder dans la vraie base SQLite
        await addWeight(weight);
        
        // Mettre à jour l'état local si nécessaire via appleWatchService ou autre
        await AsyncStorage.setItem('currentWeight', String(weight));
      }

      // Hydratation mise à jour depuis la Watch
      if (message.hydrationUpdate) {
        const amount = typeof message.hydrationUpdate === 'number' ? message.hydrationUpdate : message.hydrationUpdate.waterIntake;
        console.log('💧 Hydratation mise à jour depuis la Watch:', amount);
        // ... handled via appleWatchService or direct add
      }
      
      // Nouveau record reçu de la Watch
      if (message.newRecordFromWatch) {
        try {
          const record = typeof message.newRecordFromWatch === 'string' 
            ? JSON.parse(message.newRecordFromWatch) 
            : message.newRecordFromWatch;
            
          console.log('🏆 Nouveau record reçu de la Watch:', record.exercise);
          
          // Sauvegarder dans la base iPhone
          // On cherche ou crée le benchmark d'abord
          const benchmarks = await getBenchmarks();
          let target = benchmarks.find(b => b.name.toLowerCase() === record.exercise.toLowerCase());
          
          if (target) {
            await addBenchmarkEntry(
              target.id,
              record.weight,
              5, // RPE par défaut
              'Ajouté depuis Apple Watch',
              new Date(record.date),
              record.reps
            );
            console.log('✅ Record Watch sauvegardé sur iPhone');
          }
        } catch (e) {
          console.error('❌ Erreur parsing record Watch:', e);
        }
      }

      // SIGNAL DE TEST / SYNC REÇU
      if (message.testSignal) {
        console.log('📡 Signal de synchronisation reçu de la Watch');
        // On pourrait déclencher une petite vibration ici ou un toast
      }
      
      // Support du format direct envoyé par WatchConnectivityManager.swift
      if (message.weightUpdate !== undefined) {
          // Déjà géré au dessus
      }
    } catch (error) {
      console.error('❌ Erreur handling watch message:', error);
    }
  }, []);

  // Handler pour les données de la Watch
  const handleWatchData = useCallback(async (dataEvent: any) => {
    if (dataEvent.type === 'applicationContext') {
      console.log('📦 Application context reçu de la Watch');
      // Mettre à jour les données locales si nécessaire
    }

    if (dataEvent.type === 'userInfo') {
      console.log('📦 UserInfo reçu de la Watch');
    }
  }, []);

  // Sync du poids vers la Watch
  const syncWeight = useCallback(async (weight: number) => {
    if (!isAvailable || Platform.OS !== 'ios') {
      console.log('⚠️ Watch non disponible - skip sync weight');
      return;
    }

    try {
      await WatchConnectivity.sendWeightUpdate(weight);
      setLastSyncDate(new Date());
      console.log('✅ Poids envoyé à la Watch:', weight);
    } catch (error) {
      console.error('❌ Erreur sync weight:', error);
      setLastError('Erreur sync poids');
      // Ne pas throw - continuer même si la Watch n'est pas disponible
    }
  }, [isAvailable]);

  // Sync de l'hydratation vers la Watch
  const syncHydration = useCallback(async (waterIntake: number) => {
    if (!isAvailable || Platform.OS !== 'ios') {
      console.log('⚠️ Watch non disponible - skip sync hydration');
      return;
    }

    try {
      await WatchConnectivity.sendHydrationUpdate(waterIntake);
      setLastSyncDate(new Date());
      console.log('✅ Hydratation envoyée à la Watch:', waterIntake);
    } catch (error) {
      console.error('❌ Erreur sync hydration:', error);
      setLastError('Erreur sync hydratation');
    }
  }, [isAvailable]);

  // Sync d'un workout vers la Watch
  const syncWorkout = useCallback(async (workout: any) => {
    if (!isAvailable || Platform.OS !== 'ios') {
      console.log('⚠️ Watch non disponible - skip sync workout');
      return;
    }

    try {
      await WatchConnectivity.sendWorkoutSession(workout);
      setLastSyncDate(new Date());
      console.log('✅ Workout envoyé à la Watch');
    } catch (error) {
      console.error('❌ Erreur sync workout:', error);
      setLastError('Erreur sync workout');
    }
  }, [isAvailable]);

  // Sync des records vers la Watch
  const syncRecords = useCallback(async (records: any[]) => {
    if (!isAvailable || Platform.OS !== 'ios') {
      console.log('⚠️ Watch non disponible - skip sync records');
      return;
    }

    try {
      await WatchConnectivity.sendRecordsUpdate(records);
      setLastSyncDate(new Date());
      console.log('✅ Records envoyés à la Watch:', records.length);
    } catch (error) {
      console.error('❌ Erreur sync records:', error);
      setLastError('Erreur sync records');
    }
  }, [isAvailable]);

  // Sync complète de toutes les données
  const syncAllData = useCallback(async () => {
    if (!isAvailable || Platform.OS !== 'ios') {
      console.log('⚠️ Watch non disponible - skip sync all');
      return;
    }

    try {
      console.log('🔄 Sync complète vers la Watch...');

      // Charger toutes les données depuis AsyncStorage
      const [weight, waterIntake, streak] = await Promise.all([
        AsyncStorage.getItem('currentWeight'),
        AsyncStorage.getItem('waterIntake'),
        AsyncStorage.getItem('streak'),
      ]);

      // Envoyer tout en une fois via applicationContext
      await WatchConnectivity.updateApplicationContext({
        weight: parseFloat(weight || '0'),
        waterIntake: parseInt(waterIntake || '0'),
        streak: parseInt(streak || '0'),
        lastSync: new Date().toISOString(),
        timestamp: Date.now(),
      });

      setLastSyncDate(new Date());
      console.log('✅ Sync complète réussie');
    } catch (error) {
      console.error('❌ Erreur sync complète:', error);
      setLastError('Erreur sync complète');
    }
  }, [isAvailable]);

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
    </WatchContext.Provider>
  );
}

/**
 * Hook pour utiliser WatchConnectivity dans vos composants
 *
 * @example
 * ```tsx
 * const { syncWeight, isWatchAvailable } = useWatch();
 *
 * const handleSaveWeight = async (weight: number) => {
 *   await AsyncStorage.setItem('weight', String(weight));
 *   if (isWatchAvailable) {
 *     await syncWeight(weight);
 *   }
 * };
 * ```
 */
export function useWatch() {
  const context = useContext(WatchContext);
  if (!context) {
    throw new Error('useWatch must be used within WatchConnectivityProvider');
  }
  return context;
}
