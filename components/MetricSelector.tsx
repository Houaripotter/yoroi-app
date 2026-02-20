import { useRef } from 'react';
import { StyleSheet, Text, Pressable, ScrollView, Animated } from 'react-native';
import { MetricType, METRIC_CONFIGS } from '@/types/health';
import { useTheme } from '@/lib/ThemeContext';

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
  const { colors, themeName } = useTheme();
  const isWellness = false;
  const scale = useRef(new Animated.Value(1)).current;

  // Définir une couleur pastel selon la couleur active
  const getPastelColor = (baseColor: string) => {
    const colorMap: { [key: string]: string } = {
      '#34D399': colors.successLight,
      '#F59E0B': colors.warningLight,
      '#2DD4BF': '#E0F7FA',
    };
    return colorMap[baseColor] || colors.cardHover;
  };

  const backgroundColor = isSelected ? getPastelColor(color) : colors.card;
  const textColor = isSelected ? colors.textPrimary : colors.textSecondary;

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
          !isSelected && [styles.pillInactive, { borderColor: colors.border }],
          { transform: [{ scale }] },
          isWellness && {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 3,
          }
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
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  pill: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pillInactive: {
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
