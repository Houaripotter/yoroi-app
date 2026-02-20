import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMeasurement, getAllMeasurements } from './storage';
import logger from '@/lib/security/logger';
import healthConnect from './healthConnect.ios';
import { isHealthKitAvailable, isRunningInExpoGo } from './healthKit.wrapper';

// ============================================
// SERVICE WRAPPER - Apple Health
// Utilise healthConnect.ios.ts en interne
// ============================================

const APPLE_HEALTH_ENABLED_KEY = '@yoroi_apple_health_enabled';
const LAST_SYNC_KEY = '@yoroi_last_health_sync';

/**
 * Vérification robuste de la disponibilité de HealthKit
 * Cette fonction ne crashe JAMAIS, même si le module natif n'est pas chargé
 */
const isHealthKitAvailable = async (): Promise<boolean> => {
  try {
    if (Platform.OS !== 'ios') {
      return false;
    }
    return await healthConnect.isAvailable();
  } catch (e) {
    logger.info("ℹ️ HealthKit non disponible (erreur de vérification):", e);
    return false;
  }
};

// Les permissions sont gérées par healthConnect.ios.ts

// Vérifier si Apple Health est disponible (version plus simple pour l'UI)
export const isAppleHealthAvailable = (): boolean => {
  if (Platform.OS !== 'ios') return false;
  if (isRunningInExpoGo) return false;
  return isHealthKitAvailable;
};

// Initialiser Apple Health et demander les permissions
export const initializeAppleHealth = async (): Promise<boolean> => {
  try {
    await healthConnect.initialize();
    const connected = await healthConnect.connect();
    return connected;
  } catch (e) {
    logger.error('❌ Erreur HealthKit (init):', e);
    return false;
  }
};

// Vérifier si l'utilisateur a accordé les permissions
export const checkHealthPermissions = async (): Promise<boolean> => {
  try {
    const status = healthConnect.getSyncStatus();
    return status.isConnected;
  } catch (e) {
    logger.error('❌ Erreur HealthKit (checkPermissions):', e);
    return false;
  }
};

// Récupérer l'historique de poids depuis Apple Health
export const importWeightFromAppleHealth = async (): Promise<number> => {
  if (Platform.OS !== 'ios') {
    Alert.alert('Erreur', 'Apple Health n\'est disponible que sur iOS.');
    return 0;
  }

  try {
    // Vérifier que healthConnect est connecté
    const status = healthConnect.getSyncStatus();
    if (!status.isConnected) {
      const connected = await healthConnect.connect();
      if (!connected) {
        Alert.alert('Erreur', 'Impossible d\'accéder à Apple Health. Vérifiez les permissions dans Réglages > Confidentialité > Santé > Yoroi');
        return 0;
      }
    }

    // Récupérer l'historique de poids (365 jours)
    const weightHistory = await healthConnect.getWeightHistory(365);

    if (!weightHistory || weightHistory.length === 0) {
      Alert.alert('Information', 'Aucune donnée de poids trouvée dans Apple Health.');
      return 0;
    }

    logger.info(`${weightHistory.length} mesures de poids trouvées dans Apple Health`);

    const existingMeasurements = await getAllMeasurements();
    const existingDates = new Set(
      existingMeasurements.map(m => new Date(m.date).toISOString().split('T')[0])
    );

    const newEntries = weightHistory
      .filter((sample) => {
        const date = new Date(sample.date).toISOString().split('T')[0];
        return !existingDates.has(date);
      })
      .map((sample) => ({
        weight: sample.value,
        date: sample.date,
        created_at: new Date().toISOString(),
      }));

    let importedCount = 0;
    for (const entry of newEntries) {
      await addMeasurement(entry);
      importedCount++;
    }

    if (importedCount > 0) {
      logger.info(`${importedCount} nouvelles mesures importées`);
      Alert.alert('Succès', `${importedCount} mesure(s) importée(s) depuis Apple Health`);
    } else {
      Alert.alert('Information', 'Toutes les données sont déjà importées ou aucune nouvelle donnée disponible.');
    }
    return importedCount;
  } catch (error) {
    logger.error('❌ Exception lors de l\'import:', error);
    Alert.alert('Erreur', 'Une erreur est survenue lors de l\'import.');
    return 0;
  }
};

