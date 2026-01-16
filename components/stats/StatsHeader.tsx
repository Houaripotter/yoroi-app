// ============================================
// STATS HEADER - Titre + Description + Period Selector
// Utilisé en haut de chaque section Stats
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { PeriodSelector } from './PeriodSelector';

export type Period = '7j' | '30j' | '90j' | '6m' | '1a' | 'tout';

interface StatsHeaderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
  showPeriodSelector?: boolean;
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({
  title,
  description,
  icon,
  selectedPeriod,
  onPeriodChange,
  showPeriodSelector = true,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
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
