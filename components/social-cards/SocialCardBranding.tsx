/**
 * Signature YOROI des cartes partagees (refonte v2) : bandeau, pied de carte et filigrane.
 * Memes exports qu'avant pour les cartes qui l'utilisent encore.
 */
import React from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CardFoot, CardTop, paletteOf } from '@/components/yoroi/v2/partage/cardKit';

const pal = (variant: 'dark' | 'light') => paletteOf(variant === 'light' ? 'papier' : 'laque');

export const SocialCardTopBanner = React.memo<{ variant?: 'dark' | 'light' }>(({ variant = 'dark' }) => (
  <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
    <CardTop p={pal(variant)} />
  </View>
));
SocialCardTopBanner.displayName = 'SocialCardTopBanner';

export const SocialCardFooter = React.memo<{ variant?: 'dark' | 'light' }>(({ variant = 'dark' }) => (
  <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
    <CardFoot p={pal(variant)} />
  </View>
));
SocialCardFooter.displayName = 'SocialCardFooter';

export const SocialCardFooterCompact = React.memo<{ variant?: 'dark' | 'light' }>(({ variant = 'dark' }) => (
  <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
    <CardFoot p={pal(variant)} compact />
  </View>
));
SocialCardFooterCompact.displayName = 'SocialCardFooterCompact';

export const SocialCardWatermark = React.memo<{ show?: boolean; variant?: 'dark' | 'light' }>(({ show = true, variant = 'dark' }) => {
  if (!show) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      <Glyph kind="sakura" size={200} color={pal(variant).watermark} />
    </View>
  );
});
SocialCardWatermark.displayName = 'SocialCardWatermark';

export default { SocialCardTopBanner, SocialCardFooter, SocialCardFooterCompact, SocialCardWatermark };
