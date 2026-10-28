import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import logger from './logger';
import { SECURE_DATA_KEYS } from '@/lib/v2/sauvegarde/fusion';

/**
 * Nettoie la clé pour être compatible avec SecureStore
 * (Uniquement alphanumérique, ".", "-", "_")
 */
const sanitizeKey = (key: string): string => {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
};

// ============================================
// MIROIR DU COFFRE (28 octobre 2026, audit « ne jamais perdre de donnees »)
// ============================================
// Sur Android, la sauvegarde Google et le transfert vers un nouveau telephone excluent le coffre
// (sa cle ne quitte pas le telephone). Les reglages du profil, les mesures, l'eau, l'humeur... qui ne
// vivaient que dans le coffre etaient donc perdus au changement de telephone.
// Chaque ecriture d'une DONNEE de l'utilisateur (liste SECURE_DATA_KEYS : jamais un mot de passe, un jeton
// ou une cle) est recopiee dans AsyncStorage, qui est sauvegarde. Si le coffre est vide (telephone neuf
// restaure), la valeur est reprise du miroir et remise dans le coffre.
export const MIROIR_PREFIX = '@yoroi_miroir_coffre:';
export const miroirCle = (key: string) => `${MIROIR_PREFIX}${key}`;
/** Les anciennes photos (2.x, parfois en base64, donc tres lourdes) sont reprises ailleurs : pas de miroir */
const CLES_MIROIR = new Set<string>(SECURE_DATA_KEYS.filter((k) => k !== '@yoroi_photos'));
export const aUnMiroir = (key: string) => Platform.OS !== 'web' && CLES_MIROIR.has(key);
/** Cles dont le miroir a deja ete compare au coffre pendant ce lancement */
const miroirsVerifies = new Set<string>();

const lireMiroir = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(miroirCle(key));
  } catch {
    return null;
  }
};

const ecrireMiroir = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(miroirCle(key), value);
    miroirsVerifies.add(key);
  } catch (error) {
    logger.warn(`[SecureStorage] miroir non ecrit (${key})`, error);
  }
};

const decoder = (value: string): any => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

/** Apres une lecture reussie du coffre : miroir tenu a jour, ou reprise depuis le miroir si le coffre est vide */
const apresLecture = async (key: string, safeKey: string, value: string | null): Promise<string | null> => {
  if (!aUnMiroir(key)) return value;
  if (value) {
    // premiere lecture du lancement : un utilisateur d'une version d'avant n'a pas encore de miroir
    if (!miroirsVerifies.has(key)) {
      miroirsVerifies.add(key);
      if ((await lireMiroir(key)) !== value) await ecrireMiroir(key, value);
    }
    return value;
  }
  const m = await lireMiroir(key);
  if (!m) return null;
  try {
    await SecureStore.setItemAsync(safeKey, m, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
  } catch {
    // le miroir reste la source : la valeur est rendue quand meme
  }
  logger.info(`[SecureStorage] ${key} repris depuis le miroir (coffre vide)`);
  return m;
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
      if (aUnMiroir(key)) await ecrireMiroir(key, stringValue);
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
    const safeKey = sanitizeKey(key);
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(safeKey);
      }

      const value = await apresLecture(key, safeKey, await SecureStore.getItemAsync(safeKey));
      if (!value) return null;
      return decoder(value);
    } catch (error) {
      logger.error(`SecureStorage read error (${key}):`, error);
      // coffre illisible : la copie du miroir, si elle existe (lecture seule)
      if (aUnMiroir(key)) {
        const m = await lireMiroir(key);
        if (m) return decoder(m);
      }
      return null;
    }
  },

  /**
   * Comme getItem, mais LANCE l'erreur au lieu de renvoyer null.
   * Indispensable pour distinguer "aucune donnée" de "lecture impossible"
   * (ex : trousseau iOS verrouillé lors d'un réveil en arrière-plan par HealthKit).
   * Utilisé par la décision d'afficher ou non l'onboarding.
   * Coffre illisible mais miroir present : la valeur du miroir est rendue (c'est une vraie donnee).
   */
  getItemStrict: async (key: string): Promise<any | null> => {
    const safeKey = sanitizeKey(key);
    if (Platform.OS === 'web') {
      return localStorage.getItem(safeKey);
    }
    let brut: string | null;
    try {
      brut = await SecureStore.getItemAsync(safeKey);
    } catch (error) {
      const m = aUnMiroir(key) ? await lireMiroir(key) : null;
      if (m) return decoder(m);
      throw error;
    }
    const value = await apresLecture(key, safeKey, brut);
    if (!value) return null;
    return decoder(value);
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
      // le miroir d'abord : une donnee effacee ne doit jamais revenir depuis sa copie
      if (aUnMiroir(key)) {
        await AsyncStorage.removeItem(miroirCle(key));
        miroirsVerifies.delete(key);
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
