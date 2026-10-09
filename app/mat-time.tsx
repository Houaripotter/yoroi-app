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
import { SkeletonCard, SkeletonMessage } from '@/components/stats/SkeletonCard';
import { getTrainings, getTrainingStats } from '@/lib/database';
import logger from '@/lib/security/logger';
import { PremiumTeaser } from '@/components/premium/PremiumTeaser';
import { useI18n } from '@/lib/I18nContext';
import { PremiumGate } from '@/components/premium/PremiumGate';

// ============================================
// TYPES
// ============================================

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
  const { t } = useI18n();

  const [stats, setStats] = useState<MatTimeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState(300); // 5h par semaine par defaut

  useEffect(() => {
    loadMatTimeStats();
  }, []);

  const loadMatTimeStats = async () => {
    try {
      setIsLoading(true);

      // Charger tous les entraînements
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

      // Données par jour de la semaine
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

  // Formatter en heures propres (1h, 1h30, etc.)
  const formatHours = (minutes: number) => {
    if (!minutes || minutes <= 0) return '0h';
    const totalMin = Math.round(minutes);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m.toString().padStart(2, '0')}`;
  };

  // Progress ring pour l'objectif
  const GoalRing = ({ current, goal }: { current: number; goal: number }) => {
    const size = 200;
    const strokeWidth = 16;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
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
            {formatHours(current)}
          </Text>
          <Text style={[styles.goalLabel, { color: colors.textMuted }]}>
            / {formatHours(goal)}
          </Text>
          <Text style={[styles.goalSubLabel, { color: colors.textSecondary }]}>
            {t('matTime.thisWeek')}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading || !stats) {
    return (
      <ScreenWrapper>
        <View style={{ flex: 1, padding: 16 }}>
          <SkeletonCard height={180} width="100%" marginBottom={12} />
          <SkeletonCard height={120} width="100%" marginBottom={12} />
          <SkeletonCard height={120} width="100%" marginBottom={12} />
          <SkeletonCard height={120} width="100%" marginBottom={12} />
          <SkeletonMessage />
        </View>
      </ScreenWrapper>
    );
  }

  const weekProgress = weeklyGoal > 0 ? (stats.thisWeekMinutes / weeklyGoal) * 100 : 0;

  return (
    <PremiumGate featureTitle="Temps sur le tatami">
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
              {t('matTime.totalOnTatami')}
            </Text>
          </View>
          <Text style={[styles.heroValue, { color: colors.gold }]}>
            {formatHours(stats.totalMinutes)}
          </Text>
          <Text style={[styles.heroSubtext, { color: colors.textMuted }]}>
            {stats.sessions} {t('matTime.sessions')}
          </Text>
        </LinearGradient>

        {/* Weekly Goal */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Target size={18} color={colors.gold} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {t('matTime.weeklyGoal')}
            </Text>
          </View>

          <GoalRing current={stats.thisWeekMinutes} goal={weeklyGoal} />

          {weekProgress >= 100 && (
            <View style={[styles.achievedBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
              <Award size={16} color="#22C55E" />
              <Text style={styles.achievedText}>{t('matTime.goalReached')}</Text>
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
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('matTime.thisMonth')}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <TrendingUp size={18} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatTime(stats.avgPerSession)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('matTime.avgPerSession')}</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Flame size={18} color="#EF4444" />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {formatTime(stats.longestSession)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('matTime.longest')}</Text>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Calendar size={18} color={colors.gold} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {t('matTime.thisWeek')}
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
                {t('matTime.byDiscipline')}
              </Text>
            </View>

            {stats.byDiscipline.map((discipline, index) => {
              const percent = stats.totalMinutes > 0 ? (discipline.minutes / stats.totalMinutes) * 100 : 0; // évite NaN%

              return (
                <View key={discipline.name} style={styles.disciplineRow}>
                  <View style={styles.disciplineInfo}>
                    <Text style={[styles.disciplineName, { color: colors.textPrimary }]}>
                      {discipline.name}
                    </Text>
                    <Text style={[styles.disciplineSessions, { color: colors.textMuted }]}>
                      {discipline.sessions} {t('matTime.sessions')}
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

        {/* Projection 1000h */}
        {stats.totalMinutes > 0 && (() => {
          const TARGET_HOURS = 1000;
          const targetMinutes = TARGET_HOURS * 60;
          const totalMin = stats.totalMinutes;
          const pct1000 = Math.min(100, (totalMin / targetMinutes) * 100);
          const remaining = Math.max(0, targetMinutes - totalMin);

          // Rythme hebdomadaire : semaine actuelle ou objectif par défaut
          const weeklyAvg = stats.thisWeekMinutes > 0 ? stats.thisWeekMinutes : weeklyGoal;
          const weeksLeft = weeklyAvg > 0 ? remaining / weeklyAvg : null;
          const projectionDate = weeksLeft != null ? (() => {
            const d = new Date();
            d.setDate(d.getDate() + Math.round(weeksLeft * 7));
            return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
          })() : null;
          const monthsLeft = weeksLeft != null ? Math.round(weeksLeft / 4.33) : null;

          return (
            <View style={[styles.card, { backgroundColor: colors.card, marginBottom: 16 }]}>
              <View style={styles.cardHeader}>
                <Target size={18} color="#F59E0B" />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {t('matTime.target1000h')}
                </Text>
              </View>

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>
                    {formatHours(totalMin)} / 1 000h
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#F59E0B' }}>
                    {pct1000.toFixed(1)}%
                  </Text>
                </View>
                <View style={{ height: 10, borderRadius: 5, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <View style={{ width: `${pct1000}%` as any, height: '100%', backgroundColor: '#F59E0B', borderRadius: 5 }} />
                </View>
              </View>

              {pct1000 < 100 ? (
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <View style={{ flex: 1, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>{t('matTime.remaining')}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#F59E0B' }}>{formatHours(remaining)}</Text>
                  </View>
                  {projectionDate && monthsLeft != null && (
                    <View style={{ flex: 1, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>{t('matTime.currentPace')}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#F59E0B', textAlign: 'center' }}>
                        {monthsLeft > 0 ? `dans ~${monthsLeft} mois` : t('matTime.thisMonth2')}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>{projectionDate}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ backgroundColor: 'rgba(34,197,94,0.12)', borderRadius: 10, padding: 14, alignItems: 'center', flexDirection: 'row', gap: 10 }}>
                  <Award size={20} color="#22C55E" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#22C55E' }}>{t('matTime.target1000Reached')}</Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Tip */}
        <View style={[styles.tipCard, { backgroundColor: colors.goldMuted }]}>
          <Text style={[styles.tipText, { color: colors.gold }]}>
            {t('matTime.tip')}
          </Text>
        </View>

        <View style={{ height: 40 }} />
        <PremiumTeaser variant="analytics" title="Analyse mat time complète" />
      </ScrollView>
    </ScreenWrapper>
    </PremiumGate>
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
