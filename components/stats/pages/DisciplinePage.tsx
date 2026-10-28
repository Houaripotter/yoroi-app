// ============================================
// DISCIPLINE PAGE - Charge et régularité
// Toutes les cartes sont cliquables avec modal graphique
// ============================================

import React, { useState, useEffect, useMemo } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { useScrollContext } from '@/lib/ScrollContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { StatsDetailModal } from '../StatsDetailModal';
import { SkeletonGrid } from '../SkeletonCard';
import { HistoryScrollCard } from '../charts/HistoryScrollCard';
import { ScrollableLineChart } from '../charts/ScrollableLineChart';
import { StrainGauge } from '../advanced/StrainGauge';
import { aggregateTrainingData } from '@/lib/statsAggregation';
import { getTrainings } from '@/lib/database';
import { Flame, Target, Calendar, Award, Timer } from 'lucide-react-native';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { StatsExplanation } from '../StatsExplanation';
import { logger } from '@/lib/security/logger';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

export const DisciplinePage: React.FC = () => {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const dateLocale = language === 'fr' ? fr : enUS;

  // Plage pour l'intensité d'entraînement
  const INTENSITY_RANGES = {
    min: 0,
    max: 10,
    unit: '/10',
    source: 'Échelle RPE',
    zones: [
      { label: t('statsPages.discipline.recovery'), start: 0, end: 3, color: '#22C55E', status: 'good' as const },
      { label: t('statsPages.discipline.moderate'), start: 4, end: 6, color: '#F59E0B', status: 'moderate' as const },
      { label: t('statsPages.discipline.intense'), start: 7, end: 8, color: '#EF4444', status: 'attention' as const },
      { label: t('statsPages.discipline.max'), start: 9, end: 10, color: '#DC2626', status: 'danger' as const },
    ],
  };

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('tout');
  const [trainingData, setTrainingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [allTrainingsData, setAllTrainingsData] = useState<any[]>([]);

  // Couleurs pour le pie chart
  const PIE_COLORS = ['#8B5CF6', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#3B82F6', '#F97316', '#14B8A6', '#A855F7'];

  // Répartition par discipline pour la période sélectionnée
  const disciplineBreakdown = useMemo(() => {
    if (!allTrainingsData.length) return [];
    const daysMap: Record<string, number> = {
      '7j': 7, '14j': 14, '30j': 30, '60j': 60, '90j': 90,
      '6m': 180, '9m': 270, '1a': 365, '2a': 730, 'tout': 9999, 'custom': 9999,
    };
    const days = daysMap[selectedPeriod] ?? 30;
    const cutoff = new Date(Date.now() - days * 86400000);
    const filtered = allTrainingsData.filter((t: any) => new Date(t.date) >= cutoff);
    const map: Record<string, { minutes: number; sessions: number }> = {};
    for (const t of filtered) {
      const sport = t.sport || 'Autre';
      if (!map[sport]) map[sport] = { minutes: 0, sessions: 0 };
      map[sport].minutes += t.duration || t.duration_minutes || 0;
      map[sport].sessions++;
    }
    const total = Object.values(map).reduce((s, v) => s + v.minutes, 0);
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, pct: total > 0 ? v.minutes / total : 0 }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [allTrainingsData, selectedPeriod]);

  // État pour le modal
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
        // 2 ans + 500 séances max (avant : full-scan + JOIN clubs)
        getTrainings(730, 500)
      ]);
      setTrainingData(data);

      // Sauvegarder toutes les données pour le modal
      if (allTrainings && allTrainings.length > 0) {
        setAllTrainingsData(allTrainings);
      }

      // Préparer l'historique selon la période
      if (allTrainings && allTrainings.length > 0) {
        const now = new Date();
        const daysMap: { [key: string]: number } = {
          '7j': 7, '14j': 14, '30j': 30, '60j': 60, '90j': 90,
          '6m': 180, '9m': 270, '1a': 365, '2a': 730, 'tout': 3650, 'custom': 3650,
        };
        const days = daysMap[selectedPeriod] || 7;
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        const filtered = allTrainings
          .filter((t: any) => new Date(t.date) >= cutoffDate)
          .reverse();

        // Historique intensité
        setTrainingHistory({
          intensity: filtered
            .filter((t: any) => t.intensity && t.intensity > 0)
            .map((t: any) => ({
              date: t.date,
              value: t.intensity,
            })),
          duration: filtered
            .filter((t: any) => (t.duration || t.duration_minutes) && (t.duration || t.duration_minutes) > 0)
            .map((t: any) => ({
              date: t.date,
              value: t.duration || t.duration_minutes,
            })),
          load: filtered
            .filter((t: any) => t.intensity && t.duration)
            .map((t: any) => ({
              date: t.date,
              value: (t.intensity * t.duration) / 60, // Charge = intensité * durée en heures
            })),
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

  // Helper to get period description
  const getPeriodDescription = (period: Period) => {
    const periodMap: { [key: string]: string } = {
      '7j': t('statsPages.days7'),
      '30j': t('statsPages.days30'),
      '90j': t('statsPages.days90'),
      'tout': t('statsPages.allPeriod'),
    };
    return periodMap[period] || t('statsPages.allPeriod');
  };

  // Préparer les données pour le modal selon la métrique sélectionnée
  const getModalData = () => {
    if (!selectedMetric || !allTrainingsData.length) return [];

    // Règle 3 : plus récent à GAUCHE → tri DESC
    const sortedTrainings = [...allTrainingsData].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    // Règle 4 : deux lignes (jour+mois / année)
    const fmtLabel = (d: Date) => `${format(d, 'd MMM', { locale: dateLocale })}\n${format(d, 'yyyy')}`;

    switch (selectedMetric.key) {
      case 'intensity':
        return sortedTrainings
          .filter(t => t.intensity && t.intensity > 0)
          .map((t) => ({
            value: t.intensity,
            label: fmtLabel(new Date(t.date)),
            date: t.date,
          }));

      case 'duration':
        return sortedTrainings
          .filter(t => t.duration && t.duration > 0)
          .map((t) => ({
            value: t.duration,
            label: fmtLabel(new Date(t.date)),
            date: t.date,
          }));

      case 'load':
        return sortedTrainings
          .filter(t => t.intensity && t.duration)
          .map((t) => ({
            value: (t.intensity * t.duration) / 60,
            label: fmtLabel(new Date(t.date)),
            date: t.date,
          }));

      case 'sessions':
        // Grouper par semaine
        const weeklyData: { [key: string]: number } = {};
        sortedTrainings.forEach(t => {
          const weekStart = format(new Date(t.date), 'w-yyyy');
          weeklyData[weekStart] = (weeklyData[weekStart] || 0) + 1;
        });
        return Object.entries(weeklyData).map(([week, count]) => ({
          value: count,
          label: `S${week.split('-')[0]}`,
          date: week,
        }));

      case 'total_duration':
        // Grouper par semaine
        const weeklyDuration: { [key: string]: number } = {};
        sortedTrainings.forEach(t => {
          const weekStart = format(new Date(t.date), 'w-yyyy');
          weeklyDuration[weekStart] = (weeklyDuration[weekStart] || 0) + (t.duration || 0);
        });
        return Object.entries(weeklyDuration).map(([week, duration]) => ({
          value: duration / 60, // En heures
          label: `S${week.split('-')[0]}`,
          date: week,
        }));

      default:
        return [];
    }
  };

  if (loading) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 16 }}>
        <StatsHeader
          title={t('statsPages.discipline.title')}
          description={t('statsPages.discipline.description')}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
        <SkeletonGrid count={4} cardHeight={160} />
      </ScrollView>
    );
  }

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
        title={t('statsPages.discipline.title')}
        description={t('statsPages.discipline.description')}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <StatsExplanation
        title="Discipline & Charge"
        text="La Discipline mesure ta régularité (fréquence des séances). La Charge d'entraînement est calculée en multipliant la durée par l'intensité (RPE). Elle permet de suivre ton volume de travail global pour optimiser tes cycles de progression et éviter les blessures."
        color="#8B5CF6"
      />

      {/* Pie chart répartition par discipline */}
      {disciplineBreakdown.length > 1 && (() => {
        const SIZE = 160;
        const INNER = 58;
        const cx = SIZE / 2;
        const cy = SIZE / 2;
        const r = SIZE / 2;

        // Calcul des arcs SVG
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        let startAngle = -90;
        const paths = disciplineBreakdown.map((d, i) => {
          const angle = d.pct * 360;
          const endAngle = startAngle + angle;
          const largeArc = angle > 180 ? 1 : 0;
          const x1 = cx + r * Math.cos(toRad(startAngle));
          const y1 = cy + r * Math.sin(toRad(startAngle));
          const x2 = cx + r * Math.cos(toRad(endAngle));
          const y2 = cy + r * Math.sin(toRad(endAngle));
          const xi1 = cx + INNER * Math.cos(toRad(startAngle));
          const yi1 = cy + INNER * Math.sin(toRad(startAngle));
          const xi2 = cx + INNER * Math.cos(toRad(endAngle));
          const yi2 = cy + INNER * Math.sin(toRad(endAngle));
          const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${INNER} ${INNER} 0 ${largeArc} 0 ${xi1} ${yi1} Z`;
          startAngle = endAngle;
          return { path, color: PIE_COLORS[i % PIE_COLORS.length], name: d.name, pct: d.pct };
        });

        return (
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <View style={{ backgroundColor: colors.backgroundCard ?? colors.card, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 14, letterSpacing: 0.5 }}>
                RÉPARTITION PAR DISCIPLINE
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
                {/* Donut */}
                <Svg width={SIZE} height={SIZE}>
                  <G>
                    {paths.map((p, i) => (
                      <Path key={i} d={p.path} fill={p.color} />
                    ))}
                  </G>
                </Svg>
                {/* Légende */}
                <View style={{ flex: 1, gap: 8 }}>
                  {disciplineBreakdown.slice(0, 6).map((d, i) => (
                    <View key={d.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                      <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <Text style={{ flex: 1, fontSize: 12, color: colors.textPrimary ?? colors.text }} numberOfLines={1}>{sansTiret(d.name)}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: PIE_COLORS[i % PIE_COLORS.length] }}>
                        {Math.round(d.pct * 100)}%
                      </Text>
                    </View>
                  ))}
                  {disciplineBreakdown.length > 6 && (
                    <Text style={{ fontSize: 11, color: colors.textMuted }}>+{disciplineBreakdown.length - 6} autres</Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        );
      })()}

      {/* Graphique de tendance principal */}
      <StatsSection
        title="Volume d'entraînement"
        description="Évolution de tes sessions sur la période"
      >
        <ScrollableLineChart
          data={trainingHistory.duration}
          color="#10B981"
          unit=" min"
          height={200}
          onPress={() => setSelectedMetric({
            key: 'duration',
            label: t('statsPages.discipline.duration'),
            color: '#10B981',
            unit: 'min',
            icon: <Timer size={18} color="#10B981" strokeWidth={2.5} />,
          })}
        />
      </StatsSection>

      {trainingData && trainingData.weeklyLoad > 0 && (
        <StatsSection
          title={t('statsPages.discipline.trainingLoad')}
          description={t('statsPages.discipline.trainingLoadDesc')}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'load',
              label: t('statsPages.discipline.load'),
              color: '#8B5CF6',
              unit: 'pts',
              icon: <Flame size={18} color="#8B5CF6" strokeWidth={2.5} />,
            })}
          >
            <StrainGauge
              strain={Math.min(trainingData.weeklyLoad / 50, 21)}
              label={t('statsPages.discipline.load')}
            />
          </TouchableOpacity>
        </StatsSection>
      )}

      <StatsSection
        title={t('statsPages.discipline.intensityAndVolume')}
        description={t('statsPages.clickToSeeChart')}
      >
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'load',
              label: t('statsPages.discipline.weeklyLoad'),
              color: '#8B5CF6',
              unit: 'pts',
              icon: <Flame size={18} color="#8B5CF6" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.discipline.weeklyLoad')}
              value={trainingData?.weeklyLoad || 0}
              unit="pts"
              icon={<Flame size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'intensity',
              label: t('statsPages.discipline.intensity'),
              color: '#EF4444',
              unit: '/10',
              icon: <Target size={18} color="#EF4444" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.discipline.averageIntensity')}
              value={trainingData?.averageIntensity?.toFixed(1) ?? '0'}
              unit="/10"
              icon={<Target size={24} color="#EF4444" strokeWidth={2.5} />}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>
      </StatsSection>

      <StatsSection
        title={t('statsPages.discipline.volume')}
        description={t('statsPages.discipline.volumeDesc')}
      >
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'sessions',
              label: t('statsPages.discipline.sessions'),
              color: '#10B981',
              unit: '',
              icon: <Calendar size={18} color="#10B981" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.discipline.sessions')}
              value={trainingData?.count || 0}
              unit={t('statsPages.discipline.total')}
              icon={<Calendar size={24} color="#10B981" strokeWidth={2.5} />}
              color="#10B981"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'total_duration',
              label: t('statsPages.discipline.totalDuration'),
              color: '#06B6D4',
              unit: 'h',
              icon: <Timer size={18} color="#06B6D4" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.discipline.totalDuration')}
              value={((trainingData?.totalDuration || 0) / 60).toFixed(1)}
              unit="h"
              icon={<Award size={24} color="#06B6D4" strokeWidth={2.5} />}
              color="#06B6D4"
            />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {/* Historique Intensité - CLIQUABLE */}
      <StatsSection
        title={t('statsPages.discipline.intensityHistory')}
        description={`${t('statsPages.discipline.intensityHistoryDesc')} ${getPeriodDescription(selectedPeriod)}`}
      >
        {trainingHistory.intensity.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'intensity',
              label: t('statsPages.discipline.intensity'),
              color: '#EF4444',
              unit: '/10',
              icon: <Target size={18} color="#EF4444" strokeWidth={2.5} />,
            })}
          >
            <HistoryScrollCard
              data={trainingHistory.intensity}
              unit="/10"
              healthRange={INTENSITY_RANGES}
              color="#EF4444"
              getStatus={getIntensityStatus}
            />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('statsPages.noDataForPeriod')}
          </Text>
        )}
      </StatsSection>

      {/* Historique Durée - CLIQUABLE */}
      <StatsSection
        title={t('statsPages.discipline.durationHistory')}
        description={`${t('statsPages.discipline.durationHistoryDesc')} ${getPeriodDescription(selectedPeriod)}`}
      >
        {trainingHistory.duration.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'duration',
              label: t('statsPages.discipline.duration'),
              color: '#10B981',
              unit: 'min',
              icon: <Timer size={18} color="#10B981" strokeWidth={2.5} />,
            })}
          >
            <HistoryScrollCard
              data={trainingHistory.duration}
              unit="min"
              color="#10B981"
              showEvolution={true}
              evolutionGoal="increase"
            />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('statsPages.noDataForPeriod')}
          </Text>
        )}
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
  grid: {
    flexDirection: 'row',
    gap: 16,
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
});
