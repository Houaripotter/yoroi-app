/**
 * Tes outils (vague 36) : une rangee compacte en defilement horizontal, a la place des 4 grandes tuiles.
 * Chrono, Carnet, Objectifs, Combat et competition, Videos, Records : petits ronds illustres, libelle dessous.
 * Les videos et les records ne sont plus des blocs de l'accueil : ils restent ici, a un toucher.
 */
import React from 'react';
import { Image, ScrollView, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ORNEMENTS } from '@/components/yoroi/v2/ornements/images';
import { P, Press } from './kit';

const VIDEOS: ImageSourcePropType = require('@/assets/avatars/app/carnet/videos.webp');
const RECORDS: ImageSourcePropType = require('@/assets/avatars/app/carnet/records.webp');

type Outil = { key: string; title: string; a11y: string; href: string | { pathname: string; params: Record<string, string> }; img: ImageSourcePropType; tint: string };

export function OutilsRangee() {
  const router = useRouter();
  const outils: Outil[] = [
    { key: 'chrono', title: 'Chrono', a11y: 'Chrono : repos, rounds, Tabata', href: '/timer', img: ORNEMENTS.chrono, tint: P.tuileIndigo },
    { key: 'carnet', title: 'Carnet', a11y: 'Carnet : techniques, records et vidéos', href: '/training-journal', img: ORNEMENTS.carnet, tint: P.tuileOr },
    { key: 'objectifs', title: 'Objectifs', a11y: 'Objectifs à cocher, par sport', href: '/training-goals', img: ORNEMENTS.cible, tint: P.tuileMousse },
    { key: 'combat', title: 'Combat et compétition', a11y: 'Combat et compétition : compétitions, analyse', href: '/combat-hub', img: ORNEMENTS.combat, tint: P.tuileRouge },
    { key: 'videos', title: 'Vidéos', a11y: 'Tes vidéos d’exemple, dans le carnet', href: { pathname: '/training-journal', params: { tab: 'videos' } }, img: VIDEOS, tint: P.tuileOr },
    { key: 'records', title: 'Records', a11y: 'Tes records', href: '/records', img: RECORDS, tint: P.tuileIndigo },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -22 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 6 }}>
      {outils.map((o) => (
        <Press key={o.key} onPress={() => router.push(o.href as any)} accessibilityRole="button" accessibilityLabel={o.a11y}>
          <View style={{ width: 78, alignItems: 'center', gap: 6 }}>
            <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: o.tint, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: P.tuileBord }}>
              <Image source={o.img} style={{ width: 42, height: 42 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            </View>
            <Ink size={12} weight="extraBold" numberOfLines={2} style={{ textAlign: 'center' }}>
              {o.title}
            </Ink>
          </View>
        </Press>
      ))}
    </ScrollView>
  );
}
