import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BarChart, BarData } from './BarChart';

interface ActivityCardProps {
  date: string;
  steps: number;
  calories: number;
  stepsChange?: string;
  caloriesChange?: string;
  chartData: BarData[];
  onPrevious?: () => void;
  onNext?: () => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  date,
  steps,
  calories,
  stepsChange,
  caloriesChange,
  chartData,
  onPrevious,
  onNext,
}) => {
  const { colors, isDark } = useTheme();

  // Badge colors
  const badgeBg = isDark ? '#FFFFFF' : '#1A1A1A';
  const badgeText = isDark ? '#000000' : '#FFFFFF';
  const badgeBgLight = isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.75)';

  // Navigation button background
  const navBtnBg = isDark
    ? 'rgba(255,255,255,0.12)'
    : 'rgba(0,0,0,0.08)';

  // Divider color
  const dividerColor = isDark
    ? 'rgba(255,255,255,0.15)'
    : 'rgba(0,0,0,0.1)';

  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.backgroundElevated }
    ]}>
      {/* Header avec navigation date */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: navBtnBg }]}
          onPress={onPrevious}
          activeOpacity={0.7}
        >
          <Text style={[styles.navButtonText, { color: colors.textPrimary }]}>
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={[styles.date, { color: colors.textPrimary }]}>
          {date}
        </Text>

        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: navBtnBg }]}
          onPress={onNext}
          activeOpacity={0.7}
        >
          <Text style={[styles.navButtonText, { color: colors.textPrimary }]}>
            ›
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Text style={styles.statIcon}>👣</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Pas
            </Text>
          </View>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {steps.toLocaleString()}
          </Text>
        </View>

        <View style={[styles.divider, { backgroundColor: dividerColor }]} />

        <View style={styles.statItem}>
          <View style={styles.statHeader}>
            <Text style={styles.statIcon}></Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Kcal
            </Text>
          </View>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {calories.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Chart avec badges */}
      <View style={styles.chartContainer}>
        {/* Badge Steps */}
        {stepsChange && (
          <View style={[styles.badge, styles.badgeLeft, { backgroundColor: badgeBg }]}>
            <Text style={[styles.badgeText, { color: badgeText }]}>
              {stepsChange}
            </Text>
          </View>
        )}

        {/* Badge Calories */}
        {caloriesChange && (
          <View style={[styles.badge, styles.badgeRight, { backgroundColor: badgeBgLight }]}>
            <Text style={[styles.badgeText, { color: badgeText }]}>
              {caloriesChange}
            </Text>
          </View>
        )}

        <BarChart data={chartData} height={100} barRadius={5} gap={4} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 22,
    fontWeight: '600',
  },
  date: {
    fontSize: 17,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statIcon: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 34,
    fontWeight: '800',
  },
  divider: {
    width: 1,
    height: 50,
  },
  chartContainer: {
    position: 'relative',
    paddingTop: 35,
  },
  badge: {
    position: 'absolute',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    zIndex: 10,
  },
  badgeLeft: {
    top: 0,
    left: '18%',
  },
  badgeRight: {
    top: 18,
    left: '52%',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default ActivityCard;
