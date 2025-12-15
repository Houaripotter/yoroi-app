import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMeasurement, getAllMeasurements } from './storage';

let AppleHealthKit: any = null; // Déclarer comme any pour gérer l'import conditionnel

// Import sécurisé du module HealthKit
try {
  if (Platform.OS === 'ios') {
    AppleHealthKit = require('react-native-health').default;
  }
} catch (e) {
  console.log("ℹ️ Module react-native-health non disponible (Mode Offline/Simulateur):", e);
  AppleHealthKit = null;
}

const APPLE_HEALTH_ENABLED_KEY = '@yoroi_apple_health_enabled';
const LAST_SYNC_KEY = '@yoroi_last_health_sync';

/**
 * Vérification robuste de la disponibilité de HealthKit
 * Cette fonction ne crashe JAMAIS, même si le module natif n'est pas chargé
 */
const isHealthKitAvailable = (): boolean => {
  try {
    // Vérification 1: Plateforme iOS uniquement
    if (Platform.OS !== 'ios') {
      return false;
    }
    
    // Vérification 2: Module chargé
    if (!AppleHealthKit || typeof AppleHealthKit === 'undefined') {
      console.log("ℹ️ HealthKit non disponible (module non chargé)");
      return false;
    }
    
    // Vérification 3: Méthode initHealthKit existe
    if (typeof AppleHealthKit.initHealthKit !== 'function') {
      console.log("ℹ️ HealthKit non disponible (initHealthKit manquant)");
      return false;
    }
    
    // Vérification 4: Méthode isAvailable existe
    if (typeof AppleHealthKit.isAvailable !== 'function') {
      console.log("ℹ️ HealthKit non disponible (isAvailable manquant)");
      return false;
    }
    
    return true;
  } catch (e) {
    console.log("ℹ️ HealthKit non disponible (erreur de vérification):", e);
    return false;
  }
};

// Alias pour la compatibilité
const hasHealthKit = isHealthKitAvailable;

// Permissions nécessaires - construites de manière sécurisée
const getPermissions = () => {
  try {
    if (!isHealthKitAvailable() || !AppleHealthKit?.Constants?.Permissions) {
      return { permissions: { read: [], write: [] } };
    }
    
    const Perms = AppleHealthKit.Constants.Permissions;
    return {
      permissions: {
        read: [
          Perms.Weight,
          Perms.BodyMassIndex,
          Perms.BodyFatPercentage,
          Perms.LeanBodyMass,
        ].filter(Boolean),
        write: [
          Perms.Weight,
          Perms.BodyMassIndex,
          Perms.BodyFatPercentage,
        ].filter(Boolean),
      },
    };
  } catch (e) {
    console.log("ℹ️ Impossible de construire les permissions HealthKit:", e);
    return { permissions: { read: [], write: [] } };
  }
};

// Vérifier si Apple Health est disponible (version plus simple pour l'UI)
export const isAppleHealthAvailable = (): boolean => {
  if (!hasHealthKit()) return false;
  return isHealthKitAvailable();
};

// Initialiser Apple Health et demander les permissions
export const initializeAppleHealth = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!hasHealthKit()) {
      console.log('⚠️ Apple Health non disponible (initializeAppleHealth)');
      resolve(false);
      return;
    }
    if (!isHealthKitAvailable()) {
      console.log('⚠️ Apple Health non disponible ou mal configuré (initializeAppleHealth)');
      resolve(false);
      return;
    }

    try {
      const permissions = getPermissions();
      AppleHealthKit.initHealthKit(permissions, (error: any) => {
        if (error) {
          console.error('❌ Erreur lors de l\'initialisation Apple Health:', error);
          resolve(false);
          return;
        }
        console.log('✅ Apple Health initialisé avec succès');
        resolve(true);
      });
    } catch (e) {
      console.error('❌ Erreur HealthKit (init):', e);
      resolve(false);
    }
  });
};

// Vérifier si l'utilisateur a accordé les permissions
export const checkHealthPermissions = async (): Promise<boolean> => {
  if (!hasHealthKit()) return false;
  if (!isHealthKitAvailable()) {
    console.log('⚠️ Apple Health non disponible ou mal configuré (checkHealthPermissions)');
    return false;
  }

  return new Promise((resolve) => {
    try {
      AppleHealthKit.isAvailable((error: any, available: boolean) => {
        if (error || !available) {
          console.log('⚠️ Apple Health non disponible:', error);
          return resolve(false);
        }

        // Vérifier les permissions de lecture pour le poids
        const permissions = getPermissions();
        AppleHealthKit.getAuthStatus(permissions, (authError: any, results: any) => {
          if (authError) {
            console.log('⚠️ Erreur auth HealthKit:', authError);
            return resolve(false);
          }

          const hasPermission = results?.permissions?.read?.includes(
            AppleHealthKit?.Constants?.Permissions?.Weight
          );
          resolve(!!hasPermission);
        });
      });
    } catch (e) {
      console.error('❌ Erreur HealthKit (checkPermissions):', e);
      resolve(false);
    }
  });
};

