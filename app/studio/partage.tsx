/**
 * Studio, revue : Cartes de partage. Reserve au mode createur (cadenas sinon), relie seulement depuis le Studio.
 */
import React from 'react';
import { GalerieGate } from '@/components/yoroi/v2/studio/galeries/kit';
import { PartageGalerie } from '@/components/yoroi/v2/studio/galeries/PartageGalerie';

export default function StudioPartageGalerieScreen() {
  return (
    <GalerieGate>
      <PartageGalerie />
    </GalerieGate>
  );
}
