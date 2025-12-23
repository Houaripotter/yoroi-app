import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  View,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';
import { LucideIcon } from 'lucide-react-native';

// ============================================
// GLASS BUTTON - LIQUID GLASS DESIGN iOS 26
// ============================================
// Bouton avec effet verre :
// - Primary : Gradient dore/accent
// - Secondary : Verre transparent
// - Ghost : Transparent avec bordure
// ============================================

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}: GlassButtonProps) {
  const { colors, isDark } = useTheme();

  const sizeStyles = {
    sm: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      fontSize: 14,
      iconSize: 16,
      borderRadius: 12,
    },
    md: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      fontSize: 16,
      iconSize: 18,
      borderRadius: 14,
    },
    lg: {
      paddingVertical: 18,
      paddingHorizontal: 24,
      fontSize: 18,
      iconSize: 20,
      borderRadius: 16,
    },
  };

  const currentSize = sizeStyles[size];

  // Couleurs selon variant
  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          gradient: [colors.gold, colors.goldDark] as [string, string],
          text: isDark ? '#0D0D0F' : '#FFFFFF',
          border: 'transparent',
          background: 'transparent',
        };
      case 'secondary':
        return {
          gradient: null,
          text: colors.textPrimary,
          border: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        };
      case 'ghost':
        return {
          gradient: null,
          text: colors.gold,
          border: isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(212, 175, 55, 0.4)',
          background: 'transparent',
        };
      case 'danger':
        return {
          gradient: [colors.danger, '#DC2626'] as [string, string],
          text: '#FFFFFF',
          border: 'transparent',
          background: 'transparent',
        };
      default:
        return {
          gradient: [colors.gold, colors.goldDark] as [string, string],
          text: '#0D0D0F',
          border: 'transparent',
          background: 'transparent',
        };
    }
  };

  const buttonColors = getColors();

  const renderContent = () => (
    <View style={styles.contentContainer}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={buttonColors.text}
        />
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon
              size={currentSize.iconSize}
              color={buttonColors.text}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              {
                fontSize: currentSize.fontSize,
                color: buttonColors.text,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {Icon && iconPosition === 'right' && (
            <Icon
              size={currentSize.iconSize}
              color={buttonColors.text}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          borderRadius: currentSize.borderRadius,
          borderColor: buttonColors.border,
          backgroundColor: buttonColors.background,
          paddingVertical: currentSize.paddingVertical,
          paddingHorizontal: currentSize.paddingHorizontal,
          opacity: disabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {/* Blur pour les boutons secondary */}
      {variant === 'secondary' && Platform.OS === 'ios' && (
        <BlurView
          intensity={15}
          style={StyleSheet.absoluteFill}
          tint={isDark ? 'dark' : 'light'}
        />
      )}

      {/* Gradient pour primary et danger */}
      {buttonColors.gradient && (
        <LinearGradient
          colors={buttonColors.gradient}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      )}

      {/* Highlight en haut */}
      {(variant === 'primary' || variant === 'danger') && (
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.25)', 'transparent']}
          style={styles.highlight}
        />
      )}

      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    overflow: 'hidden',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // Ombre
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  fullWidth: {
    width: '100%',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
});

export default GlassButton;
