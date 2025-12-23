import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import {
  User,
  Target,
  TrendingDown,
  TrendingUp,
  Minus,
  Check,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { saveUserSettings } from '@/lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Goal = 'lose' | 'maintain' | 'gain';

export default function SetupScreen() {
  const { colors } = useTheme();

  const [step, setStep] = useState<'name' | 'gender' | 'goal'>('name');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

  const handleNext = () => {
    if (step === 'name' && name.trim()) {
      setStep('gender');
    } else if (step === 'gender' && gender) {
      setStep('goal');
    } else if (step === 'goal' && goal) {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      // Sauvegarder le profil
      await saveUserSettings({
        username: name.trim(),
        gender: gender!,
        goal: goal!,
        onboardingCompleted: true,
      });

      // Marquer l'onboarding comme terminé
      await AsyncStorage.setItem('yoroi_onboarding_done', 'true');

      // Rediriger vers l'app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  const canContinue = () => {
    if (step === 'name') return name.trim().length > 0;
    if (step === 'gender') return gender !== null;
    if (step === 'goal') return goal !== null;
    return false;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Étape 1 : Prénom */}
        {step === 'name' && (
          <View style={styles.stepContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
              <User size={48} color={colors.accent} />
            </View>

            <Text style={[styles.question, { color: colors.textPrimary }]}>
              Comment tu t'appelles ?
            </Text>

            <Text style={[styles.hint, { color: colors.textMuted }]}>
              On va personnaliser ton expérience
            </Text>

            <TextInput
              style={[styles.nameInput, {
                backgroundColor: colors.backgroundElevated,
                color: colors.textPrimary,
                borderColor: name.trim() ? colors.accent : 'transparent',
              }]}
              value={name}
              onChangeText={setName}
              placeholder="Ton prénom"
              placeholderTextColor={colors.textMuted}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
          </View>
        )}

        {/* Étape 2 : Genre */}
        {step === 'gender' && (
          <View style={styles.stepContainer}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>
              Enchanté {name} ! 👋
            </Text>

            <Text style={[styles.question, { color: colors.textPrimary }]}>
              Tu es ?
            </Text>

            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={[
                  styles.genderOption,
                  { backgroundColor: colors.backgroundElevated },
                  gender === 'male' && {
                    backgroundColor: colors.accent,
                    borderColor: colors.accent,
                  },
                ]}
                onPress={() => setGender('male')}
              >
                <Text style={styles.genderEmoji}>👨</Text>
                <Text style={[
                  styles.genderText,
                  { color: gender === 'male' ? '#FFF' : colors.textPrimary },
                ]}>
                  Homme
                </Text>
                {gender === 'male' && (
                  <View style={styles.checkIcon}>
                    <Check size={16} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.genderOption,
                  { backgroundColor: colors.backgroundElevated },
                  gender === 'female' && {
                    backgroundColor: colors.accent,
                    borderColor: colors.accent,
                  },
                ]}
                onPress={() => setGender('female')}
              >
                <Text style={styles.genderEmoji}>👩</Text>
                <Text style={[
                  styles.genderText,
                  { color: gender === 'female' ? '#FFF' : colors.textPrimary },
                ]}>
                  Femme
                </Text>
                {gender === 'female' && (
                  <View style={styles.checkIcon}>
                    <Check size={16} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Étape 3 : Objectif */}
        {step === 'goal' && (
          <View style={styles.stepContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accent + '20' }]}>
              <Target size={48} color={colors.accent} />
            </View>

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
                  color={goal === 'maintain' ? '#FFF' : colors.accent}
                />
                <Text style={[
                  styles.goalTitle,
                  { color: goal === 'maintain' ? '#FFF' : colors.textPrimary },
                ]}>
                  Maintenir
                </Text>
                <Text style={[
                  styles.goalDesc,
                  { color: goal === 'maintain' ? '#FFF' : colors.textMuted },
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
        )}
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
          onPress={handleNext}
          disabled={!canContinue()}
        >
          <Text style={[
            styles.continueText,
            { color: canContinue() ? '#FFF' : colors.textMuted },
          ]}>
            {step === 'goal' ? 'Commencer' : 'Continuer'}
          </Text>
          <ChevronRight
            size={22}
            color={canContinue() ? '#FFF' : colors.textMuted}
          />
        </TouchableOpacity>

        {/* Indicateur d'étape */}
        <View style={styles.stepIndicator}>
          <View style={[
            styles.stepDot,
            { backgroundColor: colors.accent },
          ]} />
          <View style={[
            styles.stepDot,
            { backgroundColor: step === 'name' ? colors.backgroundElevated : colors.accent },
          ]} />
          <View style={[
            styles.stepDot,
            { backgroundColor: step === 'goal' ? colors.accent : colors.backgroundElevated },
          ]} />
        </View>
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
    gap: 16,
    marginTop: 32,
  },
  genderOption: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  genderEmoji: {
    fontSize: 48,
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
