/**
 * Studio, revue : Fenêtres. Reserve au mode createur (cadenas sinon), relie seulement depuis le Studio.
 */
import React from 'react';
import { GalerieGate } from '@/components/yoroi/v2/studio/galeries/kit';
import { FenetresGalerie } from '@/components/yoroi/v2/studio/galeries/FenetresGalerie';

export default function StudioFenetresGalerieScreen() {
  return (
    <GalerieGate>
      <FenetresGalerie />
    </GalerieGate>
  );
}
