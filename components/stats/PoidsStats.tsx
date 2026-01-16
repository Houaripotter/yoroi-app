import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Alert } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Weight } from '@/lib/database';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SparklineChart } from './charts/SparklineChart';
import { Scale, Target, TrendingDown, TrendingUp, Activity, Maximize2, Eye } from 'lucide-react-native';
import { StatsDetailModal } from './StatsDetailModal';
import { ModernLineChart } from './charts/ModernLineChart';
import { getHistoryDays, scale, isIPad } from '@/constants/responsive';
import { getUserSettings } from '@/lib/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATS_COLUMNS = isIPad() ? 4 : 2;
const STATS_GAP = 12;
const CARD_PADDING_H = 16;
const AVAILABLE_WIDTH = SCREEN_WIDTH - (CARD_PADDING_H * 2);
const STATS_CARD_WIDTH = (AVAILABLE_WIDTH - (STATS_GAP * (STATS_COLUMNS - 1))) / STATS_COLUMNS;
const SPARKLINE_WIDTH = STATS_CARD_WIDTH - 28 + 12;

interface PoidsStatsProps {
  data: Weight[];
  targetWeight?: number;
  startWeight?: number;
}

export const PoidsStats: React.FC<PoidsStatsProps> = ({ data, targetWeight, startWeight }) => {
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

  // Préparer les données pour les sparklines
  const getSparklineData = (key: 'weight') => {
    const historyDays = getHistoryDays();
    return data.slice(-historyDays).map(entry => ({
      value: entry[key] || 0,
    }));
  };

  // Calculer la tendance
  const getTrend = (current: number | undefined, prev: number | undefined): 'up' | 'down' | 'stable' => {
    if (!current || !prev) return 'stable';
    const diff = current - prev;
    const percentChange = Math.abs(diff / prev) * 100;
    if (percentChange < 1) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const getChange = (current: number | undefined, prev: number | undefined): string => {
    if (!current || !prev) return '';
    const diff = current - prev;
    return diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
  };

  // Calculer les métriques dérivées
  const currentWeight = latest?.weight || 0;
  const weightLost = startWeight ? startWeight - currentWeight : 0;
  const remainingToGoal = targetWeight ? currentWeight - targetWeight : 0;
  const progressPercent = startWeight && targetWeight
    ? ((startWeight - currentWeight) / (startWeight - targetWeight)) * 100
    : 0;

  const metrics = [
    {
      key: 'weight',
      label: 'Poids Actuel',
      icon: <Scale size={18} color="#3B82F6" />,
      color: '#3B82F6',
      value: currentWeight,
      unit: 'kg',
      showTrend: true,
    },
    {
      key: 'target',
      label: 'Objectif',
      icon: <Target size={18} color="#10B981" />,
      color: '#10B981',
      value: targetWeight,
      unit: 'kg',
      showTrend: false,
    },
    {
      key: 'lost',
      label: 'Poids Perdu',
      icon: <TrendingDown size={18} color="#F97316" />,
      color: '#F97316',
      value: weightLost > 0 ? weightLost : 0,
      unit: 'kg',
      showTrend: false,
    },
    {
      key: 'remaining',
      label: 'Restant',
      icon: <Activity size={18} color="#8B5CF6" />,
      color: '#8B5CF6',
      value: remainingToGoal > 0 ? remainingToGoal : 0,
      unit: 'kg',
      showTrend: false,
    },
  ];

  // Grouper les métriques en rangées de 2
  const rows: typeof metrics[] = [];
  for (let i = 0; i < metrics.length; i += STATS_COLUMNS) {
    rows.push(metrics.slice(i, i + STATS_COLUMNS));
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Bouton TOUT en haut */}
      <TouchableOpacity
        style={[styles.viewAllButton, { backgroundColor: colors.accent }]}
        onPress={() => setSelectedMetric({
          key: 'weight',
          label: 'Poids Actuel',
          color: '#3B82F6',
          unit: 'kg',
          icon: <Scale size={18} color="#3B82F6" />,
        })}
        activeOpacity={0.8}
      >
        <Eye size={18} color={colors.textOnAccent} strokeWidth={2.5} />
        <Text style={[styles.viewAllText, { color: colors.textOnAccent }]}>
          Voir toutes les données de poids
        </Text>
      </TouchableOpacity>

      {/* Grille des métriques */}
      <View style={styles.metricsGrid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((metric) => {
              const sparklineData = metric.key === 'weight' ? getSparklineData('weight') : [];
              const trend = metric.showTrend ? getTrend(metric.value, previous?.weight) : 'stable';
              const change = metric.showTrend ? getChange(metric.value, previous?.weight) : '';
              const hasData = sparklineData.length > 0;

              return (
                <TouchableOpacity
                  key={metric.key}
                  style={[
                    styles.metricCard,
                    { backgroundColor: colors.backgroundCard }
                  ]}
                  activeOpacity={0.7}
              onPress={() => {
                if (metric.key === 'weight') {
                  setSelectedMetric({
                    key: metric.key,
                    label: metric.label,
                    color: metric.color,
                    unit: metric.unit,
                    icon: metric.icon,
                  });
                }
              }}
              disabled={metric.key !== 'weight'}
            >
              {/* Expand icon (seulement pour poids) */}
              {metric.key === 'weight' && (
                <View style={styles.expandIcon}>
                  <Maximize2 size={16} color="#1F2937" opacity={0.9} />
                </View>
              )}

              {/* Header */}
              <View style={styles.metricHeader}>
                <View style={[styles.metricIconContainer, { backgroundColor: metric.color + '20' }]}>
                  {metric.icon}
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
                {metric.value ? `${metric.value.toFixed(1)}` : '--'}
                <Text style={[styles.metricUnit, { color: colors.textMuted }]}>
                  {metric.unit && ' '}{metric.unit}
                </Text>
              </Text>

              {/* Sparkline (seulement pour poids) */}
              {hasData && metric.key === 'weight' && (
                <View style={styles.sparklineContainer}>
                  <SparklineChart
                    data={sparklineData}
                    width={SPARKLINE_WIDTH}
                    height={40}
                    color={metric.color}
                    showGradient={true}
                    thickness={2.5}
                    showLastValues={sparklineData.length}
                    valueUnit="kg"
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
          </View>
        ))}
      </View>

      {/* Barre de progression */}
      {startWeight && targetWeight && (
        <View style={[styles.progressCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>
            Progression vers l'objectif
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: '#10B981',
                    width: `${Math.min(Math.max(progressPercent, 0), 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            {progressPercent.toFixed(0)}% complété
          </Text>
        </View>
      )}

      {/* Modal de détail */}
      {selectedMetric && (
        <StatsDetailModal
          visible={selectedMetric !== null}
          onClose={() => setSelectedMetric(null)}
          title={selectedMetric.label}
          subtitle="Évolution complète"
          data={data.map((entry) => ({
            value: entry.weight || 0,
            label: format(new Date(entry.date), 'd MMM', { locale: fr }),
            date: entry.date,
          })).filter(d => d.value > 0)}
          color={selectedMetric.color}
          unit={selectedMetric.unit}
          icon={selectedMetric.icon}
          metricKey={selectedMetric.key}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: CARD_PADDING_H,
    paddingBottom: 150,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  metricsGrid: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: STATS_GAP,
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
  progressCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
