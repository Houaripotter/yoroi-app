// ============================================
// YOROI - AVATAR DISPLAY
// ============================================
// Composant reutilisable pour afficher l'avatar equipe
// Affiche l'etat dynamique selon le Score Forme

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import { Flame, Zap, Minus, Moon, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  AVATARS,
  RARITY_COLORS,
  AvatarState,
  getAvatarImage,
  getEquippedAvatar,
  getCurrentFitnessScore,
  getAvatarStateFromScore,
} from '@/services/AvatarService';

// ============================================
// TYPES
// ============================================

type AvatarSize = 'small' | 'medium' | 'large' | 'xlarge';

interface AvatarDisplayProps {
  size?: AvatarSize;
  showState?: boolean;
  showBorder?: boolean;
  showGlow?: boolean;
  onPress?: () => void;
  refreshTrigger?: number;
  avatarId?: string; // Pour forcer un avatar specifique
  state?: AvatarState; // Pour forcer un etat specifique
}

const SIZE_MAP: Record<AvatarSize, { width: number; height: number }> = {
  small: { width: 48, height: 64 },
  medium: { width: 70, height: 100 },
  large: { width: 90, height: 130 }, // Avatar debout (3:4 ratio)
  xlarge: { width: 110, height: 160 },
};

// ============================================
// COMPOSANT
// ============================================

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  size = 'medium',
  showState = true,
  showBorder = true,
  showGlow = true,
  onPress,
  refreshTrigger = 0,
  avatarId: forcedAvatarId,
  state: forcedState,
}) => {
  const { colors } = useTheme();
  const [avatarId, setAvatarId] = useState<string>('samurai');
  const [currentState, setCurrentState] = useState<AvatarState>('neutral');
  const [fitnessScore, setFitnessScore] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Animations
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0.5)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Taille en pixels
  const { width: avatarWidth, height: avatarHeight } = SIZE_MAP[size];

  // Charger les donnees
  const loadData = useCallback(async () => {
    try {
      if (forcedAvatarId) {
        setAvatarId(forcedAvatarId);
      } else {
        const equipped = await getEquippedAvatar();
        setAvatarId(equipped);
      }

      if (forcedState) {
        setCurrentState(forcedState);
      } else {
        const score = await getCurrentFitnessScore();
        setFitnessScore(score);
        setCurrentState(getAvatarStateFromScore(score));
      }

      setIsLoading(false);

      // Animation d'entree
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Erreur chargement avatar display:', error);
      setIsLoading(false);
    }
  }, [forcedAvatarId, forcedState, scaleAnim]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshTrigger]);

  // Animation de glow + pulsation pour legendary
  useEffect(() => {
    if (currentState === 'legendary' && showGlow) {
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

      // Animation de pulsation
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
  }, [currentState, showGlow, glowAnim, pulseAnim]);

  // Gestion du clic
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

  // Placeholder pendant le chargement
  if (isLoading) {
    return (
      <View style={[styles.container, { width: avatarWidth, height: avatarHeight }]}>
        <View
          style={[
            styles.placeholder,
            {
              width: avatarWidth,
              height: avatarHeight,
              borderRadius: 16,
              backgroundColor: colors.backgroundCard,
            },
          ]}
        />
      </View>
    );
  }

  // Donnees de l'avatar
  const avatar = AVATARS[avatarId];
  const rarity = avatar?.rarity || 'COMMON';
  const rarityColors = RARITY_COLORS[rarity];
  const avatarImage = getAvatarImage(avatarId, currentState);

  // Couleur de bordure basee sur la rarete
  const borderColor = showBorder ? rarityColors.border : 'transparent';

  // Glow pour legendary
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0.3, 0.8],
  });

  // Scale finale (entree + pulsation)
  const finalScale = currentState === 'legendary'
    ? Animated.multiply(scaleAnim, pulseAnim)
    : scaleAnim;

  // Icone d'etat
  const getStateIcon = () => {
    const iconSize = size === 'small' ? 12 : size === 'medium' ? 16 : 20;

    switch (currentState) {
      case 'legendary':
        return <Flame size={iconSize} color="#FFD700" />;
      case 'strong':
        return <Zap size={iconSize} color="#4ECDC4" />;
      case 'neutral':
        return null; // Pas d'icône pour neutral
      case 'tired':
        return <Moon size={iconSize} color="#F59E0B" />;
      case 'down':
        return <AlertTriangle size={iconSize} color="#EF4444" />;
      default:
        return null;
    }
  };

  // Couleur de fond de l'indicateur d'etat
  const getStateBackgroundColor = () => {
    switch (currentState) {
      case 'legendary':
        return 'rgba(255, 215, 0, 0.2)';
      case 'strong':
        return 'rgba(78, 205, 196, 0.2)';
      case 'neutral':
        return 'rgba(156, 163, 175, 0.2)';
      case 'tired':
        return 'rgba(245, 158, 11, 0.2)';
      case 'down':
        return 'rgba(239, 68, 68, 0.2)';
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  };

  const content = (
    <View style={[styles.container, { width: avatarWidth, height: avatarHeight }]}>
      {/* Glow effect pour legendary */}
      {showGlow && currentState === 'legendary' && (
        <Animated.View
          style={[
            styles.glow,
            {
              width: avatarWidth + 20,
              height: avatarHeight + 20,
              borderRadius: 24,
              backgroundColor: '#FFD700',
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
            width: avatarWidth,
            height: avatarHeight,
            borderRadius: 16, // Coins arrondis légers au lieu de cercle
            borderColor: borderColor,
            borderWidth: showBorder ? 3 : 0,
            transform: [{ scale: finalScale }],
            shadowColor: rarityColors.border,
            shadowOpacity: rarity === 'LEGENDARY' || rarity === 'SECRET' ? 0.6 : 0.3,
            backgroundColor: colors.backgroundCard, // Adapté au thème
          },
        ]}
      >
        <Image
          source={avatarImage}
          style={[
            styles.avatar,
            {
              width: avatarWidth - 8,
              height: avatarHeight - 8,
            },
          ]}
          resizeMode="contain" // Voir l'avatar en entier
        />
      </Animated.View>

      {/* Indicateur d'etat */}
      {showState && size !== 'small' && getStateIcon() && (
        <View
          style={[
            styles.stateIndicator,
            {
              backgroundColor: getStateBackgroundColor(),
              borderColor: colors.border,
              bottom: size === 'large' ? 4 : 0,
              right: size === 'large' ? 4 : -2,
            },
          ]}
        >
          {getStateIcon()}
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    opacity: 0.5,
  },
  glow: {
    position: 'absolute',
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 10,
  },
  avatar: {
    // Pas de backgroundColor fixe, adapté au conteneur
  },
  stateIndicator: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});

export default AvatarDisplay;
