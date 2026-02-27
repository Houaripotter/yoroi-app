// ============================================
// YOROI - COMPTEUR MAT TIME
// ============================================
// Suivi du temps passe sur le tatami
// Pour JJB, MMA, Judo, Lutte...

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Clock,
  TrendingUp,
  Calendar,
  Target,
  Award,
  Flame,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings, getTrainingStats } from '@/lib/database';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MatTimeStats {
  totalMinutes: number;
  thisWeekMinutes: number;
  thisMonthMinutes: number;
  avgPerSession: number;
  sessions: number;
  longestSession: number;
  byDiscipline: { name: string; minutes: number; sessions: number }[];
  weeklyData: { day: string; minutes: number }[];
}

// Disciplines de mat time (sports au sol)
const MAT_SPORTS = ['JJB', 'Jiu-Jitsu Brésilien', 'MMA', 'Judo', 'Lutte', 'Grappling', 'No-Gi', 'Wrestling', 'Submission Wrestling'];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function MatTimeScreen() {
  const { colors, isDark } = useTheme();

  const [stats, setStats] = useState<MatTimeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState(300); // 5h par semaine par defaut

  useEffect(() => {
    loadMatTimeStats();
  }, []);

  const loadMatTimeStats = async () => {
    try {
      setIsLoading(true);

      // Charger tous les entrainements
      const allTrainings = await getTrainings();
      const trainingStats = await getTrainingStats();

      // Filtrer pour les sports de mat
      const matTrainings = allTrainings?.filter((t: any) =>
        MAT_SPORTS.some(sport =>
          t.sport?.toLowerCase().includes(sport.toLowerCase()) ||
          t.activity_type?.toLowerCase().includes(sport.toLowerCase())
        )
      ) || [];

      // Calculer les stats
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let totalMinutes = 0;
      let thisWeekMinutes = 0;
      let thisMonthMinutes = 0;
      let longestSession = 0;
      const disciplineMap: Record<string, { minutes: number; sessions: number }> = {};

      // Donnees par jour de la semaine
      const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const weeklyData = weekDays.map(day => ({ day, minutes: 0 }));

      matTrainings.forEach((t: any) => {
        const duration = t.duration || 0;
        const trainingDate = new Date(t.date || t.created_at);

        totalMinutes += duration;

        if (trainingDate >= startOfWeek) {
          thisWeekMinutes += duration;
          const dayIndex = trainingDate.getDay();
          weeklyData[dayIndex].minutes += duration;
        }

        if (trainingDate >= startOfMonth) {
          thisMonthMinutes += duration;
        }

        if (duration > longestSession) {
          longestSession = duration;
        }

        // Par discipline
        const sport = t.sport || 'Autre';
        if (!disciplineMap[sport]) {
          disciplineMap[sport] = { minutes: 0, sessions: 0 };
        }
        disciplineMap[sport].minutes += duration;
        disciplineMap[sport].sessions += 1;
      });

      // Convertir en tableau trie
      const byDiscipline = Object.entries(disciplineMap)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.minutes - a.minutes);

      setStats({
        totalMinutes,
        thisWeekMinutes,
        thisMonthMinutes,
        avgPerSession: matTrainings.length > 0 ? Math.round(totalMinutes / matTrainings.length) : 0,
        sessions: matTrainings.length,
        longestSession,
        byDiscipline,
        weeklyData,
      });
    } catch (error) {
      logger.error('Erreur chargement mat time:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Formatter le temps
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h${mins > 0 ? mins : ''}`;
    }
    return `${mins}min`;
  };

  // Formatter en heures decimales
  const formatHours = (minutes: number) => {
    return (minutes / 60).toFixed(1);
  };

  // Progress ring pour l'objectif
  const GoalRing = ({ current, goal }: { current: number; goal: number }) => {
    const size = 200;
    const strokeWidth = 16;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = Math.min((current / goal) * 100, 100);
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <View style={styles.goalRingContainer}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progress >= 100 ? '#22C55E' : colors.gold}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.goalRingContent}>
          <Text style={[styles.goalValue, { color: colors.textPrimary }]}>
            {formatHours(current)}h
          </Text>
          <Text style={[styles.goalLabel, { color: colors.textMuted }]}>
            / {formatHours(goal)}h
          </Text>
          <Text style={[styles.goalSubLabel, { color: colors.textSecondary }]}>
            cette semaine
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading || !stats) {
    return (
      <ScreenWrapper>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Calcul du mat time...
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  const weekProgress = (stats.thisWeekMinutes / weeklyGoal) * 100;

  return (
    <ScreenWrapper>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.card }]}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          MAT TIME
        </Text>

        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card - Total */}
        <LinearGradient
          colors={isDark ? ['#1a1a2e', '#16213e'] : ['#f8f9fa', '#e9ecef']}
          style={styles.heroCard}
        >
          <View style={styles.heroHeader}>
            <Clock size={20} color={colors.gold} />
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
              TEMPS TOTAL SUR LE TATAMI
            </Text>
          </View>
          <Text style={[styles.heroValue, { color: colors.gold }]}>
            {formatHours(stats.totalMinutes)}
          </Text>
          <Text style={[styles.heroUnit, { color: colors.gold }]}>heures</Text>
          <Text style={[styles.heroSubtext, { color: colors.textMuted }]}>
            {stats.sessions} sessions
          </Text>
        </LinearGradient>

        {/* Weekly Goal */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Target size={18} color={colors.gold} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Objectif Hebdomadaire
            </Text>
          </View>

          <GoalRing current={stats.thisWeekMinutes} goal={weeklyGoal} />

          {weekProgress >= 100 && (
            <View style={[styles.achievedBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Award size={16} color="#22C55E" />
              <Text style={styles.achievedText}>Objectif atteint!</Text>
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Calendar size={18} color={colors.info} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatTime(stats.thisMonthMinutes)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Ce mois</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <TrendingUp size={18} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatTime(stats.avgPerSession)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Moy./session</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Flame size={18} color="#EF4444" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatTime(stats.longestSession)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Plus long</Text>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Calendar size={18} color={colors.gold} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Cette semaine
            </Text>
          </View>

          <View style={styles.weekChart}>
            {stats.weeklyData.map((day, index) => {
              const maxMinutes = Math.max(...stats.weeklyData.map(d => d.minutes), 1);
              const heightPercent = (day.minutes / maxMinutes) * 100;
              const isToday = index === new Date().getDay();

              return (
                <View key={day.day} style={styles.weekBarContainer}>
                  <View style={styles.weekBarWrapper}>
                    <View
                      style={[
                        styles.weekBar,
                        {
                          height: `${Math.max(heightPercent, 5)}%`,
                          backgroundColor: isToday ? colors.gold : colors.goldMuted,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.weekBarLabel,
                      {
                        color: isToday ? colors.gold : colors.textMuted,
                        fontWeight: isToday ? '700' : '500',
                      },
                    ]}
                  >
                    {day.day}
                  </Text>
                  {day.minutes > 0 && (
                    <Text style={[styles.weekBarValue, { color: colors.textSecondary }]}>
                      {day.minutes}m
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* By Discipline */}
        {stats.byDiscipline.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <Award size={18} color={colors.gold} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                Par discipline
              </Text>
            </View>

            {stats.byDiscipline.map((discipline, index) => {
              const percent = (discipline.minutes / stats.totalMinutes) * 100;

              return (
                <View key={discipline.name} style={styles.disciplineRow}>
                  <View style={styles.disciplineInfo}>
                    <Text style={[styles.disciplineName, { color: colors.textPrimary }]}>
                      {discipline.name}
                    </Text>
                    <Text style={[styles.disciplineSessions, { color: colors.textMuted }]}>
                      {discipline.sessions} sessions
                    </Text>
                  </View>
                  <View style={styles.disciplineStats}>
                    <Text style={[styles.disciplineTime, { color: colors.gold }]}>
                      {formatTime(discipline.minutes)}
                    </Text>
                    <View style={[styles.disciplineBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.disciplineBarFill,
                          {
                            width: `${percent}%`,
                            backgroundColor: index === 0 ? colors.gold : colors.textMuted,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Tip */}
        <View style={[styles.tipCard, { backgroundColor: colors.goldMuted }]}>
          <Text style={[styles.tipText, { color: colors.gold }]}>
            L'objectif recommande pour progresser en JJB est de 5 a 6 heures par semaine sur le tatami.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },

  // Hero Card
  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  heroValue: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
  },
  heroUnit: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: -8,
  },
  heroSubtext: {
    fontSize: 13,
    marginTop: 8,
  },

  // Cards
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Goal Ring
  goalRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  goalRingContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  goalValue: {
    fontSize: 36,
    fontWeight: '900',
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: -4,
  },
  goalSubLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  achievedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  achievedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22C55E',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  // Week Chart
  weekChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 20,
  },
  weekBarContainer: {
    flex: 1,
    alignItems: 'center',
  },
  weekBarWrapper: {
    height: 80,
    width: 24,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  weekBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  weekBarLabel: {
    fontSize: 11,
  },
  weekBarValue: {
    fontSize: 9,
    marginTop: 2,
  },

  // Disciplines
  disciplineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  disciplineInfo: {
    flex: 1,
  },
  disciplineName: {
    fontSize: 14,
    fontWeight: '600',
  },
  disciplineSessions: {
    fontSize: 12,
    marginTop: 2,
  },
  disciplineStats: {
    alignItems: 'flex-end',
  },
  disciplineTime: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  disciplineBar: {
    width: 80,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  disciplineBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Tip
  tipCard: {
    borderRadius: 14,
    padding: 16,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
