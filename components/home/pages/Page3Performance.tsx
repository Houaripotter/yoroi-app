// ============================================
// PAGE 3 - PERFORMANCE (Analyse)
// ============================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { PerformanceRadar } from '@/components/PerformanceRadar';
import { HealthspanChart } from '@/components/HealthspanChart';
import { CheckCircle2, Circle, Activity, Footprints, Flame, FileText, Share2, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import AnimatedCounter from '@/components/AnimatedCounter';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { router } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 20;

interface WeeklyReport {
  weightChange?: number;
  trainingsCount?: number;
  avgSleepHours?: number;
  hydrationRate?: number;
  totalSteps?: number;
}

interface Page3PerformanceProps {
  dailyChallenges?: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  // Activity
  steps?: number;
  stepsGoal?: number;
  calories?: number;
  // Weekly Report
  weeklyReport?: WeeklyReport;
  onShareReport?: () => void;
}

export const Page3Performance: React.FC<Page3PerformanceProps> = ({
  dailyChallenges = [
    { id: '1', title: 'Nuit Réparatrice', completed: true },
    { id: '2', title: 'Hydratation Complète', completed: false },
    { id: '3', title: 'Entraînement du Jour', completed: false },
  ],
  steps = 0,
  stepsGoal = 10000,
  calories = 0,
  weeklyReport,
  onShareReport,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  const getTrendIcon = (value: number) => {
    if (value > 0) return TrendingUp;
    if (value < 0) return TrendingDown;
    return Minus;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return '#10B981';
    if (value < 0) return '#EF4444';
    return '#94A3B8';
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
    >
      <View style={styles.headerContainer}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
          {t('analysis.title')}
        </Text>
        <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
          {t('analysis.subtitle')}
        </Text>
      </View>

      {/* ACTIVITÉ DU JOUR */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {t('analysis.dailyActivity')}
      </Text>
      <View style={styles.activityRow}>
        {/* Pas Card - cliquable vers historique */}
        <TouchableOpacity
          style={styles.activityCardTouchable}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.push('/activity-history?tab=steps');
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#3B82F6', '#2563EB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activityCard}
          >
            <Footprints size={28} color="#FFFFFF" strokeWidth={2.5} />
            <View style={styles.activityContent}>
              <AnimatedCounter
                value={steps}
                style={styles.activityValue}
                duration={800}
              />
              <Text style={styles.activityGoal}>/ {stepsGoal}</Text>
            </View>
            <Text style={styles.activityLabel}>{t('analysis.steps')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Calories Card - cliquable vers historique */}
        <TouchableOpacity
          style={styles.activityCardTouchable}
          onPress={() => {
            impactAsync(ImpactFeedbackStyle.Light);
            router.push('/activity-history?tab=calories');
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.activityCard}
          >
            <Flame size={28} color="#FFFFFF" strokeWidth={2.5} />
            <View style={styles.activityContent}>
              <AnimatedCounter
                value={calories}
                style={styles.activityValue}
                duration={800}
              />
            </View>
            <Text style={styles.activityLabel}>{t('analysis.calories')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* RAPPORT HEBDOMADAIRE */}
      {weeklyReport && (
        <View style={[styles.reportCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.reportHeader}>
            <View style={styles.reportTitleRow}>
              <FileText size={24} color={colors.accentText} strokeWidth={2} />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                {t('analysis.weeklyReport')}
              </Text>
            </View>
            {onShareReport && (
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: `${colors.accent}15` }]}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  onShareReport();
                }}
                activeOpacity={0.7}
              >
                <Share2 size={18} color={isDark ? colors.accentText : colors.textPrimary} strokeWidth={2} />
                <Text style={[styles.shareButtonText, { color: isDark ? colors.accent : colors.textPrimary, fontWeight: '700' }]}>
                  {t('analysis.share')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.reportStats}>
            {/* Poids */}
            {weeklyReport.weightChange !== undefined && (
              <View style={styles.reportStat}>
                <View style={styles.reportStatHeader}>
                  <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                    {t('analysis.weightEvolution')}
                  </Text>
                  {(() => {
                    const TrendIcon = getTrendIcon(weeklyReport.weightChange);
                    const trendColor = getTrendColor(weeklyReport.weightChange);
                    return (
                      <TrendIcon size={16} color={trendColor} strokeWidth={2.5} />
                    );
                  })()}
                </View>
                <Text style={[styles.reportStatValue, { color: colors.textPrimary }]}>
                  {weeklyReport.weightChange > 0 ? '+' : ''}{weeklyReport.weightChange.toFixed(1)} kg
                </Text>
              </View>
            )}

            {/* Entraînements */}
            {weeklyReport.trainingsCount !== undefined && (
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                  {t('analysis.trainings')}
                </Text>
                <Text style={[styles.reportStatValue, { color: colors.textPrimary }]}>
                  {weeklyReport.trainingsCount} {t('analysis.sessions')}
                </Text>
              </View>
            )}

            {/* Sommeil */}
            {weeklyReport.avgSleepHours !== undefined && (
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                  {t('analysis.averageSleep')}
                </Text>
                <Text style={[styles.reportStatValue, { color: colors.textPrimary }]}>
                  {weeklyReport.avgSleepHours.toFixed(1)}h {t('analysis.perNight')}
                </Text>
              </View>
            )}

            {/* Hydratation */}
            {weeklyReport.hydrationRate !== undefined && (
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                  {t('analysis.hydrationRate')}
                </Text>
                <Text style={[styles.reportStatValue, { color: colors.textPrimary }]}>
                  {Math.round(weeklyReport.hydrationRate)}%
                </Text>
              </View>
            )}

            {/* Pas Total */}
            {weeklyReport.totalSteps !== undefined && (
              <View style={styles.reportStat}>
                <Text style={[styles.reportStatLabel, { color: colors.textMuted }]}>
                  {t('analysis.totalSteps')}
                </Text>
                <Text style={[styles.reportStatValue, { color: colors.textPrimary }]}>
                  {weeklyReport.totalSteps.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* CARD 1 - RADAR CHART */}
      <View style={[styles.radarCard, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {t('analysis.athleteProfile')}
        </Text>
        <View style={styles.radarContainer}>
          <PerformanceRadar size={240} />
        </View>
      </View>

      {/* CARD 2 - HEALTHSPAN */}
      <View style={[styles.healthspanCard, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {t('analysis.healthLongevity')}
        </Text>
        <HealthspanChart />
      </View>

      {/* CARD 3 - DÉFIS DU JOUR */}
      <View style={[styles.challengesCard, { backgroundColor: colors.backgroundCard }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {t('analysis.challenges')}
        </Text>

        <View style={styles.challengesList}>
          {dailyChallenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeRow}>
              {challenge.completed ? (
                <CheckCircle2 size={24} color="#10B981" strokeWidth={2.5} />
              ) : (
                <Circle size={24} color={colors.textMuted} strokeWidth={2} />
              )}
              <Text
                style={[
                  styles.challengeText,
                  {
                    color: challenge.completed ? colors.textSecondary : colors.textPrimary,
                    textDecorationLine: challenge.completed ? 'line-through' : 'none',
                  }
                ]}
              >
                {challenge.title}
              </Text>
            </View>
          ))}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
            {t('analysis.progression')}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(dailyChallenges.filter(c => c.completed).length / dailyChallenges.length) * 100}%`,
                  backgroundColor: '#10B981',
                }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textPrimary }]}>
            {dailyChallenges.filter(c => c.completed).length} / {dailyChallenges.length}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 250,
  },
  headerContainer: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  pageSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },

  // Activity
  activityRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  activityCardTouchable: {
    flex: 1,
  },
  activityCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
    marginBottom: 8,
  },
  activityValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  activityGoal: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  activityLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Weekly Report
  reportCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  reportStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  reportStat: {
    width: '47%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  reportStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportStatLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportStatValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  // Radar Card
  radarCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  radarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Healthspan Card
  healthspanCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },

  // Challenges Card
  challengesCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  challengesList: {
    gap: 16,
    marginBottom: 20,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  challengeText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  progressSection: {
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
});
