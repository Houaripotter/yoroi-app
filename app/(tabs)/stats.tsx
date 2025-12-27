import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  Scale,
  Ruler,
  PieChart,
  Dumbbell,
  Heart,
  Activity,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTrainings, getWeights, getCompositionHistory, type Weight, type Training } from '@/lib/database';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';
import { WeightStats } from '@/components/stats/WeightStats';
import { CompositionStats } from '@/components/stats/CompositionStats';
import { MeasurementsStats } from '@/components/stats/MeasurementsStats';
import { ActivityStats } from '@/components/stats/ActivityStats';
import { VitalityStats } from '@/components/stats/VitalityStats';
import { PerformanceStats } from '@/components/stats/PerformanceStats';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

// ============================================
// STATS SCREEN - 6 ONGLETS (Design moderne)
// ============================================

type TabType = 'poids' | 'compo' | 'mesures' | 'discipline' | 'vitalite' | 'performance';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('discipline');
  const [weights, setWeights] = useState<Weight[]>([]);
  const [compositionHistory, setCompositionHistory] = useState<Weight[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const indicatorAnim = useRef(new Animated.Value(0)).current;

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
  // TABS - Design moderne avec icônes uniquement en haut
  // ============================================
  const tabs: { key: TabType; label: string; icon: any; color: string }[] = [
    { key: 'discipline', label: 'Discipline', icon: Dumbbell, color: '#F59E0B' },
    { key: 'poids', label: 'Poids', icon: Scale, color: '#10B981' },
    { key: 'compo', label: 'Compo', icon: PieChart, color: '#8B5CF6' },
    { key: 'mesures', label: 'Mesures', icon: Ruler, color: '#0EA5E9' },
    { key: 'vitalite', label: 'Vitalité', icon: Heart, color: '#EF4444' },
    { key: 'performance', label: 'Performances', icon: Activity, color: '#EC4899' },
  ];

  const activeIndex = tabs.findIndex(t => t.key === activeTab);

  const handleTabPress = (tab: TabType, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
    
    // Animer l'indicateur
    Animated.spring(indicatorAnim, {
      toValue: index,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  };

  const TAB_WIDTH = 56;
  const indicatorTranslateX = indicatorAnim.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => i * (TAB_WIDTH + 8)),
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Statistiques</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Ton évolution</Text>
      </View>

      {/* Modern Tab Bar - Icônes rondes */}
      <View style={styles.tabBarWrapper}>
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItemWrapper}
                onPress={() => handleTabPress(tab.key, index)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.tabIconCircle,
                  { 
                    backgroundColor: isActive ? tab.color : colors.backgroundCard,
                    borderColor: isActive ? tab.color : colors.border,
                  }
                ]}>
                  <Icon size={20} color={isActive ? '#FFF' : colors.textMuted} />
                </View>
                <Text style={[
                  styles.tabLabel, 
                  { color: isActive ? tab.color : colors.textMuted },
                  isActive && styles.tabLabelActive
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Indicateur de l'onglet actif */}
      <View style={styles.activeIndicatorRow}>
        <View style={[styles.activeIndicatorBg, { backgroundColor: colors.backgroundCard }]}>
          {tabs.map((tab, index) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.indicatorDot,
                  { backgroundColor: isActive ? tab.color : colors.border }
                ]}
                onPress={() => handleTabPress(tab.key, index)}
              />
            );
          })}
        </View>
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

        {/* ============================================ */}
        {/* ONGLET VITALITÉ */}
        {/* ============================================ */}
        {activeTab === 'vitalite' && (
          <VitalityStats trainings={trainings} />
        )}

        {/* ============================================ */}
        {/* ONGLET PERFORMANCE */}
        {/* ============================================ */}
        {activeTab === 'performance' && (
          <PerformanceStats trainings={trainings} />
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },

  // Modern Tab Bar
  tabBarWrapper: {
    paddingVertical: SPACING.md,
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: 8,
  },
  tabItemWrapper: {
    alignItems: 'center',
    width: 56,
  },
  tabIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelActive: {
    fontWeight: '700',
  },

  // Indicateur dots
  activeIndicatorRow: {
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  activeIndicatorBg: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    gap: 8,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
});
