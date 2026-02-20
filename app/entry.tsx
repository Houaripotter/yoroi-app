import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Animated,
  StatusBar,
  Dimensions,
  Keyboard,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { NumericInput } from '@/components/NumericInput';
import {
  Scale,
  Save,
  Calendar as CalendarIcon,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  Minus,
  X,
  Target,
  Zap,
} from 'lucide-react-native';
import { addMeasurement, getAllMeasurements, getUserSettings } from '@/lib/storage';
import { calculateAllRecords } from '@/lib/records';
import DateTimePicker from '@react-native-community/datetimepicker';
import { updateWidget } from '@/lib/widgetService';
import { successHaptic, errorHaptic } from '@/lib/haptics';
import { playSuccessSound } from '@/lib/soundManager';
import { incrementReviewTrigger, askForReview } from '@/lib/reviewService';
import { useBadges } from '@/lib/BadgeContext';
import { COLORS, SHADOWS, SPACING, RADIUS, TYPOGRAPHY, GRADIENTS } from '@/constants/design';
import logger from '@/lib/security/logger';
import { useWatch } from '@/lib/WatchConnectivityProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// ECRAN DE SAISIE - DESIGN V5 VIBRANT
// ============================================

// Ring Progress for goal visualization
const GoalRingProgress = ({
  progress,
  size = 120,
  strokeWidth = 8
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGradient id="goalRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={COLORS.accent} />
          <Stop offset="100%" stopColor={COLORS.accentLight} />
        </SvgGradient>
      </Defs>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={COLORS.surfaceBorder}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#goalRingGrad)"
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
};

export default function EntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { checkBadges } = useBadges();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { syncWeight, isWatchAvailable } = useWatch();

  // States
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weight, setWeight] = useState('');
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);

  // Animations
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load data
  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadData = async () => {
    try {
      const measurements = await getAllMeasurements();
      if (measurements.length > 0) {
        setLastWeight(measurements[measurements.length - 1].weight);
      }
      const settings = await getUserSettings();
      if (settings?.weight_goal) {
        setGoalWeight(settings.weight_goal);
      } else if (settings?.targetWeight) {
        setGoalWeight(settings.targetWeight);
      }
    } catch (error) {
      logger.info('Error loading data:', error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const formatInputValue = (text: string) => {
    return text.replace(/[^0-9.,]/g, '');
  };

  const getWeightDifference = () => {
    if (!lastWeight || !weight) return null;
    const currentWeight = parseFloat(weight.replace(',', '.'));
    if (isNaN(currentWeight)) return null;
    return currentWeight - lastWeight;
  };

  const getProgressToGoal = () => {
    if (!goalWeight || !lastWeight || !weight) return null;
    const currentWeight = parseFloat(weight.replace(',', '.'));
    if (isNaN(currentWeight)) return null;

    const totalToLose = lastWeight - goalWeight;
    const lost = lastWeight - currentWeight;
    if (totalToLose <= 0) return null;

    return Math.min(100, Math.max(0, (lost / totalToLose) * 100));
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    if (!weight || parseFloat(weight.replace(',', '.')) <= 0) {
      showPopup('Erreur', 'Entre un poids valide', [{ text: 'OK', style: 'primary' }]);
      errorHaptic();
      return;
    }

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setIsSubmitting(true);

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const weightValue = parseFloat(weight.replace(',', '.'));

      const weightData = {
        date: dateStr,
        weight: weightValue,
      };

      await addMeasurement(weightData);

      // 🔄 Sync avec Apple Watch si disponible
      if (isWatchAvailable) {
        await syncWeight(weightValue);
        logger.info(`✅ Poids synchronisé avec Watch: ${weightValue} kg`);
      }

      try {
        const allWeights = await getAllMeasurements();
        const previousWeight = allWeights.length > 1
          ? allWeights[allWeights.length - 2]?.weight
          : undefined;
        await updateWidget(weightData.weight, previousWeight, date);
      } catch (widgetError) {
        logger.info('Widget update error:', widgetError);
      }

      successHaptic();
      playSuccessSound();

      await incrementReviewTrigger();
      await askForReview();
      await checkBadges();

      const recordsResult = await calculateAllRecords();
      const newRecords = recordsResult.newRecords;

      const diff = getWeightDifference();
      let message = `${weightValue} kg enregistré`;

      if (diff !== null && diff !== 0) {
        const sign = diff > 0 ? '+' : '';
        message += `\n${sign}${diff.toFixed(1)} kg depuis la dernière pesée`;
      }

      if (newRecords.length > 0) {
        const recordMessages = newRecords.map(r => `${r.emoji} ${r.message}`).join('\n');
        showPopup(
          'Nouveau record !',
          `${message}\n\n${recordMessages}`,
          [{ text: 'Super !', style: 'primary', onPress: () => router.back() }]
        );
      } else {
        showPopup(
          'Enregistre',
          message,
          [{ text: 'OK', style: 'primary', onPress: () => router.back() }]
        );
      }

      setWeight('');
      setDate(new Date());
    } catch (error) {
      logger.error('Save error:', error);
      showPopup('Erreur', 'Impossible de sauvegarder', [{ text: 'OK', style: 'primary' }]);
      errorHaptic();
    } finally {
      setIsSubmitting(false);
    }
  };

  const diff = getWeightDifference();
  const progress = getProgressToGoal();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <X size={22} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Nouvelle pesée</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Date Selector */}
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(true)}
            >
              <CalendarIcon size={18} color={COLORS.accent} />
              <Text style={styles.dateText}>
                {format(date, 'EEEE d MMMM', { locale: fr })}
              </Text>
              <ChevronDown size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                locale="fr"
              />
            )}

            {/* Weight Input Card */}
            <View style={styles.weightCard}>
              <View style={styles.weightIconContainer}>
                <Scale size={24} color={COLORS.accent} />
              </View>

              <View style={styles.weightInputContainer}>
                <NumericInput
                  value={weight}
                  onValueChange={setWeight}
                  placeholder="0.0"
                  unit="kg"
                  allowDecimal={true}
                  maxDecimals={1}
                  maxLength={6}
                  color={COLORS.text}
                  backgroundColor="transparent"
                  inputStyle={styles.weightInput}
                />
              </View>

              {lastWeight && (
                <View style={styles.lastWeightContainer}>
                  <Text style={styles.lastWeightLabel}>Dernière pesée</Text>
                  <Text style={styles.lastWeightValue}>{lastWeight.toFixed(1)} kg</Text>
                </View>
              )}
            </View>

            {/* Difference indicator */}
            {diff !== null && diff !== 0 && (
              <View style={[
                styles.diffCard,
                { backgroundColor: diff < 0 ? COLORS.successMuted : COLORS.errorMuted }
              ]}>
                <View style={styles.diffIconContainer}>
                  {diff < 0 ? (
                    <TrendingDown size={20} color={COLORS.success} />
                  ) : (
                    <TrendingUp size={20} color={COLORS.error} />
                  )}
                </View>
                <View style={styles.diffContent}>
                  <Text style={[
                    styles.diffText,
                    { color: diff < 0 ? COLORS.success : COLORS.error }
                  ]}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                  </Text>
                  <Text style={styles.diffLabel}>
                    {diff < 0 ? 'Perdu depuis dernière pesée' : 'Pris depuis dernière pesée'}
                  </Text>
                </View>
              </View>
            )}

            {diff === 0 && weight && (
              <View style={[styles.diffCard, { backgroundColor: COLORS.surfaceLight }]}>
                <View style={styles.diffIconContainer}>
                  <Minus size={20} color={COLORS.textSecondary} />
                </View>
                <View style={styles.diffContent}>
                  <Text style={[styles.diffText, { color: COLORS.textSecondary }]}>
                    Stable
                  </Text>
                  <Text style={styles.diffLabel}>
                    Poids identique à la dernière pesée
                  </Text>
                </View>
              </View>
            )}

            {/* Progress to goal */}
            {progress !== null && goalWeight && (
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <View style={styles.progressTitleRow}>
                    <Target size={16} color={COLORS.accent} />
                    <Text style={styles.progressTitle}>Objectif</Text>
                  </View>
                  <Text style={styles.progressGoal}>{goalWeight} kg</Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBg}>
                    <LinearGradient
                      colors={GRADIENTS.primary}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]}
                    />
                  </View>
                  <Text style={styles.progressPercent}>{progress.toFixed(0)}%</Text>
                </View>
              </View>
            )}

            {/* Save Button */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[styles.saveButton, (!weight || isSubmitting) && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSubmitting || !weight}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={weight ? GRADIENTS.primary : [COLORS.surfaceLight, COLORS.surface]}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Save size={20} color={weight ? '#000' : COLORS.textMuted} />
                  <Text style={[
                    styles.saveButtonText,
                    { color: weight ? COLORS.textOnPrimary : COLORS.textMuted }
                  ]}>
                    {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Tip */}
            <View style={styles.tipContainer}>
              <Zap size={14} color={COLORS.accent} />
              <Text style={styles.tip}>
                Pèse-toi le matin à jeun pour des résultats plus cohérents
              </Text>
            </View>

            <View style={{ height: 50 }} />
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
      <PopupComponent />
    </View>
  );
}

// ============================================
// STYLES - V5 VIBRANT
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  closeButton: {
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
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },

  // Date Selector
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.lg,
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  dateText: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.text,
    textTransform: 'capitalize',
  },

  // Weight Card
  weightCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.xxl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  weightIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.lg,
  },
  weightInput: {
    fontSize: 64,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
    textAlign: 'center',
    minWidth: 160,
    padding: 0,
  },
  weightUnit: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
  },
  lastWeightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    width: '100%',
    justifyContent: 'center',
  },
  lastWeightLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  lastWeightValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.text,
  },

  // Difference Card
  diffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  diffIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diffContent: {
    flex: 1,
  },
  diffText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    marginBottom: 2,
  },
  diffLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },

  // Progress Card
  progressCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textSecondary,
  },
  progressGoal: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.accent,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.accent,
    minWidth: 40,
    textAlign: 'right',
  },

  // Save Button
  saveButton: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.glow,
  },
  saveButtonDisabled: {
    ...SHADOWS.none,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg + 2,
    gap: SPACING.md,
  },
  saveButtonText: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
  },

  // Tip
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  tip: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
});
