// ============================================
// STATS TAB VIEW - 6 onglets avec navigation visible
// Design avec tabs horizontaux en haut + FAB
// ============================================

import React, { useRef, useState } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, NativeScrollEvent, NativeSyntheticEvent, TouchableOpacity, Text, Animated } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PoidsPage } from './pages/PoidsPage';
import { CompositionPage } from './pages/CompositionPage';
import { MensurationsPage } from './pages/MensurationsPage';
import { DisciplinePage } from './pages/DisciplinePage';
import { PerformancePage } from './pages/PerformancePage';
import { VitalitePage } from './pages/VitalitePage';
import { Plus, Scale, Activity, Ruler, Flame, Award, Heart } from 'lucide-react-native';
import { ShareFloatingButton } from './ShareFloatingButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Page definitions - titles are set dynamically in component
const PAGE_DEFS = [
  { id: 'poids', titleKey: 'stats.weight', icon: Scale, component: PoidsPage },
  { id: 'composition', titleKey: 'stats.composition', icon: Activity, component: CompositionPage },
  { id: 'mensurations', titleKey: 'stats.measurements', icon: Ruler, component: MensurationsPage },
  { id: 'discipline', titleKey: 'stats.discipline', icon: Flame, component: DisciplinePage },
  { id: 'performance', titleKey: 'stats.performance', icon: Award, component: PerformancePage },
  { id: 'vitalite', titleKey: 'stats.vitality', icon: Heart, component: VitalitePage },
];

export const StatsTabViewNew: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  // Create pages with translated titles
  const PAGES = PAGE_DEFS.map(page => ({
    ...page,
    title: t(page.titleKey),
  }));
  const scrollViewRef = useRef<ScrollView>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Calculer si tous les onglets rentrent dans l'écran
  const tabWidth = 44;
  const tabGap = 12;
  const totalTabsWidth = (PAGES.length * (tabWidth + tabGap)) + 32;
  const allTabsFit = totalTabsWidth <= SCREEN_WIDTH;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page !== currentPage) {
      setCurrentPage(page);

      // Calculer la largeur totale des onglets
      const tabWidth = 44; // Largeur d'un cercle
      const tabGap = 12; // Gap entre onglets
      const totalTabsWidth = (PAGES.length * (tabWidth + tabGap)) + 32; // +32 pour padding

      // Si tous les onglets rentrent dans l'écran, ne pas scroller
      if (totalTabsWidth <= SCREEN_WIDTH) {
        return; // Ne rien faire, les onglets restent centrés
      }

      // Sinon, auto-scroll pour centrer l'onglet actif
      const scrollOffset = page * (tabWidth + tabGap) - SCREEN_WIDTH / 2 + (tabWidth / 2) + 16;
      tabScrollRef.current?.scrollTo({
        x: Math.max(0, scrollOffset),
        animated: true,
      });
    }
  };

  const scrollToPage = (pageIndex: number) => {
    scrollViewRef.current?.scrollTo({
      x: pageIndex * SCREEN_WIDTH,
      animated: true,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animation du bouton
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate selon la page actuelle
    if (currentPage === 0) {
      router.push('/body-composition');
    } else if (currentPage === 1) {
      router.push('/body-composition');
    } else if (currentPage === 2) {
      router.push('/measurements-detail');
    } else if (currentPage === 3 || currentPage === 4) {
      router.push('/add-training');
    } else if (currentPage === 5) {
      router.push('/connected-devices');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header avec tabs circulaires */}
      <View style={[styles.header, {
        backgroundColor: colors.background,
      }]}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!allTabsFit}
          contentContainerStyle={[
            styles.tabsContent,
            allTabsFit && styles.tabsContentCentered
          ]}
          style={styles.tabsScroll}
        >
          {PAGES.map((page, index) => {
            const Icon = page.icon;
            const isActive = currentPage === index;
            return (
              <TouchableOpacity
                key={page.id}
                style={styles.tabWrapper}
                onPress={() => scrollToPage(index)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.circleTab,
                  {
                    backgroundColor: isActive
                      ? colors.accent
                      : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)')
                  },
                ]}>
                  <Icon
                    size={18}
                    color={isActive ? '#000000' : colors.textMuted}
                    strokeWidth={2.5}
                  />
                </View>
                <Text style={[
                  styles.tabTitle,
                  {
                    color: isActive ? '#000000' : colors.textMuted,
                    fontWeight: isActive ? '800' : '600',
                  }
                ]}>
                  {page.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Indicateurs de pagination (dots) */}
      <View style={styles.dotsContainer}>
        {PAGES.map((page, index) => (
          <View
            key={`dot-${page.id}`}
            style={[
              styles.dot,
              {
                backgroundColor: currentPage === index
                  ? colors.accent
                  : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),
                width: currentPage === index ? 20 : 5,
              },
            ]}
          />
        ))}
      </View>

      {/* Horizontal Pager */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="center"
        contentContainerStyle={styles.scrollContent}
      >
        {PAGES.map((page, index) => {
          const PageComponent = page.component;
          return (
            <View key={page.id} style={styles.page}>
              <PageComponent />
            </View>
          );
        })}
      </ScrollView>

      {/* FAB Button flottant en bas à droite */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          onPress={handleAddPress}
          activeOpacity={0.85}
          style={[styles.fabButton, {
            backgroundColor: colors.accent,
            shadowColor: colors.accent,
          }]}
        >
          <Plus size={26} color={colors.textOnAccent} strokeWidth={3} />
        </TouchableOpacity>
      </Animated.View>

      {/* Bouton de partage social flottant en bas à gauche */}
      <ShareFloatingButton />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 8,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabsContent: {
    paddingLeft: 16,
    paddingRight: 80, // Padding plus grand à droite pour montrer qu'il y a plus d'onglets
    gap: 12,
    alignItems: 'flex-start',
  },
  tabsContentCentered: {
    paddingLeft: 16,
    paddingRight: 16, // Padding normal si tous les onglets rentrent
    justifyContent: 'center',
    flexGrow: 1,
  },
  tabWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  circleTab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabTitle: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },
  scrollContent: {
    flexDirection: 'row',
  },
  page: {
    width: SCREEN_WIDTH,
    minHeight: SCREEN_HEIGHT,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    zIndex: 100,
  },
  fabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
