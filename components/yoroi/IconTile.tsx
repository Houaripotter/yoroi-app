import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useYoroiTheme } from './YoroiThemeProvider';
import type { ColorToken } from './tokens';

export type IconTileProps = {
  icon: LucideIcon;
  tint?: ColorToken;
  color?: ColorToken;
  size?: number;
  /** Sans label, la tuile est consideree decorative */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function IconTile({
  icon: Icon,
  tint = 'accentTint',
  color = 'accent',
  size = 44,
  accessibilityLabel,
  style,
}: IconTileProps) {
  const { theme } = useYoroiTheme();
  const decorative = !accessibilityLabel;

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={decorative}
      style={[
        {
          width: size,
          height: size,
          borderRadius: theme.radii.iconTile,
          backgroundColor: theme.colors[tint],
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Icon size={Math.round(size * 0.5)} color={theme.colors[color]} strokeWidth={2.2} />
    </View>
  );
}
