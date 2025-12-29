import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Weight } from '@/lib/database';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SparklineChart } from '../charts/SparklineChart';
import { Droplets, Dumbbell, Bone, Flame, Calendar, TrendingUp, TrendingDown, Target, Maximize2 } from 'lucide-react-native';
import { StatsDetailModal } from '../StatsDetailModal';
import { getHistoryDays, getChartDataPoints, scale, isIPad } from '@/constants/responsive';
import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Largeur des cartes statistiques - 2 colonnes sur iPhone, 4 colonnes sur iPad
const STATS_COLUMNS = isIPad() ? 4 : 2;
const STATS_GAP = 12; // Gap fixe pour tous les appareils
const CONTAINER_PADDING = isIPad() ? scale(8) : 16; // iPhone garde 16
const STATS_CARD_WIDTH = (SCREEN_WIDTH - CONTAINER_PADDING * 2 - STATS_GAP * (STATS_COLUMNS - 1)) / STATS_COLUMNS;

interface CompositionStatsProps {
  data: Weight[];
}

export const CompositionStats: React.FC<CompositionStatsProps> = ({ data }) => {
  const { colors } = useTheme();
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    label: string;
    color: string;
    unit: string;
    icon: React.ReactNode;
  } | null>(null);

  const latest = data.length > 0 ? data[data.length - 1] : null;
  const previous = data.length > 1 ? data[data.length - 2] : null;

  // Préparer les données pour les sparklines (SEULEMENT 3 dernières prises)
  const getSparklineData = (key: keyof Weight) => {
    const historyDays = getHistoryDays(); // 3 sur iPhone, 7 sur iPad
    return data.slice(-historyDays).map(entry => ({
      value: (entry[key] as number) || 0,
    }));
  };

  // Calculer la tendance
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

  const metrics = [
    {
      key: 'fat_percent',
      label: 'Masse Grasse',
      icon: <Flame size={18} color="#EF4444" />,
      color: '#EF4444',
      value: latest?.fat_percent,
      unit: '%',
      isGoodWhenLow: true,
    },
    {
      key: 'muscle_percent',
      label: 'Masse Musculaire',
      icon: <Dumbbell size={18} color="#3B82F6" />,
      color: '#3B82F6',
      value: latest?.muscle_percent,
      unit: '%',
      isGoodWhenLow: false,
    },
    {
      key: 'water_percent',
      label: 'Hydratation',
      icon: <Droplets size={18} color="#06B6D4" />,
      color: '#06B6D4',
      value: latest?.water_percent,
      unit: '%',
      isGoodWhenLow: false,
    },
    {
      key: 'bone_mass',
      label: 'Masse Osseuse',
      icon: <Bone size={18} color="#8B5CF6" />,
      color: '#8B5CF6',
      value: latest?.bone_mass,
      unit: 'kg',
      isGoodWhenLow: false,
    },
    {
      key: 'visceral_fat',
      label: 'Graisse Viscérale',
      icon: <Target size={18} color="#F97316" />,
      color: '#F97316',
      value: latest?.visceral_fat,
      unit: '',
      isGoodWhenLow: true,
    },
    {
      key: 'bmr',
      label: 'Métabolisme Basal',
      icon: <Flame size={18} color="#F59E0B" />,
      color: '#F59E0B',
      value: latest?.bmr,
      unit: 'kcal',
      isGoodWhenLow: false,
    },
    {
      key: 'metabolic_age',
      label: 'Âge Métabolique',
      icon: <Calendar size={18} color="#EC4899" />,
      color: '#EC4899',
      value: latest?.metabolic_age,
      unit: 'ans',
      isGoodWhenLow: true,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Grille des 7 métriques */}
      <View style={styles.metricsGrid}>
        {metrics.map((metric) => {
          const sparklineData = getSparklineData(metric.key as keyof Weight);
          const trend = getTrend(metric.value, previous?.[metric.key as keyof Weight] as number);
          const change = getChange(metric.value, previous?.[metric.key as keyof Weight] as number);
          const hasData = sparklineData.length > 0 && sparklineData.some(d => d.value > 0);

          // Calculer min/max pour les indicateurs
          const minValue = hasData ? Math.min(...sparklineData.map(d => d.value)) : 0;
          const maxValue = hasData ? Math.max(...sparklineData.map(d => d.value)) : 0;

          return (
            <TouchableOpacity
              key={metric.key}
              style={[styles.metricCard, { backgroundColor: colors.backgroundCard }]}
              activeOpacity={0.7}
              onPress={() => setSelectedMetric({
                key: metric.key,
                label: metric.label,
                color: metric.color,
                unit: metric.unit,
                icon: metric.icon,
              })}
            >
              {/* Expand icon */}
              <View style={styles.expandIcon}>
                <Maximize2 size={16} color="#1F2937" opacity={0.9} />
              </View>

              {/* Header */}
              <View style={styles.metricHeader}>
                <View style={[styles.metricIconContainer, { backgroundColor: metric.color + '20' }]}>
                  {metric.icon}
                </View>
                {trend !== 'stable' && change && (
                  <View style={styles.trendBadge}>
                    {trend === 'up' ? (
                      <TrendingUp size={12} color={metric.isGoodWhenLow ? '#EF4444' : '#10B981'} />
                    ) : (
                      <TrendingDown size={12} color={metric.isGoodWhenLow ? '#10B981' : '#EF4444'} />
                    )}
                    <Text
                      style={[
                        styles.changeText,
                        { color: trend === 'up'
                          ? (metric.isGoodWhenLow ? '#EF4444' : '#10B981')
                          : (metric.isGoodWhenLow ? '#10B981' : '#EF4444')
                        },
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
                {metric.value ? `${metric.value.toFixed(metric.unit === 'kg' ? 1 : 0)}` : '--'}
                <Text style={[styles.metricUnit, { color: colors.textMuted }]}>
                  {metric.unit && ' '}{metric.unit}
                </Text>
              </Text>

              {/* Sparkline */}
              {hasData && (
                <View style={styles.sparklineContainer}>
                  <SparklineChart
                    data={sparklineData}
                    width={140}
                    height={40}
                    color={metric.color}
                    showGradient={true}
                    thickness={2.5}
                    showLastValues={sparklineData.length}
                    valueUnit={metric.unit}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Historique détaillé */}
      {data.length > 0 && (
        <View style={[styles.historyCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
            Historique
          </Text>

          {data.slice(-getChartDataPoints('medium')).reverse().map((entry, index) => (
            <View
              key={index}
              style={[
                styles.historyItem,
                index < Math.min(data.length, 7) - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
                {format(new Date(entry.date), 'd MMM', { locale: fr })}
              </Text>
              <View style={styles.historyValues}>
                <Text style={[styles.historyValue, { color: '#EF4444' }]}>
                  G:{entry.fat_percent?.toFixed(1) || '--'}%
                </Text>
                <Text style={[styles.historyValue, { color: '#3B82F6' }]}>
                  M:{entry.muscle_percent?.toFixed(1) || '--'}%
                </Text>
                <Text style={[styles.historyValue, { color: '#06B6D4' }]}>
                  E:{entry.water_percent?.toFixed(1) || '--'}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Modal de détail */}
      {selectedMetric && (
        <StatsDetailModal
          visible={selectedMetric !== null}
          onClose={() => setSelectedMetric(null)}
          title={selectedMetric.label}
          subtitle="Derniers 30 jours"
          data={data.slice(-30).map((entry, index) => ({
            value: (entry as any)[selectedMetric.key] || 0,
            label: format(new Date(entry.date), 'd MMM', { locale: fr }),
            date: entry.date,
          })).filter(d => d.value > 0)}
          color={selectedMetric.color}
          unit={selectedMetric.unit}
          icon={selectedMetric.icon}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: isIPad() ? 0 : 16, // Pas de padding sur iPad, déjà géré par le parent
    paddingBottom: 40,
  },

  // Grille des métriques
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

  // Historique
  historyCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 4,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyValues: {
    flexDirection: 'row',
    gap: 12,
  },
  historyValue: {
    fontSize: 12,
    fontWeight: '700',
  },
});
