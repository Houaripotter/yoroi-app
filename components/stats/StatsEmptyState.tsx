// ============================================
// Etat vide des statistiques (refonte v2)
// Guide l'utilisateur vers l'action concrete a faire.
// API inchangee.
// ============================================

import React from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { ENTREE } from '@/components/yoroi/v2/accueil/kit';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';

interface StatsEmptyStateProps {
  /** Icone en tete (passee en JSX) */
  icon: React.ReactNode;
  /** Titre court et motivant */
  title: string;
  /** Sous-texte : pourquoi c'est vide et ce qu'on gagne en remplissant */
  description: string;
  /** Texte du bouton */
  ctaLabel: string;
  /** Route a ouvrir a l'appui. Optionnel si onCtaPress fourni. */
  ctaHref?: string;
  /** Action personnalisee a la place de la navigation */
  onCtaPress?: () => void;
  /** Couleur d'accent (liseré de l'icone) */
  accentColor?: string;
}

const StatsEmptyStateInner: React.FC<StatsEmptyStateProps> = ({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  onCtaPress,
  accentColor,
}) => {
  const { theme } = useYoroiTheme();
  const c = theme.colors;

  const handlePress = () => {
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    if (onCtaPress) {
      onCtaPress();
    } else if (ctaHref) {
      router.push(ctaHref as any);
    }
  };

  return (
    <Animated.View
      entering={ENTREE}
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.divider, shadowColor: c.shadow }]}
    >
      <View pointerEvents="none" style={styles.kanjiWrap}>
        <Glyph kind="sakura" size={140} color={c.fillSoft} />
      </View>
      <View style={[styles.iconTile, { backgroundColor: c.background, borderColor: c.divider }]}>
        {icon}
        <View style={[styles.iconLace, { backgroundColor: accentColor ?? c.accent }]} />
      </View>
      <Ink size={21} weight="black" tight style={styles.title}>
        {title}
      </Ink>
      <Ink size={14} weight="medium" color={c.textSecondary} style={styles.description}>
        {description}
      </Ink>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: pressed ? c.accentPressed : c.accent, shadowColor: c.accent, transform: [{ scale: pressed ? 0.98 : 1 }] },
        ]}
      >
        <Ink size={16} weight="extraBold" color={c.onAccent}>
          {ctaLabel}
        </Ink>
      </Pressable>
    </Animated.View>
  );
};

export const StatsEmptyState = React.memo(StatsEmptyStateInner);

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 34,
    paddingBottom: 22,
    paddingHorizontal: 22,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 22,
    elevation: 3,
  },
  kanjiWrap: {
    position: 'absolute',
    right: -18,
    top: -24,
  },
  kanji: {
    lineHeight: 170,
  },
  iconTile: {
    width: 76,
    height: 76,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    overflow: 'hidden',
  },
  iconLace: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.85,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    maxWidth: 320,
  },
  cta: {
    alignSelf: 'stretch',
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
});
