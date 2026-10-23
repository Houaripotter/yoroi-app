/**
 * Compte a rebours en plaques : une plaque par jour jusqu'au combat.
 * Les jours deja faits sont laces de soie doree, aujourd'hui brille d'or, le jour J est une plaque indigo.
 */
import React from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '@/components/yoroi/v2/accueil/kit';
import { DayPlate } from './ui';

export function CountdownPlates({ daysLeft, elapsed = 0, max = 35, plate = 26 }: { daysLeft: number; elapsed?: number; max?: number; plate?: number }) {
  if (daysLeft < 0) return null;
  const future = Math.max(0, daysLeft - 1);
  const room = Math.max(0, max - 2);
  const shownPast = Math.min(elapsed, Math.max(0, room - Math.min(future, room)));
  const shownFuture = Math.min(future, room - shownPast);
  const hidden = future - shownFuture;
  const cells: ('past' | 'today' | 'future' | 'goal')[] = [];
  for (let i = 0; i < shownPast; i++) cells.push('past');
  if (daysLeft > 0) cells.push('today');
  for (let i = 0; i < shownFuture; i++) cells.push('future');
  cells.push('goal');
  return (
    <View accessible accessibilityLabel={daysLeft === 0 ? "C'est aujourd'hui" : `${daysLeft} jours avant le combat`} style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {cells.map((s, i) => (
          <DayPlate key={i} state={s} w={plate} />
        ))}
      </View>
      {hidden > 0 ? (
        <Ink size={12} weight="bold" color={P.muted}>
          {`Et encore ${hidden} plaques avant le jour J.`}
        </Ink>
      ) : null}
    </View>
  );
}