// Récupérer l'historique de poids depuis Apple Health
export const importWeightFromAppleHealth = async (): Promise<number> => {
  if (!hasHealthKit()) return 0;
  if (!isHealthKitAvailable()) {
    Alert.alert('Erreur', 'Apple Health n\'est disponible que sur iOS ou est mal configuré.');
    return 0;
  }

  try {
    const initialized = await initializeAppleHealth();
    if (!initialized) {
      Alert.alert('Erreur', 'Impossible d\'accéder à Apple Health. Vérifiez les permissions dans Réglages > Confidentialité > Santé > Yoroi');
      return 0;
    }

    const options: any = {
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      ascending: true,
    };

    return new Promise((resolve) => {
      try {
        AppleHealthKit.getWeightSamples(options, async (error: any, results: any) => {
          if (error) {
            console.error('❌ Erreur lors de la récupération des poids:', error);
            Alert.alert('Erreur', 'Impossible de récupérer les données de poids.');
            resolve(0);
            return;
          }

          if (!results || results.length === 0) {
            Alert.alert('Information', 'Aucune donnée de poids trouvée dans Apple Health.');
            resolve(0);
            return;
          }

          console.log(`📊 ${results.length} mesures de poids trouvées dans Apple Health`);

          const existingMeasurements = await getAllMeasurements();
          const existingDates = new Set(
            existingMeasurements.map(m => new Date(m.date).toISOString().split('T')[0])
          );

          const newEntries = results
            .filter((sample: any) => {
              const date = new Date(sample.startDate).toISOString().split('T')[0];
              return !existingDates.has(date);
            })
            .map((sample: any) => ({
              weight: sample.value,
              date: sample.startDate,
              created_at: new Date().toISOString(),
            }));

          let importedCount = 0;
          for (const entry of newEntries) {
              await addMeasurement(entry);
              importedCount++;
          }
          
          if (importedCount > 0) {
            console.log(`✅ ${importedCount} nouvelles mesures importées`);
            Alert.alert('Succès', `${importedCount} mesure(s) importée(s) depuis Apple Health`);
          } else {
              Alert.alert('Information', 'Toutes les données sont déjà importées ou aucune nouvelle donnée disponible.');
          }
          resolve(importedCount);
        });
      } catch (e) {
        console.error('❌ Erreur HealthKit (getWeightSamples):', e);
        Alert.alert('Erreur', 'Une erreur est survenue lors de la récupération des poids.');
        resolve(0);
      }
    });
  } catch (error) {
    console.error('❌ Exception lors de l\'import:', error);
    Alert.alert('Erreur', 'Une erreur est survenue lors de l\'import.');
    return 0;
  }
};

// Envoyer une mesure de poids vers Apple Health
export const exportWeightToAppleHealth = async (
  weight: number,
  date: Date = new Date()
): Promise<boolean> => {
  if (!hasHealthKit()) return false;
  if (!isHealthKitAvailable()) {
    console.log('⚠️ Apple Health non disponible ou mal configuré (exportWeightToAppleHealth)');
    return false;
  }

  try {
    const autoExportEnabled = await AsyncStorage.getItem(APPLE_HEALTH_ENABLED_KEY);
    if (autoExportEnabled !== 'true') {
      console.log('ℹ️  Export vers Apple Health désactivé');
      return false;
    }

    const options: any = {
      value: weight,
      startDate: date.toISOString(),
      endDate: date.toISOString(),
    };

    return new Promise((resolve) => {
      try {
        AppleHealthKit.saveWeight(options, (error: any) => {
          if (error) {
            console.error('❌ Erreur lors de l\'export du poids:', error);
            resolve(false);
            return;
          }
          console.log(`✅ Poids exporté vers Apple Health: ${weight} kg`);
          resolve(true);
        });
      } catch (e) {
        console.error('❌ Erreur HealthKit (saveWeight):', e);
        resolve(false);
      }
    });
  } catch (error) {
    console.error('❌ Exception lors de l\'export:', error);
    return false;
  }
};

// Envoyer l'IMC vers Apple Health
export const exportBMIToAppleHealth = async (
  bmi: number,
  date: Date = new Date()
): Promise<boolean> => {
  if (!hasHealthKit()) return false;
  if (!isHealthKitAvailable()) {
    console.log('⚠️ Apple Health non disponible ou mal configuré (exportBMIToAppleHealth)');
    return false;
  }

  try {
    const autoExportEnabled = await AsyncStorage.getItem(APPLE_HEALTH_ENABLED_KEY);
    if (autoExportEnabled !== 'true') return false;

    const options: any = {
      value: bmi,
      startDate: date.toISOString(),
      endDate: date.toISOString(),
    };

    return new Promise((resolve) => {
      try {
        AppleHealthKit.saveBmi(options, (error: any) => {
          if (error) {
            console.error('❌ Erreur lors de l\'export de l\'IMC:', error);
            resolve(false);
            return;
          }
          console.log(`✅ IMC exporté vers Apple Health: ${bmi}`);
          resolve(true);
        });
      } catch (e) {
        console.error('❌ Erreur HealthKit (saveBmi):', e);
        resolve(false);
      }
    });
  } catch (error) {
    console.error('❌ Exception lors de l\'export de l\'IMC:', error);
    return false;
  }
};