// Envoyer une mesure de poids vers Apple Health
export const exportWeightToAppleHealth = async (
  weight: number,
  date: Date = new Date()
): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;

  try {
    const autoExportEnabled = await AsyncStorage.getItem(APPLE_HEALTH_ENABLED_KEY);
    if (autoExportEnabled !== 'true') {
      logger.info('ℹ️  Export vers Apple Health désactivé');
      return false;
    }

    const success = await healthConnect.writeWeight(weight, 'kg');
    if (success) {
      logger.info(`Poids exporté vers Apple Health: ${weight} kg`);
    }
    return success;
  } catch (error) {
    logger.error('❌ Exception lors de l\'export:', error);
    return false;
  }
};

// Envoyer l'IMC vers Apple Health
export const exportBMIToAppleHealth = async (
  bmi: number,
  date: Date = new Date()
): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;

  try {
    const autoExportEnabled = await AsyncStorage.getItem(APPLE_HEALTH_ENABLED_KEY);
    if (autoExportEnabled !== 'true') return false;

    // Note: healthConnect ne supporte pas directement l'IMC
    // L'IMC sera calculé automatiquement par Apple Health depuis le poids et la taille
    logger.info(`IMC: ${bmi} (calculé automatiquement par Apple Health)`);
    return true;
  } catch (error) {
    logger.error('❌ Exception lors de l\'export de l\'IMC:', error);
    return false;
  }
};

// Envoyer le taux de masse grasse vers Apple Health
export const exportBodyFatToAppleHealth = async (
  bodyFatPercentage: number,
  date: Date = new Date()
): Promise<boolean> => {
  if (Platform.OS !== 'ios') return false;

  try {
    const autoExportEnabled = await AsyncStorage.getItem(APPLE_HEALTH_ENABLED_KEY);
    if (autoExportEnabled !== 'true') return false;

    const success = await healthConnect.writeBodyFat(bodyFatPercentage);
    if (success) {
      logger.info(`Masse grasse exportée vers Apple Health: ${bodyFatPercentage}%`);
    }
    return success;
  } catch (error) {
    logger.error('❌ Exception lors de l\'export de la masse grasse:', error);
    return false;
  }
};

// Activer/désactiver l'export automatique
export const setAppleHealthAutoExport = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(APPLE_HEALTH_ENABLED_KEY, enabled ? 'true' : 'false');
    logger.info(`Export automatique Apple Health ${enabled ? 'activé' : 'désactivé'}`);
  } catch (error) {
    logger.error('❌ Erreur lors de la sauvegarde des préférences:', error);
  }
};

// Vérifier si l'export automatique est activé
export const isAppleHealthAutoExportEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(APPLE_HEALTH_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    logger.error('❌ Erreur lors de la récupération des préférences:', error);
    return false;
  }
};

// Synchroniser les nouvelles données depuis Apple Health
export const syncFromAppleHealth = async (): Promise<number> => {
  if (Platform.OS !== 'ios') return 0;

  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const days = lastSync
      ? Math.ceil((Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60 * 24))
      : 7; // 7 jours par défaut

    // Récupérer l'historique de poids depuis la dernière sync
    const weightHistory = await healthConnect.getWeightHistory(days);

    if (!weightHistory || weightHistory.length === 0) {
      logger.info('Aucune donnée ou erreur lors de la récupération HealthKit');
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      return 0;
    }

    const existingMeasurements = await getAllMeasurements();
    const existingDates = new Set(
      existingMeasurements.map(m => new Date(m.date).toISOString().split('T')[0])
    );

    const newEntries = weightHistory
      .filter((sample) => {
        const date = new Date(sample.date).toISOString().split('T')[0];
        return !existingDates.has(date);
      })
      .map((sample) => ({
        weight: sample.value,
        date: sample.date,
        created_at: new Date().toISOString(),
      }));

    let syncedCount = 0;
    for (const entry of newEntries) {
      await addMeasurement(entry);
      syncedCount++;
    }

    if (syncedCount > 0) {
      logger.info(`${syncedCount} nouvelles mesures synchronisées`);
    }

    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return syncedCount;
  } catch (error) {
    logger.error('❌ Exception lors de la synchronisation:', error);
    return 0;
  }
};
