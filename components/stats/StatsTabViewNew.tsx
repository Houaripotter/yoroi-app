// ============================================
// STATS TAB VIEW - 6 onglets avec navigation visible
// Design avec tabs horizontaux en haut
// ============================================

import React, { useRef, useState, useEffect } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, NativeScrollEvent, NativeSyntheticEvent, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { DashboardPage } from './pages/DashboardPage';
import { CorpsTabPage } from './pages/CorpsTabPage';
import { TrainingTabPage } from './pages/TrainingTabPage';
import { VitalitePage } from './pages/VitalitePage';
import { Scale, Flame, Heart, LayoutDashboard, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { ScrollProvider } from '@/lib/ScrollContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Page definitions - 4 onglets consolidés
const PAGE_DEFS = [
  { id: 'dashboard', titleKey: 'Résumé', icon: LayoutDashboard, component: DashboardPage },
  { id: 'corps', titleKey: 'Corps', icon: Scale, component: CorpsTabPage },
  { id: 'training', titleKey: 'Training', icon: Flame, component: TrainingTabPage },
  { id: 'sante', titleKey: 'stats.health', icon: Heart, component: VitalitePage },
];

interface StatsTabViewNewProps {
  initialTab?: string;
}

export const StatsTabViewNew: React.FC<StatsTabViewNewProps> = ({ initialTab }) => {
  const { colors, isDark, screenBackground, screenText, screenTextMuted } = useTheme();
  const { t } = useI18n();

  // Create pages with translated titles
  const PAGES = PAGE_DEFS.map(page => ({
    ...page,
    title: page.titleKey.includes('.') ? t(page.titleKey) : page.titleKey,
  }));
  const scrollViewRef = useRef<ScrollView>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Calculer si tous les onglets rentrent dans l'écran
  const tabWidth = 100; // Largeur estimée d'une pilule (icone + texte)
  const tabGap = 8;
  const totalTabsWidth = (PAGES.length * (tabWidth + tabGap)) + 32;
  const allTabsFit = totalTabsWidth <= SCREEN_WIDTH;

  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set([0]));

  // Naviguer vers l'onglet initial si spécifié
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (initialTab) {
      const tabIndex = PAGE_DEFS.findIndex(p => p.id === initialTab);
      if (tabIndex >= 0) {
        // Marquer comme chargé
        setLoadedPages(prev => new Set(prev).add(tabIndex));
        
        timer = setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            x: tabIndex * SCREEN_WIDTH,
            animated: false,
          });
          setCurrentPage(tabIndex);
        }, 100);
      }
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [initialTab]);

  // Lazy load pages when scrolling
  useEffect(() => {
    setLoadedPages(prev => {
      const newSet = new Set(prev);
      newSet.add(currentPage);
      if (currentPage < PAGES.length - 1) newSet.add(currentPage + 1); // Preload next
      if (currentPage > 0) newSet.add(currentPage - 1); // Keep previous
      return newSet;
    });
  }, [currentPage]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page !== currentPage) {
      setCurrentPage(page);
      // ... rest of handleScroll logic
      
      // Calculer la largeur totale des onglets
      const tabWidth = 100; // Largeur d'une pilule
      const tabGap = 8; // Gap entre onglets
      const totalTabsWidth = (PAGES.length * (tabWidth + tabGap)) + 32; // +32 pour padding

      // Si tous les onglets rentrent dans l'écran, ne pas scroller
      if (totalTabsWidth <= SCREEN_WIDTH) {
        return; // Ne rien faire, les onglets restent centrés
      }

      // Sinon, auto-scroll pour centrer l'onglet actif
      const scrollOffset = page * (100 + 8) - SCREEN_WIDTH / 2 + (100 / 2) + 16;
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
    impactAsync(ImpactFeedbackStyle.Light);
  };

  const handleNavigateToTab = (tabId: string) => {
    const index = PAGE_DEFS.findIndex(p => p.id === tabId);
    if (index >= 0) {
      scrollToPage(index);
    }
  };

  return (
    <ScrollProvider>
      <View style={[styles.container, { backgroundColor: screenBackground }]}>
        {/* Header avec tabs circulaires */}
        <View style={[styles.header, {
          backgroundColor: screenBackground,
        }]}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={true}
          contentContainerStyle={[
            styles.tabsContent,
            // Centrer seulement si on a peu d'onglets et de l'espace, sinon alignement gauche standard
            allTabsFit ? styles.tabsContentCentered : null
          ]}
          style={styles.tabsScroll}
        >
          {PAGES.map((page, index) => {
            const Icon = page.icon;
            const isActive = currentPage === index;
            return (
              <TouchableOpacity
                key={page.id}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive
                      ? colors.accent
                      : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')
                  },
                ]}
                onPress={() => scrollToPage(index)}
                activeOpacity={0.7}
              >
                <Icon
                  size={14}
                  color={isActive ? colors.textOnAccent : screenTextMuted}
                  strokeWidth={2.5}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: isActive ? colors.textOnAccent : screenTextMuted },
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
          const shouldRender = loadedPages.has(index);
          return (
            <View key={page.id} style={styles.page}>
              {shouldRender ? (
                <ErrorBoundary>
                  {/* @ts-ignore - Some components might not expect the prop */}
                  <PageComponent onNavigateToTab={handleNavigateToTab} />
                </ErrorBoundary>
              ) : (
                <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
                  <ActivityIndicator size="small" color={colors.textMuted} />
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

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
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'flex-start',
  },
  tabsContentCentered: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    flexGrow: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    flexDirection: 'row',
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
  },
});
