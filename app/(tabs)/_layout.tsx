import React from 'react';
import { View } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { InkTabBar } from '@/components/yoroi/v2/InkTabBar';
import { BarreLaterale } from '@/components/yoroi/v2/BarreLaterale';
import { useGrandEcran } from '@/lib/v2/nav/useGrandEcran';
import { ImportProgressBanner } from '@/components/ImportProgressBanner';
import { TourGate } from '@/components/yoroi/v2/tour/TourGate';
import { QuoiDeNeufGate } from '@/components/yoroi/v2/nouveautes/QuoiDeNeufGate';
import { PropositionSemaine } from '@/components/yoroi/v2/cartes/PropositionCarte';
import { BilanAuto } from '@/components/yoroi/v2/bilan/BilanAuto';
import { SeanceEnCours } from '@/components/yoroi/v2/seance/SeanceEnCours';
import { RouvrirLePlus } from '@/lib/v2/nav/RouvrirLePlus';

export default function TabsLayout() {
  const router = useRouter();
  // 30 octobre 2026 : en grand ecran (Mac, iPad en grande fenetre), la barre laterale a gauche ; sur iPhone, la barre du bas
  const grand = useGrandEcran();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={grand ? { headerShown: false, tabBarPosition: 'left' } : { headerShown: false }}
        tabBar={(props) => (grand ? <BarreLaterale {...props} onPressAdd={() => router.push('/ajouter' as any)} /> : <InkTabBar {...props} onPressAdd={() => router.push('/ajouter' as any)} />)}
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
      {/* 1er novembre 2026 : « Quoi de neuf dans YOROI 3.0.2 », une fois par version, jamais pour un nouvel utilisateur */}
      <QuoiDeNeufGate />
      {/* nuit du 14 octobre : le bilan de ta semaine en carte, le dimanche soir, une fois */}
      <PropositionSemaine />
      {/* 16 octobre : le bilan d'une pesee ou d'une seance arrivee de la montre */}
      <BilanAuto />
      {/* 30 octobre 2026 : sur iOS, le + remplace par une page se rouvre quand tu reviens ici */}
      <RouvrirLePlus />
    </View>
  );
}
