// ============================================
// YOROI - HOOK HEALTHKIT
// ============================================
// Initialisation et gestion des permissions HealthKit
// ============================================

import { useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import healthConnect from '@/lib/healthConnect.ios';
import logger from '@/lib/security/logger';

interface UseHealthKitReturn {
  isInitialized: boolean;
  isConnected: boolean;
  isAvailable: boolean;
  connectToHealthKit: () => Promise<boolean>;
  disconnectHealthKit: () => Promise<void>;
  syncHealthData: () => Promise<void>;
}

/**
 * Hook pour gérer HealthKit dans l'application
 * À utiliser dans le composant racine (_layout.tsx) ou dans un écran d'onboarding
 */
export function useHealthKit(): UseHealthKitReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  // Initialisation au montage
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      logger.info('HealthKit disponible uniquement sur iOS');
      return;
    }

    initializeHealthKit();
  }, []);

  const initializeHealthKit = async () => {
    try {
      // 1. Initialiser le service
      const initialized = await healthConnect.initialize();
      setIsInitialized(initialized);

      if (!initialized) {
        logger.warn('HealthKit initialization failed');
        return;
      }

      // 2. Vérifier la disponibilité
      const available = await healthConnect.isAvailable();
      setIsAvailable(available);

      if (!available) {
        logger.warn('HealthKit non disponible sur cet appareil');
        return;
      }

      // 3. Vérifier le statut de connexion
      const status = healthConnect.getSyncStatus();
      setIsConnected(status.isConnected);

      logger.info('HealthKit initialisé avec succès', {
        available,
        connected: status.isConnected,
      });
    } catch (error) {
      logger.error('Erreur initialisation HealthKit:', error);
    }
  };

  /**
   * Connecter à HealthKit et demander les permissions
   * Affiche le popup iOS natif de demande de permissions
   */
  const connectToHealthKit = async (): Promise<boolean> => {
    try {
      if (!isAvailable) {
        Alert.alert(
          'Apple Santé non disponible',
          'HealthKit n\'est pas disponible sur cet appareil.'
        );
        return false;
      }

      // Afficher une explication avant de demander les permissions
      return new Promise((resolve) => {
        Alert.alert(
          'Connexion à Apple Santé',
          'YOROI va demander l\'accès à vos données de santé pour un suivi complet de votre forme physique.\n\nDonnées demandées :\n• Poids et composition corporelle\n• Activité (pas, distance)\n• Sommeil\n• Fréquence cardiaque et HRV\n• VO2 Max\n• Entraînements',
          [
            {
              text: 'Annuler',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Autoriser',
              onPress: async () => {
                try {
                  // Demander les permissions (ouvre le popup iOS)
                  const connected = await healthConnect.connect();
                  setIsConnected(connected);

                  if (connected) {
                    Alert.alert(
                      'Connexion réussie',
                      'YOROI est maintenant connecté à Apple Santé.',
                      [{ text: 'OK' }]
                    );
                    // Première synchronisation
                    await healthConnect.syncAll();
                  } else {
                    Alert.alert(
                      'Permissions requises',
                      'Pour utiliser cette fonctionnalité, autorisez l\'accès dans Réglages > Santé > Partage de données > YOROI',
                      [
                        { text: 'Annuler', style: 'cancel' },
                        {
                          text: 'Ouvrir Réglages',
                          onPress: () => {
                            // TODO: Implémenter l'ouverture des Réglages iOS
                            // Linking.openSettings();
                          },
                        },
                      ]
                    );
                  }

                  resolve(connected);
                } catch (error) {
                  logger.error('Erreur connexion HealthKit:', error);
                  Alert.alert(
                    'Erreur',
                    'Impossible de se connecter à Apple Santé.'
                  );
                  resolve(false);
                }
              },
            },
          ]
        );
      });
    } catch (error) {
      logger.error('Erreur dans connectToHealthKit:', error);
      return false;
    }
  };

  /**
   * Déconnecter de HealthKit
   */
  const disconnectHealthKit = async () => {
    try {
      await healthConnect.disconnect();
      setIsConnected(false);
      logger.info('HealthKit déconnecté');
    } catch (error) {
      logger.error('Erreur déconnexion HealthKit:', error);
    }
  };

  /**
   * Synchroniser les données manuellement
   */
  const syncHealthData = async () => {
    try {
      if (!isConnected) {
        logger.warn('HealthKit non connecté');
        return;
      }

      await healthConnect.syncAll();
      logger.info('Synchronisation HealthKit terminée');
    } catch (error) {
      logger.error('Erreur synchronisation HealthKit:', error);
    }
  };

  return {
    isInitialized,
    isConnected,
    isAvailable,
    connectToHealthKit,
    disconnectHealthKit,
    syncHealthData,
  };
}
