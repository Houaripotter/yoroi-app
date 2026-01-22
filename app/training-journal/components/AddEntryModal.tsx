/**
 * AddEntryModal Component
 *
 * Modal for adding a new entry to a benchmark
 * Supports multiple exercise types: Force, Running, Hyrox, Cardio, Musculation
 *
 * Extracted from training-journal.tsx (603 lines)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { X, Calendar, Clock, Edit3 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  Benchmark,
  WeightUnit,
  calculateCalories,
  METS_VALUES,
  getRPELabel,
  getRPEColor,
} from '@/lib/carnetService';

type HyroxEffortType = 'course' | 'station_force' | 'repetitions';

interface AddEntryModalProps {
  // Modal visibility
  visible: boolean;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;

  // Selected benchmark
  selectedBenchmark: Benchmark | null;

  // Theme & i18n
  colors: any;
  locale: string;

  // User data
  userWeight: number;

  // Date state
  entryDate: 'today' | 'yesterday' | 'custom';
  setEntryDate: (date: 'today' | 'yesterday' | 'custom') => void;
  customDate: Date;
  setCustomDate: (date: Date) => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;

  // Basic entry state
  newEntryValue: string;
  setNewEntryValue: (value: string) => void;
  newEntryReps: string;
  setNewEntryReps: (reps: string) => void;
  newEntryUnit: WeightUnit;
  setNewEntryUnit: (unit: WeightUnit) => void;
  newEntryRPE: number;
  setNewEntryRPE: (rpe: number) => void;

  // Duration & calories
  newEntryDuration: string;
  setNewEntryDuration: (duration: string) => void;
  newEntryCalories: string;
  setNewEntryCalories: (calories: string) => void;

  // Running metrics
  newEntryDistance: string;
  setNewEntryDistance: (distance: string) => void;
  runningTimeHours: string;
  setRunningTimeHours: (hours: string) => void;
  runningTimeMinutes: string;
  setRunningTimeMinutes: (minutes: string) => void;
  runningTimeSeconds: string;
  setRunningTimeSeconds: (seconds: string) => void;

  // Hyrox metrics
  hyroxEffortType: HyroxEffortType;
  setHyroxEffortType: (type: HyroxEffortType) => void;
  hyroxDistanceMeters: string;
  setHyroxDistanceMeters: (distance: string) => void;

  // Advanced metrics
  newEntryIncline: string;
  setNewEntryIncline: (incline: string) => void;
  newEntrySpeed: string;
  setNewEntrySpeed: (speed: string) => void;
  newEntryPace: string;
  setNewEntryPace: (pace: string) => void;
  newEntryWatts: string;
  setNewEntryWatts: (watts: string) => void;
  newEntryResistance: string;
  setNewEntryResistance: (resistance: string) => void;
  newEntryLevel: string;
  setNewEntryLevel: (level: string) => void;
}

export default function AddEntryModal(props: AddEntryModalProps) {
  const {
    visible,
    onClose,
    onSubmit,
    isSubmitting,
    selectedBenchmark,
    colors,
    locale,
    userWeight,
    entryDate,
    setEntryDate,
    customDate,
    setCustomDate,
    showDatePicker,
    setShowDatePicker,
    newEntryValue,
    setNewEntryValue,
    newEntryReps,
    setNewEntryReps,
    newEntryRPE,
    setNewEntryRPE,
    newEntryDuration,
    setNewEntryDuration,
    newEntryCalories,
    setNewEntryCalories,
    newEntryDistance,
    setNewEntryDistance,
    runningTimeHours,
    setRunningTimeHours,
    runningTimeMinutes,
    setRunningTimeMinutes,
    runningTimeSeconds,
    setRunningTimeSeconds,
    hyroxEffortType,
    setHyroxEffortType,
    newEntryIncline,
    setNewEntryIncline,
    newEntrySpeed,
    setNewEntrySpeed,
    newEntryPace,
    setNewEntryPace,
    newEntryWatts,
    setNewEntryWatts,
    newEntryLevel,
    setNewEntryLevel,
  } = props;

  // Detect exercise type
  const isForceExercise = selectedBenchmark?.category === 'force' &&
    (selectedBenchmark?.unit === 'kg' || selectedBenchmark?.unit === 'lbs');
  const isRunningExercise = ['running', 'trail'].includes(selectedBenchmark?.category || '');
  const isHyroxExercise = selectedBenchmark?.category === 'hyrox';
  const isCardioExercise = selectedBenchmark?.category === 'cardio';
  const isMusculationExercise = selectedBenchmark?.category === 'musculation';

  // Calculate total time in seconds from H/M/S fields
  const getTotalTimeSeconds = () => {
    const h = parseInt(runningTimeHours) || 0;
    const m = parseInt(runningTimeMinutes) || 0;
    const s = parseInt(runningTimeSeconds) || 0;
    return h * 3600 + m * 60 + s;
  };

  // Auto-calculate pace for Running
  const getEstimatedPace = () => {
    const distanceKm = parseFloat(newEntryDistance);
    const totalSeconds = getTotalTimeSeconds();
    if (distanceKm > 0 && totalSeconds > 0) {
      const paceSecondsPerKm = totalSeconds / distanceKm;
      const paceMin = Math.floor(paceSecondsPerKm / 60);
      const paceSec = Math.floor(paceSecondsPerKm % 60);
      return `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`;
    }
    return null;
  };

  // Auto-calculate calories when time changes
  const updateCaloriesFromTime = () => {
    const totalSeconds = getTotalTimeSeconds();
    if (totalSeconds > 0 && selectedBenchmark) {
      const durationMin = Math.round(totalSeconds / 60);
      setNewEntryDuration(durationMin.toString());
      const estimatedCal = calculateCalories(durationMin, userWeight, selectedBenchmark.category);
      setNewEntryCalories(estimatedCal.toString());
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <ScrollView style={{ maxHeight: '90%' }} showsVerticalScrollIndicator={false}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {selectedBenchmark?.name}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Date Picker */}
            <Text style={[styles.inputLabel, { color: colors.textPrimary, fontWeight: '700' }]}>Date de la séance</Text>
            <View style={styles.datePickerRow}>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  { backgroundColor: entryDate === 'today' ? colors.accent : colors.backgroundElevated, borderColor: entryDate === 'today' ? colors.accent : colors.border }
                ]}
                onPress={() => setEntryDate('today')}
              >
                <Calendar size={16} color={entryDate === 'today' ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.dateOptionText, { color: entryDate === 'today' ? '#FFFFFF' : colors.textPrimary, fontWeight: '600' }]}>
                  Aujourd'hui
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  { backgroundColor: entryDate === 'yesterday' ? colors.accent : colors.backgroundElevated, borderColor: entryDate === 'yesterday' ? colors.accent : colors.border }
                ]}
                onPress={() => setEntryDate('yesterday')}
              >
                <Clock size={16} color={entryDate === 'yesterday' ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.dateOptionText, { color: entryDate === 'yesterday' ? '#FFFFFF' : colors.textPrimary, fontWeight: '600' }]}>
                  Hier
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  { backgroundColor: entryDate === 'custom' ? colors.accent : colors.backgroundElevated, borderColor: entryDate === 'custom' ? colors.accent : colors.border }
                ]}
                onPress={() => {
                  setEntryDate('custom');
                  setShowDatePicker(true);
                }}
              >
                <Edit3 size={16} color={entryDate === 'custom' ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.dateOptionText, { color: entryDate === 'custom' ? '#FFFFFF' : colors.textPrimary, fontWeight: '600' }]}>
                  {entryDate === 'custom'
                    ? customDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                    : 'Autre'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Native Date Picker (iOS inline) */}
            {showDatePicker && (
              <View style={[styles.datePickerContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <DateTimePicker
                  value={customDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  maximumDate={new Date()}
                  locale="fr-FR"
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    if (selectedDate) {
                      setCustomDate(selectedDate);
                      setEntryDate('custom');
                    }
                  }}
                  style={{ height: 150 }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.datePickerDoneBtn, { backgroundColor: colors.accent }]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerDoneText}>Valider</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ============================================ */}
            {/* HYROX Effort Type Toggle */}
            {/* ============================================ */}
            {isHyroxExercise && (
              <>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Type d'effort</Text>
                <View style={styles.hyroxTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.hyroxTypeButton,
                      {
                        backgroundColor: hyroxEffortType === 'course' ? colors.accent : colors.backgroundElevated,
                        borderColor: hyroxEffortType === 'course' ? colors.accent : colors.border,
                      }
                    ]}
                    onPress={() => setHyroxEffortType('course')}
                  >
                    <Text style={[styles.hyroxTypeText, { color: hyroxEffortType === 'course' ? '#FFF' : colors.textPrimary }]}>
                      Course
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.hyroxTypeButton,
                      {
                        backgroundColor: hyroxEffortType === 'station_force' ? colors.accent : colors.backgroundElevated,
                        borderColor: hyroxEffortType === 'station_force' ? colors.accent : colors.border,
                      }
                    ]}
                    onPress={() => setHyroxEffortType('station_force')}
                  >
                    <Text style={[styles.hyroxTypeText, { color: hyroxEffortType === 'station_force' ? '#FFF' : colors.textPrimary }]}>
                      Station Force
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.hyroxTypeButton,
                      {
                        backgroundColor: hyroxEffortType === 'repetitions' ? colors.accent : colors.backgroundElevated,
                        borderColor: hyroxEffortType === 'repetitions' ? colors.accent : colors.border,
                      }
                    ]}
                    onPress={() => setHyroxEffortType('repetitions')}
                  >
                    <Text style={[styles.hyroxTypeText, { color: hyroxEffortType === 'repetitions' ? '#FFF' : colors.textPrimary }]}>
                      Répétitions
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ============================================ */}
            {/* FORCE Exercise Form (kg/lbs with reps) */}
            {/* ============================================ */}
            {isForceExercise && (
              <>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids soulevé</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                    placeholder="100"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryValue}
                    onChangeText={setNewEntryValue}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.unitText, { color: colors.textSecondary }]}>{selectedBenchmark?.unit}</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Répétitions</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                    placeholder="10"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryReps}
                    onChangeText={setNewEntryReps}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.unitText, { color: colors.textSecondary }]}>reps</Text>
                </View>
              </>
            )}

            {/* ============================================ */}
            {/* RUNNING/TRAIL Exercise Form */}
            {/* ============================================ */}
            {isRunningExercise && (
              <>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Distance parcourue</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                    placeholder="10.5"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryDistance}
                    onChangeText={setNewEntryDistance}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.unitText, { color: colors.textSecondary }]}>km</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Durée (H:M:S)</Text>
                <View style={styles.timeInputRow}>
                  <View style={[styles.timeInput, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.timeValue, { color: colors.textPrimary }]}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      value={runningTimeHours}
                      onChangeText={(text) => {
                        setRunningTimeHours(text);
                        setTimeout(updateCaloriesFromTime, 100);
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={[styles.timeUnit, { color: colors.textMuted }]}>h</Text>
                  </View>
                  <Text style={[styles.timeSeparator, { color: colors.textMuted }]}>:</Text>
                  <View style={[styles.timeInput, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.timeValue, { color: colors.textPrimary }]}
                      placeholder="45"
                      placeholderTextColor={colors.textMuted}
                      value={runningTimeMinutes}
                      onChangeText={(text) => {
                        setRunningTimeMinutes(text);
                        setTimeout(updateCaloriesFromTime, 100);
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={[styles.timeUnit, { color: colors.textMuted }]}>m</Text>
                  </View>
                  <Text style={[styles.timeSeparator, { color: colors.textMuted }]}>:</Text>
                  <View style={[styles.timeInput, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.timeValue, { color: colors.textPrimary }]}
                      placeholder="30"
                      placeholderTextColor={colors.textMuted}
                      value={runningTimeSeconds}
                      onChangeText={(text) => {
                        setRunningTimeSeconds(text);
                        setTimeout(updateCaloriesFromTime, 100);
                      }}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                    <Text style={[styles.timeUnit, { color: colors.textMuted }]}>s</Text>
                  </View>
                </View>

                {/* Estimated Pace */}
                {getEstimatedPace() && (
                  <View style={styles.paceInfo}>
                    <Text style={[styles.paceLabel, { color: colors.textMuted }]}>
                      Allure estimée : <Text style={{ color: colors.accent, fontWeight: '600' }}>{getEstimatedPace()}</Text>
                    </Text>
                  </View>
                )}

                {/* Incline (optional) */}
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Dénivelé (optionnel)</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                    placeholder="150"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryIncline}
                    onChangeText={setNewEntryIncline}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.unitText, { color: colors.textSecondary }]}>m</Text>
                </View>
              </>
            )}

            {/* ============================================ */}
            {/* CARDIO Exercise Form */}
            {/* ============================================ */}
            {isCardioExercise && (
              <>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Distance (optionnel)</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                    placeholder="5.0"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryDistance}
                    onChangeText={setNewEntryDistance}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.unitText, { color: colors.textSecondary }]}>km</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Vitesse (optionnel)</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                    placeholder="12.5"
                    placeholderTextColor={colors.textMuted}
                    value={newEntrySpeed}
                    onChangeText={setNewEntrySpeed}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.unitText, { color: colors.textSecondary }]}>km/h</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Puissance (optionnel)</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                    placeholder="250"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryWatts}
                    onChangeText={setNewEntryWatts}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.unitText, { color: colors.textSecondary }]}>W</Text>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Niveau (optionnel)</Text>
                <View style={[styles.inputRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                    placeholder="8"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryLevel}
                    onChangeText={setNewEntryLevel}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.unitText, { color: colors.textSecondary }]}>niveau</Text>
                </View>
              </>
            )}

            {/* ============================================ */}
            {/* DURATION & CALORIES (All non-force types) */}
            {/* ============================================ */}
            {!isForceExercise && (
              <View style={styles.durationCaloriesRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Durée</Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                      placeholder="45"
                      placeholderTextColor={colors.textMuted}
                      value={newEntryDuration}
                      onChangeText={(text) => {
                        setNewEntryDuration(text);
                        const duration = parseInt(text);
                        if (!isNaN(duration) && duration > 0) {
                          const estimatedCal = calculateCalories(duration, userWeight, selectedBenchmark.category);
                          setNewEntryCalories(estimatedCal.toString());
                        }
                      }}
                      keyboardType="numeric"
                    />
                    <Text style={[styles.unitText, { color: colors.textSecondary }]}>min</Text>
                  </View>
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Calories</Text>
                  <View style={[styles.inputRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary, flex: 1 }]}
                      placeholder="350"
                      placeholderTextColor={colors.textMuted}
                      value={newEntryCalories}
                      onChangeText={setNewEntryCalories}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.metsInfo}>
                  <Text style={[styles.metsLabel, { color: colors.textMuted }]}>
                    MET: {selectedBenchmark ? METS_VALUES[selectedBenchmark.category] || 5 : 5}
                  </Text>
                </View>
              </View>
            )}

            {/* RPE Slider */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Difficulté (RPE)
            </Text>
            <View style={[styles.rpeContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.rpeHeader}>
                <Text style={[styles.rpeValue, { color: getRPEColor(newEntryRPE) }]}>{newEntryRPE}</Text>
                <Text style={[styles.rpeLabel, { color: getRPEColor(newEntryRPE) }]}>{getRPELabel(newEntryRPE)}</Text>
              </View>
              <View style={styles.rpeSlider}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.rpeButton,
                      {
                        backgroundColor: val <= newEntryRPE ? getRPEColor(val) : colors.background,
                        borderColor: getRPEColor(val),
                      }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNewEntryRPE(val);
                    }}
                  >
                    <Text style={[
                      styles.rpeButtonText,
                      { color: val <= newEntryRPE ? '#FFFFFF' : colors.textMuted }
                    ]}>
                      {val}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: selectedBenchmark?.color || colors.accent, opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.modalButtonText}>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 24,
    padding: 24,
    marginVertical: 40,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  modalCloseBtn: {
    padding: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  datePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dateOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  dateOptionText: {
    fontSize: 13,
  },
  datePickerContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  datePickerDoneBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerDoneText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  hyroxTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  hyroxTypeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  hyroxTypeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    gap: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 30,
  },
  timeUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 18,
    fontWeight: '700',
  },
  paceInfo: {
    marginTop: 8,
    paddingVertical: 8,
  },
  paceLabel: {
    fontSize: 13,
    textAlign: 'center',
  },
  durationCaloriesRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  metsInfo: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
  },
  metsLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  rpeContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  rpeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rpeValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  rpeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  rpeSlider: {
    flexDirection: 'row',
    gap: 6,
  },
  rpeButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
