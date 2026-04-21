import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, ActivityIndicator, TouchableOpacity, InteractionManager, RefreshControl, DeviceEventEmitter } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { formatDurationHM } from '@/lib/formatDuration';
import { LineChart } from 'react-native-gifted-charts';
import {
  Scale,
  Activity,
  Flame,
  Ruler,
  TrendingUp,
  Zap,
  Moon,
  Maximize2,
  Trophy,
  Target,
  Bone,
  Calendar,
  Waves,
  PlusCircle
} from 'lucide-react-native';
import { getWeights, getTrainings, getMeasurements, getLatestWeight } from '@/lib/database';
import { getSleepStats } from '@/lib/sleepService';
import { calculateReadinessScore } from '@/lib/readinessService';
import { getWeeklyLoadStats } from '@/lib/trainingLoadService';
import { getUserSettings } from '@/lib/storage';
import { format, parseISO, subDays } from 'date-fns';
import { router } from 'expo-router';
import { fr } from 'date-fns/locale';
import { StatsDetailModal } from '../StatsDetailModal';
import { StatsHeader, Period } from '../StatsHeader';
import { logger } from '@/lib/security/logger';

const METRIC_ROUTES: Record<string, string> = {
  sleep: '/sleep',
};

// Number of charts to mount immediately (first visible batch)
const INITIAL_CHARTS = 4;
// Number of charts to add per batch after initial render
const CHARTS_PER_BATCH = 4;

