// ============================================
// RING CHART - Anneaux concentriques Apple Santé style
// Pour composition corporelle (masse grasse, muscle, eau, etc.)
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { CircularProgress } from '@/components/charts/CircularProgress';

interface Ring {
  percentage: number;
  color: string;
  label: string;
  value?: string;
}

interface RingChartProps {
  rings: Ring[];
  size?: number;
  strokeWidth?: number;
}

export const RingChart: React.FC<RingChartProps> = ({
  rings,
  size = 200,
  strokeWidth = 12,
}) => {
  const { colors } = useTheme();

  // Calculer les tailles pour anneaux concentriques
  const getRingSize = (index: number) => {
    return size - (index * (strokeWidth + 8));
  };

  return (
    <View style={styles.container}>
      {/* Anneaux concentriques */}
      <View style={styles.ringsContainer}>
        {rings.map((ring, index) => {
          const ringSize = getRingSize(index);
          return (
            <View
              key={index}
              style={[
                styles.ringWrapper,
                {
                  position: index === 0 ? 'relative' : 'absolute',
                  top: index > 0 ? (size - ringSize) / 2 : 0,
                  left: index > 0 ? (size - ringSize) / 2 : 0,
                },
              ]}
            >
              <CircularProgress
                percentage={ring.percentage}
                size={ringSize}
                strokeWidth={strokeWidth}
                color={ring.color}
                backgroundColor={`${ring.color}20`}
              />
            </View>
          );
        })}
      </View>

      {/* Légende */}
      <View style={styles.legend}>
        {rings.map((ring, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ring.color }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
              {ring.label}
            </Text>
            {ring.value && (
              <Text style={[styles.legendValue, { color: colors.textPrimary }]}>
                {ring.value}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  ringsContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrapper: {
    // Position relative pour le premier, absolute pour les autres
  },
  legend: {
    width: '100%',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
