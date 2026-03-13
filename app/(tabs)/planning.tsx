// ============================================
// PLANNING SCREEN — Séances uniquement
// ============================================

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, DeviceEventEmitter } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings, getClubs, Training, Club } from '@/lib/database';
import { PlanningSeancesContent } from '@/components/planning/PlanningSeancesContent';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SamuraiCircleLoader } from '@/components/SamuraiLoader';

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const { screenBackground } = useTheme();
  const [workouts, setWorkouts] = useState<Training[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [showLoader, setShowLoader] = useState(true);

  // Loader 7 secondes au montage
  useEffect(() => {
    const t = setTimeout(() => setShowLoader(false), 7000);
    return () => clearTimeout(t);
  }, []);

  const loadData = async () => {
    try {
      const [t, c] = await Promise.all([getTrainings(365), getClubs()]);
      setWorkouts(t);
      setClubs(c);
    } catch { /* silencieux */ }
  };

  useEffect(() => {
    loadData();
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', loadData);
    return () => sub.remove();
  }, []);

  if (showLoader) {
    return <SamuraiCircleLoader duration={7000} bgColor={screenBackground} />;
  }

  return (
    <ErrorBoundary>
      <View style={[styles.screen, { backgroundColor: screenBackground, paddingTop: insets.top }]}>
        <PlanningSeancesContent workouts={workouts} clubs={clubs} />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
