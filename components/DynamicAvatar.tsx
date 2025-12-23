import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  AvatarStateInfo,
  UserActivityData,
  calculateAvatarState,
  getAvatarImage,
  getAvatarGlowColor,
} from '@/lib/avatarState';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// DYNAMIC AVATAR - AVATAR GUERRIER DYNAMIQUE
// ============================================

interface DynamicAvatarProps {
  size?: number;
  showMessage?: boolean;
  showBorder?: boolean;
  showParticles?: boolean;
  onPress?: () => void;
  refreshTrigger?: number;
  activityData?: UserActivityData | null; // Compatibilité (ignoré, calcul interne)
}

export const DynamicAvatar: React.FC<DynamicAvatarProps> = ({
  size = 80,
  showMessage = false,
  showBorder = true,
  showParticles = true,
  onPress,
  refreshTrigger = 0,
  activityData, // Ignoré - calcul automatique interne
}) => {
  const { colors } = useTheme();
  const [avatarState, setAvatarState] = useState<AvatarStateInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Charger l'état de l'avatar
  const loadAvatarState = async () => {
    try {
      const state = await calculateAvatarState();
      setAvatarState(state);
      setIsLoading(false);
      
      // Animation d'entrée
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Erreur chargement avatar:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAvatarState();
  }, [refreshTrigger]);

  // Animation de glow + pulsation pour legendary
  useEffect(() => {
    if (avatarState?.state === 'legendary') {
      // Animation de glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Animation de pulsation pour legendary
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0.5);
      pulseAnim.setValue(1);
    }
  }, [avatarState?.state]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Animation de pression
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.();
  };

  if (isLoading || !avatarState) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View
          style={[
            styles.avatar,
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.card,
            },
          ]}
        />
      </View>
    );
  }

  const glowColor = getAvatarGlowColor(avatarState.state);
  const avatarImage = getAvatarImage(avatarState.state);

  // Bordure toujours dorée (3px)
  const borderColor = '#D4AF37';

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0.3, 0.8],
  });

  // Calcul de l'échelle finale (entrée + pulsation legendary)
  const finalScale = avatarState.state === 'legendary'
    ? Animated.multiply(scaleAnim, pulseAnim)
    : scaleAnim;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.9}
        disabled={!onPress}
      >
        <View style={[styles.container, { width: size, height: size }]}>
          {/* Glow effect pour legendary + particles */}
          {showParticles && avatarState.state === 'legendary' && (
            <Animated.View
              style={[
                styles.glow,
                {
                  width: size + 20,
                  height: size + 20,
                  borderRadius: (size + 20) / 2,
                  backgroundColor: glowColor,
                  opacity: glowOpacity,
                },
              ]}
            />
          )}

          {/* Avatar principal */}
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                borderColor: showBorder ? borderColor : 'transparent',
                borderWidth: showBorder ? 3 : 0,
                transform: [{ scale: finalScale }],
              },
            ]}
          >
            <Image
              source={avatarImage}
              style={[
                styles.avatar,
                {
                  width: size - 8,
                  height: size - 8,
                  borderRadius: (size - 8) / 2,
                },
              ]}
              resizeMode="cover"
            />
          </Animated.View>

          {/* Badge streak pour legendary */}
          {avatarState.state === 'legendary' && avatarState.streak >= 7 && (
            <View style={[styles.streakBadge, { backgroundColor: '#FFD700' }]}>
              <Text style={styles.streakText}>{avatarState.streak}</Text>
              <Text style={styles.fireEmoji}>🔥</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Message sous l'avatar */}
      {showMessage && (
        <View style={styles.messageContainer}>
          <Text style={[styles.message, { color: colors.gold }]}>
            {avatarState.message}
          </Text>
          <Text style={[styles.messageJp, { color: colors.textMuted }]}>
            {avatarState.messageJp}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  avatarContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  avatar: {
    backgroundColor: '#1F2937',
  },
  placeholder: {
    opacity: 0.5,
  },
  streakBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
  },
  fireEmoji: {
    fontSize: 10,
  },
  messageContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  messageJp: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default DynamicAvatar;
