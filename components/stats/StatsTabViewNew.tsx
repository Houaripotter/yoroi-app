// ============================================
// STATS TAB VIEW - 6 onglets avec navigation visible
// Design avec tabs horizontaux en haut
// ============================================

import React, { useRef, useState, useEffect } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, NativeScrollEvent, NativeSyntheticEvent, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import * as Haptics from 'expo-haptics';
import { PoidsPage } from './pages/PoidsPage';
import { CompositionPage } from './pages/CompositionPage';
import { MensurationsPage } from './pages/MensurationsPage';
import { DisciplinePage } from './pages/DisciplinePage';
import { PerformancePage } from './pages/PerformancePage';
import { VitalitePage } from './pages/VitalitePage';
import { Scale, Activity, Ruler, Flame, Award, Heart } from 'lucide-react-native';
import { ShareFloatingButton } from './ShareFloatingButton';
import { ScrollProvider } from '@/lib/ScrollContext';

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

interface StatsTabViewNewProps {
  initialTab?: string;
}

export const StatsTabViewNew: React.FC<StatsTabViewNewProps> = ({ initialTab }) => {
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

  // Calculer si tous les onglets rentrent dans l'écran
  const tabWidth = 44;
  const tabGap = 12;
  const totalTabsWidth = (PAGES.length * (tabWidth + tabGap)) + 32;
  const allTabsFit = totalTabsWidth <= SCREEN_WIDTH;

  // Naviguer vers l'onglet initial si spécifié
  useEffect(() => {
    if (initialTab) {
      const tabIndex = PAGE_DEFS.findIndex(p => p.id === initialTab);
      if (tabIndex >= 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            x: tabIndex * SCREEN_WIDTH,
            animated: false,
          });
          setCurrentPage(tabIndex);
        }, 100);
      }
    }
  }, [initialTab]);

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

  return (
    <ScrollProvider>
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
                    color={isActive ? colors.textOnAccent : colors.textMuted}
                    strokeWidth={2.5}
                  />
                </View>
                <Text style={[
                  styles.tabTitle,
                  {
                    color: isActive ? colors.accent : colors.textMuted,
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

        {/* Bouton de partage social flottant */}
        <ShareFloatingButton />
      </View>
    </ScrollProvider>
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
  scrollContent: {
    flexDirection: 'row',
  },
  page: {
    width: SCREEN_WIDTH,
    minHeight: SCREEN_HEIGHT,
  },
});
