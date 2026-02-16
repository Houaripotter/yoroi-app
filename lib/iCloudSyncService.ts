// ============================================
// YOROI - SERVICE DE SYNCHRONISATION iCLOUD
// ============================================
// Synchronise les donnees entre iPhone, iPad et Mac
// via iCloud Drive

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import { getAllMeasurements, getUserSettings, saveUserSettings } from './storage';
import { getMeasurements, getTrainings, addMeasurementRecord, addTraining } from './database';
import logger from '@/lib/security/logger';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export interface SyncData {
  lastSync: string;
  deviceId: string;
  deviceName: string;
  version: string;
  data: {
    weights: any[];
    measurements: any[];
    trainings: any[];
    profile: any;
  };
}

export interface SyncStatus {
  enabled: boolean;
  available: boolean;
  lastSync: Date | null;
  lastSyncRelative: string;
  isSyncing: boolean;
  error: string | null;
  connectedDevices: number;
}

export interface SyncSettings {
  enabled: boolean;
  autoSync: boolean;
  syncOnLaunch: boolean;
  lastSyncDate: string | null;
  deviceId: string;
  deviceName: string;
}

// ═══════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════

const SYNC_FILE_NAME = 'yoroi-sync.json';
const SYNC_SETTINGS_KEY = '@yoroi_icloud_sync_settings';
const SYNC_VERSION = '1.0';

// Feature flag - desactive par defaut jusqu'a l'App Store
const ICLOUD_SYNC_ENABLED = false;

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

/**
 * Genere un ID unique pour l'appareil
 */
const generateDeviceId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${Platform.OS}-${result}`;
};

/**
 * Obtient le nom de l'appareil
 */
const getDeviceName = (): string => {
  if (Platform.OS === 'ios') {
    // Sur iOS, on peut essayer d'obtenir le nom via NativeModules
    try {
      const deviceName = NativeModules.SettingsManager?.settings?.AppleLocale || 'iPhone';
      return `iPhone de l'utilisateur`;
    } catch {
      return 'iPhone';
    }
  }
  return Platform.OS === 'android' ? 'Android' : 'Appareil';
};

/**
 * Formatte une date relative
 */
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'A l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  return date.toLocaleDateString('fr-FR');
};

// ═══════════════════════════════════════════════
// DETECTION iCLOUD
// ═══════════════════════════════════════════════

/**
 * Verifie si iCloud est disponible
 */
export const checkiCloudAvailability = async (): Promise<boolean> => {
  if (!ICLOUD_SYNC_ENABLED) {
    return false;
  }

  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    // Verifier si le dossier ubiquity (iCloud) est accessible
    // Note: Cela necessite que l'app soit configuree avec les entitlements iCloud
    const ubiquityUrl = await getUbiquityContainerURL();
    return ubiquityUrl !== null;
  } catch (error) {
    logger.info('iCloud non disponible:', error);
    return false;
  }
};

/**
 * Obtient l'URL du container iCloud
 * Note: En production, cela utilisera le vrai container iCloud
 */
const getUbiquityContainerURL = async (): Promise<string | null> => {
  if (!ICLOUD_SYNC_ENABLED) {
    return null;
  }

  try {
    // Sur iOS, on utilise le dossier Documents dans iCloud
    // Le chemin reel sera: ~/Library/Mobile Documents/iCloud~com~yoroi~app/Documents/
    // Pour l'instant, on simule avec le dossier documents local
    const iCloudPath = `${FileSystem.documentDirectory}iCloud/`;

    // Creer le dossier s'il n'existe pas
    const dirInfo = await FileSystem.getInfoAsync(iCloudPath);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(iCloudPath, { intermediates: true });
    }

    return iCloudPath;
  } catch (error) {
    logger.error('Erreur acces iCloud:', error);
    return null;
  }
};

// ═══════════════════════════════════════════════
// GESTION DES PARAMETRES DE SYNC
// ═══════════════════════════════════════════════

/**
 * Obtient les parametres de synchronisation
 */
