// ============================================
// TRAINING TAB PAGE - Discipline + Performance
// Fusion des 2 anciens onglets en un seul scroll
// ============================================

import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { StatsDetailModal } from '../StatsDetailModal';
import { MetricProgressGrid } from '../charts/MetricProgressGrid';
import { ScrollableLineChart } from '../charts/ScrollableLineChart';
import { StrainGauge } from '../advanced/StrainGauge';
import { StatsExplanation } from '../StatsExplanation';
import { PerformanceRadar } from '@/components/PerformanceRadar';
import { aggregateTrainingData } from '@/lib/statsAggregation';
import { getTrainings } from '@/lib/database';
import { Flame, Target, Calendar, Award, Timer, TrendingUp, Zap } from 'lucide-react-native';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { logger } from '@/lib/security/logger';

export const TrainingTabPage: React.FC = React.memo(() => {
  const { colors, isDark, screenBackground } = useTheme();
  const { t, language } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const dateLocale = language === 'fr' ? fr : enUS;

  const INTENSITY_RANGES = {
    min: 0,
    max: 10,
    unit: '/10',
    source: '\u00C9chelle RPE',
    zones: [
      { label: t('statsPages.discipline.recovery'), start: 0, end: 3, color: '#22C55E', status: 'good' as const },
      { label: t('statsPages.discipline.moderate'), start: 4, end: 6, color: '#F59E0B', status: 'moderate' as const },
      { label: t('statsPages.discipline.intense'), start: 7, end: 8, color: '#EF4444', status: 'attention' as const },
      { label: t('statsPages.discipline.max'), start: 9, end: 10, color: '#DC2626', status: 'danger' as const },
    ],
  };

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const [trainingData, setTrainingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allTrainingsData, setAllTrainingsData] = useState<any[]>([]);

  const [selectedMetric, setSelectedMetric] = useState<{
    key: string;
    label: string;
    color: string;
    unit: string;
    icon: React.ReactNode;
  } | null>(null);

  const [trainingHistory, setTrainingHistory] = useState<{
    intensity: any[];
    duration: any[];
    load: any[];
  }>({ intensity: [], duration: [], load: [] });

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, allTrainings] = await Promise.all([
        aggregateTrainingData(selectedPeriod),
        getTrainings(),
      ]);
      setTrainingData(data);

      if (allTrainings?.length > 0) {
        setAllTrainingsData(allTrainings);
      }

      if (allTrainings?.length > 0) {
        const now = new Date();
        const daysMap: { [key: string]: number } = { '7j': 7, '30j': 30, '90j': 90, 'tout': 365 };
        const days = daysMap[selectedPeriod] || 7;
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        const filtered = allTrainings.filter((t: any) => new Date(t.date) >= cutoffDate).reverse();

        setTrainingHistory({
          intensity: filtered.filter((t: any) => t.intensity && t.intensity > 0).map((t: any) => ({ date: t.date, value: t.intensity })),
          duration: filtered.filter((t: any) => t.duration && t.duration > 0).map((t: any) => ({ date: t.date, value: t.duration })),
          load: filtered.filter((t: any) => t.intensity && t.duration).map((t: any) => ({ date: t.date, value: (t.intensity * t.duration) / 60 })),
        });
      }
    } catch (error) {
      logger.error('Error loading training data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntensityStatus = (value: number) => {
    const zone = INTENSITY_RANGES.zones.find(z => value >= z.start && value <= z.end);
    return zone ? { color: zone.color, label: zone.label } : { color: '#94A3B8', label: t('statsPages.discipline.unknown') };
  };

  const getPeriodDescription = (period: Period) => {
    const periodMap: { [key: string]: string } = { '7j': t('statsPages.days7'), '30j': t('statsPages.days30'), '90j': t('statsPages.days90'), 'tout': t('statsPages.allPeriod') };
    return periodMap[period] || t('statsPages.allPeriod');
  };

  const getModalData = () => {
    if (!selectedMetric || !allTrainingsData.length) return [];

    const sortedTrainings = [...allTrainingsData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    switch (selectedMetric.key) {
      case 'intensity':
        return sortedTrainings.filter(t => t.intensity && t.intensity > 0).map(t => ({ value: t.intensity, label: format(new Date(t.date), 'd MMM', { locale: dateLocale }), date: t.date }));
      case 'duration':
        return sortedTrainings.filter(t => t.duration && t.duration > 0).map(t => ({ value: t.duration, label: format(new Date(t.date), 'd MMM', { locale: dateLocale }), date: t.date }));
      case 'load':
        return sortedTrainings.filter(t => t.intensity && t.duration).map(t => ({ value: (t.intensity * t.duration) / 60, label: format(new Date(t.date), 'd MMM', { locale: dateLocale }), date: t.date }));
      case 'sessions':
        const weeklyData: { [key: string]: number } = {};
        sortedTrainings.forEach(t => { const ws = format(new Date(t.date), 'w-yyyy'); weeklyData[ws] = (weeklyData[ws] || 0) + 1; });
        return Object.entries(weeklyData).map(([week, count]) => ({ value: count, label: `S${week.split('-')[0]}`, date: week }));
      case 'total_duration':
        const weeklyDuration: { [key: string]: number } = {};
        sortedTrainings.forEach(t => { const ws = format(new Date(t.date), 'w-yyyy'); weeklyDuration[ws] = (weeklyDuration[ws] || 0) + (t.duration || 0); });
        return Object.entries(weeklyDuration).map(([week, dur]) => ({ value: dur / 60, label: `S${week.split('-')[0]}`, date: week }));
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: screenBackground }]}>
        <StatsHeader
          title={t('statsPages.discipline.title')}
          description="Discipline, charge et performance"
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
      {/* ========== SECTION DISCIPLINE ========== */}
      <StatsHeader
        title={t('statsPages.discipline.title')}
        description="Discipline, charge et performance"
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <StatsExplanation
        title="Discipline & Charge"
        text={"La Discipline mesure ta r\u00E9gularit\u00E9 (fr\u00E9quence des s\u00E9ances). La Charge d'entra\u00EEnement est calcul\u00E9e en multipliant la dur\u00E9e par l'intensit\u00E9 (RPE)."}
        color="#8B5CF6"
      />

      <StatsSection title={"Volume d'entra\u00EEnement"} description={"\u00C9volution de tes sessions sur la p\u00E9riode"}>
        <ScrollableLineChart
          data={trainingHistory.duration}
          color="#10B981"
          unit=" min"
          height={200}
          onPress={() => setSelectedMetric({ key: 'duration', label: t('statsPages.discipline.duration'), color: '#10B981', unit: 'min', icon: <Timer size={18} color="#10B981" strokeWidth={2.5} /> })}
        />
      </StatsSection>

      {trainingData && trainingData.weeklyLoad > 0 && (
        <StatsSection title={t('statsPages.discipline.trainingLoad')} description={t('statsPages.discipline.trainingLoadDesc')}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'load', label: t('statsPages.discipline.load'), color: '#8B5CF6', unit: 'pts', icon: <Flame size={18} color="#8B5CF6" strokeWidth={2.5} /> })}>
            <StrainGauge strain={Math.min(trainingData.weeklyLoad / 50, 21)} label={t('statsPages.discipline.load')} />
          </TouchableOpacity>
        </StatsSection>
      )}

      <StatsSection title={t('statsPages.discipline.intensityAndVolume')} description={t('statsPages.clickToSeeChart')}>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'load', label: t('statsPages.discipline.weeklyLoad'), color: '#8B5CF6', unit: 'pts', icon: <Flame size={18} color="#8B5CF6" strokeWidth={2.5} /> })}>
            <MetricCard label={t('statsPages.discipline.weeklyLoad')} value={trainingData?.weeklyLoad || 0} unit="pts" icon={<Flame size={24} color="#8B5CF6" strokeWidth={2.5} />} color="#8B5CF6" sparklineData={trainingHistory.load.map(h => ({ value: h.value }))} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'intensity', label: t('statsPages.discipline.intensity'), color: '#EF4444', unit: '/10', icon: <Target size={18} color="#EF4444" strokeWidth={2.5} /> })}>
            <MetricCard label={t('statsPages.discipline.averageIntensity')} value={trainingData?.averageIntensity?.toFixed(1) || 0} unit="/10" icon={<Target size={24} color="#EF4444" strokeWidth={2.5} />} color="#EF4444" sparklineData={trainingHistory.intensity.map(h => ({ value: h.value }))} />
          </TouchableOpacity>
        </View>
      </StatsSection>

      <StatsSection title={t('statsPages.discipline.volume')} description={t('statsPages.discipline.volumeDesc')}>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'sessions', label: t('statsPages.discipline.sessions'), color: '#10B981', unit: '', icon: <Calendar size={18} color="#10B981" strokeWidth={2.5} /> })}>
            <MetricCard label={t('statsPages.discipline.sessions')} value={trainingData?.count || 0} unit={t('statsPages.discipline.total')} icon={<Calendar size={24} color="#10B981" strokeWidth={2.5} />} color="#10B981" sparklineData={trainingHistory.duration.length >= 2 ? (() => { const weekMap: Record<string, number> = {}; allTrainingsData.forEach(t => { const week = format(new Date(t.date), 'w-yyyy'); weekMap[week] = (weekMap[week] || 0) + 1; }); return Object.values(weekMap).map(v => ({ value: v })); })() : []} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'total_duration', label: t('statsPages.discipline.totalDuration'), color: '#06B6D4', unit: 'h', icon: <Timer size={18} color="#06B6D4" strokeWidth={2.5} /> })}>
            <MetricCard label={t('statsPages.discipline.totalDuration')} value={((trainingData?.totalDuration || 0) / 60).toFixed(1)} unit="h" icon={<Award size={24} color="#06B6D4" strokeWidth={2.5} />} color="#06B6D4" sparklineData={trainingHistory.duration.map(h => ({ value: h.value }))} />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {/* Historique Intensite */}
      <StatsSection title={t('statsPages.discipline.intensityHistory')} description={`${t('statsPages.discipline.intensityHistoryDesc')} ${getPeriodDescription(selectedPeriod)}`}>
        {trainingHistory.intensity.length > 0 ? (
          <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'intensity', label: t('statsPages.discipline.intensity'), color: '#EF4444', unit: '/10', icon: <Target size={18} color="#EF4444" strokeWidth={2.5} /> })}>
            <MetricProgressGrid data={trainingHistory.intensity} unit="/10" healthRange={INTENSITY_RANGES} color="#EF4444" getStatus={getIntensityStatus} />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('statsPages.noDataForPeriod')}</Text>
        )}
      </StatsSection>

      {/* Historique Duree */}
      <StatsSection title={t('statsPages.discipline.durationHistory')} description={`${t('statsPages.discipline.durationHistoryDesc')} ${getPeriodDescription(selectedPeriod)}`}>
        {trainingHistory.duration.length > 0 ? (
          <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'duration', label: t('statsPages.discipline.duration'), color: '#10B981', unit: 'min', icon: <Timer size={18} color="#10B981" strokeWidth={2.5} /> })}>
            <MetricProgressGrid data={trainingHistory.duration} unit="min" color="#10B981" showEvolution={true} evolutionGoal="increase" />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('statsPages.noDataForPeriod')}</Text>
        )}
      </StatsSection>

      {/* ========== SECTION PERFORMANCE ========== */}
      <View style={styles.sectionDivider} />

      <StatsExplanation
        title="Performance & Records"
        text={"La Performance suit l'\u00E9volution de tes capacit\u00E9s physiques (force, endurance, vitesse). Tes Records Personnels (PR) sont extraits de tes notes de s\u00E9ances."}
        color="#F59E0B"
      />

      <StatsSection title={t('statsPages.performance.personalRecords')} description={t('statsPages.performance.personalRecordsDesc')}>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <MetricCard label={t('statsPages.performance.totalRecords')} value="0" unit={t('statsPages.performance.records')} icon={<Award size={24} color="#F59E0B" strokeWidth={2.5} />} color="#F59E0B" sparklineData={[]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <MetricCard label={t('statsPages.performance.thisMonth')} value="0" unit={t('statsPages.performance.new')} icon={<TrendingUp size={24} color="#10B981" strokeWidth={2.5} />} color="#10B981" sparklineData={[]} />
          </TouchableOpacity>
        </View>
      </StatsSection>

      <StatsSection title={t('statsPages.performance.progression')} description={t('statsPages.performance.progressionDesc')}>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <MetricCard label={t('statsPages.performance.globalScore')} value="0" unit="/100" icon={<Target size={24} color="#8B5CF6" strokeWidth={2.5} />} color="#8B5CF6" sparklineData={[]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem} activeOpacity={0.7}>
            <MetricCard label={t('statsPages.performance.improvement')} value="0" unit="%" icon={<Zap size={24} color="#EF4444" strokeWidth={2.5} />} color="#EF4444" sparklineData={[]} />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {/* RADAR PERFORMANCE */}
      <StatsSection title="Radar Performance" description={"Vue d'ensemble de tes capacit\u00E9s"}>
        <View style={[styles.radarCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
          <View style={styles.radarContainer}>
            <PerformanceRadar size={280} />
          </View>
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
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 20,
  },
  sectionDivider: {
    height: 1,
    marginHorizontal: 32,
    marginVertical: 8,
    opacity: 0.15,
    backgroundColor: '#888',
  },
  radarCard: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
