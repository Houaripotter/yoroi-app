// ============================================
// EMPTY STATE COMPONENT - States vides animés
// ============================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  Trophy,
  Plus,
  Sparkles,
  Target,
  Flame,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

type EmptyStateType = 'calendar' | 'programme' | 'journal' | 'clubs' | 'competitions';

interface EmptyStateProps {
  type: EmptyStateType;
  onAction?: () => void;
}

const EMPTY_STATE_CONFIG = {
  calendar: {
    icon: Calendar,
    gradient: ['#3B82F6', '#2563EB'] as const,
    title: 'Commence ton aventure',
    message: 'Ajoute ta première séance d\'entraînement pour suivre ta progression',
    actionLabel: 'Ajouter une séance',
    emoji: '🗓️',
  },
  programme: {
    icon: Clock,
    gradient: ['#8B5CF6', '#7C3AED'] as const,
    title: 'Planifie ta semaine',
    message: 'Crée ton emploi du temps hebdomadaire pour rester régulier',
    actionLabel: 'Créer mon planning',
    emoji: '📋',
  },
  journal: {
    icon: BookOpen,
    gradient: ['#EF4444', '#DC2626'] as const,
    title: 'Documente ta progression',
    message: 'Enregistre tes progrès, compétences et benchmarks personnels',
    actionLabel: 'Ouvrir le carnet',
    emoji: '📖',
  },
  clubs: {
    icon: Users,
    gradient: ['#10B981', '#059669'] as const,
    title: 'Ajoute ton club',
    message: 'Enregistre tes clubs d\'entraînement pour mieux organiser tes séances',
    actionLabel: 'Ajouter un club',
    emoji: '',
  },
  competitions: {
    icon: Trophy,
    gradient: ['#F59E0B', '#D97706'] as const,
    title: 'Trouve ta prochaine compétition',
    message: 'Fixe-toi un objectif et inscris-toi à ton premier événement',
    actionLabel: 'Découvrir les événements',
    emoji: '',
  },
};

export const EmptyState: React.FC<EmptyStateProps> = ({ type, onAction }) => {
  const { colors } = useTheme();
  const config = EMPTY_STATE_CONFIG[type];

  // Animations
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation de bounce pour l'icône
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 1000,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation de pulse pour le cercle
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const Icon = config.icon;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Cercle animé avec gradient */}
      <Animated.View
        style={[
          styles.iconWrapper,
          {
            transform: [
              { translateY: bounceAnim },
              { scale: pulseAnim },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconGradient}
        >
          <Icon size={48} color="#FFFFFF" strokeWidth={2.5} />

          {/* Sparkles animés */}
          <View style={styles.sparkle1}>
            <Sparkles size={20} color="#FFFFFF" opacity={0.6} />
          </View>
          <View style={styles.sparkle2}>
            <Sparkles size={16} color="#FFFFFF" opacity={0.4} />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Emoji décoratif */}
      <Text style={styles.emoji}>{config.emoji}</Text>

      {/* Titre */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {config.title}
      </Text>

      {/* Message */}
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {config.message}
      </Text>

      {/* Bouton d'action */}
      {onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          >
            <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.actionText}>{config.actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Flame motivante */}
      <View style={styles.motivationBadge}>
        <Flame size={14} color="#F59E0B" fill="#F59E0B" />
        <Text style={[styles.motivationText, { color: colors.textMuted }]}>
          Chaque champion a commencé ici
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  sparkle1: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 15,
    left: 15,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 300,
  },
  actionButton: {
    marginBottom: 24,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  motivationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  motivationText: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
});
