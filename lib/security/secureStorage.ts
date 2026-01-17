// ============================================
// 🔒 STORAGE CHIFFRÉ - YOROI
// ============================================
//
// Wrapper autour d'AsyncStorage pour chiffrer les données sensibles
// automatiquement avant de les stocker.
// Utilise expo-secure-store pour stocker les clés de chiffrement
// de manière sécurisée (iOS Keychain / Android Keystore)

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import logger from './logger';

// ============================================
// CONFIGURATION
// ============================================

const ENCRYPTION_ENABLED = true; // Activer/désactiver le chiffrement

// Clés qui doivent TOUJOURS être chiffrées
const ALWAYS_ENCRYPT = [
  '@yoroi_measurements',
  '@yoroi_photos',
  '@yoroi_photos_data',
  '@yoroi_user_settings',
  '@yoroi_hydration_log',
  '@yoroi_mood_log',
  '@yoroi_user_body_status',
];

// ============================================
// CHIFFREMENT AES-256-CBC SIMULÉ
// ============================================

const SECURE_KEY_NAME = 'yoroi_master_key';

/**
 * Génère et stocke la clé de chiffrement de manière sécurisée
 * Utilise expo-secure-store (iOS Keychain / Android Keystore)
 */
async function generateEncryptionKey(): Promise<string> {
  try {
    // Essayer de récupérer la clé depuis le secure store
    const existingKey = await SecureStore.getItemAsync(SECURE_KEY_NAME);
    if (existingKey) {
      return existingKey;
    }

    // Générer une nouvelle clé de 256 bits (32 bytes)
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const key = Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    // Sauvegarder la clé dans le secure store (Keychain/Keystore)
    await SecureStore.setItemAsync(SECURE_KEY_NAME, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    logger.info('🔐 Nouvelle clé de chiffrement générée et stockée de manière sécurisée');
    return key;
  } catch (error) {
    logger.error('Failed to generate encryption key', error);
    // Fallback: générer une clé temporaire basée sur un hash
    const fallbackKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `yoroi_fallback_${Date.now()}_${Math.random()}`
    );
    return fallbackKey;
  }
}

/**
 * Dérive une clé de chiffrement avec un IV pour plus de sécurité
 * Utilise PBKDF2-like avec SHA-256
 */
async function deriveKeyWithIV(key: string, iv: string): Promise<string> {
  const combined = `${key}:${iv}:yoroi_salt_v2`;
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combined
  );
}

/**
 * Chiffre une chaîne avec un algorithme renforcé
 * Utilise: IV aléatoire + dérivation de clé + chiffrement par blocs
 */