// Envoyer le taux de masse grasse vers Apple Health
export const exportBodyFatToAppleHealth = async (
  bodyFatPercentage: number,
  date: Date = new Date()
): Promise<boolean> => {
  if (!hasHealthKit()) return false;
  if (!isHealthKitAvailable()) {
    console.log('⚠️ Apple Health non disponible ou mal configuré (exportBodyFatToAppleHealth)');
    return false;
  }

  try {
    const autoExportEnabled = await AsyncStorage.getItem(APPLE_HEALTH_ENABLED_KEY);
    if (autoExportEnabled !== 'true') return false;

    const options: any = {
      value: bodyFatPercentage,
      startDate: date.toISOString(),
      endDate: date.toISOString(),
    };

    return new Promise((resolve) => {
      try {
        AppleHealthKit.saveBodyFatPercentage(options, (error: any) => {
          if (error) {
            console.error('❌ Erreur lors de l\'export de la masse grasse:', error);
            resolve(false);
            return;
          }
          console.log(`✅ Masse grasse exportée vers Apple Health: ${bodyFatPercentage}%`);
          resolve(true);
        });
      } catch (e) {
        console.error('❌ Erreur HealthKit (saveBodyFatPercentage):', e);
        resolve(false);
      }
    });
  } catch (error) {
    console.error('❌ Exception lors de l\'export de la masse grasse:', error);
    return false;
  }
};

// Activer/désactiver l'export automatique
export const setAppleHealthAutoExport = async (enabled: boolean): Promise<void> => {
  if (!hasHealthKit()) return;
  if (!isHealthKitAvailable()) {
    console.log('⚠️ Apple Health non disponible ou mal configuré (setAppleHealthAutoExport)');
    return;
  }
  try {
    await AsyncStorage.setItem(APPLE_HEALTH_ENABLED_KEY, enabled ? 'true' : 'false');
    console.log(`✅ Export automatique Apple Health ${enabled ? 'activé' : 'désactivé'}`);
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des préférences:', error);
  }
};

// Vérifier si l'export automatique est activé
export const isAppleHealthAutoExportEnabled = async (): Promise<boolean> => {
  if (!hasHealthKit()) return false;
  if (!isHealthKitAvailable()) {
    console.log('⚠️ Apple Health non disponible ou mal configuré (isAppleHealthAutoExportEnabled)');
    return false;
  }
  try {
    const enabled = await AsyncStorage.getItem(APPLE_HEALTH_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des préférences:', error);
    return false;
  }
};

// Synchroniser les nouvelles données depuis Apple Health
export const syncFromAppleHealth = async (): Promise<number> => {
  if (!hasHealthKit()) return 0;
  if (!isHealthKitAvailable()) {
    console.log('⚠️ Apple Health non disponible ou mal configuré (syncFromAppleHealth)');
    return 0;
  }

  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const startDate = lastSync
      ? new Date(lastSync)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 jours par défaut

    const options: any = {
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      ascending: true,
    };

    return new Promise((resolve) => {
      try {
        AppleHealthKit.getWeightSamples(options, async (error: any, results: any) => {
          if (error || !results || results.length === 0) {
            console.log('⚠️ Aucune donnée ou erreur lors de la récupération HealthKit:', error);
            resolve(0);
            return;
          }

          const existingMeasurements = await getAllMeasurements();
          const existingDates = new Set(
            existingMeasurements.map(m => new Date(m.date).toISOString().split('T')[0])
          );

          const newEntries = results
            .filter((sample: any) => {
              const date = new Date(sample.startDate).toISOString().split('T')[0];
              return !existingDates.has(date);
            })
            .map((sample: any) => ({
              weight: sample.value,
              date: sample.startDate,
              created_at: new Date().toISOString(),
            }));

          let syncedCount = 0;
          for (const entry of newEntries) {
              await addMeasurement(entry);
              syncedCount++;
          }

          if (syncedCount > 0) {
            console.log(`✅ ${syncedCount} nouvelles mesures synchronisées`);
          }
          
          await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
          resolve(syncedCount);
        });
      } catch (e) {
        console.error('❌ Erreur HealthKit (getWeightSamples sync):', e);
        resolve(0);
      }
    });
  } catch (error) {
    console.error('❌ Exception lors de la synchronisation:', error);
    return 0;
  }
};
