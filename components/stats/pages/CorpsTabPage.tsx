// ============================================
// CORPS TAB PAGE - Poids + Composition + Mensurations
// Fusion des 3 anciens onglets en un seul scroll
// ============================================

import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { ScrollableLineChart } from '../charts/ScrollableLineChart';
import { MetricProgressGrid } from '../charts/MetricProgressGrid';
import { SimpleMetricCard } from '../charts/SimpleMetricCard';
import { SimpleCompositionCard } from '../charts/SimpleCompositionCard';
import { DualComparisonCard } from '../charts/DualComparisonCard';
import { StatsDetailModal } from '../StatsDetailModal';
import { StatsExplanation } from '../StatsExplanation';
import { aggregateWeightData } from '@/lib/statsAggregation';
import { getProfile, getAllWeights, getLatestWeight, getLatestMeasurement, getMeasurements } from '@/lib/database';
import { getUserSettings } from '@/lib/storage';
import {
  BMI_RANGES,
  BODY_FAT_RANGES_MALE,
  BODY_FAT_RANGES_FEMALE,
  MUSCLE_MASS_RANGES_MALE,
  MUSCLE_MASS_RANGES_FEMALE,
  WATER_PERCENTAGE_RANGES,
  VISCERAL_FAT_RANGES,
  getBMRRange,
  getMetricStatus,
  getBodyFatRange,
  getMuscleMassRange,
  getBoneMassRange,
  getWaistCircumferenceRange,
} from '@/lib/healthRanges';
import { Scale, Target, TrendingUp, TrendingDown, BarChart3, Activity, Droplet, Bone, Zap, Flame, Ruler } from 'lucide-react-native';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { logger } from '@/lib/security/logger';

