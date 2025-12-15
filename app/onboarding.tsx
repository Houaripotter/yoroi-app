import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Users,
  User,
  Scale,
  Target,
  TrendingDown,
  Sparkles,
  ChevronRight,
  Award,
} from 'lucide-react-native';
import { saveUserSettings } from '@/lib/storage';
import { useTheme } from '@/lib/ThemeContext';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type OnboardingStep = 'welcome' | 'profile' | 'goal' | 'avatar';

export default function OnboardingScreen() {
  const { colors: themeColors } = useTheme();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain' | null>(null);
  const [targetWeight, setTargetWeight] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animation de fade
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    if (step === 'welcome') {
      setStep('profile');
    } else if (step === 'profile') {
      setStep('goal');
    } else if (step === 'goal') {
      setStep('avatar');
    }
  };

  const handleSubmit = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await saveUserSettings({
        username: name.trim(),
        gender: gender!,
        goal: goal!,
        targetWeight: targetWeight ? parseFloat(targetWeight) : undefined,
        onboardingCompleted: true,
      });
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  const canProceed = () => {
    if (step === 'welcome') return true;
    if (step === 'profile') return name.trim().length > 0 && gender !== null;
    if (step === 'goal') return goal !== null;
    if (step === 'avatar') return true;
    return false;
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* SLIDE 1 - BIENVENUE */}
          {step === 'welcome' && (
            <View style={styles.slideContainer}>
              <View style={styles.heroSection}>
                <View style={[styles.logoContainer, { backgroundColor: themeColors.primaryLight }]}>
                  <Award size={64} color={themeColors.primary} strokeWidth={2} />
                </View>
                <Text style={[styles.heroTitle, { color: themeColors.textPrimary }]}>
                  Bienvenue sur{'\n'}Yoroi
                </Text>
                <Text style={[styles.heroSubtitle, { color: themeColors.textSecondary }]}>
                  Transforme-toi en guerrier{'\n'}de ta propre légende
                </Text>
              </View>

              <View style={styles.featuresContainer}>
                <View style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Scale size={24} color="#3B82F6" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.featureText, { color: themeColors.textPrimary }]}>
                    Suivi précis de tes mesures
                  </Text>
                </View>

                <View style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: '#ECFDF5' }]}>
                    <TrendingDown size={24} color="#10B981" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.featureText, { color: themeColors.textPrimary }]}>
                    Progression vers ton objectif
                  </Text>
                </View>

                <View style={styles.featureItem}>
                  <View style={[styles.featureIcon, { backgroundColor: '#FFF1EE' }]}>
                    <Sparkles size={24} color="#FF6B4A" strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.featureText, { color: themeColors.textPrimary }]}>
                    Badges et récompenses
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* SLIDE 2 - PROFIL */}
          {step === 'profile' && (
            <View style={styles.slideContainer}>
              <View style={styles.header}>
                <Text style={[styles.stepNumber, { color: themeColors.textMuted }]}>
                  Étape 1/3
                </Text>
                <Text style={[styles.title, { color: themeColors.textPrimary }]}>
                  Qui es-tu ?
                </Text>
                <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                  Créons ton profil de guerrier
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                  Quel est ton nom ?
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: themeColors.surface,
                      color: themeColors.textPrimary,
                      borderColor: themeColors.borderLight,
                    },
                  ]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Ton nom"
                  placeholderTextColor={themeColors.textMuted}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>

              <View style={styles.section}>
                <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                  Ton genre
                </Text>
                <View style={styles.genderContainer}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      {
                        backgroundColor: gender === 'male' ? themeColors.primary : themeColors.surface,
                        borderColor: gender === 'male' ? themeColors.primary : themeColors.borderLight,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setGender('male');
                    }}
                    activeOpacity={0.7}
                  >
                    <User
                      size={32}
                      color={gender === 'male' ? '#FFFFFF' : themeColors.textSecondary}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={[
                        styles.genderText,
                        { color: gender === 'male' ? '#FFFFFF' : themeColors.textSecondary },
                      ]}
                    >
                      Homme
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      {
                        backgroundColor: gender === 'female' ? themeColors.primary : themeColors.surface,
                        borderColor: gender === 'female' ? themeColors.primary : themeColors.borderLight,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setGender('female');
                    }}
                    activeOpacity={0.7}
                  >
                    <Users
                      size={32}
                      color={gender === 'female' ? '#FFFFFF' : themeColors.textSecondary}
                      strokeWidth={2.5}
                    />
                    <Text
                      style={[
                        styles.genderText,
                        { color: gender === 'female' ? '#FFFFFF' : themeColors.textSecondary },
                      ]}
                    >
                      Femme
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* SLIDE 3 - OBJECTIF */}
          {step === 'goal' && (
            <View style={styles.slideContainer}>
              <View style={styles.header}>
                <Text style={[styles.stepNumber, { color: themeColors.textMuted }]}>
                  Étape 2/3
                </Text>
                <Text style={[styles.title, { color: themeColors.textPrimary }]}>
                  Quel est ton objectif ?
                </Text>
                <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                  Nous t'aiderons à l'atteindre
                </Text>
              </View>

              <View style={styles.section}>
                <TouchableOpacity
                  style={[
                    styles.goalButton,
                    {
                      backgroundColor: goal === 'lose' ? themeColors.primaryLight : themeColors.surface,
                      borderColor: goal === 'lose' ? themeColors.primary : themeColors.borderLight,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setGoal('lose');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.goalIconContainer, { backgroundColor: '#ECFDF5' }]}>
                    <TrendingDown size={28} color="#10B981" strokeWidth={2.5} />
                  </View>
                  <View style={styles.goalTextContainer}>
                    <Text style={[styles.goalTitle, { color: themeColors.textPrimary }]}>
                      Perdre du poids
                    </Text>
                    <Text style={[styles.goalDescription, { color: themeColors.textSecondary }]}>
                      Atteindre ton poids idéal
                    </Text>
                  </View>
                  {goal === 'lose' && (
                    <View style={[styles.checkmark, { backgroundColor: themeColors.primary }]}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.goalButton,
                    {
                      backgroundColor: goal === 'maintain' ? themeColors.primaryLight : themeColors.surface,
                      borderColor: goal === 'maintain' ? themeColors.primary : themeColors.borderLight,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setGoal('maintain');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.goalIconContainer, { backgroundColor: '#EFF6FF' }]}>
                    <Target size={28} color="#3B82F6" strokeWidth={2.5} />
                  </View>
                  <View style={styles.goalTextContainer}>
                    <Text style={[styles.goalTitle, { color: themeColors.textPrimary }]}>
                      Maintenir
                    </Text>
                    <Text style={[styles.goalDescription, { color: themeColors.textSecondary }]}>
                      Stabiliser mon poids
                    </Text>
                  </View>
                  {goal === 'maintain' && (
                    <View style={[styles.checkmark, { backgroundColor: themeColors.primary }]}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.goalButton,
                    {
                      backgroundColor: goal === 'gain' ? themeColors.primaryLight : themeColors.surface,
                      borderColor: goal === 'gain' ? themeColors.primary : themeColors.borderLight,
                    },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setGoal('gain');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.goalIconContainer, { backgroundColor: '#FFF1EE' }]}>
                    <Sparkles size={28} color="#FF6B4A" strokeWidth={2.5} />
                  </View>
                  <View style={styles.goalTextContainer}>
                    <Text style={[styles.goalTitle, { color: themeColors.textPrimary }]}>
                      Prendre de la masse
                    </Text>
                    <Text style={[styles.goalDescription, { color: themeColors.textSecondary }]}>
                      Développer ma musculature
                    </Text>
                  </View>
                  {goal === 'gain' && (
                    <View style={[styles.checkmark, { backgroundColor: themeColors.primary }]}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {goal === 'lose' && (
                <View style={styles.section}>
                  <Text style={[styles.label, { color: themeColors.textPrimary }]}>
                    Poids cible (optionnel)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: themeColors.surface,
                        color: themeColors.textPrimary,
                        borderColor: themeColors.borderLight,
                      },
                    ]}
                    value={targetWeight}
                    onChangeText={setTargetWeight}
                    placeholder="Ex: 75"
                    placeholderTextColor={themeColors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
              )}
            </View>
          )}

          {/* SLIDE 4 - AVATAR/RECAP */}
          {step === 'avatar' && (
            <View style={styles.slideContainer}>
              <View style={styles.header}>
                <Text style={[styles.stepNumber, { color: themeColors.textMuted }]}>
                  Étape 3/3
                </Text>
                <Text style={[styles.title, { color: themeColors.textPrimary }]}>
                  C'est parti !
                </Text>
                <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
                  Ton parcours de guerrier commence maintenant
                </Text>
              </View>

              <View style={[styles.recapCard, { backgroundColor: themeColors.surface }]}>
                <View style={styles.recapItem}>
                  <Text style={[styles.recapLabel, { color: themeColors.textSecondary }]}>
                    Nom
                  </Text>
                  <Text style={[styles.recapValue, { color: themeColors.textPrimary }]}>
                    {name}
                  </Text>
                </View>

                <View style={styles.recapItem}>
                  <Text style={[styles.recapLabel, { color: themeColors.textSecondary }]}>
                    Genre
                  </Text>
                  <Text style={[styles.recapValue, { color: themeColors.textPrimary }]}>
                    {gender === 'male' ? 'Homme' : 'Femme'}
                  </Text>
                </View>

                <View style={styles.recapItem}>
                  <Text style={[styles.recapLabel, { color: themeColors.textSecondary }]}>
                    Objectif
                  </Text>
                  <Text style={[styles.recapValue, { color: themeColors.textPrimary }]}>
                    {goal === 'lose' && 'Perdre du poids'}
                    {goal === 'maintain' && 'Maintenir'}
                    {goal === 'gain' && 'Prendre de la masse'}
                  </Text>
                </View>

                {targetWeight && (
                  <View style={styles.recapItem}>
                    <Text style={[styles.recapLabel, { color: themeColors.textSecondary }]}>
                      Poids cible
                    </Text>
                    <Text style={[styles.recapValue, { color: themeColors.textPrimary }]}>
                      {targetWeight} kg
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.motivationCard, { backgroundColor: themeColors.primaryLight }]}>
                <Sparkles size={32} color={themeColors.primary} strokeWidth={2} />
                <Text style={[styles.motivationText, { color: themeColors.textPrimary }]}>
                  Prêt à devenir une légende ?{'\n'}Commence par ta première mesure !
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* BOUTON BAS DE PAGE */}
      <View style={[styles.footer, { backgroundColor: themeColors.background }]}>
        {step !== 'welcome' && step !== 'avatar' && (
          <TouchableOpacity
            style={[styles.button, { flex: 1, marginRight: 12 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (step === 'profile') setStep('welcome');
              else if (step === 'goal') setStep('profile');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.buttonSecondary, { backgroundColor: themeColors.surface }]}>
              <Text style={[styles.buttonSecondaryText, { color: themeColors.textPrimary }]}>
                Retour
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, step !== 'welcome' && step !== 'avatar' ? { flex: 2 } : { flex: 1 }]}
          onPress={step === 'avatar' ? handleSubmit : handleNext}
          disabled={!canProceed()}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={canProceed() ? [themeColors.primary, themeColors.primaryDark || themeColors.primary] : ['#9CA3AF', '#6B7280']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>
              {step === 'avatar' ? 'Commencer mon parcours' : 'Continuer'}
            </Text>
            {step !== 'avatar' && <ChevronRight size={20} color="#FFFFFF" strokeWidth={3} />}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 120,
  },
  slideContainer: {
    flex: 1,
    minHeight: 500,
  },

  // SLIDE WELCOME
  heroSection: {
    alignItems: 'center',
    marginBottom: 48,
    marginTop: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 26,
  },
  featuresContainer: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },

  // SLIDES COMMUNS
  header: {
    marginBottom: 40,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  input: {
    height: 60,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 17,
    fontWeight: '600',
    borderWidth: 2,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    height: 100,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  genderText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // OBJECTIF
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 16,
    position: 'relative',
  },
  goalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  goalTextContainer: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  goalDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkmarkText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '900',
  },

  // RECAP
  recapCard: {
    borderRadius: 24,
    padding: 24,
    gap: 20,
    marginBottom: 24,
  },
  recapItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recapLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  recapValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  motivationCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  motivationText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },

  // FOOTER
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonSecondary: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  buttonSecondaryText: {
    fontSize: 17,
    fontWeight: '700',
  },
  buttonGradient: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
