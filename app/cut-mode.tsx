/**
 * Mode cut (refonte v2) : fusionne avec l'ecran Coupe de poids.
 * La route reste gratuite pour le suivi jusqu'a la pesee ; le simulateur et le jour J
 * passent par /weight-cut, qui garde son acces Premium.
 */
import React from 'react';
import { WeightCutHub } from '@/components/yoroi/v2/nutrition/WeightCutHub';

export default function CutModeScreen() {
  return <WeightCutHub initialTab="coupe" extrasRoute="/weight-cut" />;
}
