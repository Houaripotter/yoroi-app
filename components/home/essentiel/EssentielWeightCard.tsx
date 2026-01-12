import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { TrendingUp, TrendingDown, Minus, Target, BarChart3, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

interface EssentielWeightCardProps {
  currentWeight?: number;
  objective?: number;
  weekData?: number[];
  weekLabels?: string[];
  trend?: 'up' | 'down' | 'stable';
  onAddWeight?: () => void;
  onViewStats?: () => void;
}

export const EssentielWeightCard: React.FC<EssentielWeightCardProps> = ({
  currentWeight,
  objective,
  weekData = [],
  weekLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  trend = 'stable',
  onAddWeight,
  onViewStats,
}) => {
  const { colors, isDark } = useTheme();

  // Animations subtiles
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentWeight]);

  const getTrendInfo = () => {
    switch (trend) {
      case 'up':
        return { label: 'EN HAUSSE', color: '#EF4444', Icon: TrendingUp };
      case 'down':
        return { label: 'EN BAISSE', color: '#10B981', Icon: TrendingDown };
      default:
        return { label: 'STABLE', color: '#94A3B8', Icon: Minus };
    }
  };

  const trendInfo = getTrendInfo();
  const TrendIcon = trendInfo.Icon;

  // Couleurs professionnelles
  const accentColor = isDark ? '#818CF8' : '#6366F1';
  const chartColor = isDark ? '#A78BFA' : '#8B5CF6';
  const mutedColor = isDark ? '#64748B' : '#94A3B8';

  // Données
  const chartData = weekData.length > 0 ? weekData.slice(0, 7) : [];
  const labels = weekLabels.slice(0, chartData.length);
  const hasData = chartData.length > 0;

  // Prédiction basée sur la tendance
  const getPrediction = () => {
    if (chartData.length < 3 || !currentWeight) return null;

    const firstWeight = chartData[0];
    const lastWeight = chartData[chartData.length - 1];
    const days = chartData.length;
    const dailyChange = (lastWeight - firstWeight) / days;

    if (Math.abs(dailyChange) < 0.01) return null;

    const prediction7Days = currentWeight + (dailyChange * 7);

    let daysToTarget = null;
    if (objective && currentWeight && Math.abs(objective - currentWeight) > 0.1) {
      const remaining = objective - currentWeight;
      daysToTarget = Math.round(remaining / dailyChange);
      if (daysToTarget < 0 || daysToTarget > 365) daysToTarget = null;
    }

    return {
      weight7Days: prediction7Days,
      dailyChange,
      daysToTarget,
    };
  };
  const prediction = getPrediction();

  // Générer le path pour la courbe
  const generateCurvePath = () => {
    if (!hasData) return { path: '', points: [], width: 0, height: 0 };

    const width = screenWidth - 80;
    const height = 120;
    const maxVal = Math.max(...chartData);
    const minVal = Math.min(...chartData);
    const range = maxVal - minVal || 1;

    const points = chartData.map((val, i) => ({
      x: (i / (chartData.length - 1 || 1)) * width,
      y: height - ((val - minVal) / range) * (height - 20),
      value: val
    }));

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      path += ` Q ${prev.x} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2}`;
      path += ` Q ${curr.x} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    return { path, points, width, height };
  };

  const { path: curvePath, points: curvePoints, width: chartWidth, height: chartHeight } = generateCurvePath();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.backgroundCard,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textMuted }]}>POIDS</Text>
        <TouchableOpacity onPress={onViewStats} style={styles.iconButton}>
          <BarChart3 size={22} color={accentColor} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Poids principal */}
      <View style={styles.weightSection}>
        <View style={styles.weightRow}>
          <Text style={[styles.weightValue, { color: colors.textPrimary }]}>
            {currentWeight != null && currentWeight > 0 ? currentWeight.toFixed(1) : '--.-'}
          </Text>
          <View style={styles.weightMeta}>
            <Text style={[styles.weightUnit, { color: accentColor }]}>kg</Text>
            {trend !== 'stable' && (
              <View style={[styles.trendBadge, { backgroundColor: `${trendInfo.color}15` }]}>
                <TrendIcon size={16} color={trendInfo.color} strokeWidth={2.5} />
                <Text style={[styles.trendText, { color: trendInfo.color }]}>
                  {trendInfo.label}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Objectif */}
        {objective && currentWeight && (
          <View style={styles.objectiveRow}>
            <Target size={18} color={mutedColor} strokeWidth={2} />
            <Text style={[styles.objectiveLabel, { color: mutedColor }]}>Objectif</Text>
            <Text style={[styles.objectiveValue, { color: accentColor }]}>{objective} kg</Text>
            {currentWeight > 0 && (
              <View style={[styles.diffBadge, { backgroundColor: `${trendInfo.color}12` }]}>
                <Text style={[styles.diffValue, { color: trendInfo.color }]}>
                  {currentWeight - objective > 0 ? '+' : ''}
                  {(currentWeight - objective).toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Prédiction */}
      {prediction && (
        <View style={[styles.predictionBanner, {
          backgroundColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.08)',
          borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)',
        }]}>
          <Sparkles size={16} color="#8B5CF6" strokeWidth={2} />
          <View style={styles.predictionTextContainer}>
            <Text style={[styles.predictionTitle, { color: colors.textPrimary }]}>
              Prédiction
            </Text>
            <Text style={[styles.predictionText, { color: colors.textSecondary }]}>
              {prediction.daysToTarget && prediction.daysToTarget > 0 ? (
                `Objectif atteint dans ${prediction.daysToTarget} jour${prediction.daysToTarget > 1 ? 's' : ''}`
              ) : (
                `${prediction.weight7Days.toFixed(1)} kg dans 7 jours`
              )}
            </Text>
          </View>
        </View>
      )}

      {/* Graphique */}
      {hasData && (
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartTitle, { color: mutedColor }]}>ÉVOLUTION 7 JOURS</Text>
            <View style={styles.rangeRow}>
              <Text style={[styles.rangeText, { color: '#10B981' }]}>
                {Math.min(...chartData).toFixed(1)}
              </Text>
              <Text style={[styles.rangeText, { color: mutedColor }]}>→</Text>
              <Text style={[styles.rangeText, { color: '#EF4444' }]}>
                {Math.max(...chartData).toFixed(1)}
              </Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {/* Courbe SVG */}
            <Svg width={chartWidth} height={chartHeight}>
              <Defs>
                <SvgLinearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor={accentColor} stopOpacity="1" />
                  <Stop offset="100%" stopColor={chartColor} stopOpacity="1" />
                </SvgLinearGradient>
              </Defs>

              {/* Ligne de base */}
              <Rect
                x="0"
                y={chartHeight - 1}
                width={chartWidth}
                height="1"
                fill={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}
              />

              {/* Courbe */}
              <Path
                d={curvePath}
                stroke="url(#gradient)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {curvePoints.map((point, i) => (
                <Circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r={i === curvePoints.length - 1 ? 7 : 4}
                  fill={i === curvePoints.length - 1 ? chartColor : colors.backgroundCard}
                  stroke={i === curvePoints.length - 1 ? chartColor : accentColor}
                  strokeWidth={2}
                />
              ))}
            </Svg>

            {/* Labels */}
            <View style={styles.labelsRow}>
              {labels.map((label, i) => (
                <Text
                  key={i}
                  style={[
                    styles.dayLabel,
                    {
                      color: i === labels.length - 1 ? accentColor : mutedColor,
                      fontWeight: i === labels.length - 1 ? '700' : '600',
                    },
                  ]}
                >
                  {label}
                </Text>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Bouton */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: accentColor }]}
        onPress={onAddWeight}
      >
        <Text style={styles.addButtonText}>Nouvelle pesée</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  iconButton: {
    padding: 4,
  },
  weightSection: {
    marginBottom: 24,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  weightValue: {
    fontSize: 64,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -3,
    lineHeight: 64,
  },
  weightMeta: {
    marginTop: 6,
    gap: 10,
  },
  weightUnit: {
    fontSize: 22,
    fontWeight: '700',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  objectiveLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  objectiveValue: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  diffBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  diffValue: {
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  chartSection: {
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  chartContainer: {
    gap: 12,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  dayLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  predictionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  predictionTextContainer: {
    flex: 1,
    gap: 2,
  },
  predictionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  predictionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
