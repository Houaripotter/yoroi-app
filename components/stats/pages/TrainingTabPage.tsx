// ============================================
// TRAINING TAB PAGE - Discipline + Performance
// Même structure que Corps : titres dans les cartes
// ============================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Text, RefreshControl, InteractionManager, DeviceEventEmitter } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { SamuraiCircleLoader } from '@/components/SamuraiLoader';
import { formatDurationHM } from '@/lib/formatDuration';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { StatsDetailModal } from '../StatsDetailModal';
import { MetricProgressGrid } from '../charts/MetricProgressGrid';
import { DualComparisonCard } from '../charts/DualComparisonCard';
import { StrainGauge } from '../advanced/StrainGauge';
import { PerformanceRadar } from '@/components/PerformanceRadar';
import { aggregateTrainingData } from '@/lib/statsAggregation';
import { getTrainings } from '@/lib/database';
import { getSportById } from '@/lib/sports';
import { Flame, Target, Calendar, Award, Timer } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '@/lib/security/logger';
import { ImportProgressBanner } from '@/components/ImportProgressBanner';

export const TrainingTabPage: React.FC = React.memo(() => {
  const { colors, isDark, screenBackground } = useTheme();
  const { t } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const dateLocale = fr;

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
  const [refreshing, setRefreshing] = useState(false);

  const [allTrainingsData, setAllTrainingsData] = useState<any[]>([]);

  const [showLoader, setShowLoader] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowLoader(false), 7000);
    return () => clearTimeout(t);
  }, []);

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

  // Recharger quand Apple Health importe de nouvelles séances
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', () => {
      loadData();
    });
    return () => sub.remove();
  }, [selectedPeriod]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadData(); } finally { setRefreshing(false); }
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
        const daysMap: { [key: string]: number } = { '7j': 7, '30j': 30, '90j': 90, '6m': 180, '1a': 365, '2a': 730, 'tout': 3650 };
        const days = daysMap[selectedPeriod] || 30;
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

  // Sessions sparkline (par semaine)
  const sessionsSparkline = useMemo(() => {
    if (trainingHistory.duration.length < 2) return [];
    const weekMap: Record<string, number> = {};
    allTrainingsData.forEach(t => {
      const week = format(new Date(t.date), 'w-yyyy');
      weekMap[week] = (weekMap[week] || 0) + 1;
    });
    return Object.values(weekMap).map(v => ({ value: v }));
  }, [allTrainingsData, trainingHistory.duration.length]);

  const getModalData = useCallback(() => {
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
  }, [selectedMetric, allTrainingsData, dateLocale]);

  if (showLoader) return <SamuraiCircleLoader duration={7000} bgColor={screenBackground} />;

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
      <StatsHeader
        title={t('statsPages.discipline.title')}
        description="Discipline, charge et performance"
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <ImportProgressBanner />

      {/* ========== VOLUME + SÉANCES RÉCENTES dans la même carte ========== */}
      <StatsSection>
        <View style={[styles.gridCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          {/* Titre volume */}
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardTitleDash, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.cardTitleText, { color: colors.textPrimary }]}>VOLUME D'ENTRAÎNEMENT</Text>
            <View style={[styles.cardTitleDash, { backgroundColor: '#06B6D4' }]} />
          </View>
          {/* MetricCards Sessions + Durée totale */}
          <View style={styles.grid}>
            <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'sessions', label: t('statsPages.discipline.sessions'), color: '#10B981', unit: '', icon: <Calendar size={18} color="#10B981" strokeWidth={2.5} /> })}>
              <MetricCard label={t('statsPages.discipline.sessions')} value={trainingData?.count || 0} unit={t('statsPages.discipline.total')} icon={<Calendar size={24} color="#10B981" strokeWidth={2.5} />} color="#10B981" sparklineData={sessionsSparkline} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'total_duration', label: t('statsPages.discipline.totalDuration'), color: '#06B6D4', unit: 'h', icon: <Timer size={18} color="#06B6D4" strokeWidth={2.5} /> })}>
              <MetricCard label={t('statsPages.discipline.totalDuration')} value={formatDurationHM(trainingData?.totalDuration || 0)} unit="" icon={<Award size={24} color="#06B6D4" strokeWidth={2.5} />} color="#06B6D4" sparklineData={trainingHistory.duration.map(h => ({ value: h.value }))} />
            </TouchableOpacity>
          </View>

          {/* Séances récentes — horizontal — fusionnées dans la même carte */}
          {allTrainingsData.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.cardTitleDash, { backgroundColor: '#10B981', opacity: 0.3 }]} />
                <Text style={[styles.cardSubtitleText, { color: colors.textMuted }]}>SÉANCES RÉCENTES ({allTrainingsData.length})</Text>
                <View style={[styles.cardTitleDash, { backgroundColor: '#10B981', opacity: 0.3 }]} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.historyScrollContent}
              >
                {allTrainingsData.map((entry, index) => {
                  const isFirst = index === 0;
                  const sportInfo = getSportById(entry.sport);
                  const sportColor = sportInfo?.color || '#10B981';
                  const sportIcon = sportInfo?.icon || 'trophy';
                  const intensityZone = entry.intensity ? getIntensityStatus(entry.intensity) : null;
                  return (
                    <TouchableOpacity
                      key={entry.id || index}
                      activeOpacity={0.7}
                      onPress={() => entry.id && router.push({ pathname: '/workout-detail', params: { id: entry.id.toString() } })}
                      style={[
                        styles.historyCard,
                        { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF', borderColor: isFirst ? sportColor : colors.border },
                        isFirst && styles.historyCardRecent,
                      ]}
                    >
                      {/* Sport icon + name */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <MaterialCommunityIcons name={sportIcon as any} size={16} color={sportColor} />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: sportColor, textTransform: 'uppercase', letterSpacing: 0.5 }} numberOfLines={1}>
                          {sportInfo?.name || entry.sport}
                        </Text>
                      </View>
                      <Text style={[styles.historyCardDate, { color: colors.textMuted }]}>
                        {format(new Date(entry.date), 'd MMM yyyy', { locale: fr })}
                      </Text>
                      {entry.duration > 0 && (
                        <Text style={[styles.historyCardMain, { color: isFirst ? sportColor : colors.textPrimary }]}>
                          {entry.duration}<Text style={styles.historyCardUnit}> min</Text>
                        </Text>
                      )}
                      {entry.calories > 0 && (
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
                          {entry.calories} kcal
                        </Text>
                      )}
                      {intensityZone && entry.intensity > 0 && (
                        <View style={[styles.historyCardBadge, { backgroundColor: `${intensityZone.color}20`, marginTop: 4 }]}>
                          <Text style={[styles.historyCardBadgeText, { color: intensityZone.color }]}>
                            RPE {entry.intensity}/10
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </StatsSection>

      {/* ========== CHARGE + INTENSITÉ dans la même carte ========== */}
      <StatsSection>
        <View style={[styles.gridCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardTitleDash, { backgroundColor: '#8B5CF6' }]} />
            <Text style={[styles.cardTitleText, { color: colors.textPrimary }]}>CHARGE D'ENTRAÎNEMENT</Text>
            <View style={[styles.cardTitleDash, { backgroundColor: '#EF4444' }]} />
          </View>
          {trainingData && trainingData.weeklyLoad > 0 && (
            <TouchableOpacity activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'load', label: t('statsPages.discipline.load'), color: '#8B5CF6', unit: 'pts', icon: <Flame size={18} color="#8B5CF6" strokeWidth={2.5} /> })} style={{ marginBottom: 12 }}>
              <StrainGauge strain={Math.min(trainingData.weeklyLoad / 50, 21)} label={t('statsPages.discipline.load')} />
            </TouchableOpacity>
          )}
          <View style={styles.grid}>
            <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'load', label: t('statsPages.discipline.weeklyLoad'), color: '#8B5CF6', unit: 'pts', icon: <Flame size={18} color="#8B5CF6" strokeWidth={2.5} /> })}>
              <MetricCard label={t('statsPages.discipline.weeklyLoad')} value={trainingData?.weeklyLoad || 0} unit="pts" icon={<Flame size={24} color="#8B5CF6" strokeWidth={2.5} />} color="#8B5CF6" sparklineData={trainingHistory.load.map(h => ({ value: h.value }))} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.gridItem} activeOpacity={0.7} onPress={() => setSelectedMetric({ key: 'intensity', label: t('statsPages.discipline.intensity'), color: '#EF4444', unit: '/10', icon: <Target size={18} color="#EF4444" strokeWidth={2.5} /> })}>
              <MetricCard label={t('statsPages.discipline.averageIntensity')} value={trainingData?.averageIntensity || 0} unit="/10" icon={<Target size={24} color="#EF4444" strokeWidth={2.5} />} color="#EF4444" sparklineData={trainingHistory.intensity.map(h => ({ value: h.value }))} />
            </TouchableOpacity>
          </View>
        </View>
      </StatsSection>

      {/* ========== INTENSITÉ / DURÉE — DualComparisonCard ========== */}
      <View style={styles.sectionDivider} />

      <StatsSection>
        <DualComparisonCard
          title="Intensité / Durée"
          leftLabel={t('statsPages.discipline.intensity')}
          rightLabel={t('statsPages.discipline.duration')}
          leftColor="#EF4444"
          rightColor="#10B981"
          leftHistory={trainingHistory.intensity}
          rightHistory={trainingHistory.duration}
          leftValue={trainingData?.averageIntensity || 0}
          rightValue={trainingData?.averageDuration || 0}
          unit=""
          leftUnit="/10"
          rightUnit="min"
          onPressLeft={() => setSelectedMetric({ key: 'intensity', label: t('statsPages.discipline.intensity'), color: '#EF4444', unit: '/10', icon: <Target size={18} color="#EF4444" strokeWidth={2.5} /> })}
          onPressRight={() => setSelectedMetric({ key: 'duration', label: t('statsPages.discipline.duration'), color: '#10B981', unit: 'min', icon: <Timer size={18} color="#10B981" strokeWidth={2.5} /> })}
        />
      </StatsSection>

      {/* ========== GRILLES HISTORIQUE ========== */}

      {/* Historique Intensite */}
      {trainingHistory.intensity.length > 0 && (
        <StatsSection>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({ key: 'intensity', label: t('statsPages.discipline.intensity'), color: '#EF4444', unit: '/10', icon: <Target size={18} color="#EF4444" strokeWidth={2.5} /> })}
            style={[styles.gridCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
          >
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardTitleDash, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.cardTitleText, { color: colors.textPrimary }]}>HISTORIQUE INTENSITÉ</Text>
              <View style={[styles.cardTitleDash, { backgroundColor: '#EF4444' }]} />
            </View>
            <MetricProgressGrid data={trainingHistory.intensity} unit="/10" healthRange={INTENSITY_RANGES} color="#EF4444" getStatus={getIntensityStatus} />
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* Historique Durée */}
      {trainingHistory.duration.length > 0 && (
        <StatsSection>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({ key: 'duration', label: t('statsPages.discipline.duration'), color: '#10B981', unit: 'min', icon: <Timer size={18} color="#10B981" strokeWidth={2.5} /> })}
            style={[styles.gridCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
          >
            <View style={styles.cardTitleRow}>
              <View style={[styles.cardTitleDash, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.cardTitleText, { color: colors.textPrimary }]}>HISTORIQUE DURÉE</Text>
              <View style={[styles.cardTitleDash, { backgroundColor: '#10B981' }]} />
            </View>
            <MetricProgressGrid data={trainingHistory.duration} unit="min" color="#10B981" showEvolution={true} evolutionGoal="increase" />
          </TouchableOpacity>
        </StatsSection>
      )}

      {/* ========== RADAR PERFORMANCE ========== */}
      <View style={styles.sectionDivider} />

      <StatsSection>
        <View style={[styles.gridCard, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardTitleDash, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.cardTitleText, { color: colors.textPrimary }]}>RADAR PERFORMANCE</Text>
            <View style={[styles.cardTitleDash, { backgroundColor: '#8B5CF6' }]} />
          </View>
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
  sectionDivider: {
    height: 1,
    marginHorizontal: 32,
    marginVertical: 8,
    opacity: 0.15,
    backgroundColor: '#888',
  },
  // Titre centré dans le corps (même style que MultiLineComparisonCard)
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 0,
    padding: 0,
  },
  cardTitleDash: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
  cardTitleText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  cardSubtitleText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  // Card wrapper pour MetricProgressGrid et Radar
  gridCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Historique horizontal
  historyScrollContent: {
    paddingHorizontal: 4,
    gap: 10,
  },
  historyCard: {
    width: 110,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  historyCardRecent: {
    borderWidth: 2,
  },
  historyCardBadge: {
    backgroundColor: '#10B98120',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 2,
  },
  historyCardBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyCardDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  historyCardMain: {
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
});
