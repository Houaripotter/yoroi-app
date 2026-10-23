/**
 * Texte de la refonte v2 : taille, graisse et couleur en props, police Archivo avec repli systeme.
 */
import React from 'react';
import { Text } from 'react-native';
import type { TextProps } from 'react-native';
import { fontStyle } from '../fonts';
import type { FontWeightKey } from '../tokens';
import { useYoroiTheme } from '../YoroiThemeProvider';

export type InkProps = TextProps & {
  size?: number;
  weight?: FontWeightKey | 'kanji';
  color?: string;
  tight?: boolean;
};

export function Ink({ size = 15, weight = 'medium', color, tight, style, ...rest }: InkProps) {
  const { theme } = useYoroiTheme();
  const letterSpacing = tight ? -Math.round(size * 0.045 * 10) / 10 : 0;
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.4}
      {...rest}
      style={[
        fontStyle(weight),
        { fontSize: size, lineHeight: Math.round(size * (size > 40 ? 1.0 : 1.3)), letterSpacing, color: color ?? theme.colors.ink },
        style,
      ]}
    />
  );
}
