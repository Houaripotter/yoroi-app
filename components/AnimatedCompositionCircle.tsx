import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

interface AnimatedCompositionCircleProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  size?: number;
}

export const AnimatedCompositionCircle: React.FC<AnimatedCompositionCircleProps> = ({
  value,
  max,
  label,
  unit,
  color,
  size = 50,
}) => {
  const { colors } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [animatedProgress, setAnimatedProgress] = useState(0);

  const radius = size / 2 - 6;
  const centerX = size / 2;
  const centerY = size / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, (value / max) * 100);

  useEffect(() => {
    // Animation de rotation du cercle (0% à X%)
    Animated.spring(progressAnim, {
      toValue: progress / 100,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();

    const listener = progressAnim.addListener(({ value }) => {
      setAnimatedProgress(value);
    });

    return () => {
      progressAnim.removeListener(listener);
    };
  }, [progress]);

  const strokeDashoffset = circumference - (animatedProgress * circumference);
  const bgColor = `${color}20`;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Cercle de fond */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth="4"
        />
        
        {/* Cercle de progression animé */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${centerX} ${centerY})`}
        />
      </Svg>
      
      {/* Texte au centre */}
      <View style={[styles.textContainer, { width: size, height: size }]}>
        <Text style={[styles.value, { color }]}>
          {value.toFixed(1)}
        </Text>
        <Text style={[styles.unit, { color: colors.textMuted }]}>
          {unit}
        </Text>
      </View>
      
      {/* Label en dessous */}
      <Text style={[styles.label, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 12,
    fontWeight: '900',
  },
  unit: {
    fontSize: 8,
    fontWeight: '600',
  },
  label: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
});