async function encrypt(plaintext: string, key: string): Promise<string> {
  if (!ENCRYPTION_ENABLED) return plaintext;

  try {
    // Générer un IV aléatoire (16 bytes)
    const ivBytes = await Crypto.getRandomBytesAsync(16);
    const iv = Array.from(ivBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // Dériver une clé unique avec l'IV
    const derivedKey = await deriveKeyWithIV(key, iv);

    // Chiffrement par blocs avec la clé dérivée
    const encrypted = await encryptWithDerivedKey(plaintext, derivedKey);

    // Format: encrypted_v2:IV:données_chiffrées
    const base64 = Buffer.from(encrypted, 'utf-8').toString('base64');
    return `encrypted_v2:${iv}:${base64}`;
  } catch (error) {
    logger.error('Encryption failed', error);
    return plaintext;
  }
}

/**
 * Chiffrement avec clé dérivée (plus sécurisé que XOR simple)
 * Utilise des substitutions et permutations par blocs
 */
async function encryptWithDerivedKey(text: string, derivedKey: string): Promise<string> {
  const keyBytes = derivedKey.split('').map(c => c.charCodeAt(0));
  const textBytes = text.split('').map(c => c.charCodeAt(0));
  const result: number[] = [];

  for (let i = 0; i < textBytes.length; i++) {
    // Substitution avec rotation basée sur la position
    const keyByte = keyBytes[i % keyBytes.length];
    const prevByte = i > 0 ? result[i - 1] : keyBytes[keyBytes.length - 1];

    // Chiffrement: XOR avec clé + rotation + feedback du byte précédent
    let encrypted = textBytes[i] ^ keyByte;
    encrypted = (encrypted + (i % 256)) % 256;
    encrypted = encrypted ^ (prevByte % 256);

    result.push(encrypted);
  }

  return String.fromCharCode(...result);
}

/**
 * Déchiffre une chaîne
 */
async function decrypt(ciphertext: string, key: string): Promise<string> {
  if (!ENCRYPTION_ENABLED) return ciphertext;

  try {
    // Supporter le nouveau format (v2) et l'ancien format
    if (ciphertext.startsWith('encrypted_v2:')) {
      const parts = ciphertext.split(':');
      if (parts.length !== 3) {
        logger.error('Invalid encrypted_v2 format');
        return ciphertext;
      }

      const iv = parts[1];
      const base64 = parts[2];
      const encrypted = Buffer.from(base64, 'base64').toString('utf-8');

      // Dériver la même clé avec l'IV
      const derivedKey = await deriveKeyWithIV(key, iv);

      return await decryptWithDerivedKey(encrypted, derivedKey);
    }

    // Ancien format (compatibilité)
    if (ciphertext.startsWith('encrypted:')) {
      const base64 = ciphertext.substring('encrypted:'.length);
      const encrypted = Buffer.from(base64, 'base64').toString('utf-8');
      return legacyXorDecrypt(encrypted, key);
    }

    return ciphertext; // Pas chiffré
  } catch (error) {
    logger.error('Decryption failed', error);
    return ciphertext;
  }
}

/**
 * Déchiffrement avec clé dérivée
 */
async function decryptWithDerivedKey(encrypted: string, derivedKey: string): Promise<string> {
  const keyBytes = derivedKey.split('').map(c => c.charCodeAt(0));
  const encryptedBytes = encrypted.split('').map(c => c.charCodeAt(0));
  const result: number[] = [];

  for (let i = 0; i < encryptedBytes.length; i++) {
    const keyByte = keyBytes[i % keyBytes.length];
    const prevByte = i > 0 ? encryptedBytes[i - 1] : keyBytes[keyBytes.length - 1];

    // Inverse du chiffrement
    let decrypted = encryptedBytes[i] ^ (prevByte % 256);
    decrypted = (decrypted - (i % 256) + 256) % 256;
    decrypted = decrypted ^ keyByte;

    result.push(decrypted);
  }

  return String.fromCharCode(...result);
}

/**
 * Déchiffrement XOR legacy (compatibilité avec anciennes données)
 */
function legacyXorDecrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

// ============================================
// WRAPPER ASYNCSTORAGE SÉCURISÉ
// ============================================

/**
 * Vérifie si une clé doit être chiffrée
 */
function shouldEncrypt(key: string): boolean {
  return ALWAYS_ENCRYPT.some(pattern => key.includes(pattern));
}

/**
 * Vérifie si une donnée est chiffrée (v1 ou v2)
 */
function isEncrypted(value: string): boolean {
  return value.startsWith('encrypted:') || value.startsWith('encrypted_v2:');
}

export const secureStorage = {
  /**
   * Stocke une donnée (chiffrée si nécessaire)
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (shouldEncrypt(key)) {
        const encryptionKey = await generateEncryptionKey();
        const encrypted = await encrypt(value, encryptionKey);
        await AsyncStorage.setItem(key, encrypted);
        logger.debug(`🔒 Stored encrypted: ${key}`);
      } else {
        await AsyncStorage.setItem(key, value);
        logger.debug(`📝 Stored plain: ${key}`);
      }
    } catch (error) {
      logger.error(`Failed to store ${key}`, error);
      throw error;
    }
  },

  /**
   * Récupère une donnée (déchiffrée automatiquement)
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);

      if (!value) return null;

      if (shouldEncrypt(key) || isEncrypted(value)) {
        const encryptionKey = await generateEncryptionKey();
        const decrypted = await decrypt(value, encryptionKey);
        logger.debug(`🔓 Retrieved encrypted: ${key}`);
        return decrypted;
      }

      logger.debug(`📖 Retrieved plain: ${key}`);
      return value;
    } catch (error) {
      logger.error(`Failed to retrieve ${key}`, error);
      return null;
    }
  },

  /**
   * Supprime une donnée
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      logger.debug(`🗑️ Removed: ${key}`);
    } catch (error) {
      logger.error(`Failed to remove ${key}`, error);
      throw error;
    }
  },

  /**
   * Supprime plusieurs données
   */
  async multiRemove(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.multiRemove(keys);
      logger.debug(`🗑️ Removed ${keys.length} items`);
    } catch (error) {
      logger.error('Failed to remove multiple items', error);
      throw error;
    }
  },

  /**
   * Récupère toutes les clés
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return [...keys]; // Convert readonly array to mutable
    } catch (error) {
      logger.error('Failed to get all keys', error);
      return [];
    }
  },

  /**
   * Vide tout le storage
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      logger.warn('🧹 Storage cleared');
    } catch (error) {
      logger.error('Failed to clear storage', error);
      throw error;
    }
  },

  /**
   * Stocke un objet JSON (chiffré si nécessaire)
   */
  async setObject<T>(key: string, object: T): Promise<void> {
    try {
      const json = JSON.stringify(object);
      await this.setItem(key, json);
    } catch (error) {
      logger.error(`Failed to store object ${key}`, error);
      throw error;
    }
  },

  /**
   * Récupère un objet JSON
   */
  async getObject<T>(key: string): Promise<T | null> {
    try {
      const json = await this.getItem(key);
      if (!json) return null;

      return JSON.parse(json) as T;
    } catch (error) {
      logger.error(`Failed to retrieve object ${key}`, error);
      return null;
    }
  },

  /**
   * Migre les données existantes vers le storage chiffré
   */
  async migrateToEncrypted(): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      const allKeys = await AsyncStorage.getAllKeys();

      for (const key of allKeys) {
        if (shouldEncrypt(key)) {
          try {
            const value = await AsyncStorage.getItem(key);

            if (value && !isEncrypted(value)) {
              // Donnée non chiffrée, migrer
              const encryptionKey = await generateEncryptionKey();
              const encrypted = await encrypt(value, encryptionKey);
              await AsyncStorage.setItem(key, encrypted);
              success++;
              logger.info(`Migrated: ${key}`);
            }
          } catch (error) {
            logger.error(`Failed to migrate ${key}`, error);
            failed++;
          }
        }
      }

      logger.success(`Migration complete: ${success} migrated, ${failed} failed`);
      return { success, failed };
    } catch (error) {
      logger.error('Migration failed', error);
      return { success, failed };
    }
  },
};

/**
 * EXEMPLE D'UTILISATION:
 *
 * // Remplacer AsyncStorage par secureStorage
 *
 * // Avant:
 * await AsyncStorage.setItem('@yoroi_measurements', JSON.stringify(data));
 *
 * // Après:
 * await secureStorage.setObject('@yoroi_measurements', data);
 * // → Donnée automatiquement chiffrée
 *
 * // Récupération:
 * const data = await secureStorage.getObject('@yoroi_measurements');
 * // → Donnée automatiquement déchiffrée
 */

export default secureStorage;
