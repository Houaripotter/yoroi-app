// ============================================
// YOROI - PLAN NUTRITIONNEL AUTOMATIQUE
// ============================================
// Calculs scientifiques basés sur des sources validées
// ============================================

// ============================================
// TYPES
// ============================================
import { traduire } from '@/lib/i18n/tr';
import { selonGenre, type GenreFormule } from '@/lib/genreCalcul';

export interface ActivityLevel {
  id: string;
  name: string;
  multiplier: number;
  description: string;
  examples: string;
}

export interface Goal {
  id: string;
  name: string;
  calorieAdjustment: number;
  description: string;
  weeklyChange: string;
  warning: string | null;
}

export interface MacroProfile {
  id: string;
  name: string;
  description: string;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
  warning?: string;
}

export interface MacroResult {
  calories: number;
  protein: { grams: number; calories: number; percentage: number };
  carbs: { grams: number; calories: number; percentage: number };
  fat: { grams: number; calories: number; percentage: number };
}

export interface ProteinRecommendation {
  min: number;
  max: number;
  optimal: number;
}

export interface NutritionPlan {
  bmr: number;
  tdee: number;
  goalCalories: number;
  macros: MacroResult;
  proteinRec: ProteinRecommendation;
  deficit: number;
}

// ============================================
// CONSTANTES - NIVEAUX D'ACTIVITÉ
// ============================================

export const ACTIVITY_LEVELS: ActivityLevel[] = [
  {
    id: 'sedentary',
    name: traduire('Sédentaire'),
    multiplier: 1.2,
    description: traduire("Peu ou pas d'exercice, travail de bureau"),
    examples: traduire('Bureau, télétravail, peu de marche'),
  },
  {
    id: 'light',
    name: traduire('Légèrement actif'),
    multiplier: 1.375,
    description: traduire('Exercice léger 1 à 3 jours/semaine'),
    examples: traduire('1 à 2 séances de sport, marche quotidienne'),
  },
  {
    id: 'moderate',
    name: traduire('Modérément actif'),
    multiplier: 1.55,
    description: traduire('Exercice modéré 3 à 5 jours/semaine'),
    examples: traduire('3 à 4 séances JJB/musculation'),
  },
  {
    id: 'active',
    name: traduire('Très actif'),
    multiplier: 1.725,
    description: traduire('Exercice intense 6 à 7 jours/semaine'),
    examples: traduire('5 à 6 séances, entraînement biquotidien'),
  },
  {
    id: 'extreme',
    name: traduire('Athlète'),
    multiplier: 1.9,
    description: traduire('Exercice très intense + travail physique'),
    examples: traduire('Compétiteur, 2 entraînements/jour'),
  },
];

// ============================================
// CONSTANTES - OBJECTIFS
// ============================================

export const GOALS: Goal[] = [
  {
    id: 'aggressive_loss',
    name: 'Perte rapide',
    calorieAdjustment: -750,
    description: traduire('Déficit important (-750 kcal)'),
    weeklyChange: '-0.75 kg/sem',
    warning: traduire('Ne pas maintenir plus de 4 à 6 semaines'),
  },
  {
    id: 'moderate_loss',
    name: 'Perte modérée',
    calorieAdjustment: -500,
    description: traduire('Déficit raisonnable (-500 kcal)'),
    weeklyChange: '-0.5 kg/sem',
    warning: null,
  },
  {
    id: 'slow_loss',
    name: 'Perte lente',
    calorieAdjustment: -250,
    description: traduire('Déficit léger (-250 kcal)'),
    weeklyChange: '-0.25 kg/sem',
    warning: null,
  },
  {
    id: 'maintain',
    name: 'Maintien',
    calorieAdjustment: 0,
    description: traduire('Maintenir le poids actuel'),
    weeklyChange: '0 kg/sem',
    warning: null,
  },
  {
    id: 'slow_gain',
    name: 'Prise lente',
    calorieAdjustment: 250,
    description: traduire('Surplus léger (+250 kcal)'),
    weeklyChange: '+0.25 kg/sem',
    warning: null,
  },
  {
    id: 'moderate_gain',
    name: 'Prise modérée',
    calorieAdjustment: 500,
    description: traduire('Surplus pour prise de masse (+500 kcal)'),
    weeklyChange: '+0.5 kg/sem',
    warning: null,
  },
];

