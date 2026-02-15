// ============================================
// YOROI - MES OBJECTIFS (Refonte complete)
// ============================================
// Tab 1: Objectifs polyvalents avec sablier anime
// Tab 2: Objectifs d'entrainement (existant preserve)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Target,
  Plus,
  Minus,
  Check,
  Trash2,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Swords,
  Scale,
  GraduationCap,
  Plane,
  MapPin,
  Pin,
  Trophy,
  Clock,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/lib/ThemeContext';
import { SPORTS, Sport } from '@/lib/sports';
import { Objective } from '@/lib/database.native';
import {
  addObjective,
  getActiveObjectives,
  getCompletedObjectives,
  deleteObjective,
  completeObjective,
  checkExpiredObjectives,
  getCountdownInfo,
  CountdownInfo,
  ObjectiveType,
  OBJECTIVE_TYPES,
  getTypeConfig,
  togglePinObjective,
} from '@/lib/objectivesService';
import {
  getAllGoals,
  setGoal,
  deleteGoal,
  getAllGoalsProgress,
  getGlobalGoalStats,
  GoalProgress,
  GlobalGoalStats,
  TrainingGoal,
} from '@/lib/trainingGoalsService';
import { logger } from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Icone par type d'objectif
const TypeIcon = ({ type, size, color }: { type: ObjectiveType; size: number; color: string }) => {
  switch (type) {
    case 'competition': return <Swords size={size} color={color} />;
    case 'weight': return <Scale size={size} color={color} />;
    case 'exam': return <GraduationCap size={size} color={color} />;
    case 'travel': return <Plane size={size} color={color} />;
    case 'custom': return <Target size={size} color={color} />;
    default: return <Target size={size} color={color} />;
  }
};

// Grouper les sports par categorie
const SPORT_CATEGORIES: Record<string, { label: string; icon: string }> = {
  combat_grappling: { label: 'Combat - Grappling', icon: 'kabaddi' },
  combat_striking: { label: 'Combat - Striking', icon: 'boxing-glove' },
  fitness: { label: 'Fitness', icon: 'dumbbell' },
  cardio: { label: 'Cardio', icon: 'run' },
  collectif: { label: 'Sports collectifs', icon: 'soccer' },
  raquettes: { label: 'Raquettes', icon: 'tennis' },
  autre: { label: 'Autres', icon: 'dots-horizontal' },
};

