/**
 * La ligne « Ton allure » sous la phrase de statut (16 octobre, Houari : « mets des choses en couleur pour que ça
 * donne envie, là c'est juste gris »). Une seule ligne discrete, coherente avec la legende de la courbe :
 *  - un petit trait en tirets sur sa bande douce, comme « ton rythme prévu » dans la legende ;
 *  - « Ton allure aujourd’hui : » en encre secondaire ;
 *  - la valeur dans le vert de la ligne directrice (#3E9B6A en clair, #5FBF8A en sombre) ;
 *  - 16 octobre, Houari : plus d'ecart « toi +0,3 kg », il repetait la phrase de statut juste au dessus.
 * Les morceaux viennent de partiesAllure (lib/v2/pesee/cadrageCourbe.ts) : meme valeur que le point vert de la courbe.
 * Utilisee par la carte Poids de l'accueil et par le detail du poids.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { paletteSombre } from '@/components/yoroi/livePalette';
import type { PartiesAllure } from '@/lib/v2/pesee/cadrageCourbe';

/** Le vert de la valeur, lisible sur la carte claire et sombre */
export function vertAllure(): string {
  return paletteSombre() ? '#5FBF8A' : '#3E9B6A';
}

export function LigneAllure({ parties, size = 12, secondaire, style }: { parties: PartiesAllure; size?: number; secondaire: string; style?: object }) {
  const sombre = paletteSombre();
  // le meme vert que les tirets de la legende de la courbe
  const trait = sombre ? '#3FB27F' : '#1F8A5B';
  const label = `${parties.debut} : ${parties.valeur}`;
  return (
    <View accessible accessibilityLabel={label} style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }, style]}>
      <Svg width={18} height={9}>
        <Rect x={0} y={0} width={18} height={9} rx={3} fill={trait} fillOpacity={sombre ? 0.22 : 0.14} />
        <Line x1={2.5} x2={15.5} y1={4.5} y2={4.5} stroke={trait} strokeWidth={2.4} strokeDasharray="4.5 3" strokeLinecap="round" />
      </Svg>
      <Ink size={size} weight="bold" color={secondaire} numberOfLines={1} style={{ flexShrink: 1 }}>
        {`${parties.debut} : `}
        <Ink size={size} weight="extraBold" color={vertAllure()} style={{ fontVariant: ['tabular-nums'] }}>
          {parties.valeur}
        </Ink>
      </Ink>
    </View>
  );
}
