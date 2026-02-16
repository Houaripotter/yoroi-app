// ============================================
// STATS SCREEN - Point d'entrée principal
// Utilise le nouveau StatsTabViewNew avec 6 onglets + FAB
// ============================================

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useLocalSearchParams } from 'expo-router';
import { StatsTabViewNew } from '@/components/stats/StatsTabViewNew';
import { FeatureDiscoveryModal } from '@/components/FeatureDiscoveryModal';
import { PAGE_TUTORIALS, hasVisitedPage, markPageAsVisited } from '@/lib/featureDiscoveryService';

type StatsTab = 'discipline' | 'poids' | 'composition' | 'mesures' | 'vitalite' | 'performance' | 'sante';

export default function StatsScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [showTutorial, setShowTutorial] = useState(false);

  // Validation du param tab avec liste blanche
  const validTabs: StatsTab[] = ['discipline', 'poids', 'composition', 'mesures', 'vitalite', 'performance', 'sante'];
  const defaultTab: StatsTab = 'discipline';

  const validatedTab: StatsTab | undefined = React.useMemo(() => {
    if (params?.tab && validTabs.includes(params.tab as StatsTab)) {
      return params.tab as StatsTab;
    }
    return undefined;
  }, [params?.tab]);

  // Vérifier si c'est la première visite
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const checkFirstVisit = async () => {
      const visited = await hasVisitedPage('stats');
      if (!visited) {
        timer = setTimeout(() => setShowTutorial(true), 1000);
      }
    };
    checkFirstVisit();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleCloseTutorial = async () => {
    await markPageAsVisited('stats');
    setShowTutorial(false);
  };

  // Fermer sans marquer comme vu (bouton "Plus tard")
  const handleLaterTutorial = () => {
    setShowTutorial(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatsTabViewNew initialTab={validatedTab} />

      {/* Tutoriel de découverte */}
      {showTutorial && (
        <FeatureDiscoveryModal
          visible={true}
          tutorial={PAGE_TUTORIALS.stats}
          onClose={handleCloseTutorial}
          onSkip={handleLaterTutorial}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
