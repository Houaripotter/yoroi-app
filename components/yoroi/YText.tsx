import React from 'react';
import { Text } from 'react-native';
import type { TextProps, TextStyle, StyleProp } from 'react-native';
import { useYoroiTheme } from './YoroiThemeProvider';
import { fontStyle } from './fonts';
import type { ColorToken, TypographyVariant } from './tokens';

export type YTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: TextStyle['textAlign'];
  /** Police decorative kanji (Shippori Mincho) */
  kanji?: boolean;
  style?: StyleProp<TextStyle>;
};

const HEADER_VARIANTS: TypographyVariant[] = ['h1', 'h2', 'h3'];

export function YText({
  variant = 'body',
  color,
  align,
  kanji = false,
  style,
  accessibilityRole,
  children,
  ...rest
}: YTextProps) {
  const { theme } = useYoroiTheme();
  const spec = theme.typography[variant];
  const defaultColor: ColorToken = variant === 'overline' ? 'textMuted' : 'ink';
  const role = accessibilityRole ?? (HEADER_VARIANTS.includes(variant) ? 'header' : 'text');

  return (
    <Text
      accessibilityRole={role}
      {...rest}
      style={[
        {
          fontSize: spec.fontSize,
          lineHeight: spec.lineHeight,
          letterSpacing: spec.letterSpacing,
          color: theme.colors[color ?? defaultColor],
          textAlign: align,
          textTransform: spec.uppercase ? 'uppercase' : 'none',
        },
        fontStyle(kanji ? 'kanji' : spec.weight),
        style,
      ]}
    >
      {children}
    </Text>
  );
}
