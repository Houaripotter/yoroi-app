/**
 * EXEMPLES D'UTILISATION - WatchConnectivity
 *
 * Ce fichier montre comment intégrer WatchConnectivity dans différentes parties de l'app YOROI
 *
 * NE PAS INCLURE CE FICHIER DANS LE BUILD - C'EST UN GUIDE
 */

import { useEffect } from 'react';
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
        // Continuer même si la Watch n'est pas disponible
      }
    }
  };

  return null; // Votre UI ici
}

// ============================================
// EXEMPLE 2: Sync de l'Hydratation
// ============================================

export function ExempleHydrationSync() {
  const { sendHydration } = useWatchConnectivity();

  const addWater = async (ml: number) => {
    // Mettre à jour l'état local
    const currentWater = parseInt(await AsyncStorage.getItem('waterIntake') || '0');
    const newWater = currentWater + ml;
    await AsyncStorage.setItem('waterIntake', newWater.toString());

    // Sync avec la Watch
    try {
      await sendHydration(newWater);
    } catch (error) {
      console.error('Erreur sync hydratation:', error);
    }
  };

  return null;
}

// ============================================
// EXEMPLE 3: Écouter les Données de la Watch
// ============================================

export function ExempleListenToWatch() {
  useEffect(() => {
    // Écouter les messages de la Watch
    const messageListener = WatchConnectivity.onMessageReceived((message) => {
      console.log('📩 Message de la Watch:', message);

      // Gérer différents types de messages
      if (message.workoutCompleted) {
        handleWorkoutFromWatch(message.workoutCompleted);
      }

      if (message.weightUpdate) {
        handleWeightFromWatch(message.weightUpdate);
      }

      if (message.waterIntake) {
        handleHydrationFromWatch(message.waterIntake);
      }
    });

    // Écouter les changements de statut
    const statusListener = WatchConnectivity.onReachabilityChanged((status) => {
      if (status.isReachable) {
        console.log('✅ Watch connectée - sync des données...');
        syncAllDataToWatch();
      } else {
        console.log('⚠️ Watch déconnectée');
      }
    });

    return () => {
      messageListener.remove();
      statusListener.remove();
    };
  }, []);

  const handleWorkoutFromWatch = (workout: any) => {
    console.log('🏋️ Workout reçu de la Watch:', workout);
    // Sauvegarder dans votre state/storage
  };

  const handleWeightFromWatch = (weight: number) => {
    console.log('⚖️ Poids mis à jour depuis la Watch:', weight);
    AsyncStorage.setItem('currentWeight', weight.toString());
  };

  const handleHydrationFromWatch = (waterIntake: number) => {
    console.log('💧 Hydratation mise à jour depuis la Watch:', waterIntake);
    AsyncStorage.setItem('waterIntake', waterIntake.toString());
  };

  const syncAllDataToWatch = async () => {
    // Récupérer toutes les données locales
    const weight = parseFloat(await AsyncStorage.getItem('currentWeight') || '0');
    const waterIntake = parseInt(await AsyncStorage.getItem('waterIntake') || '0');

    // Envoyer à la Watch
    try {
      await WatchConnectivity.updateApplicationContext({
        weight,
        waterIntake,
        lastSync: new Date().toISOString(),
      });
      console.log('✅ Toutes les données sync vers la Watch');
    } catch (error) {
      console.error('❌ Erreur sync complète:', error);
    }
  };

  return null;
}

// ============================================
// EXEMPLE 4: Provider Global WatchConnectivity
// ============================================

import React, { createContext, useContext, ReactNode } from 'react';

interface WatchContextType {
  isWatchAvailable: boolean;
  isWatchReachable: boolean;
  syncWeight: (weight: number) => Promise<void>;
  syncHydration: (waterIntake: number) => Promise<void>;
  syncWorkout: (workout: any) => Promise<void>;
}

const WatchContext = createContext<WatchContextType | null>(null);

export function WatchConnectivityProvider({ children }: { children: ReactNode }) {
  const { isAvailable, isReachable, sendWeight, sendHydration, sendWorkout } = useWatchConnectivity();

  const syncWeight = async (weight: number) => {
    if (!isAvailable) return;
    await sendWeight(weight);
  };

  const syncHydration = async (waterIntake: number) => {
    if (!isAvailable) return;
    await sendHydration(waterIntake);
  };

  const syncWorkout = async (workout: any) => {
    if (!isAvailable) return;
    await sendWorkout(workout);
  };

  return (
    <WatchContext.Provider
      value={{
        isWatchAvailable: isAvailable,
        isWatchReachable: isReachable,
        syncWeight,
        syncHydration,
        syncWorkout,
      }}
    >
      {children}
    </WatchContext.Provider>
  );
}

export function useWatch() {
  const context = useContext(WatchContext);
  if (!context) {
    throw new Error('useWatch must be used within WatchConnectivityProvider');
  }
  return context;
}

// ============================================
// EXEMPLE 5: Intégration dans _layout.tsx
// ============================================

export function ExempleLayoutIntegration() {
  return (
    `
// app/_layout.tsx
import { WatchConnectivityProvider } from './WatchConnectivityProvider';

export default function RootLayout() {
  return (
    <WatchConnectivityProvider>
      <Stack>
        <Stack.Screen name="(tabs)" />
        {/* Vos autres screens */}
      </Stack>
    </WatchConnectivityProvider>
  );
}
    `
  );
}