// Carte individuelle memo-isee avec lazy chart rendering
const MiniCard = React.memo(({ metric, colors, isDark, onPress, chartReady, columnWidth }: {
  metric: any;
  colors: any;
  isDark: boolean;
  onPress: (m: any) => void;
  chartReady: boolean;
  columnWidth: number;
}) => {
  const hasData = metric.data && metric.data.length > 0;

  const { yAxisOffset } = useMemo(() => {
    if (!hasData) return { yAxisOffset: 0 };
    const values = metric.data.map((d: any) => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const offset = Math.floor(minValue - (range > 0 ? range * 0.5 : 1));
    return { yAxisOffset: offset > 0 ? offset : 0 };
  }, [metric.data, hasData]);

  const handlePress = useCallback(() => {
    onPress(metric);
  }, [metric, onPress]);

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handlePress}
      style={[styles.miniCard, { backgroundColor: isDark ? colors.backgroundCard : `${metric.color}08` }]}
    >
      <View
        style={styles.cardHeader}
      >
        <View style={[styles.iconBox, { backgroundColor: metric.color + '15' }]}>
          {metric.icon}
        </View>
        <Text style={[styles.themeLabel, { color: colors.textMuted }]}>{metric.theme}</Text>
        <View style={{ flex: 1 }} />
        <Maximize2 size={12} color={colors.textMuted} />
      </View>

      <View>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{metric.title}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.cardValue, { color: hasData ? colors.textPrimary : colors.textMuted }]}>
            {metric.value}
          </Text>
          <Text style={[styles.cardUnit, { color: colors.textMuted }]}>{metric.unit}</Text>
        </View>
      </View>

      <View style={styles.miniChartWrapper}>
        {hasData ? (
          chartReady ? (
            (() => {
              // Vue : on montre exactement 3 points à la fois, le reste est scrollable
              // horizontalement (gifted-charts scrolle auto si le total dépasse width).
              const chartWidth = columnWidth + 28;
              const initialSpacing = 24;
              const endPadding = 24;
              const available = chartWidth - initialSpacing - endPadding;
              // 3 points visibles = 2 intervalles
              const spacing = Math.max(40, available / 2);
              return (
                <LineChart
                  data={metric.data}
                  height={100}
                  width={chartWidth}
                  initialSpacing={initialSpacing}
                  endSpacing={endPadding}
                  spacing={spacing}
                  hideRules
                  hideAxesAndRules
                  hideYAxisText
                  xAxisThickness={0}
                  xAxisLabelsHeight={28}
                  curved
                  thickness={3.5}
                  color={metric.color}
                  startFillColor={metric.color}
                  endFillColor={metric.color}
                  startOpacity={0.2}
                  endOpacity={0.01}
                  areaChart
                  yAxisOffset={yAxisOffset}
                  hideDataPoints={false}
                  dataPointsHeight={10}
                  dataPointsWidth={10}
                  dataPointsColor={metric.color}
                  showValuesAsDataPointsText
                  textFontSize={11}
                  textColor={isDark ? '#FFFFFF' : '#1F2937'}
                  textShiftY={-8}
                  textShiftX={-14}
                  xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}
                  scrollToEnd
                  scrollAnimation={false}
                  disableScroll={false}
                  showScrollIndicator={false}
                  onPress={handlePress}
                />
              );
            })()
          ) : (
            <View style={styles.chartPlaceholder}>
              <ActivityIndicator size="small" color={metric.color + '40'} />
            </View>
          )
        ) : (
          <TouchableOpacity
            style={styles.noDataContainer}
            onPress={handlePress}
            activeOpacity={0.6}
          >
            <PlusCircle size={24} color={metric.color + '60'} strokeWidth={1.5} />
            <Text style={[styles.noDataText, { color: colors.textMuted }]}>Saisir</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

export const DashboardPage: React.FC = React.memo(() => {
  const { colors, isDark, screenBackground } = useTheme();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const COLUMN_WIDTH = (SCREEN_WIDTH - 64) * 0.47 - 28;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<any>(null);
  const [allMetrics, setAllMetrics] = useState<any[]>([]);
  // Default = 'tout' (par demande user : voir tout l'historique par défaut
  // pour ne pas passer à côté des données anciennes)
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('tout');
  const [customStart, setCustomStart] = useState<string | undefined>();
  const [customEnd, setCustomEnd] = useState<string | undefined>();

  // Staggered chart mounting: start with first batch, progressively add more
  const [mountedChartCount, setMountedChartCount] = useState(INITIAL_CHARTS);

  // After data loads, progressively mount charts in batches
  useEffect(() => {
    if (loading || allMetrics.length === 0) return;

    const totalWithData = allMetrics.filter(m => m.data && m.data.length > 0).length;
    if (mountedChartCount >= totalWithData) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const handle = InteractionManager.runAfterInteractions(() => {
      // Use setTimeout to give the UI thread breathing room between batches
      timer = setTimeout(() => {
        setMountedChartCount(prev => Math.min(prev + CHARTS_PER_BATCH, totalWithData));
      }, 150);
    });

    return () => {
      handle.cancel();
      if (timer !== null) clearTimeout(timer);
    };
  }, [loading, allMetrics, mountedChartCount]);

  // Build a Set of metric IDs that should have their chart mounted
  const mountedChartIds = useMemo(() => {
    const ids = new Set<string>();
    let count = 0;
    for (const metric of allMetrics) {
      if (metric.data && metric.data.length > 0) {
        if (count < mountedChartCount) {
          ids.add(metric.id);
          count++;
        }
      }
    }
    return ids;
  }, [allMetrics, mountedChartCount]);

  const loadAllData = useCallback(async (
    period: Period = 'tout',
    cStart?: string,
    cEnd?: string,
  ) => {
    const daysMap: Record<string, number> = {
      '7j': 7, '14j': 14, '30j': 30, '60j': 60, '90j': 90,
      '6m': 180, '9m': 270, '1a': 365, '2a': 730, 'tout': 3650,
    };
    // En mode custom, on fetch tout l'historique puis on filtre par [start, end]
    const days = period === 'custom' ? 3650 : (daysMap[period] || 30);

    try {
      setLoading(true);
      const settings = await getUserSettings();

      const [weights, trainings, measurements, sleep, readiness, loadStats, latestWeight] = await Promise.all([
        getWeights(days),
        getTrainings(days),
        getMeasurements(days),
        getSleepStats(),
        calculateReadinessScore(7),
        getWeeklyLoadStats(),
        getLatestWeight(),
      ]);

      // Fallback : si la période ne contient aucune entrée mais qu'il existe des données plus anciennes,
      // on bascule sur l'historique complet pour pouvoir afficher la courbe ET la valeur.
      let effectiveWeights: any[];
      let effectiveMeasurements: any[];
      if (weights && weights.length > 0) {
        effectiveWeights = weights;
      } else {
        // Aucune donnée sur la période → on prend toutes les pesées pour afficher la courbe
        effectiveWeights = await getWeights();
      }
      if (measurements && measurements.length > 0) {
        effectiveMeasurements = measurements;
      } else {
        effectiveMeasurements = await getMeasurements();
      }

      // Si mode custom → filtre client-side sur [cStart, cEnd]
      if (period === 'custom' && cStart && cEnd) {
        const startMs = new Date(cStart).getTime();
        const endMs = new Date(cEnd).getTime() + 24 * 3600 * 1000 - 1; // inclusive de la journée
        const inRange = (item: any) => {
          const t = new Date(item.date).getTime();
          return t >= startMs && t <= endMs;
        };
        effectiveWeights = effectiveWeights.filter(inRange);
        effectiveMeasurements = effectiveMeasurements.filter(inRange);
      }

      const metricsList: any[] = [];

      // Cap dur pour perf (50 points = largement suffisant pour un sparkline).
      // Au-delà on garde les 50 plus récents — le chart reste scrollable horizontalement.
      const HARD_CAP = 50;
      const prepareLineData = (data: any[], valueKey: string, color: string) => {
        if (!data || data.length === 0) return [];
        const filtered = data.filter(item => item[valueKey] != null && item[valueKey] > 0);
        // Tri chronologique croissant (plus ancien → plus récent)
        const chronological = filtered.slice().reverse();
        // Garde les HARD_CAP dernières entrées (perf + lisibilité scroll)
        const sampled = chronological.length > HARD_CAP
          ? chronological.slice(chronological.length - HARD_CAP)
          : chronological;

        return sampled.map((item) => {
          const val = item[valueKey] || 0;
          // Affiche la valeur au-dessus ET la date sous CHAQUE point,
          // pour que l'user sache exactement à quelle date correspond chaque valeur.
          return {
            value: val,
            date: item.date,
            dataPointText: val.toFixed(1),
            // Format "6 MARS" — lisible et identifiable comme dans l'ancien design
            label: format(parseISO(item.date), 'd MMM', { locale: fr }).toUpperCase(),
            labelTextStyle: { color: colors.textMuted, fontSize: 10, fontWeight: '700' as const },
            dataPointColor: color,
          };
        });
      };

      const getLatestValue = (data: any[], key: string, fallback: string = '--') => {
        if (!data || data.length === 0) return fallback;
        const val = data[0][key];
        return val ? val.toFixed(1) : fallback;
      };

      // --- 1. CORPS ---
      metricsList.push({ id: 'weight', metricKey: 'weight', theme: 'Corps', title: 'Poids', icon: <Scale size={16} color="#3B82F6" />, color: '#3B82F6', unit: 'kg', value: getLatestValue(effectiveWeights, 'weight'), data: prepareLineData(effectiveWeights, 'weight', '#3B82F6') });
      metricsList.push({ id: 'muscle_percent', metricKey: 'muscle_percent', theme: 'Corps', title: 'Muscle', icon: <TrendingUp size={16} color="#10B981" />, color: '#10B981', unit: '%', value: getLatestValue(effectiveWeights, 'muscle_percent'), data: prepareLineData(effectiveWeights, 'muscle_percent', '#10B981') });
      metricsList.push({ id: 'fat_percent', metricKey: 'fat_percent', theme: 'Corps', title: 'Gras', icon: <Activity size={16} color="#EF4444" />, color: '#EF4444', unit: '%', value: getLatestValue(effectiveWeights, 'fat_percent'), data: prepareLineData(effectiveWeights, 'fat_percent', '#EF4444') });
      metricsList.push({ id: 'water_percent', metricKey: 'water_percent', theme: 'Corps', title: 'Eau', icon: <Waves size={16} color="#06B6D4" />, color: '#06B6D4', unit: '%', value: getLatestValue(effectiveWeights, 'water_percent'), data: prepareLineData(effectiveWeights, 'water_percent', '#06B6D4') });

      // --- 2. COMPOSITION ---
      metricsList.push({ id: 'visceral_fat', metricKey: 'visceral_fat', theme: 'Composition', title: 'Gras Visc.', icon: <Target size={16} color="#EF4444" />, color: '#EF4444', unit: '', value: effectiveWeights?.[0]?.visceral_fat || '--', data: prepareLineData(effectiveWeights, 'visceral_fat', '#EF4444') });
      metricsList.push({ id: 'bone_mass', metricKey: 'bone_mass', theme: 'Composition', title: 'Os', icon: <Bone size={16} color="#8B5CF6" />, color: '#8B5CF6', unit: 'kg', value: getLatestValue(effectiveWeights, 'bone_mass'), data: prepareLineData(effectiveWeights, 'bone_mass', '#8B5CF6') });
      metricsList.push({ id: 'bmr', metricKey: 'bmr', theme: 'Composition', title: 'BMR', icon: <Flame size={16} color="#F59E0B" />, color: '#F59E0B', unit: 'kcal', value: effectiveWeights?.[0]?.bmr || '--', data: prepareLineData(effectiveWeights, 'bmr', '#F59E0B') });
      metricsList.push({ id: 'metabolic_age', metricKey: 'metabolic_age', theme: 'Composition', title: 'Âge Métab.', icon: <Calendar size={16} color="#06B6D4" />, color: '#06B6D4', unit: 'ans', value: effectiveWeights?.[0]?.metabolic_age || '--', data: prepareLineData(effectiveWeights, 'metabolic_age', '#06B6D4') });

      // --- 3. MENSURATIONS ---
      const mKeys = [
        { key: 'waist', title: 'Taille', color: '#EF4444' },
        { key: 'chest', title: 'Pecs', color: '#3B82F6' },
        { key: 'left_arm', title: 'Bras', color: '#10B981' },
        { key: 'left_thigh', title: 'Cuisse', color: '#8B5CF6' },
      ];
      mKeys.forEach(m => {
        metricsList.push({ id: m.key, metricKey: m.key, theme: 'Mensures', title: m.title, icon: <Ruler size={16} color={m.color} />, color: m.color, unit: 'cm', value: getLatestValue(effectiveMeasurements, m.key), data: prepareLineData(effectiveMeasurements, m.key, m.color) });
      });

      // --- 4. DISCIPLINE ---
      const trainingsFiltered = trainings?.filter((t: any) => {
        const date = new Date(t.date);
        if (period === 'custom' && cStart && cEnd) {
          const s = new Date(cStart).getTime();
          const e = new Date(cEnd).getTime() + 24 * 3600 * 1000 - 1;
          const ts = date.getTime();
          return ts >= s && ts <= e;
        }
        const cutoff = subDays(new Date(), days);
        return date >= cutoff;
      }) || [];

      // Libellé d'unité : "/Xj" pour presets, "/Nj" calculé pour custom
      let unitLabel = `/${days}j`;
      if (period === 'custom' && cStart && cEnd) {
        const diffDays = Math.max(
          1,
          Math.round((new Date(cEnd).getTime() - new Date(cStart).getTime()) / (24 * 3600 * 1000)) + 1,
        );
        unitLabel = `/${diffDays}j`;
      }

      metricsList.push({ id: 'trainings', metricKey: 'trainings', theme: 'Discipline', title: 'Entraînements', icon: <Trophy size={16} color="#8B5CF6" />, color: '#8B5CF6', unit: unitLabel, value: trainingsFiltered.length, data: [] });
      metricsList.push({ id: 'load', metricKey: 'load', theme: 'Discipline', title: 'Charge globale', icon: <Flame size={16} color="#F97316" />, color: '#F97316', unit: 'pts', value: loadStats?.totalLoad || 0, data: [] });

      // --- 5. SANTÉ ---
      metricsList.push({ id: 'vitality', metricKey: 'vitality', theme: 'Santé', title: 'Vitalité', icon: <Zap size={16} color="#F59E0B" />, color: '#F59E0B', unit: '/100', value: readiness?.score || '--', data: [] });

      const weeklyDataArr = sleep?.weeklyData || [];
      const latestSleepEntry = weeklyDataArr[weeklyDataArr.length - 1];
      const sleepDuration = latestSleepEntry?.duration ? formatDurationHM(latestSleepEntry.duration) : '--';
      metricsList.push({ id: 'sleep', metricKey: 'sleep', theme: 'Santé', title: 'Sommeil', icon: <Moon size={16} color="#8B5CF6" />, color: '#8B5CF6', unit: '', value: sleepDuration, data: prepareLineData(weeklyDataArr, 'duration', '#8B5CF6').map(d => ({...d, value: Math.round(d.value / 60 * 10) / 10, dataPointText: formatDurationHM(d.value)})) });

      setAllMetrics(metricsList);
    } catch (e) {
      logger.error("Error loading dashboard data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      loadAllData(selectedPeriod, customStart, customEnd);
    });
    return () => handle.cancel();
  }, [selectedPeriod, customStart, customEnd]);

  // Recharger si des données changent ailleurs dans l'app
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', () =>
      loadAllData(selectedPeriod, customStart, customEnd),
    );
    return () => sub.remove();
  }, [selectedPeriod, customStart, customEnd, loadAllData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadAllData(selectedPeriod, customStart, customEnd); } finally { setRefreshing(false); }
  }, [selectedPeriod, customStart, customEnd]);

  const handleCustomRangeChange = useCallback((start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
  }, []);

  const handleMetricPress = useCallback((metric: any) => {
    const route = METRIC_ROUTES[metric.id];
    if (route) {
      router.push(route as any);
    } else {
      setSelectedMetric(metric);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedMetric(null);
  }, []);

  const groupedThemes = useMemo(() => {
    const themes = ['Corps', 'Composition', 'Mensures', 'Discipline', 'Santé'];
    return themes.map(theme => ({
      theme,
      metrics: allMetrics.filter(m => m.theme === theme),
    })).filter(g => g.metrics.length > 0);
  }, [allMetrics]);

  const modalData = useMemo(() => {
    if (!selectedMetric?.data) return [];
    return selectedMetric.data.map((d: any) => ({
      value: d.value,
      label: d.label,
      date: d.date || undefined,
    }));
  }, [selectedMetric]);

  if (loading) {
    return null;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: screenBackground }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      <StatsHeader
        title="Résumé"
        description="Vision globale de ton évolution physique et performance"
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        customStart={customStart}
        customEnd={customEnd}
        onCustomRangeChange={handleCustomRangeChange}
      />

      <View style={styles.gridContainer}>
      {groupedThemes.map(({ theme, metrics }, sectionIdx) => {
        const firstColor = metrics[0]?.color || colors.accent;
        const lastColor = metrics[metrics.length - 1]?.color || firstColor;
        return (
        <View key={theme}>
          {/* Séparateur couleur thème entre les sections */}
          {sectionIdx > 0 && (
            <View style={[styles.themeSeparator, { backgroundColor: colors.accent }]} />
          )}
          <View style={[styles.themeSection, {
            backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }]}>
            {/* Titre avec fond blanc intégré dans la carte */}
            <View style={styles.themeTitleRow}>
              <View style={[styles.themeTitleDash, { backgroundColor: firstColor }]} />
              <Text style={[styles.themeTitleText, { color: colors.textPrimary }]}>{theme.toUpperCase()}</Text>
              <View style={[styles.themeTitleDash, { backgroundColor: lastColor }]} />
            </View>
            <View style={styles.grid}>
              {metrics.map(metric => (
                <MiniCard
                  key={metric.id}
                  metric={metric}
                  colors={colors}
                  isDark={isDark}
                  onPress={handleMetricPress}
                  chartReady={mountedChartIds.has(metric.id)}
                  columnWidth={COLUMN_WIDTH}
                />
              ))}
            </View>
          </View>
        </View>
        );
      })}
      </View>

      <View style={{ height: 40 }} />

      {selectedMetric && (
        <StatsDetailModal
          visible={!!selectedMetric}
          onClose={handleCloseModal}
          title={selectedMetric.title}
          subtitle={`Vision complète - ${selectedMetric.theme}`}
          data={modalData}
          color={selectedMetric.color}
          unit={selectedMetric.unit}
          icon={selectedMetric.icon}
          metricKey={selectedMetric.metricKey}
        />
      )}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    paddingHorizontal: 8,
  },
  themeSeparator: {
    height: 3,
    borderRadius: 2,
    marginVertical: 12,
    opacity: 0.5,
  },
  themeSection: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  themeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  themeTitleDash: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
  themeTitleText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  miniCard: {
    width: '47%',
    borderRadius: 24,
    padding: 14,
    minHeight: 215,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
    overflow: 'visible', // permet aux labels de ne pas être coupés par les coins
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeLabel: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  cardUnit: {
    fontSize: 11,
    fontWeight: '700',
  },
  miniChartWrapper: {
    height: 120,
    marginTop: 5,
    marginLeft: -14,
    marginBottom: -10,
    paddingTop: 10,
    justifyContent: 'center',
    overflow: 'visible',
  },
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 10,
    marginLeft: 25,
  },
  noDataText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
