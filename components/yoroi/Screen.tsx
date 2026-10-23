import React from 'react';
import { ScrollView, View } from 'react-native';
import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from './YoroiThemeProvider';
import { sizes, spacing } from './tokens';

/** Espace a reserver en bas d'un ecran pour la barre d'onglets flottante */
export function useFloatingTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + sizes.tabBarBottom + sizes.tabBarHeight + spacing.screen;
}

export type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  /** Reserve la place de la barre d'onglets flottante (defaut true) */
  withTabBarInset?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, 'contentContainerStyle' | 'style'>;
};

export function Screen({
  children,
  scroll = true,
  withTabBarInset = true,
  contentContainerStyle,
  scrollViewProps,
}: ScreenProps) {
  const { theme } = useYoroiTheme();
  const insets = useSafeAreaInsets();
  const tabInset = useFloatingTabBarInset();
  const paddingBottom = withTabBarInset ? tabInset : insets.bottom + theme.spacing.screen;

  const inner: StyleProp<ViewStyle> = [
    { paddingHorizontal: theme.spacing.screen, paddingTop: insets.top + 8, paddingBottom },
    contentContainerStyle,
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
          contentContainerStyle={inner}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </View>
  );
}
