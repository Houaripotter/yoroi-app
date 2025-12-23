// ============================================
// YOROI - UNLOCK POPUP
// ============================================
// Popup anime pour le deblocage d'un nouvel avatar
// Effet de lumiere, particules, sons et haptics

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Star, Check, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  AVATARS,
  RARITY_COLORS,
  AvatarData,
  AvatarRarity,
  getAvatarPreviewImage,
  formatConditionText,
  equipAvatar,
} from '@/services/AvatarService';

// ============================================
// TYPES
// ============================================

interface UnlockPopupProps {
  visible: boolean;
  avatarId: string;
  onClose: () => void;
  onEquip?: () => void;
  onViewCollection?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// COMPOSANT PARTICULE
// ============================================

interface ParticleProps {
  color: string;
  delay: number;
  startX: number;
  startY: number;
}

const Particle: React.FC<ParticleProps> = ({ color, delay, startX, startY }) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 150;
    const endX = Math.cos(angle) * distance;
    const endY = Math.sin(angle) * distance;

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: endX,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: endY,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, scale, translateX, translateY]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          left: startX,
          top: startY,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export const UnlockPopup: React.FC<UnlockPopupProps> = ({
  visible,
  avatarId,
  onClose,
  onEquip,
  onViewCollection,
}) => {
  const { colors, isDark } = useTheme();
  const [isEquipping, setIsEquipping] = useState(false);
  const [soundLoaded, setSoundLoaded] = useState(false);

  // Animations
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.5)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const avatarScale = useRef(new Animated.Value(0)).current;
  const starsOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;

  // Sound
  const soundRef = useRef<Audio.Sound | null>(null);

  // Donnees de l'avatar
  const avatar = AVATARS[avatarId];
  const rarity = avatar?.rarity || 'COMMON';
  const rarityColors = RARITY_COLORS[rarity];
  const avatarImage = getAvatarPreviewImage(avatarId);

  // Jouer le son de deblocage
  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/level_up.mp3'),
        { volume: 0.7 }
      );
      soundRef.current = sound;
      await sound.playAsync();
      setSoundLoaded(true);
    } catch (error) {
      console.log('Son non disponible:', error);
    }
  };

  // Animation d'entree
  useEffect(() => {
    if (visible) {
      // Reset animations
      backdropOpacity.setValue(0);
      cardScale.setValue(0.5);
      cardOpacity.setValue(0);
      glowScale.setValue(0);
      glowOpacity.setValue(0);
      avatarScale.setValue(0);
      starsOpacity.setValue(0);
      titleOpacity.setValue(0);
      buttonsOpacity.setValue(0);

      // Haptics
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Sound
      playSound();

      // Animation sequence
      Animated.sequence([
        // Backdrop
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Card apparait
        Animated.parallel([
          Animated.spring(cardScale, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(cardOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        // Glow explose
        Animated.parallel([
          Animated.spring(glowScale, {
            toValue: 1.2,
            tension: 30,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.8,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        // Avatar apparait
        Animated.spring(avatarScale, {
          toValue: 1,
          tension: 60,
          friction: 6,
          useNativeDriver: true,
        }),
        // Etoiles
        Animated.timing(starsOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Titre
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Boutons
        Animated.timing(buttonsOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Animation continue du glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.8,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    return () => {
      // Cleanup sound
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [visible]);

  // Equiper l'avatar
  const handleEquip = async () => {
    setIsEquipping(true);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await equipAvatar(avatarId);
      onEquip?.();
      onClose();
    } catch (error) {
      console.error('Erreur equipement:', error);
    } finally {
      setIsEquipping(false);
    }
  };

  // Voir la collection
  const handleViewCollection = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onViewCollection?.();
    onClose();
  };

  if (!avatar) return null;

  // Generer les particules
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: i % 2 === 0 ? rarityColors.border : '#FFD700',
    delay: i * 50,
    startX: SCREEN_WIDTH / 2 - 4,
    startY: SCREEN_HEIGHT / 2 - 4,
  }));

  // Etoiles de rarete
  const renderStars = () => {
    const count = rarityColors.stars;
    return (
      <Animated.View style={[styles.starsContainer, { opacity: starsOpacity }]}>
        {rarity === 'SECRET' ? (
          <Text style={styles.secretIcon}>{rarityColors.icon}</Text>
        ) : (
          Array.from({ length: Math.min(count, 5) }, (_, i) => (
            <Star
              key={i}
              size={24}
              color={rarityColors.border}
              fill={rarityColors.border}
            />
          ))
        )}
      </Animated.View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        >
          {Platform.OS === 'ios' && (
            <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
          )}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]} />
        </Animated.View>

        {/* Particules */}
        {particles.map(p => (
          <Particle
            key={p.id}
            color={p.color}
            delay={p.delay}
            startX={p.startX}
            startY={p.startY}
          />
        ))}

        {/* Card principale */}
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(18, 18, 26, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              borderColor: rarityColors.border,
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          {/* Glow derriere l'avatar */}
          <Animated.View
            style={[
              styles.glow,
              {
                backgroundColor: rarityColors.glow,
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          {/* Titre */}
          <Text style={[styles.celebration, { color: colors.gold }]}>
            NOUVEAU GUERRIER !
          </Text>

          {/* Avatar */}
          <Animated.View
            style={[
              styles.avatarContainer,
              {
                borderColor: rarityColors.border,
                shadowColor: rarityColors.border,
                transform: [{ scale: avatarScale }],
              },
            ]}
          >
            <Image
              source={avatarImage}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </Animated.View>

          {/* Etoiles de rarete */}
          {renderStars()}

          {/* Nom du guerrier */}
          <Animated.View style={{ opacity: titleOpacity }}>
            <Text style={[styles.avatarName, { color: colors.textPrimary }]}>
              {avatar.name}
            </Text>
            <Text style={[styles.rarityText, { color: rarityColors.border }]}>
              {rarity}
            </Text>
          </Animated.View>

          {/* Condition accomplie */}
          <Animated.View
            style={[
              styles.conditionContainer,
              { backgroundColor: colors.successMuted, opacity: titleOpacity },
            ]}
          >
            <Check size={16} color={colors.success} />
            <Text style={[styles.conditionText, { color: colors.success }]}>
              {formatConditionText(avatar.condition)}
            </Text>
          </Animated.View>

          {/* Boutons */}
          <Animated.View style={[styles.buttonsContainer, { opacity: buttonsOpacity }]}>
            <TouchableOpacity
              style={[styles.equipButton, { backgroundColor: colors.gold }]}
              onPress={handleEquip}
              disabled={isEquipping}
            >
              <LinearGradient
                colors={[colors.gold, colors.goldDark]}
                style={styles.equipButtonGradient}
              >
                <Text style={[styles.equipButtonText, { color: colors.background }]}>
                  {isEquipping ? 'EQUIPEMENT...' : 'EQUIPER'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.collectionButton, { borderColor: colors.border }]}
              onPress={handleViewCollection}
            >
              <Text style={[styles.collectionButtonText, { color: colors.textSecondary }]}>
                VOIR COLLECTION
              </Text>
              <ChevronRight size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  card: {
    width: SCREEN_WIDTH * 0.85,
    borderRadius: 24,
    borderWidth: 2,
    padding: 24,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: '20%',
  },
  celebration: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 16,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  secretIcon: {
    fontSize: 32,
  },
  avatarName: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  rarityText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 16,
  },
  conditionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 24,
  },
  conditionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  equipButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  equipButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  equipButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  collectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  collectionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default UnlockPopup;
