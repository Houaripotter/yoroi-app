/**
 * Studio, revue : bibliotheques d'exercices libres. Reserve au mode createur (cadenas sinon), relie seulement depuis le Studio.
 */
import React from 'react';
import { GalerieGate } from '@/components/yoroi/v2/studio/galeries/kit';
import { ExercicesLibresGalerie } from '@/components/yoroi/v2/studio/galeries/ExercicesLibresGalerie';

export default function StudioExercicesLibresScreen() {
  return (
    <GalerieGate>
      <ExercicesLibresGalerie />
    </GalerieGate>
  );
}
