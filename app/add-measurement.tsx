import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  X,
  Calendar as CalendarIcon,
  ChevronDown,
  Ruler,
  Save,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { addMeasurementRecord } from '@/lib/database';

// Constants for non-theme values
const RADIUS = { sm: 8, md: 12 };
const SPACING = { sm: 8, md: 12, lg: 16, xl: 20 };
const FONT_SIZE = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 };
import { successHaptic, errorHaptic } from '@/lib/haptics';
import { playSuccessSound } from '@/lib/soundManager';
import { incrementReviewTrigger, askForReview } from '@/lib/reviewService';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================
// NOUVELLES MENSURATIONS
// ============================================

interface MeasurementField {
  key: string;
  label: string;
  unit: string;
  icon: string;
  pair?: string; // Pour les mesures gauche/droite
}

const MEASUREMENTS: MeasurementField[] = [
  { key: 'chest', label: 'Tour de poitrine', unit: 'cm', icon: '💪' },
  { key: 'waist', label: 'Tour de taille', unit: 'cm', icon: '📏' },
  { key: 'hips', label: 'Tour de hanches', unit: 'cm', icon: '📐' },
  { key: 'shoulders', label: 'Tour d\'epaules', unit: 'cm', icon: '💪' },
  { key: 'neck', label: 'Tour de cou', unit: 'cm', icon: '👔' },
  { key: 'left_arm', label: 'Bras gauche', unit: 'cm', icon: '💪', pair: 'right_arm' },
  { key: 'right_arm', label: 'Bras droit', unit: 'cm', icon: '💪', pair: 'left_arm' },
  { key: 'left_thigh', label: 'Cuisse gauche', unit: 'cm', icon: '🦵', pair: 'right_thigh' },
  { key: 'right_thigh', label: 'Cuisse droite', unit: 'cm', icon: '🦵', pair: 'left_thigh' },
  { key: 'left_calf', label: 'Mollet gauche', unit: 'cm', icon: '🦶', pair: 'right_calf' },
  { key: 'right_calf', label: 'Mollet droit', unit: 'cm', icon: '🦶', pair: 'left_calf' },
];

