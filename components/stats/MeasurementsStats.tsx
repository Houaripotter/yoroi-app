import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Ruler, TrendingDown, TrendingUp } from 'lucide-react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 64;
const CHART_HEIGHT = 200;
const PADDING_LEFT = 45;
const PADDING_RIGHT = 20;
const PADDING_TOP = 20;
const PADDING_BOTTOM = 40;

interface MeasurementsStatsProps {
  data: any[];
}

type MeasurementType = 'waist' | 'chest' | 'hips' | 'shoulders';

export const MeasurementsStats: React.FC<MeasurementsStatsProps> = ({ data }) => {
  const { colors } = useTheme();
  const [selectedMetric, setSelectedMetric] = useState<MeasurementType>('waist');

  // Get latest measurements from data
  const latestMeasurement = data && data.length > 0 ? data[data.length - 1] : null;
  const firstMeasurement = data && data.length > 0 ? data[0] : null;

  // Définir les métriques disponibles
  const metricsConfig = [
    { key: 'waist' as MeasurementType, label: 'Tour de taille', color: '#FF6B6B' },
    { key: 'chest' as MeasurementType, label: 'Tour de poitrine', color: '#4ECDC4' },
    { key: 'hips' as MeasurementType, label: 'Tour de hanches', color: '#EC4899' },
    { key: 'shoulders' as MeasurementType, label: 'Tour d\'épaules', color: '#8B5CF6' },
  ];

  // Calculer les stats pour la métrique sélectionnée
  const getStats = () => {
    if (!data || data.length === 0) return { change: 0, start: 0, current: 0 };

    const start = firstMeasurement?.[selectedMetric] || 0;
    const current = latestMeasurement?.[selectedMetric] || 0;
    const change = current - start;

    return { change, start, current };
  };

  const stats = getStats();
  const currentMetric = metricsConfig.find(m => m.key === selectedMetric)!;

  // Préparer les données du graphique
  const chartData = data.map((entry, index) => {
    const value = entry[selectedMetric] || 0;
    const values = data.map(d => d[selectedMetric] || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const x = PADDING_LEFT + ((CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT) * index) / Math.max(data.length - 1, 1);

    // Calculer Y avec une marge de 5%
    const range = max - min;
    const paddedMin = min - range * 0.05;
    const paddedMax = max + range * 0.05;
    const paddedRange = paddedMax - paddedMin || 1;

    const y = CHART_HEIGHT - PADDING_BOTTOM - ((value - paddedMin) / paddedRange) * (CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM);

    return { ...entry, value, x, y };
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

  // Générer les labels Y
  const getYLabels = () => {
    if (chartData.length === 0) return [];

    const values = chartData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const paddedMin = min - range * 0.05;
    const paddedMax = max + range * 0.05;

    const labels = [];
    for (let i = 0; i < 5; i++) {
      const value = paddedMin + ((paddedMax - paddedMin) * (4 - i)) / 4;
      labels.push(value.toFixed(1));
    }
    return labels;
  };

  const yLabels = getYLabels();

  // Toutes les mesures actuelles
  const allMeasurements = latestMeasurement ? [
    { label: 'Tour de cou', value: latestMeasurement.neck, unit: 'cm', color: '#8B5CF6' },
    { label: 'Épaules', value: latestMeasurement.shoulders, unit: 'cm', color: '#4ECDC4' },
    { label: 'Poitrine', value: latestMeasurement.chest, unit: 'cm', color: '#3B82F6' },
    { label: 'Taille', value: latestMeasurement.waist, unit: 'cm', color: '#FF6B6B' },
    { label: 'Hanches', value: latestMeasurement.hips, unit: 'cm', color: '#EC4899' },
    { label: 'Bras gauche', value: latestMeasurement.left_arm, unit: 'cm', color: '#10B981' },
    { label: 'Bras droit', value: latestMeasurement.right_arm, unit: 'cm', color: '#059669' },
    { label: 'Cuisse gauche', value: latestMeasurement.left_thigh, unit: 'cm', color: '#A78BFA' },
    { label: 'Cuisse droite', value: latestMeasurement.right_thigh, unit: 'cm', color: '#7C3AED' },
    { label: 'Mollet gauche', value: latestMeasurement.left_calf, unit: 'cm', color: '#F59E0B' },
    { label: 'Mollet droit', value: latestMeasurement.right_calf, unit: 'cm', color: '#D97706' },
  ].filter(m => m.value) : [];

  return (
    <View style={styles.container}>
      {/* Stats rapides */}
      <View style={[styles.statsCard, { backgroundColor: colors.backgroundElevated }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Début</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.start ? `${stats.start.toFixed(1)} cm` : '-- cm'}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Actuel</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {stats.current ? `${stats.current.toFixed(1)} cm` : '-- cm'}
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
              {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)} cm
            </Text>
          </View>
        </View>
      </View>

      {/* Sélecteur de métrique */}
      <View style={styles.metricsRow}>
        {metricsConfig.map((metric) => (
          <TouchableOpacity
            key={metric.key}
            style={[
              styles.metricButton,
              {
                backgroundColor: selectedMetric === metric.key ? colors.accent : colors.backgroundElevated,
                borderColor: selectedMetric === metric.key ? colors.accent : colors.border,
              },
            ]}
            onPress={() => setSelectedMetric(metric.key)}
          >
            <View style={[styles.metricDot, { backgroundColor: metric.color }]} />
            <Text style={[
              styles.metricText,
              { color: selectedMetric === metric.key ? '#FFF' : colors.textPrimary },
            ]}>
              {metric.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Graphique */}
      <View style={[styles.chartCard, { backgroundColor: colors.backgroundElevated }]}>
        <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
          Évolution - {currentMetric.label}
        </Text>
        <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
          {data.length} mesures enregistrées
        </Text>

        {chartData.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Aucune donnée disponible
            </Text>
          </View>
        ) : (
          <View style={styles.chart}>
            <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
              <Defs>
                <LinearGradient id="measurementGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={currentMetric.color} stopOpacity="0.3" />
                  <Stop offset="1" stopColor={currentMetric.color} stopOpacity="0.05" />
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
                fill="url(#measurementGradient)"
              />

              {/* Ligne de tendance */}
              <Path
                d={createPath()}
                stroke={currentMetric.color}
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
                    r={5}
                    fill="#FFFFFF"
                  />
                  {/* Cercle intérieur avec couleur */}
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={3}
                    fill={currentMetric.color}
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
                    {format(new Date(point.date), 'd MMM', { locale: fr })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Toutes les mesures */}
      {allMeasurements.length > 0 && (
        <View style={[styles.measurementsCard, { backgroundColor: colors.backgroundElevated }]}>
          <Text style={[styles.measurementsTitle, { color: colors.textPrimary }]}>
            Toutes les mesures
          </Text>
          <Text style={[styles.measurementsSubtitle, { color: colors.textMuted }]}>
            Dernière mesure: {latestMeasurement && format(new Date(latestMeasurement.date), 'd MMMM yyyy', { locale: fr })}
          </Text>

          {allMeasurements.map((measure, index) => (
            <View
              key={measure.label}
              style={[
                styles.measurementItem,
                index < allMeasurements.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.measurementLeft}>
                <View style={[styles.measurementDot, { backgroundColor: measure.color }]} />
                <Text style={[styles.measurementLabel, { color: colors.textPrimary }]}>
                  {measure.label}
                </Text>
              </View>
              <Text style={[styles.measurementValue, { color: colors.textPrimary }]}>
                {measure.value} {measure.unit}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  // Stats
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

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  metricDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  metricText: {
    fontSize: 13,
    fontWeight: '600',
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

  // Measurements
  measurementsCard: {
    borderRadius: 16,
    padding: 16,
  },
  measurementsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  measurementsSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  measurementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  measurementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  measurementDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  measurementLabel: {
    fontSize: 15,
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
