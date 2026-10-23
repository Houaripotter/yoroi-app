/**
 * Tampon YOROI : un sceau ancien a l'encre pressee, tire de la collection (./table).
 * Taille, legere inclinaison, et une apposition courte et sobre en option (le tampon descend et se pose).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { TAMPONS } from './table';
import type { TamponId } from './table';

export type TamponProps = {
  name: TamponId;
  size?: number;
  /** inclinaison en degres */
  rotate?: number;
  /** apposition courte a l'apparition */
  animate?: boolean;
  /** teinte de l'encre (par defaut celle de la collection : rouge pour records et victoires, indigo ailleurs) */
  ink?: string;
  /** false : pas encore obtenu, tampon tres estompe */
  earned?: boolean;
  style?: StyleProp<ViewStyle>;
  /** par defaut le nom du tampon ; null pour un tampon purement decoratif */
  accessibilityLabel?: string | null;
};

export function Tampon({ name, size = 56, rotate = -6, animate = false, ink, earned = true, style, accessibilityLabel }: TamponProps) {
  const def = TAMPONS[name] ?? TAMPONS.record;
  const scale = useRef(new Animated.Value(animate ? 1.35 : 1)).current;
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;

  useEffect(() => {
    if (!animate) return;
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 190, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [animate, scale, opacity]);

  const label = accessibilityLabel === null ? undefined : accessibilityLabel ?? def.nom;
  return (
    <Animated.View
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!label}
      style={[{ width: size, height: size, opacity: earned ? opacity : 0.22, transform: [{ scale }, { rotate: `${earned ? rotate : 0}deg` }] }, style]}
    >
      <Image source={def.src} style={[{ width: size, height: size }, ink ? { tintColor: ink } : null]} resizeMode="contain" accessibilityIgnoresInvertColors />
    </Animated.View>
  );
}

export default Tampon;
