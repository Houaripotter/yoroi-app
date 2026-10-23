/**
 * Pictogramme de chaque famille de mesures sante (remplace l'ancien kanji de famille).
 */
import React from 'react';
import type { Family } from '@/lib/v2/sante/metrics';
import { SanteIcon } from './SanteIcon';
import type { SanteIconName } from './SanteIcon';

export const FAMILY_ICON: Record<Family, SanteIconName> = {
  activite: 'steps',
  energie: 'flame',
  coeur: 'heart',
  souffle: 'lungs',
  sommeil: 'moon',
  recuperation: 'battery',
  corps: 'body',
  mobilite: 'route',
  environnement: 'sun',
  nutrition: 'drop',
};

export function FamilyIcon({ family, size = 20, color }: { family: Family; size?: number; color: string }) {
  return <SanteIcon name={FAMILY_ICON[family] ?? 'spark'} size={size} color={color} width={2.2} />;
}
