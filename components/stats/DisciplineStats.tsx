import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SparklineChart } from '../charts/SparklineChart';
import { Flame, TrendingDown, TrendingUp, Target, Activity, Calendar, Maximize2, Check } from 'lucide-react-native';
import { StatsDetailModal } from '../StatsDetailModal';
import { getHistoryDays, isIPad } from '@/constants/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STATS_COLUMNS = isIPad() ? 4 : 2;
const STATS_GAP = 12;
const CARD_PADDING_H = 16;
const AVAILABLE_WIDTH = SCREEN_WIDTH - (CARD_PADDING_H * 2);
const STATS_CARD_WIDTH = (AVAILABLE_WIDTH - (STATS_GAP * (STATS_COLUMNS - 1))) / STATS_COLUMNS;
const SPARKLINE_WIDTH = STATS_CARD_WIDTH - 28 + 12;

interface DisciplineData {
  date: string;
  weeklyLoad: number;
  sessionsCount: number;
  avgIntensity: number;
  goalProgress: number;
}

interface DisciplineStatsProps {
  data: DisciplineData[];
  weeklyGoal: number;
}

export const DisciplineStats: React.FC<DisciplineStatsProps> = ({ data, weeklyGoal }) => {
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

  // Calculer la moyenne des 4 dernières semaines pour la charge
  const last4Weeks = data.slice(-4);
  const averageLoad = last4Weeks.length > 0
    ? Math.round(last4Weeks.reduce((sum, d) => sum + d.weeklyLoad, 0) / last4Weeks.length)
    : 0;

  // Préparer les données pour les sparklines
  const getSparklineData = (key: keyof DisciplineData) => {
    const historyDays = getHistoryDays();
    return data.slice(-historyDays).map(entry => ({
      value: entry[key] as number || 0,
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

  const getChange = (current: number | undefined, prev: number | undefined, decimals = 0): string => {
    if (!current || !prev) return '';
    const diff = current - prev;
    return diff > 0 ? `+${diff.toFixed(decimals)}` : `${diff.toFixed(decimals)}`;
  };

  // Couleur de la charge selon le niveau de risque
  const getLoadColor = (load: number) => {
    if (load > 2500) return '#EF4444'; // Critique
    if (load > 2000) return '#F97316'; // Élevé
    if (load > 1500) return '#F59E0B'; // Modéré
    return '#10B981'; // Optimal
  };

  const metrics = [
    {
      key: 'weeklyLoad',
      label: 'Charge Semaine',
      icon: <Flame size={18} color="#F59E0B" />,
      color: getLoadColor(latest?.weeklyLoad || 0),
      value: latest?.weeklyLoad,
      unit: 'pts',
      showTrend: true,
    },
    {
      key: 'sessionsCount',
      label: 'Entraînements',
      icon: <Calendar size={18} color="#3B82F6" />,
      color: '#3B82F6',
      value: latest?.sessionsCount,
      unit: '',
      showTrend: true,
    },
    {
      key: 'avgIntensity',
      label: 'Intensité Moy.',
      icon: <Activity size={18} color="#8B5CF6" />,
      color: '#8B5CF6',
      value: latest?.avgIntensity,
      unit: '/10',
      showTrend: true,
    },
    {
      key: 'goalProgress',
      label: 'Objectif',
      icon: <Target size={18} color="#10B981" />,
      color: '#10B981',
      value: latest?.sessionsCount && weeklyGoal ? Math.min((latest.sessionsCount / weeklyGoal) * 100, 100) : 0,
      unit: '%',
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
      {/* Grille des métriques */}
      <View style={styles.metricsGrid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((metric) => {
              const sparklineData = metric.key === 'goalProgress'
                ? [] // Pas de sparkline pour l'objectif (calculé)
                : getSparklineData(metric.key as keyof DisciplineData);
              const hasData = sparklineData.length > 0;

              const currentValue = metric.key === 'goalProgress' ? metric.value : metric.value;
              const prevValue = metric.key === 'goalProgress'
                ? undefined
                : previous?.[metric.key as keyof DisciplineData] as number;

              const trend = metric.showTrend ? getTrend(currentValue, prevValue) : 'stable';
              const change = metric.showTrend ? getChange(currentValue, prevValue, metric.key === 'avgIntensity' ? 1 : 0) : '';

              return (
                <TouchableOpacity
                  key={metric.key}
                  style={[
                    styles.metricCard,
                    { backgroundColor: colors.backgroundCard }
                  ]}
                  activeOpacity={0.7}
              onPress={() => {
                if (metric.key !== 'goalProgress') {
                  setSelectedMetric({
                    key: metric.key,
                    label: metric.label,
                    color: metric.color,
                    unit: metric.unit,
                    icon: metric.icon,
                  });
                }
              }}
              disabled={metric.key === 'goalProgress'}
            >
              {/* Expand icon (sauf pour objectif) */}
              {metric.key !== 'goalProgress' && (
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
                      <TrendingUp size={12} color="#10B981" />
                    ) : (
                      <TrendingDown size={12} color="#EF4444" />
                    )}
                    <Text
                      style={[
                        styles.changeText,
                        { color: trend === 'up' ? '#10B981' : '#EF4444' },
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
                {metric.value !== undefined ? (metric.key === 'avgIntensity' ? metric.value.toFixed(1) : Math.round(metric.value)) : '--'}
                <Text style={[styles.metricUnit, { color: colors.textMuted }]}>
                  {metric.unit && ' '}{metric.unit}
                </Text>
              </Text>

              {/* Sparkline (sauf pour objectif) */}
              {hasData && metric.key !== 'goalProgress' && (
                <View style={styles.sparklineContainer}>
                  <SparklineChart
                    data={sparklineData}
                    width={SPARKLINE_WIDTH}
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
        ))}
      </View>

      {/* Barre de progression vers l'objectif */}
      {latest && weeklyGoal > 0 && (
        <View style={[styles.progressCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>
            Progression vers l'objectif hebdomadaire
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: latest.sessionsCount >= weeklyGoal ? '#10B981' : '#3B82F6',
                    width: `${Math.min((latest.sessionsCount / weeklyGoal) * 100, 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {latest.sessionsCount}/{weeklyGoal} entraînements
            </Text>
            {latest.sessionsCount >= weeklyGoal && (
              <>
                <Check size={12} color="#10B981" strokeWidth={3} />
                <Text style={[styles.progressText, { color: '#10B981' }]}>Objectif atteint !</Text>
              </>
            )}
          </View>
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
            value: (entry[selectedMetric.key as keyof DisciplineData] as number) || 0,
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
    paddingHorizontal: CARD_PADDING_H,
    paddingBottom: 150,
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
