import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { TrendingDown, TrendingUp, Target, Dumbbell, Apple, Droplet } from 'lucide-react-native';
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textMuted }]}>POIDS ACTUEL</Text>
            {trend !== 'stable' && (
              trend === 'down' ? (
                <TrendingDown size={scale(14)} color="#10B981" strokeWidth={2.5} />
              ) : (
                <TrendingUp size={scale(14)} color="#EF4444" strokeWidth={2.5} />
              )
            )}
          </View>

          {/* Poids - GROS et centré */}
          <View style={styles.weightSection}>
            <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
              {currentWeight > 0 && !isNaN(currentWeight) ? currentWeight.toFixed(1) : '--.-'}
            </Text>
            <Text style={[styles.weightUnit, { color: colors.textMuted }]}>kg</Text>
          </View>

          {/* LIGNE 1 : Graisse - Eau - Muscle (Barres horizontales) */}
          {hasComposition && (
            <View style={styles.compBarsContainer}>
              {fatPercent !== undefined && !isNaN(fatPercent) && fatKg !== undefined && !isNaN(fatKg) && (
                <View style={styles.compBarRow}>
                  <Apple size={scale(7)} color="#F59E0B" strokeWidth={2.5} />
                  <Text style={[styles.compBarLabel, { color: colors.textMuted }]}>Graisse</Text>
                  <View style={styles.compBarTrack}>
                    <View style={[styles.compBarFill, { width: `${Math.min(fatPercent, 100)}%`, backgroundColor: '#F59E0B' }]} />
                  </View>
                  <Text style={[styles.compBarValue, { color: '#F59E0B' }]}>{`${fatPercent.toFixed(0)}%`}</Text>
                  <Text style={[styles.compBarKg, { color: '#F59E0B' }]}>{`${fatKg.toFixed(1)}kg`}</Text>
                </View>
              )}
              {waterPercent !== undefined && !isNaN(waterPercent) && waterKg !== undefined && !isNaN(waterKg) && (
                <View style={styles.compBarRow}>
                  <Droplet size={scale(7)} color="#3B82F6" strokeWidth={2.5} />
                  <Text style={[styles.compBarLabel, { color: colors.textMuted }]}>Eau</Text>
                  <View style={styles.compBarTrack}>
                    <View style={[styles.compBarFill, { width: `${Math.min(waterPercent, 100)}%`, backgroundColor: '#3B82F6' }]} />
                  </View>
                  <Text style={[styles.compBarValue, { color: '#3B82F6' }]}>{`${waterPercent.toFixed(0)}%`}</Text>
                  <Text style={[styles.compBarKg, { color: '#3B82F6' }]}>{`${waterKg.toFixed(1)}kg`}</Text>
                </View>
              )}
              {musclePercent !== undefined && !isNaN(musclePercent) && muscleKg !== undefined && !isNaN(muscleKg) && (
                <View style={styles.compBarRow}>
                  <Dumbbell size={scale(7)} color="#EF4444" strokeWidth={2.5} />
                  <Text style={[styles.compBarLabel, { color: colors.textMuted }]}>Muscle</Text>
                  <View style={styles.compBarTrack}>
                    <View style={[styles.compBarFill, { width: `${Math.min(musclePercent, 100)}%`, backgroundColor: '#EF4444' }]} />
                  </View>
                  <Text style={[styles.compBarValue, { color: '#EF4444' }]}>{`${musclePercent.toFixed(0)}%`}</Text>
                  <Text style={[styles.compBarKg, { color: '#EF4444' }]}>{`${muscleKg.toFixed(1)}kg`}</Text>
                </View>
              )}
            </View>
          )}

          {/* LIGNE 2 : Perdu - Objectif - Reste */}
          <View style={styles.row2}>
            {/* Perdu à gauche - VERT */}
            {history && history.length > 0 && currentWeight > 0 && history[0] && typeof history[0] === 'number' && !isNaN(history[0]) && !isNaN(currentWeight) && history[0] > currentWeight ? (
              <View style={styles.goalItem}>
                <Text style={[styles.goalValue, { color: '#10B981' }]}>{`${(history[0] - currentWeight).toFixed(1)}`}</Text>
                <Text style={[styles.goalLabel, { color: '#10B981' }]}>Perdu</Text>
              </View>
            ) : (
              <View style={styles.goalItem} />
            )}

            {/* Objectif au centre - BLEU */}
            {target && typeof target === 'number' && !isNaN(target) ? (
              <View style={styles.goalItemCenter}>
                <View style={styles.targetRow}>
                  <Target size={scale(12)} color="#3B82F6" strokeWidth={2.5} />
                  <Text style={[styles.goalValue, { color: '#3B82F6' }]}>{target.toFixed(1)}</Text>
                </View>
                <Text style={[styles.goalLabel, { color: '#3B82F6' }]}>Objectif</Text>
              </View>
            ) : (
              <View style={styles.goalItemCenter}>
                <Text style={[styles.goalValue, { color: colors.textMuted }]}>--</Text>
                <Text style={[styles.goalLabel, { color: colors.textMuted }]}>Objectif</Text>
              </View>
            )}

            {/* Reste à droite - ORANGE */}
            {target && typeof target === 'number' && !isNaN(target) && currentWeight > 0 && !isNaN(currentWeight) ? (
              <View style={styles.goalItem}>
                {currentWeight > target ? (
                  <>
                    <Text style={[styles.goalValue, { color: '#F59E0B' }]}>{`-${(currentWeight - target).toFixed(1)}`}</Text>
                    <Text style={[styles.goalLabel, { color: '#F59E0B' }]}>À perdre</Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.goalValue, { color: '#F59E0B' }]}>{`+${(target - currentWeight).toFixed(1)}`}</Text>
                    <Text style={[styles.goalLabel, { color: '#F59E0B' }]}>À prendre</Text>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.goalItem} />
            )}
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
    fontSize: scaleModerate(14, 0.3),
    fontWeight: '600',
  },

  // LIGNE 1 : Composition (Barres horizontales)
  compBarsContainer: {
    gap: scale(4),
    marginVertical: scale(2),
  },
  compBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  compBarDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  compBarLabel: {
    fontSize: scaleModerate(8, 0.3),
    fontWeight: '600',
    width: scale(40),
  },
  compBarTrack: {
    flex: 1,
    height: scale(5),
    backgroundColor: 'rgba(150,150,150,0.15)',
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  compBarFill: {
    height: '100%',
    borderRadius: scale(3),
  },
  compBarValue: {
    fontSize: scaleModerate(9, 0.3),
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    width: scale(24),
    textAlign: 'right',
  },
  compBarKg: {
    fontSize: scaleModerate(8, 0.3),
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    width: scale(32),
    textAlign: 'right',
  },

  // LIGNE 2 : Objectifs (Perdu, Objectif, Reste)
  row2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalItem: {
    flex: 1,
    alignItems: 'center',
    gap: scale(2),
  },
  goalItemCenter: {
    flex: 1,
    alignItems: 'center',
    gap: scale(2),
  },
  goalValue: {
    fontSize: scaleModerate(14, 0.3),
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  goalLabel: {
    fontSize: scaleModerate(7, 0.3),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
  },
});
