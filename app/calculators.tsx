import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import {
  Calculator,
  Scale,
  Flame,
  Target,
  Droplet,
  Heart,
  Activity,
  User,
  ChevronRight,
  X,
  Info,
  Utensils,
  Percent,
  Dumbbell,
  Crown,
  AlertCircle,
  TrendingUp,
  ArrowUp,
  MoveHorizontal,
  Circle,
  type LucideIcon,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { getUserSettings, getLatestMeasurement } from '@/lib/storage';
import logger from '@/lib/security/logger';

// ============================================
// ECRAN CALCULATEURS FITNESS/SANTE
// 100% OFFLINE - Formules mathematiques
// ============================================

const { width: screenWidth } = Dimensions.get('window');

// Types
type Gender = 'male' | 'female';
type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Goal = 'lose' | 'maintain' | 'gain';

interface UserData {
  weight: number;
  height: number;
  age: number;
  gender: Gender;
}

interface CalculatorItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  route?: string;
}

// Constantes des coefficients d'activite
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, { label: string; value: number; desc: string }> = {
  sedentary: { label: 'Sedentaire', value: 1.2, desc: 'Peu ou pas d\'exercice' },
  light: { label: 'Legerement actif', value: 1.375, desc: '1-3 jours/semaine' },
  moderate: { label: 'Moderement actif', value: 1.55, desc: '3-5 jours/semaine' },
  active: { label: 'Tres actif', value: 1.725, desc: '6-7 jours/semaine' },
  very_active: { label: 'Extremement actif', value: 1.9, desc: 'Athlete, travail physique' },
};

// Macros par objectif
const MACROS_BY_GOAL: Record<Goal, { protein: number; carbs: number; fat: number; label: string }> = {
  lose: { protein: 40, carbs: 30, fat: 30, label: 'Perte de poids' },
  maintain: { protein: 30, carbs: 40, fat: 30, label: 'Maintien' },
  gain: { protein: 35, carbs: 45, fat: 20, label: 'Prise de muscle' },
};

// ============================================
// 1RM CALCULATOR CONSTANTS
// ============================================
type ExerciseType = 'squat' | 'bench' | 'deadlift' | 'overhead' | 'row' | 'custom';

const EXERCISES: Record<ExerciseType, { name: string; iconComponent: LucideIcon; standards: { beginner: number; intermediate: number; advanced: number; elite: number } }> = {
  squat: {
    name: 'Squat',
    iconComponent: Activity,
    standards: { beginner: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.5 }, // x bodyweight
  },
  bench: {
    name: 'Developpe couche',
    iconComponent: Dumbbell,
    standards: { beginner: 0.5, intermediate: 0.85, advanced: 1.25, elite: 1.75 },
  },
  deadlift: {
    name: 'Souleve de terre',
    iconComponent: TrendingUp,
    standards: { beginner: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.75 },
  },
  overhead: {
    name: 'Developpe militaire',
    iconComponent: ArrowUp,
    standards: { beginner: 0.35, intermediate: 0.55, advanced: 0.8, elite: 1.1 },
  },
  row: {
    name: 'Rowing barre',
    iconComponent: MoveHorizontal,
    standards: { beginner: 0.4, intermediate: 0.65, advanced: 0.95, elite: 1.3 },
  },
  custom: {
    name: 'Autre exercice',
    iconComponent: Calculator,
    standards: { beginner: 0.5, intermediate: 1.0, advanced: 1.5, elite: 2.0 },
  },
};

// ============================================
// SUB-COMPONENTS (defined outside to avoid re-mount on re-render)
// ============================================

// Composant Input
const DataInput = ({ label, value, unit, onChange, colors }: {
  label: string;
  value: string;
  unit: string;
  onChange: (val: string) => void;
  colors: any;
}) => (
  <View style={styles.inputRow}>
    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
    <View style={[styles.inputContainer, { backgroundColor: colors.cardHover }]}>
      <TextInput
        style={[styles.input, { color: colors.textPrimary }]}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        maxLength={5}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
      />
      <Text style={[styles.inputUnit, { color: colors.textMuted }]}>{unit}</Text>
    </View>
  </View>
);

