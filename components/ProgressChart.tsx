// ============================================
// COMPOSANT GRAPHIQUE DE PROGRESSION
// ============================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line, Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';

const CHART_WIDTH = Dimensions.get('window').width - 64;
const CHART_HEIGHT = 120;
const PADDING = 20;

interface DataPoint {
  date: string;
  value: number;
  quality?: number;
}

interface ProgressChartProps {
  data: DataPoint[];
  targetValue?: number;
  unit?: string;
  type?: 'weight' | 'time' | 'quality';
  color?: string;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({
  data,
  targetValue,
  unit = '',
  type = 'weight',
  color,
}) => {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const chartColor = color || colors.accent;

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Pas encore de données
        </Text>
      </View>
    );
  }

  // Trier par date
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Trouver min/max pour l'échelle
  const values = sortedData.map(d => d.value);
  let minValue = Math.min(...values);
  let maxValue = Math.max(...values);

  // Si on a un target, l'inclure dans l'échelle
  if (targetValue) {
    minValue = Math.min(minValue, targetValue);
    maxValue = Math.max(maxValue, targetValue);
  }

  // Ajouter un peu de marge
  const margin = (maxValue - minValue) * 0.1 || 1;
  minValue -= margin;
  maxValue += margin;

  // Convertir les points en coordonnées
  const width = CHART_WIDTH - 2 * PADDING;
  const height = CHART_HEIGHT - 2 * PADDING;

  const points = sortedData.map((point, index) => {
    const x = PADDING + (index / (sortedData.length - 1 || 1)) * width;
    const y = PADDING + height - ((point.value - minValue) / (maxValue - minValue)) * height;
    return { x, y, ...point };
  });

  // Créer le path pour la ligne
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Créer le path pour l'aire sous la courbe
  const areaPath = `${pathData} L ${points[points.length - 1].x} ${CHART_HEIGHT - PADDING} L ${PADDING} ${CHART_HEIGHT - PADDING} Z`;

  // Ligne du target
  let targetY: number | null = null;
  if (targetValue) {
    targetY = PADDING + height - ((targetValue - minValue) / (maxValue - minValue)) * height;
  }

  // Stats
  const latestValue = sortedData[sortedData.length - 1].value;
  const firstValue = sortedData[0].value;
  const change = latestValue - firstValue;
  const changePercent = firstValue !== 0 ? ((change / firstValue) * 100).toFixed(1) : '0';

  // Pour le temps, l'amélioration est négative
  const isImprovement = type === 'time' ? change < 0 : change > 0;

  return (
    <View style={styles.container}>
      {/* Stats en haut */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Dernier</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {latestValue.toFixed(type === 'quality' ? 0 : 1)}{unit}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Évolution</Text>
          <Text
            style={[
              styles.statValue,
              { color: isImprovement ? colors.success : colors.error },
            ]}
          >
            {change > 0 ? '+' : ''}{change.toFixed(type === 'quality' ? 0 : 1)}{unit} ({changePercent}%)
          </Text>
        </View>
        {targetValue && (
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Objectif</Text>
            <Text style={[styles.statValue, { color: chartColor }]}>
              {targetValue.toFixed(1)}{unit}
            </Text>
          </View>
        )}
      </View>

      {/* Graphique */}
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={chartColor} stopOpacity="0.3" />
            <Stop offset="1" stopColor={chartColor} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Ligne du target (pointillés) */}
        {targetY && (
          <Line
            x1={PADDING}
            y1={targetY}
            x2={CHART_WIDTH - PADDING}
            y2={targetY}
            stroke={chartColor}
            strokeWidth="1.5"
            strokeDasharray="5,5"
            opacity={0.5}
          />
        )}

        {/* Aire sous la courbe */}
        <Path d={areaPath} fill="url(#areaGradient)" />

        {/* Ligne principale */}
        <Path
          d={pathData}
          stroke={chartColor}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={index === points.length - 1 ? 5 : 3}
            fill={chartColor}
            stroke="#FFF"
            strokeWidth={index === points.length - 1 ? 2 : 0}
          />
        ))}
      </Svg>

      {/* Labels des dates */}
      <View style={styles.labelsRow}>
        <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
          {new Date(sortedData[0].date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
        </Text>
        <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
          {sortedData.length} séances
        </Text>
        <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
          {new Date(sortedData[sortedData.length - 1].date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
