/**
 * Ton personnage en buste dans un rond (16 octobre 2026, SEANCES AVATAR) : tete et epaules entieres, marge en haut,
 * tete centree. Le cadrage vient de la marge transparente mesuree sur chaque image (lib/v2/espace/cadrageBuste.ts),
 * en fractions du rond : le meme rendu a 54, 72 ou 150 points. A poser dans un rond qui coupe (overflow hidden).
 * 28 octobre 2026 (Houari : « le personnage est coupe, les pieds coupes ») : la regle retenue partout est le buste
 * propre. Le cadre mesure sa propre taille (onLayout) et pose l'image en points : avant, des pourcentages, que certains
 * cadres (bord epais, formes decoupees) ne transmettaient pas, et le personnage entier tombait dans le rond, pieds coupes.
 */
import React, { useState } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType, LayoutChangeEvent } from 'react-native';
import { cadrageBuste } from '@/lib/v2/espace/cadrageBuste';

export function BusteRond({ source, label }: { source: ImageSourcePropType; label?: string }) {
  const [d, setD] = useState(0);
  const mesure = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const v = Math.round(Math.min(width, height));
    if (v > 0 && v !== d) setD(v);
  };
  const k = cadrageBuste(source);
  return (
    <View onLayout={mesure} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
      {d > 0 ? (
        <Image
          source={source}
          style={{ position: 'absolute', width: k.w * d, height: k.h * d, left: k.l * d, top: k.t * d }}
          resizeMode="stretch"
          accessibilityLabel={label}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}
