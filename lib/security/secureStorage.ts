import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import logger from './logger';

/**
 * Nettoie la clé pour être compatible avec SecureStore
 * (Uniquement alphanumérique, ".", "-", "_")
 */
const sanitizeKey = (key: string): string => {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
};

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
      const safeKey = sanitizeKey(key);
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (Platform.OS === 'web') {
        localStorage.setItem(safeKey, stringValue);
        return true;
      }

      await SecureStore.setItemAsync(safeKey, stringValue, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
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
      const safeKey = sanitizeKey(key);
      if (Platform.OS === 'web') {
        return localStorage.getItem(safeKey);
      }

      const value = await SecureStore.getItemAsync(safeKey);
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
   * Comme getItem, mais LANCE l'erreur au lieu de renvoyer null.
   * Indispensable pour distinguer "aucune donnée" de "lecture impossible"
   * (ex : trousseau iOS verrouillé lors d'un réveil en arrière-plan par HealthKit).
   * Utilisé par la décision d'afficher ou non l'onboarding.
   */
  getItemStrict: async (key: string): Promise<any | null> => {
    const safeKey = sanitizeKey(key);
    if (Platform.OS === 'web') {
      return localStorage.getItem(safeKey);
    }
    const value = await SecureStore.getItemAsync(safeKey);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  },

  /**
   * Supprime une donnée
   */
  removeItem: async (key: string): Promise<boolean> => {
    try {
      const safeKey = sanitizeKey(key);
      if (Platform.OS === 'web') {
        localStorage.removeItem(safeKey);
        return true;
      }
      await SecureStore.deleteItemAsync(safeKey);
      return true;
    } catch (error) {
      logger.error(`SecureStorage delete error (${key}):`, error);
      return false;
    }
  }
};

export default secureStorage;
