import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { TrendingDown, TrendingUp, Weight as WeightIcon, Target, ArrowDown, ArrowUp, Maximize2 } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Weight } from '@/lib/database';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { SparklineChart } from '../charts/SparklineChart';
import { StatsDetailModal } from '../StatsDetailModal';
import { getHistoryDays, scale, scaleModerate, isIPad } from '@/constants/responsive';

const { width } = Dimensions.get('window');
// iPhone garde le padding original de 16, iPad utilise scale(8)
const CONTAINER_PADDING = isIPad() ? scale(8) : 16;
const CHART_WIDTH = width - CONTAINER_PADDING * 2;
const CHART_HEIGHT = scale(240);
const PADDING_LEFT = scale(45);
const PADDING_RIGHT = scale(20);
const PADDING_TOP = scale(20);
const PADDING_BOTTOM = scale(40);

// Largeur des cartes statistiques - 2 colonnes sur iPhone, 4 colonnes sur iPad
const STATS_COLUMNS = isIPad() ? 4 : 2;
const STATS_GAP = 12; // Gap fixe pour tous les appareils
// Largeur carte = (largeur totale - padding container - gaps entre colonnes) / nombre colonnes
// Pour 2 colonnes: 1 gap de 12px entre elles
const STATS_CARD_WIDTH = (width - CONTAINER_PADDING * 2 - STATS_GAP * (STATS_COLUMNS - 1)) / STATS_COLUMNS;
// Largeur du sparkline = largeur carte - padding (14*2) + margin négatif (6*2)
const SPARKLINE_WIDTH = STATS_CARD_WIDTH - 28 + 12;

interface WeightStatsProps {
  data: Weight[];
}

type Period = '7j' | '30j' | '90j' | 'all';