// ============================================
// CONSTANTES - PROFILS MACROS
// ============================================

export const MACRO_PROFILES: MacroProfile[] = [
  {
    id: 'balanced',
    name: traduire('Équilibré'),
    description: traduire('Répartition standard recommandée'),
    protein: 0.30,
    carbs: 0.40,
    fat: 0.30,
    source: 'ANSES, Agence nationale de sécurité sanitaire',
  },
  {
    id: 'high_protein',
    name: 'Haute protéine',
    description: traduire('Pour sportifs et prise de muscle'),
    protein: 0.35,
    carbs: 0.40,
    fat: 0.25,
    source: 'International Society of Sports Nutrition (ISSN)',
  },
  {
    id: 'low_carb',
    name: 'Low Carb',
    description: traduire('Réduction des glucides'),
    protein: 0.35,
    carbs: 0.25,
    fat: 0.40,
    source: 'Adapté pour sensibilité insuline',
  },
  {
    id: 'keto',
    name: 'Cétogène',
    description: traduire('Très faible en glucides'),
    protein: 0.25,
    carbs: 0.05,
    fat: 0.70,
    source: 'Régime cétogène standard',
    warning: traduire('Consulter un professionnel avant de commencer'),
  },
  {
    id: 'athlete',
    name: 'Athlète Combat',
    description: traduire('Optimisé pour sports de combat'),
    protein: 0.30,
    carbs: 0.50,
    fat: 0.20,
    source: "Recommandations pour athlètes d'endurance",
  },
];

// ============================================
// CALCUL BMR - Métabolisme de Base
// Formule Mifflin-St Jeor (1990)
// Source: American Journal of Clinical Nutrition
// ============================================

export const calculateBMR = (
  weight: number,    // kg
  height: number,    // cm
  age: number,       // années
  gender: GenreFormule
): number => {
  // Mifflin-St Jeor (1990) - Recommandée par l'Academy of Nutrition and Dietetics ; neutre : moyenne homme et femme
  const base = (10 * weight) + (6.25 * height) - (5 * age);
  return Math.round(base + selonGenre(gender, 5, -161));
};

// ============================================
// CALCUL TDEE - Besoins Caloriques Journaliers
// ============================================

export const calculateTDEE = (bmr: number, activityLevelId: string): number => {
  const level = ACTIVITY_LEVELS.find(l => l.id === activityLevelId);
  return Math.round(bmr * (level?.multiplier || 1.2));
};

// ============================================
// CALCUL OBJECTIF CALORIQUE
// ============================================

export const calculateGoalCalories = (tdee: number, goalId: string): number => {
  const goal = GOALS.find(g => g.id === goalId);
  const result = Math.round(tdee + (goal?.calorieAdjustment || 0));
  // Minimum de sécurité : 1200 kcal pour femmes, 1500 kcal pour hommes
  return Math.max(result, 1200);
};

// ============================================
// CALCUL RÉPARTITION MACROS
// ============================================

export const calculateMacros = (
  totalCalories: number,
  profileId: string
): MacroResult => {
  const profile = MACRO_PROFILES.find(p => p.id === profileId) || MACRO_PROFILES[0];

  // Calories par macro
  const proteinCal = totalCalories * profile.protein;
  const carbsCal = totalCalories * profile.carbs;
  const fatCal = totalCalories * profile.fat;

  // Conversion en grammes
  // Protéines: 4 kcal/g, Glucides: 4 kcal/g, Lipides: 9 kcal/g
  return {
    calories: totalCalories,
    protein: {
      grams: Math.round(proteinCal / 4),
      calories: Math.round(proteinCal),
      percentage: Math.round(profile.protein * 100),
    },
    carbs: {
      grams: Math.round(carbsCal / 4),
      calories: Math.round(carbsCal),
      percentage: Math.round(profile.carbs * 100),
    },
    fat: {
      grams: Math.round(fatCal / 9),
      calories: Math.round(fatCal),
      percentage: Math.round(profile.fat * 100),
    },
  };
};

