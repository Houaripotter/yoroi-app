import React from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useYoroiTheme } from './YoroiThemeProvider';
import { YText } from './YText';

export type ListRowProps = {
  label: string;
  value?: string;
  left?: React.ReactNode;
  onPress?: () => void;
  /** Par defaut : affiche si onPress est fourni */
  showChevron?: boolean;
  divider?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function ListRow({
  label,
  value,
  left,
  onPress,
  showChevron,
  divider = true,
  accessibilityLabel,
  style,
}: ListRowProps) {
  const { theme } = useYoroiTheme();
  const { colors } = theme;
  const chevron = showChevron ?? !!onPress;

  const content = (
    <>
      {left ? <View>{left}</View> : null}
      <YText variant="body" style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </YText>
      {value ? (
        <YText variant="body" color="textMuted" numberOfLines={1}>
          {value}
        </YText>
      ) : null}
      {chevron ? <ChevronRight size={18} color={colors.textMuted} strokeWidth={2.2} /> : null}
    </>
  );

  const rowStyle: StyleProp<ViewStyle> = [
    {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: divider ? 1 : 0,
      borderBottomColor: colors.divider,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? (value ? `${label}, ${value}` : label)}
        style={({ pressed }) => [rowStyle, pressed && { opacity: 0.6 }]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={rowStyle} accessible accessibilityLabel={accessibilityLabel ?? (value ? `${label}, ${value}` : label)}>
      {content}
    </View>
  );
}
