import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useYoroiTheme } from './YoroiThemeProvider';
import { YText } from './YText';
import { traduire } from '@/lib/i18n/tr';

export type FloatingTabItem = {
  key: string;
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  renderIcon: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
  accessibilityLabel?: string;
};

export type FloatingTabBarViewProps = {
  /** 4 onglets conseilles : 2 a gauche, 2 a droite du bouton central */
  items: FloatingTabItem[];
  onPressAdd: () => void;
  addLabel?: string;
  /** true : rendu dans le flux (aperçu), false : flottant en bas d'ecran */
  inline?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FloatingTabBarView({
  items,
  onPressAdd,
  addLabel = traduire('Ajouter'),
  inline = false,
  style,
}: FloatingTabBarViewProps) {
  const { theme } = useYoroiTheme();
  const { colors, sizes, shadows } = theme;
  const insets = useSafeAreaInsets();
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);

  const renderItem = (item: FloatingTabItem) => {
    const color = item.focused ? colors.accent : colors.textMuted;
    return (
      <Pressable
        key={item.key}
        onPress={item.onPress}
        onLongPress={item.onLongPress}
        accessibilityRole="tab"
        accessibilityLabel={item.accessibilityLabel ?? item.label}
        accessibilityState={{ selected: item.focused }}
        style={styles.tab}
      >
        {item.renderIcon({ focused: item.focused, color, size: 22 })}
        <YText
          variant="small"
          numberOfLines={1}
          style={{ fontSize: 11, lineHeight: 14, marginTop: 3, color }}
        >
          {item.label}
        </YText>
      </Pressable>
    );
  };

  const addSize = sizes.tabBarAddButton;

  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          height: sizes.tabBarHeight,
          borderRadius: sizes.tabBarRadius,
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 6,
        },
        shadows.soft,
        inline
          ? null
          : {
              position: 'absolute',
              left: sizes.tabBarSide,
              right: sizes.tabBarSide,
              bottom: sizes.tabBarBottom + insets.bottom,
            },
        style,
      ]}
    >
      {left.map(renderItem)}
      <View style={styles.addSlot}>
        <Pressable
          onPress={onPressAdd}
          accessibilityRole="button"
          accessibilityLabel={addLabel}
          style={({ pressed }) => ({
            width: addSize,
            height: addSize,
            borderRadius: addSize / 2,
            marginTop: -addSize / 2,
            backgroundColor: pressed ? colors.accentPressed : colors.accent,
            borderWidth: sizes.tabBarAddBorder,
            borderColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.95 : 1 }],
            ...shadows.soft,
          })}
        >
          <Plus size={26} color={colors.onAccent} strokeWidth={2.6} />
        </Pressable>
      </View>
      {right.map(renderItem)}
    </View>
  );
}

export type FloatingTabBarProps = BottomTabBarProps & {
  onPressAdd: () => void;
  addLabel?: string;
};

function isHidden(options: BottomTabBarProps['descriptors'][string]['options']): boolean {
  const flat = StyleSheet.flatten(options.tabBarItemStyle);
  if (flat && flat.display === 'none') return true;
  const withHref = options as { href?: unknown };
  return withHref.href === null;
}

/** A passer a <Tabs tabBar={(props) => <FloatingTabBar {...props} onPressAdd={...} />} /> */
export function FloatingTabBar({ state, descriptors, navigation, onPressAdd, addLabel }: FloatingTabBarProps) {
  const items: FloatingTabItem[] = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => !isHidden(descriptors[route.key].options))
    .map(({ route, index }) => {
      const { options } = descriptors[route.key];
      const focused = state.index === index;
      const label =
        typeof options.tabBarLabel === 'string'
          ? options.tabBarLabel
          : typeof options.title === 'string'
            ? options.title
            : route.name;

      return {
        key: route.key,
        label,
        focused,
        accessibilityLabel: options.tabBarAccessibilityLabel,
        renderIcon: (p) => (options.tabBarIcon ? options.tabBarIcon(p) : null),
        onPress: () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        },
        onLongPress: () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        },
      };
    });

  return <FloatingTabBarView items={items} onPressAdd={onPressAdd} addLabel={addLabel} />;
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
