// ============================================
// ANALYSE PAGE - Comparaisons + Corrélations + Progression
// Version simple pour test initial
// ============================================

import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { ModernLineChart } from '../charts/ModernLineChart';
import { ComparisonChart } from '../charts/ComparisonChart';
import { RadarChart } from '../charts/RadarChart';
import { aggregateWeightData, aggregateTrainingData, aggregateCompositionData, calculateCorrelation } from '@/lib/statsAggregation';
import { TrendingUp, Zap, Target, Award, AlertCircle, TrendingDown, Activity } from 'lucide-react-native';
import { healthConnect } from '@/lib/healthConnect';

export const AnalysePage: React.FC = () => {
  const { colors } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const [weightData, setWeightData] = useState<any>(null);
  const [trainingData, setTrainingData] = useState<any>(null);
  const [compositionData, setCompositionData] = useState<any>(null);
  const [vitalityScore, setVitalityScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [weight, training, composition] = await Promise.all([
        aggregateWeightData(selectedPeriod),
        aggregateTrainingData(selectedPeriod),
        aggregateCompositionData(selectedPeriod),
      ]);
      setWeightData(weight);
      setTrainingData(training);
      setCompositionData(composition);

      // Calculer score vitalité depuis données santé
      try {
        const [sleepData, hydrationData, heartRateData] = await Promise.all([
          healthConnect.getLastSleep(),
          healthConnect.getTodayHydration(),
          healthConnect.getTodayHeartRate(),
        ]);

        let vitality = 0;
        let factors = 0;

        // Score sommeil (0-35 points) - 8h = 100%
        if (sleepData?.duration) {
          const sleepHours = sleepData.duration / 60;
          const sleepScore = Math.min((sleepHours / 8) * 35, 35);
          vitality += sleepScore;
          factors++;
        }

        // Score hydratation (0-25 points) - 2500ml = 100%
        if (hydrationData?.amount) {
          const hydrationScore = Math.min((hydrationData.amount / 2500) * 25, 25);
          vitality += hydrationScore;
          factors++;
        }

        // Score cardiaque (0-20 points) - FC repos basse = mieux
        if (heartRateData?.resting) {
          // FC repos idéale athlète: 50-60 BPM
          const restingHR = heartRateData.resting;
          const hrScore = restingHR < 50 ? 20 : restingHR < 60 ? 18 : restingHR < 70 ? 15 : restingHR < 80 ? 10 : 5;
          vitality += hrScore;
          factors++;
        }

        // Score activité (0-20 points) - basé sur les entraînements
        if (training?.count) {
          const activityScore = Math.min((training.count / 15) * 20, 20);
          vitality += activityScore;
          factors++;
        }

        // Si on n'a pas de données santé, utiliser un score par défaut basé sur l'activité
        if (factors === 0) {
          const defaultScore = training?.count ? Math.min(50 + (training.count * 3), 85) : 50;
          setVitalityScore(Math.round(defaultScore));
        } else {
          // Normaliser le score sur 100
          const maxPossible = factors === 4 ? 100 : factors * 25;
          const normalizedScore = (vitality / maxPossible) * 100;
          setVitalityScore(Math.round(normalizedScore));
        }
      } catch (healthError) {
        // Fallback si erreur santé
        const defaultScore = training?.count ? Math.min(50 + (training.count * 3), 85) : 50;
        setVitalityScore(Math.round(defaultScore));
      }
    } catch (error) {
      console.error('Error loading analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatsHeader
          title="Analyse"
          description="Insights et progression globale"
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
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <StatsHeader
        title="Analyse"
        description="Insights et progression globale"
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Section Comparaisons */}
      <StatsSection
        title="Comparaisons"
        description="Évolution de tes métriques clés superposées"
      >
        {weightData && compositionData?.bodyFat ? (
          <ComparisonChart
            series={[
              {
                label: 'Poids',
                data: weightData.values.map((v: any) => ({ value: v.value })),
                color: '#3B82F6',
              },
              compositionData.bodyFat ? {
                label: 'Masse grasse',
                data: compositionData.bodyFat.values.map((v: any) => ({ value: v.value })),
                color: '#F59E0B',
              } : null,
            ].filter(Boolean) as any}
            height={220}
          />
        ) : weightData ? (
          <ModernLineChart
            data={weightData.values}
            color="#3B82F6"
            label="Poids"
          />
        ) : null}
      </StatsSection>

      {/* Section Corrélations */}
      <StatsSection
        title="Corrélations"
        description="Insights basés sur tes données"
      >
        {/* Insight Entraînement */}
        <View style={styles.insightCard}>
          <View style={[styles.insightIconContainer, { backgroundColor: `${colors.accent}15` }]}>
            <Zap size={24} color={colors.accentText} strokeWidth={2.5} />
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
              Volume d'entraînement
            </Text>
            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
              {trainingData && trainingData.count > 0
                ? `${trainingData.count} séances cette période avec une intensité moyenne de ${trainingData.averageIntensity.toFixed(1)}/10. ${trainingData.count >= 12 ? 'Excellent rythme!' : 'Tu peux augmenter la fréquence.'}`
                : 'Pas encore assez de données pour analyser.'}
            </Text>
          </View>
        </View>

        {/* Insight Progression Poids */}
        {weightData && (
          <View style={[styles.insightCard, { marginTop: 12 }]}>
            <View style={[styles.insightIconContainer, { backgroundColor: weightData.trend === 'up' ? '#10B98115' : weightData.trend === 'down' ? '#EF444415' : '#8B5CF615' }]}>
              {weightData.trend === 'up' ? (
                <TrendingUp size={24} color="#10B981" strokeWidth={2.5} />
              ) : weightData.trend === 'down' ? (
                <TrendingDown size={24} color="#EF4444" strokeWidth={2.5} />
              ) : (
                <Activity size={24} color="#8B5CF6" strokeWidth={2.5} />
              )}
            </View>
            <View style={styles.insightContent}>
              <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
                Évolution du poids
              </Text>
              <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                {weightData.trend === 'up'
                  ? `Poids en hausse de ${Math.abs(weightData.changePercent).toFixed(1)}%. Vérifie ton apport calorique.`
                  : weightData.trend === 'down'
                  ? `Poids en baisse de ${Math.abs(weightData.changePercent).toFixed(1)}%. Tu es sur la bonne voie!`
                  : `Poids stable (${Math.abs(weightData.changePercent).toFixed(1)}%). Continue ton équilibre actuel.`}
              </Text>
            </View>
          </View>
        )}

        {/* Insight Composition */}
        {compositionData?.bodyFat && (
          <View style={[styles.insightCard, { marginTop: 12 }]}>
            <View style={[styles.insightIconContainer, { backgroundColor: '#F59E0B15' }]}>
              <Target size={24} color="#F59E0B" strokeWidth={2.5} />
            </View>
            <View style={styles.insightContent}>
              <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
                Composition corporelle
              </Text>
              <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                {compositionData.bodyFat.trend === 'down'
                  ? `Masse grasse en baisse de ${Math.abs(compositionData.bodyFat.changePercent).toFixed(1)}%. Excellent progrès!`
                  : `Masse grasse moyenne: ${compositionData.bodyFat.average.toFixed(1)}%. Continue tes efforts.`}
              </Text>
            </View>
          </View>
        )}
      </StatsSection>

      {/* Section Progression Globale */}
      <StatsSection
        title="Progression Globale"
        description="Tes scores globaux"
      >
        <View style={styles.grid}>
          {/* Score Discipline */}
          <View style={styles.gridItem}>
            <MetricCard
              label="Discipline"
              value={(trainingData?.count || 0) * 10}
              unit="pts"
              icon={<Target size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
            />
          </View>

          {/* Score Performance */}
          <View style={styles.gridItem}>
            <MetricCard
              label="Performance"
              value={trainingData?.averageIntensity.toFixed(1) || 0}
              unit="/10"
              icon={<Award size={24} color="#EF4444" strokeWidth={2.5} />}
              color="#EF4444"
            />
          </View>
        </View>

        <View style={styles.grid}>
          {/* Score Vitalité */}
          <View style={styles.gridItem}>
            <MetricCard
              label="Vitalité"
              value={vitalityScore.toString()}
              unit="/100"
              icon={<Zap size={24} color="#10B981" strokeWidth={2.5} />}
              color="#10B981"
            />
          </View>

          {/* Progression */}
          <View style={styles.gridItem}>
            <MetricCard
              label="Progression"
              value={weightData?.changePercent.toFixed(1) || 0}
              unit="%"
              icon={<TrendingUp size={24} color="#F59E0B" strokeWidth={2.5} />}
              color="#F59E0B"
              trend={weightData?.trend}
            />
          </View>
        </View>
      </StatsSection>

      {/* Section Vue Radar */}
      <StatsSection
        title="Vue Radar"
        description="Visualisation globale de tes performances"
      >
        <RadarChart
          data={[
            {
              label: 'Discipline',
              value: Math.min(((trainingData?.count || 0) / 15) * 100, 100), // Max 15 séances = 100%
            },
            {
              label: 'Performance',
              value: ((trainingData?.averageIntensity || 0) / 10) * 100,
            },
            {
              label: 'Vitalité',
              value: vitalityScore,
            },
            {
              label: 'Composition',
              value: compositionData?.bodyFat
                ? Math.max(100 - compositionData.bodyFat.average * 2, 50) // Inverse: moins de graisse = mieux
                : 70,
            },
            {
              label: 'Progression',
              value: weightData
                ? Math.min(Math.abs(weightData.changePercent) * 10 + 50, 100)
                : 50,
            },
          ]}
          size={280}
          color="#8B5CF6"
        />
      </StatsSection>

      <View style={{ height: 40 }} />
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
  insightCard: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 16,
  },
  insightIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
    justifyContent: 'center',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  insightText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
