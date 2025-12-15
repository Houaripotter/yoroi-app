import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Animated,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Scale,
  Save,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Percent,
  Droplet,
  Ruler,
  Activity,
} from 'lucide-react-native';
import { addMeasurement, getAllMeasurements } from '@/lib/storage';
import { addMeasurementRecord } from '@/lib/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import { updateWidget } from '@/lib/widgetService';
import { successHaptic, errorHaptic } from '@/lib/haptics';
import { playSuccessSound } from '@/lib/soundManager';
import { incrementReviewTrigger, askForReview } from '@/lib/reviewService';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// ECRAN DE SAISIE UNIFIE - ACCORDEONS
// ============================================
// 1. Poids (obligatoire) - ouvert par defaut
// 2. Composition corporelle (optionnel) - ferme
// 3. Mensurations (optionnel) - ferme

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Configuration des mensurations
const MEASUREMENTS_CONFIG = [
  { key: 'chest', label: 'Tour de poitrine', icon: '💪' },
  { key: 'waist', label: 'Tour de taille', icon: '📏' },
  { key: 'hips', label: 'Tour de hanches', icon: '📐' },
  { key: 'shoulders', label: 'Tour d\'epaules', icon: '💪' },
  { key: 'neck', label: 'Tour de cou', icon: '👔' },
];

const PAIRED_MEASUREMENTS = [
  { left: 'left_arm', right: 'right_arm', label: 'Bras' },
  { left: 'left_thigh', right: 'right_thigh', label: 'Cuisses' },
  { left: 'left_calf', right: 'right_calf', label: 'Mollets' },
];

