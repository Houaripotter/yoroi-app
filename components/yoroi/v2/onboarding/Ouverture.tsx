/**
 * Ecran 1, l'ouverture : le chateau sous la lune couvre tout l'ecran (fond d'epoque vertical),
 * les pieces d'armure se posent sur le guerrier (Ashigaru jusqu'a Shogun), une lumiere doree passe,
 * le logo s'allume, vibration a la fin. La nuit monte en bas sous le texte blanc et les boutons.
 * Vague 27 : la promesse et les boutons sont la des la premiere image (aucune animation d'entree sur eux,
 * qui pouvait les laisser invisibles) ; l'armure se revele en environ 1,6 seconde. Aucune ecriture japonaise.
 */
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StatusBar, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { tap } from '@/components/yoroi/v2/accueil/kit';
import { guerrierSerie } from '@/components/yoroi/v2/espace/assets';
import { FONDS } from '@/components/yoroi/v2/fonds/FondEpoque';
import { GUTTER, MainButton, RoundIcon } from './ui';

const SCENE = FONDS.chateau;
const LOGO = require('@/assets/logo d\'app/yoroi-logo2.png');

function ArmourPiece({ index, phase, source, size }: { index: number; phase: { value: number }; source: number; size: { w: number; h: number } }) {
  const style = useAnimatedStyle(() => {
    const p = phase.value;
    const opacity = index === 4 ? interpolate(p, [3, 4], [0, 1], 'clamp') : index === 0 ? interpolate(p, [0, 1], [1, 0], 'clamp') : interpolate(p, [index - 1, index, index + 1], [0, 1, 0], 'clamp');
    return { opacity };
  });
  return <Animated.Image source={source} resizeMode="contain" style={[{ position: 'absolute', bottom: 0, alignSelf: 'center', width: size.w, height: size.h }, style]} />;
}

