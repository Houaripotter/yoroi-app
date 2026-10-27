/**
 * Scene du Dojo : la scene illustree choisie (Dojo, Nuit, Sakura, Matcha), le personnage
 * en grand qui respire doucement, et le rang dans un cartouche de verre au-dessus de lui
 * (jamais par-dessus le personnage).
 */
import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { P } from '@/components/yoroi/livePalette';
import { SceneAnimee } from '@/components/yoroi/v2/scenes/SceneAnimee';

/** Personnage qui respire : tres leger mouvement de haut en bas, en boucle. */
export function BreathingFigure({ source, width, height, label }: { source: ImageSourcePropType; width: number; height: number; label?: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withSequence(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.quad) })),
      -1,
    );
  }, [t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 * t.value }, { scale: 1 + 0.012 * t.value }],
  }));
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* ombre au sol */}
      <Svg width={width * 0.8} height={26} style={{ position: 'absolute', bottom: 2 }}>
        <Defs>
          <RadialGradient id="sol" cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor="#1D2029" stopOpacity={0.32} />
            <Stop offset="1" stopColor="#1D2029" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={(width * 0.8) / 2} cy={13} rx={(width * 0.8) / 2} ry={12} fill="url(#sol)" />
      </Svg>
      <Animated.View entering={ENTREE} style={[{ width, height }, style]}>
        <Image source={source} style={{ width, height }} resizeMode="contain" accessibilityLabel={label} />
      </Animated.View>
    </View>
  );
}

/** Scene illustree a coins arrondis, fondue vers le papier en bas. */
export function ScenePlate({
  scene,
  height,
  children,
  style,
  fade = true,
  animation = null,
}: {
  scene: ImageSourcePropType;
  height: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fade?: boolean;
  /** 18 octobre 2026 : identifiant de l'animation en code (scenes Voyages, lib/v2/espace/voyages.ts animationDeScene) */
  animation?: string | null;
}) {
  const [largeur, setLargeur] = useState(0);
  return (
    <View onLayout={animation ? (e) => setLargeur(e.nativeEvent.layout.width) : undefined} style={[{ height, borderRadius: 28, overflow: 'hidden', backgroundColor: P.washi }, style]}>
      {animation && largeur > 0 ? (
        <Animated.View entering={ENTREE} style={{ position: 'absolute', left: 0, top: 0 }}>
          <SceneAnimee key={animation} source={scene} scene={animation} width={largeur} height={height} />
        </Animated.View>
      ) : (
        <Animated.Image entering={ENTREE} source={scene} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
      )}
      {fade ? (
        <LinearGradient
          colors={['rgba(242,241,236,0)', 'rgba(242,241,236,0)', 'rgba(242,241,236,0.55)']}
          locations={[0, 0.72, 1]}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          pointerEvents="none"
        />
      ) : null}
      {children}
    </View>
  );
}

/** Cartouche de verre pose sur une scene. */
export function GlassTag({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        {
          // 27 octobre 2026 (maquette Pastel-Dojo) : etiquette blanche, rayon 16
          backgroundColor: P.white,
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 8,
          shadowColor: '#1D2029',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
