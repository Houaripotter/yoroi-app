// ============================================
// RECOVERY CIRCLE - Style Whoop
// Grand cercle de récupération avec score coloré
// ============================================

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RecoveryCircleProps {
  score: number;
  label?: string;
  size?: number;
}

export const RecoveryCircle: React.FC<RecoveryCircleProps> = ({
  score,
  label = 'RÉCUPÉRATION',
  size = 240,
}) => {
  const STROKE_WIDTH = 16;
  const RADIUS = (size - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
  }, [score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  // Couleurs style Whoop: Vert 67-100%, Jaune 34-66%, Rouge 0-33%
  const getColor = (score: number) => {
    if (score >= 67) return '#16EC06';  // Vert Whoop
    if (score >= 34) return '#FFDE00';  // Jaune Whoop
    return '#FF0026';                    // Rouge Whoop
  };

  const getStatusText = (score: number) => {
    if (score >= 67) return 'Optimal';
    if (score >= 34) return 'Modéré';
    return 'Faible';
  };

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Cercle de fond */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />

        {/* Cercle de progression animé */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          stroke={getColor(score)}
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={CIRCUMFERENCE}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Contenu central */}
      <View style={styles.centerContent}>
        <Text style={[styles.percentage, { color: getColor(score) }]}>
          {Math.round(score)}%
        </Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.status, { color: getColor(score) }]}>
          {getStatusText(score)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  percentage: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginTop: 4,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
});
