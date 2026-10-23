/**
 * 18 octobre 2026 : la carte a partager aux paliers de serie (7, 30 et 100 jours d'affilee).
 * Format story (9:16) : la scene gagnee en fond, la flamme, le nombre de jours en tres grand, ton prenom,
 * et la ligne d'adresse commune (SignatureCarte). Capturee par lib/v2/partage/capture.ts (shareCard).
 */
import React from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Flamme } from '@/components/yoroi/v2/dojo/Aujourdhui';
import { SignatureCarte } from '@/components/yoroi/v2/partage/SignatureCarte';
import { traduire } from '@/lib/i18n/tr';

const OR = '#F2C14E';

export function CarteSerie({ jours, image, nomScene, prenom, width }: { jours: number; image: ImageSourcePropType; nomScene: string; prenom: string | null; width: number }) {
  const height = Math.round((width * 16) / 9);
  const u = width / 100;
  return (
    <View collapsable={false} style={{ width, height, overflow: 'hidden', backgroundColor: '#10131B' }}>
      <Image source={image} style={{ position: 'absolute', left: 0, top: 0, width, height }} resizeMode="cover" />
      <LinearGradient colors={['rgba(10,12,22,0.25)', 'rgba(10,12,22,0.15)', 'rgba(10,12,22,0.88)']} locations={[0, 0.4, 1]} style={{ position: 'absolute', left: 0, top: 0, width, height }} />
      <View style={{ position: 'absolute', left: 7 * u, right: 7 * u, top: 9 * u }}>
        <Ink size={4.6 * u} weight="black" color="#FFFFFF" allowFontScaling={false}>YOROI</Ink>
        <Ink size={3.4 * u} weight="bold" color="rgba(255,255,255,0.85)" allowFontScaling={false}>{prenom ? traduire("La série de {0}", prenom) : traduire('Ma série')}</Ink>
      </View>
      <View style={{ position: 'absolute', left: 7 * u, right: 7 * u, bottom: 16 * u, gap: 1.5 * u }}>
        <Flamme size={18 * u} vive />
        <Ink size={(jours >= 100 ? 34 : 40) * u} weight="black" tight color={OR} allowFontScaling={false}>{String(jours)}</Ink>
        <Ink size={8 * u} weight="black" color="#FFFFFF" allowFontScaling={false}>{jours > 1 ? traduire('jours d’affilée') : traduire('jour d’affilée')}</Ink>
        <Ink size={3.8 * u} weight="bold" color="rgba(255,255,255,0.85)" allowFontScaling={false}>{traduire("Scène gagnée : {0}", nomScene)}</Ink>
      </View>
      <View style={{ position: 'absolute', left: 7 * u, right: 7 * u, bottom: 6 * u }}>
        <SignatureCarte color="rgba(255,255,255,0.75)" size={3 * u} />
      </View>
    </View>
  );
}
