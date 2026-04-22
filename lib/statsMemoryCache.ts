// ============================================
// STATS MEMORY CACHE
// Cache en mémoire (pas AsyncStorage) avec TTL pour éviter
// les reloads complets lors du switch d'onglet Stats.
// ============================================
//
// Pourquoi en mémoire et pas AsyncStorage ?
// - AsyncStorage est async → ça rend synchrones des opérations qui ne
//   devraient pas l'être
// - Les données sont valables pour la SESSION ; on veut qu'elles soient
//   "fraîches" au prochain démarrage
// - Memory Map est instantané (O(1))
//
// TTL par défaut : 3 minutes. Suffisamment long pour éviter les fetchs
// redondants pendant une navigation active, assez court pour refléter
// les changements sans être "coincé" sur de vieilles données.

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Construit une clé de cache stable depuis plusieurs arguments.
 * Ex: buildKey('dashboard', 'tout') → 'dashboard:tout'
 */
export const buildCacheKey = (...parts: (string | number | undefined)[]): string =>
  parts.filter(p => p !== undefined).map(p => String(p)).join(':');

/**
 * Récupère une entrée si elle est encore valide (pas expirée).
 * Retourne undefined sinon.
 */
export const getCached = <T>(key: string): T | undefined => {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > entry.ttl) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
};

/**
 * Stocke une entrée dans le cache. TTL optionnel.
 */
export const setCached = <T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void => {
  cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
};

/**
 * Invalide une clé spécifique (ex. après une écriture DB).
 */
export const invalidateCache = (key: string): void => {
  cache.delete(key);
};

/**
 * Invalide toutes les clés qui matchent un prefix.
 * Ex: invalidateCachePrefix('dashboard') → supprime 'dashboard:tout', 'dashboard:7j', etc.
 */
export const invalidateCachePrefix = (prefix: string): void => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};

/**
 * Vide complètement le cache (utile au logout, import massif, etc.).
 */
export const clearAllCache = (): void => {
  cache.clear();
};

/**
 * Stats de cache — utile pour debug en dev.
 */
export const getCacheStats = () => {
  const now = Date.now();
  let valid = 0;
  let expired = 0;
  for (const entry of cache.values()) {
    if (now - entry.timestamp > entry.ttl) expired++;
    else valid++;
  }
  return { total: cache.size, valid, expired };
};
