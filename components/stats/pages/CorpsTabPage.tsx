// ============================================
// CORPS TAB PAGE - Poids + Composition + Mensurations
// Fusion des 3 anciens onglets en un seul scroll
// ============================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, RefreshControl, InteractionManager } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { ScrollableLineChart } from '../charts/ScrollableLineChart';
import { WeightChartCard } from '../charts/WeightChartCard';
import { DualComparisonCard } from '../charts/DualComparisonCard';
import { MultiLineComparisonCard } from '../charts/MultiLineComparisonCard';
import { StatsDetailModal } from '../StatsDetailModal';
import { StatsExplanation } from '../StatsExplanation';
import { aggregateWeightData } from '@/lib/statsAggregation';
import { getProfile, getAllWeights, getLatestWeight, getLatestMeasurement, getMeasurements } from '@/lib/database';
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
import { Scale, Target, TrendingUp, TrendingDown, BarChart3, Activity, Droplet, Bone, Zap, Flame, Ruler } from 'lucide-react-native';
import Svg, { Path, Circle as SvgCircle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '@/lib/security/logger';

export const CorpsTabPage: React.FC = React.memo(() => {
  const { colors, screenBackground } = useTheme();
  const { t } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const dateLocale = fr;
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Poids state ---
  const [weightData, setWeightData] = useState<any>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [allWeightsData, setAllWeightsData] = useState<any[]>([]);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);

  // --- Composition state ---
  const [latestWeight, setLatestWeight] = useState<any>(null);
  const [compositionHistory, setCompositionHistory] = useState<{
    bodyFat: any[];
    muscle: any[];
    water: any[];
  }>({ bodyFat: [], muscle: [], water: [] });

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

  // BMI traduit
  const translatedBMIZones = BMI_RANGES.zones.map(zone => ({
    ...zone,
    label: zone.label === 'Sous-poids' ? t('stats.bmiUnderweight') :
           zone.label === 'Normal' ? t('stats.bmiNormal') :
           zone.label === 'Surpoids' ? t('stats.bmiOverweight') :
           zone.label === 'Obésité' ? t('stats.bmiObese') : zone.label
  }));
  const translatedBMIRanges = { ...BMI_RANGES, zones: translatedBMIZones };

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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadData(); } finally { setRefreshing(false); }
  }, [selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, profile, allWeights, settings, latest, allMeasurements] = await Promise.all([
        aggregateWeightData(selectedPeriod),
        getProfile(),
        getAllWeights(),
        getUserSettings(),
        getLatestWeight(),
        getMeasurements(),
      ]);

      // --- User profile ---
      if (settings?.gender) setUserGender(settings.gender as 'male' | 'female');
      if (settings?.weight_goal) {
        setTargetWeight(settings.weight_goal);
      }

      // --- Poids ---
      setWeightData(data);
      if (allWeights?.length > 0) setAllWeightsData(allWeights);
      if (data?.values != null && data.values.length > 0 && profile?.height_cm) {
        const latestW = data!.values[data!.values.length - 1].value;
        const heightM = profile.height_cm / 100;
        setBmi(latestW / (heightM * heightM));
        setHeightCm(profile.height_cm);
      }

      // Period filter
      const now = new Date();
      const daysMap: { [key: string]: number } = { '7j': 7, '30j': 30, '90j': 90, '6m': 180, '1a': 365, '2a': 730, 'tout': 3650 };
      const days = daysMap[selectedPeriod] || 30;
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      if (allWeights?.length > 0) {
        const filtered = allWeights.filter((w: any) => new Date(w.date) >= cutoffDate).reverse();
        setWeightHistory(filtered.map((w: any) => ({ date: w.date, value: w.weight })));
        if (profile?.height_cm) {
          const heightM = profile.height_cm / 100;
        }
      }

      // --- Composition ---
      setLatestWeight(latest);
      if (allWeights?.length > 0) {
        const filtered = allWeights.filter((w: any) => new Date(w.date) >= cutoffDate);
        setCompositionHistory({
          bodyFat: filtered.filter((w: any) => w.fat_percent > 0).map((w: any) => ({ date: w.date, value: w.fat_percent })).reverse(),
          muscle: filtered.filter((w: any) => w.muscle_percent > 0).map((w: any) => ({ date: w.date, value: w.muscle_percent })).reverse(),
          water: filtered.filter((w: any) => w.water_percent > 0).map((w: any) => ({ date: w.date, value: w.water_percent })).reverse(),
        });
      }

      // --- Mensurations ---
      const measurement = allMeasurements?.[0] || null;
      setLatestMeasurement(measurement);
      if (allMeasurements?.length > 0) {
        setAllMeasurementsData(allMeasurements);
        const filteredM = allMeasurements.filter((m: any) => new Date(m.date) >= cutoffDate).reverse();
        const fields = ['chest', 'waist', 'navel', 'hips', 'shoulders', 'left_arm', 'right_arm', 'left_thigh', 'right_thigh', 'left_calf', 'right_calf', 'neck'];
        const history: any = {};
        fields.forEach(field => {
          history[field] = filteredM.filter((m: any) => m[field] && m[field] > 0).map((m: any) => ({ date: m.date, value: m[field] }));
        });
        setMeasurementHistory(history);
      }
    } catch (error) {
      logger.error('Error loading corps data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Memoized sparkline data for evolution/average cards
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

  // Memoized composition sparklines
  const boneSparkline = useMemo(() => allWeightsData.filter(w => w.bone_mass > 0).map(w => ({ value: w.bone_mass })), [allWeightsData]);
  const visceralSparkline = useMemo(() => allWeightsData.filter(w => w.visceral_fat > 0).map(w => ({ value: w.visceral_fat })), [allWeightsData]);
  const bmrSparkline = useMemo(() => allWeightsData.filter(w => w.bmr > 0).map(w => ({ value: w.bmr })), [allWeightsData]);
  const metabolicAgeSparkline = useMemo(() => allWeightsData.filter(w => w.metabolic_age > 0).map(w => ({ value: w.metabolic_age })), [allWeightsData]);

  // --- Modal data (memoized) ---
  const getModalData = useCallback(() => {
    if (!selectedMetric) return [];

    if (selectedMetric.source === 'weight') {
      const sorted = [...allWeightsData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      switch (selectedMetric.key) {
        case 'weight': return sorted.map(w => ({ value: w.weight, label: format(new Date(w.date), 'd MMM', { locale: dateLocale }), date: w.date }));
        case 'bmi': if (!heightCm) return []; const hM = heightCm / 100; return sorted.map(w => ({ value: w.weight / (hM * hM), label: format(new Date(w.date), 'd MMM', { locale: dateLocale }), date: w.date }));
        case 'evolution': const first = sorted[0]?.weight || 0; return sorted.map(w => ({ value: first ? ((w.weight - first) / first) * 100 : 0, label: format(new Date(w.date), 'd MMM', { locale: dateLocale }), date: w.date }));
        case 'average': return sorted.map((w, i) => { const start = Math.max(0, i - 6); const slice = sorted.slice(start, i + 1); const avg = slice.reduce((s, x) => s + x.weight, 0) / slice.length; return { value: avg, label: format(new Date(w.date), 'd MMM', { locale: dateLocale }), date: w.date }; });
        case 'target': return sorted.map(w => ({ value: w.weight, label: format(new Date(w.date), 'd MMM', { locale: dateLocale }), date: w.date }));
        default: return [];
      }
    }

    if (selectedMetric.source === 'composition') {
      const sorted = [...allWeightsData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return sorted.filter(w => w[selectedMetric.key] > 0).map(w => ({ value: w[selectedMetric.key], label: format(new Date(w.date), 'd MMM', { locale: dateLocale }), date: w.date }));
    }

    if (selectedMetric.source === 'measurement') {
      const sorted = [...allMeasurementsData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return sorted.filter(m => m[selectedMetric.key] && m[selectedMetric.key] > 0).map(m => ({ value: m[selectedMetric.key], label: format(new Date(m.date), 'd MMM', { locale: dateLocale }), date: m.date }));
    }

    return [];
  }, [selectedMetric, allWeightsData, allMeasurementsData, heightCm, dateLocale]);

  // --- Ranges ---
  const bodyFatRange = getBodyFatRange(userGender);
  const muscleMassRange = getMuscleMassRange(userGender);
  const boneMassRange = getBoneMassRange(userGender);

  const currentWeight = weightData?.values?.[weightData.values.length - 1]?.value || 0;
  const bmiStatus = bmi ? getMetricStatus(bmi, translatedBMIRanges) : null;
  const fatPercent = latestWeight?.fat_percent || 0;
  const musclePercent = latestWeight?.muscle_percent || 0;
  const waterPercent = latestWeight?.water_percent || 0;
  const fatStatus = fatPercent > 0 ? getMetricStatus(fatPercent, bodyFatRange) : null;
  const muscleStatus = musclePercent > 0 ? getMetricStatus(musclePercent, muscleMassRange) : null;
  const hasCompositionData = latestWeight && (fatPercent > 0 || musclePercent > 0 || waterPercent > 0);

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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: screenBackground }]}>
        <StatsHeader
          title={t('statsPages.weight.title')}
          description="Poids, composition et mensurations"
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

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
      {/* ========== SECTION POIDS ========== */}
      <StatsHeader
        title={t('statsPages.weight.title')}
        description="Poids, composition et mensurations"
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <StatsExplanation
        title="Poids & IMC"
        text="Le Poids est ton indicateur de masse globale. L'IMC (Indice de Masse Corporelle) permet de situer ton poids par rapport à ta taille."
        color="#3B82F6"
      />

      <WeightChartCard
        data={weightData?.values || []}
        color="#3B82F6"
        unit=" kg"
        title={t('statsPages.weight.weightEvolution')}
      />

      <StatsSection
        title={t('statsPages.weight.keyMetrics')}
        description={t('statsPages.clickToSeeHistory')}
      >
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({ key: 'weight', label: t('statsPages.weight.currentWeight'), color: '#3B82F6', unit: 'kg', icon: <Scale size={18} color="#3B82F6" strokeWidth={2.5} />, source: 'weight' })}
          >
            <MetricCard label={t('statsPages.weight.currentWeight')} value={currentWeight || 0} unit="kg" icon={<Scale size={24} color="#3B82F6" strokeWidth={2.5} />} color="#3B82F6" trend={weightData?.trend} change={weightData ? `${weightData.changePercent >= 0 ? '+' : ''}${Number.isInteger(weightData.changePercent) ? weightData.changePercent : weightData.changePercent.toFixed(1)}%` : undefined} sparklineData={weightHistory.map(h => ({ value: h.value }))} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({ key: 'target', label: t('statsPages.weight.target'), color: '#10B981', unit: 'kg', icon: <Target size={18} color="#10B981" strokeWidth={2.5} />, source: 'weight' })}
          >
            <MetricCard label={t('statsPages.weight.target')} value={targetWeight ?? 0} unit="kg" icon={<Target size={24} color="#10B981" strokeWidth={2.5} />} color="#10B981" sparklineData={[]} />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {bmi != null && bmi > 0 && (
        <StatsSection
          title={t('statsPages.weight.bmiTitle')}
          description={t('statsPages.weight.bmiDesc')}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedMetric({ key: 'bmi', label: t('stats.bmi'), color: bmiStatus?.color || '#6366F1', unit: '', icon: <Scale size={18} color={bmiStatus?.color || '#6366F1'} strokeWidth={2.5} />, source: 'weight' })}
            style={[styles.bmiGaugeCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
          >
            {(() => {
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
                    {bmi.toFixed(1)}
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
        </StatsSection>
      )}

      <StatsSection
        title={t('statsPages.weight.statistics')}
        description={t('statsPages.clickToSeeHistory')}
      >
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({ key: 'evolution', label: t('statsPages.weight.evolution'), color: weightData?.trend === 'up' ? '#F59E0B' : '#10B981', unit: '%', icon: weightData?.trend === 'up' ? <TrendingUp size={18} color="#F59E0B" strokeWidth={2.5} /> : <TrendingDown size={18} color="#10B981" strokeWidth={2.5} />, source: 'weight' })}
          >
            <MetricCard label={t('statsPages.weight.evolution')} value={Math.abs(weightData?.changePercent || 0)} unit="%" icon={weightData?.trend === 'up' ? <TrendingUp size={24} color="#F59E0B" strokeWidth={2.5} /> : <TrendingDown size={24} color="#10B981" strokeWidth={2.5} />} color={weightData?.trend === 'up' ? '#F59E0B' : '#10B981'} trend={weightData?.trend} sparklineData={evolutionSparkline} />
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

      {/* ========== SECTION COMPOSITION ========== */}
      <View style={styles.sectionDivider} />

      <StatsExplanation
        title="Composition Corporelle"
        text={"La Composition analyse la qualit\u00E9 de ton poids. Le taux de Graisse indique tes r\u00E9serves d'\u00E9nergie, la Masse Musculaire refl\u00E8te ta force."}
        color="#F59E0B"
      />

      {/* Graisse vs Muscle - DualComparisonCard */}
      {(fatPercent > 0 || musclePercent > 0) && (
        <StatsSection
          title={t('statsPages.composition.globalComposition')}
          description={t('statsPages.composition.globalCompositionDesc')}
        >
          <DualComparisonCard
            title="Graisse vs Muscle"
            leftLabel={t('statsPages.composition.bodyFat')}
            rightLabel={t('statsPages.composition.muscle')}
            leftColor="#F59E0B"
            rightColor="#10B981"
            leftHistory={compositionHistory.bodyFat}
            rightHistory={compositionHistory.muscle}
            leftValue={fatPercent}
            rightValue={musclePercent}
            unit="%"
            onPressLeft={() => setSelectedMetric({ key: 'fat_percent', label: t('statsPages.composition.bodyFat'), color: '#F59E0B', unit: '%', icon: <Activity size={18} color="#F59E0B" strokeWidth={2.5} />, source: 'composition' })}
            onPressRight={() => setSelectedMetric({ key: 'muscle_percent', label: t('statsPages.composition.muscleMass'), color: '#10B981', unit: '%', icon: <Activity size={18} color="#10B981" strokeWidth={2.5} />, source: 'composition' })}
          />
        </StatsSection>
      )}

      {/* ========== SECTION EAU (Hydratation corporelle Tanita) ========== */}
      {(waterPercent > 0 || compositionHistory.water.length > 0) && (
        <>
          <View style={styles.sectionDivider} />
          <StatsExplanation
            title="Eau Corporelle"
            text="L'Eau Corporelle mesure le pourcentage d'eau total dans ton corps. Une bonne hydratation est essentielle pour la performance et la recuperation. Donnees issues de ta balance connectee Tanita."
            color="#06B6D4"
          />
          <StatsSection title="Eau" description="Evolution de ton taux d'eau corporel">
            <ScrollableLineChart
              data={compositionHistory.water}
              color="#06B6D4"
              unit=" %"
              height={220}
            />
          </StatsSection>
          <StatsSection title="Hydratation actuelle" description="Clique pour voir l'historique complet">
            <View style={styles.grid}>
              <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'water_percent', label: 'Eau corporelle', color: '#06B6D4', unit: '%', icon: <Droplet size={18} color="#06B6D4" strokeWidth={2.5} />, source: 'composition' })}>
                <MetricCard label="Eau corporelle" value={waterPercent} unit="%" icon={<Droplet size={24} color="#06B6D4" strokeWidth={2.5} />} color="#06B6D4" sparklineData={compositionHistory.water} />
              </TouchableOpacity>
            </View>
          </StatsSection>
        </>
      )}

      <StatsSection title={t('statsPages.composition.detailedMetrics')} description={t('statsPages.clickToSeeHistory')}>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'bone_mass', label: t('statsPages.composition.boneMass'), color: '#8B5CF6', unit: 'kg', icon: <Bone size={18} color="#8B5CF6" strokeWidth={2.5} />, source: 'composition' })}>
            <MetricCard label={t('statsPages.composition.boneMass')} value={latestWeight?.bone_mass || 0} unit="kg" icon={<Bone size={24} color="#8B5CF6" strokeWidth={2.5} />} color="#8B5CF6" sparklineData={boneSparkline} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'visceral_fat', label: t('statsPages.composition.visceralFat'), color: '#EF4444', unit: '/20', icon: <Activity size={18} color="#EF4444" strokeWidth={2.5} />, source: 'composition' })}>
            <MetricCard label={t('statsPages.composition.visceralFat')} value={latestWeight?.visceral_fat || 0} unit="/20" icon={<Activity size={24} color="#EF4444" strokeWidth={2.5} />} color="#EF4444" sparklineData={visceralSparkline} />
          </TouchableOpacity>
        </View>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'bmr', label: t('statsPages.composition.bmr'), color: '#F97316', unit: 'kcal', icon: <Flame size={18} color="#F97316" strokeWidth={2.5} />, source: 'composition' })}>
            <MetricCard label={t('statsPages.composition.bmr')} value={latestWeight?.bmr || 0} unit="kcal" icon={<Flame size={24} color="#F97316" strokeWidth={2.5} />} color="#F97316" sparklineData={bmrSparkline} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'metabolic_age', label: t('statsPages.composition.metabolicAge'), color: '#6366F1', unit: t('statsPages.composition.years'), icon: <Zap size={18} color="#6366F1" strokeWidth={2.5} />, source: 'composition' })}>
            <MetricCard label={t('statsPages.composition.metabolicAge')} value={latestWeight?.metabolic_age || 0} unit={t('statsPages.composition.years')} icon={<Zap size={24} color="#6366F1" strokeWidth={2.5} />} color="#6366F1" sparklineData={metabolicAgeSparkline} />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {/* ========== SECTION MENSURATIONS ========== */}
      <View style={styles.sectionDivider} />

      <StatsExplanation
        title="Mensurations"
        text="Suis l'evolution de tes mensurations. Les courbes sont regroupees par zone corporelle. Utilise les filtres pour isoler chaque mesure."
        color="#8B5CF6"
      />

      {/* Groupe 1: Haut du corps - Cou + Epaules + Poitrine */}
      <StatsSection title="Haut du corps" description="Cou, epaules et poitrine">
        <MultiLineComparisonCard
          title="Cou / Epaules / Poitrine"
          unit="cm"
          lines={[
            {
              label: t('statsPages.measurements.neck'),
              color: '#F59E0B',
              history: measurementHistory.neck,
              currentValue: latestMeasurement?.neck || 0,
              onPress: () => setSelectedMetric({ key: 'neck', label: t('statsPages.measurements.neck'), color: '#F59E0B', unit: 'cm', icon: <Ruler size={18} color="#F59E0B" strokeWidth={2.5} />, source: 'measurement' }),
            },
            {
              label: t('statsPages.measurements.shoulders'),
              color: '#10B981',
              history: measurementHistory.shoulders,
              currentValue: latestMeasurement?.shoulders || 0,
              onPress: () => setSelectedMetric({ key: 'shoulders', label: t('statsPages.measurements.shoulders'), color: '#10B981', unit: 'cm', icon: <Ruler size={18} color="#10B981" strokeWidth={2.5} />, source: 'measurement' }),
            },
            {
              label: t('statsPages.measurements.chest'),
              color: '#3B82F6',
              history: measurementHistory.chest,
              currentValue: latestMeasurement?.chest || 0,
              onPress: () => setSelectedMetric({ key: 'chest', label: t('statsPages.measurements.chest'), color: '#3B82F6', unit: 'cm', icon: <Ruler size={18} color="#3B82F6" strokeWidth={2.5} />, source: 'measurement' }),
            },
          ]}
        />
      </StatsSection>

      {/* Groupe 2: Tronc - Nombril + Hanche + Taille */}
      <StatsSection title="Tronc" description="Nombril, hanches et taille">
        <MultiLineComparisonCard
          title="Nombril / Hanches / Taille"
          unit="cm"
          lines={[
            {
              label: 'Nombril',
              color: '#F97316',
              history: measurementHistory.navel,
              currentValue: latestMeasurement?.navel || 0,
              onPress: () => setSelectedMetric({ key: 'navel', label: 'Nombril', color: '#F97316', unit: 'cm', icon: <Ruler size={18} color="#F97316" strokeWidth={2.5} />, source: 'measurement' }),
            },
            {
              label: t('statsPages.measurements.hips'),
              color: '#8B5CF6',
              history: measurementHistory.hips,
              currentValue: latestMeasurement?.hips || 0,
              onPress: () => setSelectedMetric({ key: 'hips', label: t('statsPages.measurements.hips'), color: '#8B5CF6', unit: 'cm', icon: <Ruler size={18} color="#8B5CF6" strokeWidth={2.5} />, source: 'measurement' }),
            },
            {
              label: t('statsPages.measurements.waist'),
              color: '#EF4444',
              history: measurementHistory.waist,
              currentValue: latestMeasurement?.waist || 0,
              onPress: () => setSelectedMetric({ key: 'waist', label: t('statsPages.measurements.waist'), color: '#EF4444', unit: 'cm', icon: <Ruler size={18} color="#EF4444" strokeWidth={2.5} />, source: 'measurement' }),
            },
          ]}
        />
      </StatsSection>

      {/* Groupe 3: Bras - Gauche + Droit */}
      <StatsSection title={t('statsPages.measurements.arms')} description={t('statsPages.measurements.bicepsLeftRight')}>
        <DualComparisonCard
          title={t('statsPages.measurements.arms')}
          leftLabel={t('statsPages.measurements.leftArm')}
          rightLabel={t('statsPages.measurements.rightArm')}
          leftColor="#EF4444"
          rightColor="#3B82F6"
          leftHistory={measurementHistory.left_arm}
          rightHistory={measurementHistory.right_arm}
          leftValue={latestMeasurement?.left_arm || 0}
          rightValue={latestMeasurement?.right_arm || 0}
          unit="cm"
          onPressLeft={() => setSelectedMetric({ key: 'left_arm', label: t('statsPages.measurements.leftArm'), color: '#EF4444', unit: 'cm', icon: <Ruler size={18} color="#EF4444" strokeWidth={2.5} />, source: 'measurement' })}
          onPressRight={() => setSelectedMetric({ key: 'right_arm', label: t('statsPages.measurements.rightArm'), color: '#3B82F6', unit: 'cm', icon: <Ruler size={18} color="#3B82F6" strokeWidth={2.5} />, source: 'measurement' })}
        />
      </StatsSection>

      {/* Groupe 4: Cuisses - Gauche + Droite */}
      <StatsSection title={t('statsPages.measurements.legs')} description="Cuisse gauche et droite">
        <DualComparisonCard
          title="Cuisses"
          leftLabel={t('statsPages.measurements.leftThigh')}
          rightLabel={t('statsPages.measurements.rightThigh')}
          leftColor="#06B6D4"
          rightColor="#8B5CF6"
          leftHistory={measurementHistory.left_thigh}
          rightHistory={measurementHistory.right_thigh}
          leftValue={latestMeasurement?.left_thigh || 0}
          rightValue={latestMeasurement?.right_thigh || 0}
          unit="cm"
          onPressLeft={() => setSelectedMetric({ key: 'left_thigh', label: t('statsPages.measurements.leftThigh'), color: '#06B6D4', unit: 'cm', icon: <Ruler size={18} color="#06B6D4" strokeWidth={2.5} />, source: 'measurement' })}
          onPressRight={() => setSelectedMetric({ key: 'right_thigh', label: t('statsPages.measurements.rightThigh'), color: '#8B5CF6', unit: 'cm', icon: <Ruler size={18} color="#8B5CF6" strokeWidth={2.5} />, source: 'measurement' })}
        />
      </StatsSection>

      {/* Groupe 5: Mollets - Gauche + Droit */}
      <StatsSection title={t('statsPages.measurements.calves') || 'Mollets'} description="Mollet gauche et droit">
        <DualComparisonCard
          title="Mollets"
          leftLabel={t('statsPages.measurements.leftCalf')}
          rightLabel={t('statsPages.measurements.rightCalf')}
          leftColor="#F59E0B"
          rightColor="#10B981"
          leftHistory={measurementHistory.left_calf}
          rightHistory={measurementHistory.right_calf}
          leftValue={latestMeasurement?.left_calf || 0}
          rightValue={latestMeasurement?.right_calf || 0}
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
});
