import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Rect, Path, G } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);

interface AnimatedBatteryProps {
  percentage: number; // 0-100
  size?: number;
}

export const AnimatedBattery: React.FC<AnimatedBatteryProps> = ({
  percentage,
  size = 40,
}) => {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation de remplissage
    Animated.timing(fillAnim, {
      toValue: percentage / 100,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Animation pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation spark (éclair)
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(200),
        Animated.timing(sparkAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
      ])
    ).start();
  }, [percentage]);

  // Couleur selon le pourcentage
  const getColor = () => {
    if (percentage < 40) return '#EF4444'; // Rouge
    if (percentage < 80) return '#F97316'; // Orange
    return '#10B981'; // Vert
  };

  const color = getColor();

  // OPTIMISATION: Mémoiser l'interpolation
  const fillHeight = useMemo(() => fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  }), [fillAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <Svg width={size} height={size * 1.2} viewBox="0 0 40 48">
        {/* Tête de la batterie */}
        <Rect x="14" y="0" width="12" height="4" rx="2" fill={color} opacity={0.6} />

        {/* Corps de la batterie - contour */}
        <Rect x="4" y="4" width="32" height="40" rx="4" stroke={color} strokeWidth="2.5" fill="none" />

        {/* Remplissage de la batterie */}
        <Animated.View style={[styles.fillContainer, { height: fillHeight }]}>
          <Svg width="100%" height="100%" viewBox="0 0 32 40" style={styles.fillSvg}>
            <Rect x="0" y="0" width="32" height="40" rx="2" fill={color} opacity={0.9} />
            {/* Effet de brillance */}
            <Rect x="4" y="4" width="4" height="30" rx="2" fill="#FFFFFF" opacity={0.3} />
          </Svg>
        </Animated.View>

        {/* Éclair animé au centre */}
        <AnimatedG opacity={sparkAnim}>
          <Path
            d="M 22 16 L 16 24 L 20 24 L 18 32 L 24 24 L 20 24 Z"
            fill="#FFFFFF"
            stroke="#FFF"
            strokeWidth="0.5"
          />
        </AnimatedG>
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fillContainer: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 28,
    overflow: 'hidden',
    borderRadius: 2,
  },
  fillSvg: {
    position: 'absolute',
    bottom: 0,
  },
});
