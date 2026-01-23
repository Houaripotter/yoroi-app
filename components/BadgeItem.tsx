import { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Badge } from '@/types/badges';

interface BadgeItemProps {
  badge: Badge;
  unlocked: boolean;
  onPress?: () => void;
  showAnimation?: boolean;
}

export function BadgeItem({ badge, unlocked, onPress, showAnimation = false }: BadgeItemProps) {
  const { colors, isDark, themeName } = useTheme();
  const isWellness = false;

  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(unlocked ? 1 : 0.5)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showAnimation && unlocked) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1.2,
            useNativeDriver: true,
          }),
          Animated.timing(rotation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showAnimation, unlocked]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            transform: [{ scale }, { rotate: spin }],
            opacity,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: isWellness ? 4 : 2 },
            shadowOpacity: isWellness ? 0.1 : (isDark ? 0.3 : 0.08),
            shadowRadius: isWellness ? 8 : 4,
            elevation: isWellness ? 6 : 3,
          },
        ]}
      >
        <View
          style={[
            styles.badge,
            {
              backgroundColor: unlocked ? (isDark ? colors.cardHover : colors.gold + '15') : colors.border,
              borderColor: unlocked ? colors.gold : colors.border,
              shadowColor: colors.gold,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: unlocked ? 0.3 : 0,
              shadowRadius: 8,
              elevation: unlocked ? 4 : 0,
            },
          ]}
        >
          <Text style={styles.icon}>{badge.icon}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary }, !unlocked && styles.lockedText]}>
            {badge.name}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }, !unlocked && styles.lockedText]}>
            {badge.description}
          </Text>
        </View>
        {!unlocked && (
          <View style={styles.lockOverlay}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    position: 'relative',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  icon: {
    fontSize: 32,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  lockedText: {
    opacity: 0.6,
  },
  lockOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  lockIcon: {
    fontSize: 20,
  },
});
