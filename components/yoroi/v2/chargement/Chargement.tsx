/**
 * Chargement YOROI (vague 18) : un seul langage pour tout ce qui attend.
 *
 * - EcranChargement : l'ecran de lancement et les attentes plein ecran. Il reprend exactement
 *   le splash natif (papier de riz #F2F1EC, embleme a la meme taille et a la meme place), puis
 *   l'allee des cerisiers apparait doucement derriere, le nom YOROI se pose, un trait d'encre
 *   indigo se dessine dessous et quelques petales tombent lentement. Aucune attente ajoutee :
 *   l'ecran disparait des que l'app est prete. Les animations tournent sur le fil d'interface
 *   (reanimated), elles ne retardent pas le demarrage.
 * - ChargementPetit : l'indicateur assorti pour l'interieur des pages (un cercle d'encre ensō
 *   qui tourne), a la place d'ActivityIndicator.
 * - ChargementBloc : ChargementPetit centre avec une phrase optionnelle, pour une zone de page.
 *
 * Fonctionne hors des fournisseurs de theme (ecran de lancement) : couleurs de repli fixes.
 */
import React, { useEffect, useMemo } from 'react';
import { Image, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { FondEpoque } from '@/components/yoroi/v2/fonds/FondEpoque';
import { traduire } from '@/lib/i18n/tr';

/** Doit rester identique a app.json (plugin expo-splash-screen) : meme fond, meme image, meme largeur */
export const SPLASH_BG = '#F2F1EC';
export const SPLASH_IMAGE = require('@/assets/images/splash-yoroi.png');
export const SPLASH_IMAGE_WIDTH = 200;

const INK = '#1D2029';
const MUTED = '#4A4E5A';

/** Premier affichage de l'ecran de chargement dans cette session : l'introduction ne se rejoue pas
 *  quand un second ecran d'attente prend le relais (racine, puis aiguillage de l'accueil). */
let firstShownAt = 0;
const INTRO_MS = 1400;

/* ============ Petales ============ */

const PETALES = [
  { x: 0.12, size: 13, delay: 200, dur: 9800, sway: 26, rot: 0.9, color: '#F3B4C4' },
  { x: 0.78, size: 11, delay: 900, dur: 11200, sway: 20, rot: -0.7, color: '#EFA6BA' },
  { x: 0.42, size: 15, delay: 1700, dur: 10400, sway: 30, rot: 1.1, color: '#F6C3D0' },
  { x: 0.9, size: 12, delay: 2600, dur: 12000, sway: 22, rot: 0.8, color: '#F3B4C4' },
  { x: 0.26, size: 10, delay: 3400, dur: 10900, sway: 18, rot: -1, color: '#EFA6BA' },
  { x: 0.6, size: 14, delay: 4300, dur: 9600, sway: 28, rot: 0.6, color: '#F6C3D0' },
  { x: 0.05, size: 11, delay: 5200, dur: 11600, sway: 20, rot: -0.8, color: '#F3B4C4' },
];

function Petale({ W, H, p }: { W: number; H: number; p: (typeof PETALES)[number] }) {
  const fall = useSharedValue(0);
  const sway = useSharedValue(0);
  useEffect(() => {
    fall.value = withDelay(p.delay, withRepeat(withTiming(1, { duration: p.dur, easing: Easing.linear }), -1, false));
    sway.value = withRepeat(withTiming(1, { duration: p.dur / 3, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(fall);
      cancelAnimation(sway);
    };
  }, [fall, sway, p]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(fall.value, [0, 0.06, 0.85, 1], [0, 0.85, 0.85, 0]),
    transform: [
      { translateX: p.x * W + (sway.value - 0.5) * p.sway * 2 },
      { translateY: -30 + fall.value * (H + 60) },
      { rotate: `${(sway.value - 0.5) * 50 + fall.value * p.rot * 360}deg` },
    ],
  }));
  return (
    <Animated.View style={[styles.petal, style]}>
      <Svg width={p.size} height={p.size * 1.15} viewBox="0 0 20 23">
        <Path d="M8 1.5 L10 4 L12 1.5 C17 5 18.5 13 10 22 C1.5 13 3 5 8 1.5 Z" fill={p.color} />
        <Path d="M10 6 C10.4 11 10.4 15 10 19" stroke="#E08AA3" strokeWidth={0.9} strokeLinecap="round" fill="none" opacity={0.6} />
      </Svg>
    </Animated.View>
  );
}

function Petales() {
  const { width, height } = useWindowDimensions();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PETALES.map((p, i) => (
        <Petale key={i} W={width} H={height} p={p} />
      ))}
    </View>
  );
}

/* ============ Trait d'encre ============ */