export function Ouverture({
  genre,
  onStart,
  onRestore,
  restoring,
  onOpenTerms,
  onOpenPrivacy,
  onClose,
}: {
  genre: 'h' | 'f';
  onStart: () => void;
  onRestore: () => void;
  restoring: boolean;
  onOpenTerms?: () => void;
  onOpenPrivacy: () => void;
  onClose?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sceneH = Math.round(Math.min(height * (height < 720 ? 0.4 : 0.5), 470));
  const hero = { w: Math.round(Math.min(width * 0.66, 270)), h: Math.round(Math.min(sceneH * 0.86, 360)) };

  const scene = useSharedValue(0);
  const phase = useSharedValue(0);
  const settle = useSharedValue(0);
  const sweep = useSharedValue(0);
  const logo = useSharedValue(0);
  const buzzed = useRef(false);

  useEffect(() => {
    scene.value = withTiming(1, { duration: 350, easing: Easing.out(Easing.cubic) });
    phase.value = withDelay(250, withTiming(4, { duration: 1000, easing: Easing.inOut(Easing.quad) }));
    settle.value = withDelay(250, withSequence(withTiming(1, { duration: 220 }), withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) })));
    sweep.value = withDelay(1150, withTiming(1, { duration: 500, easing: Easing.inOut(Easing.quad) }));
    logo.value = withDelay(1250, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    const t1 = setTimeout(() => tap('light'), 600);
    const t2 = setTimeout(() => tap('light'), 1000);
    const t3 = setTimeout(() => {
      if (!buzzed.current) {
        buzzed.current = true;
        tap('success');
      }
    }, 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [scene, phase, settle, sweep, logo]);

  const sceneStyle = useAnimatedStyle(() => ({ opacity: interpolate(scene.value, [0, 1], [0.35, 1]), transform: [{ scale: interpolate(scene.value, [0, 1], [1.06, 1]) }] }));
  const heroStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scene.value, [0.3, 1], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(scene.value, [0, 1], [24, 0]) + settle.value * 6 }],
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sweep.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-width, width]) }, { rotate: '18deg' }],
  }));
  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.value, transform: [{ scale: interpolate(logo.value, [0, 1], [0.7, 1]) }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: interpolate(logo.value, [0, 0.6, 1], [0, 0.9, 0.55]), transform: [{ scale: interpolate(logo.value, [0, 1], [0.6, 1.25]) }] }));

  const serie = guerrierSerie(genre);

  return (
    <View style={{ flex: 1, backgroundColor: '#141A2B' }}>
      <StatusBar barStyle="light-content" />
      {/* le chateau sous la lune, plein ecran, la nuit monte en bas sous le texte */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, sceneStyle]}>
        <Image source={SCENE} resizeMode="cover" style={{ width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
        <LinearGradient
          colors={['rgba(16,20,34,0.5)', 'rgba(16,20,34,0)', 'rgba(16,20,34,0.2)', 'rgba(16,20,34,0.86)', 'rgba(16,20,34,0.96)']}
          locations={[0, 0.18, 0.42, 0.66, 1]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </Animated.View>
      <View style={{ height: sceneH + insets.top, overflow: 'hidden' }}>
        <Animated.View style={[{ position: 'absolute', bottom: 4, left: 0, right: 0, height: hero.h }, heroStyle]} accessible accessibilityLabel="Le guerrier revêt son armure">
          {serie.map((src, i) => (
            <ArmourPiece key={i} index={i} phase={phase} source={src as number} size={hero} />
          ))}
        </Animated.View>
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -height * 0.2, bottom: -height * 0.2, width: 120, left: width / 2 - 60 }, sweepStyle]}>
          <LinearGradient start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} colors={['rgba(227,196,123,0)', 'rgba(227,196,123,0.55)', 'rgba(255,244,214,0.85)', 'rgba(227,196,123,0.55)', 'rgba(227,196,123,0)']} style={{ flex: 1 }} />
        </Animated.View>
        <View style={{ position: 'absolute', top: insets.top + 12, left: GUTTER, right: GUTTER, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: '#E3C47B' }, glowStyle]} />
            <Animated.Image source={LOGO} style={[{ width: 42, height: 42, borderRadius: 12 }, logoStyle]} accessibilityLabel="YOROI" />
          </View>
          <Animated.View style={[{ marginLeft: 10 }, logoStyle]}>
            <Ink size={20} weight="black" color="#FFFFFF" style={{ letterSpacing: 3 }}>YOROI</Ink>
          </Animated.View>
          <View style={{ flex: 1 }} />
          {onClose ? <RoundIcon name="close" label="Fermer l’aperçu" onPress={onClose} /> : null}
        </View>
      </View>

      <View style={{ flex: 1, paddingHorizontal: GUTTER, justifyContent: 'space-between', paddingBottom: insets.bottom + 10 }}>
        <View style={{ gap: 8, marginTop: 4 }}>
          <Ink size={30} weight="black" tight color="#FFFFFF" style={{ lineHeight: 35 }} accessibilityRole="header">Ton poids. Tes séances. Ton armure.</Ink>
          <Ink size={16} weight="medium" color="rgba(255,255,255,0.88)" style={{ lineHeight: 22 }}>Tout ton suivi au même endroit. Chaque séance te rend plus fort, YOROI te le montre.</Ink>
        </View>
        <View style={{ gap: 2 }}>
          <MainButton label="Commencer" onPress={onStart} />
          <Pressable onPress={restoring ? undefined : onRestore} accessibilityRole="button" accessibilityLabel="J’ai déjà une sauvegarde" style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {restoring ? <ActivityIndicator color="#FFFFFF" /> : <Icon name="restore" size={18} color="#FFFFFF" />}
            <Ink size={15} weight="bold" color="#FFFFFF">{restoring ? 'Restauration en cours' : 'J’ai déjà une sauvegarde'}</Ink>
          </Pressable>
          <Ink size={12} color="rgba(255,255,255,0.72)" style={{ textAlign: 'center', lineHeight: 17 }}>
            {Platform.OS === 'ios' && onOpenTerms ? 'En continuant, tu confirmes avoir 13 ans ou plus et tu acceptes les conditions d’utilisation.' : 'En continuant, tu confirmes avoir 13 ans ou plus.'}
          </Ink>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
            {Platform.OS === 'ios' && onOpenTerms ? (
              <Pressable onPress={onOpenTerms} accessibilityRole="link" accessibilityLabel="Conditions d’utilisation" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}>
                <Ink size={13} weight="bold" color="#E3C47B" style={{ textDecorationLine: 'underline' }}>Conditions</Ink>
              </Pressable>
            ) : null}
            <Pressable onPress={onOpenPrivacy} accessibilityRole="link" accessibilityLabel="Confidentialité" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}>
              <Ink size={13} weight="bold" color="#E3C47B" style={{ textDecorationLine: 'underline' }}>Confidentialité</Ink>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default Ouverture;
