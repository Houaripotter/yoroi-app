/**
 * Pictogramme de chaque famille de mesures sante (remplace l'ancien kanji de famille).
 */
import React from 'react';
import { Image, View } from 'react-native';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import type { Family } from '@/lib/v2/sante/metrics';
import { SanteIcon } from './SanteIcon';
import type { SanteIconName } from './SanteIcon';

export const FAMILY_ICON: Record<Family, SanteIconName> = {
  activite: 'steps',
  energie: 'flame',
  coeur: 'heart',
  souffle: 'lungs',
  sommeil: 'moon',
  recuperation: 'battery',
  corps: 'body',
  mobilite: 'route',
  environnement: 'sun',
  nutrition: 'drop',
};

export function FamilyIcon({ family, size = 20, color }: { family: Family; size?: number; color: string }) {
  return <SanteIcon name={FAMILY_ICON[family] ?? 'spark'} size={size} color={color} width={2.2} />;
}

/** 27 octobre 2026 : le sticker de chaque famille (meme nom que la famille) */
export const FAMILY_STICKER: Record<Family, NomSticker> = {
  activite: 'activite',
  energie: 'energie',
  coeur: 'coeur',
  souffle: 'souffle',
  sommeil: 'sommeil',
  recuperation: 'recuperation',
  corps: 'corps',
  mobilite: 'mobilite',
  environnement: 'environnement',
  nutrition: 'nutrition',
};

/**
 * La marque d'une famille : le sticker seul, sans carre teinte derriere (reglage Illustrations sur Stickers),
 * sinon l'ancien carre teinte et son pictogramme.
 */
export function FamilyBadge({ family, box, tint, color, radius, iconSize }: { family: Family; box: number; tint: string; color: string; radius?: number; iconSize?: number }) {
  const illus = useIllustrations();
  if (illus.stickers) {
    const t = Math.min(44, Math.max(36, box + 4));
    return <Image source={illus.img(FAMILY_STICKER[family] ?? 'activite')} style={{ width: t, height: t, marginVertical: (box - t) / 2 }} resizeMode="contain" accessibilityIgnoresInvertColors />;
  }
  return (
    <View style={{ width: box, height: box, borderRadius: radius ?? Math.round(box / 2.9), backgroundColor: tint, alignItems: 'center', justifyContent: 'center' }}>
      <FamilyIcon family={family} size={iconSize ?? Math.round(box * 0.55)} color={color} />
    </View>
  );
}
