// ============================================
// STATS TAB VIEW - 4 onglets avec PagerView natif
// Design avec tabs horizontaux en haut
// ============================================

import React, { useRef, useState, useEffect, useMemo, useCallback, memo } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, TouchableOpacity, Text, ActivityIndicator, InteractionManager } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { DashboardPage } from './pages/DashboardPage';
import { CorpsTabPage } from './pages/CorpsTabPage';
import { TrainingTabPage } from './pages/TrainingTabPage';
import { VitalitePage } from './pages/VitalitePage';
import { Scale, Flame, LayoutDashboard, Moon, Footprints, Activity, Dumbbell } from 'lucide-react-native';

// Wrappers stables pour les onglets santé et séances
const SeancesPage = React.memo((props: any) => <VitalitePage {...props} forcedTab="seances" />);
const SommeilPage = React.memo((props: any) => <VitalitePage {...props} forcedTab="sommeil" />);
const PasPage = React.memo((props: any) => <VitalitePage {...props} forcedTab="pas" />);
const SignesVitauxPage = React.memo((props: any) => <VitalitePage {...props} forcedTab="signes" />);
import { ScrollProvider } from '@/lib/ScrollContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Memoized page wrapper - prevents re-render when currentPage changes in parent
const PageWrapper = memo(({ pageId, component: PageComponent, onNavigateToTab }: {
  pageId: string;
  component: React.FC<any>;
  onNavigateToTab: (tabId: string) => void;
}) => {
  return (
    <View style={pageStyles.page} key={pageId}>
      <ErrorBoundary>
        {/* @ts-ignore */}
        <PageComponent onNavigateToTab={onNavigateToTab} />
      </ErrorBoundary>
    </View>
  );
});

const pageStyles = StyleSheet.create({
  page: {
    flex: 1,
  },
});

// Page definitions - 7 onglets
const PAGE_DEFS = [
  { id: 'dashboard', titleKey: 'Résumé',       icon: LayoutDashboard, component: DashboardPage },
  { id: 'seances',   titleKey: 'Séances',      icon: Dumbbell,        component: SeancesPage },
  { id: 'corps',     titleKey: 'Corps',        icon: Scale,           component: CorpsTabPage },
  { id: 'training',  titleKey: 'Training',     icon: Flame,           component: TrainingTabPage },
  { id: 'sommeil',   titleKey: 'Sommeil',      icon: Moon,            component: SommeilPage },
  { id: 'pas',       titleKey: 'Pas',          icon: Footprints,      component: PasPage },
  { id: 'signes',    titleKey: 'Signes Vitaux', icon: Activity,       component: SignesVitauxPage },
];

interface StatsTabViewNewProps {
  initialTab?: string;
}

export const StatsTabViewNew: React.FC<StatsTabViewNewProps> = ({ initialTab }) => {
  const { colors, isDark, screenBackground, screenTextMuted } = useTheme();
  const { t } = useI18n();

  // Memoize pages to avoid new object references on every render
  const PAGES = useMemo(() => PAGE_DEFS.map(page => ({
    ...page,
    title: page.titleKey.includes('.') ? t(page.titleKey) : page.titleKey,
  })), [t]);

  const pagerRef = useRef<PagerView>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(() => {
    if (initialTab) {
      const idx = PAGE_DEFS.findIndex(p => p.id === initialTab);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  // Lazy mounting: only render pages that have been visited
  const [visitedPages, setVisitedPages] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    if (initialTab) {
      const idx = PAGE_DEFS.findIndex(p => p.id === initialTab);
      initial.add(idx >= 0 ? idx : 0);
    } else {
      initial.add(0);
    }
    return initial;
  });

  // Calculer si tous les onglets rentrent dans l'écran
  const tabWidth = 44;
  const tabGap = 12;
  const totalTabsWidth = (PAGES.length * (tabWidth + tabGap)) + 32;
  const allTabsFit = totalTabsWidth <= SCREEN_WIDTH;

  const handlePageSelected = useCallback((e: any) => {
    const page = e.nativeEvent.position;
    setCurrentPage(page);
    // Mark page as visited (triggers lazy mount)
    setVisitedPages(prev => {
      if (prev.has(page)) return prev;
      const next = new Set(prev);
      next.add(page);
      return next;
    });

    // Auto-scroll tabs if they don't fit
    if (totalTabsWidth > SCREEN_WIDTH) {
      const scrollOffset = page * (tabWidth + tabGap) - SCREEN_WIDTH / 2 + (tabWidth / 2) + 16;
      tabScrollRef.current?.scrollTo({
        x: Math.max(0, scrollOffset),
        animated: true,
      });
    }
  }, [totalTabsWidth]);

  const scrollToPage = useCallback((pageIndex: number) => {
    pagerRef.current?.setPage(pageIndex);
    impactAsync(ImpactFeedbackStyle.Light);
  }, []);

  const handleNavigateToTab = useCallback((tabId: string) => {
    const index = PAGE_DEFS.findIndex(p => p.id === tabId);
    if (index >= 0) {
      scrollToPage(index);
    }
  }, [scrollToPage]);

  return (
    <ScrollProvider>
      <View style={[styles.container, { backgroundColor: screenBackground }]}>
        {/* Header avec tabs circulaires */}
        <View style={[styles.header, { backgroundColor: screenBackground }]}>
          <ScrollView
            ref={tabScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={true}
            contentContainerStyle={[
              styles.tabsContent,
              allTabsFit ? styles.tabsContentCentered : null
            ]}
            style={styles.tabsScroll}
          >
            {PAGES.map((page, index) => {
              const Icon = page.icon;
              const isActive = currentPage === index;
              const activeColor = isDark ? colors.accent : '#FFFFFF';
              const inactiveColor = screenTextMuted || (isDark ? colors.textMuted : 'rgba(255,255,255,0.7)');
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
                        ? (isDark ? colors.accent : '#FFFFFF')
                        : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)'),
                      borderWidth: isActive ? 0 : 1,
                      borderColor: isActive ? 'transparent' : (isDark ? (colors.companion + '40') : 'rgba(255,255,255,0.3)'),
                    },
                  ]}>
                    <Icon
                      size={18}
                      color={isActive ? (isDark ? colors.textOnAccent : colors.accent) : inactiveColor}
                      strokeWidth={2.5}
                    />
                  </View>
                  <Text style={[
                    styles.tabLabel,
                    { color: isActive ? (isDark ? colors.accent : '#FFFFFF') : inactiveColor },
                  ]}>
                    {page.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Native PagerView - proper gesture handling with nested ScrollViews */}
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={currentPage}
          onPageSelected={handlePageSelected}
          overdrag={false}
        >
          {PAGES.map((page, index) => (
            <View key={page.id} style={styles.pagerPage}>
              {visitedPages.has(index) ? (
                <PageWrapper
                  pageId={page.id}
                  component={page.component}
                  onNavigateToTab={handleNavigateToTab}
                />
              ) : (
                <View style={[styles.pagerPage, { backgroundColor: colors.background }]} />
              )}
            </View>
          ))}
        </PagerView>
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
    gap: 12,
    alignItems: 'flex-start',
  },
  tabsContentCentered: {
    paddingHorizontal: 16,
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
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  pager: {
    flex: 1,
  },
  pagerPage: {
    flex: 1,
  },
});
