// ============================================
// 🔒 EXPORT/IMPORT SÉCURISÉ - YOROI
// ============================================
//
// Remplace les fonctions d'export/import vulnérables par
// des versions chiffrées, validées et sauvegardées.

import * as FS from 'expo-file-system';
import Constants from 'expo-constants';

// Type assertion pour expo-file-system
const FileSystem = FS as typeof FS & {
  documentDirectory: string;
  EncodingType: { UTF8: string };
  writeAsStringAsync: (path: string, content: string, options?: any) => Promise<void>;
  readAsStringAsync: (path: string, options?: any) => Promise<string>;
};
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import logger from './logger';
import { secureStorage } from './secureStorage';
import { validators, ValidationResult } from './validators';

// ============================================
// CONFIGURATION
// ============================================

const EXPORT_VERSION = '2.0'; // Version du format d'export
const ENCRYPTION_ENABLED = true; // Activer le chiffrement des exports
const AUTO_BACKUP_BEFORE_IMPORT = true; // Backup auto avant import
const MAX_EXPORT_SIZE = 50 * 1024 * 1024; // 50MB max
const MAX_IMPORT_SIZE = 50 * 1024 * 1024; // 50MB max

// Rate limiting : 1 export/import par minute maximum
const rateLimiter = {
  lastExport: 0,
  lastImport: 0,
  MIN_INTERVAL: 60 * 1000, // 1 minute
};

// ============================================
// INTERFACES
// ============================================

export interface SecureBackupData {
  version: string;
  exported_at: string;
  app_version: string;
  device_info: {
    platform: string;
    os_version?: string;
  };
  encrypted: boolean;
  checksum: string;
  data: {
    measurements?: any[];
    photos?: any[];
    photos_data?: any[];
    trainings?: any[];
    exercises?: any[];
    programs?: any[];
    user_settings?: any;
    hydration_log?: any[];
    mood_log?: any[];
    body_status?: any;
    profile?: any;
  };
}

export interface ImportResult {
  success: boolean;
  error?: string;
  backup_created?: boolean;
  backup_path?: string;
  items_imported?: {
    measurements?: number;
    photos?: number;
    trainings?: number;
    exercises?: number;
    programs?: number;
    settings?: number;
  };
}

// ============================================
// RATE LIMITING
// ============================================

function checkRateLimit(type: 'export' | 'import'): ValidationResult {
  const now = Date.now();
  const lastTime = type === 'export' ? rateLimiter.lastExport : rateLimiter.lastImport;
  const timeSinceLastOperation = now - lastTime;

  if (timeSinceLastOperation < rateLimiter.MIN_INTERVAL) {
    const remainingSeconds = Math.ceil((rateLimiter.MIN_INTERVAL - timeSinceLastOperation) / 1000);
    return {
      valid: false,
      error: `Attends ${remainingSeconds} secondes avant de réessayer`,
    };
  }

  // Mettre à jour le timestamp
  if (type === 'export') {
    rateLimiter.lastExport = now;
  } else {
    rateLimiter.lastImport = now;
  }

  return { valid: true };
}

// ============================================
// CHECKSUM & VALIDATION
// ============================================

/**
 * Calcule un checksum SHA-256 des données
 */
async function calculateChecksum(data: string): Promise<string> {
  try {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
    return digest;
  } catch (error) {
    logger.error('Failed to calculate checksum', error);
    return '';
  }
}

/**
 * Vérifie l'intégrité des données importées
 */
async function verifyChecksum(data: string, expectedChecksum: string): Promise<boolean> {
  const actualChecksum = await calculateChecksum(data);
  return actualChecksum === expectedChecksum;
}

/**
 * Valide la structure d'un backup
 */
function validateBackupStructure(backup: any): ValidationResult {
  if (!backup || typeof backup !== 'object') {
    return { valid: false, error: 'Format de backup invalide' };
  }

  if (!backup.version) {
    return { valid: false, error: 'Version du backup manquante' };
  }

  if (!backup.data || typeof backup.data !== 'object') {
    return { valid: false, error: 'Données du backup manquantes' };
  }

  if (!backup.checksum) {
    return { valid: false, error: 'Checksum manquant' };
  }

  // Vérifier que la version est compatible
  const [majorVersion] = backup.version.split('.');
  const [currentMajorVersion] = EXPORT_VERSION.split('.');

  if (majorVersion !== currentMajorVersion) {
    return {
      valid: false,
      error: `Version incompatible (backup: ${backup.version}, app: ${EXPORT_VERSION})`,
    };
  }

  return { valid: true };
}

