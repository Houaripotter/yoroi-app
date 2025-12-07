import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View, Animated } from 'react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { theme } from '@/lib/theme';

interface WeightTrendCardProps {
  period: string;
  change: number;
  isPositive?: boolean;
}

export function WeightTrendCard({ period, change, isPositive = true }: WeightTrendCardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const backgroundColor = isPositive ? theme.colors.mintPastel : theme.colors.orangePastel;
  const textColor = isPositive ? theme.colors.primary : theme.colors.secondary;
  const Icon = isPositive ? TrendingDown : TrendingUp;

  return (
    <Pressable
      onPressIn={() => {
        Animated.spring(scale, {
          toValue: 0.95,
          useNativeDriver: true,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      }}
    >
      <Animated.View style={[styles.container, { backgroundColor, transform: [{ scale }] }]}>
        <Text style={styles.period}>{period}</Text>
        <View style={styles.changeContainer}>
          <Icon size={20} color={textColor} strokeWidth={2.5} />
          <Text style={[styles.change, { color: textColor }]}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}
          </Text>
        </View>
        <Text style={styles.unit}>kg</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: theme.radius.xxl,
    padding: theme.spacing.lg,
    justifyContent: 'space-between',
    ...theme.shadow.sm,
  },
  period: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  change: {
    fontSize: 28,
    fontWeight: theme.fontWeight.black,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
  },
});
