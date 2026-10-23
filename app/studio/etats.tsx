/**
 * Studio, revue : États. Reserve au mode createur (cadenas sinon), relie seulement depuis le Studio.
 */
import React from 'react';
import { GalerieGate } from '@/components/yoroi/v2/studio/galeries/kit';
import { EtatsGalerie } from '@/components/yoroi/v2/studio/galeries/EtatsGalerie';

export default function StudioEtatsGalerieScreen() {
  return (
    <GalerieGate>
      <EtatsGalerie />
    </GalerieGate>
  );
}
