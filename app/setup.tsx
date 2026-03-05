import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import {
  Target,
  TrendingDown,
  TrendingUp,
  Minus,
  ChevronRight,
} from 'lucide-react-native';
import { saveUserSettings, getUserSettings } from '@/lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
import { usePreventDoubleClick } from '@/hooks/usePreventDoubleClick';

type Goal = 'lose' | 'maintain' | 'gain';

// Couleurs forcées en mode CLAIR pour le setup (thème Classic)
const SETUP_COLORS = {
  background: '#F7F7F7',
  backgroundCard: '#FFFFFF',
  backgroundElevated: '#F0F0F0',
  textPrimary: '#1A1A1A',
  textSecondary: '#555555',
  textMuted: '#666666',
  accent: '#1A1A1A',
  accentText: '#FFFFFF',
  textOnGold: '#FFFFFF',  // Blanc sur fond noir
  border: '#E0E0E0',
};

export default function SetupScreen() {
  // Utiliser les couleurs forcées claires
  const colors = SETUP_COLORS;

  // 🔒 PROTECTION ANTI-SPAM : Hook pour empêcher les double-clics
  const { isProcessing: isSaving, executeOnce } = usePreventDoubleClick({ delay: 800 });

  // L'écran ne demande plus que l'objectif (prénom et genre déjà collectés dans onboarding)
  const [goal, setGoal] = useState<Goal | null>(null);
  const [existingProfile, setExistingProfile] = useState<{ username?: string; gender?: 'male' | 'female' }>({});
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

  const handleComplete = async () => {
    if (!goal) return;
    await executeOnce(async () => {
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
    });
  };

  const canContinue = () => {
    return goal !== null;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Seule étape : Objectif (prénom et genre déjà collectés dans onboarding) */}
        <View style={styles.stepContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
            <Target size={48} color={colors.accent} />
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
                { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: colors.border },
                goal === 'lose' && {
                  backgroundColor: '#4CAF50',
                  borderColor: '#4CAF50',
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
                { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: colors.border },
                goal === 'maintain' && {
                  backgroundColor: colors.accent,
                  borderColor: colors.accent,
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
                { backgroundColor: colors.backgroundCard, borderWidth: 1, borderColor: colors.border },
                goal === 'gain' && {
                  backgroundColor: '#FF6B6B',
                  borderColor: '#FF6B6B',
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
                : colors.backgroundCard,
              borderWidth: canContinue() ? 0 : 1,
              borderColor: colors.border,
            },
          ]}
          onPress={handleComplete}
          disabled={!canContinue() || isSaving}
        >
          <Text style={[
            styles.continueText,
            { color: canContinue() ? colors.textOnGold : colors.textMuted },
          ]}>
            {isSaving ? 'Chargement...' : 'Commencer'}
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
