/**
 * Studio, revue : Sons. Reserve au mode createur (cadenas sinon), relie seulement depuis le Studio.
 */
import React from 'react';
import { GalerieGate } from '@/components/yoroi/v2/studio/galeries/kit';
import { SonsGalerie } from '@/components/yoroi/v2/studio/galeries/SonsGalerie';

export default function StudioSonsGalerieScreen() {
  return (
    <GalerieGate>
      <SonsGalerie />
    </GalerieGate>
  );
}
