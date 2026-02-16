// ============================================
// YOROI - ÉCRAN PLAN NUTRITIONNEL
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Info, ExternalLink, User, Weight, Ruler, Calendar, Zap, Coffee, Sun, Sunset, Moon as MoonIcon, Apple, Utensils, Beef, Droplets } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';
import { getLatestWeight, getProfile, Profile } from '@/lib/database';
import {
  calculateNutritionPlan,
  getMealCalories,
  ACTIVITY_LEVELS,
  GOALS,
  MACRO_PROFILES,
  NutritionPlan,
  SCIENTIFIC_SOURCES,
} from '@/lib/nutrition';
import { SPACING, RADIUS } from '@/constants/appTheme';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NutritionPlanScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Données utilisateur
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userProfile, setUserProfile] = useState({
    weight: 80,
    height: 175,
    age: 30,
    gender: 'male' as 'male' | 'female',
  });

  // Sélections
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal] = useState('moderate_loss');
  const [macroProfile, setMacroProfile] = useState('high_protein');

  // Résultats
  const [results, setResults] = useState<NutritionPlan | null>(null);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const profileData = await getProfile();
      if (profileData) {
        const latestWeight = await getLatestWeight();

        // Calculer l'âge à partir de la date de naissance si disponible
        let age = 30; // Valeur par défaut
        if (profileData.birth_date) {
          const birthDate = new Date(profileData.birth_date);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
        }

        setProfile(profileData);
        setUserProfile({
          weight: latestWeight?.weight ?? profileData.start_weight ?? 80,
          height: profileData.height_cm ?? 175,
          age,
          gender: profileData.avatar_gender === 'femme' ? 'female' : 'male',
        });
      }
    } catch (error) {
      logger.error('Erreur chargement profil:', error);
    }
  };

  // Calculer le plan
  useEffect(() => {
    const plan = calculateNutritionPlan(
      userProfile.weight,
      userProfile.height,
      userProfile.age,
      userProfile.gender,
      activityLevel,
      goal,
      macroProfile
    );
    setResults(plan);
  }, [userProfile, activityLevel, goal, macroProfile]);

  const selectedGoal = GOALS.find(g => g.id === goal);
  const selectedActivity = ACTIVITY_LEVELS.find(a => a.id === activityLevel);
  const selectedMacroProfile = MACRO_PROFILES.find(m => m.id === macroProfile);
  const mealPlan = results ? getMealCalories(results.goalCalories) : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.backgroundCard }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Plan Nutritionnel
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Personnalisé selon ton profil
            </Text>
          </View>
        </View>

        {/* Formulaire Infos Personnelles */}
        <View style={[styles.personalInfoCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.personalInfoHeader}>
            <View style={[styles.headerIconContainer, { backgroundColor: colors.accent + '15' }]}>
              <User size={22} color={colors.accent} strokeWidth={2.5} />
            </View>
            <Text style={[styles.personalInfoTitle, { color: colors.textPrimary }]}>
              Tes informations
            </Text>
          </View>

          <View style={styles.inputsGrid}>
            {/* Poids */}
            <View style={[styles.inputGroup, { backgroundColor: colors.background }]}>
              <Weight size={18} color={colors.textMuted} />
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Poids</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={userProfile.weight.toString()}
                  onChangeText={(text) => {
                    const num = parseFloat(text.replace(',', '.')) || 0;
                    setUserProfile({ ...userProfile, weight: num });
                  }}
                  keyboardType="decimal-pad"
                  placeholder="80"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>kg</Text>
            </View>

            {/* Taille */}
            <View style={[styles.inputGroup, { backgroundColor: colors.background }]}>
              <Ruler size={18} color={colors.textMuted} />
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Taille</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={userProfile.height.toString()}
                  onChangeText={(text) => {
                    const num = parseFloat(text.replace(',', '.')) || 0;
                    setUserProfile({ ...userProfile, height: num });
                  }}
                  keyboardType="decimal-pad"
                  placeholder="175"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>cm</Text>
            </View>

            {/* Âge */}
            <View style={[styles.inputGroup, { backgroundColor: colors.background }]}>
              <Calendar size={18} color={colors.textMuted} />
              <View style={styles.inputContent}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Âge</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={userProfile.age.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 0;
                    setUserProfile({ ...userProfile, age: num });
                  }}
                  keyboardType="number-pad"
                  placeholder="30"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <Text style={[styles.inputUnit, { color: colors.textMuted }]}>ans</Text>
            </View>

            {/* Genre */}
            <View style={styles.genderButtons}>
              <TouchableOpacity
                style={[
                  styles.genderBtn,
                  {
                    backgroundColor: userProfile.gender === 'male' ? colors.accent : colors.background,
                    borderColor: userProfile.gender === 'male' ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setUserProfile({ ...userProfile, gender: 'male' })}
              >
                <Text
                  style={[
                    styles.genderText,
                    { color: userProfile.gender === 'male' ? colors.textOnAccent : colors.textPrimary },
                  ]}
                >
                  Homme
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderBtn,
                  {
                    backgroundColor: userProfile.gender === 'female' ? colors.accent : colors.background,
                    borderColor: userProfile.gender === 'female' ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => setUserProfile({ ...userProfile, gender: 'female' })}
              >
                <Text
                  style={[
                    styles.genderText,
                    { color: userProfile.gender === 'female' ? colors.textOnAccent : colors.textPrimary },
                  ]}
                >
                  Femme
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Carte Calories Principal - Design Premium */}
        {results && (
          <View style={styles.caloriesCardWrapper}>
            <LinearGradient
              colors={[colors.accent + '20', colors.accent + '05']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.caloriesGradient}
            >
              <View style={[styles.caloriesCard, { backgroundColor: 'transparent' }]}>
                <View style={[styles.caloriesIconBg, { backgroundColor: colors.accent + '15' }]}>
                  <Zap size={32} color={colors.accent} strokeWidth={2.5} />
                </View>
                <Text style={[styles.caloriesLabel, { color: isDark ? colors.accent : colors.textPrimary }]}>OBJECTIF CALORIQUE</Text>
                <View style={styles.caloriesValueContainer}>
                  <Text style={[styles.caloriesValue, { color: colors.textPrimary }]}>{results.goalCalories}</Text>
                  <Text style={[styles.caloriesUnit, { color: colors.textSecondary }]}>kcal</Text>
                </View>
                <Text style={[styles.caloriesSubtext, { color: colors.textMuted }]}>par jour</Text>

                {results.deficit > 0 && (
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.deficitBadge}
                  >
                    <Text style={styles.deficitText}>
                      Déficit de {results.deficit} kcal = {selectedGoal?.weeklyChange}
                    </Text>
                  </LinearGradient>
                )}
                {results.deficit < 0 && (
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.deficitBadge}
                  >
                    <Text style={styles.deficitText}>
                      Surplus de {Math.abs(results.deficit)} kcal = {selectedGoal?.weeklyChange}
                    </Text>
                  </LinearGradient>
                )}
                {results.deficit === 0 && (
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.deficitBadge}
                  >
                    <Text style={styles.deficitText}>Maintien du poids actuel</Text>
                  </LinearGradient>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Niveau d'activité */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Niveau d'activité
          </Text>
          <View style={styles.optionsGrid}>
            {ACTIVITY_LEVELS.map(level => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: activityLevel === level.id
                      ? colors.accent
                      : colors.backgroundCard,
                    borderColor: activityLevel === level.id
                      ? colors.accent
                      : colors.border,
                  },
                ]}
                onPress={() => setActivityLevel(level.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.optionName,
                    { color: activityLevel === level.id ? colors.textOnAccent : colors.textPrimary },
                  ]}
                >
                  {level.name}
                </Text>
                <Text
                  style={[
                    styles.optionDesc,
                    { color: activityLevel === level.id ? colors.textOnAccent : colors.textMuted },
                  ]}
                  numberOfLines={2}
                >
                  {level.description}
                </Text>
                <Text
                  style={[
                    styles.optionExample,
                    { color: activityLevel === level.id ? colors.textOnAccent : colors.textMuted },
                  ]}
                >
                  {level.examples}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Objectif */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Objectif
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.goalsRow}>
              {GOALS.map(g => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.goalButton,
                    {
                      backgroundColor: goal === g.id ? colors.accent : colors.backgroundCard,
                      borderColor: goal === g.id ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setGoal(g.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.goalText,
                      { color: goal === g.id ? colors.textOnAccent : colors.textPrimary },
                    ]}
                  >
                    {g.name}
                  </Text>
                  <Text
                    style={[
                      styles.goalChange,
                      { color: goal === g.id ? colors.textOnAccent : colors.textMuted },
                    ]}
                  >
                    {g.weeklyChange}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {selectedGoal?.warning && (
            <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
              <Info size={16} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                {selectedGoal.warning}
              </Text>
            </View>
          )}
        </View>

        {/* Profil Macro */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Répartition des macros
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.macroProfilesRow}>
              {MACRO_PROFILES.map(profile => (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.macroCard,
                    {
                      backgroundColor: macroProfile === profile.id ? colors.accent : colors.backgroundCard,
                      borderColor: macroProfile === profile.id ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setMacroProfile(profile.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.macroName,
                      { color: macroProfile === profile.id ? colors.textOnAccent : colors.textPrimary },
                    ]}
                  >
                    {profile.name}
                  </Text>
                  <Text
                    style={[
                      styles.macroRatio,
                      { color: macroProfile === profile.id ? colors.textOnAccent : colors.textMuted },
                    ]}
                  >
                    P{profile.protein * 100} / G{profile.carbs * 100} / L{profile.fat * 100}
                  </Text>
                  <Text
                    style={[
                      styles.macroDesc,
                      { color: macroProfile === profile.id ? colors.textOnAccent : colors.textMuted },
                    ]}
                    numberOfLines={2}
                  >
                    {profile.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {selectedMacroProfile?.warning && (
            <View style={[styles.warningBox, { backgroundColor: colors.warningLight }]}>
              <Info size={16} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.warning }]}>
                {selectedMacroProfile.warning}
              </Text>
            </View>
          )}
        </View>

        {/* Résultats Macros */}
        {results && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Tes macros journaliers
            </Text>

            <View style={[styles.macrosResult, { backgroundColor: colors.backgroundCard }]}>
              {/* Protéines */}
              <View style={[styles.macroRow, { borderBottomColor: colors.border }]}>
                <View style={styles.macroInfo}>
                  <LinearGradient
                    colors={['#E53935', '#C62828']}
                    style={styles.macroIconGradient}
                  >
                    <Beef size={18} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View style={styles.macroTextContainer}>
                    <Text style={[styles.macroLabel, { color: colors.textPrimary }]}>Protéines</Text>
                    <View style={styles.macroProgressBg}>
                      <LinearGradient
                        colors={['#E53935', '#C62828']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.macroProgressBar, { width: `${results.macros.protein.percentage}%` }]}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.macroValues}>
                  <Text style={[styles.macroGrams, { color: colors.textPrimary }]}>
                    {results.macros.protein.grams}g
                  </Text>
                  <Text style={[styles.macroCal, { color: colors.textMuted }]}>
                    {results.macros.protein.percentage}%
                  </Text>
                </View>
              </View>

              {/* Glucides */}
              <View style={[styles.macroRow, { borderBottomColor: colors.border }]}>
                <View style={styles.macroInfo}>
                  <LinearGradient
                    colors={['#FF9800', '#F57C00']}
                    style={styles.macroIconGradient}
                  >
                    <Apple size={18} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View style={styles.macroTextContainer}>
                    <Text style={[styles.macroLabel, { color: colors.textPrimary }]}>Glucides</Text>
                    <View style={styles.macroProgressBg}>
                      <LinearGradient
                        colors={['#FF9800', '#F57C00']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.macroProgressBar, { width: `${results.macros.carbs.percentage}%` }]}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.macroValues}>
                  <Text style={[styles.macroGrams, { color: colors.textPrimary }]}>
                    {results.macros.carbs.grams}g
                  </Text>
                  <Text style={[styles.macroCal, { color: colors.textMuted }]}>
                    {results.macros.carbs.percentage}%
                  </Text>
                </View>
              </View>

              {/* Lipides */}
              <View style={styles.macroRow}>
                <View style={styles.macroInfo}>
                  <LinearGradient
                    colors={['#4CAF50', '#388E3C']}
                    style={styles.macroIconGradient}
                  >
                    <Droplets size={18} color="#FFFFFF" strokeWidth={2.5} />
                  </LinearGradient>
                  <View style={styles.macroTextContainer}>
                    <Text style={[styles.macroLabel, { color: colors.textPrimary }]}>Lipides</Text>
                    <View style={styles.macroProgressBg}>
                      <LinearGradient
                        colors={['#4CAF50', '#388E3C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.macroProgressBar, { width: `${results.macros.fat.percentage}%` }]}
                      />
                    </View>
                  </View>
                </View>
                <View style={styles.macroValues}>
                  <Text style={[styles.macroGrams, { color: colors.textPrimary }]}>
                    {results.macros.fat.grams}g
                  </Text>
                  <Text style={[styles.macroCal, { color: colors.textMuted }]}>
                    {results.macros.fat.percentage}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Recommandation protéines */}
            <View style={[styles.proteinRec, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[styles.proteinRecTitle, { color: colors.textPrimary }]}>
                Recommandation protéines (basée sur ton poids)
              </Text>
              <Text style={[styles.proteinRecValue, { color: isDark ? colors.accent : colors.textPrimary }]}>
                {results.proteinRec.min}g - {results.proteinRec.max}g / jour
              </Text>
              <Text style={[styles.proteinRecNote, { color: colors.textMuted }]}>
                Optimal : {results.proteinRec.optimal}g ({(results.proteinRec.optimal / userProfile.weight).toFixed(1)}g/kg)
              </Text>
              <Text style={[styles.proteinRecSource, { color: colors.textMuted }]}>
                Source : ISSN Position Stand on Protein (2017)
              </Text>
            </View>
          </View>
        )}

        {/* Détail des calculs */}
        {results && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Détail des calculs
            </Text>

            <View style={[styles.calculDetail, { backgroundColor: colors.backgroundCard }]}>
              <View style={styles.calculRow}>
                <Text style={[styles.calculLabel, { color: colors.textMuted }]}>
                  Métabolisme de base (BMR)
                </Text>
                <Text style={[styles.calculValue, { color: colors.textPrimary }]}>
                  {results.bmr} kcal
                </Text>
              </View>
              <View style={styles.calculRow}>
                <Text style={[styles.calculLabel, { color: colors.textMuted }]}>
                  × Facteur activité ({selectedActivity?.name})
                </Text>
                <Text style={[styles.calculValue, { color: colors.textPrimary }]}>
                  × {selectedActivity?.multiplier}
                </Text>
              </View>
              <View style={[styles.calculRow, styles.calculTotal, { borderTopColor: colors.border }]}>
                <Text style={[styles.calculLabel, { color: colors.textMuted }]}>
                  = Besoins journaliers (TDEE)
                </Text>
                <Text style={[styles.calculValue, { color: colors.textPrimary }]}>
                  {results.tdee} kcal
                </Text>
              </View>
              <View style={styles.calculRow}>
                <Text style={[styles.calculLabel, { color: colors.textMuted }]}>
                  {results.deficit > 0 ? '- Déficit' : results.deficit < 0 ? '+ Surplus' : 'Maintien'} ({selectedGoal?.name})
                </Text>
                <Text
                  style={[
                    styles.calculValue,
                    { color: results.deficit > 0 ? colors.danger : results.deficit < 0 ? colors.success : colors.info },
                  ]}
                >
                  {results.deficit > 0 ? '-' : results.deficit < 0 ? '+' : ''}{Math.abs(results.deficit)} kcal
                </Text>
              </View>
              <View style={[styles.calculRow, styles.calculFinal, { borderTopColor: colors.border }]}>
                <Text style={[styles.calculLabel, { color: colors.textPrimary, fontWeight: '700' }]}>
                  = OBJECTIF FINAL
                </Text>
                <Text style={[styles.calculValue, { color: isDark ? colors.accent : colors.textPrimary, fontWeight: '800' }]}>
                  {results.goalCalories} kcal
                </Text>
              </View>
            </View>

            <Text style={[styles.sourceNote, { color: colors.textMuted }]}>
              Formule : Mifflin-St Jeor (1990) - American Journal of Clinical Nutrition
            </Text>
          </View>
        )}

        {/* Exemple journée type */}
        {results && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Exemple de journée type
            </Text>

            <View style={[styles.mealPlan, { backgroundColor: colors.backgroundCard }]}>
              {mealPlan.map((meal, index) => (
                <View
                  key={index}
                  style={[
                    styles.mealRow,
                    index < mealPlan.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.mealTime}>
                    <Text style={[styles.mealTimeText, { color: colors.textMuted }]}>{meal.time}</Text>
                  </View>
                  <View style={styles.mealContent}>
                    <Text style={[styles.mealName, { color: colors.textPrimary }]}>{meal.name}</Text>
                    <Text style={[styles.mealExample, { color: colors.textMuted }]}>{meal.example}</Text>
                  </View>
                  <View style={styles.mealCalories}>
                    <Text style={[styles.mealCaloriesText, { color: isDark ? colors.accent : colors.textPrimary }]}>~{meal.calories}</Text>
                    <Text style={[styles.mealCaloriesUnit, { color: colors.textMuted }]}>kcal</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sources scientifiques */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Sources scientifiques
          </Text>
          <View style={[styles.sourcesCard, { backgroundColor: colors.backgroundCard }]}>
            {Object.values(SCIENTIFIC_SOURCES).map((source, index) => (
              <View key={index} style={styles.sourceItem}>
                <ExternalLink size={14} color={colors.accent} />
                <View style={styles.sourceText}>
                  <Text style={[styles.sourceName, { color: colors.textPrimary }]}>{source.name}</Text>
                  <Text style={[styles.sourceRef, { color: colors.textMuted }]}>{source.source}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    marginLeft: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },

  // Personal Info Card
  personalInfoCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  personalInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalInfoTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  inputsGrid: {
    gap: 14,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 20,
    fontWeight: '900',
    padding: 0,
    letterSpacing: -0.5,
  },
  inputUnit: {
    fontSize: 15,
    fontWeight: '700',
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
  },
  genderText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Calories card
  caloriesCardWrapper: {
    marginBottom: SPACING.xl,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  caloriesGradient: {
    borderRadius: 24,
  },
  caloriesCard: {
    padding: 32,
    alignItems: 'center',
  },
  caloriesIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  caloriesLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 12,
  },
  caloriesValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  caloriesValue: {
    fontSize: 68,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 68,
  },
  caloriesUnit: {
    fontSize: 24,
    fontWeight: '700',
  },
  caloriesSubtext: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  deficitBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 20,
  },
  deficitText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Sections
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },

  // Options
  optionsGrid: {
    gap: 10,
  },
  optionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    marginBottom: 4,
  },
  optionExample: {
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Goals
  goalsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 16,
  },
  goalButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 100,
  },
  goalText: {
    fontSize: 13,
    fontWeight: '700',
  },
  goalChange: {
    fontSize: 11,
    marginTop: 4,
  },

  // Warning
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  warningText: {
    fontSize: 12,
    flex: 1,
  },

  // Macro profiles
  macroProfilesRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 16,
  },
  macroCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 130,
    alignItems: 'center',
  },
  macroName: {
    fontSize: 14,
    fontWeight: '700',
  },
  macroRatio: {
    fontSize: 11,
    marginTop: 4,
  },
  macroDesc: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },

  // Macros result
  macrosResult: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  macroInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  macroIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroTextContainer: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  macroProgressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  macroProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  macroValues: {
    alignItems: 'flex-end',
  },
  macroGrams: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  macroCal: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },

  // Protein recommendation
  proteinRec: {
    padding: 16,
    borderRadius: 16,
  },
  proteinRecTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  proteinRecValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  proteinRecNote: {
    fontSize: 13,
    marginTop: 4,
  },
  proteinRecSource: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Calcul detail
  calculDetail: {
    padding: 16,
    borderRadius: 16,
  },
  calculRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  calculLabel: {
    fontSize: 13,
    flex: 1,
  },
  calculValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  calculTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  calculFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
  },
  sourceNote: {
    fontSize: 11,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Meal plan
  mealPlan: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  mealTime: {
    width: 50,
  },
  mealTimeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mealContent: {
    flex: 1,
    marginLeft: 12,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
  },
  mealExample: {
    fontSize: 12,
    marginTop: 2,
  },
  mealCalories: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  mealCaloriesText: {
    fontSize: 16,
    fontWeight: '700',
  },
  mealCaloriesUnit: {
    fontSize: 10,
  },

  // Sources
  sourcesCard: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sourceText: {
    flex: 1,
  },
  sourceName: {
    fontSize: 13,
    fontWeight: '600',
  },
  sourceRef: {
    fontSize: 11,
    marginTop: 2,
  },
});
