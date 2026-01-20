// ============================================
// COMPOSITION PAGE - Composition corporelle complète
// Toutes les cartes sont cliquables avec modal graphique
// ============================================

import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { SimpleCompositionCard } from '../charts/SimpleCompositionCard';
import { SimpleMetricCard } from '../charts/SimpleMetricCard';
import { HistoryScrollCard } from '../charts/HistoryScrollCard';
import { ScrollableLineChart } from '../charts/ScrollableLineChart';
import { StatsDetailModal } from '../StatsDetailModal';
import { getLatestWeight, getAllWeights } from '@/lib/database';
import { Activity, Droplet, Bone, Zap, Flame, Target } from 'lucide-react-native';
import {
  BODY_FAT_RANGES_MALE,
  BODY_FAT_RANGES_FEMALE,
  MUSCLE_MASS_RANGES_MALE,
  MUSCLE_MASS_RANGES_FEMALE,
  WATER_PERCENTAGE_RANGES,
  VISCERAL_FAT_RANGES,
  BONE_MASS_RANGES_MALE,
  BONE_MASS_RANGES_FEMALE,
  getBMRRange,
  getMetricStatus,
  getBodyFatRange,
  getMuscleMassRange,
  getBoneMassRange
} from '@/lib/healthRanges';
import { getUserSettings } from '@/lib/storage';
import { getProfile } from '@/lib/database';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

