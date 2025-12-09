import { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { theme } from '@/lib/theme';
import { Badge } from '@/types/badges';

interface BadgeItemProps {
  badge: Badge;
  unlocked: boolean;
  onPress?: () => void;
  showAnimation?: boolean;
}

export function BadgeItem({ badge, unlocked, onPress, showAnimation = false }: BadgeItemProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(unlocked ? 1 : 0.5)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showAnimation && unlocked) {
      // Animation de célébration quand le badge est débloqué
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
            transform: [{ scale }, { rotate: spin }],
            opacity,
          },
        ]}
      >
        <View
          style={[
            styles.badge,
            {
              backgroundColor: unlocked ? badge.color : theme.colors.borderLight,
              borderColor: unlocked ? badge.color : theme.colors.border,
            },
          ]}
        >
          <Text style={styles.icon}>{badge.icon}</Text>
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, !unlocked && styles.lockedText]}>{badge.name}</Text>
          <Text style={[styles.description, !unlocked && styles.lockedText]}>
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    ...theme.shadow.sm,
    position: 'relative',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    ...theme.shadow.md,
  },
  icon: {
    fontSize: 32,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  description: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
    lineHeight: theme.fontSize.sm * 1.4,
  },
  lockedText: {
    opacity: 0.6,
  },
  lockOverlay: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
  },
  lockIcon: {
    fontSize: 20,
  },
});
