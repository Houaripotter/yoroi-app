// ============================================
// STATS EMPTY STATE
// Composant unifié pour quand un onglet Stats n'a aucune donnée.
// Au lieu d'un écran vide ou d'un spinner mystère, on guide l'utilisateur
// vers l'action concrète à faire (saisir une pesée, ajouter une séance, etc.).
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';

interface StatsEmptyStateProps {
  /** Icône en tête (composant Lucide ou autre · passé en JSX) */
  icon: React.ReactNode;
  /** Titre court et motivant */
  title: string;
  /** Sous-texte qui explique pourquoi c'est vide + ce qu'on gagne en remplissant */
  description: string;
  /** Texte du bouton CTA */
  ctaLabel: string;
  /** Route à pousser au tap. Optionnel si onCtaPress fourni. */
  ctaHref?: string;
  /** Callback custom à la place du push */
  onCtaPress?: () => void;
  /** Couleur d'accent (icône + bouton) */
  accentColor?: string;
}

const StatsEmptyStateInner: React.FC<StatsEmptyStateProps> = ({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaPress,
  accentColor = '#3B82F6',
}) => {
  const { colors, isDark } = useTheme();

  const handlePress = () => {
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    if (onCtaPress) {
      onCtaPress();
    } else if (ctaHref) {
      router.push(ctaHref as any);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
      <View style={[styles.iconCircle, { backgroundColor: accentColor + '15' }]}>
        {icon}
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>
      <TouchableOpacity
        style={[styles.cta, { backgroundColor: accentColor }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

export const StatsEmptyState = React.memo(StatsEmptyStateInner);

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 28,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
  },
  cta: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
