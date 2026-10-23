import React from 'react';
import { Pressable } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useYoroiTheme } from './YoroiThemeProvider';
import { YText } from './YText';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: LucideIcon;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, selected = false, onPress, icon: Icon, accessibilityLabel, style }: ChipProps) {
  const { theme } = useYoroiTheme();
  const { colors, radii } = theme;
  const textColor = selected ? 'background' : 'textSecondary';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [
        {
          minHeight: 36,
          paddingHorizontal: 14,
          borderRadius: radii.chip,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: selected ? colors.ink : colors.surface,
          borderWidth: 1,
          borderColor: selected ? colors.ink : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {Icon ? <Icon size={15} color={colors[textColor]} strokeWidth={2.4} /> : null}
      <YText variant="small" color={textColor}>
        {label}
      </YText>
    </Pressable>
  );
}
