import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Plus, Search, Dumbbell } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Exercise } from '@/lib/database';
import { EXERCISE_LIBRARY, ExerciseDefinition, getExerciseCount } from '@/constants/exerciseLibrary';

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onAddExercise: (exercise: Exercise) => void;
  sport?: string; // Pour filtrer par sport si besoin
}

// Mapping des catégories vers des labels lisibles
const CATEGORY_LABELS: Record<string, string> = {
  musculation: 'Musculation',
  cardio: 'Cardio',
  jjb: 'JJB',
  mma: 'MMA',
  boxe: 'Boxe',
  judo: 'Judo',
  muay_thai: 'Muay Thai',
  karate: 'Karaté',
  lutte: 'Lutte',
  crossfit: 'CrossFit',
  running: 'Running',
  natation: 'Natation',
  velo: 'Vélo',
  yoga: 'Yoga',
  pilates: 'Pilates',
};

// Obtenir toutes les catégories uniques
const getAllCategories = (): { id: string; name: string }[] => {
  const categories = new Set<string>();
  EXERCISE_LIBRARY.forEach(ex => categories.add(ex.category));
  return Array.from(categories).map(cat => ({
    id: cat,
    name: CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
  }));
};

// Obtenir tous les muscles/groupes uniques pour une catégorie
const getMusclesForCategory = (category: string | null): { id: string; name: string }[] => {
  const muscles = new Set<string>();
  EXERCISE_LIBRARY.forEach(ex => {
    if (!category || ex.category === category) {
      if (ex.muscle) muscles.add(ex.muscle);
    }
  });
  return Array.from(muscles).map(m => ({ id: m, name: m }));
};

export function ExercisePickerModal({ visible, onClose, onAddExercise, sport }: ExercisePickerModalProps) {
  const { colors } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weight, setWeight] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');

  const exerciseCount = getExerciseCount();
  const categories = useMemo(() => getAllCategories(), []);
  const muscles = useMemo(() => getMusclesForCategory(selectedCategory), [selectedCategory]);

  const handleAdd = () => {
    if (!selectedExercise) return;

    onAddExercise({
      name: selectedExercise.name,
      sets: parseInt(sets) || 0,
      reps: parseInt(reps) || 0,
      weight: parseFloat(weight) || 0,
      muscle_group: selectedExercise.muscle || selectedExercise.category,
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
  const filteredExercises = useMemo(() => {
    return EXERCISE_LIBRARY.filter(exercise => {
      const matchesSearch = searchQuery === '' ||
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exercise.muscle && exercise.muscle.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = !selectedCategory || exercise.category === selectedCategory;
      const matchesMuscle = !selectedMuscle || exercise.muscle === selectedMuscle;
      return matchesSearch && matchesCategory && matchesMuscle;
    }).slice(0, 100); // Limiter à 100 résultats pour la performance
  }, [searchQuery, selectedCategory, selectedMuscle]);

  const resetFilters = () => {
    setSelectedCategory(null);
    setSelectedMuscle(null);
    setSearchQuery('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable
            style={[styles.modalContainer, { backgroundColor: colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Ajouter un exercice
              </Text>
              <View style={styles.countBadge}>
                <Dumbbell size={12} color={colors.gold} />
                <Text style={[styles.countText, { color: colors.textMuted }]}>
                  {exerciseCount} exercices disponibles
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Rechercher parmi 1000+ exercices..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category filter */}
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>CATÉGORIE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
            contentContainerStyle={styles.filtersContent}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: !selectedCategory ? colors.gold : colors.background, borderColor: colors.border },
              ]}
              onPress={() => { setSelectedCategory(null); setSelectedMuscle(null); }}
            >
              <Text style={[styles.filterChipText, { color: !selectedCategory ? '#FFF' : colors.textPrimary }]}>
                Tous
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selectedCategory === cat.id ? colors.gold : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => { setSelectedCategory(cat.id); setSelectedMuscle(null); }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: selectedCategory === cat.id ? '#FFF' : colors.textPrimary },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Muscle filter (only if category selected) */}
          {selectedCategory && muscles.length > 0 && (
            <>
              <Text style={[styles.filterLabel, { color: colors.textMuted }]}>MUSCLE / GROUPE</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filtersScroll}
                contentContainerStyle={styles.filtersContent}
              >
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    { backgroundColor: !selectedMuscle ? colors.accent : colors.background, borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedMuscle(null)}
                >
                  <Text style={[styles.filterChipText, { color: !selectedMuscle ? '#FFF' : colors.textPrimary }]}>
                    Tous
                  </Text>
                </TouchableOpacity>
                {muscles.map((muscle) => (
                  <TouchableOpacity
                    key={muscle.id}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selectedMuscle === muscle.id ? colors.accent : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setSelectedMuscle(muscle.id)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: selectedMuscle === muscle.id ? '#FFF' : colors.textPrimary },
                      ]}
                    >
                      {muscle.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Results count */}
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
              {filteredExercises.length === 100 ? '100+' : filteredExercises.length} résultat{filteredExercises.length !== 1 ? 's' : ''}
            </Text>
            {(selectedCategory || selectedMuscle || searchQuery) && (
              <TouchableOpacity onPress={resetFilters}>
                <Text style={[styles.resetText, { color: colors.gold }]}>Réinitialiser</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Exercises list */}
          <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
            {filteredExercises.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Aucun exercice trouvé
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Essaie un autre terme de recherche
                </Text>
              </View>
            ) : (
              filteredExercises.map((exercise, index) => (
                <TouchableOpacity
                  key={`${exercise.name}-${index}`}
                  style={[
                    styles.exerciseOption,
                    {
                      backgroundColor: selectedExercise?.name === exercise.name ? colors.goldMuted : colors.background,
                      borderColor: selectedExercise?.name === exercise.name ? colors.gold : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedExercise(exercise)}
                >
                  <Text
                    style={[
                      styles.exerciseOptionName,
                      { color: selectedExercise?.name === exercise.name ? colors.gold : colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {exercise.name}
                  </Text>
                  <View style={styles.exerciseMeta}>
                    <Text style={[styles.exerciseOptionMuscle, { color: colors.textMuted }]}>
                      {exercise.muscle || exercise.category}
                    </Text>
                    <Text style={[styles.exerciseUnit, { color: colors.textMuted }]}>
                      {exercise.unit === 'reps' ? '• Reps' : exercise.unit === 'time' ? '• Temps' : exercise.unit === 'km' ? '• KM' : '• Mètres'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
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
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  {selectedExercise.unit === 'reps' ? 'Reps' : selectedExercise.unit === 'time' ? 'Secondes' : selectedExercise.unit === 'km' ? 'KM' : 'Mètres'}
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={reps}
                  onChangeText={(text) => setReps(text.replace(',', '.'))}
                  keyboardType="decimal-pad"
                  placeholder="10"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Poids (kg)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={weight}
                  onChangeText={(text) => setWeight(text.replace(',', '.'))}
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
      </KeyboardAvoidingView>
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
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
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
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  filtersScroll: {
    marginBottom: 12,
    marginHorizontal: -20,
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  resetText: {
    fontSize: 12,
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
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseOptionMuscle: {
    fontSize: 12,
  },
  exerciseUnit: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
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
