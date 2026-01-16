// ============================================
// YOROI - HOME TAB VIEW (iOS Style Horizontal Navigation)
// ============================================

import React, { useRef, useState, useEffect } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, NativeScrollEvent, NativeSyntheticEvent, TouchableOpacity, Text, Modal, Animated, SafeAreaView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { GripVertical, Home, Grid, LineChart } from 'lucide-react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Page1Monitoring } from './pages/Page1Monitoring';
import { Page2ActionGrid } from './pages/Page2ActionGrid';
import { Page3Performance } from './pages/Page3Performance';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PAGE_ORDER_KEY = '@yoroi_home_page_order';

interface PageItem {
  id: string;
  title: string;
  icon: string;
  description?: string;
}

interface WeeklyReport {
  weightChange?: number;
  trainingsCount?: number;
  avgSleepHours?: number;
  hydrationRate?: number;
  totalSteps?: number;
}

interface HomeTabViewProps {
  // Page 1 - Monitoring
  userName?: string;
  profilePhoto?: string | null;
  dailyQuote?: string | null;
  steps?: number;
  streak?: number;
  level?: number;
  rankName?: string;
  rankColor?: string;
  currentWeight?: number;
  targetWeight?: number;
  startWeight?: number;
  weightHistory?: number[];
  weightTrend?: 'up' | 'down' | 'stable';
  hydration?: number;
  hydrationGoal?: number;
  sleepHours?: number;
  sleepDebt?: number;
  sleepGoal?: number;
  workloadStatus?: 'none' | 'light' | 'moderate' | 'intense';

  // Navigation
  currentPage?: number;
  pageOrder?: PageItem[];
  onPageChange?: (index: number) => void;
  onLongPressTab?: () => void;

  // Page 3 - Performance
  dailyChallenges?: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;

  // Page 4 - Stats
  stepsGoal?: number;
  calories?: number;
  bodyFat?: number;
  muscleMass?: number;
  waterPercentage?: number;

  // Page 5 - Reports
  weeklyReport?: WeeklyReport;

  // Callbacks
  onAddWeight?: () => void;
  onAddWater?: (ml: number) => void;
  onShareReport?: () => void;

  // Avatar refresh
  refreshTrigger?: number;
}

// Default page IDs - titles are loaded dynamically via i18n
const DEFAULT_PAGE_IDS = ['home', 'tools', 'performance'] as const;

