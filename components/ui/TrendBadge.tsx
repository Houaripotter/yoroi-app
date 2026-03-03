import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

interface TrendBadgeProps {
  value: number;
  /** Optional unit suffix (e.g. "kg", "%") */
  unit?: string;
  /** Invert colors: positive = bad (red), negative = good (green) */
  invertColors?: boolean;
  size?: 'sm' | 'md';
}

const COLORS = {
  green: '#10B981',
  greenBg: '#DCFCE7',
  greenBgDark: 'rgba(16, 185, 129, 0.12)',
  red: '#EF4444',
  redBg: '#FEE2E2',
  redBgDark: 'rgba(239, 68, 68, 0.12)',
  neutral: '#9BB0BF',
  neutralBg: '#F1F5F9',
  neutralBgDark: 'rgba(155, 176, 191, 0.12)',
};

export const TrendBadge: React.FC<TrendBadgeProps> = ({
  value,
  unit = '',
  invertColors = false,
  size = 'sm',
}) => {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  let badgeColor: string;
  let bgColor: string;

  if (isNeutral) {
    badgeColor = COLORS.neutral;
    bgColor = COLORS.neutralBg;
  } else if (invertColors ? isNegative : isPositive) {
    // Good direction
    badgeColor = COLORS.green;
    bgColor = COLORS.greenBg;
  } else {
    // Bad direction
    badgeColor = COLORS.red;
    bgColor = COLORS.redBg;
  }

  const iconSize = size === 'sm' ? 10 : 12;
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  const formatted = `${isPositive ? '+' : ''}${value}${unit}`;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, size === 'md' && styles.badgeMd]}>
      <Icon size={iconSize} color={badgeColor} />
      <Text style={[styles.text, { color: badgeColor }, size === 'md' && styles.textMd]}>
        {formatted}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeMd: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
  },
  textMd: {
    fontSize: 12,
  },
});

export default TrendBadge;
