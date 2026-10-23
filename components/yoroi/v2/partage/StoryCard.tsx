/**
 * Mise en page commune des cartes « story » (9:16) et carrees : en-tete, gros chiffre,
 * guerrier du rang, progression en plaques, panneau de stats, pied YOROI.
 */
import React, { forwardRef } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { CardFrame, CardFoot, CardTop, Ground, RankTag, Stamp, paletteOf } from './cardKit';
import type { CardPalette, CardVariant } from './cardKit';

export type StoryCardProps = {
  variant: CardVariant;
  width: number;
  square?: boolean;
  photo?: string | null;
  label?: string;
  kicker: string;
  name?: string;
  big: string | number;
  bigUnit?: string;
  caption: string;
  subCaption?: string;
  figure: ImageSourcePropType;
  rankKanji: string;
  rankName: string;
  stamp?: string | null;
  kanji?: string;
  progress?: (p: CardPalette) => React.ReactNode;
  panel?: (p: CardPalette) => React.ReactNode;
  extra?: (p: CardPalette) => React.ReactNode;
};

export const StoryCard = forwardRef<View, StoryCardProps>((props, ref) => {
  const { variant, width, square, photo, label, kicker, name, big, bigUnit, caption, subCaption, figure, rankKanji, rankName, stamp, kanji, progress, panel, extra } = props;
  const height = square ? width : Math.round(width * (16 / 9));
  const p = paletteOf(variant);
  const isPhoto = variant === 'photo' && !!photo;
  const pad = Math.round(width * 0.055);
  // vague 47 : un nombre de 3 chiffres ou plus tient sur la carte sans etre coupe
  const bigLen = String(big).replace(/\s/g, '').length;
  const bigSize = Math.round(width * (square ? 0.2 : 0.27) * (bigLen >= 4 ? 0.56 : bigLen === 3 ? 0.72 : 1));
  const figW = Math.round(width * (square ? 0.36 : 0.48));
  const figH = Math.round(figW * 1.33);
  return (
    <CardFrame ref={ref} variant={variant} width={width} height={height} photo={photo} kanji={kanji}>
      <View style={{ flex: 1, paddingTop: pad, paddingBottom: pad * 0.8, paddingLeft: pad + 4, paddingRight: pad, gap: square ? 8 : 12 }}>
        <CardTop p={p} label={label} />

        <View style={{ flex: 1, justifyContent: isPhoto ? 'flex-end' : 'flex-start' }}>
          {!isPhoto ? (
            <View pointerEvents="none" style={{ position: 'absolute', right: -pad * 0.4, top: 0, bottom: 0, width: figW, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Image source={figure} style={{ width: figW, height: '100%', maxHeight: figH }} resizeMode="contain" />
              <View style={{ marginTop: -10 }}><Ground width={figW * 0.8} color={variant === 'papier' ? '#D9D5CB' : 'rgba(255,255,255,0.18)'} /></View>
            </View>
          ) : null}

          <View style={{ gap: 4, maxWidth: isPhoto ? '100%' : width * 0.58, paddingTop: square ? 2 : 10 }}>
            <Ink size={14} weight="bold" color={p.ink2} numberOfLines={1}>{kicker}</Ink>
            {name && !square ? <Ink size={22} weight="black" tight color={p.ink} numberOfLines={1}>{name}</Ink> : null}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: square ? 0 : 6 }}>
              <Ink size={bigSize} weight="black" tight color={p.ink} numberOfLines={1} style={{ lineHeight: Math.round(bigSize * 1.04) }}>{String(big)}</Ink>
              {bigUnit ? <Ink size={Math.round(bigSize * 0.26)} weight="black" color={p.accent} style={{ marginBottom: bigSize * 0.14 }}>{bigUnit}</Ink> : null}
            </View>
            <Ink size={16} weight="extraBold" color={p.ink}>{caption}</Ink>
            {subCaption && !square ? <Ink size={13} weight="bold" color={p.muted}>{subCaption}</Ink> : null}
            {/* vague 47 : le rang reste dans le Dojo et sur la Carte de combattant */}
          </View>

          {stamp ? (
            <View style={{ position: 'absolute', right: 2, top: square ? 0 : 4 }}>
              <Stamp p={p} char={stamp} size={square ? 40 : 50} />
            </View>
          ) : null}
        </View>

        {progress ? <View style={{ gap: 6 }}>{progress(p)}</View> : null}
        {panel ? panel(p) : null}
        {extra && !square ? extra(p) : null}
        <CardFoot p={p} compact={square} />
      </View>
    </CardFrame>
  );
});
StoryCard.displayName = 'StoryCard';
