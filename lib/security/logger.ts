// ============================================
// YOROI - SECURE LOGGER
// ============================================
// Protection contre la fuite de données via les logs système
// ============================================

const IS_DEV = __DEV__;

/**
 * Filtre les données sensibles avant de les logger
 */
const sanitize = (data: any): any => {
  if (!data) return data;
  if (typeof data !== 'object') return data;

  const sensitiveKeys = ['weight', 'fat_percent', 'muscle_percent', 'uri', 'email', 'name', 'token', 'password', 'injury', 'pain', 'medication', 'treatment', 'notes', 'note', 'date_of_birth', 'body_fat', 'muscle_mass', 'water', 'bone_mass', 'visceral_fat', 'metabolic_age', 'bmr', 'bmi'];
  const sanitized = { ...data };

  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key]);
    }
  });

  return sanitized;
};

/**
 * Journal local du Studio : les 50 derniers messages (le texte seul, jamais les objets ni les
 * donnees), en memoire, sur ce telephone. Rien n'est envoye nulle part.
 */
export type LocalLogEntry = { at: number; level: 'info' | 'warn' | 'error'; message: string };
const RING_MAX = 50;
const ring: LocalLogEntry[] = [];
const keep = (level: LocalLogEntry['level'], message: unknown) => {
  try {
    ring.push({ at: Date.now(), level, message: String(message).slice(0, 300) });
    if (ring.length > RING_MAX) ring.splice(0, ring.length - RING_MAX);
  } catch {
    // jamais bloquer pour un journal
  }
};

/** Les derniers messages, du plus recent au plus ancien */
export function getRecentLogs(): LocalLogEntry[] {
  return [...ring].reverse();
}

export function clearRecentLogs(): void {
  ring.length = 0;
}

export const logger = {
  info: (message: string, ...args: any[]) => {
    keep('info', message);
    if (IS_DEV) {
      console.log(`[INFO] ${message}`, ...args.map(sanitize));
    }
  },
  warn: (message: string, ...args: any[]) => {
    keep('warn', message);
    if (IS_DEV) {
      console.warn(`[WARN] ${message}`, ...args.map(sanitize));
    }
  },
  error: (message: string, ...args: any[]) => {
    keep('error', message);
    // En prod, on log uniquement le message, jamais l'objet d'erreur complet (qui peut contenir des chemins serveurs ou données)
    if (IS_DEV) {
      console.error(`[ERROR] ${message}`, ...args);
    } else {
      // Ici, on pourrait envoyer l'erreur anonymisée à un service type Sentry
    }
  }
};

export default logger;