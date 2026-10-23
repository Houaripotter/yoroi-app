import React from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useYoroiTheme } from './YoroiThemeProvider';
import { YText } from './YText';

export type ScreenHeaderProps = {
  title: string;
  /** Affiche un bouton retour si fourni */
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ScreenHeader({ title, onBack, backLabel = 'Retour', right, style }: ScreenHeaderProps) {
  const { theme } = useYoroiTheme();
  const { colors, sizes } = theme;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: theme.spacing.gap }, style]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={({ pressed }) => ({
            width: sizes.touchMin,
            height: sizes.touchMin,
            borderRadius: sizes.touchMin / 2,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ChevronLeft size={22} color={colors.ink} strokeWidth={2.4} />
        </Pressable>
      ) : null}
      <YText variant="h1" numberOfLines={1} style={{ flex: 1 }}>
        {title}
      </YText>
      {right ? <View>{right}</View> : null}
    </View>
  );
}
