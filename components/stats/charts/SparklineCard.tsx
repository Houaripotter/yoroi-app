// ============================================
// SPARKLINE CARD - Card métrique avec mini graphique
// minHeight 200px pour éviter chevauchements
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { ModernLineChart } from './ModernLineChart';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING_H = 16;
const CARD_GAP = 16;
const COLUMNS = 2;
const AVAILABLE_WIDTH = SCREEN_WIDTH - (CARD_PADDING_H * 2);
const CARD_WIDTH = (AVAILABLE_WIDTH - CARD_GAP) / COLUMNS;
const SPARKLINE_WIDTH = CARD_WIDTH - 40;

interface SparklineCardProps {
  label: string;
  value: number | string;
  unit: string;
  sparklineData: { value: number }[];
  color: string;
  trend?: 'up' | 'down' | 'stable';
  change?: string;
  onPress?: () => void;
}

export const SparklineCard: React.FC<SparklineCardProps> = ({
  label,
  value,
  unit,
  sparklineData,
  color,
  trend,
  change,
  onPress,
}) => {
  const { colors } = useTheme();

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

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

  return (
    <Wrapper
      onPress={onPress ? handlePress : undefined}
      activeOpacity={onPress ? 0.85 : 1}
      style={[
        styles.container,
        { backgroundColor: colors.backgroundCard, borderColor: colors.border },
      ]}
    >
      {/* Header avec tendance */}
      {trend && (
        <View style={styles.header}>
          <View style={styles.trendBadge}>
            {getTrendIcon()}
            {change && (
              <Text style={[styles.changeText, { color: colors.textSecondary }]}>
                {change}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Label */}
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>

      {/* Valeur */}
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </Text>
        <Text style={[styles.unit, { color: colors.textSecondary }]}>
          {unit}
        </Text>
      </View>

      {/* Mini graphique scrollable */}
      <View style={styles.sparklineContainer}>
        <ModernLineChart
          data={sparklineData.map((d, index) => ({
            value: d.value,
            date: new Date(Date.now() - (sparklineData.length - index) * 24 * 60 * 60 * 1000).toISOString()
          }))}
          color={color}
          height={90}
          compact={true}
          showGrid={false}
        />
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 200, // Au lieu de 140px
    padding: 20,    // Au lieu de 14px
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    marginBottom: 8,
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
    marginBottom: 12,
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
  sparklineContainer: {
    marginTop: 'auto',
    marginHorizontal: 0, // Au lieu de -6 (cause des chevauchements)
  },
});