function TraitEncre({ color, width = 132, delay, skip }: { color: string; width?: number; delay: number; skip: boolean }) {
  const w = useSharedValue(skip ? width : 0);
  useEffect(() => {
    if (!skip) w.value = withDelay(delay, withTiming(width, { duration: 750, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(w);
  }, [w, width, delay, skip]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View style={[{ height: 12, overflow: 'hidden' }, style]}>
      <Svg width={width} height={12} viewBox="0 0 132 12">
        {/* un coup de pinceau : appuye au depart, qui s'affine en sortant */}
        <Path d="M2 6.5 C 20 2.5, 60 3.2, 128 5.6 C 129.5 5.8, 129.5 6.6, 128 6.8 C 80 8.2, 36 9.6, 4 9.4 C 1 9.3, 0.4 6.9, 2 6.5 Z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

/* ============ Ecran de chargement ============ */

export function EcranChargement({ message }: { message?: string }) {
  const { theme } = useYoroiTheme();
  const accent = theme.colors.accent;
  const skip = useMemo(() => {
    const now = Date.now();
    if (!firstShownAt) firstShownAt = now;
    return now - firstShownAt > INTRO_MS;
  }, []);

  const fond = useSharedValue(skip ? 1 : 0);
  const word = useSharedValue(skip ? 1 : 0);
  useEffect(() => {
    if (!skip) {
      fond.value = withDelay(120, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
      word.value = withDelay(380, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
    }
    return () => {
      cancelAnimation(fond);
      cancelAnimation(word);
    };
  }, [fond, word, skip]);
  const fondStyle = useAnimatedStyle(() => ({ opacity: fond.value }));
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 8 }] }));

  const msg = (message ?? '').replace(/\s*(\.\.\.|…)\s*$/, '');

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_BG }]} accessibilityLabel={traduire("YOROI se charge")} accessibilityRole="progressbar">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fondStyle]}>
        <FondEpoque fond="sakura" voile="leger" />
        {/* une bande de papier plus claire au centre : l'embleme reste net sur l'allee */}
        <LinearGradient
          colors={['rgba(242,241,236,0)', 'rgba(242,241,236,0.72)', 'rgba(242,241,236,0.72)', 'rgba(242,241,236,0)']}
          locations={[0.22, 0.4, 0.66, 0.86]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Petales />

      {/* embleme : meme taille et meme place que le splash natif (centre exact de l'ecran) */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <View style={{ width: SPLASH_IMAGE_WIDTH, height: SPLASH_IMAGE_WIDTH }}>
          <Image source={SPLASH_IMAGE} style={{ width: SPLASH_IMAGE_WIDTH, height: SPLASH_IMAGE_WIDTH }} resizeMode="contain" fadeDuration={0} accessibilityIgnoresInvertColors />
          <Animated.View style={[styles.wordWrap, wordStyle]}>
            <Text allowFontScaling={false} style={styles.word}>YOROI</Text>
            <TraitEncre color={accent} delay={skip ? 0 : 620} skip={skip} />
            {msg ? (
              <Text allowFontScaling={false} style={styles.msg}>{msg}</Text>
            ) : null}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

/* ============ Petit indicateur ============ */

/** Cercle d'encre ensō qui tourne lentement, a la place d'ActivityIndicator */
export function ChargementPetit({ size = 28, color, style }: { size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const col = color ?? theme.colors.accent;
  const turn = useSharedValue(0);
  useEffect(() => {
    turn.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(turn);
  }, [turn]);
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));
  const sw = Math.max(2.5, size * 0.12);
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityRole="progressbar" accessibilityLabel={traduire("Chargement")}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeOpacity={0.14} strokeWidth={sw} fill="none" />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, spin]}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={sw} strokeLinecap="round" fill="none" strokeDasharray={`${circ * 0.68} ${circ}`} />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={sw * 0.55} strokeLinecap="round" fill="none" strokeDasharray={`${circ * 0.82} ${circ}`} opacity={0.45} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Zone d'attente dans une page : l'indicateur centre, avec une phrase courte si utile */
export function ChargementBloc({ message, size = 30, color, style }: { message?: string; size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 28 }, style]}>
      <ChargementPetit size={size} color={color} />
      {message ? (
        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary, textAlign: 'center' }}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  petal: { position: 'absolute', left: 0, top: 0 },
  wordWrap: { position: 'absolute', left: -60, right: -60, top: SPLASH_IMAGE_WIDTH * 0.84, alignItems: 'center', gap: 6 },
  word: { fontSize: 26, fontWeight: '900', letterSpacing: 9, color: INK, marginLeft: 9 },
  msg: { fontSize: 14, fontWeight: '600', color: MUTED, marginTop: 6, textAlign: 'center' },
});

export default EcranChargement;