export const getSyncSettings = async (): Promise<SyncSettings> => {
  try {
    const stored = await AsyncStorage.getItem(SYNC_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error('Erreur lecture settings sync:', error);
  }

  // Parametres par defaut
  return {
    enabled: false,
    autoSync: true,
    syncOnLaunch: true,
    lastSyncDate: null,
    deviceId: generateDeviceId(),
    deviceName: getDeviceName(),
  };
};

/**
 * Sauvegarde les parametres de synchronisation
 */
export const saveSyncSettings = async (settings: Partial<SyncSettings>): Promise<void> => {
  try {
    const current = await getSyncSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    logger.error('Erreur sauvegarde settings sync:', error);
  }
};

/**
 * Active ou desactive la synchronisation
 */
export const toggleiCloudSync = async (enabled: boolean): Promise<boolean> => {
  if (!ICLOUD_SYNC_ENABLED) {
    logger.info('iCloud sync est desactive (feature flag)');
    return false;
  }

  const available = await checkiCloudAvailability();
  if (!available && enabled) {
    logger.info('iCloud non disponible sur cet appareil');
    return false;
  }

  await saveSyncSettings({ enabled });

  // Si on active, faire une sync initiale
  if (enabled) {
    await syncWithiCloud();
  }

  return true;
};

// ═══════════════════════════════════════════════
// OPERATIONS DE SYNCHRONISATION
// ═══════════════════════════════════════════════

/**
 * Lit le fichier de sync depuis iCloud
 */
const readiCloudSyncFile = async (): Promise<SyncData | null> => {
  try {
    const iCloudPath = await getUbiquityContainerURL();
    if (!iCloudPath) return null;

    const filePath = `${iCloudPath}${SYNC_FILE_NAME}`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);

    if (!fileInfo.exists) {
      return null;
    }

    const content = await FileSystem.readAsStringAsync(filePath);
    return JSON.parse(content);
  } catch (error) {
    logger.error('Erreur lecture fichier iCloud:', error);
    return null;
  }
};

/**
 * Ecrit le fichier de sync dans iCloud
 */
const writeiCloudSyncFile = async (data: SyncData): Promise<boolean> => {
  try {
    const iCloudPath = await getUbiquityContainerURL();
    if (!iCloudPath) return false;

    const filePath = `${iCloudPath}${SYNC_FILE_NAME}`;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    logger.error('Erreur ecriture fichier iCloud:', error);
    return false;
  }
};

/**
 * Collecte toutes les donnees locales pour la sync
 */
const collectLocalData = async (): Promise<SyncData['data']> => {
  const weights = await getAllMeasurements();
  const measurements = await getMeasurements();
  const trainings = await getTrainings();
  const profile = await getUserSettings();

  return {
    weights,
    measurements,
    trainings,
    profile,
  };
};

/**
 * Importe les donnees depuis iCloud vers le stockage local
 */
const importFromiCloud = async (cloudData: SyncData): Promise<void> => {
  logger.info('Import des donnees depuis iCloud...');

  // Importer les mensurations
  if (cloudData.data.measurements) {
    for (const measurement of cloudData.data.measurements) {
      try {
        await addMeasurementRecord(measurement);
      } catch (e: any) {
        const msg = String(e?.message || e || '').toLowerCase();
        if (!msg.includes('duplicate') && !msg.includes('unique') && !msg.includes('constraint')) {
          logger.error('[iCloudSync] Erreur import mensuration:', e);
        }
      }
    }
  }

  // Importer les entrainements
  if (cloudData.data.trainings) {
    for (const training of cloudData.data.trainings) {
      try {
        await addTraining(training);
      } catch (e: any) {
        const msg = String(e?.message || e || '').toLowerCase();
        if (!msg.includes('duplicate') && !msg.includes('unique') && !msg.includes('constraint')) {
          logger.error('[iCloudSync] Erreur import entrainement:', e);
        }
      }
    }
  }

  // Importer le profil (fusionner)
  if (cloudData.data.profile) {
    const localProfile = await getUserSettings();
    const mergedProfile = { ...localProfile, ...cloudData.data.profile };
    await saveUserSettings(mergedProfile);
  }

  logger.info('Import termine');
};

/**
 * Synchronise les donnees avec iCloud
 */
