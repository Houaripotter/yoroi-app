/**
 * Sports de la saisie de seance : type d'ecran, illustration, couleur de tuile, nom court.
 */
import type { ImageSourcePropType } from 'react-native';
import { getSportCategory, getSportName } from '@/lib/sports';
import type { SeanceKind } from './model';
import { pickSportArt } from './sportArt';
import { traduire } from '@/lib/i18n/tr';

const MUSCU_SPORTS = new Set([
  'musculation', 'powerlifting', 'halterophilie', 'street_workout', 'calisthenics', 'crossfit', 'kettlebell',
  'body_pump', 'functional_training', 'bootcamp', 'trx', 'core_training',
]);

/** Quel ecran ouvrir pour ce sport */
export function seanceKindFor(sport: string): SeanceKind {
  const cat = getSportCategory(sport);
  if (cat === 'combat_striking' || cat === 'combat_grappling') return 'combat';
  if (MUSCU_SPORTS.has(sport)) return 'muscu';
  return 'cardio';
}

export function seanceRoute(sport: string): string {
  const k = seanceKindFor(sport);
  return k === 'muscu' ? '/seance/muscu' : k === 'combat' ? '/seance/combat' : '/seance/cardio';
}

/**
 * Illustration du sport : la sienne, sinon celle de sa famille la plus proche, sinon une
 * icone dessinee (voir sportArt.ts et sportArtMap.ts). Ne renvoie jamais une case vide.
 * Le type garde | null pour les ecrans qui testaient l'absence d'image.
 */
export function sportImage(sport: string, femme: boolean, variant = 0): ImageSourcePropType | null {
  return pickSportArt(sport, femme, variant).source;
}

export { pickSportArt, hasSportIllustration } from './sportArt';

/** Couleur de fond des tuiles, accordee a la palette papier de riz */
export function sportTint(sport: string): string {
  const cat = getSportCategory(sport);
  if (sport === 'musculation' || sport === 'powerlifting' || sport === 'halterophilie') return '#E3E6EE';
  if (cat === 'combat_grappling') return '#E9E4D8';
  if (cat === 'combat_striking') return sport === 'mma' ? '#E6E4DD' : '#EEE1DF';
  if (cat === 'cardio') return '#E4EADB';
  if (cat === 'fitness') return '#ECE3E8';
  return '#E6E4DD';
}

const SHORT: Record<string, string> = {
  musculation: 'Muscu',
  jjb: 'JJB',
  boxe: 'Boxe',
  mma: 'MMA',
  running: 'Course',
  fitness: 'Fitness',
  crossfit: 'Crossfit',
  muay_thai: traduire('Muay thaï'),
  kickboxing: 'Kickboxing',
  judo: 'Judo',
  lutte: 'Lutte',
  grappling: 'Grappling',
  yoga: 'Yoga',
  hiit: 'HIIT',
  velo: 'Vélo',
  cycling: 'Cyclisme',
  natation: 'Natation',
  marche: 'Marche',
  rameur: 'Rameur',
  football: 'Foot',
  basketball: 'Basket',
  volleyball: 'Volley',
  street_workout: 'Street workout',
};

export function sportShortName(sport: string): string {
  return SHORT[sport] ?? getSportName(sport);
}

/** Sports proposes par defaut quand l'utilisateur n'a pas encore de favoris */
export const DEFAULT_SPORTS = ['musculation', 'jjb', 'boxe', 'mma', 'running', 'fitness'];

/** Sports ou la distance a du sens */
export function hasDistance(sport: string): boolean {
  const cat = getSportCategory(sport);
  if (cat === 'cardio' || cat === 'aquatique' || cat === 'nature' || cat === 'glisse') return true;
  return ['running', 'marathon', 'trail', 'velo', 'cycling', 'natation', 'marche', 'rameur', 'randonnee', 'vtt'].includes(sport);
}
