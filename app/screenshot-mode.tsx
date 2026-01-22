import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { HomeTabView } from '@/components/home/HomeTabView';
import { useTheme } from '@/lib/ThemeContext';
import { Stack } from 'expo-router';

// ============================================
// MOCK DATA - GERMAIN (DRAMATIC TRANSFORMATION)
// 35kg weight loss: 110kg → 75kg
// ============================================

const MOCK_DATA = {
  userName: 'Germain',
  profilePhoto: null,
  dailyQuote: "La douleur est temporaire, l'abandon est définitif.",
  steps: 15834,
  stepsGoal: 10000,
  streak: 267,
  level: 34,
  rankName: 'Empereur',
  rankColor: '#F59E0B',

  // Weight & Dramatic Transformation (35kg lost!)
  currentWeight: 75.0,
  targetWeight: 72.0,
  startWeight: 110.0,
  weightTrend: 'down' as const,
  // Generate dramatic weight loss curve for last 30 days (95kg → 75kg)
  // Shows visible progress with natural fluctuations
  weightHistory: Array.from({ length: 30 }, (_, i) => {
    const progress = i / 29;
    // Exponential curve for realistic weight loss (faster at start, slower at end)
    const exponentialFactor = 1 - Math.pow(progress, 0.7);
    const base = 75.0 + (exponentialFactor * 20.0); // 95kg → 75kg
    // Add natural daily fluctuations (water retention, meals, etc.)
    const dailyNoise = Math.sin(i * 0.8) * 0.4 + Math.cos(i * 1.3) * 0.3;
    return Number((base + dailyNoise).toFixed(1));
  }),

  // Hydration (excellent consistency)
  hydration: 3800,
  hydrationGoal: 3500,

  // Sleep (optimized recovery)
  sleepHours: 8.2,
  sleepDebt: 0,
  sleepGoal: 8,

  // Workload
  workloadStatus: 'moderate' as const,

  // Body Composition (post-transformation)
  bodyFat: 13.5,      // Down from ~38% at 110kg
  muscleMass: 48.5,   // Maintained/gained muscle during cut
  waterPercentage: 61.0,

  // Performance / Stats Page
  calories: 2450,     // Daily calorie intake

  // Weekly Report (impressive stats)
  weeklyReport: {
    weightChange: -1.4,        // Strong weekly loss
    trainingsCount: 6,         // Very consistent
    avgSleepHours: 8.1,        // Excellent recovery
    hydrationRate: 97,         // Nearly perfect
    totalSteps: 108450,        // Very active
  },

  // Daily Challenges (all completed)
  dailyChallenges: [
    { id: '1', title: '8000 pas', completed: true },
    { id: '2', title: 'Hydratation 3L', completed: true },
    { id: '3', title: 'Entraînement', completed: true },
  ],
};

// Fix Weight History Order if needed.
// Page1Monitoring: `const last30Weights = weightHistory.slice(-30);`
// `renderItem`: `const daysAgo = last30Weights.length - 1 - index;`
// If index=0 (first item), daysAgo=29. So first item is oldest.
// My generation above: `i=0` -> `80`. `i=29` -> `76.8`.
// So `[80, ..., 76.8]` (Oldest to Newest). This matches.

export default function ScreenshotModeApp() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />
      
      <HomeTabView
        // Identity
        userName={MOCK_DATA.userName}
        profilePhoto={MOCK_DATA.profilePhoto}
        dailyQuote={MOCK_DATA.dailyQuote}
        
        // Gamification
        steps={MOCK_DATA.steps}
        stepsGoal={MOCK_DATA.stepsGoal}
        streak={MOCK_DATA.streak}
        level={MOCK_DATA.level}
        rankName={MOCK_DATA.rankName}
        rankColor={MOCK_DATA.rankColor}
        
        // Weight
        currentWeight={MOCK_DATA.currentWeight}
        targetWeight={MOCK_DATA.targetWeight}
        startWeight={MOCK_DATA.startWeight}
        weightHistory={MOCK_DATA.weightHistory}
        weightTrend={MOCK_DATA.weightTrend}
        
        // Body Composition (New Props)
        bodyFat={MOCK_DATA.bodyFat}
        muscleMass={MOCK_DATA.muscleMass}
        waterPercentage={MOCK_DATA.waterPercentage}
        
        // Vitals
        hydration={MOCK_DATA.hydration}
        hydrationGoal={MOCK_DATA.hydrationGoal}
        sleepHours={MOCK_DATA.sleepHours}
        sleepDebt={MOCK_DATA.sleepDebt}
        sleepGoal={MOCK_DATA.sleepGoal}
        workloadStatus={MOCK_DATA.workloadStatus}
        calories={MOCK_DATA.calories}
        
        // Reports & Challenges
        weeklyReport={MOCK_DATA.weeklyReport}
        dailyChallenges={MOCK_DATA.dailyChallenges}
        
        // Callbacks (No-op or Alert)
        onAddWeight={() => {}}
        onAddWater={() => {}}
        onShareReport={() => {}}
        refreshTrigger={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});