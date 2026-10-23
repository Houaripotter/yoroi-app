import React from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from './YoroiThemeProvider';
import { YText } from './YText';

export type SegmentOption<T extends string> = { value: T; label: string; accessibilityLabel?: string };

export type SegmentedControlProps<T extends string> = {
  /** 2 a 4 options */
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: SegmentedControlProps<T>) {
  const { theme } = useYoroiTheme();
  const { colors, radii, shadows, sizes } = theme;
  const items = options.slice(0, 4);

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.fillSubtle,
          borderRadius: radii.segment,
          padding: 4,
          minHeight: sizes.touchMin + 4,
        },
        style,
      ]}
    >
      {items.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityLabel={opt.accessibilityLabel ?? opt.label}
            accessibilityState={{ selected }}
            style={[
              {
                flex: 1,
                minHeight: sizes.touchMin - 4,
                borderRadius: radii.segment - 3,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
                backgroundColor: selected ? colors.pill : colors.transparent,
              },
              selected ? shadows.pill : shadows.none,
            ]}
          >
            <YText variant="small" color={selected ? 'ink' : 'textMuted'} numberOfLines={1}>
              {opt.label}
            </YText>
          </Pressable>
        );
      })}
    </View>
  );
}
