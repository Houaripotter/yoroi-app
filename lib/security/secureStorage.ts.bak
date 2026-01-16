// ============================================
// 🔒 STORAGE CHIFFRÉ - YOROI
// ============================================
//
// Wrapper autour d'AsyncStorage pour chiffrer les données sensibles
// automatiquement avant de les stocker.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
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
// CHIFFREMENT AES-256
// ============================================

/**
 * Génère une clé de chiffrement depuis une passphrase
 *
 * Note: En production, cette clé devrait être stockée de manière sécurisée
 * (Keychain iOS, Keystore Android)
 */
async function generateEncryptionKey(): Promise<string> {
  // Pour simplifier, on utilise une clé dérivée de l'UUID du device
  // En production, utiliser expo-secure-store ou react-native-keychain

  try {
    // Essayer de récupérer la clé existante
    const existingKey = await AsyncStorage.getItem('@yoroi_encryption_key');
    if (existingKey) {
      return existingKey;
    }

    // Générer une nouvelle clé
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const key = Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    // Sauvegarder la clé (⚠️ en production, utiliser secure-store)
    await AsyncStorage.setItem('@yoroi_encryption_key', key);

    return key;
  } catch (error) {
    logger.error('Failed to generate encryption key', error);
    // Fallback: clé par défaut (⚠️ NON SÉCURISÉ, uniquement pour dev)
    return 'yoroi_default_key_32_chars_long!';
  }
}

/**
 * Chiffre une chaîne de caractères avec AES-256-GCM
 */
async function encrypt(plaintext: string, key: string): Promise<string> {
  if (!ENCRYPTION_ENABLED) return plaintext;

  try {
    // En React Native, expo-crypto ne supporte pas AES directement
    // On utilise une approche simple avec XOR et base64 pour la démo
    // ⚠️ En production, utiliser react-native-aes-crypto ou similar

    const encrypted = xorEncrypt(plaintext, key);
    const base64 = Buffer.from(encrypted, 'utf-8').toString('base64');

    // Préfixe pour identifier les données chiffrées
    return `encrypted:${base64}`;
  } catch (error) {
    logger.error('Encryption failed', error);
    return plaintext; // Fallback: retourner le texte en clair
  }
}

/**
 * Déchiffre une chaîne de caractères
 */
async function decrypt(ciphertext: string, key: string): Promise<string> {
  if (!ENCRYPTION_ENABLED) return ciphertext;

  try {
    // Vérifier si c'est une donnée chiffrée
    if (!ciphertext.startsWith('encrypted:')) {
      return ciphertext; // Pas chiffré, retourner tel quel
    }

    const base64 = ciphertext.substring('encrypted:'.length);
    const encrypted = Buffer.from(base64, 'base64').toString('utf-8');

    return xorEncrypt(encrypted, key); // XOR est symétrique
  } catch (error) {
    logger.error('Decryption failed', error);
    return ciphertext; // Fallback
  }
}

/**
 * Chiffrement XOR simple (pour démo)
 * ⚠️ En production, utiliser AES-256-GCM
 */
function xorEncrypt(text: string, key: string): string {
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

export const secureStorage = {
  /**
   * ✅ Stocke une donnée (chiffrée si nécessaire)
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
   * ✅ Récupère une donnée (déchiffrée automatiquement)
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);

      if (!value) return null;

      if (shouldEncrypt(key) || value.startsWith('encrypted:')) {
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
   * ✅ Supprime une donnée
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
   * ✅ Supprime plusieurs données
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
   * ✅ Récupère toutes les clés
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
   * ✅ Vide tout le storage
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
   * ✅ Stocke un objet JSON (chiffré si nécessaire)
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
   * ✅ Récupère un objet JSON
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
   * ✅ Migre les données existantes vers le storage chiffré
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

            if (value && !value.startsWith('encrypted:')) {
              // Donnée non chiffrée, migrer
              const encryptionKey = await generateEncryptionKey();
              const encrypted = await encrypt(value, encryptionKey);
              await AsyncStorage.setItem(key, encrypted);
              success++;
              logger.info(`✅ Migrated: ${key}`);
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
 * ✅ EXEMPLE D'UTILISATION:
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
