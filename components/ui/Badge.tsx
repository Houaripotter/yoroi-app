import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface BadgeProps {
  label: string;
  icon?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  icon,
  color,
  size = 'md',
  style,
}) => {
  const { colors } = useTheme();
  const badgeColor = color || colors.gold;

  const sizeStyles = {
    sm: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, iconSize: 10 },
    md: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 12, iconSize: 12 },
    lg: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, iconSize: 14 },
  };

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: badgeColor },
        { paddingHorizontal: sizeStyles[size].paddingHorizontal },
        { paddingVertical: sizeStyles[size].paddingVertical },
        style,
      ]}
    >
      {icon && (
        <Text style={{ fontSize: sizeStyles[size].iconSize }}>{icon}</Text>
      )}
      <Text
        style={[
          styles.label,
          { fontSize: sizeStyles[size].fontSize, color: colors.textOnGold },
        ]}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default Badge;
