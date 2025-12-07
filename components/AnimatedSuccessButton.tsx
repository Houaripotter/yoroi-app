import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Check } from 'lucide-react-native';

interface AnimatedSuccessButtonProps {
  title: string;
  onPress: () => Promise<void> | void;
  icon?: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
}

export function AnimatedSuccessButton({
  title,
  onPress,
  icon,
  style,
  disabled = false,
}: AnimatedSuccessButtonProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handlePress = async () => {
    if (disabled || loading || success) return;

    setLoading(true);
    try {
      await onPress();
      setSuccess(true);
    } catch (error) {
      console.error('Button action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const backgroundColor = success ? '#34C759' : '#007AFF';

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading || success}
      activeOpacity={0.7}
      style={[styles.container, style]}
    >
      <View
        style={[
          styles.buttonContainer,
          { backgroundColor },
          disabled && styles.disabled,
        ]}
      >
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : success ? (
            <>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.text}>Enregistré !</Text>
            </>
          ) : (
            <>
              {icon && <View style={styles.icon}>{icon}</View>}
              <Text style={styles.text}>{title}</Text>
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonContainer: {
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.5,
  },
});
