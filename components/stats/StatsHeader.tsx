// ============================================
// STATS HEADER - Titre + Description + Period Selector
// Utilisé en haut de chaque section Stats
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { PeriodSelector } from './PeriodSelector';

export type Period = '7j' | '30j' | '90j' | '6m' | 'tout';

interface StatsHeaderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
  showPeriodSelector?: boolean;
}

export const StatsHeader: React.FC<StatsHeaderProps> = React.memo(({
  title,
  description,
  icon,
  selectedPeriod,
  onPeriodChange,
  showPeriodSelector = true,
}) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
        {/* Titre + Icône */}
        <View style={styles.titleRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
        </View>

        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>

        {/* Sélecteur de période */}
        {showPeriodSelector && (
          <View style={styles.periodContainer}>
            <PeriodSelector
              selected={selectedPeriod}
              onChange={onPeriodChange}
            />
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 16,
  },
  periodContainer: {
    marginTop: 8,
  },
});
