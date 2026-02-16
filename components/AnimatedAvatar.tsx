import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, ImageSourcePropType, Animated, Easing } from 'react-native';

interface AnimatedAvatarProps {
  source?: ImageSourcePropType;
  size?: number;
  children?: React.ReactNode;
}

const AnimatedAvatar = ({ source, size = 80, children }: AnimatedAvatarProps) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animation de respiration douce (scale 1 → 1.03)
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.03,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // Légère variation d'opacité pour effet vivant
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.92,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    breathingAnimation.start();
    glowAnimation.start();

    return () => {
      breathingAnimation.stop();
      glowAnimation.stop();
    };
  }, []);

  // ✅ FIX: borderRadius dynamique pour cercle parfait
  const dynamicBorderRadius = size / 2;

  return (
    <Animated.View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: dynamicBorderRadius,
          transform: [{ scale }],
          opacity,
        },
      ]}
    >
      {children ? (
        children
      ) : source ? (
        <Image
          source={source}
          style={[styles.avatar, { width: size, height: size, borderRadius: dynamicBorderRadius }]}
        />
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    borderRadius: 40,
    overflow: 'hidden',
  },
  avatar: {
    borderRadius: 40,
  },
});

export default AnimatedAvatar;
