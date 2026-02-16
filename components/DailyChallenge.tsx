// ============================================
// YOROI - DAILY CHALLENGE
// ============================================
// Défi du jour compact avec récompense XP

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Target,
  Check,
  ChevronRight,
  Scale,
  Dumbbell,
  Camera,
  Droplets,
  BookOpen,
} from 'lucide-react-native';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// TYPES
// ============================================

export type ChallengeType = 'weight' | 'training' | 'photo' | 'hydration' | 'journal';

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  xpReward: number;
  isCompleted: boolean;
}

interface DailyChallengeProps {
  challenge: Challenge;
  onComplete: (challengeId: string) => void;
  onPress?: () => void;
}

// ============================================
// HELPERS
// ============================================

const getChallengeIcon = (type: ChallengeType) => {
  switch (type) {
    case 'weight':
      return Scale;
    case 'training':
      return Dumbbell;
    case 'photo':
      return Camera;
    case 'hydration':
      return Droplets;
    case 'journal':
      return BookOpen;
    default:
      return Target;
  }
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export const DailyChallenge: React.FC<DailyChallengeProps> = ({
  challenge,
  onComplete,
  onPress,
}) => {
  const { colors, isDark, themeName } = useTheme();
  const isWellness = false;

  // Ombres selon le thème
  const cardShadow = isWellness ? {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 6,
    elevation: 3,
  };
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkAnim = useRef(new Animated.Value(challenge.isCompleted ? 1 : 0)).current;

  const Icon = getChallengeIcon(challenge.type);

  const handleCheckPress = () => {
    if (challenge.isCompleted) return;

    // Haptic feedback
    if (Platform.OS !== 'web') {
      notificationAsync(NotificationFeedbackType.Success);
    }

    // Animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(checkAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    onComplete(challenge.id);
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      // Naviguer vers les défis
      router.push('/challenges');
    }
  };

  const checkScale = checkAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.3, 1],
  });

  return (
    <TouchableOpacity onPress={handleCardPress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: challenge.isCompleted
              ? (isWellness ? 'rgba(76,175,80,0.08)' : 'rgba(76,175,80,0.1)')
              : colors.card,
            borderColor: challenge.isCompleted
              ? 'rgba(76,175,80,0.3)'
              : colors.border,
            transform: [{ scale: scaleAnim }],
          },
          cardShadow,
        ]}
      >
        {/* Icône défi */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: challenge.isCompleted
                ? 'rgba(76,175,80,0.2)'
                : 'rgba(255,215,0,0.15)',
            },
          ]}
        >
          <Icon
            size={18}
            color={challenge.isCompleted ? '#4CAF50' : colors.gold}
          />
        </View>

        {/* Contenu */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Défi du jour
            </Text>
            <View style={[styles.xpBadge, { backgroundColor: 'rgba(255,215,0,0.15)' }]}>
              <Text style={[styles.xpText, { color: colors.gold }]}>
                +{challenge.xpReward} XP
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.title,
              {
                color: colors.textPrimary,
                textDecorationLine: challenge.isCompleted ? 'line-through' : 'none',
                opacity: challenge.isCompleted ? 0.6 : 1,
              },
            ]}
          >
            {challenge.title}
          </Text>
        </View>

        {/* Checkbox */}
        <TouchableOpacity
          onPress={handleCheckPress}
          activeOpacity={0.7}
          disabled={challenge.isCompleted}
          style={styles.checkboxTouchable}
        >
          <Animated.View
            style={[
              styles.checkbox,
              {
                backgroundColor: challenge.isCompleted
                  ? '#4CAF50'
                  : (isWellness ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'),
                borderColor: challenge.isCompleted
                  ? '#4CAF50'
                  : (isWellness ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'),
                transform: [{ scale: checkScale }],
              },
            ]}
          >
            {challenge.isCompleted && (
              <Check size={16} color="#FFFFFF" strokeWidth={3} />
            )}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ============================================
// COMPOSANT LISTE DE DÉFIS (bonus)
// ============================================

interface DailyChallengesListProps {
  challenges: Challenge[];
  onComplete: (challengeId: string) => void;
}

export const DailyChallengesList: React.FC<DailyChallengesListProps> = ({
  challenges,
  onComplete,
}) => {
  // Afficher seulement le premier défi non complété, ou le dernier si tous complétés
  const activeChallenge =
    challenges.find((c) => !c.isCompleted) || challenges[challenges.length - 1];

  if (!activeChallenge) return null;

  return (
    <DailyChallenge challenge={activeChallenge} onComplete={onComplete} />
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  xpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  xpText: {
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxTouchable: {
    padding: 4,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DailyChallenge;