export const CorpsTabPage: React.FC = React.memo(() => {
  const { colors, screenBackground } = useTheme();
  const { t, language } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const dateLocale = language === 'fr' ? fr : enUS;
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const [loading, setLoading] = useState(true);

  // --- Poids state ---
  const [weightData, setWeightData] = useState<any>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [bmiHistory, setBmiHistory] = useState<any[]>([]);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [userGoal, setUserGoal] = useState<'lose' | 'maintain' | 'gain'>('lose');
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
  const [userWeight, setUserWeight] = useState(75);
  const [userHeight, setUserHeight] = useState(175);
  const [userAge, setUserAge] = useState(30);

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

  useEffect(() => {
    loadData();
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
        setUserWeight(settings.weight_goal);
      }
      if (profile?.height_cm) setUserHeight(profile.height_cm);
      if (profile?.birth_date) {
        const age = new Date().getFullYear() - new Date(profile.birth_date).getFullYear();
        setUserAge(age);
      }
      if (settings?.goal) {
        if (settings.goal === 'lose' || settings.goal === 'lose_weight') setUserGoal('lose');
        else if (settings.goal === 'gain' || settings.goal === 'gain_muscle') setUserGoal('gain');
        else setUserGoal('maintain');
      }

      // --- Poids ---
      setWeightData(data);
      if (allWeights?.length > 0) setAllWeightsData(allWeights);
      if (data?.values?.length > 0 && profile?.height_cm) {
        const latestW = data.values[data.values.length - 1].value;
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
          setBmiHistory(filtered.map((w: any) => ({ date: w.date, value: w.weight / (heightM * heightM) })));
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

  // --- Modal data ---
  const getModalData = () => {
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
  };

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

      <StatsSection
        title={t('statsPages.weight.weightEvolution')}
        description={t('statsPages.weight.weightEvolutionDesc')}
      >
        <ScrollableLineChart
          data={weightData?.values || []}
          color="#3B82F6"
          unit=" kg"
          height={220}
        />
      </StatsSection>

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
            <MetricCard label={t('statsPages.weight.currentWeight')} value={currentWeight || 0} unit="kg" icon={<Scale size={24} color="#3B82F6" strokeWidth={2.5} />} color="#3B82F6" trend={weightData?.trend} change={weightData ? `${weightData.changePercent >= 0 ? '+' : ''}${weightData.changePercent.toFixed(1)}%` : undefined} sparklineData={weightHistory.map(h => ({ value: h.value }))} />
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

      {bmi && (
        <StatsSection
          title={t('statsPages.weight.bmiTitle')}
          description={t('statsPages.weight.bmiDesc')}
        >
          <SimpleMetricCard
            value={bmi}
            min={translatedBMIRanges.min}
            max={translatedBMIRanges.max}
            zones={translatedBMIRanges.zones}
            unit=""
            title={t('stats.bmi')}
            source={translatedBMIRanges.source}
            sourceUrl={translatedBMIRanges.sourceUrl}
            onPress={() => setSelectedMetric({ key: 'bmi', label: t('stats.bmi'), color: bmiStatus?.color || '#6366F1', unit: '', icon: <Scale size={18} color={bmiStatus?.color || '#6366F1'} strokeWidth={2.5} />, source: 'weight' })}
          />
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
            <MetricCard label={t('statsPages.weight.evolution')} value={Math.abs(weightData?.changePercent || 0).toFixed(1)} unit="%" icon={weightData?.trend === 'up' ? <TrendingUp size={24} color="#F59E0B" strokeWidth={2.5} /> : <TrendingDown size={24} color="#10B981" strokeWidth={2.5} />} color={weightData?.trend === 'up' ? '#F59E0B' : '#10B981'} trend={weightData?.trend} sparklineData={weightHistory.length >= 2 ? (() => { const first = weightHistory[0]?.value || 1; return weightHistory.map(h => ({ value: ((h.value - first) / first) * 100 })); })() : []} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({ key: 'average', label: t('statsPages.weight.movingAverage'), color: '#8B5CF6', unit: 'kg', icon: <BarChart3 size={18} color="#8B5CF6" strokeWidth={2.5} />, source: 'weight' })}
          >
            <MetricCard label={t('statsPages.weight.average')} value={weightData?.average?.toFixed(1) || 0} unit="kg" icon={<BarChart3 size={24} color="#8B5CF6" strokeWidth={2.5} />} color="#8B5CF6" sparklineData={weightHistory.length >= 2 ? weightHistory.map((h, i, arr) => { const start = Math.max(0, i - 6); const slice = arr.slice(start, i + 1); return { value: slice.reduce((s, x) => s + x.value, 0) / slice.length }; }) : []} />
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

      {hasCompositionData && (
        <StatsSection
          title={t('statsPages.composition.globalComposition')}
          description={t('statsPages.composition.globalCompositionDesc')}
        >
          <SimpleCompositionCard
            fatPercent={fatPercent}
            musclePercent={musclePercent}
            waterPercent={waterPercent}
            fatLabel={t('statsPages.composition.bodyFat')}
            muscleLabel={t('statsPages.composition.muscle')}
            waterLabel={t('statsPages.composition.water')}
          />
        </StatsSection>
      )}

      {fatPercent > 0 && (
        <StatsSection title={t('statsPages.composition.bodyFat')} description={t('statsPages.composition.bodyFatDesc')}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedMetric({ key: 'fat_percent', label: t('statsPages.composition.bodyFat'), color: fatStatus?.color || '#F59E0B', unit: '%', icon: <Activity size={18} color={fatStatus?.color || '#F59E0B'} strokeWidth={2.5} />, source: 'composition' })}>
            <SimpleMetricCard value={fatPercent} unit={bodyFatRange.unit} title={t('statsPages.composition.bodyFat')} zones={bodyFatRange.zones} min={bodyFatRange.min} max={bodyFatRange.max} source={bodyFatRange.source} sourceUrl={bodyFatRange.sourceUrl} />
          </TouchableOpacity>
        </StatsSection>
      )}

      {musclePercent > 0 && (
        <StatsSection title={t('statsPages.composition.muscleMass')} description={t('statsPages.composition.muscleMassDesc')}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedMetric({ key: 'muscle_percent', label: t('statsPages.composition.muscleMass'), color: muscleStatus?.color || '#10B981', unit: '%', icon: <Activity size={18} color={muscleStatus?.color || '#10B981'} strokeWidth={2.5} />, source: 'composition' })}>
            <SimpleMetricCard value={musclePercent} unit={muscleMassRange.unit} title={t('statsPages.composition.muscleMass')} zones={muscleMassRange.zones} min={muscleMassRange.min} max={muscleMassRange.max} source={muscleMassRange.source} sourceUrl={muscleMassRange.sourceUrl} />
          </TouchableOpacity>
        </StatsSection>
      )}

      {waterPercent > 0 && (
        <StatsSection title={t('statsPages.composition.hydration')} description={t('statsPages.composition.hydrationDesc')}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedMetric({ key: 'water_percent', label: t('statsPages.composition.hydration'), color: '#06B6D4', unit: '%', icon: <Droplet size={18} color="#06B6D4" strokeWidth={2.5} />, source: 'composition' })}>
            <SimpleMetricCard value={waterPercent} unit={WATER_PERCENTAGE_RANGES.unit} title={t('statsPages.composition.hydration')} zones={WATER_PERCENTAGE_RANGES.zones} min={WATER_PERCENTAGE_RANGES.min} max={WATER_PERCENTAGE_RANGES.max} source={WATER_PERCENTAGE_RANGES.source} sourceUrl={WATER_PERCENTAGE_RANGES.sourceUrl} />
          </TouchableOpacity>
        </StatsSection>
      )}

      <StatsSection title={t('statsPages.composition.detailedMetrics')} description={t('statsPages.clickToSeeHistory')}>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'bone_mass', label: t('statsPages.composition.boneMass'), color: '#8B5CF6', unit: 'kg', icon: <Bone size={18} color="#8B5CF6" strokeWidth={2.5} />, source: 'composition' })}>
            <MetricCard label={t('statsPages.composition.boneMass')} value={latestWeight?.bone_mass?.toFixed(1) || '0.0'} unit="kg" icon={<Bone size={24} color="#8B5CF6" strokeWidth={2.5} />} color="#8B5CF6" sparklineData={allWeightsData.filter(w => w.bone_mass > 0).map(w => ({ value: w.bone_mass }))} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'visceral_fat', label: t('statsPages.composition.visceralFat'), color: '#EF4444', unit: '/20', icon: <Activity size={18} color="#EF4444" strokeWidth={2.5} />, source: 'composition' })}>
            <MetricCard label={t('statsPages.composition.visceralFat')} value={latestWeight?.visceral_fat || 0} unit="/20" icon={<Activity size={24} color="#EF4444" strokeWidth={2.5} />} color="#EF4444" sparklineData={allWeightsData.filter(w => w.visceral_fat > 0).map(w => ({ value: w.visceral_fat }))} />
          </TouchableOpacity>
        </View>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'bmr', label: t('statsPages.composition.bmr'), color: '#F97316', unit: 'kcal', icon: <Flame size={18} color="#F97316" strokeWidth={2.5} />, source: 'composition' })}>
            <MetricCard label={t('statsPages.composition.bmr')} value={latestWeight?.bmr || 0} unit="kcal" icon={<Flame size={24} color="#F97316" strokeWidth={2.5} />} color="#F97316" sparklineData={allWeightsData.filter(w => w.bmr > 0).map(w => ({ value: w.bmr }))} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'metabolic_age', label: t('statsPages.composition.metabolicAge'), color: '#6366F1', unit: t('statsPages.composition.years'), icon: <Zap size={18} color="#6366F1" strokeWidth={2.5} />, source: 'composition' })}>
            <MetricCard label={t('statsPages.composition.metabolicAge')} value={latestWeight?.metabolic_age || 0} unit={t('statsPages.composition.years')} icon={<Zap size={24} color="#6366F1" strokeWidth={2.5} />} color="#6366F1" sparklineData={allWeightsData.filter(w => w.metabolic_age > 0).map(w => ({ value: w.metabolic_age }))} />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {/* ========== SECTION MENSURATIONS ========== */}
      <View style={styles.sectionDivider} />

      <StatsSection title={t('statsPages.measurements.torso')} description={t('statsPages.clickToSeeChart')}>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} onPress={() => setSelectedMetric({ key: 'chest', label: t('statsPages.measurements.chest'), color: '#3B82F6', unit: 'cm', icon: <Ruler size={18} color="#3B82F6" strokeWidth={2.5} />, source: 'measurement' })} activeOpacity={0.7}>
            <MetricCard label={t('statsPages.measurements.chest')} value={latestMeasurement?.chest || 0} unit="cm" icon={<Ruler size={24} color="#3B82F6" strokeWidth={2.5} />} color="#3B82F6" sparklineData={measurementHistory.chest} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => setSelectedMetric({ key: 'waist', label: t('statsPages.measurements.waist'), color: '#F59E0B', unit: 'cm', icon: <Ruler size={18} color="#F59E0B" strokeWidth={2.5} />, source: 'measurement' })} activeOpacity={0.7}>
            <MetricCard label={t('statsPages.measurements.waist')} value={latestMeasurement?.waist || 0} unit="cm" icon={<Ruler size={24} color="#F59E0B" strokeWidth={2.5} />} color="#F59E0B" sparklineData={measurementHistory.waist} />
          </TouchableOpacity>
        </View>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} onPress={() => setSelectedMetric({ key: 'hips', label: t('statsPages.measurements.hips'), color: '#8B5CF6', unit: 'cm', icon: <Ruler size={18} color="#8B5CF6" strokeWidth={2.5} />, source: 'measurement' })} activeOpacity={0.7}>
            <MetricCard label={t('statsPages.measurements.hips')} value={latestMeasurement?.hips || 0} unit="cm" icon={<Ruler size={24} color="#8B5CF6" strokeWidth={2.5} />} color="#8B5CF6" sparklineData={measurementHistory.hips} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} onPress={() => setSelectedMetric({ key: 'shoulders', label: t('statsPages.measurements.shoulders'), color: '#10B981', unit: 'cm', icon: <Ruler size={18} color="#10B981" strokeWidth={2.5} />, source: 'measurement' })} activeOpacity={0.7}>
            <MetricCard label={t('statsPages.measurements.shoulders')} value={latestMeasurement?.shoulders || 0} unit="cm" icon={<Ruler size={24} color="#10B981" strokeWidth={2.5} />} color="#10B981" sparklineData={measurementHistory.shoulders} />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {/* Bras - Dual Comparison */}
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

      {/* Cuisses - Dual Comparison */}
      <StatsSection title={t('statsPages.measurements.legs')} description={t('statsPages.measurements.thighsAndCalves')}>
        <DualComparisonCard
          title={t('statsPages.measurements.legs')}
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

      {/* Mollets - Dual Comparison */}
      <StatsSection title={t('statsPages.measurements.calves') || 'Mollets'} description={t('statsPages.measurements.thighsAndCalves')}>
        <DualComparisonCard
          title={t('statsPages.measurements.calves') || 'Mollets'}
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

      {/* Cou */}
      <StatsSection title={t('statsPages.measurements.other')} description={t('statsPages.measurements.neckAndOther')}>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} onPress={() => setSelectedMetric({ key: 'neck', label: t('statsPages.measurements.neck'), color: '#F59E0B', unit: 'cm', icon: <Ruler size={18} color="#F59E0B" strokeWidth={2.5} />, source: 'measurement' })} activeOpacity={0.7}>
            <MetricCard label={t('statsPages.measurements.neck')} value={latestMeasurement?.neck || 0} unit="cm" icon={<Ruler size={24} color="#F59E0B" strokeWidth={2.5} />} color="#F59E0B" sparklineData={measurementHistory.neck} />
          </TouchableOpacity>
        </View>
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
});
