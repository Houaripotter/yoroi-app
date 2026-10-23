/**
 * Echelle d'intensite commune a toute l'app (vague 32) : charge d'entrainement, effort ressenti (RPE),
 * zones cardio, intensite des rounds, douleur, forme et recuperation. Une seule progression, du calme
 * vers l'intense, comme une temperature : bleu, vert, or, orange, braise. Jamais de rouge (reserve aux
 * records et aux erreurs), et toujours un libelle a cote de la couleur.
 *
 * Coherente avec les statuts de la courbe de poids : vert « Sur ta ligne » (#17704A sur #E2F3EA),
 * bleu « Au-dessus de ta ligne », orange « Plus vite que prevu » (#9A4A00 sur #FFEBD9).
 *
 * Verifie (scratchpad plan32/cvd.py, simulation de Machado 2009) :
 *  - la clarte baisse de l'or a la braise (71, 47, 28) : les trois niveaux chauds restent distincts en
 *    deuteranopie et protanopie, ou l'or et l'orange se confondraient sinon ;
 *  - texte sur sa teinte, sur blanc et sur le papier : contraste AA (4,5 et plus) pour les cinq niveaux ;
 *  - onFill : couleur du texte pose sur la couleur pleine, AA elle aussi.
 */

import { paletteSombre } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

export type NiveauIntensite = 1 | 2 | 3 | 4 | 5;

export type Intensite = {
  niveau: NiveauIntensite;
  id: 'calme' | 'leger' | 'soutenu' | 'intense' | 'maximal';
  /** nom generique du niveau, chaque ecran garde ses propres mots */
  nom: string;
  /** couleur pleine : barres, bandes, points, jauges */
  fill: string;
  /** texte et icones sur fond clair (blanc, papier, teinte) */
  text: string;
  /** fond clair d'une pastille */
  tint: string;
  /** texte pose sur fill */
  onFill: string;
};

export const INTENSITES: readonly Intensite[] = [
  { niveau: 1, id: 'calme', nom: traduire('Calme'), fill: '#5A8AD0', text: '#2D5A96', tint: '#E6EEF9', onFill: '#1D2029' },
  { niveau: 2, id: 'leger', nom: traduire('Léger'), fill: '#3A9A5B', text: '#17704A', tint: '#E2F3EA', onFill: '#1D2029' },
  { niveau: 3, id: 'soutenu', nom: 'Soutenu', fill: '#D6A630', text: '#7A5A06', tint: '#F7EED3', onFill: '#1D2029' },
  { niveau: 4, id: 'intense', nom: traduire('Intense'), fill: '#B84F08', text: '#9A4A00', tint: '#FFEBD9', onFill: '#FFFFFF' },
  { niveau: 5, id: 'maximal', nom: 'Maximal', fill: '#74290A', text: '#74290A', tint: '#F4E2D8', onFill: '#FFFFFF' },
];

/** Audit 43 : en sombre, le texte s'eclaircit et la pastille fonce (memes teintes, lisibles sur l'encre de nuit) */
const NUIT: readonly { text: string; tint: string }[] = [
  { text: '#8FB0E6', tint: '#1E2537' },
  { text: '#6CC48A', tint: '#1C2A22' },
  { text: '#E3C065', tint: '#2F2A1C' },
  { text: '#F0965A', tint: '#33241A' },
  { text: '#E58B6C', tint: '#33201B' },
];

export function intensite(niveau: number): Intensite {
  const n = Math.max(1, Math.min(5, Math.round(niveau || 1)));
  const base = INTENSITES[n - 1];
  return paletteSombre() ? { ...base, ...NUIT[n - 1] } : base;
}

/** Effort ressenti sur 10 : 1-2 calme, 3-4 leger, 5-6 soutenu, 7-8 intense, 9-10 maximal */
export function niveauRpe(rpe: number): NiveauIntensite {
  return Math.max(1, Math.min(5, Math.ceil((rpe || 1) / 2))) as NiveauIntensite;
}

/** Douleur sur 10 (EVA) : jamais « calme » ; legere en or, moderee en orange, severe en braise */
export function niveauDouleur(eva: number): NiveauIntensite {
  return eva >= 7 ? 5 : eva >= 4 ? 4 : 3;
}

/**
 * Forme et recuperation (plus c'est haut, mieux c'est) : la meme palette lue a l'envers.
 * Bonne forme en vert, moyenne en or, basse en orange, tres basse en braise.
 */
export function niveauForme(score: number): NiveauIntensite {
  return score >= 65 ? 2 : score >= 50 ? 3 : score >= 35 ? 4 : 5;
}
