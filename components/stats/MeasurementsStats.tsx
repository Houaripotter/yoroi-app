import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { Ruler, TrendingDown, TrendingUp, Maximize2 } from 'lucide-react-native';
import { SparklineChart } from '../charts/SparklineChart';
import { StatsDetailModal } from '../StatsDetailModal';
import { scale, isIPad, getHistoryDays } from '@/constants/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATS_COLUMNS = isIPad() ? 4 : 2;
const STATS_GAP = 12;
const CONTAINER_PADDING = isIPad() ? scale(8) : 16;
const STATS_CARD_WIDTH = (SCREEN_WIDTH - CONTAINER_PADDING * 2 - STATS_GAP * (STATS_COLUMNS - 1)) / STATS_COLUMNS;
// Largeur du sparkline = largeur carte - padding (14*2) + margin négatif (6*2)
const SPARKLINE_WIDTH = STATS_CARD_WIDTH - 28 + 12;

interface MeasurementsStatsProps {
  data: any[];
}

export const MeasurementsStats: React.FC<MeasurementsStatsProps> = ({ data }) => {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const [selectedMeasurement, setSelectedMeasurement] = useState<{
    id: string;
    label: string;
    color: string;
  } | null>(null);

  const latest = data && data.length > 0 ? data[data.length - 1] : null;
  const previous = data && data.length > 1 ? data[data.length - 2] : null;

  // Définir les mensurations avec couleurs
  const measurements = [
    { id: 'waist', label: 'Tour de taille', color: '#EF4444' },
    { id: 'hips', label: 'Hanches', color: '#F97316' },
    { id: 'chest', label: 'Poitrine', color: '#22C55E' },
    { id: 'neck', label: 'Cou', color: '#3B82F6' },
    { id: 'left_arm', label: 'Bras (biceps)', color: '#8B5CF6' },
    { id: 'left_thigh', label: 'Cuisse', color: '#EC4899' },
    { id: 'left_calf', label: 'Mollet', color: '#06B6D4' },
  ];

  // Préparer les données pour les sparklines (SEULEMENT 3 dernières prises comme CompositionStats)
  const getSparklineData = (key: string) => {
    const historyDays = getHistoryDays(); // 3 sur iPhone, 7 sur iPad
    if (!data || data.length === 0) return [];
    return data.slice(-historyDays).map(entry => ({
      value: (entry as any)[key] || 0,
    })).filter(d => d.value > 0);
  };

  // Calculer la tendance - EXACTEMENT comme CompositionStats
  const getTrend = (current: number | undefined, prev: number | undefined): 'up' | 'down' | 'stable' => {
    if (!current || !prev) return 'stable';
    const diff = current - prev;
    const percentChange = Math.abs(diff / prev) * 100;
    if (percentChange < 2) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const getChange = (current: number | undefined, prev: number | undefined): string => {
    if (!current || !prev) return '';
    const diff = current - prev;
    return diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
  };

  // Historique complet pour le modal
  const getFullHistory = (key: string) => {
    if (!data || data.length === 0) return [];
    return data.map(entry => ({
      value: (entry as any)[key] || 0,
      date: entry.date,
    })).filter(d => d.value > 0);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Grille des métriques - EXACTEMENT comme CompositionStats */}
      <View style={styles.metricsGrid}>
        {measurements.map((metric) => {
          const sparklineData = getSparklineData(metric.id);
          const currentValue = (latest as any)?.[metric.id];
          const prevValue = (previous as any)?.[metric.id];
          const trend = getTrend(currentValue, prevValue);
          const change = getChange(currentValue, prevValue);
          const hasData = sparklineData.length > 0 && sparklineData.some(d => d.value > 0);

          return (
            <TouchableOpacity
              key={metric.id}
              style={[styles.metricCard, { backgroundColor: colors.backgroundCard }]}
              activeOpacity={0.7}
              onPress={() => hasData && setSelectedMeasurement({
                id: metric.id,
                label: metric.label,
                color: metric.color,
              })}
            >
              {/* Expand icon - EXACTEMENT comme CompositionStats (à côté de l'icône) */}
              <View style={styles.expandIcon}>
                <Maximize2 size={16} color="#1F2937" opacity={0.9} />
              </View>

              {/* Header */}
              <View style={styles.metricHeader}>
                <View style={[styles.metricIconContainer, { backgroundColor: metric.color + '20' }]}>
                  <Ruler size={16} color={metric.color} />
                </View>
                {trend !== 'stable' && change && (
                  <View style={styles.trendBadge}>
                    {trend === 'up' ? (
                      <TrendingUp size={12} color="#EF4444" />
                    ) : (
                      <TrendingDown size={12} color="#10B981" />
                    )}
                    <Text
                      style={[
                        styles.changeText,
                        { color: trend === 'up' ? '#EF4444' : '#10B981' },
                      ]}
                    >
                      {change}
                    </Text>
                  </View>
                )}
              </View>

              {/* Label */}
              <Text style={[styles.metricLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {metric.label}
              </Text>

              {/* Value */}
              <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
                {currentValue ? `${currentValue.toFixed(1)}` : '--'}
                <Text style={[styles.metricUnit, { color: colors.textMuted }]}> cm</Text>
              </Text>

              {/* Sparkline - EXACTEMENT comme CompositionStats avec showLastValues */}
              {hasData && (
                <View style={styles.sparklineContainer}>
                  <SparklineChart
                    data={sparklineData}
                    width={SPARKLINE_WIDTH}
                    height={40}
                    color={metric.color}
                    showGradient={true}
                    thickness={2.5}
                    showLastValues={sparklineData.length}
                    valueUnit="cm"
                  />
                </View>
              )}

              {!hasData && (
                <View style={styles.noDataContainer}>
                  <Text style={[styles.noDataText, { color: colors.textMuted }]}>
                    Aucune donnée
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Modal de détail */}
      {selectedMeasurement && (
        <StatsDetailModal
          visible={selectedMeasurement !== null}
          onClose={() => setSelectedMeasurement(null)}
          title={selectedMeasurement.label}
          subtitle="Évolution complète"
          data={getFullHistory(selectedMeasurement.id).map((entry) => ({
            value: entry.value,
            label: new Date(entry.date).toLocaleDateString(locale, { day: '2-digit', month: 'short' }),
          }))}
          color={selectedMeasurement.color}
          unit="cm"
          icon={<Ruler size={24} color={selectedMeasurement.color} />}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: isIPad() ? 0 : 16,
    paddingBottom: 150,
  },

  // Grille des métriques - IDENTIQUE à CompositionStats
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    width: STATS_CARD_WIDTH,
    borderRadius: 16,
    padding: 14,
    minHeight: 140,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
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
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  metricIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  metricUnit: {
    fontSize: 15,
    fontWeight: '700',
  },
  sparklineContainer: {
    marginTop: 'auto',
    marginHorizontal: -6,
  },
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
