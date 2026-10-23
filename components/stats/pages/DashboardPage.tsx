import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, ActivityIndicator, TouchableOpacity, InteractionManager, RefreshControl, DeviceEventEmitter, Platform } from 'react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
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
import { DATE_FNS_LOCALE as fr } from '@/lib/i18n/dateLocale';
import { StatsDetailModal } from '../StatsDetailModal';
import { StatsHeader, Period } from '../StatsHeader';
import { logger } from '@/lib/security/logger';
import { buildCacheKey, getCached, setCached, invalidateCachePrefix } from '@/lib/statsMemoryCache';
import { StatsEmptyState } from '../StatsEmptyState';
import { StatsInsightBanner } from '../StatsInsightBanner';
import { generateInsights, type Insight } from '@/lib/statsInsights';
import { SkeletonGrid } from '../SkeletonCard';
import { StreakBadge } from '../StreakBadge';
import { FunComparisonsCard } from '../FunComparisonsCard';
import { generateFunComparisons, type FunComparison } from '@/lib/funComparisons';
import { OnboardingTooltip } from '../OnboardingTooltip';
import { RecentBadgesStrip } from '../RecentBadgesStrip';
import { AnimatedCounter } from '../AnimatedCounter';

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

  const { yAxisOffset, maxChartValue, trend } = useMemo(() => {
    if (!hasData) return { yAxisOffset: 0, maxChartValue: undefined as number | undefined, trend: null as null | { dir: 'up' | 'down' | 'flat'; pct: number } };
    const values = metric.data.map((d: any) => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    const bottom = Math.floor(minValue - (range > 0 ? range * 0.8 : Math.max(1, minValue * 0.05)));
    const top = Math.ceil(maxValue + (range > 0 ? range * 0.6 : Math.max(1, maxValue * 0.03)));

    // Tendance : moyenne 1ère moitié vs 2ème moitié de la série
    let trendData: { dir: 'up' | 'down' | 'flat'; pct: number } | null = null;
    if (values.length >= 2) {
      const half = Math.max(1, Math.floor(values.length / 2));
      // Données DESC (récent en premier) : 1ère moitié = récente
      const secondHalf = values.slice(0, half);
      const firstHalf = values.slice(values.length - half);
      const avgFirst = firstHalf.reduce((s: number, v: number) => s + v, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((s: number, v: number) => s + v, 0) / secondHalf.length;
      if (avgFirst !== 0) {
        const pct = ((avgSecond - avgFirst) / Math.abs(avgFirst)) * 100;
        if (Math.abs(pct) < 1) trendData = { dir: 'flat', pct: 0 };
        else if (pct > 0) trendData = { dir: 'up', pct };
        else trendData = { dir: 'down', pct: Math.abs(pct) };
      }
    }
    return {
      yAxisOffset: bottom > 0 ? bottom : 0,
      maxChartValue: top,
      trend: trendData,
    };
  }, [metric.data, hasData]);

  // Convention sémantique : pour poids/gras/visceral_fat → ↓ = positif (perte = bien),
  // pour muscle/eau/sleep/trainings → ↑ = positif. Sinon neutre.
  const isLossGood = ['weight', 'fat_percent', 'visceral_fat', 'metabolic_age'].includes(metric.id);
  const trendColor = trend?.dir === 'flat'
    ? '#9CA3AF'
    : trend?.dir === 'up'
      ? (isLossGood ? '#EF4444' : '#10B981')
      : (isLossGood ? '#10B981' : '#EF4444');

  const handlePress = useCallback(() => {
    onPress(metric);
  }, [metric, onPress]);

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handlePress}
      style={[styles.miniCard, { backgroundColor: isDark ? colors.backgroundCard : `${metric.color}08` }]}
      accessibilityRole="button"
      accessibilityLabel={`${metric.title} : ${metric.value} ${metric.unit}`}
      accessibilityHint="Toucher pour voir le détail complet"
    >
      <View
        style={styles.cardHeader}
      >
        <View style={[styles.iconBox, { backgroundColor: metric.color + '15' }]}>
          {metric.icon}
        </View>
        <Text style={[styles.themeLabel, { color: colors.textMuted }]}>{metric.theme}</Text>
        <View style={{ flex: 1 }} />
        {/* Badge tendance ↑/↓ %, animé count-up à l'apparition */}
        {trend && trend.dir !== 'flat' && (
          <View style={[styles.trendBadge, { backgroundColor: trendColor + '18' }]}>
            <Text style={[styles.trendBadgeText, { color: trendColor }]}>
              {trend.dir === 'up' ? '↑ ' : '↓ '}
            </Text>
            <AnimatedCounter
              value={trend.pct}
              decimals={1}
              suffix="%"
              duration={700}
              style={[styles.trendBadgeText, { color: trendColor }]}
            />
          </View>
        )}
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
            <LineChart
              data={metric.data}
              height={100}
              width={columnWidth}
              initialSpacing={18}
              endSpacing={20}
              spacing={85}
              hideRules
              hideAxesAndRules
              hideYAxisText
              xAxisThickness={0}
              xAxisLabelsHeight={32}
              curved
              thickness={3.5}
              color={metric.color}
              startFillColor={metric.color}
              endFillColor={metric.color}
              startOpacity={0.2}
              endOpacity={0.01}
              areaChart
              yAxisOffset={yAxisOffset > 0 ? yAxisOffset : 0}
              maxValue={maxChartValue != null ? maxChartValue - (yAxisOffset > 0 ? yAxisOffset : 0) : undefined}
              hideDataPoints={false}
              dataPointsHeight={8}
              dataPointsWidth={8}
              dataPointsColor={metric.color}
              showValuesAsDataPointsText
              textFontSize={10}
              textColor={isDark ? '#FFFFFF' : '#000000'}
              textShiftY={-10}
              disableScroll={false}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 8, fontWeight: '900' }}
              onPress={handlePress}
            />
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
  const [insights, setInsights] = useState<Insight[]>([]);
  const [funComparisons, setFunComparisons] = useState<FunComparison[]>([]);
  const [allTrainingsForStreak, setAllTrainingsForStreak] = useState<any[]>([]);

  // Staggered chart mounting: start with first batch, progressively add more
  const [mountedChartCount, setMountedChartCount] = useState(INITIAL_CHARTS);

  // Anti-race : si user clique 7j → 14j → 30j vite, on incrémente requestId et
  // on ignore les setState périmés (résultat tardif d'une requête précédente).
  const requestIdRef = useRef(0);

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
    opts: { silent?: boolean } = {},
  ) => {
    const { silent = false } = opts;
    const cacheKey = buildCacheKey('dashboard', period, cStart, cEnd);

    // Incrémente l'ID de requête : tout setState ultérieur de cette closure
    // sera comparé à requestIdRef.current et ignoré si périmé.
    const myRequestId = ++requestIdRef.current;
    const isStillCurrent = () => requestIdRef.current === myRequestId;

    // Cache HIT : on affiche les données instantanément, sans spinner.
    // Un refresh silencieux tourne quand même en arrière-plan après.
    const cached = getCached<any[]>(cacheKey);
    if (cached && cached.length > 0) {
      setAllMetrics(cached);
      setLoading(false);
    }
    const daysMap: Record<string, number> = {
      '7j': 7, '14j': 14, '30j': 30, '60j': 60, '90j': 90,
      '6m': 180, '9m': 270, '1a': 365, '2a': 730, 'tout': 3650,
    };
    // En mode custom, on fetch tout l'historique puis on filtre par [start, end]
    const days = period === 'custom' ? 3650 : (daysMap[period] || 30);

    try {
      // Mode silencieux : refresh en arrière-plan sans faire clignoter le spinner.
      // Utilisé pour les refresh déclenchés par YOROI_DATA_CHANGED (sync HealthKit,
      // Watch, etc.) pour ne pas rebasculer l'écran en bleu toutes les 10s.
      if (!silent) setLoading(true);
      const settings = await getUserSettings();

      // Cap à 500 lignes DB : au-delà, le mini-sparkline ne peut pas exploiter plus
      // (on sample à 30 points de toute façon). Évite de charger 6000+ rows en RAM.
      const DB_FETCH_LIMIT = 500;
      const [weights, trainings, measurements, sleep, readiness, loadStats, latestWeight] = await Promise.all([
        getWeights(days, DB_FETCH_LIMIT),
        getTrainings(days, DB_FETCH_LIMIT),
        getMeasurements(days, DB_FETCH_LIMIT),
        getSleepStats(),
        calculateReadinessScore(7),
        getWeeklyLoadStats(),
        getLatestWeight(),
      ]);

      // FILTRE STRICT : pas de fallback vers tout l'historique quand la période
      // sélectionnée est vide. L'utilisateur a demandé "14j" → on montre 14j, point.
      // S'il n'y a rien, la carte affichera l'état vide "Saisir".
      let effectiveWeights: any[] = weights || [];
      let effectiveMeasurements: any[] = measurements || [];

      // Si mode custom → filtre client-side sur [cStart, cEnd] (on a fetch 3650j)
      if (period === 'custom' && cStart && cEnd) {
        const startMs = new Date(cStart).getTime();
        const endMs = new Date(cEnd).getTime() + 24 * 3600 * 1000 - 1; // inclusif fin de journée
        const inRange = (item: any) => {
          const t = new Date(item.date).getTime();
          return t >= startMs && t <= endMs;
        };
        effectiveWeights = effectiveWeights.filter(inRange);
        effectiveMeasurements = effectiveMeasurements.filter(inRange);
      }

      const metricsList: any[] = [];

      // Cap dur à 30 points échantillonnés uniformément (1er + dernier + intermédiaires
      // répartis). Au-delà, le chart ne peut plus se rendre (6000+ points = SVG géant).
      // Le sparkline reste représentatif de la tendance globale.
      const HARD_CAP = 30;
      const prepareLineData = (data: any[], valueKey: string, color: string) => {
        if (!data || data.length === 0) return [];
        // Poids 0 = entrée composition seule → exclue
        const filtered = data.filter(item => item[valueKey] != null && (valueKey !== 'weight' || item[valueKey] > 0));
        // Convention Yoroi : plus récent à GAUCHE (data déjà DESC depuis la DB)
        const ordered = filtered.slice();

        let sampled: any[] = ordered;
        if (ordered.length > HARD_CAP) {
          sampled = [];
          const step = (ordered.length - 1) / (HARD_CAP - 1);
          for (let i = 0; i < HARD_CAP; i++) {
            const idx = Math.round(i * step);
            sampled.push(ordered[idx]);
          }
        }

        return sampled.map(item => {
          const val = item[valueKey] || 0;
          return {
            value: val,
            date: item.date,
            dataPointText: val.toFixed(1),
            label: `${format(parseISO(item.date), 'd MMM', { locale: fr }).toUpperCase()}\n${format(parseISO(item.date), 'yyyy')}`,
            labelTextStyle: { color: colors.textMuted, fontSize: 8, fontWeight: '900' as const },
            dataPointColor: color,
          };
        });
      };

      // Cherche la dernière valeur NON-NULL pour ce champ.
      // data est en ordre DESC (plus récent en [0]), si data[0][key] est null
      // (ex : entrée poids seul sans composition), on remonte dans l'historique.
      const getLatestValue = (data: any[], key: string, fallback: string = '--', decimals: number = 1) => {
        if (!data || data.length === 0) return fallback;
        for (const item of data) {
          const val = item?.[key];
          if (val != null && val !== 0) {
            return typeof val === 'number' ? val.toFixed(decimals) : String(val);
          }
        }
        return fallback;
      };

      // --- 1. CORPS ---
      metricsList.push({ id: 'weight', metricKey: 'weight', theme: 'Corps', title: 'Poids', icon: <Scale size={16} color="#3B82F6" />, color: '#3B82F6', unit: 'kg', value: getLatestValue(effectiveWeights, 'weight'), data: prepareLineData(effectiveWeights, 'weight', '#3B82F6') });
      metricsList.push({ id: 'muscle_percent', metricKey: 'muscle_percent', theme: 'Corps', title: 'Muscle', icon: <TrendingUp size={16} color="#10B981" />, color: '#10B981', unit: '%', value: getLatestValue(effectiveWeights, 'muscle_percent'), data: prepareLineData(effectiveWeights, 'muscle_percent', '#10B981') });
      metricsList.push({ id: 'fat_percent', metricKey: 'fat_percent', theme: 'Corps', title: 'Gras', icon: <Activity size={16} color="#EF4444" />, color: '#EF4444', unit: '%', value: getLatestValue(effectiveWeights, 'fat_percent'), data: prepareLineData(effectiveWeights, 'fat_percent', '#EF4444') });
      metricsList.push({ id: 'water_percent', metricKey: 'water_percent', theme: 'Corps', title: 'Eau', icon: <Waves size={16} color="#06B6D4" />, color: '#06B6D4', unit: '%', value: getLatestValue(effectiveWeights, 'water_percent'), data: prepareLineData(effectiveWeights, 'water_percent', '#06B6D4') });

      // --- 2. COMPOSITION ---
      metricsList.push({ id: 'visceral_fat', metricKey: 'visceral_fat', theme: 'Composition', title: 'Gras Visc.', icon: <Target size={16} color="#EF4444" />, color: '#EF4444', unit: '', value: getLatestValue(effectiveWeights, 'visceral_fat', '--', 0), data: prepareLineData(effectiveWeights, 'visceral_fat', '#EF4444') });
      metricsList.push({ id: 'bone_mass', metricKey: 'bone_mass', theme: 'Composition', title: 'Os', icon: <Bone size={16} color="#8B5CF6" />, color: '#8B5CF6', unit: 'kg', value: getLatestValue(effectiveWeights, 'bone_mass'), data: prepareLineData(effectiveWeights, 'bone_mass', '#8B5CF6') });
      metricsList.push({ id: 'bmr', metricKey: 'bmr', theme: 'Composition', title: 'BMR', icon: <Flame size={16} color="#F59E0B" />, color: '#F59E0B', unit: 'kcal', value: getLatestValue(effectiveWeights, 'bmr', '--', 0), data: prepareLineData(effectiveWeights, 'bmr', '#F59E0B') });
      metricsList.push({ id: 'metabolic_age', metricKey: 'metabolic_age', theme: 'Composition', title: 'Âge Métab.', icon: <Calendar size={16} color="#06B6D4" />, color: '#06B6D4', unit: 'ans', value: getLatestValue(effectiveWeights, 'metabolic_age', '--', 0), data: prepareLineData(effectiveWeights, 'metabolic_age', '#06B6D4') });

      // --- 3. MENSURATIONS ---
      const mKeys = [
        { key: 'waist', title: 'Taille', color: '#EF4444' },
        { key: 'chest', title: 'Pecs', color: '#3B82F6' },
        { key: 'left_arm', title: 'Bras', color: '#10B981' },
        { key: 'left_thigh', title: 'Cuisse', color: '#8B5CF6' },
      ];
      mKeys.forEach(m => {
        metricsList.push({ id: m.key, metricKey: m.key, theme: 'Mensurations', title: m.title, icon: <Ruler size={16} color={m.color} />, color: m.color, unit: 'cm', value: getLatestValue(effectiveMeasurements, m.key), data: prepareLineData(effectiveMeasurements, m.key, m.color) });
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

      // Libellé d'unité : "/Xj" pour presets courts, "total" pour tout l'historique,
      // "/Nj" calculé pour custom
      let unitLabel: string;
      if (period === 'tout') {
        unitLabel = 'total';
      } else if (period === 'custom' && cStart && cEnd) {
        const diffDays = Math.max(
          1,
          Math.round((new Date(cEnd).getTime() - new Date(cStart).getTime()) / (24 * 3600 * 1000)) + 1,
        );
        unitLabel = `/${diffDays}j`;
      } else {
        unitLabel = `/${days}j`;
      }

      metricsList.push({ id: 'trainings', metricKey: 'trainings', theme: 'Discipline', title: 'Entraînements', icon: <Trophy size={16} color="#8B5CF6" />, color: '#8B5CF6', unit: unitLabel, value: trainingsFiltered.length, data: [] });
      metricsList.push({ id: 'load', metricKey: 'load', theme: 'Discipline', title: 'Charge globale', icon: <Flame size={16} color="#F97316" />, color: '#F97316', unit: 'pts', value: loadStats?.totalLoad || 0, data: [] });

      // --- 5. SANTÉ ---
      metricsList.push({ id: 'vitality', metricKey: 'vitality', theme: 'Santé', title: 'Vitalité', icon: <Zap size={16} color="#F59E0B" />, color: '#F59E0B', unit: '/100', value: readiness?.score || '--', data: [] });

      const weeklyDataArr = sleep?.weeklyData || [];
      const latestSleepEntry = weeklyDataArr[weeklyDataArr.length - 1];
      const sleepDuration = latestSleepEntry?.duration ? formatDurationHM(latestSleepEntry.duration) : '--';
      metricsList.push({ id: 'sleep', metricKey: 'sleep', theme: 'Santé', title: 'Sommeil', icon: <Moon size={16} color="#8B5CF6" />, color: '#8B5CF6', unit: '', value: sleepDuration, data: prepareLineData(weeklyDataArr, 'duration', '#8B5CF6').map(d => ({...d, value: Math.round(d.value / 60 * 10) / 10, dataPointText: formatDurationHM(d.value)})) });

      // On cache toujours (le résultat reste utile même si une autre période
      // est en cours), mais on ne setState que si on est encore "courant".
      setCached(cacheKey, metricsList);
      if (isStillCurrent()) {
        setAllMetrics(metricsList);
        setAllTrainingsForStreak(trainings || []);
        // Génération insights contextuels (perte/gain poids, séances semaine, sommeil)
        const generated = generateInsights({
          weights: effectiveWeights,
          trainings: trainings || [],
          nights: weeklyDataArr,
          sleepGoalMinutes: 480,
        }, 2);
        setInsights(generated);

        // Comparaisons fun depuis les totaux globaux (sur la période courante)
        const totalDur = (trainings || []).reduce(
          (s: number, t: any) => s + (t.duration_minutes || t.duration || 0), 0,
        );
        const totalKcal = (trainings || []).reduce(
          (s: number, t: any) => s + (t.calories || 0), 0,
        );
        const totalDist = (trainings || []).reduce(
          (s: number, t: any) => s + (t.distance || 0), 0,
        );
        setFunComparisons(generateFunComparisons({
          totalSessions: (trainings || []).length,
          totalDurationMinutes: totalDur,
          totalKcal: totalKcal,
          totalDistanceKm: totalDist,
        }, 3));
      }
    } catch (e) {
      logger.error("Error loading dashboard data", e);
    } finally {
      if (!silent && isStillCurrent()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      loadAllData(selectedPeriod, customStart, customEnd);
    });
    return () => handle.cancel();
  }, [selectedPeriod, customStart, customEnd, loadAllData]);

  // Recharger si des données changent ailleurs dans l'app, invalide le cache
  // puis refresh silencieux + debounce 1.5s pour éviter les rafales d'events.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', () => {
      invalidateCachePrefix('dashboard');
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        loadAllData(selectedPeriod, customStart, customEnd, { silent: true });
      }, 1500);
    });
    return () => {
      sub.remove();
      if (timeout) clearTimeout(timeout);
    };
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
    // Haptic avant l'action : feedback < 50ms même si la navigation/modal prend du temps
    if (Platform.OS !== 'web') {
      impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    }
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
    const themes = ['Corps', 'Composition', 'Mensurations', 'Discipline', 'Santé'];
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

  // NOTE: on ne bloque PLUS le render pendant `loading`, la structure (header +
  // sélecteur de période) s'affiche immédiatement, les cartes se remplissent au fur
  // et à mesure. C'est la clé pour que l'onglet apparaisse instantanément.
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

      {/* Onboarding contextuel, affiché 1 seule fois pour les nouveaux users */}
      <OnboardingTooltip
        id="dashboard-period-dropdown"
        title="Choisis ta période"
        text="Touche le bandeau de période pour filtrer (7j, 30j, custom...)"
      />

      {/* Streak séances (Duolingo-style), tout en haut pour effet motivant */}
      <StreakBadge items={allTrainingsForStreak} />

      {/* Bandeau insights contextuels (juste sous le header de période) */}
      {insights.length > 0 && <StatsInsightBanner insights={insights} />}

      {loading && allMetrics.length === 0 && (
        <SkeletonGrid count={8} cardHeight={235} />
      )}

      {!loading && allMetrics.every(m => !m.data || m.data.length === 0) && allMetrics.length > 0 && (
        <StatsEmptyState
          icon={<Scale size={36} color="#3B82F6" strokeWidth={2} />}
          title="Pas encore de données"
          description="Enregistre ta première pesée pour démarrer ton suivi. Tes courbes apparaîtront ici dès la première entrée."
          ctaLabel="Ajouter ma première pesée"
          ctaHref="/pesee"
          accentColor="#3B82F6"
        />
      )}

      <View style={styles.gridContainer}>
      {groupedThemes.map(({ theme, metrics }, sectionIdx) => {
        const firstColor = metrics[0]?.color || colors.accent;
        const lastColor = metrics[metrics.length - 1]?.color || firstColor;
        return (
        <View key={theme}>
          {/* Séparateur couleur thème entre les sections */}
          {sectionIdx > 0 && (
            <View style={[styles.themeSeparator, { backgroundColor: isDark ? colors.accent : 'rgba(255,255,255,0.4)' }]} />
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

      {/* Derniers badges débloqués (réutilise lib/badges existant) */}
      <RecentBadgesStrip />

      {/* Comparaisons fun (carrousel horizontal, effet wow) */}
      {funComparisons.length > 0 && (
        <FunComparisonsCard comparisons={funComparisons} title="Le saviez-vous ?" />
      )}

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
    paddingBottom: 200, // iPhone 120 + buffer iPad pour tab bar flottante
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
    minHeight: 235,
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
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  trendBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
    marginBottom: 4,
    opacity: 0.85,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 26,           // +4 vs avant pour plus d'impact
    fontWeight: '900',
    letterSpacing: -0.8,    // un peu plus serré (look Apple)
    lineHeight: 30,
  },
  cardUnit: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  miniChartWrapper: {
    height: 135,
    marginTop: 8,
    marginLeft: -14,
    marginRight: -8,
    marginBottom: -10,
    paddingTop: 18,
    justifyContent: 'flex-end',
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
