/**
 * Route /onboarding-tour (gardee pour les anciens liens et le Studio) : elle ouvre la visite guidee sur les
 * vrais ecrans (components/yoroi/v2/tour/VisiteGuidee.tsx). ?step=N part de l'etape N (0 = la premiere),
 * ?preview=1 ne marque rien comme vu.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { lancerVisite } from '@/components/yoroi/v2/tour/VisiteGuidee';

/** Ancienne cle du tour de decouverte, gardee pour les ecrans qui la lisent encore */
export const ONBOARDING_DONE_KEY = '@yoroi_onboarding_tour_done';

export default function OnboardingTourScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string; preview?: string }>();
  useEffect(() => {
    lancerVisite(router, Number(params.step) || 0, params.preview === '1');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: 'fade' }} />
      <View style={{ flex: 1 }} />
    </>
  );
}
