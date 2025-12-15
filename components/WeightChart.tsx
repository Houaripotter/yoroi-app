import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WeightChart: React.FC<WeightChartProps> = ({
  data,
  onPointPress,
  onPeriodChange,
}) => {
  const { colors, isDark } = useTheme();
  const [period, setPeriod] = useState<'7j' | '30j' | '90j' | 'tout'>('30j');
  const chartWidth = SCREEN_WIDTH - 48;

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

  // Configuration du graphique
  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    backgroundGradientFromOpacity: 0,
    backgroundGradientToOpacity: 0,
    decimalPlaces: 1,
    color: () => colors.gold,
    labelColor: () => colors.textMuted,
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: colors.gold,
      fill: isDark ? colors.card : '#FFFFFF',
    },
    propsForBackgroundLines: {
      stroke: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      strokeDasharray: '5,5',
    },
    fillShadowGradientFrom: colors.gold,
    fillShadowGradientTo: 'transparent',
    fillShadowGradientFromOpacity: 0.3,
    fillShadowGradientToOpacity: 0,
  };

  // Changer de période
  const handlePeriodChange = (newPeriod: '7j' | '30j' | '90j' | 'tout') => {
    setPeriod(newPeriod);
    onPeriodChange?.(newPeriod);
  };

  // Formater les labels de date
  const formatLabels = () => {
    if (displayData.length === 0) return [''];

    return displayData.map((d, i) => {
      // Afficher seulement premier, milieu et dernier
      if (i === 0 || i === displayData.length - 1 || i === Math.floor(displayData.length / 2)) {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }
      return '';
    });
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
                backgroundColor: period === p ? colors.gold : 'transparent',
                borderColor: period === p ? colors.gold : colors.border,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.periodText,
              { color: period === p ? colors.textOnGold : colors.textSecondary },
            ]}>
              {p === 'tout' ? 'Tout' : p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Graphique */}
      {displayData.length > 1 ? (
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels: formatLabels(),
              datasets: [{
                data: displayData.map(d => d.weight),
                strokeWidth: 3,
              }],
            }}
            width={chartWidth}
            height={180}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={false}
            segments={4}
            onDataPointClick={({ index }) => {
              if (displayData[index]) {
                onPointPress?.(displayData[index]);
              }
            }}
          />
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
    marginHorizontal: -10,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
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
