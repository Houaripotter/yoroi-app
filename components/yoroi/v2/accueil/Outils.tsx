/**
 * « Tes outils » de l'accueil (vague 15) : les quatre outils du quotidien en tuiles illustrees.
 * Chrono, Carnet, Objectifs, et Combat et compétition (ecran /combat-hub qui regroupe le reste).
 * Chaque tuile : un grand ornement japonais illustre en haut a droite (chronometre, carnet, cible,
 * gants et ceinture), jamais sous le texte, sur un fond doux uni, le titre et une ligne d'aide.
 */
import React from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Ornement } from '@/components/yoroi/v2/ornements/Ornement';
import type { OrnementKey } from '@/components/yoroi/v2/ornements/images';
import { P, Press } from './kit';

type Outil = { title: string; sub: string; href: string; tint: string; ornement: OrnementKey };

function Tile({ o, width }: { o: Outil; width: number }) {
  const router = useRouter();
  return (
    <Press onPress={() => router.push(o.href as any)} accessibilityRole="button" accessibilityLabel={`${o.title}, ${o.sub}`}>
      <View style={{ width, height: 184, borderRadius: 22, backgroundColor: o.tint, overflow: 'hidden', padding: 14, justifyContent: 'flex-end', borderWidth: 1, borderColor: P.tuileBord }}>
        <Ornement name={o.ornement} size={Math.min(104, width - 40)} style={{ position: 'absolute', right: 8, top: 8 }} />
        <View style={{ gap: 2 }}>
          <Ink size={16} weight="black" tight numberOfLines={2}>
            {o.title}
          </Ink>
          <Ink size={12} weight="bold" color={P.ink2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
            {o.sub}
          </Ink>
        </View>
      </View>
    </Press>
  );
}

export function TesOutils(_props: { femme?: boolean }) {
  const { width } = useWindowDimensions();
  const tileW = Math.floor((width - 44 - 10) / 2);
  const outils: Outil[] = [
    { title: 'Chrono', sub: 'repos, rounds, Tabata', href: '/timer', tint: P.tuileIndigo, ornement: 'chrono' },
    { title: 'Carnet', sub: 'records et vidéos', href: '/training-journal', tint: P.tuileOr, ornement: 'carnet' },
    { title: 'Objectifs', sub: 'à cocher, par sport', href: '/training-goals', tint: P.tuileMousse, ornement: 'cible' },
    { title: 'Combat et compétition', sub: 'compétitions, analyse', href: '/combat-hub', tint: P.tuileRouge, ornement: 'combat' },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
      {outils.map((o) => (
        <Tile key={o.href} o={o} width={tileW} />
      ))}
    </View>
  );
}
