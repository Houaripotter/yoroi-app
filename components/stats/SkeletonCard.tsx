// ============================================
// SKELETON CARD + LOADING STATE
// ============================================

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface SkeletonCardProps {
  height?: number;
  width?: number | string;
  borderRadius?: number;
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
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.0] });
  const baseColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.13)';

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { height, width: width as any, borderRadius, marginBottom, backgroundColor: baseColor, opacity },
      ]}
    />
  );
};

export const SkeletonCard = React.memo(SkeletonCardInner);

const LOADING_MESSAGES = [
  'On récupère tes données...',
  'Presque prêt...',
  'On prépare tes stats...',
  'Tes données arrivent...',
];

export const SkeletonMessage: React.FC<{ message?: string }> = React.memo(({ message }) => {
  const { colors } = useTheme();
  const msg = message ?? LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
  return (
    <Text style={[styles.loadingMessage, { color: colors.textMuted ?? colors.textSecondary }]}>
      {msg}
    </Text>
  );
});

interface SkeletonGridProps {
  count?: number;
  cardHeight?: number;
  message?: string;
  icon?: React.FC<any>;
  iconColor?: string;
  label?: string;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = React.memo(({ message }) => {
  const { colors } = useTheme();
  const msgRef = useRef(
    message ?? LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]
  );

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={[styles.loadingMessage, { color: colors.textMuted ?? colors.textSecondary }]}>
        {msgRef.current}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingBottom: 80,
  },
  loadingMessage: {
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 32,
    opacity: 0.6,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