export default function EntryScreen() {
  const { colors, gradients } = useTheme();
  const router = useRouter();

  // Date
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sections accordeon
  const [weightOpen, setWeightOpen] = useState(true);
  const [compositionOpen, setCompositionOpen] = useState(false);
  const [measurementsOpen, setMeasurementsOpen] = useState(false);

  // Donnees poids
  const [weight, setWeight] = useState('');

  // Donnees composition
  const [bodyFat, setBodyFat] = useState('');
  const [muscle, setMuscle] = useState('');
  const [water, setWater] = useState('');

  // Donnees mensurations
  const [measurements, setMeasurements] = useState<Record<string, string>>({});

  // Animations
  const weightAnim = useRef(new Animated.Value(1)).current;
  const compositionAnim = useRef(new Animated.Value(0)).current;
  const measurementsAnim = useRef(new Animated.Value(0)).current;

  const toggleSection = (section: 'weight' | 'composition' | 'measurements') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (section === 'weight') {
      setWeightOpen(!weightOpen);
    } else if (section === 'composition') {
      setCompositionOpen(!compositionOpen);
    } else {
      setMeasurementsOpen(!measurementsOpen);
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

  const handleMeasurementChange = (key: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [key]: formatInputValue(value) }));
  };

  // Verification si une section a des donnees
  const hasCompositionData = bodyFat || muscle || water;
  const hasMeasurementsData = Object.values(measurements).some(v => v && parseFloat(v) > 0);

  const handleSave = async () => {
    // Validation poids obligatoire
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un poids valide');
      errorHaptic();
      return;
    }

    setIsSubmitting(true);

    try {
      const dateStr = format(date, 'yyyy-MM-dd');

      // 1. Sauvegarder poids + composition (AsyncStorage)
      const weightData = {
        date: dateStr,
        weight: parseFloat(weight.replace(',', '.')),
        bodyFat: bodyFat ? parseFloat(bodyFat.replace(',', '.')) : undefined,
        muscle: muscle ? parseFloat(muscle.replace(',', '.')) : undefined,
        water: water ? parseFloat(water.replace(',', '.')) : undefined,
      };

      await addMeasurement(weightData);

      // 2. Mettre a jour le widget iOS
      try {
        const allWeights = await getAllMeasurements();
        const previousWeight = allWeights.length > 1 ? allWeights[allWeights.length - 2]?.weight : undefined;
        await updateWidget(weightData.weight, previousWeight, date);
      } catch (widgetError) {
        console.log('Widget update error:', widgetError);
      }

      // 3. Sauvegarder mensurations si renseignees (SQLite)
      if (hasMeasurementsData) {
        await addMeasurementRecord({
          date: dateStr,
          chest: measurements.chest ? parseFloat(measurements.chest.replace(',', '.')) : undefined,
          waist: measurements.waist ? parseFloat(measurements.waist.replace(',', '.')) : undefined,
          hips: measurements.hips ? parseFloat(measurements.hips.replace(',', '.')) : undefined,
          shoulders: measurements.shoulders ? parseFloat(measurements.shoulders.replace(',', '.')) : undefined,
          neck: measurements.neck ? parseFloat(measurements.neck.replace(',', '.')) : undefined,
          left_arm: measurements.left_arm ? parseFloat(measurements.left_arm.replace(',', '.')) : undefined,
          right_arm: measurements.right_arm ? parseFloat(measurements.right_arm.replace(',', '.')) : undefined,
          left_thigh: measurements.left_thigh ? parseFloat(measurements.left_thigh.replace(',', '.')) : undefined,
          right_thigh: measurements.right_thigh ? parseFloat(measurements.right_thigh.replace(',', '.')) : undefined,
          left_calf: measurements.left_calf ? parseFloat(measurements.left_calf.replace(',', '.')) : undefined,
          right_calf: measurements.right_calf ? parseFloat(measurements.right_calf.replace(',', '.')) : undefined,
        });
      }

      successHaptic();
      playSuccessSound();

      // Trigger review
      await incrementReviewTrigger();
      await askForReview();

      // Message de confirmation
      let message = `Poids: ${weightData.weight} kg`;
      if (hasCompositionData) message += '\n+ Composition corporelle';
      if (hasMeasurementsData) message += '\n+ Mensurations';

      Alert.alert(
        'Donnees enregistrees',
        message,
        [{ text: 'OK', onPress: () => router.back() }]
      );

      // Reset
      setWeight('');
      setBodyFat('');
      setMuscle('');
      setWater('');
      setMeasurements({});
      setDate(new Date());
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les donnees');
      errorHaptic();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Composant Section Accordeon
  const AccordionSection = ({
    title,
    icon: Icon,
    iconColor,
    isOpen,
    onToggle,
    hasData,
    required,
    children,
  }: {
    title: string;
    icon: any;
    iconColor: string;
    isOpen: boolean;
    onToggle: () => void;
    hasData?: boolean;
    required?: boolean;
    children: React.ReactNode;
  }) => (
    <View style={[
      styles.accordionContainer,
      {
        backgroundColor: colors.card,
        borderColor: hasData ? colors.gold : colors.border,
      }
    ]}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.accordionIconContainer, { backgroundColor: colors.goldMuted }]}>
          <Icon size={22} color={iconColor} strokeWidth={2} />
        </View>
        <View style={styles.accordionTitleContainer}>
          <Text style={[styles.accordionTitle, { color: colors.textPrimary }]}>{title}</Text>
          {required && (
            <Text style={[styles.accordionRequired, { color: colors.gold }]}>Obligatoire</Text>
          )}
          {hasData && !required && (
            <View style={[styles.accordionBadge, { backgroundColor: colors.successMuted }]}>
              <Text style={[styles.accordionBadgeText, { color: colors.success }]}>Rempli</Text>
            </View>
          )}
        </View>
        {isOpen ? (
          <ChevronUp size={22} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={22} color={colors.textSecondary} />
        )}
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.accordionContent}>
          {children}
        </View>
      )}
    </View>
  );

  return (
    <ScreenWrapper noPadding>
      <Header title="Nouvelle mesure" showClose />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enregistre toutes tes donnees du jour
            </Text>
          </View>

          {/* DATE */}
          <TouchableOpacity
            style={[styles.dateSelector, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <CalendarIcon size={20} color={colors.gold} />
            <Text style={[styles.dateText, { color: colors.textPrimary }]}>
              {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
            </Text>
            <ChevronDown size={20} color={colors.textSecondary} />
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

          {/* SECTION 1: POIDS (OBLIGATOIRE) */}
          <AccordionSection
            title="Poids"
            icon={Scale}
            iconColor={colors.gold}
            isOpen={weightOpen}
            onToggle={() => toggleSection('weight')}
            required
          >
            <View style={styles.weightInputContainer}>
              <TextInput
                style={[styles.weightInput, { color: colors.textPrimary }]}
                value={weight}
                onChangeText={(text) => setWeight(formatInputValue(text))}
                placeholder="0.0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                maxLength={6}
              />
              <Text style={[styles.weightUnit, { color: colors.textSecondary }]}>kg</Text>
            </View>
          </AccordionSection>

          {/* SECTION 2: COMPOSITION CORPORELLE */}
          <AccordionSection
            title="Composition corporelle"
            icon={Activity}
            iconColor={colors.info}
            isOpen={compositionOpen}
            onToggle={() => toggleSection('composition')}
            hasData={!!hasCompositionData}
          >
            <View style={styles.compositionGrid}>
              {/* GRAISSE */}
              <View style={[styles.compositionCard, { backgroundColor: colors.cardHover }]}>
                <View style={styles.compositionHeader}>
                  <Percent size={16} color={colors.warning} />
                  <Text style={[styles.compositionLabel, { color: colors.textPrimary }]}>Graisse</Text>
                </View>
                <View style={styles.compositionInputRow}>
                  <TextInput
                    style={[styles.compositionInput, { color: colors.textPrimary }]}
                    value={bodyFat}
                    onChangeText={(text) => setBodyFat(formatInputValue(text))}
                    placeholder="--"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                  <Text style={[styles.compositionUnit, { color: colors.textSecondary }]}>%</Text>
                </View>
              </View>

              {/* MUSCLE */}
              <View style={[styles.compositionCard, { backgroundColor: colors.cardHover }]}>
                <View style={styles.compositionHeader}>
                  <Activity size={16} color={colors.success} />
                  <Text style={[styles.compositionLabel, { color: colors.textPrimary }]}>Muscle</Text>
                </View>
                <View style={styles.compositionInputRow}>
                  <TextInput
                    style={[styles.compositionInput, { color: colors.textPrimary }]}
                    value={muscle}
                    onChangeText={(text) => setMuscle(formatInputValue(text))}
                    placeholder="--"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                  <Text style={[styles.compositionUnit, { color: colors.textSecondary }]}>%</Text>
                </View>
              </View>

              {/* EAU */}
              <View style={[styles.compositionCard, { backgroundColor: colors.cardHover }]}>
                <View style={styles.compositionHeader}>
                  <Droplet size={16} color={colors.info} />
                  <Text style={[styles.compositionLabel, { color: colors.textPrimary }]}>Eau</Text>
                </View>
                <View style={styles.compositionInputRow}>
                  <TextInput
                    style={[styles.compositionInput, { color: colors.textPrimary }]}
                    value={water}
                    onChangeText={(text) => setWater(formatInputValue(text))}
                    placeholder="--"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                  <Text style={[styles.compositionUnit, { color: colors.textSecondary }]}>%</Text>
                </View>
              </View>
            </View>
          </AccordionSection>

          {/* SECTION 3: MENSURATIONS */}
          <AccordionSection
            title="Mensurations"
            icon={Ruler}
            iconColor={colors.purple}
            isOpen={measurementsOpen}
            onToggle={() => toggleSection('measurements')}
            hasData={hasMeasurementsData}
          >
            {/* Mesures principales */}
            <Text style={[styles.measurementsSectionTitle, { color: colors.textSecondary }]}>
              Mesures principales
            </Text>
            {MEASUREMENTS_CONFIG.map((item) => (
              <View key={item.key} style={[styles.measurementRow, { borderBottomColor: colors.border }]}>
                <View style={styles.measurementInfo}>
                  <Text style={styles.measurementIcon}>{item.icon}</Text>
                  <Text style={[styles.measurementLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                </View>
                <View style={styles.measurementInputContainer}>
                  <TextInput
                    style={[styles.measurementInput, { backgroundColor: colors.cardHover, color: colors.textPrimary }]}
                    value={measurements[item.key] || ''}
                    onChangeText={(v) => handleMeasurementChange(item.key, v)}
                    placeholder="--"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                  <Text style={[styles.measurementUnit, { color: colors.textMuted }]}>cm</Text>
                </View>
              </View>
            ))}

            {/* Mesures pairees */}
            {PAIRED_MEASUREMENTS.map((pair) => (
              <View key={pair.left}>
                <Text style={[styles.measurementsSectionTitle, { color: colors.textSecondary, marginTop: 16 }]}>
                  {pair.label}
                </Text>
                <View style={styles.pairedRow}>
                  <View style={styles.pairedItem}>
                    <Text style={[styles.pairedLabel, { color: colors.textSecondary }]}>Gauche</Text>
                    <View style={styles.measurementInputContainer}>
                      <TextInput
                        style={[styles.measurementInput, { backgroundColor: colors.cardHover, color: colors.textPrimary }]}
                        value={measurements[pair.left] || ''}
                        onChangeText={(v) => handleMeasurementChange(pair.left, v)}
                        placeholder="--"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        maxLength={5}
                      />
                      <Text style={[styles.measurementUnit, { color: colors.textMuted }]}>cm</Text>
                    </View>
                  </View>
                  <View style={styles.pairedItem}>
                    <Text style={[styles.pairedLabel, { color: colors.textSecondary }]}>Droit</Text>
                    <View style={styles.measurementInputContainer}>
                      <TextInput
                        style={[styles.measurementInput, { backgroundColor: colors.cardHover, color: colors.textPrimary }]}
                        value={measurements[pair.right] || ''}
                        onChangeText={(v) => handleMeasurementChange(pair.right, v)}
                        placeholder="--"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="decimal-pad"
                        maxLength={5}
                      />
                      <Text style={[styles.measurementUnit, { color: colors.textMuted }]}>cm</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </AccordionSection>

          {/* BOUTON SAVE */}
          <TouchableOpacity
            style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={gradients.gold}
              style={styles.saveButtonGradient}
            >
              <Save size={22} color={colors.background} />
              <Text style={[styles.saveButtonText, { color: colors.background }]}>
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Indicateur de ce qui sera sauvegarde */}
          <View style={styles.saveIndicator}>
            <Text style={[styles.saveIndicatorText, { color: colors.textMuted }]}>
              Sera enregistre: Poids
              {hasCompositionData ? ' + Composition' : ''}
              {hasMeasurementsData ? ' + Mensurations' : ''}
            </Text>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

// Constantes
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // HEADER
  header: {
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 15,
  },

  // DATE
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // ACCORDION
  accordionContainer: {
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  accordionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionTitleContainer: {
    flex: 1,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  accordionRequired: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  accordionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  accordionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // WEIGHT INPUT
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightInput: {
    fontSize: 56,
    fontWeight: '800',
    textAlign: 'center',
    minWidth: 150,
  },
  weightUnit: {
    fontSize: 28,
    fontWeight: '600',
    marginLeft: 8,
  },

  // COMPOSITION
  compositionGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  compositionCard: {
    flex: 1,
    borderRadius: RADIUS.md,
    padding: 12,
  },
  compositionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  compositionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  compositionInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compositionInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    padding: 0,
  },
  compositionUnit: {
    fontSize: 16,
    fontWeight: '600',
  },

  // MEASUREMENTS
  measurementsSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  measurementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  measurementIcon: {
    fontSize: 18,
  },
  measurementLabel: {
    fontSize: 14,
  },
  measurementInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  measurementInput: {
    width: 65,
    borderRadius: RADIUS.sm,
    padding: 8,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  measurementUnit: {
    fontSize: 13,
    width: 24,
  },

  // PAIRED
  pairedRow: {
    flexDirection: 'row',
    gap: 16,
  },
  pairedItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  pairedLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // SAVE BUTTON
  saveButton: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginTop: 20,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },

  // SAVE INDICATOR
  saveIndicator: {
    alignItems: 'center',
    marginTop: 12,
  },
  saveIndicatorText: {
    fontSize: 12,
  },
});
