// ============================================
// BACKUP ENCRYPTION SERVICE
// Chiffre / déchiffre un backup JSON avec AES-256 + clé dérivée depuis
// un mot de passe utilisateur (PBKDF2, 10k itérations).
// ============================================
//
// Format du fichier chiffré :
//   {
//     "yoroi_encrypted": "1.0",   // marker pour détection auto
//     "salt": "base64...",        // salt unique par backup
//     "iv": "base64...",          // IV unique par backup
//     "cipher": "base64...",      // données chiffrées
//     "checksum": "sha256..."     // hash des données originales (vérification intégrité après déchiffrement)
//   }
//

import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import secureStorage from './security/secureStorage';
import logger from './security/logger';
import { traduire } from '@/lib/i18n/tr';

const ENCRYPTION_ENABLED_KEY = '@yoroi_backup_encryption_enabled';
const ENCRYPTION_PASSWORD_KEY = '@yoroi_backup_encryption_password'; // stocké en secureStorage (Keychain/Keystore)
// 600 000 itérations : recommandation OWASP 2025 pour PBKDF2-SHA256.
// Coût : ~200-400ms par dérivation sur mobile, acceptable pour un backup.
const PBKDF2_ITERATIONS = 600000;
const KEY_SIZE_BITS = 256;
// v2.0 : AES-GCM + PBKDF2 600k. v1.0 = AES-CBC + PBKDF2 10k (legacy, toujours déchiffrable).
const ENCRYPTED_MARKER_V1 = '1.0';
const ENCRYPTED_MARKER_V2 = '2.0';
const ENCRYPTED_MARKER_CURRENT = ENCRYPTED_MARKER_V2;

// ─── Activation ────────────────────────────────────────────────────────────

export async function isBackupEncryptionEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(ENCRYPTION_ENABLED_KEY);
    return raw === 'true';
  } catch { return false; }
}

export async function setBackupEncryptionEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ENCRYPTION_ENABLED_KEY, enabled ? 'true' : 'false');
    // Si on désactive, on efface aussi le mot de passe stocké
    if (!enabled) {
      await secureStorage.removeItem(ENCRYPTION_PASSWORD_KEY).catch(() => {});
    }
  } catch { /* ignore */ }
}

/**
 * Stocke le mot de passe de chiffrement dans le Keychain / Keystore sécurisé.
 * Permet aux backups auto silencieux de chiffrer sans demander le password.
 */
export async function setStoredEncryptionPassword(password: string): Promise<void> {
  try {
    await secureStorage.setItem(ENCRYPTION_PASSWORD_KEY, password);
  } catch (e) {
    logger.error('[BackupEncryption] Erreur stockage password:', e);
    throw e;
  }
}

export async function getStoredEncryptionPassword(): Promise<string | null> {
  try {
    const pwd = await secureStorage.getItem(ENCRYPTION_PASSWORD_KEY);
    return typeof pwd === 'string' ? pwd : null;
  } catch { return null; }
}

export async function clearStoredEncryptionPassword(): Promise<void> {
  try {
    await secureStorage.removeItem(ENCRYPTION_PASSWORD_KEY);
  } catch { /* ignore */ }
}

// ─── Détection d'un fichier chiffré ─────────────────────────────────────────

export function isEncryptedBackup(parsedJson: any): boolean {
  if (!parsedJson || typeof parsedJson !== 'object') return false;
  const marker = parsedJson.yoroi_encrypted;
  return marker === ENCRYPTED_MARKER_V1 || marker === ENCRYPTED_MARKER_V2;
}

// ─── Chiffrement ───────────────────────────────────────────────────────────

/**
 * Dérive 2 clés de 256 bits à partir du password (1 pour AES, 1 pour HMAC).
 * Pattern Encrypt-then-MAC : les 2 clés sont tirées du même password mais
 * distinctes, ce qui est la bonne pratique (indépendance cryptographique).
 */
function deriveKeys(password: string, salt: CryptoJS.lib.WordArray) {
  // On dérive 512 bits (64 octets) d'un coup, puis on split en 2 × 256 bits
  const combined = CryptoJS.PBKDF2(password, salt, {
    keySize: (KEY_SIZE_BITS * 2) / 32, // 512 bits au total
    iterations: PBKDF2_ITERATIONS,
  });
  // Split : premier 256 bits = AES, derniers 256 bits = HMAC
  const words = combined.words;
  const aesKey = CryptoJS.lib.WordArray.create(words.slice(0, 8), 32);
  const hmacKey = CryptoJS.lib.WordArray.create(words.slice(8, 16), 32);
  return { aesKey, hmacKey };
}

/**
 * Chiffre un objet JSON avec un mot de passe.
 * Format v2.0 : AES-256-CBC + HMAC-SHA256 (Encrypt-then-MAC).
 * Retourne l'objet chiffré prêt à être écrit comme fichier.
 */
