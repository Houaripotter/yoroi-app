/**
 * Preuve sociale et defilement, partages par l'accroche de l'onboarding et le paywall (vague 29).
 *  - Defilement : une bande qui defile seule en continu, sans couture (contenu rendu deux fois),
 *    sur le fil d'interface de reanimated, en pause quand l'ecran n'est pas visible ou si
 *    l'utilisateur a demande moins d'animations.
 *  - NoteLauriers : la vraie note des stores (REAL_STORE_RATING) entre deux lauriers dessines ici.
 *    Laurier generique, a nous : ce n'est ni un badge de store ni une recompense editoriale.
 *  - AvisDefilants et AvisGlissables : les avis reels de lib/v2/premium/avis.ts.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, View } from 'react-native';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { G, Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { AVIS, type Avis } from '@/lib/v2/premium/avis';
import { storeRating } from '@/lib/v2/premium/offer';
import { traduire } from '@/lib/i18n/tr';

// ===== Visibilite : l'app au premier plan et l'ecran affiche =====

export function useEcranVisible(): boolean {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const [focused, setFocused] = useState(true);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  return active && focused;
}

// ===== Bande qui defile =====

export function Defilement({
  children,
  speed,
  direction = 'left',
  paused = false,
  start = 0,
  gap = 10,
  style,
  draggable = false,
}: {
  children: React.ReactNode;
  /** vitesse en points par seconde (la meme a l'oeil, quelle que soit la longueur de la rangee) */
  speed: number;
  direction?: 'left' | 'right';
  paused?: boolean;
  /** decalage de depart, de 0 a 1, pour desaligner plusieurs bandes */
  start?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
  /** vague 48 : la bande se fait glisser au doigt (horizontalement), puis repart seule d'ou on l'a laissee */
  draggable?: boolean;
}) {
  const reduce = useReducedMotion();
  const [half, setHalf] = useState(0);
  const x = useSharedValue(0);
  const x0 = useSharedValue(0);
  const [lache, setLache] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width / 2;
    if (w > 0 && Math.abs(w - half) > 1) {
      if (half === 0) x.value = (Math.max(0, Math.min(1, start)) * w) % w;
      setHalf(w);
    }
  };

  useEffect(() => {
    cancelAnimation(x);
    if (!half || reduce || paused || speed <= 0) return;
    const lap = (half / speed) * 1000;
    const from = ((x.value % half) + half) % half;
    x.value = from;
    // on finit le tour en cours, puis on repart de zero en boucle : la reprise apres une pause part d'ici
    x.value = withTiming(half, { duration: Math.max(16, lap * (1 - from / half)), easing: Easing.linear }, (done) => {
      if (!done) return;
      x.value = 0;
      x.value = withRepeat(withTiming(half, { duration: lap, easing: Easing.linear }), -1, false);
    });
    return () => cancelAnimation(x);
  }, [half, reduce, paused, speed, x, lache]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: direction === 'left' ? -x.value : x.value - half }],
  }));

  // glisser au doigt : seulement un geste franchement horizontal, le defilement vertical de l'ecran reste libre
  const relancer = () => setLache((n) => n + 1);
  const pan = Gesture.Pan()
    .enabled(draggable && half > 0)
    .activeOffsetX([-10, 10])
    .failOffsetY([-14, 14])
    .onStart(() => {
      cancelAnimation(x);
      x0.value = x.value;
    })
    .onUpdate((e) => {
      const v = direction === 'left' ? x0.value - e.translationX : x0.value + e.translationX;
      x.value = ((v % half) + half) % half;
    })
    .onFinalize(() => {
      runOnJS(relancer)();
    });

  const bande = (
    <Animated.View style={[{ flexDirection: 'row', alignSelf: 'flex-start' }, style, anim]} onLayout={onLayout}>
      <View style={{ flexDirection: 'row', gap, paddingRight: gap }}>{children}</View>
      <View style={{ flexDirection: 'row', gap, paddingRight: gap }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {children}
      </View>
    </Animated.View>
  );
  if (!draggable) return bande;
  return <GestureDetector gesture={pan}>{bande}</GestureDetector>;
}

