import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { Percent, Activity, Droplet } from 'lucide-react-native';

// ============================================
// GRAPHIQUE COMPOSITION CORPORELLE
// ============================================
// Courbes SVG: Graisse (orange), Muscle (vert), Eau (bleu)

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
  const { colors } = useTheme();
  const [period, setPeriod] = useState<'7j' | '30j' | '90j' | 'tout'>('30j');
  const [displayMode, setDisplayMode] = useState<'percent' | 'kg'>('percent');
  const [visibleCurves, setVisibleCurves] = useState({
    bodyFat: true,
    muscle: true,
    water: true,
  });

  const chartWidth = 300;
  const chartHeight = 200;
  const padding = 20;

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

    const maxPoints = period === '30j' ? 10 : period === '90j' ? 12 : 15;
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

  // Préparer les données pour chaque courbe
  const prepareChartData = (key: 'bodyFat' | 'muscle' | 'water') => {
    if (displayData.length === 0) return [];

    const values = displayData.map(d => getDisplayValue(d, key));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    const xStep = (chartWidth - padding * 2) / Math.max(displayData.length - 1, 1);

    return displayData.map((item, index) => ({
      x: padding + index * xStep,
      y: chartHeight - padding - ((getDisplayValue(item, key) - minValue) / valueRange) * (chartHeight - padding * 2),
      value: getDisplayValue(item, key),
      date: item.date,
    }));
  };

  // Créer un path pour une courbe
  const createPath = (chartData: { x: number; y: number; value: number; date: string }[]) => {
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

  // Toggle une courbe
  const toggleCurve = (key: 'bodyFat' | 'muscle' | 'water') => {
    setVisibleCurves(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Formater les labels de date
  const getDateLabels = () => {
    if (displayData.length === 0) return [];

    const chartData = prepareChartData('bodyFat');

    return chartData.map((point, i) => {
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
          <Svg width={chartWidth} height={chartHeight}>
            {/* Courbe Graisse */}
            {visibleCurves.bodyFat && displayData.some(d => d.bodyFat !== undefined) && (
              <>
                <Path
                  d={createPath(prepareChartData('bodyFat'))}
                  stroke={COLORS.bodyFat}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                {prepareChartData('bodyFat').map((point, index) => (
                  <Circle
                    key={`bodyFat-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#FFFFFF"
                    stroke={COLORS.bodyFat}
                    strokeWidth="2"
                  />
                ))}
              </>
            )}

            {/* Courbe Muscle */}
            {visibleCurves.muscle && displayData.some(d => d.muscle !== undefined) && (
              <>
                <Path
                  d={createPath(prepareChartData('muscle'))}
                  stroke={COLORS.muscle}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                {prepareChartData('muscle').map((point, index) => (
                  <Circle
                    key={`muscle-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#FFFFFF"
                    stroke={COLORS.muscle}
                    strokeWidth="2"
                  />
                ))}
              </>
            )}

            {/* Courbe Eau */}
            {visibleCurves.water && displayData.some(d => d.water !== undefined) && (
              <>
                <Path
                  d={createPath(prepareChartData('water'))}
                  stroke={COLORS.water}
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                />
                {prepareChartData('water').map((point, index) => (
                  <Circle
                    key={`water-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill="#FFFFFF"
                    stroke={COLORS.water}
                    strokeWidth="2"
                  />
                ))}
              </>
            )}
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
