/**
 * Fonds d'epoque plein ecran (vague 16) : quatre grandes illustrations verticales du Japon
 * des samourais (chateau sous la lune, allee de cerisiers, pagode sous la neige, torii a l'aube).
 * Toujours sous un voile : le texte reste lisible, jamais une image chargee derriere un texte long.
 * - voile 'clair' : papier de riz, l'image vit en haut et s'efface vers la zone de contenu ;
 * - voile 'sombre' : nuit indigo, pour un texte blanc pose en bas ;
 * - flou : adoucit l'image (expo-blur) quand du contenu passe par-dessus partout.
 */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export type FondId = 'chateau' | 'sakura' | 'neige' | 'aube';

export const FONDS: Record<FondId, ImageSourcePropType> = {
  chateau: require('@/assets/avatars/app/monde/fonds/verticale_chateau.webp'),
  sakura: require('@/assets/avatars/app/monde/fonds/verticale_sakura.webp'),
  neige: require('@/assets/avatars/app/monde/fonds/verticale_neige.webp'),
  aube: require('@/assets/avatars/app/monde/fonds/verticale_aube.webp'),
};

/** Couleur de repli sous chaque image, le temps qu'elle se charge */
const FOND_BASE: Record<FondId, string> = {
  chateau: '#1B2236',
  sakura: '#EDE6DA',
  neige: '#1E2A44',
  aube: '#2A3550',
};

const PAPER = '242,241,236';
const NIGHT = '16,20,34';

type Voile = 'clair' | 'sombre' | 'leger';

/**
 * clair : l'image se voit en haut (environ le premier tiers), puis le papier couvre la zone de contenu.
 * sombre : l'image se voit en haut, la nuit monte en bas sous le texte blanc.
 * leger : un voile papier uniforme, pour un ecran court centre (chargement).
 */
function voileColors(voile: Voile): { colors: [string, string, ...string[]]; locations: [number, number, ...number[]] } {
  if (voile === 'sombre') {
    return { colors: [`rgba(${NIGHT},0.45)`, `rgba(${NIGHT},0.05)`, `rgba(${NIGHT},0.55)`, `rgba(${NIGHT},0.92)`], locations: [0, 0.3, 0.6, 1] };
  }
  if (voile === 'leger') {
    return { colors: [`rgba(${PAPER},0.35)`, `rgba(${PAPER},0.62)`, `rgba(${PAPER},0.8)`], locations: [0, 0.5, 1] };
  }
  return { colors: [`rgba(${PAPER},0.3)`, `rgba(${PAPER},0.55)`, `rgba(${PAPER},0.9)`, `rgba(${PAPER},0.96)`], locations: [0, 0.22, 0.45, 1] };
}

export function FondEpoque({ fond, voile = 'clair', flou = 0, style }: { fond: FondId; voile?: Voile; flou?: number; style?: StyleProp<ViewStyle> }) {
  const v = voileColors(voile);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: FOND_BASE[fond], overflow: 'hidden' }, style]}>
      <Image source={FONDS[fond]} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
      {flou > 0 ? <BlurView intensity={flou} tint={voile === 'sombre' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
      <LinearGradient colors={v.colors} locations={v.locations} style={StyleSheet.absoluteFill} />
    </View>
  );
}

export default FondEpoque;
