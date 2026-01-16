// ============================================
// CORPS PAGE - Poids + Composition + Mensurations
// Version simple pour test initial
// ============================================

import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { SparklineCard } from '../charts/SparklineCard';
import { MetricCard } from '../charts/MetricCard';
import { RingChart } from '../charts/RingChart';
import { aggregateWeightData, aggregateCompositionData } from '@/lib/statsAggregation';
import { getLatestWeight, getLatestMeasurement } from '@/lib/database';
import { Target, TrendingUp, Activity, Droplet, Bone, Zap, Flame, Ruler } from 'lucide-react-native';

export const CorpsPage: React.FC = () => {
  const { colors } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const [weightData, setWeightData] = useState<any>(null);
  const [compositionData, setCompositionData] = useState<any>(null);
  const [latestWeight, setLatestWeight] = useState<any>(null);
  const [latestMeasurement, setLatestMeasurement] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [weight, composition, latest, measurement] = await Promise.all([
        aggregateWeightData(selectedPeriod),
        aggregateCompositionData(selectedPeriod),
        getLatestWeight(),
        getLatestMeasurement(),
      ]);
      setWeightData(weight);
      setCompositionData(composition);
      setLatestWeight(latest);
      setLatestMeasurement(measurement);
    } catch (error) {
      console.error('Error loading weight data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatsHeader
          title="Corps"
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

  const currentWeight = weightData?.values[weightData.values.length - 1]?.value || 0;
  const sparklineData = weightData?.values.map((v: any) => ({ value: v.value })) || [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <StatsHeader
        title="Corps"
        description="Poids, composition et mensurations"
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Section Poids & Objectif */}
      <StatsSection
        title="Poids & Objectif"
        description="Suivi de ton poids et progression vers ton objectif"
      >
        <View style={styles.grid}>
          {/* Poids actuel */}
          <View style={styles.gridItem}>
            <SparklineCard
              label="Poids actuel"
              value={currentWeight}
              unit="kg"
              sparklineData={sparklineData}
              color="#3B82F6"
              trend={weightData?.trend}
              change={weightData ? `${weightData.changePercent >= 0 ? '+' : ''}${weightData.changePercent.toFixed(1)}%` : undefined}
            />
          </View>

          {/* Objectif */}
          <View style={styles.gridItem}>
            <MetricCard
              label="Objectif"
              value="75"
              unit="kg"
              icon={<Target size={24} color="#10B981" strokeWidth={2.5} />}
              color="#10B981"
            />
          </View>
        </View>

        <View style={styles.grid}>
          {/* Poids perdu/gagné */}
          <View style={styles.gridItem}>
            <MetricCard
              label="Évolution"
              value={Math.abs(weightData?.changePercent || 0).toFixed(1)}
              unit="%"
              icon={<TrendingUp size={24} color="#F59E0B" strokeWidth={2.5} />}
              color="#F59E0B"
              trend={weightData?.trend}
            />
          </View>

          {/* Moyenne */}
          <View style={styles.gridItem}>
            <MetricCard
              label="Moyenne"
              value={weightData?.average.toFixed(1) || 0}
              unit="kg"
              icon={<Target size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
            />
          </View>
        </View>
      </StatsSection>

      {/* Section Composition Corporelle */}
      {latestWeight && (latestWeight.fat_percent || latestWeight.muscle_percent || latestWeight.water_percent) && (
        <StatsSection
          title="Composition Corporelle"
          description="Répartition de ta masse corporelle"
        >
          {/* Anneaux circulaires */}
          <RingChart
            rings={[
              latestWeight.fat_percent ? {
                percentage: latestWeight.fat_percent,
                color: '#F59E0B',
                label: 'Masse grasse',
                value: `${latestWeight.fat_percent.toFixed(1)}%`,
              } : null,
              latestWeight.muscle_percent ? {
                percentage: latestWeight.muscle_percent,
                color: '#10B981',
                label: 'Muscle',
                value: `${latestWeight.muscle_percent.toFixed(1)}%`,
              } : null,
              latestWeight.water_percent ? {
                percentage: latestWeight.water_percent,
                color: '#06B6D4',
                label: 'Eau',
                value: `${latestWeight.water_percent.toFixed(1)}%`,
              } : null,
            ].filter(Boolean) as any}
            size={200}
            strokeWidth={12}
          />

          {/* Autres métriques */}
          <View style={styles.grid}>
            {latestWeight.bone_mass && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Masse osseuse"
                  value={latestWeight.bone_mass.toFixed(1)}
                  unit="kg"
                  icon={<Bone size={24} color="#8B5CF6" strokeWidth={2.5} />}
                  color="#8B5CF6"
                />
              </View>
            )}
            {latestWeight.visceral_fat && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Graisse viscérale"
                  value={latestWeight.visceral_fat}
                  unit="/20"
                  icon={<Activity size={24} color="#EF4444" strokeWidth={2.5} />}
                  color="#EF4444"
                />
              </View>
            )}
          </View>

          <View style={styles.grid}>
            {latestWeight.bmr && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="BMR"
                  value={latestWeight.bmr}
                  unit="kcal"
                  icon={<Flame size={24} color="#F97316" strokeWidth={2.5} />}
                  color="#F97316"
                />
              </View>
            )}
            {latestWeight.metabolic_age && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Âge métabolique"
                  value={latestWeight.metabolic_age}
                  unit="ans"
                  icon={<Zap size={24} color="#6366F1" strokeWidth={2.5} />}
                  color="#6366F1"
                />
              </View>
            )}
          </View>
        </StatsSection>
      )}

      {/* Section Mensurations */}
      {latestMeasurement && (
        <StatsSection
          title="Mensurations"
          description="Mesures de ton corps"
        >
          <View style={styles.grid}>
            {latestMeasurement.chest && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Poitrine"
                  value={latestMeasurement.chest}
                  unit="cm"
                  icon={<Ruler size={24} color="#3B82F6" strokeWidth={2.5} />}
                  color="#3B82F6"
                />
              </View>
            )}
            {latestMeasurement.waist && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Taille"
                  value={latestMeasurement.waist}
                  unit="cm"
                  icon={<Ruler size={24} color="#F59E0B" strokeWidth={2.5} />}
                  color="#F59E0B"
                />
              </View>
            )}
          </View>

          <View style={styles.grid}>
            {latestMeasurement.hips && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Hanches"
                  value={latestMeasurement.hips}
                  unit="cm"
                  icon={<Ruler size={24} color="#8B5CF6" strokeWidth={2.5} />}
                  color="#8B5CF6"
                />
              </View>
            )}
            {latestMeasurement.shoulders && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Épaules"
                  value={latestMeasurement.shoulders}
                  unit="cm"
                  icon={<Ruler size={24} color="#10B981" strokeWidth={2.5} />}
                  color="#10B981"
                />
              </View>
            )}
          </View>

          <View style={styles.grid}>
            {latestMeasurement.left_arm && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Bras gauche"
                  value={latestMeasurement.left_arm}
                  unit="cm"
                  icon={<Ruler size={24} color="#EF4444" strokeWidth={2.5} />}
                  color="#EF4444"
                />
              </View>
            )}
            {latestMeasurement.right_arm && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Bras droit"
                  value={latestMeasurement.right_arm}
                  unit="cm"
                  icon={<Ruler size={24} color="#EF4444" strokeWidth={2.5} />}
                  color="#EF4444"
                />
              </View>
            )}
          </View>

          <View style={styles.grid}>
            {latestMeasurement.left_thigh && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Cuisse gauche"
                  value={latestMeasurement.left_thigh}
                  unit="cm"
                  icon={<Ruler size={24} color="#06B6D4" strokeWidth={2.5} />}
                  color="#06B6D4"
                />
              </View>
            )}
            {latestMeasurement.right_thigh && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Cuisse droite"
                  value={latestMeasurement.right_thigh}
                  unit="cm"
                  icon={<Ruler size={24} color="#06B6D4" strokeWidth={2.5} />}
                  color="#06B6D4"
                />
              </View>
            )}
          </View>

          <View style={styles.grid}>
            {latestMeasurement.left_calf && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Mollet gauche"
                  value={latestMeasurement.left_calf}
                  unit="cm"
                  icon={<Ruler size={24} color="#8B5CF6" strokeWidth={2.5} />}
                  color="#8B5CF6"
                />
              </View>
            )}
            {latestMeasurement.right_calf && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Mollet droit"
                  value={latestMeasurement.right_calf}
                  unit="cm"
                  icon={<Ruler size={24} color="#8B5CF6" strokeWidth={2.5} />}
                  color="#8B5CF6"
                />
              </View>
            )}
          </View>

          <View style={styles.grid}>
            {latestMeasurement.neck && (
              <View style={styles.gridItem}>
                <MetricCard
                  label="Cou"
                  value={latestMeasurement.neck}
                  unit="cm"
                  icon={<Ruler size={24} color="#F59E0B" strokeWidth={2.5} />}
                  color="#F59E0B"
                />
              </View>
            )}
          </View>
        </StatsSection>
      )}

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
});
