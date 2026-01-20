// ============================================
// STRAIN GAUGE - Style Yoroi
// Jauge circulaire pour la charge d'entraînement (0-21)
// ============================================

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface StrainGaugeProps {
  strain: number; // 0-21
  label?: string;
  size?: number;
}

// Zones de strain Yoroi
const STRAIN_ZONES = [
  { min: 0, max: 9.9, label: 'Light', color: '#7BA1BB' },
  { min: 10, max: 13.9, label: 'Moderate', color: '#0093E7' },
  { min: 14, max: 17.9, label: 'Strenuous', color: '#FFDE00' },
  { min: 18, max: 21, label: 'All Out', color: '#FF0026' },
];

export const StrainGauge: React.FC<StrainGaugeProps> = ({
  strain,
  label = 'CHARGE',
  size = 200,
}) => {
  const STROKE_WIDTH = 14;
  const RADIUS = (size - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(strain / 21, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
  }, [strain]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  // Trouver la zone actuelle
  const getCurrentZone = (strain: number) => {
    return STRAIN_ZONES.find(zone => strain >= zone.min && strain <= zone.max) || STRAIN_ZONES[0];
  };

  const currentZone = getCurrentZone(strain);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Cercle de fond avec segments colorés */}
        {STRAIN_ZONES.map((zone, index) => {
          const startAngle = -90 + (zone.min / 21) * 360;
          const endAngle = -90 + (zone.max / 21) * 360;
          const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

          const startX = size / 2 + RADIUS * Math.cos((startAngle * Math.PI) / 180);
          const startY = size / 2 + RADIUS * Math.sin((startAngle * Math.PI) / 180);
          const endX = size / 2 + RADIUS * Math.cos((endAngle * Math.PI) / 180);
          const endY = size / 2 + RADIUS * Math.sin((endAngle * Math.PI) / 180);

          return (
            <Path
              key={index}
              d={`M ${startX} ${startY} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${endX} ${endY}`}
              stroke={zone.color}
              strokeWidth={STROKE_WIDTH * 0.3}
              fill="none"
              opacity={0.2}
            />
          );
        })}

        {/* Cercle de progression */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={RADIUS}
          stroke={currentZone.color}
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
        <Text style={[styles.value, { color: currentZone.color }]}>
          {strain.toFixed(1)}
        </Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.zone, { color: currentZone.color }]}>
          {currentZone.label}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  value: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  zone: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
});
