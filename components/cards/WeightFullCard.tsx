// ============================================
// YOROI - CARTE POIDS ULTRA COMPACT
// ============================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { TrendingDown, TrendingUp, ChevronRight } from 'lucide-react-native';
import Svg, { Line, Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CHART_HEIGHT = 40; // TRÈS RÉDUIT
const CHART_WIDTH = CARD_WIDTH - 32;

interface WeightFullCardProps {
  currentWeight: number;
  targetWeight?: number;
  startWeight?: number;
  history: number[];
  onPress?: () => void;
}

export const WeightFullCard: React.FC<WeightFullCardProps> = ({
  currentWeight,
  targetWeight,
  startWeight,
  history = [],
  onPress,
}) => {
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Calculs
  const start = startWeight || history[0] || currentWeight;
  const target = targetWeight || currentWeight;
  const totalChange = currentWeight - start;
  const remaining = target - currentWeight;

  // Tendance
  const getTrend = () => {
    if (history.length < 2) return 'stable';
    const recent = history.slice(-3);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    if (currentWeight < avg - 0.2) return 'down';
    if (currentWeight > avg + 0.2) return 'up';
    return 'stable';
  };
  const trend = getTrend();

  // Prédictions
  const getPredictions = () => {
    if (history.length < 3) return null;

    const recentHistory = history.slice(-Math.min(14, history.length));
    const n = recentHistory.length;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recentHistory[i];
      sumXY += i * recentHistory[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predict = (days: number) => {
      const baseWeight = intercept + slope * (n - 1 + days);
      const plateauFactor = 1 - (days / 30) * 0.02;
      return currentWeight + (baseWeight - currentWeight) * plateauFactor;
    };

    return {
      day7: predict(7),
      day30: predict(30),
      day90: predict(90),
    };
  };
  const predictions = getPredictions();

  // Données graphique
  const chartData = history.length > 0 ? history.slice(-7) : [currentWeight];
  const maxWeight = Math.max(...chartData, target);
  const minWeight = Math.min(...chartData, target);
  const range = maxWeight - minWeight || 1;
  const padding = range * 0.2;

  const points = chartData.map((weight, index) => {
    const x = (index / (chartData.length - 1 || 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - ((weight - (minWeight - padding)) / (range + padding * 2)) * CHART_HEIGHT;
    return { x, y, weight };
  });

  const linePath = points.map((p, i) =>
    i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
  ).join(' ');

  const targetY = CHART_HEIGHT - ((target - (minWeight - padding)) / (range + padding * 2)) * CHART_HEIGHT;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.9 : 1}
      disabled={!onPress}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundCard,
            opacity: fadeAnim,
          }
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textMuted }]}>POIDS ACTUEL ET PRÉDICTIONS</Text>
          {onPress && <ChevronRight size={16} color={colors.textMuted} />}
        </View>

        {/* Poids + Graphique + Stats en ligne */}
        <View style={styles.mainRow}>
          {/* Poids actuel */}
          <View style={styles.weightSection}>
            <Text style={[styles.currentWeight, { color: colors.textPrimary }]}>
              {currentWeight.toFixed(1)}
            </Text>
            <Text style={[styles.unit, { color: colors.textMuted }]}>kg</Text>
          </View>

          {/* Graphique mini */}
          <View style={styles.chartMini}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              <Defs>
                <SvgLinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#6366F1" stopOpacity="1" />
                  <Stop offset="100%" stopColor="#8B5CF6" stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>

              {targetWeight && (
                <Line
                  x1="0"
                  y1={targetY}
                  x2={CHART_WIDTH}
                  y2={targetY}
                  stroke="#94A3B8"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  opacity="0.3"
                />
              )}

              <Path
                d={linePath}
                stroke="url(#gradient)"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {points.map((point, index) => (
                <Circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={index === points.length - 1 ? 2.5 : 1.5}
                  fill={index === points.length - 1 ? '#8B5CF6' : '#FFFFFF'}
                  stroke="#8B5CF6"
                  strokeWidth="1"
                />
              ))}
            </Svg>
          </View>
        </View>

        {/* Labels jours */}
        <View style={styles.daysRow}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].slice(0, chartData.length).map((day, i) => (
            <Text
              key={i}
              style={[
                styles.dayLabel,
                { color: i === chartData.length - 1 ? colors.textPrimary : colors.textMuted }
              ]}
            >
              {day}
            </Text>
          ))}
        </View>

        {/* Stats mini */}
        <View style={styles.statsRow}>
          <Text style={[styles.statText, { color: colors.accent }]}>
            Obj: {target.toFixed(1)}kg
          </Text>
          <Text style={[styles.statText, { color: totalChange < 0 ? '#10B981' : '#EF4444' }]}>
            {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)}kg
          </Text>
          {Math.abs(remaining) > 0.1 && (
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              Reste: {Math.abs(remaining).toFixed(1)}kg
            </Text>
          )}
        </View>

        {/* Prédictions RÉDUITES */}
        {predictions && (
          <View style={[styles.predictions, {
            backgroundColor: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)',
          }]}>
            <View style={styles.predRow}>
              <View style={styles.predItem}>
                <Text style={[styles.predLabel, { color: colors.textMuted }]}>7j</Text>
                <Text style={[styles.predValue, { color: colors.textPrimary }]}>
                  {predictions.day7.toFixed(1)}
                </Text>
              </View>
              <View style={styles.predItem}>
                <Text style={[styles.predLabel, { color: colors.textMuted }]}>30j</Text>
                <Text style={[styles.predValue, { color: colors.textPrimary }]}>
                  {predictions.day30.toFixed(1)}
                </Text>
              </View>
              <View style={styles.predItem}>
                <Text style={[styles.predLabel, { color: colors.textMuted }]}>90j</Text>
                <Text style={[styles.predValue, { color: colors.textPrimary }]}>
                  {predictions.day90.toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 8, // TRÈS RÉDUIT
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  weightSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  currentWeight: {
    fontSize: 28, // RÉDUIT
    fontWeight: '900',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartMini: {
    flex: 1,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 8,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  statText: {
    fontSize: 10,
    fontWeight: '700',
  },
  predictions: {
    borderRadius: 10,
    padding: 6,
  },
  predRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  predItem: {
    alignItems: 'center',
    gap: 2,
  },
  predLabel: {
    fontSize: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  predValue: {
    fontSize: 14, // RÉDUIT
    fontWeight: '800',
  },
});
