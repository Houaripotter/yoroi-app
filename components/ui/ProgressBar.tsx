import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// PROGRESS BAR - LIQUID GLASS iOS 26
// ============================================

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
  height = 10,
  showLabel = false,
  labelPosition = 'right',
  color = 'gold',
  style,
}) => {
  const { colors, isDark, theme } = useTheme();
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const colorMap = {
    gold: [colors.accent, colors.accentLight] as const,
    success: [colors.success, '#16A34A'] as const,
    danger: [colors.danger, '#DC2626'] as const,
    info: [colors.info, '#2563EB'] as const,
  };

  // Liquid Glass track background
  const trackBackground = isDark
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={[styles.container, style]}>
      {showLabel && labelPosition === 'above' && (
        <Text style={[styles.labelAbove, { color: colors.accent }]}>{clampedProgress.toFixed(0)}%</Text>
      )}
      <View style={styles.row}>
        <View
          style={[
            styles.track,
            {
              height,
              backgroundColor: trackBackground,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
            },
          ]}
        >
          {/* Progress fill with gradient */}
          <View style={[styles.fillContainer, { width: `${clampedProgress}%` }]}>
            <LinearGradient
              colors={colorMap[color]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.fill, { height }]}
            />
            {/* Highlight on top of fill */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.35)', 'transparent']}
              style={[styles.fillHighlight, { height: height / 2 }]}
            />
          </View>
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
    borderWidth: 1,
  },
  fillContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 5,
  },
  fill: {
    borderRadius: 5,
    // Glow effect
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  fillHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
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
