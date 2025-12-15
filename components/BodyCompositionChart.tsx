import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '@/lib/ThemeContext';
import { Percent, Activity, Droplet } from 'lucide-react-native';

// ============================================
// GRAPHIQUE COMPOSITION CORPORELLE
// ============================================
// Courbes: Graisse (orange), Muscle (vert), Eau (bleu)
// Avec selecteur de periode et legende

interface CompositionDataPoint {
  date: string;
  weight?: number;
  bodyFat?: number;
  muscle?: number;
  water?: number;
}

interface BodyCompositionChartProps {
  data: CompositionDataPoint[];
  onPointPress?: (point: CompositionDataPoint) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Couleurs des courbes
const COLORS = {
  bodyFat: '#F59E0B', // Orange/Warning
  muscle: '#10B981',  // Vert/Success
  water: '#3B82F6',   // Bleu/Info
};

export const BodyCompositionChart: React.FC<BodyCompositionChartProps> = ({
  data,
  onPointPress,
}) => {
  const { colors, isDark } = useTheme();
  const [period, setPeriod] = useState<'7j' | '30j' | '90j' | 'tout'>('30j');
  const [displayMode, setDisplayMode] = useState<'percent' | 'kg'>('percent');
  const [visibleCurves, setVisibleCurves] = useState({
    bodyFat: true,
    muscle: true,
    water: true,
  });
  const chartWidth = SCREEN_WIDTH - 48;

  // Filtrer les donnees avec au moins bodyFat
  const validData = useMemo(() => {
    return data.filter(d => d.bodyFat !== undefined);
  }, [data]);

  // Filtrer selon la periode
  const filteredData = useMemo(() => {
    if (validData.length === 0) return [];

    const now = new Date();
    const days = period === '7j' ? 7 : period === '30j' ? 30 : period === '90j' ? 90 : 365;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return validData
      .filter(d => new Date(d.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [validData, period]);

  // Limiter les points pour lisibilite
  const displayData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const maxPoints = period === '7j' ? 7 : period === '30j' ? 10 : 12;
    const step = Math.max(1, Math.floor(filteredData.length / maxPoints));

    return filteredData.filter((_, i) =>
      i % step === 0 || i === filteredData.length - 1
    );
  }, [filteredData, period]);

  // Calculer les valeurs en kg si mode kg
  const getDisplayValue = (point: CompositionDataPoint, key: 'bodyFat' | 'muscle' | 'water') => {
    const value = point[key];
    if (value === undefined) return 0;

    if (displayMode === 'kg' && point.weight) {
      return (value / 100) * point.weight;
    }
    return value;
  };

  // Stats actuelles
  const currentStats = useMemo(() => {
    if (displayData.length === 0) return null;

    const latest = displayData[displayData.length - 1];
    const first = displayData[0];

    return {
      bodyFat: latest.bodyFat,
      muscle: latest.muscle,
      water: latest.water,
      bodyFatDelta: latest.bodyFat && first.bodyFat ? latest.bodyFat - first.bodyFat : 0,
      muscleDelta: latest.muscle && first.muscle ? latest.muscle - first.muscle : 0,
      waterDelta: latest.water && first.water ? latest.water - first.water : 0,
    };
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
    propsForBackgroundLines: {
      stroke: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      strokeDasharray: '5,5',
    },
  };

  // Formater les labels de date
  const formatLabels = () => {
    if (displayData.length === 0) return [''];

    return displayData.map((d, i) => {
      if (i === 0 || i === displayData.length - 1 || i === Math.floor(displayData.length / 2)) {
        const date = new Date(d.date);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      }
      return '';
    });
  };

  // Preparer les datasets
  const prepareDatasets = () => {
    const datasets = [];

    if (visibleCurves.bodyFat && displayData.some(d => d.bodyFat !== undefined)) {
      datasets.push({
        data: displayData.map(d => getDisplayValue(d, 'bodyFat')),
        color: () => COLORS.bodyFat,
        strokeWidth: 3,
      });
    }

    if (visibleCurves.muscle && displayData.some(d => d.muscle !== undefined)) {
      datasets.push({
        data: displayData.map(d => getDisplayValue(d, 'muscle')),
        color: () => COLORS.muscle,
        strokeWidth: 3,
      });
    }

    if (visibleCurves.water && displayData.some(d => d.water !== undefined)) {
      datasets.push({
        data: displayData.map(d => getDisplayValue(d, 'water')),
        color: () => COLORS.water,
        strokeWidth: 3,
      });
    }

    // Fallback si aucun dataset
    if (datasets.length === 0) {
      datasets.push({
        data: [0],
        color: () => 'transparent',
        strokeWidth: 0,
      });
    }

    return datasets;
  };

  // Toggle une courbe
  const toggleCurve = (key: 'bodyFat' | 'muscle' | 'water') => {
    setVisibleCurves(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Titre */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Composition corporelle
      </Text>

      {/* Selecteur de periode */}
      <View style={styles.periodRow}>
        {(['7j', '30j', '90j', 'tout'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriod(p)}
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

      {/* Toggle % / kg */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          onPress={() => setDisplayMode('percent')}
          style={[
            styles.modeButton,
            {
              backgroundColor: displayMode === 'percent' ? colors.goldMuted : 'transparent',
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.modeText, { color: displayMode === 'percent' ? colors.gold : colors.textSecondary }]}>
            %
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDisplayMode('kg')}
          style={[
            styles.modeButton,
            {
              backgroundColor: displayMode === 'kg' ? colors.goldMuted : 'transparent',
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.modeText, { color: displayMode === 'kg' ? colors.gold : colors.textSecondary }]}>
            kg
          </Text>
        </TouchableOpacity>
      </View>

      {/* Graphique */}
      {displayData.length > 1 ? (
        <View style={styles.chartContainer}>
          <LineChart
            data={{
              labels: formatLabels(),
              datasets: prepareDatasets(),
            }}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={false}
            segments={4}
          />
        </View>
      ) : (
        <View style={styles.noData}>
          <Text style={[styles.noDataText, { color: colors.textMuted }]}>
            {validData.length === 0
              ? 'Aucune donnee de composition'
              : 'Pas assez de donnees pour cette periode'
            }
          </Text>
          <Text style={[styles.noDataHint, { color: colors.textMuted }]}>
            Ajoute des pesees avec % graisse pour voir l'evolution
          </Text>
        </View>
      )}

      {/* Legende interactive */}
      <View style={styles.legendRow}>
        <TouchableOpacity
          onPress={() => toggleCurve('bodyFat')}
          style={[
            styles.legendItem,
            !visibleCurves.bodyFat && styles.legendItemInactive,
          ]}
        >
          <View style={[styles.legendDot, { backgroundColor: COLORS.bodyFat }]} />
          <Percent size={14} color={visibleCurves.bodyFat ? COLORS.bodyFat : colors.textMuted} />
          <Text style={[styles.legendText, { color: visibleCurves.bodyFat ? colors.textPrimary : colors.textMuted }]}>
            Graisse
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => toggleCurve('muscle')}
          style={[
            styles.legendItem,
            !visibleCurves.muscle && styles.legendItemInactive,
          ]}
        >
          <View style={[styles.legendDot, { backgroundColor: COLORS.muscle }]} />
          <Activity size={14} color={visibleCurves.muscle ? COLORS.muscle : colors.textMuted} />
          <Text style={[styles.legendText, { color: visibleCurves.muscle ? colors.textPrimary : colors.textMuted }]}>
            Muscle
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => toggleCurve('water')}
          style={[
            styles.legendItem,
            !visibleCurves.water && styles.legendItemInactive,
          ]}
        >
          <View style={[styles.legendDot, { backgroundColor: COLORS.water }]} />
          <Droplet size={14} color={visibleCurves.water ? COLORS.water : colors.textMuted} />
          <Text style={[styles.legendText, { color: visibleCurves.water ? colors.textPrimary : colors.textMuted }]}>
            Eau
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats actuelles */}
      {currentStats && (
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          {currentStats.bodyFat !== undefined && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.bodyFat }]}>
                {currentStats.bodyFat.toFixed(1)}%
              </Text>
              {currentStats.bodyFatDelta !== 0 && (
                <Text style={[
                  styles.statDelta,
                  { color: currentStats.bodyFatDelta < 0 ? colors.success : colors.danger }
                ]}>
                  {currentStats.bodyFatDelta > 0 ? '+' : ''}{currentStats.bodyFatDelta.toFixed(1)}
                </Text>
              )}
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Graisse</Text>
            </View>
          )}

          {currentStats.muscle !== undefined && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.muscle }]}>
                {currentStats.muscle.toFixed(1)}%
              </Text>
              {currentStats.muscleDelta !== 0 && (
                <Text style={[
                  styles.statDelta,
                  { color: currentStats.muscleDelta > 0 ? colors.success : colors.danger }
                ]}>
                  {currentStats.muscleDelta > 0 ? '+' : ''}{currentStats.muscleDelta.toFixed(1)}
                </Text>
              )}
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Muscle</Text>
            </View>
          )}

          {currentStats.water !== undefined && (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: COLORS.water }]}>
                {currentStats.water.toFixed(1)}%
              </Text>
              {currentStats.waterDelta !== 0 && (
                <Text style={[
                  styles.statDelta,
                  { color: currentStats.waterDelta > 0 ? colors.success : colors.danger }
                ]}>
                  {currentStats.waterDelta > 0 ? '+' : ''}{currentStats.waterDelta.toFixed(1)}
                </Text>
              )}
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Eau</Text>
            </View>
          )}
        </View>
      )}
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
    marginBottom: 12,
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
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  modeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  chartContainer: {
    marginHorizontal: -10,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  noData: {
    height: 200,
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
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  legendItemInactive: {
    opacity: 0.5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statDelta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default BodyCompositionChart;
