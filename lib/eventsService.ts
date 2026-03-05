/**
 * Events Service - Gestion optimisée des événements sportifs
 *
 * Ce service gère les événements de combat (JJB, Grappling) et d'endurance
 * (HYROX, Marathon, Running, Trail) avec SQLite + Cache en mémoire.
 *
 * Sources: Smoothcomp, IBJJF, HYROX, Ahotu
 *
 * Optimisations :
 * - Stockage SQLite (au lieu de 773KB de JSON en mémoire)
 * - Cache en mémoire pour les requêtes fréquentes
 * - Indexes SQL pour recherche rapide
 * - Lazy loading des données
 */

import { openDatabase } from './database';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

export interface EventLocation {
  city: string;
  country: string;
  full_address: string;
}

export interface SportEvent {
  id: string;
  title: string;
  date_start: string; // ISO date (YYYY-MM-DD)
  location: EventLocation;
  category: 'combat' | 'endurance' | 'force' | 'nature' | 'autre';
  sport_tag: 'jjb' | 'grappling' | 'hyrox' | 'marathon' | 'running' | 'trail' | 'climbing' | 'fitness' | 'powerlifting' | 'crossfit' | 'triathlon' | 'obstacle' | 'judo' | 'cycling';
  registration_link: string;
  federation: string | null;
  image_logo_url: string | null;
}

export type SportTagFilter = 'all' | 'jjb' | 'grappling' | 'hyrox' | 'marathon' | 'running' | 'trail' | 'climbing' | 'fitness' | 'powerlifting' | 'crossfit' | 'triathlon' | 'obstacle' | 'judo' | 'cycling';
export type CategoryFilter = 'all' | 'combat' | 'endurance' | 'force' | 'nature' | 'autre';

export interface EventFilters {
  sportTag?: SportTagFilter;
  category?: CategoryFilter;
  country?: string;
  federation?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  upcomingOnly?: boolean;
  limit?: number;
}

// ============================================
// CACHE EN MÉMOIRE
// ============================================

