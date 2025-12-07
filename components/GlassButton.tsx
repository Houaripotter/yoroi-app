import { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  icon?: ReactNode;
  style?: ViewStyle;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function GlassButton({
  title,
  onPress,
  icon,
  style,
  loading = false,
  disabled = false,
  variant = 'primary',
}: GlassButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[styles.container, style]}
    >
      <View
        style={[
          styles.buttonContainer,
          isPrimary ? styles.primaryBg : styles.secondaryBg,
          (disabled || loading) && styles.disabled,
        ]}
      >
        {isPrimary && (
          <BlurView
            intensity={20}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        )}
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color={isPrimary ? '#FFFFFF' : '#007AFF'} />
          ) : (
            <>
              {icon && <View style={styles.icon}>{icon}</View>}
              <Text
                style={[
                  styles.text,
                  isPrimary ? styles.primaryText : styles.secondaryText,
                ]}
              >
                {title}
              </Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonContainer: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderWidth: 1,
  },
  primaryBg: {
    backgroundColor: '#007AFF',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryBg: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  icon: {
    width: 20,
    height: 20,
  },
  text: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#007AFF',
  },
  disabled: {
    opacity: 0.5,
  },
});
