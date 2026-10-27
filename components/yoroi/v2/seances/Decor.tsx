/**
 * Decor des onglets Seances et Progres (vague 40) :
 * - BandeauScene : un bandeau de scene fin en haut de l'onglet (comme l'accueil, en plus bas),
 *   le titre de l'onglet et une phrase poses sur le bas de la scene, fondu vers le papier.
 * - EnteteSection : le titre d'une section, sa phrase, et une petite illustration a droite.
 * - Rouleau : une carte en papier washi avec le cadre fin d'un rouleau monte (comme la carte Poids).
 * Illustrations de l'app uniquement (ornements, tampons, scenes), aucun texte japonais.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P, paperA } from '@/components/yoroi/livePalette';
import { ORNEMENTS } from '@/components/yoroi/v2/ornements/images';
import type { OrnementKey } from '@/components/yoroi/v2/ornements/images';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';
import { tamponPour, useIllustrations } from '@/components/yoroi/v2/stickers';
import { tap } from './ui';
import Animated, { type SharedValue } from 'react-native-reanimated';
import { fonduPapier, useParallaxe } from '@/components/yoroi/v2/accueil/parallaxe';

/** Vague 44 : le bandeau deborde de 50 points sous le contenu, fondu doux sur 130 points */
const DEBORD = 50;
const FONDU_BANDEAU = 130;

/** Scenes des bandeaux : claires, avec leur centre d'interet a droite (le titre vit a gauche) */
export const BANDEAUX = {
  seances: require('@/assets/avatars/app/monde/scenes/kyudojo.webp'),
  progres: require('@/assets/avatars/app/monde/scenes/sommet.webp'),
} satisfies Record<string, ImageSourcePropType>;

/** Recadrage horizontal : part de l'image gardee a droite (0 colle a gauche, 1 colle a droite) */
const FOCUS: Record<keyof typeof BANDEAUX, number> = { seances: 0.62, progres: 0.18 };

/** Une illustration : ornement en couleurs, ou tampon a l'encre */
export type Illus = { ornement: OrnementKey } | { tampon: TamponId };

export function illusSource(i: Illus): ImageSourcePropType {
  // 27 octobre 2026 : l'ornement suit le reglage Illustrations (sticker ou encre) ; le tampon reste le tampon
  return 'ornement' in i ? ORNEMENTS[i.ornement] : tamponPour(i.tampon);
}

export function IllusImage({ illus, size = 44, rotate = 0 }: { illus: Illus; size?: number; rotate?: number }) {
  useIllustrations();
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size, transform: rotate ? [{ rotate: `${rotate}deg` }] : undefined }}>
      <Image source={illusSource(illus)} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

/**
 * Bandeau de scene en haut d'un onglet. Pleine largeur : a poser hors de la marge de 22 points
 * (ou avec bleed pour annuler la marge du parent).
 */
export function BandeauScene({ scene, top, title, sub, bleed = 0, right, scrollY }: { scene: keyof typeof BANDEAUX; top: number; title: string; sub?: string; bleed?: number; right?: React.ReactNode; scrollY?: SharedValue<number> }) {
  const { isDark } = useYoroiTheme();
  const [w, setW] = React.useState(390);
  const H = top + 124;
  // l'image (1200 x 670) couvre la hauteur, decalee pour garder son centre d'interet
  const HT = H + DEBORD;
  const { scene: styleScene } = useParallaxe(scrollY, HT);
  const fondu = React.useMemo(() => fonduPapier(), [isDark]);
  const imgH = Math.max(HT, w / (1200 / 670));
  const imgW = imgH * (1200 / 670);
  const shift = Math.max(0, (imgW - w) * FOCUS[scene]);
  const ink = isDark ? P.pureWhite : '#1D2029';
  const shadow = isDark
    ? { textShadowColor: 'rgba(10,12,20,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 }
    : { textShadowColor: 'rgba(255,255,255,0.95)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 };
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height: H, marginHorizontal: -bleed, zIndex: 0 }}
    >
      {/* vague 44 : la scene suit legerement le defilement et s'efface en douceur sous le contenu */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, height: HT, overflow: 'hidden', backgroundColor: P.paper }, styleScene]}>
        <Image source={BANDEAUX[scene]} style={{ position: 'absolute', top: 0, left: -shift, width: imgW, height: imgH, opacity: isDark ? 0.62 : 1 }} resizeMode="cover" accessibilityIgnoresInvertColors />
        {/* voile sous la barre d'etat */}
        <LinearGradient pointerEvents="none" colors={[paperA(isDark ? 0.5 : 0.45), paperA(0)]} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: top + 30 }} />
        {/* voile leger sous le titre, puis le fondu doux vers le papier */}
        <LinearGradient pointerEvents="none" colors={[paperA(0), paperA(isDark ? 0.4 : 0.32), paperA(0)]} locations={[0, 0.7, 1]} style={{ position: 'absolute', left: 0, right: 0, top: H - 120, height: 100 }} />
        <LinearGradient pointerEvents="none" colors={fondu.colors} locations={fondu.locations} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: FONDU_BANDEAU }} />
      </Animated.View>
      <View style={{ position: 'absolute', left: 22, right: 22, bottom: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <View style={{ flex: 1, gap: 1 }}>
          <Ink size={30} weight="black" tight color={ink} style={shadow} accessibilityRole="header">
            {title}
          </Ink>
          {sub ? (
            <Ink size={14} weight="bold" color={isDark ? 'rgba(255,255,255,0.88)' : P.ink2} style={shadow} numberOfLines={2}>
              {sub}
            </Ink>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

/** Titre de section : titre, phrase courte, lien eventuel, petite illustration a droite */
export function EnteteSection({ title, sub, illus, action, onAction, style }: { title: string; sub?: string; illus?: Illus; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginTop: 14 }, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Ink size={21} weight="black" tight accessibilityRole="header">
          {title}
        </Ink>
        {sub ? (
          <Ink size={13} color={c.textSecondary}>
            {sub}
          </Ink>
        ) : null}
      </View>
      {action && onAction ? (
        <Pressable
          onPress={() => {
            tap();
            onAction();
          }}
          accessibilityRole="button"
          accessibilityLabel={`${title}, ${action}`}
          hitSlop={8}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Ink size={14} weight="extraBold" color={c.accent}>
            {action}
          </Ink>
        </Pressable>
      ) : null}
      {illus ? <IllusImage illus={illus} size={46} rotate={'tampon' in illus ? -6 : 0} /> : null}
    </View>
  );
}

/** Carte papier washi encadree comme un rouleau monte */
export function Rouleau({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ borderRadius: 22, backgroundColor: P.washi, borderWidth: 1, borderColor: P.washiBord, overflow: 'hidden' }, style]}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(44,74,132,0.18)' }} />
      {children}
    </View>
  );
}
