import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { HomeTabView } from '@/components/home/HomeTabView';
import { useTheme } from '@/lib/ThemeContext';
import { Stack } from 'expo-router';

// ============================================
// MOCK DATA - THOMAS SILVA (TRANSFORMATION)
// ============================================

const MOCK_DATA = {
  userName: 'Germain Del Jarret',
  // Using a placeholder or null for photo to show default icon if URL not valid
  profilePhoto: null, 
  dailyQuote: "La douleur est temporaire, l'abandon est définitif.",
  steps: 13567,
  stepsGoal: 10000,
  streak: 178,
  level: 24,
  rankName: 'Empereur',
  rankColor: '#F59E0B', // Gold
  
  // Weight & Transformation
  currentWeight: 76.8,
  targetWeight: 76.0,
  startWeight: 85.0,
  weightTrend: 'down' as const,
  // Generate a nice curve for the last 30 days
  weightHistory: Array.from({ length: 30 }, (_, i) => {
    // Linear progression from 80kg to 76.8kg with some noise
    const progress = i / 29;
    const base = 80 - (progress * (80 - 76.8));
    const noise = (Math.sin(i * 0.5) * 0.3);
    return Number((base + noise).toFixed(1));
  }).reverse(), // Recent first? No, usually charts expect chronological or reverse. HomeTabView expects what? 
  // HomeTabView passes it to Page1Monitoring which passes to FlatList reversed? 
  // Let's assume standard array. Page1Monitoring does `last30Weights` and renders via FlatList.
  // It renders `item: weight` and uses `index` to calculate date (daysAgo). 
  // `const daysAgo = last30Weights.length - 1 - index;`
  // So index 0 is the OLDEST? No. 
  // If `daysAgo = 29 - 0 = 29` (29 days ago). So index 0 is oldest.
  // So we should provide chronological order.
  
  // Hydration
  hydration: 3200,
  hydrationGoal: 3500,
  
  // Sleep
  sleepHours: 7.8, // 7h48
  sleepDebt: 0,
  sleepGoal: 8,
  
  // Workload
  workloadStatus: 'moderate' as const, // Optimal
  
  // Body Composition
  bodyFat: 16.0,
  muscleMass: 43.0,
  waterPercentage: 55.0,
  
  // Performance / Stats Page
  calories: 832,
  
  // Weekly Report
  weeklyReport: {
    weightChange: -0.8,
    trainingsCount: 5,
    avgSleepHours: 7.8,
    hydrationRate: 92,
    totalSteps: 94500,
  },
  
  // Daily Challenges
  dailyChallenges: [
    { id: '1', title: '8000 pas', completed: true },
    { id: '2', title: 'Hydratation 3L', completed: true },
    { id: '3', title: 'Entraînement', completed: false },
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