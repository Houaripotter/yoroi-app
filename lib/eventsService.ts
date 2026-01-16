/**
 * Events Service - Gestion des événements sportifs
 *
 * Ce service gère les événements de combat (JJB, Grappling) et d'endurance
 * (HYROX, Marathon, Running, Trail) provenant du scraper Yoroi Events.
 *
 * Sources: Smoothcomp, IBJJF, HYROX, Ahotu (1,873 événements mondiaux)
 */

import eventsData from '@/src/data/events.json';
import logger from '@/lib/security/logger';

// Types pour les événements
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
  category: 'combat' | 'endurance' | 'force';
  sport_tag: 'jjb' | 'grappling' | 'hyrox' | 'marathon' | 'running' | 'trail';
  registration_link: string;
  federation: string | null;
  image_logo_url: string | null;
}

export type SportTagFilter = 'all' | 'jjb' | 'grappling' | 'hyrox' | 'marathon' | 'running' | 'trail';
export type CategoryFilter = 'all' | 'combat' | 'endurance';

/**
 * Récupère tous les événements
 */
export function getAllEvents(): SportEvent[] {
  try {
    return eventsData as SportEvent[];
  } catch (error) {
    logger.error('Erreur chargement événements:', error);
    return [];
  }
}

/**
 * Récupère les événements filtrés par tag de sport
 */
export function getEventsBySportTag(sportTag: SportTagFilter): SportEvent[] {
  const events = getAllEvents();

  if (sportTag === 'all') {
    return events;
  }

  return events.filter(event => event.sport_tag === sportTag);
}

/**
 * Récupère les événements filtrés par catégorie
 */
export function getEventsByCategory(category: CategoryFilter): SportEvent[] {
  const events = getAllEvents();

  if (category === 'all') {
    return events;
  }

  return events.filter(event => event.category === category);
}

/**
 * Récupère les événements d'un pays spécifique
 */
export function getEventsByCountry(country: string): SportEvent[] {
  const events = getAllEvents();
  return events.filter(event =>
    event.location.country.toLowerCase() === country.toLowerCase()
  );
}

/**
 * Recherche d'événements par mots-clés (titre, ville, pays)
 */
export function searchEvents(query: string): SportEvent[] {
  const events = getAllEvents();
  const searchTerm = query.toLowerCase().trim();

  if (!searchTerm) {
    return events;
  }

  return events.filter(event =>
    event.title.toLowerCase().includes(searchTerm) ||
    event.location.city.toLowerCase().includes(searchTerm) ||
    event.location.country.toLowerCase().includes(searchTerm) ||
    (event.federation && event.federation.toLowerCase().includes(searchTerm))
  );
}

/**
 * Récupère les événements à venir (après aujourd'hui)
 */
export function getUpcomingEvents(): SportEvent[] {
  const events = getAllEvents();
  const today = new Date().toISOString().split('T')[0];

  return events.filter(event => event.date_start >= today);
}

/**
 * Récupère les événements passés
 */
export function getPastEvents(): SportEvent[] {
  const events = getAllEvents();
  const today = new Date().toISOString().split('T')[0];

  return events.filter(event => event.date_start < today);
}

/**
 * Récupère les événements dans une plage de dates
 */
export function getEventsByDateRange(startDate: string, endDate: string): SportEvent[] {
  const events = getAllEvents();

  return events.filter(event =>
    event.date_start >= startDate && event.date_start <= endDate
  );
}

/**
 * Récupère les événements par fédération
 */
export function getEventsByFederation(federation: string): SportEvent[] {
  const events = getAllEvents();

  return events.filter(event =>
    event.federation && event.federation.toLowerCase() === federation.toLowerCase()
  );
}

/**
 * Récupère les statistiques globales des événements
 */
export function getEventsStats() {
  const events = getAllEvents();

  // Compter par sport tag
  const bySportTag = {
    jjb: events.filter(e => e.sport_tag === 'jjb').length,
    grappling: events.filter(e => e.sport_tag === 'grappling').length,
    hyrox: events.filter(e => e.sport_tag === 'hyrox').length,
    marathon: events.filter(e => e.sport_tag === 'marathon').length,
    running: events.filter(e => e.sport_tag === 'running').length,
    trail: events.filter(e => e.sport_tag === 'trail').length,
  };

  // Compter par catégorie
  const byCategory = {
    combat: events.filter(e => e.category === 'combat').length,
    endurance: events.filter(e => e.category === 'endurance').length,
  };

  // Compter les pays uniques
  const countries = new Set(events.map(e => e.location.country));

  // Compter événements à venir vs passés
  const today = new Date().toISOString().split('T')[0];
  const upcoming = events.filter(e => e.date_start >= today).length;
  const past = events.filter(e => e.date_start < today).length;

  return {
    total: events.length,
    bySportTag,
    byCategory,
    countriesCount: countries.size,
    upcoming,
    past,
  };
}

/**
 * Récupère la liste unique des pays
 */
export function getAllCountries(): string[] {
  const events = getAllEvents();
  const countries = new Set(events.map(e => e.location.country));
  return Array.from(countries).sort();
}

/**
 * Récupère les événements par critères multiples
 */
export interface EventFilters {
  sportTag?: SportTagFilter;
  category?: CategoryFilter;
  country?: string;
  federation?: string;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
  upcomingOnly?: boolean;
}

export function getFilteredEvents(filters: EventFilters): SportEvent[] {
  let events = getAllEvents();

  // Filtre par sport tag
  if (filters.sportTag && filters.sportTag !== 'all') {
    events = events.filter(e => e.sport_tag === filters.sportTag);
  }

  // Filtre par catégorie
  if (filters.category && filters.category !== 'all') {
    events = events.filter(e => e.category === filters.category);
  }

  // Filtre par pays
  if (filters.country) {
    events = events.filter(e =>
      e.location.country.toLowerCase() === filters.country!.toLowerCase()
    );
  }

  // Filtre par fédération
  if (filters.federation) {
    events = events.filter(e =>
      e.federation && e.federation.toLowerCase() === filters.federation!.toLowerCase()
    );
  }

  // Filtre par recherche
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    events = events.filter(e =>
      e.title.toLowerCase().includes(query) ||
      e.location.city.toLowerCase().includes(query) ||
      e.location.country.toLowerCase().includes(query) ||
      (e.federation && e.federation.toLowerCase().includes(query))
    );
  }

  // Filtre par dates
  if (filters.dateFrom) {
    events = events.filter(e => e.date_start >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    events = events.filter(e => e.date_start <= filters.dateTo!);
  }

  // Filtre événements à venir seulement
  if (filters.upcomingOnly) {
    const today = new Date().toISOString().split('T')[0];
    events = events.filter(e => e.date_start >= today);
  }

  return events;
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
      all: 'Tous les sports',
    },
    en: {
      jjb: 'BJJ',
      grappling: 'Grappling',
      hyrox: 'HYROX',
      marathon: 'Marathon',
      running: 'Running',
      trail: 'Trail',
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
    jjb: '',
    grappling: '',
    hyrox: '',
    marathon: '',
    running: '',
    trail: '⛰️',
  };

  return emojis[sportTag] || '';
}

// Log des statistiques au chargement du service
logger.info('Events Service initialized');
const stats = getEventsStats();
logger.info(`Total events: ${stats.total}`);
logger.info(`Upcoming events: ${stats.upcoming}`);
logger.info(`Countries covered: ${stats.countriesCount}`);
