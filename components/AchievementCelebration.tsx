// ============================================
// YOROI - ANIMATION CÉLÉBRATION ACHIEVEMENT
// ============================================
// Animation plein écran quand un achievement est débloqué

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AchievementCelebrationProps {
  visible: boolean;
  achievementName: string;
  achievementNameJp: string;
  icon: React.ReactNode;
  color: string;
  reward: string;
  type: 'badge' | 'rank' | 'level';
  onClose: () => void;
}

// Composant Confetti
const Confetti: React.FC<{ color: string; delay: number }> = ({ color, delay }) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(Math.random() * SCREEN_WIDTH)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT + 100,
        duration: 3000 + Math.random() * 1000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: (Math.random() - 0.5) * 200,
        duration: 3000,
        delay,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rotate, {
          toValue: 360,
          duration: 1000,
          useNativeDriver: true,
        })
      ),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 3000,
        delay: delay + 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          backgroundColor: color,
          transform: [
            { translateX },
            { translateY },
            { rotate: rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
          ],
          opacity,
        },
      ]}
    />
  );
};

export const AchievementCelebration: React.FC<AchievementCelebrationProps> = ({
  visible,
  achievementName,
  achievementNameJp,
  icon,
  color,
  reward,
  type,
  onClose,
}) => {
  const { colors } = useTheme();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      if (Platform.OS !== 'web') {
        notificationAsync(NotificationFeedbackType.Success);
      }

      // Animations
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideUpAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();

      // Auto-close après 4 secondes
      const timeout = setTimeout(() => {
        onClose();
      }, 4000);

      return () => clearTimeout(timeout);
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      slideUpAnim.setValue(50);
    }
  }, [visible]);

  const getTypeLabel = () => {
    switch (type) {
      case 'badge':
        return 'BADGE DÉBLOQUÉ';
      case 'rank':
        return 'NOUVEAU RANG';
      case 'level':
        return 'NIVEAU SUPÉRIEUR';
      default:
        return 'ACHIEVEMENT';
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={80} style={styles.overlay}>
        {/* Confetti */}
        {visible &&
          Array.from({ length: 30 }).map((_, i) => (
            <Confetti
              key={i}
              color={i % 3 === 0 ? color : i % 3 === 1 ? '#FFD700' : '#FFFFFF'}
              delay={i * 50}
            />
          ))}

        {/* Achievement Card */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundCard,
              borderColor: color,
              transform: [{ scale: scaleAnim }, { translateY: slideUpAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.glow,
              {
                backgroundColor: color,
                opacity: glowOpacity,
              },
            ]}
          />

          {/* Type label */}
          <View style={[styles.typeLabel, { backgroundColor: color }]}>
            <Sparkles size={14} color="#FFFFFF" />
            <Text style={styles.typeLabelText}>{getTypeLabel()}</Text>
          </View>

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              {icon}
            </Animated.View>
          </View>

          {/* Name */}
          <Text style={[styles.achievementName, { color: color }]}>{achievementName}</Text>
          <Text style={[styles.achievementNameJp, { color: colors.textMuted }]}>
            {achievementNameJp}
          </Text>

          {/* Reward */}
          <View style={[styles.rewardBadge, { backgroundColor: `${color}15` }]}>
            <Text style={[styles.rewardText, { color: color }]}>🎁 {reward}</Text>
          </View>

          {/* Sparkles decoration */}
          <View style={styles.sparklesRow}>
            <Text style={styles.sparkle}>✨</Text>
            <Text style={styles.sparkle}>⭐</Text>
            <Text style={styles.sparkle}>✨</Text>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  card: {
    width: SCREEN_WIDTH * 0.85,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  glow: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 28,
  },
  typeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  typeLabelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  achievementName: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  achievementNameJp: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  rewardBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: '700',
  },
  sparklesRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  sparkle: {
    fontSize: 24,
  },
});

export default AchievementCelebration;
