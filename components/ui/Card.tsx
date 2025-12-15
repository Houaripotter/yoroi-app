import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'gold' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'md',
}) => {
  const { colors } = useTheme();

  const paddingValues = {
    none: 0,
    sm: 12,
    md: 20,
    lg: 24,
  };

  const variantStyles = {
    default: {
      borderColor: colors.border,
    },
    gold: {
      borderColor: colors.borderGold,
    },
    elevated: {
      borderColor: colors.border,
      ...theme.shadows.card,
    },
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card },
        variantStyles[variant],
        { padding: paddingValues[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.xl,
    borderWidth: 1,
  },
});

export default Card;