export default function TrainingGoalsScreen() {
  const { colors, isDark } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // Tab state
  const [activeTab, setActiveTab] = useState<'objectives' | 'training'>('objectives');

  // === OBJECTIVES STATE ===
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [completedObjectives, setCompletedObjectives] = useState<Objective[]>([]);
  const [countdowns, setCountdowns] = useState<Map<number, CountdownInfo>>(new Map());
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Add form state
  const [formType, setFormType] = useState<ObjectiveType | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [formSportId, setFormSportId] = useState('');
  const [formTargetWeight, setFormTargetWeight] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // === TRAINING TAB STATE ===
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [progressList, setProgressList] = useState<GoalProgress[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalGoalStats | null>(null);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [weeklyTarget, setWeeklyTarget] = useState(2);
  const [showSportSelector, setShowSportSelector] = useState(false);

  // ============================================
  // DATA LOADING
  // ============================================

  const loadObjectives = useCallback(async () => {
    try {
      await checkExpiredObjectives();
      const [active, completed] = await Promise.all([
        getActiveObjectives(),
        getCompletedObjectives(),
      ]);
      setObjectives(active);
      setCompletedObjectives(completed);

      // Calculate initial countdowns
      const map = new Map<number, CountdownInfo>();
      active.forEach(obj => {
        if (obj.id) map.set(obj.id, getCountdownInfo(obj));
      });
      setCountdowns(map);
    } catch (error) {
      logger.error('Erreur chargement objectifs:', error);
    }
  }, []);

  const loadTrainingData = useCallback(async () => {
    try {
      const [goalsData, progressData, statsData] = await Promise.all([
        getAllGoals(),
        getAllGoalsProgress(),
        getGlobalGoalStats(),
      ]);
      setGoals(goalsData);
      setProgressList(progressData);
      setGlobalStats(statsData);
    } catch (error) {
      logger.error('Erreur chargement objectifs entrainement:', error);
    }
  }, []);

  // Load data once at mount
  useEffect(() => {
    loadObjectives();
    loadTrainingData();
  }, []);

  // Live countdown timer - useFocusEffect authorized per CLAUDE.md for timers
  useFocusEffect(
    useCallback(() => {
      if (activeTab !== 'objectives' || objectives.length === 0) return;

      const interval = setInterval(() => {
        const map = new Map<number, CountdownInfo>();
        objectives.forEach(obj => {
          if (obj.id) map.set(obj.id, getCountdownInfo(obj));
        });
        setCountdowns(map);
      }, 1000);

      return () => clearInterval(interval);
    }, [activeTab, objectives])
  );

  // ============================================
  // OBJECTIVES HANDLERS
  // ============================================

  const handleAddObjective = async () => {
    if (!formType || !formTitle.trim()) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      await addObjective({
        type: formType,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        target_date: formDate.toISOString().split('T')[0],
        created_date: today,
        sport_id: formSportId || undefined,
        target_weight: formTargetWeight ? parseFloat(formTargetWeight) : undefined,
        location: formLocation.trim() || undefined,
        color: getTypeConfig(formType).defaultColor,
        completed_at: undefined,
      });
      resetForm();
      await loadObjectives();
    } catch (error) {
      showPopup('Erreur', "Impossible d'ajouter l'objectif", [{ text: 'OK', style: 'primary' }]);
    }
  };

  const handleDeleteObjective = (obj: Objective) => {
    showPopup('Supprimer', `Supprimer "${obj.title}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteObjective(obj.id!);
          await loadObjectives();
        },
      },
    ]);
  };

  const handleCompleteObjective = async (obj: Objective) => {
    await completeObjective(obj.id!);
    await loadObjectives();
  };

  const handleTogglePin = async (obj: Objective) => {
    await togglePinObjective(obj.id!, !obj.is_pinned);
    await loadObjectives();
  };

  const resetForm = () => {
    setShowAddForm(false);
    setFormType(null);
    setFormTitle('');
    setFormDescription('');
    setFormDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setFormSportId('');
    setFormTargetWeight('');
    setFormLocation('');
  };

  // ============================================
  // TRAINING HANDLERS (preserved)
  // ============================================

  const handleAddGoal = async () => {
    if (!selectedSport) return;
    try {
      await setGoal(selectedSport.id, weeklyTarget);
      await loadTrainingData();
      setSelectedSport(null);
      setWeeklyTarget(2);
      setShowSportSelector(false);
    } catch (error) {
      showPopup('Erreur', "Impossible d'ajouter l'objectif", [{ text: 'OK', style: 'primary' }]);
    }
  };

  const handleDeleteGoal = (sportId: string, sportName: string) => {
    showPopup('Supprimer objectif', `Supprimer l'objectif pour ${sportName} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteGoal(sportId);
          await loadTrainingData();
        },
      },
    ]);
  };

  const handleUpdateTarget = async (sportId: string, newTarget: number) => {
    if (newTarget < 1) return;
    await setGoal(sportId, newTarget);
    await loadTrainingData();
  };

  const availableSports = SPORTS.filter(s => !goals.some(g => g.sport_id === s.id));
  const sportsByCategory = availableSports.reduce((acc, sport) => {
    if (!acc[sport.category]) acc[sport.category] = [];
    acc[sport.category].push(sport);
    return acc;
  }, {} as Record<string, Sport[]>);

  const getStatusColor = (progress: GoalProgress) => {
    if (progress.weekPercent >= 100) return colors.success || '#4CAF50';
    if (progress.isOnTrack) return colors.accent;
    return colors.error || '#FF5252';
  };

  const renderProgressBar = (percent: number, color: string) => (
    <View style={[styles.progressBar, { backgroundColor: colors.backgroundLight }]}>
      <View style={[styles.progressFill, { width: `${Math.min(100, percent)}%`, backgroundColor: color }]} />
    </View>
  );

  // Principal objective (pinned or nearest)
  const principalObjective = objectives.length > 0 ? objectives[0] : null;
  const principalCountdown = principalObjective?.id ? countdowns.get(principalObjective.id) : null;

  // ============================================
  // RENDER
  // ============================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.backgroundElevated }]}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Mes Objectifs</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.backgroundElevated }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('objectives')}
          style={[
            styles.tab,
            activeTab === 'objectives' && { backgroundColor: colors.accent },
          ]}
        >
          <Target size={16} color={activeTab === 'objectives' ? colors.textOnAccent : colors.textMuted} />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'objectives' ? colors.textOnAccent : colors.textMuted },
            ]}
          >
            Objectifs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('training')}
          style={[
            styles.tab,
            activeTab === 'training' && { backgroundColor: colors.accent },
          ]}
        >
          <MaterialCommunityIcons
            name="dumbbell"
            size={16}
            color={activeTab === 'training' ? colors.textOnAccent : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'training' ? colors.textOnAccent : colors.textMuted },
            ]}
          >
            Entrainement
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {activeTab === 'objectives' ? (
            <>
              {/* ============================================ */}
              {/* TAB OBJECTIFS                                 */}
              {/* ============================================ */}

              {/* Carte principale avec grand sablier */}
              {principalObjective && principalCountdown && (
                <View style={[styles.principalCard, { backgroundColor: colors.backgroundElevated }]}>
                  {/* Badge type */}
                  <View style={styles.principalBadgeRow}>
                    <View style={[styles.typeBadge, { backgroundColor: (principalObjective.color || colors.accent) + '20' }]}>
                      <TypeIcon type={principalObjective.type} size={14} color={principalObjective.color || colors.accent} />
                      <Text style={[styles.typeBadgeText, { color: principalObjective.color || colors.accent }]}>
                        {getTypeConfig(principalObjective.type).label}
                      </Text>
                    </View>
                    {principalObjective.is_pinned && (
                      <Pin size={14} color={colors.accent} />
                    )}
                  </View>

                  {/* Titre + countdown */}
                  <Text style={[styles.principalTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                    {principalObjective.title}
                  </Text>
                  <Text style={[styles.principalCountdown, { color: principalObjective.color || colors.accent }]}>
                    {principalCountdown.formattedCountdown}
                  </Text>
                  {principalObjective.location ? (
                    <View style={styles.locationRow}>
                      <MapPin size={12} color={colors.textMuted} />
                      <Text style={[styles.locationText, { color: colors.textMuted }]}>
                        {principalObjective.location}
                      </Text>
                    </View>
                  ) : null}

                  {/* Barre de temps */}
                  <View style={styles.principalProgressContainer}>
                    <View style={[styles.principalProgressBg, { backgroundColor: colors.backgroundLight }]}>
                      <View
                        style={[
                          styles.principalProgressFill,
                          {
                            width: `${Math.min(100, principalCountdown.progress * 100)}%`,
                            backgroundColor: principalObjective.color || colors.accent,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.principalProgressLabels}>
                      <Text style={[styles.progressSmallText, { color: colors.textMuted }]}>
                        {principalCountdown.daysElapsed}j ecoules
                      </Text>
                      <Text style={[styles.progressSmallText, { color: principalObjective.color || colors.accent }]}>
                        {principalCountdown.daysRemaining}j restants
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Liste des objectifs actifs */}
              {objectives.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Objectifs actifs ({objectives.length})
                  </Text>
                  {objectives.map(obj => {
                    const countdown = obj.id ? countdowns.get(obj.id) : null;
                    const typeConfig = getTypeConfig(obj.type);
                    const objColor = obj.color || typeConfig.defaultColor;
                    return (
                      <View key={obj.id} style={[styles.objectiveCard, { backgroundColor: colors.backgroundElevated }]}>
                        <View style={styles.objectiveHeader}>
                          <View style={[styles.objectiveIcon, { backgroundColor: objColor + '20' }]}>
                            <TypeIcon type={obj.type} size={20} color={objColor} />
                          </View>
                          <View style={styles.objectiveInfo}>
                            <Text style={[styles.objectiveName, { color: colors.textPrimary }]} numberOfLines={1}>
                              {obj.title}
                            </Text>
                            <View style={styles.objectiveMeta}>
                              <Calendar size={12} color={colors.textMuted} />
                              <Text style={[styles.objectiveDate, { color: colors.textMuted }]}>
                                {new Date(obj.target_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </Text>
                              {obj.location ? (
                                <>
                                  <MapPin size={12} color={colors.textMuted} />
                                  <Text style={[styles.objectiveDate, { color: colors.textMuted }]} numberOfLines={1}>
                                    {obj.location}
                                  </Text>
                                </>
                              ) : null}
                            </View>
                          </View>
                          {countdown && (
                            <View style={[styles.daysRemainingBadge, { backgroundColor: objColor + '20' }]}>
                              <Text style={[styles.daysRemainingText, { color: objColor }]}>
                                {countdown.daysRemaining}j
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Barre de progression temps */}
                        {countdown && (
                          <View style={[styles.progressBar, { backgroundColor: colors.backgroundLight, marginTop: 10 }]}>
                            <View
                              style={[
                                styles.progressFill,
                                { width: `${Math.min(100, countdown.progress * 100)}%`, backgroundColor: objColor },
                              ]}
                            />
                          </View>
                        )}

                        {/* Actions */}
                        <View style={styles.objectiveActions}>
                          <TouchableOpacity onPress={() => handleTogglePin(obj)} style={styles.actionBtn}>
                            <Pin size={16} color={obj.is_pinned ? colors.accent : colors.textMuted} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleCompleteObjective(obj)} style={[styles.actionBtn, { backgroundColor: (colors.success || '#4CAF50') + '15' }]}>
                            <Check size={16} color={colors.success || '#4CAF50'} />
                            <Text style={[styles.actionText, { color: colors.success || '#4CAF50' }]}>Terminer</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteObjective(obj)} style={styles.actionBtn}>
                            <Trash2 size={16} color={colors.error || '#FF5252'} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Bouton ajouter */}
              {!showAddForm ? (
                <View style={styles.section}>
                  <TouchableOpacity
                    onPress={() => setShowAddForm(true)}
                    style={[styles.addButton, { backgroundColor: colors.backgroundElevated }]}
                  >
                    <Plus size={24} color={colors.accent} />
                    <Text style={[styles.addButtonText, { color: colors.textPrimary }]}>
                      Ajouter un objectif
                    </Text>
                    <ChevronRight size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.section}>
                  <View style={[styles.formCard, { backgroundColor: colors.backgroundElevated }]}>
                    {/* Step 1: Type selection */}
                    {!formType ? (
                      <>
                        <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                          Type d'objectif
                        </Text>
                        <View style={styles.typeChips}>
                          {OBJECTIVE_TYPES.map(t => (
                            <TouchableOpacity
                              key={t.type}
                              onPress={() => setFormType(t.type)}
                              style={[styles.typeChip, { backgroundColor: t.defaultColor + '15', borderColor: t.defaultColor + '40' }]}
                            >
                              <TypeIcon type={t.type} size={18} color={t.defaultColor} />
                              <Text style={[styles.typeChipText, { color: t.defaultColor }]}>
                                {t.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TouchableOpacity onPress={resetForm} style={[styles.cancelFormBtn, { borderColor: colors.border }]}>
                          <Text style={[styles.cancelFormText, { color: colors.textMuted }]}>Annuler</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        {/* Step 2: Form */}
                        <View style={styles.formTypeHeader}>
                          <View style={[styles.typeBadge, { backgroundColor: getTypeConfig(formType).defaultColor + '20' }]}>
                            <TypeIcon type={formType} size={14} color={getTypeConfig(formType).defaultColor} />
                            <Text style={[styles.typeBadgeText, { color: getTypeConfig(formType).defaultColor }]}>
                              {getTypeConfig(formType).label}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => setFormType(null)}>
                            <Text style={[styles.changeTypeText, { color: colors.accent }]}>Changer</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Titre */}
                        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Titre *</Text>
                        <TextInput
                          style={[styles.textInput, { backgroundColor: colors.backgroundLight, color: colors.textPrimary, borderColor: colors.border }]}
                          value={formTitle}
                          onChangeText={setFormTitle}
                          placeholder={formType === 'competition' ? 'Ex: Championnat de France' : formType === 'weight' ? 'Ex: Atteindre 75kg' : 'Titre de l\'objectif'}
                          placeholderTextColor={colors.textMuted}
                        />

                        {/* Date cible */}
                        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Date cible *</Text>
                        <TouchableOpacity
                          onPress={() => setShowDatePicker(true)}
                          style={[styles.dateButton, { backgroundColor: colors.backgroundLight, borderColor: colors.border }]}
                        >
                          <Calendar size={18} color={colors.accent} />
                          <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                            {formDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                          <DateTimePicker
                            value={formDate}
                            mode="date"
                            minimumDate={new Date(Date.now() + 86400000)}
                            onChange={(_, date) => {
                              setShowDatePicker(Platform.OS === 'ios');
                              if (date) setFormDate(date);
                            }}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          />
                        )}

                        {/* Description (optional) */}
                        <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Description</Text>
                        <TextInput
                          style={[styles.textInput, styles.textArea, { backgroundColor: colors.backgroundLight, color: colors.textPrimary, borderColor: colors.border }]}
                          value={formDescription}
                          onChangeText={setFormDescription}
                          placeholder="Notes, details..."
                          placeholderTextColor={colors.textMuted}
                          multiline
                          numberOfLines={3}
                        />

                        {/* Champs adaptatifs selon le type */}
                        {(formType === 'competition' || formType === 'exam') && (
                          <>
                            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Sport</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll}>
                              {SPORTS.filter(s => ['combat_grappling', 'combat_striking'].includes(s.category)).map(sport => (
                                <TouchableOpacity
                                  key={sport.id}
                                  onPress={() => setFormSportId(sport.id)}
                                  style={[
                                    styles.sportChip,
                                    {
                                      backgroundColor: formSportId === sport.id ? sport.color + '30' : colors.backgroundLight,
                                      borderColor: formSportId === sport.id ? sport.color : colors.border,
                                    },
                                  ]}
                                >
                                  <MaterialCommunityIcons name={sport.icon as any} size={16} color={formSportId === sport.id ? sport.color : colors.textMuted} />
                                  <Text style={[styles.sportChipText, { color: formSportId === sport.id ? sport.color : colors.textMuted }]}>
                                    {sport.name}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </>
                        )}

                        {formType === 'competition' && (
                          <>
                            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Lieu</Text>
                            <TextInput
                              style={[styles.textInput, { backgroundColor: colors.backgroundLight, color: colors.textPrimary, borderColor: colors.border }]}
                              value={formLocation}
                              onChangeText={setFormLocation}
                              placeholder="Ville, pays..."
                              placeholderTextColor={colors.textMuted}
                            />
                          </>
                        )}

                        {formType === 'weight' && (
                          <>
                            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Poids cible (kg)</Text>
                            <TextInput
                              style={[styles.textInput, { backgroundColor: colors.backgroundLight, color: colors.textPrimary, borderColor: colors.border }]}
                              value={formTargetWeight}
                              onChangeText={setFormTargetWeight}
                              placeholder="Ex: 75.0"
                              placeholderTextColor={colors.textMuted}
                              keyboardType="decimal-pad"
                            />
                          </>
                        )}

                        {formType === 'travel' && (
                          <>
                            <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Destination</Text>
                            <TextInput
                              style={[styles.textInput, { backgroundColor: colors.backgroundLight, color: colors.textPrimary, borderColor: colors.border }]}
                              value={formLocation}
                              onChangeText={setFormLocation}
                              placeholder="Ex: Tokyo, Japon"
                              placeholderTextColor={colors.textMuted}
                            />
                          </>
                        )}

                        {/* Actions */}
                        <View style={styles.formActions}>
                          <TouchableOpacity onPress={resetForm} style={[styles.cancelFormBtn, { borderColor: colors.border }]}>
                            <Text style={[styles.cancelFormText, { color: colors.textMuted }]}>Annuler</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleAddObjective}
                            disabled={!formTitle.trim()}
                            style={[
                              styles.confirmFormBtn,
                              { backgroundColor: formTitle.trim() ? colors.accent : colors.backgroundLight },
                            ]}
                          >
                            <Check size={18} color={formTitle.trim() ? colors.textOnAccent : colors.textMuted} />
                            <Text style={[styles.confirmFormText, { color: formTitle.trim() ? colors.textOnAccent : colors.textMuted }]}>
                              Ajouter
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              )}

              {/* Etat vide */}
              {objectives.length === 0 && !showAddForm && (
                <View style={styles.emptyState}>
                  <Target size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    Aucun objectif
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Definis tes objectifs pour suivre le temps qui te separe de tes buts !
                  </Text>
                </View>
              )}

              {/* Section termines/expires */}
              {completedObjectives.length > 0 && (
                <View style={styles.section}>
                  <TouchableOpacity
                    onPress={() => setShowCompleted(!showCompleted)}
                    style={styles.completedHeader}
                  >
                    <Text style={[styles.sectionTitle, { color: colors.textMuted, marginBottom: 0 }]}>
                      Termines / Expires ({completedObjectives.length})
                    </Text>
                    {showCompleted ? (
                      <ChevronUp size={20} color={colors.textMuted} />
                    ) : (
                      <ChevronDown size={20} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {showCompleted && completedObjectives.map(obj => {
                    const typeConfig = getTypeConfig(obj.type);
                    return (
                      <View
                        key={obj.id}
                        style={[styles.completedCard, { backgroundColor: colors.backgroundElevated }]}
                      >
                        <View style={styles.objectiveHeader}>
                          <View style={[styles.objectiveIcon, { backgroundColor: colors.backgroundLight, opacity: 0.6 }]}>
                            <TypeIcon type={obj.type} size={18} color={colors.textMuted} />
                          </View>
                          <View style={styles.objectiveInfo}>
                            <Text style={[styles.objectiveName, { color: colors.textMuted }]} numberOfLines={1}>
                              {obj.title}
                            </Text>
                            <Text style={[styles.objectiveDate, { color: colors.textMuted }]}>
                              {obj.status === 'completed' ? 'Termine' : 'Expire'} - {new Date(obj.target_date).toLocaleDateString('fr-FR')}
                            </Text>
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: obj.status === 'completed' ? (colors.success || '#4CAF50') + '20' : (colors.error || '#FF5252') + '20' }]}>
                            {obj.status === 'completed' ? (
                              <Trophy size={14} color={colors.success || '#4CAF50'} />
                            ) : (
                              <Clock size={14} color={colors.error || '#FF5252'} />
                            )}
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            showPopup('Supprimer', `Supprimer "${obj.title}" ?`, [
                              { text: 'Annuler', style: 'cancel' },
                              {
                                text: 'Supprimer',
                                style: 'destructive',
                                onPress: async () => {
                                  await deleteObjective(obj.id!);
                                  await loadObjectives();
                                },
                              },
                            ]);
                          }}
                          style={[styles.deleteSmall, { alignSelf: 'flex-end' }]}
                        >
                          <Trash2 size={14} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <>
              {/* ============================================ */}
              {/* TAB ENTRAINEMENT (existant preserve)          */}
              {/* ============================================ */}

              {/* Stats globales */}
              {globalStats && globalStats.activeGoals > 0 && (
                <View style={[styles.globalCard, { backgroundColor: colors.backgroundElevated }]}>
                  <View style={styles.globalHeader}>
                    <Target size={20} color={colors.accent} />
                    <Text style={[styles.globalTitle, { color: colors.textPrimary }]}>Cette semaine</Text>
                  </View>
                  <View style={styles.globalStats}>
                    <View style={styles.globalStat}>
                      <Text style={[styles.globalValue, { color: colors.textPrimary }]}>
                        {globalStats.totalWeeklyCompleted}/{globalStats.totalWeeklyTarget}
                      </Text>
                      <Text style={[styles.globalLabel, { color: colors.textMuted }]}>sessions</Text>
                    </View>
                    <View style={[styles.globalDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.globalStat}>
                      <Text style={[styles.globalValue, { color: colors.textPrimary }]}>
                        {Math.round(globalStats.overallWeekPercent)}%
                      </Text>
                      <Text style={[styles.globalLabel, { color: colors.textMuted }]}>objectif</Text>
                    </View>
                    <View style={[styles.globalDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.globalStat}>
                      <Text style={[styles.globalValue, { color: colors.success || '#4CAF50' }]}>
                        {globalStats.goalsOnTrack}
                      </Text>
                      <Text style={[styles.globalLabel, { color: colors.textMuted }]}>on track</Text>
                    </View>
                  </View>
                  {renderProgressBar(globalStats.overallWeekPercent, colors.accent)}
                </View>
              )}

              {/* Liste des objectifs entrainement */}
              {progressList.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Objectifs actifs</Text>
                  {progressList.map(progress => (
                    <View key={progress.goal.sport_id} style={[styles.goalCard, { backgroundColor: colors.backgroundElevated }]}>
                      <View style={styles.goalHeader}>
                        <View style={styles.sportInfo}>
                          <View style={[styles.sportIcon, { backgroundColor: progress.sport.color + '20' }]}>
                            <MaterialCommunityIcons name={progress.sport.icon as any} size={24} color={progress.sport.color} />
                          </View>
                          <View>
                            <Text style={[styles.sportName, { color: colors.textPrimary }]}>{progress.sport.name}</Text>
                            <Text style={[styles.sportTarget, { color: colors.textMuted }]}>
                              {progress.weekTarget}x / semaine
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteGoal(progress.goal.sport_id, progress.sport.name)}
                          style={styles.deleteButton}
                        >
                          <Trash2 size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>

                      {/* Ajusteur de target */}
                      <View style={styles.targetAdjuster}>
                        <TouchableOpacity
                          onPress={() => handleUpdateTarget(progress.goal.sport_id, progress.goal.weekly_target - 1)}
                          style={[styles.adjustButton, { backgroundColor: colors.backgroundLight }]}
                        >
                          <Minus size={18} color={colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={[styles.targetValue, { color: colors.textPrimary }]}>
                          {progress.goal.weekly_target}x / sem
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleUpdateTarget(progress.goal.sport_id, progress.goal.weekly_target + 1)}
                          style={[styles.adjustButton, { backgroundColor: colors.backgroundLight }]}
                        >
                          <Plus size={18} color={colors.textPrimary} />
                        </TouchableOpacity>
                      </View>

                      {/* Progression semaine */}
                      <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                          <Calendar size={14} color={colors.textMuted} />
                          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Cette semaine</Text>
                          <Text style={[styles.progressValue, { color: getStatusColor(progress) }]}>
                            {progress.weekCount}/{progress.weekTarget}
                          </Text>
                        </View>
                        {renderProgressBar(progress.weekPercent, getStatusColor(progress))}
                        {progress.weekPercent < 100 && (
                          <Text style={[styles.statusText, { color: getStatusColor(progress) }]}>
                            {progress.isOnTrack
                              ? `${progress.sessionsNeeded} session${progress.sessionsNeeded > 1 ? 's' : ''} restante${progress.sessionsNeeded > 1 ? 's' : ''}`
                              : `En retard de ${progress.sessionsNeeded} session${progress.sessionsNeeded > 1 ? 's' : ''}`}
                          </Text>
                        )}
                        {progress.weekPercent >= 100 && (
                          <Text style={[styles.statusText, { color: colors.success || '#4CAF50' }]}>
                            Objectif atteint !
                          </Text>
                        )}
                      </View>

                      {/* Progression mois & annee */}
                      <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Ce mois</Text>
                          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                            {progress.monthCount}/{progress.monthTarget}
                          </Text>
                          <Text style={[styles.statPercent, { color: isDark ? colors.accent : colors.textPrimary }]}>
                            {Math.round(progress.monthPercent)}%
                          </Text>
                        </View>
                        <View style={styles.statBox}>
                          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Cette annee</Text>
                          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                            {progress.yearCount}/{progress.yearTarget}
                          </Text>
                          <Text style={[styles.statPercent, { color: isDark ? colors.accent : colors.textPrimary }]}>
                            {Math.round(progress.yearPercent)}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Ajouter un sport */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ajouter un objectif</Text>
                {!showSportSelector ? (
                  <TouchableOpacity
                    onPress={() => setShowSportSelector(true)}
                    style={[styles.addButton, { backgroundColor: colors.backgroundElevated }]}
                  >
                    <Plus size={24} color={colors.accent} />
                    <Text style={[styles.addButtonText, { color: colors.textPrimary }]}>Nouveau sport</Text>
                    <ChevronRight size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.selectorCard, { backgroundColor: colors.backgroundElevated }]}>
                    {selectedSport ? (
                      <>
                        <View style={styles.selectedSportHeader}>
                          <View style={styles.sportInfo}>
                            <View style={[styles.sportIcon, { backgroundColor: selectedSport.color + '20' }]}>
                              <MaterialCommunityIcons name={selectedSport.icon as any} size={24} color={selectedSport.color} />
                            </View>
                            <Text style={[styles.sportName, { color: colors.textPrimary }]}>{selectedSport.name}</Text>
                          </View>
                          <TouchableOpacity onPress={() => setSelectedSport(null)}>
                            <Text style={[styles.changeText, { color: isDark ? colors.accent : colors.textPrimary }]}>Changer</Text>
                          </TouchableOpacity>
                        </View>

                        <Text style={[styles.targetLabel, { color: colors.textMuted }]}>Objectif par semaine</Text>
                        <View style={styles.targetSelector}>
                          <TouchableOpacity
                            onPress={() => setWeeklyTarget(Math.max(1, weeklyTarget - 1))}
                            style={[styles.targetButton, { backgroundColor: colors.backgroundLight }]}
                          >
                            <Minus size={24} color={colors.textPrimary} />
                          </TouchableOpacity>
                          <View style={styles.targetDisplay}>
                            <Text style={[styles.targetNumber, { color: colors.textPrimary }]}>{weeklyTarget}</Text>
                            <Text style={[styles.targetUnit, { color: colors.textMuted }]}>fois / semaine</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => setWeeklyTarget(weeklyTarget + 1)}
                            style={[styles.targetButton, { backgroundColor: colors.backgroundLight }]}
                          >
                            <Plus size={24} color={colors.textPrimary} />
                          </TouchableOpacity>
                        </View>

                        <Text style={[styles.calcInfo, { color: colors.textMuted }]}>
                          = {weeklyTarget * 4} / mois | {weeklyTarget * 52} / an
                        </Text>

                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            onPress={() => { setSelectedSport(null); setShowSportSelector(false); }}
                            style={[styles.cancelButton, { borderColor: colors.border }]}
                          >
                            <Text style={[styles.cancelText, { color: colors.textMuted }]}>Annuler</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleAddGoal}
                            style={[styles.confirmButton, { backgroundColor: colors.accent }]}
                          >
                            <Check size={20} color={colors.textOnAccent} />
                            <Text style={[styles.confirmText, { color: colors.textOnAccent }]}>Ajouter</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.selectorTitle, { color: colors.textPrimary }]}>Choisir un sport</Text>
                        <ScrollView style={styles.sportList} nestedScrollEnabled>
                          {Object.entries(sportsByCategory).map(([category, sports]) => (
                            <View key={category}>
                              <Text style={[styles.categoryLabel, { color: colors.textMuted }]}>
                                {SPORT_CATEGORIES[category]?.label || category}
                              </Text>
                              {sports.map(sport => (
                                <TouchableOpacity
                                  key={sport.id}
                                  onPress={() => setSelectedSport(sport)}
                                  style={[styles.sportOption, { borderColor: colors.border }]}
                                >
                                  <View style={[styles.sportIconSmall, { backgroundColor: sport.color + '20' }]}>
                                    <MaterialCommunityIcons name={sport.icon as any} size={20} color={sport.color} />
                                  </View>
                                  <Text style={[styles.sportOptionName, { color: colors.textPrimary }]}>{sport.name}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          ))}
                        </ScrollView>
                        <TouchableOpacity
                          onPress={() => setShowSportSelector(false)}
                          style={[styles.closeSelectorButton, { borderColor: colors.border }]}
                        >
                          <Text style={[styles.closeSelectorText, { color: colors.textMuted }]}>Fermer</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>

              {/* Message si aucun objectif entrainement */}
              {progressList.length === 0 && !showSportSelector && (
                <View style={styles.emptyState}>
                  <Target size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    Aucun objectif defini
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    Definis tes objectifs d'entrainement par sport pour suivre ta progression et rester motive !
                  </Text>
                </View>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      <PopupComponent />
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabText: { fontSize: 14, fontWeight: '600' },

  // Principal card
  principalCard: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  principalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  hourglassContainer: { marginVertical: 8 },
  principalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  principalCountdown: {
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationText: { fontSize: 13 },
  principalProgressContainer: { width: '100%', marginTop: 16 },
  principalProgressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  principalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  principalProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressSmallText: { fontSize: 11 },

  // Type badge
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '600' },

  // Objective card
  objectiveCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  objectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  objectiveIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  objectiveInfo: { flex: 1 },
  objectiveName: { fontSize: 15, fontWeight: '600' },
  objectiveMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  objectiveDate: { fontSize: 12 },
  daysRemainingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  daysRemainingText: { fontSize: 14, fontWeight: '700' },
  objectiveActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionText: { fontSize: 12, fontWeight: '600' },

  // Completed
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  completedCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    opacity: 0.75,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSmall: { padding: 6 },

  // Add form
  formCard: {
    borderRadius: 16,
    padding: 16,
  },
  formTitle: { fontSize: 16, fontWeight: '600', marginBottom: 14 },
  typeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  formTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  changeTypeText: { fontSize: 14, fontWeight: '500' },
  inputLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6, marginTop: 12 },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  dateText: { fontSize: 15 },
  sportScroll: { marginTop: 4, marginBottom: 4 },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginRight: 8,
  },
  sportChipText: { fontSize: 13, fontWeight: '500' },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelFormBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelFormText: { fontSize: 15, fontWeight: '500' },
  confirmFormBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmFormText: { fontSize: 15, fontWeight: '600' },

  // Section
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },

  // Shared styles (Training tab)
  globalCard: { margin: 16, borderRadius: 16, padding: 16 },
  globalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  globalTitle: { fontSize: 16, fontWeight: '600' },
  globalStats: { flexDirection: 'row', marginBottom: 12 },
  globalStat: { flex: 1, alignItems: 'center' },
  globalValue: { fontSize: 24, fontWeight: '700' },
  globalLabel: { fontSize: 12, marginTop: 2 },
  globalDivider: { width: 1, marginVertical: 4 },

  goalCard: { borderRadius: 16, padding: 16, marginBottom: 12 },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sportInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sportIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sportName: { fontSize: 16, fontWeight: '600' },
  sportTarget: { fontSize: 13, marginTop: 2 },
  deleteButton: { padding: 8 },

  targetAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
    paddingVertical: 8,
  },
  adjustButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  targetValue: { fontSize: 16, fontWeight: '600', minWidth: 100, textAlign: 'center' },

  progressSection: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  progressLabel: { fontSize: 13, flex: 1 },
  progressValue: { fontSize: 14, fontWeight: '600' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  statusText: { fontSize: 12, marginTop: 6, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  statLabel: { fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '600' },
  statPercent: { fontSize: 13, fontWeight: '500', marginTop: 2 },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  addButtonText: { fontSize: 16, fontWeight: '500', flex: 1 },

  selectorCard: { borderRadius: 16, padding: 16 },
  selectedSportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  changeText: { fontSize: 14, fontWeight: '500' },
  targetLabel: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  targetSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 8,
  },
  targetButton: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  targetDisplay: { alignItems: 'center' },
  targetNumber: { fontSize: 48, fontWeight: '700' },
  targetUnit: { fontSize: 14, marginTop: -4 },
  calcInfo: { fontSize: 13, textAlign: 'center', marginBottom: 20 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '500' },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmText: { fontSize: 15, fontWeight: '600' },
  selectorTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  sportList: { maxHeight: 300 },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sportIconSmall: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sportOptionName: { fontSize: 15 },
  closeSelectorButton: { marginTop: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  closeSelectorText: { fontSize: 15, fontWeight: '500' },

  emptyState: { alignItems: 'center', padding: 32, marginTop: 20 },
  emptyHourglass: { marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 8, marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
