/**
 * Hauteur de la poulie (30 octobre 2026). Un numero de cran ne se deduit pas de ta taille : chaque machine a
 * son echelle. On donne donc un repere par rapport au corps, seulement pour les exercices a la poulie dont la
 * position est standard et sure. Exercice ambigu (la hauteur depend de la variante ou de l'appareil) : rien.
 * Table ecrite a la main, noms exacts de constants/exerciseLibrary.ts.
 */
import { sansPrise } from '@/lib/v2/seance/prise';

export type HauteurPoulie = 'basse' | 'hanche' | 'poitrine' | 'epaule' | 'visage' | 'haute';

export const HAUTEURS_POULIE: Record<string, HauteurPoulie> = {
  // triceps : poussee vers le bas, poulie en haut
  'Extension Triceps Poulie (Corde)': 'haute',
  'Extension Triceps Poulie (Barre)': 'haute',
  'Extension Triceps Poulie (V-Bar)': 'haute',
  // tirage visage
  'Face Pull': 'visage',
  'Facepull Poulie': 'visage',
  // biceps
  'Curl Poulie Basse': 'basse',
  'Cable Curl': 'basse',
  'Curl Poulie Haute (Spider)': 'haute',
  // ecartes : la variante est dans le nom
  'Écartés à la Poulie Haute': 'haute',
  'Écartés à la Poulie Basse': 'basse',
  // tirage horizontal
  'Tirage Horizontal (Seated Row)': 'poitrine',
  'Tirage Horizontal Unilatéral': 'poitrine',
  // dos, bras tendus
  'Pull Over Poulie Haute': 'haute',
  'Straight Arm Pulldown': 'haute',
  // epaules
  'Élévations Latérales (Poulie)': 'basse',
  'Cable Lateral Raise': 'basse',
  'Oiseau Poulie Basse': 'basse',
  // abdos
  'Crunch Poulie Haute': 'haute',
  'Cable Crunch': 'haute',
  'Pallof Press': 'poitrine',
  // fessiers : sangle a la cheville
  'Kick-back Poulie': 'basse',
  'Cable Kickback': 'basse',
};

const LIBELLES: Record<HauteurPoulie, string> = {
  basse: 'Poulie basse, au sol',
  hanche: 'Poulie à hauteur de hanche',
  poitrine: 'Poulie à hauteur de poitrine',
  epaule: 'Poulie à hauteur d’épaule',
  visage: 'Poulie à hauteur du visage',
  haute: 'Poulie haute, au-dessus de la tête',
};

/** La hauteur de poulie de cet exercice (la prise ne change rien), ou null */
export function hauteurPoulie(nom: string): HauteurPoulie | null {
  return HAUTEURS_POULIE[sansPrise(nom ?? '').base] ?? null;
}

/** Le texte en francais, a passer par traduire() a l'affichage ; null sans repere sur */
export function libelleHauteurPoulie(nom: string): string | null {
  const h = hauteurPoulie(nom);
  return h ? LIBELLES[h] : null;
}
