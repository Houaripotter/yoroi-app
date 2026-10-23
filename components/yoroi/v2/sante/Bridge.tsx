/**
 * Schema « appareils, Sante ou Health Connect, YOROI » : montre honnetement le chemin des donnees.
 */
import React from 'react';
import { Platform, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { SanteIcon } from './SanteIcon';
import type { SanteIconName } from './SanteIcon';
import { GlassBox, S } from './ui';

function Node({ icon, title, sub, color, tint }: { icon: SanteIconName; title: string; sub: string; color: string; tint: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
        <SanteIcon name={icon} size={26} color={color} />
      </View>
      <Ink size={13} weight="black" style={{ textAlign: 'center' }} numberOfLines={2}>
        {title}
      </Ink>
      <Ink size={11} weight="bold" color={S.ink2} style={{ textAlign: 'center' }} numberOfLines={3}>
        {sub}
      </Ink>
    </View>
  );
}

function Arrow() {
  return (
    <View style={{ paddingTop: 18 }}>
      <Svg width={22} height={18} viewBox="0 0 22 18">
        <Path d="M2 9 C8 6 13 12 19 9 M14 4 L19 9 L14 14" stroke={S.accent} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export function DataBridge() {
  const android = Platform.OS === 'android';
  return (
    <GlassBox style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Node icon="watch" title="Tes appareils" sub={android ? 'Fitbit, Garmin, Samsung, Withings' : 'Apple Watch, Garmin, Withings, Fitbit'} color={S.accent} tint={S.accentSoft} />
        <Arrow />
        <Node icon="heart" title={android ? 'Health Connect' : 'Apple Santé'} sub={android ? 'Le coffre santé de Google' : "Le coffre santé de l'iPhone"} color={S.indigo} tint={S.indigoSoft} />
        <Arrow />
        <Node icon="shield" title="YOROI" sub="Lit, range et dessine tes courbes" color={S.ink} tint="#E8E5DE" />
      </View>
      <Ink size={13} weight="medium" color={S.ink2}>
        {android
          ? "YOROI ne se branche pas directement sur ta montre : chaque marque envoie ses mesures à Health Connect, et YOROI les lit là. Fitbit, Garmin, Samsung et Withings passent tous par ce chemin."
          : "YOROI ne se branche pas directement sur ta montre : chaque marque envoie ses mesures à Apple Santé, et YOROI les lit là. Apple Watch, Garmin, Withings et Fitbit passent tous par ce chemin."}
      </Ink>
    </GlassBox>
  );
}
