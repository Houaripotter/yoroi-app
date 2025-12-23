import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Audio } from 'expo-av';
import { useTheme } from '@/lib/ThemeContext';
import * as Haptics from 'expo-haptics';

// ============================================
// CELEBRATION - ANIMATIONS DE VICTOIRE
// ============================================

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export type CelebrationType =
  | 'goal_reached'      // Objectif de poids atteint
  | 'rank_up'           // Montée de rang
  | 'challenge_complete' // Défi hebdomadaire complété
  | 'streak_record'     // Nouveau record de streak
  | 'milestone';        // Milestone (100ème pesée, etc.)

interface CelebrationProps {
  visible: boolean;
  type: CelebrationType;
  title: string;
  subtitle?: string;
  xpGained?: number;
  icon?: string;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

// Configuration par type de célébration
const CELEBRATION_CONFIG: Record<CelebrationType, {
  icon: string;
  colors: readonly [string, string];
  confettiColors: string[];
  sound: 'victory' | 'level_up';
}> = {
  goal_reached: {
    icon: '🎯',
    colors: ['#FFD700', '#FFA500'] as const,
    confettiColors: ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4'],
    sound: 'victory',
  },
  rank_up: {
    icon: '⚔️',
    colors: ['#D4AF37', '#B8860B'] as const,
    confettiColors: ['#D4AF37', '#FFD700', '#FFFFFF', '#C0C0C0'],
    sound: 'level_up',
  },
  challenge_complete: {
    icon: '🏆',
    colors: ['#4ECDC4', '#44A08D'] as const,
    confettiColors: ['#4ECDC4', '#44A08D', '#FFD700', '#FFFFFF'],
    sound: 'victory',
  },
  streak_record: {
    icon: '🔥',
    colors: ['#FF6B6B', '#FF8E53'] as const,
    confettiColors: ['#FF6B6B', '#FF8E53', '#FFD700', '#FFA500'],
    sound: 'victory',
  },
  milestone: {
    icon: '⭐',
    colors: ['#9B59B6', '#8E44AD'] as const,
    confettiColors: ['#9B59B6', '#E74C3C', '#FFD700', '#3498DB'],
    sound: 'level_up',
  },
};

export const Celebration: React.FC<CelebrationProps> = ({
  visible,
  type,
  title,
  subtitle,
  xpGained,
  icon,
  onClose,
  autoClose = true,
  autoCloseDelay = 4000,
}) => {
  const { colors } = useTheme();
  const config = CELEBRATION_CONFIG[type];
  const confettiRef = useRef<any>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  // Animations
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.5)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const xpTranslateY = useRef(new Animated.Value(20)).current;
  const xpScale = useRef(new Animated.Value(0.5)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Jouer le son
  const playSound = async () => {
    try {
      // Charger et jouer le son selon le type
      const soundFile = config.sound === 'victory'
        ? require('@/assets/sounds/victory.mp3')
        : require('@/assets/sounds/level_up.mp3');

      const { sound: audioSound } = await Audio.Sound.createAsync(soundFile);
      setSound(audioSound);
      await audioSound.playAsync();
    } catch (error) {
      // Son non disponible, continuer sans
      console.log('Son non disponible:', error);
    }
  };

  // Nettoyer le son
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Animations d'entrée
  useEffect(() => {
    if (visible) {
      // Reset animations
      overlayOpacity.setValue(0);
      cardScale.setValue(0.5);
      cardOpacity.setValue(0);
      iconScale.setValue(0);
      iconRotate.setValue(0);
      xpOpacity.setValue(0);
      xpTranslateY.setValue(20);
      xpScale.setValue(0.5);

      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Jouer le son
      playSound();

      // Lancer le confetti
      setTimeout(() => {
        confettiRef.current?.start();
      }, 200);

      // Séquence d'animations
      Animated.sequence([
        // Overlay fade in
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Card apparaît
        Animated.parallel([
          Animated.spring(cardScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Icône avec rotation
        Animated.parallel([
          Animated.spring(iconScale, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(iconRotate, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
        ]),
        // XP animation (si présent)
        ...(xpGained ? [
          Animated.parallel([
            Animated.timing(xpOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.spring(xpTranslateY, {
              toValue: 0,
              tension: 50,
              friction: 7,
              useNativeDriver: true,
            }),
            Animated.spring(xpScale, {
              toValue: 1,
              tension: 50,
              friction: 7,
              useNativeDriver: true,
            }),
          ]),
        ] : []),
      ]).start();

      // Animation shimmer continue
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Auto-close
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [visible]);

  // Animation de sortie
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Rotation de l'icône
  const iconRotation = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Shimmer position
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Overlay sombre */}
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Confetti */}
        <ConfettiCannon
          ref={confettiRef}
          count={100}
          origin={{ x: screenWidth / 2, y: -20 }}
          fadeOut
          colors={config.confettiColors}
          explosionSpeed={350}
          fallSpeed={3000}
          autoStart={false}
        />

        {/* Carte de célébration */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              transform: [{ scale: cardScale }],
              opacity: cardOpacity,
            },
          ]}
        >
          {/* Gradient border top */}
          <LinearGradient
            colors={config.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientBorder}
          />

          {/* Shimmer effect */}
          <Animated.View
            style={[
              styles.shimmer,
              {
                transform: [{ translateX: shimmerTranslate }],
              },
            ]}
          >
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Icône animée */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: config.colors[0] + '20',
                transform: [
                  { scale: iconScale },
                  { rotate: iconRotation },
                ],
              },
            ]}
          >
            <Text style={styles.icon}>{icon || config.icon}</Text>
          </Animated.View>

          {/* Titre */}
          <Text style={[styles.title, { color: config.colors[0] }]}>
            {title}
          </Text>

          {/* Sous-titre */}
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}

          {/* XP Gained */}
          {xpGained && xpGained > 0 && (
            <Animated.View
              style={[
                styles.xpContainer,
                {
                  opacity: xpOpacity,
                  transform: [
                    { translateY: xpTranslateY },
                    { scale: xpScale },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.xpBadge}
              >
                <Text style={styles.xpText}>+{xpGained} XP</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Bouton continuer */}
          <TouchableOpacity
            style={[styles.continueButton, { borderColor: colors.border }]}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.continueText, { color: colors.textSecondary }]}>
              Continuer
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  card: {
    width: screenWidth * 0.85,
    maxWidth: 340,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  gradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  xpContainer: {
    marginBottom: 24,
  },
  xpBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  xpText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1,
  },
  continueButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  continueText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Celebration;
