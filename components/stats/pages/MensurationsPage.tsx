// ============================================
// MENSURATIONS PAGE - Toutes les mesures du corps
// Toutes les cartes sont cliquables avec modal graphique
// ============================================

import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { StatsDetailModal } from '../StatsDetailModal';
import { HistoryScrollCard } from '../charts/HistoryScrollCard';
import { getLatestMeasurement, getMeasurements } from '@/lib/database';
import { Ruler } from 'lucide-react-native';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { WAIST_CIRCUMFERENCE_RANGES_MALE, WAIST_CIRCUMFERENCE_RANGES_FEMALE, getWaistCircumferenceRange, getMetricStatus } from '@/lib/healthRanges';
import { getUserSettings } from '@/lib/storage';
import { useScrollContext } from '@/lib/ScrollContext';

export const MensurationsPage: React.FC = () => {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const dateLocale = language === 'fr' ? fr : enUS;
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const [latestMeasurement, setLatestMeasurement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allMeasurementsData, setAllMeasurementsData] = useState<any[]>([]);
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');

  // État pour le modal
  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    label: string;
    color: string;
    unit: string;
    icon: React.ReactNode;
  } | null>(null);

  const [measurementHistory, setMeasurementHistory] = useState<{
    chest: any[];
    waist: any[];
    navel: any[];
    hips: any[];
    shoulders: any[];
    left_arm: any[];
    right_arm: any[];
    left_thigh: any[];
    right_thigh: any[];
    left_calf: any[];
    right_calf: any[];
    neck: any[];
  }>({
    chest: [], waist: [], navel: [], hips: [], shoulders: [],
    left_arm: [], right_arm: [],
    left_thigh: [], right_thigh: [],
    left_calf: [], right_calf: [],
    neck: []
  });

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [measurement, allMeasurements, settings] = await Promise.all([
        getLatestMeasurement(),
        getMeasurements(),
        getUserSettings()
      ]);
      setLatestMeasurement(measurement);

      if (settings?.gender) {
        setUserGender(settings.gender as 'male' | 'female');
      }

      // Sauvegarder toutes les données pour le modal
      if (allMeasurements && allMeasurements.length > 0) {
        setAllMeasurementsData(allMeasurements);
      }

      // Préparer l'historique selon la période
      if (allMeasurements && allMeasurements.length > 0) {
        const now = new Date();
        const daysMap: { [key: string]: number } = {
          '7j': 7,
          '30j': 30,
          '90j': 90,
          'tout': 365,
        };
        const days = daysMap[selectedPeriod] || 30;
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        const filtered = allMeasurements
          .filter((m: any) => new Date(m.date) >= cutoffDate)
          .reverse();

        const fields = ['chest', 'waist', 'navel', 'hips', 'shoulders', 'left_arm', 'right_arm', 'left_thigh', 'right_thigh', 'left_calf', 'right_calf', 'neck'];
        const history: any = {};

        fields.forEach(field => {
          history[field] = filtered
            .filter((m: any) => m[field] && m[field] > 0)
            .map((m: any) => ({
              date: m.date,
              value: m[field],
            }));
        });

        setMeasurementHistory(history);
      }
    } catch (error) {
      console.error('Error loading measurements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get period description
  const getPeriodDescription = (period: Period) => {
    const periodMap: { [key: string]: string } = {
      '7j': t('statsPages.days7'),
      '30j': t('statsPages.days30'),
      '90j': t('statsPages.days90'),
      '6m': t('statsPages.months6'),
      '1a': t('statsPages.year1'),
      'tout': t('statsPages.allPeriod'),
    };
    return periodMap[period] || t('statsPages.allPeriod');
  };

  // Préparer les données pour le modal selon la métrique sélectionnée
  const getModalData = () => {
    if (!selectedMetric || !allMeasurementsData.length) return [];

    const sortedMeasurements = [...allMeasurementsData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Filtrer les mesures qui ont une valeur pour ce champ
    const filteredMeasurements = sortedMeasurements.filter(
      m => m[selectedMetric.key] && m[selectedMetric.key] > 0
    );

    return filteredMeasurements.map((m) => ({
      value: m[selectedMetric.key],
      label: format(new Date(m.date), 'd MMM', { locale: dateLocale }),
      date: m.date,
    }));
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatsHeader
          title={t('statsPages.measurements.title')}
          description={t('statsPages.measurements.description')}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
          showPeriodSelector={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  };

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
        title={t('statsPages.measurements.title')}
        description={t('statsPages.measurements.description')}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        showPeriodSelector={true}
      />

      {/* Section Torse */}
      <StatsSection
        title={t('statsPages.measurements.torso')}
        description={t('statsPages.clickToSeeChart')}
      >
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedMetric({
              key: 'chest',
              label: t('statsPages.measurements.chest'),
              color: '#3B82F6',
              unit: 'cm',
              icon: <Ruler size={18} color="#3B82F6" strokeWidth={2.5} />,
            })}
            activeOpacity={0.7}
          >
            <MetricCard
              label={t('statsPages.measurements.chest')}
              value={latestMeasurement?.chest || 0}
              unit="cm"
              icon={<Ruler size={24} color="#3B82F6" strokeWidth={2.5} />}
              color="#3B82F6"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedMetric({
              key: 'waist',
              label: t('statsPages.measurements.waist'),
              color: '#F59E0B',
              unit: 'cm',
              icon: <Ruler size={18} color="#F59E0B" strokeWidth={2.5} />,
            })}
            activeOpacity={0.7}
          >
            <MetricCard
              label={t('statsPages.measurements.waist')}
              value={latestMeasurement?.waist || 0}
              unit="cm"
              icon={<Ruler size={24} color="#F59E0B" strokeWidth={2.5} />}
              color="#F59E0B"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedMetric({
              key: 'navel',
              label: t('statsPages.measurements.navel'),
              color: '#9333EA',
              unit: 'cm',
              icon: <Ruler size={18} color="#9333EA" strokeWidth={2.5} />,
            })}
            activeOpacity={0.7}
          >
            <MetricCard
              label={t('statsPages.measurements.navel')}
              value={latestMeasurement?.navel || 0}
              unit="cm"
              icon={<Ruler size={24} color="#9333EA" strokeWidth={2.5} />}
              color="#9333EA"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedMetric({
              key: 'hips',
              label: t('statsPages.measurements.hips'),
              color: '#8B5CF6',
              unit: 'cm',
              icon: <Ruler size={18} color="#8B5CF6" strokeWidth={2.5} />,
            })}
            activeOpacity={0.7}
          >
            <MetricCard
              label={t('statsPages.measurements.hips')}
              value={latestMeasurement?.hips || 0}
              unit="cm"
              icon={<Ruler size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedMetric({
              key: 'shoulders',
              label: t('statsPages.measurements.shoulders'),
              color: '#10B981',
              unit: 'cm',
              icon: <Ruler size={18} color="#10B981" strokeWidth={2.5} />,
            })}
            activeOpacity={0.7}
          >
            <MetricCard
              label={t('statsPages.measurements.shoulders')}
              value={latestMeasurement?.shoulders || 0}
              unit="cm"
              icon={<Ruler size={24} color="#10B981" strokeWidth={2.5} />}
              color="#10B981"
            />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {/* Historique Poitrine - CLIQUABLE */}
      {measurementHistory.chest.length > 0 && (
        <StatsSection
          title={t('statsPages.measurements.chestHistory')}
          description={`${t('statsPages.evolutionOn')} ${getPeriodDescription(selectedPeriod)}`}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'chest',
              label: t('statsPages.measurements.chest'),
              color: '#3B82F6',
              unit: 'cm',
              icon: <Ruler size={18} color="#3B82F6" strokeWidth={2.5} />,
            })}
          >
            <HistoryScrollCard
              data={measurementHistory.chest}
              unit="cm"
              color="#3B82F6"
              showEvolution={true}
              evolutionGoal="increase"
            />
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* Historique Tour de taille - CLIQUABLE */}
      {measurementHistory.waist.length > 0 && (
        <StatsSection
          title={t('statsPages.measurements.waistHistory')}
          description={`${t('statsPages.evolutionOn')} ${getPeriodDescription(selectedPeriod)}`}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'waist',
              label: t('statsPages.measurements.waist'),
              color: '#F59E0B',
              unit: 'cm',
              icon: <Ruler size={18} color="#F59E0B" strokeWidth={2.5} />,
            })}
          >
            <HistoryScrollCard
              data={measurementHistory.waist}
              unit="cm"
              color="#F59E0B"
              healthRange={getWaistCircumferenceRange(userGender)}
              getStatus={(value) => getMetricStatus(value, getWaistCircumferenceRange(userGender))}
            />
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* Section Bras */}
      <StatsSection
        title={t('statsPages.measurements.arms')}
        description={t('statsPages.measurements.bicepsLeftRight')}
      >
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedMetric({
              key: 'left_arm',
              label: t('statsPages.measurements.leftArm'),
              color: '#EF4444',
              unit: 'cm',
              icon: <Ruler size={18} color="#EF4444" strokeWidth={2.5} />,
            })}
            activeOpacity={0.7}
          >
            <MetricCard
              label={t('statsPages.measurements.leftArm')}
              value={latestMeasurement?.left_arm || 0}
              unit="cm"
              icon={<Ruler size={24} color="#EF4444" strokeWidth={2.5} />}
              color="#EF4444"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedMetric({
              key: 'right_arm',
              label: t('statsPages.measurements.rightArm'),
              color: '#EF4444',
              unit: 'cm',
              icon: <Ruler size={18} color="#EF4444" strokeWidth={2.5} />,
            })}
            activeOpacity={0.7}
          >
            <MetricCard
              label={t('statsPages.measurements.rightArm')}
              value={latestMeasurement?.right_arm || 0}
              unit="cm"
              icon={<Ruler size={24} color="#EF4444" strokeWidth={2.5} />}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {/* Historique Bras - CLIQUABLE */}
      {(measurementHistory.left_arm.length > 0 || measurementHistory.right_arm.length > 0) && (
        <StatsSection
          title={t('statsPages.measurements.armsHistory')}
          description={`${t('statsPages.evolutionOn')} ${getPeriodDescription(selectedPeriod)}`}
        >
          {measurementHistory.left_arm.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSelectedMetric({
                key: 'left_arm',
                label: t('statsPages.measurements.leftArm'),
                color: '#EF4444',
                unit: 'cm',
                icon: <Ruler size={18} color="#EF4444" strokeWidth={2.5} />,
              })}
            >
              <HistoryScrollCard
                data={measurementHistory.left_arm}
                unit="cm"
                color="#EF4444"
                showEvolution={true}
                evolutionGoal="increase"
              />
            </TouchableOpacity>
          )}
        </StatsSection>
      )}

      {/* Section Jambes */}
      <StatsSection
        title={t('statsPages.measurements.legs')}
        description={t('statsPages.measurements.thighsAndCalves')}
      >
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedMetric({
              key: 'left_thigh',
              label: t('statsPages.measurements.leftThigh'),
              color: '#06B6D4',
              unit: 'cm',
              icon: <Ruler size={18} color="#06B6D4" strokeWidth={2.5} />,
            })}
            activeOpacity={0.7}
          >
            <MetricCard
              label={t('statsPages.measurements.leftThigh')}
              value={latestMeasurement?.left_thigh || 0}
              unit="cm"
              icon={<Ruler size={24} color="#06B6D4" strokeWidth={2.5} />}
              color="#06B6D4"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedMetric({
              key: 'right_thigh',
              label: t('statsPages.measurements.rightThigh'),
              color: '#06B6D4',
              unit: 'cm',
              icon: <Ruler size={18} color="#06B6D4" strokeWidth={2.5} />,
            })}
            activeOpacity={0.7}
          >
            <MetricCard
              label={t('statsPages.measurements.rightThigh')}
              value={latestMeasurement?.right_thigh || 0}
              unit="cm"
              icon={<Ruler size={24} color="#06B6D4" strokeWidth={2.5} />}
              color="#06B6D4"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedMetric({
              key: 'left_calf',
              label: t('statsPages.measurements.leftCalf'),
              color: '#8B5CF6',
              unit: 'cm',
              icon: <Ruler size={18} color="#8B5CF6" strokeWidth={2.5} />,
            })}
            activeOpacity={0.7}
          >
            <MetricCard
              label={t('statsPages.measurements.leftCalf')}
              value={latestMeasurement?.left_calf || 0}
              unit="cm"
              icon={<Ruler size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedMetric({
              key: 'right_calf',
              label: t('statsPages.measurements.rightCalf'),
              color: '#8B5CF6',
              unit: 'cm',
              icon: <Ruler size={18} color="#8B5CF6" strokeWidth={2.5} />,
            })}
            activeOpacity={0.7}
          >
            <MetricCard
              label={t('statsPages.measurements.rightCalf')}
              value={latestMeasurement?.right_calf || 0}
              unit="cm"
              icon={<Ruler size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
            />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {/* Historique Cuisses - CLIQUABLE */}
      {measurementHistory.left_thigh.length > 0 && (
        <StatsSection
          title={t('statsPages.measurements.thighsHistory')}
          description={`${t('statsPages.evolutionOn')} ${getPeriodDescription(selectedPeriod)}`}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'left_thigh',
              label: t('statsPages.measurements.leftThigh'),
              color: '#06B6D4',
              unit: 'cm',
              icon: <Ruler size={18} color="#06B6D4" strokeWidth={2.5} />,
            })}
          >
            <HistoryScrollCard
              data={measurementHistory.left_thigh}
              unit="cm"
              color="#06B6D4"
              showEvolution={true}
              evolutionGoal="increase"
            />
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* Section Autre */}
      <StatsSection
        title={t('statsPages.measurements.other')}
        description={t('statsPages.measurements.neckAndOther')}
      >
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => setSelectedMetric({
              key: 'neck',
              label: t('statsPages.measurements.neck'),
              color: '#F59E0B',
              unit: 'cm',
              icon: <Ruler size={18} color="#F59E0B" strokeWidth={2.5} />,
            })}
            activeOpacity={0.7}
          >
            <MetricCard
              label={t('statsPages.measurements.neck')}
              value={latestMeasurement?.neck || 0}
              unit="cm"
              icon={<Ruler size={24} color="#F59E0B" strokeWidth={2.5} />}
              color="#F59E0B"
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
            selectedMetric.key === 'waist' ? getWaistCircumferenceRange(userGender) : undefined
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
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridItem: {
    flex: 1,
  },
});
