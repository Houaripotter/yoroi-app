import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'right' | 'above';
  color?: 'gold' | 'success' | 'danger' | 'info';
  animated?: boolean;
  style?: ViewStyle;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = 12,
  showLabel = false,
  labelPosition = 'right',
  color = 'gold',
  style,
}) => {
  const { colors } = useTheme();
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const colorMap = {
    gold: [colors.gold, colors.goldDark] as const,
    success: [colors.success, '#16A34A'] as const,
    danger: [colors.danger, '#DC2626'] as const,
    info: [colors.info, '#2563EB'] as const,
  };

  return (
    <View style={[styles.container, style]}>
      {showLabel && labelPosition === 'above' && (
        <Text style={[styles.labelAbove, { color: colors.gold }]}>{clampedProgress.toFixed(0)}%</Text>
      )}
      <View style={styles.row}>
        <View style={[styles.track, { height, backgroundColor: colors.progressTrack }]}>
          <LinearGradient
            colors={colorMap[color]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.fill,
              { width: `${clampedProgress}%`, height, shadowColor: colors.gold },
            ]}
          />
          {showLabel && labelPosition === 'inside' && clampedProgress > 20 && (
            <Text style={[styles.labelInside, { color: colors.background }]}>{clampedProgress.toFixed(0)}%</Text>
          )}
        </View>
        {showLabel && labelPosition === 'right' && (
          <Text style={[styles.labelRight, { color: colors.textPrimary }]}>{clampedProgress.toFixed(0)}%</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  track: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  labelAbove: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  labelRight: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 40,
  },
  labelInside: {
    position: 'absolute',
    right: 8,
    fontSize: 10,
    fontWeight: '700',
  },
});

export default ProgressBar;
