import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { SPACING, RADIUS } from '@/constants/design';
import { Target, TrendingDown, TrendingUp, Maximize2 } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 200;
const PADDING_LEFT = 45;
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 40;

interface WeightTrendChartProps {
  data: { date: string; value: number }[];
  goal?: number;
  colors: any;
  period: number;
  onPress?: () => void;
}

export function WeightTrendChart({ data, goal, colors, period, onPress }: WeightTrendChartProps) {
  const { isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.glass, borderColor: colors.glassBorder },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Évolution Poids ({period}j)
        </Text>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucune donnée de poids
          </Text>
        </View>
      </View>
    );
  }

  // Define dynamic width
  const FIXED_CHART_WIDTH = SCREEN_WIDTH - SPACING.lg * 4;
  const ITEM_WIDTH = 40; // Width per data point
  const chartWidth = Math.max(FIXED_CHART_WIDTH, data.length * ITEM_WIDTH);

  // Calculer statistiques
  const values = data.map(d => d.value);
  const current = values[values.length - 1];
  const first = values[0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const change = current - first;
  const changePercent = (change / first) * 100;

  // Préparer les points pour le graphique SVG
  const range = max - min;
  const paddedMin = min - range * 0.05;
  const paddedMax = max + range * 0.05;
  const paddedRange = paddedMax - paddedMin || 1;

  const chartData = data.map((entry, index) => {
    const x = PADDING_LEFT + ((chartWidth - PADDING_LEFT - PADDING_RIGHT) * index) / Math.max(data.length - 1, 1);
    const y = CHART_HEIGHT - PADDING_BOTTOM - ((entry.value - paddedMin) / paddedRange) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
    return { ...entry, x, y };
  });

  // Créer le path de la ligne avec courbes de Bézier
  const createPath = () => {
    if (chartData.length === 0) return '';
    let path = `M ${chartData[0].x} ${chartData[0].y}`;
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    return path;
  };

  // Créer le path du gradient area
  const createAreaPath = () => {
    if (chartData.length === 0) return '';
    const linePath = createPath();
    const lastPoint = chartData[chartData.length - 1];
    const firstPoint = chartData[0];
    return `${linePath} L ${lastPoint.x} ${CHART_HEIGHT - PADDING_BOTTOM} L ${firstPoint.x} ${CHART_HEIGHT - PADDING_BOTTOM} Z`;
  };

  // Générer les labels Y
  const getYLabels = () => {
    const labels = [];
    for (let i = 0; i < 5; i++) {
      const value = paddedMin + ((paddedMax - paddedMin) * (4 - i)) / 4;
      labels.push(value.toFixed(1));
    }
    return labels;
  };

  const yLabels = getYLabels();

  // Calculer la position Y de la ligne d'objectif
  const goalLineY = goal ? CHART_HEIGHT - PADDING_BOTTOM - ((goal - paddedMin) / paddedRange) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) : null;

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[
        styles.container,
        { backgroundColor: colors.glass, borderColor: colors.glassBorder },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Expand icon */}
      {onPress && (
        <View style={styles.expandIcon}>
          <Maximize2 size={18} color={colors.textMuted} />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Évolution Poids (kg) - {period}j
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Variation</Text>
            <View style={styles.statValueRow}>
              {change >= 0 ? (
                <TrendingUp size={16} color={colors.danger} />
              ) : (
                <TrendingDown size={16} color={colors.success} />
              )}
              <Text
                style={[
                  styles.statValue,
                  { color: change >= 0 ? colors.danger : colors.success },
                ]}
              >
                {change >= 0 ? '+' : ''}
                {change.toFixed(1)}kg ({changePercent >= 0 ? '+' : ''}
                {changePercent.toFixed(1)}%)
              </Text>
            </View>
          </View>
          {goal && (
            <View style={styles.stat}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Objectif</Text>
              <View style={styles.statValueRow}>
                <Target size={16} color={colors.gold} />
                <Text style={[styles.statValue, { color: colors.gold }]}>{goal}kg</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <Svg width={chartWidth} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.success} stopOpacity="0.4" />
                  <Stop offset="0.5" stopColor={colors.success} stopOpacity="0.2" />
                  <Stop offset="1" stopColor={colors.success} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {/* Lignes de grille horizontales */}
              {[0, 1, 2, 3, 4].map((i) => {
                const y = PADDING_TOP + ((CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM) * i) / 4;
                return (
                  <Rect
                    key={i}
                    x={PADDING_LEFT}
                    y={y}
                    width={chartWidth - PADDING_LEFT - PADDING_RIGHT}
                    height={1}
                    fill={colors.glassBorder}
                    opacity={0.3}
                  />
                );
              })}

              {/* Ligne d'objectif en pointillé */}
              {goal && goalLineY && (
                <Path
                  d={`M ${PADDING_LEFT} ${goalLineY} L ${chartWidth - PADDING_RIGHT} ${goalLineY}`}
                  stroke={colors.gold || '#F59E0B'}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  fill="none"
                  opacity={0.7}
                />
              )}

              {/* Zone sous la courbe avec gradient */}
              <Path
                d={createAreaPath()}
                fill="url(#weightGradient)"
              />

              {/* Ligne de tendance */}
              <Path
                d={createPath()}
                stroke={colors.success}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points sur la courbe */}
              {chartData.length <= 30 && chartData.map((point, index) => (
                <React.Fragment key={index}>
                  <Circle cx={point.x} cy={point.y} r={6} fill="#FFFFFF" opacity={0.95} />
                  <Circle cx={point.x} cy={point.y} r={4} fill={colors.success} />
                </React.Fragment>
              ))}
            </Svg>

            {/* Labels X (dates) */}
            <View style={[styles.xLabelsContainer, { width: chartWidth }]}>
              {chartData.filter((_, index) => {
                const step = Math.max(1, Math.floor(chartData.length / 5));
                return index % step === 0 || index === chartData.length - 1;
              }).map((point, index) => {
                const date = new Date(point.date);
                const day = date.getDate();
                const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
                const label = data.length <= 10 ? `${day} ${months[date.getMonth()]}` : `${day}`;
                return (
                  <View key={index} style={[styles.xLabelWrapper, { left: point.x - 30 }]}>
                    <Text style={[styles.xLabel, { color: isDark ? '#FFFFFF' : colors.textMuted }]}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Labels Y - Fixed Position outside ScrollView */}
        <View style={styles.yLabelsContainer}>
          {yLabels.map((label, index) => (
            <Text key={index} style={[styles.yLabel, { color: isDark ? '#FFFFFF' : colors.textMuted }]}>
              {label}
            </Text>
          ))}
        </View>
        
        {/* Note: L'objectif est deja affiche dans l'entete, pas besoin de label sur le graphique */}
      </View>

      {/* Stats Footer */}
      <View style={styles.footer}>
        <View style={styles.footerStat}>
          <Text style={[styles.footerLabel, { color: colors.textMuted }]}>Min</Text>
          <Text style={[styles.footerValue, { color: colors.textSecondary }]}>{min.toFixed(1)} kg</Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={[styles.footerLabel, { color: colors.textMuted }]}>Moy</Text>
          <Text style={[styles.footerValue, { color: colors.textSecondary }]}>{avg.toFixed(1)} kg</Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={[styles.footerLabel, { color: colors.textMuted }]}>Max</Text>
          <Text style={[styles.footerValue, { color: colors.textSecondary }]}>{max.toFixed(1)} kg</Text>
        </View>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
    position: 'relative',
  },
  expandIcon: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 6,
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    flexWrap: 'wrap',
  },
  stat: {
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  chartContainer: {
    marginVertical: SPACING.sm,
    position: 'relative',
    height: CHART_HEIGHT,
  },
  yLabelsContainer: {
    position: 'absolute',
    left: 0,
    top: PADDING_TOP,
    height: CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM,
    justifyContent: 'space-between',
    // Removed width/background to allow transparent overlay if needed, 
    // but typically Y labels need background if they cover content.
    // Assuming transparent for now as data starts at PADDING_LEFT.
  },
  yLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  xLabelsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    // right: 0, // Removed right:0 because we set width manually
    height: PADDING_BOTTOM,
  },
  xLabelWrapper: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
    top: 8,
  },
  xLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  goalLabelContainer: {
    position: 'absolute',
    alignItems: 'flex-end',
  },
  goalLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerStat: {
    alignItems: 'center',
    gap: 4,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});