import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface AnimatedProgressBarProps {
  progress: number; // 0-100
  color?: string;
  height?: number;
}

const AnimatedProgressBar = ({ progress, color = '#FFB800', height = 8 }: AnimatedProgressBarProps) => {
  const width = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation au chargement
    // ✅ FIX PERF: useNativeDriver: false car width est une layout property
    Animated.timing(width, {
      toValue: progress,
      duration: 1500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // OPTIMISATION: Mémoiser l'interpolation
  const widthInterpolate = useMemo(() => width.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  }), [width]);

  return (
    <View style={[styles.container, { height }]}>
      <View style={[styles.background, { borderRadius: height / 2 }]}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: color, borderRadius: height / 2, width: widthInterpolate },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  background: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});

export default AnimatedProgressBar;
