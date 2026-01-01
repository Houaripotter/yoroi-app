// ============================================
// 🔒 LOGGER SÉCURISÉ - YOROI
// ============================================
//
// Remplace tous les console.log() pour éviter l'exposition
// de données sensibles en production.

import { Platform } from 'react-native';

// Détection de l'environnement
const isDevelopment = __DEV__;
const isProduction = !__DEV__;

// Liste des données sensibles à ne JAMAIS logger
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /auth/i,
  /session/i,
  /cookie/i,
  /bearer/i,
  /jwt/i,
  /email/i,
  /phone/i,
  /credit[_-]?card/i,
  /ssn/i,
  /user[_-]?id/i,
  /weight/i,
  /body[_-]?fat/i,
  /measurement/i,
];

/**
 * Vérifie si un message contient des données sensibles
 */
function containsSensitiveData(message: string): boolean {
  const messageStr = String(message).toLowerCase();
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(messageStr));
}

/**
 * Masque les données sensibles dans un objet
 */
function sanitizeData(data: any): any {
  if (typeof data === 'string') {
    return containsSensitiveData(data) ? '[REDACTED]' : data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (containsSensitiveData(key)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * Format un timestamp pour les logs
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

/**
 * Logger sécurisé qui remplace console.log
 */
export const logger = {
  /**
   * Log de debug (uniquement en développement)
   */
  debug: (...args: any[]) => {
    if (!isDevelopment) return;

    const sanitized = args.map(sanitizeData);
    console.log(`[${getTimestamp()}] [DEBUG]`, ...sanitized);
  },

  /**
   * Log d'information
   */
  info: (...args: any[]) => {
    if (!isDevelopment) return;

    const sanitized = args.map(sanitizeData);
    console.log(`[${getTimestamp()}] [INFO]`, ...sanitized);
  },

  /**
   * Log de succès
   */
  success: (message: string, ...args: any[]) => {
    if (!isDevelopment) return;

    const sanitized = args.map(sanitizeData);
    console.log(`[${getTimestamp()}] ✅`, message, ...sanitized);
  },

  /**
   * Log d'avertissement (logged même en production, mais sanitizé)
   */
  warn: (message: string, ...args: any[]) => {
    const sanitized = args.map(sanitizeData);

    if (isDevelopment) {
      console.warn(`[${getTimestamp()}] ⚠️`, message, ...sanitized);
    } else {
      // En production, logger uniquement le message (pas les détails)
      console.warn(`[${getTimestamp()}] Warning:`, message);
    }
  },

  /**
   * Log d'erreur (toujours loggé, mais sanitizé)
   */
  error: (message: string, error?: any) => {
    if (isDevelopment) {
      console.error(`[${getTimestamp()}] ❌`, message, error);
    } else {
      // En production, logger uniquement le message d'erreur (pas le stack trace)
      const errorMessage = error?.message || String(error);
      console.error(`[${getTimestamp()}] Error:`, message, errorMessage);
    }
  },

  /**
   * Log de performance (uniquement en dev)
   */
  perf: (label: string, startTime: number) => {
    if (!isDevelopment) return;

    const duration = Date.now() - startTime;
    console.log(`[${getTimestamp()}] ⏱️ ${label}: ${duration}ms`);
  },

  /**
   * Log de groupe (uniquement en dev)
   */
  group: (label: string, fn: () => void) => {
    if (!isDevelopment) return;

    console.group(`[${getTimestamp()}] ${label}`);
    fn();
    console.groupEnd();
  },

  /**
   * Log de table (uniquement en dev)
   */
  table: (data: any) => {
    if (!isDevelopment) return;

    const sanitized = sanitizeData(data);
    console.table(sanitized);
  },
};

/**
 * ✅ EXEMPLE D'UTILISATION:
 *
 * // Au lieu de:
 * console.log('User data:', user);
 *
 * // Utiliser:
 * logger.info('User data loaded');
 * logger.debug('User details:', user); // Sera sanitizé automatiquement
 *
 * // Pour les erreurs:
 * logger.error('Failed to save data', error);
 *
 * // Pour les performances:
 * const start = Date.now();
 * // ... code ...
 * logger.perf('Data fetch', start);
 */

/**
 * Helper pour mesurer les performances
 */
export function measurePerformance<T>(
  label: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const start = Date.now();

  const result = fn();

  if (result instanceof Promise) {
    return result.finally(() => logger.perf(label, start));
  }

  logger.perf(label, start);
  return result;
}

/**
 * Configuration globale du logger
 */
export const loggerConfig = {
  enabled: isDevelopment,
  sanitize: true,
  maxLength: 1000, // Limite de caractères par log

  /**
   * Désactive complètement le logging (utile pour les tests)
   */
  disable: () => {
    Object.keys(logger).forEach(key => {
      (logger as any)[key] = () => {};
    });
  },
};

export default logger;
