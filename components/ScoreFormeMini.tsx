// ============================================
// YOROI - SCORE FORME MINI
// ============================================
// Affichage compact du Fitness Score en une ligne

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Activity } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// TYPES
// ============================================

interface ScoreFormeMiniProps {
  score: number;
  onPress?: () => void;
}

// ============================================
// HELPERS
// ============================================

/**
 * Obtient l'emoji selon le score
 */
const getScoreEmoji = (score: number): string => {
  if (score >= 90) return '';
  if (score >= 80) return '😄';
  if (score >= 60) return '😊';
  if (score >= 40) return '😐';
  if (score >= 20) return '😔';
  return '😢';
};

/**
 * Obtient le label selon le score
 */
const getScoreLabel = (score: number): string => {
  if (score >= 90) return 'LÉGENDAIRE';
  if (score >= 80) return 'EXCELLENT';
  if (score >= 60) return 'BIEN';
  if (score >= 40) return 'MOYEN';
  if (score >= 20) return 'À AMÉLIORER';
  return 'CRITIQUE';
};

/**
 * Obtient les couleurs du gradient selon le score
 */
const getScoreColors = (score: number): string[] => {
  if (score >= 80) return ['#4CAF50', '#2E7D32']; // Vert
  if (score >= 60) return ['#8BC34A', '#558B2F']; // Vert clair
  if (score >= 40) return ['#FFC107', '#FF9800']; // Jaune-orange
  if (score >= 20) return ['#FF9800', '#F57C00']; // Orange
  return ['#F44336', '#C62828']; // Rouge
};

/**
 * Obtient la couleur du score
 */
const getScoreColor = (score: number): string => {
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#8BC34A';
  if (score >= 40) return '#FFC107';
  if (score >= 20) return '#FF9800';
  return '#F44336';
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export const ScoreFormeMini: React.FC<ScoreFormeMiniProps> = ({
  score,
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
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animation de la barre
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: score,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [score]);

  // Animation de pulsation si excellent score
  useEffect(() => {
    if (score >= 80) {
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
    }
  }, [score]);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const emoji = getScoreEmoji(score);
  const label = getScoreLabel(score);
  const gradientColors = getScoreColors(score);
  const scoreColor = getScoreColor(score);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/stats');
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ scale: score >= 80 ? pulseAnim : 1 }],
          },
          cardShadow,
        ]}
      >
        {/* Icône */}
        <View style={[styles.iconContainer, { backgroundColor: `${scoreColor}20` }]}>
          <Activity size={18} color={scoreColor} />
        </View>

        {/* Texte Score Forme */}
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          Score Forme
        </Text>

        {/* Emoji */}
        <Text style={styles.emoji}>{emoji}</Text>

        {/* Score */}
        <Text style={[styles.score, { color: scoreColor }]}>{score}</Text>

        {/* Barre mini */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { backgroundColor: `${scoreColor}20` }]}>
            <Animated.View style={{ width: widthInterpolated, height: '100%' }}>
              <LinearGradient
                colors={gradientColors as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressFill}
              />
            </Animated.View>
          </View>
        </View>

        {/* Label */}
        <Text style={[styles.label, { color: scoreColor }]}>{label}</Text>

        {/* Chevron */}
        <ChevronRight size={18} color={colors.textMuted} />
      </Animated.View>
    </TouchableOpacity>
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
    padding: 14,
    gap: 10,
    borderWidth: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  emoji: {
    fontSize: 20,
  },
  score: {
    fontSize: 22,
    fontWeight: '800',
    minWidth: 30,
  },
  progressContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default ScoreFormeMini;