export default function AddMeasurementScreen() {
  const { colors, gradients } = useTheme();
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic measurements state
  const [values, setValues] = useState<Record<string, string>>({});

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value.replace(/[^0-9.,]/g, '') }));
  };

  const handleSave = async () => {
    // Verifier qu'au moins une mesure est renseignee
    const hasValue = Object.values(values).some(v => v && parseFloat(v) > 0);
    if (!hasValue) {
      Alert.alert('Erreur', 'Veuillez renseigner au moins une mesure');
      errorHaptic();
      return;
    }

    setIsSubmitting(true);

    try {
      await addMeasurementRecord({
        date: format(date, 'yyyy-MM-dd'),
        chest: values.chest ? parseFloat(values.chest.replace(',', '.')) : undefined,
        waist: values.waist ? parseFloat(values.waist.replace(',', '.')) : undefined,
        hips: values.hips ? parseFloat(values.hips.replace(',', '.')) : undefined,
        shoulders: values.shoulders ? parseFloat(values.shoulders.replace(',', '.')) : undefined,
        neck: values.neck ? parseFloat(values.neck.replace(',', '.')) : undefined,
        left_arm: values.left_arm ? parseFloat(values.left_arm.replace(',', '.')) : undefined,
        right_arm: values.right_arm ? parseFloat(values.right_arm.replace(',', '.')) : undefined,
        left_thigh: values.left_thigh ? parseFloat(values.left_thigh.replace(',', '.')) : undefined,
        right_thigh: values.right_thigh ? parseFloat(values.right_thigh.replace(',', '.')) : undefined,
        left_calf: values.left_calf ? parseFloat(values.left_calf.replace(',', '.')) : undefined,
        right_calf: values.right_calf ? parseFloat(values.right_calf.replace(',', '.')) : undefined,
      });

      successHaptic();
      playSuccessSound();

      // Trigger review après une action positive
      await incrementReviewTrigger();
      await askForReview();

      Alert.alert(
        'Mensurations enregistrees',
        'Tes mensurations ont ete sauvegardees',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      errorHaptic();
      Alert.alert('Erreur', 'Impossible de sauvegarder les mensurations');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Grouper les mesures par type (solo vs paired)
  const soloMeasurements = MEASUREMENTS.filter(m => !m.pair || !m.key.startsWith('left_'));
  const pairedMeasurements = MEASUREMENTS.filter(m => m.key.startsWith('left_'));

  return (
    <ScreenWrapper noPadding>
      <Header title="Mensurations" showClose />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* DATE */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Date</Text>
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

        {/* MESURES PRINCIPALES */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Mesures principales</Text>
        <Card style={styles.measurementsCard}>
          {['chest', 'waist', 'hips', 'shoulders', 'neck'].map((key) => {
            const field = MEASUREMENTS.find(m => m.key === key)!;
            return (
              <View key={key} style={[styles.measurementRow, { borderBottomColor: colors.border }]}>
                <View style={styles.measurementInfo}>
                  <Text style={styles.measurementIcon}>{field.icon}</Text>
                  <Text style={[styles.measurementLabel, { color: colors.textPrimary }]}>{field.label}</Text>
                </View>
                <View style={styles.measurementInput}>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary }]}
                    value={values[key] || ''}
                    onChangeText={(v) => handleValueChange(key, v)}
                    placeholder="--"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                  <Text style={[styles.inputUnit, { color: colors.textMuted }]}>{field.unit}</Text>
                </View>
              </View>
            );
          })}
        </Card>

        {/* BRAS */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Bras</Text>
        <Card style={styles.measurementsCard}>
          <View style={styles.pairedRow}>
            <View style={styles.pairedItem}>
              <Text style={[styles.pairedLabel, { color: colors.textSecondary }]}>Gauche</Text>
              <View style={styles.measurementInput}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary }]}
                  value={values['left_arm'] || ''}
                  onChangeText={(v) => handleValueChange('left_arm', v)}
                  placeholder="--"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>cm</Text>
              </View>
            </View>
            <View style={styles.pairedItem}>
              <Text style={[styles.pairedLabel, { color: colors.textSecondary }]}>Droit</Text>
              <View style={styles.measurementInput}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary }]}
                  value={values['right_arm'] || ''}
                  onChangeText={(v) => handleValueChange('right_arm', v)}
                  placeholder="--"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>cm</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* CUISSES */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Cuisses</Text>
        <Card style={styles.measurementsCard}>
          <View style={styles.pairedRow}>
            <View style={styles.pairedItem}>
              <Text style={[styles.pairedLabel, { color: colors.textSecondary }]}>Gauche</Text>
              <View style={styles.measurementInput}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary }]}
                  value={values['left_thigh'] || ''}
                  onChangeText={(v) => handleValueChange('left_thigh', v)}
                  placeholder="--"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>cm</Text>
              </View>
            </View>
            <View style={styles.pairedItem}>
              <Text style={[styles.pairedLabel, { color: colors.textSecondary }]}>Droite</Text>
              <View style={styles.measurementInput}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary }]}
                  value={values['right_thigh'] || ''}
                  onChangeText={(v) => handleValueChange('right_thigh', v)}
                  placeholder="--"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>cm</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* MOLLETS */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Mollets</Text>
        <Card style={styles.measurementsCard}>
          <View style={styles.pairedRow}>
            <View style={styles.pairedItem}>
              <Text style={[styles.pairedLabel, { color: colors.textSecondary }]}>Gauche</Text>
              <View style={styles.measurementInput}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary }]}
                  value={values['left_calf'] || ''}
                  onChangeText={(v) => handleValueChange('left_calf', v)}
                  placeholder="--"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>cm</Text>
              </View>
            </View>
            <View style={styles.pairedItem}>
              <Text style={[styles.pairedLabel, { color: colors.textSecondary }]}>Droit</Text>
              <View style={styles.measurementInput}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.cardHover, color: colors.textPrimary }]}
                  value={values['right_calf'] || ''}
                  onChangeText={(v) => handleValueChange('right_calf', v)}
                  placeholder="--"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                <Text style={[styles.inputUnit, { color: colors.textMuted }]}>cm</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* BOUTON SAVE */}
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={gradients.gold}
            style={styles.saveButtonGradient}
          >
            <Ruler size={22} color={colors.background} />
            <Text style={[styles.saveButtonText, { color: colors.background }]}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },

  // SECTION
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },

  // DATE
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
  },
  dateText: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // MEASUREMENTS CARD
  measurementsCard: {
    marginBottom: SPACING.lg,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  measurementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  measurementIcon: {
    fontSize: 20,
  },
  measurementLabel: {
    fontSize: FONT_SIZE.sm,
  },
  measurementInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  input: {
    width: 70,
    borderRadius: RADIUS.sm,
    padding: 10,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: FONT_SIZE.sm,
    width: 24,
  },

  // PAIRED
  pairedRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  pairedItem: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.md,
  },
  pairedLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },

  // SAVE
  saveButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
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
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
});
