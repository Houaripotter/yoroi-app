// ============================================
// YOROI - COMPTEUR ANNUEL D'ENTRAÎNEMENTS
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { router } from 'expo-router';
import { Flame, Target, TrendingUp, ChevronRight, Settings } from 'lucide-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings } from '@/lib/database';
import {
  getAllGoalsProgress,
  getGlobalGoalStats,
  GoalProgress,
  GlobalGoalStats,
} from '@/lib/trainingGoalsService';
import { logger } from '@/lib/security/logger';

export const YearlyCounter: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [yearCount, setYearCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [goalProgress, setGoalProgress] = useState<GoalProgress[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalGoalStats | null>(null);
  const [hasCustomGoals, setHasCustomGoals] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Charger les objectifs personnalises
      const [progressData, statsData] = await Promise.all([
        getAllGoalsProgress(),
        getGlobalGoalStats(),
      ]);

      setGoalProgress(progressData);
      setGlobalStats(statsData);
      setHasCustomGoals(progressData.length > 0);

      // Charger les stats generales depuis la DB
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const startOfYear = `${currentYear}-01-01`;
      const endOfYear = `${currentYear}-12-31`;

      const trainings = await getTrainings();

      let yearTotal = 0;
      let monthTotal = 0;

      trainings.forEach((training) => {
        const d = new Date(training.date);
        if (d.getFullYear() === currentYear) {
          yearTotal++;
          if (d.getMonth() === currentMonth) {
            monthTotal++;
          }
        }
      });

      setYearCount(yearTotal);
      setMonthCount(monthTotal);
    } catch (error) {
      logger.error('Erreur chargement compteur:', error);
    }
  }, []);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadData(); }, []);

  // Calculer le nombre de jours dans l'annee
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

  // Moyenne par semaine
  const weeksElapsed = Math.max(1, Math.floor(dayOfYear / 7));
  const avgPerWeek = (yearCount / weeksElapsed).toFixed(1);

  const getStatusColor = (progress: GoalProgress) => {
    if (progress.weekPercent >= 100) return colors.success || '#4CAF50';
    if (progress.isOnTrack) return colors.accent;
    return colors.error || '#FF5252';
  };

  // Si l'utilisateur a des objectifs personnalises
  if (hasCustomGoals && globalStats) {
    return (
      <TouchableOpacity
        onPress={() => router.push('/training-goals')}
        activeOpacity={0.8}
        style={[styles.container, { backgroundColor: colors.backgroundElevated }]}
      >
        <View style={styles.header}>
          <Target size={24} color={colors.accentText} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Objectifs {now.getFullYear()}
          </Text>
          <ChevronRight size={20} color={colors.textMuted} />
        </View>

        {/* Stats globales de la semaine */}
        <View style={styles.weekStats}>
          <Text style={[styles.weekLabel, { color: colors.textMuted }]}>Cette semaine</Text>
          <View style={styles.weekProgress}>
            <Text style={[styles.weekCount, { color: colors.textPrimary }]}>
              {globalStats.totalWeeklyCompleted}
            </Text>
            <Text style={[styles.weekSeparator, { color: colors.textMuted }]}>/</Text>
            <Text style={[styles.weekTotal, { color: colors.textMuted }]}>
              {globalStats.totalWeeklyTarget}
            </Text>
          </View>
        </View>

        {/* Barre de progression globale */}
        <View style={[styles.progressBar, { backgroundColor: colors.backgroundLight }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, globalStats.overallWeekPercent)}%`,
                backgroundColor: colors.accent,
              },
            ]}
          />
        </View>

        {/* Mini cartes par sport (max 3) */}
        <View style={styles.sportCards}>
          {goalProgress.slice(0, 3).map((progress) => (
            <View
              key={progress.goal.sport_id}
              style={[styles.sportCard, { backgroundColor: colors.backgroundLight }]}
            >
              <View
                style={[styles.sportIconMini, { backgroundColor: progress.sport.color + '20' }]}
              >
                <MaterialCommunityIcons
                  name={progress.sport.icon as any}
                  size={16}
                  color={progress.sport.color}
                />
              </View>
              <Text style={[styles.sportCardCount, { color: colors.textPrimary }]}>
                {progress.weekCount}/{progress.weekTarget}
              </Text>
              <View
                style={[
                  styles.sportCardStatus,
                  { backgroundColor: getStatusColor(progress) },
                ]}
              />
            </View>
          ))}
          {goalProgress.length > 3 && (
            <View style={[styles.moreCard, { backgroundColor: colors.backgroundLight }]}>
              <Text style={[styles.moreText, { color: colors.textMuted }]}>
                +{goalProgress.length - 3}
              </Text>
            </View>
          )}
        </View>

        {/* Stats annuelles */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Flame size={16} color={colors.textMuted} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {yearCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              cette annee
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statItem}>
            <TrendingUp size={16} color={colors.textMuted} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {avgPerWeek}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              /semaine
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statItem}>
            <Target size={16} color={colors.textMuted} />
            <Text
              style={[
                styles.statValue,
                { color: globalStats.goalsBehind > 0 ? colors.error : colors.success },
              ]}
            >
              {globalStats.goalsOnTrack}/{globalStats.activeGoals}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              on track
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Affichage par defaut (sans objectifs personnalises)
  const yearlyGoal = 200;
  const progressPercent = Math.min(100, (yearCount / yearlyGoal) * 100);

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundElevated }]}>
      <View style={styles.header}>
        <Flame size={24} color={colors.accentText} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Compteur {now.getFullYear()}
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/training-goals')}
          style={styles.settingsButton}
        >
          <Settings size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Compteur principal */}
      <View style={styles.mainCounter}>
        <Text style={[styles.bigNumber, { color: colors.textPrimary }]}>
          {yearCount}
        </Text>
        <Text style={[styles.separator, { color: colors.textMuted }]}>/</Text>
        <Text style={[styles.total, { color: colors.textMuted }]}>
          {yearlyGoal}
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        entrainements cette annee
      </Text>

      {/* Barre de progression */}
      <View style={[styles.progressBar, { backgroundColor: colors.backgroundLight }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: colors.accent,
            },
          ]}
        />
      </View>

      {/* Lien pour configurer les objectifs */}
      <TouchableOpacity
        onPress={() => router.push('/training-goals')}
        style={[styles.customizeLink, { borderColor: colors.border }]}
      >
        <Target size={16} color={colors.accentText} />
        <Text style={[styles.customizeLinkText, { color: isDark ? colors.accent : '#000000', fontWeight: '600' }]}>
          Definir mes objectifs par sport
        </Text>
        <ChevronRight size={16} color={colors.accentText} />
      </TouchableOpacity>

      {/* Stats detaillees */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Target size={16} color={colors.textMuted} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {monthCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            ce mois
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <TrendingUp size={16} color={colors.textMuted} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {avgPerWeek}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            /semaine
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <Flame size={16} color={colors.textMuted} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {Math.round(progressPercent)}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            objectif
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  settingsButton: {
    padding: 4,
  },
  mainCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  bigNumber: {
    fontSize: 64,
    fontWeight: '900',
  },
  separator: {
    fontSize: 40,
    marginHorizontal: 8,
  },
  total: {
    fontSize: 32,
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
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
  customizeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  customizeLinkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 8,
  },
  // Styles pour le mode avec objectifs personnalises
  weekStats: {
    alignItems: 'center',
    marginBottom: 12,
  },
  weekLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  weekProgress: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  weekCount: {
    fontSize: 48,
    fontWeight: '900',
  },
  weekSeparator: {
    fontSize: 32,
    marginHorizontal: 4,
  },
  weekTotal: {
    fontSize: 28,
    fontWeight: '600',
  },
  sportCards: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 4,
  },
  sportCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  sportIconMini: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportCardCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  sportCardStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default YearlyCounter;
