// ============================================
// 🥊 YOROI - SÉLECTION DU SPORT (Compétiteur)
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
import * as Haptics from 'expo-haptics';
import { ChevronRight, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Sport, SPORT_LABELS, SPORT_ICONS } from '@/lib/fighterMode';
import { setUserSport } from '@/lib/fighterModeService';
import { SPACING, RADIUS } from '@/constants/appTheme';

const SPORTS: { id: Sport; label: string; icon: string; description: string }[] = [
  {
    id: 'jjb',
    label: SPORT_LABELS.jjb,
    icon: SPORT_ICONS.jjb,
    description: 'Grappling, soumissions',
  },
  {
    id: 'mma',
    label: SPORT_LABELS.mma,
    icon: SPORT_ICONS.mma,
    description: 'Arts martiaux mixtes',
  },
  {
    id: 'boxe',
    label: SPORT_LABELS.boxe,
    icon: SPORT_ICONS.boxe,
    description: 'Noble art',
  },
  {
    id: 'muay_thai',
    label: SPORT_LABELS.muay_thai,
    icon: SPORT_ICONS.muay_thai,
    description: 'Boxe thaïlandaise',
  },
  {
    id: 'judo',
    label: SPORT_LABELS.judo,
    icon: SPORT_ICONS.judo,
    description: 'Projections, contrôles',
  },
  {
    id: 'karate',
    label: SPORT_LABELS.karate,
    icon: SPORT_ICONS.karate,
    description: 'Karaté traditionnel',
  },
  {
    id: 'autre',
    label: SPORT_LABELS.autre,
    icon: SPORT_ICONS.autre,
    description: 'Autre sport de combat',
  },
];

export default function SportSelectionScreen() {
  const { colors, isDark } = useTheme();
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectSport = (sport: Sport) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedSport(sport);
  };

  const handleContinue = async () => {
    if (!selectedSport) return;

    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await setUserSport(selectedSport);
      // Continuer vers setup normal
      router.replace('/setup');
    } catch (error) {
      console.error('Error saving sport:', error);
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
          onPress={handleBack}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.header}>
          <Text style={[styles.emoji]}>🥊</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Quel est ton sport ?
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Cela nous aidera à personnaliser ton expérience
          </Text>
        </View>

        {/* Sports Grid */}
        <View style={styles.sportsGrid}>
          {SPORTS.map((sport) => {
            const isSelected = selectedSport === sport.id;

            return (
              <TouchableOpacity
                key={sport.id}
                style={[
                  styles.sportCard,
                  {
                    backgroundColor: isSelected
                      ? colors.accent
                      : colors.backgroundCard,
                    borderColor: isSelected ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => handleSelectSport(sport.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.sportIcon}>{sport.icon}</Text>
                <Text
                  style={[
                    styles.sportLabel,
                    { color: isSelected ? colors.background : colors.textPrimary },
                  ]}
                >
                  {sport.label}
                </Text>
                <Text
                  style={[
                    styles.sportDescription,
                    {
                      color: isSelected
                        ? colors.background + '99'
                        : colors.textMuted,
                    },
                  ]}
                >
                  {sport.description}
                </Text>

                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Text style={styles.checkIcon}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info */}
        <View style={[styles.infoBox, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            💡 Cette information permet de configurer les catégories de poids et
            les statistiques adaptées à ton sport
          </Text>
        </View>
      </ScrollView>

      {/* Continue Button */}
      {selectedSport && (
        <View
          style={[
            styles.bottomContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: colors.accent }]}
            onPress={handleContinue}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.continueButtonText, { color: colors.background }]}>
              {isLoading ? 'Chargement...' : 'Continuer'}
            </Text>
            <ChevronRight size={20} color={colors.background} />
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
  topBar: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  sportCard: {
    width: '47.5%',
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 2,
    alignItems: 'center',
    minHeight: 140,
    position: 'relative',
  },
  sportIcon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  sportLabel: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  sportDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  infoBox: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  infoText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
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
