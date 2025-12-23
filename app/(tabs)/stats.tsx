import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  Scale,
  Ruler,
  PieChart,
  Dumbbell,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTrainings, getWeights, getCompositionHistory, type Weight, type Training } from '@/lib/database';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';
import { WeightStats } from '@/components/stats/WeightStats';
import { CompositionStats } from '@/components/stats/CompositionStats';
import { MeasurementsStats } from '@/components/stats/MeasurementsStats';
import { ActivityStats } from '@/components/stats/ActivityStats';

// ============================================
// STATS SCREEN - 4 ONGLETS
// Discipline | Poids | Compo | Mesures
// ============================================

type TabType = 'poids' | 'compo' | 'mesures' | 'discipline';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('discipline');
  const [weights, setWeights] = useState<Weight[]>([]);
  const [compositionHistory, setCompositionHistory] = useState<Weight[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [weightsData, compHistory, trainingsData] = await Promise.all([
        getWeights ? getWeights() : Promise.resolve([]),
        getCompositionHistory ? getCompositionHistory(10) : Promise.resolve([]),
        getTrainings ? getTrainings() : Promise.resolve([]),
      ]);

      setWeights(weightsData);
      setCompositionHistory(compHistory);
      setTrainings(trainingsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ============================================
  // TABS
  // ============================================
  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'discipline', label: 'Discipline', icon: Dumbbell },
    { key: 'poids', label: 'Poids', icon: Scale },
    { key: 'compo', label: 'Compo', icon: PieChart },
    { key: 'mesures', label: 'Mesures', icon: Ruler },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Statistiques</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Ton évolution</Text>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, isActive && { backgroundColor: colors.accent }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon size={18} color={isActive ? '#FFF' : colors.textMuted} />
              <Text style={[styles.tabLabel, { color: colors.textMuted }, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ============================================ */}
        {/* ONGLET POIDS */}
        {/* ============================================ */}
        {activeTab === 'poids' && (
          <WeightStats data={weights} />
        )}

        {/* ============================================ */}
        {/* ONGLET COMPOSITION */}
        {/* ============================================ */}
        {activeTab === 'compo' && (
          <CompositionStats data={compositionHistory} />
        )}

        {/* ============================================ */}
        {/* ONGLET MESURES */}
        {/* ============================================ */}
        {activeTab === 'mesures' && (
          <MeasurementsStats data={[]} />
        )}

        {/* ============================================ */}
        {/* ONGLET DISCIPLINE */}
        {/* ============================================ */}
        {activeTab === 'discipline' && (
          <ActivityStats data={trainings} />
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
  },

  // Header
  header: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: FONT.size.xxl,
    fontWeight: FONT.weight.bold,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: FONT.size.md,
    color: '#888888',
    marginTop: 4,
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  tabLabel: {
    fontSize: FONT.size.sm,
    fontWeight: FONT.weight.semibold,
  },
  tabLabelActive: {
    color: '#FFF',
  },
});
