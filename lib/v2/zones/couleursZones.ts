/**
 * Couleurs des 5 zones cardiaques : la seule source de toute l'app (28 octobre 2026).
 * Ecran Zones cardiaques, detail de seance, temps par zone, bilans, cartes a partager,
 * et l'echelle d'intensite commune (lib/v2/intensite.ts) qui en derive.
 *
 * Vives et franches, du calme vers l'intense : bleu ciel, menthe vif, jaune soleil,
 * orange corail, rose rouge vif. Pas de marron, pas de teinte terne.
 *
 * Verifie (contraste WCAG) :
 *  - texte sur blanc et sur son fond doux : 4,8 a 6 en clair, 7,5 a 10,7 en sombre (AA partout) ;
 *  - encre sur la couleur pleine (surFill) : 5 a 10,6 ;
 *  - la clarte baisse du jaune vers le rose : les zones chaudes restent distinctes.
 * Toujours un libelle (Z1, Recuperation...) a cote de la couleur.
 */

import { paletteSombre } from '@/components/yoroi/livePalette';

export type CouleurZone = {
  /** couleur pleine : barres, arcs, anneaux, points */
  plein: string;
  /** texte et icones lisibles sur fond clair (ou sur fond nuit en sombre) */
  texte: string;
  /** fond doux d'une pastille */
  doux: string;
  /** texte pose sur la couleur pleine */
  surPlein: string;
};

const ENCRE = '#1D2029';

export const ZONES_CLAIR: readonly CouleurZone[] = [
  { plein: '#4FA8FF', texte: '#1A63B8', doux: '#E3F1FF', surPlein: ENCRE },
  { plein: '#2ECC8F', texte: '#0B7550', doux: '#DCF7EB', surPlein: ENCRE },
  { plein: '#FFC93C', texte: '#835C00', doux: '#FFF3D1', surPlein: ENCRE },
  { plein: '#FF8A4C', texte: '#B23F0A', doux: '#FFE9DC', surPlein: ENCRE },
  { plein: '#FF4D6D', texte: '#C41E3D', doux: '#FFE2E7', surPlein: ENCRE },
];

export const ZONES_SOMBRE: readonly CouleurZone[] = [
  { plein: '#5AB0FF', texte: '#9CCCFF', doux: '#16263A', surPlein: ENCRE },
  { plein: '#3AD89A', texte: '#7FE5BC', doux: '#132D22', surPlein: ENCRE },
  { plein: '#FFCF4D', texte: '#FFDC80', doux: '#332A12', surPlein: ENCRE },
  { plein: '#FF9660', texte: '#FFB48A', doux: '#38231A', surPlein: ENCRE },
  { plein: '#FF5F7C', texte: '#FF97A9', doux: '#3B1B22', surPlein: ENCRE },
];

/** Les 5 couleurs pleines en clair, dans l'ordre Z1 a Z5 (valeur fixe, pour ce qui est stocke) */
export const ZONES_PLEIN: readonly string[] = ZONES_CLAIR.map((z) => z.plein);

/** Les 5 zones dans le mode d'affichage du moment (clair ou sombre) */
export function couleursZones(sombre: boolean = paletteSombre()): readonly CouleurZone[] {
  return sombre ? ZONES_SOMBRE : ZONES_CLAIR;
}

/** Une zone, numerotee de 1 a 5 (bornee) */
export function couleurZone(zone: number, sombre: boolean = paletteSombre()): CouleurZone {
  const i = Math.max(1, Math.min(5, Math.round(zone || 1))) - 1;
  return couleursZones(sombre)[i];
}
