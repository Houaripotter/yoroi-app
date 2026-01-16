import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';
import { Measurement } from '@/lib/database';

// ============================================
// GRAPHIQUE MENSURATIONS
// ============================================
// Courbes multiples pour: taille, hanches, poitrine, bras, etc.
// Selection des mesures a afficher (max 4)

interface MeasurementsChartProps {
  data: Measurement[];
  onPointPress?: (point: Measurement) => void;
}

// Configuration des mesures
const MEASUREMENT_CONFIG: { key: keyof Measurement; label: string; shortLabel: string; color: string }[] = [
  { key: 'waist', label: 'Tour de taille', shortLabel: 'Taille', color: '#F59E0B' },
  { key: 'hips', label: 'Tour de hanches', shortLabel: 'Hanches', color: '#EC4899' },
  { key: 'chest', label: 'Tour de poitrine', shortLabel: 'Poitrine', color: '#8B5CF6' },
  { key: 'shoulders', label: 'Epaules', shortLabel: 'Epaules', color: '#06B6D4' },
  { key: 'neck', label: 'Cou', shortLabel: 'Cou', color: '#84CC16' },
  { key: 'left_arm', label: 'Bras gauche', shortLabel: 'Bras G', color: '#3B82F6' },
  { key: 'right_arm', label: 'Bras droit', shortLabel: 'Bras D', color: '#6366F1' },
  { key: 'left_thigh', label: 'Cuisse gauche', shortLabel: 'Cuisse G', color: '#14B8A6' },
  { key: 'right_thigh', label: 'Cuisse droite', shortLabel: 'Cuisse D', color: '#10B981' },
  { key: 'left_calf', label: 'Mollet gauche', shortLabel: 'Mollet G', color: '#F97316' },
  { key: 'right_calf', label: 'Mollet droit', shortLabel: 'Mollet D', color: '#EF4444' },
];

// Mesures principales par defaut
const DEFAULT_SELECTED = ['waist', 'hips', 'chest'];
const MAX_SELECTED = 4;

