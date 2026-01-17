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

export default function StatsScreen() {
  const { colors } = useTheme();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [showTutorial, setShowTutorial] = useState(false);

  // Vérifier si c'est la première visite
  useEffect(() => {
    const checkFirstVisit = async () => {
      const visited = await hasVisitedPage('stats');
      if (!visited) {
        setTimeout(() => setShowTutorial(true), 1000);
      }
    };
    checkFirstVisit();
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
      <StatsTabViewNew initialTab={tab} />

      {/* Tutoriel de découverte */}
      {showTutorial && (
        <FeatureDiscoveryModal
          visible={true}
          tutorial={PAGE_TUTORIALS.stats}
          onClose={handleCloseTutorial}
          onLater={handleLaterTutorial}
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