export const CompositionPage: React.FC = () => {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const dateLocale = language === 'fr' ? fr : enUS;
  const [latestWeight, setLatestWeight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allWeightsData, setAllWeightsData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<{
    bodyFat: any[];
    muscle: any[];
    water: any[];
  }>({ bodyFat: [], muscle: [], water: [] });

  // Données utilisateur pour les ranges
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [userWeight, setUserWeight] = useState(75);
  const [userHeight, setUserHeight] = useState(175);
  const [userAge, setUserAge] = useState(30);

  // État pour le modal
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    label: string;
    color: string;
    unit: string;
    icon: React.ReactNode;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les données utilisateur
      const [settings, profile] = await Promise.all([
        getUserSettings(),
        getProfile()
      ]);

      if (settings?.gender) {
        setUserGender(settings.gender as 'male' | 'female');
      }
      if (settings?.weight_goal) {
        setUserWeight(settings.weight_goal);
      }
      if (profile?.height_cm) {
        setUserHeight(profile.height_cm);
      }
      if (profile?.birth_date) {
        const birthDate = new Date(profile.birth_date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        setUserAge(age);
      }

      const latest = await getLatestWeight();
      setLatestWeight(latest);

      // Récupérer tous les poids
      const allWeights = await getAllWeights();

      if (!allWeights || allWeights.length === 0) {
        setHistoryData({ bodyFat: [], muscle: [], water: [] });
        setAllWeightsData([]);
        setLoading(false);
        return;
      }

      // Sauvegarder toutes les données pour le modal
      setAllWeightsData(allWeights);

      // Préparer les données pour l'historique selon la période
      const now = new Date();
      const daysMap: { [key: string]: number } = {
        '7j': 7,
        '30j': 30,
        '90j': 90,
        '6m': 180,
        '1a': 365,
        'tout': 3650,
      };
      const days = daysMap[selectedPeriod] || 30;
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const filtered = allWeights.filter((w: any) => new Date(w.date) >= cutoffDate);

      setHistoryData({
        bodyFat: filtered
          .filter((w: any) => w.fat_percent > 0)
          .map((w: any) => ({ date: w.date, value: w.fat_percent }))
          .reverse(),
        muscle: filtered
          .filter((w: any) => w.muscle_percent > 0)
          .map((w: any) => ({ date: w.date, value: w.muscle_percent }))
          .reverse(),
        water: filtered
          .filter((w: any) => w.water_percent > 0)
          .map((w: any) => ({ date: w.date, value: w.water_percent }))
          .reverse(),
      });
    } catch (error) {
      console.error('Error loading composition data:', error);
      setHistoryData({ bodyFat: [], muscle: [], water: [] });
    } finally {
      setLoading(false);
    }
  };

  // Préparer les données pour le modal selon la métrique sélectionnée
  const getModalData = () => {
    if (!selectedMetric || !allWeightsData.length) return [];

    const sortedWeights = [...allWeightsData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    switch (selectedMetric.key) {
      case 'fat_percent':
        return sortedWeights
          .filter((w) => w.fat_percent > 0)
          .map((w) => ({
            value: w.fat_percent,
            label: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
            date: w.date,
          }));

      case 'muscle_percent':
        return sortedWeights
          .filter((w) => w.muscle_percent > 0)
          .map((w) => ({
            value: w.muscle_percent,
            label: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
            date: w.date,
          }));

      case 'water_percent':
        return sortedWeights
          .filter((w) => w.water_percent > 0)
          .map((w) => ({
            value: w.water_percent,
            label: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
            date: w.date,
          }));

      case 'bone_mass':
        return sortedWeights
          .filter((w) => w.bone_mass > 0)
          .map((w) => ({
            value: w.bone_mass,
            label: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
            date: w.date,
          }));

      case 'visceral_fat':
        return sortedWeights
          .filter((w) => w.visceral_fat > 0)
          .map((w) => ({
            value: w.visceral_fat,
            label: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
            date: w.date,
          }));

      case 'bmr':
        return sortedWeights
          .filter((w) => w.bmr > 0)
          .map((w) => ({
            value: w.bmr,
            label: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
            date: w.date,
          }));

      case 'metabolic_age':
        return sortedWeights
          .filter((w) => w.metabolic_age > 0)
          .map((w) => ({
            value: w.metabolic_age,
            label: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
            date: w.date,
          }));

      default:
        return [];
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatsHeader
          title={t('statsPages.composition.title')}
          description={t('statsPages.composition.description')}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          showPeriodSelector={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  // Vérifier si on a de vraies données
  const hasData = latestWeight && (
    latestWeight.fat_percent > 0 ||
    latestWeight.muscle_percent > 0 ||
    latestWeight.water_percent > 0
  );

  const fatPercent = latestWeight?.fat_percent || 0;
  const musclePercent = latestWeight?.muscle_percent || 0;
  const waterPercent = latestWeight?.water_percent || 0;

  // Ranges dynamiques selon le genre
  const bodyFatRange = getBodyFatRange(userGender);
  const muscleMassRange = getMuscleMassRange(userGender);
  const boneMassRange = getBoneMassRange(userGender);
  const bmrRange = getBMRRange(userWeight, userHeight, userAge, userGender);

  // Calculer le statut (vert/orange/rouge) pour chaque métrique
  const fatStatus = fatPercent > 0 ? getMetricStatus(fatPercent, bodyFatRange) : null;
  const muscleStatus = musclePercent > 0 ? getMetricStatus(musclePercent, muscleMassRange) : null;
  const waterStatus = waterPercent > 0 ? getMetricStatus(waterPercent, WATER_PERCENTAGE_RANGES) : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      contentContainerStyle={styles.content}
      onScroll={onScrollContext}
      scrollEventThrottle={16}
    >
      <StatsHeader
        title={t('statsPages.composition.title')}
        description={t('statsPages.composition.description')}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        showPeriodSelector={true}
      />

      {/* Graphique de tendance principal */}
      <StatsSection
        title="Tendance Masse Grasse"
        description="Évolution de ton taux de graisse sur la période"
      >
        <ScrollableLineChart
          data={historyData.bodyFat}
          color="#F59E0B"
          unit="%"
          height={200}
          onPress={() => setSelectedMetric({
            key: 'fat_percent',
            label: t('statsPages.composition.bodyFat'),
            color: '#F59E0B',
            unit: '%',
            icon: <Activity size={18} color="#F59E0B" strokeWidth={2.5} />,
          })}
        />
      </StatsSection>

      {/* Section Composition Globale */}
      <StatsSection
        title={t('statsPages.composition.globalComposition')}
        description={t('statsPages.composition.globalCompositionDesc')}
      >
        {hasData ? (
          <SimpleCompositionCard
            fatPercent={fatPercent}
            musclePercent={musclePercent}
            waterPercent={waterPercent}
            fatLabel={t('statsPages.composition.bodyFat')}
            muscleLabel={t('statsPages.composition.muscle')}
            waterLabel={t('statsPages.composition.water')}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('statsPages.composition.noCompositionData')}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              {t('statsPages.composition.addDataToSeeRings')}
            </Text>
          </View>
        )}
      </StatsSection>


      {/* Masse Grasse */}
      {fatPercent > 0 && (
        <StatsSection
          title={t('statsPages.composition.bodyFat')}
          description={t('statsPages.composition.bodyFatDesc')}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedMetric({
              key: 'fat_percent',
              label: t('statsPages.composition.bodyFat'),
              color: fatStatus?.color || '#F59E0B',
              unit: '%',
              icon: <Activity size={18} color={fatStatus?.color || '#F59E0B'} strokeWidth={2.5} />,
            })}
          >
            <SimpleMetricCard
              value={fatPercent}
              unit={bodyFatRange.unit}
              title={t('statsPages.composition.bodyFat')}
              zones={bodyFatRange.zones}
              min={bodyFatRange.min}
              max={bodyFatRange.max}
              source={bodyFatRange.source}
              sourceUrl={bodyFatRange.sourceUrl}
            />
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* Masse Musculaire */}
      {musclePercent > 0 && (
        <StatsSection
          title={t('statsPages.composition.muscleMass')}
          description={t('statsPages.composition.muscleMassDesc')}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedMetric({
              key: 'muscle_percent',
              label: t('statsPages.composition.muscleMass'),
              color: muscleStatus?.color || '#10B981',
              unit: '%',
              icon: <Activity size={18} color={muscleStatus?.color || '#10B981'} strokeWidth={2.5} />,
            })}
          >
            <SimpleMetricCard
              value={musclePercent}
              unit={muscleMassRange.unit}
              title={t('statsPages.composition.muscleMass')}
              zones={muscleMassRange.zones}
              min={muscleMassRange.min}
              max={muscleMassRange.max}
              source={muscleMassRange.source}
              sourceUrl={muscleMassRange.sourceUrl}
            />
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* Hydratation */}
      {waterPercent > 0 && (
        <StatsSection
          title={t('statsPages.composition.hydration')}
          description={t('statsPages.composition.hydrationDesc')}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedMetric({
              key: 'water_percent',
              label: t('statsPages.composition.hydration'),
              color: waterStatus?.color || '#06B6D4',
              unit: '%',
              icon: <Droplet size={18} color={waterStatus?.color || '#06B6D4'} strokeWidth={2.5} />,
            })}
          >
            <SimpleMetricCard
              value={waterPercent}
              unit={WATER_PERCENTAGE_RANGES.unit}
              title={t('statsPages.composition.hydration')}
              zones={WATER_PERCENTAGE_RANGES.zones}
              min={WATER_PERCENTAGE_RANGES.min}
              max={WATER_PERCENTAGE_RANGES.max}
              source={WATER_PERCENTAGE_RANGES.source}
              sourceUrl={WATER_PERCENTAGE_RANGES.sourceUrl}
            />
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* Graisse Viscérale */}
      {latestWeight?.visceral_fat > 0 && (
        <StatsSection
          title={t('statsPages.composition.visceralFat')}
          description={t('statsPages.composition.visceralFatDesc')}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedMetric({
              key: 'visceral_fat',
              label: t('statsPages.composition.visceralFat'),
              color: '#EF4444',
              unit: '/20',
              icon: <Activity size={18} color="#EF4444" strokeWidth={2.5} />,
            })}
          >
            <SimpleMetricCard
              value={latestWeight.visceral_fat}
              unit={VISCERAL_FAT_RANGES.unit}
              title={t('statsPages.composition.visceralFat')}
              zones={VISCERAL_FAT_RANGES.zones}
              min={VISCERAL_FAT_RANGES.min}
              max={VISCERAL_FAT_RANGES.max}
              source={VISCERAL_FAT_RANGES.source}
              sourceUrl={VISCERAL_FAT_RANGES.sourceUrl}
            />
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* Masse Grasse - Historique scrollable */}
      {historyData.bodyFat.length > 0 && (
        <StatsSection
          title={t('statsPages.composition.bodyFatHistory')}
          description={t('statsPages.clickToSeeChart')}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedMetric({
              key: 'fat_percent',
              label: t('statsPages.composition.bodyFat'),
              color: '#F59E0B',
              unit: '%',
              icon: <Activity size={18} color="#F59E0B" strokeWidth={2.5} />,
            })}
          >
            <HistoryScrollCard
              data={historyData.bodyFat}
              unit="%"
              healthRange={bodyFatRange}
              color="#F59E0B"
              getStatus={(value) => getMetricStatus(value, bodyFatRange)}
            />
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* Muscle - Historique scrollable */}
      {historyData.muscle.length > 0 && (
        <StatsSection
          title={t('statsPages.composition.muscleHistory')}
          description={t('statsPages.clickToSeeChart')}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedMetric({
              key: 'muscle_percent',
              label: t('statsPages.composition.muscleMass'),
              color: '#10B981',
              unit: '%',
              icon: <Activity size={18} color="#10B981" strokeWidth={2.5} />,
            })}
          >
            <HistoryScrollCard
              data={historyData.muscle}
              unit="%"
              healthRange={muscleMassRange}
              color="#10B981"
              getStatus={(value) => getMetricStatus(value, muscleMassRange)}
            />
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* Eau - Historique scrollable + CLIQUABLE */}
      <StatsSection
        title={t('statsPages.composition.hydration')}
        description={t('statsPages.clickToSeeChart')}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSelectedMetric({
            key: 'water_percent',
            label: t('statsPages.composition.hydration'),
            color: '#06B6D4',
            unit: '%',
            icon: <Droplet size={18} color="#06B6D4" strokeWidth={2.5} />,
          })}
        >
          {historyData.water.length > 0 ? (
            <HistoryScrollCard
              data={historyData.water}
              unit="%"
              healthRange={WATER_PERCENTAGE_RANGES}
              color="#06B6D4"
              getStatus={(value) => getMetricStatus(value, WATER_PERCENTAGE_RANGES)}
            />
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {t('statsPages.noDataForPeriod')}
            </Text>
          )}
        </TouchableOpacity>
      </StatsSection>

      {/* Section Métriques Détaillées - TOUTES CLIQUABLES */}
      <StatsSection
        title={t('statsPages.composition.detailedMetrics')}
        description={t('statsPages.clickToSeeHistory')}
      >
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'bone_mass',
              label: t('statsPages.composition.boneMass'),
              color: '#8B5CF6',
              unit: 'kg',
              icon: <Bone size={18} color="#8B5CF6" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.composition.boneMass')}
              value={latestWeight?.bone_mass?.toFixed(1) || '0.0'}
              unit="kg"
              icon={<Bone size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'visceral_fat',
              label: t('statsPages.composition.visceralFat'),
              color: '#EF4444',
              unit: '/20',
              icon: <Activity size={18} color="#EF4444" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.composition.visceralFat')}
              value={latestWeight?.visceral_fat || 0}
              unit="/20"
              icon={<Activity size={24} color="#EF4444" strokeWidth={2.5} />}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'bmr',
              label: t('statsPages.composition.bmr'),
              color: '#F97316',
              unit: 'kcal',
              icon: <Flame size={18} color="#F97316" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.composition.bmr')}
              value={latestWeight?.bmr || 0}
              unit="kcal"
              icon={<Flame size={24} color="#F97316" strokeWidth={2.5} />}
              color="#F97316"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'metabolic_age',
              label: t('statsPages.composition.metabolicAge'),
              color: '#6366F1',
              unit: t('statsPages.composition.years'),
              icon: <Zap size={18} color="#6366F1" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.composition.metabolicAge')}
              value={latestWeight?.metabolic_age || 0}
              unit={t('statsPages.composition.years')}
              icon={<Zap size={24} color="#6366F1" strokeWidth={2.5} />}
              color="#6366F1"
            />
          </TouchableOpacity>
        </View>
      </StatsSection>

      <View style={{ height: 40 }} />

      {/* Modal de détail */}
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
          healthRange={
            selectedMetric.key === 'fat_percent' ? bodyFatRange :
            selectedMetric.key === 'muscle_percent' ? muscleMassRange :
            selectedMetric.key === 'water_percent' ? WATER_PERCENTAGE_RANGES :
            selectedMetric.key === 'visceral_fat' ? VISCERAL_FAT_RANGES :
            selectedMetric.key === 'bone_mass' ? boneMassRange :
            selectedMetric.key === 'bmr' ? bmrRange :
            undefined
          }
        />
      )}
    </ScrollView>
  );
};

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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridItem: {
    flex: 1,
  },
});
