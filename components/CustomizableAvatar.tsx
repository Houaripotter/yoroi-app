import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AvatarCustomization,
  AVATAR_FRAMES,
  AVATAR_BACKGROUNDS,
  AVATAR_EFFECTS,
  FrameType,
  BackgroundType,
  EffectType,
  getAvatarCustomization,
} from '@/lib/avatarCustomization';
import { getAvatarConfig, getAvatarImage, type AvatarConfig } from '@/lib/avatarSystem';
import { useTheme } from '@/lib/ThemeContext';
import logger from '@/lib/security/logger';

// ============================================
// CUSTOMIZABLE AVATAR - AVATAR PERSONNALISABLE
// ============================================

interface CustomizableAvatarProps {
  size?: number;
  customization?: AvatarCustomization | null;
  showEffects?: boolean;
  refreshTrigger?: number;
}

export const CustomizableAvatar: React.FC<CustomizableAvatarProps> = ({
  size = 120,
  customization = null,
  showEffects = true,
  refreshTrigger = 0,
}) => {
  const { colors } = useTheme();
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null);
  const [currentCustomization, setCurrentCustomization] = useState<AvatarCustomization>({
    frame: 'none',
    background: 'black',
    effect: 'none',
  });

  // Animations
  const particleAnim = useRef(new Animated.Value(0)).current;
  const auraAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Charger l'avatar et la customization
  useEffect(() => {
    const loadData = async () => {
      try {
        const config = await getAvatarConfig();
        setAvatarConfig(config);

        if (customization) {
          setCurrentCustomization(customization);
        } else {
          const saved = await getAvatarCustomization();
          setCurrentCustomization(saved);
        }
      } catch (error) {
        logger.error('Erreur chargement avatar:', error);
      }
    };
    loadData();
  }, [refreshTrigger, customization]);

  // Animations pour les effets
  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    // Animation particules
    if (currentCustomization.effect === 'gold_particles') {
      const particleAnimation = Animated.loop(
        Animated.timing(particleAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      particleAnimation.start();
      animations.push(particleAnimation);
    }

    // Animation aura
    if (['blue_aura', 'gold_aura', 'fire_aura'].includes(currentCustomization.effect)) {
      const auraAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(auraAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(auraAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      auraAnimation.start();
      animations.push(auraAnimation);
    }

    // Animation rotation pour fonds animés
    if (['flames', 'lightning', 'cosmos', 'dragon'].includes(currentCustomization.background)) {
      const rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 10000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      rotateAnimation.start();
      animations.push(rotateAnimation);
    }

    return () => {
      animations.forEach(anim => anim.stop());
      particleAnim.setValue(0);
      auraAnim.setValue(0);
      rotateAnim.setValue(0);
    };
  }, [currentCustomization]);

  const avatarImage = avatarConfig
    ? getAvatarImage(
        avatarConfig.pack,
        avatarConfig.packType === 'character' ? avatarConfig.state : undefined,
        avatarConfig.collectionCharacter,
        avatarConfig.gender
      )
    : null;
  const frame = AVATAR_FRAMES[currentCustomization.frame];
  const background = AVATAR_BACKGROUNDS[currentCustomization.background];
  const effect = AVATAR_EFFECTS[currentCustomization.effect];

  // Interpolations
  const auraScale = auraAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });

  const auraOpacity = auraAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3],
  });

  const particleTranslateY = particleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [size, -size],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Couleur de l'aura selon l'effet
  const getAuraColor = (): string => {
    switch (currentCustomization.effect) {
      case 'blue_aura':
        return '#3B82F6';
      case 'gold_aura':
        return '#FFD700';
      case 'fire_aura':
        return '#FF4500';
      default:
        return 'transparent';
    }
  };

  // Couleurs du fond
  const getBackgroundColors = (): [string, string, ...string[]] => {
    switch (currentCustomization.background) {
      case 'black':
        return ['#0D0D0F', '#1A1A1F'];
      case 'flames':
        return ['#7F1D1D', '#FF4500', '#FF6B35'];
      case 'lightning':
        return ['#1E3A8A', '#3B82F6', '#60A5FA'];
      case 'cosmos':
        return ['#4C1D95', '#7C3AED', '#A855F7'];
      case 'dragon':
        return ['#450A0A', '#DC2626', '#7F1D1D'];
      default:
        return ['#0D0D0F', '#1A1A1F'];
    }
  };

  // Couleur du cadre
  const getFrameColor = (): string => {
    return frame.color || 'transparent';
  };

  const frameSize = size + 16;
  const bgSize = size;

  return (
    <View style={[styles.container, { width: frameSize + 20, height: frameSize + 20 }]}>
      {/* Effet Aura */}
      {showEffects && ['blue_aura', 'gold_aura', 'fire_aura'].includes(currentCustomization.effect) && (
        <Animated.View
          style={[
            styles.aura,
            {
              width: frameSize + 30,
              height: frameSize + 30,
              borderRadius: (frameSize + 30) / 2,
              backgroundColor: getAuraColor(),
              transform: [{ scale: auraScale }],
              opacity: auraOpacity,
            },
          ]}
        />
      )}

      {/* Cadre */}
      <View
        style={[
          styles.frame,
          {
            width: frameSize,
            height: frameSize,
            borderRadius: frameSize / 2,
            borderColor: getFrameColor(),
            borderWidth: currentCustomization.frame !== 'none' ? 4 : 0,
            shadowColor: getFrameColor(),
            shadowOpacity: currentCustomization.frame !== 'none' ? 0.5 : 0,
          },
        ]}
      >
        {/* Fond animé */}
        <View
          style={[
            styles.backgroundContainer,
            {
              width: bgSize,
              height: bgSize,
              borderRadius: bgSize / 2,
            },
          ]}
        >
          {currentCustomization.background !== 'black' ? (
            <Animated.View
              style={[
                styles.animatedBackground,
                {
                  width: bgSize * 2,
                  height: bgSize * 2,
                  transform: [{ rotate }],
                },
              ]}
            >
              <LinearGradient
                colors={getBackgroundColors()}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </Animated.View>
          ) : (
            <View style={[styles.solidBackground, { backgroundColor: '#0D0D0F' }]} />
          )}

          {/* Avatar */}
          {avatarImage && (
            <Image
              source={avatarImage}
              style={[
                styles.avatar,
                {
                  width: bgSize - 8,
                  height: bgSize - 8,
                  borderRadius: (bgSize - 8) / 2,
                },
              ]}
              resizeMode="cover"
            />
          )}
        </View>
      </View>

      {/* Particules dorées */}
      {showEffects && currentCustomization.effect === 'gold_particles' && (
        <View style={[styles.particlesContainer, { width: frameSize, height: frameSize }]}>
          {[...Array(8)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.particle,
                {
                  left: `${15 + (i * 10)}%`,
                  backgroundColor: '#FFD700',
                  transform: [
                    {
                      translateY: Animated.add(
                        particleTranslateY,
                        new Animated.Value(i * 15)
                      ),
                    },
                  ],
                  opacity: particleAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* Badge cadre diamant */}
      {currentCustomization.frame === 'diamond' && (
        <View style={styles.diamondBadge}>
          <View style={styles.diamondInner}>
            <View style={styles.diamondStar} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
  },
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    elevation: 8,
  },
  backgroundContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedBackground: {
    position: 'absolute',
    overflow: 'hidden',
  },
  solidBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  avatar: {
    position: 'absolute',
  },
  particlesContainer: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: 1000,
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  diamondBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#B9F2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B9F2FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  diamondInner: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
    alignItems: 'center',
    justifyContent: 'center',
  },
  diamondStar: {
    width: 8,
    height: 8,
    backgroundColor: '#B9F2FF',
    borderRadius: 1,
  },
});

export default CustomizableAvatar;
