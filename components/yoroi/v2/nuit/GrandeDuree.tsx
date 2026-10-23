/** La duree en tres grand : chiffres pleins, unites plus petites et plus claires (7 h 42, 43 min) */
import React from 'react';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

export function GrandeDuree({ min, size = 68 }: { min: number; size?: number }) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  const unite = (u: string) => (
    <Ink size={Math.round(size * 0.38)} weight="extraBold" color={P.muted}>
      {u}
    </Ink>
  );
  return (
    <Ink size={size} weight="black" tight accessibilityLabel={h > 0 ? traduire("{0} heures {1} minutes", h, m) : traduire("{0} minutes", m)}>
      {h > 0 ? String(h) : String(m)}
      {h > 0 ? unite(' h ') : unite(' min')}
      {h > 0 ? String(m).padStart(2, '0') : ''}
    </Ink>
  );
}