export function encryptBackup(data: any, password: string): object {
  try {
    const dataJson = JSON.stringify(data);

    // Salt (128 bits) et IV (128 bits) uniques pour ce backup
    const salt = CryptoJS.lib.WordArray.random(128 / 8);
    const iv = CryptoJS.lib.WordArray.random(128 / 8);

    // Dérivation de 2 clés indépendantes
    const { aesKey, hmacKey } = deriveKeys(password, salt);

    // Chiffrement AES-256-CBC
    const encrypted = CryptoJS.AES.encrypt(dataJson, aesKey, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const cipherText = encrypted.toString(); // base64

    // HMAC-SHA256 sur (iv || cipher) avec la 2e clé
    // Protège contre le tampering : modifier cipher ou iv invalide le HMAC.
    const hmacInput = iv.toString(CryptoJS.enc.Base64) + '|' + cipherText;
    const hmac = CryptoJS.HmacSHA256(hmacInput, hmacKey).toString(CryptoJS.enc.Base64);

    // Checksum SHA-256 des données originales (vérif intégrité après déchiffrement)
    const checksum = CryptoJS.SHA256(dataJson).toString();

    return {
      yoroi_encrypted: ENCRYPTED_MARKER_CURRENT,
      salt: salt.toString(CryptoJS.enc.Base64),
      iv: iv.toString(CryptoJS.enc.Base64),
      cipher: cipherText,
      hmac, // ← nouveau en v2.0 : authentification
      checksum,
      encryptedAt: new Date().toISOString(),
    };
  } catch (e) {
    logger.error('[BackupEncryption] Erreur chiffrement:', e);
    throw new Error('Impossible de chiffrer la sauvegarde');
  }
}

// ─── Déchiffrement ─────────────────────────────────────────────────────────

/**
 * Erreurs spécifiques pour distinguer les causes d'échec au déchiffrement.
 */
export class DecryptionError extends Error {
  constructor(public code: 'WRONG_PASSWORD' | 'TAMPERED' | 'INVALID_FORMAT' | 'JSON_INVALID', message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

/**
 * Déchiffre un objet backup chiffré.
 * Supporte v1.0 (legacy, sans HMAC) et v2.0 (avec HMAC authentification).
 *
 * @throws DecryptionError avec un code précis selon la cause
 */
export function decryptBackup(encryptedObj: any, password: string): any {
  if (!isEncryptedBackup(encryptedObj)) {
    throw new DecryptionError('INVALID_FORMAT', "Le fichier n'est pas un backup Yoroi chiffré");
  }

  const version = encryptedObj.yoroi_encrypted;
  const { salt, iv, cipher, hmac, checksum } = encryptedObj;
  if (!salt || !iv || !cipher) {
    throw new DecryptionError('INVALID_FORMAT', 'Format de fichier chiffré invalide');
  }

  try {
    const saltWA = CryptoJS.enc.Base64.parse(salt);
    const ivWA = CryptoJS.enc.Base64.parse(iv);

    if (version === ENCRYPTED_MARKER_V2) {
      // ─── v2.0 : AES-CBC + HMAC-SHA256 avec 2 clés dérivées ─────────
      const { aesKey, hmacKey } = deriveKeys(password, saltWA);

      // 1) Vérification HMAC AVANT le déchiffrement (détection tampering)
      const hmacInput = iv + '|' + cipher;
      const computedHmac = CryptoJS.HmacSHA256(hmacInput, hmacKey).toString(CryptoJS.enc.Base64);
      if (computedHmac !== hmac) {
        // Soit mot de passe incorrect (HMAC dérivé différent),
        // soit le fichier a été modifié. Impossible de distinguer avec certitude.
        throw new DecryptionError('WRONG_PASSWORD', 'Mot de passe incorrect ou fichier altéré');
      }

      // 2) Déchiffrement AES
      const decrypted = CryptoJS.AES.decrypt(cipher, aesKey, {
        iv: ivWA,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });

      const dataJson = decrypted.toString(CryptoJS.enc.Utf8);
      if (!dataJson) {
        throw new DecryptionError('WRONG_PASSWORD', 'Déchiffrement impossible');
      }

      // 3) Vérification du checksum des données originales
      if (checksum) {
        const computed = CryptoJS.SHA256(dataJson).toString();
        if (computed !== checksum) {
          throw new DecryptionError('TAMPERED', 'Données incohérentes après déchiffrement');
        }
      }

      // 4) Parsing JSON strict (on sépare cette erreur pour un meilleur diagnostic)
      try {
        return JSON.parse(dataJson);
      } catch {
        throw new DecryptionError('JSON_INVALID', 'Les données déchiffrées ne sont pas un JSON valide');
      }
    }

    // ─── v1.0 : legacy, PBKDF2 10k + AES-CBC sans HMAC ────────────
    // On maintient la compat pour que les anciens backups chiffrés restent restaurables.
    const legacyKey = CryptoJS.PBKDF2(password, saltWA, {
      keySize: KEY_SIZE_BITS / 32,
      iterations: 10000, // ancien nombre d'itérations v1.0
    });
    const decrypted = CryptoJS.AES.decrypt(cipher, legacyKey, {
      iv: ivWA,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    const dataJson = decrypted.toString(CryptoJS.enc.Utf8);
    if (!dataJson) {
      throw new DecryptionError('WRONG_PASSWORD', traduire('Mot de passe incorrect'));
    }
    if (checksum) {
      const computed = CryptoJS.SHA256(dataJson).toString();
      if (computed !== checksum) {
        throw new DecryptionError('WRONG_PASSWORD', traduire('Mot de passe incorrect'));
      }
    }
    try {
      return JSON.parse(dataJson);
    } catch {
      throw new DecryptionError('JSON_INVALID', 'Les données déchiffrées ne sont pas un JSON valide');
    }
  } catch (e) {
    if (e instanceof DecryptionError) throw e;
    logger.error('[BackupEncryption] Erreur déchiffrement inattendue:', e);
    throw new DecryptionError('WRONG_PASSWORD', traduire('Mot de passe incorrect'));
  }
}
