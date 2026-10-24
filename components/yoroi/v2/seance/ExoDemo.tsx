/**
 * Animation legere d'un exercice (24 octobre 2026) : la position de depart et la position d'arrivee
 * s'enchainent en fondu, en boucle, comme dans les applis de musculation. Rien ne s'affiche tant que
 * l'exercice n'a pas ses deux images (lib/v2/programmes/demosArt.ts).
 * Carré par défaut (taille) ; avec largeur et hauteur, un bandeau large : le dessin reste carré, centré
 * sur le même fond papier que l'image, donc sans bord visible.
 */
import React, { useEffect } from 'react';
import { Image, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { demoDe } from '@/lib/v2/programmes/demos';
import { traduire } from '@/lib/i18n/tr';

const FONDU = 450;
const POSE = 700;
export const FOND_DEMO = '#F2F1EC';

export function ExoDemo({ nom, taille = 96, arrondi = 18, largeur, hauteur, bordure = true }: { nom: string; taille?: number; arrondi?: number; largeur?: number; hauteur?: number; bordure?: boolean }) {
  const { theme } = useYoroiTheme();
  const images = demoDe(nom);
  const b = useSharedValue(0);

  useEffect(() => {
    if (!images) return;
    // depart (pose), fondu vers l'arrivee, pose, fondu retour : un aller-retour d'environ 2,3 s
    b.value = withRepeat(
      withSequence(
        withDelay(POSE, withTiming(1, { duration: FONDU, easing: Easing.inOut(Easing.quad) })),
        withDelay(POSE, withTiming(0, { duration: FONDU, easing: Easing.inOut(Easing.quad) })),
      ),
      -1,
      false,
    );
  }, [images, b]);

  const styleB = useAnimatedStyle(() => ({ opacity: b.value }));

  if (!images) return null;
  const h = hauteur ?? taille;
  const w = largeur ?? h;
  const cote = Math.min(w, h);
  const img = { position: 'absolute' as const, left: (w - cote) / 2, top: (h - cote) / 2, width: cote, height: cote };
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={traduire('Animation de l’exercice {0}', traduire(nom))}
      style={{ width: w, height: h, borderRadius: arrondi, overflow: 'hidden', backgroundColor: FOND_DEMO, borderWidth: bordure ? 1 : 0, borderColor: theme.colors.divider }}
    >
      <Image source={images[0]} style={img} resizeMode="cover" />
      <Animated.Image source={images[1]} style={[img, styleB]} resizeMode="cover" />
    </View>
  );
}
