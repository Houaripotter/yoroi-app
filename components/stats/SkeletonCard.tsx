// ============================================
// SKELETON CARD
// Placeholder shimmer pendant le chargement initial des stats.
// Plus pro qu'un spinner : l'utilisateur "voit" la structure venir.
// ============================================

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface SkeletonCardProps {
  /** Hauteur en px (défaut 120) */
  height?: number;
  /** Largeur en % ou px (défaut '100%') */
  width?: number | string;
  /** Border radius (défaut 16) */
  borderRadius?: number;
  /** Marge bas (défaut 8) */
  marginBottom?: number;
}

const SkeletonCardInner: React.FC<SkeletonCardProps> = ({
  height = 120,
  width = '100%',
  borderRadius = 16,
  marginBottom = 8,
}) => {
  const { isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.8] });
  const baseColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          height,
          width: width as any,
          borderRadius,
          marginBottom,
          backgroundColor: baseColor,
          opacity,
        },
      ]}
    />
  );
};

export const SkeletonCard = React.memo(SkeletonCardInner);

/** Grille de skeletons pour mimer la disposition Dashboard (12 cards 47% width) */
export const SkeletonGrid: React.FC<{ count?: number; cardHeight?: number }> = React.memo(
  ({ count = 8, cardHeight = 215 }) => {
    return (
      <View style={styles.grid}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} height={cardHeight} width="47%" />
        ))}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 8,
    marginTop: 8,
  },
});