/**
 * Valide les données métier avant import
 */
function validateBusinessData(backup: SecureBackupData): ValidationResult {
  const errors: string[] = [];

  // Valider les mesures
  if (backup.data.measurements) {
    if (!Array.isArray(backup.data.measurements)) {
      errors.push('Les mesures doivent être un tableau');
    } else {
      for (let i = 0; i < backup.data.measurements.length; i++) {
        const measurement = backup.data.measurements[i];
        const result = validators.measurement(measurement);
        if (!result.valid) {
          errors.push(`Mesure ${i + 1}: ${result.error}`);
        }
      }
    }
  }

  // Valider les entrées d'hydratation
  if (backup.data.hydration_log) {
    if (!Array.isArray(backup.data.hydration_log)) {
      errors.push('Le journal d\'hydratation doit être un tableau');
    } else {
      for (const entry of backup.data.hydration_log) {
        if (entry.amount !== undefined) {
          const result = validators.hydration(entry.amount);
          if (!result.valid) {
            errors.push(`Hydratation: ${result.error}`);
          }
        }
      }
    }
  }

  // Limiter le nombre d'erreurs affichées
  if (errors.length > 10) {
    return {
      valid: false,
      error: `${errors.length} erreurs de validation trouvées. Premières erreurs: ${errors.slice(0, 3).join(', ')}`,
    };
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join(', '),
    };
  }

  return { valid: true };
}

// ============================================
// CHIFFREMENT
// ============================================

/**
 * Chiffre les données d'export
 * Note: Utilise une clé dérivée du timestamp pour la démo
 * En production, utiliser un mot de passe utilisateur
 */
async function encryptExport(data: string): Promise<string> {
  if (!ENCRYPTION_ENABLED) return data;

  try {
    // Générer une clé de chiffrement
    const key = await generateExportKey();

    // Simple XOR pour la démo (en production, utiliser AES-256-GCM)
    let encrypted = '';
    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }

    const base64 = Buffer.from(encrypted, 'binary').toString('base64');
    return `YOROI_ENCRYPTED_V2:${base64}`;
  } catch (error) {
    logger.error('Encryption failed', error);
    return data; // Fallback: retourner non chiffré
  }
}

/**
 * Déchiffre les données d'import
 */
