/**
 * Coupe de poids (refonte v2), acces Premium : suivi jusqu'a la pesee, simulateur
 * et rehydratation du jour J. Meme ecran que /cut-mode (les deux ont ete fusionnes).
 * Parametre optionnel ?tab=coupe|simu|jourj pour ouvrir un onglet precis.
 */
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { WeightCutHub } from '@/components/yoroi/v2/nutrition/WeightCutHub';
import type { Tab } from '@/components/yoroi/v2/nutrition/WeightCutHub';
import { traduire } from '@/lib/i18n/tr';

export default function WeightCutScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const initial: Tab = tab === 'simu' || tab === 'jourj' ? tab : 'coupe';
  return (
    <PremiumGate source="seche" featureTitle={traduire("Coupe de poids")} perks={[traduire('Ta coupe planifiée jusqu’à la pesée'), traduire('Les catégories de MMA, JJB et boxe'), traduire('Un simulateur pour tester ton objectif')]}>
      <WeightCutHub initialTab={initial} />
    </PremiumGate>
  );
}
