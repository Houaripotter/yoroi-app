import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  Scale,
  Ruler,
  PieChart,
  Dumbbell,
  Heart,
  Activity,
  Share2,
  Watch,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTrainings, getWeights, getCompositionHistory, getMeasurements, type Weight, type Training, type Measurement } from '@/lib/database';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS } from '@/constants/design';
import { WeightStats } from '@/components/stats/WeightStats';
import { CompositionStats } from '@/components/stats/CompositionStats';
import { MeasurementsStats } from '@/components/stats/MeasurementsStats';
import { ActivityStats } from '@/components/stats/ActivityStats';
import { VitalityStats } from '@/components/stats/VitalityStats';
import { PerformanceStats } from '@/components/stats/PerformanceStats';
import { HealthTab } from '@/components/stats/HealthTab';
import * as Haptics from 'expo-haptics';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// STATS SCREEN - 6 ONGLETS SWIPEABLE
// ============================================

type TabType = 'poids' | 'compo' | 'mesures' | 'discipline' | 'vitalite' | 'performance' | 'sante';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('discipline');
  const [weights, setWeights] = useState<Weight[]>([]);
  const [compositionHistory, setCompositionHistory] = useState<Weight[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  // Refs pour le scroll
  const horizontalScrollRef = useRef<ScrollView>(null);
  const tabScrollViewRef = useRef<ScrollView>(null);
  const indicatorAnim = useRef(new Animated.Value(0)).current; // Start at index 0 (discipline)
  const isScrollingRef = useRef(false);
  const hasInitializedScroll = useRef(false);

  const loadData = useCallback(async () => {
    try {
      const [weightsData, compHistory, trainingsData, measurementsData] = await Promise.all([
        getWeights ? getWeights() : Promise.resolve([]),
        getCompositionHistory ? getCompositionHistory(10) : Promise.resolve([]),
        getTrainings ? getTrainings() : Promise.resolve([]),
        getMeasurements ? getMeasurements() : Promise.resolve([]),
      ]);

      setWeights(weightsData);
      setCompositionHistory(compHistory);
      setTrainings(trainingsData);
      setMeasurements(measurementsData);
    } catch (error) {
      logger.error('Error loading data:', error);
    }
  }, []);

  // ============================================
  // TABS - Design moderne avec icônes uniquement en haut
  // ============================================
  const tabs: { key: TabType; label: string; icon: any; color: string }[] = [
    { key: 'discipline', label: 'Discipline', icon: Dumbbell, color: '#F59E0B' },
    { key: 'poids', label: 'Poids', icon: Scale, color: '#10B981' },
    { key: 'compo', label: 'Compo', icon: PieChart, color: '#8B5CF6' },
    { key: 'mesures', label: 'Mesures', icon: Ruler, color: '#0EA5E9' },
    { key: 'vitalite', label: 'Vitalite', icon: Heart, color: '#EF4444' },
    { key: 'performance', label: 'Perf', icon: Activity, color: '#EC4899' },
    { key: 'sante', label: 'Montre', icon: Watch, color: '#EC4899' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Gérer le paramètre tab de l'URL
  useEffect(() => {
    if (params.tab && tabs.some(t => t.key === params.tab)) {
      setActiveTab(params.tab as TabType);
      const tabIndex = tabs.findIndex(t => t.key === params.tab);
      if (tabIndex >= 0) {
        horizontalScrollRef.current?.scrollTo({ x: SCREEN_WIDTH * tabIndex, animated: false });
      }
    }
  }, [params.tab]);

  const activeIndex = tabs.findIndex(t => t.key === activeTab);

  // Gérer le clic sur un onglet
  const handleTabPress = (tab: TabType, index: number) => {
    if (isScrollingRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);

    // Scroller vers la page correspondante
    horizontalScrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });

    // Animer l'indicateur
    Animated.spring(indicatorAnim, {
      toValue: index,
      useNativeDriver: true,
      damping: 15,
      stiffness: 200,
    }).start();
  };

  // Gérer le scroll horizontal des pages
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(offsetX / SCREEN_WIDTH);

    if (currentIndex >= 0 && currentIndex < tabs.length) {
      const newTab = tabs[currentIndex].key;
      if (newTab !== activeTab) {
        isScrollingRef.current = true;
        setActiveTab(newTab);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Animer l'indicateur
        Animated.spring(indicatorAnim, {
          toValue: currentIndex,
          useNativeDriver: true,
          damping: 15,
          stiffness: 200,
        }).start();

        // Reset le flag après un délai
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 100);
      }
    }
  };

  const TAB_WIDTH = 56;
  const indicatorTranslateX = indicatorAnim.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => i * (TAB_WIDTH + 6)),
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Statistiques</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Swipe pour naviguer</Text>
      </View>

      {/* Modern Tab Bar - Icônes rondes */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          ref={tabScrollViewRef}
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

      {/* ScrollView horizontal avec pagination */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.horizontalScroll}
        bounces={false}
        decelerationRate="fast"
      >
        {/* Page Discipline */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <ActivityStats data={trainings} />
            <View style={{ height: 120 }} />
          </ScrollView>
        </View>

        {/* Page Poids */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <WeightStats data={weights} />
            <View style={{ height: 120 }} />
          </ScrollView>
        </View>

        {/* Page Compo */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <CompositionStats data={compositionHistory} />
            <View style={{ height: 120 }} />
          </ScrollView>
        </View>

        {/* Page Mesures */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <MeasurementsStats data={measurements} />
            <View style={{ height: 120 }} />
          </ScrollView>
        </View>

        {/* Page Vitalité */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <VitalityStats trainings={trainings} />
            <View style={{ height: 120 }} />
          </ScrollView>
        </View>

        {/* Page Performance */}
        <View style={styles.page}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <PerformanceStats trainings={trainings} />
            <View style={{ height: 120 }} />
          </ScrollView>
        </View>

        {/* Page Sante - Apple Health / Health Connect */}
        <View style={styles.page}>
          <HealthTab />
          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Bouton flottant Partager */}
      <TouchableOpacity
        style={[styles.floatingButton, { backgroundColor: colors.accent }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/share-hub');
        }}
        activeOpacity={0.8}
      >
        <Share2 size={24} color={colors.textOnGold} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.sm,
    paddingTop: 4,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // Modern Tab Bar
  tabBarWrapper: {
    paddingVertical: 6,
    alignItems: 'center',
    height: 80, // Hauteur fixe pour éviter l'espace géant
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabItemWrapper: {
    alignItems: 'center',
    width: 54,
  },
  tabIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 4,
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
    width: '100%',
  },
  tabLabelActive: {
    fontWeight: '700',
  },

  // Indicateur dots
  activeIndicatorRow: {
    alignItems: 'center',
    marginBottom: 6,
  },
  activeIndicatorBg: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Horizontal scroll
  horizontalScroll: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // Pas de paddingHorizontal ici car les composants Stats gèrent leur propre padding
  },

  // Floating Button
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
