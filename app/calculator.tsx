import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Calculator, Flame, Shield, Zap } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserSettings } from '@/lib/storage';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import logger from '@/lib/security/logger';
import { useTheme } from '@/lib/ThemeContext';

type Gender = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active';

interface ActivityOption {
  key: ActivityLevel;
  label: string;
  multiplier: number;
}

const ACTIVITY_LEVELS: ActivityOption[] = [
  { key: 'sedentary', label: 'Sédentaire (Bureau)', multiplier: 1.2 },
  { key: 'light', label: 'Actif (1-3 entraînements)', multiplier: 1.375 },
  { key: 'moderate', label: 'Guerrier (3-5 entraînements)', multiplier: 1.55 },
  { key: 'very_active', label: 'Élite (6+ entraînements/métier physique)', multiplier: 1.725 },
];

interface MacroResult {
  calories: number;
  protein: number; // grams
  fat: number; // grams
  carbs: number; // grams
}

export default function CalculatorScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [gender, setGender] = useState<Gender>('male');
  const [age, setAge] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [results, setResults] = useState<{
    bmr: number;
    tdee: number;
    cut: MacroResult;
    maintain: MacroResult;
    bulk: MacroResult;
  } | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const settings = await getUserSettings();
      // Note: We could pre-fill weight from recent measurements, but for now
      // we let the user input it manually for accuracy
      if (settings.height) {
        setHeight(settings.height.toString());
      }
    } catch (error) {
      logger.error('Erreur chargement données utilisateur:', error);
    }
  };

  const calculateBMR = (): number => {
    const weightKg = parseFloat(weight);
    const heightCm = parseFloat(height);
    const ageNum = parseFloat(age);

    if (!weightKg || !heightCm || !ageNum) return 0;

    // Mifflin-St Jeor Equation
    if (gender === 'male') {
      return (10 * weightKg) + (6.25 * heightCm) - (5 * ageNum) + 5;
    } else {
      return (10 * weightKg) + (6.25 * heightCm) - (5 * ageNum) - 161;
    }
  };

  const calculateMacros = (calories: number, weightKg: number): MacroResult => {
    // Protein: ~2g/kg
    const protein = Math.round(weightKg * 2);
    const proteinCalories = protein * 4; // 4 kcal per gram

    // Fat: ~0.8-1g/kg
    const fat = Math.round(weightKg * 0.9);
    const fatCalories = fat * 9; // 9 kcal per gram

    // Carbs: The rest
    const remainingCalories = calories - proteinCalories - fatCalories;
    const carbs = Math.round(remainingCalories / 4); // 4 kcal per gram

    return {
      calories: Math.round(calories),
      protein,
      fat,
      carbs: Math.max(0, carbs),
    };
  };

  const handleCalculate = () => {
    const weightKg = parseFloat(weight);
    const heightCm = parseFloat(height);
    const ageNum = parseFloat(age);

    if (!weightKg || !heightCm || !ageNum) {
      return;
    }

    const bmr = calculateBMR();
    const activityMultiplier = ACTIVITY_LEVELS.find(a => a.key === activityLevel)?.multiplier || 1.55;
    const tdee = bmr * activityMultiplier;

    const cut = calculateMacros(tdee - 500, weightKg);
    const maintain = calculateMacros(tdee, weightKg);
    const bulk = calculateMacros(tdee + 300, weightKg);

    setResults({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      cut,
      maintain,
      bulk,
    });
  };

  const canCalculate = weight && height && age;

  return (
    <ScreenWrapper noPadding>
      <Header title="Calculateur Metabolique" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >

        <ScrollView
          style={[styles.scrollView, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Input Section */}
          <View style={styles.inputSection}>
            {/* Données Biométriques */}
            <View style={[styles.dataGroup, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[styles.dataGroupTitle, { color: colors.textMuted }]}>DONNÉES BIOMÉTRIQUES</Text>
              
              {/* Gender Selector */}
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    { backgroundColor: colors.backgroundElevated, borderColor: colors.border },
                    gender === 'male' && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => setGender('male')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      { color: colors.textSecondary },
                      gender === 'male' && { color: colors.textOnAccent, fontWeight: '800' },
                    ]}
                  >
                    Homme
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    { backgroundColor: colors.backgroundElevated, borderColor: colors.border },
                    gender === 'female' && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => setGender('female')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      { color: colors.textSecondary },
                      gender === 'female' && { color: colors.textOnAccent, fontWeight: '800' },
                    ]}
                  >
                    Femme
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Age Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Âge</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundElevated, color: colors.textPrimary, borderColor: colors.border }]}
                  value={age}
                  onChangeText={setAge}
                  placeholder="Ex: 28"
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Weight Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Poids (kg)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundElevated, color: colors.textPrimary, borderColor: colors.border }]}
                  value={weight}
                  onChangeText={(text) => setWeight(text.replace(',', '.'))}
                  placeholder="Ex: 85.5"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Height Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Taille (cm)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundElevated, color: colors.textPrimary, borderColor: colors.border }]}
                  value={height}
                  onChangeText={(text) => setHeight(text.replace(',', '.'))}
                  placeholder="Ex: 180"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Facteur d'Activité */}
            <View style={[styles.dataGroup, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Text style={[styles.dataGroupTitle, { color: colors.textMuted }]}>FACTEUR D'ACTIVITÉ</Text>
              <View style={styles.activityContainer}>
                {ACTIVITY_LEVELS.map((activity) => (
                  <TouchableOpacity
                    key={activity.key}
                    style={[
                      styles.activityButton,
                      { backgroundColor: colors.backgroundElevated, borderColor: colors.border },
                      activityLevel === activity.key && { backgroundColor: colors.accent, borderColor: colors.accent },
                    ]}
                    onPress={() => setActivityLevel(activity.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.activityButtonText,
                        { color: colors.textPrimary },
                        activityLevel === activity.key && { color: colors.textOnAccent },
                      ]}
                    >
                      {activity.label}
                    </Text>
                    <Text
                      style={[
                        styles.activityMultiplier,
                        { color: colors.textMuted },
                        activityLevel === activity.key && { color: colors.textOnAccent, opacity: 0.8 },
                      ]}
                    >
                      (x{activity.multiplier})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Calculate Button */}
            <TouchableOpacity
              style={[styles.calculateButton, !canCalculate && styles.calculateButtonDisabled]}
              onPress={handleCalculate}
              disabled={!canCalculate}
              activeOpacity={0.7}
            >
              <View style={[styles.calculateButtonContent, { backgroundColor: colors.accent }]}>
                <Calculator size={20} color={colors.textOnAccent} strokeWidth={2.5} />
                <Text style={[styles.calculateButtonText, { color: colors.textOnAccent }]}>CALCULER</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Results Section */}
          {results && (
            <View style={styles.resultsSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Mission Brief</Text>
              
              {/* BMR & TDEE Info */}
              <View style={[styles.infoCard, { backgroundColor: colors.backgroundCard }]}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>BMR (Métabolisme de base)</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{results.bmr} kcal</Text>
                </View>
                <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>TDEE (Maintien)</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{results.tdee} kcal</Text>
                </View>
              </View>

              {/* Cut Card */}
              <View style={styles.goalCard}>
                <LinearGradient
                  colors={['#FF6B6B', '#EE5A6F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.goalCardGradient}
                >
                  <View style={styles.goalCardHeader}>
                    <View style={styles.goalCardIconContainer}>
                      <Flame size={28} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <View style={styles.goalCardTitleContainer}>
                      <Text style={styles.goalCardTitle}>SÉCHER</Text>
                      <Text style={styles.goalCardSubtitle}>Perte de gras</Text>
                    </View>
                  </View>
                  <Text style={styles.goalCardCalories}>{results.cut.calories} kcal/jour</Text>
                  <View style={styles.macrosContainer}>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroLabel}>Protéines</Text>
                      <Text style={styles.macroValue}>{results.cut.protein}g</Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroLabel}>Lipides</Text>
                      <Text style={styles.macroValue}>{results.cut.fat}g</Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroLabel}>Glucides</Text>
                      <Text style={styles.macroValue}>{results.cut.carbs}g</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Maintain Card */}
              <View style={styles.goalCard}>
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.goalCardGradient}
                >
                  <View style={styles.goalCardHeader}>
                    <View style={styles.goalCardIconContainer}>
                      <Shield size={28} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <View style={styles.goalCardTitleContainer}>
                      <Text style={styles.goalCardTitle}>MAINTENIR</Text>
                      <Text style={styles.goalCardSubtitle}>Performance</Text>
                    </View>
                  </View>
                  <Text style={styles.goalCardCalories}>{results.maintain.calories} kcal/jour</Text>
                  <View style={styles.macrosContainer}>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroLabel}>Protéines</Text>
                      <Text style={styles.macroValue}>{results.maintain.protein}g</Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroLabel}>Lipides</Text>
                      <Text style={styles.macroValue}>{results.maintain.fat}g</Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroLabel}>Glucides</Text>
                      <Text style={styles.macroValue}>{results.maintain.carbs}g</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Bulk Card */}
              <View style={styles.goalCard}>
                <LinearGradient
                  colors={['#F7B801', '#F39C12']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.goalCardGradient}
                >
                  <View style={styles.goalCardHeader}>
                    <View style={styles.goalCardIconContainer}>
                      <Zap size={28} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                    <View style={styles.goalCardTitleContainer}>
                      <Text style={styles.goalCardTitle}>🦍 MASSE</Text>
                      <Text style={styles.goalCardSubtitle}>Prise de muscle</Text>
                    </View>
                  </View>
                  <Text style={styles.goalCardCalories}>{results.bulk.calories} kcal/jour</Text>
                  <View style={styles.macrosContainer}>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroLabel}>Protéines</Text>
                      <Text style={styles.macroValue}>{results.bulk.protein}g</Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroLabel}>Lipides</Text>
                      <Text style={styles.macroValue}>{results.bulk.fat}g</Text>
                    </View>
                    <View style={styles.macroItem}>
                      <Text style={styles.macroLabel}>Glucides</Text>
                      <Text style={styles.macroValue}>{results.bulk.carbs}g</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              {/* Référentiel Scientifique */}
              <View style={[styles.referenceBox, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <Text style={[styles.referenceTitle, { color: colors.textPrimary }]}>📚 Référentiel Scientifique</Text>
                <Text style={[styles.referenceText, { color: colors.textSecondary }]}>
                  Calcul du BMR basé sur l'équation de Mifflin-St Jeor (1990), reconnue comme la plus fiable par l'ADA (American Dietetic Association). Les recommandations en macronutriments suivent les standards de l'ISSN (International Society of Sports Nutrition) pour la préservation de la masse maigre.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputSection: {
    marginBottom: 32,
  },
  dataGroup: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  dataGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  genderButtonActive: {
    // Styles dynamic
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  genderButtonTextActive: {
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
  },
  activityContainer: {
    gap: 12,
  },
  activityButton: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
  },
  activityButtonActive: {
    // Dynamic
  },
  activityButtonText: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  activityButtonTextActive: {
    // Dynamic
  },
  activityMultiplier: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityMultiplierActive: {
    // Dynamic
  },
  calculateButton: {
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  calculateButtonDisabled: {
    opacity: 0.5,
  },
  calculateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  calculateButtonText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultsSection: {
    marginTop: 8,
  },
  infoCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoDivider: {
    height: 1,
    marginVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  goalCard: {
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  goalCardGradient: {
    padding: 24,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  goalCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCardTitleContainer: {
    flex: 1,
  },
  goalCardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  goalCardSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  goalCardCalories: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 24,
    letterSpacing: -1,
    textAlign: 'center',
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
  },
  macroItem: {
    alignItems: 'center',
    gap: 6,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  referenceBox: {
    borderRadius: 20,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  referenceTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  referenceText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0.1,
  },
});
