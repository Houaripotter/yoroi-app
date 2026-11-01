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
 * Images (1er novembre 2026) : assets/scenes/chargement/. La scene est ENTIERE, en paysage 1290 x 720
 * (sc15 depuis la source brute 2752 x 1536, sc19 depuis la scene 1200 x 670), posee en largeur pleine au
 * tiers bas, bords haut et bas fondus dans l'alpha du webp. Le fond *_fond.webp (590 x 1278) la prolonge :
 * la meme scene etiree et tres floutee, fondue vers la couleur du ciel en haut et du sol en bas. Le flou est
 * calcule a l'avance (sharp/PIL), il rend donc pareil sur iOS et Android sans aucun calcul au lancement.
 * Un lent zoom (1 a 1,04) anime la scene pendant l'attente. Script : _propositions/chargement_v2_2026-11-01/.
 * Avant : un recadrage portrait 1500 x 2500 trop zoome, archive dans _archive_ancien_design_2026-10-09/
 * chargement_2026-11-01/ ; avant le 31 octobre, l'allee des cerisiers (chargement_2026-10-31/).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { traduire } from '@/lib/i18n/tr';

/** Doit rester identique a app.json (plugin expo-splash-screen) : meme fond, meme image, meme largeur */
export const SPLASH_BG = '#F2F1EC';
export const SPLASH_IMAGE = require('@/assets/images/splash-yoroi.png');
export const SPLASH_IMAGE_WIDTH = 200;

/** 31 octobre 2026 : la Corniche le jour, la Corniche a l'heure bleue la nuit */
const SCENE_JOUR = require('@/assets/scenes/chargement/corniche_monument.webp');
const SCENE_NUIT = require('@/assets/scenes/chargement/corniche_heure_bleue.webp');
const FOND_JOUR = require('@/assets/scenes/chargement/corniche_monument_fond.webp');
const FOND_NUIT = require('@/assets/scenes/chargement/corniche_heure_bleue_fond.webp');
/** Hauteur / largeur de la scene (1290 x 720) */
const SCENE_RATIO = 720 / 1290;
/** Haut de la scene en fraction de la hauteur d'ecran : la meme valeur a servi a calculer le fond flou */
const SCENE_HAUT = 0.68;
/** Le nom, le trait et la phrase finissent a environ 150 points sous le centre de l'ecran */
const SOUS_LE_NOM = 150;
const KEN_BURNS_MS = 8000;
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
  const kb = useSharedValue(0);
  useEffect(() => {
    // un zoom tres lent et a peine visible, rejoue a chaque affichage
    kb.value = withTiming(1, { duration: KEN_BURNS_MS, easing: Easing.out(Easing.quad) });
    if (!skip) {
      fond.value = withDelay(120, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
      word.value = withDelay(380, withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }));
    }
    return () => {
      cancelAnimation(fond);
      cancelAnimation(word);
      cancelAnimation(kb);
    };
  }, [fond, word, kb, skip]);
  const fondStyle = useAnimatedStyle(() => ({ opacity: fond.value, transform: [{ scale: 1 + 0.04 * kb.value }] }));

  // taille reelle de l'ecran d'attente (plein ecran, ou boite d'apercu du studio)
  const win = useWindowDimensions();
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const W = box?.w ?? win.width;
  const H = box?.h ?? win.height;
  const sceneH = W * SCENE_RATIO;
  // tiers bas, sous le nom ; sur un petit ecran on garde au moins 12 points de sol dessous
  const sceneTop = Math.max(0, Math.min(Math.max(H * SCENE_HAUT, H / 2 + SOUS_LE_NOM), H - sceneH - 12));
  // fige au montage : l'image ne change pas pendant l'attente
  const nuit = useMemo(() => estNuitChargement(), []);
  const wordStyle = useAnimatedStyle(() => ({ opacity: word.value, transform: [{ translateY: (1 - word.value) * 8 }] }));

  const msg = (message ?? '').replace(/\s*(\.\.\.|…)\s*$/, '');

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_BG }]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0 && (width !== box?.w || height !== box?.h)) setBox({ w: width, h: height });
      }}
      accessibilityLabel={traduire("YOROI se charge")} accessibilityRole="progressbar">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fondStyle]}>
        {/* le prolongement flou de la scene, etire sur tout l'ecran (le flou cache l'etirement) */}
        <Image source={nuit ? FOND_NUIT : FOND_JOUR} style={StyleSheet.absoluteFill} resizeMode="stretch" fadeDuration={0} accessibilityIgnoresInvertColors />
        {/* la scene entiere, en largeur pleine, bords fondus dans le fond */}
        <Image source={nuit ? SCENE_NUIT : SCENE_JOUR} style={{ position: 'absolute', left: 0, top: sceneTop, width: W, height: sceneH }} resizeMode="stretch" fadeDuration={0} accessibilityIgnoresInvertColors />
      </Animated.View>
      {/* une ombre ronde et douce sous le nom YOROI : lisible sur le ciel, sans bande sur l'ecran */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fondStyle]}>
        <Svg width={W} height={H}>
          <Defs>
            <RadialGradient id="haloNom" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor="#0C0E18" stopOpacity={0.26} />
              <Stop offset="0.6" stopColor="#0C0E18" stopOpacity={0.1} />
              <Stop offset="1" stopColor="#0C0E18" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={W / 2} cy={H / 2 + 84} rx={190} ry={72} fill="url(#haloNom)" />
        </Svg>
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