export const WeightStats: React.FC<WeightStatsProps> = ({ data }) => {
  const { colors, isDark } = useTheme();
  const [period, setPeriod] = useState<Period>('30j');
  const [selectedPoint, setSelectedPoint] = useState<{
    index: number;
    weight: number;
    date: string;
    x: number;
    y: number;
  } | null>(null);
  const [selectedStat, setSelectedStat] = useState<{
    key: string;
    label: string;
    color: string;
    unit: string;
    icon: React.ReactNode;
  } | null>(null);

  // Filtrer les données selon la période
  const getFilteredData = (): Weight[] => {
    if (data.length === 0) return [];

    const now = new Date();
    let daysBack = 30;

    switch (period) {
      case '7j': daysBack = 7; break;
      case '30j': daysBack = 30; break;
      case '90j': daysBack = 90; break;
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

  // Préparer les données sparkline - Adapté à l'appareil
  const historyDays = getHistoryDays(); // 3 sur iPhone, 7 sur iPad
  const sparklineData = data.slice(-historyDays).map(entry => ({ value: entry.weight }));

  // Objectif de poids (null si pas de données)
  const goalWeight = stats.end > 0 ? stats.end - 2 : null;

  // Calculer la position Y de la ligne d'objectif
  const getGoalLineY = () => {
    const range = stats.max - stats.min;
    const paddedMin = stats.min - range * 0.05;
    const paddedMax = stats.max + range * 0.05;
    const paddedRange = paddedMax - paddedMin || 1;
    if (!goalWeight) return 0;
    return CHART_HEIGHT - PADDING_BOTTOM - ((goalWeight - paddedMin) / paddedRange) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
  };

  const goalLineY = getGoalLineY();

  const weightCards = [
    {
      key: 'current',
      label: 'Poids Actuel',
      icon: <WeightIcon size={18} color="#22C55E" />,
      color: '#22C55E',
      value: stats.end,
      unit: 'kg',
    },
    {
      key: 'goal',
      label: 'Objectif',
      icon: <Target size={18} color="#3B82F6" />,
      color: '#3B82F6',
      value: goalWeight,
      unit: 'kg',
    },
    {
      key: 'min',
      label: 'Minimum',
      icon: <ArrowDown size={18} color="#10B981" />,
      color: '#10B981',
      value: stats.min,
      unit: 'kg',
    },
    {
      key: 'max',
      label: 'Maximum',
      icon: <ArrowUp size={18} color="#EF4444" />,
      color: '#EF4444',
      value: stats.max,
      unit: 'kg',
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Période */}
      <View style={styles.periodRow}>
        {(['7j', '30j', '90j', 'all'] as Period[]).map((p) => (
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

      {/* Grille des 4 stats avec sparklines */}
      <View style={styles.statsGrid}>
        {weightCards.map((card) => {
          const hasData = sparklineData.length > 0;

          return (
            <TouchableOpacity
              key={card.key}
              style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}
              activeOpacity={0.7}
              onPress={() => hasData && card.key === 'current' && setSelectedStat({
                key: card.key,
                label: card.label,
                color: card.color,
                unit: card.unit,
                icon: card.icon,
              })}
            >
              {/* Expand icon */}
              {hasData && card.key === 'current' && (
                <View style={styles.expandIcon}>
                  <Maximize2 size={16} color="#1F2937" opacity={0.9} />
                </View>
              )}

              {/* Icon */}
              <View style={styles.statIconContainer}>
                {card.icon}
              </View>

              {/* Label */}
              <Text style={[styles.statCardLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {card.label}
              </Text>

              {/* Value */}
              <Text style={[styles.statCardValue, { color: colors.textPrimary }]}>
                {card.value && card.value > 0 ? card.value.toFixed(1) : '--'}
                <Text style={[styles.statCardUnit, { color: colors.textMuted }]}>
                  {' '}{card.unit}
                </Text>
              </Text>

              {/* Sparkline */}
              {hasData && (
                <View style={styles.sparklineContainer}>
                  <SparklineChart
                    data={sparklineData}
                    width={SPARKLINE_WIDTH}
                    height={40}
                    color={card.color}
                    showGradient={true}
                    thickness={1.5}
                    showLastValues={sparklineData.length}
                    valueUnit={card.unit}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Graphique en ligne moderne */}
      <View style={[styles.chartCard, { backgroundColor: colors.backgroundElevated }]}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
          Évolution du poids
        </Text>
        <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
          {period === '7j' ? '7 derniers jours' : period === '30j' ? '30 derniers jours' : period === '90j' ? '90 derniers jours' : 'Toutes les données'}
        </Text>

        {/* Résumé Actuel/Objectif/Reste */}
        {stats.end > 0 && (
          <View style={[styles.weightSummary, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)' }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Actuel</Text>
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>
                {stats.end.toFixed(1)} kg
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Objectif</Text>
              <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>
                {goalWeight ? goalWeight.toFixed(1) : '--'} kg
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Reste</Text>
              <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
                {goalWeight ? (stats.end - goalWeight).toFixed(1) : '--'} kg
              </Text>
            </View>
          </View>
        )}

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
                  <Stop offset="0" stopColor={colors.accent} stopOpacity="0.4" />
                  <Stop offset="0.5" stopColor={colors.accent} stopOpacity="0.2" />
                  <Stop offset="1" stopColor={colors.accent} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>

              {/* Fond clair en mode sombre pour améliorer la visibilité du graphique */}
              {isDark && (
                <Rect
                  x={PADDING_LEFT - 5}
                  y={PADDING_TOP - 5}
                  width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT + 10}
                  height={CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM + 10}
                  rx={8}
                  ry={8}
                  fill="rgba(255, 255, 255, 0.06)"
                />
              )}

              {/* Zones de poids colorées (en fond) */}
              {(() => {
                const range = stats.max - stats.min;
                const paddedMin = stats.min - range * 0.05;
                const paddedMax = stats.max + range * 0.05;
                const paddedRange = paddedMax - paddedMin || 1;

                // Calculer les positions Y des zones autour de l'objectif
                const goal = goalWeight ?? stats.end;
                const zoneOptimalMin = goal - 2; // -2kg de l'objectif
                const zoneOptimalMax = goal + 2; // +2kg de l'objectif

                const getYPosition = (weight: number) => {
                  return CHART_HEIGHT - PADDING_BOTTOM - ((weight - paddedMin) / paddedRange) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);
                };

                const yOptimalMin = getYPosition(zoneOptimalMax);
                const yOptimalMax = getYPosition(zoneOptimalMin);
                const yTop = PADDING_TOP;
                const yBottom = CHART_HEIGHT - PADDING_BOTTOM;

                return (
                  <>
                    {/* Zone au-dessus de l'optimal (surpoids potentiel) */}
                    {yOptimalMin > yTop && (
                      <Rect
                        x={PADDING_LEFT}
                        y={yTop}
                        width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                        height={Math.max(0, yOptimalMin - yTop)}
                        fill="#F59E0B"
                        opacity={0.08}
                      />
                    )}

                    {/* Zone optimale (±2kg de l'objectif) */}
                    <Rect
                      x={PADDING_LEFT}
                      y={Math.max(yTop, yOptimalMin)}
                      width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                      height={Math.max(0, Math.min(yBottom, yOptimalMax) - Math.max(yTop, yOptimalMin))}
                      fill="#10B981"
                      opacity={0.12}
                    />

                    {/* Zone en-dessous de l'optimal */}
                    {yOptimalMax < yBottom && (
                      <Rect
                        x={PADDING_LEFT}
                        y={Math.max(yTop, yOptimalMax)}
                        width={CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT}
                        height={Math.max(0, yBottom - Math.max(yTop, yOptimalMax))}
                        fill="#F59E0B"
                        opacity={0.08}
                      />
                    )}
                  </>
                );
              })()}

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

              {/* Ligne d'objectif en pointillé */}
              {stats.end > 0 && (
                <>
                  <Path
                    d={`M ${PADDING_LEFT} ${goalLineY} L ${CHART_WIDTH - PADDING_RIGHT} ${goalLineY}`}
                    stroke="#3B82F6"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    fill="none"
                    opacity={0.7}
                  />
                </>
              )}

              {/* Zone sous la courbe avec gradient */}
              <Path
                d={createAreaPath()}
                fill="url(#lineGradient)"
              />

              {/* Ligne de tendance */}
              <Path
                d={createPath()}
                stroke={colors.accent}
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points sur la courbe - Design moderne */}
              {chartData.map((point, index) => (
                <React.Fragment key={index}>
                  {/* Cercle extérieur avec ombre */}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={8}
                    fill="#FFFFFF"
                    opacity={0.95}
                  />
                  {/* Cercle intérieur avec couleur d'accent */}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={5}
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
                <Text key={index} style={[styles.yLabel, { color: isDark ? '#FFFFFF' : colors.textMuted }]}>
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
                  <Text style={[styles.xLabel, { color: isDark ? '#FFFFFF' : colors.textMuted }]}>
                    {format(parseISO(point.date), 'd MMM', { locale: fr })}
                  </Text>
                </View>
              ))}
            </View>

            {/* Valeurs au-dessus des points - Design amélioré */}
            {chartData.filter((_, index) => {
              // Afficher tous les points si moins de 7, sinon espacer intelligemment
              if (chartData.length <= 7) return true;
              const step = Math.max(1, Math.floor(chartData.length / 7));
              return index % step === 0 || index === chartData.length - 1;
            }).map((point, index) => (
              <View key={index} style={[styles.valueLabel, { left: point.x - 24, top: point.y - 36 }]}>
                <View style={[styles.valueBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.valueBadgeText}>
                    {point.weight.toFixed(1)} kg
                  </Text>
                </View>
              </View>
            ))}

            {/* Label de l'objectif */}
            {stats.end > 0 && goalWeight && (
              <View style={[styles.goalLabel, { left: CHART_WIDTH - PADDING_RIGHT - 50, top: goalLineY - 12 }]}>
                <Text style={[styles.goalLabelText, { color: '#3B82F6' }]}>
                  Obj: {goalWeight.toFixed(1)}
                </Text>
              </View>
            )}

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

        {/* Légende du graphique */}
        {chartData.length > 0 && (
          <View style={[styles.chartLegend, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Poids</Text>
            </View>
            {stats.end > 0 && (
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.legendText, { color: colors.textMuted }]}>Objectif</Text>
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

      {/* Modal de détail */}
      {selectedStat && (
        <StatsDetailModal
          visible={selectedStat !== null}
          onClose={() => setSelectedStat(null)}
          title={selectedStat.label}
          subtitle="Évolution du poids"
          data={filteredData.map((entry, index) => ({
            value: entry.weight,
            label: format(parseISO(entry.date), 'd MMM', { locale: fr }),
            date: entry.date,
          }))}
          color={selectedStat.color}
          unit={selectedStat.unit}
          icon={selectedStat.icon}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: CONTAINER_PADDING,
    paddingBottom: 150,
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

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: STATS_CARD_WIDTH,
    borderRadius: 16,
    padding: 14,
    minHeight: 140,
    position: 'relative',
    marginBottom: STATS_GAP,
  },
  expandIcon: {
    position: 'absolute',
    top: 14,
    left: 48,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  statCardUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  sparklineContainer: {
    marginTop: 'auto',
    marginHorizontal: -6,
  },

  // Old stats card (keeping for compatibility)
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
  valueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  valueBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  goalLabel: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
  },
  goalLabelText: {
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3B82F6',
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

  // Weight Summary
  weightSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Chart Legend
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
    opacity: 0.7,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
