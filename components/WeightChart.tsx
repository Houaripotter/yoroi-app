import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';

interface WeightDataPoint {
  date: string;
  weight: number;
}

interface WeightChartProps {
  data: WeightDataPoint[];
  onPointPress?: (point: WeightDataPoint) => void;
  onPeriodChange?: (period: '7j' | '30j' | '90j' | 'tout') => void;
}

export const WeightChart: React.FC<WeightChartProps> = ({
  data,
  onPointPress,
  onPeriodChange,
}) => {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<'7j' | '30j' | '90j' | 'tout'>('30j');

  const chartWidth = 300;
  const chartHeight = 180;
  const padding = 20;

  // Filtrer selon la période
  const filteredData = useMemo(() => {
    if (data.length === 0) return [];

    const now = new Date();
    const days = period === '7j' ? 7 : period === '30j' ? 30 : period === '90j' ? 90 : 365;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return data
      .filter(d => new Date(d.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data, period]);

  // Limiter les points pour lisibilité
  const displayData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const maxPoints = period === '7j' ? 7 : period === '30j' ? 10 : 12;
    const step = Math.max(1, Math.floor(filteredData.length / maxPoints));

    return filteredData.filter((_, i) =>
      i % step === 0 || i === filteredData.length - 1
    );
  }, [filteredData, period]);

  // Calculer les stats
  const stats = useMemo(() => {
    if (displayData.length === 0) {
      return { current: 0, variation: 0, average: 0, direction: 'stable' as const };
    }

    const current = displayData[displayData.length - 1].weight;
    const start = displayData[0].weight;
    const variation = current - start;
    const average = displayData.reduce((sum, d) => sum + d.weight, 0) / displayData.length;
    const direction = variation < -0.1 ? 'down' : variation > 0.1 ? 'up' : 'stable';

    return { current, variation, average, direction };
  }, [displayData]);

  // Calculer les positions pour le graphique
  const chartData = useMemo(() => {
    if (displayData.length === 0) return [];

    const weights = displayData.map(d => d.weight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const weightRange = maxWeight - minWeight || 1;

    const xStep = (chartWidth - padding * 2) / Math.max(displayData.length - 1, 1);

    return displayData.map((item, index) => ({
      x: padding + index * xStep,
      y: chartHeight - padding - ((item.weight - minWeight) / weightRange) * (chartHeight - padding * 2),
      value: item.weight,
      date: item.date,
    }));
  }, [displayData]);

  // Créer le path avec courbes de Bézier
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

  // Path pour le gradient
  const createAreaPath = () => {
    if (chartData.length === 0) return '';

    const linePath = createPath();
    const lastPoint = chartData[chartData.length - 1];
    const firstPoint = chartData[0];

    return `${linePath} L ${lastPoint.x} ${chartHeight - padding} L ${firstPoint.x} ${chartHeight - padding} Z`;
  };

  // Changer de période
  const handlePeriodChange = (newPeriod: '7j' | '30j' | '90j' | 'tout') => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  // Formater les labels de date
  const getDateLabels = () => {
    if (chartData.length === 0) return [];

    return chartData.map((point, i) => {
      // Afficher seulement premier, milieu et dernier
      if (i === 0 || i === chartData.length - 1 || i === Math.floor(chartData.length / 2)) {
        const date = new Date(point.date);
        return {
          x: point.x,
          label: `${date.getDate()}/${date.getMonth() + 1}`,
        };
      }
      return null;
    }).filter(Boolean);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Titre */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Évolution du poids
      </Text>

      {/* Sélecteur de période */}
      <View style={styles.periodRow}>
        {(['7j', '30j', '90j', 'tout'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => handlePeriodChange(p)}
            style={[
              styles.periodButton,
              {
                backgroundColor: period === p ? colors.accent : 'transparent',
                borderColor: period === p ? colors.accent : colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.periodText,
              { color: period === p ? '#FFFFFF' : colors.textSecondary },
            ]}>
              {p === 'tout' ? 'Tout' : p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Graphique */}
      {displayData.length > 1 ? (
        <View style={styles.chartContainer}>
          <Svg width={chartWidth} height={chartHeight}>
            <Defs>
              <LinearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.accent} stopOpacity="0.3" />
                <Stop offset="1" stopColor={colors.accent} stopOpacity="0.05" />
              </LinearGradient>
            </Defs>

            {/* Gradient area */}
            <Path d={createAreaPath()} fill="url(#weightGradient)" />

            {/* Line */}
            <Path
              d={createPath()}
              stroke={colors.accent}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />

            {/* Points */}
            {chartData.map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#FFFFFF"
                stroke={colors.accent}
                strokeWidth="3"
              />
            ))}
          </Svg>

          {/* Labels des dates */}
          <View style={styles.labelsContainer}>
            {getDateLabels().map((item: any, index) => (
              <Text
                key={index}
                style={[styles.dateLabel, { color: colors.textMuted, left: item.x - 20 }]}
              >
                {item.label}
              </Text>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.noData}>
          <Text style={[styles.noDataText, { color: colors.textMuted }]}>
            {data.length === 0
              ? 'Aucune donnée disponible'
              : 'Pas assez de données pour cette période'
            }
          </Text>
          <Text style={[styles.noDataHint, { color: colors.textMuted }]}>
            Ajoute des pesées pour voir ton évolution
          </Text>
        </View>
      )}

      {/* Stats rapides */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.current.toFixed(1)} kg
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Actuel</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <View style={styles.variationRow}>
            {stats.direction === 'down' ? (
              <TrendingDown size={16} color={colors.success} />
            ) : stats.direction === 'up' ? (
              <TrendingUp size={16} color={colors.danger} />
            ) : (
              <Minus size={16} color={colors.textMuted} />
            )}
            <Text style={[
              styles.statValue,
              {
                color: stats.direction === 'down'
                  ? colors.success
                  : stats.direction === 'up'
                    ? colors.danger
                    : colors.textMuted
              }
            ]}>
              {stats.variation > 0 ? '+' : ''}{stats.variation.toFixed(1)} kg
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Variation</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.average.toFixed(1)} kg
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Moyenne</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  labelsContainer: {
    width: 300,
    height: 20,
    position: 'relative',
    marginTop: 8,
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '600',
    position: 'absolute',
    width: 40,
    textAlign: 'center',
  },
  noData: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '500',
  },
  noDataHint: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  variationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 36,
  },
});

export default WeightChart;
