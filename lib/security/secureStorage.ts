import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import logger from './logger';

/**
 * Service de stockage chiffré (AES-256 sur iOS/Android)
 * Pour les données d'identité et jetons sensibles.
 */
export const secureStorage = {
  /**
   * Sauvegarde une donnée de manière chiffrée
   */
  setItem: async (key: string, value: any): Promise<boolean> => {
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (Platform.OS === 'web') {
        // Fallback pour le web (pas de SecureStore)
        localStorage.setItem(key, stringValue);
        return true;
      }

      await SecureStore.setItemAsync(key, stringValue, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED,
      });
      return true;
    } catch (error) {
      logger.error(`SecureStorage save error (${key}):`, error);
      return false;
    }
  },

  /**
   * Récupère une donnée chiffrée
   */
  getItem: async (key: string): Promise<any | null> => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }

      const value = await SecureStore.getItemAsync(key);
      if (!value) return null;

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error(`SecureStorage read error (${key}):`, error);
      return null;
    }
  },

  /**
   * Supprime une donnée
   */
  removeItem: async (key: string): Promise<boolean> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return true;
      }
      await SecureStore.deleteItemAsync(key);
      return true;
    } catch (error) {
      logger.error(`SecureStorage delete error (${key}):`, error);
      return false;
    }
  }
};

export default secureStorage;