// ===== Etoiles =====

const STAR = 'M12 2.6l2.85 5.95 6.55.88-4.78 4.55 1.2 6.48L12 17.3l-5.82 3.16 1.2-6.48L2.6 9.43l6.55-.88z';

export function Etoiles({ size = 13, color, gap = 2 }: { size?: number; color?: string; gap?: number }) {
  const { theme } = useYoroiTheme();
  const col = color ?? theme.colors.gold;
  return (
    <View style={{ flexDirection: 'row', gap }} accessible={false}>
      {[0, 1, 2, 3, 4].map((k) => (
        <Svg key={k} width={size} height={size} viewBox="0 0 24 24">
          <Path d={STAR} fill={col} />
        </Svg>
      ))}
    </View>
  );
}

// ===== Laurier dessine =====

/** Une feuille en amande de longueur 1 (base en 0,0, pointe en 1,0) */
const LEAF = 'M0 0 C0.28 -0.3 0.72 -0.3 1 0 C0.72 0.3 0.28 0.3 0 0 Z';

function laurierPaths(): { stem: string; leaves: string[] } {
  // branche sur un arc de cercle, du bas vers le haut, cote gauche
  const cx = 30;
  const cy = 30;
  const R = 23;
  const a0 = (104 * Math.PI) / 180;
  const a1 = (252 * Math.PI) / 180;
  const pt = (a: number) => [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  const [sx, sy] = pt(a0);
  const [ex, ey] = pt(a1);
  const stem = `M${sx.toFixed(2)} ${sy.toFixed(2)} A${R} ${R} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  const leaves: string[] = [];
  const N = 7;
  for (let i = 0; i < N; i++) {
    const t = (i + 0.6) / (N + 0.2);
    const a = a0 + (a1 - a0) * t;
    const [px, py] = pt(a);
    // tangente dans le sens de la branche (angle croissant)
    const tang = Math.atan2(Math.cos(a), -Math.sin(a));
    const len = 10.5 - i * 0.55;
    for (const side of [-1, 1]) {
      const rot = tang + side * 0.62;
      leaves.push(`${(rot * 180) / Math.PI}|${px}|${py}|${len * (side === 1 ? 1 : 0.92)}`);
    }
  }
  // feuille du bout, dans l'axe
  const tEnd = Math.atan2(Math.cos(a1), -Math.sin(a1));
  leaves.push(`${(tEnd * 180) / Math.PI}|${ex}|${ey}|8.5`);
  return { stem, leaves };
}

const LAURIER = laurierPaths();

export function Laurier({ height = 54, color, mirrored = false }: { height?: number; color?: string; mirrored?: boolean }) {
  const { theme } = useYoroiTheme();
  const col = color ?? theme.colors.goldDeep;
  const width = (height * 34) / 60;
  return (
    <Svg width={width} height={height} viewBox="0 0 34 60">
      <G transform={mirrored ? 'translate(34 0) scale(-1 1)' : undefined}>
        <Path d={LAURIER.stem} stroke={col} strokeWidth={1.3} fill="none" strokeLinecap="round" />
        {LAURIER.leaves.map((l, i) => {
          const [rot, x, y, len] = l.split('|').map(Number);
          return <Path key={i} d={LEAF} fill={col} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(1)}) scale(${len.toFixed(2)} ${(len * 1.05).toFixed(2)})`} />;
        })}
      </G>
    </Svg>
  );
}

// ===== Note avec lauriers =====

export function NoteLauriers({ compact = false }: { compact?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const r = storeRating();
  if (!r) return null;
  const h = compact ? 48 : 58;
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: compact ? 4 : 8 }}
      accessible
      accessibilityLabel={traduire("{0} sur 5, {1} notes, {2}", r.note, r.total, r.stores)}
    >
      <Laurier height={h} />
      <View style={{ alignItems: 'center', gap: compact ? 1 : 3, paddingHorizontal: 2 }}>
        <Ink size={compact ? 22 : 28} weight="black" tight style={{ lineHeight: compact ? 26 : 32 }}>{r.note}</Ink>
        <Etoiles size={compact ? 12 : 14} />
        <Ink size={compact ? 11 : 12} weight="bold" color={c.textSecondary} numberOfLines={1}>{`${r.total} notes, ${r.stores}`}</Ink>
      </View>
      <Laurier height={h} mirrored />
    </View>
  );
}

