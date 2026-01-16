// ============================================
// COMPARISON CHART - Graphiques superposés pour comparer 2-3 métriques
// Style Whoop avec lignes de différentes couleurs
// ============================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SparklineChart } from '@/components/charts/SparklineChart';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DataSeries {
  label: string;
  data: { value: number }[];
  color: string;
}

interface ComparisonChartProps {
  series: DataSeries[];
  height?: number;
  showGrid?: boolean;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  series,
  height = 200,
  showGrid = true,
}) => {
  const { colors } = useTheme();

  if (!series || series.length === 0) {
    return null;
  }

  // Trouver les valeurs min/max globales pour l'échelle
  const allValues = series.flatMap(s => s.data.map(d => d.value));
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);

  return (
    <View style={styles.container}>
      {/* Légende */}
      <View style={styles.legend}>
        {series.map((serie, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: serie.color }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
              {serie.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Graphique avec superposition */}
      <View style={[styles.chartContainer, { height }]}>
        {/* Grille de fond (optionnel) */}
        {showGrid && (
          <View style={styles.grid}>
            {[0, 1, 2, 3, 4].map(i => (
              <View
                key={i}
                style={[
                  styles.gridLine,
                  {
                    top: `${(i * 100) / 4}%`,
                    backgroundColor: colors.border,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Superposition des lignes */}
        <View style={styles.linesContainer}>
          {series.map((serie, index) => (
            <View
              key={index}
              style={[
                StyleSheet.absoluteFill,
                { zIndex: series.length - index }, // Premier en dessous, dernier au-dessus
              ]}
            >
              <SparklineChart
                data={serie.data}
                color={serie.color}
                height={height}
                thickness={2.5}
                showGradient={true}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Stats pour chaque série */}
      <View style={styles.statsContainer}>
        {series.map((serie, index) => {
          const values = serie.data.map(d => d.value);
          const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
          const min = Math.min(...values);
          const max = Math.max(...values);

          return (
            <View key={index} style={styles.statRow}>
              <View style={[styles.statDot, { backgroundColor: serie.color }]} />
              <View style={styles.statValues}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Min: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{min.toFixed(1)}</Text>
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Moy: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{avg.toFixed(1)}</Text>
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Max: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{max.toFixed(1)}</Text>
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  chartContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.3,
  },
  linesContainer: {
    flex: 1,
    position: 'relative',
  },
  statsContainer: {
    marginTop: 16,
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValues: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});
