/**
 * Ton personnage en buste dans un rond (16 octobre 2026, SEANCES AVATAR) : tete et epaules entieres, marge en haut,
 * tete centree. Le cadrage vient de la marge transparente mesuree sur chaque image (lib/v2/espace/cadrageBuste.ts),
 * en pourcentages du rond : le meme rendu a 54, 72 ou 150 points. A poser dans un rond qui coupe (overflow hidden).
 */
import React from 'react';
import { Image } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { styleBuste } from '@/lib/v2/espace/cadrageBuste';

export function BusteRond({ source, label }: { source: ImageSourcePropType; label?: string }) {
  return (
    <Image
      source={source}
      style={styleBuste(source)}
      resizeMode="stretch"
      accessibilityLabel={label}
      accessibilityIgnoresInvertColors
    />
  );
}
