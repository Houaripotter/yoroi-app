// ============================================
// YOROI - HISTORIQUE ACTIVITÉ (Pas & Calories)
// ============================================
// Page dédiée pour visualiser l'historique des pas et calories

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Flame, Target, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { SmoothLineChart } from '@/components/charts/SmoothLineChart';
import { healthConnect } from '@/lib/healthConnect';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Period = '7d' | '30d' | '90d';
type Tab = 'steps' | 'calories';

export default function ActivityHistoryScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t, locale } = useI18n();
  const params = useLocalSearchParams<{ tab?: string }>();

  // Safe parameter extraction with validation
  const initialTab: Tab = (params.tab === 'steps' || params.tab === 'calories') ? params.tab : 'steps';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [period, setPeriod] = useState<Period>('30d');
  const [isLoading, setIsLoading] = useState(false);

  // Steps data
  const [stepsHistory, setStepsHistory] = useState<{ date: string; value: number }[]>([]);
  const [todaySteps, setTodaySteps] = useState(0);
  const [avgSteps, setAvgSteps] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [stepsGoal] = useState(10000);
  const [stepsTrend, setStepsTrend] = useState<'up' | 'down' | 'stable'>('stable');

  // Calories data
  const [caloriesHistory, setCaloriesHistory] = useState<{ date: string; value: number }[]>([]);
  const [todayCalories, setTodayCalories] = useState(0);
  const [avgCalories, setAvgCalories] = useState(0);
  const [totalCalories, setTotalCalories] = useState(0);
  const [caloriesTrend, setCaloriesTrend] = useState<'up' | 'down' | 'stable'>('stable');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[period];

      // Load steps history from Apple Health
      const stepsHist = await healthConnect.getStepsHistory(days);
      const formattedSteps = stepsHist.map(item => ({
        date: new Date(item.date).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
        value: item.value,
      }));
      setStepsHistory(formattedSteps);

      // Load calories history from Apple Health
      const caloriesHist = await healthConnect.getCaloriesHistory(days);
      const formattedCalories = caloriesHist.map(item => ({
        date: new Date(item.date).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
        value: item.active,
      }));
      setCaloriesHistory(formattedCalories);

      // Calculate stats for steps
      if (formattedSteps.length > 0) {
        const total = formattedSteps.reduce((sum, d) => sum + d.value, 0);
        const avg = total / formattedSteps.length;
        setTodaySteps(formattedSteps[formattedSteps.length - 1]?.value || 0);
        setAvgSteps(Math.round(avg));
        setTotalSteps(total);

        // Calculate trend (compare last 3 days to previous 3 days)
        if (formattedSteps.length >= 6) {
          const recent = formattedSteps.slice(-3).reduce((sum, d) => sum + d.value, 0) / 3;
          const previous = formattedSteps.slice(-6, -3).reduce((sum, d) => sum + d.value, 0) / 3;
          if (recent > previous * 1.1) setStepsTrend('up');
          else if (recent < previous * 0.9) setStepsTrend('down');
          else setStepsTrend('stable');
        }
      }

      // Calculate stats for calories
      if (formattedCalories.length > 0) {
        const total = formattedCalories.reduce((sum, d) => sum + d.value, 0);
        const avg = total / formattedCalories.length;
        setTodayCalories(formattedCalories[formattedCalories.length - 1]?.value || 0);
        setAvgCalories(Math.round(avg));
        setTotalCalories(total);

        // Calculate trend
        if (formattedCalories.length >= 6) {
          const recent = formattedCalories.slice(-3).reduce((sum, d) => sum + d.value, 0) / 3;
          const previous = formattedCalories.slice(-6, -3).reduce((sum, d) => sum + d.value, 0) / 3;
          if (recent > previous * 1.1) setCaloriesTrend('up');
          else if (recent < previous * 0.9) setCaloriesTrend('down');
          else setCaloriesTrend('stable');
        }
      }

    } catch (error) {
      logger.error('Erreur chargement historique activité:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period, locale]);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadData(); }, []);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return TrendingUp;
    if (trend === 'down') return TrendingDown;
    return Minus;
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return '#10B981';
    if (trend === 'down') return '#EF4444';
    return '#94A3B8';
  };

  const StepsTrendIcon = getTrendIcon(stepsTrend);
  const CaloriesTrendIcon = getTrendIcon(caloriesTrend);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {t('activity.historyTitle') || 'Historique Activité'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'steps' && { backgroundColor: colors.accent },
          ]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            setActiveTab('steps');
          }}
        >
          <MaterialCommunityIcons
            name="walk"
            size={18}
            color={activeTab === 'steps' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'steps' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            {t('activity.steps') || 'Pas'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'calories' && { backgroundColor: colors.accent },
          ]}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            setActiveTab('calories');
          }}
        >
          <Flame
            size={18}
            color={activeTab === 'calories' ? '#FFFFFF' : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'calories' ? '#FFFFFF' : colors.textSecondary },
            ]}
          >
            {t('activity.calories') || 'Calories'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filtres de période */}
      <View style={styles.periodFilters}>
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodBtn,
              {
                backgroundColor: period === p ? colors.accent : colors.backgroundCard,
                borderColor: period === p ? colors.accent : colors.border,
              },
            ]}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              setPeriod(p);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.periodText,
                { color: period === p ? '#FFFFFF' : colors.textPrimary },
              ]}
            >
              {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '3 mois'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadData}
            tintColor={colors.accent}
          />
        }
      >
        {/* ========== STEPS TAB ========== */}
        {activeTab === 'steps' && (
          <>
            {/* Hero Card - Today's Steps */}
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroHeader}>
                <View style={styles.heroIconContainer}>
                  <MaterialCommunityIcons name="walk" size={28} color="#FFFFFF" />
                </View>
                <View style={styles.heroTitleContainer}>
                  <Text style={styles.heroLabel}>{t('activity.todaySteps') || "Pas aujourd'hui"}</Text>
                  <View style={styles.trendBadge}>
                    <StepsTrendIcon size={14} color={getTrendColor(stepsTrend)} />
                    <Text style={[styles.trendText, { color: getTrendColor(stepsTrend) }]}>
                      {stepsTrend === 'up' ? '+' : stepsTrend === 'down' ? '-' : ''}
                      {Math.abs(todaySteps - avgSteps).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.heroValueContainer}>
                <Text style={styles.heroValue}>{todaySteps.toLocaleString()}</Text>
                <Text style={styles.heroUnit}>{t('activity.stepsUnit') || 'pas'}</Text>
              </View>

              {/* Progress to goal */}
              <View style={styles.goalProgress}>
                <View style={styles.goalProgressTrack}>
                  <View
                    style={[
                      styles.goalProgressFill,
                      { width: `${Math.min(100, (todaySteps / stepsGoal) * 100)}%` },
                    ]}
                  />
                </View>
                <View style={styles.goalLabels}>
                  <Text style={styles.goalText}>0</Text>
                  <View style={styles.goalTarget}>
                    <Target size={12} color="#FFFFFF" />
                    <Text style={styles.goalText}>{stepsGoal.toLocaleString()}</Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <Calendar size={18} color="#3B82F6" />
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {avgSteps.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {t('activity.avgPerDay') || 'Moyenne/jour'}
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <TrendingUp size={18} color="#10B981" />
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {totalSteps.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {t('activity.totalPeriod') || 'Total période'}
                </Text>
              </View>
            </View>

            {/* Chart */}
            <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
              <View style={styles.chartHeader}>
                <View style={styles.chartTitleRow}>
                  <MaterialCommunityIcons name="walk" size={20} color="#3B82F6" />
                  <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                    {t('activity.stepsEvolution') || 'Évolution des pas'}
                  </Text>
                </View>
                <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
                  {period === '7d' ? 'Derniers 7 jours' : period === '30d' ? 'Dernier mois' : 'Derniers 3 mois'}
                </Text>
              </View>
              {stepsHistory.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <SmoothLineChart
                    data={stepsHistory}
                    width={Math.max(SCREEN_WIDTH - 72, stepsHistory.length * 50)}
                    height={220}
                    color="#3B82F6"
                    showGrid
                    showDots
                    animated
                  />
                </ScrollView>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="walk" size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {t('activity.noStepsData') || 'Aucune donnée de pas disponible'}
                  </Text>
                  <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                    {t('activity.connectHealth') || "Connectez l'app Santé pour voir vos données"}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ========== CALORIES TAB ========== */}
        {activeTab === 'calories' && (
          <>
            {/* Hero Card - Today's Calories */}
            <LinearGradient
              colors={['#F97316', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroHeader}>
                <View style={styles.heroIconContainer}>
                  <Flame size={28} color="#FFFFFF" />
                </View>
                <View style={styles.heroTitleContainer}>
                  <Text style={styles.heroLabel}>{t('activity.todayCalories') || "Calories brûlées"}</Text>
                  <View style={styles.trendBadge}>
                    <CaloriesTrendIcon size={14} color={getTrendColor(caloriesTrend)} />
                    <Text style={[styles.trendText, { color: getTrendColor(caloriesTrend) }]}>
                      {caloriesTrend === 'up' ? '+' : caloriesTrend === 'down' ? '-' : ''}
                      {Math.abs(todayCalories - avgCalories).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.heroValueContainer}>
                <Text style={styles.heroValue}>{todayCalories.toLocaleString()}</Text>
                <Text style={styles.heroUnit}>kcal</Text>
              </View>

              {/* Info */}
              <View style={styles.caloriesInfo}>
                <Text style={styles.caloriesInfoText}>
                  {t('activity.activeCalories') || 'Calories actives (hors métabolisme de base)'}
                </Text>
              </View>
            </LinearGradient>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <Calendar size={18} color="#F97316" />
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {avgCalories.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {t('activity.avgPerDay') || 'Moyenne/jour'}
                </Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
                <TrendingUp size={18} color="#10B981" />
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {totalCalories.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {t('activity.totalPeriod') || 'Total période'}
                </Text>
              </View>
            </View>

            {/* Chart */}
            <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard }]}>
              <View style={styles.chartHeader}>
                <View style={styles.chartTitleRow}>
                  <Flame size={20} color="#F97316" />
                  <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                    {t('activity.caloriesEvolution') || 'Évolution des calories'}
                  </Text>
                </View>
                <Text style={[styles.chartSubtitle, { color: colors.textMuted }]}>
                  {period === '7d' ? 'Derniers 7 jours' : period === '30d' ? 'Dernier mois' : 'Derniers 3 mois'}
                </Text>
              </View>
              {caloriesHistory.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <SmoothLineChart
                    data={caloriesHistory}
                    width={Math.max(SCREEN_WIDTH - 72, caloriesHistory.length * 50)}
                    height={220}
                    color="#F97316"
                    showGrid
                    showDots
                    animated
                  />
                </ScrollView>
              ) : (
                <View style={styles.emptyState}>
                  <Flame size={48} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {t('activity.noCaloriesData') || 'Aucune donnée de calories disponible'}
                  </Text>
                  <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                    {t('activity.connectHealth') || "Connectez l'app Santé pour voir vos données"}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  periodFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // Hero Card
  heroCard: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTitleContainer: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  trendText: {
    fontSize: 12,
    fontWeight: '700',
  },
  heroValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 16,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  heroUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  goalProgress: {
    marginTop: 8,
  },
  goalProgressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  goalLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  goalText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  goalTarget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  caloriesInfo: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  caloriesInfoText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Chart Card
  chartCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartSubtitle: {
    fontSize: 12,
    marginLeft: 28,
  },
  emptyState: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 12,
    textAlign: 'center',
  },
});
