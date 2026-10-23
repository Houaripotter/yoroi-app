/**
 * Partie Combat du carnet (vague 16), visible seulement si tu pratiques un sport de combat.
 * Un seul niveau de choix : sparring, competitions (combats et palmares), positions, soumissions.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { FilterChips } from './nav';
import { SparringView } from './tabs/SparringView';
import { CompetitionsView } from './tabs/CompetitionsView';
import { PositionsView } from './tabs/PositionsView';
import { SoumissionsView } from './tabs/SoumissionsView';
import { traduire } from '@/lib/i18n/tr';

export type CombatPart = 'sparring' | 'competitions' | 'positions' | 'soumissions';

const PARTS: { key: CombatPart; label: string }[] = [
  { key: 'sparring', label: 'Sparring' },
  { key: 'competitions', label: traduire('Compétitions') },
  { key: 'positions', label: traduire('Positions') },
  { key: 'soumissions', label: traduire('Soumissions') },
];

export function CombatSection({ refreshKey, initial = 'sparring' }: { refreshKey: number; initial?: CombatPart }) {
  const [part, setPart] = useState<CombatPart>(initial);
  useEffect(() => setPart(initial), [initial]);
  return (
    <View style={{ gap: 14 }}>
      <FilterChips items={PARTS} value={part} onChange={setPart} />
      {part === 'sparring' ? <SparringView refreshKey={refreshKey} /> : null}
      {part === 'competitions' ? <CompetitionsView refreshKey={refreshKey} /> : null}
      {part === 'positions' ? <PositionsView refreshKey={refreshKey} /> : null}
      {part === 'soumissions' ? <SoumissionsView refreshKey={refreshKey} /> : null}
    </View>
  );
}
