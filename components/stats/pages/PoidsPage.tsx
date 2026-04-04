// ============================================
// POIDS PAGE - Suivi du poids avec graphiques
// Toutes les cartes sont cliquables avec modal graphique
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
import { HistoryScrollCard } from '../charts/HistoryScrollCard';
import { SimpleMetricCard } from '../charts/SimpleMetricCard';
import { StatsDetailModal } from '../StatsDetailModal';
import { aggregateWeightData } from '@/lib/statsAggregation';
import { Target, TrendingUp, TrendingDown, Scale, BarChart3 } from 'lucide-react-native';
import { BMI_RANGES, getMetricStatus } from '@/lib/healthRanges';
import { getProfile, getAllWeights } from '@/lib/database';
import { getUserSettings } from '@/lib/storage';
import { format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { StatsExplanation } from '../StatsExplanation';
import { logger } from '@/lib/security/logger';

export const PoidsPage: React.FC = () => {
  const { colors } = useTheme();
  const { t, language } = useI18n();
  const { handleScroll: onScrollContext } = useScrollContext();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');

  // Get locale for date formatting
  const dateLocale = language === 'fr' ? fr : enUS;

  // Traduire les labels des zones BMI
  const translatedBMIZones = BMI_RANGES.zones.map(zone => ({
    ...zone,
    label: zone.label === 'Sous-poids' ? t('stats.bmiUnderweight') :
           zone.label === 'Normal' ? t('stats.bmiNormal') :
           zone.label === 'Surpoids' ? t('stats.bmiOverweight') :
           zone.label === 'Obésité' ? t('stats.bmiObese') : zone.label
  }));

  // BMI_RANGES traduit
  const translatedBMIRanges = {
    ...BMI_RANGES,
    zones: translatedBMIZones
  };
  const [weightData, setWeightData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bmi, setBmi] = useState<number | null>(null);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [bmiHistory, setBmiHistory] = useState<any[]>([]);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [userGoal, setUserGoal] = useState<'lose' | 'maintain' | 'gain'>('lose');
  const [allWeightsData, setAllWeightsData] = useState<any[]>([]);
  const [targetWeight, setTargetWeight] = useState<number | null>(null);

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
      const [data, profile, allWeights, settings] = await Promise.all([
        aggregateWeightData(selectedPeriod),
        getProfile(),
        getAllWeights(),
        getUserSettings()
      ]);
      setWeightData(data);

      // Récupérer l'objectif utilisateur
      if (settings?.goal) {
        // Mapper les valeurs de goal vers lose/maintain/gain
        if (settings.goal === 'lose' || settings.goal === 'lose_weight') {
          setUserGoal('lose');
        } else if (settings.goal === 'gain' || settings.goal === 'gain_muscle') {
          setUserGoal('gain');
        } else {
          setUserGoal('maintain');
        }
      }
      if (settings?.weight_goal) {
        setTargetWeight(settings.weight_goal);
      }

      // Sauvegarder toutes les données pour le modal
      if (allWeights && allWeights.length > 0) {
        setAllWeightsData(allWeights);
      }

      // Calculer l'IMC
      if (data && data.values && data.values.length > 0 && profile?.height_cm) {
        const latestWeight = data.values[data.values.length - 1].value;
        const heightM = profile.height_cm / 100;
        const calculatedBmi = latestWeight / (heightM * heightM);
        setBmi(calculatedBmi);
        setHeightCm(profile.height_cm);
      }

      // Préparer l'historique selon la période
      if (allWeights && allWeights.length > 0) {
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

        const filtered = allWeights
          .filter((w: any) => new Date(w.date) >= cutoffDate)
          .reverse();

        setWeightHistory(
          filtered.map((w: any) => ({
            date: w.date,
            value: w.weight,
          }))
        );

        if (profile?.height_cm) {
          const heightM = profile.height_cm / 100;
          setBmiHistory(
            filtered.map((w: any) => ({
              date: w.date,
              value: w.weight / (heightM * heightM),
            }))
          );
        }
      }
    } catch (error) {
      logger.error('Error loading weight data:', error);
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
      case 'weight':
        return sortedWeights.map((w) => ({
          value: w.weight,
          label: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
          date: w.date,
        }));

      case 'bmi':
        if (!heightCm) return [];
        const heightM = heightCm / 100;
        return sortedWeights.map((w) => ({
          value: w.weight / (heightM * heightM),
          label: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
          date: w.date,
        }));

      case 'evolution':
        // Calculer l'évolution par rapport au premier poids
        const firstWeight = sortedWeights[0]?.weight || 0;
        return sortedWeights.map((w) => ({
          value: firstWeight ? ((w.weight - firstWeight) / firstWeight) * 100 : 0,
          label: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
          date: w.date,
        }));

      case 'average':
        // Moyenne mobile sur 7 jours
        return sortedWeights.map((w, index) => {
          const start = Math.max(0, index - 6);
          const slice = sortedWeights.slice(start, index + 1);
          const avg = slice.reduce((sum, s) => sum + s.weight, 0) / slice.length;
          return {
            value: avg,
            label: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
            date: w.date,
          };
        });

      case 'target':
        // Ligne constante pour l'objectif avec le poids actuel superposé
        return sortedWeights.map((w) => ({
          value: w.weight,
          label: format(new Date(w.date), 'd MMM', { locale: dateLocale }),
          date: w.date,
        }));

      default:
        return [];
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatsHeader
          title={t('statsPages.weight.title')}
          description={t('statsPages.weight.description')}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  const currentWeight = weightData?.values?.[weightData.values.length - 1]?.value || 0;
  const bmiStatus = bmi ? getMetricStatus(bmi, translatedBMIRanges) : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      contentContainerStyle={styles.content}
      onScroll={onScrollContext}
      scrollEventThrottle={16}
    >
      {/* Header */}
      <StatsHeader
        title={t('statsPages.weight.title')}
        description={t('statsPages.weight.description')}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      <StatsExplanation 
        title="Poids & IMC"
        text="Le Poids est ton indicateur de masse globale. L'IMC (Indice de Masse Corporelle) permet de situer ton poids par rapport à ta taille. Utilise la moyenne mobile pour lisser les variations quotidiennes dues à l'eau."
        color="#3B82F6"
      />

      {/* Section Graphique Principal */}
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

      {/* Section Métriques Clés - TOUTES CLIQUABLES */}
      <StatsSection
        title={t('statsPages.weight.keyMetrics')}
        description={t('statsPages.clickToSeeHistory')}
      >
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'weight',
              label: t('statsPages.weight.currentWeight'),
              color: '#3B82F6',
              unit: 'kg',
              icon: <Scale size={18} color="#3B82F6" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.weight.currentWeight')}
              value={currentWeight || 0}
              unit="kg"
              icon={<Scale size={24} color="#3B82F6" strokeWidth={2.5} />}
              color="#3B82F6"
              trend={weightData?.trend}
              change={weightData ? `${weightData.changePercent >= 0 ? '+' : ''}${weightData.changePercent.toFixed(1)}%` : undefined}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'target',
              label: t('statsPages.weight.target'),
              color: '#10B981',
              unit: 'kg',
              icon: <Target size={18} color="#10B981" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.weight.target')}
              value={targetWeight ?? 0}
              unit="kg"
              icon={<Target size={24} color="#10B981" strokeWidth={2.5} />}
              color="#10B981"
            />
          </TouchableOpacity>
        </View>
      </StatsSection>

      {/* Historique Poids - Cartes Scrollables */}
      <StatsSection
        title={t('statsPages.weight.weightHistory')}
        description={`${t('statsPages.evolutionOn')} ${getPeriodDescription(selectedPeriod)}`}
      >
        {weightHistory.length > 0 ? (
          <HistoryScrollCard
            data={weightHistory}
            unit="kg"
            color="#3B82F6"
            userGoal={userGoal}
          />
        ) : (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t('statsPages.noDataForPeriod')}
          </Text>
        )}
      </StatsSection>

      {/* IMC avec barre animée - CLIQUABLE */}
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
            onPress={() => setSelectedMetric({
              key: 'bmi',
              label: t('stats.bmi'),
              color: bmiStatus?.color || '#6366F1',
              unit: '',
              icon: <Scale size={18} color={bmiStatus?.color || '#6366F1'} strokeWidth={2.5} />,
            })}
          />
        </StatsSection>
      )}

      {/* Historique IMC - Cartes Scrollables */}
      {bmiHistory.length > 0 && (
        <StatsSection
          title={t('statsPages.weight.bmiHistory')}
          description={`${t('statsPages.weight.bmiHistoryDesc')} ${getPeriodDescription(selectedPeriod)}`}
        >
          <HistoryScrollCard
            data={bmiHistory}
            unit=""
            healthRange={translatedBMIRanges}
            color="#6366F1"
            getStatus={(value) => getMetricStatus(value, translatedBMIRanges)}
          />
        </StatsSection>
      )}

      {/* Statistiques - TOUTES CLIQUABLES */}
      <StatsSection
        title={t('statsPages.weight.statistics')}
        description={t('statsPages.clickToSeeHistory')}
      >
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'evolution',
              label: t('statsPages.weight.evolution'),
              color: weightData?.trend === 'up' ? '#F59E0B' : '#10B981',
              unit: '%',
              icon: weightData?.trend === 'up'
                ? <TrendingUp size={18} color="#F59E0B" strokeWidth={2.5} />
                : <TrendingDown size={18} color="#10B981" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.weight.evolution')}
              value={Math.abs(weightData?.changePercent || 0).toFixed(1)}
              unit="%"
              icon={weightData?.trend === 'up' ? <TrendingUp size={24} color="#F59E0B" strokeWidth={2.5} /> : <TrendingDown size={24} color="#10B981" strokeWidth={2.5} />}
              color={weightData?.trend === 'up' ? '#F59E0B' : '#10B981'}
              trend={weightData?.trend}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            activeOpacity={0.7}
            onPress={() => setSelectedMetric({
              key: 'average',
              label: t('statsPages.weight.movingAverage'),
              color: '#8B5CF6',
              unit: 'kg',
              icon: <BarChart3 size={18} color="#8B5CF6" strokeWidth={2.5} />,
            })}
          >
            <MetricCard
              label={t('statsPages.weight.average')}
              value={weightData?.average?.toFixed(1) || 0}
              unit="kg"
              icon={<BarChart3 size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
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
          healthRange={selectedMetric.key === 'bmi' ? translatedBMIRanges : undefined}
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
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
