// ============================================
// 🔒 SAFE ASYNC STORAGE - WRAPPER GLOBAL
// ============================================
// Protège TOUTES les opérations AsyncStorage contre les erreurs

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';

/**
 * Wrapper sécurisé pour AsyncStorage.getItem
 * Retourne null en cas d'erreur au lieu de crasher
 */
export const safeGetItem = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    logger.error(`[SafeAsyncStorage] getItem failed for key: ${key}`, error);

    // Log détaillé en DEV
    if (__DEV__) {
      console.warn(`⚠️ AsyncStorage.getItem('${key}') failed:`, error);
    }

    // Détection stockage plein
    if (error instanceof Error && (
      error.message.includes('QuotaExceededError') ||
      error.message.includes('quota') ||
      error.message.includes('storage')
    )) {
      console.error('🔴 STOCKAGE PLEIN - Impossible de lire les données');
    }

    return null;
  }
};

/**
 * Wrapper sécurisé pour AsyncStorage.setItem
 * Retourne false en cas d'erreur au lieu de crasher
 */
export const safeSetItem = async (key: string, value: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    logger.error(`[SafeAsyncStorage] setItem failed for key: ${key}`, error);

    // Log détaillé en DEV
    if (__DEV__) {
      console.warn(`⚠️ AsyncStorage.setItem('${key}') failed:`, error);
    }

    // Détection stockage plein
    if (error instanceof Error && (
      error.message.includes('QuotaExceededError') ||
      error.message.includes('quota') ||
      error.message.includes('storage')
    )) {
      console.error('🔴 STOCKAGE PLEIN - Impossible de sauvegarder les données');
      console.error(`Taille tentée: ~${(value.length / 1024).toFixed(2)} KB`);
    }

    return false;
  }
};

/**
 * Wrapper sécurisé pour AsyncStorage.removeItem
 */
export const safeRemoveItem = async (key: string): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    logger.error(`[SafeAsyncStorage] removeItem failed for key: ${key}`, error);

    if (__DEV__) {
      console.warn(`⚠️ AsyncStorage.removeItem('${key}') failed:`, error);
    }

    return false;
  }
};

/**
 * Wrapper sécurisé pour AsyncStorage.multiGet
 */
export const safeMultiGet = async (keys: string[]): Promise<readonly [string, string | null][]> => {
  try {
    return await AsyncStorage.multiGet(keys);
  } catch (error) {
    logger.error(`[SafeAsyncStorage] multiGet failed for keys: ${keys.join(', ')}`, error);

    if (__DEV__) {
      console.warn(`⚠️ AsyncStorage.multiGet failed:`, error);
    }

    // Retourner un tableau vide avec les clés
    return keys.map(key => [key, null]);
  }
};

/**
 * Wrapper sécurisé pour AsyncStorage.multiSet
 */
export const safeMultiSet = async (keyValuePairs: [string, string][]): Promise<boolean> => {
  try {
    await AsyncStorage.multiSet(keyValuePairs);
    return true;
  } catch (error) {
    logger.error(`[SafeAsyncStorage] multiSet failed`, error);

    if (__DEV__) {
      console.warn(`⚠️ AsyncStorage.multiSet failed:`, error);
    }

    return false;
  }
};

/**
 * Wrapper sécurisé pour AsyncStorage.multiRemove
 */
export const safeMultiRemove = async (keys: string[]): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove(keys);
    return true;
  } catch (error) {
    logger.error(`[SafeAsyncStorage] multiRemove failed`, error);

    if (__DEV__) {
      console.warn(`⚠️ AsyncStorage.multiRemove failed:`, error);
    }

    return false;
  }
};

/**
 * Wrapper sécurisé pour AsyncStorage.getAllKeys
 */
export const safeGetAllKeys = async (): Promise<string[]> => {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    logger.error(`[SafeAsyncStorage] getAllKeys failed`, error);

    if (__DEV__) {
      console.warn(`⚠️ AsyncStorage.getAllKeys failed:`, error);
    }

    return [];
  }
};

/**
 * Wrapper sécurisé pour AsyncStorage.clear
 */
export const safeClear = async (): Promise<boolean> => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    logger.error(`[SafeAsyncStorage] clear failed`, error);

    if (__DEV__) {
      console.warn(`⚠️ AsyncStorage.clear failed:`, error);
    }

    return false;
  }
};

/**
 * Helper: Sauvegarder un objet JSON
 */
export const safeSetJSON = async <T>(key: string, value: T): Promise<boolean> => {
  try {
    const jsonString = JSON.stringify(value);
    return await safeSetItem(key, jsonString);
  } catch (error) {
    logger.error(`[SafeAsyncStorage] setJSON failed for key: ${key}`, error);

    if (__DEV__) {
      console.warn(`⚠️ Failed to stringify object for key '${key}':`, error);
    }

    return false;
  }
};

/**
 * Helper: Récupérer un objet JSON
 */
export const safeGetJSON = async <T>(key: string, defaultValue?: T): Promise<T | null> => {
  try {
    const value = await safeGetItem(key);

    if (!value) {
      return defaultValue ?? null;
    }

    return JSON.parse(value) as T;
  } catch (error) {
    logger.error(`[SafeAsyncStorage] getJSON failed for key: ${key}`, error);

    if (__DEV__) {
      console.warn(`⚠️ Failed to parse JSON for key '${key}':`, error);
    }

    return defaultValue ?? null;
  }
};

/**
 * Vérifier l'espace disponible (estimation)
 * Retourne le nombre de KB libres (approximatif)
 */
export const checkAvailableSpace = async (): Promise<number | null> => {
  try {
    // Test d'écriture avec une grosse chaîne
    const testKey = '@yoroi_space_test';
    const testSize = 100 * 1024; // 100 KB
    const testData = 'x'.repeat(testSize);

    const success = await safeSetItem(testKey, testData);
    await safeRemoveItem(testKey);

    if (!success) {
      return 0; // Stockage probablement plein
    }

    // Retourne une estimation
    return 5000; // ~5 MB libre (estimation conservative)
  } catch (error) {
    logger.error('[SafeAsyncStorage] checkAvailableSpace failed', error);
    return null;
  }
};

// Exporter aussi l'instance originale pour les cas où on en a besoin
export { AsyncStorage };

// Export par défaut des fonctions safe
export default {
  getItem: safeGetItem,
  setItem: safeSetItem,
  removeItem: safeRemoveItem,
  multiGet: safeMultiGet,
  multiSet: safeMultiSet,
  multiRemove: safeMultiRemove,
  getAllKeys: safeGetAllKeys,
  clear: safeClear,
  getJSON: safeGetJSON,
  setJSON: safeSetJSON,
  checkAvailableSpace,
};
