import React from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { LucideIcon } from 'lucide-react-native';
import { useYoroiTheme } from './YoroiThemeProvider';
import { YText } from './YText';
import type { ColorToken } from './tokens';

export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'ghost';
export type ButtonSize = 'lg' | 'md';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

type VariantColors = { bg: ColorToken; bgPressed: ColorToken; text: ColorToken; border?: ColorToken };

const VARIANTS: Record<ButtonVariant, VariantColors> = {
  primary: { bg: 'accent', bgPressed: 'accentPressed', text: 'onAccent' },
  dark: { bg: 'darkCard', bgPressed: 'darkCard', text: 'onDark' },
  secondary: { bg: 'surface', bgPressed: 'fillSoft', text: 'ink', border: 'border' },
  ghost: { bg: 'transparent', bgPressed: 'fillSoft', text: 'accent' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  disabled = false,
  icon: Icon,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  const { theme } = useYoroiTheme();
  const { colors, radii, sizes } = theme;
  const v = VARIANTS[variant];
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const height = size === 'lg' ? sizes.buttonLg : sizes.buttonMd;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withTiming(0.97, { duration: 110 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 160 });
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={[fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }, style]}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            {
              height,
              borderRadius: radii.button,
              paddingHorizontal: size === 'lg' ? 24 : 18,
              backgroundColor: colors[pressed ? v.bgPressed : v.bg],
              borderWidth: v.border ? 1 : 0,
              borderColor: v.border ? colors[v.border] : colors.transparent,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.45 : 1,
            },
            animatedStyle,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {Icon ? <Icon size={size === 'lg' ? 20 : 18} color={colors[v.text]} strokeWidth={2.4} /> : null}
            <YText variant={size === 'lg' ? 'title' : 'small'} color={v.text} numberOfLines={1}>
              {label}
            </YText>
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}
