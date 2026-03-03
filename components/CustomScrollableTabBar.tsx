import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// TAB BAR GUERRIER - FLOTTANTE
// ============================================
// Fond: rgba(30, 30, 36, 0.95) avec blur
// Bouton central: Gradient or avec glow
// Icônes: Or quand actif, gris sinon

export function CustomScrollableTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, themeName } = useTheme();
  const isWellness = false;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom - 8, 8) },
      ]}
    >
      <View style={[
        styles.tabBar,
        { backgroundColor: colors.tabBar },
        isWellness && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.2,
          shadowRadius: 16,
          elevation: 12,
        }
      ]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;
          const isCenterButton = route.name === 'add';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const Icon = options.tabBarIcon;
          const hasLabel = label && typeof label === 'string' && label.length > 0;

          // Bouton central spécial
          if (isCenterButton) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.8}
                style={styles.centerButtonContainer}
              >
                <LinearGradient
                  colors={[colors.gold, colors.goldDark]}
                  style={[
                    styles.centerButton,
                    {
                      shadowColor: colors.gold,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 8,
                      elevation: 8,
                    }
                  ]}
                >
                  {Icon && Icon({
                    focused: isFocused,
                    color: colors.background,
                    size: 28,
                  })}
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                {Icon && Icon({
                  focused: isFocused,
                  color: isFocused ? colors.gold : colors.tabBarInactive,
                  size: 24,
                })}
              </View>
              {hasLabel && (
                <Text
                  style={[
                    styles.label,
                    { color: isFocused ? colors.gold : colors.tabBarInactive },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 24,
    height: 70,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 56,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  centerButtonContainer: {
    marginTop: -24,
  },
  centerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CustomScrollableTabBar;
