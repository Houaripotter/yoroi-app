/**
 * Ornement illustre (torii, lanterne, vague...) : une image decorative, jamais lue par les lecteurs d'ecran.
 * - Ornement : l'image seule, taille carree.
 * - OrnementCoin : l'image pale posee dans un coin d'un bloc (position absolue, sans capter les appuis).
 */
import React from 'react';
import { Image, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { ORNEMENTS } from './images';
import type { OrnementKey } from './images';

export function Ornement({ name, size = 64, opacity = 1, style }: { name: OrnementKey; size?: number; opacity?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: size, height: size, opacity }, style]}>
      <Image source={ORNEMENTS[name]} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

type Coin = 'haut-droite' | 'haut-gauche' | 'bas-droite' | 'bas-gauche';

/** Ornement pale dans un coin : a placer en premier enfant d'un bloc en overflow hidden */
export function OrnementCoin({ name, size = 120, opacity = 0.16, coin = 'haut-droite', decalage = -18 }: { name: OrnementKey; size?: number; opacity?: number; coin?: Coin; decalage?: number }) {
  const pos: ViewStyle = { position: 'absolute' };
  if (coin.startsWith('haut')) pos.top = decalage;
  else pos.bottom = decalage;
  if (coin.endsWith('droite')) pos.right = decalage;
  else pos.left = decalage;
  return <Ornement name={name} size={size} opacity={opacity} style={pos} />;
}

export default Ornement;
