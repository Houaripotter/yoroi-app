// ============================================
// SAISIE RAPIDE MUSCULATION
// Avec Ghost Set, Timer Auto, Graphique, Calculateur
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Plus,
  Minus,
  Check,
  Trash2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Calculator,
  X,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import {
  ProgressionItem,
  PracticeLog,
  getProgressionItems,
  createProgressionItem,
  getLastPracticeLog,
  createPracticeLog,
  getPracticeLogsByItemId,
} from '@/lib/trainingJournalService';
import { LineChart } from 'react-native-chart-kit';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Serie {
  id: string;
  reps: number;
  weight: number;
  completed?: boolean;
}

interface Plate {
  weight: number;
  count: number;
  color: string;
}

export default function QuickLogMuscuScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // États
  const [exerciseName, setExerciseName] = useState('');
  const [series, setSeries] = useState<Serie[]>([
    { id: '1', reps: 10, weight: 60 },
  ]);
  const [existingExercises, setExistingExercises] = useState<ProgressionItem[]>([]);
  const [lastLog, setLastLog] = useState<PracticeLog | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<ProgressionItem | null>(null);
  const [progressHistory, setProgressHistory] = useState<PracticeLog[]>([]);

  // Timer de repos
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(90); // 90 secondes par défaut
  const [restTimerDefault, setRestTimerDefault] = useState(90);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculateur de disques
  const [plateCalcVisible, setPlateCalcVisible] = useState(false);
  const [plateCalcWeight, setPlateCalcWeight] = useState(100);

  // Charger les exercices existants
  useEffect(() => {
    loadExercises();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (restTimerActive && restTimeLeft > 0) {
      timerInterval.current = setInterval(() => {
        setRestTimeLeft((prev) => {
          if (prev <= 1) {
            setRestTimerActive(false);
            notificationAsync(NotificationFeedbackType.Success);
            return restTimerDefault;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [restTimerActive, restTimeLeft]);

  const loadExercises = () => {
    const items = getProgressionItems();
    const muscuItems = items.filter(
      (item) =>
        item.sport === 'musculation' || item.sport === 'crossfit'
    );
    setExistingExercises(muscuItems);
  };

  // Charger la dernière performance quand un exercice est sélectionné
  const loadLastPerformance = (exercise: ProgressionItem) => {
    setSelectedExercise(exercise);
    setExerciseName(exercise.name);

    const last = getLastPracticeLog(exercise.id);
    setLastLog(last);

    // Charger l'historique pour le graphique (30 derniers jours)
    const history = getPracticeLogsByItemId(exercise.id).slice(0, 30);
    setProgressHistory(history);

    // Pré-remplir avec la dernière perfo
    if (last && last.sets && last.reps && last.weight) {
      const newSeries: Serie[] = [];
      for (let i = 0; i < last.sets; i++) {
        newSeries.push({
          id: `${i + 1}`,
          reps: last.reps,
          weight: last.weight,
        });
      }
      setSeries(newSeries);
    }
  };

  const addSerie = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    const lastSerie = series[series.length - 1] || { reps: 10, weight: 60 };
    setSeries([
      ...series,
      {
        id: `${series.length + 1}`,
        reps: lastSerie.reps,
        weight: lastSerie.weight,
      },
    ]);
  };

  const removeSerie = (id: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setSeries(series.filter((s) => s.id !== id));
  };

  const updateSerie = (id: string, field: 'reps' | 'weight', value: number) => {
    setSeries(
      series.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const incrementValue = (id: string, field: 'reps' | 'weight') => {
    impactAsync(ImpactFeedbackStyle.Light);
    const serie = series.find((s) => s.id === id);
    if (!serie) return;

    const increment = field === 'weight' ? 2.5 : 1;
    updateSerie(id, field, serie[field] + increment);
  };

  const decrementValue = (id: string, field: 'reps' | 'weight') => {
    impactAsync(ImpactFeedbackStyle.Light);
    const serie = series.find((s) => s.id === id);
    if (!serie) return;

    const decrement = field === 'weight' ? 2.5 : 1;
    const newValue = serie[field] - decrement;
    if (newValue >= 0) {
      updateSerie(id, field, newValue);
    }
  };

  const completeSerie = (id: string) => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setSeries(
      series.map((s) => (s.id === id ? { ...s, completed: true } : s))
    );

    // Démarrer le timer de repos automatiquement
    setRestTimeLeft(restTimerDefault);
    setRestTimerActive(true);
  };

  const toggleRestTimer = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    setRestTimerActive(!restTimerActive);
  };

  const resetRestTimer = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    setRestTimerActive(false);
    setRestTimeLeft(restTimerDefault);
  };

  const handleSave = () => {
    if (!exerciseName.trim()) {
      showPopup('Erreur', 'Entre le nom de l\'exercice', [
        { text: 'OK', style: 'primary' }
      ]);
      return;
    }

    if (series.length === 0) {
      showPopup('Erreur', 'Ajoute au moins une série', [
        { text: 'OK', style: 'primary' }
      ]);
      return;
    }

    notificationAsync(NotificationFeedbackType.Success);

    // Créer ou récupérer l'item de progression
    let itemId = selectedExercise?.id;

    if (!itemId) {
      // Créer un nouvel exercice
      itemId = createProgressionItem({
        type: 'exercise',
        sport: 'musculation',
        name: exerciseName.trim(),
        status: 'in_progress',
        priority: 3,
      });
    }

    // Logger chaque série
    series.forEach((serie) => {
      createPracticeLog({
        item_id: itemId!,
        date: new Date().toISOString(),
        sets: 1,
        reps: serie.reps,
        weight: serie.weight,
        quality_rating: 4,
      });
    });

    showPopup(
      'Séance enregistrée',
      `${series.length} série(s) de ${exerciseName}`,
      [
        {
          text: 'OK',
          style: 'primary',
          onPress: () => router.back(),
        },
      ]
    );
  };

  // Calculer les disques nécessaires
  const calculatePlates = (totalWeight: number): Plate[] => {
    const barWeight = 20; // Barre olympique
    const weightPerSide = (totalWeight - barWeight) / 2;

    const availablePlates = [
      { weight: 25, color: '#EF4444' },
      { weight: 20, color: '#3B82F6' },
      { weight: 15, color: '#F59E0B' },
      { weight: 10, color: '#10B981' },
      { weight: 5, color: '#8B5CF6' },
      { weight: 2.5, color: '#6B7280' },
      { weight: 1.25, color: '#6B7280' },
    ];

    let remaining = weightPerSide;
    const plates: Plate[] = [];

    for (const plate of availablePlates) {
      const count = Math.floor(remaining / plate.weight);
      if (count > 0) {
        plates.push({ ...plate, count });
        remaining -= count * plate.weight;
      }
    }

    return plates;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Musculation
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: colors.accent }]}
        >
          <Check size={20} color={colors.textOnGold} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* Timer de repos flottant */}
      <View
        style={[
          styles.restTimerFloat,
          {
            backgroundColor: restTimerActive
              ? colors.accent
              : colors.backgroundCard,
            borderColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={toggleRestTimer} style={styles.timerPlayButton}>
          {restTimerActive ? (
            <Pause size={16} color="#FFFFFF" />
          ) : (
            <Play size={16} color={colors.textPrimary} />
          )}
        </TouchableOpacity>
        <Text
          style={[
            styles.timerText,
            { color: restTimerActive ? '#FFFFFF' : colors.textPrimary },
          ]}
        >
          Repos: {formatTime(restTimeLeft)}
        </Text>
        <TouchableOpacity onPress={resetRestTimer}>
          <RotateCcw
            size={16}
            color={restTimerActive ? '#FFFFFF' : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={100}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nom de l'exercice */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            EXERCICE
          </Text>
          <TextInput
            style={[
              styles.exerciseInput,
              {
                backgroundColor: colors.backgroundCard,
                color: colors.textPrimary,
                borderColor: colors.border,
              },
            ]}
            value={exerciseName}
            onChangeText={setExerciseName}
            placeholder="Développé couché, Squat..."
            placeholderTextColor={colors.textMuted}
          />

          {/* Liste des exercices récents */}
          {existingExercises.length > 0 && !selectedExercise && (
            <View style={styles.recentExercises}>
              <Text style={[styles.recentLabel, { color: colors.textMuted }]}>
                Récents :
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentScroll}
              >
                {existingExercises.slice(0, 10).map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={[
                      styles.recentChip,
                      { backgroundColor: colors.backgroundElevated, borderColor: colors.border },
                    ]}
                    onPress={() => loadLastPerformance(ex)}
                  >
                    <Text style={[styles.recentChipText, { color: colors.textPrimary }]}>
                      {ex.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Ghost Set - Affiche la dernière performance */}
          {lastLog && (
            <View
              style={[
                styles.ghostSet,
                { backgroundColor: `${colors.accent}10`, borderColor: `${colors.accent}40` },
              ]}
            >
              <Clock size={14} color={colors.accent} />
              <Text style={[styles.ghostText, { color: isDark ? colors.accent : colors.textPrimary }]}>
                Derniere fois : {lastLog.sets} x {lastLog.reps} reps @ {lastLog.weight}kg
              </Text>
            </View>
          )}

          {/* Graphique de progression */}
          {progressHistory.length > 1 && (
            <View style={styles.progressChart}>
              <View style={styles.chartHeader}>
                <TrendingUp size={16} color={colors.accent} />
                <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                  Progression sur 30 jours
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={{
                    labels: [],
                    datasets: [
                      {
                        data: progressHistory
                          .reverse()
                          .slice(-10)
                          .map((log) => log.weight || 0),
                      },
                    ],
                  }}
                  width={Math.max(SCREEN_WIDTH - 64, progressHistory.length * 40)}
                  height={120}
                  chartConfig={{
                    backgroundColor: colors.backgroundCard,
                    backgroundGradientFrom: colors.backgroundCard,
                    backgroundGradientTo: colors.backgroundCard,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                    labelColor: (opacity = 1) => colors.textMuted,
                    style: {
                      borderRadius: 12,
                    },
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: colors.accent,
                    },
                  }}
                  bezier
                  style={{
                    marginVertical: 8,
                    borderRadius: 12,
                  }}
                  withInnerLines={false}
                  withOuterLines={false}
                  withVerticalLabels={false}
                />
              </ScrollView>
            </View>
          )}
        </View>

        {/* Bouton Calculateur de disques */}
        <TouchableOpacity
          style={[
            styles.plateCalcButton,
            { backgroundColor: colors.backgroundCard, borderColor: colors.border },
          ]}
          onPress={() => setPlateCalcVisible(true)}
        >
          <Calculator size={20} color={colors.accent} />
          <Text style={[styles.plateCalcButtonText, { color: colors.textPrimary }]}>
            Calculateur de disques
          </Text>
        </TouchableOpacity>

        {/* Séries */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              SÉRIES ({series.length})
            </Text>
            <TouchableOpacity
              onPress={addSerie}
              style={[styles.addSerieButton, { backgroundColor: colors.accent }]}
            >
              <Plus size={16} color={colors.textOnGold} strokeWidth={3} />
              <Text style={[styles.addSerieText, { color: colors.textOnGold }]}>Ajouter</Text>
            </TouchableOpacity>
          </View>

          {series.map((serie, index) => (
            <View
              key={serie.id}
              style={[
                styles.serieCard,
                {
                  backgroundColor: serie.completed
                    ? `${colors.success}10`
                    : colors.backgroundCard,
                  borderColor: serie.completed ? colors.success : colors.border,
                },
              ]}
            >
              {/* Numéro de série */}
              <View
                style={[
                  styles.serieNumber,
                  {
                    backgroundColor: serie.completed
                      ? `${colors.success}20`
                      : `${colors.accent}15`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.serieNumberText,
                    { color: serie.completed ? colors.success : colors.accent },
                  ]}
                >
                  {index + 1}
                </Text>
              </View>

              {/* Reps */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  Reps
                </Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    onPress={() => decrementValue(serie.id, 'reps')}
                    style={[styles.stepperButton, { backgroundColor: colors.backgroundElevated }]}
                  >
                    <Minus size={16} color={colors.textPrimary} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>
                    {serie.reps}
                  </Text>
                  <TouchableOpacity
                    onPress={() => incrementValue(serie.id, 'reps')}
                    style={[styles.stepperButton, { backgroundColor: colors.backgroundElevated }]}
                  >
                    <Plus size={16} color={colors.textPrimary} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Poids */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                  Poids (kg)
                </Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    onPress={() => decrementValue(serie.id, 'weight')}
                    style={[styles.stepperButton, { backgroundColor: colors.backgroundElevated }]}
                  >
                    <Minus size={16} color={colors.textPrimary} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={[styles.stepperValue, { color: colors.textPrimary }]}>
                    {serie.weight}
                  </Text>
                  <TouchableOpacity
                    onPress={() => incrementValue(serie.id, 'weight')}
                    style={[styles.stepperButton, { backgroundColor: colors.backgroundElevated }]}
                  >
                    <Plus size={16} color={colors.textPrimary} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bouton valider série */}
              {!serie.completed && (
                <TouchableOpacity
                  onPress={() => completeSerie(serie.id)}
                  style={[styles.completeButton, { backgroundColor: colors.success }]}
                >
                  <Check size={18} color="#FFFFFF" strokeWidth={3} />
                </TouchableOpacity>
              )}

              {/* Supprimer série */}
              {series.length > 1 && !serie.completed && (
                <TouchableOpacity
                  onPress={() => removeSerie(serie.id)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={18} color="#EF4444" strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 150 }} />
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Calculateur de disques */}
      <Modal
        visible={plateCalcVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPlateCalcVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.backgroundCard },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Calculateur de Disques
              </Text>
              <TouchableOpacity
                onPress={() => setPlateCalcVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.plateCalcSection}>
              <Text style={[styles.plateCalcLabel, { color: colors.textMuted }]}>
                POIDS TOTAL (KG)
              </Text>
              <View style={styles.plateWeightInput}>
                <TouchableOpacity
                  onPress={() => setPlateCalcWeight(Math.max(20, plateCalcWeight - 5))}
                  style={[styles.plateButton, { backgroundColor: colors.backgroundElevated }]}
                >
                  <Minus size={20} color={colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={[styles.plateWeightValue, { color: colors.textPrimary }]}>
                  {plateCalcWeight} kg
                </Text>
                <TouchableOpacity
                  onPress={() => setPlateCalcWeight(plateCalcWeight + 5)}
                  style={[styles.plateButton, { backgroundColor: colors.backgroundElevated }]}
                >
                  <Plus size={20} color={colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              <View style={styles.plateResult}>
                <Text style={[styles.plateResultTitle, { color: colors.textMuted }]}>
                  Disques par côté :
                </Text>
                {calculatePlates(plateCalcWeight).map((plate, index) => (
                  <View
                    key={index}
                    style={[
                      styles.plateItem,
                      { backgroundColor: colors.background, borderLeftColor: plate.color },
                    ]}
                  >
                    <View
                      style={[styles.plateColorDot, { backgroundColor: plate.color }]}
                    />
                    <Text style={[styles.plateItemText, { color: colors.textPrimary }]}>
                      {plate.count} x {plate.weight}kg
                    </Text>
                  </View>
                ))}
                <View
                  style={[
                    styles.plateItem,
                    { backgroundColor: colors.background, borderLeftColor: '#6B7280' },
                  ]}
                >
                  <Text style={[styles.plateBarText, { color: colors.textMuted }]}>
                    + Barre olympique (20kg)
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restTimerFloat: {
    position: 'absolute',
    top: 100,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerPlayButton: {
    padding: 2,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  exerciseInput: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  recentExercises: {
    marginTop: 12,
  },
  recentLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  recentScroll: {
    gap: 8,
  },
  recentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  recentChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ghostSet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  ghostText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressChart: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  plateCalcButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  plateCalcButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addSerieButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addSerieText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  serieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 2,
  },
  serieNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serieNumberText: {
    fontSize: 14,
    fontWeight: '800',
  },
  inputGroup: {
    flex: 1,
    gap: 4,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'center',
  },
  completeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  plateCalcSection: {
    gap: 16,
  },
  plateCalcLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  plateWeightInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  plateButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateWeightValue: {
    fontSize: 32,
    fontWeight: '900',
    minWidth: 120,
    textAlign: 'center',
  },
  plateResult: {
    gap: 8,
    marginTop: 8,
  },
  plateResultTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  plateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
  },
  plateColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  plateItemText: {
    fontSize: 15,
    fontWeight: '700',
  },
  plateBarText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
