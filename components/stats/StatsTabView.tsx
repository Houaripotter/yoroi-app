// ============================================
// YOROI - STATS TAB VIEW (iOS Style Horizontal Navigation)
// Nouvelle version avec 4 onglets: Corps, Entraînement, Santé, Analyse
// ============================================

import React, { useRef, useState } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, NativeScrollEvent, NativeSyntheticEvent, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { CorpsPage } from './pages/CorpsPage';
import { EntrainementPage } from './pages/EntrainementPage';
import { SantePage } from './pages/SantePage';
import { AnalysePage } from './pages/AnalysePage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PAGE_TITLES = ['Corps', 'Entraînement', 'Santé', 'Analyse'];

export const StatsTabView: React.FC = () => {
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
        {/* Page 1 - Corps */}
        <View style={styles.page}>
          <CorpsPage />
        </View>

        {/* Page 2 - Entraînement */}
        <View style={styles.page}>
          <EntrainementPage />
        </View>

        {/* Page 3 - Santé */}
        <View style={styles.page}>
          <SantePage />
        </View>

        {/* Page 4 - Analyse */}
        <View style={styles.page}>
          <AnalysePage />
        </View>
      </ScrollView>

      {/* Pagination avec Labels + Compteur */}
      <View style={styles.paginationWrapper}>
        <View style={[styles.paginationContainer, {
          backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        }]}>
          {/* Compteur de page */}
          <View style={[styles.pageCounter, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
            <Text style={[styles.pageCounterText, { color: isDark ? colors.accent : colors.textPrimary }]}>
              {currentPage + 1}/{PAGE_TITLES.length}
            </Text>
          </View>

          {/* Points + Labels */}
          {PAGE_TITLES.map((title, index) => {
            const isActive = currentPage === index;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => scrollToPage(index)}
                activeOpacity={0.7}
                style={[
                  styles.tabItem,
                  isActive && styles.tabItemActive
                ]}
              >
                <View
                  style={[
                    styles.tabDot,
                    {
                      backgroundColor: isActive
                        ? colors.accent
                        : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'),
                    }
                  ]}
                />
                <Text style={[
                  styles.tabLabel,
                  {
                    color: isActive ? (isDark ? colors.accent : colors.textPrimary) : colors.textMuted,
                    fontWeight: isActive ? '800' : '600',
                  }
                ]}>
                  {title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
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
    minHeight: SCREEN_HEIGHT,
  },
  paginationWrapper: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  pageCounter: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  pageCounterText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 18,
  },
  tabItemActive: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
  tabDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  tabLabel: {
    fontSize: 12,
    letterSpacing: -0.2,
  },
});