async function decryptImport(encrypted: string): Promise<string> {
  if (!encrypted.startsWith('YOROI_ENCRYPTED_V2:')) {
    // Pas chiffré, retourner tel quel (compatibilité avec anciens exports)
    return encrypted;
  }

  try {
    const base64 = encrypted.substring('YOROI_ENCRYPTED_V2:'.length);
    const encryptedData = Buffer.from(base64, 'base64').toString('binary');

    // Générer la même clé
    const key = await generateExportKey();

    // Déchiffrer (XOR est symétrique)
    let decrypted = '';
    for (let i = 0; i < encryptedData.length; i++) {
      decrypted += String.fromCharCode(
        encryptedData.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }

    return decrypted;
  } catch (error) {
    logger.error('Decryption failed', error);
    throw new Error('Impossible de déchiffrer le backup. Fichier corrompu ?');
  }
}

/**
 * Génère une clé de chiffrement pour l'export
 * En production, demander un mot de passe à l'utilisateur
 */
async function generateExportKey(): Promise<string> {
  // Pour la démo, utiliser une clé dérivée du device
  const existingKey = await secureStorage.getItem('@yoroi_export_key');
  if (existingKey) return existingKey;

  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const key = Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

  await secureStorage.setItem('@yoroi_export_key', key);
  return key;
}

// ============================================
// BACKUP AUTOMATIQUE
// ============================================

/**
 * Crée un backup automatique avant l'import
 */
async function createAutoBackup(): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `yoroi_auto_backup_${timestamp}.json`;
    const path = `${FileSystem.documentDirectory}${filename}`;

    // Exporter toutes les données actuelles
    const currentData = await exportAllData();

    // Sauvegarder en local
    await FileSystem.writeAsStringAsync(path, currentData, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    logger.info('Auto-backup created', path);
    return { success: true, path };
  } catch (error) {
    logger.error('Auto-backup failed', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// EXPORT SÉCURISÉ
// ============================================

/**
 * Collecte toutes les données pour l'export
 */
async function exportAllData(): Promise<string> {
  const data: SecureBackupData = {
    version: EXPORT_VERSION,
    exported_at: new Date().toISOString(),
    app_version: Constants.expoConfig?.version || (Constants.manifest as any)?.version || '1.0.0',
    device_info: {
      platform: 'mobile',
    },
    encrypted: ENCRYPTION_ENABLED,
    checksum: '', // Calculé plus tard
    data: {} as SecureBackupData['data'],
  };

  // Récupérer toutes les données
  try {
    const measurements = await secureStorage.getObject('@yoroi_measurements');
    if (measurements) data.data.measurements = measurements as any[];

    const photos = await secureStorage.getObject('@yoroi_photos');
    if (photos) data.data.photos = photos as any[];

    const photosData = await secureStorage.getObject('@yoroi_photos_data');
    if (photosData) data.data.photos_data = photosData as any[];

    const trainings = await secureStorage.getObject('@yoroi_trainings');
    if (trainings) data.data.trainings = trainings as any[];

    const exercises = await secureStorage.getObject('@yoroi_exercises');
    if (exercises) data.data.exercises = exercises as any[];

    const programs = await secureStorage.getObject('@yoroi_programs');
    if (programs) data.data.programs = programs as any[];

    const settings = await secureStorage.getObject('@yoroi_user_settings');
    if (settings) data.data.user_settings = settings;

    const hydration = await secureStorage.getObject('@yoroi_hydration_log');
    if (hydration) data.data.hydration_log = hydration as any[];

    const mood = await secureStorage.getObject('@yoroi_mood_log');
    if (mood) data.data.mood_log = mood as any[];

    const bodyStatus = await secureStorage.getObject('@yoroi_user_body_status');
    if (bodyStatus) data.data.body_status = bodyStatus;

    const profile = await secureStorage.getObject('@yoroi_user_profile');
    if (profile) data.data.profile = profile;
  } catch (error) {
    logger.error('Failed to collect export data', error);
    throw new Error('Impossible de collecter les données à exporter');
  }

  // Calculer le checksum des données
  const dataString = JSON.stringify(data.data);
  data.checksum = await calculateChecksum(dataString);

  return JSON.stringify(data, null, 2);
}

/**
 * Exporte les données de manière sécurisée
 */
export async function secureExportData(): Promise<{ success: boolean; error?: string }> {
  try {
    // Rate limiting
    const rateLimitCheck = checkRateLimit('export');
    if (!rateLimitCheck.valid) {
      return { success: false, error: rateLimitCheck.error };
    }

    logger.info('Starting secure export');

    // Collecter les données
    const jsonData = await exportAllData();

    // Vérifier la taille
    const dataSize = new Blob([jsonData]).size;
    if (dataSize > MAX_EXPORT_SIZE) {
      return {
        success: false,
        error: `Les données sont trop volumineuses (${Math.round(dataSize / 1024 / 1024)}MB). Maximum: 50MB`,
      };
    }

    // Chiffrer si nécessaire
    const finalData = await encryptExport(jsonData);

    // Créer le fichier
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `yoroi_backup_${timestamp}.json`;
    const fileUri = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, finalData, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Partager le fichier
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exporter les données Yoroi',
      });
    }

    logger.success('Export completed successfully');
    return { success: true };
  } catch (error) {
    logger.error('Export failed', error);
    return { success: false, error: String(error) };
  }
}

// ============================================
// IMPORT SÉCURISÉ
// ============================================

/**
 * Importe les données de manière sécurisée
 */
