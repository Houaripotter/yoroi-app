/**
 * Tampon rouge des records (vague 28) : un vrai sceau ancien a l'encre pressee, tire de la collection
 * components/yoroi/v2/tampons. `tampon` choisit le motif (famille de record) ; par defaut la carpe koi.
 * Les anciennes props (color, filled, glyph, shape, border) sont acceptees pour les appels existants.
 */
import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';
import type { GlyphKind } from './Glyph';

export const SEAL_RED = '#B0282E';

export function RecordSeal({
  size = 44,
  rotate = -6,
  tampon = 'record',
  style,
  accessibilityLabel,
}: {
  size?: number;
  color?: string;
  rotate?: number;
  filled?: boolean;
  glyph?: GlyphKind;
  shape?: 'carre' | 'rond';
  border?: number;
  tampon?: TamponId;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return <Tampon name={tampon} size={size} rotate={rotate} style={style} accessibilityLabel={accessibilityLabel ?? null} />;
}

export default RecordSeal;
