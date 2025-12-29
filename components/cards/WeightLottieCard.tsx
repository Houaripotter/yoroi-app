import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { TrendingDown, TrendingUp, Target } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scale, scaleModerate, getHistoryDays, getGridColumns } from '@/constants/responsive';

const { width: screenWidth } = Dimensions.get('window');
const columns = getGridColumns();
const CARD_SIZE = (screenWidth - 32 - 8 * (columns - 1)) / columns;

interface WeightLottieCardProps {
  weight?: number;
  target?: number;
  trend?: 'up' | 'down' | 'stable';
  history?: number[];
  fatPercent?: number;
  musclePercent?: number;
  waterPercent?: number;
  onPress?: () => void;
}

export const WeightLottieCard: React.FC<WeightLottieCardProps> = ({
  weight,
  target,
  trend = 'stable',
  history = [],
  fatPercent,
  musclePercent,
  waterPercent,
  onPress
}) => {
  const { colors, isDark } = useTheme();

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 15,
        useNativeDriver: true,
      }),
    ]).start();
  }, [weight]);

  const trendColor = trend === 'down' ? '#10B981' : trend === 'up' ? '#EF4444' : '#94A3B8';
  const accentColor = isDark ? '#818CF8' : '#6366F1';

  const currentWeight = weight || 0;
  const hasComposition = fatPercent !== undefined || musclePercent !== undefined || waterPercent !== undefined;

  // Calcul des kg pour chaque composant
  const fatKg = fatPercent && currentWeight > 0 ? (currentWeight * fatPercent) / 100 : undefined;
  const muscleKg = musclePercent && currentWeight > 0 ? (currentWeight * musclePercent) / 100 : undefined;
  const waterKg = waterPercent && currentWeight > 0 ? (currentWeight * waterPercent) / 100 : undefined;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundCard,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Dégradé */}
        <LinearGradient
          colors={isDark
            ? [`${accentColor}12`, 'transparent']
            : [`${accentColor}10`, 'transparent']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.content}>
          {/* Header avec titre et tendance */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textMuted }]}>Poids actuel</Text>
            {trend !== 'stable' && (
              <View style={[styles.trendBadge, { backgroundColor: `${trendColor}20` }]}>
                {trend === 'down' ? (
                  <TrendingDown size={scale(11)} color={trendColor} strokeWidth={2.5} />
                ) : (
                  <TrendingUp size={scale(11)} color={trendColor} strokeWidth={2.5} />
                )}
              </View>
            )}
          </View>

          {/* Poids actuel */}
          <View style={styles.weightSection}>
            <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
              {currentWeight > 0 ? currentWeight.toFixed(1) : '--.-'}
            </Text>
            <Text style={[styles.weightUnit, { color: accentColor }]}>kg</Text>
          </View>

          {/* Composition corporelle */}
          {hasComposition && (
            <View style={styles.compositionSection}>
              {fatPercent !== undefined && fatKg !== undefined && (
                <View style={[styles.compositionBadge, { backgroundColor: '#EF444415' }]}>
                  <Text style={[styles.compositionLabel, { color: colors.textMuted }]}>GRAISSE</Text>
                  <View style={styles.compositionRow}>
                    <Text style={[styles.compositionValue, { color: '#EF4444' }]}>
                      {fatKg.toFixed(1)}
                    </Text>
                    <Text style={[styles.compositionUnit, { color: '#EF4444' }]}>kg</Text>
                  </View>
                  <Text style={[styles.compositionPercent, { color: '#EF4444' }]}>
                    {fatPercent.toFixed(1)}%
                  </Text>
                </View>
              )}
              {musclePercent !== undefined && muscleKg !== undefined && (
                <View style={[styles.compositionBadge, { backgroundColor: '#10B98115' }]}>
                  <Text style={[styles.compositionLabel, { color: colors.textMuted }]}>MUSCLE</Text>
                  <View style={styles.compositionRow}>
                    <Text style={[styles.compositionValue, { color: '#10B981' }]}>
                      {muscleKg.toFixed(1)}
                    </Text>
                    <Text style={[styles.compositionUnit, { color: '#10B981' }]}>kg</Text>
                  </View>
                  <Text style={[styles.compositionPercent, { color: '#10B981' }]}>
                    {musclePercent.toFixed(1)}%
                  </Text>
                </View>
              )}
              {waterPercent !== undefined && waterKg !== undefined && (
                <View style={[styles.compositionBadge, { backgroundColor: '#3B82F615' }]}>
                  <Text style={[styles.compositionLabel, { color: colors.textMuted }]}>EAU</Text>
                  <View style={styles.compositionRow}>
                    <Text style={[styles.compositionValue, { color: '#3B82F6' }]}>
                      {waterKg.toFixed(1)}
                    </Text>
                    <Text style={[styles.compositionUnit, { color: '#3B82F6' }]}>kg</Text>
                  </View>
                  <Text style={[styles.compositionPercent, { color: '#3B82F6' }]}>
                    {waterPercent.toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Footer avec objectif - toujours affiché */}
          <View style={styles.footer}>
            <View style={[styles.targetBadge, { backgroundColor: `${accentColor}15` }]}>
              <Target size={scale(14)} color={accentColor} strokeWidth={2.5} />
              <View style={styles.targetInfo}>
                <Text style={[styles.targetLabel, { color: colors.textMuted }]}>
                  Objectif
                </Text>
                <Text style={[styles.targetValue, { color: accentColor }]}>
                  {target ? `${target} kg` : 'Non défini'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: scale(20),
    padding: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: scaleModerate(9, 0.3),
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  trendBadge: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: scale(4),
  },
  weightValue: {
    fontSize: scaleModerate(40, 0.3),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  weightUnit: {
    fontSize: scaleModerate(16, 0.3),
    fontWeight: '700',
  },
  compositionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: scale(6),
  },
  compositionBadge: {
    flex: 1,
    paddingVertical: scale(6),
    paddingHorizontal: scale(4),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(2),
  },
  compositionLabel: {
    fontSize: scaleModerate(6, 0.3),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compositionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scale(2),
  },
  compositionValue: {
    fontSize: scaleModerate(11, 0.3),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  compositionUnit: {
    fontSize: scaleModerate(8, 0.3),
    fontWeight: '700',
  },
  compositionPercent: {
    fontSize: scaleModerate(9, 0.3),
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  footer: {
    alignItems: 'center',
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: scale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(12),
  },
  targetInfo: {
    gap: scale(1),
  },
  targetLabel: {
    fontSize: scaleModerate(7, 0.3),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetValue: {
    fontSize: scaleModerate(14, 0.3),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
});
