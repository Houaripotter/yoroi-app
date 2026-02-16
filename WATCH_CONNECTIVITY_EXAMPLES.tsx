/**
 * EXEMPLES D'UTILISATION - WatchConnectivity
 *
 * Ce fichier montre comment intégrer WatchConnectivity dans différentes parties de l'app YOROI
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { WatchConnectivity, useWatchConnectivity } from '@/lib/watchConnectivity.ios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// EXEMPLE 1: Sync du Poids vers la Watch
// ============================================

export function ExempleWeightSync() {
  const { isAvailable, sendWeight } = useWatchConnectivity();

  const handleSaveWeight = async (weight: number) => {
    // Sauvegarder en local
    await AsyncStorage.setItem('currentWeight', weight.toString());

    // Envoyer à la Watch si disponible
    if (isAvailable) {
      try {
        await sendWeight(weight);
        console.log('✅ Poids envoyé à la Watch');
      } catch (error) {
        console.error('❌ Erreur sync Watch:', error);
      }
    }
  };

  return null;
}

// ============================================
// EXEMPLE 2: Sync de l'Hydratation
// ============================================

export function ExempleHydrationSync() {
  const { isAvailable, sendHydration } = useWatchConnectivity();

  const addWater = async (ml: number) => {
    const currentWater = parseInt(await AsyncStorage.getItem('waterIntake') || '0');
    const newWater = currentWater + ml;
    await AsyncStorage.setItem('waterIntake', newWater.toString());

    if (isAvailable) {
      try {
        await sendHydration(newWater);
      } catch (error) {
        console.error('Erreur sync hydratation:', error);
      }
    }
  };

  return null;
}

// ============================================
// EXEMPLE 3: Écouter les Données de la Watch
// ============================================

export function ExempleListenToWatch() {
  useEffect(() => {
    const messageListener = WatchConnectivity.onMessageReceived((message) => {
      console.log('📩 Message de la Watch:', message);

      if (message.workoutCompleted) {
        console.log('🏋️ Workout reçu:', message.workoutCompleted);
      }

      if (message.weightUpdate) {
        AsyncStorage.setItem('currentWeight', message.weightUpdate.toString());
      }
    });

    return () => {
      messageListener.remove();
    };
  }, []);

  return null;
}

// ============================================
// EXEMPLE 4: Indicateur de Statut Watch
// ============================================

export function WatchStatusIndicator() {
  const { isAvailable, isReachable } = useWatchConnectivity();

  if (!isAvailable) return null;

  return (
    <View style={{ padding: 8, backgroundColor: isReachable ? '#10B981' : '#F59E0B' }}>
      <Text style={{ color: 'white', fontSize: 12 }}>
        {isReachable ? '✅ Watch connectée' : '⚠️ Watch hors de portée'}
      </Text>
    </View>
  );
}