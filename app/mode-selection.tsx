// ============================================
// 🥊 YOROI - SÉLECTION DU MODE
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Trophy, Heart, ChevronRight, Shield, Swords, Dumbbell, Lightbulb } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { setUserMode } from '@/lib/fighterModeService';
import { UserMode } from '@/lib/fighterMode';
import { SPACING, RADIUS } from '@/constants/appTheme';
import logger from '@/lib/security/logger';

export default function ModeSelectionScreen() {
  const { colors, isDark } = useTheme();
  const [selectedMode, setSelectedMode] = useState<UserMode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectMode = (mode: UserMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMode(mode);
  };

  const handleContinue = async () => {
    if (!selectedMode) return;

    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await setUserMode(selectedMode);

      // Si mode compétiteur, rediriger vers config sport
      if (selectedMode === 'competiteur') {
        router.replace('/sport-selection');
      } else {
        // Mode loisir, continuer l'onboarding normal
        router.replace('/setup');
      }
    } catch (error) {
      logger.error('Error saving mode:', error);
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Shield size={40} color={colors.accent} strokeWidth={2.5} />
            <Text style={[styles.logo, { color: colors.accent }]}>YOROI</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Quel champion es-tu ?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Choisis ton mode d'entraînement
          </Text>
        </View>

        {/* Mode Cards */}
        <View style={styles.modesContainer}>
          {/* MODE COMPÉTITEUR */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleSelectMode('competiteur')}
          >
            <LinearGradient
              colors={
                selectedMode === 'competiteur'
                  ? ['#FF6B35', '#FF4500']
                  : isDark
                  ? ['#1A1A1A', '#0D0D0F']
                  : ['#FFFFFF', '#F5F5F5']
              }
              style={[
                styles.modeCard,
                selectedMode === 'competiteur' && styles.modeCardSelected,
                {
                  borderColor:
                    selectedMode === 'competiteur' ? '#FF6B35' : colors.border,
                },
              ]}
            >
              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor:
                      selectedMode === 'competiteur'
                        ? 'rgba(255, 255, 255, 0.2)'
                        : colors.backgroundElevated,
                  },
                ]}
              >
                <Swords
                  size={36}
                  color={selectedMode === 'competiteur' ? '#FFFFFF' : colors.textPrimary}
                  strokeWidth={2.5}
                />
              </View>

              {/* Title */}
              <Text
                style={[
                  styles.modeTitle,
                  {
                    color:
                      selectedMode === 'competiteur' ? '#FFFFFF' : colors.textPrimary,
                  },
                ]}
              >
                COMPÉTITEUR
              </Text>

              {/* Description */}
              <Text
                style={[
                  styles.modeDescription,
                  {
                    color:
                      selectedMode === 'competiteur'
                        ? 'rgba(255, 255, 255, 0.9)'
                        : colors.textSecondary,
                  },
                ]}
              >
                Je veux performer
              </Text>

              {/* Features */}
              <View style={styles.featuresList}>
                {[
                  'Je prépare une compétition',
                  'Je gère ma catégorie de poids',
                  'Je veux un suivi professionnel',
                ].map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Text
                      style={[
                        styles.featureBullet,
                        {
                          color:
                            selectedMode === 'competiteur'
                              ? 'rgba(255, 255, 255, 0.7)'
                              : colors.textMuted,
                        },
                      ]}
                    >
                      •
                    </Text>
                    <Text
                      style={[
                        styles.featureText,
                        {
                          color:
                            selectedMode === 'competiteur'
                              ? 'rgba(255, 255, 255, 0.9)'
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Selected Badge */}
              {selectedMode === 'competiteur' && (
                <View style={styles.selectedBadge}>
                  <Trophy size={16} color="#FFFFFF" />
                  <Text style={styles.selectedText}>Sélectionné</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* MODE LOISIR */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleSelectMode('loisir')}
          >
            <LinearGradient
              colors={
                selectedMode === 'loisir'
                  ? ['#0ABAB5', '#089E9A']
                  : isDark
                  ? ['#1A1A1A', '#0D0D0F']
                  : ['#FFFFFF', '#F5F5F5']
              }
              style={[
                styles.modeCard,
                selectedMode === 'loisir' && styles.modeCardSelected,
                {
                  borderColor:
                    selectedMode === 'loisir' ? '#0ABAB5' : colors.border,
                },
              ]}
            >
              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor:
                      selectedMode === 'loisir'
                        ? 'rgba(255, 255, 255, 0.2)'
                        : colors.backgroundElevated,
                  },
                ]}
              >
                <Dumbbell
                  size={36}
                  color={selectedMode === 'loisir' ? '#FFFFFF' : colors.textPrimary}
                  strokeWidth={2.5}
                />
              </View>

              {/* Title */}
              <Text
                style={[
                  styles.modeTitle,
                  {
                    color:
                      selectedMode === 'loisir' ? '#FFFFFF' : colors.textPrimary,
                  },
                ]}
              >
                LOISIR
              </Text>

              {/* Description */}
              <Text
                style={[
                  styles.modeDescription,
                  {
                    color:
                      selectedMode === 'loisir'
                        ? 'rgba(255, 255, 255, 0.9)'
                        : colors.textSecondary,
                  },
                ]}
              >
                Je m'entraîne pour la forme
              </Text>

              {/* Features */}
              <View style={styles.featuresList}>
                {[
                  'Je veux me défouler',
                  'Je progresse à mon rythme',
                  'Je cherche le bien-être',
                ].map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Text
                      style={[
                        styles.featureBullet,
                        {
                          color:
                            selectedMode === 'loisir'
                              ? 'rgba(255, 255, 255, 0.7)'
                              : colors.textMuted,
                        },
                      ]}
                    >
                      •
                    </Text>
                    <Text
                      style={[
                        styles.featureText,
                        {
                          color:
                            selectedMode === 'loisir'
                              ? 'rgba(255, 255, 255, 0.9)'
                              : colors.textMuted,
                        },
                      ]}
                    >
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Selected Badge */}
              {selectedMode === 'loisir' && (
                <View style={styles.selectedBadge}>
                  <Heart size={16} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.selectedText}>Sélectionné</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.infoContent}>
            <Lightbulb size={16} color={colors.textMuted} strokeWidth={2} />
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Tu pourras changer de mode à tout moment dans les réglages
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      {selectedMode && (
        <View
          style={[
            styles.bottomContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.continueButton,
              {
                backgroundColor:
                  selectedMode === 'competiteur' ? '#FF6B35' : '#0ABAB5',
              },
            ]}
            onPress={handleContinue}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? 'Chargement...' : 'Continuer'}
            </Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
    paddingTop: SPACING.xl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 2,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  logo: {
    fontSize: 40,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  modesContainer: {
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  modeCard: {
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    borderWidth: 2,
    position: 'relative',
    minHeight: 240,
  },
  modeCardSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  modeTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  modeDescription: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.lg,
  },
  featuresList: {
    gap: SPACING.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  featureBullet: {
    fontSize: 16,
    lineHeight: 20,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  selectedBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoBox: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    textAlign: 'center',
  },
  bottomContainer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
