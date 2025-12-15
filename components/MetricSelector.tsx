import { useRef } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Animated } from 'react-native';
import { MetricType, METRIC_CONFIGS } from '@/types/health';
import { theme } from '@/lib/theme';

interface MetricSelectorProps {
  selected: MetricType;
  onSelect: (metric: MetricType) => void;
}

export function MetricSelector({ selected, onSelect }: MetricSelectorProps) {
  const metrics: MetricType[] = ['weight', 'waist', 'arms', 'chest', 'bodyFat', 'muscleMass', 'water'];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {metrics.map((metric) => {
        const config = METRIC_CONFIGS[metric];
        const isSelected = selected === metric;

        return (
          <MetricPill
            key={metric}
            label={config.label}
            color={config.color}
            isSelected={isSelected}
            onPress={() => onSelect(metric)}
          />
        );
      })}
    </ScrollView>
  );
}

interface MetricPillProps {
  label: string;
  color: string;
  isSelected: boolean;
  onPress: () => void;
}

function MetricPill({ label, color, isSelected, onPress }: MetricPillProps) {
  const scale = useRef(new Animated.Value(1)).current;

  // Définir une couleur pastel selon la couleur active
  const getPastelColor = (baseColor: string) => {
    const colorMap: { [key: string]: string } = {
      '#34D399': theme.colors.mintPastel,
      '#F59E0B': theme.colors.orangePastel,
      '#2DD4BF': theme.colors.turquoisePastel,
    };
    return colorMap[baseColor] || theme.colors.beigeLight;
  };

  const backgroundColor = isSelected ? getPastelColor(color) : theme.colors.surface;
  const textColor = isSelected ? theme.colors.textPrimary : theme.colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
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
      <Animated.View
        style={[
          styles.pill,
          { backgroundColor },
          !isSelected && styles.pillInactive,
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[styles.pillText, { color: textColor }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingHorizontal: 4,
    paddingVertical: theme.spacing.sm,
  },
  pill: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: 10,
    borderRadius: theme.radius.full,
    ...theme.shadow.sm,
  },
  pillInactive: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  pillText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: 0.3,
  },
});
