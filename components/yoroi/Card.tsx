import React from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from './YoroiThemeProvider';
import type { ColorToken } from './tokens';

export type CardProps = {
  children: React.ReactNode;
  variant?: 'default' | 'dark' | 'tinted';
  /** Couleur de fond pour la variante tinted */
  tint?: ColorToken;
  size?: 'md' | 'lg' | 'sm';
  padding?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Card({
  children,
  variant = 'default',
  tint = 'accentTint',
  size = 'md',
  padding = 18,
  onPress,
  accessibilityLabel,
  style,
}: CardProps) {
  const { theme } = useYoroiTheme();
  const { colors, radii, shadows } = theme;
  const radius = size === 'lg' ? radii.cardLg : size === 'sm' ? radii.cardSm : radii.card;

  const base: ViewStyle =
    variant === 'dark'
      ? { backgroundColor: colors.darkCard }
      : variant === 'tinted'
        ? { backgroundColor: colors[tint] }
        : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadows.soft };

  const cardStyle: StyleProp<ViewStyle> = [{ borderRadius: radius, padding }, base, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [cardStyle, pressed && { opacity: 0.85 }]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}
