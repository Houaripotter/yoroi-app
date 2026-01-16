// ============================================
// MORE TAB VIEW - Navigation avec onglets circulaires
// ============================================

import React, { useRef, useState } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, NativeScrollEvent, NativeSyntheticEvent, TouchableOpacity, Text } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import * as Haptics from 'expo-haptics';
import { User, Palette, Settings, Heart } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MoreTabViewProps {
  children: React.ReactNode[];
}

const PAGES = [
  { id: 'profile', title: 'Profil', icon: User },
  { id: 'appearance', title: 'Apparence', icon: Palette },
  { id: 'data', title: 'Données', icon: Settings },
  { id: 'support', title: 'Support', icon: Heart },
];

export const MoreTabView: React.FC<MoreTabViewProps> = ({ children }) => {
  const { colors, isDark } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);

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
        {React.Children.map(children, (child, index) => (
          <View key={PAGES[index]?.id || index} style={styles.page}>
            {child}
          </View>
        ))}
      </ScrollView>
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
    minHeight: SCREEN_HEIGHT - 220, // Tab bar (85) + header tabs (135)
  },
});
