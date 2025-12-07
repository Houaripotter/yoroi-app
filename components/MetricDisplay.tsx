import { StyleSheet, Text, View } from 'react-native';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react-native';

interface MetricDisplayProps {
  label: string;
  value: string;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  size?: 'small' | 'medium' | 'large';
  subtitle?: string;
}

export function MetricDisplay({
  label,
  value,
  unit,
  trend,
  size = 'medium',
  subtitle,
}: MetricDisplayProps) {
  const TrendIcon =
    trend === 'up'
      ? TrendingUp
      : trend === 'down'
        ? TrendingDown
        : trend === 'stable'
          ? Minus
          : null;

  const trendColor =
    trend === 'up' ? '#FF3B30' : trend === 'down' ? '#34C759' : '#8E8E93';

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text
          style={[
            styles.value,
            size === 'large' && styles.valueLarge,
            size === 'small' && styles.valueSmall,
          ]}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.unit,
            size === 'large' && styles.unitLarge,
            size === 'small' && styles.unitSmall,
          ]}
        >
          {unit}
        </Text>
        {TrendIcon && (
          <View style={styles.trendContainer}>
            <TrendIcon size={size === 'large' ? 28 : 20} color={trendColor} />
          </View>
        )}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  value: {
    fontSize: 48,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -1.5,
  },
  valueLarge: {
    fontSize: 72,
    letterSpacing: -2,
  },
  valueSmall: {
    fontSize: 32,
    letterSpacing: -1,
  },
  unit: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0,
  },
  unitLarge: {
    fontSize: 36,
  },
  unitSmall: {
    fontSize: 18,
  },
  trendContainer: {
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: 0.2,
  },
});
