/**
 * Sticker ou ancien rendu (30 octobre 2026, Houari : « des stickers partout, pas d'icônes »).
 * Avec le reglage Illustrations sur Stickers, le sticker nomme ; en Encre japonaise, ce qui est passe en enfant
 * (l'icone d'avant), ou rien. Passe par useIllustrations : le changement de reglage redessine tout de suite.
 */
import React from 'react';
import { Image } from 'react-native';
import type { ImageStyle, StyleProp } from 'react-native';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';

export function StickerSinon({ nom, taille, style, children }: { nom: NomSticker; taille: number; style?: StyleProp<ImageStyle>; children?: React.ReactNode }) {
  const illus = useIllustrations();
  if (!illus.stickers) return <>{children ?? null}</>;
  return <Image source={illus.img(nom)} style={[{ width: taille, height: taille }, style]} resizeMode="contain" accessibilityIgnoresInvertColors />;
}
