import React, { useState } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Scale, Save, Calendar as CalendarIcon, ChevronDown, Percent, Droplet } from 'lucide-react-native';
import { addMeasurement } from '@/lib/storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { successHaptic, errorHaptic } from '@/lib/haptics';
import { playSuccessSound } from '@/lib/soundManager';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// ⚔️ ECRAN DE SAISIE - THEME GUERRIER
// ============================================
// Design sombre avec accents or
// Champs: Poids (obligatoire), Graisse %, Eau %

export default function EntryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [water, setWater] = useState('');

  const handleSave = async () => {
    if (!weight || parseFloat(weight) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un poids valide');
      errorHaptic();
      return;
    }

    setIsSubmitting(true);

    try {
      const measurement = {
        date: format(date, 'yyyy-MM-dd'),
        weight: parseFloat(weight.replace(',', '.')),
        bodyFat: bodyFat ? parseFloat(bodyFat.replace(',', '.')) : undefined,
        water: water ? parseFloat(water.replace(',', '.')) : undefined,
      };

      await addMeasurement(measurement);

      successHaptic();
      playSuccessSound();

      Alert.alert(
        'Mesure enregistrée',
        `Poids: ${measurement.weight} kg`,
        [{ text: 'OK', onPress: () => router.back() }]
      );

      setWeight('');
      setBodyFat('');
      setWater('');
      setDate(new Date());
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la mesure');
      errorHaptic();
    } finally {
      setIsSubmitting(false);
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
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enregistre tes donnees du jour</Text>
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

          {/* POIDS (OBLIGATOIRE) */}
          <View style={[styles.mainInputCard, { backgroundColor: colors.card, borderColor: colors.borderGold }]}>
            <View style={styles.inputHeader}>
              <View style={[styles.iconContainer, { backgroundColor: colors.goldMuted }]}>
                <Scale size={24} color={colors.gold} strokeWidth={2} />
              </View>
              <View>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Poids</Text>
                <Text style={[styles.inputRequired, { color: colors.gold }]}>Obligatoire</Text>
              </View>
            </View>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.mainInput, { color: colors.textPrimary }]}
                value={weight}
                onChangeText={(text) => setWeight(formatInputValue(text))}
                placeholder="0.0"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                maxLength={6}
              />
              <Text style={[styles.inputUnit, { color: colors.textSecondary }]}>kg</Text>
            </View>
          </View>

          {/* CHAMPS OPTIONNELS */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Optionnel</Text>

          <View style={styles.optionalRow}>
            {/* MASSE GRASSE */}
            <View style={[styles.optionalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.optionalHeader}>
                <Percent size={18} color={colors.accentOrange} />
                <Text style={[styles.optionalLabel, { color: colors.textPrimary }]}>Graisse</Text>
              </View>
              <View style={styles.optionalInputRow}>
                <TextInput
                  style={[styles.optionalInput, { color: colors.textPrimary }]}
                  value={bodyFat}
                  onChangeText={(text) => setBodyFat(formatInputValue(text))}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                <Text style={[styles.optionalUnit, { color: colors.textSecondary }]}>%</Text>
              </View>
            </View>

            {/* EAU */}
            <View style={[styles.optionalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.optionalHeader}>
                <Droplet size={18} color={colors.accentCyan} />
                <Text style={[styles.optionalLabel, { color: colors.textPrimary }]}>Eau</Text>
              </View>
              <View style={styles.optionalInputRow}>
                <TextInput
                  style={[styles.optionalInput, { color: colors.textPrimary }]}
                  value={water}
                  onChangeText={(text) => setWater(formatInputValue(text))}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  maxLength={5}
                />
                <Text style={[styles.optionalUnit, { color: colors.textSecondary }]}>%</Text>
              </View>
            </View>
          </View>

          {/* BOUTON SAVE */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.gold, shadowColor: colors.gold }, isSubmitting && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Save size={22} color={colors.background} />
            <Text style={[styles.saveButtonText, { color: colors.background }]}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

// Constantes non-thématiques
const RADIUS = { lg: 16, xl: 20 };

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // HEADER
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
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

  // INPUT PRINCIPAL
  mainInputCard: {
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputRequired: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainInput: {
    flex: 1,
    fontSize: 48,
    fontWeight: '800',
    padding: 0,
  },
  inputUnit: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 8,
  },

  // SECTION OPTIONNELLE
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionalRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  optionalCard: {
    flex: 1,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
  },
  optionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  optionalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionalInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    padding: 0,
  },
  optionalUnit: {
    fontSize: 18,
    fontWeight: '600',
  },

  // BOUTON SAVE
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.lg,
    paddingVertical: 18,
    gap: 10,
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