interface CacheEntry {
  data: SportEvent[];
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

function getCacheKey(filters: EventFilters): string {
  return JSON.stringify(filters);
}

function getFromCache(key: string): SportEvent[] | null {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

function setCache(key: string, data: SportEvent[]): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function clearCache(): void {
  cache.clear();
}

// ============================================
// INITIALISATION DES DONNÉES
// ============================================

let isInitialized = false;
// Version des donnees events - incrementer pour forcer un reimport
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const EVENTS_DATA_VERSION = 5;

/**
 * Importe les evenements depuis le fichier JSON vers SQLite
 * Utilise un systeme de versioning pour forcer le reimport quand les donnees changent
 */
export async function importEventsFromJSON(): Promise<void> {
  try {
    const db = await openDatabase();

    // Table de metadata pour le versioning
    await db.runAsync('CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY, value TEXT)');

    // Verifier la version des donnees
    let needsImport = false;
    try {
      const versionRow = await db.getFirstAsync<{ value: string }>(
        'SELECT value FROM app_metadata WHERE key = \'events_data_version\''
      );
      const currentVersion = versionRow ? parseInt(versionRow.value, 10) : 0;
      if (currentVersion < EVENTS_DATA_VERSION) {
        needsImport = true;
        logger.info('Events version ' + currentVersion + ' < ' + EVENTS_DATA_VERSION + ', reimport needed');
      }
    } catch {
      needsImport = true;
    }

    if (!needsImport) {
      const count = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM events_catalog'
      );
      if (count && count.count > 0) {
        logger.info('Events deja importes: ' + count.count + ' evenements (v' + EVENTS_DATA_VERSION + ')');
        isInitialized = true;
        return;
      }
      needsImport = true;
    }

    // Supprimer les anciennes donnees avant reimport
    await db.runAsync('DELETE FROM events_catalog');

    logger.info('Import des evenements depuis JSON...');
    const europeData = require('@/src/data/events/europe.json');
    const franceData = require('@/src/data/events/france.json');
    const mondeData = require('@/src/data/events/monde.json');
    const eventsData = [...europeData, ...franceData, ...mondeData];
    logger.info(`Total événements à importer: ${eventsData.length} (Europe: ${europeData.length}, France: ${franceData.length}, Monde: ${mondeData.length})`);

    // Insertion par batch pour meilleures performances
    const BATCH_SIZE = 100;
    let imported = 0;

    for (let i = 0; i < eventsData.length; i += BATCH_SIZE) {
      const batch = eventsData.slice(i, i + BATCH_SIZE);

      await db.withTransactionAsync(async () => {
        for (const event of batch) {
          await db.runAsync(
            `INSERT OR IGNORE INTO events_catalog
             (id, title, date_start, city, country, full_address, category, sport_tag, registration_link, federation, image_logo_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              event.id,
              event.title,
              event.date_start,
              event.location?.city || '',
              event.location?.country || '',
              event.location?.full_address || '',
              event.category,
              event.sport_tag,
              event.registration_link || '',
              event.federation || null,
              event.image_logo_url || null
            ]
          );
        }
      });

      imported += batch.length;
      logger.info(`Importé ${imported}/${eventsData.length} événements`);
    }

    // Sauvegarder la version apres import reussi
    await db.runAsync(
      'INSERT OR REPLACE INTO app_metadata (key, value) VALUES (\'events_data_version\', ?)',
      [String(EVENTS_DATA_VERSION)]
    );

    logger.info('Import termine: ' + imported + ' evenements dans SQLite (v' + EVENTS_DATA_VERSION + ')');
    isInitialized = true;
    clearCache();
  } catch (error) {
    logger.error('Erreur import events:', error);
    logger.error('Erreur import events:', error);
    throw error;
  }
}

/**
 * Assure que les données sont initialisées
 */
async function ensureInitialized(): Promise<void> {
  if (!isInitialized) {
    try {
      // Vérifier que la table existe
      const db = await openDatabase();
      const tableExists = await db.getFirstAsync<{ count: number }>(
        `SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='events_catalog'`
      );

      if (!tableExists || tableExists.count === 0) {
        logger.warn('Table events_catalog manquante - les événements ne seront pas disponibles');
        // Marquer comme initialisé pour éviter de réessayer à chaque fois
        isInitialized = true;
        return;
      }

      // Vérifier si des événements sont déjà importés
      const count = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM events_catalog'
      );

      if (!count || count.count === 0) {
        logger.info('Import des événements...');
        await importEventsFromJSON();
      } else {
        logger.info(`Events déjà importés: ${count.count} événements`);
        isInitialized = true;
      }
    } catch (error) {
      logger.error('Erreur ensureInitialized:', error);
      // Marquer comme initialisé pour éviter de réessayer
      isInitialized = true;
      // Ne pas throw pour éviter de crasher l'app
      // Les fonctions appelantes retourneront un tableau vide
    }
  }
}

// ============================================
// REQUÊTES OPTIMISÉES
// ============================================

/**
 * Récupère tous les événements (avec limite optionnelle)
 */
export async function getAllEvents(limit?: number): Promise<SportEvent[]> {
  try {
    await ensureInitialized();

    const cacheKey = `all_${limit || 'unlimited'}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const db = await openDatabase();
    const query = limit
      ? `SELECT * FROM events_catalog ORDER BY date_start ASC LIMIT ?`
      : `SELECT * FROM events_catalog ORDER BY date_start ASC`;

    const rows = await db.getAllAsync<any>(query, limit ? [limit] : []);
    const events = rows.map(mapRowToEvent);

    setCache(cacheKey, events);
    return events;
  } catch (error) {
    logger.error('Erreur getAllEvents:', error);
    return [];
  }
}

/**
 * Récupère les événements avec filtres multiples
 */
export async function getFilteredEvents(filters: EventFilters): Promise<SportEvent[]> {
  try {
    await ensureInitialized();

    const cacheKey = getCacheKey(filters);
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    const db = await openDatabase();
    const conditions: string[] = [];
    const params: any[] = [];

    // Filtre par sport tag
    if (filters.sportTag && filters.sportTag !== 'all') {
      conditions.push('sport_tag = ?');
      params.push(filters.sportTag);
    }

    // Filtre par catégorie
    if (filters.category && filters.category !== 'all') {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    // Filtre par pays
    if (filters.country) {
      conditions.push('LOWER(country) = LOWER(?)');
      params.push(filters.country);
    }

    // Filtre par fédération
    if (filters.federation) {
      conditions.push('LOWER(federation) = LOWER(?)');
      params.push(filters.federation);
    }

    // Recherche par mots-clés
    if (filters.searchQuery) {
      conditions.push('(LOWER(title) LIKE ? OR LOWER(city) LIKE ? OR LOWER(country) LIKE ? OR LOWER(federation) LIKE ?)');
      const searchTerm = `%${filters.searchQuery.toLowerCase()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Filtre par dates
    if (filters.dateFrom) {
      conditions.push('date_start >= ?');
      params.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push('date_start <= ?');
      params.push(filters.dateTo);
    }

    // Événements à venir seulement
    if (filters.upcomingOnly) {
      const today = new Date().toISOString().split('T')[0];
      conditions.push('date_start >= ?');
      params.push(today);
    }

    // Construire la requête
    let query = 'SELECT * FROM events_catalog';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY date_start ASC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = await db.getAllAsync<any>(query, params);
    const events = rows.map(mapRowToEvent);

    setCache(cacheKey, events);
    return events;
  } catch (error) {
    logger.error('Erreur getFilteredEvents:', error);
    return [];
  }
}

/**
 * Récupère les événements à venir
 */
export async function getUpcomingEvents(limit: number = 100): Promise<SportEvent[]> {
  return getFilteredEvents({ upcomingOnly: true, limit });
}

/**
 * Récupère les événements passés
 */
export async function getPastEvents(limit: number = 100): Promise<SportEvent[]> {
  const today = new Date().toISOString().split('T')[0];
  return getFilteredEvents({ dateTo: today, limit });
}

/**
 * Récupère les événements par tag de sport
 */
export async function getEventsBySportTag(sportTag: SportTagFilter, limit?: number): Promise<SportEvent[]> {
  return getFilteredEvents({ sportTag, limit });
}

/**
 * Récupère les événements par catégorie
 */
export async function getEventsByCategory(category: CategoryFilter, limit?: number): Promise<SportEvent[]> {
  return getFilteredEvents({ category, limit });
}

/**
 * Récupère les événements par pays
 */
export async function getEventsByCountry(country: string, limit?: number): Promise<SportEvent[]> {
  return getFilteredEvents({ country, limit });
}

/**
 * Recherche d'événements
 */
export async function searchEvents(query: string, limit?: number): Promise<SportEvent[]> {
  return getFilteredEvents({ searchQuery: query, limit });
}

/**
 * Récupère les événements dans une plage de dates
 */
export async function getEventsByDateRange(startDate: string, endDate: string, limit?: number): Promise<SportEvent[]> {
  return getFilteredEvents({ dateFrom: startDate, dateTo: endDate, limit });
}

// ============================================
// STATISTIQUES
// ============================================

export interface EventsStats {
  total: number;
  bySportTag: Record<string, number>;
  byCategory: Record<string, number>;
  countriesCount: number;
  upcoming: number;
  past: number;
}

/**
 * Récupère les statistiques globales
 */
export async function getEventsStats(): Promise<EventsStats> {
  try {
    await ensureInitialized();

    const cached = getFromCache('stats');
    if (cached && cached.length > 0) {
      return cached[0] as any;
    }

    const db = await openDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Total
    const totalResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM events_catalog');
    const total = totalResult?.count || 0;

    // Par sport tag
    const sportTagResults = await db.getAllAsync<{ sport_tag: string; count: number }>(
      'SELECT sport_tag, COUNT(*) as count FROM events_catalog GROUP BY sport_tag'
    );
    const bySportTag: Record<string, number> = {};
    sportTagResults.forEach(r => { bySportTag[r.sport_tag] = r.count; });

    // Par catégorie
    const categoryResults = await db.getAllAsync<{ category: string; count: number }>(
      'SELECT category, COUNT(*) as count FROM events_catalog GROUP BY category'
    );
    const byCategory: Record<string, number> = {};
    categoryResults.forEach(r => { byCategory[r.category] = r.count; });

    // Pays uniques
    const countriesResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(DISTINCT country) as count FROM events_catalog'
    );
    const countriesCount = countriesResult?.count || 0;

    // À venir vs passés
    const upcomingResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM events_catalog WHERE date_start >= ?',
      [today]
    );
    const upcoming = upcomingResult?.count || 0;

    const pastResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM events_catalog WHERE date_start < ?',
      [today]
    );
    const past = pastResult?.count || 0;

    const stats: EventsStats = {
      total,
      bySportTag,
      byCategory,
      countriesCount,
      upcoming,
      past
    };

    setCache('stats', [stats as any]);
    return stats;
  } catch (error) {
    logger.error('Erreur getEventsStats:', error);
    return {
      total: 0,
      bySportTag: {},
      byCategory: {},
      countriesCount: 0,
      upcoming: 0,
      past: 0
    };
  }
}

/**
 * Récupère la liste des pays
 */
export async function getAllCountries(): Promise<string[]> {
  try {
    await ensureInitialized();

    const cached = getFromCache('countries');
    if (cached && cached.length > 0) {
      return cached[0] as any;
    }

    const db = await openDatabase();
    const results = await db.getAllAsync<{ country: string }>(
      'SELECT DISTINCT country FROM events_catalog WHERE country IS NOT NULL AND country != "" ORDER BY country ASC'
    );

    const countries = results.map(r => r.country);
    setCache('countries', [countries as any]);
    return countries;
  } catch (error) {
    logger.error('Erreur getAllCountries:', error);
    return [];
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Convertit une ligne SQL en objet SportEvent
 */
function mapRowToEvent(row: any): SportEvent {
  return {
    id: row.id,
    title: row.title,
    date_start: row.date_start,
    location: {
      city: row.city || '',
      country: row.country || '',
      full_address: row.full_address || ''
    },
    category: row.category,
    sport_tag: row.sport_tag,
    registration_link: row.registration_link || '',
    federation: row.federation,
    image_logo_url: row.image_logo_url
  };
}

/**
 * Formate une date ISO en format lisible
 */
export function formatEventDate(dateString: string, locale: string = 'fr-FR'): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Retourne le label traduit pour un sport tag
 */
export function getSportTagLabel(sportTag: string, locale: string = 'fr'): string {
  const labels: Record<string, Record<string, string>> = {
    fr: {
      jjb: 'JJB',
      grappling: 'Grappling',
      hyrox: 'HYROX',
      marathon: 'Marathon',
      running: 'Course à pied',
      trail: 'Trail',
      climbing: 'Escalade',
      fitness: 'Fitness',
      powerlifting: 'Powerlifting',
      crossfit: 'CrossFit',
      triathlon: 'Triathlon',
      obstacle: 'Course à obstacles',
      judo: 'Judo',
      cycling: 'Cyclisme',
      all: 'Tous les sports',
    },
    en: {
      jjb: 'BJJ',
      grappling: 'Grappling',
      hyrox: 'HYROX',
      marathon: 'Marathon',
      running: 'Running',
      trail: 'Trail',
      climbing: 'Climbing',
      fitness: 'Fitness',
      powerlifting: 'Powerlifting',
      crossfit: 'CrossFit',
      triathlon: 'Triathlon',
      obstacle: 'Obstacle Course',
      judo: 'Judo',
      cycling: 'Cycling',
      all: 'All sports',
    },
  };

  return labels[locale]?.[sportTag] || sportTag;
}

/**
 * Retourne l'emoji pour un sport tag
 */
export function getSportTagEmoji(sportTag: string): string {
  const emojis: Record<string, string> = {
    jjb: '🥋',
    grappling: '🤼',
    hyrox: '⚙️',
    marathon: '🏁',
    running: '🏃',
    trail: '⛰️',
    climbing: '🧗',
    fitness: '💪',
    powerlifting: '🏋️',
    crossfit: '🔥',
    triathlon: '🏊',
    obstacle: '🏅',
    judo: '🥋',
    cycling: '🚴',
  };

  return emojis[sportTag] || '';
}

// ============================================
// LEGACY COMPATIBILITY (deprecated)
// ============================================

/**
 * @deprecated Utiliser getFilteredEvents() à la place
 */
export async function getEventsByFederation(federation: string): Promise<SportEvent[]> {
  return getFilteredEvents({ federation });
}

// ============================================
// FORCE REIMPORT (pour mise à jour des données)
// ============================================

/**
 * Force la réimportation des événements depuis les fichiers JSON
 * Supprime toutes les anciennes données et reimporte
 */
export async function forceReimportEvents(): Promise<void> {
  try {
    logger.info('FORCE REIMPORT: Début de la réimportation des événements...');
    const db = await openDatabase();

    // Vérifier que la table existe avant de tenter le DELETE
    const tableExists = await db.getFirstAsync<{ count: number }>(
      `SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='events_catalog'`
    );

    if (tableExists && tableExists.count > 0) {
      // Supprimer toutes les anciennes données
      await db.runAsync('DELETE FROM events_catalog');
      logger.info('Anciennes données événements supprimées');
      logger.info('Anciennes données événements supprimées');
    } else {
      logger.warn('Table events_catalog inexistante, skip DELETE');
    }

    // Réinitialiser le flag
    isInitialized = false;

    // Vider le cache
    clearCache();

    // Réimporter les nouvelles données
    await importEventsFromJSON();

    logger.info('Réimportation des événements terminée');
  } catch (error) {
    logger.error('Erreur forceReimportEvents:', error);
    throw error;
  }
}

// Log au chargement
logger.info('Events Service initialized (SQLite mode)');
