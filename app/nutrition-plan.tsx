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
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Info, ExternalLink } from 'lucide-react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function NutritionPlanScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

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

  // Charger le profil
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const profileData = await getProfile();
      if (profileData) {
        const latestWeight = await getLatestWeight();
        setProfile(profileData);
        setUserProfile({
          weight: latestWeight?.weight ?? profileData.start_weight ?? 80,
          height: profileData.height_cm ?? 175,
          age: 30,
          gender: profileData.avatar_gender === 'femme' ? 'female' : 'male',
        });
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
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

        {/* Carte Calories Principal */}
        {results && (
          <View style={[styles.caloriesCard, { backgroundColor: colors.accent }]}>
            <Text style={styles.caloriesLabel}>OBJECTIF CALORIQUE JOURNALIER</Text>
            <Text style={styles.caloriesValue}>{results.goalCalories}</Text>
            <Text style={styles.caloriesUnit}>kcal / jour</Text>

            {results.deficit > 0 && (
              <View style={[styles.deficitBadge, { backgroundColor: colors.danger }]}>
                <Text style={styles.deficitText}>
                  Déficit de {results.deficit} kcal = {selectedGoal?.weeklyChange}
                </Text>
              </View>
            )}
            {results.deficit < 0 && (
              <View style={[styles.deficitBadge, { backgroundColor: colors.success }]}>
                <Text style={styles.deficitText}>
                  Surplus de {Math.abs(results.deficit)} kcal = {selectedGoal?.weeklyChange}
                </Text>
              </View>
            )}
            {results.deficit === 0 && (
              <View style={[styles.deficitBadge, { backgroundColor: colors.info }]}>
                <Text style={styles.deficitText}>Maintien du poids actuel</Text>
              </View>
            )}
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
                  <View style={[styles.macroDot, { backgroundColor: '#E53935' }]} />
                  <Text style={[styles.macroLabel, { color: colors.textPrimary }]}>Protéines</Text>
                </View>
                <View style={styles.macroValues}>
                  <Text style={[styles.macroGrams, { color: colors.textPrimary }]}>
                    {results.macros.protein.grams}g
                  </Text>
                  <Text style={[styles.macroCal, { color: colors.textMuted }]}>
                    {results.macros.protein.calories} kcal ({results.macros.protein.percentage}%)
                  </Text>
                </View>
              </View>

              {/* Glucides */}
              <View style={[styles.macroRow, { borderBottomColor: colors.border }]}>
                <View style={styles.macroInfo}>
                  <View style={[styles.macroDot, { backgroundColor: '#FF9800' }]} />
                  <Text style={[styles.macroLabel, { color: colors.textPrimary }]}>Glucides</Text>
                </View>
                <View style={styles.macroValues}>
                  <Text style={[styles.macroGrams, { color: colors.textPrimary }]}>
                    {results.macros.carbs.grams}g
                  </Text>
                  <Text style={[styles.macroCal, { color: colors.textMuted }]}>
                    {results.macros.carbs.calories} kcal ({results.macros.carbs.percentage}%)
                  </Text>
                </View>
              </View>

              {/* Lipides */}
              <View style={styles.macroRow}>
                <View style={styles.macroInfo}>
                  <View style={[styles.macroDot, { backgroundColor: '#4CAF50' }]} />
                  <Text style={[styles.macroLabel, { color: colors.textPrimary }]}>Lipides</Text>
                </View>
                <View style={styles.macroValues}>
                  <Text style={[styles.macroGrams, { color: colors.textPrimary }]}>
                    {results.macros.fat.grams}g
                  </Text>
                  <Text style={[styles.macroCal, { color: colors.textMuted }]}>
                    {results.macros.fat.calories} kcal ({results.macros.fat.percentage}%)
                  </Text>
                </View>
              </View>
            </View>

            {/* Recommandation protéines */}
            <View style={[styles.proteinRec, { backgroundColor: colors.backgroundCard }]}>
              <Text style={[styles.proteinRecTitle, { color: colors.textPrimary }]}>
                Recommandation protéines (basée sur ton poids)
              </Text>
              <Text style={[styles.proteinRecValue, { color: colors.accent }]}>
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
                <Text style={[styles.calculValue, { color: colors.accent, fontWeight: '800' }]}>
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
                    <Text style={[styles.mealCaloriesText, { color: colors.accent }]}>~{meal.calories}</Text>
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

  // Calories card
  caloriesCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  caloriesLabel: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    opacity: 0.8,
  },
  caloriesValue: {
    color: '#FFF',
    fontSize: 64,
    fontWeight: '900',
    marginVertical: 8,
  },
  caloriesUnit: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.9,
  },
  deficitBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  deficitText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
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
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  macroInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  macroDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  macroLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  macroValues: {
    alignItems: 'flex-end',
  },
  macroGrams: {
    fontSize: 18,
    fontWeight: '700',
  },
  macroCal: {
    fontSize: 11,
    marginTop: 2,
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
