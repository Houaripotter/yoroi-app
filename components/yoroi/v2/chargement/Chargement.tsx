/**
 * Chargement YOROI (vague 18) : un seul langage pour tout ce qui attend.
 *
 * - EcranChargement : l'ecran de lancement et les attentes plein ecran. Il reprend exactement
 *   le splash natif (papier de riz #F2F1EC, embleme a la meme taille et a la meme place), puis
 *   la Corniche de Marseille apparait doucement derriere (31 octobre 2026, demande de Houari :
 *   « Corniche, le monument » de 7 h a 19 h, « Corniche à l'heure bleue » le reste du temps, heure
 *   locale), le nom YOROI se pose et un trait d'encre se dessine dessous. Aucune attente ajoutee :
 *   l'ecran disparait des que l'app est prete. Les animations tournent sur le fil d'interface
 *   (reanimated), elles ne retardent pas le demarrage.
 * - ChargementPetit : l'indicateur assorti pour l'interieur des pages (un cercle d'encre ensō
 *   qui tourne), a la place d'ActivityIndicator.
 * - ChargementBloc : ChargementPetit centre avec une phrase optionnelle, pour une zone de page.
 *
 * Fonctionne hors des fournisseurs de theme (ecran de lancement) : couleurs de repli fixes.
 *
 * Images : assets/scenes/chargement/, recadrees en portrait (1500 x 2500) depuis les scenes Marseille
 * (sc15 depuis la source brute 2752 x 1536, sc19 depuis la scene 1200 x 670, agrandies x2 et x4 par EDSR).
 * Avant le 31 octobre : l'allee des cerisiers (FondEpoque sakura) et les petales, archives dans
 * _archive_ancien_design_2026-10-09/chargement_2026-10-31/.
 */
import React, { useEffect, useMemo } from 'react';
import { Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { traduire } from '@/lib/i18n/tr';

/** Doit rester identique a app.json (plugin expo-splash-screen) : meme fond, meme image, meme largeur */
export const SPLASH_BG = '#F2F1EC';
export const SPLASH_IMAGE = require('@/assets/images/splash-yoroi.png');
export const SPLASH_IMAGE_WIDTH = 200;

/** 31 octobre 2026 : la Corniche le jour, la Corniche a l'heure bleue la nuit */
const SCENE_JOUR = require('@/assets/scenes/chargement/corniche_monument.webp');
const SCENE_NUIT = require('@/assets/scenes/chargement/corniche_heure_bleue.webp');
const HEURE_JOUR = 7;
const HEURE_NUIT = 19;

/** Vrai de 19 h a 7 h, heure locale du telephone */
export function estNuitChargement(d: Date = new Date()): boolean {
  const h = d.getHours();
  return h < HEURE_JOUR || h >= HEURE_NUIT;
}

const BLANC = '#FFFFFF';
const BLANC_DOUX = 'rgba(255,255,255,0.86)';

/** Premier affichage de l'ecran de chargement dans cette session : l'introduction ne se rejoue pas
 *  quand un second ecran d'attente prend le relais (racine, puis aiguillage de l'accueil). */
let firstShownAt = 0;
const INTRO_MS = 1400;

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
  // fige au montage : l'image ne change pas pendant l'attente
  const nuit = useMemo(() => estNuitChargement(), []);
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 8 }] }));

  const msg = (message ?? '').replace(/\s*(\.\.\.|…)\s*$/, '');

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_BG }]} accessibilityLabel={traduire("YOROI se charge")} accessibilityRole="progressbar">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fondStyle]}>
        <Image source={nuit ? SCENE_NUIT : SCENE_JOUR} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={0} accessibilityIgnoresInvertColors />
        {/* un voile tres leger au centre : le nom YOROI reste lisible sur la scene */}
        <LinearGradient
          colors={['rgba(12,14,24,0)', 'rgba(12,14,24,0.30)', 'rgba(12,14,24,0.30)', 'rgba(12,14,24,0)']}
          locations={[0.34, 0.47, 0.66, 0.8]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

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
  wordWrap: { position: 'absolute', left: -60, right: -60, top: SPLASH_IMAGE_WIDTH * 0.84, alignItems: 'center', gap: 6 },
  word: { fontSize: 26, fontWeight: '900', letterSpacing: 9, color: BLANC, marginLeft: 9, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  msg: { fontSize: 14, fontWeight: '600', color: BLANC_DOUX, marginTop: 6, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
});

export default EcranChargement;
