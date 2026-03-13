// ============================================
// STATS SCREEN - Point d'entree principal
// Utilise StatsTabViewNew avec 4 onglets
// ============================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useLocalSearchParams } from 'expo-router';
import { StatsTabViewNew } from '@/components/stats/StatsTabViewNew';

type StatsTab = 'dashboard' | 'corps' | 'training' | 'sante';

export default function StatsScreen() {
  const { screenBackground } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();

  const validTabs: StatsTab[] = ['dashboard', 'corps', 'training', 'sante'];

  const validatedTab: StatsTab | undefined = React.useMemo(() => {
    if (params?.tab && validTabs.includes(params.tab as StatsTab)) {
      return params.tab as StatsTab;
    }
    return undefined;
  }, [params?.tab]);

  return (
    <View style={[styles.container, { backgroundColor: screenBackground }]}>
      <StatsTabViewNew initialTab={validatedTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
