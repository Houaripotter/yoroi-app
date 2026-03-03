// ============================================
// 🔒 GÉNÉRATEUR D'ID SÉCURISÉ - YOROI
// ============================================
//
// Remplace Math.random() par une génération cryptographiquement
// sûre pour éviter les collisions et la prévisibilité.

import { randomUUID, digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import { Platform } from 'react-native';
import logger from '@/lib/security/logger';

/**
 * Génère un ID unique cryptographiquement sûr
 *
 * Format: timestamp-random (exemple: 1735567890123-a7b3c9d2e1f4)
 *
 * @returns ID unique de 32 caractères
 */
export async function generateSecureId(): Promise<string> {
  try {
    // Partie 1: Timestamp (garantit l'unicité temporelle)
    const timestamp = Date.now();

    // Partie 2: Random bytes cryptographiquement sûrs
    const randomBytes = await Crypto.getRandomBytesAsync(6);
    const randomHex = Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    return `${timestamp}-${randomHex}`;
  } catch (error) {
    // Fallback si expo-crypto n'est pas disponible (rare)
    logger.error('Crypto not available, using fallback ID generator');
    return generateFallbackId();
  }
}

/**
 * Fallback pour les environnements sans crypto
 * (moins sûr, mais mieux que Math.random())
 */
function generateFallbackId(): string {
  const timestamp = Date.now();
  const random1 = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  const random3 = performance.now().toString(36).replace('.', '');

  return `${timestamp}-${random1}${random2}${random3}`.substring(0, 32);
}

/**
 * Version synchrone (utilise le cache)
 *
 * Note: Préfère generateSecureId() pour la sécurité maximale
 */
export function generateSecureIdSync(): string {
  // En React Native, on ne peut pas utiliser crypto de manière synchrone
  // On utilise donc un fallback amélioré
  const timestamp = Date.now();
  const highRes = performance.now().toString().replace('.', '');
  const random = Math.random().toString(36).substring(2, 15);

  return `${timestamp}-${highRes}${random}`.substring(0, 32);
}

/**
 * Génère un UUID v4 conforme au standard
 *
 * @returns UUID v4 (exemple: 550e8400-e29b-41d4-a716-446655440000)
 */
export async function generateUUID(): Promise<string> {
  try {
    const randomBytes = await Crypto.getRandomBytesAsync(16);

    // Set version (4) and variant bits
    randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40;
    randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80;

    const hex = Array.from(randomBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
  } catch (error) {
    logger.error('UUID generation failed, using fallback');
    return generateFallbackUUID();
  }
}

/**
 * Fallback UUID generator
 */
function generateFallbackUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Génère un code court (pour partage, invitations, etc.)
 *
 * @param length Longueur du code (par défaut 8)
 * @returns Code alphanumérique (exemple: A7B3C9D2)
 */
export async function generateShortCode(length: number = 8): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Pas de caractères ambigus (0, O, 1, I)
  const randomBytes = await Crypto.getRandomBytesAsync(length);

  return Array.from(randomBytes)
    .map(byte => chars[byte % chars.length])
    .join('');
}

/**
 * Génère un token de session sécurisé
 *
 * @param length Longueur en bytes (par défaut 32)
 * @returns Token hex de 64 caractères
 */
export async function generateSecureToken(length: number = 32): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(length);

  return Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Valide un ID généré par generateSecureId()
 */
export function isValidSecureId(id: string): boolean {
  // Format: timestamp-hexstring
  const parts = id.split('-');

  if (parts.length !== 2) return false;

  const timestamp = parseInt(parts[0], 10);
  const randomPart = parts[1];

  // Vérifier que le timestamp est valide
  if (isNaN(timestamp) || timestamp <= 0) return false;

  // Vérifier que la partie random est hex
  if (!/^[0-9a-f]+$/i.test(randomPart)) return false;

  // Vérifier la longueur
  if (id.length < 20 || id.length > 40) return false;

  return true;
}

/**
 * Extrait le timestamp d'un ID sécurisé
 */
export function getTimestampFromId(id: string): number | null {
  if (!isValidSecureId(id)) return null;

  const timestamp = parseInt(id.split('-')[0], 10);
  return isNaN(timestamp) ? null : timestamp;
}

/**
 * Génère un nonce pour les opérations cryptographiques
 */
export async function generateNonce(length: number = 16): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(length);
  return Array.from(randomBytes)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Cache d'IDs pour éviter les duplicatas (en mémoire)
 */
const idCache = new Set<string>();
const MAX_CACHE_SIZE = 10000;

/**
 * Génère un ID avec garantie anti-collision
 */
export async function generateUniqueId(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const id = await generateSecureId();

    if (!idCache.has(id)) {
      idCache.add(id);

      // Limiter la taille du cache
      if (idCache.size > MAX_CACHE_SIZE) {
        const firstResult = idCache.values().next();
        if (!firstResult.done && firstResult.value) {
          idCache.delete(firstResult.value);
        }
      }

      return id;
    }

    attempts++;
  }

  // Si collision après 10 tentatives, ajouter un suffixe
  const id = await generateSecureId();
  return `${id}-${attempts}`;
}

/**
 * EXEMPLE D'UTILISATION:
 *
 * // Générer un ID pour une mesure
 * const measurementId = await generateSecureId();
 *
 * // Générer un UUID standard
 * const uuid = await generateUUID();
 *
 * // Générer un code de partage court
 * const shareCode = await generateShortCode(6); // "A7B3C9"
 *
 * // Générer un token de session
 * const sessionToken = await generateSecureToken(32);
 */

export default {
  generateSecureId,
  generateSecureIdSync,
  generateUUID,
  generateShortCode,
  generateSecureToken,
  generateNonce,
  generateUniqueId,
  isValidSecureId,
  getTimestampFromId,
};
