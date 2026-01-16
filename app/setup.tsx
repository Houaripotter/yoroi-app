import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import {
  Target,
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronRight,
  Shield,
  Swords,
  Star,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { saveUserSettings, getUserSettings } from '@/lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

type Goal = 'lose' | 'maintain' | 'gain';

export default function SetupScreen() {
  const { colors } = useTheme();

  // L'écran ne demande plus que l'objectif (prénom et genre déjà collectés dans onboarding)
  const [goal, setGoal] = useState<Goal | null>(null);
  const [existingProfile, setExistingProfile] = useState<{ username?: string; gender?: 'male' | 'female' }>({});
  const [showWelcome, setShowWelcome] = useState(false);

  // Charger le profil existant depuis onboarding
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const settings = await getUserSettings();
        setExistingProfile({
          username: settings.username,
          gender: settings.gender as 'male' | 'female' | undefined,
        });
      } catch (error) {
        logger.error('Erreur chargement profil:', error);
      }
    };
    loadProfile();
  }, []);

  const handleGoalSelected = () => {
    if (!goal) return;
    setShowWelcome(true);
  };

  const handleComplete = async () => {
    try {
      // Sauvegarder uniquement l'objectif (le reste est déjà sauvegardé)
      await saveUserSettings({
        ...existingProfile,
        goal: goal ?? undefined,
        onboardingCompleted: true,
      });

      // Marquer l'onboarding comme terminé
      await AsyncStorage.setItem('yoroi_onboarding_done', 'true');

      // Rediriger vers l'app
      router.replace('/(tabs)');
    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
    }
  };

  const canContinue = () => {
    return goal !== null;
  };

  // Page de bienvenue Team Yoroi
  if (showWelcome) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.welcomeContent}>
          {/* Logo et animation */}
          <View style={[styles.welcomeIconContainer, { backgroundColor: colors.accent + '20' }]}>
            <Shield size={80} color={colors.accentText} />
          </View>

          {/* Titre principal */}
          <Text style={[styles.welcomeTitle, { color: colors.accent }]}>
            BIENVENUE
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textPrimary }]}>
            dans la Team Yoroi
          </Text>

          {/* Message personnalisé */}
          <Text style={[styles.welcomeMessage, { color: colors.textSecondary }]}>
            {existingProfile.username ? `${existingProfile.username}, tu` : 'Tu'} fais maintenant partie de la famille des guerriers.
            {'\n'}Ensemble, on va atteindre tes objectifs !
          </Text>

          {/* Badges de bienvenue */}
          <View style={styles.welcomeBadges}>
            <View style={[styles.welcomeBadge, { backgroundColor: colors.backgroundCard }]}>
              <Swords size={20} color={colors.accentText} />
              <Text style={[styles.welcomeBadgeText, { color: colors.textPrimary }]}>
                Esprit guerrier
              </Text>
            </View>
            <View style={[styles.welcomeBadge, { backgroundColor: colors.backgroundCard }]}>
              <Star size={20} color="#FFD700" />
              <Text style={[styles.welcomeBadgeText, { color: colors.textPrimary }]}>
                Premier badge
              </Text>
            </View>
          </View>
        </View>

        {/* Bouton pour commencer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: colors.accent }]}
            onPress={handleComplete}
          >
            <Text style={[styles.continueText, { color: colors.textOnGold }]}>
              C'est parti !
            </Text>
            <ChevronRight size={22} color={colors.textOnGold} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Seule étape : Objectif (prénom et genre déjà collectés dans onboarding) */}
        <View style={styles.stepContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
            <Target size={48} color={colors.accentText} />
          </View>

          {existingProfile.username && (
            <Text style={[styles.greeting, { color: colors.textMuted }]}>
              Parfait {existingProfile.username} !
            </Text>
          )}

          <Text style={[styles.question, { color: colors.textPrimary }]}>
            Quel est ton objectif ?
          </Text>

          <View style={styles.goalsContainer}>
            <TouchableOpacity
              style={[
                styles.goalOption,
                { backgroundColor: colors.backgroundElevated },
                goal === 'lose' && {
                  backgroundColor: '#4CAF50',
                },
              ]}
              onPress={() => setGoal('lose')}
            >
              <TrendingDown
                size={28}
                color={goal === 'lose' ? '#FFF' : '#4CAF50'}
              />
              <Text style={[
                styles.goalTitle,
                { color: goal === 'lose' ? '#FFF' : colors.textPrimary },
              ]}>
                Perdre du poids
              </Text>
              <Text style={[
                styles.goalDesc,
                { color: goal === 'lose' ? '#FFF' : colors.textMuted },
              ]}>
                Brûler les graisses
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.goalOption,
                { backgroundColor: colors.backgroundElevated },
                goal === 'maintain' && {
                  backgroundColor: colors.accent,
                },
              ]}
              onPress={() => setGoal('maintain')}
            >
              <Minus
                size={28}
                color={goal === 'maintain' ? colors.textOnGold : colors.accent}
              />
              <Text style={[
                styles.goalTitle,
                { color: goal === 'maintain' ? colors.textOnGold : colors.textPrimary },
              ]}>
                Maintenir
              </Text>
              <Text style={[
                styles.goalDesc,
                { color: goal === 'maintain' ? colors.textOnGold : colors.textMuted },
              ]}>
                Garder la forme
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.goalOption,
                { backgroundColor: colors.backgroundElevated },
                goal === 'gain' && {
                  backgroundColor: '#FF6B6B',
                },
              ]}
              onPress={() => setGoal('gain')}
            >
              <TrendingUp
                size={28}
                color={goal === 'gain' ? '#FFF' : '#FF6B6B'}
              />
              <Text style={[
                styles.goalTitle,
                { color: goal === 'gain' ? '#FFF' : colors.textPrimary },
              ]}>
                Prendre du muscle
              </Text>
              <Text style={[
                styles.goalDesc,
                { color: goal === 'gain' ? '#FFF' : colors.textMuted },
              ]}>
                Prise de masse
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bouton continuer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: canContinue()
                ? colors.accent
                : colors.backgroundElevated,
            },
          ]}
          onPress={handleGoalSelected}
          disabled={!canContinue()}
        >
          <Text style={[
            styles.continueText,
            { color: canContinue() ? colors.textOnGold : colors.textMuted },
          ]}>
            Commencer
          </Text>
          <ChevronRight
            size={22}
            color={canContinue() ? colors.textOnGold : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stepContainer: {
    alignItems: 'center',
  },

  // Welcome screen
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeIconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  welcomeMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  welcomeBadges: {
    flexDirection: 'row',
    gap: 12,
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  welcomeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Icon
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },

  // Text
  greeting: {
    fontSize: 16,
    marginBottom: 8,
  },
  question: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  hint: {
    fontSize: 15,
    marginBottom: 32,
  },

  // Name input
  nameInput: {
    width: '100%',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
  },

  // Gender options
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    width: '100%',
  },
  optionsRowHealth: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
    width: '100%',
    justifyContent: 'center',
  },
  optionsColumn: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 32,
    width: '100%',
  },
  genderOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    minHeight: 140,
  },
  genderOptionHealth: {
    width: '45%',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    minHeight: 140,
  },
  genderIconContainer: {
    marginBottom: 12,
  },
  genderText: {
    fontSize: 18,
    fontWeight: '700',
  },
  checkIcon: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Goals
  goalsContainer: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  goalTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  goalDesc: {
    fontSize: 13,
  },

  // Footer
  footer: {
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  continueText: {
    fontSize: 18,
    fontWeight: '700',
  },
  stepIndicator: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
