import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface DarkButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const DarkButton: React.FC<DarkButtonProps> = ({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
  size = 'md',
  variant = 'default',
  accessibilityLabel,
  accessibilityHint,
}) => {
  const { colors } = useTheme();

  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 14, fontSize: 13 },
    md: { paddingVertical: 14, paddingHorizontal: 20, fontSize: 15 },
    lg: { paddingVertical: 18, paddingHorizontal: 28, fontSize: 17 },
  };

  const variantStyles = {
    default: {
      backgroundColor: colors.cardHover,
      borderColor: colors.border,
      borderWidth: 1,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: colors.gold,
      borderWidth: 1,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
    },
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        styles.container,
        variantStyles[variant],
        { paddingVertical: sizeStyles[size].paddingVertical },
        { paddingHorizontal: sizeStyles[size].paddingHorizontal },
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.label,
              { fontSize: sizeStyles[size].fontSize, color: colors.textPrimary },
              variant === 'outline' && { color: colors.gold },
              textStyle,
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 12,
  },
  label: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default DarkButton;
