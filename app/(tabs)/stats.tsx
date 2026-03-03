// ============================================
// STATS SCREEN - Point d'entree principal
// Utilise le nouveau StatsTabViewNew avec 6 onglets + FAB
// ============================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useLocalSearchParams } from 'expo-router';
import { StatsTabViewNew } from '@/components/stats/StatsTabViewNew';
import { ContextualTip } from '@/components/ContextualTip';

type StatsTab = 'discipline' | 'poids' | 'composition' | 'mesures' | 'vitalite' | 'performance' | 'sante';

export default function StatsScreen() {
  const { colors, screenBackground } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();

  // Validation du param tab avec liste blanche
  const validTabs: StatsTab[] = ['discipline', 'poids', 'composition', 'mesures', 'vitalite', 'performance', 'sante'];

  const validatedTab: StatsTab | undefined = React.useMemo(() => {
    if (params?.tab && validTabs.includes(params.tab as StatsTab)) {
      return params.tab as StatsTab;
    }
    return undefined;
  }, [params?.tab]);

  return (
    <View style={[styles.container, { backgroundColor: screenBackground }]}>
      <StatsTabViewNew initialTab={validatedTab} />

      {/* Tip contextuel */}
      <ContextualTip tipId="stats" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
