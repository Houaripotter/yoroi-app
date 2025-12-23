import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View, Animated } from 'react-native';
import { TrendingDown, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface WeightTrendCardProps {
  period: string;
  change: number;
  isPositive?: boolean;
}

export function WeightTrendCard({ period, change, isPositive = true }: WeightTrendCardProps) {
  const { colors, isDark, themeName } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const isWellness = false;

  const backgroundColor = isPositive ? colors.successLight : colors.warningLight;
  const textColor = isPositive ? colors.success : colors.warning;
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
      <Animated.View style={[
        styles.container,
        {
          backgroundColor,
          transform: [{ scale }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: isWellness ? 4 : 2 },
          shadowOpacity: isWellness ? 0.1 : (isDark ? 0.3 : 0.08),
          shadowRadius: isWellness ? 8 : 4,
          elevation: isWellness ? 6 : 3,
        }
      ]}>
        <Text style={[styles.period, { color: colors.textSecondary }]}>{period}</Text>
        <View style={styles.changeRow}>
          <Icon size={20} color={textColor} strokeWidth={2.5} />
          <Text style={[styles.change, { color: textColor }]}>
            {change > 0 ? '+' : ''}{change.toFixed(1)}
          </Text>
          <Text style={[styles.unit, { color: colors.textSecondary }]}>kg</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 24,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  period: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  change: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
