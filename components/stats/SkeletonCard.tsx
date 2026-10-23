// ============================================
// Squelette de chargement + etat de chargement (refonte v2)
// API inchangee : SkeletonCard, SkeletonMessage, SkeletonGrid.
// ============================================

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';

interface SkeletonCardProps {
  height?: number;
  width?: number | string;
  borderRadius?: number;
  marginBottom?: number;
}

const SkeletonCardInner: React.FC<SkeletonCardProps> = ({
  height = 120,
  width = '100%',
  borderRadius = 24,
  marginBottom = 8,
}) => {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);

  const anim = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { height, width: width as any, borderRadius, marginBottom, backgroundColor: c.fillSoft, borderColor: c.divider },
        anim,
      ]}
    >
      <View style={[styles.line, { backgroundColor: c.fillSubtle, width: '42%' }]} />
      {height > 70 ? <View style={[styles.line, { backgroundColor: c.fillSubtle, width: '68%', height: 18, marginTop: 10 }]} /> : null}
    </Animated.View>
  );
};

export const SkeletonCard = React.memo(SkeletonCardInner);

const LOADING_MESSAGES = [
  'On récupère tes données',
  'Presque prêt',
  'On prépare tes chiffres',
  'Tes données arrivent',
];

export const SkeletonMessage: React.FC<{ message?: string }> = React.memo(({ message }) => {
  const { theme } = useYoroiTheme();
  const msgRef = useRef(message ?? LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
  return (
    <Ink size={14} weight="bold" color={theme.colors.textMuted} style={styles.loadingMessage}>
      {message ?? msgRef.current}
    </Ink>
  );
});

/** Plaque kozane qui se lace l'une apres l'autre */
function LacingPlate({ index }: { index: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const v = useSharedValue(0.25);
  useEffect(() => {
    v.value = withDelay(
      index * 180,
      withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(0.25, { duration: 620 })), -1, false),
    );
  }, [index, v]);
  const anim = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 4 }] }));
  return (
    <Animated.View style={anim}>
      <Svg width={26} height={33} viewBox="0 0 52 66">
        <Path d="M5 12 Q5 4 13 4 H39 Q47 4 47 12 V62 H5 Z" fill={c.ink} />
        <Rect x={0} y={30} width={52} height={5} fill={c.accent} />
        <Rect x={0} y={46} width={52} height={5} fill={c.accent} />
        <Circle cx={16} cy={20} r={2.2} fill={c.gold} />
        <Circle cx={36} cy={20} r={2.2} fill={c.gold} />
      </Svg>
    </Animated.View>
  );
}

interface SkeletonGridProps {
  count?: number;
  cardHeight?: number;
  message?: string;
  icon?: React.FC<any>;
  iconColor?: string;
  label?: string;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = React.memo(({ message }) => {
  const { theme } = useYoroiTheme();
  const msgRef = useRef(message ?? LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);

  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={msgRef.current}>
      <View style={styles.plates}>
        {[0, 1, 2, 3, 4].map((i) => (
          <LacingPlate key={i} index={i} />
        ))}
      </View>
      <Ink size={14} weight="bold" color={theme.colors.textMuted} style={styles.loadingMessage}>
        {msgRef.current}
      </Ink>
    </View>
  );
});

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
    borderWidth: 1,
    padding: 18,
  },
  line: {
    height: 10,
    borderRadius: 6,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingBottom: 80,
    minHeight: 200,
  },
  plates: {
    flexDirection: 'row',
    gap: 3,
  },
  loadingMessage: {
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