export const MeasurementsChart: React.FC<MeasurementsChartProps> = ({
  data,
  onPointPress,
}) => {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<'30j' | '90j' | '6m' | '1a'>('90j');
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>(DEFAULT_SELECTED);

  const chartWidth = 300;
  const chartHeight = 200;
  const padding = 20;

  // Filtrer selon la periode
  const filteredData = useMemo(() => {
    if (data.length === 0) return [];

    const now = new Date();
    const days = period === '30j' ? 30 : period === '90j' ? 90 : period === '6m' ? 180 : 365;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return data
      .filter(d => new Date(d.date) >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data, period]);

  // Limiter les points pour lisibilite
  const displayData = useMemo(() => {
    if (filteredData.length === 0) return [];

    const maxPoints = period === '30j' ? 10 : period === '90j' ? 12 : 15;
    const step = Math.max(1, Math.floor(filteredData.length / maxPoints));

    return filteredData.filter((_, i) =>
      i % step === 0 || i === filteredData.length - 1
    );
  }, [filteredData, period]);

  // Toggle une mesure
  const toggleMeasure = (key: string) => {
    if (selectedMeasures.includes(key)) {
      // Ne pas permettre de tout desactiver
      if (selectedMeasures.length > 1) {
        setSelectedMeasures(prev => prev.filter(k => k !== key));
      }
    } else if (selectedMeasures.length < MAX_SELECTED) {
      setSelectedMeasures(prev => [...prev, key]);
    }
  };

  // Stats pour les mesures selectionnees
  const stats = useMemo(() => {
    if (displayData.length === 0) return {};

    const latest = displayData[displayData.length - 1];
    const first = displayData[0];

    const result: Record<string, { current: number; delta: number; direction: 'up' | 'down' | 'stable' }> = {};

    selectedMeasures.forEach(key => {
      const currentValue = latest[key as keyof Measurement] as number | undefined;
      const firstValue = first[key as keyof Measurement] as number | undefined;

      if (currentValue !== undefined) {
        const delta = firstValue !== undefined ? currentValue - firstValue : 0;
        result[key] = {
          current: currentValue,
          delta,
          direction: delta < -0.5 ? 'down' : delta > 0.5 ? 'up' : 'stable',
        };
      }
    });

    return result;
  }, [displayData, selectedMeasures]);

  // Préparer les données pour chaque mesure
  const prepareChartData = (key: string) => {
    if (displayData.length === 0) return [];

    const values = displayData.map(d => (d[key as keyof Measurement] as number) || 0);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    const xStep = (chartWidth - padding * 2) / Math.max(displayData.length - 1, 1);

    return displayData.map((item, index) => ({
      x: padding + index * xStep,
      y: chartHeight - padding - (((item[key as keyof Measurement] as number) || 0) - minValue) / valueRange * (chartHeight - padding * 2),
      value: (item[key as keyof Measurement] as number) || 0,
      date: item.date,
    }));
  };

  // Créer un path pour une courbe
  const createPath = (chartData: Array<{ x: number; y: number; value: number; date: string }>) => {
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

  // Verifier si des donnees existent pour une mesure
  const hasMeasureData = (key: string) => {
    return data.some(d => d[key as keyof Measurement] !== undefined && d[key as keyof Measurement] !== null);
  };

  // Mesures disponibles (avec donnees)
  const availableMeasures = MEASUREMENT_CONFIG.filter(m => hasMeasureData(m.key));

  // Formater les labels de date
  const getDateLabels = () => {
    if (displayData.length === 0 || selectedMeasures.length === 0) return [];

    const chartData = prepareChartData(selectedMeasures[0]);

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
        Evolution des mensurations
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

      {/* Selecteur de mesures */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.measureSelector}
        contentContainerStyle={styles.measureSelectorContent}
      >
        {availableMeasures.map((measure) => {
          const isSelected = selectedMeasures.includes(measure.key);
          const canSelect = selectedMeasures.length < MAX_SELECTED || isSelected;

          return (
            <TouchableOpacity
              key={measure.key}
              onPress={() => toggleMeasure(measure.key)}
              disabled={!canSelect && !isSelected}
              style={[
                styles.measureChip,
                {
                  backgroundColor: isSelected ? measure.color + '20' : 'transparent',
                  borderColor: isSelected ? measure.color : colors.border,
                  opacity: canSelect || isSelected ? 1 : 0.4,
                },
              ]}
              activeOpacity={0.7}
            >
              <View style={[styles.measureDot, { backgroundColor: measure.color }]} />
              <Text style={[
                styles.measureChipText,
                { color: isSelected ? measure.color : colors.textSecondary },
              ]}>
                {measure.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[styles.measureHint, { color: colors.textMuted }]}>
        Tap pour afficher/masquer (max {MAX_SELECTED})
      </Text>

      {/* Graphique */}
      {displayData.length > 1 && selectedMeasures.length > 0 ? (
        <View style={styles.chartContainer}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Dessiner chaque courbe sélectionnée */}
            {selectedMeasures.map(key => {
              const config = MEASUREMENT_CONFIG.find(m => m.key === key);
              if (!config) return null;

              const chartData = prepareChartData(key);

              return (
                <React.Fragment key={key}>
                  <Path
                    d={createPath(chartData)}
                    stroke={config.color}
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                  {chartData.map((point, index) => (
                    <Circle
                      key={`${key}-${index}`}
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="#FFFFFF"
                      stroke={config.color}
                      strokeWidth="2"
                    />
                  ))}
                </React.Fragment>
              );
            })}
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
              ? 'Aucune mensuration enregistree'
              : 'Pas assez de donnees pour cette periode'
            }
          </Text>
          <Text style={[styles.noDataHint, { color: colors.textMuted }]}>
            Ajoute des mensurations pour voir l'evolution
          </Text>
        </View>
      )}

      {/* Stats rapides */}
      {Object.keys(stats).length > 0 && (
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          {selectedMeasures.map(key => {
            const config = MEASUREMENT_CONFIG.find(m => m.key === key);
            const stat = stats[key];

            if (!stat || !config) return null;

            return (
              <View key={key} style={styles.statItem}>
                <Text style={[styles.statValue, { color: config.color }]}>
                  {stat.current.toFixed(0)} cm
                </Text>
                {stat.delta !== 0 && (
                  <View style={styles.statDeltaRow}>
                    {stat.direction === 'down' ? (
                      <TrendingDown size={12} color={colors.success} />
                    ) : stat.direction === 'up' ? (
                      <TrendingUp size={12} color={colors.danger} />
                    ) : (
                      <Minus size={12} color={colors.textMuted} />
                    )}
                    <Text style={[
                      styles.statDelta,
                      { color: stat.direction === 'down' ? colors.success : stat.direction === 'up' ? colors.danger : colors.textMuted }
                    ]}>
                      {stat.delta > 0 ? '+' : ''}{stat.delta.toFixed(0)}
                    </Text>
                  </View>
                )}
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {config.shortLabel}
                </Text>
              </View>
            );
          })}
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
  measureSelector: {
    marginBottom: 4,
  },
  measureSelectorContent: {
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  measureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  measureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  measureChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  measureHint: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 12,
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statDeltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  statDelta: {
    fontSize: 11,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});

export default MeasurementsChart;