export const syncWithiCloud = async (): Promise<{ success: boolean; message: string }> => {
  if (!ICLOUD_SYNC_ENABLED) {
    return { success: false, message: 'iCloud sync desactive' };
  }

  const settings = await getSyncSettings();
  if (!settings.enabled) {
    return { success: false, message: 'Sync desactivee' };
  }

  const available = await checkiCloudAvailability();
  if (!available) {
    return { success: false, message: 'iCloud non disponible' };
  }

  try {
    logger.info('Debut synchronisation iCloud...');

    // 1. Lire le fichier iCloud existant
    const cloudData = await readiCloudSyncFile();

    // 2. Collecter les donnees locales
    const localData = await collectLocalData();
    const now = new Date().toISOString();

    // 3. Determiner quelle version est plus recente
    if (cloudData) {
      const cloudDate = new Date(cloudData.lastSync);
      const localDate = settings.lastSyncDate ? new Date(settings.lastSyncDate) : new Date(0);

      if (cloudDate > localDate) {
        // Donnees iCloud plus recentes -> importer
        logger.info('Donnees iCloud plus recentes, import...');
        await importFromiCloud(cloudData);
      }
    }

    // 4. Exporter les donnees locales vers iCloud
    const syncData: SyncData = {
      lastSync: now,
      deviceId: settings.deviceId,
      deviceName: settings.deviceName,
      version: SYNC_VERSION,
      data: localData,
    };

    const writeSuccess = await writeiCloudSyncFile(syncData);

    if (writeSuccess) {
      // 5. Mettre a jour la date de derniere sync
      await saveSyncSettings({ lastSyncDate: now });
      logger.info('Synchronisation reussie');
      return { success: true, message: 'Synchronisation reussie' };
    } else {
      return { success: false, message: 'Erreur ecriture iCloud' };
    }
  } catch (error) {
    logger.error('Erreur synchronisation:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
};

/**
 * Force une synchronisation complete
 */
export const forceSyncWithiCloud = async (): Promise<{ success: boolean; message: string }> => {
  const settings = await getSyncSettings();

  if (!settings.enabled) {
    // Activer temporairement pour cette sync
    await saveSyncSettings({ enabled: true });
    const result = await syncWithiCloud();
    await saveSyncSettings({ enabled: false });
    return result;
  }

  return syncWithiCloud();
};

// ═══════════════════════════════════════════════
// STATUT DE SYNCHRONISATION
// ═══════════════════════════════════════════════

/**
 * Obtient le statut actuel de la synchronisation
 */
export const getSyncStatus = async (): Promise<SyncStatus> => {
  const settings = await getSyncSettings();
  const available = await checkiCloudAvailability();

  let lastSyncDate: Date | null = null;
  let lastSyncRelative = 'Jamais';

  if (settings.lastSyncDate) {
    lastSyncDate = new Date(settings.lastSyncDate);
    lastSyncRelative = formatRelativeTime(lastSyncDate);
  }

  // Compter les appareils connectes (en lisant le fichier iCloud)
  let connectedDevices = 1;
  if (available && settings.enabled) {
    const cloudData = await readiCloudSyncFile();
    if (cloudData && cloudData.deviceId !== settings.deviceId) {
      connectedDevices = 2; // Au moins 2 appareils
    }
  }

  return {
    enabled: settings.enabled,
    available: available || !ICLOUD_SYNC_ENABLED, // Toujours "disponible" si desactive
    lastSync: lastSyncDate,
    lastSyncRelative,
    isSyncing: false,
    error: null,
    connectedDevices,
  };
};

// ═══════════════════════════════════════════════
// HOOKS DE SYNCHRONISATION
// ═══════════════════════════════════════════════

/**
 * A appeler apres chaque modification de donnees
 * Declenche une sync si activee
 */
export const triggerSyncAfterChange = async (): Promise<void> => {
  if (!ICLOUD_SYNC_ENABLED) return;

  const settings = await getSyncSettings();
  if (settings.enabled && settings.autoSync) {
    // Debounce: attendre un peu avant de sync (eviter les syncs multiples)
    setTimeout(async () => {
      await syncWithiCloud();
    }, 2000);
  }
};

/**
 * A appeler au lancement de l'app
 */
export const syncOnAppLaunch = async (): Promise<void> => {
  if (!ICLOUD_SYNC_ENABLED) return;

  const settings = await getSyncSettings();
  if (settings.enabled && settings.syncOnLaunch) {
    await syncWithiCloud();
  }
};

// ═══════════════════════════════════════════════
// FEATURE FLAG
// ═══════════════════════════════════════════════

/**
 * Verifie si la feature iCloud est activee
 */
export const isiCloudSyncFeatureEnabled = (): boolean => {
  return ICLOUD_SYNC_ENABLED;
};

/**
 * Message a afficher si la feature n'est pas disponible
 */
export const getiCloudUnavailableMessage = (): string => {
  if (!ICLOUD_SYNC_ENABLED) {
    return 'La synchronisation iCloud sera disponible dans une prochaine mise a jour.';
  }
  if (Platform.OS !== 'ios') {
    return 'La synchronisation iCloud est uniquement disponible sur iOS.';
  }
  return 'Connectez-vous a iCloud dans les reglages de ton appareil.';
};

export default {
  checkiCloudAvailability,
  getSyncSettings,
  saveSyncSettings,
  toggleiCloudSync,
  syncWithiCloud,
  forceSyncWithiCloud,
  getSyncStatus,
  triggerSyncAfterChange,
  syncOnAppLaunch,
  isiCloudSyncFeatureEnabled,
  getiCloudUnavailableMessage,
};
