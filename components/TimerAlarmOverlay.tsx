// ============================================
// TIMER ALARM OVERLAY - Style Apple Timer
// ============================================
// Full screen alarm when timer finishes
// Vibrates, plays sound, shows logo
// ============================================

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Vibration,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { soundManager } from '@/lib/sounds';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const LOGO_SIZE = 180;

interface TimerAlarmOverlayProps {
  visible: boolean;
  onDismiss: () => void;
  message?: string;
  subMessage?: string;
}

export const TimerAlarmOverlay: React.FC<TimerAlarmOverlayProps> = ({
  visible,
  onDismiss,
  message = 'TIMER TERMINÉ',
  subMessage = 'C\'est parti !',
}) => {
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const vibrationRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<NodeJS.Timeout | null>(null);

  // Pulse animation for the logo
  const startPulseAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // Glow animation
  const startGlowAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [glowAnim]);

  // Start continuous vibration
  const startVibration = useCallback(() => {
    // Initial strong vibration
    Vibration.vibrate([0, 500, 200, 500, 200, 500]);

    // Then repeat every 2 seconds
    vibrationRef.current = setInterval(() => {
      Vibration.vibrate([0, 400, 150, 400]);
    }, 2000);
  }, []);

  // Stop vibration
  const stopVibration = useCallback(() => {
    if (vibrationRef.current) {
      clearInterval(vibrationRef.current);
      vibrationRef.current = null;
    }
    Vibration.cancel();
  }, []);

  // Start sound loop
  const startSound = useCallback(async () => {
    // Play initial gong
    await soundManager.playGong();

    // Then play beep every 1.5 seconds
    soundRef.current = setInterval(async () => {
      await soundManager.playBeep();
    }, 1500);
  }, []);

  // Stop sound
  const stopSound = useCallback(() => {
    if (soundRef.current) {
      clearInterval(soundRef.current);
      soundRef.current = null;
    }
  }, []);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      startPulseAnimation();
      startGlowAnimation();
      startVibration();
      startSound();
    } else {
      stopVibration();
      stopSound();
      pulseAnim.stopAnimation();
      glowAnim.stopAnimation();
    }

    return () => {
      stopVibration();
      stopSound();
    };
  }, [visible, startPulseAnimation, startGlowAnimation, startVibration, stopVibration, startSound, stopSound, pulseAnim, glowAnim]);

  const handleDismiss = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    stopVibration();
    stopSound();
    onDismiss();
  }, [onDismiss, stopVibration, stopSound]);

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(212, 175, 55, 0.3)', 'rgba(212, 175, 55, 0.8)'],
  });

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <View style={styles.container}>
        {/* Background with subtle radial glow */}
        <Animated.View
          style={[
            styles.glowBackground,
            {
              backgroundColor: glowColor,
            },
          ]}
        />

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + 20 }]}
          onPress={handleDismiss}
          activeOpacity={0.7}
        >
          <X size={28} color="#FFF" />
        </TouchableOpacity>

        {/* Main content */}
        <View style={styles.content}>
          {/* Animated Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.logoGlow} />
            <Image
              source={require('@/assets/images/logo2010.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Message */}
          <Text style={styles.mainMessage}>{message}</Text>
          <Text style={styles.subMessage}>{subMessage}</Text>

          {/* Dismiss button */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.dismissButtonText}>ARRÊTER</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom indicator */}
        <View style={[styles.bottomIndicator, { paddingBottom: insets.bottom + 20 }]}>
          <Text style={styles.bottomText}>Appuie n'importe où pour arrêter</Text>
        </View>

        {/* Full screen touch to dismiss */}
        <TouchableOpacity
          style={styles.touchOverlay}
          onPress={handleDismiss}
          activeOpacity={1}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBackground: {
    position: 'absolute',
    width: SCREEN_WIDTH * 2,
    height: SCREEN_WIDTH * 2,
    borderRadius: SCREEN_WIDTH,
    top: SCREEN_HEIGHT / 2 - SCREEN_WIDTH,
    left: -SCREEN_WIDTH / 2,
    opacity: 0.3,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  logoContainer: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoGlow: {
    position: 'absolute',
    width: LOGO_SIZE + 40,
    height: LOGO_SIZE + 40,
    borderRadius: (LOGO_SIZE + 40) / 2,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  mainMessage: {
    color: '#D4AF37',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(212, 175, 55, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subMessage: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 60,
  },
  dismissButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 100,
  },
  dismissButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  bottomIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bottomText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '500',
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});

export default TimerAlarmOverlay;
