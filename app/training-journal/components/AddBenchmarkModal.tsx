/**
 * AddBenchmarkModal Component
 *
 * Modal for creating a new benchmark/record with:
 * - Category selector (force, running, cardio, etc.)
 * - Quick presets for popular exercises (Running: 5km, 10km; Force: Squat, etc.)
 * - Auto-unit selection based on category
 * - Unit selector for non-preset categories
 * - Info banners for Running/Force
 *
 * Extracted from training-journal.tsx (187 lines)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Clock, Scale } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  BenchmarkCategory,
  BenchmarkUnit,
  BENCHMARK_CATEGORIES,
} from '@/lib/carnetService';
import { renderIcon } from '../utils/iconMap';

interface AddBenchmarkModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  isSubmitting: boolean;

  // Form state
  newBenchmarkName: string;
  setNewBenchmarkName: (name: string) => void;
  newBenchmarkCategory: BenchmarkCategory;
  setNewBenchmarkCategory: (category: BenchmarkCategory) => void;
  newBenchmarkUnit: BenchmarkUnit;
  setNewBenchmarkUnit: (unit: BenchmarkUnit) => void;

  // Actions
  onSubmit: () => Promise<void>;
}

export default function AddBenchmarkModal({
  visible,
  onClose,
  colors,
  isSubmitting,
  newBenchmarkName,
  setNewBenchmarkName,
  newBenchmarkCategory,
  setNewBenchmarkCategory,
  newBenchmarkUnit,
  setNewBenchmarkUnit,
  onSubmit,
}: AddBenchmarkModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nouveau Suivi</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {(Object.keys(BENCHMARK_CATEGORIES) as BenchmarkCategory[]).map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryOption,
                  { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                  newBenchmarkCategory === cat && { backgroundColor: BENCHMARK_CATEGORIES[cat].color, borderColor: BENCHMARK_CATEGORIES[cat].color }
                ]}
                onPress={() => {
                  setNewBenchmarkCategory(cat);
                  // Auto-set unit based on category
                  if (cat === 'running' || cat === 'trail') {
                    setNewBenchmarkUnit('time');
                  } else if (cat === 'force') {
                    setNewBenchmarkUnit('kg');
                  }
                }}
              >
                {renderIcon(
                  BENCHMARK_CATEGORIES[cat].iconName,
                  18,
                  newBenchmarkCategory === cat ? '#FFFFFF' : BENCHMARK_CATEGORIES[cat].color
                )}
                <Text style={[
                  styles.categoryOptionText,
                  { color: newBenchmarkCategory === cat ? '#FFFFFF' : colors.textPrimary }
                ]}>
                  {BENCHMARK_CATEGORIES[cat].label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quick Presets for Running */}
          {(newBenchmarkCategory === 'running' || newBenchmarkCategory === 'trail') && (
            <>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Distances populaires</Text>
              <View style={styles.presetChipsRow}>
                {[
                  { label: '5km', name: '5km' },
                  { label: '10km', name: '10km' },
                  { label: 'Semi-Marathon', name: 'Semi-Marathon' },
                  { label: 'Marathon', name: 'Marathon' },
                ].map(preset => (
                  <TouchableOpacity
                    key={preset.name}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: newBenchmarkName === preset.name ? '#3B82F6' : colors.backgroundCard,
                        borderColor: '#3B82F6',
                      }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNewBenchmarkName(preset.name);
                      setNewBenchmarkUnit('time');
                    }}
                  >
                    <Text style={[
                      styles.presetChipText,
                      { color: newBenchmarkName === preset.name ? '#FFFFFF' : '#3B82F6' }
                    ]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Quick Presets for Force */}
          {newBenchmarkCategory === 'force' && (
            <>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Exercices populaires</Text>
              <View style={styles.presetChipsRow}>
                {[
                  { label: 'Squat', name: 'Squat' },
                  { label: 'Développé Couché', name: 'Développé Couché' },
                  { label: 'Soulevé de Terre', name: 'Soulevé de Terre' },
                ].map(preset => (
                  <TouchableOpacity
                    key={preset.name}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: newBenchmarkName === preset.name ? '#EF4444' : colors.backgroundCard,
                        borderColor: '#EF4444',
                      }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNewBenchmarkName(preset.name);
                      setNewBenchmarkUnit('kg');
                    }}
                  >
                    <Text style={[
                      styles.presetChipText,
                      { color: newBenchmarkName === preset.name ? '#FFFFFF' : '#EF4444' }
                    ]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nom du suivi</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Ex: Squat, 10km..."
            placeholderTextColor={colors.textMuted}
            value={newBenchmarkName}
            onChangeText={setNewBenchmarkName}
            maxLength={50}
          />

          {/* Only show Unit selector if NOT using a preset (Running/Force) */}
          {newBenchmarkCategory !== 'running' && newBenchmarkCategory !== 'trail' && newBenchmarkCategory !== 'force' && (
            <>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Unité</Text>
              <View style={styles.unitRow}>
                {(['kg', 'lbs', 'time', 'reps', 'km'] as BenchmarkUnit[]).map(unit => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitOption,
                      { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                      newBenchmarkUnit === unit && { backgroundColor: colors.accent, borderColor: colors.accent }
                    ]}
                    onPress={() => setNewBenchmarkUnit(unit)}
                  >
                    <Text style={[
                      styles.unitOptionText,
                      { color: newBenchmarkUnit === unit ? colors.textOnGold : colors.textPrimary }
                    ]}>
                      {unit === 'time' ? 'Temps' : unit.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Show selected unit info for Running/Force */}
          {(newBenchmarkCategory === 'running' || newBenchmarkCategory === 'trail') && (
            <View style={[styles.unitInfoBanner, { backgroundColor: '#3B82F620', borderColor: '#3B82F6' }]}>
              <Clock size={16} color="#3B82F6" />
              <Text style={[styles.unitInfoText, { color: '#3B82F6' }]}>
                Unité: Temps (mm:ss ou hh:mm:ss)
              </Text>
            </View>
          )}
          {newBenchmarkCategory === 'force' && (
            <View style={[styles.unitInfoBanner, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}>
              <Scale size={16} color="#EF4444" />
              <Text style={[styles.unitInfoText, { color: '#EF4444' }]}>
                Unité: Poids (kg) × Répétitions
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: colors.accent, opacity: isSubmitting ? 0.6 : 1 }]}
            onPress={onSubmit}
            disabled={isSubmitting}
          >
            <Text style={[styles.modalButtonText, { color: colors.textOnGold }]}>{isSubmitting ? 'Création...' : 'Créer le Suivi'}</Text>
          </TouchableOpacity>
        </View>
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
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    gap: 8,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  presetChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  unitOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  unitInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 10,
  },
  unitInfoText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  modalButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
