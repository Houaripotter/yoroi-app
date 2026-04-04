// ============================================
// ENTRAÎNEMENT PAGE - Charge + Volume + Récupération
// Version simple pour test initial
// ============================================

import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { StatsHeader, Period } from '../StatsHeader';
import { StatsSection } from '../StatsSection';
import { MetricCard } from '../charts/MetricCard';
import { aggregateTrainingData } from '@/lib/statsAggregation';
import { Flame, Dumbbell, Clock, Target } from 'lucide-react-native';
import { logger } from '@/lib/security/logger';

export const EntrainementPage: React.FC = () => {
  const { colors } = useTheme();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('30j');
  const [trainingData, setTrainingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await aggregateTrainingData(selectedPeriod);
      setTrainingData(data);
    } catch (error) {
      logger.error('Error loading training data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatsHeader
          title="Entraînement"
          description="Charge, volume et performance"
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
        title="Entraînement"
        description="Charge, volume et performance"
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Section Charge & Intensité */}
      <StatsSection
        title="Charge & Intensité"
        description="Charge hebdomadaire et intensité moyenne"
      >
        <View style={styles.grid}>
          {/* Charge hebdo */}
          <View style={styles.gridItem}>
            <MetricCard
              label="Charge hebdo"
              value={trainingData?.weeklyLoad || 0}
              unit="pts"
              icon={<Flame size={24} color="#8B5CF6" strokeWidth={2.5} />}
              color="#8B5CF6"
            />
          </View>

          {/* Intensité moyenne */}
          <View style={styles.gridItem}>
            <MetricCard
              label="Intensité moy"
              value={trainingData?.averageIntensity.toFixed(1) || 0}
              unit="/10"
              icon={<Target size={24} color="#EF4444" strokeWidth={2.5} />}
              color="#EF4444"
            />
          </View>
        </View>
      </StatsSection>

      {/* Section Volume */}
      <StatsSection
        title="Volume"
        description="Nombre de séances et durée totale"
      >
        <View style={styles.grid}>
          {/* Séances */}
          <View style={styles.gridItem}>
            <MetricCard
              label="Séances"
              value={trainingData?.count || 0}
              unit="séances"
              icon={<Dumbbell size={24} color="#10B981" strokeWidth={2.5} />}
              color="#10B981"
            />
          </View>

          {/* Durée totale */}
          <View style={styles.gridItem}>
            <MetricCard
              label="Durée totale"
              value={((trainingData?.totalDuration || 0) / 60).toFixed(1)}
              unit="h"
              icon={<Clock size={24} color="#06B6D4" strokeWidth={2.5} />}
              color="#06B6D4"
            />
          </View>
        </View>
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
});
