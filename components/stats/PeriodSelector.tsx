// ============================================
// PERIOD SELECTOR - Pills arrondis 7J/30J/90J
// Style moderne avec animations smooth
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import * as Haptics from 'expo-haptics';

export type Period = '7j' | '30j' | '90j' | '6m' | '1a' | 'tout';

interface PeriodSelectorProps {
  selected: Period;
  onChange: (period: Period) => void;
}

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: '7j', label: '7J' },
  { value: '30j', label: '30J' },
  { value: '90j', label: '90J' },
  { value: '6m', label: '6M' },
  { value: '1a', label: '1A' },
  { value: 'tout', label: 'Tout' },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  selected,
  onChange,
}) => {
  const { colors } = useTheme();

  const handleSelect = (period: Period) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onChange(period);
  };

  return (
    <View style={styles.container}>
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
                borderColor: colors.border,
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
      </View>
    );
  };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  pillSelected: {
    // Fond avec couleur accent
  },
  pillUnselected: {
    // Fond transparent
    backgroundColor: 'transparent',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
