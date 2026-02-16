import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface AnimatedSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

const AnimatedSparkline = ({
  data,
  width = 150,
  height = 50,
  color = '#4CAF50',
}: AnimatedSparklineProps) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 1500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false, // REQUIS: anime strokeDashoffset pour Path SVG (propriété SVG non supportée)
    }).start();
  }, []);

  // Créer le path SVG
  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const range = maxValue - minValue || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - minValue) / range) * height;
    return { x, y };
  });

  const pathD = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const pathLength = 500;
  const lastPoint = points[points.length - 1];

  // OPTIMISATION: Mémoiser l'interpolation
  const strokeDashoffset = useMemo(() => progress.interpolate({
    inputRange: [0, 1],
    outputRange: [pathLength, 0],
  }), [progress]);

  // Créer un composant animé pour le Path
  const AnimatedPath = Animated.createAnimatedComponent(Path);

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <AnimatedPath
          d={pathD}
          stroke={color}
          strokeWidth={2}
          fill="none"
          strokeDasharray={pathLength}
          strokeDashoffset={strokeDashoffset}
        />
        {/* Point final */}
        <Circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={color} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

// OPTIMISATION #58: Mémoiser le composant
export default React.memo(AnimatedSparkline, (prevProps, nextProps) => {
  return prevProps.data.length === nextProps.data.length &&
         prevProps.data.every((val, idx) => val === nextProps.data[idx]) &&
         prevProps.width === nextProps.width &&
         prevProps.height === nextProps.height &&
         prevProps.color === nextProps.color;
});
