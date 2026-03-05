// ============================================
// METRIC CARD - Card metrique avec sparkline SVG
// minHeight 200px pour eviter chevauchements
// ============================================

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  change?: string;
  onPress?: () => void;
  statusColor?: string;
  statusLabel?: string;
  sparklineData?: { value: number; date?: string }[];
}

// Smart number formatting: no ".0" for integers
const formatValue = (v: number | string): string => {
  if (typeof v === 'string') {
    const num = parseFloat(v);
    if (!isNaN(num) && Number.isInteger(num)) return String(Math.round(num));
    return v.replace(/\.0$/, '');
  }
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1).replace(/\.0$/, '');
};

export const MetricCard: React.FC<MetricCardProps> = React.memo(({
  label,
  value,
  unit,
  icon,
  color,
  trend,
  change,
  onPress,
  statusColor,
  statusLabel,
}) => {
  const { colors, isDark } = useTheme();

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      impactAsync(ImpactFeedbackStyle.Light);
    }
    onPress?.();
  }, [onPress]);

  const getTrendIcon = () => {
    if (!trend) return null;

    const iconSize = 16;
    const iconColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : colors.textMuted;

    switch (trend) {
      case 'up':
        return <TrendingUp size={iconSize} color={iconColor} strokeWidth={2.5} />;
      case 'down':
        return <TrendingDown size={iconSize} color={iconColor} strokeWidth={2.5} />;
      case 'stable':
        return <Minus size={iconSize} color={iconColor} strokeWidth={2.5} />;
    }
  };

  const Wrapper = onPress ? TouchableOpacity : View;

  const containerStyle = [
    styles.container,
    {
      backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
      borderColor: statusColor || (isDark ? (colors.companion + '12') : (colors.companion + '20')),
      borderWidth: statusColor ? 3 : 1,
    },
  ];

  return (
    <Wrapper
      onPress={onPress ? handlePress : undefined}
      activeOpacity={onPress ? 0.85 : 1}
      style={containerStyle}
    >
      {/* Header avec icone et statut/tendance */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          {icon}
        </View>

        {statusLabel && (
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        )}

        {!statusLabel && trend && (
          <View style={styles.trendBadge}>
            {getTrendIcon()}
            {change && (
              <Text style={[styles.changeText, { color: colors.textSecondary }]}>
                {change}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>

      {/* Valeur */}
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: statusColor || colors.textPrimary }]}>
          {formatValue(value)}
        </Text>
        <Text style={[styles.unit, { color: colors.textSecondary }]}>
          {unit}
        </Text>
      </View>

    </Wrapper>
  );
});

const styles = StyleSheet.create({
  container: {
    minHeight: 140,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 16,
    fontWeight: '700',
  },
});
