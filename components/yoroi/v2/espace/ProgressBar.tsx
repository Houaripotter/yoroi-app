/**
 * Barre de progression simple (vague 13) : remplace les plaques kozane hors du Dojo.
 * Une piste discrete, un remplissage arrondi a la couleur principale.
 */
import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';

export function ProgressBar({ progress, height = 10, color, track, style, accessibilityLabel }: {
  /** entre 0 et 1 */
  progress: number;
  height?: number;
  color?: string;
  track?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}
      style={[{ height, borderRadius: height / 2, backgroundColor: track ?? c.fillSubtle, overflow: 'hidden' }, style]}
    >
      <View style={{ width: `${p * 100}%`, height: '100%', borderRadius: height / 2, backgroundColor: color ?? c.accent }} />
    </View>
  );
}
