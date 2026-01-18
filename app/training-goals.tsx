// ============================================
// YOROI - OBJECTIFS D'ENTRAINEMENT
// ============================================
// Permet de definir des objectifs personnalises par sport

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
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
  TrendingUp,
  Calendar,
  Flame,
  ChevronRight,
} from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { SPORTS, Sport } from '@/lib/sports';
import {
  getAllGoals,
  setGoal,
  deleteGoal,
  deactivateGoal,
  activateGoal,
  getAllGoalsProgress,
  getGlobalGoalStats,
  GoalProgress,
  GlobalGoalStats,
  TrainingGoal,
} from '@/lib/trainingGoalsService';

// Grouper les sports par categorie
const SPORT_CATEGORIES = {
  combat_grappling: { label: 'Combat - Grappling', icon: 'kabaddi' },
  combat_striking: { label: 'Combat - Striking', icon: 'boxing-glove' },
  fitness: { label: 'Fitness', icon: 'dumbbell' },
  cardio: { label: 'Cardio', icon: 'run' },
  collectif: { label: 'Sports collectifs', icon: 'soccer' },
  raquettes: { label: 'Raquettes', icon: 'tennis' },
  autre: { label: 'Autres', icon: 'dots-horizontal' },
};

export default function TrainingGoalsScreen() {
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();
  const [goals, setGoals] = useState<TrainingGoal[]>([]);
  const [progressList, setProgressList] = useState<GoalProgress[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalGoalStats | null>(null);
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [weeklyTarget, setWeeklyTarget] = useState(2);
  const [showSportSelector, setShowSportSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
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
      console.error('Erreur chargement objectifs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleAddGoal = async () => {
    if (!selectedSport) return;

    try {
      await setGoal(selectedSport.id, weeklyTarget);
      await loadData();
      setSelectedSport(null);
      setWeeklyTarget(2);
      setShowSportSelector(false);
    } catch (error) {
      showPopup('Erreur', "Impossible d'ajouter l'objectif", [
        { text: 'OK', style: 'primary' }
      ]);
    }
  };

  const handleDeleteGoal = (sportId: string, sportName: string) => {
    showPopup(
      'Supprimer objectif',
      `Supprimer l'objectif pour ${sportName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteGoal(sportId);
            await loadData();
          },
        },
      ]
    );
  };

  const handleUpdateTarget = async (sportId: string, newTarget: number) => {
    if (newTarget < 1) return;
    await setGoal(sportId, newTarget);
    await loadData();
  };

  // Sports qui n'ont pas encore d'objectif
  const availableSports = SPORTS.filter(
    (s) => !goals.some((g) => g.sport_id === s.id)
  );

  // Grouper par categorie
  const sportsByCategory = availableSports.reduce((acc, sport) => {
    if (!acc[sport.category]) acc[sport.category] = [];
    acc[sport.category].push(sport);
    return acc;
  }, {} as Record<string, Sport[]>);

  const renderProgressBar = (percent: number, color: string) => (
    <View style={[styles.progressBar, { backgroundColor: colors.backgroundLight }]}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.min(100, percent)}%`, backgroundColor: color },
        ]}
      />
    </View>
  );

  const getStatusColor = (progress: GoalProgress) => {
    if (progress.weekPercent >= 100) return colors.success || '#4CAF50';
    if (progress.isOnTrack) return colors.accent;
    return colors.error || '#FF5252';
  };

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Mes Objectifs
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats globales */}
        {globalStats && globalStats.activeGoals > 0 && (
          <View style={[styles.globalCard, { backgroundColor: colors.backgroundElevated }]}>
            <View style={styles.globalHeader}>
              <Target size={20} color={colors.accent} />
              <Text style={[styles.globalTitle, { color: colors.textPrimary }]}>
                Cette semaine
              </Text>
            </View>
            <View style={styles.globalStats}>
              <View style={styles.globalStat}>
                <Text style={[styles.globalValue, { color: colors.textPrimary }]}>
                  {globalStats.totalWeeklyCompleted}/{globalStats.totalWeeklyTarget}
                </Text>
                <Text style={[styles.globalLabel, { color: colors.textMuted }]}>
                  sessions
                </Text>
              </View>
              <View style={[styles.globalDivider, { backgroundColor: colors.border }]} />
              <View style={styles.globalStat}>
                <Text style={[styles.globalValue, { color: colors.textPrimary }]}>
                  {Math.round(globalStats.overallWeekPercent)}%
                </Text>
                <Text style={[styles.globalLabel, { color: colors.textMuted }]}>
                  objectif
                </Text>
              </View>
              <View style={[styles.globalDivider, { backgroundColor: colors.border }]} />
              <View style={styles.globalStat}>
                <Text style={[styles.globalValue, { color: colors.success || '#4CAF50' }]}>
                  {globalStats.goalsOnTrack}
                </Text>
                <Text style={[styles.globalLabel, { color: colors.textMuted }]}>
                  on track
                </Text>
              </View>
            </View>
            {renderProgressBar(globalStats.overallWeekPercent, colors.accent)}
          </View>
        )}

        {/* Liste des objectifs */}
        {progressList.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Objectifs actifs
            </Text>
            {progressList.map((progress) => (
              <View
                key={progress.goal.sport_id}
                style={[styles.goalCard, { backgroundColor: colors.backgroundElevated }]}
              >
                <View style={styles.goalHeader}>
                  <View style={styles.sportInfo}>
                    <View
                      style={[
                        styles.sportIcon,
                        { backgroundColor: progress.sport.color + '20' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={progress.sport.icon as any}
                        size={24}
                        color={progress.sport.color}
                      />
                    </View>
                    <View>
                      <Text style={[styles.sportName, { color: colors.textPrimary }]}>
                        {progress.sport.name}
                      </Text>
                      <Text style={[styles.sportTarget, { color: colors.textMuted }]}>
                        {progress.weekTarget}x / semaine
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      handleDeleteGoal(progress.goal.sport_id, progress.sport.name)
                    }
                    style={styles.deleteButton}
                  >
                    <Trash2 size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Ajusteur de target */}
                <View style={styles.targetAdjuster}>
                  <TouchableOpacity
                    onPress={() =>
                      handleUpdateTarget(
                        progress.goal.sport_id,
                        progress.goal.weekly_target - 1
                      )
                    }
                    style={[styles.adjustButton, { backgroundColor: colors.backgroundLight }]}
                  >
                    <Minus size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.targetValue, { color: colors.textPrimary }]}>
                    {progress.goal.weekly_target}x / sem
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      handleUpdateTarget(
                        progress.goal.sport_id,
                        progress.goal.weekly_target + 1
                      )
                    }
                    style={[styles.adjustButton, { backgroundColor: colors.backgroundLight }]}
                  >
                    <Plus size={18} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Progression semaine */}
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Calendar size={14} color={colors.textMuted} />
                    <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                      Cette semaine
                    </Text>
                    <Text
                      style={[styles.progressValue, { color: getStatusColor(progress) }]}
                    >
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
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                      Ce mois
                    </Text>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {progress.monthCount}/{progress.monthTarget}
                    </Text>
                    <Text style={[styles.statPercent, { color: colors.accent }]}>
                      {Math.round(progress.monthPercent)}%
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                      Cette annee
                    </Text>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {progress.yearCount}/{progress.yearTarget}
                    </Text>
                    <Text style={[styles.statPercent, { color: colors.accent }]}>
                      {Math.round(progress.yearPercent)}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Ajouter un objectif */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Ajouter un objectif
          </Text>

          {!showSportSelector ? (
            <TouchableOpacity
              onPress={() => setShowSportSelector(true)}
              style={[styles.addButton, { backgroundColor: colors.backgroundElevated }]}
            >
              <Plus size={24} color={colors.accent} />
              <Text style={[styles.addButtonText, { color: colors.textPrimary }]}>
                Nouveau sport
              </Text>
              <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.selectorCard, { backgroundColor: colors.backgroundElevated }]}>
              {selectedSport ? (
                <>
                  <View style={styles.selectedSportHeader}>
                    <View style={styles.sportInfo}>
                      <View
                        style={[
                          styles.sportIcon,
                          { backgroundColor: selectedSport.color + '20' },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={selectedSport.icon as any}
                          size={24}
                          color={selectedSport.color}
                        />
                      </View>
                      <Text style={[styles.sportName, { color: colors.textPrimary }]}>
                        {selectedSport.name}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedSport(null)}>
                      <Text style={[styles.changeText, { color: colors.accent }]}>
                        Changer
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.targetLabel, { color: colors.textMuted }]}>
                    Objectif par semaine
                  </Text>
                  <View style={styles.targetSelector}>
                    <TouchableOpacity
                      onPress={() => setWeeklyTarget(Math.max(1, weeklyTarget - 1))}
                      style={[styles.targetButton, { backgroundColor: colors.backgroundLight }]}
                    >
                      <Minus size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.targetDisplay}>
                      <Text style={[styles.targetNumber, { color: colors.textPrimary }]}>
                        {weeklyTarget}
                      </Text>
                      <Text style={[styles.targetUnit, { color: colors.textMuted }]}>
                        fois / semaine
                      </Text>
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
                      onPress={() => {
                        setSelectedSport(null);
                        setShowSportSelector(false);
                      }}
                      style={[styles.cancelButton, { borderColor: colors.border }]}
                    >
                      <Text style={[styles.cancelText, { color: colors.textMuted }]}>
                        Annuler
                      </Text>
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
                  <Text style={[styles.selectorTitle, { color: colors.textPrimary }]}>
                    Choisir un sport
                  </Text>
                  <ScrollView style={styles.sportList} nestedScrollEnabled>
                    {Object.entries(sportsByCategory).map(([category, sports]) => (
                      <View key={category}>
                        <Text style={[styles.categoryLabel, { color: colors.textMuted }]}>
                          {SPORT_CATEGORIES[category as keyof typeof SPORT_CATEGORIES]?.label ||
                            category}
                        </Text>
                        {sports.map((sport) => (
                          <TouchableOpacity
                            key={sport.id}
                            onPress={() => setSelectedSport(sport)}
                            style={[styles.sportOption, { borderColor: colors.border }]}
                          >
                            <View
                              style={[
                                styles.sportIconSmall,
                                { backgroundColor: sport.color + '20' },
                              ]}
                            >
                              <MaterialCommunityIcons
                                name={sport.icon as any}
                                size={20}
                                color={sport.color}
                              />
                            </View>
                            <Text style={[styles.sportOptionName, { color: colors.textPrimary }]}>
                              {sport.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    onPress={() => setShowSportSelector(false)}
                    style={[styles.closeSelectorButton, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.closeSelectorText, { color: colors.textMuted }]}>
                      Fermer
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>

        {/* Message si aucun objectif */}
        {progressList.length === 0 && !showSportSelector && (
          <View style={styles.emptyState}>
            <Target size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Aucun objectif defini
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Definis tes objectifs d'entrainement par sport pour suivre ta progression
              et rester motive !
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
      <PopupComponent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  globalCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
  },
  globalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  globalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  globalStats: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  globalStat: {
    flex: 1,
    alignItems: 'center',
  },
  globalValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  globalLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  globalDivider: {
    width: 1,
    marginVertical: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  goalCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sportIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sportTarget: {
    fontSize: 13,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  targetAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
    paddingVertical: 8,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 100,
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    flex: 1,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statPercent: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  selectorCard: {
    borderRadius: 16,
    padding: 16,
  },
  selectedSportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  targetLabel: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  targetSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 8,
  },
  targetButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetDisplay: {
    alignItems: 'center',
  },
  targetNumber: {
    fontSize: 48,
    fontWeight: '700',
  },
  targetUnit: {
    fontSize: 14,
    marginTop: -4,
  },
  calcInfo: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sportList: {
    maxHeight: 300,
  },
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
  sportIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportOptionName: {
    fontSize: 15,
  },
  closeSelectorButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  closeSelectorText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
