import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Path, G } from 'react-native-svg';
import {
  ChevronLeft,
  Save,
  Droplets,
  Flame,
  Activity,
  Heart,
  Zap,
  TrendingDown,
  TrendingUp,
  Info,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BodyComposition,
  addBodyComposition,
  getLatestBodyComposition,
  analyzeBodyComposition,
  calculateBMR,
} from '@/lib/bodyComposition';
import { getProfile } from '@/lib/database';
import { successHaptic, lightHaptic } from '@/lib/haptics';
import { useTheme } from '@/lib/ThemeContext';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS, GRADIENTS, BODY_COMP_COLORS } from '@/constants/design';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// COMPOSITION CORPORELLE - IMPÉDANCEMÈTRE
// ============================================

// Circular Progress Ring
const ProgressRing = ({
  progress,
  size = 100,
  strokeWidth = 8,
  color,
  bgColor = COLORS.surfaceBorder,
  children,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor?: string;
  children?: React.ReactNode;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
};

// Input Field Component
const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  unit,
  icon: Icon,
  color,
  description,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  unit: string;
  icon: any;
  color: string;
  description?: string;
}) => (
  <View style={styles.inputCard}>
    <View style={styles.inputHeader}>
      <View style={[styles.inputIcon, { backgroundColor: `${color}20` }]}>
        <Icon size={18} color={color} />
      </View>
      <View style={styles.inputLabelContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        {description && <Text style={styles.inputDescription}>{description}</Text>}
      </View>
    </View>
    <View style={styles.inputRow}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(',', '.'))}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        keyboardType="decimal-pad"
      />
      <Text style={styles.inputUnit}>{unit}</Text>
    </View>
  </View>
);

// Composition Preview Card
const CompositionPreview = ({
  bodyFat,
  muscle,
  water,
  bone,
}: {
  bodyFat: number;
  muscle: number;
  water: number;
  bone: number;
}) => {
  const total = bodyFat + muscle + bone;
  if (total === 0) return null;

  const fatWidth = (bodyFat / 100) * 100;
  const muscleWidth = (muscle / 100) * 100;
  const waterWidth = (water / 100) * 100;

  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewTitle}>Aperçu Composition</Text>

      <View style={styles.compositionBars}>
        <View style={styles.barRow}>
          <View style={[styles.barLabel, { backgroundColor: COLORS.primaryMuted }]}>
            <Flame size={12} color={COLORS.primary} />
            <Text style={[styles.barLabelText, { color: COLORS.primary }]}>Graisse</Text>
          </View>
          <View style={styles.barContainer}>
            <LinearGradient
              colors={GRADIENTS.bodyFat}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.bar, { width: `${fatWidth}%` }]}
            />
          </View>
          <Text style={styles.barValue}>{bodyFat.toFixed(1)}%</Text>
        </View>

        <View style={styles.barRow}>
          <View style={[styles.barLabel, { backgroundColor: COLORS.successMuted }]}>
            <Activity size={12} color={COLORS.success} />
            <Text style={[styles.barLabelText, { color: COLORS.success }]}>Muscle</Text>
          </View>
          <View style={styles.barContainer}>
            <LinearGradient
              colors={GRADIENTS.muscle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.bar, { width: `${muscleWidth}%` }]}
            />
          </View>
          <Text style={styles.barValue}>{muscle.toFixed(1)}%</Text>
        </View>

        <View style={styles.barRow}>
          <View style={[styles.barLabel, { backgroundColor: COLORS.infoMuted }]}>
            <Droplets size={12} color={COLORS.info} />
            <Text style={[styles.barLabelText, { color: COLORS.info }]}>Eau</Text>
          </View>
          <View style={styles.barContainer}>
            <LinearGradient
              colors={GRADIENTS.water}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.bar, { width: `${waterWidth}%` }]}
            />
          </View>
          <Text style={styles.barValue}>{water.toFixed(1)}%</Text>
        </View>
      </View>
    </View>
  );
};

