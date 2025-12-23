import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { X, Plus, Search } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Exercise } from '@/lib/database';
import { EXERCISES, MUSCLE_GROUPS, getAllMuscleGroups } from '@/lib/exercises';

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onAddExercise: (exercise: Exercise) => void;
}

export function ExercisePickerModal({ visible, onClose, onAddExercise }: ExercisePickerModalProps) {
  const { colors } = useTheme();
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAdd = () => {
    if (!selectedExercise) return;

    const exercise = EXERCISES.find(e => e.id === selectedExercise);
    if (!exercise) return;

    onAddExercise({
      name: exercise.name,
      sets: parseInt(sets) || 0,
      reps: parseInt(reps) || 0,
      weight: parseFloat(weight) || 0,
      muscle_group: exercise.muscle_group,
    });

    // Reset form
    setSelectedExercise(null);
    setSets('3');
    setReps('10');
    setWeight('0');
    setSearchQuery('');
    onClose();
  };

  // Filter exercises
  const filteredExercises = EXERCISES.filter(exercise => {
    const matchesSearch = searchQuery === '' ||
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscleGroup = !selectedMuscleGroup || exercise.muscle_group === selectedMuscleGroup;
    return matchesSearch && matchesMuscleGroup;
  });

  const muscleGroups = getAllMuscleGroups();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.modalContainer, { backgroundColor: colors.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Ajouter un exercice
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Rechercher un exercice..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Muscle groups filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.muscleGroupsScroll}
            contentContainerStyle={styles.muscleGroupsContent}
          >
            <TouchableOpacity
              style={[
                styles.muscleGroupChip,
                { backgroundColor: !selectedMuscleGroup ? colors.gold : colors.background, borderColor: colors.border },
              ]}
              onPress={() => setSelectedMuscleGroup(null)}
            >
              <Text style={[styles.muscleGroupText, { color: !selectedMuscleGroup ? '#FFF' : colors.textPrimary }]}>
                Tous
              </Text>
            </TouchableOpacity>
            {muscleGroups.map((group) => (
              <TouchableOpacity
                key={group.id}
                style={[
                  styles.muscleGroupChip,
                  {
                    backgroundColor: selectedMuscleGroup === group.id ? colors.gold : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedMuscleGroup(group.id)}
              >
                <Text
                  style={[
                    styles.muscleGroupText,
                    { color: selectedMuscleGroup === group.id ? '#FFF' : colors.textPrimary },
                  ]}
                >
                  {group.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Exercises list */}
          <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
            {filteredExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={[
                  styles.exerciseOption,
                  {
                    backgroundColor: selectedExercise === exercise.id ? colors.goldMuted : colors.background,
                    borderColor: selectedExercise === exercise.id ? colors.gold : colors.border,
                  },
                ]}
                onPress={() => setSelectedExercise(exercise.id)}
              >
                <Text
                  style={[
                    styles.exerciseOptionName,
                    { color: selectedExercise === exercise.id ? colors.gold : colors.textPrimary },
                  ]}
                >
                  {exercise.name}
                </Text>
                <Text style={[styles.exerciseOptionMuscle, { color: colors.textMuted }]}>
                  {MUSCLE_GROUPS[exercise.muscle_group as keyof typeof MUSCLE_GROUPS]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input fields */}
          {selectedExercise && (
            <View style={styles.inputsContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Séries</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={sets}
                  onChangeText={setSets}
                  keyboardType="number-pad"
                  placeholder="3"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Reps</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={reps}
                  onChangeText={setReps}
                  keyboardType="number-pad"
                  placeholder="10"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids (kg)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>
          )}

          {/* Add button */}
          {selectedExercise && (
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.gold }]}
              onPress={handleAdd}
            >
              <Plus size={20} color="#FFF" />
              <Text style={styles.addButtonText}>Ajouter l'exercice</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  muscleGroupsScroll: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  muscleGroupsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  muscleGroupChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  muscleGroupText: {
    fontSize: 13,
    fontWeight: '600',
  },
  exercisesList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  exerciseOption: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
  },
  exerciseOptionName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseOptionMuscle: {
    fontSize: 12,
  },
  inputsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
