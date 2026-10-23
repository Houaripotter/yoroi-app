/**
 * Tampon de seance (vague 28) : le sceau rouge des records, ou celui de la victoire quand l'encre demandee
 * n'est pas le rouge des records (ancien tampon dore des matchs gagnes). Il se pose en apposition courte.
 */
import React from 'react';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';
import { traduire } from '@/lib/i18n/tr';

const RED = '#B0282E';

export function Hanko({ size = 30, color, animate = false, rotate = -8, tampon }: { size?: number; color?: string; animate?: boolean; rotate?: number; tampon?: TamponId }) {
  const name: TamponId = tampon ?? (color && color.toUpperCase() !== RED ? 'victoire' : 'record');
  return <Tampon name={name} size={size} rotate={rotate} animate={animate} accessibilityLabel={name === 'victoire' ? traduire('Victoire') : traduire('Nouveau record')} />;
}
