import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';

interface BodySilhouetteProps {
  highlightedZone?: 'waist' | 'chest' | 'hips' | 'shoulders' | 'neck' | 'biceps' | 'thighs' | 'calves';
  zoneColor?: string;
  width?: number;
  height?: number;
}

export const BodySilhouette: React.FC<BodySilhouetteProps> = ({
  highlightedZone,
  zoneColor = '#4ECDC4',
  width = 120,
  height = 200,
}) => {
  const baseColor = '#E5E7EB';
  const highlightOpacity = 0.7;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} viewBox="0 0 120 200">
        {/* TÊTE */}
        <Circle
          cx="60"
          cy="20"
          r="12"
          fill={highlightedZone === 'neck' ? zoneColor : baseColor}
          opacity={highlightedZone === 'neck' ? highlightOpacity : 1}
        />

        {/* COU */}
        <Path
          d="M 55 30 L 55 38 L 65 38 L 65 30"
          fill={highlightedZone === 'neck' ? zoneColor : baseColor}
          opacity={highlightedZone === 'neck' ? highlightOpacity : 1}
        />

        {/* ÉPAULES */}
        <Ellipse
          cx="60"
          cy="42"
          rx="22"
          ry="8"
          fill={highlightedZone === 'shoulders' ? zoneColor : baseColor}
          opacity={highlightedZone === 'shoulders' ? highlightOpacity : 1}
        />

        {/* POITRINE/THORAX */}
        <Path
          d="M 38 42 Q 35 55, 42 65 L 78 65 Q 85 55, 82 42 Z"
          fill={highlightedZone === 'chest' ? zoneColor : baseColor}
          opacity={highlightedZone === 'chest' ? highlightOpacity : 1}
        />

        {/* TAILLE */}
        <Path
          d="M 42 65 Q 40 75, 45 80 L 75 80 Q 80 75, 78 65 Z"
          fill={highlightedZone === 'waist' ? zoneColor : baseColor}
          opacity={highlightedZone === 'waist' ? highlightOpacity : 1}
        />

        {/* HANCHES */}
        <Path
          d="M 45 80 Q 38 90, 42 100 L 78 100 Q 82 90, 75 80 Z"
          fill={highlightedZone === 'hips' ? zoneColor : baseColor}
          opacity={highlightedZone === 'hips' ? highlightOpacity : 1}
        />

        {/* BRAS GAUCHE */}
        <Path
          d="M 38 45 Q 25 60, 20 75 Q 18 85, 22 95"
          stroke={highlightedZone === 'biceps' ? zoneColor : baseColor}
          strokeWidth="10"
          fill="none"
          opacity={highlightedZone === 'biceps' ? highlightOpacity : 1}
        />

        {/* BRAS DROIT */}
        <Path
          d="M 82 45 Q 95 60, 100 75 Q 102 85, 98 95"
          stroke={highlightedZone === 'biceps' ? zoneColor : baseColor}
          strokeWidth="10"
          fill="none"
          opacity={highlightedZone === 'biceps' ? highlightOpacity : 1}
        />

        {/* JAMBE GAUCHE */}
        <Path
          d="M 48 100 Q 46 130, 50 160 Q 52 175, 50 190"
          stroke={highlightedZone === 'thighs' || highlightedZone === 'calves' ? zoneColor : baseColor}
          strokeWidth="12"
          fill="none"
          opacity={highlightedZone === 'thighs' || highlightedZone === 'calves' ? highlightOpacity : 1}
        />

        {/* JAMBE DROITE */}
        <Path
          d="M 72 100 Q 74 130, 70 160 Q 68 175, 70 190"
          stroke={highlightedZone === 'thighs' || highlightedZone === 'calves' ? zoneColor : baseColor}
          strokeWidth="12"
          fill="none"
          opacity={highlightedZone === 'thighs' || highlightedZone === 'calves' ? highlightOpacity : 1}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