export const HomeTabView: React.FC<HomeTabViewProps> = ({
  userName,
  profilePhoto,
  dailyQuote,
  steps = 0,
  streak = 0,
  level = 1,
  rankName = 'Novice',
  rankColor = '#94A3B8',
  currentWeight,
  targetWeight,
  startWeight,
  weightHistory = [],
  weightTrend,
  hydration = 0,
  hydrationGoal = 2500,
  sleepHours = 0,
  sleepDebt = 0,
  sleepGoal = 8,
  workloadStatus = 'none',
  dailyChallenges = [],
  stepsGoal = 10000,
  calories = 0,
  bodyFat,
  muscleMass,
  waterPercentage,
  weeklyReport,
  onAddWeight,
  onAddWater,
  onShareReport,
  refreshTrigger = 0,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const scrollViewRef = useRef<ScrollView>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Create default pages with translations
  const getDefaultPages = (): PageItem[] => [
    { id: 'home', title: t('home.title'), icon: '', description: t('home.dashboard') },
    { id: 'tools', title: t('tools.title'), icon: '', description: t('tools.subtitle') },
    { id: 'performance', title: t('analysis.title'), icon: '', description: t('analysis.subtitle') },
  ];

  const [pageOrder, setPageOrder] = useState<PageItem[]>(getDefaultPages());
  const [editMode, setEditMode] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Update page titles when language changes
  useEffect(() => {
    setPageOrder(prevOrder => {
      const defaultPages = getDefaultPages();
      return prevOrder.map(page => {
        const defaultPage = defaultPages.find(p => p.id === page.id);
        return defaultPage ? { ...page, title: defaultPage.title, description: defaultPage.description } : page;
      });
    });
  }, [t]);

  // Charger l'ordre des pages au montage
  useEffect(() => {
    loadPageOrder();
  }, []);

  // Animation de tremblement en mode édition
  useEffect(() => {
    if (editMode) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        ])
      ).start();
    } else {
      shakeAnim.setValue(0);
    }
  }, [editMode]);

  const loadPageOrder = async () => {
    try {
      const defaultPages = getDefaultPages();
      const saved = await AsyncStorage.getItem(PAGE_ORDER_KEY);
      if (saved) {
        const savedOrder: PageItem[] = JSON.parse(saved);
        // Filtrer les anciennes pages (stats, reports) pour migrer vers la nouvelle structure
        const validPages = savedOrder.filter(page =>
          page.id === 'home' || page.id === 'tools' || page.id === 'performance'
        );
        // Si des pages ont été filtrées, utiliser les nouvelles pages par défaut
        if (validPages.length < savedOrder.length) {
          setPageOrder(defaultPages);
          await AsyncStorage.setItem(PAGE_ORDER_KEY, JSON.stringify(defaultPages));
        } else {
          // Ajouter les descriptions si elles manquent (migration) + update titles from translations
          const pagesWithDescriptions = validPages.map(page => {
            const defaultPage = defaultPages.find(p => p.id === page.id);
            return {
              ...page,
              title: defaultPage?.title || page.title,
              description: defaultPage?.description || page.description || '',
            };
          });
          setPageOrder(pagesWithDescriptions);
        }
      }
    } catch (error) {
      console.error('Error loading page order:', error);
    }
  };

  const savePageOrder = async (order: PageItem[]) => {
    try {
      await AsyncStorage.setItem(PAGE_ORDER_KEY, JSON.stringify(order));
      setPageOrder(order);
    } catch (error) {
      console.error('Error saving page order:', error);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (page !== currentPage) {
      setCurrentPage(page);

      // Calculer la largeur totale des onglets
      const tabWidth = 44;
      const tabGap = 12;
      const totalTabsWidth = (pageOrder.length * (tabWidth + tabGap)) + 32;

      // Si tous les onglets rentrent dans l'écran, ne pas scroller
      if (totalTabsWidth <= SCREEN_WIDTH) {
        return;
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

  const handleLongPressDot = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditMode(true);
  };

  const handleDoneEditing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditMode(false);
    savePageOrder(pageOrder);
  };

  const renderPage = (pageId: string) => {
    switch (pageId) {
      case 'home':
        return (
          <Page1Monitoring
            userName={userName}
            profilePhoto={profilePhoto}
            dailyQuote={dailyQuote}
            steps={steps}
            streak={streak}
            level={level}
            rankName={rankName}
            rankColor={rankColor}
            currentWeight={currentWeight}
            targetWeight={targetWeight}
            weightHistory={weightHistory}
            weightTrend={weightTrend}
            hydration={hydration}
            hydrationGoal={hydrationGoal}
            sleepHours={sleepHours}
            sleepDebt={sleepDebt}
            sleepGoal={sleepGoal}
            workloadStatus={workloadStatus}
            onAddWeight={onAddWeight}
            refreshTrigger={refreshTrigger}
            onAddWater={onAddWater}
          />
        );
      case 'tools':
        return <Page2ActionGrid />;
      case 'performance':
        return (
          <Page3Performance
            dailyChallenges={dailyChallenges}
            steps={steps}
            stepsGoal={stepsGoal}
            calories={calories}
            weeklyReport={weeklyReport}
            onShareReport={onShareReport}
          />
        );
      default:
        return null;
    }
  };

  // Calculer si tous les onglets rentrent dans l'écran
  const tabWidth = 44;
  const tabGap = 12;
  const totalTabsWidth = (pageOrder.length * (tabWidth + tabGap)) + 32;
  const allTabsFit = totalTabsWidth <= SCREEN_WIDTH;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header avec tabs circulaires - zIndex bas pour passer derrière le contenu */}
      <View style={[styles.header, {
        backgroundColor: 'transparent',
        zIndex: 1,
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
          {pageOrder.map((page, index) => {
            const isActive = currentPage === index;
            const IconComponent = page.id === 'home' ? Home : page.id === 'tools' ? Grid : LineChart;

            return (
              <TouchableOpacity
                key={page.id}
                style={styles.tabWrapper}
                onPress={() => scrollToPage(index)}
                onLongPress={handleLongPressDot}
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
                  <IconComponent
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

      {/* Indicateurs de pagination (dots) - zIndex bas */}
      <View style={[styles.dotsContainer, { zIndex: 1 }]}>
        {pageOrder.map((page, index) => (
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

      {/* Horizontal Pager - zIndex élevé pour passer devant les onglets */}
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
        scrollEnabled={!editMode}
        style={{ flex: 1, overflow: 'visible', zIndex: 10 }}
      >
        {/* Render pages in custom order */}
        {pageOrder.map((page) => (
          <View key={page.id} style={styles.page}>
            {renderPage(page.id)}
          </View>
        ))}
      </ScrollView>


      {/* Modal de réorganisation */}
      <Modal
        visible={editMode}
        animationType="slide"
        transparent={true}
        onRequestClose={handleDoneEditing}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={handleDoneEditing}
            />
            <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Organiser les pages
                </Text>
                <TouchableOpacity
                  style={[styles.doneButton, { backgroundColor: colors.accent }]}
                  onPress={handleDoneEditing}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.doneButtonText, { color: colors.textOnAccent }]}>Terminé</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Maintenez et faites glisser pour réorganiser
              </Text>

              <DraggableFlatList
                data={pageOrder}
                onDragEnd={({ data }) => setPageOrder(data)}
                keyExtractor={(item) => item.id}
                renderItem={({ item, drag, isActive }: RenderItemParams<PageItem>) => (
                  <ScaleDecorator>
                    <TouchableOpacity
                      onLongPress={drag}
                      disabled={isActive}
                      style={[
                        styles.pageItem,
                        {
                          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          opacity: isActive ? 0.5 : 1,
                        }
                      ]}
                      activeOpacity={0.8}
                    >
                      <View style={styles.pageItemLeft}>
                        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
                          {item.title}
                        </Text>
                      </View>
                      <GripVertical size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </ScaleDecorator>
                )}
              />
            </View>
          </GestureHandlerRootView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'visible',
  },
  scrollContent: {
    flexDirection: 'row',
  },
  page: {
    width: SCREEN_WIDTH,
    minHeight: SCREEN_HEIGHT,
    overflow: 'visible',
    zIndex: 10,
  },

  // Header avec tabs circulaires
  header: {
    paddingTop: 60,
    paddingBottom: 0,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabsContent: {
    paddingLeft: 16,
    paddingRight: 80,
    gap: 12,
    alignItems: 'flex-start',
  },
  tabsContentCentered: {
    paddingLeft: 16,
    paddingRight: 16,
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
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  pageDescription: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 0,
  },
  dot: {
    height: 5,
    borderRadius: 2.5,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  pageItemLeft: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
});