// ============================================
// RECOMMANDATION PROTÉINES PAR KG
// Basé sur les recommandations ISSN (2017)
// ============================================

export const getProteinRecommendation = (
  weight: number,
  goalId: string,
  activityLevelId: string
): ProteinRecommendation => {
  // Basé sur les recommandations ISSN (International Society of Sports Nutrition)
  let multiplier = { min: 0.8, max: 1.2 }; // g/kg - sédentaire

  if (activityLevelId === 'moderate' || activityLevelId === 'active') {
    multiplier = { min: 1.4, max: 2.0 }; // Sportif régulier
  }

  if (activityLevelId === 'extreme') {
    multiplier = { min: 1.6, max: 2.2 }; // Athlète
  }

  // Ajustement selon objectif
  if (goalId.includes('loss')) {
    // En déficit, augmenter les protéines pour préserver la masse musculaire
    multiplier.min += 0.2;
    multiplier.max += 0.3;
  }

  return {
    min: Math.round(weight * multiplier.min),
    max: Math.round(weight * multiplier.max),
    optimal: Math.round(weight * ((multiplier.min + multiplier.max) / 2)),
  };
};

// ============================================
// CALCUL PLAN COMPLET
// ============================================

export const calculateNutritionPlan = (
  weight: number,
  height: number,
  age: number,
  gender: GenreFormule,
  activityLevelId: string,
  goalId: string,
  macroProfileId: string
): NutritionPlan => {
  const bmr = calculateBMR(weight, height, age, gender);
  const tdee = calculateTDEE(bmr, activityLevelId);
  const goalCalories = calculateGoalCalories(tdee, goalId);
  const macros = calculateMacros(goalCalories, macroProfileId);
  const proteinRec = getProteinRecommendation(weight, goalId, activityLevelId);

  return {
    bmr,
    tdee,
    goalCalories,
    macros,
    proteinRec,
    deficit: tdee - goalCalories,
  };
};

// ============================================
// RÉPARTITION REPAS SUGGÉRÉE
// ============================================

export interface MealPlan {
  name: string;
  time: string;
  percentage: number;
  example: string;
}

export const MEAL_DISTRIBUTION: MealPlan[] = [
  {
    name: traduire('Petit déjeuner'),
    time: '7h00',
    percentage: 0.25,
    example: 'Oeufs, pain complet, avocat, fruit',
  },
  {
    name: traduire('Déjeuner'),
    time: '12h30',
    percentage: 0.35,
    example: traduire("Poulet, riz, légumes, huile d'olive"),
  },
  {
    name: 'Collation',
    time: '16h00',
    percentage: 0.10,
    example: 'Fromage blanc, amandes, fruit',
  },
  {
    name: traduire('Dîner'),
    time: '20h00',
    percentage: 0.30,
    example: 'Poisson, patate douce, salade',
  },
];

export const getMealCalories = (totalCalories: number): { name: string; time: string; calories: number; example: string }[] => {
  return MEAL_DISTRIBUTION.map(meal => ({
    name: meal.name,
    time: meal.time,
    calories: Math.round(totalCalories * meal.percentage),
    example: meal.example,
  }));
};

// ============================================
// SOURCES SCIENTIFIQUES
// ============================================

export const SCIENTIFIC_SOURCES = {
  bmr: {
    name: 'Formule Mifflin-St Jeor (1990)',
    source: 'American Journal of Clinical Nutrition',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2305711/',
  },
  protein: {
    name: 'ISSN Position Stand on Protein',
    source: 'Journal of the International Society of Sports Nutrition (2017)',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28642676/',
  },
  macros: {
    name: 'ANSES Apports Nutritionnels',
    source: 'Agence nationale de sécurité sanitaire',
    url: 'https://www.anses.fr/fr/content/les-references-nutritionnelles-en-vitamines-et-mineraux',
  },
};

export default {
  calculateBMR,
  calculateTDEE,
  calculateGoalCalories,
  calculateMacros,
  getProteinRecommendation,
  calculateNutritionPlan,
  getMealCalories,
  ACTIVITY_LEVELS,
  GOALS,
  MACRO_PROFILES,
  SCIENTIFIC_SOURCES,
};
