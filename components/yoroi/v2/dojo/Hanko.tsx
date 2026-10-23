/**
 * Tampon hanko (vague 28) : un sceau ancien de la collection components/yoroi/v2/tampons,
 * a l'encre pressee et legerement incline. `tampon` choisit le motif ; sinon il est deduit de l'ancien
 * pictogramme. `color` teinte l'encre (indigo, or...) ; sans couleur, l'encre de la collection.
 */
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';
import type { GlyphKind } from '@/components/yoroi/v2/ornements/Glyph';

const RED = '#B0282E';

export type HankoProps = {
  /** accepte pour les anciens appels, plus affiche */
  kanji?: string;
  /** ancien pictogramme, sert a choisir le motif quand `tampon` est absent */
  glyph?: GlyphKind;
  tampon?: TamponId;
  color?: string;
  size?: number;
  /** false : tampon pas encore gagne, tres estompe */
  earned?: boolean;
  shape?: 'carre' | 'rond';
  /** inclinaison en degres */
  rotate?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

function fromGlyph(glyph: GlyphKind | undefined, red: boolean, shape: 'carre' | 'rond'): TamponId {
  if (glyph === 'eventail') return 'gunbai';
  if (glyph === 'sakura') return 'frein_rien';
  if (glyph === 'vague') return 'vague';
  if (glyph === 'laurier') return red ? 'record' : 'victoire';
  if (glyph === 'etoile') return 'record';
  return red ? 'record' : shape === 'rond' ? 'vague' : 'toro';
}

export function Hanko({ glyph, tampon, color, size = 56, earned = true, shape = 'carre', rotate = -5, style, accessibilityLabel }: HankoProps) {
  const red = !color || color.toUpperCase() === RED;
  const name = tampon ?? fromGlyph(glyph, red, shape);
  return <Tampon name={name} size={size} rotate={rotate} earned={earned} ink={red ? undefined : color} style={style} accessibilityLabel={accessibilityLabel ?? null} />;
}

export default Hanko;
