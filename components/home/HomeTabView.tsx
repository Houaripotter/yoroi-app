// ============================================
// YOROI - HOME TAB VIEW (iOS Style Horizontal Navigation)
// ============================================

import React, { useRef, useState, useEffect } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, NativeScrollEvent, NativeSyntheticEvent, TouchableOpacity, Text, Modal, Animated, SafeAreaView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { GripVertical } from 'lucide-react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Page1Monitoring } from './pages/Page1Monitoring';
import { Page2ActionGrid } from './pages/Page2ActionGrid';
import { Page3Performance } from './pages/Page3Performance';
import { Page4Stats } from './pages/Page4Stats';
import { Page5Reports } from './pages/Page5Reports';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PAGE_ORDER_KEY = '@yoroi_home_page_order';

interface PageItem {
  id: string;
  title: string;
  icon: string;
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
  workloadStatus?: 'light' | 'moderate' | 'intense';

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
}

const DEFAULT_PAGES: PageItem[] = [
  { id: 'home', title: 'Accueil', icon: '' },
  { id: 'tools', title: 'Outils', icon: '' },
  { id: 'performance', title: 'Performance', icon: '' },
  { id: 'stats', title: 'Stats', icon: '' },
  { id: 'reports', title: 'Rapports', icon: '' },
];

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
  workloadStatus = 'moderate',
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
}) => {
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageOrder, setPageOrder] = useState<PageItem[]>(DEFAULT_PAGES);
  const [editMode, setEditMode] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

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
      const saved = await AsyncStorage.getItem(PAGE_ORDER_KEY);
      if (saved) {
        setPageOrder(JSON.parse(saved));
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
    setCurrentPage(page);
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
            onAddWater={onAddWater}
          />
        );
      case 'tools':
        return <Page2ActionGrid />;
      case 'performance':
        return <Page3Performance dailyChallenges={dailyChallenges} />;
      case 'stats':
        return (
          <Page4Stats
            currentWeight={currentWeight}
            targetWeight={targetWeight}
            startWeight={startWeight}
            weightHistory={weightHistory}
            steps={steps}
            stepsGoal={stepsGoal}
            calories={calories}
            bodyFat={bodyFat}
            muscleMass={muscleMass}
            waterPercentage={waterPercentage}
          />
        );
      case 'reports':
        return (
          <Page5Reports
            weeklyReport={weeklyReport}
            onShareReport={onShareReport}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        scrollEnabled={!editMode}
      >
        {/* Render pages in custom order */}
        {pageOrder.map((page) => (
          <View key={page.id} style={styles.page}>
            {renderPage(page.id)}
          </View>
        ))}
      </ScrollView>

      {/* Pagination Dots - STYLE iOS */}
      <View style={styles.paginationWrapper}>
        <View style={[styles.paginationContainer, {
          backgroundColor: isDark ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        }]}>
          {pageOrder.map((page, index) => (
            <TouchableOpacity
              key={page.id}
              onPress={() => scrollToPage(index)}
              onLongPress={handleLongPressDot}
              activeOpacity={0.7}
              style={[
                styles.dot,
                {
                  backgroundColor: currentPage === index
                    ? (isDark ? '#FFFFFF' : '#000000')
                    : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'),
                  width: 8,
                  height: 8,
                  opacity: currentPage === index ? 1 : 0.5,
                }
              ]}
            />
          ))}
        </View>
      </View>

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
                  <Text style={styles.doneButtonText}>Terminé</Text>
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
  },
  scrollContent: {
    flexDirection: 'row',
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  paginationWrapper: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dot: {
    borderRadius: 4,
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
