import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';

interface GoldButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

export const GoldButton: React.FC<GoldButtonProps> = ({
  label,
  onPress,
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
  size = 'md',
}) => {
  const { colors, gradients } = useTheme();

  const sizeStyles = {
    sm: { paddingVertical: 12, paddingHorizontal: 16, fontSize: 14 },
    md: { paddingVertical: 16, paddingHorizontal: 24, fontSize: 16 },
    lg: { paddingVertical: 20, paddingHorizontal: 32, fontSize: 18 },
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[styles.container, disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={gradients.gold}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          { paddingVertical: sizeStyles[size].paddingVertical },
          { paddingHorizontal: sizeStyles[size].paddingHorizontal },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnGold} size="small" />
        ) : (
          <>
            {icon}
            <Text
              style={[
                styles.label,
                { fontSize: sizeStyles[size].fontSize, color: colors.textOnGold },
                textStyle,
              ]}
            >
              {label}
            </Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default GoldButton;
