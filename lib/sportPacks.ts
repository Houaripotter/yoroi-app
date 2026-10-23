// ============================================
// SPORT PACKS : mapping des sports vers des packs d'onglets
// ============================================
import { traduire } from '@/lib/i18n/tr';

export type SportPack = 'combat' | 'endurance' | 'force' | 'musculation' | 'nature' | 'all';

// Mapping sport key → pack
export const SPORT_TO_PACK: Record<string, SportPack> = {
  // Combat
  jjb: 'combat',
  grappling: 'combat',
  mma: 'combat',
  boxe: 'combat',
  boxing: 'combat',
  muay_thai: 'combat',
  judo: 'combat',
  karate: 'combat',
  kickboxing: 'combat',
  lutte: 'combat',
  wrestling: 'combat',

  // Endurance
  running: 'endurance',
  marathon: 'endurance',
  trail: 'endurance',
  triathlon: 'endurance',
  cycling: 'endurance',
  velo: 'endurance',
  natation: 'endurance',
  swim: 'endurance',
  obstacle: 'endurance',
  ocr: 'endurance',

  // Force compétition (Hyrox / CrossFit / Powerlifting / Strongman)
  hyrox: 'force',
  crossfit: 'force',
  powerlifting: 'force',
  strongman: 'force',
  // Musculation pure (hypertrophie, bodybuilding, fitness classique)
  musculation: 'musculation',
  bodybuilding: 'musculation',
  fitness: 'musculation',

  // Nature
  climbing: 'nature',
  escalade: 'nature',
  skiing: 'nature',
  ski: 'nature',
};

export interface PackMeta {
  key: SportPack;
  label: string;
  emoji: string; // utilisé ponctuellement, peut être remplacé par icône
  description: string;
  color: string;
  primarySport: string;
}

export const PACK_META: Record<SportPack, PackMeta> = {
  combat: {
    key: 'combat',
    label: traduire('Combat'),
    emoji: '',
    description: traduire('JJB, MMA, Boxe, Grappling'),
    color: '#DC2626',
    primarySport: 'jjb',
  },
  endurance: {
    key: 'endurance',
    label: 'Endurance',
    emoji: '',
    description: traduire('Running, Marathon, Trail, Triathlon'),
    color: '#10B981',
    primarySport: 'running',
  },
  force: {
    key: 'force',
    label: 'Force',
    emoji: '',
    description: traduire('Hyrox, CrossFit, Powerlifting, Strongman'),
    color: '#F59E0B',
    primarySport: 'hyrox',
  },
  musculation: {
    key: 'musculation',
    label: traduire('Muscu'),
    emoji: '',
    description: traduire('Musculation, Bodybuilding, Fitness'),
    color: '#EC4899',
    primarySport: 'musculation',
  },
  nature: {
    key: 'nature',
    label: traduire('Nature'),
    emoji: '',
    description: traduire('Escalade, ski, extérieur'),
    color: '#8B5CF6',
    primarySport: 'climbing',
  },
  all: {
    key: 'all',
    label: traduire('Tous'),
    emoji: '',
    description: traduire('Tous sports mélangés'),
    color: '#6B7280',
    primarySport: '',
  },
};

/** Pack déduit d'un sport key */
export function packForSport(sport: string | null | undefined): SportPack {
  if (!sport) return 'combat';
  return SPORT_TO_PACK[sport.toLowerCase()] ?? 'combat';
}

/** Liste des sports appartenant à un pack */
export function sportsInPack(pack: SportPack): string[] {
  return Object.entries(SPORT_TO_PACK)
    .filter(([_, p]) => p === pack)
    .map(([s]) => s);
}

/** Détecte les packs "actifs" d'un user en scannant ses trainings */
export function packsFromTrainings(trainings: { sport: string }[]): SportPack[] {
  const packs = new Set<SportPack>();
  for (const t of trainings) {
    const p = packForSport(t.sport);
    packs.add(p);
  }
  return Array.from(packs);
}
