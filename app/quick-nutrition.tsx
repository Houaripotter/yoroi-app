// ============================================
// YOROI - NUTRITION RAPIDE
// ============================================
// Guide nutritionnel rapide pour combattants
// Pre/Post entrainement, jour de combat

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Utensils,
  Zap,
  Dumbbell,
  Moon,
  Trophy,
  Clock,
  Apple,
  Egg,
  Droplets,
  Flame,
  Target,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// TYPES & DATA
// ============================================

type NutritionPhase = 'pre_training' | 'post_training' | 'fight_day' | 'recovery';

interface MealSuggestion {
  timing: string;
  title: string;
  foods: string[];
  macros: { protein: number; carbs: number; fat: number };
  tips: string[];
}

interface PhaseData {
  id: NutritionPhase;
  name: string;
  icon: any;
  color: string;
  description: string;
  meals: MealSuggestion[];
}

const NUTRITION_PHASES: PhaseData[] = [
  {
    id: 'pre_training',
    name: 'Pre-Entrainement',
    icon: Zap,
    color: '#F59E0B',
    description: 'Optimise ton energie avant la session',
    meals: [
      {
        timing: '3-4h avant',
        title: 'Repas complet',
        foods: ['Riz ou pates', 'Poulet ou poisson', 'Legumes', 'Huile d\'olive'],
        macros: { protein: 30, carbs: 80, fat: 15 },
        tips: ['Evite les fibres lourdes', 'Hydrate-toi bien'],
      },
      {
        timing: '1-2h avant',
        title: 'Snack leger',
        foods: ['Banane', 'Barre de cereales', 'Pain + miel'],
        macros: { protein: 5, carbs: 40, fat: 5 },
        tips: ['Glucides rapides', 'Facile a digerer'],
      },
      {
        timing: '30min avant',
        title: 'Boost rapide',
        foods: ['Datte', 'Gel energetique', 'Boisson isotonique'],
        macros: { protein: 0, carbs: 25, fat: 0 },
        tips: ['Optionnel si repas recent', 'Pour sessions intenses'],
      },
    ],
  },
  {
    id: 'post_training',
    name: 'Post-Entrainement',
    icon: Dumbbell,
    color: '#22C55E',
    description: 'Maximise ta recuperation',
    meals: [
      {
        timing: '0-30min apres',
        title: 'Fenetre anabolique',
        foods: ['Whey protein', 'Banane', 'Lait'],
        macros: { protein: 30, carbs: 40, fat: 5 },
        tips: ['Proteines rapides', 'Glucides pour recharger'],
      },
      {
        timing: '1-2h apres',
        title: 'Repas de recuperation',
        foods: ['Poulet/Saumon', 'Riz/Patate douce', 'Legumes verts', 'Avocat'],
        macros: { protein: 40, carbs: 60, fat: 20 },
        tips: ['Proteines de qualite', 'Glucides complexes', 'Graisses saines'],
      },
    ],
  },
  {
    id: 'fight_day',
    name: 'Jour de Combat',
    icon: Trophy,
    color: '#EF4444',
    description: 'Protocole jour J',
    meals: [
      {
        timing: 'Apres pesee',
        title: 'Rehydratation',
        foods: ['Eau + electrolytes', 'Boisson isotonique', 'Jus de raisin dilue'],
        macros: { protein: 0, carbs: 30, fat: 0 },
        tips: ['Petites gorgees', 'Evite de boire trop vite'],
      },
      {
        timing: '4-5h avant combat',
        title: 'Repas principal',
        foods: ['Pates ou riz blanc', 'Poulet grille', 'Peu de legumes', 'Miel'],
        macros: { protein: 25, carbs: 100, fat: 10 },
        tips: ['Glucides simples', 'Evite fibres et gras', 'Repas familier'],
      },
      {
        timing: '2h avant combat',
        title: 'Snack leger',
        foods: ['Pain blanc + confiture', 'Banane', 'Barre energetique'],
        macros: { protein: 5, carbs: 50, fat: 5 },
        tips: ['Digestion rapide', 'Ce que tu connais'],
      },
      {
        timing: '30min avant',
        title: 'Dernier boost',
        foods: ['Gel ou datte', 'Cafe (optionnel)', 'Quelques gorgees d\'eau'],
        macros: { protein: 0, carbs: 25, fat: 0 },
        tips: ['Energie immediate', 'Pas de nouveaute'],
      },
    ],
  },
  {
    id: 'recovery',
    name: 'Jour de Repos',
    icon: Moon,
    color: '#8B5CF6',
    description: 'Optimise ta recuperation',
    meals: [
      {
        timing: 'Petit-dejeuner',
        title: 'Repas riche en proteines',
        foods: ['Oeufs', 'Avocat', 'Pain complet', 'Fruits'],
        macros: { protein: 30, carbs: 40, fat: 25 },
        tips: ['Proteines pour reparation', 'Bons gras'],
      },
      {
        timing: 'Dejeuner',
        title: 'Repas equilibre',
        foods: ['Saumon/Poulet', 'Quinoa/Riz complet', 'Legumes', 'Huile d\'olive'],
        macros: { protein: 40, carbs: 50, fat: 20 },
        tips: ['Omega-3 anti-inflammatoire', 'Glucides complexes'],
      },
      {
        timing: 'Diner',
        title: 'Repas leger',
        foods: ['Poisson blanc', 'Legumes vapeur', 'Riz', 'Yaourt grec'],
        macros: { protein: 35, carbs: 40, fat: 10 },
        tips: ['Digestion facile', 'Caseine pour la nuit'],
      },
    ],
  },
];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function QuickNutritionScreen() {
  const { colors, isDark } = useTheme();

  const [selectedPhase, setSelectedPhase] = useState<NutritionPhase>('pre_training');
  const [bodyWeight, setBodyWeight] = useState('75');

  const currentPhase = useMemo(() => {
    const phase = NUTRITION_PHASES.find(p => p.id === selectedPhase);
    return phase ? phase : NUTRITION_PHASES[0];
  }, [selectedPhase]);

  // Calculer les besoins en proteines
  const proteinNeeds = useMemo(() => {
    const weight = parseFloat(bodyWeight) || 75;
    return {
      min: Math.round(weight * 1.6),
      max: Math.round(weight * 2.2),
    };
  }, [bodyWeight]);

  const PhaseIcon = currentPhase.icon;

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          NUTRITION RAPIDE
        </Text>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Phase Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.phaseScroller}
        >
          {NUTRITION_PHASES.map((phase) => {
            const Icon = phase.icon;
            const isSelected = selectedPhase === phase.id;
            return (
              <TouchableOpacity
                key={phase.id}
                style={[
                  styles.phaseCard,
                  {
                    backgroundColor: isSelected ? phase.color : colors.card,
                    borderColor: isSelected ? phase.color : colors.border,
                  },
                ]}
                onPress={() => setSelectedPhase(phase.id)}
              >
                <Icon size={20} color={isSelected ? '#FFF' : phase.color} />
                <Text
                  style={[
                    styles.phaseName,
                    { color: isSelected ? '#FFF' : colors.textPrimary },
                  ]}
                >
                  {phase.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Phase Header */}
        <LinearGradient
          colors={[currentPhase.color + '20', currentPhase.color + '05']}
          style={styles.phaseHeader}
        >
          <PhaseIcon size={32} color={currentPhase.color} />
          <View style={styles.phaseHeaderContent}>
            <Text style={[styles.phaseTitle, { color: currentPhase.color }]}>
              {currentPhase.name}
            </Text>
            <Text style={[styles.phaseDescription, { color: colors.textSecondary }]}>
              {currentPhase.description}
            </Text>
          </View>
        </LinearGradient>

        {/* Protein Calculator */}
        <View style={[styles.proteinCard, { backgroundColor: colors.card }]}>
          <View style={styles.proteinHeader}>
            <Egg size={20} color={colors.gold} />
            <Text style={[styles.proteinTitle, { color: colors.textPrimary }]}>
              Besoins en Proteines
            </Text>
          </View>
          <View style={styles.proteinInput}>
            <Text style={[styles.proteinLabel, { color: colors.textSecondary }]}>
              Ton poids:
            </Text>
            <View style={[styles.weightInputContainer, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.weightInput, { color: colors.textPrimary }]}
                value={bodyWeight}
                onChangeText={setBodyWeight}
                keyboardType="decimal-pad"
                maxLength={5}
              />
              <Text style={[styles.weightUnit, { color: colors.textMuted }]}>kg</Text>
            </View>
          </View>
          <View style={styles.proteinResult}>
            <Text style={[styles.proteinValue, { color: colors.gold }]}>
              {proteinNeeds.min} - {proteinNeeds.max}g
            </Text>
            <Text style={[styles.proteinSubtext, { color: colors.textMuted }]}>
              par jour (1.6-2.2g/kg)
            </Text>
          </View>
        </View>

        {/* Meals */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Plan Alimentaire
        </Text>

        {currentPhase.meals.map((meal, index) => (
          <View
            key={index}
            style={[styles.mealCard, { backgroundColor: colors.card }]}
          >
            <View style={styles.mealHeader}>
              <View style={[styles.timingBadge, { backgroundColor: currentPhase.color + '20' }]}>
                <Clock size={12} color={currentPhase.color} />
                <Text style={[styles.timingText, { color: currentPhase.color }]}>
                  {meal.timing}
                </Text>
              </View>
              <Text style={[styles.mealTitle, { color: colors.textPrimary }]}>
                {meal.title}
              </Text>
            </View>

            {/* Foods */}
            <View style={styles.foodsContainer}>
              {meal.foods.map((food, i) => (
                <View key={i} style={[styles.foodItem, { backgroundColor: colors.cardHover }]}>
                  <Apple size={12} color={colors.textSecondary} />
                  <Text style={[styles.foodText, { color: colors.textPrimary }]}>{food}</Text>
                </View>
              ))}
            </View>

            {/* Macros */}
            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: '#22C55E' }]}>
                  {meal.macros.protein}g
                </Text>
                <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Prot.</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: '#F59E0B' }]}>
                  {meal.macros.carbs}g
                </Text>
                <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Gluc.</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: '#3B82F6' }]}>
                  {meal.macros.fat}g
                </Text>
                <Text style={[styles.macroLabel, { color: colors.textMuted }]}>Lip.</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={[styles.macroValue, { color: colors.gold }]}>
                  {meal.macros.protein * 4 + meal.macros.carbs * 4 + meal.macros.fat * 9}
                </Text>
                <Text style={[styles.macroLabel, { color: colors.textMuted }]}>kcal</Text>
              </View>
            </View>

            {/* Tips */}
            <View style={styles.tipsContainer}>
              {meal.tips.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={[styles.tipDot, { backgroundColor: currentPhase.color }]} />
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Quick Tips */}
        <View style={[styles.quickTipsCard, { backgroundColor: colors.goldMuted }]}>
          <Flame size={20} color={colors.gold} />
          <Text style={[styles.quickTipsTitle, { color: colors.gold }]}>
            Conseils du Guerrier
          </Text>
          <View style={styles.quickTipsList}>
            <Text style={[styles.quickTip, { color: colors.textSecondary }]}>
              • Hydrate-toi: 35ml/kg de poids
            </Text>
            <Text style={[styles.quickTip, { color: colors.textSecondary }]}>
              • Mange ce que tu connais avant un combat
            </Text>
            <Text style={[styles.quickTip, { color: colors.textSecondary }]}>
              • Evite les aliments nouveaux le jour J
            </Text>
            <Text style={[styles.quickTip, { color: colors.textSecondary }]}>
              • Proteines a chaque repas pour la recup
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },

  // Phase Selector
  phaseScroller: {
    paddingBottom: 16,
    gap: 10,
  },
  phaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  phaseName: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Phase Header
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  phaseHeaderContent: {
    flex: 1,
  },
  phaseTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  phaseDescription: {
    fontSize: 13,
    marginTop: 4,
  },

  // Protein Card
  proteinCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  proteinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  proteinTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  proteinInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  proteinLabel: {
    fontSize: 14,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  weightInput: {
    fontSize: 18,
    fontWeight: '700',
    width: 50,
    textAlign: 'center',
    paddingVertical: 8,
  },
  weightUnit: {
    fontSize: 14,
  },
  proteinResult: {
    alignItems: 'center',
  },
  proteinValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  proteinSubtext: {
    fontSize: 12,
    marginTop: 2,
  },

  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },

  // Meal Card
  mealCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  mealHeader: {
    marginBottom: 12,
  },
  timingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  timingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Foods
  foodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  foodText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Macros
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  macroLabel: {
    fontSize: 10,
    marginTop: 2,
  },

  // Tips
  tipsContainer: {
    gap: 6,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },

  // Quick Tips
  quickTipsCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  quickTipsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
  },
  quickTipsList: {
    gap: 6,
  },
  quickTip: {
    fontSize: 13,
    lineHeight: 18,
  },
});