// ===== Avis =====

function AvisCarte({ avis, width, lines }: { avis: Avis; width?: number; lines: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ ...(width ? { width } : { flex: 1 }), borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 13, paddingVertical: 11, gap: 5 }}>
      <Etoiles size={11} />
      <Ink size={12.5} color={c.ink} numberOfLines={lines} style={{ lineHeight: 17 }}>{`« ${avis.texte} »`}</Ink>
      <View style={{ flex: 1 }} />
      <Ink size={11} weight="bold" color={c.textMuted} numberOfLines={1}>
        <Ink size={11} weight="extraBold" color={c.textSecondary}>{avis.pseudo}</Ink>
        {`, ${avis.store}`}
      </Ink>
    </View>
  );
}

/** Rangee d'avis qui defile seule (accroche) */
/** Carte d'avis basse pour les petits ecrans (vague 31) : etoiles et pseudo sur une ligne, l'avis sur deux */
function AvisCarteCompacte({ avis, width }: { avis: Avis; width: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ width, height: 66, borderRadius: 14, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, paddingHorizontal: 12, paddingVertical: 8, gap: 3 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Etoiles size={10} />
        <Ink size={10.5} weight="bold" color={c.textMuted} numberOfLines={1} style={{ flex: 1 }}>
          <Ink size={10.5} weight="extraBold" color={c.textSecondary}>{avis.pseudo}</Ink>
          {`, ${avis.store}`}
        </Ink>
      </View>
      <Ink size={12} color={c.ink} numberOfLines={2} style={{ lineHeight: 16 }}>{`« ${avis.texte} »`}</Ink>
    </View>
  );
}

export function AvisDefilants({ paused, compact = false, draggable = false }: { paused?: boolean; compact?: boolean; draggable?: boolean }) {
  return (
    <View style={{ overflow: 'hidden' }} accessible accessibilityLabel={traduire("{0} avis de l’App Store", AVIS.length)}>
      <Defilement speed={26} paused={paused} start={0.15} draggable={draggable}>
        {AVIS.map((a) =>
          compact ? (
            <AvisCarteCompacte key={a.pseudo} avis={a} width={276} />
          ) : (
            <View key={a.pseudo} style={{ height: 112 }}>
              <AvisCarte avis={a} width={248} lines={3} />
            </View>
          ),
        )}
      </Defilement>
    </View>
  );
}

/** Cartes d'avis qu'on fait glisser du doigt (paywall) */
export function AvisGlissables({ gutter }: { gutter: number }) {
  const W = 252;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={W + 10}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: gutter, gap: 10 }}
      style={{ marginHorizontal: -gutter, flexGrow: 0 }}
    >
      {AVIS.map((a) => (
        <View key={a.pseudo} style={{ height: 124 }}>
          <AvisCarte avis={a} width={W} lines={4} />
        </View>
      ))}
    </ScrollView>
  );
}

/**
 * Deux avis reels, les plus courts de lib/v2/premium/avis.ts, cote a cote (paywall, sous la note).
 * Pas de carrousel : deux phrases qui se lisent d'un coup d'oeil.
 */
export function AvisCourts({ nombre = 2 }: { nombre?: number }) {
  const choisis = [...AVIS].sort((a, b) => a.texte.length - b.texte.length).slice(0, nombre);
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }} accessible accessibilityLabel={choisis.map((a) => `${a.texte}, ${a.pseudo}, ${a.store}`).join('. ')}>
      {choisis.map((a) => (
        <AvisCarte key={a.pseudo} avis={a} lines={4} />
      ))}
    </View>
  );
}
