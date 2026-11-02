/**
 * 2 novembre 2026 (studio unique) : une ancienne route de partage remplacee par le studio du nouveau moteur.
 * Elle s'efface tout de suite (router.replace) : le retour ramene la ou tu etais, jamais sur l'ancien ecran.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { toutesSeances } from '@/lib/v2/cartes/charger';
import { derniereSeance, lienNouveauStudio } from '@/lib/v2/cartes/redirections';
import type { AncienneRoute } from '@/lib/v2/cartes/redirections';
import { devNow } from '@/lib/v2/creator/devClock';

export function RedirectionCarte({ route }: { route: AncienneRoute }) {
  const { theme } = useYoroiTheme();
  const router = useRouter();
  useEffect(() => {
    let vivant = true;
    (async () => {
      const id = route === 'last-session' ? derniereSeance(await toutesSeances().catch(() => [])) : null;
      if (vivant) router.replace(lienNouveauStudio(route, devNow(), id) as never);
    })();
    return () => {
      vivant = false;
    };
  }, [route, router]);
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center' }}>
      <ChargementPetit />
    </View>
  );
}
