// ============================================
// CORPS TAB PAGE - Poids + Composition + Mensurations
// Fusion des 3 anciens onglets en un seul scroll
// ============================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Text, RefreshControl, InteractionManager, unstable_batchedUpdates, DeviceEventEmitter } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { WeightChartCard } from '../charts/WeightChartCard';
import { DualComparisonCard } from '../charts/DualComparisonCard';
import { MultiLineComparisonCard } from '../charts/MultiLineComparisonCard';
import { StatsDetailModal } from '../StatsDetailModal';
import { aggregateWeightData } from '@/lib/statsAggregation';
import { getProfile, getAllWeights, getLatestWeight, getLatestMeasurement, getMeasurements, getWeights } from '@/lib/database';
import { getUserSettings } from '@/lib/storage';
import {
  BMI_RANGES,
  WATER_PERCENTAGE_RANGES,
  VISCERAL_FAT_RANGES,
  getMetricStatus,
  getBodyFatRange,
  getMuscleMassRange,
  getBoneMassRange,
  getWaistCircumferenceRange,
} from '@/lib/healthRanges';
import { Scale, Target, TrendingUp, TrendingDown, BarChart3, Activity, Droplet, Bone, Zap, Flame, Ruler, ClipboardList } from 'lucide-react-native';
import { router } from 'expo-router';
import Svg, { Path, Circle as SvgCircle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '@/lib/security/logger';
import { buildCacheKey, getCached, setCached, invalidateCachePrefix } from '@/lib/statsMemoryCache';
import { StatsEmptyState } from '../StatsEmptyState';
import { StatsInsightBanner } from '../StatsInsightBanner';
import { StreakBadge } from '../StreakBadge';
import { generateInsights, type Insight } from '@/lib/statsInsights';
import { SkeletonGrid } from '../SkeletonCard';

// Parse date sûr : 'yyyy-MM-dd' en local (évite le jour précédent à l'ouest d'UTC)
const toLocalDate = (v: any): Date =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? parseISO(v) : new Date(v);

// Dernière valeur d'un historique trié ancien → récent
const lastVal = (arr: { value: number }[]): number => arr.length ? arr[arr.length - 1].value : 0;

export const CorpsTabPage: React.FC = React.memo(() => {
  const { colors, screenBackground } = useTheme();
  const { t } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const dateLocale = fr;
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('tout');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Poids state ---
  const [weightData, setWeightData] = useState<any>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [allWeightsData, setAllWeightsData] = useState<any[]>([]);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);

  // --- Composition state ---
  const [latestWeight, setLatestWeight] = useState<any>(null);
  const [compositionHistory, setCompositionHistory] = useState<{
    bodyFat: any[];
    muscle: any[];
    water: any[];
  }>({ bodyFat: [], muscle: [], water: [] });
  const [compositionAdvancedHistory, setCompositionAdvancedHistory] = useState<{
    bone: any[];
    visceral: any[];
    bmr: any[];
    metabolicAge: any[];
  }>({ bone: [], visceral: [], bmr: [], metabolicAge: [] });

  // --- Mensurations state ---
  const [latestMeasurement, setLatestMeasurement] = useState<any>(null);
  const [allMeasurementsData, setAllMeasurementsData] = useState<any[]>([]);
  const [measurementHistory, setMeasurementHistory] = useState<{
    chest: any[]; waist: any[]; navel: any[]; hips: any[]; shoulders: any[];
    left_arm: any[]; right_arm: any[];
    left_thigh: any[]; right_thigh: any[];
    left_calf: any[]; right_calf: any[];
    neck: any[];
  }>({
    chest: [], waist: [], navel: [], hips: [], shoulders: [],
    left_arm: [], right_arm: [],
    left_thigh: [], right_thigh: [],
    left_calf: [], right_calf: [],
    neck: [],
  });

  // --- User data ---
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');

  // --- Modal ---
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    label: string;
    color: string;
    unit: string;
    icon: React.ReactNode;
    source: 'weight' | 'composition' | 'measurement';
  } | null>(null);

  // BMI traduit (mémoïsé)
  const translatedBMIRanges = useMemo(() => {
    const zones = BMI_RANGES.zones.map(zone => ({
      ...zone,
      label: zone.label === 'Sous-poids' ? t('stats.bmiUnderweight') :
             zone.label === 'Normal' ? t('stats.bmiNormal') :
             zone.label === 'Surpoids' ? t('stats.bmiOverweight') :
             zone.label === 'Obésité' ? t('stats.bmiObese') : zone.label
    }));
    return { ...BMI_RANGES, zones };
  }, [t]);

  const requestIdRef = useRef(0);
  const loadData = useCallback(async (opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts;
    const cacheKey = buildCacheKey('corps', selectedPeriod);
    const myReq = ++requestIdRef.current;
    const isCurrent = () => requestIdRef.current === myReq;

    // Cache HIT : hydrate l'écran instantanément depuis la mémoire
    const cached = getCached<any>(cacheKey);
    if (cached) {
      unstable_batchedUpdates(() => {
        if (cached.userGender) setUserGender(cached.userGender);
        if (cached.resolvedGoal) setTargetWeight(cached.resolvedGoal);
        setWeightData(cached.data);
        if (cached.allWeights) setAllWeightsData(cached.allWeights);
        if (cached.bmiVal !== null) setBmi(cached.bmiVal);
        if (cached.heightCmVal !== null) setHeightCm(cached.heightCmVal);
        if (cached.weightHistoryVal) setWeightHistory(cached.weightHistoryVal);
        setLatestWeight(cached.latest);
        if (cached.compositionHistoryVal) setCompositionHistory(cached.compositionHistoryVal);
        if (cached.compositionAdvancedHistoryVal) setCompositionAdvancedHistory(cached.compositionAdvancedHistoryVal);
        setLatestMeasurement(cached.allMeasurements?.[0] || null);
        if (cached.allMeasurements) setAllMeasurementsData(cached.allMeasurements);
        if (cached.measurementHistoryVal) setMeasurementHistory(cached.measurementHistoryVal);
      });
      setLoading(false);
    }

    if (!silent && !cached) setLoading(true);
    try {
      const daysMap: { [key: string]: number } = {
        '7j': 7, '14j': 14, '30j': 30, '60j': 60, '90j': 90,
        '6m': 180, '9m': 270, '1a': 365, '2a': 730, 'tout': 3650, 'custom': 3650,
      };
      const days = daysMap[selectedPeriod] || 30;

      // PERF : on charge uniquement la période + cap 500 lignes (index DB actif).
      // Avant : getAllWeights() + getMeasurements() sans param → 6000+ rows en RAM.
      const [data, profile, periodWeights, settings, latest, periodMeasurements] = await Promise.all([
        aggregateWeightData(selectedPeriod),
        getProfile(),
        getWeights(days, 500),
        getUserSettings(),
        getLatestWeight(),
        getMeasurements(days, 500),
      ]);

      // Tout calculer avant les setState
      const goalFromProfile = profile?.target_weight;
      const goalFromSettings = settings?.weight_goal;
      const resolvedGoal = (goalFromProfile && goalFromProfile > 0) ? goalFromProfile : (goalFromSettings ?? null);

      let bmiVal: number | null = null;
      let heightCmVal: number | null = null;
      if (data?.values != null && data.values.length > 0 && profile?.height_cm) {
        const latestW = data!.values[data!.values.length - 1].value;
        const heightM = profile.height_cm / 100;
        bmiVal = latestW / (heightM * heightM);
        heightCmVal = profile.height_cm;
      }

      // `periodWeights` est déjà filtré par date côté SQL et indexé → juste inverser.
      let weightHistoryVal: any[] = [];
      let compositionHistoryVal: any = null;
      let compositionAdvancedHistoryVal: any = null;
      if (periodWeights?.length > 0) {
        // Un seul passage pour construire toutes les séries (au lieu de 7 filter/map séparés)
        const reversed = periodWeights.slice().reverse();
        // Exclut les entrées composition seule (poids 0)
        weightHistoryVal = reversed.filter((w: any) => w.weight > 0).map((w: any) => ({ date: w.date, value: w.weight }));
        const bodyFat: any[] = [], muscle: any[] = [], water: any[] = [];
        const bone: any[] = [], visceral: any[] = [], bmr: any[] = [], metabolicAge: any[] = [];
        for (const w of reversed as any[]) {
          if (w.fat_percent && w.fat_percent > 0) bodyFat.push({ date: w.date, value: w.fat_percent });
          if (w.muscle_percent && w.muscle_percent > 0) muscle.push({ date: w.date, value: w.muscle_percent });
          if (w.water_percent && w.water_percent > 0) water.push({ date: w.date, value: w.water_percent });
          if (w.bone_mass && w.bone_mass > 0) bone.push({ date: w.date, value: w.bone_mass });
          if (w.visceral_fat && w.visceral_fat > 0) visceral.push({ date: w.date, value: w.visceral_fat });
          if (w.bmr && w.bmr > 0) bmr.push({ date: w.date, value: w.bmr });
          if (w.metabolic_age && w.metabolic_age > 0) metabolicAge.push({ date: w.date, value: w.metabolic_age });
        }
        compositionHistoryVal = { bodyFat, muscle, water };
        compositionAdvancedHistoryVal = { bone, visceral, bmr, metabolicAge };
      }

      // Mensurations : un seul passage pour les 12 champs (au lieu de 12 filter/map)
      let measurementHistoryVal: any = null;
      if (periodMeasurements?.length > 0) {
        const reversedM = periodMeasurements.slice().reverse();
        const fields = ['chest', 'waist', 'navel', 'hips', 'shoulders', 'left_arm', 'right_arm', 'left_thigh', 'right_thigh', 'left_calf', 'right_calf', 'neck'];
        const history: any = {};
        for (const f of fields) history[f] = [];
        for (const m of reversedM as any[]) {
          for (const f of fields) {
            if (m[f] && m[f] > 0) history[f].push({ date: m.date, value: m[f] });
          }
        }
        measurementHistoryVal = history;
      }
      // Aliases pour la logique setState (modal full history = chargé à la demande)
      const allWeights = periodWeights;
      const allMeasurements = periodMeasurements;

      // Stocke en cache mémoire pour réouverture rapide de l'onglet
      setCached(cacheKey, {
        userGender: settings?.gender,
        resolvedGoal,
        data,
        allWeights,
        bmiVal,
        heightCmVal,
        weightHistoryVal,
        latest,
        compositionHistoryVal,
        compositionAdvancedHistoryVal,
        allMeasurements,
        measurementHistoryVal,
      });

      // Anti-race : skip setState si une autre requête a démarré entre-temps
      if (!isCurrent()) return;

      // Génération insights spécifiques à Corps (perte/gain poids, composition)
      const corpsInsights = generateInsights({ weights: allWeights }, 2);
      setInsights(corpsInsights);

      // Un seul re-render pour tout mettre à jour
      unstable_batchedUpdates(() => {
        if (settings?.gender) setUserGender(settings.gender as 'male' | 'female');
        if (resolvedGoal) setTargetWeight(resolvedGoal);
        setWeightData(data);
        if (allWeights?.length > 0) setAllWeightsData(allWeights);
        if (bmiVal !== null) setBmi(bmiVal);
        if (heightCmVal !== null) setHeightCm(heightCmVal);
        if (weightHistoryVal.length > 0) setWeightHistory(weightHistoryVal);
        setLatestWeight(latest);
        if (compositionHistoryVal) setCompositionHistory(compositionHistoryVal);
        if (compositionAdvancedHistoryVal) setCompositionAdvancedHistory(compositionAdvancedHistoryVal);
        setLatestMeasurement(allMeasurements?.[0] || null);
        if (allMeasurements?.length > 0) setAllMeasurementsData(allMeasurements);
        if (measurementHistoryVal) setMeasurementHistory(measurementHistoryVal);
      });
    } catch (error) {
      logger.error('Error loading corps data:', error);
    } finally {
      if (!silent && isCurrent()) setLoading(false);
    }
  }, [selectedPeriod]);

  const isFirstLoad = useRef(true);
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      const handle = InteractionManager.runAfterInteractions(() => { loadData(); });
      return () => handle.cancel();
    } else {
      loadData();
    }
  }, [selectedPeriod]);

  // Debounce 1.5s + invalide cache + silent (pas de spinner qui clignote).
  // Évite la boucle YOROI_DATA_CHANGED → reload → ré-émet (déjà fixé sur Dashboard).
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', () => {
      invalidateCachePrefix('corps');
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => loadData({ silent: true }), 1500);
    });
    return () => {
      sub.remove();
      if (timeout) clearTimeout(timeout);
    };
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadData(); } finally { setRefreshing(false); }
  }, [loadData]);

  // Memoized sparkline data
  const evolutionSparkline = useMemo(() => {
    if (weightHistory.length < 2) return [];
    const first = weightHistory[0]?.value || 1;
    return weightHistory.map(h => ({ value: ((h.value - first) / first) * 100 }));
  }, [weightHistory]);

  const averageSparkline = useMemo(() => {
    if (weightHistory.length < 2) return [];
    return weightHistory.map((h, i, arr) => {
      const start = Math.max(0, i - 6);
      const slice = arr.slice(start, i + 1);
      return { value: slice.reduce((s, x) => s + x.value, 0) / slice.length };
    });
  }, [weightHistory]);

  // Composition sparklines

  // --- Modal data (memoized) ---
  const getModalData = useCallback(() => {
    if (!selectedMetric) return [];

    // Règle 3 : plus récent à GAUCHE → tri DESC | Règle 4 : deux lignes
    const fmtLabel = (d: Date) => `${format(d, 'd MMM', { locale: dateLocale })}\n${format(d, 'yyyy')}`;

    if (selectedMetric.source === 'weight') {
      // Règle 3 : tri DESC
      // Exclut les entrées composition seule (poids 0)
      const sorted = allWeightsData.filter(w => w.weight > 0).sort((a, b) => toLocalDate(b.date).getTime() - toLocalDate(a.date).getTime());
      switch (selectedMetric.key) {
        case 'weight': return sorted.map(w => ({ value: w.weight, label: fmtLabel(toLocalDate(w.date)), date: w.date }));
        case 'bmi': if (!heightCm) return []; const hM = heightCm / 100; return sorted.map(w => ({ value: w.weight / (hM * hM), label: fmtLabel(toLocalDate(w.date)), date: w.date }));
        case 'evolution': {
          // Référence = le plus ancien = dernier élément en DESC
          const refWeight = sorted[sorted.length - 1]?.weight || 0;
          return sorted.map(w => ({ value: refWeight ? ((w.weight - refWeight) / refWeight) * 100 : 0, label: fmtLabel(toLocalDate(w.date)), date: w.date }));
        }
        case 'average': {
          // Moyenne mobile calculée sur ASC, puis inversée
          const asc = [...sorted].reverse();
          return asc.map((w, i) => { const start = Math.max(0, i - 6); const slice = asc.slice(start, i + 1); const avg = slice.reduce((s, x) => s + x.weight, 0) / slice.length; return { value: avg, label: fmtLabel(toLocalDate(w.date)), date: w.date }; }).reverse();
        }
        case 'target': return sorted.map(w => ({ value: w.weight, label: fmtLabel(toLocalDate(w.date)), date: w.date }));
        default: return [];
      }
    }

    if (selectedMetric.source === 'composition') {
      // Règle 3 : tri DESC
      const sorted = [...allWeightsData].sort((a, b) => toLocalDate(b.date).getTime() - toLocalDate(a.date).getTime());
      return sorted.filter(w => w[selectedMetric.key] > 0).map(w => ({ value: w[selectedMetric.key], label: fmtLabel(toLocalDate(w.date)), date: w.date }));
    }

    if (selectedMetric.source === 'measurement') {
      // Règle 3 : tri DESC
      const sorted = [...allMeasurementsData].sort((a, b) => toLocalDate(b.date).getTime() - toLocalDate(a.date).getTime());
      return sorted.filter(m => m[selectedMetric.key] && m[selectedMetric.key] > 0).map(m => ({ value: m[selectedMetric.key], label: fmtLabel(toLocalDate(m.date)), date: m.date }));
    }

    return [];
  }, [selectedMetric, allWeightsData, allMeasurementsData, heightCm, dateLocale]);

  // --- Calculs jauge BMI (memoizés car trigonométrie coûteuse) ---
  const bmiGaugeData = useMemo(() => {
    if (bmi == null || bmi <= 0) return null;

    let bmiLabel = '';
    let bmiColor = '#22C55E';
    if (bmi < 16) { bmiLabel = 'Denutrition'; bmiColor = '#DC2626'; }
    else if (bmi < 18.5) { bmiLabel = 'Maigreur'; bmiColor = '#F97316'; }
    else if (bmi < 25) { bmiLabel = 'Normal'; bmiColor = '#22C55E'; }
    else if (bmi < 30) { bmiLabel = 'Surpoids'; bmiColor = '#F97316'; }
    else if (bmi < 35) { bmiLabel = 'Obesite I'; bmiColor = '#EF4444'; }
    else if (bmi < 40) { bmiLabel = 'Obesite II'; bmiColor = '#DC2626'; }
    else { bmiLabel = 'Obesite III'; bmiColor = '#991B1B'; }

    const GW = 200;
    const GH = 120;
    const gcx = GW / 2;
    const gcy = GH - 2;
    const gr = 65;
    const gsw = 16;
    const BMI_MIN = 15;
    const BMI_MAX = 40;
    const clampedBmi = Math.max(BMI_MIN, Math.min(BMI_MAX, bmi));
    const bmiProgress = (clampedBmi - BMI_MIN) / (BMI_MAX - BMI_MIN);

    const toArc = (v: number) => Math.max(0, Math.min(1, (v - BMI_MIN) / (BMI_MAX - BMI_MIN)));
    const bmiSegs = [
      { from: toArc(BMI_MIN), to: toArc(18.5), color: '#F97316' },
      { from: toArc(18.5), to: toArc(25), color: '#22C55E' },
      { from: toArc(25), to: toArc(30), color: '#F97316' },
      { from: toArc(30), to: toArc(BMI_MAX), color: '#EF4444' },
    ];
    const makeBmiArc = (p1: number, p2: number) => {
      const a1 = Math.PI * (1 - p1), a2 = Math.PI * (1 - p2);
      return `M ${gcx + gr * Math.cos(a1)} ${gcy - gr * Math.sin(a1)} A ${gr} ${gr} 0 0 1 ${gcx + gr * Math.cos(a2)} ${gcy - gr * Math.sin(a2)}`;
    };

    const labelR = gr + gsw / 2 + 16;
    const bmiLabelsArr = [15, 18, 25, 30, 35, 40];
    const labelPositions = bmiLabelsArr.map(v => {
      const p = (v - BMI_MIN) / (BMI_MAX - BMI_MIN);
      const a = Math.PI * (1 - p);
      return { v, x: gcx + labelR * Math.cos(a), y: gcy - labelR * Math.sin(a) };
    });

    const needleAngle = Math.PI * (1 - bmiProgress);
    const nLen = gr + gsw / 2;
    const nx = gcx + nLen * Math.cos(needleAngle);
    const ny = gcy - nLen * Math.sin(needleAngle);

    return { bmiLabel, bmiColor, GW, GH, gcx, gcy, gr, gsw, bmiSegs, makeBmiArc, labelPositions, nx, ny };
  }, [bmi]);

  // --- Ranges ---
  const bodyFatRange = getBodyFatRange(userGender);
  const muscleMassRange = getMuscleMassRange(userGender);
  const boneMassRange = getBoneMassRange(userGender);

  const currentWeight = weightData?.values?.[weightData.values.length - 1]?.value || 0;
  const bmiStatus = bmi ? getMetricStatus(bmi, translatedBMIRanges) : null;
  // Repli sur la dernière valeur connue si la dernière pesée n'a pas le champ
  const fatPercent = latestWeight?.fat_percent || lastVal(compositionHistory.bodyFat);
  const musclePercent = latestWeight?.muscle_percent || lastVal(compositionHistory.muscle);
  const waterPercent = latestWeight?.water_percent || lastVal(compositionHistory.water);
  const boneMass = latestWeight?.bone_mass || lastVal(compositionAdvancedHistory.bone);
  const visceralFat = latestWeight?.visceral_fat || lastVal(compositionAdvancedHistory.visceral);
  const bmrValue = latestWeight?.bmr || lastVal(compositionAdvancedHistory.bmr);
  const metabolicAge = latestWeight?.metabolic_age || lastVal(compositionAdvancedHistory.metabolicAge);
  // Mensuration : dernière valeur non nulle (dernière mesure puis historique)
  const mVal = (k: keyof typeof measurementHistory): number => latestMeasurement?.[k] || lastVal(measurementHistory[k]);
  // Évolution : signe réel du changement (pas le trend à seuil 5%)
  const evoUp = (weightData?.changePercent || 0) > 0;

  const getHealthRangeForModal = () => {
    if (!selectedMetric) return undefined;
    const key = selectedMetric.key;
    if (key === 'bmi') return translatedBMIRanges;
    if (key === 'fat_percent') return bodyFatRange;
    if (key === 'muscle_percent') return muscleMassRange;
    if (key === 'water_percent') return WATER_PERCENTAGE_RANGES;
    if (key === 'visceral_fat') return VISCERAL_FAT_RANGES;
    if (key === 'bone_mass') return boneMassRange;
    if (key === 'waist') return getWaistCircumferenceRange(userGender);
    return undefined;
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: screenBackground }]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      contentContainerStyle={styles.content}
      onScroll={onScrollContext}
      scrollEventThrottle={200}
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
      {/* ========== SECTION POIDS : graphique + métriques clés dans le même corps ========== */}
      <StatsHeader
        title={t('statsPages.weight.title')}
        description="Poids, composition et mensurations"
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {loading && <SkeletonGrid count={4} cardHeight={160} />}
      {!loading && (<>
      {/* Streak pesées (motivant pour suivi régulier) */}
      <StreakBadge
        items={allWeightsData}
        unitSingular="jour de pesée"
        unitPlural="jours de pesée"
        contextLabel="Suivi régulier, bravo"
        forceColor="#3B82F6"
      />

      {/* Insights contextuels (perte/gain poids, composition) */}
      {insights.length > 0 && <StatsInsightBanner insights={insights} />}

      {/* Empty state si aucune donnée corps + pas en chargement */}
      {!loading && (!weightData?.values || weightData.values.length === 0) && (!allWeightsData || allWeightsData.length === 0) && (
        <StatsEmptyState
          icon={<Scale size={36} color="#3B82F6" strokeWidth={2} />}
          title="Démarre ton suivi corporel"
          description="Enregistre ta première pesée pour voir l'évolution de ton poids, ta composition corporelle et tes mensurations."
          ctaLabel="Ajouter ma première pesée"
          ctaHref="/add-weight"
          accentColor="#3B82F6"
        />
      )}

      {/* Bouton accès rapide Historique corporel */}
      <TouchableOpacity
        style={[corpsBannerStyle.btn, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => router.push('/body-history')}
        accessibilityRole="button"
        accessibilityLabel="Accéder à l'historique corporel complet"
      >
        <View style={[corpsBannerStyle.icon, { backgroundColor: '#3B82F615' }]}>
          <ClipboardList size={18} color="#3B82F6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[corpsBannerStyle.title, { color: colors.textPrimary }]}>Historique corporel complet</Text>
          <Text style={[corpsBannerStyle.sub, { color: colors.textMuted }]}>Poids · Muscle · Graisse · Mensurations · supprimer / modifier</Text>
        </View>
        <Text style={{ color: '#3B82F6', fontSize: 18 }}>›</Text>
      </TouchableOpacity>

      {/* Evolution du poids + Historique récent dans le même bloc */}
      <StatsSection>
        <WeightChartCard
          data={weightData?.values ? [...weightData.values].reverse() : []}
          color="#3B82F6"
          unit=" kg"
          title={t('statsPages.weight.weightEvolution')}
          targetWeight={targetWeight ?? undefined}
          newestFirst={true}
          onPressWeight={() => setSelectedMetric({ key: 'weight', label: t('statsPages.weight.currentWeight'), color: '#3B82F6', unit: 'kg', icon: <Scale size={18} color="#3B82F6" strokeWidth={2.5} />, source: 'weight' })}
          onPressTarget={() => setSelectedMetric({ key: 'target', label: t('statsPages.weight.target'), color: '#10B981', unit: 'kg', icon: <Target size={18} color="#10B981" strokeWidth={2.5} />, source: 'weight' })}
        />

        {/* Historique récent · horizontal, le plus récent à GAUCHE · fusionné sous le graphique */}
        {allWeightsData.length > 0 && (
          <View>
            <View style={styles.historyTitleRow}>
              <View style={[styles.historyTitleDash, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.historyTitleText, { color: colors.textMuted }]}>
                ENTRÉES ({allWeightsData.length})
              </Text>
              <View style={[styles.historyTitleDash, { backgroundColor: '#3B82F6' }]} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyScrollContent}
            >
              {allWeightsData.map((entry, index) => {
                const prevEntry = allWeightsData[index + 1];
                const change = prevEntry ? entry.weight - prevEntry.weight : 0;
                const isFirst = index === 0;
                return (
                  <TouchableOpacity
                    key={entry.id || index}
                    activeOpacity={0.7}
                    onPress={() => setSelectedMetric({ key: 'weight', label: t('statsPages.weight.currentWeight'), color: '#3B82F6', unit: 'kg', icon: <Scale size={18} color="#3B82F6" strokeWidth={2.5} />, source: 'weight' })}
                    style={[
                      styles.historyCard,
                      { backgroundColor: colors.backgroundCard, borderColor: isFirst ? '#3B82F6' : colors.border },
                      isFirst && styles.historyCardRecent,
                    ]}
                  >
                    {isFirst && (
                      <View style={styles.historyCardBadge}>
                        <Text style={styles.historyCardBadgeText}>RECENT</Text>
                      </View>
                    )}
                    <Text style={[styles.historyCardDate, { color: colors.textMuted }]}>
                      {format(toLocalDate(entry.date), 'd MMM yyyy', { locale: fr })}
                    </Text>
                    <Text style={[styles.historyCardWeight, { color: isFirst ? '#3B82F6' : colors.textPrimary }]}>
                      {entry.weight?.toFixed(1)} <Text style={styles.historyCardUnit}>kg</Text>
                    </Text>
                    {change !== 0 && (
                      <Text style={[styles.historyCardChange, { color: change < 0 ? '#10B981' : '#EF4444' }]}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)} kg
                      </Text>
                    )}
                    {entry.fat_percent > 0 && (
                      <Text style={[styles.historyCardExtra, { color: colors.textMuted }]}>
                        G: {entry.fat_percent?.toFixed(1)}%
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </StatsSection>

      {/* ========== IMC + Statistiques dans le même corps ========== */}
      {bmi != null && bmi > 0 && (
        <StatsSection>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedMetric({ key: 'bmi', label: t('stats.bmi'), color: bmiStatus?.color || '#6366F1', unit: '', icon: <Scale size={18} color={bmiStatus?.color || '#6366F1'} strokeWidth={2.5} />, source: 'weight' })}
            style={[styles.bmiGaugeCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
          >
            {bmiGaugeData && (() => {
              const { bmiLabel, bmiColor, GW, GH, gcx, gcy, gr, gsw, bmiSegs, makeBmiArc, labelPositions, nx, ny } = bmiGaugeData;
              const cats = [
                { label: 'Maigreur', color: '#F97316' },
                { label: 'Normal', color: '#22C55E' },
                { label: 'Surpoids', color: '#F97316' },
                { label: 'Obesite', color: '#EF4444' },
              ];
              return (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <View style={{ width: GW, height: GH, overflow: 'visible' }}>
                    <Svg width={GW} height={GH} viewBox={`0 0 ${GW} ${GH}`} style={{ overflow: 'visible' }}>
                      <Path d={makeBmiArc(0, 1)} stroke={colors.border || 'rgba(255,255,255,0.06)'} strokeWidth={gsw + 4} fill="none" strokeLinecap="butt" />
                      {bmiSegs.map((s, i) => (
                        <Path key={i} d={makeBmiArc(s.from, s.to)} stroke={s.color} strokeWidth={gsw} fill="none" strokeLinecap="butt" />
                      ))}
                      {labelPositions.map((lp) => (
                        <SvgText key={lp.v} x={lp.x} y={lp.y + 3} fontSize={10} fontWeight="800" fill={colors.textMuted || '#6B7280'} textAnchor="middle">{lp.v}</SvgText>
                      ))}
                      <SvgLine x1={gcx} y1={gcy} x2={nx} y2={ny} stroke={colors.textPrimary || '#FFFFFF'} strokeWidth={3} strokeLinecap="round" />
                      <SvgCircle cx={gcx} cy={gcy} r={5} fill={colors.background || '#1A1A2E'} stroke={colors.border || 'rgba(255,255,255,0.15)'} strokeWidth={2} />
                    </Svg>
                  </View>
                  <Text style={{ fontSize: 32, fontWeight: '900', color: colors.textPrimary, textAlign: 'center', letterSpacing: -1, marginTop: 4 }}>
                    {bmi!.toFixed(1)}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: bmiColor, textAlign: 'center', marginTop: 2 }}>{bmiLabel}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                    {cats.map((c) => (
                      <View key={c.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <View style={{ width: 18, height: 5, borderRadius: 2.5, backgroundColor: c.color }} />
                        <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted }}>{c.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </TouchableOpacity>

          {/* Statistiques poids dans le même corps que le BMI */}
          <View style={[styles.grid, { marginTop: 12 }]}>
            <TouchableOpacity
              style={styles.gridItem}
              activeOpacity={0.7}
              onPress={() => setSelectedMetric({ key: 'evolution', label: t('statsPages.weight.evolution'), color: evoUp ? '#F59E0B' : '#10B981', unit: '%', icon: evoUp ? <TrendingUp size={18} color="#F59E0B" strokeWidth={2.5} /> : <TrendingDown size={18} color="#10B981" strokeWidth={2.5} />, source: 'weight' })}
            >
              <MetricCard label={t('statsPages.weight.evolution')} value={Math.abs(weightData?.changePercent || 0)} unit="%" icon={evoUp ? <TrendingUp size={24} color="#F59E0B" strokeWidth={2.5} /> : <TrendingDown size={24} color="#10B981" strokeWidth={2.5} />} color={evoUp ? '#F59E0B' : '#10B981'} sparklineData={evolutionSparkline} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gridItem}
              activeOpacity={0.7}
              onPress={() => setSelectedMetric({ key: 'average', label: t('statsPages.weight.movingAverage'), color: '#8B5CF6', unit: 'kg', icon: <BarChart3 size={18} color="#8B5CF6" strokeWidth={2.5} />, source: 'weight' })}
            >
              <MetricCard label={t('statsPages.weight.average')} value={weightData?.average || 0} unit="kg" icon={<BarChart3 size={24} color="#8B5CF6" strokeWidth={2.5} />} color="#8B5CF6" sparklineData={averageSparkline} />
            </TouchableOpacity>
          </View>
        </StatsSection>
      )}

      {/* ========== COMPOSITION CORPORELLE · tous les métriques, cliquables ========== */}
      <View style={styles.sectionDivider} />

      {/* Graisse / Muscle / Eau */}
      <StatsSection>
        <MultiLineComparisonCard
          title="Composition corporelle"
          unit="%"
          lines={[
            {
              label: t('statsPages.composition.bodyFat'),
              color: '#F59E0B',
              history: compositionHistory.bodyFat,
              currentValue: fatPercent,
              lowerIsBetter: true,
              onPress: () => setSelectedMetric({ key: 'fat_percent', label: t('statsPages.composition.bodyFat'), color: '#F59E0B', unit: '%', icon: <Flame size={18} color="#F59E0B" strokeWidth={2.5} />, source: 'composition' }),
            },
            {
              label: t('statsPages.composition.muscleMass'),
              color: '#10B981',
              history: compositionHistory.muscle,
              currentValue: musclePercent,
              onPress: () => setSelectedMetric({ key: 'muscle_percent', label: t('statsPages.composition.muscleMass'), color: '#10B981', unit: '%', icon: <Activity size={18} color="#10B981" strokeWidth={2.5} />, source: 'composition' }),
            },
            {
              label: 'Eau',
              color: '#06B6D4',
              history: compositionHistory.water,
              currentValue: waterPercent,
              onPress: () => setSelectedMetric({ key: 'water_percent', label: 'Eau corporelle', color: '#06B6D4', unit: '%', icon: <Droplet size={18} color="#06B6D4" strokeWidth={2.5} />, source: 'composition' }),
            },
          ]}
        />
      </StatsSection>

      {/* Masse osseuse / Graisse viscérale */}
      <StatsSection>
        <DualComparisonCard
          title="Métriques avancées"
          leftLabel={t('statsPages.composition.boneMass')}
          rightLabel={t('statsPages.composition.visceralFat')}
          leftColor="#8B5CF6"
          rightColor="#EF4444"
          leftHistory={compositionAdvancedHistory.bone}
          rightHistory={compositionAdvancedHistory.visceral}
          leftValue={boneMass}
          rightValue={visceralFat}
          unit=""
          leftUnit="kg"
          rightUnit="/20"
          onPressLeft={() => setSelectedMetric({ key: 'bone_mass', label: t('statsPages.composition.boneMass'), color: '#8B5CF6', unit: 'kg', icon: <Bone size={18} color="#8B5CF6" strokeWidth={2.5} />, source: 'composition' })}
          rightLowerIsBetter
          onPressRight={() => setSelectedMetric({ key: 'visceral_fat', label: t('statsPages.composition.visceralFat'), color: '#EF4444', unit: '/20', icon: <Activity size={18} color="#EF4444" strokeWidth={2.5} />, source: 'composition' })}
        />
      </StatsSection>

      {/* BMR / Age métabolique */}
      <StatsSection>
        <DualComparisonCard
          title="Métabolisme"
          leftLabel={t('statsPages.composition.bmr')}
          rightLabel={t('statsPages.composition.metabolicAge')}
          leftColor="#F97316"
          rightColor="#6366F1"
          leftHistory={compositionAdvancedHistory.bmr}
          rightHistory={compositionAdvancedHistory.metabolicAge}
          leftValue={bmrValue}
          rightValue={metabolicAge}
          unit=""
          leftUnit="kcal"
          rightUnit={t('statsPages.composition.years')}
          onPressLeft={() => setSelectedMetric({ key: 'bmr', label: t('statsPages.composition.bmr'), color: '#F97316', unit: 'kcal', icon: <Flame size={18} color="#F97316" strokeWidth={2.5} />, source: 'composition' })}
          rightLowerIsBetter
          onPressRight={() => setSelectedMetric({ key: 'metabolic_age', label: t('statsPages.composition.metabolicAge'), color: '#6366F1', unit: t('statsPages.composition.years'), icon: <Zap size={18} color="#6366F1" strokeWidth={2.5} />, source: 'composition' })}
        />
      </StatsSection>

      {/* ========== SECTION MENSURATIONS ========== */}
      <View style={styles.sectionDivider} />

      {/* Groupe 1: Haut du corps - Cou + Epaules + Poitrine */}
      <StatsSection>
        <MultiLineComparisonCard
          title="Haut du corps"
          unit="cm"
          lines={[
            {
              label: t('statsPages.measurements.neck'),
              color: '#F59E0B',
              history: measurementHistory.neck,
              currentValue: mVal('neck'),
              onPress: () => setSelectedMetric({ key: 'neck', label: t('statsPages.measurements.neck'), color: '#F59E0B', unit: 'cm', icon: <Ruler size={18} color="#F59E0B" strokeWidth={2.5} />, source: 'measurement' }),
            },
            {
              label: t('statsPages.measurements.shoulders'),
              color: '#10B981',
              history: measurementHistory.shoulders,
              currentValue: mVal('shoulders'),
              onPress: () => setSelectedMetric({ key: 'shoulders', label: t('statsPages.measurements.shoulders'), color: '#10B981', unit: 'cm', icon: <Ruler size={18} color="#10B981" strokeWidth={2.5} />, source: 'measurement' }),
            },
            {
              label: t('statsPages.measurements.chest'),
              color: '#3B82F6',
              history: measurementHistory.chest,
              currentValue: mVal('chest'),
              onPress: () => setSelectedMetric({ key: 'chest', label: t('statsPages.measurements.chest'), color: '#3B82F6', unit: 'cm', icon: <Ruler size={18} color="#3B82F6" strokeWidth={2.5} />, source: 'measurement' }),
            },
          ]}
        />
      </StatsSection>

      {/* Groupe 2: Tronc - Nombril + Hanche + Taille */}
      <StatsSection>
        <MultiLineComparisonCard
          title="Tronc"
          unit="cm"
          lines={[
            {
              label: 'Nombril',
              color: '#06B6D4',
              history: measurementHistory.navel,
              currentValue: mVal('navel'),
              lowerIsBetter: true,
              onPress: () => setSelectedMetric({ key: 'navel', label: 'Nombril', color: '#06B6D4', unit: 'cm', icon: <Ruler size={18} color="#06B6D4" strokeWidth={2.5} />, source: 'measurement' }),
            },
            {
              label: t('statsPages.measurements.hips'),
              color: '#8B5CF6',
              history: measurementHistory.hips,
              currentValue: mVal('hips'),
              onPress: () => setSelectedMetric({ key: 'hips', label: t('statsPages.measurements.hips'), color: '#8B5CF6', unit: 'cm', icon: <Ruler size={18} color="#8B5CF6" strokeWidth={2.5} />, source: 'measurement' }),
            },
            {
              label: t('statsPages.measurements.waist'),
              color: '#EF4444',
              history: measurementHistory.waist,
              currentValue: mVal('waist'),
              lowerIsBetter: true,
              onPress: () => setSelectedMetric({ key: 'waist', label: t('statsPages.measurements.waist'), color: '#EF4444', unit: 'cm', icon: <Ruler size={18} color="#EF4444" strokeWidth={2.5} />, source: 'measurement' }),
            },
          ]}
        />
      </StatsSection>

      {/* Groupe 3: Bras - Gauche + Droit */}
      <StatsSection>
        <DualComparisonCard
          title="Bras"
          leftLabel={t('statsPages.measurements.leftArm')}
          rightLabel={t('statsPages.measurements.rightArm')}
          leftColor="#EF4444"
          rightColor="#3B82F6"
          leftHistory={measurementHistory.left_arm}
          rightHistory={measurementHistory.right_arm}
          leftValue={mVal('left_arm')}
          rightValue={mVal('right_arm')}
          unit="cm"
          onPressLeft={() => setSelectedMetric({ key: 'left_arm', label: t('statsPages.measurements.leftArm'), color: '#EF4444', unit: 'cm', icon: <Ruler size={18} color="#EF4444" strokeWidth={2.5} />, source: 'measurement' })}
          onPressRight={() => setSelectedMetric({ key: 'right_arm', label: t('statsPages.measurements.rightArm'), color: '#3B82F6', unit: 'cm', icon: <Ruler size={18} color="#3B82F6" strokeWidth={2.5} />, source: 'measurement' })}
        />
      </StatsSection>

      {/* Groupe 4: Cuisses - Gauche + Droite */}
      <StatsSection>
        <DualComparisonCard
          title="Cuisses"
          leftLabel={t('statsPages.measurements.leftThigh')}
          rightLabel={t('statsPages.measurements.rightThigh')}
          leftColor="#06B6D4"
          rightColor="#8B5CF6"
          leftHistory={measurementHistory.left_thigh}
          rightHistory={measurementHistory.right_thigh}
          leftValue={mVal('left_thigh')}
          rightValue={mVal('right_thigh')}
          unit="cm"
          onPressLeft={() => setSelectedMetric({ key: 'left_thigh', label: t('statsPages.measurements.leftThigh'), color: '#06B6D4', unit: 'cm', icon: <Ruler size={18} color="#06B6D4" strokeWidth={2.5} />, source: 'measurement' })}
          onPressRight={() => setSelectedMetric({ key: 'right_thigh', label: t('statsPages.measurements.rightThigh'), color: '#8B5CF6', unit: 'cm', icon: <Ruler size={18} color="#8B5CF6" strokeWidth={2.5} />, source: 'measurement' })}
        />
      </StatsSection>

      {/* Groupe 5: Mollets - Gauche + Droit */}
      <StatsSection>
        <DualComparisonCard
          title="Mollets"
          leftLabel={t('statsPages.measurements.leftCalf')}
          rightLabel={t('statsPages.measurements.rightCalf')}
          leftColor="#F59E0B"
          rightColor="#10B981"
          leftHistory={measurementHistory.left_calf}
          rightHistory={measurementHistory.right_calf}
          leftValue={mVal('left_calf')}
          rightValue={mVal('right_calf')}
          unit="cm"
          onPressLeft={() => setSelectedMetric({ key: 'left_calf', label: t('statsPages.measurements.leftCalf'), color: '#F59E0B', unit: 'cm', icon: <Ruler size={18} color="#F59E0B" strokeWidth={2.5} />, source: 'measurement' })}
          onPressRight={() => setSelectedMetric({ key: 'right_calf', label: t('statsPages.measurements.rightCalf'), color: '#10B981', unit: 'cm', icon: <Ruler size={18} color="#10B981" strokeWidth={2.5} />, source: 'measurement' })}
        />
      </StatsSection>

      <View style={{ height: 40 }} />

      {/* Modal de detail */}
      {selectedMetric && (
        <StatsDetailModal
          visible={selectedMetric !== null}
          onClose={() => setSelectedMetric(null)}
          title={selectedMetric.label}
          subtitle={t('statsPages.fullEvolution')}
          data={getModalData()}
          color={selectedMetric.color}
          unit={selectedMetric.unit}
          icon={selectedMetric.icon}
          metricKey={selectedMetric.key}
          healthRange={getHealthRangeForModal()}
        />
      )}
      </>)}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 250,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  sectionDivider: {
    height: 1,
    marginHorizontal: 32,
    marginVertical: 8,
    opacity: 0.15,
    backgroundColor: '#888',
  },
  bmiGaugeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  // Titre historique
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    marginBottom: 10,
  },
  historyTitleDash: {
    flex: 1,
    height: 1.5,
    borderRadius: 1,
    opacity: 0.4,
  },
  historyTitleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  // Historique horizontal
  historyScrollContent: {
    paddingHorizontal: 4,
    gap: 10,
  },
  historyCard: {
    width: 100,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    gap: 3,
  },
  historyCardRecent: {
    borderWidth: 2,
  },
  historyCardBadge: {
    backgroundColor: '#3B82F620',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2,
  },
  historyCardBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#3B82F6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyCardDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  historyCardWeight: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  historyCardUnit: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyCardChange: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyCardExtra: {
    fontSize: 10,
    fontWeight: '400',
    marginTop: 1,
  },
});

const corpsBannerStyle = StyleSheet.create({
  btn: { flexDirection:'row', alignItems:'center', gap:12, marginHorizontal:16, marginBottom:8, padding:14, borderRadius:16, borderWidth:1 },
  icon: { width:38, height:38, borderRadius:11, justifyContent:'center', alignItems:'center' },
  title: { fontSize:14, fontWeight:'700' },
  sub: { fontSize:11, marginTop:1 },
});
