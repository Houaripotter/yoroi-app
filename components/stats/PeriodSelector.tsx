// ============================================
// PERIOD SELECTOR - Horizontal scrollable pills
// Style moderne avec scroll horizontal
// ============================================

import React from 'react';
import { Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

export type Period = '7j' | '30j' | '90j' | '6m' | 'tout';

interface PeriodSelectorProps {
  selected: Period;
  onChange: (period: Period) => void;
}

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: 'tout', label: 'Tout' },
  { value: '7j', label: '7 jours' },
  { value: '30j', label: '30 jours' },
  { value: '90j', label: '90 jours' },
  { value: '6m', label: '6 mois' },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selected,
  onChange,
}) => {
  const { colors } = useTheme();

  const handleSelect = (period: Period) => {
    if (Platform.OS !== 'web') {
      impactAsync(ImpactFeedbackStyle.Light);
    }
    onChange(period);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scrollView}
    >
      {PERIODS.map((period) => {
        const isSelected = selected === period.value;
        return (
          <TouchableOpacity
            key={period.value}
            onPress={() => handleSelect(period.value)}
            activeOpacity={0.7}
            style={[
              styles.pill,
              {
                backgroundColor: isSelected
                  ? colors.accent
                  : colors.backgroundCard,
                borderColor: isSelected ? colors.accent : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                {
                  color: isSelected ? colors.textOnAccent : colors.textSecondary,
                  fontWeight: isSelected ? '700' : '600',
                },
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