// ============================================
// EXEMPLE 6: Utilisation dans un Composant
// ============================================

export function ExempleComponentUsage() {
  const { isWatchAvailable, isWatchReachable, syncWeight } = useWatch();

  const handleWeightChange = async (newWeight: number) => {
    // Sauvegarder localement
    await AsyncStorage.setItem('currentWeight', newWeight.toString());

    // Sync vers Watch si disponible
    if (isWatchAvailable) {
      await syncWeight(newWeight);
    }
  };

  return (
    <View>
      <Text>Watch: {isWatchReachable ? '✅ Connectée' : '⚠️ Déconnectée'}</Text>
      {/* Votre UI */}
    </View>
  );
}

// ============================================
// EXEMPLE 7: Sync Automatique au Lancement
// ============================================

export function ExempleSyncOnAppStart() {
  useEffect(() => {
    const syncInitialData = async () => {
      const isAvailable = await WatchConnectivity.isWatchAvailable();

      if (!isAvailable) {
        console.log('⚠️ Watch non disponible - skip sync');
        return;
      }

      // Charger toutes les données depuis AsyncStorage
      const [weight, waterIntake, streak] = await Promise.all([
        AsyncStorage.getItem('currentWeight'),
        AsyncStorage.getItem('waterIntake'),
        AsyncStorage.getItem('streak'),
      ]);

      // Envoyer à la Watch
      try {
        await WatchConnectivity.updateApplicationContext({
          weight: parseFloat(weight || '0'),
          waterIntake: parseInt(waterIntake || '0'),
          streak: parseInt(streak || '0'),
          lastSync: new Date().toISOString(),
        });

        console.log('✅ Données initiales envoyées à la Watch');
      } catch (error) {
        console.error('❌ Erreur sync initial:', error);
      }
    };

    syncInitialData();
  }, []);

  return null;
}

// ============================================
// EXEMPLE 8: Indicateur de Statut Watch dans l'UI
// ============================================

import { View, Text } from 'react-native';

export function WatchStatusIndicator() {
  const { isWatchAvailable, isWatchReachable } = useWatchConnectivity();

  if (!isWatchAvailable) {
    return null; // Ne rien afficher si pas de Watch
  }

  return (
    <View style={{ padding: 8, backgroundColor: isWatchReachable ? '#10B981' : '#F59E0B' }}>
      <Text style={{ color: 'white', fontSize: 12 }}>
        {isWatchReachable ? '✅ Watch connectée' : '⚠️ Watch hors de portée'}
      </Text>
    </View>
  );
}

// ============================================
// EXEMPLE 9: Batch Update (Plusieurs données en 1 fois)
// ============================================

export async function batchSyncToWatch(data: {
  weight?: number;
  waterIntake?: number;
  streak?: number;
  records?: any[];
  workouts?: any[];
}) {
  try {
    await WatchConnectivity.updateApplicationContext({
      ...data,
      timestamp: Date.now(),
      lastSync: new Date().toISOString(),
    });

    console.log('✅ Batch update envoyé à la Watch');
  } catch (error) {
    console.error('❌ Erreur batch update:', error);
  }
}

// Usage:
// await batchSyncToWatch({
//   weight: 78.5,
//   waterIntake: 1500,
//   streak: 12,
// });

// ============================================
// EXEMPLE 10: Gestion des Erreurs
// ============================================

export function ExempleErrorHandling() {
  const [watchError, setWatchError] = React.useState<string | null>(null);

  useEffect(() => {
    const errorListener = WatchConnectivity.onError((error) => {
      console.error('❌ Erreur Watch:', error.error);
      setWatchError(error.error);

      // Auto-clear après 5 secondes
      setTimeout(() => setWatchError(null), 5000);
    });

    return () => errorListener.remove();
  }, []);

  if (watchError) {
    return (
      <View style={{ padding: 12, backgroundColor: '#EF4444' }}>
        <Text style={{ color: 'white' }}>Erreur Watch: {watchError}</Text>
      </View>
    );
  }

  return null;
}

// ============================================
// NOTES D'IMPLÉMENTATION
// ============================================

/*
ÉTAPES D'INTÉGRATION:

1. Ajouter WatchConnectivityProvider dans _layout.tsx

2. Importer le hook dans vos composants:
   import { useWatch } from '@/lib/WatchConnectivityProvider';

3. Utiliser dans vos fonctions de sauvegarde:
   const { syncWeight } = useWatch();
   await syncWeight(newWeight);

4. Écouter les données de la Watch au lancement:
   - Utiliser ExempleSyncOnAppStart dans App.tsx
   - Ou dans le composant racine

5. Afficher le statut Watch (optionnel):
   <WatchStatusIndicator />

BONNES PRATIQUES:

✅ Toujours vérifier isWatchAvailable avant d'envoyer
✅ Gérer les erreurs avec try/catch
✅ Ne pas bloquer l'UI si la Watch n'est pas disponible
✅ Logger les sync pour debug
✅ Utiliser updateApplicationContext pour données importantes (persiste)
✅ Utiliser sendMessageToWatch pour actions immédiates (requiert reachable)

❌ Ne pas spammer de requêtes (limiter à 50 messages/heure max)
❌ Ne pas envoyer de grosses données (max 256KB par message)
❌ Ne pas assumer que la Watch est toujours disponible
*/
