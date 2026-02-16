// ============================================
// YOROI - PLANNING TAB VIEW (iOS Style Horizontal Navigation)
// ============================================

import React, { useRef, useState } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, NativeScrollEvent, NativeSyntheticEvent, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Calendar, BookOpen, Dumbbell, Clock, Users } from 'lucide-react-native';
import { PlanningPage1Calendar } from './pages/PlanningPage1Calendar';
import { PlanningPage2TimeTable } from './pages/PlanningPage2TimeTable';
import { PlanningPage3Journal } from './pages/PlanningPage3Journal';
import { PlanningPage4Clubs } from './pages/PlanningPage4Clubs';
import { PlanningPage4Programs } from './pages/PlanningPage4Programs';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PLANNING_PAGES = [
  {
    id: 'calendar',
    label: 'Calendrier',
    icon: Calendar,
    description: 'Visualise tes entraînements sur le calendrier et ton streak',
  },
  {
    id: 'timetable',
    label: 'Emploi du Temps\nSprint',
    icon: Clock,
    description: 'Planifie ta semaine avec des créneaux horaires précis',
  },
  {
    id: 'journal',
    label: 'Carnet\nEntraînement',
    icon: BookOpen,
    description: 'Historique complet de toutes tes séances passées',
  },
  {
    id: 'clubs',
    label: 'Clubs',
    icon: Users,
    description: 'Rejoins des clubs et challenge tes amis',
  },
  {
    id: 'programs',
    label: 'Programmes',
    icon: Dumbbell,
    description: 'Programmes d\'entraînement prêts à suivre',
  },
];

interface PlanningTabViewProps {
  // Week view
  weeklyTrainings?: any[];

  // Calendar
  trainingHistory?: any[];
  streak?: number;

  // Journal
  completedTrainings?: any[];

  // Programs
  availablePrograms?: any[];

  // Club/Social
  leaderboard?: any[];
  challenges?: any[];
}

export const PlanningTabView: React.FC<PlanningTabViewProps> = (props) => {
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

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
    impactAsync(ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Onglets fixes en haut - zIndex élevé pour rester visible au scroll */}
      <View style={[styles.tabsHeader, { backgroundColor: colors.background, zIndex: 100, elevation: 10 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {PLANNING_PAGES.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = currentPage === index;
            const cleanLabel = tab.label.replace(/\n/g, ' ');
            return (
              <TouchableOpacity
                key={tab.id}
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
                <Icon size={14} color={isActive ? colors.textOnAccent : colors.textMuted} />
                <Text style={[
                  styles.tabLabel,
                  { color: isActive ? colors.textOnAccent : colors.textMuted },
                ]}>
                  {cleanLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Description de la page active */}
        <View style={styles.descriptionContainer}>
          <Text style={[styles.pageDescription, { color: colors.textSecondary }]}>
            {PLANNING_PAGES[currentPage]?.description || ''}
          </Text>
        </View>
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
        {/* Page 1 - Calendrier */}
        <View style={styles.page}>
          <PlanningPage1Calendar
            trainingHistory={props.trainingHistory}
            streak={props.streak}
          />
        </View>

        {/* Page 2 - Emploi du Temps Sprint */}
        <View style={styles.page}>
          <PlanningPage2TimeTable weeklyTrainings={props.weeklyTrainings} />
        </View>

        {/* Page 3 - Carnet */}
        <View style={styles.page}>
          <PlanningPage3Journal completedTrainings={props.completedTrainings} />
        </View>

        {/* Page 4 - Clubs */}
        <View style={styles.page}>
          <PlanningPage4Clubs />
        </View>

        {/* Page 5 - Programmes */}
        <View style={styles.page}>
          <PlanningPage4Programs availablePrograms={props.availablePrograms} />
        </View>
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Tabs Header (EXACTEMENT identique à Accueil/Stats/Menu)
  tabsHeader: {
    paddingTop: 60,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
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
  descriptionContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pageDescription: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollContent: {
    flexDirection: 'row',
  },
  page: {
    width: SCREEN_WIDTH,
    minHeight: SCREEN_HEIGHT,
  },
});
