import React from 'react';
import { View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { InkTabBar } from '@/components/yoroi/v2/InkTabBar';
import { ImportProgressBanner } from '@/components/ImportProgressBanner';
import { TourGate } from '@/components/yoroi/v2/tour/TourGate';
import { PropositionSemaine } from '@/components/yoroi/v2/cartes/PropositionCarte';
import { BilanAuto } from '@/components/yoroi/v2/bilan/BilanAuto';
import { SeanceEnCours } from '@/components/yoroi/v2/seance/SeanceEnCours';

export default function TabsLayout() {
  const router = useRouter();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <InkTabBar {...props} onPressAdd={() => router.push('/ajouter' as any)} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="seances" />
        <Tabs.Screen name="progres" />
        <Tabs.Screen name="dojo" />
      </Tabs>
      {/* 24 octobre 2026 : ta seance en cours, visible depuis tous les onglets */}
      <SeanceEnCours />
      <ImportProgressBanner />
      {/* visite guidee « Le nouveau YOROI » une fois, sinon les nouveautes : jamais les deux */}
      <TourGate />
      {/* nuit du 14 octobre : le bilan de ta semaine en carte, le dimanche soir, une fois */}
      <PropositionSemaine />
      {/* 16 octobre : le bilan d'une pesee ou d'une seance arrivee de la montre */}
      <BilanAuto />
    </View>
  );
}
