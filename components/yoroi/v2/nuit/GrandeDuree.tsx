/** La duree en tres grand : chiffres pleins, unites plus petites et plus claires (7 h 42, 43 min) */
import React from 'react';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '@/components/yoroi/livePalette';
import { traduire, LANG } from '@/lib/i18n/tr';

export function GrandeDuree({ min, size = 68 }: { min: number; size?: number }) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  const unite = (u: string) => (
    <Ink size={Math.round(size * 0.38)} weight="extraBold" color={P.muted}>
      {u}
    </Ink>
  );
  // hors français : le modèle traduit (« {0}h {1}m », « {0} Std. {1} Min. »), chiffres en grand, unités en petit
  if (LANG !== 'fr' && h > 0) {
    const morceaux = traduire('{0} h {1}').split(/(\{[01]\})/).filter(Boolean);
    return (
      <Ink size={size} weight="black" tight accessibilityLabel={traduire("{0} heures {1} minutes", h, m)}>
        {morceaux.map((x, i) => (x === '{0}' ? <React.Fragment key={i}>{String(h)}</React.Fragment> : x === '{1}' ? <React.Fragment key={i}>{String(m).padStart(2, '0')}</React.Fragment> : <React.Fragment key={i}>{unite(x)}</React.Fragment>))}
      </Ink>
    );
  }
  return (
    <Ink size={size} weight="black" tight accessibilityLabel={h > 0 ? traduire("{0} heures {1} minutes", h, m) : traduire("{0} minutes", m)}>
      {h > 0 ? String(h) : String(m)}
      {h > 0 ? unite(' h ') : unite(' min')}
      {h > 0 ? String(m).padStart(2, '0') : ''}
    </Ink>
  );
}