export default function BodyCompositionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // Form state
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [boneMass, setBoneMass] = useState('');
  const [waterPercent, setWaterPercent] = useState('');
  const [visceralFat, setVisceralFat] = useState('');
  const [metabolicAge, setMetabolicAge] = useState('');
  const [bmr, setBmr] = useState('');

  const [lastEntry, setLastEntry] = useState<BodyComposition | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const last = await getLatestBodyComposition();
      setLastEntry(last);

      const profileData = await getProfile();
      setProfile(profileData);

      // Pre-fill BMR if we have profile data
      if (profileData && last) {
        const calculatedBmr = calculateBMR(
          last.weight,
          profileData.height_cm || 170,
          30, // default age
          profileData.avatar_gender === 'femme' ? 'female' : 'male'
        );
        setBmr(calculatedBmr.toString());
      }
    } catch (error) {
      logger.error('Error loading data:', error);
    }
  }, []);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    const weightVal = parseFloat((weight || '').replace(',', '.'));
    const bodyFatVal = parseFloat((bodyFat || '').replace(',', '.'));

    if (!weight || !bodyFat || isNaN(weightVal) || isNaN(bodyFatVal)) {
      showPopup('Erreur', 'Le poids et le % de masse grasse doivent etre des nombres valides', [{ text: 'OK', style: 'primary' }]);
      return;
    }

    if (weightVal <= 0 || weightVal > 500 || bodyFatVal < 0 || bodyFatVal > 100) {
      showPopup('Erreur', 'Verifie les valeurs saisies (poids: 1-500kg, masse grasse: 0-100%)', [{ text: 'OK', style: 'primary' }]);
      return;
    }

    setIsSubmitting(true);

    try {
      const safeFloat = (val: string | undefined, fallback: number = 0) => {
        if (!val) return fallback;
        const n = parseFloat(val.replace(',', '.'));
        return isNaN(n) ? fallback : n;
      };
      const safeInt = (val: string | undefined, fallback?: number) => {
        if (!val) return fallback;
        const n = parseInt(val);
        return isNaN(n) ? fallback : n;
      };

      const data: Omit<BodyComposition, 'id'> = {
        date: format(new Date(), 'yyyy-MM-dd'),
        weight: weightVal,
        bodyFatPercent: bodyFatVal,
        muscleMass: safeFloat(muscleMass, 0),
        boneMass: safeFloat(boneMass, 0),
        waterPercent: safeFloat(waterPercent, 0),
        visceralFat: safeInt(visceralFat, 0) ?? 0,
        metabolicAge: safeInt(metabolicAge),
        bmr: safeInt(bmr),
      };

      await addBodyComposition(data);
      successHaptic();

      showPopup(
        'Enregistre !',
        'Ta composition corporelle a ete sauvegardee.',
        [{ text: 'OK', style: 'primary', onPress: () => router.back() }]
      );
    } catch (error) {
      logger.error('Error saving:', error);
      showPopup('Erreur', 'Impossible de sauvegarder', [{ text: 'OK', style: 'primary' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const bodyFatNum = bodyFat ? parseFloat(bodyFat.replace(',', '.')) : 0;
  const muscleNum = muscleMass ? parseFloat(muscleMass.replace(',', '.')) : 0;
  const waterNum = waterPercent ? parseFloat(waterPercent.replace(',', '.')) : 0;
  const boneNum = boneMass ? parseFloat(boneMass.replace(',', '.')) : 0;
  const weightNum = weight ? parseFloat(weight.replace(',', '.')) : 0;

  // Calculate muscle percentage from kg
  const musclePercent = weightNum > 0 ? (muscleNum / weightNum) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]} onPress={() => router.back()}>
            <ChevronLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Composition Corporelle</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <LinearGradient
            colors={GRADIENTS.sunset}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.infoGradient}
          >
            <Info size={18} color="#fff" />
            <Text style={styles.infoText}>
              Entre les données de ta balance impédancemètre (Withings, Xiaomi, Omron, etc.)
            </Text>
          </LinearGradient>
        </View>

        {/* Main Inputs */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Données principales</Text>

        <InputField
          label="Poids"
          value={weight}
          onChangeText={setWeight}
          placeholder="75.5"
          unit="kg"
          icon={Activity}
          color={COLORS.primary}
        />

        <InputField
          label="Masse grasse"
          value={bodyFat}
          onChangeText={setBodyFat}
          placeholder="18.5"
          unit="%"
          icon={Flame}
          color={BODY_COMP_COLORS.bodyFat}
          description="Pourcentage de graisse corporelle"
        />

        <InputField
          label="Masse musculaire"
          value={muscleMass}
          onChangeText={setMuscleMass}
          placeholder="35.0"
          unit="kg"
          icon={Zap}
          color={BODY_COMP_COLORS.muscle}
          description="Masse des muscles"
        />

        <InputField
          label="Eau corporelle"
          value={waterPercent}
          onChangeText={setWaterPercent}
          placeholder="55.0"
          unit="%"
          icon={Droplets}
          color={BODY_COMP_COLORS.water}
          description="Pourcentage d'eau dans le corps"
        />

        {/* Composition Preview */}
        <CompositionPreview
          bodyFat={bodyFatNum}
          muscle={musclePercent}
          water={waterNum}
          bone={boneNum}
        />

        {/* Advanced Inputs */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Données avancées</Text>

        <InputField
          label="Masse osseuse"
          value={boneMass}
          onChangeText={setBoneMass}
          placeholder="3.2"
          unit="kg"
          icon={Activity}
          color={BODY_COMP_COLORS.bone}
        />

        <InputField
          label="Graisse viscérale"
          value={visceralFat}
          onChangeText={setVisceralFat}
          placeholder="8"
          unit="niveau"
          icon={Heart}
          color={BODY_COMP_COLORS.visceralFat}
          description="Niveau 1-59 (1-12 = sain)"
        />

        <InputField
          label="Âge métabolique"
          value={metabolicAge}
          onChangeText={setMetabolicAge}
          placeholder="28"
          unit="ans"
          icon={Activity}
          color={BODY_COMP_COLORS.metabolicAge}
        />

        <InputField
          label="Métabolisme de base (BMR)"
          value={bmr}
          onChangeText={setBmr}
          placeholder="1650"
          unit="kcal"
          icon={Flame}
          color={BODY_COMP_COLORS.bmr}
          description="Calories brûlées au repos"
        />

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            <Save size={20} color="#fff" />
            <Text style={styles.saveButtonText}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
      <PopupComponent />
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },

  // Info Card
  infoCard: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
  },
  infoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  infoText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: '#fff',
    lineHeight: 20,
  },

  // Section Title
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },

  // Input Card
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  inputLabelContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.text,
  },
  inputDescription: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    padding: 0,
  },
  inputUnit: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textMuted,
    marginLeft: SPACING.sm,
  },

  // Preview Card
  previewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.lg,
    marginVertical: SPACING.lg,
  },
  previewTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  compositionBars: {
    gap: SPACING.md,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  barLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    minWidth: 80,
  },
  barLabelText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  barContainer: {
    flex: 1,
    height: 12,
    backgroundColor: COLORS.surfaceBorder,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 6,
  },
  barValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    minWidth: 50,
    textAlign: 'right',
  },

  // Save Button
  saveButton: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    marginTop: SPACING.xl,
    ...SHADOWS.glow,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: '#fff',
  },
});