// Composant Modal Base
const CalculatorModal = ({
  visible,
  onClose,
  title,
  children,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  colors: any;
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    presentationStyle="pageSheet"
    onRequestClose={onClose}
  >
    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{title}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.modalContent}
        contentContainerStyle={styles.modalContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  </Modal>
);

// Gender Toggle
const GenderToggleComponent = ({ gender, onSelect, colors }: {
  gender: Gender;
  onSelect: (g: Gender) => void;
  colors: any;
}) => (
  <View style={styles.genderToggle}>
    <TouchableOpacity
      style={[
        styles.genderButton,
        { backgroundColor: gender === 'male' ? colors.gold : colors.cardHover }
      ]}
      onPress={() => onSelect('male')}
    >
      <Text style={[
        styles.genderText,
        { color: gender === 'male' ? colors.background : colors.textSecondary }
      ]}>
        Homme
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      style={[
        styles.genderButton,
        { backgroundColor: gender === 'female' ? colors.gold : colors.cardHover }
      ]}
      onPress={() => onSelect('female')}
    >
      <Text style={[
        styles.genderText,
        { color: gender === 'female' ? colors.background : colors.textSecondary }
      ]}>
        Femme
      </Text>
    </TouchableOpacity>
  </View>
);

export default function CalculatorsScreen() {
  const { colors } = useTheme();

  // Donnees utilisateur - VIDES par defaut (string state for TextInput)
  const [weightStr, setWeightStr] = useState('');
  const [heightStr, setHeightStr] = useState('');
  const [ageStr, setAgeStr] = useState('');
  const [gender, setGender] = useState<Gender>('male');

  // Parsed numeric values
  const userData: UserData = {
    weight: parseFloat(weightStr) || 0,
    height: parseFloat(heightStr) || 0,
    age: parseFloat(ageStr) || 0,
    gender,
  };

  // Modals
  const [showIMC, setShowIMC] = useState(false);
  const [showIMG, setShowIMG] = useState(false);
  const [showBMR, setShowBMR] = useState(false);
  const [showTDEE, setShowTDEE] = useState(false);
  const [showIdealWeight, setShowIdealWeight] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const [showWater, setShowWater] = useState(false);
  const [showOneRM, setShowOneRM] = useState(false);

  // Etats pour les calculs
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [goal, setGoal] = useState<Goal>('lose');
  const [exerciseHours, setExerciseHours] = useState(0);

  // Etats pour le calcul 1RM - VIDES par defaut (string state for TextInput)
  const [liftWeightStr, setLiftWeightStr] = useState('');
  const [liftRepsStr, setLiftRepsStr] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('bench');

  // Parsed numeric values for 1RM
  const liftWeight = parseFloat(liftWeightStr) || 0;
  const liftReps = parseInt(liftRepsStr) || 0;

  // NE PAS charger automatiquement - L'utilisateur doit saisir lui-meme
  // useEffect(() => {
  //   loadUserData();
  // }, []);

  const loadUserData = async () => {
    try {
      const settings = await getUserSettings();
      const latestMeasurement = await getLatestMeasurement();

      if (latestMeasurement?.weight) {
        setWeightStr(String(latestMeasurement.weight));
      }
      if (settings.height) {
        setHeightStr(String(settings.height));
      }
      if (settings.gender === 'female') {
        setGender('female');
      }

      // Mapper l'objectif
      if (settings.goal === 'lose_weight' || settings.goal === 'lose') {
        setGoal('lose');
      } else if (settings.goal === 'gain_muscle' || settings.goal === 'gain') {
        setGoal('gain');
      } else {
        setGoal('maintain');
      }
    } catch (error) {
      logger.info('Erreur chargement donnees:', error);
    }
  };

  // ============================================
  // FORMULES DE CALCUL
  // ============================================

  // IMC
  const calculateIMC = useCallback(() => {
    const heightM = userData.height / 100;
    return userData.weight / (heightM * heightM);
  }, [userData.weight, userData.height]);

  const getIMCCategory = (imc: number): { label: string; color: string; iconComponent: LucideIcon } => {
    if (imc < 18.5) return { label: 'Insuffisance ponderale', color: colors.info, iconComponent: AlertCircle };
    if (imc < 25) return { label: 'Normal', color: colors.success, iconComponent: Circle };
    if (imc < 30) return { label: 'Surpoids', color: colors.warning, iconComponent: AlertCircle };
    return { label: 'Obesite', color: colors.danger, iconComponent: AlertCircle };
  };

  // IMG (Deurenberg)
  const calculateIMG = useCallback(() => {
    const imc = calculateIMC();
    if (userData.gender === 'male') {
      return (1.20 * imc) + (0.23 * userData.age) - 10.8 - 5.4;
    }
    return (1.20 * imc) + (0.23 * userData.age) - 5.4;
  }, [calculateIMC, userData.age, userData.gender]);

  const getIMGCategory = (img: number, gender: Gender): { label: string; color: string } => {
    if (gender === 'male') {
      if (img < 10) return { label: 'Tres maigre', color: colors.info };
      if (img < 20) return { label: 'Athlete', color: colors.success };
      if (img < 25) return { label: 'Normal', color: colors.success };
      return { label: 'Eleve', color: colors.warning };
    } else {
      if (img < 18) return { label: 'Tres maigre', color: colors.info };
      if (img < 25) return { label: 'Athlete', color: colors.success };
      if (img < 32) return { label: 'Normal', color: colors.success };
      return { label: 'Eleve', color: colors.warning };
    }
  };

  // BMR (Mifflin-St Jeor)
  const calculateBMR = useCallback(() => {
    const base = (10 * userData.weight) + (6.25 * userData.height) - (5 * userData.age);
    if (userData.gender === 'male') {
      return base + 5;
    }
    return base - 161;
  }, [userData.weight, userData.height, userData.age, userData.gender]);

  // TDEE
  const calculateTDEE = useCallback(() => {
    return calculateBMR() * ACTIVITY_MULTIPLIERS[activityLevel].value;
  }, [calculateBMR, activityLevel]);

  // Poids Ideal
  const calculateIdealWeight = useCallback(() => {
    const heightCm = userData.height;
    const heightInches = heightCm / 2.54;

    // Lorentz
    let lorentz: number;
    if (userData.gender === 'male') {
      lorentz = heightCm - 100 - ((heightCm - 150) / 4);
    } else {
      lorentz = heightCm - 100 - ((heightCm - 150) / 2.5);
    }

    // Devine
    let devine: number;
    if (userData.gender === 'male') {
      devine = 50 + 2.3 * (heightInches - 60);
    } else {
      devine = 45.5 + 2.3 * (heightInches - 60);
    }

    // Fourchette IMC sain (18.5 - 24.9)
    const heightM = heightCm / 100;
    const minIMC = 18.5 * heightM * heightM;
    const maxIMC = 24.9 * heightM * heightM;

    return {
      lorentz: Math.round(lorentz * 10) / 10,
      devine: Math.round(devine * 10) / 10,
      min: Math.round(minIMC * 10) / 10,
      max: Math.round(maxIMC * 10) / 10,
    };
  }, [userData.height, userData.gender]);

  // Macros
  const calculateMacros = useCallback(() => {
    const tdee = calculateTDEE();
    let targetCal = tdee;

    if (goal === 'lose') {
      targetCal = tdee - 500; // Deficit 500 kcal
    } else if (goal === 'gain') {
      targetCal = tdee + 300; // Surplus 300 kcal
    }

    const macros = MACROS_BY_GOAL[goal];

    return {
      calories: Math.round(targetCal),
      protein: Math.round((targetCal * macros.protein / 100) / 4), // 4 cal/g
      carbs: Math.round((targetCal * macros.carbs / 100) / 4), // 4 cal/g
      fat: Math.round((targetCal * macros.fat / 100) / 9), // 9 cal/g
      percentages: macros,
    };
  }, [calculateTDEE, goal]);

  // Eau quotidienne
  const calculateWater = useCallback(() => {
    const base = userData.weight * 0.033;
    const withExercise = base + (exerciseHours * 0.5);
    return {
      base: Math.round(base * 10) / 10,
      withExercise: Math.round(withExercise * 10) / 10,
    };
  }, [userData.weight, exerciseHours]);

  // ============================================
  // 1RM CALCULATION (Epley Formula)
  // ============================================
  const calculateOneRM = useCallback(() => {
    if (liftReps === 1) return liftWeight;
    // Epley formula: 1RM = weight × (1 + reps/30)
    return Math.round(liftWeight * (1 + liftReps / 30));
  }, [liftWeight, liftReps]);

  // Get estimated weights for different rep ranges
  const getRepRangeWeights = useCallback(() => {
    const oneRM = calculateOneRM();
    return [
      { reps: 1, weight: oneRM, percent: 100, label: '1RM (Max)' },
      { reps: 3, weight: Math.round(oneRM * 0.93), percent: 93, label: '3RM' },
      { reps: 5, weight: Math.round(oneRM * 0.87), percent: 87, label: '5RM' },
      { reps: 8, weight: Math.round(oneRM * 0.80), percent: 80, label: '8RM' },
      { reps: 10, weight: Math.round(oneRM * 0.75), percent: 75, label: '10RM' },
      { reps: 12, weight: Math.round(oneRM * 0.70), percent: 70, label: '12RM' },
      { reps: 15, weight: Math.round(oneRM * 0.65), percent: 65, label: '15RM' },
    ];
  }, [calculateOneRM]);

  // Get strength level based on bodyweight ratio
  const getStrengthLevel = useCallback(() => {
    const oneRM = calculateOneRM();
    const ratio = oneRM / userData.weight;
    const standards = EXERCISES[selectedExercise].standards;

    if (ratio >= standards.elite) return { level: 'Elite', color: '#FFD700', iconComponent: Crown };
    if (ratio >= standards.advanced) return { level: 'Avance', color: colors.success, iconComponent: Dumbbell };
    if (ratio >= standards.intermediate) return { level: 'Intermediaire', color: colors.info, iconComponent: TrendingUp };
    return { level: 'Debutant', color: colors.textMuted, iconComponent: Circle };
  }, [calculateOneRM, userData.weight, selectedExercise, colors]);

  // Liste des calculateurs
  const calculators: CalculatorItem[] = [
    {
      id: 'imc',
      title: 'IMC',
      subtitle: 'Indice de Masse Corporelle',
      icon: <Scale size={24} color={colors.info} />,
      color: colors.info,
    },
    {
      id: 'img',
      title: 'IMG',
      subtitle: 'Indice de Masse Grasse',
      icon: <Percent size={24} color={colors.warning} />,
      color: colors.warning,
    },
    {
      id: 'bmr',
      title: 'BMR',
      subtitle: 'Metabolisme de Base',
      icon: <Flame size={24} color={colors.danger} />,
      color: colors.danger,
    },
    {
      id: 'tdee',
      title: 'TDEE',
      subtitle: 'Besoins Caloriques',
      icon: <Activity size={24} color={colors.success} />,
      color: colors.success,
    },
    {
      id: 'ideal',
      title: 'Poids Ideal',
      subtitle: 'Fourchette recommandee',
      icon: <Target size={24} color={colors.gold} />,
      color: colors.gold,
    },
    {
      id: '1rm',
      title: '1RM Force',
      subtitle: 'Calculateur de charge max',
      icon: <Dumbbell size={24} color="#EF4444" />,
      color: '#EF4444',
    },
    {
      id: 'heart',
      title: 'Zones Cardio',
      subtitle: 'Frequence cardiaque',
      icon: <Heart size={24} color="#EF4444" />,
      color: '#EF4444',
      route: '/heart-zones',
    },
    {
      id: 'macros',
      title: 'Macros',
      subtitle: 'Repartition nutritionnelle',
      icon: <Utensils size={24} color={colors.info} />,
      color: colors.info,
    },
    {
      id: 'water',
      title: 'Eau Quotidienne',
      subtitle: 'Hydratation optimale',
      icon: <Droplet size={24} color="#3B82F6" />,
      color: '#3B82F6',
    },
  ];

  const handleCalculatorPress = (id: string, route?: string) => {
    if (route) {
      router.push(route as any);
      return;
    }

    switch (id) {
      case 'imc': setShowIMC(true); break;
      case 'img': setShowIMG(true); break;
      case 'bmr': setShowBMR(true); break;
      case 'tdee': setShowTDEE(true); break;
      case 'ideal': setShowIdealWeight(true); break;
      case '1rm': setShowOneRM(true); break;
      case 'macros': setShowMacros(true); break;
      case 'water': setShowWater(true); break;
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Calculateurs" showBack />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.goldMuted }]}>
          <Calculator size={24} color={colors.gold} />
          <Text style={[styles.infoText, { color: colors.gold }]}>
            Tous tes calculs fitness/sante en un seul endroit
          </Text>
        </View>

        {/* Donnees actuelles - Masquee si vide */}
        {(userData.weight > 0 || userData.height > 0 || userData.age > 0) && (
          <Card style={styles.userDataCard}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Tes donnees
            </Text>
            <View style={styles.userDataRow}>
              <View style={styles.userDataItem}>
                <Text style={[styles.userDataValue, { color: colors.gold }]}>
                  {userData.weight > 0 ? userData.weight : '-'}
                </Text>
                <Text style={[styles.userDataLabel, { color: colors.textMuted }]}>kg</Text>
              </View>
              <View style={[styles.userDataDivider, { backgroundColor: colors.border }]} />
              <View style={styles.userDataItem}>
                <Text style={[styles.userDataValue, { color: colors.gold }]}>
                  {userData.height > 0 ? userData.height : '-'}
                </Text>
                <Text style={[styles.userDataLabel, { color: colors.textMuted }]}>cm</Text>
              </View>
              <View style={[styles.userDataDivider, { backgroundColor: colors.border }]} />
              <View style={styles.userDataItem}>
                <Text style={[styles.userDataValue, { color: colors.gold }]}>
                  {userData.age > 0 ? userData.age : '-'}
                </Text>
                <Text style={[styles.userDataLabel, { color: colors.textMuted }]}>ans</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Liste des calculateurs */}
        <View style={styles.calculatorsList}>
          {calculators.map((calc) => (
            <TouchableOpacity
              key={calc.id}
              style={[styles.calculatorItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleCalculatorPress(calc.id, calc.route)}
              activeOpacity={0.7}
            >
              <View style={[styles.calculatorIcon, { backgroundColor: calc.color + '20' }]}>
                {calc.icon}
              </View>
              <View style={styles.calculatorContent}>
                <Text style={[styles.calculatorTitle, { color: colors.textPrimary }]}>
                  {calc.title}
                </Text>
                <Text style={[styles.calculatorSubtitle, { color: colors.textSecondary }]}>
                  {calc.subtitle}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ============================================ */}
      {/* MODAL IMC */}
      {/* ============================================ */}
      <CalculatorModal visible={showIMC} onClose={() => setShowIMC(false)} title="IMC - Indice de Masse Corporelle" colors={colors}>
        <DataInput
          label="Poids"
          value={weightStr}
          unit="kg"
          onChange={setWeightStr}
          colors={colors}
        />
        <DataInput
          label="Taille"
          value={heightStr}
          unit="cm"
          onChange={setHeightStr}
          colors={colors}
        />

        {userData.weight > 0 && userData.height > 0 && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Ton IMC</Text>
            <Text style={[styles.resultValue, { color: getIMCCategory(calculateIMC()).color }]}>
              {calculateIMC().toFixed(1)}
            </Text>
            <View style={[styles.resultBadge, { backgroundColor: getIMCCategory(calculateIMC()).color + '20' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {React.createElement(getIMCCategory(calculateIMC()).iconComponent, { size: 16, color: getIMCCategory(calculateIMC()).color })}
                <Text style={[styles.resultBadgeText, { color: getIMCCategory(calculateIMC()).color }]}>
                  {getIMCCategory(calculateIMC()).label}
                </Text>
              </View>
            </View>

            {/* Echelle IMC */}
            <View style={styles.imcScale}>
              {[
                { label: '< 18.5', color: colors.info, name: 'Maigre' },
                { label: '18.5-24.9', color: colors.success, name: 'Normal' },
                { label: '25-29.9', color: colors.warning, name: 'Surpoids' },
                { label: '> 30', color: colors.danger, name: 'Obesite' },
              ].map((item, idx) => (
                <View key={idx} style={styles.imcScaleItem}>
                  <View style={[styles.imcScaleBar, { backgroundColor: item.color }]} />
                  <Text style={[styles.imcScaleLabel, { color: colors.textMuted }]}>{item.label}</Text>
                  <Text style={[styles.imcScaleName, { color: item.color }]}>{item.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[styles.formulaCard, { backgroundColor: colors.cardHover }]}>
          <Info size={16} color={colors.textMuted} />
          <Text style={[styles.formulaText, { color: colors.textMuted }]}>
            Formule : Poids (kg) / Taille (m)²
          </Text>
        </View>
      </CalculatorModal>

      {/* ============================================ */}
      {/* MODAL IMG */}
      {/* ============================================ */}
      <CalculatorModal visible={showIMG} onClose={() => setShowIMG(false)} title="IMG - Indice de Masse Grasse" colors={colors}>
        <GenderToggleComponent gender={gender} onSelect={setGender} colors={colors} />
        <DataInput
          label="Poids"
          value={weightStr}
          unit="kg"
          onChange={setWeightStr}
          colors={colors}
        />
        <DataInput
          label="Taille"
          value={heightStr}
          unit="cm"
          onChange={setHeightStr}
          colors={colors}
        />
        <DataInput
          label="Age"
          value={ageStr}
          unit="ans"
          onChange={setAgeStr}
          colors={colors}
        />

        {userData.weight > 0 && userData.height > 0 && userData.age > 0 && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>Ton IMG (estimation)</Text>
            <Text style={[styles.resultValue, { color: getIMGCategory(calculateIMG(), userData.gender).color }]}>
              {calculateIMG().toFixed(1)}%
            </Text>
            <View style={[styles.resultBadge, { backgroundColor: getIMGCategory(calculateIMG(), userData.gender).color + '20' }]}>
              <Text style={[styles.resultBadgeText, { color: getIMGCategory(calculateIMG(), userData.gender).color }]}>
                {getIMGCategory(calculateIMG(), userData.gender).label}
              </Text>
            </View>

            <View style={[styles.imgReference, { borderTopColor: colors.border }]}>
              <Text style={[styles.imgReferenceTitle, { color: colors.textSecondary }]}>
                Plages de reference ({userData.gender === 'male' ? 'Homme' : 'Femme'})
              </Text>
              <View style={styles.imgReferenceList}>
                {(userData.gender === 'male' ? [
                  { range: '< 10%', label: 'Tres maigre' },
                  { range: '10-20%', label: 'Athlete' },
                  { range: '20-25%', label: 'Normal' },
                  { range: '> 25%', label: 'Eleve' },
                ] : [
                  { range: '< 18%', label: 'Tres maigre' },
                  { range: '18-25%', label: 'Athlete' },
                  { range: '25-32%', label: 'Normal' },
                  { range: '> 32%', label: 'Eleve' },
                ]).map((item, idx) => (
                  <View key={idx} style={styles.imgReferenceItem}>
                    <Text style={[styles.imgReferenceRange, { color: colors.gold }]}>{item.range}</Text>
                    <Text style={[styles.imgReferenceLabel, { color: colors.textMuted }]}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={[styles.formulaCard, { backgroundColor: colors.cardHover }]}>
          <Info size={16} color={colors.textMuted} />
          <View>
            <Text style={[styles.formulaText, { color: colors.textMuted }]}>
              Formule Deurenberg :
            </Text>
            <Text style={[styles.formulaDetail, { color: colors.textMuted }]}>
              H: (1.20 × IMC) + (0.23 × age) - 10.8 - 5.4
            </Text>
            <Text style={[styles.formulaDetail, { color: colors.textMuted }]}>
              F: (1.20 × IMC) + (0.23 × age) - 5.4
            </Text>
          </View>
        </View>
      </CalculatorModal>

      {/* ============================================ */}
      {/* MODAL BMR */}
      {/* ============================================ */}
      <CalculatorModal visible={showBMR} onClose={() => setShowBMR(false)} title="BMR - Metabolisme de Base" colors={colors}>
        <GenderToggleComponent gender={gender} onSelect={setGender} colors={colors} />
        <DataInput
          label="Poids"
          value={weightStr}
          unit="kg"
          onChange={setWeightStr}
          colors={colors}
        />
        <DataInput
          label="Taille"
          value={heightStr}
          unit="cm"
          onChange={setHeightStr}
          colors={colors}
        />
        <DataInput
          label="Age"
          value={ageStr}
          unit="ans"
          onChange={setAgeStr}
          colors={colors}
        />

        {userData.weight > 0 && userData.height > 0 && userData.age > 0 && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
              Ton metabolisme de base
            </Text>
            <Text style={[styles.resultValue, { color: colors.gold }]}>
              {Math.round(calculateBMR())}
            </Text>
            <Text style={[styles.resultUnit, { color: colors.gold }]}>kcal/jour</Text>

            <Text style={[styles.resultExplain, { color: colors.textMuted }]}>
              C'est l'energie que ton corps depense au repos, juste pour fonctionner (respirer, digerer, etc.)
            </Text>
          </View>
        )}

        <View style={[styles.formulaCard, { backgroundColor: colors.cardHover }]}>
          <Info size={16} color={colors.textMuted} />
          <View>
            <Text style={[styles.formulaText, { color: colors.textMuted }]}>
              Formule Mifflin-St Jeor :
            </Text>
            <Text style={[styles.formulaDetail, { color: colors.textMuted }]}>
              H: (10×P) + (6.25×T) - (5×A) + 5
            </Text>
            <Text style={[styles.formulaDetail, { color: colors.textMuted }]}>
              F: (10×P) + (6.25×T) - (5×A) - 161
            </Text>
          </View>
        </View>
      </CalculatorModal>

      {/* ============================================ */}
      {/* MODAL TDEE */}
      {/* ============================================ */}
      <CalculatorModal visible={showTDEE} onClose={() => setShowTDEE(false)} title="TDEE - Besoins Caloriques" colors={colors}>
        <GenderToggleComponent gender={gender} onSelect={setGender} colors={colors} />
        <DataInput
          label="Poids"
          value={weightStr}
          unit="kg"
          onChange={setWeightStr}
          colors={colors}
        />
        <DataInput
          label="Taille"
          value={heightStr}
          unit="cm"
          onChange={setHeightStr}
          colors={colors}
        />
        <DataInput
          label="Age"
          value={ageStr}
          unit="ans"
          onChange={setAgeStr}
          colors={colors}
        />

        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Niveau d'activite</Text>
        <View style={styles.activityList}>
          {(Object.keys(ACTIVITY_MULTIPLIERS) as ActivityLevel[]).map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.activityItem,
                { backgroundColor: activityLevel === level ? colors.goldMuted : colors.cardHover }
              ]}
              onPress={() => setActivityLevel(level)}
            >
              <View style={styles.activityHeader}>
                <View style={[
                  styles.activityRadio,
                  { borderColor: activityLevel === level ? colors.gold : colors.border },
                  activityLevel === level && { backgroundColor: colors.gold }
                ]} />
                <Text style={[
                  styles.activityLabel,
                  { color: activityLevel === level ? colors.gold : colors.textPrimary }
                ]}>
                  {ACTIVITY_MULTIPLIERS[level].label}
                </Text>
                <Text style={[styles.activityMultiplier, { color: colors.textMuted }]}>
                  ×{ACTIVITY_MULTIPLIERS[level].value}
                </Text>
              </View>
              <Text style={[styles.activityDesc, { color: colors.textMuted }]}>
                {ACTIVITY_MULTIPLIERS[level].desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {userData.weight > 0 && userData.height > 0 && userData.age > 0 && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
              Tes besoins caloriques journaliers
            </Text>
            <Text style={[styles.resultValue, { color: colors.gold }]}>
              {Math.round(calculateTDEE())}
            </Text>
            <Text style={[styles.resultUnit, { color: colors.gold }]}>kcal/jour</Text>

            <View style={[styles.tdeeBreakdown, { borderTopColor: colors.border }]}>
              <View style={styles.tdeeBreakdownItem}>
                <Text style={[styles.tdeeBreakdownLabel, { color: colors.textMuted }]}>Pour perdre</Text>
                <Text style={[styles.tdeeBreakdownValue, { color: colors.success }]}>
                  {Math.round(calculateTDEE() - 500)} kcal
                </Text>
              </View>
              <View style={styles.tdeeBreakdownItem}>
                <Text style={[styles.tdeeBreakdownLabel, { color: colors.textMuted }]}>Pour maintenir</Text>
                <Text style={[styles.tdeeBreakdownValue, { color: colors.gold }]}>
                  {Math.round(calculateTDEE())} kcal
                </Text>
              </View>
              <View style={styles.tdeeBreakdownItem}>
                <Text style={[styles.tdeeBreakdownLabel, { color: colors.textMuted }]}>Pour prendre</Text>
                <Text style={[styles.tdeeBreakdownValue, { color: colors.info }]}>
                  {Math.round(calculateTDEE() + 300)} kcal
                </Text>
              </View>
            </View>
          </View>
        )}
      </CalculatorModal>

      {/* ============================================ */}
      {/* MODAL POIDS IDEAL */}
      {/* ============================================ */}
      <CalculatorModal visible={showIdealWeight} onClose={() => setShowIdealWeight(false)} title="Poids Ideal" colors={colors}>
        <GenderToggleComponent gender={gender} onSelect={setGender} colors={colors} />
        <DataInput
          label="Taille"
          value={heightStr}
          unit="cm"
          onChange={setHeightStr}
          colors={colors}
        />

        {userData.height > 0 && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
              Fourchette de poids ideal
            </Text>

            <View style={styles.idealWeightRange}>
              <Text style={[styles.idealWeightValue, { color: colors.gold }]}>
                {calculateIdealWeight().min} - {calculateIdealWeight().max}
              </Text>
              <Text style={[styles.idealWeightUnit, { color: colors.gold }]}>kg</Text>
            </View>

            <Text style={[styles.idealWeightInfo, { color: colors.textMuted }]}>
              Basee sur un IMC entre 18.5 et 24.9
            </Text>

            <View style={[styles.idealFormulas, { borderTopColor: colors.border }]}>
              <Text style={[styles.idealFormulasTitle, { color: colors.textSecondary }]}>
                Selon les formules
              </Text>
              <View style={styles.idealFormulaItem}>
                <Text style={[styles.idealFormulaName, { color: colors.textMuted }]}>Lorentz</Text>
                <Text style={[styles.idealFormulaValue, { color: colors.textPrimary }]}>
                  {calculateIdealWeight().lorentz} kg
                </Text>
              </View>
              <View style={styles.idealFormulaItem}>
                <Text style={[styles.idealFormulaName, { color: colors.textMuted }]}>Devine</Text>
                <Text style={[styles.idealFormulaValue, { color: colors.textPrimary }]}>
                  {calculateIdealWeight().devine} kg
                </Text>
              </View>
            </View>

            {userData.weight > 0 && (
              <View style={[styles.currentVsIdeal, { backgroundColor: colors.cardHover }]}>
                <Text style={[styles.currentVsIdealLabel, { color: colors.textSecondary }]}>
                  Ton poids actuel : {userData.weight} kg
                </Text>
                {userData.weight > calculateIdealWeight().max ? (
                  <Text style={[styles.currentVsIdealDiff, { color: colors.warning }]}>
                    {(userData.weight - calculateIdealWeight().max).toFixed(1)} kg au-dessus
                  </Text>
                ) : userData.weight < calculateIdealWeight().min ? (
                  <Text style={[styles.currentVsIdealDiff, { color: colors.info }]}>
                    {(calculateIdealWeight().min - userData.weight).toFixed(1)} kg en-dessous
                  </Text>
                ) : (
                  <Text style={[styles.currentVsIdealDiff, { color: colors.success }]}>
                    Tu es dans la fourchette ideale !
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </CalculatorModal>

      {/* ============================================ */}
      {/* MODAL MACROS */}
      {/* ============================================ */}
      <CalculatorModal visible={showMacros} onClose={() => setShowMacros(false)} title="Repartition Macros" colors={colors}>
        <GenderToggleComponent gender={gender} onSelect={setGender} colors={colors} />
        <DataInput
          label="Poids"
          value={weightStr}
          unit="kg"
          onChange={setWeightStr}
          colors={colors}
        />
        <DataInput
          label="Taille"
          value={heightStr}
          unit="cm"
          onChange={setHeightStr}
          colors={colors}
        />
        <DataInput
          label="Age"
          value={ageStr}
          unit="ans"
          onChange={setAgeStr}
          colors={colors}
        />

        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Ton objectif</Text>
        <View style={styles.goalToggle}>
          {(['lose', 'maintain', 'gain'] as Goal[]).map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.goalButton,
                { backgroundColor: goal === g ? colors.gold : colors.cardHover }
              ]}
              onPress={() => setGoal(g)}
            >
              <Text style={[
                styles.goalText,
                { color: goal === g ? colors.background : colors.textSecondary }
              ]}>
                {MACROS_BY_GOAL[g].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {userData.weight > 0 && userData.height > 0 && userData.age > 0 && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
              Tes macros quotidiennes
            </Text>

            <View style={styles.macrosCalories}>
              <Text style={[styles.macrosCaloriesValue, { color: colors.gold }]}>
                {calculateMacros().calories}
              </Text>
              <Text style={[styles.macrosCaloriesUnit, { color: colors.gold }]}>kcal/jour</Text>
            </View>

            <View style={styles.macrosGrid}>
              <View style={[styles.macroItem, { backgroundColor: colors.successMuted }]}>
                <Text style={[styles.macroValue, { color: colors.success }]}>
                  {calculateMacros().protein}g
                </Text>
                <Text style={[styles.macroLabel, { color: colors.success }]}>Proteines</Text>
                <Text style={[styles.macroPercent, { color: colors.textMuted }]}>
                  {calculateMacros().percentages.protein}%
                </Text>
              </View>
              <View style={[styles.macroItem, { backgroundColor: colors.warningMuted }]}>
                <Text style={[styles.macroValue, { color: colors.warning }]}>
                  {calculateMacros().carbs}g
                </Text>
                <Text style={[styles.macroLabel, { color: colors.warning }]}>Glucides</Text>
                <Text style={[styles.macroPercent, { color: colors.textMuted }]}>
                  {calculateMacros().percentages.carbs}%
                </Text>
              </View>
              <View style={[styles.macroItem, { backgroundColor: colors.infoMuted }]}>
                <Text style={[styles.macroValue, { color: colors.info }]}>
                  {calculateMacros().fat}g
                </Text>
                <Text style={[styles.macroLabel, { color: colors.info }]}>Lipides</Text>
                <Text style={[styles.macroPercent, { color: colors.textMuted }]}>
                  {calculateMacros().percentages.fat}%
                </Text>
              </View>
            </View>

            <Text style={[styles.macrosTip, { color: colors.textMuted }]}>
              {goal === 'lose' && 'Deficit de 500 kcal pour perdre ~0.5kg/semaine'}
              {goal === 'maintain' && 'Equilibre pour maintenir ton poids actuel'}
              {goal === 'gain' && 'Surplus de 300 kcal pour prise de masse seche'}
            </Text>
          </View>
        )}
      </CalculatorModal>

      {/* ============================================ */}
      {/* MODAL EAU */}
      {/* ============================================ */}
      <CalculatorModal visible={showWater} onClose={() => setShowWater(false)} title="Eau Quotidienne" colors={colors}>
        <DataInput
          label="Poids"
          value={weightStr}
          unit="kg"
          onChange={setWeightStr}
          colors={colors}
        />

        <View style={styles.inputRow}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Heures d'exercice/jour</Text>
          <View style={styles.exerciseButtons}>
            {[0, 0.5, 1, 1.5, 2].map((h) => (
              <TouchableOpacity
                key={h}
                style={[
                  styles.exerciseButton,
                  { backgroundColor: exerciseHours === h ? colors.gold : colors.cardHover }
                ]}
                onPress={() => setExerciseHours(h)}
              >
                <Text style={[
                  styles.exerciseButtonText,
                  { color: exerciseHours === h ? colors.background : colors.textSecondary }
                ]}>
                  {h}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {userData.weight > 0 && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
              Tes besoins en eau
            </Text>

            <View style={styles.waterResults}>
              <View style={styles.waterResultItem}>
                <Droplet size={28} color="#3B82F6" />
                <Text style={[styles.waterResultValue, { color: '#3B82F6' }]}>
                  {calculateWater().base}L
                </Text>
                <Text style={[styles.waterResultLabel, { color: colors.textMuted }]}>
                  Minimum (repos)
                </Text>
              </View>

              {exerciseHours > 0 && (
                <View style={styles.waterResultItem}>
                  <Droplet size={28} color={colors.gold} />
                  <Text style={[styles.waterResultValue, { color: colors.gold }]}>
                    {calculateWater().withExercise}L
                  </Text>
                  <Text style={[styles.waterResultLabel, { color: colors.textMuted }]}>
                    Avec exercice
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.waterTip, { backgroundColor: colors.infoMuted }]}>
              <Info size={16} color={colors.info} />
              <Text style={[styles.waterTipText, { color: colors.info }]}>
                +0.5L par heure d'exercice intense
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.formulaCard, { backgroundColor: colors.cardHover }]}>
          <Info size={16} color={colors.textMuted} />
          <Text style={[styles.formulaText, { color: colors.textMuted }]}>
            Formule : Poids (kg) × 0.033 = Litres/jour
          </Text>
        </View>
      </CalculatorModal>

      {/* ============================================ */}
      {/* MODAL 1RM - CALCULATEUR DE FORCE */}
      {/* ============================================ */}
      <CalculatorModal visible={showOneRM} onClose={() => setShowOneRM(false)} title="1RM - Calculateur de Force" colors={colors}>
        {/* Selection de l'exercice */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Exercice</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.exerciseScroll}
          contentContainerStyle={styles.exerciseScrollContent}
        >
          {(Object.keys(EXERCISES) as ExerciseType[]).map((key) => {
            const IconComponent = EXERCISES[key].iconComponent;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.exerciseChip,
                  { backgroundColor: selectedExercise === key ? colors.gold : colors.cardHover }
                ]}
                onPress={() => setSelectedExercise(key)}
              >
                <IconComponent
                  size={18}
                  color={selectedExercise === key ? colors.background : colors.textPrimary}
                />
                <Text style={[
                  styles.exerciseChipText,
                  { color: selectedExercise === key ? colors.background : colors.textPrimary }
                ]}>
                  {EXERCISES[key].name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Inputs poids et reps */}
        <View style={styles.liftInputsRow}>
          <View style={styles.liftInputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Charge</Text>
            <View style={[styles.liftInputBox, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.liftInput, { color: colors.textPrimary }]}
                value={liftWeightStr}
                onChangeText={setLiftWeightStr}
                keyboardType="decimal-pad"
                maxLength={5}
              />
              <Text style={[styles.liftInputUnit, { color: colors.textMuted }]}>kg</Text>
            </View>
          </View>

          <Text style={[styles.liftInputX, { color: colors.textMuted }]}>×</Text>

          <View style={styles.liftInputContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reps</Text>
            <View style={[styles.liftInputBox, { backgroundColor: colors.cardHover }]}>
              <TextInput
                style={[styles.liftInput, { color: colors.textPrimary }]}
                value={liftRepsStr}
                onChangeText={setLiftRepsStr}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>
        </View>

        {liftWeight > 0 && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Resultat 1RM */}
            <Text style={[styles.resultLabel, { color: colors.textSecondary }]}>
              Ton 1RM estime
            </Text>
            <Text style={[styles.resultValue, { color: '#EF4444' }]}>
              {calculateOneRM()}
            </Text>
            <Text style={[styles.resultUnit, { color: '#EF4444' }]}>kg</Text>

            {/* Niveau de force */}
            <View style={[styles.strengthLevelBadge, { backgroundColor: getStrengthLevel().color + '20' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {React.createElement(getStrengthLevel().iconComponent, { size: 16, color: getStrengthLevel().color })}
                <Text style={[styles.strengthLevelText, { color: getStrengthLevel().color }]}>
                  Niveau : {getStrengthLevel().level}
                </Text>
              </View>
              <Text style={[styles.strengthRatio, { color: colors.textMuted }]}>
                ({(calculateOneRM() / userData.weight).toFixed(2)}× ton poids)
              </Text>
            </View>

            {/* Tableau des charges */}
            <View style={[styles.repRangeTable, { borderTopColor: colors.border }]}>
              <Text style={[styles.repRangeTitle, { color: colors.textSecondary }]}>
                Charges estimees par objectif
              </Text>
              {getRepRangeWeights().map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.repRangeRow,
                    item.reps === 1 && { backgroundColor: colors.goldMuted }
                  ]}
                >
                  <Text style={[styles.repRangeLabel, { color: colors.textPrimary }]}>
                    {item.label}
                  </Text>
                  <View style={styles.repRangeValues}>
                    <Text style={[styles.repRangeWeight, { color: colors.gold }]}>
                      {item.weight} kg
                    </Text>
                    <Text style={[styles.repRangePercent, { color: colors.textMuted }]}>
                      {item.percent}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Standards de force */}
            <View style={[styles.strengthStandards, { borderTopColor: colors.border }]}>
              <Text style={[styles.strengthStandardsTitle, { color: colors.textSecondary }]}>
                Standards {EXERCISES[selectedExercise].name} (× poids corps)
              </Text>
              <View style={styles.strengthStandardsRow}>
                <View style={styles.strengthStandardItem}>
                  <Text style={[styles.strengthStandardValue, { color: colors.textMuted }]}>
                    {EXERCISES[selectedExercise].standards.beginner}×
                  </Text>
                  <Text style={[styles.strengthStandardLabel, { color: colors.textMuted }]}>Debut.</Text>
                </View>
                <View style={styles.strengthStandardItem}>
                  <Text style={[styles.strengthStandardValue, { color: colors.info }]}>
                    {EXERCISES[selectedExercise].standards.intermediate}×
                  </Text>
                  <Text style={[styles.strengthStandardLabel, { color: colors.info }]}>Inter.</Text>
                </View>
                <View style={styles.strengthStandardItem}>
                  <Text style={[styles.strengthStandardValue, { color: colors.success }]}>
                    {EXERCISES[selectedExercise].standards.advanced}×
                  </Text>
                  <Text style={[styles.strengthStandardLabel, { color: colors.success }]}>Avance</Text>
                </View>
                <View style={styles.strengthStandardItem}>
                  <Text style={[styles.strengthStandardValue, { color: '#FFD700' }]}>
                    {EXERCISES[selectedExercise].standards.elite}×
                  </Text>
                  <Text style={[styles.strengthStandardLabel, { color: '#FFD700' }]}>Elite</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.formulaCard, { backgroundColor: colors.cardHover }]}>
          <Info size={16} color={colors.textMuted} />
          <View>
            <Text style={[styles.formulaText, { color: colors.textMuted }]}>
              Formule Epley :
            </Text>
            <Text style={[styles.formulaDetail, { color: colors.textMuted }]}>
              1RM = Charge × (1 + Reps / 30)
            </Text>
          </View>
        </View>
      </CalculatorModal>
    </ScreenWrapper>
  );
}

const RADIUS = { sm: 8, md: 12, lg: 16 };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: RADIUS.lg,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },

  // User Data Card
  userDataCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  userDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  userDataItem: {
    alignItems: 'center',
  },
  userDataValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  userDataLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  userDataDivider: {
    width: 1,
    height: 40,
  },

  // Calculators List
  calculatorsList: {
    gap: 8,
  },
  calculatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    gap: 16,
  },
  calculatorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calculatorContent: {
    flex: 1,
  },
  calculatorTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  calculatorSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 20,
  },

  // Inputs
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
  },
  input: {
    fontSize: 18,
    fontWeight: '700',
    width: 70,
    textAlign: 'center',
    paddingVertical: 10,
  },
  inputUnit: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },

  // Gender Toggle
  genderToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  genderText: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Result Card
  resultCard: {
    padding: 20,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginTop: 20,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2,
  },
  resultUnit: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: -4,
  },
  resultBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  resultBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultExplain: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },

  // IMC Scale
  imcScale: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
    width: '100%',
  },
  imcScaleItem: {
    flex: 1,
    alignItems: 'center',
  },
  imcScaleBar: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    marginBottom: 6,
  },
  imcScaleLabel: {
    fontSize: 10,
  },
  imcScaleName: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },

  // IMG Reference
  imgReference: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  imgReferenceTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  imgReferenceList: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  imgReferenceItem: {
    alignItems: 'center',
  },
  imgReferenceRange: {
    fontSize: 12,
    fontWeight: '700',
  },
  imgReferenceLabel: {
    fontSize: 10,
    marginTop: 2,
  },

  // Formula Card
  formulaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: RADIUS.md,
    marginTop: 20,
  },
  formulaText: {
    fontSize: 12,
  },
  formulaDetail: {
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 4,
  },

  // Section Label
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },

  // Activity List
  activityList: {
    gap: 8,
  },
  activityItem: {
    padding: 14,
    borderRadius: RADIUS.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  activityLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  activityMultiplier: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityDesc: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 30,
  },

  // TDEE Breakdown
  tdeeBreakdown: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    justifyContent: 'space-around',
  },
  tdeeBreakdownItem: {
    alignItems: 'center',
  },
  tdeeBreakdownLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  tdeeBreakdownValue: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Ideal Weight
  idealWeightRange: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  idealWeightValue: {
    fontSize: 36,
    fontWeight: '900',
  },
  idealWeightUnit: {
    fontSize: 18,
    fontWeight: '600',
  },
  idealWeightInfo: {
    fontSize: 12,
    marginTop: 8,
  },
  idealFormulas: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  idealFormulasTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  idealFormulaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  idealFormulaName: {
    fontSize: 14,
  },
  idealFormulaValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  currentVsIdeal: {
    width: '100%',
    marginTop: 16,
    padding: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  currentVsIdealLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  currentVsIdealDiff: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Goal Toggle
  goalToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  goalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  goalText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Macros
  macrosCalories: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  macrosCaloriesValue: {
    fontSize: 42,
    fontWeight: '900',
  },
  macrosCaloriesUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  macroItem: {
    flex: 1,
    padding: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  macroLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  macroPercent: {
    fontSize: 10,
    marginTop: 2,
  },
  macrosTip: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },

  // Exercise Buttons
  exerciseButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exerciseButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  exerciseButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Water
  waterResults: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 16,
  },
  waterResultItem: {
    alignItems: 'center',
    gap: 8,
  },
  waterResultValue: {
    fontSize: 32,
    fontWeight: '900',
  },
  waterResultLabel: {
    fontSize: 12,
  },
  waterTip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: RADIUS.md,
    width: '100%',
  },
  waterTipText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ============================================
  // 1RM Calculator Styles
  // ============================================
  exerciseScroll: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  exerciseScrollContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  exerciseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    gap: 8,
  },
  exerciseChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  liftInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  liftInputContainer: {
    alignItems: 'center',
  },
  liftInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  liftInput: {
    fontSize: 28,
    fontWeight: '800',
    width: 80,
    textAlign: 'center',
    paddingVertical: 12,
  },
  liftInputUnit: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  liftInputX: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
  },

  strengthLevelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  strengthLevelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  strengthRatio: {
    fontSize: 12,
    marginTop: 2,
  },

  repRangeTable: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  repRangeTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  repRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
    marginBottom: 4,
  },
  repRangeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  repRangeValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  repRangeWeight: {
    fontSize: 16,
    fontWeight: '800',
  },
  repRangePercent: {
    fontSize: 12,
    width: 35,
  },

  strengthStandards: {
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  strengthStandardsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  strengthStandardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  strengthStandardItem: {
    alignItems: 'center',
  },
  strengthStandardValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  strengthStandardLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
