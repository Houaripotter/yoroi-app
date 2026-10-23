import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from './YoroiThemeProvider';
import type { ColorToken } from './tokens';

export type ProgressBarProps = {
  /** Valeur entre 0 et 1 */
  progress: number;
  height?: number;
  color?: ColorToken;
  trackColor?: ColorToken;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ProgressBar({
  progress,
  height = 8,
  color = 'accent',
  trackColor = 'fillSubtle',
  accessibilityLabel,
  style,
}: ProgressBarProps) {
  const { theme } = useYoroiTheme();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[
        { height, borderRadius: height / 2, backgroundColor: theme.colors[trackColor], overflow: 'hidden' },
        style,
      ]}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: theme.colors[color],
        }}
      />
    </View>
  );
}
