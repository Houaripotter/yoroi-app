// ============================================
// METRIC PROGRESS CARD - Carte compacte style "image 40"
// Label en haut gauche, icone haut droite, grosse valeur,
// barre de progression bicolore (remplie + fond clair)
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { MetricRange } from '@/lib/healthRanges';

interface MetricProgressCardProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  icon?: React.ReactNode;
  healthRange?: MetricRange;
  getStatus?: (value: number) => { color: string; label: string };
  formatValue?: (value: number) => string;
  onPress?: () => void;
  userGoal?: 'lose' | 'maintain' | 'gain';
  previousValue?: number | null;
  showEvolution?: boolean;
  evolutionGoal?: 'increase' | 'decrease' | 'stable';
}

export const MetricProgressCard: React.FC<MetricProgressCardProps> = ({
  label,
  value,
  unit,
  color,
  icon,
  healthRange,
  getStatus,
  formatValue,
  onPress,
  userGoal,
  previousValue,
  showEvolution,
  evolutionGoal = 'increase',
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  // Determine bar color based on status
  let barColor = color;

  if (getStatus) {
    const status = getStatus(value);
    barColor = status.color;
  } else if (userGoal && previousValue != null) {
    const diff = value - previousValue;
    const isGain = diff > 0.1;
    const isLoss = diff < -0.1;

    if (userGoal === 'lose') {
      if (isLoss) barColor = '#00D9BB';
      else if (isGain) barColor = '#FF4757';
      else barColor = '#FFB800';
    } else if (userGoal === 'gain') {
      if (isGain) barColor = '#00D9BB';
      else if (isLoss) barColor = '#FF4757';
      else barColor = '#FFB800';
    } else {
      if (Math.abs(diff) < 0.3) barColor = '#00D9BB';
      else barColor = '#FFB800';
    }
  } else if (showEvolution && previousValue != null) {
    const diff = value - previousValue;
    const threshold = value * 0.01;
    const isIncrease = diff > threshold;
    const isDecrease = diff < -threshold;

    if (evolutionGoal === 'increase') {
      if (isIncrease) barColor = '#00D9BB';
      else if (isDecrease) barColor = '#FF4757';
      else barColor = '#FFB800';
    } else if (evolutionGoal === 'decrease') {
      if (isDecrease) barColor = '#00D9BB';
      else if (isIncrease) barColor = '#FF4757';
      else barColor = '#FFB800';
    }
  }

  // Progress bar: percentage of range
  let barProgress = 50;
  if (healthRange) {
    barProgress = Math.max(3, Math.min(100, ((value - healthRange.min) / (healthRange.max - healthRange.min)) * 100));
  }

  const CardContent = (
    <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
      {/* Header: label left + icon right */}
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        {icon && (
          <View style={[styles.iconCircle, { backgroundColor: barColor + '12' }]}>
            {icon}
          </View>
        )}
      </View>

      {/* Big value */}
      <Text style={[styles.value, { color: colors.textPrimary }]} numberOfLines={1}>
        {formatValue ? formatValue(value) : value.toFixed(1)}
        {!formatValue && unit ? (
          <Text style={[styles.unit, { color: colors.textMuted }]}> {unit}</Text>
        ) : null}
      </Text>

      {/* Progress bar - bicolor: filled + light background */}
      <View style={[styles.barTrack, { backgroundColor: barColor + (isDark ? '25' : '20') }]}>
        <View
          style={[
            styles.barFill,
            {
              width: `${barProgress}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  value: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 12,
  },
  unit: {
    fontSize: 16,
    fontWeight: '600',
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
});