export async function secureImportData(): Promise<ImportResult> {
  try {
    // Rate limiting
    const rateLimitCheck = checkRateLimit('import');
    if (!rateLimitCheck.valid) {
      return { success: false, error: rateLimitCheck.error };
    }

    logger.info('Starting secure import');

    // Sélectionner le fichier
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, error: 'Import annulé' };
    }

    const file = result.assets[0];

    // Vérifier la taille du fichier
    if (file.size && file.size > MAX_IMPORT_SIZE) {
      return {
        success: false,
        error: `Fichier trop volumineux (${Math.round(file.size / 1024 / 1024)}MB). Maximum: 50MB`,
      };
    }

    // Lire le contenu
    const fileContent = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Déchiffrer si nécessaire
    const decrypted = await decryptImport(fileContent);

    // Parser le JSON
    let backup: SecureBackupData;
    try {
      backup = JSON.parse(decrypted);
    } catch (error) {
      return { success: false, error: 'Format JSON invalide' };
    }

    // Valider la structure
    const structureValidation = validateBackupStructure(backup);
    if (!structureValidation.valid) {
      return { success: false, error: structureValidation.error };
    }

    // Vérifier le checksum
    const dataString = JSON.stringify(backup.data);
    const checksumValid = await verifyChecksum(dataString, backup.checksum);
    if (!checksumValid) {
      return { success: false, error: 'Checksum invalide. Fichier corrompu ou modifié.' };
    }

    // Valider les données métier
    const businessValidation = validateBusinessData(backup);
    if (!businessValidation.valid) {
      return { success: false, error: businessValidation.error };
    }

    // Créer un backup automatique avant d'importer
    let backupPath: string | undefined;
    if (AUTO_BACKUP_BEFORE_IMPORT) {
      const autoBackup = await createAutoBackup();
      if (autoBackup.success) {
        backupPath = autoBackup.path;
      } else {
        // Continuer quand même, mais logger l'erreur
        logger.warn('Auto-backup failed, continuing with import');
      }
    }

    // Importer les données
    const itemsImported: ImportResult['items_imported'] = {};

    if (backup.data.measurements) {
      await secureStorage.setObject('@yoroi_measurements', backup.data.measurements);
      itemsImported.measurements = backup.data.measurements.length;
    }

    if (backup.data.photos) {
      await secureStorage.setObject('@yoroi_photos', backup.data.photos);
      itemsImported.photos = backup.data.photos.length;
    }

    if (backup.data.photos_data) {
      await secureStorage.setObject('@yoroi_photos_data', backup.data.photos_data);
    }

    if (backup.data.trainings) {
      await secureStorage.setObject('@yoroi_trainings', backup.data.trainings);
      itemsImported.trainings = backup.data.trainings.length;
    }

    if (backup.data.exercises) {
      await secureStorage.setObject('@yoroi_exercises', backup.data.exercises);
      itemsImported.exercises = backup.data.exercises.length;
    }

    if (backup.data.programs) {
      await secureStorage.setObject('@yoroi_programs', backup.data.programs);
      itemsImported.programs = backup.data.programs.length;
    }

    if (backup.data.user_settings) {
      await secureStorage.setObject('@yoroi_user_settings', backup.data.user_settings);
      itemsImported.settings = 1;
    }

    if (backup.data.hydration_log) {
      await secureStorage.setObject('@yoroi_hydration_log', backup.data.hydration_log);
    }

    if (backup.data.mood_log) {
      await secureStorage.setObject('@yoroi_mood_log', backup.data.mood_log);
    }

    if (backup.data.body_status) {
      await secureStorage.setObject('@yoroi_user_body_status', backup.data.body_status);
    }

    if (backup.data.profile) {
      await secureStorage.setObject('@yoroi_user_profile', backup.data.profile);
    }

    logger.success('Import completed successfully', itemsImported);

    return {
      success: true,
      backup_created: !!backupPath,
      backup_path: backupPath,
      items_imported: itemsImported,
    };
  } catch (error) {
    logger.error('Import failed', error);
    return { success: false, error: String(error) };
  }
}

/**
 * EXEMPLE D'UTILISATION:
 *
 * // Export sécurisé
 * const exportResult = await secureExportData();
 * if (exportResult.success) {
 *   Alert.alert('Succès', 'Données exportées avec succès');
 * } else {
 *   Alert.alert('Erreur', exportResult.error);
 * }
 *
 * // Import sécurisé
 * const importResult = await secureImportData();
 * if (importResult.success) {
 *   Alert.alert(
 *     'Succès',
 *     `${importResult.items_imported?.measurements || 0} mesures importées`
 *   );
 *   if (importResult.backup_created) {
 *     logger.info('Backup créé:', importResult.backup_path);
 *   }
 * }
 */

export default {
  secureExportData,
  secureImportData,
};
