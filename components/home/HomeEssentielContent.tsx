import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { EssentielHeader } from './essentiel/EssentielHeader';
import { EssentielWeightCard } from './essentiel/EssentielWeightCard';
import { HydrationLottieCard } from '@/components/cards/HydrationLottieCard';
import { SleepLottieCard } from '@/components/cards/SleepLottieCard';
import { EssentielActivityCard } from './essentiel/EssentielActivityCard';
import { EssentielWeekSummary } from './essentiel/EssentielWeekSummary';

interface HomeEssentielContentProps {
  // Poids
  currentWeight?: number;
  targetWeight?: number;
  weightHistory?: number[];
  weightTrend?: 'up' | 'down' | 'stable';

  // Hydratation
  hydration?: number; // en ml
  hydrationGoal?: number; // en ml
  onAddWater?: (ml: number) => void;

  // Sommeil
  sleepHours?: number;
  sleepDebt?: number;
  sleepGoal?: number;

  // Activité
  steps?: number;
  stepsGoal?: number;
  calories?: number;
  caloriesGoal?: number;

  // Résumé semaine
  weekWeightChange?: number;
  weekHydrationRate?: number;
  weekAvgSleep?: number;
}

export const HomeEssentielContent: React.FC<HomeEssentielContentProps> = ({
  currentWeight,
  targetWeight,
  weightHistory = [],
  weightTrend,
  hydration = 0,
  hydrationGoal = 2500,
  onAddWater,
  sleepHours = 0,
  sleepDebt = 0,
  sleepGoal = 8,
  steps,
  stepsGoal,
  calories,
  caloriesGoal,
  weekWeightChange,
  weekHydrationRate,
  weekAvgSleep,
}) => {
  const handleAddWeight = () => {
    router.push('/stats?tab=poids');
  };

  const handleViewWeightStats = () => {
    router.push('/stats?tab=poids');
  };

  const handleWeekSummaryPress = () => {
    router.push('/stats');
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {/* Citation motivante */}
      <EssentielHeader />

      {/* CARTE POIDS - GRANDE */}
      <EssentielWeightCard
        currentWeight={currentWeight}
        objective={targetWeight}
        weekData={weightHistory}
        weekLabels={['L', 'M', 'M', 'J', 'V', 'S', 'D']}
        trend={weightTrend}
        onAddWeight={handleAddWeight}
        onViewStats={handleViewWeightStats}
      />

      {/* Hydratation + Sommeil côte à côte */}
      <View style={styles.row}>
        <HydrationLottieCard
          currentMl={hydration}
          goalMl={hydrationGoal}
          onAddMl={onAddWater}
        />
        <SleepLottieCard
          hours={sleepHours}
          quality={0}
          debt={sleepDebt}
          goal={sleepGoal}
        />
      </View>

      {/* Activité / Calories */}
      <EssentielActivityCard
        steps={steps}
        stepsGoal={stepsGoal}
        calories={calories}
        caloriesGoal={caloriesGoal}
      />

      {/* Résumé de la semaine */}
      <EssentielWeekSummary
        weightChange={weekWeightChange}
        hydrationRate={weekHydrationRate}
        avgSleep={weekAvgSleep}
        onPress={handleWeekSummaryPress}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
});
