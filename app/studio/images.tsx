/**
 * Studio, revue : Images. Reserve au mode createur (cadenas sinon), relie seulement depuis le Studio.
 */
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { GalerieGate } from '@/components/yoroi/v2/studio/galeries/kit';
import { ImagesGalerie } from '@/components/yoroi/v2/studio/galeries/ImagesGalerie';

export default function StudioImagesGalerieScreen() {
  const { famille } = useLocalSearchParams<{ famille?: string }>();
  return (
    <GalerieGate>
      <ImagesGalerie familleInitiale={typeof famille === 'string' ? famille : undefined} />
    </GalerieGate>
  );
}
