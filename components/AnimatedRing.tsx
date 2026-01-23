import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface AnimatedRingProps {
  progress?: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}

const AnimatedRing = ({
  progress = 0.75,
  size = 100,
  strokeWidth = 10,
  color = '#4CAF50',
  backgroundColor = 'rgba(255,255,255,0.1)',
}: AnimatedRingProps) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 1500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false, // REQUIS: anime strokeDashoffset (propriété SVG non supportée par native driver)
    }).start();
  }, [progress]);

  // OPTIMISATION: Mémoiser l'interpolation
  const strokeDashoffset = useMemo(() => animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  }), [animatedProgress, circumference]);

  // Créer un composant animé pour le Circle
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated progress circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// OPTIMISATION #58: Mémoiser le composant
export default React.memo(AnimatedRing, (prevProps, nextProps) => {
  return prevProps.progress === nextProps.progress &&
         prevProps.size === nextProps.size &&
         prevProps.strokeWidth === nextProps.strokeWidth &&
         prevProps.color === nextProps.color &&
         prevProps.backgroundColor === nextProps.backgroundColor;
});
