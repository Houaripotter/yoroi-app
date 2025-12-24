import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Weight } from '@/lib/database';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 240;
const PADDING_LEFT = 45;
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 40;

interface WeightStatsProps {
  data: Weight[];
}

type Period = '7d' | '30d' | '90d' | 'all';

export const WeightStats: React.FC<WeightStatsProps> = ({ data }) => {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>('30d');
  const [selectedPoint, setSelectedPoint] = useState<{
    index: number;
    weight: number;
    date: string;
    x: number;
    y: number;
  } | null>(null);

  // Filtrer les données selon la période
  const getFilteredData = (): Weight[] => {
    if (data.length === 0) return [];

    const now = new Date();
    let daysBack = 30;

    switch (period) {
      case '7d': daysBack = 7; break;
      case '30d': daysBack = 30; break;
      case '90d': daysBack = 90; break;
      case 'all': return data;
    }

    const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    return data.filter(entry => new Date(entry.date) >= cutoff);
  };

  const filteredData = getFilteredData();

  // Calculer les stats
  const getStats = () => {
    if (filteredData.length === 0) {
      return { min: 0, max: 0, avg: 0, start: 0, end: 0, change: 0 };
    }

    const values = filteredData.map(d => d.weight);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const start = filteredData[0].weight;
    const end = filteredData[filteredData.length - 1].weight;
    const change = end - start;

    return { min, max, avg, start, end, change };
  };

  const stats = getStats();

  // Préparer les points pour le graphique
  const chartData = filteredData.map((entry, index) => {
    const x = PADDING_LEFT + ((CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT) * index) / Math.max(filteredData.length - 1, 1);

    // Calculer Y avec une marge de 5% en haut et en bas
    const range = stats.max - stats.min;
    const paddedMin = stats.min - range * 0.05;
    const paddedMax = stats.max + range * 0.05;
    const paddedRange = paddedMax - paddedMin || 1;

    const y = CHART_HEIGHT - PADDING_BOTTOM - ((entry.weight - paddedMin) / paddedRange) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);

    return { ...entry, x, y };
  });

  // Créer le path de la ligne
  const createPath = () => {
    if (chartData.length === 0) return '';

    let path = `M ${chartData[0].x} ${chartData[0].y}`;

    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];

      // Courbe de Bézier pour un rendu lisse
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

  // Générer les labels Y (5 niveaux)
  const getYLabels = () => {
    if (stats.max === 0) return [];

    const range = stats.max - stats.min;
    const paddedMin = stats.min - range * 0.05;
    const paddedMax = stats.max + range * 0.05;

    const labels = [];
    for (let i = 0; i < 5; i++) {
      const value = paddedMin + ((paddedMax - paddedMin) * (4 - i)) / 4;
      labels.push(value.toFixed(1));
    }
    return labels;
  };

  const yLabels = getYLabels();

  return (
    <View style={styles.container}>
      {/* Période */}
      <View style={styles.periodRow}>
        {(['7d', '30d', '90d', 'all'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodButton,
              { backgroundColor: period === p ? colors.accent : colors.backgroundElevated },
            ]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[
              styles.periodText,
              { color: period === p ? '#FFF' : colors.textPrimary },
            ]}>
              {p === 'all' ? 'Tout' : p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats résumé */}
      <View style={[styles.statsCard, { backgroundColor: colors.backgroundElevated }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Début</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.start ? `${stats.start.toFixed(1)} kg` : '-- kg'}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Fin</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.end ? `${stats.end.toFixed(1)} kg` : '-- kg'}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Évolution</Text>
          <View style={styles.changeRow}>
            {stats.change < 0 ? (
              <TrendingDown size={16} color="#4CAF50" />
            ) : stats.change > 0 ? (
              <TrendingUp size={16} color="#E53935" />
            ) : null}
            <Text style={[
              styles.statValue,
              { color: stats.change <= 0 ? '#4CAF50' : '#E53935' },
            ]}>
              {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)} kg
            </Text>
          </View>
        </View>
      </View>

      {/* Graphique en ligne moderne */}
      <View style={[styles.chartCard, { backgroundColor: colors.backgroundElevated }]}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
          Évolution du poids
        </Text>
        <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
          {period === '7d' ? '7 derniers jours' : period === '30d' ? '30 derniers jours' : period === '90d' ? '90 derniers jours' : 'Toutes les données'}
        </Text>

        {chartData.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Aucune donnée pour cette période
            </Text>
          </View>
        ) : (
          <View style={styles.chart}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.accent} stopOpacity="0.3" />
                  <Stop offset="1" stopColor={colors.accent} stopOpacity="0.05" />
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
                    width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                    height={1}
                    fill={colors.border}
                    opacity={0.3}
                  />
                );
              })}

              {/* Zone sous la courbe avec gradient */}
              <Path
                d={createAreaPath()}
                fill="url(#lineGradient)"
              />

              {/* Ligne de tendance */}
              <Path
                d={createPath()}
                stroke={colors.accent}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points sur la courbe */}
              {chartData.map((point, index) => (
                <React.Fragment key={index}>
                  {/* Cercle extérieur blanc */}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={6}
                    fill="#FFFFFF"
                  />
                  {/* Cercle intérieur avec couleur d'accent */}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill={colors.accent}
                    onPress={() => {
                      setSelectedPoint({
                        index,
                        weight: point.weight,
                        date: point.date,
                        x: point.x,
                        y: point.y,
                      });

                      setTimeout(() => {
                        setSelectedPoint(null);
                      }, 3000);
                    }}
                  />
                </React.Fragment>
              ))}
            </Svg>

            {/* Labels Y */}
            <View style={styles.yLabelsContainer}>
              {yLabels.map((label, index) => (
                <Text key={index} style={[styles.yLabel, { color: colors.textMuted }]}>
                  {label}
                </Text>
              ))}
            </View>

            {/* Labels X (dates) */}
            <View style={styles.xLabelsContainer}>
              {chartData.filter((_, index) => {
                // Afficher max 5 dates
                const step = Math.max(1, Math.floor(chartData.length / 5));
                return index % step === 0 || index === chartData.length - 1;
              }).map((point, index) => (
                <View key={index} style={[styles.xLabelWrapper, { left: point.x - 30 }]}>
                  <Text style={[styles.xLabel, { color: colors.textMuted }]}>
                    {format(parseISO(point.date), 'd MMM', { locale: fr })}
                  </Text>
                </View>
              ))}
            </View>

            {/* Valeurs au-dessus des points */}
            {chartData.filter((_, index) => {
              // Afficher les valeurs tous les N points pour éviter le chevauchement
              const step = Math.max(1, Math.floor(chartData.length / 6));
              return index % step === 0 || index === chartData.length - 1;
            }).map((point, index) => (
              <View key={index} style={[styles.valueLabel, { left: point.x - 20, top: point.y - 30 }]}>
                <Text style={[styles.valueLabelText, { color: colors.accent }]}>
                  {point.weight.toFixed(1)}
                </Text>
              </View>
            ))}

            {/* Tooltip */}
            {selectedPoint && (
              <View
                style={[
                  styles.tooltip,
                  {
                    left: selectedPoint.x - 60,
                    top: selectedPoint.y - 80,
                  },
                ]}
              >
                <View style={[styles.tooltipContent, { backgroundColor: '#1F2937', shadowColor: '#000' }]}>
                  <Text style={styles.tooltipValue}>
                    {selectedPoint.weight.toFixed(1)} kg
                  </Text>
                  <Text style={styles.tooltipDate}>
                    {format(parseISO(selectedPoint.date), 'd MMMM yyyy', { locale: fr })}
                  </Text>
                </View>
                <View style={[styles.tooltipArrow, { borderTopColor: '#1F2937' }]} />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Historique */}
      <View style={[styles.historyCard, { backgroundColor: colors.backgroundElevated }]}>
        <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
          Historique récent
        </Text>

        {filteredData.slice(-10).reverse().map((entry, index) => (
          <View
            key={index}
            style={[
              styles.historyItem,
              index < Math.min(filteredData.length, 10) - 1 && {
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
              {format(new Date(entry.date), 'd MMMM yyyy', { locale: fr })}
            </Text>
            <Text style={[styles.historyValue, { color: colors.textPrimary }]}>
              {entry.weight.toFixed(1)} kg
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Period
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Stats card
  statsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  // Chart
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  emptyChart: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  chart: {
    height: CHART_HEIGHT,
    position: 'relative',
  },
  yLabelsContainer: {
    position: 'absolute',
    left: 0,
    top: PADDING_TOP,
    height: CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM,
    justifyContent: 'space-between',
  },
  yLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  xLabelsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  valueLabel: {
    position: 'absolute',
    width: 40,
    alignItems: 'center',
  },
  valueLabelText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // History
  historyCard: {
    borderRadius: 16,
    padding: 16,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  historyDate: {
    fontSize: 14,
  },
  historyValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Tooltip
  tooltip: {
    position: 'absolute',
    zIndex: 1000,
  },
  tooltipContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  tooltipDate: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
  },
});
