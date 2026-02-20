// ============================================
// YOROI - SERVICE HEALTH UNIFIÉ (iOS + Android)
// ============================================
// Abstraction plateforme-agnostique au-dessus de healthConnect
// iOS → Apple HealthKit via healthConnect.ios.ts
// Android → Health Connect via healthConnect.android.ts
// ============================================

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthConnect } from './healthConnect';
import { addMeasurement, getAllMeasurements } from './storage';
import logger from '@/lib/security/logger';

// Réexporter les types pour que les consommateurs n'aient plus à deviner le bon import
export type { HealthData, SyncStatus, HealthPermissions } from './healthConnect';

// ============================================
// CONSTANTS
// ============================================

const AUTO_EXPORT_KEY = '@yoroi_health_auto_export';
const LAST_SYNC_KEY = '@yoroi_last_health_sync';

// ============================================
// AVAILABILITY
// ============================================

const isAvailable = (): boolean => {
  if (Platform.OS === 'ios') {
    try {
      const { isHealthKitAvailable, isRunningInExpoGo } = require('./healthKit.wrapper');
      return isHealthKitAvailable && !isRunningInExpoGo;
    } catch {
      return false;
    }
  }
  if (Platform.OS === 'android') {
    return true; // Health Connect est disponible sur Android 9+
  }
  return false;
};

const getProviderName = (): string => {
  if (Platform.OS === 'ios') return 'App Santé';
  if (Platform.OS === 'android') return 'Health Connect';
  return 'Health';
};

// ============================================
// PERMISSIONS
// ============================================

const requestPermissions = async (): Promise<boolean> => {
  try {
    await healthConnect.initialize();
    return await healthConnect.connect();
  } catch (e) {
    logger.error('[HealthService] Erreur requestPermissions:', e);
    return false;
  }
};

const checkPermissions = async (): Promise<boolean> => {
  try {
    const status = healthConnect.getSyncStatus();
    return status.isConnected;
  } catch (e) {
    logger.error('[HealthService] Erreur checkPermissions:', e);
    return false;
  }
};

// ============================================
// DATA - LECTURE
// ============================================

const getWeight = async (days: number = 30) => {
  return healthConnect.getWeightHistory(days);
};

const getSteps = async () => {
  return healthConnect.getTodaySteps();
};

const getHeartRate = async () => {
  return healthConnect.getTodayHeartRate();
};

const getSleep = async (days: number = 7) => {
  return healthConnect.getSleepHistory(days);
};

// ============================================
// DATA - ÉCRITURE
// ============================================

const saveWeight = async (value: number, date?: Date): Promise<boolean> => {
  try {
    return await healthConnect.writeWeight(value, 'kg');
  } catch (e) {
    logger.error('[HealthService] Erreur saveWeight:', e);
    return false;
  }
};

// ============================================
// IMPORT / SYNC
// ============================================

const importWeightHistory = async (days: number = 365): Promise<number> => {
  try {
    // Vérifier connexion
    const status = healthConnect.getSyncStatus();
    if (!status.isConnected) {
      const connected = await healthConnect.connect();
      if (!connected) {
        const providerName = getProviderName();
        const settingsHint = Platform.OS === 'ios'
          ? 'Réglages > Confidentialité > Santé > Yoroi'
          : 'Réglages > Applications > Health Connect > Yoroi';
        Alert.alert('Erreur', `Impossible d'accéder à ${providerName}. Vérifiez les permissions dans ${settingsHint}`);
        return 0;
      }
    }

    const weightHistory = await healthConnect.getWeightHistory(days);

    if (!weightHistory || weightHistory.length === 0) {
      Alert.alert('Information', `Aucune donnée de poids trouvée dans ${getProviderName()}.`);
      return 0;
    }

    logger.info(`${weightHistory.length} mesures de poids trouvées dans ${getProviderName()}`);

    // Déduplication avec les mesures existantes
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
      Alert.alert('Succès', `${importedCount} mesure(s) importée(s) depuis ${getProviderName()}`);
    } else {
      Alert.alert('Information', 'Toutes les données sont déjà importées ou aucune nouvelle donnée disponible.');
    }
    return importedCount;
  } catch (error) {
    logger.error('[HealthService] Exception lors de l\'import:', error);
    Alert.alert('Erreur', 'Une erreur est survenue lors de l\'import.');
    return 0;
  }
};

const syncNewData = async (): Promise<number> => {
  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const days = lastSync
      ? Math.ceil((Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    const weightHistory = await healthConnect.getWeightHistory(days);

    if (!weightHistory || weightHistory.length === 0) {
      logger.info('[HealthService] Aucune donnée lors de la sync');
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
      logger.info(`[HealthService] ${syncedCount} nouvelles mesures synchronisées`);
    }

    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    return syncedCount;
  } catch (error) {
    logger.error('[HealthService] Exception lors de la synchronisation:', error);
    return 0;
  }
};

// ============================================
// AUTO-EXPORT
// ============================================

const setAutoExport = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(AUTO_EXPORT_KEY, enabled ? 'true' : 'false');
    logger.info(`[HealthService] Export automatique ${enabled ? 'activé' : 'désactivé'}`);
  } catch (error) {
    logger.error('[HealthService] Erreur sauvegarde auto-export:', error);
  }
};

const isAutoExportEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(AUTO_EXPORT_KEY);
    return enabled === 'true';
  } catch (error) {
    logger.error('[HealthService] Erreur lecture auto-export:', error);
    return false;
  }
};

// ============================================
// API PUBLIQUE
// ============================================

const HealthService = {
  isAvailable,
  getProviderName,
  requestPermissions,
  checkPermissions,
  getWeight,
  getSteps,
  getHeartRate,
  getSleep,
  saveWeight,
  importWeightHistory,
  syncNewData,
  setAutoExport,
  isAutoExportEnabled,
};

export default HealthService;
